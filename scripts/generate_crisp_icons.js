// scripts/generate_crisp_icons.js
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.resolve(__dirname, '../extension/icons');

/**
 * Creates a valid PNG buffer from raw RGBA pixel data.
 */
function createPngBuffer(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth: 8
  ihdr[9] = 6; // color type: 6 (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk with scanline filter byte 0 (None)
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter: None
    const srcRowOffset = y * width * 4;
    rgbaBuffer.copy(rawData, rowOffset + 1, srcRowOffset, srcRowOffset + width * 4);
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Distance to line segment (px, py) to (x1, y1)-(x2, y2)
 */
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/**
 * Tests if point (x, y) is inside the shield shape in normalized [0, 1] coordinates.
 */
function isInsideShield(x, y) {
  // Bounding box with rounded margin
  if (x < 0.08 || x > 0.92 || y < 0.08 || y > 0.92) return false;

  const nx = (x - 0.5) / 0.42; // [-1, 1] horizontal
  const ny = y;

  // Top rounded corners: y between 0.08 and 0.22
  if (ny < 0.22) {
    const rx = Math.abs(nx);
    if (rx > 0.8) {
      const cx = 0.8;
      const cy = 0.22;
      const r = 0.14;
      const d = Math.hypot(rx - cx, (ny - cy) / 0.7);
      if (d > r) return false;
    }
    return true;
  }

  // Upper straight/slight taper section
  if (ny <= 0.55) {
    return Math.abs(nx) <= 1.0;
  }

  // Lower tapered curve coming to a bottom point at (0.5, 0.92)
  const progress = (ny - 0.55) / (0.92 - 0.55); // 0 to 1
  const maxWidth = Math.pow(1 - progress, 0.75);
  return Math.abs(nx) <= maxWidth;
}

/**
 * Checks if point is on the checkmark stroke.
 */
function checkmarkAlpha(x, y, s) {
  // Checkmark segments in normalized coords
  // Leg 1: (0.32, 0.52) to (0.46, 0.66)
  // Leg 2: (0.46, 0.66) to (0.72, 0.36)
  const d1 = distToSegment(x, y, 0.32, 0.52, 0.46, 0.66);
  const d2 = distToSegment(x, y, 0.46, 0.66, 0.72, 0.36);
  const minDist = Math.min(d1, d2);

  const strokeRadius = 0.075;
  const antialiasEdge = 0.025;

  if (minDist <= strokeRadius - antialiasEdge) return 1.0;
  if (minDist >= strokeRadius + antialiasEdge) return 0.0;
  return 1.0 - (minDist - (strokeRadius - antialiasEdge)) / (antialiasEdge * 2);
}

/**
 * Renders a crisp, antialiased StopScroll shield icon with 4x supersampling.
 */
function renderCrispIcon(targetSize) {
  const ss = 4; // 4x supersampling
  const w = targetSize;
  const h = targetSize;
  const sw = w * ss;
  const sh = h * ss;

  const highRes = new Float32Array(sw * sh * 4);

  // Gradient colors (StopScroll Rose-Orange Brand Gradient)
  const cTop = [244, 63, 94];     // #f43f5e (Rose)
  const cMid = [249, 115, 22];    // #f97316 (Orange)
  const cBot = [245, 158, 11];    // #f59e0b (Amber)

  for (let sy = 0; sy < sh; sy++) {
    const ny = sy / sh;
    for (let sx = 0; sx < sw; sx++) {
      const nx = sx / sw;
      const idx = (sy * sw + sx) * 4;

      if (isInsideShield(nx, ny)) {
        // Vertical gradient interpolation
        let r, g, b;
        if (ny < 0.5) {
          const t = ny / 0.5;
          r = cTop[0] + (cMid[0] - cTop[0]) * t;
          g = cTop[1] + (cMid[1] - cTop[1]) * t;
          b = cTop[2] + (cMid[2] - cTop[2]) * t;
        } else {
          const t = (ny - 0.5) / 0.5;
          r = cMid[0] + (cBot[0] - cMid[0]) * t;
          g = cMid[1] + (cBot[1] - cMid[1]) * t;
          b = cMid[2] + (cBot[2] - cMid[2]) * t;
        }

        // Draw crisp checkmark
        const chk = checkmarkAlpha(nx, ny, targetSize);
        if (chk > 0) {
          // Blend with pure white
          r = r * (1 - chk) + 255 * chk;
          g = g * (1 - chk) + 255 * chk;
          b = b * (1 - chk) + 255 * chk;
        }

        highRes[idx + 0] = r;
        highRes[idx + 1] = g;
        highRes[idx + 2] = b;
        highRes[idx + 3] = 255;
      } else {
        highRes[idx + 3] = 0; // Transparent outside
      }
    }
  }

  // Downsample to target size with area averaging (box filter)
  const rgbaBuffer = Buffer.alloc(w * h * 4);
  const samplesPerPixel = ss * ss;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const sIdx = ((y * ss + dy) * sw + (x * ss + dx)) * 4;
          const a = highRes[sIdx + 3] / 255;
          rSum += highRes[sIdx + 0] * a;
          gSum += highRes[sIdx + 1] * a;
          bSum += highRes[sIdx + 2] * a;
          aSum += highRes[sIdx + 3];
        }
      }

      const outIdx = (y * w + x) * 4;
      const avgA = aSum / samplesPerPixel;

      if (avgA > 0) {
        rgbaBuffer[outIdx + 0] = Math.round(rSum / (aSum / 255));
        rgbaBuffer[outIdx + 1] = Math.round(gSum / (aSum / 255));
        rgbaBuffer[outIdx + 2] = Math.round(bSum / (aSum / 255));
        rgbaBuffer[outIdx + 3] = Math.round(avgA);
      } else {
        rgbaBuffer[outIdx + 0] = 0;
        rgbaBuffer[outIdx + 1] = 0;
        rgbaBuffer[outIdx + 2] = 0;
        rgbaBuffer[outIdx + 3] = 0;
      }
    }
  }

  return createPngBuffer(w, h, rgbaBuffer);
}

// Generate all sizes required by Chrome Manifest V3
const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const buf = renderCrispIcon(size);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Generated crisp ${outPath} (${size}x${size}, ${buf.length} bytes)`);
}

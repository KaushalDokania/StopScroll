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
 * Signed distance to a rounded rectangle with center (cx, cy), half-dimensions (hw, hh), and radius r.
 */
function sdRoundedBox(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const inside = Math.min(Math.max(qx, qy), 0);
  return Math.hypot(ox, oy) + inside - r;
}

/**
 * Renders a crisp, antialiased StopScroll icon.
 * Features a modern, vibrant rounded squircle badge with crisp pause/focus pillars.
 */
function renderCrispIcon(targetSize) {
  const ss = 4; // 4x supersampling for ultra-crisp edges
  const w = targetSize;
  const h = targetSize;
  const sw = w * ss;
  const sh = h * ss;

  const highRes = new Float32Array(sw * sh * 4);

  // StopScroll Signature Gradient Colors
  const cTop = [244, 63, 94];     // #f43f5e (Rose)
  const cMid = [249, 115, 22];    // #f97316 (Orange)
  const cBot = [245, 158, 11];    // #f59e0b (Amber)

  // Outer badge geometry
  const cx = 0.5 * sw;
  const cy = 0.5 * sh;
  const badgeHw = 0.44 * sw;
  const badgeHh = 0.44 * sh;
  const badgeR = 0.22 * sw;

  // Dual Pause Pillars geometry
  const pillarHw = 0.08 * sw;
  const pillarHh = 0.25 * sh;
  const pillarR = 0.045 * sw;
  const leftPillarCx = 0.38 * sw;
  const rightPillarCx = 0.62 * sw;
  const pillarCy = 0.5 * sh;

  for (let sy = 0; sy < sh; sy++) {
    const ny = sy / sh;
    for (let sx = 0; sx < sw; sx++) {
      const idx = (sy * sw + sx) * 4;

      // Distance to badge
      const dBadge = sdRoundedBox(sx, sy, cx, cy, badgeHw, badgeHh, badgeR);

      if (dBadge <= 0) {
        // Vertical brand gradient
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
          b = cBot[2] + (cBot[2] - cMid[2]) * t;
        }

        // Distance to left and right pillars
        const dPillarL = sdRoundedBox(sx, sy, leftPillarCx, pillarCy, pillarHw, pillarHh, pillarR);
        const dPillarR = sdRoundedBox(sx, sy, rightPillarCx, pillarCy, pillarHw, pillarHh, pillarR);
        const dPillar = Math.min(dPillarL, dPillarR);

        if (dPillar <= 0) {
          // Inside pillar: pure crisp white
          r = 255;
          g = 255;
          b = 255;
        } else if (dPillar < 1.0) {
          // Antialias pillar border
          const tP = 1.0 - dPillar;
          r = r * (1 - tP) + 255 * tP;
          g = g * (1 - tP) + 255 * tP;
          b = b * (1 - tP) + 255 * tP;
        }

        // Antialias outer badge edge
        let alpha = 255;
        if (dBadge > -1.0) {
          alpha = Math.round(255 * -dBadge);
        }

        highRes[idx + 0] = r;
        highRes[idx + 1] = g;
        highRes[idx + 2] = b;
        highRes[idx + 3] = alpha;
      } else {
        highRes[idx + 3] = 0; // Transparent
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

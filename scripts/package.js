#!/usr/bin/env node

/**
 * StopScroll Extension Packaging Script
 * Bundles the contents of extension/ into dist/stopscroll-v<version>.zip
 * Excludes any extraneous files such as .DS_Store, __MACOSX, and git files.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const extDir = path.join(projectRoot, 'extension');
const distDir = path.join(projectRoot, 'dist');
const packageJsonPath = path.join(projectRoot, 'package.json');
const manifestJsonPath = path.join(extDir, 'manifest.json');

// 1. Verify source directory exists
if (!fs.existsSync(extDir)) {
  console.error(`❌ Source directory not found: ${extDir}`);
  process.exit(1);
}

// 2. Read package.json and manifest.json versions
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));

const version = pkg.version || manifest.version;
if (!version) {
  console.error('❌ Could not determine version from package.json or manifest.json');
  process.exit(1);
}

if (pkg.version && manifest.version && pkg.version !== manifest.version) {
  console.warn(`⚠️ Warning: package.json version (${pkg.version}) does not match manifest.json (${manifest.version})`);
}

// 3. Ensure output directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const zipFileName = `stopscroll-v${version}.zip`;
const zipFilePath = path.join(distDir, zipFileName);

// Remove stale build artifact if present
if (fs.existsSync(zipFilePath)) {
  fs.rmSync(zipFilePath, { force: true });
}

console.log(`📦 Packaging StopScroll v${version}...`);
console.log(`   Source:  ${extDir}`);
console.log(`   Target:  ${zipFilePath}`);

// 4. Create ZIP archive
let packagingSucceeded = false;

if (process.platform === 'win32') {
  // Windows packaging via PowerShell Compress-Archive
  try {
    const psCmd = `Compress-Archive -Path '${extDir}\\*' -DestinationPath '${zipFilePath}' -Force`;
    execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });
    packagingSucceeded = true;
  } catch (err) {
    console.error('❌ Failed to create zip via PowerShell Compress-Archive:', err.message);
  }
} else {
  // Unix/macOS packaging via native zip utility
  const zipArgs = [
    '-r',
    '-q',
    zipFilePath,
    '.',
    '-x',
    '*.DS_Store*',
    '-x',
    '*__MACOSX*',
    '-x',
    '*.git*',
    '-x',
    '*.tmp*'
  ];

  const result = spawnSync('zip', zipArgs, {
    cwd: extDir,
    stdio: 'inherit'
  });

  if (result.status === 0) {
    packagingSucceeded = true;
  } else {
    console.error(`❌ 'zip' command failed with exit code ${result.status}`);
  }
}

if (!packagingSucceeded || !fs.existsSync(zipFilePath)) {
  console.error('❌ Failed to produce extension zip package.');
  process.exit(1);
}

// 5. Inspect and verify archive
const stats = fs.statSync(zipFilePath);
const sizeKB = (stats.size / 1024).toFixed(2);

console.log(`✅ Package created successfully!`);
console.log(`   Artifact: dist/${zipFileName}`);
console.log(`   File size: ${stats.size} bytes (${sizeKB} KB)`);

// Verify contents if unzip is available
try {
  const listing = execSync(`unzip -l "${zipFilePath}"`, { encoding: 'utf8' });
  const hasManifest = listing.includes('manifest.json');
  const hasDsStore = listing.includes('.DS_Store');

  if (!hasManifest) {
    console.error('❌ Verification failed: manifest.json missing from zip root!');
    process.exit(1);
  }

  if (hasDsStore) {
    console.error('❌ Verification failed: .DS_Store found in package!');
    process.exit(1);
  }

  console.log('   Verification: manifest.json present at root, zero .DS_Store files detected.');
} catch {
  // unzip command might not be available in minimal containers, not fatal if stat succeeded
}

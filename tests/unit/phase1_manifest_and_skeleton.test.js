// tests/unit/phase1_manifest_and_skeleton.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POPULAR_CATALOG } from '../../extension/shared/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const extensionRoot = path.join(projectRoot, 'extension');

describe('Phase 1 Acceptance Criteria & File Integrity Verification', () => {
  describe('manifest.json verification', () => {
    const manifestPath = path.join(extensionRoot, 'manifest.json');

    it('manifest.json exists and is valid JSON', () => {
      assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      assert.equal(manifest.manifest_version, 3, 'Must be Manifest V3');
      assert.equal(manifest.name, 'StopScroll');
      assert.equal(manifest.version, '1.0.0');
      assert.equal(manifest.description, 'Block distracting websites and enforce daily time limits with Timer Groups.');
    });

    it('manifest.json includes all required permissions and host_permissions', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const requiredPermissions = ['declarativeNetRequest', 'storage', 'tabs', 'idle', 'alarms'];
      for (const perm of requiredPermissions) {
        assert.ok(manifest.permissions.includes(perm), `Must include permission: ${perm}`);
      }
      assert.deepEqual(manifest.host_permissions, ['<all_urls>'], 'host_permissions must be ["<all_urls>"]');
    });

    it('manifest.json specifies background service worker as type module', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.deepEqual(manifest.background, {
        service_worker: 'background/background.js',
        type: 'module'
      });
      assert.ok(fs.existsSync(path.join(extensionRoot, manifest.background.service_worker)));
    });

    it('manifest.json specifies action, options_page, and icons', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.equal(manifest.action.default_popup, 'popup/popup.html');
      assert.equal(manifest.action.default_title, 'StopScroll');
      assert.equal(manifest.options_page, 'options/options.html');
      assert.equal(manifest.declarative_net_request?.rule_resources?.length, 0);

      const iconSizes = ['16', '32', '48', '128'];
      for (const size of iconSizes) {
        assert.ok(manifest.icons[size], `manifest.icons must have size ${size}`);
        assert.ok(fs.existsSync(path.join(extensionRoot, manifest.icons[size])), `icon file ${manifest.icons[size]} must exist`);
      }
    });
  });

  describe('Icons verification', () => {
    function readPngDimensions(filePath) {
      const buffer = fs.readFileSync(filePath);
      // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
      assert.equal(buffer[0], 0x89);
      assert.equal(buffer[1], 0x50);
      assert.equal(buffer[2], 0x4e);
      assert.equal(buffer[3], 0x47);
      // IHDR chunk starts at offset 8, length at 8, 'IHDR' at 12, width at 16 (4 bytes BE), height at 20 (4 bytes BE)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    it('all icon files are valid PNGs with exact specified dimensions', () => {
      const icons = [
        { path: 'icons/icon16.png', expected: 16 },
        { path: 'icons/icon32.png', expected: 32 },
        { path: 'icons/icon48.png', expected: 48 },
        { path: 'icons/icon128.png', expected: 128 }
      ];

      for (const { path: relPath, expected } of icons) {
        const fullPath = path.join(extensionRoot, relPath);
        assert.ok(fs.existsSync(fullPath), `${relPath} should exist`);
        const { width, height } = readPngDimensions(fullPath);
        assert.equal(width, expected, `${relPath} width should be ${expected}`);
        assert.equal(height, expected, `${relPath} height should be ${expected}`);
      }
    });
  });

  describe('Skeleton HTML/CSS/JS verification', () => {
    const pages = [
      { name: 'popup', html: 'popup/popup.html', css: 'popup/popup.css', js: 'popup/popup.js' },
      { name: 'options', html: 'options/options.html', css: 'options/options.css', js: 'options/options.js' },
      { name: 'blocked', html: 'blocked/blocked.html', css: 'blocked/blocked.css', js: 'blocked/blocked.js' }
    ];

    for (const page of pages) {
      it(`verifies skeleton for ${page.name}`, () => {
        const htmlPath = path.join(extensionRoot, page.html);
        const cssPath = path.join(extensionRoot, page.css);
        const jsPath = path.join(extensionRoot, page.js);

        assert.ok(fs.existsSync(htmlPath), `${page.html} must exist`);
        assert.ok(fs.existsSync(cssPath), `${page.css} must exist`);
        assert.ok(fs.existsSync(jsPath), `${page.js} must exist`);

        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        assert.ok(/<!DOCTYPE html>/i.test(htmlContent), `${page.html} must have <!DOCTYPE html>`);
        assert.ok(/<meta\s+charset=["']UTF-8["']/i.test(htmlContent), `${page.html} must have charset UTF-8`);
        assert.ok(/<title>/i.test(htmlContent), `${page.html} must have <title>`);
        assert.ok(htmlContent.includes(path.basename(page.css)), `${page.html} must link to its CSS`);
        assert.ok(htmlContent.includes(`type="module"`), `${page.html} must load JS with type="module"`);
        assert.ok(htmlContent.includes(path.basename(page.js)), `${page.html} must reference ${page.js}`);
      });
    }
  });

  describe('POPULAR_CATALOG verification', () => {
    it('POPULAR_CATALOG contains the 12 specified sites from SPEC.md', () => {
      assert.equal(Array.isArray(POPULAR_CATALOG), true);
      assert.equal(POPULAR_CATALOG.length, 12);

      const expectedDomains = [
        'youtube.com', 'reddit.com', 'facebook.com', 'instagram.com',
        'netflix.com', 'twitter.com', 'tiktok.com', 'twitch.tv',
        'discord.com', 'linkedin.com', 'pinterest.com', 'snapchat.com'
      ];

      const actualDomains = POPULAR_CATALOG.map(item => item.domain);
      assert.deepEqual(actualDomains, expectedDomains);

      for (const item of POPULAR_CATALOG) {
        assert.ok(item.domain, 'domain required');
        assert.ok(item.name, 'name required');
        assert.match(item.color, /^#[0-9A-Fa-f]{6}$/, 'valid hex color required');
      }
    });
  });
});

// tests/e2e/integration.test.js
import '../mocks/chrome.mock.js';
import { setupPopupDOM, setupOptionsDOM, setupBlockedDOM } from '../mocks/dom.mock.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { StorageService } from '../../extension/shared/storage.js';
import { generateRuleId, todayDateString, normalizeDomain } from '../../extension/shared/utils.js';
import * as bg from '../../extension/background/background.js';
import * as popup from '../../extension/popup/popup.js';
import * as options from '../../extension/options/options.js';
import * as blocked from '../../extension/blocked/blocked.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const extensionDir = path.join(projectRoot, 'extension');

describe('StopScroll End-to-End System Integration Tests', () => {
  beforeEach(async () => {
    // Reset mock storage
    await chrome.storage.local.clear();
    // Reset dynamic net request rules
    chrome.declarativeNetRequest._resetRules([]);
    // Reset tabs
    chrome.tabs._tabs.clear();
    chrome.tabs._createdTabs = [];
    chrome.runtime._optionsOpened = false;

    // Reset session state
    bg.setActiveTabDomain(null);
    bg.setIsUserActive(true);
  });

  describe('E2E Lifecycle 1: Extension Install -> Popup Quick Block -> Background DNR Sync -> Blocked Page Redirect', () => {
    it('executes full end-to-end blocking lifecycle seamlessly', async () => {
      // 1. Extension Install: Chrome triggers onInstalled
      await chrome.runtime.onInstalled._trigger({ reason: 'install' });

      // Verify default state
      const initialData = await StorageService.getAll();
      assert.equal(initialData.settings.blockingShield, true);
      assert.equal(initialData.settings.lastResetDate, todayDateString());
      assert.deepEqual(initialData.hardBlocklist, []);
      assert.deepEqual(initialData.timerGroups, []);

      // 2. User opens popup while browsing reddit.com
      const popupDoc = setupPopupDOM();
      chrome.tabs._setTab({ id: 1, url: 'https://www.reddit.com/r/technology', active: true });

      await popup.renderActiveTab();
      const domainEl = popupDoc.getElementById('active-tab-domain');
      const btnBlock = popupDoc.getElementById('btn-quick-block');

      assert.equal(domainEl.textContent, 'reddit.com');
      assert.equal(btnBlock.disabled, false);

      // User clicks '+ Block'
      await popup.onQuickBlock();
      assert.equal(btnBlock.disabled, true);
      assert.equal(btnBlock.textContent.trim(), '✓ Blocked');

      // Verify domain is now in storage
      const updatedBlocklist = await StorageService.getHardBlocklist();
      assert.equal(updatedBlocklist.length, 1);
      assert.equal(updatedBlocklist[0].domain, 'reddit.com');

      // 3. Storage change triggers dynamic rules sync in background
      await bg.syncDynamicRules();

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 1);
      const rule = activeRules[0];
      assert.equal(rule.id, generateRuleId('reddit.com'));
      assert.equal(rule.condition.urlFilter, '||reddit.com^');
      assert.ok(rule.action.redirect.extensionPath.includes('target=reddit.com'));
      assert.ok(rule.action.redirect.extensionPath.includes('reason=hard_block'));

      // 4. Chrome intercepts request and redirects to blocked.html
      const blockedDoc = setupBlockedDOM({ target: 'reddit.com', reason: 'hard_block' });
      blocked.renderBlockedContext({ target: 'reddit.com', reason: 'hard_block' });

      const pill = blockedDoc.getElementById('reason-pill');
      const blockedDomain = blockedDoc.getElementById('blocked-domain');

      assert.equal(blockedDomain.textContent, 'reddit.com');
      assert.ok(pill.classList.contains('pill-rose'));
      assert.equal(pill.textContent, 'Site is Blocked');
    });
  });

  describe('E2E Lifecycle 2: Master Shield Pause and Resume', () => {
    it('disabling shield removes all DNR rules; re-enabling reinstalls rules', async () => {
      // Setup initial blocks
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveHardBlocklist([
        { domain: 'twitter.com', enabled: true },
        { domain: 'instagram.com', enabled: true }
      ]);
      await bg.syncDynamicRules();

      let activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 2, '2 rules active when shield is ON');

      // User toggles shield OFF in popup
      setupPopupDOM();
      await popup.onShieldToggle(false);

      const settings = await StorageService.getSettings();
      assert.equal(settings.blockingShield, false);

      // Background sync runs
      await bg.syncDynamicRules();
      activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 0, 'All DNR rules removed when shield is paused');

      // User config is still safely intact in storage
      const blocklist = await StorageService.getHardBlocklist();
      assert.equal(blocklist.length, 2);

      // User toggles shield back ON
      await popup.onShieldToggle(true);
      await bg.syncDynamicRules();

      activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 2, 'Rules restored immediately when shield is resumed');
    });
  });

  describe('E2E Lifecycle 3: Timer Group Usage, Expiration, and Midnight Reset', () => {
    it('tracks active browsing minutes, locks on expiry, and clears at midnight', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveHardBlocklist([]);

      // 1. User creates Timer Group in Options Hub
      setupOptionsDOM();
      await options.addTimerGroup('Video & Streaming', 2); // 2 minute allowance
      await options.addSiteToGroup(0, 'youtube.com');

      let groups = await StorageService.getTimerGroups();
      assert.equal(groups.length, 1);
      assert.deepEqual(groups[0].sites, ['youtube.com']);
      assert.equal(groups[0].usedMinutes, 0);

      // Initially youtube.com is allowed (0 DNR rules)
      await bg.syncDynamicRules();
      let activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 0);

      // 2. User browses youtube.com for 1 minute
      bg.setActiveTabDomain('youtube.com');
      bg.setIsUserActive(true);
      await bg.tickTimeTracker();

      groups = await StorageService.getTimerGroups();
      assert.equal(groups[0].usedMinutes, 1);
      // Still 1 min remaining -> not blocked
      activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 0);

      // 3. User browses for a 2nd minute -> reaching limit (2/2)
      await bg.tickTimeTracker();
      groups = await StorageService.getTimerGroups();
      assert.equal(groups[0].usedMinutes, 2);

      // Expiration compiles DNR rule immediately!
      activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 1);
      assert.equal(activeRules[0].id, generateRuleId('youtube.com'));
      assert.ok(activeRules[0].action.redirect.extensionPath.includes('reason=timer_expired'));

      // 4. User navigates to youtube and sees blocked page
      const blockedDoc = setupBlockedDOM({ target: 'youtube.com', reason: 'timer_expired', group: 'Video & Streaming' });
      blocked.renderBlockedContext({ target: 'youtube.com', reason: 'timer_expired', group: 'Video & Streaming' });

      const pill = blockedDoc.getElementById('reason-pill');
      assert.ok(pill.classList.contains('pill-orange'));
      assert.ok(pill.textContent.includes('Timer Limit Reached'));
      assert.ok(pill.textContent.includes('Video & Streaming'));

      // 5. Midnight passes -> date changes
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: '2026-01-01' });
      const resetHandled = await bg.checkAndResetIfNewDay();
      assert.equal(resetHandled, true);

      // Used minutes reset to 0
      groups = await StorageService.getTimerGroups();
      assert.equal(groups[0].usedMinutes, 0);

      // Dynamic rules re-synced, youtube.com is unlocked
      activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 0);
    });
  });

  describe('E2E Lifecycle 4: Priority Conflict Resolution', () => {
    it('hard block strictly takes precedence when a domain exists in both lists', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });

      // Put facebook.com into both hardBlocklist and an expired timerGroup
      await StorageService.saveHardBlocklist([
        { domain: 'facebook.com', enabled: true, addedAt: Date.now() }
      ]);
      await StorageService.saveTimerGroups([
        {
          id: 'g-social',
          name: 'Social',
          dailyLimitMinutes: 10,
          usedMinutes: 10, // Expired
          sites: ['facebook.com']
        }
      ]);

      await bg.syncDynamicRules();

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 1, 'Should have exactly 1 DNR rule without ID clash');
      assert.equal(activeRules[0].id, generateRuleId('facebook.com'));
      assert.ok(activeRules[0].action.redirect.extensionPath.includes('reason=hard_block'), 'Priority 1 hard_block must override timer_expired');
    });
  });

  describe('E2E Lifecycle 5: Storage Persistence Across Service Worker Wake & Browser Restart', () => {
    it('re-initializes cleanly on startup without data loss or duplicate rules', async () => {
      // Seed complex user state
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveHardBlocklist([
        { domain: 'reddit.com', enabled: true },
        { domain: 'tiktok.com', enabled: false }
      ]);
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'Work', dailyLimitMinutes: 45, usedMinutes: 15, sites: ['github.com'] }
      ]);

      // Trigger browser startup listener
      await chrome.runtime.onStartup._trigger();

      // Verify all data is intact
      const all = await StorageService.getAll();
      assert.equal(all.settings.blockingShield, true);
      assert.equal(all.hardBlocklist.length, 2);
      assert.equal(all.timerGroups.length, 1);
      assert.equal(all.timerGroups[0].usedMinutes, 15);

      // Verify only enabled hardblock is active
      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 1);
      assert.equal(activeRules[0].id, generateRuleId('reddit.com'));
    });
  });

  describe('E2E Lifecycle 6: Bundle Size, Performance & Security Audit', () => {
    it('extension unpacked bundle size is well under 1.5MB', () => {
      function getDirSize(dir) {
        let total = 0;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            total += getDirSize(filePath);
          } else {
            total += stat.size;
          }
        }
        return total;
      }

      const totalSizeBytes = getDirSize(extensionDir);
      const sizeMB = totalSizeBytes / (1024 * 1024);

      // SPEC requirement: < 1.5MB
      assert.ok(sizeMB < 1.5, `Extension bundle size (${sizeMB.toFixed(2)} MB) should be < 1.5MB`);
    });

    it('all extension JavaScript files comply with security requirements (no eval, no remote scripts)', () => {
      function scanDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            scanDir(filePath);
          } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf8');
            assert.ok(!/\beval\s*\(/.test(content), `Disallowed eval() found in ${filePath}`);
            assert.ok(!/new\s+Function\s*\(/.test(content), `Disallowed new Function() found in ${filePath}`);
            assert.ok(!/https?:\/\//.test(content) || file === 'utils.js' || file === 'catalog.js' || content.includes('google.com/s2/favicons'), `Remote script URL detected in ${filePath}`);
          }
        }
      }
      scanDir(extensionDir);
    });

    it('manifest.json specifies strict extension pages Content Security Policy', () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, 'manifest.json'), 'utf8'));
      assert.ok(manifest.content_security_policy);
      assert.ok(manifest.content_security_policy.extension_pages.includes("script-src 'self'"));
      assert.ok(manifest.content_security_policy.extension_pages.includes("object-src 'self'"));
    });
  });
});

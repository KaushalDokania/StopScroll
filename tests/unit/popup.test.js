// tests/unit/popup.test.js
import '../mocks/chrome.mock.js';
import { setupPopupDOM } from '../mocks/dom.mock.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StorageService } from '../../extension/shared/storage.js';
import { todayDateString, faviconUrl } from '../../extension/shared/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const popupDir = path.join(projectRoot, 'extension/popup');

// Dynamically import popup module
async function getPopupModule() {
  return await import(`../../extension/popup/popup.js?t=${Date.now()}_${Math.random()}`);
}

describe('extension/popup UI and Controller Unit Tests', () => {
  let doc;

  beforeEach(async () => {
    // Reset Chrome Storage
    await chrome.storage.local.clear();
    // Reset tabs
    chrome.tabs._tabs.clear();
    chrome.tabs._createdTabs = [];
    chrome.runtime._optionsOpened = false;

    // Reset and initialize DOM
    doc = setupPopupDOM();
  });

  describe('popup.html & popup.css static integrity', () => {
    it('popup.html has 360px viewport meta, semantic elements, and all card containers', () => {
      const htmlPath = path.join(popupDir, 'popup.html');
      assert.ok(fs.existsSync(htmlPath), 'popup.html must exist');
      const html = fs.readFileSync(htmlPath, 'utf8');

      assert.ok(html.includes('id="popup-header"'));
      assert.ok(html.includes('id="shield-card"'));
      assert.ok(html.includes('id="shield-toggle"'));
      assert.ok(html.includes('id="active-tab-card"'));
      assert.ok(html.includes('id="active-tab-domain"'));
      assert.ok(html.includes('id="active-tab-favicon"'));
      assert.ok(html.includes('id="btn-quick-block"'));
      assert.ok(html.includes('id="timer-card"'));
      assert.ok(html.includes('id="timer-progress-bar"'));
      assert.ok(html.includes('id="btn-open-options"'));
      assert.ok(html.includes('id="btn-manage-settings"'));
      assert.ok(html.includes('id="btn-preview-blocked"'));
    });

    it('popup.css enforces 360px panel width and includes CSS custom property theme tokens', () => {
      const cssPath = path.join(popupDir, 'popup.css');
      assert.ok(fs.existsSync(cssPath), 'popup.css must exist');
      const css = fs.readFileSync(cssPath, 'utf8');

      assert.ok(css.includes('360px'), 'popup width must be 360px');
      assert.ok(css.includes('--bg'), 'CSS vars should include --bg');
      assert.ok(css.includes('--fg'), 'CSS vars should include --fg');
      assert.ok(css.includes('--rose'), 'CSS vars should include --rose');
      assert.ok(css.includes('prefers-color-scheme: dark'), 'Dark mode media query expected');
    });
  });

  describe('Shield Status rendering & toggling', () => {
    it('renders active shield state when blockingShield is true', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      const popup = await getPopupModule();

      if (typeof popup.renderShieldStatus === 'function') {
        await popup.renderShieldStatus();
      } else if (typeof popup.applyShieldUI === 'function') {
        popup.applyShieldUI(true);
      }

      const card = doc.getElementById('shield-card');
      const dot = doc.getElementById('shield-dot');
      const title = doc.getElementById('shield-title');

      assert.ok(card.classList.contains('shield-active'));
      assert.ok(dot.classList.contains('green'));
      assert.equal(title.textContent, 'Blocking Shield Active');
    });

    it('renders paused shield state when blockingShield is false', async () => {
      await StorageService.saveSettings({ blockingShield: false, lastResetDate: todayDateString() });
      const popup = await getPopupModule();

      if (typeof popup.renderShieldStatus === 'function') {
        await popup.renderShieldStatus();
      } else if (typeof popup.applyShieldUI === 'function') {
        popup.applyShieldUI(false);
      }

      const card = doc.getElementById('shield-card');
      const dot = doc.getElementById('shield-dot');
      const title = doc.getElementById('shield-title');
      const desc = doc.getElementById('shield-desc');

      assert.ok(card.classList.contains('shield-paused'));
      assert.ok(dot.classList.contains('amber'));
      assert.equal(title.textContent, 'Blocking Paused');
      assert.equal(desc.textContent, 'All websites temporarily allowed');
    });

    it('toggling shield switch updates settings storage and reflects in UI', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      const popup = await getPopupModule();

      if (typeof popup.onShieldToggle === 'function') {
        await popup.onShieldToggle(false);
      } else {
        const toggle = doc.getElementById('shield-toggle');
        await toggle.change(false);
      }

      const { blockingShield } = await StorageService.getSettings();
      assert.equal(blockingShield, false, 'Storage should be updated to false');

      const card = doc.getElementById('shield-card');
      assert.ok(card.classList.contains('shield-paused'));
    });
  });

  describe('Active Tab Detection and Quick-Block Button', () => {
    it('detects active tab domain, sets favicon URL, and enables quick block if unblocked', async () => {
      chrome.tabs._setTab({ id: 10, url: 'https://www.youtube.com/watch?v=123', active: true });
      await StorageService.saveHardBlocklist([]);

      const popup = await getPopupModule();
      if (typeof popup.renderActiveTab === 'function') {
        await popup.renderActiveTab();
      }

      const domainEl = doc.getElementById('active-tab-domain');
      const faviconEl = doc.getElementById('active-tab-favicon');
      const btn = doc.getElementById('btn-quick-block');

      assert.equal(domainEl.textContent, 'youtube.com');
      assert.equal(faviconEl.src, faviconUrl('youtube.com'));
      assert.equal(btn.disabled, false);
      assert.equal(btn.textContent.trim(), '+ Block');
    });

    it('quick block button adds domain to hardBlocklist and disables itself with "✓ Blocked"', async () => {
      chrome.tabs._setTab({ id: 10, url: 'https://www.reddit.com/r/popular', active: true });
      await StorageService.saveHardBlocklist([]);

      const popup = await getPopupModule();
      if (typeof popup.renderActiveTab === 'function') {
        await popup.renderActiveTab();
      }

      const btn = doc.getElementById('btn-quick-block');
      if (typeof popup.onQuickBlock === 'function') {
        await popup.onQuickBlock();
      } else {
        await btn.click();
      }

      const list = await StorageService.getHardBlocklist();
      assert.equal(list.length, 1);
      assert.equal(list[0].domain, 'reddit.com');
      assert.equal(list[0].enabled, true);

      assert.equal(btn.textContent.trim(), '✓ Blocked');
      assert.equal(btn.disabled, true);
    });

    it('renders quick block as disabled "✓ Blocked" if current tab is already blocked', async () => {
      chrome.tabs._setTab({ id: 10, url: 'https://twitter.com/home', active: true });
      await StorageService.saveHardBlocklist([
        { domain: 'twitter.com', enabled: true, addedAt: Date.now() }
      ]);

      const popup = await getPopupModule();
      if (typeof popup.renderActiveTab === 'function') {
        await popup.renderActiveTab();
      }

      const btn = doc.getElementById('btn-quick-block');
      assert.equal(btn.disabled, true);
      assert.equal(btn.textContent.trim(), '✓ Blocked');
    });
  });

  describe('Timer Summary Card', () => {
    it('shows timer widget with progress % and remaining time when tab is in a timer group', async () => {
      chrome.tabs._setTab({ id: 10, url: 'https://instagram.com/explore', active: true });
      await StorageService.saveTimerGroups([
        {
          id: 'social',
          name: 'Social Media',
          dailyLimitMinutes: 60,
          usedMinutes: 30,
          sites: ['instagram.com', 'facebook.com']
        }
      ]);

      const popup = await getPopupModule();
      if (typeof popup.renderTimerSummary === 'function') {
        await popup.renderTimerSummary();
      }

      const card = doc.getElementById('timer-card');
      const groupName = doc.getElementById('timer-group-name');
      const remaining = doc.getElementById('timer-remaining');
      const progressBar = doc.getElementById('timer-progress-bar');

      assert.equal(card.classList.contains('hidden'), false);
      assert.equal(groupName.textContent, 'Social Media');
      assert.ok(remaining.textContent.includes('30m left'));
      assert.equal(progressBar.style.width, '50%');
    });

    it('marks progress bar with .expired class when daily limit is reached', async () => {
      chrome.tabs._setTab({ id: 10, url: 'https://netflix.com/watch', active: true });
      await StorageService.saveTimerGroups([
        {
          id: 'entertainment',
          name: 'Entertainment',
          dailyLimitMinutes: 45,
          usedMinutes: 45,
          sites: ['netflix.com']
        }
      ]);

      const popup = await getPopupModule();
      if (typeof popup.renderTimerSummary === 'function') {
        await popup.renderTimerSummary();
      }

      const progressBar = doc.getElementById('timer-progress-bar');
      assert.ok(progressBar.classList.contains('expired'));
    });

    it('hides timer widget with .hidden when tab does not belong to any timer group', async () => {
      chrome.tabs._setTab({ id: 10, url: 'https://developer.mozilla.org', active: true });
      await StorageService.saveTimerGroups([
        {
          id: 'social',
          name: 'Social Media',
          dailyLimitMinutes: 30,
          usedMinutes: 10,
          sites: ['tiktok.com']
        }
      ]);

      const popup = await getPopupModule();
      if (typeof popup.renderTimerSummary === 'function') {
        await popup.renderTimerSummary();
      }

      const card = doc.getElementById('timer-card');
      assert.ok(card.classList.contains('hidden'));
    });
  });

  describe('Footer Navigation & Options Actions', () => {
    it('opens options page on gear button and manage settings click', async () => {
      const popup = await getPopupModule();
      if (typeof popup.bindEvents === 'function') {
        popup.bindEvents();
      }

      const btnGear = doc.getElementById('btn-open-options');
      await btnGear.click();
      assert.equal(chrome.runtime._optionsOpened, true);

      chrome.runtime._optionsOpened = false;
      const btnManage = doc.getElementById('btn-manage-settings');
      await btnManage.click();
      assert.equal(chrome.runtime._optionsOpened, true);
    });

    it('opens preview blocked screen tab on preview button click', async () => {
      const popup = await getPopupModule();
      if (typeof popup.bindEvents === 'function') {
        popup.bindEvents();
      }

      const btnPreview = doc.getElementById('btn-preview-blocked');
      await btnPreview.click();

      assert.equal(chrome.tabs._createdTabs.length, 1);
      assert.ok(chrome.tabs._createdTabs[0].url.includes('blocked/blocked.html?preview=true'));
    });
  });
});

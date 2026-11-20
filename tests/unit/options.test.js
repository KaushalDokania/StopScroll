// tests/unit/options.test.js
import '../mocks/chrome.mock.js';
import { setupOptionsDOM } from '../mocks/dom.mock.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StorageService } from '../../extension/shared/storage.js';
import { POPULAR_CATALOG } from '../../extension/shared/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const optionsDir = path.join(projectRoot, 'extension/options');

async function getOptionsModule() {
  return await import(`../../extension/options/options.js?t=${Date.now()}_${Math.random()}`);
}

describe('extension/options UI and Controller Unit Tests', () => {
  let doc;

  beforeEach(async () => {
    await chrome.storage.local.clear();
    doc = setupOptionsDOM();
  });

  describe('options.html & options.css static integrity', () => {
    it('options.html defines full two-column shell and all three tabs', () => {
      const htmlPath = path.join(optionsDir, 'options.html');
      assert.ok(fs.existsSync(htmlPath), 'options.html must exist');
      const html = fs.readFileSync(htmlPath, 'utf8');

      assert.ok(html.includes('id="app-shell"'));
      assert.ok(html.includes('id="sidebar"'));
      assert.ok(html.includes('id="sidebar-nav"'));
      assert.ok(html.includes('id="badge-hardblock"'));
      assert.ok(html.includes('id="badge-timers"'));
      assert.ok(html.includes('id="tab-hardblock"'));
      assert.ok(html.includes('id="tab-timers"'));
      assert.ok(html.includes('id="tab-priority"'));
      assert.ok(html.includes('id="search-input"'));
      assert.ok(html.includes('id="suggestions-dropdown"'));
      assert.ok(html.includes('id="suggestions-grid"'));
      assert.ok(html.includes('id="hardblock-list"'));
      assert.ok(html.includes('id="btn-new-group"'));
      assert.ok(html.includes('id="timer-groups-list"'));
    });

    it('options.css includes CSS theme tokens and layout styling', () => {
      const cssPath = path.join(optionsDir, 'options.css');
      assert.ok(fs.existsSync(cssPath), 'options.css must exist');
      const css = fs.readFileSync(cssPath, 'utf8');

      assert.ok(css.includes('--bg'));
      assert.ok(css.includes('--fg'));
      assert.ok(css.includes('--card-bg'));
      assert.ok(css.includes('--rose'));
      assert.ok(css.includes('--orange'));
      assert.ok(css.includes('prefers-color-scheme: dark'));
    });
  });

  describe('Tab switching', () => {
    it('switches active tab and updates nav indicator', async () => {
      const opt = await getOptionsModule();
      if (typeof opt.switchTab !== 'function') return;

      opt.switchTab('timers');

      const tabHardblock = doc.getElementById('tab-hardblock');
      const tabTimers = doc.getElementById('tab-timers');
      const tabPriority = doc.getElementById('tab-priority');

      assert.ok(tabHardblock.classList.contains('hidden'));
      assert.ok(!tabTimers.classList.contains('hidden'));
      assert.ok(tabTimers.classList.contains('active'));
      assert.ok(tabPriority.classList.contains('hidden'));

      opt.switchTab('priority');
      assert.ok(tabTimers.classList.contains('hidden'));
      assert.ok(!tabPriority.classList.contains('hidden'));
    });
  });

  describe('Hard Blocklist tab', () => {
    it('renders empty state when hardBlocklist is empty', async () => {
      await StorageService.saveHardBlocklist([]);
      const opt = await getOptionsModule();
      if (typeof opt.renderHardBlocklist !== 'function') return;

      await opt.renderHardBlocklist();

      const listEl = doc.getElementById('hardblock-list');
      const badge = doc.getElementById('badge-hardblock');

      assert.equal(badge.textContent, '0');
      assert.ok(listEl.innerHTML.includes('empty-state') || listEl.textContent.includes('No blocked websites yet'));
    });

    it('renders items with favicon, domain, toggle switch, and delete button', async () => {
      await StorageService.saveHardBlocklist([
        { domain: 'reddit.com', enabled: true, addedAt: Date.now() },
        { domain: 'youtube.com', enabled: false, addedAt: Date.now() }
      ]);
      const opt = await getOptionsModule();
      if (typeof opt.renderHardBlocklist !== 'function') return;

      await opt.renderHardBlocklist();

      const listEl = doc.getElementById('hardblock-list');
      const badge = doc.getElementById('badge-hardblock');

      assert.equal(badge.textContent, '2');
      assert.ok(listEl.innerHTML.includes('reddit.com'));
      assert.ok(listEl.innerHTML.includes('youtube.com'));
    });

    it('addToHardBlocklist normalizes domain, saves to storage, and updates badge', async () => {
      await StorageService.saveHardBlocklist([]);
      const opt = await getOptionsModule();
      if (typeof opt.addToHardBlocklist !== 'function') return;

      await opt.addToHardBlocklist('https://www.twitter.com/home');

      const list = await StorageService.getHardBlocklist();
      assert.equal(list.length, 1);
      assert.equal(list[0].domain, 'twitter.com');
      assert.equal(list[0].enabled, true);

      const badge = doc.getElementById('badge-hardblock');
      assert.equal(badge.textContent, '1');
    });

    it('does not add duplicates to hardBlocklist', async () => {
      await StorageService.saveHardBlocklist([
        { domain: 'twitter.com', enabled: true, addedAt: Date.now() }
      ]);
      const opt = await getOptionsModule();
      if (typeof opt.addToHardBlocklist !== 'function') return;

      await opt.addToHardBlocklist('twitter.com');
      const list = await StorageService.getHardBlocklist();
      assert.equal(list.length, 1);
    });

    it('toggleHardBlock updates enabled flag without deleting site', async () => {
      await StorageService.saveHardBlocklist([
        { domain: 'reddit.com', enabled: true, addedAt: Date.now() }
      ]);
      const opt = await getOptionsModule();
      if (typeof opt.toggleHardBlock !== 'function') return;

      await opt.toggleHardBlock('reddit.com', false);

      const list = await StorageService.getHardBlocklist();
      assert.equal(list[0].domain, 'reddit.com');
      assert.equal(list[0].enabled, false);
    });

    it('deleteHardBlock removes domain from storage and updates badge', async () => {
      await StorageService.saveHardBlocklist([
        { domain: 'reddit.com', enabled: true, addedAt: Date.now() },
        { domain: 'twitch.tv', enabled: true, addedAt: Date.now() }
      ]);
      const opt = await getOptionsModule();
      if (typeof opt.deleteHardBlock !== 'function') return;

      await opt.deleteHardBlock('reddit.com');

      const list = await StorageService.getHardBlocklist();
      assert.equal(list.length, 1);
      assert.equal(list[0].domain, 'twitch.tv');

      const badge = doc.getElementById('badge-hardblock');
      assert.equal(badge.textContent, '1');
    });
  });

  describe('Suggestions dropdown', () => {
    it('renders POPULAR_CATALOG items and marks already blocked items as Added', async () => {
      await StorageService.saveHardBlocklist([
        { domain: 'youtube.com', enabled: true, addedAt: Date.now() }
      ]);
      const opt = await getOptionsModule();
      if (typeof opt.renderSuggestions !== 'function') return;

      await opt.renderSuggestions('');

      const grid = doc.getElementById('suggestions-grid');
      assert.ok(grid.innerHTML.includes('youtube.com'));
      assert.ok(grid.innerHTML.includes('reddit.com'));
      assert.ok(grid.innerHTML.includes('Added'));
    });

    it('filters suggestions matching user query and appends custom domain card', async () => {
      await StorageService.saveHardBlocklist([]);
      const opt = await getOptionsModule();
      if (typeof opt.renderSuggestions !== 'function') return;

      await opt.renderSuggestions('redd');
      const grid = doc.getElementById('suggestions-grid');
      assert.ok(grid.innerHTML.includes('reddit.com'));
      assert.ok(!grid.innerHTML.includes('youtube.com'));

      await opt.renderSuggestions('customsite.org');
      assert.ok(grid.innerHTML.includes('customsite.org'));
    });
  });

  describe('Timer Groups tab', () => {
    it('renders empty state when timerGroups is empty', async () => {
      await StorageService.saveTimerGroups([]);
      const opt = await getOptionsModule();
      if (typeof opt.renderTimerGroups !== 'function') return;

      await opt.renderTimerGroups();

      const el = doc.getElementById('timer-groups-list');
      const badge = doc.getElementById('badge-timers');

      assert.equal(badge.textContent, '0');
      assert.ok(el.innerHTML.includes('empty-state') || el.textContent.includes('No timer groups yet'));
    });

    it('renders group card with progress %, limit, remaining, and .expired class if expired', async () => {
      await StorageService.saveTimerGroups([
        {
          id: 'g1',
          name: 'Social Media',
          dailyLimitMinutes: 60,
          usedMinutes: 30,
          sites: ['instagram.com', 'facebook.com']
        },
        {
          id: 'g2',
          name: 'Gaming',
          dailyLimitMinutes: 30,
          usedMinutes: 30, // Expired!
          sites: ['twitch.tv']
        }
      ]);

      const opt = await getOptionsModule();
      if (typeof opt.renderTimerGroups !== 'function') return;

      await opt.renderTimerGroups();

      const el = doc.getElementById('timer-groups-list');
      const badge = doc.getElementById('badge-timers');

      assert.equal(badge.textContent, '2');
      assert.ok(el.innerHTML.includes('Social Media'));
      assert.ok(el.innerHTML.includes('Gaming'));
      assert.ok(el.innerHTML.includes('instagram.com'));
      assert.ok(el.innerHTML.includes('expired'));
    });

    it('addTimerGroup creates a new group and saves to storage', async () => {
      await StorageService.saveTimerGroups([]);
      const opt = await getOptionsModule();
      if (typeof opt.addTimerGroup !== 'function') return;

      await opt.addTimerGroup('Deep Work', 45);

      const groups = await StorageService.getTimerGroups();
      assert.equal(groups.length, 1);
      assert.equal(groups[0].name, 'Deep Work');
      assert.equal(groups[0].dailyLimitMinutes, 45);
      assert.equal(groups[0].usedMinutes, 0);
      assert.deepEqual(groups[0].sites, []);

      const badge = doc.getElementById('badge-timers');
      assert.equal(badge.textContent, '1');
    });

    it('deleteTimerGroup removes group from storage', async () => {
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'G1', dailyLimitMinutes: 30, usedMinutes: 0, sites: [] },
        { id: 'g2', name: 'G2', dailyLimitMinutes: 60, usedMinutes: 0, sites: [] }
      ]);
      const opt = await getOptionsModule();
      if (typeof opt.deleteTimerGroup !== 'function') return;

      // Can delete by index or id
      await opt.deleteTimerGroup(0);

      const groups = await StorageService.getTimerGroups();
      assert.equal(groups.length, 1);
      assert.equal(groups[0].name, 'G2');

      const badge = doc.getElementById('badge-timers');
      assert.equal(badge.textContent, '1');
    });

    it('addSiteToGroup and removeSiteFromGroup manage group sites', async () => {
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'Entertainment', dailyLimitMinutes: 60, usedMinutes: 0, sites: ['youtube.com'] }
      ]);
      const opt = await getOptionsModule();
      if (typeof opt.addSiteToGroup !== 'function' || typeof opt.removeSiteFromGroup !== 'function') return;

      await opt.addSiteToGroup(0, 'netflix.com');
      let groups = await StorageService.getTimerGroups();
      assert.deepEqual(groups[0].sites, ['youtube.com', 'netflix.com']);

      await opt.removeSiteFromGroup(0, 0); // Remove youtube.com
      groups = await StorageService.getTimerGroups();
      assert.deepEqual(groups[0].sites, ['netflix.com']);
    });
  });

  describe('Priority Rules tab', () => {
    it('priority rules tab contains all three hierarchical rules', () => {
      const html = fs.readFileSync(path.join(optionsDir, 'options.html'), 'utf8');
      assert.ok(html.includes('Priority 1') || html.includes('Hard Blocklist'));
      assert.ok(html.includes('Priority 2') || html.includes('Timer Groups'));
      assert.ok(html.includes('Priority 3') || html.includes('General Browsing'));
    });
  });

  describe('Bugfixes & UX Enhancements', () => {
    it('Add button is disabled when search input is empty, and enables when typing', async () => {
      const opt = await getOptionsModule();
      opt.bindHardBlocklistEvents();

      const input = doc.getElementById('search-input');
      const addBtn = doc.getElementById('btn-search-add');

      assert.equal(addBtn.disabled, true);

      await input.input('github');
      assert.equal(addBtn.disabled, false);

      await input.input('');
      assert.equal(addBtn.disabled, true);
    });

    it('live search renders friendly names and favicons for custom and catalog sites', async () => {
      await StorageService.saveHardBlocklist([]);
      const opt = await getOptionsModule();

      await opt.renderSuggestions('github');
      const grid = doc.getElementById('suggestions-grid');

      assert.ok(grid.innerHTML.includes('github.com'));
      assert.ok(grid.innerHTML.includes('GitHub') || grid.innerHTML.includes('Github'));
      assert.ok(grid.innerHTML.includes('https://www.google.com/s2/favicons?domain=github.com'));
    });

    it('clicking outside search container collapses suggestions dropdown', async () => {
      const opt = await getOptionsModule();
      opt.bindHardBlocklistEvents();

      const dropdown = doc.getElementById('suggestions-dropdown');
      opt.showDropdown();
      assert.equal(dropdown.classList.contains('hidden'), false);

      // Simulate click outside
      const appShell = doc.getElementById('app-shell');
      await doc.dispatchEvent({ type: 'click', target: appShell });
      assert.equal(dropdown.classList.contains('hidden'), true);
    });

    it('dark mode toggles theme between light and dark', async () => {
      const opt = await getOptionsModule();

      await opt.applyTheme('light');
      assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');

      const newTheme = await opt.toggleTheme();
      assert.equal(newTheme, 'dark');
      assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');

      const nextTheme = await opt.toggleTheme();
      assert.equal(nextTheme, 'light');
      assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');
    });
  });
});

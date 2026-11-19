// tests/unit/background.test.js
import '../mocks/chrome.mock.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService } from '../../extension/shared/storage.js';
import { todayDateString, generateRuleId } from '../../extension/shared/utils.js';
import * as bg from '../../extension/background/background.js';

describe('background/background.js Unit Tests', () => {
  beforeEach(async () => {
    // Reset storage
    await chrome.storage.local.clear();
    // Reset DNR rules
    chrome.declarativeNetRequest._resetRules([]);
    // Reset tabs
    chrome.tabs._tabs.clear();
    // Reset idle state
    chrome.idle._state = 'active';
    if (typeof bg.setActiveTabDomain === 'function') {
      bg.setActiveTabDomain(null);
    }
    if (typeof bg.setIsUserActive === 'function') {
      bg.setIsUserActive(true);
    }
  });

  describe('extractDomain', () => {
    it('correctly extracts and normalizes domain from URL', () => {
      assert.equal(bg.extractDomain('https://www.youtube.com/watch?v=123'), 'youtube.com');
      assert.equal(bg.extractDomain('http://reddit.com/r/all/'), 'reddit.com');
      assert.equal(bg.extractDomain('invalid-url'), null);
      assert.equal(bg.extractDomain(null), null);
    });
  });

  describe('buildRedirectRule', () => {
    it('constructs valid declarativeNetRequest redirect rule without group', () => {
      const rule = bg.buildRedirectRule('twitter.com', 'hard_block', '');
      assert.equal(rule.id, generateRuleId('twitter.com'));
      assert.equal(rule.priority, 1);
      assert.equal(rule.action.type, 'redirect');
      assert.ok(rule.action.redirect.extensionPath.includes('/blocked/blocked.html?'));
      assert.ok(rule.action.redirect.extensionPath.includes('target=twitter.com'));
      assert.ok(rule.action.redirect.extensionPath.includes('reason=hard_block'));
      assert.equal(rule.condition.urlFilter, '||twitter.com^');
      assert.deepEqual(rule.condition.resourceTypes, ['main_frame']);
    });

    it('constructs valid redirect rule with group parameter for timer expiration', () => {
      const rule = bg.buildRedirectRule('reddit.com', 'timer_expired', 'Social Media');
      assert.ok(rule.action.redirect.extensionPath.includes('reason=timer_expired'));
      assert.ok(
        rule.action.redirect.extensionPath.includes('group=Social+Media') ||
        rule.action.redirect.extensionPath.includes('group=Social%20Media')
      );
    });
  });

  describe('syncDynamicRules', () => {
    it('creates rules for enabled hardBlocklist sites when shield is ON', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveHardBlocklist([
        { domain: 'twitter.com', enabled: true },
        { domain: 'facebook.com', enabled: false }
      ]);
      await StorageService.saveTimerGroups([]);

      await bg.syncDynamicRules();

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 1);
      assert.equal(activeRules[0].id, generateRuleId('twitter.com'));
      assert.ok(activeRules[0].action.redirect.extensionPath.includes('target=twitter.com'));
      assert.ok(activeRules[0].action.redirect.extensionPath.includes('reason=hard_block'));
    });

    it('creates rules for expired timer groups', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveHardBlocklist([]);
      await StorageService.saveTimerGroups([
        {
          id: 'g1',
          name: 'Entertainment',
          dailyLimitMinutes: 30,
          usedMinutes: 30, // Expired!
          sites: ['youtube.com', 'netflix.com']
        },
        {
          id: 'g2',
          name: 'Work',
          dailyLimitMinutes: 60,
          usedMinutes: 10, // Not expired
          sites: ['github.com']
        }
      ]);

      await bg.syncDynamicRules();

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 2);
      const ruleIds = activeRules.map(r => r.id);
      assert.ok(ruleIds.includes(generateRuleId('youtube.com')));
      assert.ok(ruleIds.includes(generateRuleId('netflix.com')));
    });

    it('gives hardBlocklist priority over timerGroups (no duplicate or conflicting rules)', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveHardBlocklist([
        { domain: 'youtube.com', enabled: true }
      ]);
      await StorageService.saveTimerGroups([
        {
          id: 'g1',
          name: 'Video',
          dailyLimitMinutes: 15,
          usedMinutes: 15, // Expired
          sites: ['youtube.com'] // youtube is in both
        }
      ]);

      await bg.syncDynamicRules();

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 1);
      assert.equal(activeRules[0].id, generateRuleId('youtube.com'));
      assert.ok(activeRules[0].action.redirect.extensionPath.includes('reason=hard_block'), 'Priority 1 hard_block must win');
    });

    it('removes ALL rules when blockingShield is false', async () => {
      // Seed existing rules
      chrome.declarativeNetRequest._resetRules([
        { id: 101, action: { type: 'redirect' }, condition: { urlFilter: '||example.com^' } }
      ]);

      await StorageService.saveSettings({ blockingShield: false, lastResetDate: todayDateString() });
      await StorageService.saveHardBlocklist([{ domain: 'twitter.com', enabled: true }]);

      await bg.syncDynamicRules();

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 0, 'All rules must be cleared when blockingShield is false');
    });

    it('diffs rules correctly: adds new, removes stale, keeps unchanged intact', async () => {
      const rule1 = bg.buildRedirectRule('reddit.com', 'hard_block', '');
      const staleRule = { id: 8888, action: { type: 'redirect' }, condition: { urlFilter: '||old.com^' } };

      chrome.declarativeNetRequest._resetRules([rule1, staleRule]);

      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      // reddit.com stays, twitter.com is added, staleRule should be removed
      await StorageService.saveHardBlocklist([
        { domain: 'reddit.com', enabled: true },
        { domain: 'twitter.com', enabled: true }
      ]);
      await StorageService.saveTimerGroups([]);

      await bg.syncDynamicRules();

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 2);
      const ids = activeRules.map(r => r.id);
      assert.ok(ids.includes(generateRuleId('reddit.com')));
      assert.ok(ids.includes(generateRuleId('twitter.com')));
      assert.ok(!ids.includes(8888), 'Stale rule must be removed');
    });
  });

  describe('Midnight Reset', () => {
    it('resets usedMinutes on all timer groups when date changes', async () => {
      const yesterday = '2026-01-01';
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: yesterday });
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'Social', dailyLimitMinutes: 30, usedMinutes: 30, sites: ['instagram.com'] },
        { id: 'g2', name: 'Gaming', dailyLimitMinutes: 60, usedMinutes: 45, sites: ['twitch.tv'] }
      ]);

      const resetOccurred = await bg.checkAndResetIfNewDay();
      assert.equal(resetOccurred, true);

      const { settings, timerGroups } = await StorageService.getAll();
      assert.equal(settings.lastResetDate, todayDateString());
      assert.equal(timerGroups[0].usedMinutes, 0);
      assert.equal(timerGroups[1].usedMinutes, 0);

      // Rules should have re-synced, removing expired block
      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 0);
    });

    it('does nothing if lastResetDate is already today', async () => {
      const today = todayDateString();
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: today });
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'Social', dailyLimitMinutes: 30, usedMinutes: 20, sites: ['instagram.com'] }
      ]);

      const resetOccurred = await bg.checkAndResetIfNewDay();
      assert.equal(resetOccurred, false);

      const { timerGroups } = await StorageService.getAll();
      assert.equal(timerGroups[0].usedMinutes, 20, 'Should not reset if same day');
    });
  });

  describe('Time Tracking Accumulator', () => {
    it('increments usedMinutes by 1 when active on a timer group site', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'Video', dailyLimitMinutes: 10, usedMinutes: 5, sites: ['youtube.com'] }
      ]);

      bg.setActiveTabDomain('youtube.com');
      bg.setIsUserActive(true);

      await bg.tickTimeTracker();

      const groups = await StorageService.getTimerGroups();
      assert.equal(groups[0].usedMinutes, 6);
    });

    it('triggers syncDynamicRules immediately when limit reached', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'Social', dailyLimitMinutes: 5, usedMinutes: 4, sites: ['reddit.com'] }
      ]);

      bg.setActiveTabDomain('reddit.com');
      bg.setIsUserActive(true);

      await bg.tickTimeTracker();

      const groups = await StorageService.getTimerGroups();
      assert.equal(groups[0].usedMinutes, 5);

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 1);
      assert.equal(activeRules[0].id, generateRuleId('reddit.com'));
    });

    it('does NOT increment when user is idle', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'Video', dailyLimitMinutes: 10, usedMinutes: 5, sites: ['youtube.com'] }
      ]);

      bg.setActiveTabDomain('youtube.com');
      bg.setIsUserActive(false); // Idle!

      await bg.tickTimeTracker();

      const groups = await StorageService.getTimerGroups();
      assert.equal(groups[0].usedMinutes, 5);
    });

    it('does NOT increment when blockingShield is false', async () => {
      await StorageService.saveSettings({ blockingShield: false, lastResetDate: todayDateString() });
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'Video', dailyLimitMinutes: 10, usedMinutes: 5, sites: ['youtube.com'] }
      ]);

      bg.setActiveTabDomain('youtube.com');
      bg.setIsUserActive(true);

      await bg.tickTimeTracker();

      const groups = await StorageService.getTimerGroups();
      assert.equal(groups[0].usedMinutes, 5);
    });

    it('supports subdomain matching e.g. music.youtube.com', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveTimerGroups([
        { id: 'g1', name: 'Video', dailyLimitMinutes: 10, usedMinutes: 0, sites: ['youtube.com'] }
      ]);

      bg.setActiveTabDomain('music.youtube.com');
      bg.setIsUserActive(true);

      await bg.tickTimeTracker();

      const groups = await StorageService.getTimerGroups();
      assert.equal(groups[0].usedMinutes, 1);
    });
  });

  describe('Event Handlers and Alarms', () => {
    it('sets up alarms on setupAlarms', () => {
      bg.setupAlarms();
      assert.ok(chrome.alarms._alarms.has('timeTracker'));
      assert.ok(chrome.alarms._alarms.has('midnightReset'));
    });

    it('handles tab activation and updates activeTabDomain', async () => {
      chrome.tabs._setTab({ id: 42, url: 'https://www.netflix.com/browse' });
      await chrome.tabs.onActivated._trigger({ tabId: 42 });
      assert.equal(bg.getActiveTabDomain(), 'netflix.com');
    });

    it('handles window focus loss by clearing activeTabDomain', async () => {
      bg.setActiveTabDomain('netflix.com');
      await chrome.windows.onFocusChanged._trigger(chrome.windows.WINDOW_ID_NONE);
      assert.equal(bg.getActiveTabDomain(), null);
    });

    it('handles idle state changes', async () => {
      bg.setIsUserActive(true);
      await chrome.idle.onStateChanged._trigger('idle');
      assert.equal(bg.getIsUserActive(), false);
      await chrome.idle.onStateChanged._trigger('active');
      assert.equal(bg.getIsUserActive(), true);
    });

    it('re-syncs rules when storage changed in local area', async () => {
      await StorageService.saveSettings({ blockingShield: true, lastResetDate: todayDateString() });
      await StorageService.saveHardBlocklist([{ domain: 'tiktok.com', enabled: true }]);

      // Trigger storage onChanged listener
      await chrome.storage.onChanged._trigger({ hardBlocklist: { newValue: [{ domain: 'tiktok.com', enabled: true }] } }, 'local');

      const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
      assert.equal(activeRules.length, 1);
      assert.equal(activeRules[0].id, generateRuleId('tiktok.com'));
    });
  });
});

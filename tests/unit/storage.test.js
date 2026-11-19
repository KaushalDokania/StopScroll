// tests/unit/storage.test.js
import '../mocks/chrome.mock.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService } from '../../extension/shared/storage.js';

describe('shared/storage.js StorageService unit tests', () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  describe('getAll', () => {
    it('returns default schema when storage is completely empty', async () => {
      const data = await StorageService.getAll();
      assert.deepEqual(data, {
        settings: {
          blockingShield: true,
          lastResetDate: ''
        },
        hardBlocklist: [],
        timerGroups: []
      });
    });
  });

  describe('settings', () => {
    it('returns default settings initially', async () => {
      const settings = await StorageService.getSettings();
      assert.deepEqual(settings, {
        blockingShield: true,
        lastResetDate: ''
      });
    });

    it('saves and retrieves updated settings', async () => {
      const newSettings = {
        blockingShield: false,
        lastResetDate: '2026-11-19'
      };
      await StorageService.saveSettings(newSettings);

      const retrieved = await StorageService.getSettings();
      assert.deepEqual(retrieved, newSettings);

      const all = await StorageService.getAll();
      assert.deepEqual(all.settings, newSettings);
      assert.deepEqual(all.hardBlocklist, []);
    });
  });

  describe('hardBlocklist', () => {
    it('returns empty array initially', async () => {
      const list = await StorageService.getHardBlocklist();
      assert.deepEqual(list, []);
    });

    it('saves and retrieves hard blocklist items', async () => {
      const sampleList = [
        { domain: 'reddit.com', enabled: true, addedAt: '2026-11-19T10:00:00Z' },
        { domain: 'youtube.com', enabled: false, addedAt: '2026-11-19T11:00:00Z' }
      ];

      await StorageService.saveHardBlocklist(sampleList);

      const retrieved = await StorageService.getHardBlocklist();
      assert.deepEqual(retrieved, sampleList);

      // Verify other fields remain intact
      const all = await StorageService.getAll();
      assert.deepEqual(all.hardBlocklist, sampleList);
      assert.equal(all.settings.blockingShield, true);
    });
  });

  describe('timerGroups', () => {
    it('returns empty array initially', async () => {
      const groups = await StorageService.getTimerGroups();
      assert.deepEqual(groups, []);
    });

    it('saves and retrieves timer groups', async () => {
      const sampleGroups = [
        {
          id: 'group-social',
          name: 'Social Media',
          dailyLimitMinutes: 30,
          usedMinutes: 15,
          domains: ['twitter.com', 'instagram.com']
        }
      ];

      await StorageService.saveTimerGroups(sampleGroups);

      const retrieved = await StorageService.getTimerGroups();
      assert.deepEqual(retrieved, sampleGroups);

      const all = await StorageService.getAll();
      assert.deepEqual(all.timerGroups, sampleGroups);
    });
  });

  describe('isolation and persistence', () => {
    it('updating one field preserves other fields', async () => {
      await StorageService.saveSettings({ blockingShield: false, lastResetDate: '2026-01-01' });
      await StorageService.saveHardBlocklist([{ domain: 'facebook.com', enabled: true, addedAt: '2026-01-01' }]);
      await StorageService.saveTimerGroups([{ id: 'g1', name: 'Work', dailyLimitMinutes: 60, usedMinutes: 0, domains: [] }]);

      const all = await StorageService.getAll();
      assert.equal(all.settings.blockingShield, false);
      assert.equal(all.settings.lastResetDate, '2026-01-01');
      assert.equal(all.hardBlocklist.length, 1);
      assert.equal(all.hardBlocklist[0].domain, 'facebook.com');
      assert.equal(all.timerGroups.length, 1);
      assert.equal(all.timerGroups[0].name, 'Work');
    });
  });
});

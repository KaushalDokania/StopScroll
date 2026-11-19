import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService, DEFAULTS } from '../extension/shared/storage.js';

describe('storage.js', () => {
  let mockStore = {};

  beforeEach(() => {
    mockStore = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: (defaults, callback) => {
            const result = {};
            for (const key of Object.keys(defaults)) {
              result[key] = mockStore[key] !== undefined ? mockStore[key] : defaults[key];
            }
            if (callback) callback(result);
            return Promise.resolve(result);
          },
          set: (items, callback) => {
            Object.assign(mockStore, items);
            if (callback) callback();
            return Promise.resolve();
          }
        }
      }
    };
  });

  test('getAll returns defaults initially', async () => {
    const all = await StorageService.getAll();
    assert.deepEqual(all, DEFAULTS);
  });

  test('getSettings and saveSettings', async () => {
    await StorageService.saveSettings({ blockingShield: false, lastResetDate: '2026-11-19' });
    const settings = await StorageService.getSettings();
    assert.equal(settings.blockingShield, false);
    assert.equal(settings.lastResetDate, '2026-11-19');
  });

  test('getHardBlocklist and saveHardBlocklist', async () => {
    const list = [{ domain: 'reddit.com', enabled: true, addedAt: '2026-11-19' }];
    await StorageService.saveHardBlocklist(list);
    const retrieved = await StorageService.getHardBlocklist();
    assert.deepEqual(retrieved, list);
  });

  test('getTimerGroups and saveTimerGroups', async () => {
    const groups = [{ id: 'social', name: 'Social', dailyLimitMinutes: 30, usedMinutes: 10, sites: ['instagram.com'] }];
    await StorageService.saveTimerGroups(groups);
    const retrieved = await StorageService.getTimerGroups();
    assert.deepEqual(retrieved, groups);
  });
});

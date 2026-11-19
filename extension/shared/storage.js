// shared/storage.js

export const DEFAULTS = {
  settings: {
    blockingShield: true,
    lastResetDate: ''
  },
  hardBlocklist: [],
  timerGroups: []
};

export const StorageService = {

  async getAll() {
    return new Promise(resolve => {
      chrome.storage.local.get(DEFAULTS, resolve);
    });
  },

  async getSettings() {
    const data = await this.getAll();
    return data.settings;
  },

  async saveSettings(settings) {
    return chrome.storage.local.set({ settings });
  },

  async getHardBlocklist() {
    const data = await this.getAll();
    return data.hardBlocklist;
  },

  async saveHardBlocklist(list) {
    return chrome.storage.local.set({ hardBlocklist: list });
  },

  async getTimerGroups() {
    const data = await this.getAll();
    return data.timerGroups;
  },

  async saveTimerGroups(groups) {
    return chrome.storage.local.set({ timerGroups: groups });
  }
};

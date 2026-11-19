// tests/mocks/chrome.mock.js
/**
 * Mock Chrome extension environment for unit testing.
 */

class MockStorageArea {
  constructor(areaName = 'local', onChangedEmitter = null) {
    this.areaName = areaName;
    this.onChangedEmitter = onChangedEmitter;
    this.store = {};
  }

  async get(keys, callback) {
    let result = {};
    if (keys === null || keys === undefined) {
      result = structuredClone(this.store);
    } else if (typeof keys === 'string') {
      if (this.store[keys] !== undefined) {
        result[keys] = structuredClone(this.store[keys]);
      }
    } else if (Array.isArray(keys)) {
      for (const k of keys) {
        if (this.store[k] !== undefined) {
          result[k] = structuredClone(this.store[k]);
        }
      }
    } else if (typeof keys === 'object') {
      for (const [key, defaultVal] of Object.entries(keys)) {
        if (this.store[key] !== undefined) {
          result[key] = structuredClone(this.store[key]);
        } else {
          result[key] = structuredClone(defaultVal);
        }
      }
    }

    if (typeof callback === 'function') {
      callback(result);
    }
    return result;
  }

  async set(items, callback) {
    const changes = {};
    for (const [k, v] of Object.entries(items)) {
      changes[k] = {
        oldValue: structuredClone(this.store[k]),
        newValue: structuredClone(v)
      };
      this.store[k] = structuredClone(v);
    }
    if (this.onChangedEmitter) {
      this.onChangedEmitter._trigger(changes, this.areaName);
    }
    if (typeof callback === 'function') {
      callback();
    }
  }

  async remove(keys, callback) {
    const list = Array.isArray(keys) ? keys : [keys];
    const changes = {};
    for (const k of list) {
      changes[k] = {
        oldValue: structuredClone(this.store[k]),
        newValue: undefined
      };
      delete this.store[k];
    }
    if (this.onChangedEmitter) {
      this.onChangedEmitter._trigger(changes, this.areaName);
    }
    if (typeof callback === 'function') {
      callback();
    }
  }

  async clear(callback) {
    const changes = {};
    for (const [k, v] of Object.entries(this.store)) {
      changes[k] = {
        oldValue: structuredClone(v),
        newValue: undefined
      };
    }
    this.store = {};
    if (this.onChangedEmitter) {
      this.onChangedEmitter._trigger(changes, this.areaName);
    }
    if (typeof callback === 'function') {
      callback();
    }
  }

  // Helper for test cleanup
  _reset(initialData = {}) {
    this.store = structuredClone(initialData);
  }
}

function createListenerMock() {
  const listeners = new Set();
  return {
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
    hasListener: (fn) => listeners.has(fn),
    _trigger: async (...args) => {
      for (const fn of listeners) {
        await fn(...args);
      }
    },
    _reset: () => listeners.clear()
  };
}

export function createMockChrome() {
  const storageOnChanged = createListenerMock();
  const storageLocal = new MockStorageArea('local', storageOnChanged);

  // In-memory Dynamic Net Request rules
  let dnrRules = [];

  // In-memory Alarms
  const alarmsMap = new Map();

  // In-memory Tabs
  const tabsMap = new Map();

  const chromeMock = {
    storage: {
      local: storageLocal,
      onChanged: storageOnChanged
    },
    runtime: {
      onInstalled: createListenerMock(),
      onMessage: createListenerMock(),
      onStartup: createListenerMock(),
      sendMessage: async (msg) => ({ received: true, msg }),
      getURL: (path) => `chrome-extension://mock-extension-id/${String(path).replace(/^\//, '')}`,
      openOptionsPage: async () => {
        chromeMock.runtime._optionsOpened = true;
        return true;
      },
      _optionsOpened: false,
      lastError: null
    },
    tabs: {
      _tabs: tabsMap,
      _createdTabs: [],
      _setTab: (tab) => tabsMap.set(tab.id, { id: tab.id, url: 'about:blank', active: true, windowId: 1, ...tab }),
      get: async (tabId) => {
        return tabsMap.get(tabId) || { id: tabId, url: 'about:blank', active: true, windowId: 1 };
      },
      query: async (queryInfo = {}) => {
        let list = Array.from(tabsMap.values());
        if (queryInfo.active !== undefined) {
          list = list.filter(t => t.active === queryInfo.active);
        }
        if (queryInfo.windowId !== undefined) {
          list = list.filter(t => t.windowId === queryInfo.windowId);
        }
        // If query specifies active: true and currentWindow: true, return active tabs
        return list;
      },
      update: async (tabId, updateProps) => {
        const current = tabsMap.get(tabId) || { id: tabId };
        const updated = { ...current, ...updateProps };
        tabsMap.set(tabId, updated);
        return updated;
      },
      create: async (props) => {
        const id = tabsMap.size + 100;
        const newTab = { id, ...props };
        chromeMock.tabs._createdTabs.push(newTab);
        tabsMap.set(id, newTab);
        return newTab;
      },
      onActivated: createListenerMock(),
      onUpdated: createListenerMock()
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onFocusChanged: createListenerMock()
    },
    alarms: {
      _alarms: alarmsMap,
      create: (name, alarmInfo) => {
        alarmsMap.set(name, { name, ...alarmInfo });
      },
      get: async (name) => alarmsMap.get(name) || null,
      getAll: async () => Array.from(alarmsMap.values()),
      clear: async (name) => alarmsMap.delete(name),
      clearAll: async () => alarmsMap.clear(),
      onAlarm: createListenerMock()
    },
    idle: {
      _state: 'active',
      queryState: async (detectionIntervalInSeconds) => chromeMock.idle._state,
      setDetectionInterval: (interval) => {},
      onStateChanged: createListenerMock()
    },
    declarativeNetRequest: {
      _getRulesInternal: () => dnrRules,
      _resetRules: (initial = []) => {
        dnrRules = structuredClone(initial);
      },
      getDynamicRules: async () => {
        return structuredClone(dnrRules);
      },
      updateDynamicRules: async ({ addRules = [], removeRuleIds = [] } = {}) => {
        const removeSet = new Set(removeRuleIds);
        dnrRules = dnrRules.filter(r => !removeSet.has(r.id));
        for (const rule of addRules) {
          // If already exists with same id, replace
          const existingIdx = dnrRules.findIndex(r => r.id === rule.id);
          if (existingIdx >= 0) {
            dnrRules[existingIdx] = structuredClone(rule);
          } else {
            dnrRules.push(structuredClone(rule));
          }
        }
      },
      RuleActionType: {
        BLOCK: 'block',
        REDIRECT: 'redirect'
      },
      RuleResourceType: {
        MAIN_FRAME: 'main_frame'
      }
    }
  };

  return chromeMock;
}

// Automatically install into globalThis if not already defined or to ensure fresh mock
export const mockChrome = createMockChrome();
globalThis.chrome = mockChrome;

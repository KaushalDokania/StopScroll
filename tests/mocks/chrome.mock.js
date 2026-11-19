// tests/mocks/chrome.mock.js
/**
 * Mock Chrome extension environment for unit testing.
 */

class MockStorageArea {
  constructor() {
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
    for (const [k, v] of Object.entries(items)) {
      this.store[k] = structuredClone(v);
    }
    if (typeof callback === 'function') {
      callback();
    }
  }

  async remove(keys, callback) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      delete this.store[k];
    }
    if (typeof callback === 'function') {
      callback();
    }
  }

  async clear(callback) {
    this.store = {};
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
    _trigger: (...args) => {
      for (const fn of listeners) {
        fn(...args);
      }
    },
    _reset: () => listeners.clear()
  };
}

export function createMockChrome() {
  const storageLocal = new MockStorageArea();

  const chromeMock = {
    storage: {
      local: storageLocal
    },
    runtime: {
      onInstalled: createListenerMock(),
      onMessage: createListenerMock(),
      onStartup: createListenerMock(),
      sendMessage: async (msg) => ({ received: true, msg }),
      getURL: (path) => `chrome-extension://mock-extension-id/${String(path).replace(/^\//, '')}`,
      lastError: null
    },
    tabs: {
      query: async (queryInfo) => [],
      update: async (tabId, updateProps) => ({ id: tabId, ...updateProps }),
      create: async (props) => ({ id: 101, ...props }),
      onActivated: createListenerMock(),
      onUpdated: createListenerMock()
    },
    alarms: {
      create: (name, alarmInfo) => {},
      clear: async (name) => true,
      onAlarm: createListenerMock()
    },
    idle: {
      queryState: async (detectionIntervalInSeconds) => 'active',
      setDetectionInterval: (interval) => {},
      onStateChanged: createListenerMock()
    },
    declarativeNetRequest: {
      getDynamicRules: async () => [],
      updateDynamicRules: async ({ addRules = [], removeRuleIds = [] }) => {},
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

// background/background.js
/**
 * StopScroll Background Service Worker (Manifest V3)
 * Orchestrates dynamic declarativeNetRequest rules, active tab time tracking,
 * idle detection, and daily midnight timer resets.
 */

import { StorageService } from '../shared/storage.js';
import { generateRuleId, todayDateString } from '../shared/utils.js';

// ── In-Memory Session State ──────────────────────────────────────────────────
let activeTabDomain = null;
let isUserActive = true;

export function getActiveTabDomain() {
  return activeTabDomain;
}

export function setActiveTabDomain(domain) {
  activeTabDomain = domain;
}

export function getIsUserActive() {
  return isUserActive;
}

export function setIsUserActive(active) {
  isUserActive = Boolean(active);
}

// ── Domain Extraction ────────────────────────────────────────────────────────
export function extractDomain(url) {
  try {
    if (!url) return null;
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// ── Next Midnight Timestamp (Local Time) ─────────────────────────────────────
export function nextMidnightMs() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime();
}

// ── Rule Builder ─────────────────────────────────────────────────────────────
export function buildRedirectRule(domain, reason, groupName = '') {
  const params = new URLSearchParams({ target: domain, reason });
  if (groupName) params.set('group', groupName);

  return {
    id: generateRuleId(domain),
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        extensionPath: `/blocked/blocked.html?${params.toString()}`
      }
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ['main_frame']
    }
  };
}

// ── Dynamic Rules Synchronization ───────────────────────────────────────────
export async function syncDynamicRules() {
  const { settings, hardBlocklist, timerGroups } = await StorageService.getAll();

  const desiredRules = [];

  if (settings && settings.blockingShield) {
    // Priority 1: Hard Blocklist (always takes precedence)
    if (Array.isArray(hardBlocklist)) {
      for (const entry of hardBlocklist) {
        if (entry && entry.enabled) {
          desiredRules.push(buildRedirectRule(
            entry.domain,
            'hard_block',
            ''
          ));
        }
      }
    }

    // Priority 2: Expired Timer Groups
    if (Array.isArray(timerGroups)) {
      for (const group of timerGroups) {
        if (group && group.usedMinutes >= group.dailyLimitMinutes) {
          if (Array.isArray(group.sites)) {
            for (const domain of group.sites) {
              // Skip if already covered by hard blocklist
              const isHardBlocked = hardBlocklist && hardBlocklist.some(
                e => e.domain === domain && e.enabled
              );
              if (!isHardBlocked) {
                desiredRules.push(buildRedirectRule(
                  domain,
                  'timer_expired',
                  group.name || ''
                ));
              }
            }
          }
        }
      }
    }
  }

  // Diff against existing dynamic rules in declarativeNetRequest
  if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest?.getDynamicRules) {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existingRules.map(r => r.id);
    const desiredIds = desiredRules.map(r => r.id);

    const toRemove = existingIds.filter(id => !desiredIds.includes(id));
    const toAdd = desiredRules.filter(r => !existingIds.includes(r.id));

    if (toRemove.length > 0 || toAdd.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: toRemove,
        addRules: toAdd
      });
    }
  }

  return desiredRules;
}

// ── Time Tracking Accumulator ────────────────────────────────────────────────
export async function tickTimeTracker() {
  if (!activeTabDomain || !isUserActive) return;

  const { settings, timerGroups } = await StorageService.getAll();
  if (!settings || !settings.blockingShield) return;
  if (!Array.isArray(timerGroups)) return;

  let changed = false;
  for (const group of timerGroups) {
    const domainMatch = group.sites && (
      group.sites.includes(activeTabDomain) ||
      group.sites.some(s => activeTabDomain.endsWith('.' + s))
    );

    if (domainMatch) {
      if (group.usedMinutes < group.dailyLimitMinutes) {
        group.usedMinutes += 1;
        changed = true;
        // If this tick reached or exceeded the limit, save & sync rules immediately
        if (group.usedMinutes >= group.dailyLimitMinutes) {
          await StorageService.saveTimerGroups(timerGroups);
          await syncDynamicRules();
          return;
        }
      }
      break; // A domain belongs to at most one group
    }
  }

  if (changed) {
    await StorageService.saveTimerGroups(timerGroups);
  }
}

// ── Midnight Reset Handler ───────────────────────────────────────────────────
export async function checkAndResetIfNewDay() {
  const { settings, timerGroups } = await StorageService.getAll();
  const today = todayDateString();

  if (settings && settings.lastResetDate !== today) {
    if (Array.isArray(timerGroups)) {
      for (const group of timerGroups) {
        group.usedMinutes = 0;
      }
    }
    settings.lastResetDate = today;
    await StorageService.saveSettings(settings);
    if (Array.isArray(timerGroups)) {
      await StorageService.saveTimerGroups(timerGroups);
    }
    await syncDynamicRules(); // Remove expired-timer block rules
    return true;
  }
  return false;
}

// ── Alarm Setup ──────────────────────────────────────────────────────────────
export function setupAlarms() {
  if (typeof chrome !== 'undefined' && chrome.alarms?.create) {
    chrome.alarms.create('timeTracker', { periodInMinutes: 1 });
    chrome.alarms.create('midnightReset', {
      when: nextMidnightMs(),
      periodInMinutes: 24 * 60
    });
  }
}

// ── Chrome Event Listeners ───────────────────────────────────────────────────
if (typeof chrome !== 'undefined') {
  // On install
  if (chrome.runtime?.onInstalled) {
    chrome.runtime.onInstalled.addListener(async ({ reason }) => {
      if (reason === 'install') {
        await chrome.storage.local.set({
          settings: { blockingShield: true, lastResetDate: todayDateString() },
          hardBlocklist: [],
          timerGroups: []
        });
      }
      await syncDynamicRules();
      setupAlarms();
    });
  }

  // On startup
  if (chrome.runtime?.onStartup) {
    chrome.runtime.onStartup.addListener(async () => {
      await checkAndResetIfNewDay();
      await syncDynamicRules();
      setupAlarms();
    });
  }

  // On tab activation
  if (chrome.tabs?.onActivated) {
    chrome.tabs.onActivated.addListener(async ({ tabId }) => {
      try {
        const tab = await chrome.tabs.get(tabId);
        activeTabDomain = extractDomain(tab?.url);
      } catch {
        activeTabDomain = null;
      }
    });
  }

  // On browser window focus change
  if (chrome.windows?.onFocusChanged) {
    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      const WINDOW_ID_NONE = chrome.windows?.WINDOW_ID_NONE ?? -1;
      if (windowId === WINDOW_ID_NONE) {
        activeTabDomain = null;
        return;
      }
      try {
        const tabs = await chrome.tabs.query({ active: true, windowId });
        if (tabs && tabs.length > 0) {
          activeTabDomain = extractDomain(tabs[0]?.url);
        }
      } catch {
        activeTabDomain = null;
      }
    });
  }

  // On user idle state change
  if (chrome.idle?.onStateChanged) {
    chrome.idle.onStateChanged.addListener((newState) => {
      isUserActive = (newState === 'active');
    });
  }

  // On alarms
  if (chrome.alarms?.onAlarm) {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'timeTracker') await tickTimeTracker();
      if (alarm.name === 'midnightReset') await checkAndResetIfNewDay();
    });
  }

  // On storage changed
  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area === 'local') {
        await syncDynamicRules();
      }
    });
  }
}

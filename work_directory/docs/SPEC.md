# Technical Specification: StopScroll Chrome Extension
## Phase-Wise Implementation Spec

**Product:** StopScroll  
**Version:** 1.0 (MVP)  
**Spec Status:** Implementation-Ready  
**Date:** 2026-11-19  
**References:** [PRD.md](./PRD.md) · [ARCHITECTURE_PLAN.md](./ARCHITECTURE_PLAN.md) · [UI_MOCKUP.html](./UI_MOCKUP.html)

---

## Table of Contents

1. [Project Overview & Conventions](#1-project-overview--conventions)
2. [Folder Structure](#2-folder-structure)
3. [Phase 1 — Project Scaffolding & Manifest](#phase-1--project-scaffolding--manifest)
4. [Phase 2 — Storage Layer & Rule Engine (background.js)](#phase-2--storage-layer--rule-engine)
5. [Phase 3 — Extension Popup UI](#phase-3--extension-popup-ui)
6. [Phase 4 — Options & Control Hub](#phase-4--options--control-hub)
7. [Phase 5 — Blocked Page & Quotes Engine](#phase-5--blocked-page--quotes-engine)
8. [Phase 6 — End-to-End Verification & Ship](#phase-6--end-to-end-verification--ship)
9. [Cross-Cutting Concerns](#cross-cutting-concerns)
10. [Appendix: Full Data Contracts](#appendix-full-data-contracts)

---

## 1. Project Overview & Conventions

### 1.1 What We Are Building

StopScroll is a **Manifest V3 Chrome Extension** that:
- Permanently blocks user-specified domains (Hard Blocklist) using `chrome.declarativeNetRequest`
- Allows bounded daily browsing via **Timer Groups** (e.g., 30 mins/day for Social Media)
- Redirects blocked site visits to a friendly, motivational `blocked.html` page
- Tracks active-tab time in a background service worker using `chrome.alarms` and `chrome.idle`
- Resets all timers at midnight (local time) daily

### 1.2 Technology Stack

| Layer | Technology |
|:---|:---|
| Extension platform | Chrome Manifest V3 |
| Blocking engine | `chrome.declarativeNetRequest` (dynamic rules) |
| Persistence | `chrome.storage.local` |
| Time tracking | `chrome.alarms`, `chrome.tabs`, `chrome.windows`, `chrome.idle` |
| UI | Vanilla HTML + CSS (Tailwind CDN in mockup; custom CSS in production) |
| Scripting | Vanilla JavaScript (ES2022, no bundler required for MVP) |
| Icons | SVG-first, PNG fallbacks at 16/32/48/128 px |

### 1.3 Coding Conventions

- **No external runtime dependencies.** No React, Vue, or npm packages.
- **No `eval`, no inline event handlers** in HTML (CSP compliance).
- All JS loaded via `<script src="...">` with `defer` or at end of `<body>`.
- Storage keys are always read/written via the central `StorageService` module.
- Rule IDs for `declarativeNetRequest` are **deterministic integers** derived from domain strings, not random.
- Domain strings are always **normalized** before storage or comparison: lowercase, no `www.`, no path, no trailing slash.

### 1.4 Domain Normalization Function (Shared)
Every user input goes through this function before touching storage or rules:

```javascript
// shared/utils.js
function normalizeDomain(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')   // strip scheme
    .replace(/^www\./, '')          // strip www
    .split('/')[0]                  // drop path
    .split('?')[0];                 // drop query
}
```

---

## 2. Folder Structure

```
stopscroll/
├── manifest.json
├── background/
│   └── background.js            ← Service worker: rules, tracking, alarms
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
├── blocked/
│   ├── blocked.html
│   ├── blocked.css
│   └── blocked.js
├── shared/
│   ├── utils.js                 ← normalizeDomain, generateRuleId, etc.
│   ├── storage.js               ← StorageService wrapper
│   └── catalog.js               ← Pre-populated popular sites list
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

---

## Phase 1 — Project Scaffolding & Manifest

**Goal:** Establish the full project skeleton, `manifest.json`, and all static assets so every subsequent phase can plug in without file-structure changes.

**Deliverables:** `manifest.json`, `icons/`, skeleton HTML files, `shared/utils.js`, `shared/storage.js`, `shared/catalog.js`

---

### 1.1 manifest.json

```json
{
  "manifest_version": 3,
  "name": "StopScroll",
  "version": "1.0.0",
  "description": "Block distracting websites and enforce daily time limits with Timer Groups.",

  "permissions": [
    "declarativeNetRequest",
    "storage",
    "tabs",
    "idle",
    "alarms"
  ],

  "host_permissions": [
    "<all_urls>"
  ],

  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  },

  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16":  "icons/icon16.png",
      "32":  "icons/icon32.png",
      "48":  "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "StopScroll"
  },

  "options_page": "options/options.html",

  "declarative_net_request": {
    "rule_resources": []
  },

  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },

  "icons": {
    "16":  "icons/icon16.png",
    "32":  "icons/icon32.png",
    "48":  "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

> **Note on `host_permissions`:** `<all_urls>` is required for `declarativeNetRequest` redirect rules to cover any domain the user wants to block. This will be disclosed in the Chrome Web Store listing.

---

### 1.2 shared/utils.js

```javascript
// shared/utils.js

/**
 * Normalizes a user-provided domain input to a clean hostname.
 * "https://www.Reddit.com/r/all/" → "reddit.com"
 */
export function normalizeDomain(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0];
}

/**
 * Generates a deterministic integer rule ID from a domain string.
 * Uses a simple djb2-style hash to stay within Chrome's rule ID limits.
 * Range: 1 – 999999 (Chrome allows up to 30,000 dynamic rules per extension)
 */
export function generateRuleId(domain) {
  let hash = 5381;
  for (let i = 0; i < domain.length; i++) {
    hash = ((hash << 5) + hash) + domain.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash % 999998) + 1;
}

/**
 * Returns today's date as "YYYY-MM-DD" string in local time.
 */
export function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * Returns the Google favicon service URL for a domain.
 */
export function faviconUrl(domain, size = 32) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}
```

---

### 1.3 shared/storage.js

Central read/write gateway. All other modules import from here — never call `chrome.storage` directly.

```javascript
// shared/storage.js

const DEFAULTS = {
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
```

---

### 1.4 shared/catalog.js

Pre-populated catalog of popular distraction sites used in the suggestions dropdown.

```javascript
// shared/catalog.js

export const POPULAR_CATALOG = [
  { domain: 'youtube.com',   name: 'YouTube',    color: '#FF0000' },
  { domain: 'reddit.com',    name: 'Reddit',     color: '#FF4500' },
  { domain: 'facebook.com',  name: 'Facebook',   color: '#1877F2' },
  { domain: 'instagram.com', name: 'Instagram',  color: '#E4405F' },
  { domain: 'netflix.com',   name: 'Netflix',    color: '#E50914' },
  { domain: 'twitter.com',   name: 'X / Twitter',color: '#000000' },
  { domain: 'tiktok.com',    name: 'TikTok',     color: '#000000' },
  { domain: 'twitch.tv',     name: 'Twitch',     color: '#9146FF' },
  { domain: 'discord.com',   name: 'Discord',    color: '#5865F2' },
  { domain: 'linkedin.com',  name: 'LinkedIn',   color: '#0A66C2' },
  { domain: 'pinterest.com', name: 'Pinterest',  color: '#E60023' },
  { domain: 'snapchat.com',  name: 'Snapchat',   color: '#FFFC00' },
];
```

---

### 1.5 Skeleton HTML Files

Create empty skeleton files for each UI surface so imports resolve from day one:
- `popup/popup.html` — `<!DOCTYPE html>` with links to `popup.css` and `popup.js`
- `options/options.html` — same pattern
- `blocked/blocked.html` — same pattern

Each file must include `<meta charset="UTF-8">`, a `<title>`, and load its JS with `type="module"`.

---

### Phase 1 Acceptance Criteria

- [ ] Extension loads in `chrome://extensions` (Developer Mode, Load Unpacked) with no manifest errors
- [ ] Extension icon appears in Chrome toolbar
- [ ] Popup opens (even if blank) with no console errors
- [ ] `chrome://extensions` shows no permission errors

---

---

## Phase 2 — Storage Layer & Rule Engine

**Goal:** Implement the entire background service worker: rule compilation, `declarativeNetRequest` sync, active tab time tracking, idle detection, and midnight reset.

**Deliverables:** `background/background.js` (complete), `shared/storage.js` (finalized)

---

### 2.1 background.js — Module Architecture

The background service worker is organized into four logical sections:

```
background.js
├── 1. Initialization (on install + on startup)
├── 2. Rule Engine  — syncDynamicRules()
├── 3. Time Tracker — tab/window/idle listeners + alarm tick
└── 4. Midnight Reset — alarm handler
```

---

### 2.2 Initialization

```javascript
// background/background.js

import { StorageService } from '../shared/storage.js';
import { generateRuleId, todayDateString } from '../shared/utils.js';

// ── On first install: seed default storage ────────────────────────────────
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

// ── On browser startup: re-sync rules and check midnight reset ────────────
chrome.runtime.onStartup.addListener(async () => {
  await checkAndResetIfNewDay();
  await syncDynamicRules();
  setupAlarms();
});
```

---

### 2.3 Rule Engine — syncDynamicRules()

This is the core blocking function. It is called whenever storage changes, timer expires, or the extension starts.

**Algorithm:**
1. Load `settings`, `hardBlocklist`, and `timerGroups` from storage
2. If `blockingShield` is `false` → remove ALL dynamic rules, return
3. Build redirect rules for:
   - Every `hardBlocklist` entry where `enabled === true`
   - Every domain in a `timerGroup` where `usedMinutes >= dailyLimitMinutes`
4. Diff against currently active dynamic rules
5. Remove stale rules, add new rules atomically

```javascript
async function syncDynamicRules() {
  const { settings, hardBlocklist, timerGroups } = await StorageService.getAll();
  
  // Build the set of rules we WANT active
  const desiredRules = [];

  if (settings.blockingShield) {
    
    // Priority 1: Hard Blocklist
    for (const entry of hardBlocklist) {
      if (entry.enabled) {
        desiredRules.push(buildRedirectRule(
          entry.domain,
          `hard_block`,
          ''
        ));
      }
    }

    // Priority 2: Expired Timer Groups
    for (const group of timerGroups) {
      if (group.usedMinutes >= group.dailyLimitMinutes) {
        for (const domain of group.sites) {
          // Skip if already covered by hard blocklist
          const isHardBlocked = hardBlocklist.some(
            e => e.domain === domain && e.enabled
          );
          if (!isHardBlocked) {
            desiredRules.push(buildRedirectRule(
              domain,
              'timer_expired',
              group.name
            ));
          }
        }
      }
    }
  }

  // Get currently active rules to diff
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map(r => r.id);
  const desiredIds  = desiredRules.map(r => r.id);

  const toRemove = existingIds.filter(id => !desiredIds.includes(id));
  const toAdd    = desiredRules.filter(r => !existingIds.includes(r.id));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: toRemove,
    addRules:      toAdd
  });
}

function buildRedirectRule(domain, reason, groupName) {
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
```

---

### 2.4 Time Tracking Engine

#### State Variables (in-memory, session only)

```javascript
let activeTabDomain = null;   // domain currently in focus
let isUserActive    = true;   // false when Chrome reports idle/locked
```

#### Active Tab Detection

```javascript
// When user switches tabs
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  activeTabDomain = extractDomain(tab.url);
});

// When user switches browser windows (or minimizes)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    activeTabDomain = null; // browser lost focus
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab) activeTabDomain = extractDomain(tab.url);
});

// When user goes idle (no mouse/keyboard input for 60 seconds)
chrome.idle.onStateChanged.addListener((newState) => {
  isUserActive = (newState === 'active');
});

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
```

#### 1-Minute Tick — Time Accumulator

```javascript
function setupAlarms() {
  chrome.alarms.create('timeTracker', { periodInMinutes: 1 });
  chrome.alarms.create('midnightReset', { 
    when: nextMidnightMs(),
    periodInMinutes: 24 * 60
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'timeTracker') await tickTimeTracker();
  if (alarm.name === 'midnightReset') await checkAndResetIfNewDay();
});

async function tickTimeTracker() {
  if (!activeTabDomain || !isUserActive) return;

  const { settings, timerGroups } = await StorageService.getAll();
  if (!settings.blockingShield) return;

  let changed = false;
  for (const group of timerGroups) {
    if (group.sites.includes(activeTabDomain)) {
      if (group.usedMinutes < group.dailyLimitMinutes) {
        group.usedMinutes += 1;
        changed = true;
        // If this tick pushed us over the limit, sync rules immediately
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
```

---

### 2.5 Midnight Reset

```javascript
async function checkAndResetIfNewDay() {
  const { settings, timerGroups } = await StorageService.getAll();
  const today = todayDateString();

  if (settings.lastResetDate !== today) {
    // Reset all timer groups
    for (const group of timerGroups) {
      group.usedMinutes = 0;
    }
    settings.lastResetDate = today;
    await StorageService.saveSettings(settings);
    await StorageService.saveTimerGroups(timerGroups);
    await syncDynamicRules(); // Remove expired-timer block rules
  }
}

function nextMidnightMs() {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime();
}
```

---

### 2.6 Storage Change Listener

Re-sync rules whenever any storage change occurs (e.g., user adds a site in options).

```javascript
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local') {
    await syncDynamicRules();
  }
});
```

---

### Phase 2 Acceptance Criteria

- [ ] Load extension, open `chrome://extensions` → background service worker shows "Service worker: active"
- [ ] Add `twitter.com` to `hardBlocklist` via `chrome.storage.local.set(...)` in DevTools console → navigate to `twitter.com` → redirected to `blocked.html`
- [ ] Set `settings.blockingShield = false` → navigate to any blocked site → it loads normally
- [ ] Set `timerGroups[0].usedMinutes = timerGroups[0].dailyLimitMinutes` → navigate to a site in that group → redirected to `blocked.html`
- [ ] Browser restart → rules still active (storage persisted)

---

---

## Phase 3 — Extension Popup UI

**Goal:** Build the compact 360px popup that shows the blocking status, current tab detection, quick-block button, and active timer summary.

**Deliverables:** `popup/popup.html`, `popup/popup.css`, `popup/popup.js`

---

### 3.1 popup.html — Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StopScroll</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>

  <!-- ── Header ───────────────────────────────────────────── -->
  <header id="popup-header">
    <div class="brand">
      <div class="brand-icon"><!-- shield SVG --></div>
      <span class="brand-name">StopScroll</span>
    </div>
    <button id="btn-open-options" title="Open Settings" aria-label="Open Settings">
      <!-- gear SVG -->
    </button>
  </header>

  <!-- ── Body ─────────────────────────────────────────────── -->
  <main id="popup-body">

    <!-- Card 1: Blocking Shield Toggle -->
    <div id="shield-card" class="card">
      <div class="shield-status">
        <span id="shield-dot" class="status-dot active"></span>
        <div>
          <p id="shield-title" class="card-title">Blocking Shield Active</p>
          <p id="shield-desc"  class="card-desc">Rules &amp; Timers Enforced</p>
        </div>
      </div>
      <label class="toggle-switch" aria-label="Toggle blocking shield">
        <input type="checkbox" id="shield-toggle" checked>
        <span class="toggle-track"></span>
      </label>
    </div>

    <!-- Card 2: Current Website -->
    <div id="active-tab-card" class="card">
      <div class="card-row-header">
        <span class="label-sm">Current Website</span>
        <span class="badge amber">● Active Tab</span>
      </div>
      <div class="card-row-body">
        <div class="site-info">
          <img id="active-tab-favicon" src="" alt="" class="favicon" width="20" height="20">
          <span id="active-tab-domain" class="domain-mono">—</span>
        </div>
        <button id="btn-quick-block" class="btn btn-block">+ Block</button>
      </div>
    </div>

    <!-- Card 3: Active Timer Summary -->
    <div id="timer-card" class="card hidden">
      <div class="card-row-header">
        <div class="timer-label">
          <!-- clock SVG -->
          <span id="timer-group-name">Social Media</span>
        </div>
        <span id="timer-remaining" class="timer-value">— m left</span>
      </div>
      <div class="progress-bar-track">
        <div id="timer-progress-bar" class="progress-bar-fill" style="width: 0%"></div>
      </div>
      <div class="timer-meta">
        <span id="timer-sites">—</span>
        <span class="timer-reset">Resets at midnight</span>
      </div>
    </div>

  </main>

  <!-- ── Footer ───────────────────────────────────────────── -->
  <footer id="popup-footer">
    <button id="btn-preview-blocked" class="btn-link">
      <!-- eye SVG --> Preview Block Screen
    </button>
    <button id="btn-manage-settings" class="btn-link accent">
      Manage Settings →
    </button>
  </footer>

  <script src="popup.js" type="module"></script>
</body>
</html>
```

---

### 3.2 popup.js — Logic

#### On Load

```javascript
// popup/popup.js
import { StorageService } from '../shared/storage.js';
import { normalizeDomain, faviconUrl } from '../shared/utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  await renderShieldStatus();
  await renderActiveTab();
  await renderTimerSummary();
  bindEvents();
});
```

#### Shield Toggle

```javascript
async function renderShieldStatus() {
  const { blockingShield } = await StorageService.getSettings();
  const toggle = document.getElementById('shield-toggle');
  toggle.checked = blockingShield;
  applyShieldUI(blockingShield);
}

function applyShieldUI(active) {
  const card  = document.getElementById('shield-card');
  const dot   = document.getElementById('shield-dot');
  const title = document.getElementById('shield-title');
  const desc  = document.getElementById('shield-desc');

  if (active) {
    card.className  = 'card shield-active';
    dot.className   = 'status-dot green';
    title.textContent = 'Blocking Shield Active';
    desc.textContent  = 'Rules & Timers Enforced';
  } else {
    card.className  = 'card shield-paused';
    dot.className   = 'status-dot amber pulse-off';
    title.textContent = 'Blocking Paused';
    desc.textContent  = 'All websites temporarily allowed';
  }
}

async function onShieldToggle(checked) {
  const settings = await StorageService.getSettings();
  settings.blockingShield = checked;
  await StorageService.saveSettings(settings);
  applyShieldUI(checked);
  // background.js will auto-sync rules via storage.onChanged
}
```

#### Active Tab Detection

```javascript
async function renderActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  const domain = normalizeDomain(new URL(tab.url).hostname);
  document.getElementById('active-tab-domain').textContent = domain;
  document.getElementById('active-tab-favicon').src = faviconUrl(domain);

  // Check if already hard-blocked
  const list = await StorageService.getHardBlocklist();
  const btn  = document.getElementById('btn-quick-block');
  if (list.some(e => e.domain === domain && e.enabled)) {
    btn.textContent = '✓ Blocked';
    btn.classList.add('btn-blocked');
    btn.disabled = true;
  }
  btn.dataset.domain = domain;
}
```

#### Quick Block Button

```javascript
async function onQuickBlock() {
  const btn    = document.getElementById('btn-quick-block');
  const domain = btn.dataset.domain;
  if (!domain) return;

  const list = await StorageService.getHardBlocklist();
  if (!list.some(e => e.domain === domain)) {
    list.unshift({
      domain,
      enabled:  true,
      addedAt:  Date.now(),
      icon:     faviconUrl(domain)
    });
    await StorageService.saveHardBlocklist(list);
  }

  btn.textContent = '✓ Blocked';
  btn.classList.replace('btn-block', 'btn-blocked');
  btn.disabled = true;

  // Revert after 1.5s for visual feedback
  setTimeout(() => {
    // button stays disabled since it's now blocked
  }, 1500);
}
```

#### Timer Summary Widget

```javascript
async function renderTimerSummary() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const domain = normalizeDomain(new URL(tab.url).hostname);
  const groups = await StorageService.getTimerGroups();
  const group  = groups.find(g => g.sites.includes(domain));

  const card = document.getElementById('timer-card');
  if (!group) { card.classList.add('hidden'); return; }

  card.classList.remove('hidden');
  const remaining = Math.max(0, group.dailyLimitMinutes - group.usedMinutes);
  const pct       = Math.min(100, Math.round((group.usedMinutes / group.dailyLimitMinutes) * 100));

  document.getElementById('timer-group-name').textContent  = group.name;
  document.getElementById('timer-remaining').textContent   = `${remaining}m left / ${group.dailyLimitMinutes}m`;
  document.getElementById('timer-progress-bar').style.width = `${pct}%`;
  document.getElementById('timer-sites').textContent       = `Includes: ${group.sites.join(', ')}`;

  const bar = document.getElementById('timer-progress-bar');
  bar.className = pct >= 100 ? 'progress-bar-fill expired' : 'progress-bar-fill';
}
```

#### Navigation

```javascript
function bindEvents() {
  document.getElementById('shield-toggle').addEventListener('change', e => onShieldToggle(e.target.checked));
  document.getElementById('btn-quick-block').addEventListener('click', onQuickBlock);
  document.getElementById('btn-open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('btn-manage-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('btn-preview-blocked').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('blocked/blocked.html?preview=true') });
  });
}
```

---

### 3.3 popup.css — Key Styles

```css
/* popup/popup.css */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 360px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  background: var(--bg);
  color: var(--fg);
}

/* CSS Custom Properties for light/dark */
:root {
  --bg:       #ffffff;
  --fg:       #111827;
  --card-bg:  #f9fafb;
  --border:   #e5e7eb;
  --muted:    #6b7280;
  --rose:     #f43f5e;
  --amber:    #f59e0b;
  --green:    #10b981;
  --orange:   #f97316;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:      #111827;
    --fg:      #f9fafb;
    --card-bg: #1f2937;
    --border:  #374151;
    --muted:   #9ca3af;
  }
}

#popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.card {
  padding: 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}

#popup-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
#popup-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-top: 1px solid var(--border); background: var(--card-bg);
}

/* Shield active state */
.shield-active { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.25); }
.shield-paused { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.25); }

/* Status dot */
.status-dot.green { background: #10b981; }
.status-dot.green::before { background: #10b981; animation: ping 1s ease-out infinite; }
.status-dot.amber { background: #f59e0b; }

/* Toggle switch */
.toggle-switch input { display: none; }
.toggle-track { display: block; width: 40px; height: 20px; border-radius: 999px; background: #d1d5db; cursor: pointer; transition: background 0.2s; }
.toggle-switch input:checked + .toggle-track { background: var(--rose); }

/* Progress bar */
.progress-bar-track { height: 6px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
.progress-bar-fill  { height: 100%; border-radius: 999px; background: linear-gradient(to right, #f59e0b, #f97316); transition: width 0.3s; }
.progress-bar-fill.expired { background: var(--rose); }

@keyframes ping {
  0%   { transform: scale(1); opacity: 0.75; }
  100% { transform: scale(2); opacity: 0; }
}
```

---

### Phase 3 Acceptance Criteria

- [ ] Popup renders at exactly 360px width with no layout overflow
- [ ] Blocking Shield toggle updates storage and visually reflects state (green ↔ amber)
- [ ] Current tab domain and favicon load within 200ms of popup open
- [ ] "+ Block" button adds the current tab's domain to storage and disables itself immediately
- [ ] Timer widget is hidden when current tab is not in any Timer Group
- [ ] Timer widget shows correct group name, remaining time, and progress bar percentage
- [ ] "Manage Settings" and gear icon both open the Options page
- [ ] Light and dark mode both render correctly

---

---

## Phase 4 — Options & Control Hub

**Goal:** Build the full settings page with three tabs: Hard Blocklist, Timer Groups, and Priority Rules.

**Deliverables:** `options/options.html`, `options/options.css`, `options/options.js`

---

### 4.1 options.html — Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StopScroll — Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>

  <div id="app-shell">

    <!-- ── Sidebar ──────────────────────────────────────────── -->
    <aside id="sidebar">
      <div class="sidebar-brand">
        <!-- shield icon -->
        <div>
          <div class="brand-name">StopScroll</div>
          <div class="brand-sub">Control Center</div>
        </div>
      </div>

      <nav id="sidebar-nav">
        <button class="nav-item active" data-tab="hardblock">
          <!-- ban icon --> Hard Blocklist
          <span id="badge-hardblock" class="badge">0</span>
        </button>
        <button class="nav-item" data-tab="timers">
          <!-- clock icon --> Timer Groups
          <span id="badge-timers" class="badge orange">0</span>
        </button>
        <button class="nav-item" data-tab="priority">
          <!-- shield icon --> Priority Rules
        </button>
      </nav>

      <div class="sidebar-footer">
        <button id="btn-back-to-popup" class="btn-link">← Back to Popup</button>
      </div>
    </aside>

    <!-- ── Main Content ──────────────────────────────────────── -->
    <main id="main-content">

      <!-- TAB A: Hard Blocklist -->
      <section id="tab-hardblock" class="tab-pane active">
        <div class="tab-header">
          <div>
            <h2>Permanent Blocklist</h2>
            <p class="tab-desc">These sites are 100% restricted immediately without timer allowances.</p>
          </div>
          <button id="btn-add-site" class="btn btn-rose">+ Add Website</button>
        </div>

        <!-- Search + Suggestions -->
        <div id="search-container">
          <div class="search-input-wrap">
            <!-- search icon -->
            <input type="text" id="search-input"
              placeholder="Search or type website (e.g. reddit.com)..."
              autocomplete="off" spellcheck="false">
            <button id="btn-search-add" class="btn btn-rose-sm">Add</button>
          </div>
          <div id="suggestions-dropdown" class="dropdown hidden">
            <div class="dropdown-header">
              <span id="dropdown-label">Frequently Visited &amp; Popular Sites</span>
              <button id="btn-close-suggestions">Close ✕</button>
            </div>
            <div id="suggestions-grid" class="suggestions-grid"></div>
          </div>
        </div>

        <!-- Blocklist Table -->
        <div id="hardblock-table-wrap">
          <div class="table-header">
            <span>Blocked Site &amp; Favicon</span>
            <span>Rule Enforcement</span>
          </div>
          <div id="hardblock-list"></div>
        </div>
      </section>

      <!-- TAB B: Timer Groups -->
      <section id="tab-timers" class="tab-pane hidden">
        <div class="tab-header">
          <div>
            <h2>Timer Groups (Usage Limits)</h2>
            <p class="tab-desc">Browse distraction sites up to a daily limit. Once time is up, the group is locked.</p>
          </div>
          <button id="btn-new-group" class="btn btn-orange">+ New Timer Group</button>
        </div>
        <div id="timer-groups-list"></div>
      </section>

      <!-- TAB C: Priority Rules -->
      <section id="tab-priority" class="tab-pane hidden">
        <div class="tab-header">
          <div>
            <h2>Rule Resolution Priority</h2>
            <p class="tab-desc">How StopScroll handles overlaps between the Hard Blocklist and Timer Allowances.</p>
          </div>
        </div>
        <div class="priority-explainer">
          <div class="priority-step">
            <div class="priority-badge rose">1</div>
            <div>
              <h4>Priority 1: Hard Blocklist (Top Precedence)</h4>
              <p>If a site is on the Hard Blocklist, it is <strong>always blocked immediately</strong>. Any timer configured for it is superseded.</p>
            </div>
          </div>
          <div class="priority-step">
            <div class="priority-badge orange">2</div>
            <div>
              <h4>Priority 2: Timer Group Allowance</h4>
              <p>If the site is NOT on the hard blocklist, its Timer Group is checked. If the group has minutes remaining, access is granted and time decrements. If the timer hits 0:00, access is blocked.</p>
            </div>
          </div>
          <div class="priority-step">
            <div class="priority-badge green">3</div>
            <div>
              <h4>Priority 3: General Browsing (Allowed)</h4>
              <p>If a site belongs to neither list, it loads without restriction.</p>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>

  <script src="options.js" type="module"></script>
</body>
</html>
```

---

### 4.2 options.js — Tab Navigation

```javascript
// options/options.js
import { StorageService } from '../shared/storage.js';
import { normalizeDomain, faviconUrl } from '../shared/utils.js';
import { POPULAR_CATALOG } from '../shared/catalog.js';

// ── Tab Switching ──────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderHardBlocklist();
  await renderTimerGroups();
  bindHardBlocklistEvents();
  bindTimerGroupEvents();
});
```

---

### 4.3 Hard Blocklist Tab — Render & CRUD

```javascript
// ── Render Hard Blocklist ──────────────────────────────────────────────────
async function renderHardBlocklist() {
  const list = await StorageService.getHardBlocklist();
  const el   = document.getElementById('hardblock-list');
  document.getElementById('badge-hardblock').textContent = list.length;

  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">No hard-blocked sites yet. Add one above!</div>`;
    return;
  }

  el.innerHTML = list.map((site, i) => `
    <div class="table-row">
      <div class="site-cell">
        <img src="${site.icon || faviconUrl(site.domain)}" 
             alt="${site.domain}" class="favicon"
             onerror="this.src='${faviconUrl(site.domain)}'">
        <div>
          <span class="domain-name">${site.domain}</span>
          <span class="badge-pill rose">Permanent</span>
        </div>
      </div>
      <div class="actions-cell">
        <label class="toggle-switch" title="${site.enabled ? 'Disable' : 'Enable'}">
          <input type="checkbox" data-idx="${i}" class="toggle-site" ${site.enabled ? 'checked' : ''}>
          <span class="toggle-track"></span>
        </label>
        <button class="btn-icon btn-delete" data-idx="${i}" title="Delete">
          <!-- trash icon -->
        </button>
      </div>
    </div>
  `).join('');
}

// ── Add Domain ─────────────────────────────────────────────────────────────
async function addToHardBlocklist(domain) {
  domain = normalizeDomain(domain);
  if (!domain || !domain.includes('.')) return;

  const list = await StorageService.getHardBlocklist();
  if (list.some(e => e.domain === domain)) return; // already exists

  list.unshift({
    domain,
    enabled: true,
    addedAt: Date.now(),
    icon: faviconUrl(domain)
  });
  await StorageService.saveHardBlocklist(list);
  await renderHardBlocklist();
  renderSuggestions(''); // refresh dropdown state
}

// ── Toggle / Delete ────────────────────────────────────────────────────────
document.getElementById('hardblock-list').addEventListener('change', async e => {
  if (e.target.classList.contains('toggle-site')) {
    const list = await StorageService.getHardBlocklist();
    list[Number(e.target.dataset.idx)].enabled = e.target.checked;
    await StorageService.saveHardBlocklist(list);
  }
});

document.getElementById('hardblock-list').addEventListener('click', async e => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  const list = await StorageService.getHardBlocklist();
  list.splice(Number(btn.dataset.idx), 1);
  await StorageService.saveHardBlocklist(list);
  await renderHardBlocklist();
});
```

---

### 4.4 Suggestions Dropdown

```javascript
const searchInput = document.getElementById('search-input');

searchInput.addEventListener('focus', () => {
  showDropdown();
  renderSuggestions(searchInput.value);
});

searchInput.addEventListener('input', () => renderSuggestions(searchInput.value));

document.getElementById('btn-close-suggestions').addEventListener('click', hideDropdown);

document.getElementById('btn-search-add').addEventListener('click', async () => {
  await addToHardBlocklist(searchInput.value);
  searchInput.value = '';
  hideDropdown();
});

function showDropdown() { document.getElementById('suggestions-dropdown').classList.remove('hidden'); }
function hideDropdown()  { document.getElementById('suggestions-dropdown').classList.add('hidden'); }

async function renderSuggestions(query) {
  const q    = normalizeDomain(query);
  const list = await StorageService.getHardBlocklist();
  const label = document.getElementById('dropdown-label');

  let items = POPULAR_CATALOG;
  if (q) {
    items = POPULAR_CATALOG.filter(c =>
      c.domain.includes(q) || c.name.toLowerCase().includes(q)
    );
    // Allow typing a totally custom domain
    if (!items.some(c => c.domain === q) && q.includes('.')) {
      items = [...items, { domain: q, name: q, color: '#f43f5e' }];
    }
    label.textContent = `Matching Results for "${q}"`;
  } else {
    label.textContent = 'Frequently Visited & Popular Sites';
  }

  const grid = document.getElementById('suggestions-grid');

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state">No matching sites. Press Add to add custom domain.</div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const isBlocked = list.some(e => e.domain === item.domain);
    return `
      <div class="suggestion-card">
        <div class="suggestion-info">
          <img src="${faviconUrl(item.domain)}" alt="${item.name}" class="favicon">
          <div>
            <div class="suggestion-name">${item.name}</div>
            <div class="suggestion-domain">${item.domain}</div>
          </div>
        </div>
        <button class="btn btn-add-suggestion ${isBlocked ? 'btn-added' : 'btn-rose-sm'}"
                data-domain="${item.domain}" ${isBlocked ? 'disabled' : ''}>
          ${isBlocked ? 'Added' : '+ Add'}
        </button>
      </div>
    `;
  }).join('');

  // Bind add buttons
  grid.querySelectorAll('.btn-add-suggestion:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      await addToHardBlocklist(btn.dataset.domain);
      renderSuggestions(searchInput.value);
    });
  });
}
```

---

### 4.5 Timer Groups Tab — Render & CRUD

```javascript
async function renderTimerGroups() {
  const groups = await StorageService.getTimerGroups();
  const el     = document.getElementById('timer-groups-list');
  document.getElementById('badge-timers').textContent = groups.length;

  if (groups.length === 0) {
    el.innerHTML = `<div class="empty-state">No timer groups yet. Create one to set daily limits.</div>`;
    return;
  }

  el.innerHTML = groups.map((group, gIdx) => {
    const remaining = Math.max(0, group.dailyLimitMinutes - group.usedMinutes);
    const pct       = Math.min(100, Math.round((group.usedMinutes / group.dailyLimitMinutes) * 100));
    const isExpired = remaining === 0;

    return `
      <div class="group-card">
        <div class="group-header">
          <div class="group-title-block">
            <div class="group-icon ${isExpired ? 'expired' : ''}"><!-- clock --></div>
            <div>
              <h4 class="group-name">${group.name}</h4>
              <p class="group-limit">Daily allowance: ${group.dailyLimitMinutes} minutes</p>
            </div>
          </div>
          <div class="group-status">
            <span class="timer-value ${isExpired ? 'rose' : 'orange'}">
              ${isExpired ? 'Limit Reached (Blocked)' : `${remaining}m remaining`}
            </span>
            <span class="timer-meta">${group.usedMinutes}m / ${group.dailyLimitMinutes}m used</span>
          </div>
        </div>

        <div class="progress-bar-track">
          <div class="progress-bar-fill ${isExpired ? 'expired' : ''}" style="width:${pct}%"></div>
        </div>

        <div class="group-sites">
          <span class="sites-label">Includes:</span>
          ${group.sites.map((site, sIdx) => `
            <span class="site-tag">
              <img src="${faviconUrl(site, 16)}" class="favicon-sm" alt="">
              ${site}
              <button class="btn-remove-site" data-gidx="${gIdx}" data-sidx="${sIdx}">✕</button>
            </span>
          `).join('')}
          <button class="btn-add-site-to-group btn-dashed" data-gidx="${gIdx}">+ Add Site</button>
        </div>

        <div class="group-footer">
          <button class="btn-link rose btn-delete-group" data-gidx="${gIdx}">Delete Group</button>
        </div>
      </div>
    `;
  }).join('');

  bindTimerGroupActions();
}

function bindTimerGroupActions() {
  // Remove site from group
  document.querySelectorAll('.btn-remove-site').forEach(btn => {
    btn.addEventListener('click', async () => {
      const groups = await StorageService.getTimerGroups();
      groups[btn.dataset.gidx].sites.splice(Number(btn.dataset.sidx), 1);
      await StorageService.saveTimerGroups(groups);
      await renderTimerGroups();
    });
  });

  // Add site to group
  document.querySelectorAll('.btn-add-site-to-group').forEach(btn => {
    btn.addEventListener('click', async () => {
      const domain = window.prompt('Enter domain to add (e.g. twitter.com):');
      if (!domain) return;
      const clean = normalizeDomain(domain);
      if (!clean.includes('.')) return;
      const groups = await StorageService.getTimerGroups();
      const g = groups[Number(btn.dataset.gidx)];
      if (!g.sites.includes(clean)) {
        g.sites.push(clean);
        await StorageService.saveTimerGroups(groups);
        await renderTimerGroups();
      }
    });
  });

  // Delete group
  document.querySelectorAll('.btn-delete-group').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Delete this timer group?`)) return;
      const groups = await StorageService.getTimerGroups();
      groups.splice(Number(btn.dataset.gidx), 1);
      await StorageService.saveTimerGroups(groups);
      await renderTimerGroups();
    });
  });
}

function bindTimerGroupEvents() {
  document.getElementById('btn-new-group').addEventListener('click', async () => {
    const name = window.prompt('Timer Group Name (e.g. "Social Media"):');
    if (!name) return;
    const mins = parseInt(window.prompt('Daily allowance in minutes (e.g. 30):', '30'), 10);
    if (!mins || mins <= 0) return;

    const groups = await StorageService.getTimerGroups();
    groups.push({
      id:                `group_${Date.now()}`,
      name:              name.trim(),
      dailyLimitMinutes: mins,
      usedMinutes:       0,
      sites:             []
    });
    await StorageService.saveTimerGroups(groups);
    await renderTimerGroups();
  });
}
```

---

### Phase 4 Acceptance Criteria

- [ ] Default tab on open is Hard Blocklist
- [ ] Clicking search input shows suggestions dropdown with 12 pre-populated sites with favicons
- [ ] Typing filters the catalog list in real-time; a custom domain typed appears as a card
- [ ] "+ Add" in dropdown adds site to table; button changes to "Added" (disabled)
- [ ] Blocklist table shows favicon, domain, Permanent badge, toggle, and delete button
- [ ] Toggle disables/re-enables a site without removing it; storage updates immediately
- [ ] Delete removes the row and updates the sidebar badge count
- [ ] Creating a new Timer Group prompts for name and minutes; group card appears
- [ ] Progress bar fills proportionally; turns red at 100%
- [ ] "Limit Reached (Blocked)" label shown for expired groups
- [ ] Adding/removing sites from group works; site tags render with favicon
- [ ] Priority Rules tab renders all 3 priority steps

---

---

## Phase 5 — Blocked Page & Quotes Engine

**Goal:** Build the redirect page that users see when visiting any blocked domain. It must contextually explain the reason, show a motivational quote, and offer clear navigation out.

**Deliverables:** `blocked/blocked.html`, `blocked/blocked.css`, `blocked/blocked.js`

---

### 5.1 blocked.html — Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StopScroll — Blocked</title>
  <link rel="stylesheet" href="blocked.css">
</head>
<body>

  <div id="blocked-page">
    <!-- Decorative glows -->
    <div class="glow glow-top-left"></div>
    <div class="glow glow-bottom-right"></div>

    <!-- Mascot -->
    <div class="mascot-wrap">
      <div class="mascot-icon">
        <!-- Lock SVG -->
      </div>
      <div class="focus-badge">🌱 Focus Mode</div>
    </div>

    <!-- Reason -->
    <div class="reason-section">
      <div id="reason-pill" class="reason-pill">Site is Blocked</div>
      <h1 class="blocked-heading">Take a deep breath and stay on track!</h1>
      <p class="blocked-sub">
        You're trying to visit
        <span id="blocked-domain" class="domain-highlight">—</span>,
        which is restricted to protect your focus.
      </p>
    </div>

    <!-- Quote Card -->
    <div class="quote-card">
      <div class="quote-header">
        <span class="quote-label">⚡ Daily Motivation</span>
        <button id="btn-new-quote" class="btn-link">↻ New quote</button>
      </div>
      <blockquote id="quote-text" class="quote-text">""</blockquote>
      <p id="quote-author" class="quote-author">—</p>
    </div>

    <!-- Actions -->
    <div class="action-buttons">
      <button id="btn-go-back"       class="btn btn-primary">Go Back to Work</button>
      <button id="btn-manage-blocklist" class="btn btn-secondary">Manage Blocklist</button>
    </div>

  </div>

  <script src="blocked.js" type="module"></script>
</body>
</html>
```

---

### 5.2 blocked.js — Logic

#### URL Parameter Parsing

```javascript
// blocked/blocked.js

const params     = new URLSearchParams(window.location.search);
const targetDomain = params.get('target') || 'this site';
const reason       = params.get('reason') || 'hard_block';  // 'hard_block' | 'timer_expired'
const groupName    = params.get('group')  || '';
const isPreview    = params.get('preview') === 'true';
```

#### Render Context

```javascript
document.addEventListener('DOMContentLoaded', () => {
  renderBlockedContext();
  renderRandomQuote();
  bindEvents();
});

function renderBlockedContext() {
  document.getElementById('blocked-domain').textContent = targetDomain;

  const pill = document.getElementById('reason-pill');
  if (reason === 'timer_expired') {
    pill.textContent = `Timer Limit Reached${groupName ? ` — ${groupName}` : ''}`;
    pill.classList.add('pill-orange');
    document.querySelector('.blocked-sub').textContent =
      `You've used up your daily allowance for ${groupName || 'this group'}. ` +
      `${targetDomain} is locked until midnight.`;
  } else if (isPreview) {
    pill.textContent = 'Preview Mode';
    pill.classList.add('pill-blue');
  } else {
    pill.textContent = 'Site is Blocked';
    pill.classList.add('pill-rose');
  }
}
```

#### Quotes Engine

```javascript
const QUOTES = [
  {
    text:   "It is not that we have so little time but that we lose so much. The life we receive is not short, but we make it so.",
    author: "Seneca"
  },
  {
    text:   "Focus is a muscle. The more you protect it from distractions, the stronger your achievements become.",
    author: "Cal Newport"
  },
  {
    text:   "Action will delineate and define you. Do not wait for distraction to pass; choose what matters right now.",
    author: "Thomas Jefferson"
  },
  {
    text:   "You will never reach your destination if you stop and throw stones at every dog that barks.",
    author: "Winston Churchill"
  },
  {
    text:   "The secret of getting ahead is getting started. The secret of getting started is breaking your complex overwhelming task into small manageable tasks.",
    author: "Mark Twain"
  },
  {
    text:   "Starve your distractions, feed your focus.",
    author: "Anonymous"
  },
  {
    text:   "Almost everything will work again if you unplug it for a few minutes — including you.",
    author: "Anne Lamott"
  },
  {
    text:   "You have power over your mind, not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius"
  },
  {
    text:   "One day or day one. You decide.",
    author: "Paulo Coelho"
  },
  {
    text:   "Motivation is what gets you started. Habit is what keeps you going.",
    author: "Jim Ryun"
  }
];

let currentQuoteIdx = Math.floor(Math.random() * QUOTES.length);

function renderRandomQuote() {
  const q = QUOTES[currentQuoteIdx];
  document.getElementById('quote-text').textContent   = `"${q.text}"`;
  document.getElementById('quote-author').textContent = `— ${q.author}`;
}

function nextQuote() {
  currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length;
  renderRandomQuote();
}
```

#### Action Button Handlers

```javascript
function bindEvents() {
  document.getElementById('btn-new-quote').addEventListener('click', nextQuote);

  document.getElementById('btn-go-back').addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      chrome.tabs.update({ url: 'chrome://newtab' });
    }
  });

  document.getElementById('btn-manage-blocklist').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}
```

---

### 5.3 blocked.css — Key Styles

```css
/* blocked/blocked.css */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--fg);
  padding: 24px;
}

#blocked-page {
  max-width: 520px; width: 100%;
  display: flex; flex-direction: column; align-items: center;
  gap: 24px; text-align: center;
  position: relative;
}

/* Glowing backdrop blobs */
.glow {
  position: fixed; width: 320px; height: 320px;
  border-radius: 50%; pointer-events: none; filter: blur(80px); opacity: 0.12;
}
.glow-top-left     { top: -80px;    left: -80px;    background: #f43f5e; }
.glow-bottom-right { bottom: -80px; right: -80px;   background: #f59e0b; }

/* Mascot */
.mascot-wrap { position: relative; display: inline-block; }
.mascot-icon {
  width: 96px; height: 96px; border-radius: 28px;
  background: linear-gradient(135deg, #f43f5e, #f97316, #f59e0b);
  display: flex; align-items: center; justify-content: center;
  animation: float 4s ease-in-out infinite;
  box-shadow: 0 20px 40px rgba(244,63,94,0.25);
}
.focus-badge {
  position: absolute; bottom: -10px; right: -10px;
  background: #10b981; color: white;
  font-size: 11px; font-weight: 700;
  padding: 4px 10px; border-radius: 999px;
  box-shadow: 0 4px 12px rgba(16,185,129,0.4);
}

/* Reason Pill */
.reason-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 14px; border-radius: 999px;
  font-size: 12px; font-weight: 700;
}
.pill-rose   { background: rgba(244,63,94,0.1);  color: #f43f5e; }
.pill-orange { background: rgba(249,115,22,0.1); color: #f97316; }
.pill-blue   { background: rgba(59,130,246,0.1); color: #3b82f6; }

/* Quote Card */
.quote-card {
  width: 100%; text-align: left;
  background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 16px; padding: 16px 20px;
}
.quote-text   { font-style: italic; font-size: 14px; line-height: 1.6; margin: 8px 0; }
.quote-author { font-size: 12px; font-weight: 600; text-align: right; color: var(--muted); }

/* Action Buttons */
.action-buttons { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.btn-primary {
  background: linear-gradient(to right, #f43f5e, #f97316);
  color: white; border: none; padding: 10px 24px;
  border-radius: 12px; font-weight: 700; cursor: pointer;
}
.btn-secondary {
  background: transparent; border: 1px solid var(--border);
  color: var(--muted); padding: 10px 20px;
  border-radius: 12px; cursor: pointer;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%       { transform: translateY(-8px) rotate(1deg); }
}
```

---

### Phase 5 Acceptance Criteria

- [ ] Navigate to a hard-blocked site → `blocked.html` loads with "Site is Blocked" pill in rose color
- [ ] Navigate to a timer-expired site → "Timer Limit Reached — [Group Name]" pill in orange
- [ ] Blocked domain name renders correctly from URL param
- [ ] A quote loads on page open (randomized from pool of 10)
- [ ] "New quote" button cycles through quotes without page reload
- [ ] "Go Back to Work" navigates back or to new tab if no history
- [ ] "Manage Blocklist" opens the options page
- [ ] Mascot animation runs continuously
- [ ] Glowing backdrop blobs visible in both light and dark mode
- [ ] Preview mode (from popup footer) renders correctly with "Preview Mode" pill

---

---

## Phase 6 — End-to-End Verification & Ship

**Goal:** Test every requirement from the PRD against the working extension, fix any regressions, and prepare for Chrome Web Store submission.

---

### 6.1 E2E Test Checklist

#### Blocking Engine
| Test | Expected Result | Pass? |
|:---|:---|:---|
| Hard-block `twitter.com`, navigate to it | Redirected to blocked page with rose pill | |
| Disable the blocked site's toggle, navigate | Site loads normally | |
| Re-enable toggle, navigate | Redirected again | |
| Delete site from blocklist, navigate | Site loads normally | |
| Shield OFF → navigate to any blocked site | Site loads normally | |
| Shield ON → blocking resumes for all sites | Sites redirected again | |

#### Timer Groups
| Test | Expected Result | Pass? |
|:---|:---|:---|
| Create group "Test" with 1-min limit, add `example.com` | Group card visible | |
| Browse `example.com` for 1 minute | `usedMinutes` = 1, group now expired | |
| Navigate to `example.com` after expiry | Redirected with orange pill | |
| Midnight reset (or manually set `lastResetDate` to yesterday) | `usedMinutes` resets to 0, site loads again | |

#### Popup
| Test | Expected Result | Pass? |
|:---|:---|:---|
| Open popup on YouTube | Favicon + `youtube.com` shown in active tab card | |
| Click "+ Block" on YouTube | Button changes to "✓ Blocked", disabled; YouTube added to storage | |
| Timer widget visible when current tab is in a group | Correct group name, remaining time, progress % | |
| Timer widget hidden when current tab not in any group | Card not visible | |

#### Blocked Page
| Test | Expected Result | Pass? |
|:---|:---|:---|
| Hard block → blocked.html | Rose pill, correct domain shown | |
| Timer expired → blocked.html | Orange pill, group name in subtitle | |
| Click "New quote" 10 times | Quote cycles through pool, no repeat crashes | |
| Click "Go Back to Work" | Browser goes back | |
| Click "Manage Blocklist" | Options page opens | |

#### Data Persistence
| Test | Expected Result | Pass? |
|:---|:---|:---|
| Add sites, close Chrome, reopen | Blocklist intact, rules active | |
| Idle for 5 minutes on a timer group site | `usedMinutes` does NOT increment (idle detection) | |

---

### 6.2 Browser Compatibility Matrix

| Browser | Support Level | Notes |
|:---|:---|:---|
| Google Chrome 121+ | ✅ Full | Primary target |
| Brave Browser | ✅ Full | Chromium-based, MV3 compatible |
| Microsoft Edge | ✅ Full | Chromium-based |
| Arc Browser | ✅ Full | Chromium-based |
| Firefox | ❌ Out of scope | Different extension API |
| Safari | ❌ Out of scope | Different extension API |

---

### 6.3 Performance Validation

| Metric | Target | How to Measure |
|:---|:---|:---|
| Popup open time | < 100ms | Chrome DevTools → Performance trace on popup.html |
| Background memory footprint | < 15 MB | `chrome://extensions` → Inspect views → Memory |
| `declarativeNetRequest` rule sync time | < 50ms | `console.time()` around `updateDynamicRules` call |
| Total unpacked extension size | < 1.5 MB | `du -sh stopscroll/` |

---

### 6.4 Security & Privacy Checklist

- [ ] No `eval()` or `new Function()` anywhere in the codebase
- [ ] No inline `onclick=` attributes in HTML (CSP violation)
- [ ] No external scripts or CDN resources loaded at runtime
- [ ] `chrome.storage` only — no `localStorage`, `sessionStorage`, or `IndexedDB`
- [ ] No `webRequest` permission (MV3 compliant)
- [ ] `manifest.json` does not request `identity`, `history`, or `browsingData` permissions
- [ ] All favicon loads are from Google's public favicon service (no custom server)
- [ ] Extension package contains no `.env`, API keys, or secrets

---

### 6.5 Git Commit Strategy

| Phase | Branch | Commit Message |
|:---|:---|:---|
| Phase 1 | `main` | `feat: scaffold manifest, shared utils, storage, and catalog` |
| Phase 2 | `main` | `feat: background service worker with rule engine and time tracker` |
| Phase 3 | `main` | `feat: popup UI with shield toggle, active tab detection, timer widget` |
| Phase 4 | `main` | `feat: options page with hard blocklist, timer groups, priority rules` |
| Phase 5 | `main` | `feat: blocked page with quotes engine and context-aware reason badge` |
| Phase 6 | `main` | `fix: e2e verification fixes and performance polish` |

---

### 6.6 Chrome Web Store Preparation (Post-MVP)

1. **Store Assets Required:**
   - 128x128 icon (PNG, no alpha)
   - 1280x800 or 640x400 screenshots (at least 1)
   - Promo tile: 440x280 (small)
   - Detailed description ≤ 10,000 chars

2. **Privacy Policy:** Required for extensions using `storage`. Host a simple one-pager at the GitHub Pages URL.

3. **Permission Justification:**
   - `declarativeNetRequest`: "Required to redirect blocked sites to the extension's local blocked.html page."
   - `tabs`: "Required to detect the domain of the user's active tab for the popup UI."
   - `storage`: "Required to persist user's blocklist and timer settings locally."
   - `idle`: "Required to pause time tracking when user is away from keyboard."
   - `alarms`: "Required to tick the daily time usage counter and trigger midnight reset."

---

---

## Cross-Cutting Concerns

### Error Handling

| Scenario | Handling |
|:---|:---|
| `chrome.tabs.query` returns empty | Silently skip active tab detection |
| Favicon fails to load | `onerror` fallback to `faviconUrl(domain)` |
| `chrome.declarativeNetRequest` rule limit reached | Log warning to console, partial sync |
| Invalid domain input (no `.`) | Silently reject, don't add to storage |
| `window.prompt` cancelled | Early return, no state mutation |

### Idle Detection Threshold

`chrome.idle.setDetectionInterval(60)` — user is considered idle after 60 seconds of no input. This prevents the timer from running when the user opens a site and walks away.

### Domain-to-Group Membership

A domain can only belong to **one timer group** at a time. If a user adds the same domain to two groups, it should be tracked against the first matching group found during iteration. The UI should ideally warn the user (future improvement).

### Rule ID Stability

Rule IDs generated by `generateRuleId(domain)` are stable across sessions. The same domain always maps to the same integer ID. This allows safe diffing between existing and desired rule sets.

---

## Appendix: Full Data Contracts

### chrome.storage.local Schema (TypeScript)

```typescript
interface StopScrollStorage {
  settings: {
    blockingShield: boolean;    // Master enforcement toggle
    lastResetDate: string;      // "YYYY-MM-DD" — tracks daily reset
  };

  hardBlocklist: Array<{
    domain:   string;           // e.g. "facebook.com" (normalized, no www)
    enabled:  boolean;          // Per-site pause toggle
    addedAt:  number;           // Unix timestamp (ms)
    icon?:    string;           // Google favicon URL
  }>;

  timerGroups: Array<{
    id:                 string; // Unique slug, e.g. "group_1700000000"
    name:               string; // User-defined label, e.g. "Social Media"
    dailyLimitMinutes:  number; // Max allowed minutes per day
    usedMinutes:        number; // Accumulated today (resets at midnight)
    sites:              string[]; // ["youtube.com", "reddit.com"]
  }>;
}
```

### blocked.html URL Parameters

| Parameter | Values | Description |
|:---|:---|:---|
| `target` | domain string | The blocked domain (e.g. `reddit.com`) |
| `reason` | `hard_block` \| `timer_expired` | Why the site is blocked |
| `group` | group name string | Timer group name (only when `reason=timer_expired`) |
| `preview` | `true` | Triggered from popup footer link; shows preview mode pill |

### declarativeNetRequest Rule Shape

```json
{
  "id":       42381,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": {
      "extensionPath": "/blocked/blocked.html?target=reddit.com&reason=hard_block"
    }
  },
  "condition": {
    "urlFilter":      "||reddit.com^",
    "resourceTypes":  ["main_frame"]
  }
}
```

---

*End of Specification*

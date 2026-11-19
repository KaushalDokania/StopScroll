# StopScroll — Chrome Extension (Manifest V3)

> **Reclaim your focus and conquer doomscrolling.** StopScroll is an offline-first Chrome extension that permanently restricts distracting websites, bounds daily browsing through flexible Timer Groups, and guides you back to productive work with an uplifting block screen.

---

## 🌟 Key Features

1. **Permanent Hard Blocklist (Priority 1)**:
   - Completely blocks user-specified domains using Chrome's native `declarativeNetRequest` engine.
   - Pre-populated catalog with 12 popular distraction sites (YouTube, Reddit, Instagram, Twitter/X, TikTok, etc.) with real-time domain search and quick-add suggestions.
   - 1-click quick blocking directly from the extension popup for the currently active tab.
   - Per-site enable/disable toggles with instant rule synchronization.

2. **Daily Timer Groups (Priority 2)**:
   - Group related distraction sites under a shared daily allowance (e.g., 30 minutes/day for "Social Media").
   - Real-time active tab focus tracking pauses when the user switches windows or goes idle (`chrome.idle`).
   - Automatically redirects sites to the block screen the moment the group's daily allowance runs out.
   - Daily midnight reset restores timer group access every night at 00:00 local time.

3. **Motivational Block Screen**:
   - Redirects blocked visits to a distraction-free, encouraging landing page (`blocked.html`).
   - Animated floating lock mascot with glowing backdrop.
   - Contextual status pills (`Site is Blocked` vs `Timer Limit Reached — [Group Name]` vs `Preview Mode`).
   - Rotating productivity quotes engine featuring wisdom from Seneca, Marcus Aurelius, Cal Newport, Winston Churchill, and more.
   - 1-click "Go Back to Work" and "Manage Blocklist" actions.

4. **Master Blocking Shield**:
   - Global toggle switch in the popup lets you pause all blocking rules when needed and resume them instantly with zero data loss.
   - Pulsating status dot (emerald green when active, warm amber when paused).

5. **Privacy-First & Lightweight**:
   - **Zero external runtime dependencies**, zero telemetry, and zero tracking.
   - Total unpacked extension size is under **130 KB**.
   - Fully compliant with Manifest V3 Content Security Policy (no `eval`, no inline scripts).

---

## 🚀 How to Install in Google Chrome

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/StopScroll.git
   cd StopScroll
   ```

2. Open Google Chrome and navigate to the Extensions management page:
   ```text
   chrome://extensions
   ```

3. Enable **Developer mode** using the toggle switch in the top-right corner.

4. Click the **Load unpacked** button in the top-left corner.

5. Select the **`extension/`** folder inside the StopScroll project directory:
   ```text
   /path/to/StopScroll/extension
   ```

6. StopScroll is now installed! Pin the shield icon to your Chrome toolbar for easy access.

---

## 📂 Project Architecture

```
StopScroll/
├── extension/                       ← Chrome Extension Unpacked Directory
│   ├── manifest.json                ← Manifest V3 definition
│   ├── background/
│   │   └── background.js            ← Service worker: DNR rules, active tab tracker, alarms
│   ├── popup/
│   │   ├── popup.html               ← 360px toolbar popup
│   │   ├── popup.css                ← Modern styling (light/dark themes, CSS variables)
│   │   └── popup.js                 ← Active tab detection & quick block controller
│   ├── options/
│   │   ├── options.html             ← Settings Hub: Hard Blocklist, Timer Groups, Priority Rules
│   │   ├── options.css              ← Two-column responsive layout
│   │   └── options.js               ← CRUD controller & live catalog search
│   ├── blocked/
│   │   ├── blocked.html             ← Motivational blocked screen with mascot
│   │   ├── blocked.css              ← Floating animation & glowing backdrop
│   │   └── blocked.js               ← Quotes engine & contextual parameter handler
│   ├── shared/
│   │   ├── utils.js                 ← normalizeDomain, generateRuleId, todayDateString, faviconUrl
│   │   ├── storage.js               ← StorageService central persistence gateway
│   │   └── catalog.js               ← 12 pre-populated distracting sites catalog
│   └── icons/                       ← RGBA PNG icons (16px, 32px, 48px, 128px)
├── tests/                           ← Automated Test Suites
│   ├── mocks/
│   │   ├── chrome.mock.js           ← Mock environment for Chrome Extension MV3 APIs
│   │   └── dom.mock.js              ← Mock DOM environment for Node.js test runner
│   ├── unit/
│   │   ├── utils.test.js            ← Domain normalization & rule ID hash tests
│   │   ├── storage.test.js          ← StorageService schema & persistence tests
│   │   ├── background.test.js       ← Service worker, DNR diffing & alarms tests
│   │   ├── popup.test.js            ← Popup UI & quick block button tests
│   │   ├── options.test.js          ← Settings hub, table CRUD & suggestions tests
│   │   └── blocked.test.js          ← Blocked page parameters & quotes engine tests
│   └── e2e/
│       └── integration.test.js      ← End-to-end integration lifecycle test suite
├── package.json
└── README.md
```

---

## 🧪 Running Automated Tests

StopScroll uses Node.js's native test runner (`node:test`) and strict assertions (`node:assert/strict`) with zero external test dependencies:

```bash
npm test
```

All unit tests and end-to-end integration tests execute in under 200ms with 100% pass rate.

---

## 🛡️ Verification Steps

To independently verify the extension in your browser:
1. Open Chrome and load the unpacked extension from `StopScroll/extension`.
2. Visit `reddit.com` or `twitter.com`.
3. Click the StopScroll toolbar icon and click **`+ Block`**.
4. Refresh the tab — you will be immediately redirected to the motivational `blocked.html` screen.
5. In the block screen, click **Manage Blocklist** to open the Control Hub.
6. Toggle the site off in the Hard Blocklist table — reload the site and confirm access is restored.
7. Click the **Timer Groups** tab, create a group with a 1-minute allowance, and observe live time tracking in the popup progress bar!

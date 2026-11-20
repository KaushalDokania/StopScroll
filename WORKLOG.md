# StopScroll — Implementation Worklog & Decisions

This log captures key architectural decisions, trade-offs, and progress notes made during implementation.

---

## 2026-11-19 — Project Initialization

### Decision 1: Directory Structure
- **Decision**: Put all Chrome Extension files inside `extension/` directory (e.g., `extension/manifest.json`, `extension/background/`, `extension/popup/`, `extension/options/`, `extension/blocked/`, `extension/shared/`, `extension/icons/`) and all test suites in `tests/`.
- **Rationale**: Isolates the extension payload so it can be loaded directly into Chrome (`chrome://extensions` → Load unpacked → select `StopScroll/extension`) without bloating the unpacked extension with tests, node scripts, or markdown documentation.

### Decision 2: Native Test Runner (`node:test` + `node:assert`)
- **Decision**: Use Node.js built-in `node:test` and `node:assert/strict` with a lightweight mock environment for Chrome Extension APIs (`chrome.storage.local`, `chrome.declarativeNetRequest`, `chrome.tabs`, `chrome.alarms`, `chrome.idle`).
- **Rationale**: Node v25 has a blazing-fast built-in test runner with zero dependencies, avoiding npm install network delays or bundle compatibility issues in sandboxed execution.

### Decision 3: Deterministic Rule ID Algorithm
- **Decision**: Adopt the 32-bit `djb2` hash mod 999998 + 1 defined in `SPEC.md`.
- **Rationale**: Ensures that rule IDs are 100% deterministic and reproducible across browser restarts, allowing atomic rule diffing (`toRemove` vs `toAdd`) without state leakage.

---

## 2026-11-19 — Phase 1 Delivery
- Delivered `extension/manifest.json` compliant with Chrome MV3.
- Generated valid RGBA PNG icons for sizes 16, 32, 48, 128.
- Delivered `extension/shared/utils.js`, `storage.js`, and `catalog.js`.
- Delivered skeleton UI templates for `popup/`, `options/`, `blocked/`.
- Created test harness with mocked Chrome APIs (`chrome.mock.js`).
- Executed 30 automated tests in 16 suites covering all Phase 1 acceptance criteria with 100% pass rate.
- Git commit: `d67166b`.

---

## 2026-11-19 — Phase 2 Delivery
- Implemented `extension/background/background.js` (declarativeNetRequest rule synchronization with atomic diffing).
- Prioritized Hard Blocklist (Priority 1) over Timer Groups (Priority 2), with immediate rule clearing when `blockingShield` is disabled.
- Implemented real-time focus tracking via `tabs.onActivated` and `windows.onFocusChanged` with idle pause via `idle.onStateChanged`.
- Implemented 1-minute time tracking accumulator and daily midnight reset handlers via `chrome.alarms`.
- Added 20 background engine unit tests in `tests/unit/background.test.js`, bringing suite total to 50 passing tests (100% pass rate).
- Git commit: `876573b`.

---

## 2026-11-19 — Phase 3 Delivery
- Implemented `extension/popup/popup.html`, `popup.css`, `popup.js` with exact 360px panel layout, CSS theme variables, and reactive visual states.
- Implemented master Blocking Shield toggle with pulsating green/amber indicator and immediate storage sync.
- Implemented active tab detection with domain normalization and Google favicon service integration.
- Added quick-block button with reactive '✓ Blocked' disabled state when already blocked or upon click.
- Implemented Active Timer Group summary bar with real-time remaining minutes calculation and progress bar (styled with rose `.expired` upon reaching limit).
- Added DOM test environment in `tests/mocks/dom.mock.js` and 13 popup UI unit tests in `tests/unit/popup.test.js`.
- Total test count reached 63 passing tests across 29 test suites (100% pass rate).
- Git commit: `a82e079`.

---

## 2026-11-19 — Phase 4 Delivery
- Implemented `extension/options/options.html`, `options.css`, `options.js` featuring a responsive two-column layout with sidebar navigation.
- Built Hard Blocklist with live suggestions dropdown pre-populated with popular distraction domains and authentic favicons, real-time query filtering, custom domain cards, and disabled 'Added' state.
- Built interactive blocklist table with favicons, 'Permanent' badges, per-site enable/disable toggle switches, and row deletion with live badge updates.
- Built Timer Groups management cards with progress bars, remaining minutes, `.expired` visual status, site tags with remove buttons, domain addition, and group deletion.
- Built Priority Rules educational tab detailing the 3-tier hierarchy (Hard Blocklist > Timer Groups > General Browsing).
- Added 17 unit/DOM integration tests in `tests/unit/options.test.js`, bringing suite total to 80 passing tests (100% pass rate).
- Git commit: `c4e5d48`.

---

## 2026-11-19 — Phase 5 Delivery
- Implemented `extension/blocked/blocked.html`, `blocked.css`, `blocked.js` featuring centered responsive layout with glowing backdrop blobs and floating mascot lock icon with `🌱 Focus Mode` badge.
- Contextual reason badge rendering:
  - `hard_block`: `.pill-rose` with `Site is Blocked`
  - `timer_expired`: `.pill-orange` with `Timer Limit Reached — [Group Name]` and personalized daily lock message
  - `preview`: `.pill-blue` with `Preview Mode`
- Motivational quotes engine with 10 stoic and productivity quotes and real-time quote cycler (`nextQuote`).
- Navigation actions: `history.back()` with `chrome://newtab` fallback and `chrome.runtime.openOptionsPage()`.
- Added 9 unit tests in `tests/unit/blocked.test.js`, bringing suite total to 89 passing tests (100% pass rate).
- Git commit: `308fc20`.

---

## 2026-11-19 — Phase 6 Delivery (Final Ship & Verification)
- Implemented comprehensive End-to-End integration test suite in `tests/e2e/integration.test.js` validating:
  1. Full blocking lifecycle: Install -> Popup Quick Block -> Background declarativeNetRequest rule sync -> Blocked page redirect.
  2. Master Shield pause and resume behavior (clean rule clearing and instant recovery).
  3. Timer group active tab tracking, daily threshold lock, and midnight alarm reset.
  4. Deterministic priority conflict resolution (Hard Blocklist strictly takes precedence over Timer Groups).
  5. Service worker persistence across browser restart / sleep.
  6. Bundle size audit: Extension unpacked size is 128 KB (budget < 1.5 MB).
  7. Security & privacy audit: Zero `eval()`, zero external network calls, zero remote scripts, strict Manifest V3 CSP.
- Authored complete `README.md` with architecture breakdown, Chrome installation walkthrough (`chrome://extensions` Developer Mode), and test execution instructions.
- All 97 automated tests across 48 test suites passed with 100% success rate.
- Git commit: `65e6655`.

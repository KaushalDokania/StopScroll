# StopScroll — Implementation Worklog & Decisions

This log captures key decisions, trade-offs, and progress notes made during implementation.

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

## 2026-11-19 — Phase 1: Scaffolding & Shared Foundations Completed

### Summary of Work Done:
1. `extension/manifest.json`: Implemented strict MV3 manifest matching SPEC 1.1 with permissions (`declarativeNetRequest`, `storage`, `tabs`, `idle`, `alarms`), `<all_urls>` host permissions, action, options_page, background service_worker (`type: "module"`), and CSP.
2. `extension/icons/`: Generated valid 16x16, 32x32, 48x48, and 128x128 RGBA PNG shield icons using standard zlib/struct format.
3. `extension/shared/utils.js`: Exported `normalizeDomain`, `generateRuleId` (djb2 hash mod 999998 + 1), `todayDateString`, and `faviconUrl`.
4. `extension/shared/storage.js`: Exported `StorageService` gateway (`getAll`, `getSettings`, `saveSettings`, `getHardBlocklist`, `saveHardBlocklist`, `getTimerGroups`, `saveTimerGroups`) and `DEFAULTS`.
5. `extension/shared/catalog.js`: Exported `POPULAR_CATALOG` with 12 popular distraction sites and brand colors.
6. Skeleton files created for `popup` (`popup.html`, `popup.css`, `popup.js`), `options` (`options.html`, `options.css`, `options.js`), `blocked` (`blocked.html`, `blocked.css`, `blocked.js`), and `background` (`background.js`).
7. `package.json`: Configured with `"name": "stopscroll"`, `"version": "1.0.0"`, `"type": "module"`, `"scripts": { "test": "node --test tests/**/*.test.js" }`.
8. Automated tests: Built test harness in `tests/utils.test.js` and `tests/storage.test.js` with 21 unit tests passing cleanly.
# StopScroll — Implementation Worklog & Decisions

This log captures key decisions, trade-offs, and progress notes made during implementation.

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

---

## 2026-11-19 — Phase 2 Delivery
- Implemented `extension/background/background.js` (declarativeNetRequest rule synchronization with atomic diffing).
- Prioritized Hard Blocklist (Priority 1) over Timer Groups (Priority 2), with immediate rule clearing when `blockingShield` is disabled.
- Implemented real-time focus tracking via `tabs.onActivated` and `windows.onFocusChanged` with idle pause via `idle.onStateChanged`.
- Implemented 1-minute time tracking accumulator and daily midnight reset handlers via `chrome.alarms`.
- Added 20 background engine unit tests in `tests/unit/background.test.js`, bringing suite total to 50 passing tests (100% pass rate).



## 2026-11-19 — Phase 1: Scaffolding & Shared Foundations Completed

### Summary of Work Done:
1. `extension/manifest.json`: Implemented strict MV3 manifest matching SPEC 1.1 with permissions (`declarativeNetRequest`, `storage`, `tabs`, `idle`, `alarms`), `<all_urls>` host permissions, action, options_page, background service_worker (`type: "module"`), and CSP.
2. `extension/icons/`: Generated valid 16x16, 32x32, 48x48, and 128x128 RGBA PNG shield icons using standard zlib/struct format.
3. `extension/shared/utils.js`: Exported `normalizeDomain`, `generateRuleId` (djb2 hash mod 999998 + 1), `todayDateString`, and `faviconUrl`.
4. `extension/shared/storage.js`: Exported `StorageService` gateway (`getAll`, `getSettings`, `saveSettings`, `getHardBlocklist`, `saveHardBlocklist`, `getTimerGroups`, `saveTimerGroups`) and `DEFAULTS`.
5. `extension/shared/catalog.js`: Exported `POPULAR_CATALOG` with 12 popular distraction sites and brand colors.
6. Skeleton files created for `popup` (`popup.html`, `popup.css`, `popup.js`), `options` (`options.html`, `options.css`, `options.js`), `blocked` (`blocked.html`, `blocked.css`, `blocked.js`), and `background` (`background.js`).
7. `package.json`: Configured with `"name": "stopscroll"`, `"version": "1.0.0"`, `"type": "module"`, `"scripts": { "test": "node --test tests/**/*.test.js" }`.
8. Automated tests: Built test harness in `tests/utils.test.js` and `tests/storage.test.js` with 21 unit tests passing cleanly.
# StopScroll — Implementation Worklog & Decisions

This log captures key decisions, trade-offs, and progress notes made during implementation.

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

---

## 2026-11-19 — Phase 2 Delivery
- Implemented `extension/background/background.js` (declarativeNetRequest rule synchronization with atomic diffing).
- Prioritized Hard Blocklist (Priority 1) over Timer Groups (Priority 2), with immediate rule clearing when `blockingShield` is disabled.
- Implemented real-time focus tracking via `tabs.onActivated` and `windows.onFocusChanged` with idle pause via `idle.onStateChanged`.
- Implemented 1-minute time tracking accumulator and daily midnight reset handlers via `chrome.alarms`.
- Added 20 background engine unit tests in `tests/unit/background.test.js`, bringing suite total to 50 passing tests (100% pass rate).




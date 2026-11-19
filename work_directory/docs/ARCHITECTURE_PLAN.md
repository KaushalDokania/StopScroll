# Architecture & Technical Plan: BlockGuard v2 (BlockSite Inspired)

This document details the refined architecture, data models, rule priority resolution, and phased development for **BlockGuard v2**, incorporating **Timer Groups**, **Search with Pre-populated Frequent Sites & Favicons**, and a **Rich Blocked Landing Page with Productivity Quotes**.

---

## 1. Feature Specifications & Core Changes

| Feature | Change / Specification | Implementation Mechanism |
| :--- | :--- | :--- |
| **Blocking Shield Toggle** | Replaces old master switch. Single toggle controls whether blocking rules & timers are enforced. | Controls `chrome.declarativeNetRequest` dynamic rule sync without disabling the extension. |
| **Search & Pre-populated Suggestions** | Clicking the search input immediately shows frequently visited distraction sites with real favicons. Typing filters results live. | Pre-populated catalog of popular distraction domains + Google favicon service `https://www.google.com/s2/favicons?domain=...`. |
| **Timer Groups & Allowances** | Group sites together (e.g. "Social Media" = YouTube + Reddit + Instagram) with a shared daily limit (e.g. 30 mins). | Active tab time tracking in `background.js` using `chrome.idle`, `chrome.windows`, and `chrome.alarms`. |
| **Rule Priority Resolution** | Clear conflict resolution between Hard Blocklist and Timer Groups. | **Priority 1: Hard Blocklist** > **Priority 2: Timer Groups** > **Priority 3: Allowed**. |
| **Rich Blocked Page** | Friendly visual illustration, distinct reason badge ("Permanent Block" vs "Timer Limit Reached"), and rotating productivity quotes. | Dynamic motivational quotes database with "New quote" generator in `blocked.html`. |

---

## 2. Priority Resolution Logic

```mermaid
flowchart TD
    Request[User navigates to a domain] --> ShieldCheck{Is Blocking Shield Active?}
    ShieldCheck -->|No| Allow[Site Loads Normally]
    ShieldCheck -->|Yes| HardCheck{Is domain in Hard Blocklist?}
    
    HardCheck -->|Yes (P1)| BlockPerm[Redirect to blocked.html with Permanent Block Badge]
    HardCheck -->|No| TimerCheck{Is domain in a Timer Group?}
    
    TimerCheck -->|No (P3)| Allow
    TimerCheck -->|Yes (P2)| LimitCheck{Has Group Daily Limit Expired?}
    LimitCheck -->|Yes| BlockTimer[Redirect to blocked.html with Timer Expired Badge]
    LimitCheck -->|No| AllowTimer[Allow access and increment active time tracker]
```

### Conflict Resolution Rule:
If a domain (e.g., `youtube.com`) is placed in both the Hard Blocklist and a Timer Group:
- **The Hard Blocklist strictly takes precedence.**
- The site is blocked immediately with 0 access granted, regardless of any remaining minutes in the Timer Group.

---

## 3. Data Schema (`chrome.storage.local`)

```json
{
  "settings": {
    "blockingShield": true,
    "lastResetDate": "2026-11-19"
  },
  "hardBlocklist": [
    {
      "domain": "facebook.com",
      "enabled": true,
      "addedAt": 1700000000000,
      "icon": "https://www.google.com/s2/favicons?domain=facebook.com&sz=32"
    }
  ],
  "timerGroups": [
    {
      "id": "group_social_media",
      "name": "Social Media",
      "dailyLimitMinutes": 30,
      "usedMinutes": 12,
      "sites": ["youtube.com", "reddit.com", "instagram.com"]
    },
    {
      "id": "group_entertainment",
      "name": "Streaming & Gaming",
      "dailyLimitMinutes": 45,
      "usedMinutes": 45,
      "sites": ["netflix.com", "twitch.tv"]
    }
  ]
}
```

---

## 4. Time Tracking Engine Architecture

1. **Active Tab Monitoring (`background.js`)**:
   - `chrome.tabs.onActivated` and `chrome.windows.onFocusChanged` identify the domain in the user's currently active viewport.
   - `chrome.idle.onStateChanged` pauses time accumulation if the user is locked or idle (`idle` or `locked` state).
2. **Time Accumulator Alarm**:
   - `chrome.alarms.create("timeTracker", { periodInMinutes: 1 })` fires every minute.
   - If the active domain matches a Timer Group, `usedMinutes` increments by 1.
3. **Threshold Trigger**:
   - If `usedMinutes >= dailyLimitMinutes`, `syncDynamicRules()` is triggered.
   - The domains belonging to the expired group are converted into `declarativeNetRequest` redirect rules pointing to `blocked.html?reason=timer_expired&group=Social%20Media`.
4. **Daily Midnight Reset**:
   - At 00:00 local time, `usedMinutes` resets to 0 for all timer groups, removing expired redirect rules.

---

## 5. UI/UX Refinements (BlockSite Style)

1. **Extension Popup (`popup/`)**:
   - Clean BlockGuard logo with single **Blocking Shield Active** toggle switch.
   - Active Tab card with live favicon, domain, and 1-click **+ Block** button.
   - Active timer widget showing current group progress (e.g. *18m left / 30m*).
   - "Manage Settings" link to open options page.

2. **Options Dashboard (`options/`)**:
   - **Hard Blocklist Tab**:
     - Live search bar. Clicking it opens the pre-populated grid of popular distraction sites (YouTube, Reddit, Netflix, Instagram, etc.) with real brand icons and 1-click `+ Add` buttons.
     - Table with favicons, enable/disable switches, and delete buttons.
   - **Timer Groups Tab**:
     - Visual cards for each group with customizable daily limits, progress bars, and domain tag management.
   - **Priority Rules Tab**:
     - Interactive explainer showing that Hard Blocks override Timer Groups.

3. **Rich Blocked Page (`blocked/`)**:
   - Friendly mascot graphic with glowing backdrop and focus mode pill.
   - Dynamic context message (*"This site is on your hard blocklist"* vs *"You've used your 30 mins for Social Media today!"*).
   - Rotating productivity quote card with Seneca, Cal Newport, and Mark Twain quotes, plus a **"New quote"** shuffle button.

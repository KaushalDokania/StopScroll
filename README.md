# StopScroll 🛑

> A minimal, privacy-focused Chrome Extension for blocking distracting websites, inspired by BlockSite. Built with Chrome Manifest V3, native `declarativeNetRequest`, and flexible Timer Groups.

## Features

- **Single Shield Toggle**: Easily activate or pause protection with one click.
- **Permanent Blocklist**: Completely blocks distracting domains and redirects to a motivational focus screen.
- **Timer Groups & Daily Allowances**: Set daily allowances (e.g. 30 minutes for social media sites). Once your time is up, the group is locked until midnight.
- **Smart Pre-populated Suggestions**: Instant 1-click blocking for frequent distraction sites (YouTube, Reddit, Instagram, etc.) with real favicons.
- **Priority Resolution Engine**: Hard blocks take top precedence over timer allowances.
- **Distraction-Free Block Screen**: Clean, friendly UI with motivational quotes.

## Tech Stack

- **Manifest V3** (`manifest.json`)
- **declarativeNetRequest API** (Native C++ rule engine for instant, low-overhead blocking)
- **chrome.storage.local** (Offline, persistent storage)
- **chrome.alarms & chrome.idle** (Battery-efficient focus time tracking)
- **HTML5, Tailwind CSS, Vanilla ES6+**

## Local Installation (Developer Mode)

1. Open Google Chrome on macOS and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select this directory (`StopScroll/git_src/stopscroll`).
5. Pin **StopScroll** to your Chrome toolbar.

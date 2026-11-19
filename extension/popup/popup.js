// popup/popup.js
import { StorageService } from '../shared/storage.js';
import { normalizeDomain, faviconUrl } from '../shared/utils.js';

export async function renderShieldStatus() {
  const settings = await StorageService.getSettings();
  const active = settings ? Boolean(settings.blockingShield) : true;
  const toggle = document.getElementById('shield-toggle');
  if (toggle) {
    toggle.checked = active;
  }
  applyShieldUI(active);
}

export function applyShieldUI(active) {
  const card = document.getElementById('shield-card');
  const dot = document.getElementById('shield-dot');
  const title = document.getElementById('shield-title');
  const desc = document.getElementById('shield-desc');

  if (active) {
    if (card) {
      card.className = 'card shield-active';
    }
    if (dot) {
      dot.className = 'status-dot green';
    }
    if (title) {
      title.textContent = 'Blocking Shield Active';
    }
    if (desc) {
      desc.textContent = 'Rules & Timers Enforced';
    }
  } else {
    if (card) {
      card.className = 'card shield-paused';
    }
    if (dot) {
      dot.className = 'status-dot amber pulse-off';
    }
    if (title) {
      title.textContent = 'Blocking Paused';
    }
    if (desc) {
      desc.textContent = 'All websites temporarily allowed';
    }
  }
}

export async function onShieldToggle(checked) {
  const settings = await StorageService.getSettings();
  settings.blockingShield = checked;
  await StorageService.saveSettings(settings);
  applyShieldUI(checked);
}

export async function renderActiveTab() {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    let domain = '';
    try {
      domain = normalizeDomain(new URL(tab.url).hostname);
    } catch {
      domain = '';
    }

    if (!domain) return;

    const domainEl = document.getElementById('active-tab-domain');
    const faviconEl = document.getElementById('active-tab-favicon');
    const btn = document.getElementById('btn-quick-block');

    if (domainEl) {
      domainEl.textContent = domain;
    }
    if (faviconEl) {
      faviconEl.src = faviconUrl(domain);
      faviconEl.alt = domain;
    }

    if (btn) {
      btn.dataset.domain = domain;

      // Check if already hard-blocked
      const list = await StorageService.getHardBlocklist();
      const isBlocked = Array.isArray(list) && list.some(e => e.domain === domain && e.enabled);
      if (isBlocked) {
        btn.textContent = '✓ Blocked';
        btn.classList.add('btn-blocked');
        btn.disabled = true;
      } else {
        btn.textContent = '+ Block';
        btn.classList.remove('btn-blocked');
        btn.disabled = false;
      }
    }
  } catch (err) {
    console.error('Error rendering active tab:', err);
  }
}

export async function onQuickBlock() {
  const btn = document.getElementById('btn-quick-block');
  if (!btn) return;
  const domain = btn.dataset.domain;
  if (!domain) return;

  const list = (await StorageService.getHardBlocklist()) || [];
  const existing = list.find(e => e.domain === domain);

  if (!existing) {
    list.unshift({
      domain,
      enabled: true,
      addedAt: Date.now(),
      icon: faviconUrl(domain)
    });
    await StorageService.saveHardBlocklist(list);
  } else if (!existing.enabled) {
    existing.enabled = true;
    await StorageService.saveHardBlocklist(list);
  }

  btn.textContent = '✓ Blocked';
  btn.classList.add('btn-blocked');
  btn.disabled = true;
}

export async function renderTimerSummary() {
  const card = document.getElementById('timer-card');
  if (!card) return;

  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    card.classList.add('hidden');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      card.classList.add('hidden');
      return;
    }

    let domain = '';
    try {
      domain = normalizeDomain(new URL(tab.url).hostname);
    } catch {
      card.classList.add('hidden');
      return;
    }

    const groups = (await StorageService.getTimerGroups()) || [];
    const group = groups.find(g =>
      g.sites && (g.sites.includes(domain) || g.sites.some(s => domain.endsWith('.' + s)))
    );

    if (!group) {
      card.classList.add('hidden');
      return;
    }

    card.classList.remove('hidden');

    const limit = group.dailyLimitMinutes || 1;
    const used = group.usedMinutes || 0;
    const remaining = Math.max(0, limit - used);
    const pct = Math.min(100, Math.round((used / limit) * 100));

    const nameEl = document.getElementById('timer-group-name');
    const remEl = document.getElementById('timer-remaining');
    const bar = document.getElementById('timer-progress-bar');
    const sitesEl = document.getElementById('timer-sites');

    if (nameEl) nameEl.textContent = group.name || 'Timer Group';
    if (remEl) remEl.textContent = `${remaining}m left / ${limit}m`;
    if (bar) {
      bar.style.width = `${pct}%`;
      bar.className = (pct >= 100 || remaining === 0) ? 'progress-bar-fill expired' : 'progress-bar-fill';
    }
    if (sitesEl && Array.isArray(group.sites)) {
      sitesEl.textContent = `Includes: ${group.sites.join(', ')}`;
    }
  } catch (err) {
    console.error('Error rendering timer summary:', err);
    card.classList.add('hidden');
  }
}

export function bindEvents() {
  const toggle = document.getElementById('shield-toggle');
  if (toggle) {
    toggle.addEventListener('change', e => onShieldToggle(e.target.checked));
  }

  const quickBlockBtn = document.getElementById('btn-quick-block');
  if (quickBlockBtn) {
    quickBlockBtn.addEventListener('click', onQuickBlock);
  }

  const openOptionsBtn = document.getElementById('btn-open-options');
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
      }
    });
  }

  const manageSettingsBtn = document.getElementById('btn-manage-settings');
  if (manageSettingsBtn) {
    manageSettingsBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
      }
    });
  }

  const previewBlockedBtn = document.getElementById('btn-preview-blocked');
  if (previewBlockedBtn) {
    previewBlockedBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        const previewUrl = chrome.runtime?.getURL
          ? chrome.runtime.getURL('blocked/blocked.html?preview=true')
          : 'blocked/blocked.html?preview=true';
        chrome.tabs.create({ url: previewUrl });
      }
    });
  }
}

export async function initPopup() {
  await renderShieldStatus();
  await renderActiveTab();
  await renderTimerSummary();
  bindEvents();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }
}

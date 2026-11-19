// options/options.js
import { StorageService } from '../shared/storage.js';
import { normalizeDomain, faviconUrl } from '../shared/utils.js';
import { POPULAR_CATALOG } from '../shared/catalog.js';

// ── Tab Navigation ─────────────────────────────────────────────────────────
export function switchTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('active');
  });
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.remove('active');
  });

  const targetPane = document.getElementById(`tab-${tab}`);
  if (targetPane) {
    targetPane.classList.remove('hidden');
    targetPane.classList.add('active');
  }

  const targetNav = document.querySelector(`[data-tab="${tab}"]`);
  if (targetNav) {
    targetNav.classList.add('active');
  }
}

// ── Hard Blocklist Tab ─────────────────────────────────────────────────────
export async function renderHardBlocklist() {
  const list = (await StorageService.getHardBlocklist()) || [];
  const el = document.getElementById('hardblock-list');
  const badge = document.getElementById('badge-hardblock');

  if (badge) {
    badge.textContent = String(list.length);
  }

  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">No hard-blocked sites yet. Add one above!</div>`;
    return;
  }

  el.innerHTML = list.map((site, i) => `
    <div class="table-row">
      <div class="site-cell">
        <img src="${site.icon || faviconUrl(site.domain)}" 
             alt="${site.domain}" class="favicon">
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
          <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

export async function addToHardBlocklist(domain) {
  domain = normalizeDomain(domain);
  if (!domain || !domain.includes('.')) return false;

  const list = (await StorageService.getHardBlocklist()) || [];
  if (list.some(e => e.domain === domain)) return false;

  list.unshift({
    domain,
    enabled: true,
    addedAt: Date.now(),
    icon: faviconUrl(domain)
  });
  await StorageService.saveHardBlocklist(list);
  await renderHardBlocklist();
  const searchInput = document.getElementById('search-input');
  await renderSuggestions(searchInput ? searchInput.value : '');
  return true;
}

export async function toggleHardBlock(target, enabled) {
  const list = (await StorageService.getHardBlocklist()) || [];
  let item = null;
  if (typeof target === 'number') {
    item = list[target];
  } else if (typeof target === 'string') {
    const clean = normalizeDomain(target);
    item = list.find(e => e.domain === clean || e.domain === target);
  }
  if (item) {
    item.enabled = Boolean(enabled);
    await StorageService.saveHardBlocklist(list);
    return true;
  }
  return false;
}

export async function deleteHardBlock(target) {
  const list = (await StorageService.getHardBlocklist()) || [];
  let idx = -1;
  if (typeof target === 'number') {
    idx = target;
  } else if (typeof target === 'string') {
    const clean = normalizeDomain(target);
    idx = list.findIndex(e => e.domain === clean || e.domain === target);
  }
  if (idx >= 0 && idx < list.length) {
    list.splice(idx, 1);
    await StorageService.saveHardBlocklist(list);
    await renderHardBlocklist();
    const searchInput = document.getElementById('search-input');
    await renderSuggestions(searchInput ? searchInput.value : '');
    return true;
  }
  return false;
}

// ── Suggestions Dropdown ───────────────────────────────────────────────────
export function showDropdown() {
  const dd = document.getElementById('suggestions-dropdown');
  if (dd) dd.classList.remove('hidden');
}

export function hideDropdown() {
  const dd = document.getElementById('suggestions-dropdown');
  if (dd) dd.classList.add('hidden');
}

export async function renderSuggestions(query = '') {
  const q = normalizeDomain(query);
  const list = (await StorageService.getHardBlocklist()) || [];
  const label = document.getElementById('dropdown-label');
  const grid = document.getElementById('suggestions-grid');

  let items = POPULAR_CATALOG;
  if (q) {
    items = POPULAR_CATALOG.filter(c =>
      c.domain.includes(q) || c.name.toLowerCase().includes(q)
    );
    if (!items.some(c => c.domain === q) && q.includes('.')) {
      items = [...items, { domain: q, name: q, color: '#f43f5e' }];
    }
    if (label) {
      label.textContent = `Matching Results for "${q}"`;
    }
  } else {
    if (label) {
      label.textContent = 'Frequently Visited & Popular Sites';
    }
  }

  if (!grid) return;

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

  grid.querySelectorAll('.btn-add-suggestion:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      await addToHardBlocklist(btn.dataset.domain);
    });
  });
}

// ── Timer Groups Tab ───────────────────────────────────────────────────────
export async function renderTimerGroups() {
  const groups = (await StorageService.getTimerGroups()) || [];
  const el = document.getElementById('timer-groups-list');
  const badge = document.getElementById('badge-timers');

  if (badge) {
    badge.textContent = String(groups.length);
  }

  if (!el) return;

  if (groups.length === 0) {
    el.innerHTML = `<div class="empty-state">No timer groups yet. Create one to set daily limits.</div>`;
    return;
  }

  el.innerHTML = groups.map((group, gIdx) => {
    const limit = group.dailyLimitMinutes || 1;
    const used = group.usedMinutes || 0;
    const remaining = Math.max(0, limit - used);
    const pct = Math.min(100, Math.round((used / limit) * 100));
    const isExpired = remaining === 0 || pct >= 100;

    return `
      <div class="group-card" data-gidx="${gIdx}">
        <div class="group-header">
          <div class="group-title-block">
            <div class="group-icon ${isExpired ? 'expired' : ''}">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h4 class="group-name">${group.name}</h4>
              <p class="group-limit">Daily allowance: ${limit} minutes</p>
            </div>
          </div>
          <div class="group-status">
            <span class="timer-value ${isExpired ? 'rose' : 'orange'}">
              ${isExpired ? 'Limit Reached (Blocked)' : `${remaining}m remaining`}
            </span>
            <span class="timer-meta">${used}m / ${limit}m used</span>
          </div>
        </div>

        <div class="progress-bar-track">
          <div class="progress-bar-fill ${isExpired ? 'expired' : ''}" style="width:${pct}%"></div>
        </div>

        <div class="group-sites">
          <span class="sites-label">Includes:</span>
          ${(group.sites || []).map((site, sIdx) => `
            <span class="site-tag">
              <img src="${faviconUrl(site, 16)}" class="favicon-sm" alt="">
              ${site}
              <button class="btn-remove-site" data-gidx="${gIdx}" data-sidx="${sIdx}" title="Remove site">✕</button>
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

export function bindTimerGroupActions() {
  document.querySelectorAll('.btn-remove-site').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gIdx = Number(btn.dataset.gidx);
      const sIdx = Number(btn.dataset.sidx);
      await removeSiteFromGroup(gIdx, sIdx);
    });
  });

  document.querySelectorAll('.btn-add-site-to-group').forEach(btn => {
    btn.addEventListener('click', async () => {
      const domain = typeof window !== 'undefined' && window.prompt
        ? window.prompt('Enter domain to add (e.g. twitter.com):')
        : null;
      if (!domain) return;
      await addSiteToGroup(Number(btn.dataset.gidx), domain);
    });
  });

  document.querySelectorAll('.btn-delete-group').forEach(btn => {
    btn.addEventListener('click', async () => {
      const shouldDelete = typeof window !== 'undefined' && window.confirm
        ? window.confirm('Delete this timer group?')
        : true;
      if (!shouldDelete) return;
      await deleteTimerGroup(Number(btn.dataset.gidx));
    });
  });
}

export async function addTimerGroup(name, dailyLimitMinutes) {
  if (!name || !name.trim()) return false;
  const mins = parseInt(dailyLimitMinutes, 10);
  if (!mins || mins <= 0) return false;

  const groups = (await StorageService.getTimerGroups()) || [];
  groups.push({
    id: `group_${Date.now()}`,
    name: name.trim(),
    dailyLimitMinutes: mins,
    usedMinutes: 0,
    sites: []
  });
  await StorageService.saveTimerGroups(groups);
  await renderTimerGroups();
  return true;
}

export async function deleteTimerGroup(gIdx) {
  const groups = (await StorageService.getTimerGroups()) || [];
  if (gIdx >= 0 && gIdx < groups.length) {
    groups.splice(gIdx, 1);
    await StorageService.saveTimerGroups(groups);
    await renderTimerGroups();
    return true;
  }
  return false;
}

export async function addSiteToGroup(gIdx, domain) {
  const clean = normalizeDomain(domain);
  if (!clean || !clean.includes('.')) return false;

  const groups = (await StorageService.getTimerGroups()) || [];
  const g = groups[gIdx];
  if (!g) return false;

  if (!g.sites) g.sites = [];
  if (!g.sites.includes(clean)) {
    g.sites.push(clean);
    await StorageService.saveTimerGroups(groups);
    await renderTimerGroups();
    return true;
  }
  return false;
}

export async function removeSiteFromGroup(gIdx, sIdx) {
  const groups = (await StorageService.getTimerGroups()) || [];
  const g = groups[gIdx];
  if (!g || !g.sites) return false;

  if (sIdx >= 0 && sIdx < g.sites.length) {
    g.sites.splice(sIdx, 1);
    await StorageService.saveTimerGroups(groups);
    await renderTimerGroups();
    return true;
  }
  return false;
}

// ── Event Bindings ─────────────────────────────────────────────────────────
export function bindHardBlocklistEvents() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      showDropdown();
      renderSuggestions(searchInput.value);
    });
    searchInput.addEventListener('input', () => {
      renderSuggestions(searchInput.value);
    });
  }

  const btnClose = document.getElementById('btn-close-suggestions');
  if (btnClose) {
    btnClose.addEventListener('click', hideDropdown);
  }

  const btnSearchAdd = document.getElementById('btn-search-add');
  if (btnSearchAdd && searchInput) {
    btnSearchAdd.addEventListener('click', async () => {
      if (searchInput.value) {
        await addToHardBlocklist(searchInput.value);
        searchInput.value = '';
        hideDropdown();
      }
    });
  }

  const btnAddSite = document.getElementById('btn-add-site');
  if (btnAddSite && searchInput) {
    btnAddSite.addEventListener('click', () => {
      searchInput.focus();
      showDropdown();
    });
  }

  const hardblockList = document.getElementById('hardblock-list');
  if (hardblockList) {
    hardblockList.addEventListener('change', async e => {
      if (e.target && e.target.classList.contains('toggle-site')) {
        const idx = Number(e.target.dataset.idx);
        await toggleHardBlock(idx, e.target.checked);
      }
    });

    hardblockList.addEventListener('click', async e => {
      const btn = e.target.closest ? e.target.closest('.btn-delete') : null;
      if (btn) {
        const idx = Number(btn.dataset.idx);
        await deleteHardBlock(idx);
      }
    });
  }
}

export function bindTimerGroupEvents() {
  const btnNewGroup = document.getElementById('btn-new-group');
  if (btnNewGroup) {
    btnNewGroup.addEventListener('click', async () => {
      const name = typeof window !== 'undefined' && window.prompt
        ? window.prompt('Timer Group Name (e.g. "Social Media"):')
        : null;
      if (!name) return;

      const mins = typeof window !== 'undefined' && window.prompt
        ? window.prompt('Daily allowance in minutes (e.g. 30):', '30')
        : '30';
      if (!mins) return;

      await addTimerGroup(name, mins);
    });
  }
}

export function bindNavigationEvents() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset && btn.dataset.tab) {
        switchTab(btn.dataset.tab);
      }
    });
  });

  const btnBack = document.getElementById('btn-back-to-popup');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (typeof window !== 'undefined' && window.history?.back) {
        window.history.back();
      }
    });
  }
}

export async function initOptions() {
  await renderHardBlocklist();
  await renderTimerGroups();
  bindHardBlocklistEvents();
  bindTimerGroupEvents();
  bindNavigationEvents();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptions);
  } else {
    initOptions();
  }
}

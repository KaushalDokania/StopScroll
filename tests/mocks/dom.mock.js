// tests/mocks/dom.mock.js
/**
 * Lightweight mock DOM environment for unit testing extension pages in Node.js.
 */

class MockClassList {
  constructor(element) {
    this.element = element;
    this.classes = new Set();
  }

  add(...classNames) {
    for (const c of classNames) {
      if (c) {
        c.trim().split(/\s+/).forEach(part => {
          if (part) this.classes.add(part);
        });
      }
    }
    this._sync();
  }

  remove(...classNames) {
    for (const c of classNames) {
      if (c) {
        c.trim().split(/\s+/).forEach(part => {
          if (part) this.classes.delete(part);
        });
      }
    }
    this._sync();
  }

  contains(className) {
    return this.classes.has(className);
  }

  toggle(className, force) {
    if (force !== undefined) {
      if (force) this.add(className);
      else this.remove(className);
      return force;
    }
    if (this.classes.has(className)) {
      this.remove(className);
      return false;
    } else {
      this.add(className);
      return true;
    }
  }

  replace(oldClass, newClass) {
    this.remove(oldClass);
    this.add(newClass);
  }

  _sync() {
    this.element._className = Array.from(this.classes).join(' ');
  }

  _fromClassName(str) {
    this.classes.clear();
    if (str && typeof str === 'string') {
      str.trim().split(/\s+/).forEach(c => {
        if (c) this.classes.add(c);
      });
    }
  }
}

function matchesSelector(el, selector) {
  if (!selector) return false;
  selector = selector.trim();

  // Handle :not([disabled])
  if (selector.includes(':not([disabled])')) {
    const baseSelector = selector.replace(':not([disabled])', '').trim();
    if (el.disabled) return false;
    if (!baseSelector) return true;
    return matchesSelector(el, baseSelector);
  }

  // Handle #id
  if (selector.startsWith('#')) {
    return el.id === selector.slice(1);
  }

  // Handle [data-...]
  const dataMatch = selector.match(/^\[data-([a-zA-Z0-9_-]+)(?:=["']?([^"']*)["']?)?\]$/);
  if (dataMatch) {
    const key = dataMatch[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (dataMatch[2] !== undefined) {
      return el.dataset[key] === dataMatch[2];
    }
    return el.dataset[key] !== undefined;
  }

  // Handle .className or compound class .c1.c2
  if (selector.startsWith('.')) {
    const parts = selector.split('.').filter(Boolean);
    return parts.every(part => el.classList.contains(part));
  }

  // Handle tag name
  if (/^[a-zA-Z0-9_-]+$/.test(selector)) {
    return el.tagName.toLowerCase() === selector.toLowerCase();
  }

  return false;
}

export class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this._className = '';
    this.classList = new MockClassList(this);
    this.textContent = '';
    this._innerHTML = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.src = '';
    this.alt = '';
    this.href = '';
    this.style = {};
    this.dataset = {};
    this.listeners = new Map();
    this.children = [];
    this.parentNode = null;
  }

  get className() {
    return this._className;
  }

  set className(val) {
    this._className = val || '';
    this.classList._fromClassName(this._className);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html) {
    this._innerHTML = String(html);
    this.children = [];
    this._parseHTMLToChildren(this._innerHTML);
    // Also derive textContent roughly
    this.textContent = this._innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  _parseHTMLToChildren(html) {
    // Lightweight regex parser to extract child elements with classes, IDs, datasets, disabled
    const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>(?:([\s\S]*?)<\/\1>)?/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1];
      const attrsStr = match[2] || '';
      const innerContent = match[3] || '';

      const child = new MockElement(tagName);
      child.parentNode = this;

      // Extract id
      const idMatch = attrsStr.match(/\bid=["']([^"']+)["']/i);
      if (idMatch) child.id = idMatch[1];

      // Extract class
      const classMatch = attrsStr.match(/\bclass=["']([^"']+)["']/i);
      if (classMatch) child.className = classMatch[1];

      // Extract disabled
      if (/\bdisabled\b/i.test(attrsStr)) child.disabled = true;

      // Extract checked
      if (/\bchecked\b/i.test(attrsStr)) child.checked = true;

      // Extract dataset e.g. data-domain="..." data-tab="..." data-gidx="..." data-sidx="..."
      const dataRegex = /\bdata-([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;
      let dMatch;
      while ((dMatch = dataRegex.exec(attrsStr)) !== null) {
        const key = dMatch[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        child.dataset[key] = dMatch[2];
      }

      // Extract src
      const srcMatch = attrsStr.match(/\bsrc=["']([^"']+)["']/i);
      if (srcMatch) child.src = srcMatch[1];

      // Extract value
      const valMatch = attrsStr.match(/\bvalue=["']([^"']+)["']/i);
      if (valMatch) child.value = valMatch[1];

      // Inner text / recursive children
      child.textContent = innerContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (innerContent.includes('<')) {
        child._parseHTMLToChildren(innerContent);
      }

      this.children.push(child);
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  querySelector(selector) {
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const search = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, selector)) {
          matches.push(child);
        }
        search(child);
      }
    };
    search(this);
    return matches;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(listener);
    }
  }

  async dispatchEvent(event) {
    const list = this.listeners.get(event.type);
    if (list) {
      for (const listener of list) {
        await listener(event);
      }
    }
  }

  async click() {
    await this.dispatchEvent({ type: 'click', target: this });
  }

  async change(checkedValue) {
    if (checkedValue !== undefined) {
      this.checked = checkedValue;
    }
    await this.dispatchEvent({ type: 'change', target: this });
  }

  async input(val) {
    if (val !== undefined) {
      this.value = val;
    }
    await this.dispatchEvent({ type: 'input', target: this });
  }
}

export class MockDocument {
  constructor() {
    this.elements = new Map();
    this.listeners = new Map();
  }

  registerElement(id, tagName = 'div') {
    const el = new MockElement(tagName, id);
    this.elements.set(id, el);
    return el;
  }

  getElementById(id) {
    if (!this.elements.has(id)) {
      const el = new MockElement('div', id);
      this.elements.set(id, el);
    }
    return this.elements.get(id);
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      return this.getElementById(selector.slice(1));
    }
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }

  querySelectorAll(selector) {
    const matches = [];
    // Search top registered elements and their descendants
    for (const el of this.elements.values()) {
      if (matchesSelector(el, selector)) {
        matches.push(el);
      }
      matches.push(...el.querySelectorAll(selector));
    }
    // Deduplicate in case of shared references
    return Array.from(new Set(matches));
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(listener);
    }
  }

  async dispatchEvent(event) {
    const list = this.listeners.get(event.type);
    if (list) {
      for (const listener of list) {
        await listener(event);
      }
    }
  }

  _reset() {
    this.elements.clear();
    this.listeners.clear();
  }
}

export function setupPopupDOM() {
  const doc = new MockDocument();

  doc.registerElement('shield-card');
  doc.registerElement('shield-dot');
  doc.registerElement('shield-title');
  doc.registerElement('shield-desc');
  doc.registerElement('shield-toggle', 'input');

  doc.registerElement('active-tab-card');
  doc.registerElement('active-tab-favicon', 'img');
  doc.registerElement('active-tab-domain');
  doc.registerElement('btn-quick-block', 'button');

  doc.registerElement('timer-card');
  doc.registerElement('timer-group-name');
  doc.registerElement('timer-remaining');
  doc.registerElement('timer-progress-bar');
  doc.registerElement('timer-sites');

  doc.registerElement('btn-open-options', 'button');
  doc.registerElement('btn-manage-settings', 'button');
  doc.registerElement('btn-preview-blocked', 'button');

  globalThis.document = doc;
  globalThis.window = globalThis;

  return doc;
}

export function setupOptionsDOM() {
  const doc = new MockDocument();

  // Sidebar & Navigation
  doc.registerElement('app-shell');
  doc.registerElement('sidebar');
  const nav = doc.registerElement('sidebar-nav', 'nav');

  const navHardblock = new MockElement('button');
  navHardblock.className = 'nav-item active';
  navHardblock.dataset.tab = 'hardblock';
  nav.appendChild(navHardblock);

  const navTimers = new MockElement('button');
  navTimers.className = 'nav-item';
  navTimers.dataset.tab = 'timers';
  nav.appendChild(navTimers);

  const navPriority = new MockElement('button');
  navPriority.className = 'nav-item';
  navPriority.dataset.tab = 'priority';
  nav.appendChild(navPriority);

  doc.registerElement('badge-hardblock');
  doc.registerElement('badge-timers');
  doc.registerElement('btn-back-to-popup', 'button');

  // Tab A: Hard Blocklist
  const tabHardblock = doc.registerElement('tab-hardblock', 'section');
  tabHardblock.className = 'tab-pane active';

  doc.registerElement('btn-add-site', 'button');
  doc.registerElement('search-container');
  doc.registerElement('search-input', 'input');
  doc.registerElement('btn-search-add', 'button');
  const dropdown = doc.registerElement('suggestions-dropdown');
  dropdown.className = 'dropdown hidden';
  doc.registerElement('dropdown-label');
  doc.registerElement('btn-close-suggestions', 'button');
  doc.registerElement('suggestions-grid');
  doc.registerElement('hardblock-table-wrap');
  doc.registerElement('hardblock-list');

  // Tab B: Timer Groups
  const tabTimers = doc.registerElement('tab-timers', 'section');
  tabTimers.className = 'tab-pane hidden';

  doc.registerElement('btn-new-group', 'button');
  doc.registerElement('timer-groups-list');

  // Tab C: Priority Rules
  const tabPriority = doc.registerElement('tab-priority', 'section');
  tabPriority.className = 'tab-pane hidden';

  globalThis.document = doc;
  globalThis.window = globalThis;
  globalThis.window.prompt = (msg, defaultVal) => defaultVal || '';
  globalThis.window.confirm = (msg) => true;

  return doc;
}

export function setupBlockedDOM(queryParams = {}) {
  const doc = (globalThis.document instanceof MockDocument) ? globalThis.document : new MockDocument();
  doc.elements.clear();
  doc.listeners.clear();

  doc.registerElement('blocked-page');
  doc.registerElement('reason-pill');
  doc.registerElement('blocked-domain');
  
  const blockedSub = doc.registerElement('blocked-sub', 'p');
  blockedSub.className = 'blocked-sub';

  doc.registerElement('quote-text', 'blockquote');
  doc.registerElement('quote-author', 'p');
  doc.registerElement('btn-new-quote', 'button');
  doc.registerElement('btn-go-back', 'button');
  doc.registerElement('btn-manage-blocklist', 'button');

  const searchParams = new URLSearchParams(queryParams);
  const searchStr = searchParams.toString() ? `?${searchParams.toString()}` : '';

  globalThis.document = doc;
  globalThis.window = globalThis;
  globalThis.location = new URL(`chrome-extension://mock-extension-id/blocked/blocked.html${searchStr}`);
  globalThis.window.location = globalThis.location;

  globalThis.window.history = {
    length: 2,
    _backCalled: false,
    back: () => {
      globalThis.window.history._backCalled = true;
    }
  };

  return doc;
}

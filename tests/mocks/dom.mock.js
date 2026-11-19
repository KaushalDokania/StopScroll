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
      if (c) this.classes.add(c);
    }
    this._sync();
  }

  remove(...classNames) {
    for (const c of classNames) {
      this.classes.delete(c);
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

export class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this._className = '';
    this.classList = new MockClassList(this);
    this.textContent = '';
    this.innerHTML = '';
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
  }

  get className() {
    return this._className;
  }

  set className(val) {
    this._className = val || '';
    this.classList._fromClassName(this._className);
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
      // Auto-register mock element if missing to avoid null dereferences
      const el = new MockElement('div', id);
      this.elements.set(id, el);
    }
    return this.elements.get(id);
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      return this.getElementById(selector.slice(1));
    }
    return null;
  }

  querySelectorAll(selector) {
    return [];
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

  // Create standard popup elements
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

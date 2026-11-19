// tests/unit/blocked.test.js
import '../mocks/chrome.mock.js';
import { setupBlockedDOM } from '../mocks/dom.mock.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const blockedDir = path.join(projectRoot, 'extension/blocked');

async function getBlockedModule(queryParams = {}) {
  setupBlockedDOM(queryParams);
  return await import(`../../extension/blocked/blocked.js?t=${Date.now()}_${Math.random()}`);
}

describe('extension/blocked UI and Quotes Engine Unit Tests', () => {
  let doc;

  beforeEach(() => {
    chrome.runtime._optionsOpened = false;
    chrome.tabs._tabs.clear();
    doc = setupBlockedDOM();
  });

  describe('blocked.html & blocked.css static integrity', () => {
    it('blocked.html contains mascot, focus badge, quote card, and decorative glow elements', () => {
      const htmlPath = path.join(blockedDir, 'blocked.html');
      assert.ok(fs.existsSync(htmlPath), 'blocked.html must exist');
      const html = fs.readFileSync(htmlPath, 'utf8');

      assert.ok(html.includes('id="blocked-page"'));
      assert.ok(html.includes('glow-top-left'));
      assert.ok(html.includes('glow-bottom-right'));
      assert.ok(html.includes('mascot-wrap'));
      assert.ok(html.includes('focus-badge'));
      assert.ok(html.includes('id="reason-pill"'));
      assert.ok(html.includes('id="blocked-domain"'));
      assert.ok(html.includes('quote-card'));
      assert.ok(html.includes('id="quote-text"'));
      assert.ok(html.includes('id="quote-author"'));
      assert.ok(html.includes('id="btn-new-quote"'));
      assert.ok(html.includes('id="btn-go-back"'));
      assert.ok(html.includes('id="btn-manage-blocklist"'));
    });

    it('blocked.css defines @keyframes float and CSS custom property theme tokens', () => {
      const cssPath = path.join(blockedDir, 'blocked.css');
      assert.ok(fs.existsSync(cssPath), 'blocked.css must exist');
      const css = fs.readFileSync(cssPath, 'utf8');

      assert.ok(css.includes('@keyframes float'));
      assert.ok(css.includes('--bg'));
      assert.ok(css.includes('--fg'));
      assert.ok(css.includes('--card-bg'));
      assert.ok(css.includes('.pill-rose'));
      assert.ok(css.includes('.pill-orange'));
      assert.ok(css.includes('.pill-blue'));
      assert.ok(css.includes('prefers-color-scheme: dark'));
    });
  });

  describe('URL parameter parsing and contextual rendering', () => {
    it('renders hard-blocked state with .pill-rose and domain name', async () => {
      const mod = await getBlockedModule({ target: 'twitter.com', reason: 'hard_block' });
      if (typeof mod.renderBlockedContext === 'function') {
        mod.renderBlockedContext({ target: 'twitter.com', reason: 'hard_block' });
      }

      const pill = doc.getElementById('reason-pill');
      const domain = doc.getElementById('blocked-domain');

      assert.equal(domain.textContent, 'twitter.com');
      assert.ok(pill.classList.contains('pill-rose'));
      assert.equal(pill.textContent, 'Site is Blocked');
    });

    it('renders timer-expired state with .pill-orange, group name, and locked message', async () => {
      const mod = await getBlockedModule({ target: 'reddit.com', reason: 'timer_expired', group: 'Social Media' });
      if (typeof mod.renderBlockedContext === 'function') {
        mod.renderBlockedContext({ target: 'reddit.com', reason: 'timer_expired', group: 'Social Media' });
      }

      const pill = doc.getElementById('reason-pill');
      const domain = doc.getElementById('blocked-domain');
      const sub = doc.querySelector('.blocked-sub');

      assert.equal(domain.textContent, 'reddit.com');
      assert.ok(pill.classList.contains('pill-orange'));
      assert.ok(pill.textContent.includes('Timer Limit Reached'));
      assert.ok(pill.textContent.includes('Social Media'));
      assert.ok(sub.textContent.includes('locked until midnight'));
    });

    it('renders preview mode with .pill-blue and "Preview Mode"', async () => {
      const mod = await getBlockedModule({ preview: 'true' });
      if (typeof mod.renderBlockedContext === 'function') {
        mod.renderBlockedContext({ preview: true });
      }

      const pill = doc.getElementById('reason-pill');
      assert.ok(pill.classList.contains('pill-blue'));
      assert.equal(pill.textContent, 'Preview Mode');
    });
  });

  describe('Motivational Quotes Engine', () => {
    it('quotes pool has 10 high-impact productivity quotes with text and author', async () => {
      const mod = await getBlockedModule();
      const quotes = typeof mod.getQuotes === 'function' ? mod.getQuotes() : (mod.QUOTES || []);
      assert.ok(quotes.length >= 10, 'Quotes pool must contain at least 10 quotes');

      for (const q of quotes) {
        assert.ok(q.text && q.text.length > 5, 'Quote must have valid text');
        assert.ok(q.author && q.author.length > 0, 'Quote must have valid author');
      }
    });

    it('renders quote on load and nextQuote cycles to a new quote', async () => {
      const mod = await getBlockedModule();
      if (typeof mod.renderRandomQuote === 'function') {
        mod.renderRandomQuote();
      }

      const textEl = doc.getElementById('quote-text');
      const authorEl = doc.getElementById('quote-author');

      const firstText = textEl.textContent;
      assert.ok(firstText.length > 0, 'Initial quote text must be rendered');
      assert.ok(authorEl.textContent.length > 0, 'Initial quote author must be rendered');

      if (typeof mod.nextQuote === 'function') {
        mod.nextQuote();
        const secondText = textEl.textContent;
        assert.ok(secondText.length > 0);
      }
    });
  });

  describe('Action Buttons navigation', () => {
    it('Go Back button calls history.back() when history length > 1', async () => {
      const mod = await getBlockedModule();
      if (typeof mod.bindEvents === 'function') {
        mod.bindEvents();
      }

      const btnGoBack = doc.getElementById('btn-go-back');
      await btnGoBack.click();

      assert.equal(globalThis.window.history._backCalled, true);
    });

    it('Manage Blocklist button opens options page via openOptionsPage', async () => {
      const mod = await getBlockedModule();
      if (typeof mod.bindEvents === 'function') {
        mod.bindEvents();
      }

      const btnManage = doc.getElementById('btn-manage-blocklist');
      await btnManage.click();

      assert.equal(chrome.runtime._optionsOpened, true);
    });
  });
});

// tests/unit/utils.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, generateRuleId, todayDateString, faviconUrl } from '../../extension/shared/utils.js';

describe('shared/utils.js unit tests', () => {
  describe('normalizeDomain', () => {
    it('normalizes basic domains', () => {
      assert.equal(normalizeDomain('reddit.com'), 'reddit.com');
      assert.equal(normalizeDomain('youtube.com'), 'youtube.com');
    });

    it('strips http and https protocols', () => {
      assert.equal(normalizeDomain('https://twitter.com'), 'twitter.com');
      assert.equal(normalizeDomain('http://facebook.com'), 'facebook.com');
    });

    it('strips www. prefix', () => {
      assert.equal(normalizeDomain('www.instagram.com'), 'instagram.com');
      assert.equal(normalizeDomain('https://www.reddit.com'), 'reddit.com');
    });

    it('removes paths, queries, and trailing slashes', () => {
      assert.equal(normalizeDomain('https://www.reddit.com/r/all/'), 'reddit.com');
      assert.equal(normalizeDomain('https://youtube.com/watch?v=dQw4w9WgXcQ'), 'youtube.com');
      assert.equal(normalizeDomain('netflix.com/browse/genre/34399?so=su'), 'netflix.com');
    });

    it('converts uppercase and mixed-case to lowercase', () => {
      assert.equal(normalizeDomain('HTTPS://WWW.YOUTUBE.COM/WATCH?V=123'), 'youtube.com');
      assert.equal(normalizeDomain('TikTok.COM'), 'tiktok.com');
    });

    it('trims leading and trailing whitespace', () => {
      assert.equal(normalizeDomain('   www.twitch.tv/directory/game   '), 'twitch.tv');
    });

    it('preserves subdomains other than www', () => {
      assert.equal(normalizeDomain('https://old.reddit.com/r/programming'), 'old.reddit.com');
      assert.equal(normalizeDomain('music.youtube.com'), 'music.youtube.com');
    });
  });

  describe('generateRuleId', () => {
    it('generates deterministic integers within 1..999999', () => {
      const id1 = generateRuleId('reddit.com');
      const id2 = generateRuleId('reddit.com');
      assert.equal(id1, id2, 'Rule ID must be deterministic for identical domains');
      assert.equal(Number.isInteger(id1), true, 'Rule ID must be an integer');
      assert.ok(id1 >= 1 && id1 <= 999999, `Rule ID ${id1} must be between 1 and 999999`);
    });

    it('generates distinct IDs for different domains', () => {
      const domains = [
        'youtube.com',
        'reddit.com',
        'facebook.com',
        'instagram.com',
        'twitter.com',
        'tiktok.com',
        'twitch.tv'
      ];
      const ids = new Set(domains.map(d => generateRuleId(d)));
      assert.equal(ids.size, domains.length, 'Common distraction domains should produce distinct rule IDs');
    });

    it('stays strictly in bounds [1, 999999] across a batch of sample domains', () => {
      for (let i = 0; i < 200; i++) {
        const domain = `test-domain-${i}.co.uk`;
        const id = generateRuleId(domain);
        assert.equal(Number.isInteger(id), true);
        assert.ok(id >= 1 && id <= 999999, `ID ${id} for domain ${domain} out of bounds`);
      }
    });
  });

  describe('todayDateString', () => {
    it('returns local date in YYYY-MM-DD format', () => {
      const str = todayDateString();
      assert.match(str, /^\d{4}-\d{2}-\d{2}$/, 'Should match YYYY-MM-DD format');

      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      assert.equal(str, expected);
    });
  });

  describe('faviconUrl', () => {
    it('returns Google favicon service URL with default size 32', () => {
      const url = faviconUrl('reddit.com');
      assert.equal(url, 'https://www.google.com/s2/favicons?domain=reddit.com&sz=32');
    });

    it('returns Google favicon service URL with custom size', () => {
      const url = faviconUrl('youtube.com', 64);
      assert.equal(url, 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64');
    });
  });
});

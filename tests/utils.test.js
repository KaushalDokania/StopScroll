import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, generateRuleId, todayDateString, faviconUrl } from '../extension/shared/utils.js';

describe('utils.js', () => {
  describe('normalizeDomain', () => {
    test('removes https and http protocols', () => {
      assert.equal(normalizeDomain('https://example.com'), 'example.com');
      assert.equal(normalizeDomain('http://example.com'), 'example.com');
    });

    test('removes www prefix', () => {
      assert.equal(normalizeDomain('www.reddit.com'), 'reddit.com');
      assert.equal(normalizeDomain('https://www.reddit.com'), 'reddit.com');
    });

    test('strips paths and query parameters', () => {
      assert.equal(normalizeDomain('https://www.reddit.com/r/all/?sort=top'), 'reddit.com');
      assert.equal(normalizeDomain('youtube.com/watch?v=123'), 'youtube.com');
    });

    test('converts to lowercase and trims whitespace', () => {
      assert.equal(normalizeDomain('  HTTPS://WWW.INSTAGRAM.COM/p/123/  '), 'instagram.com');
    });
  });

  describe('generateRuleId', () => {
    test('returns consistent integer within 1 to 999999', () => {
      const id1 = generateRuleId('twitter.com');
      const id2 = generateRuleId('twitter.com');
      assert.equal(id1, id2);
      assert.ok(Number.isInteger(id1));
      assert.ok(id1 >= 1 && id1 <= 999999);
    });

    test('generates different IDs for different domains', () => {
      const id1 = generateRuleId('twitter.com');
      const id2 = generateRuleId('facebook.com');
      assert.notEqual(id1, id2);
    });
  });

  describe('todayDateString', () => {
    test('returns date formatted as YYYY-MM-DD', () => {
      const dateStr = todayDateString();
      assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('faviconUrl', () => {
    test('generates valid Google s2 favicon URL', () => {
      assert.equal(
        faviconUrl('reddit.com'),
        'https://www.google.com/s2/favicons?domain=reddit.com&sz=32'
      );
      assert.equal(
        faviconUrl('reddit.com', 64),
        'https://www.google.com/s2/favicons?domain=reddit.com&sz=64'
      );
    });
  });
});

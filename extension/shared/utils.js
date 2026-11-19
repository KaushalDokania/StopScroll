// shared/utils.js

/**
 * Normalizes a user-provided domain input to a clean hostname.
 * "https://www.Reddit.com/r/all/" → "reddit.com"
 */
export function normalizeDomain(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0];
}

/**
 * Generates a deterministic integer rule ID from a domain string.
 * Uses a simple djb2-style hash to stay within Chrome's rule ID limits.
 * Range: 1 – 999999 (Chrome allows up to 30,000 dynamic rules per extension)
 */
export function generateRuleId(domain) {
  let hash = 5381;
  for (let i = 0; i < domain.length; i++) {
    hash = ((hash << 5) + hash) + domain.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash % 999998) + 1;
}

/**
 * Returns today's date as "YYYY-MM-DD" string in local time.
 */
export function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * Returns the Google favicon service URL for a domain.
 */
export function faviconUrl(domain, size = 32) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

// blocked/blocked.js
/**
 * StopScroll Blocked Page & Motivational Quotes Engine
 */

export const QUOTES = [
  {
    text: "It is not that we have so little time but that we lose so much. The life we receive is not short, but we make it so.",
    author: "Seneca"
  },
  {
    text: "Focus is a muscle. The more you protect it from distractions, the stronger your achievements become.",
    author: "Cal Newport"
  },
  {
    text: "Action will delineate and define you. Do not wait for distraction to pass; choose what matters right now.",
    author: "Thomas Jefferson"
  },
  {
    text: "You will never reach your destination if you stop and throw stones at every dog that barks.",
    author: "Winston Churchill"
  },
  {
    text: "The secret of getting ahead is getting started. The secret of getting started is breaking your complex overwhelming task into small manageable tasks.",
    author: "Mark Twain"
  },
  {
    text: "Starve your distractions, feed your focus.",
    author: "Anonymous"
  },
  {
    text: "Almost everything will work again if you unplug it for a few minutes — including you.",
    author: "Anne Lamott"
  },
  {
    text: "You have power over your mind, not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius"
  },
  {
    text: "One day or day one. You decide.",
    author: "Paulo Coelho"
  },
  {
    text: "Motivation is what gets you started. Habit is what keeps you going.",
    author: "Jim Ryun"
  }
];

let currentQuoteIdx = Math.floor(Math.random() * QUOTES.length);

export function getQuotes() {
  return QUOTES;
}

export function getCurrentQuoteIndex() {
  return currentQuoteIdx;
}

export function setCurrentQuoteIndex(idx) {
  currentQuoteIdx = idx;
}

export function parseBlockedParams(searchStr) {
  let search = '';
  if (typeof searchStr === 'string') {
    search = searchStr;
  } else if (typeof window !== 'undefined' && window.location?.search) {
    search = window.location.search;
  }

  const params = new URLSearchParams(search);
  const targetDomain = params.get('target') || 'this site';
  const reason = params.get('reason') || 'hard_block';
  const groupName = params.get('group') || '';
  const isPreview = params.get('preview') === 'true';

  return { targetDomain, reason, groupName, isPreview };
}

export function renderBlockedContext(params) {
  let p = params;
  if (!p) {
    p = parseBlockedParams();
  }

  const targetDomain = p.target || p.targetDomain || 'this site';
  const reason = p.reason || 'hard_block';
  const groupName = p.group || p.groupName || '';
  const isPreview = Boolean(p.preview === true || p.preview === 'true' || p.isPreview);

  const domainEl = document.getElementById('blocked-domain');
  if (domainEl) {
    domainEl.textContent = targetDomain;
  }

  const pill = document.getElementById('reason-pill');
  const subEl = document.querySelector('.blocked-sub') || document.getElementById('blocked-sub');

  if (reason === 'timer_expired') {
    if (pill) {
      pill.textContent = `Timer Limit Reached${groupName ? ` — ${groupName}` : ''}`;
      pill.className = 'reason-pill pill-orange';
    }
    if (subEl) {
      subEl.textContent = `You've used up your daily allowance for ${groupName || 'this group'}. ${targetDomain} is locked until midnight.`;
    }
  } else if (isPreview) {
    if (pill) {
      pill.textContent = 'Preview Mode';
      pill.className = 'reason-pill pill-blue';
    }
    if (subEl) {
      subEl.textContent = "You're previewing the block screen. When websites are blocked, this screen protects your focus.";
    }
  } else {
    if (pill) {
      pill.textContent = 'Site is Blocked';
      pill.className = 'reason-pill pill-rose';
    }
    if (subEl) {
      subEl.textContent = `You're trying to visit ${targetDomain}, which is restricted to protect your focus.`;
    }
  }
}

export function renderRandomQuote() {
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');
  const q = QUOTES[currentQuoteIdx];

  if (quoteText && q) {
    quoteText.textContent = `"${q.text}"`;
  }
  if (quoteAuthor && q) {
    quoteAuthor.textContent = `— ${q.author}`;
  }
}

export function nextQuote() {
  currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length;
  renderRandomQuote();
  return currentQuoteIdx;
}

export function bindEvents() {
  const btnNewQuote = document.getElementById('btn-new-quote');
  if (btnNewQuote) {
    btnNewQuote.addEventListener('click', nextQuote);
  }

  const btnGoBack = document.getElementById('btn-go-back');
  if (btnGoBack) {
    btnGoBack.addEventListener('click', () => {
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        window.history.back();
      } else if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
        chrome.tabs.update({ url: 'chrome://newtab' });
      }
    });
  }

  const btnManage = document.getElementById('btn-manage-blocklist');
  if (btnManage) {
    btnManage.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        const optionsUrl = chrome.runtime?.getURL
          ? chrome.runtime.getURL('options/options.html')
          : 'options/options.html';
        chrome.tabs.create({ url: optionsUrl });
      }
    });
  }
}

export function initBlockedPage() {
  renderBlockedContext();
  renderRandomQuote();
  bindEvents();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlockedPage);
  } else {
    initBlockedPage();
  }
}

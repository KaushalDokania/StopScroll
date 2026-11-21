// blocked/blocked.js
/**
 * StopScroll Blocked Page, Scenic Environments & 3x3 Dynamic Typography Engine
 */

// 5 High-Quality Curated Relaxing Nature / Landscape Scenes (Offline & Privacy-Preserving)
export const SCENIC_SCENES = [
  {
    name: "Misty Redwood Forest",
    fallbackGradient: "radial-gradient(circle at 50% 20%, #1a3a2a 0%, #0d2016 50%, #050d09 100%)",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.85) 100%)"
  },
  {
    name: "Alpine Sunset Lake",
    fallbackGradient: "radial-gradient(circle at 60% 30%, #233554 0%, #101c30 50%, #070c14 100%)",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.90) 100%)"
  },
  {
    name: "Moody Nordic Ocean",
    fallbackGradient: "radial-gradient(circle at 40% 25%, #0f2b3c 0%, #081924 50%, #030a0f 100%)",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.40) 50%, rgba(0,0,0,0.90) 100%)"
  },
  {
    name: "Golden Desert Dunes",
    fallbackGradient: "radial-gradient(circle at 50% 20%, #3d2310 0%, #221307 50%, #0e0702 100%)",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.85) 100%)"
  },
  {
    name: "Deep Cosmic Aurora",
    fallbackGradient: "radial-gradient(circle at 50% 35%, #231145 0%, #110724 50%, #06020d 100%)",
    overlay: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.85) 100%)"
  }
];

// All 9 Grid Positions Supported
export const GRID_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center-center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right"
];

// 25 Curated High-Voltage Quotes (ALWAYS BOLD: Serif & Punchy Sans Blocks)
export const QUOTES = [
  // 1. Short Punchy Big Blocks of Text (Bold Sans & Inscriptional)
  {
    text: "STARVE YOUR DISTRACTIONS. FEED YOUR MOMENTUM.",
    author: "Anonymous",
    category: "Momentum",
    fontClass: "font-sans-grotesk"
  },
  {
    text: "DISCIPLINE EQUALS FREEDOM.",
    author: "Jocko Willink",
    category: "Discipline",
    fontClass: "font-sans-jakarta"
  },
  {
    text: "DO NOT TRADE WHAT YOU WANT MOST FOR WHAT YOU WANT NOW.",
    author: "Abraham Lincoln",
    category: "Discipline",
    fontClass: "font-sans-inter"
  },
  {
    text: "One day or day one. You decide.",
    author: "Paulo Coelho",
    category: "Action",
    fontClass: "font-sans-grotesk"
  },
  {
    text: "Lost time is never found again.",
    author: "Benjamin Franklin",
    category: "Time Mastery",
    fontClass: "font-serif-cinzel"
  },
  {
    text: "A busy mind cannot see the obvious.",
    author: "Naval Ravikant",
    category: "Mindfulness",
    fontClass: "font-sans-jakarta"
  },
  {
    text: "Work in silence, let your success be the noise.",
    author: "Frank Ocean",
    category: "Deep Craft",
    fontClass: "font-serif-playfair"
  },
  {
    text: "Deciding what not to do is as important as deciding what to do.",
    author: "Steve Jobs",
    category: "Deep Work",
    fontClass: "font-sans-grotesk"
  },
  {
    text: "Do fewer things. Do them better. Know why you are doing them.",
    author: "Cal Newport",
    category: "Deep Work",
    fontClass: "font-sans-jakarta"
  },

  // 2. Medium & Philosophical Quotes (Bold Literary Serifs)
  {
    text: "We suffer more often in imagination than in reality.",
    author: "Seneca",
    category: "Stoic Wisdom",
    fontClass: "font-serif-playfair"
  },
  {
    text: "Focus is a muscle. The more you protect it, the stronger your craft becomes.",
    author: "Cal Newport",
    category: "Deep Work",
    fontClass: "font-serif-playfair"
  },
  {
    text: "Simplicity is about subtracting the obvious and adding the meaningful.",
    author: "John Maeda",
    category: "Craft",
    fontClass: "font-serif-cormorant"
  },
  {
    text: "Waste no more time arguing about what a good person should be. Be one.",
    author: "Marcus Aurelius",
    category: "Stoic Wisdom",
    fontClass: "font-serif-cinzel"
  },
  {
    text: "Every action you take is a vote for the type of person you wish to become.",
    author: "James Clear",
    category: "Atomic Habits",
    fontClass: "font-serif-lora"
  },
  {
    text: "Almost everything will work again if you unplug it for a few minutes — including you.",
    author: "Anne Lamott",
    category: "Breathing Room",
    fontClass: "font-serif-playfair"
  },
  {
    text: "Peace comes from within. Do not seek it without.",
    author: "Buddha",
    category: "Mindfulness",
    fontClass: "font-serif-cormorant"
  },
  {
    text: "Wealth consists not in having great possessions, but in having few wants.",
    author: "Epictetus",
    category: "Stoic Wisdom",
    fontClass: "font-serif-cormorant"
  },
  {
    text: "It is not that we have so little time, but that we lose so much.",
    author: "Seneca",
    category: "Stoic Wisdom",
    fontClass: "font-serif-lora"
  },

  // 3. Longer Deep Inquiries (Bold Literary Serifs)
  {
    text: "You have power over your mind, not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    category: "Stoic Wisdom",
    fontClass: "font-serif-cormorant"
  },
  {
    text: "You do not rise to the level of your goals. You fall to the level of your systems.",
    author: "James Clear",
    category: "Atomic Habits",
    fontClass: "font-serif-newsreader"
  },
  {
    text: "Smile, breathe and go slowly. There is no other way to live.",
    author: "Thích Nhất Hạnh",
    category: "Mindfulness",
    fontClass: "font-serif-cormorant"
  },
  {
    text: "The quieter you become, the more you are able to hear.",
    author: "Rumi",
    category: "Mindfulness",
    fontClass: "font-serif-cormorant"
  },
  {
    text: "Remembering that you are going to die is the best way to avoid thinking you have something to lose.",
    author: "Steve Jobs",
    category: "Perspective",
    fontClass: "font-serif-playfair"
  },
  {
    text: "The average human lifespan is absurdly, terrifyingly, insultingly short: around four thousand weeks.",
    author: "Oliver Burkeman",
    category: "Time Mastery",
    fontClass: "font-serif-newsreader"
  },
  {
    text: "How we spend our days is, of course, how we spend our lives.",
    author: "Annie Dillard",
    category: "Perspective",
    fontClass: "font-serif-lora"
  }
];

let currentQuoteIdx = Math.floor(Math.random() * QUOTES.length);
let currentSceneIdx = 0;
let currentGridPos = "center-center";

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

export function setScene(idx) {
  currentSceneIdx = idx;
  const s = SCENIC_SCENES[idx];
  if (!s) return;

  const canvas = document.getElementById('blocked-page');
  const overlay = document.getElementById('scenic-overlay');
  const label = document.getElementById('scene-name-label');

  if (canvas) {
    canvas.style.background = s.fallbackGradient;
    canvas.style.backgroundColor = '#09090b';
  }
  if (overlay) {
    overlay.style.background = s.overlay;
  }
  if (label) {
    label.textContent = s.name;
  }
}

export function setGridPos(pos) {
  currentGridPos = pos;
  const stage = document.getElementById('scenic-stage');
  const box = document.getElementById('dynamic-quote-container');
  const posLabel = document.getElementById('current-pos-name');

  if (stage && stage.classList) {
    GRID_POSITIONS.forEach(p => stage.classList.remove(`zone-${p}`));
    stage.classList.add(`zone-${pos}`);
  }

  if (box && box.classList) {
    box.classList.remove('align-left', 'align-center', 'align-right');
    if (pos.endsWith('-left')) {
      box.classList.add('align-left');
    } else if (pos.endsWith('-right')) {
      box.classList.add('align-right');
    } else {
      box.classList.add('align-center');
    }
  }

  if (posLabel) {
    posLabel.textContent = pos.toUpperCase();
  }
}

export function applyDynamicTypography(quote) {
  const textEl = document.getElementById('quote-text');
  const authorEl = document.getElementById('quote-author');
  const catEl = document.getElementById('quote-category-tag');

  if (!quote) return;
  const len = quote.text.length;

  let sizeClass = "size-medium";
  if (len < 50) {
    sizeClass = "size-short";
  } else if (len > 80) {
    sizeClass = "size-long";
  }

  if (textEl) {
    textEl.className = `quote-text ${sizeClass} ${quote.fontClass || 'font-serif-playfair'}`;
    textEl.textContent = `"${quote.text}"`;
  }
  if (authorEl) {
    authorEl.textContent = quote.author;
  }
  if (catEl) {
    catEl.textContent = `✦ ${quote.category || 'MOMENTUM'}`;
  }
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
  const q = QUOTES[currentQuoteIdx];
  applyDynamicTypography(q);
}

export function rollRandomVisit() {
  // 1. Pick random nature scene
  const randScene = Math.floor(Math.random() * SCENIC_SCENES.length);
  setScene(randScene);

  // 2. Pick random 3x3 grid position
  const randPos = GRID_POSITIONS[Math.floor(Math.random() * GRID_POSITIONS.length)];
  setGridPos(randPos);

  // 3. Pick random quote
  currentQuoteIdx = Math.floor(Math.random() * QUOTES.length);
  renderRandomQuote();
}

export function nextQuote() {
  currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length;
  renderRandomQuote();
  return currentQuoteIdx;
}

export function bindEvents() {
  const btnNewQuote = document.getElementById('btn-new-quote');
  if (btnNewQuote && typeof btnNewQuote.addEventListener === 'function') {
    btnNewQuote.addEventListener('click', rollRandomVisit);
  }

  const btnGoBack = document.getElementById('btn-go-back');
  if (btnGoBack && typeof btnGoBack.addEventListener === 'function') {
    btnGoBack.addEventListener('click', () => {
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        window.history.back();
      } else if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
        chrome.tabs.update({ url: 'chrome://newtab' });
      }
    });
  }

  const btnManage = document.getElementById('btn-manage-blocklist');
  if (btnManage && typeof btnManage.addEventListener === 'function') {
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

  // Spacebar triggers random visit
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && (e.target === document.body || e.target === document.documentElement)) {
        e.preventDefault();
        rollRandomVisit();
      }
    });
  }
}

export function initBlockedPage() {
  rollRandomVisit();
  renderBlockedContext();
  bindEvents();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('DOMContentLoaded', initBlockedPage);
    }
  } else {
    initBlockedPage();
  }
}

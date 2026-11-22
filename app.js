(function () {
  'use strict';

  const config = window.SITE_CONFIG || {
    siteName: 'Sploty',
    tagline: 'Zapiski, eseje i wątki',
    author: 'Autor',
    email: 'kontakt@example.com',
    intro: '',
    footerLinks: [],
    about: { title: 'O mnie', lead: '', content: '' }
  };

  const posts = (window.BLOG_POSTS || []).slice().sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  const miscellaneaItems = (window.MISCELLANEA || []).slice().sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  const state = {
    thread: 'Wszystkie',
    miscKind: 'Wszystkie',
    query: '',
    fontScale: localStorage.getItem('sploty_font_scale') || 'md'
  };

  const appEl = document.getElementById('app');
  const progressEl = document.getElementById('reading-progress');
  const themeToggleEl = document.getElementById('theme-toggle');
  const toastEl = document.getElementById('toast');

  /* ========================================================================
     Pomocniki: bezpieczeństwo, daty, czas czytania, toast
     ======================================================================== */

  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeUrl(url) {
    const trimmed = String(url || '').trim();
    if (/^(https?:\/\/|mailto:|#|\/|\.\/)/i.test(trimmed)) {
      return trimmed;
    }
    return '#';
  }

  function threadMark() {
    return '';
  }

  function toRoman(num) {
    const n = Math.max(1, Math.floor(Number(num) || 1));
    const map = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let rest = n;
    let out = '';
    for (const [val, sym] of map) {
      while (rest >= val) {
        out += sym;
        rest -= val;
      }
    }
    return out;
  }

  const RAGNAROK_RUNES = '<span class="runic-term" title="Ragnarök">ᚱᚨᚷᚾᚨᚱᛟᚲ</span>';

  function formatShortDate(isoDate) {
    const parts = String(isoDate || '').split('-');
    if (parts.length !== 3) return escapeHtml(isoDate);
    return `${parts[2]}.${parts[1]}.${parts[0]} <span class="era-ragnarok" title="ante Ragnarök (ᚱᚨᚷᚾᚨᚱᛟᚲ) — przed Zmierzchem Bogów">a.<span class="runic-term">ᚱ</span>.</span>`;
  }

  function formatLongDate(isoDate) {
    const parts = String(isoDate || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return escapeHtml(isoDate);
    }
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const formatted = new Intl.DateTimeFormat('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
    return `${formatted} · <span class="era-ragnarok-long" title="ante Ragnarök — przed Zmierzchem Bogów">przed ${RAGNAROK_RUNES}</span>`;
  }

  function estimateReadTime(text) {
    const words = String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const min = Math.max(1, Math.round(words / 185));
    return `${min} min czytania`;
  }

  function slugifyHeading(text, index) {
    const base = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-')
      .replace(/^-+|-+$/g, '');
    return `sekcja-${index}-${base || 'h2'}`;
  }

  /* ========================================================================
     Parser Markdown -> HTML (z automatycznym spisem sekcji H2)
     ======================================================================== */

  function renderInline(rawText) {
    let text = escapeHtml(rawText);

    const inlineCodes = [];
    text = text.replace(/`([^`]+)`/g, (_, code) => {
      const idx = inlineCodes.length;
      inlineCodes.push(`<code>${code}</code>`);
      return `\u0000CODE${idx}\u0000`;
    });

    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const safeHref = sanitizeUrl(url);
      const isExternal = /^https?:\/\//i.test(safeHref);
      const extra = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(safeHref)}"${extra}>${label}</a>`;
    });

    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

    text = text.replace(/\u0000CODE(\d+)\u0000/g, (_, idx) => inlineCodes[Number(idx)]);
    return text;
  }

  function renderMarkdown(md) {
    if (!md) return { html: '', headings: [] };

    const normalized = String(md).replace(/\r\n/g, '\n').trim();
    const codeBlocks = [];
    const headings = [];

    const withPlaceholders = normalized.replace(
      /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
      (_, lang, code) => {
        const idx = codeBlocks.length;
        const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
        codeBlocks.push(`<pre><code${langAttr}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`);
        return `\n\n\u0000BLOCK${idx}\u0000\n\n`;
      }
    );

    const lines = withPlaceholders.split('\n');
    const html = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      if (!line) {
        i++;
        continue;
      }

      const blockMatch = line.match(/^\u0000BLOCK(\d+)\u0000$/);
      if (blockMatch) {
        html.push(codeBlocks[Number(blockMatch[1])]);
        i++;
        continue;
      }

      if (/^---+$/.test(line)) {
        html.push('<hr />');
        i++;
        continue;
      }

      if (line.startsWith('### ')) {
        html.push(`<h3>${renderInline(line.slice(4))}</h3>`);
        i++;
        continue;
      }

      if (line.startsWith('## ')) {
        const title = line.slice(3).trim();
        const id = slugifyHeading(title, headings.length + 1);
        headings.push({ id, title });
        html.push(`<h2 id="${escapeHtml(id)}">${renderInline(title)}</h2>`);
        i++;
        continue;
      }

      if (line.startsWith('> ')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].trim().startsWith('> ')) {
          quoteLines.push(renderInline(lines[i].trim().slice(2)));
          i++;
        }
        html.push(`<blockquote><p>${quoteLines.join('<br />')}</p></blockquote>`);
        continue;
      }

      if (/^[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
          items.push(`<li>${renderInline(lines[i].trim().replace(/^[-*]\s+/, ''))}</li>`);
          i++;
        }
        html.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          items.push(`<li>${renderInline(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
          i++;
        }
        html.push(`<ol>${items.join('')}</ol>`);
        continue;
      }

      const paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(## |### |> |[-*]\s+|\d+\.\s+|---+$|\u0000BLOCK\d+\u0000$)/.test(lines[i].trim())
      ) {
        paraLines.push(renderInline(lines[i].trim()));
        i++;
      }
      html.push(`<p>${paraLines.join(' ')}</p>`);
    }

    return { html: html.join('\n'), headings };
  }

  /* ========================================================================
     Motyw, Rozmiar pisma, Preferencje prywatności i Pasek postępu
     ======================================================================== */

  const PRIVACY_KEY = 'sploty_privacy_notice';
  const SESSION_ONLY_KEY = 'sploty_privacy_session_only';

  function isSessionOnlyPrivacy() {
    try {
      return sessionStorage.getItem(SESSION_ONLY_KEY) === '1';
    } catch {
      return false;
    }
  }

  function canPersistPrefs() {
    return !isSessionOnlyPrivacy();
  }

  function getPrivacyStatusText() {
    if (isSessionOnlyPrivacy()) {
      return 'Tryb sesyjny (preferencje motywu i pisma nie są trwale zapisywane w przeglądarce)';
    }
    try {
      if (localStorage.getItem(PRIVACY_KEY) === 'accepted') {
        return 'Aktywna pamięć lokalna (zapamiętywanie motywu i rozmiaru pisma w przeglądarce)';
      }
    } catch {
      return 'Brak dostępu do pamięci lokalnej przeglądarki';
    }
    return 'Nie podjęto jeszcze decyzji (domyślnie bez śledzenia i reklam)';
  }

  function clearStoredPrefs() {
    try {
      localStorage.removeItem('sploty_theme');
      localStorage.removeItem('sploty_font_scale');
      localStorage.removeItem(PRIVACY_KEY);
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(SESSION_ONLY_KEY);
    } catch {
      /* ignore */
    }
  }

  function applyFontScale(scale) {
    state.fontScale = scale;
    if (scale === 'md') {
      document.documentElement.removeAttribute('data-font-scale');
    } else {
      document.documentElement.setAttribute('data-font-scale', scale);
    }
    if (canPersistPrefs()) {
      try {
        localStorage.setItem('sploty_font_scale', scale);
      } catch {
        /* ignore */
      }
    }
  }

  if (themeToggleEl) {
    themeToggleEl.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      if (canPersistPrefs()) {
        try {
          localStorage.setItem('sploty_theme', next);
        } catch {
          /* ignore */
        }
      }
    });
  }

  const cookieBannerEl = document.getElementById('cookie-banner');
  const cookieAcceptEl = document.getElementById('cookie-accept-btn');
  const cookieSessionEl = document.getElementById('cookie-session-btn');

  function openCookieBanner() {
    if (!cookieBannerEl) return;
    cookieBannerEl.hidden = false;
    requestAnimationFrame(() => {
      cookieBannerEl.classList.add('is-visible');
    });
  }

  function closeCookieBanner() {
    if (!cookieBannerEl) return;
    cookieBannerEl.classList.remove('is-visible');
    setTimeout(() => {
      if (!cookieBannerEl.classList.contains('is-visible')) {
        cookieBannerEl.hidden = true;
      }
    }, 260);
  }

  function refreshPrivacyStatusIfVisible() {
    const statusEl = document.getElementById('privacy-status-text');
    if (statusEl) {
      statusEl.textContent = getPrivacyStatusText();
    }
  }

  function initCookieBanner() {
    if (!cookieBannerEl) return;

    if (cookieAcceptEl) {
      cookieAcceptEl.addEventListener('click', () => {
        try {
          sessionStorage.removeItem(SESSION_ONLY_KEY);
          localStorage.setItem(PRIVACY_KEY, 'accepted');
        } catch {
          /* ignore */
        }
        closeCookieBanner();
        refreshPrivacyStatusIfVisible();
        showToast('Zapisano ustawienia pamięci lokalnej');
      });
    }

    if (cookieSessionEl) {
      cookieSessionEl.addEventListener('click', () => {
        clearStoredPrefs();
        try {
          sessionStorage.setItem(SESSION_ONLY_KEY, '1');
        } catch {
          /* ignore */
        }
        closeCookieBanner();
        refreshPrivacyStatusIfVisible();
        showToast('Włączono tryb sesyjny — bez trwałego zapisu');
      });
    }

    let decided = isSessionOnlyPrivacy();
    if (!decided) {
      try {
        decided = localStorage.getItem(PRIVACY_KEY) === 'accepted';
      } catch {
        decided = false;
      }
    }

    if (!decided) {
      openCookieBanner();
    }
  }

  // Kinetyczne linie w nagłówku (subtelna reakcja na ruch kursora)
  function initKineticThreads() {
    const zone = document.getElementById('masthead-interactive');
    const t1 = document.getElementById('thread-1');
    const t2 = document.getElementById('thread-2');
    const t3 = document.getElementById('thread-3');
    if (!zone || !t1 || !t2 || !t3) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    zone.addEventListener('mousemove', (e) => {
      const rect = zone.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width - 0.5;
      const ry = (e.clientY - rect.top) / rect.height - 0.5;
      const dx = Math.round(rx * 110);
      const dy = Math.round(ry * 52);

      t1.setAttribute('d', `M-40,${122 + dy * 0.35} C${320 + dx},${76 - dy * 0.6} ${880 - dx},${256 + dy * 0.7} 1240,${122 - dy * 0.35}`);
      t2.setAttribute('d', `M-40,${224 - dy * 0.35} C${320 - dx},${276 + dy * 0.7} ${880 + dx},${96 - dy * 0.6} 1240,${224 + dy * 0.35}`);
      t3.setAttribute('d', `M-40,${172 + dy * 0.22} C${400 + dx * 0.6},${148 + dy * 0.6} ${800 - dx * 0.6},${196 - dy * 0.6} 1240,${172 - dy * 0.22}`);
    });
  }

  // Przemiana symbolu w astrolabium po każdym pełnym obrocie o 360° (łagodne przenikanie + blask)
  function initAstrolabeMorph() {
    const rotor = document.getElementById('astro-rotor');
    const astroSvg = document.getElementById('masthead-astrolabe');
    const labelEl = document.getElementById('astro-symbol-label');
    const stageEl = document.querySelector('.astrolabe-stage');
    if (!rotor) return;

    const symbols = Array.from(rotor.querySelectorAll('.astro-symbol'));
    if (symbols.length < 2) return;

    let currentIdx = 0;
    let captionTimer = null;
    let captionGlowTimer = null;
    let glowTimer = null;

    function triggerRadiance(nextSym) {
      symbols.forEach((s) => s.classList.remove('is-emerging'));
      if (astroSvg) {
        astroSvg.classList.remove('is-radiant');
        void astroSvg.getBoundingClientRect();
        astroSvg.classList.add('is-radiant');
      }
      void nextSym.getBoundingClientRect();
      nextSym.classList.add('is-emerging');

      clearTimeout(glowTimer);
      glowTimer = setTimeout(() => {
        nextSym.classList.remove('is-emerging');
        if (astroSvg) astroSvg.classList.remove('is-radiant');
      }, 2050);
    }

    function advanceSymbol() {
      symbols[currentIdx].classList.remove('is-active');
      currentIdx = (currentIdx + 1) % symbols.length;
      const nextSym = symbols[currentIdx];
      nextSym.classList.add('is-active');
      triggerRadiance(nextSym);

      if (labelEl) {
        const nextName = nextSym.dataset.symbolName || '';
        clearTimeout(captionTimer);
        clearTimeout(captionGlowTimer);
        labelEl.classList.remove('is-glowing');
        labelEl.classList.add('is-fading');

        captionTimer = setTimeout(() => {
          labelEl.textContent = nextName;
          labelEl.classList.remove('is-fading');
          labelEl.classList.add('is-glowing');

          captionGlowTimer = setTimeout(() => {
            labelEl.classList.remove('is-glowing');
          }, 1150);
        }, 320);
      }
    }

    rotor.addEventListener('animationiteration', advanceSymbol);
    if (stageEl) {
      stageEl.addEventListener('click', advanceSymbol);
    }
  }

  // Odliczanie do Ragnarök według Eddy (Gylfaginning 51: III nieprzerwane zimy Fimbulvetr od najbliższego przesilenia zimowego Jól)
  function initRagnarokClock() {
    const timerEl = document.getElementById('ragnarok-timer');
    const btnEl = document.getElementById('ragnarok-countdown');
    const footerEl = document.getElementById('ragnarok-footer');
    if (!timerEl && !footerEl) return;

    const FIMBULVETR_DAYS = 1095; // III zimy bez lata

    function pad(n) {
      return String(n).padStart(2, '0');
    }

    function pluralDays(n) {
      if (n === 1) return 'dzień';
      return 'dni';
    }

    function updateClock() {
      const now = new Date();
      let yule = new Date(now.getFullYear(), 11, 21, 23, 59, 59);
      if (now >= yule) {
        yule = new Date(now.getFullYear() + 1, 11, 21, 23, 59, 59);
      }

      const diffSec = Math.max(0, Math.floor((yule.getTime() - now.getTime()) / 1000));
      const daysToYule = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;
      const totalDays = FIMBULVETR_DAYS + daysToYule;
      const hms = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;

      if (timerEl) {
        timerEl.textContent = `III zimy Fimbulvetr + ${daysToYule} d · ${hms}`;
      }
      if (footerEl) {
        footerEl.innerHTML =
          `Do ${RAGNAROK_RUNES}: III zimy Fimbulvetr i ${daysToYule} ${pluralDays(daysToYule)} · ${hms} ` +
          `(łącznie ${totalDays} dni do dźwięku Gjallarhornu)`;
      }
    }

    if (btnEl) {
      btnEl.addEventListener('click', () => {
        showToast('ᚱᚨᚷᚾᚨᚱᛟᚲ (Ragnarök) · Fimbulvetr: III zimy bez lata przed dźwiękiem Gjallarhornu');
      });
    }

    updateClock();
    setInterval(updateClock, 1000);
  }

  initKineticThreads();
  initAstrolabeMorph();
  initRagnarokClock();
  initCookieBanner();

  let isReadingArticle = false;

  function updateReadingProgress() {
    if (!progressEl) return;
    if (!isReadingArticle) {
      progressEl.classList.remove('is-visible');
      progressEl.style.width = '0%';
      return;
    }
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
    progressEl.classList.toggle('is-visible', scrollTop > 20);
    progressEl.style.width = `${pct}%`;
  }

  window.addEventListener('scroll', updateReadingProgress, { passive: true });

  /* ========================================================================
     Stałe elementy: winieta i kolofon
     ======================================================================== */

  function initChrome() {
    const nameEl = document.getElementById('site-name');
    const tagEl = document.getElementById('site-tagline');
    if (nameEl) nameEl.textContent = config.siteName;
    if (tagEl) tagEl.textContent = config.tagline || '';

    const yearRoman = toRoman(new Date().getFullYear());
    const mastheadYearEl = document.getElementById('masthead-year');
    if (mastheadYearEl) {
      mastheadYearEl.innerHTML = `Anno Domini ${yearRoman} · przed ${RAGNAROK_RUNES}`;
    }
    const copyEl = document.getElementById('footer-copy');
    if (copyEl) {
      const authorTitle = config.authorLabel ? ` title="${escapeHtml(config.authorLabel)}"` : '';
      copyEl.innerHTML =
        `Skład i druk cyfrowy · ${escapeHtml(config.siteName)} · ` +
        `<span class="colophon-author"${authorTitle}>${escapeHtml(config.author)}</span> · Anno Domini ${yearRoman} · przed ${RAGNAROK_RUNES}`;
    }

    const linksEl = document.getElementById('footer-links');
    if (linksEl) {
      const navLinks = [
        { label: 'Indeks', url: '#/' },
        { label: 'Wątki', url: '#/watki' },
        { label: 'Miscellanea', url: '#/miscellanea' },
        { label: 'O mnie', url: '#/o-mnie' },
        { label: 'Polityka prywatności', url: '#/polityka-prywatnosci' },
        ...(config.footerLinks || [])
      ];
      linksEl.innerHTML =
        navLinks
          .map((link) => {
            const href = sanitizeUrl(link.url);
            const ext = /^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<a href="${escapeHtml(href)}"${ext}>${escapeHtml(link.label)}</a>`;
          })
          .join('') +
        `<button type="button" class="colophon-link-btn" id="open-cookie-settings-btn">Cookies</button>`;

      const openCookieBtn = document.getElementById('open-cookie-settings-btn');
      if (openCookieBtn) {
        openCookieBtn.addEventListener('click', openCookieBanner);
      }
    }
  }

  function setActiveNav(route) {
    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.route === route);
    });
  }

  /* ========================================================================
     Widok 1: Strona główna — Książkowy Spis Treści z filtrami Wątków
     ======================================================================== */

  function getThreadCounts() {
    const counts = new Map();
    counts.set('Wszystkie', posts.length);
    posts.forEach((p) => {
      const cat = p.category || 'Inne';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    return Array.from(counts.entries());
  }

  function getFilteredPosts() {
    const q = state.query.trim().toLowerCase();
    return posts.filter((p) => {
      const matchThread = state.thread === 'Wszystkie' || p.category === state.thread;
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);
      return matchThread && matchQuery;
    });
  }

  function renderTocList(list) {
    if (!list.length) {
      return `
        <div class="empty-note">
          <div>Brak wpisów pasujących do tego wyboru.</div>
          <button type="button" class="btn-ghost" id="clear-filters-btn">Pokaż wszystkie wpisy</button>
        </div>
      `;
    }

    const total = list.length;
    return list
      .map((post, idx) => {
        const numRoman = toRoman(total - idx);
        return `
      <a class="toc-row" href="#/wpis/${encodeURIComponent(post.slug)}">
        <span class="toc-index" aria-hidden="true">${numRoman}</span>
        <div class="toc-meta">
          <time datetime="${escapeHtml(post.date)}">${formatShortDate(post.date)}</time>
          <span class="toc-thread">${threadMark(post.category)}${escapeHtml(post.category)}</span>
        </div>
        <div class="toc-main">
          <h2 class="toc-title">${escapeHtml(post.title)}<span class="toc-arrow" aria-hidden="true">→</span></h2>
          ${post.excerpt ? `<p class="toc-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
          <span class="toc-readtime">${estimateReadTime(post.content)}</span>
        </div>
      </a>
    `;
      })
      .join('');
  }

  function renderHome() {
    isReadingArticle = false;
    updateReadingProgress();
    setActiveNav('home');
    document.title = `${config.siteName} — ${config.tagline}`;

    const threads = getThreadCounts();
    const filtered = getFilteredPosts();

    appEl.innerHTML = `
      <section class="journal-intro reveal">
        <p>${config.intro}</p>
      </section>

      <section class="index-toolbar reveal" aria-label="Filtrowanie wpisów">
        <div class="thread-filters" role="tablist" aria-label="Wątki">
          ${threads
            .map(
              ([name, count]) => `
            <button
              type="button"
              class="thread-chip ${state.thread === name ? 'is-active' : ''}"
              data-thread="${escapeHtml(name)}"
              role="tab"
              aria-selected="${state.thread === name}"
            >
              ${name === 'Wszystkie' ? '' : threadMark(name)}${escapeHtml(name)}<span class="thread-count">(${count})</span>
            </button>
          `
            )
            .join('')}
        </div>

        <input
          type="search"
          id="index-search"
          class="index-search"
          placeholder="Szukaj w spisie…"
          value="${escapeHtml(state.query)}"
          aria-label="Szukaj w spisie wpisów"
        />
      </section>

      <section id="toc-list" class="toc-list reveal" aria-live="polite">
        ${renderTocList(filtered)}
      </section>
    `;

    const listEl = document.getElementById('toc-list');
    const searchEl = document.getElementById('index-search');

    function refresh() {
      listEl.innerHTML = renderTocList(getFilteredPosts());
      const clearBtn = document.getElementById('clear-filters-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          state.thread = 'Wszystkie';
          state.query = '';
          renderHome();
        });
      }
    }

    searchEl.addEventListener('input', (e) => {
      state.query = e.target.value;
      refresh();
    });

    document.querySelectorAll('.thread-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.thread = btn.dataset.thread;
        document.querySelectorAll('.thread-chip').forEach((b) => {
          const active = b.dataset.thread === state.thread;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        refresh();
      });
    });

    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.thread = 'Wszystkie';
        state.query = '';
        renderHome();
      });
    }
  }

  /* ========================================================================
     Widok 2: Wątki (#/watki) — tematyczny katalog wszystkich tekstów
     ======================================================================== */

  function renderThreads() {
    isReadingArticle = false;
    updateReadingProgress();
    setActiveNav('threads');
    document.title = `Wątki — ${config.siteName}`;

    const grouped = new Map();
    posts.forEach((p) => {
      const cat = p.category || 'Inne';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat).push(p);
    });

    const groupsHtml = Array.from(grouped.entries())
      .map(
        ([cat, catPosts]) => `
      <section class="thread-group">
        <div class="thread-group-header">
          <h2 class="thread-group-name">${threadMark(cat)}${escapeHtml(cat)}</h2>
          <span class="thread-group-count">${catPosts.length} ${catPosts.length === 1 ? 'wpis' : 'wpisy'}</span>
        </div>
        <ul class="compact-list">
          ${catPosts
            .map(
              (p) => `
            <li class="compact-item">
              <a href="#/wpis/${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>
              <time class="compact-date" datetime="${escapeHtml(p.date)}">${formatShortDate(p.date)}</time>
            </li>
          `
            )
            .join('')}
        </ul>
      </section>
    `
      )
      .join('');

    appEl.innerHTML = `
      <section class="reveal">
        <h1 class="page-title">Wątki</h1>
        <p class="page-lead">Wszystkie teksty pogrupowane tematycznie — tak, by łatwo prześledzić jeden splot myśli.</p>
        ${groupsHtml}
      </section>
    `;

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ========================================================================
     Widok 2b: Miscellanea (#/miscellanea) — krótkie różności, cytaty, odsłuchy
     ======================================================================== */

  function getMiscKindCounts() {
    const counts = new Map();
    counts.set('Wszystkie', miscellaneaItems.length);
    miscellaneaItems.forEach((item) => {
      const k = item.kind || 'Różności';
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return Array.from(counts.entries());
  }

  function renderMiscEntriesMarkup(list) {
    if (!list.length) {
      return `
        <div class="empty-note">
          <div>Brak wpisów w tej kategorii.</div>
          <button type="button" class="btn-ghost" id="clear-misc-btn">Pokaż wszystkie różności</button>
        </div>
      `;
    }

    return list
      .map((item) => {
        const rendered = renderMarkdown(item.text || '');
        const safeLink = item.url ? sanitizeUrl(item.url) : '';
        const sourceHtml = item.source
          ? safeLink && safeLink !== '#'
            ? `<div class="misc-source">— <a href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.source)} ↗</a></div>`
            : `<div class="misc-source">— ${escapeHtml(item.source)}</div>`
          : '';

        return `
        <article class="misc-entry">
          <div class="misc-meta">
            <time datetime="${escapeHtml(item.date)}">${formatShortDate(item.date)}</time>
            <span class="misc-kind">${threadMark(item.kind)}${escapeHtml(item.kind || 'Różności')}</span>
          </div>
          <div class="misc-body">
            ${item.title ? `<h2 class="misc-title">${escapeHtml(item.title)}</h2>` : ''}
            <div class="misc-text">${rendered.html}</div>
            ${sourceHtml}
          </div>
        </article>
      `;
      })
      .join('');
  }

  function renderMiscellanea() {
    isReadingArticle = false;
    updateReadingProgress();
    setActiveNav('miscellanea');

    const meta = config.miscellanea || {
      title: 'Miscellanea',
      lead: 'Rzeczy pomieszane, krótkie zapiski i różności.',
      etymologyLabel: 'Nota etymologiczna · łac.',
      etymologyText:
        'W języku łacińskim słowo <em>miscellanea</em> (rzeczy pomieszane, różności) jest urzeczownikowioną formą liczby mnogiej rodzaju nijakiego (<em>neutrum pluralis</em>) od przymiotnika <em>miscellaneus, -a, -um</em> (różnorodny, mieszany).'
    };

    document.title = `${meta.title} — ${config.siteName}`;

    const kinds = getMiscKindCounts();
    const filtered = miscellaneaItems.filter(
      (item) => state.miscKind === 'Wszystkie' || item.kind === state.miscKind
    );

    appEl.innerHTML = `
      <section class="reveal">
        <h1 class="page-title">${escapeHtml(meta.title)}</h1>
        ${meta.lead ? `<p class="page-lead">${escapeHtml(meta.lead)}</p>` : ''}

        <aside class="misc-etymology" aria-label="Etymologia słowa miscellanea">
          <span class="misc-etymology-label">${escapeHtml(meta.etymologyLabel)}</span>
          <p>${meta.etymologyText}</p>
        </aside>

        <div class="index-toolbar" aria-label="Filtrowanie miscellaneów">
          <div class="thread-filters" role="tablist" aria-label="Rodzaje notatek">
            ${kinds
              .map(
                ([name, count]) => `
              <button
                type="button"
                class="thread-chip ${state.miscKind === name ? 'is-active' : ''}"
                data-misc-kind="${escapeHtml(name)}"
                role="tab"
                aria-selected="${state.miscKind === name}"
              >
                ${escapeHtml(name)}<span class="thread-count">(${count})</span>
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <div id="misc-list" class="misc-list" aria-live="polite">
          ${renderMiscEntriesMarkup(filtered)}
        </div>
      </section>
    `;

    const listEl = document.getElementById('misc-list');

    function refreshMisc() {
      const nextList = miscellaneaItems.filter(
        (item) => state.miscKind === 'Wszystkie' || item.kind === state.miscKind
      );
      listEl.innerHTML = renderMiscEntriesMarkup(nextList);
      const clearBtn = document.getElementById('clear-misc-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          state.miscKind = 'Wszystkie';
          renderMiscellanea();
        });
      }
    }

    document.querySelectorAll('[data-misc-kind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.miscKind = btn.dataset.miscKind;
        document.querySelectorAll('[data-misc-kind]').forEach((b) => {
          const active = b.dataset.miscKind === state.miscKind;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        refreshMisc();
      });
    });

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ========================================================================
     Widok 3: Artykuł (#/wpis/<slug>) — Komfort czytania + Spis sekcji
     ======================================================================== */

  function renderArticle(slug) {
    const index = posts.findIndex((p) => p.slug === slug);
    if (index === -1) {
      renderNotFound();
      return;
    }

    const post = posts[index];
    const newerPost = index > 0 ? posts[index - 1] : null;
    const olderPost = index < posts.length - 1 ? posts[index + 1] : null;
    const related = posts.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);

    const parsed = renderMarkdown(post.content);

    isReadingArticle = true;
    setActiveNav('home');
    document.title = `${post.title} — ${config.siteName}`;

    appEl.innerHTML = `
      <article class="reveal">
        <div class="reader-bar">
          <a href="#/" class="back-btn">← Powrót do indeksu</a>
          <div class="reader-controls" aria-label="Ustawienia czytania">
            <button type="button" class="reader-btn ${state.fontScale === 'sm' ? 'is-active' : ''}" data-scale="sm" title="Mniejszy tekst">A−</button>
            <button type="button" class="reader-btn ${state.fontScale === 'md' ? 'is-active' : ''}" data-scale="md" title="Domyślny tekst">A</button>
            <button type="button" class="reader-btn ${state.fontScale === 'lg' ? 'is-active' : ''}" data-scale="lg" title="Większy tekst">A+</button>
            <button type="button" id="copy-link-btn" class="reader-btn">Kopiuj link</button>
          </div>
        </div>

        <header class="article-header">
          <div class="article-kicker">
            <span class="kicker-thread">${threadMark(post.category)}${escapeHtml(post.category)}</span>
            <span>·</span>
            <time datetime="${escapeHtml(post.date)}">${formatLongDate(post.date)}</time>
            <span>·</span>
            <span>${estimateReadTime(post.content)}</span>
          </div>
          <h1 class="article-title">${escapeHtml(post.title)}</h1>
          ${post.excerpt ? `<p class="article-standfirst">${escapeHtml(post.excerpt)}</p>` : ''}
        </header>

        ${
          parsed.headings.length >= 2
            ? `
          <nav class="section-toc" aria-label="W tym wpisie">
            <span class="section-toc-label">W tym tekście</span>
            <ul>
              ${parsed.headings
                .map(
                  (h) => `<li><a href="#${escapeHtml(h.id)}" data-jump-id="${escapeHtml(h.id)}">${escapeHtml(h.title)}</a></li>`
                )
                .join('')}
            </ul>
          </nav>
        `
            : ''
        }

        <div class="prose">
          ${parsed.html}
        </div>

        <footer class="article-end">
          ${
            related.length
              ? `
            <div class="related-box">
              <span class="related-label">Więcej w wątku „${escapeHtml(post.category)}”</span>
              <ul class="compact-list">
                ${related
                  .map(
                    (r) => `
                  <li class="compact-item">
                    <a href="#/wpis/${encodeURIComponent(r.slug)}">${escapeHtml(r.title)}</a>
                    <time class="compact-date" datetime="${escapeHtml(r.date)}">${formatShortDate(r.date)}</time>
                  </li>
                `
                  )
                  .join('')}
              </ul>
            </div>
          `
              : ''
          }

          ${
            newerPost || olderPost
              ? `
            <nav class="article-pager" aria-label="Poprzedni i następny wpis">
              ${
                olderPost
                  ? `
                <a class="pager-link prev" href="#/wpis/${encodeURIComponent(olderPost.slug)}">
                  <span class="pager-dir">← Poprzedni</span>
                  <span class="pager-title">${escapeHtml(olderPost.title)}</span>
                </a>
              `
                  : ''
              }
              ${
                newerPost
                  ? `
                <a class="pager-link next" href="#/wpis/${encodeURIComponent(newerPost.slug)}">
                  <span class="pager-dir">Następny →</span>
                  <span class="pager-title">${escapeHtml(newerPost.title)}</span>
                </a>
              `
                  : ''
              }
            </nav>
          `
              : ''
          }
        </footer>
      </article>
    `;

    // Płynne przewijanie do sekcji (bez nadpisywania hash routera)
    document.querySelectorAll('[data-jump-id]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(link.dataset.jumpId);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Regulacja rozmiaru tekstu
    document.querySelectorAll('[data-scale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyFontScale(btn.dataset.scale);
        document.querySelectorAll('[data-scale]').forEach((b) => {
          b.classList.toggle('is-active', b.dataset.scale === state.fontScale);
        });
      });
    });

    // Kopiowanie linku
    document.getElementById('copy-link-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Skopiowano link do artykułu');
      } catch {
        showToast('Skopiuj adres z paska przeglądarki');
      }
    });

    window.scrollTo({ top: 0, behavior: 'instant' });
    updateReadingProgress();
  }

  /* ========================================================================
     Widok 4: O mnie (#/o-mnie)
     ======================================================================== */

  function renderAbout() {
    isReadingArticle = false;
    updateReadingProgress();
    setActiveNav('about');
    document.title = `${config.about.title} — ${config.siteName}`;

    const parsed = renderMarkdown(config.about.content);

    appEl.innerHTML = `
      <article class="reveal">
        <header class="article-header">
          <div class="article-kicker">
            <span class="kicker-thread">${escapeHtml(config.siteName)}</span>
            <span>·</span>
            <span>Nota od autora</span>
          </div>
          <h1 class="article-title">${escapeHtml(config.about.title)}</h1>
          ${config.about.lead ? `<p class="article-standfirst">${escapeHtml(config.about.lead)}</p>` : ''}
        </header>

        <div class="prose">
          ${parsed.html}
        </div>
      </article>
    `;

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ========================================================================
     Widok 5: Polityka prywatności (#/polityka-prywatnosci)
     ======================================================================== */

  function renderPrivacy() {
    isReadingArticle = false;
    updateReadingProgress();
    setActiveNav('');

    const privacy = config.privacy || {
      title: 'Polityka prywatności',
      updated: '2026-11-22',
      lead: 'Informacja o przetwarzaniu danych i pamięci lokalnej przeglądarki.',
      content: ''
    };

    document.title = `${privacy.title} — ${config.siteName}`;
    const parsed = renderMarkdown(privacy.content);

    appEl.innerHTML = `
      <article class="reveal">
        <div class="reader-bar">
          <a href="#/" class="back-btn">← Powrót do spisu</a>
        </div>

        <header class="article-header">
          <div class="article-kicker">
            <span class="kicker-thread">${escapeHtml(config.siteName)}</span>
            ${privacy.updated ? `<span>·</span><span>Aktualizacja: ${formatLongDate(privacy.updated)}</span>` : ''}
          </div>
          <h1 class="article-title">${escapeHtml(privacy.title)}</h1>
          ${privacy.lead ? `<p class="article-standfirst">${escapeHtml(privacy.lead)}</p>` : ''}
        </header>

        <div class="prose">
          ${parsed.html}
        </div>

        <section class="privacy-controls" aria-label="Zarządzanie ustawieniami prywatności">
          <p class="privacy-status">
            <strong>Bieżący tryb:</strong> <span id="privacy-status-text">${escapeHtml(getPrivacyStatusText())}</span>
          </p>
          <div class="privacy-actions">
            <button type="button" id="privacy-reopen-banner" class="cookie-btn cookie-btn-primary">Zmień ustawienia cookies</button>
            <button type="button" id="privacy-clear-storage" class="cookie-btn">Wyczyść zapisane preferencje</button>
          </div>
        </section>
      </article>
    `;

    const reopenBtn = document.getElementById('privacy-reopen-banner');
    if (reopenBtn) {
      reopenBtn.addEventListener('click', openCookieBanner);
    }

    const clearBtn = document.getElementById('privacy-clear-storage');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        clearStoredPrefs();
        refreshPrivacyStatusIfVisible();
        showToast('Wyczyszczono zapisane preferencje w przeglądarce');
      });
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function renderNotFound() {
    isReadingArticle = false;
    updateReadingProgress();
    setActiveNav('');
    document.title = `Nie znaleziono — ${config.siteName}`;

    appEl.innerHTML = `
      <section class="empty-note reveal">
        <h1 class="page-title">Nie znaleziono wpisu</h1>
        <p>Taki adres nie istnieje. Możesz wrócić do <a href="#/" style="color: var(--accent); text-decoration: underline;">spisu wszystkich wpisów</a>.</p>
      </section>
    `;
  }

  /* ========================================================================
     Router (#/)
     ======================================================================== */

  function handleRoute() {
    const hash = window.location.hash || '#/';
    const isAbout = hash === '#/o-mnie';

    if (document.body) {
      document.body.classList.toggle('is-about-page', isAbout);
      if (isAbout && config.about && config.about.avatar) {
        document.body.style.setProperty('--about-bg', `url('${config.about.avatar.replace(/'/g, "\\'")}')`);
      }
    }

    if (hash === '#' || hash === '#/' || hash === '') {
      renderHome();
      return;
    }

    if (hash === '#/watki') {
      renderThreads();
      return;
    }

    if (hash === '#/miscellanea') {
      renderMiscellanea();
      return;
    }

    if (hash === '#/o-mnie') {
      renderAbout();
      return;
    }

    if (hash === '#/polityka-prywatnosci') {
      renderPrivacy();
      return;
    }

    const postMatch = hash.match(/^#\/wpis\/(.+)$/);
    if (postMatch) {
      renderArticle(decodeURIComponent(postMatch[1]));
      return;
    }

    renderNotFound();
  }

  initChrome();
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
})();

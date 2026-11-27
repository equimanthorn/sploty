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

  const libraryItems = window.LIBRARY_ITEMS || [];
  const chronicleEvents = window.CHRONICLE_EVENTS || [];
  const glossaryMap = window.GLOSSARY || {};
  const symbolCatalog = window.ASTRO_SYMBOLS || {};

  const state = {
    thread: 'Wszystkie',
    miscKind: 'Wszystkie',
    libraryKind: 'Wszystkie',
    chronicleRealm: 'Wszystkie',
    query: '',
    focusMode: false,
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

  function sanitizeMediaUrl(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) return '';
    return trimmed;
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

    const inlineGlosses = [];
    text = text.replace(/\{\{([^|}]+)\|([^}]+)\}\}/g, (_, term, note) => {
      const idx = inlineGlosses.length;
      inlineGlosses.push(
        `<span class="gloss-term" tabindex="0" role="button" aria-label="${term}: ${note}">${term}<span class="gloss-tip" role="tooltip">${note}</span></span>`
      );
      return `\u0000GLOSS${idx}\u0000`;
    });

    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const safeHref = sanitizeUrl(url);
      const isExternal = /^https?:\/\//i.test(safeHref);
      const extra = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(safeHref)}"${extra}>${label}</a>`;
    });

    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

    text = text.replace(/\u0000GLOSS(\d+)\u0000/g, (_, idx) => inlineGlosses[Number(idx)]);
    text = text.replace(/\u0000CODE(\d+)\u0000/g, (_, idx) => inlineCodes[Number(idx)]);
    return text;
  }

  function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Automatyczne podświetlanie pierwszych wystąpień pojęć ze słownika window.GLOSSARY (z pominięciem tagów HTML)
  function applyAutoGlossary(html) {
    const terms = Object.keys(glossaryMap).sort((a, b) => b.length - a.length);
    if (!terms.length || !html) return html;

    const used = new Set();
    const parts = String(html).split(/(<[^>]+>)/g);
    let insideSkipTag = 0;

    return parts
      .map((part) => {
        if (part.startsWith('<')) {
          if (/^<(a|code|pre|h[1-6]|button|figcaption)\b/i.test(part) || /class="[^"]*gloss-term/.test(part)) {
            insideSkipTag += 1;
          } else if (/^<\/(a|code|pre|h[1-6]|button|figcaption|span)>/i.test(part) && insideSkipTag > 0) {
            insideSkipTag -= 1;
          }
          return part;
        }
        if (insideSkipTag > 0 || !part.trim()) return part;

        let out = part;
        for (const term of terms) {
          if (used.has(term)) continue;
          const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegex(term)})(?=$|[^\\p{L}\\p{N}])`, 'iu');
          if (re.test(out)) {
            used.add(term);
            const note = escapeHtml(glossaryMap[term]);
            out = out.replace(
              re,
              (_, pre, matched) =>
                `${pre}<span class="gloss-term" tabindex="0" role="button" aria-label="${escapeHtml(matched)}: ${note}">${matched}<span class="gloss-tip" role="tooltip">${note}</span></span>`
            );
          }
        }
        return out;
      })
      .join('');
  }

  function bindGlossTooltips() {
    const glossEls = Array.from(document.querySelectorAll('.gloss-term'));
    if (!glossEls.length) return;
    glossEls.forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = el.classList.contains('is-open');
        glossEls.forEach((other) => other.classList.remove('is-open'));
        if (!isOpen) el.classList.add('is-open');
      });
    });
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.gloss-term.is-open').forEach((el) => el.classList.remove('is-open'));
  });

  const MD_IMAGE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;

  function renderGalleryGridMarkup(items, mediaCollector, options) {
    const opts = options || {};
    const valid = [];

    (items || []).forEach((entry) => {
      const raw = typeof entry === 'string' ? { src: entry } : entry || {};
      const src = sanitizeMediaUrl(raw.src);
      if (!src) return;
      const caption = String(raw.caption || raw.title || '').trim();
      const alt = String(raw.alt || caption || 'Ilustracja').trim();
      const globalIdx = mediaCollector.length;
      mediaCollector.push({ src, alt, caption });
      valid.push({ src, alt, caption, globalIdx });
    });

    if (!valid.length) return '';

    const countAttr = valid.length <= 4 ? String(valid.length) : 'many';
    const cardsHtml = valid
      .map((item, idx) => {
        const plateRoman = toRoman(opts.startNum ? opts.startNum + idx : idx + 1);
        return `
          <figure class="gallery-card">
            <button
              type="button"
              class="media-frame"
              data-lightbox-index="${item.globalIdx}"
              aria-label="Powiększ zdjęcie${item.caption ? ': ' + escapeHtml(item.caption) : ''}"
            >
              <span class="media-viewport">
                <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy" decoding="async" />
              </span>
              <span class="media-plate-num" aria-hidden="true">${plateRoman}</span>
              <span class="media-zoom-badge" aria-hidden="true">⤢</span>
            </button>
            ${item.caption ? `<figcaption class="gallery-card-caption">${escapeHtml(item.caption)}</figcaption>` : ''}
          </figure>
        `;
      })
      .join('');

    return `<div class="editorial-gallery" data-count="${countAttr}">${cardsHtml}</div>`;
  }

  function renderPostGallerySection(galleryItems, galleryTitle, mediaCollector) {
    if (!Array.isArray(galleryItems) || !galleryItems.length) return '';
    const beforeCount = mediaCollector.length;
    const gridHtml = renderGalleryGridMarkup(galleryItems, mediaCollector, { startNum: 1 });
    const addedCount = mediaCollector.length - beforeCount;
    if (!addedCount) return '';

    const countWord = addedCount === 1 ? 'kadr' : addedCount >= 2 && addedCount <= 4 ? 'kadry' : 'kadrów';
    const heading = escapeHtml(galleryTitle || 'Galeria');

    return `
      <section class="post-gallery-section" aria-label="${heading}">
        <div class="post-gallery-head">
          <h2 class="post-gallery-title">${heading}</h2>
          <span class="post-gallery-count">${toRoman(addedCount)} · ${addedCount} ${countWord}</span>
        </div>
        ${gridHtml}
      </section>
    `;
  }

  function renderMarkdown(md, mediaCollector) {
    const media = Array.isArray(mediaCollector) ? mediaCollector : [];
    if (!md) return { html: '', headings: [], media };

    const normalized = String(md).replace(/\r\n/g, '\n').trim();
    const codeBlocks = [];
    const headings = [];
    let figureCounter = 0;

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

      if (MD_IMAGE_RE.test(line)) {
        const group = [];
        while (i < lines.length && MD_IMAGE_RE.test(lines[i].trim())) {
          const m = lines[i].trim().match(MD_IMAGE_RE);
          const src = sanitizeMediaUrl(m[2]);
          if (src) {
            const alt = String(m[1] || '').trim();
            const caption = String(m[3] || alt).trim();
            group.push({ src, alt: alt || caption || 'Ilustracja', caption });
          }
          i++;
        }

        if (group.length === 1) {
          const img = group[0];
          figureCounter += 1;
          const globalIdx = media.length;
          media.push(img);
          const figNum = toRoman(figureCounter);
          html.push(`
            <figure class="prose-figure">
              <button
                type="button"
                class="media-frame"
                data-lightbox-index="${globalIdx}"
                aria-label="Powiększ zdjęcie${img.caption ? ': ' + escapeHtml(img.caption) : ''}"
              >
                <span class="media-viewport">
                  <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="lazy" decoding="async" />
                </span>
                <span class="media-zoom-badge" aria-hidden="true">⤢</span>
              </button>
              ${
                img.caption
                  ? `<figcaption class="prose-figcaption"><span class="figcaption-num">Ryc. ${figNum}</span><span>${escapeHtml(img.caption)}</span></figcaption>`
                  : ''
              }
            </figure>
          `);
        } else if (group.length > 1) {
          html.push(renderGalleryGridMarkup(group, media, { startNum: figureCounter + 1 }));
          figureCounter += group.length;
        }
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
        !/^(## |### |> |[-*]\s+|\d+\.\s+|---+$|\u0000BLOCK\d+\u0000$)/.test(lines[i].trim()) &&
        !MD_IMAGE_RE.test(lines[i].trim())
      ) {
        paraLines.push(renderInline(lines[i].trim()));
        i++;
      }
      html.push(`<p>${paraLines.join(' ')}</p>`);
    }

    return { html: html.join('\n'), headings, media };
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

  const noticeBannerEl = document.getElementById('sploty-notice');
  const noticeAcceptEl = document.getElementById('notice-accept-btn');
  const noticeSessionEl = document.getElementById('notice-session-btn');

  function openPrivacyNotice() {
    if (!noticeBannerEl) return;
    noticeBannerEl.hidden = false;
  }

  function closePrivacyNotice() {
    if (!noticeBannerEl) return;
    noticeBannerEl.hidden = true;
  }

  function refreshPrivacyStatusIfVisible() {
    const statusEl = document.getElementById('privacy-status-text');
    if (statusEl) {
      statusEl.textContent = getPrivacyStatusText();
    }
  }

  function initPrivacyNotice() {
    if (!noticeBannerEl) return;

    if (noticeAcceptEl) {
      noticeAcceptEl.addEventListener('click', () => {
        try {
          sessionStorage.removeItem(SESSION_ONLY_KEY);
          localStorage.setItem(PRIVACY_KEY, 'accepted');
        } catch {
          /* ignore */
        }
        closePrivacyNotice();
        refreshPrivacyStatusIfVisible();
        showToast('Zapisano ustawienia pamięci lokalnej');
      });
    }

    if (noticeSessionEl) {
      noticeSessionEl.addEventListener('click', () => {
        clearStoredPrefs();
        try {
          sessionStorage.setItem(SESSION_ONLY_KEY, '1');
        } catch {
          /* ignore */
        }
        closePrivacyNotice();
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
      openPrivacyNotice();
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

  // Przemiana symbolu w astrolabium po każdym pełnym obrocie o 360° (łagodne przenikanie + blask + Indeks 42 symboli)
  let astrolabeApi = null;

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

    function setSymbol(targetIdx) {
      const nextIdx = ((Number(targetIdx) || 0) % symbols.length + symbols.length) % symbols.length;
      symbols[currentIdx].classList.remove('is-active');
      currentIdx = nextIdx;
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

    function advanceSymbol() {
      setSymbol(currentIdx + 1);
    }

    rotor.addEventListener('animationiteration', advanceSymbol);
    if (stageEl) {
      stageEl.addEventListener('click', (e) => {
        if (labelEl && (e.target === labelEl || (labelEl.contains && labelEl.contains(e.target)))) {
          return;
        }
        advanceSymbol();
      });
    }

    astrolabeApi = {
      symbols,
      getCurrentIndex: () => currentIdx,
      setSymbol
    };
  }

  /* ========================================================================
     Indeks 42 symboli z Astrolabium (modal)
     ======================================================================== */

  const symbolModalEl = document.getElementById('sploty-symbol-modal');
  const symbolModalTitleEl = document.getElementById('symbol-modal-title');
  const symbolModalSvgEl = document.getElementById('symbol-modal-svg');
  const symbolModalTradEl = document.getElementById('symbol-modal-tradition');
  const symbolModalOriginEl = document.getElementById('symbol-modal-origin');
  const symbolModalDescEl = document.getElementById('symbol-modal-desc');
  const symbolModalFiltersEl = document.getElementById('symbol-modal-filters');
  const symbolModalGridEl = document.getElementById('symbol-modal-grid');
  const symbolModalCloseEl = document.getElementById('symbol-modal-close');
  const symbolModalPrevEl = document.getElementById('symbol-modal-prev');
  const symbolModalNextEl = document.getElementById('symbol-modal-next');
  const symbolModalApplyEl = document.getElementById('symbol-modal-apply');

  const symbolModalState = {
    selectedIdx: 0,
    tradition: 'Wszystkie'
  };

  function getSymbolEntries() {
    if (!astrolabeApi || !astrolabeApi.symbols) return [];
    return astrolabeApi.symbols.map((el, idx) => {
      const name = (el.dataset && el.dataset.symbolName) || `Symbol ${idx + 1}`;
      const info = symbolCatalog[name] || {
        tradition: 'Symbolika',
        origin: 'Tradycja historyczno-filozoficzna',
        description: 'Geometryczny znak włączony do cyklu 42 symboli Astrolabium Splotów.'
      };
      return {
        index: idx,
        name,
        tradition: info.tradition,
        origin: info.origin,
        description: info.description,
        innerSvg: el.innerHTML || ''
      };
    });
  }

  function renderSymbolModalContent() {
    const entries = getSymbolEntries();
    if (!entries.length || !symbolModalEl) return;

    const idx = ((symbolModalState.selectedIdx % entries.length) + entries.length) % entries.length;
    symbolModalState.selectedIdx = idx;
    const item = entries[idx];

    if (symbolModalTitleEl) symbolModalTitleEl.textContent = `${toRoman(idx + 1)}. ${item.name}`;
    if (symbolModalTradEl) symbolModalTradEl.textContent = item.tradition;
    if (symbolModalOriginEl) symbolModalOriginEl.textContent = item.origin;
    if (symbolModalDescEl) symbolModalDescEl.textContent = item.description;
    if (symbolModalSvgEl) symbolModalSvgEl.innerHTML = item.innerSvg;

    if (symbolModalFiltersEl) {
      const counts = new Map();
      counts.set('Wszystkie', entries.length);
      entries.forEach((e) => counts.set(e.tradition, (counts.get(e.tradition) || 0) + 1));

      symbolModalFiltersEl.innerHTML = Array.from(counts.entries())
        .map(
          ([trad, count]) => `
            <button
              type="button"
              class="thread-chip ${symbolModalState.tradition === trad ? 'is-active' : ''}"
              data-sym-trad="${escapeHtml(trad)}"
              role="tab"
              aria-selected="${symbolModalState.tradition === trad}"
            >
              ${escapeHtml(trad)}<span class="thread-count">(${count})</span>
            </button>
          `
        )
        .join('');

      symbolModalFiltersEl.querySelectorAll('[data-sym-trad]').forEach((btn) => {
        btn.addEventListener('click', () => {
          symbolModalState.tradition = btn.dataset.symTrad;
          const filtered = entries.filter(
            (e) => symbolModalState.tradition === 'Wszystkie' || e.tradition === symbolModalState.tradition
          );
          if (filtered.length && !filtered.some((e) => e.index === symbolModalState.selectedIdx)) {
            symbolModalState.selectedIdx = filtered[0].index;
          }
          renderSymbolModalContent();
        });
      });
    }

    if (symbolModalGridEl) {
      const visible = entries.filter(
        (e) => symbolModalState.tradition === 'Wszystkie' || e.tradition === symbolModalState.tradition
      );
      symbolModalGridEl.innerHTML = visible
        .map(
          (e) => `
            <button
              type="button"
              class="symbol-pill ${e.index === idx ? 'is-active' : ''}"
              data-sym-idx="${e.index}"
            >
              <span class="symbol-pill-num">${toRoman(e.index + 1)}</span>
              <span class="symbol-pill-name">${escapeHtml(e.name)}</span>
            </button>
          `
        )
        .join('');

      symbolModalGridEl.querySelectorAll('[data-sym-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          symbolModalState.selectedIdx = Number(btn.dataset.symIdx) || 0;
          renderSymbolModalContent();
        });
      });
    }
  }

  function openSymbolModal(startIdx) {
    if (!symbolModalEl || !astrolabeApi) return;
    symbolModalState.selectedIdx =
      typeof startIdx === 'number' ? startIdx : astrolabeApi.getCurrentIndex();
    symbolModalState.tradition = 'Wszystkie';
    renderSymbolModalContent();
    symbolModalEl.hidden = false;
    if (document.body) document.body.classList.add('is-lightbox-open');
    if (symbolModalCloseEl && typeof symbolModalCloseEl.focus === 'function') {
      symbolModalCloseEl.focus();
    }
  }

  function closeSymbolModal() {
    if (!symbolModalEl || symbolModalEl.hidden) return;
    symbolModalEl.hidden = true;
    if (document.body) document.body.classList.remove('is-lightbox-open');
  }

  function initSymbolModal() {
    const labelEl = document.getElementById('astro-symbol-label');
    if (labelEl) {
      labelEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openSymbolModal();
      });
    }

    if (!symbolModalEl) return;
    if (symbolModalCloseEl) symbolModalCloseEl.addEventListener('click', closeSymbolModal);
    if (symbolModalPrevEl) {
      symbolModalPrevEl.addEventListener('click', () => {
        symbolModalState.selectedIdx -= 1;
        renderSymbolModalContent();
      });
    }
    if (symbolModalNextEl) {
      symbolModalNextEl.addEventListener('click', () => {
        symbolModalState.selectedIdx += 1;
        renderSymbolModalContent();
      });
    }
    if (symbolModalApplyEl) {
      symbolModalApplyEl.addEventListener('click', () => {
        if (astrolabeApi) {
          astrolabeApi.setSymbol(symbolModalState.selectedIdx);
          const entries = getSymbolEntries();
          const chosen = entries[symbolModalState.selectedIdx];
          showToast(`Astrolabium: ${chosen ? chosen.name : 'zmieniono symbol'}`);
        }
        closeSymbolModal();
      });
    }

    symbolModalEl.addEventListener('click', (e) => {
      if (e.target === symbolModalEl) closeSymbolModal();
    });

    document.addEventListener('keydown', (e) => {
      if (symbolModalEl.hidden) return;
      if (e.key === 'Escape') closeSymbolModal();
      else if (e.key === 'ArrowLeft') {
        symbolModalState.selectedIdx -= 1;
        renderSymbolModalContent();
      } else if (e.key === 'ArrowRight') {
        symbolModalState.selectedIdx += 1;
        renderSymbolModalContent();
      }
    });
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

  /* ========================================================================
     Pełnoekranowy Lightbox dla zdjęć i galerii
     ======================================================================== */

  const lightboxEl = document.getElementById('sploty-lightbox');
  const lightboxImgEl = document.getElementById('lightbox-img');
  const lightboxCapEl = document.getElementById('lightbox-caption');
  const lightboxCounterEl = document.getElementById('lightbox-counter');
  const lightboxPrevEl = document.getElementById('lightbox-prev');
  const lightboxNextEl = document.getElementById('lightbox-next');
  const lightboxCloseEl = document.getElementById('lightbox-close');
  const lightboxThumbsEl = document.getElementById('lightbox-thumbs');

  const lightboxState = {
    items: [],
    index: 0,
    lastFocused: null,
    touchStartX: 0
  };

  function renderLightboxSlide() {
    if (!lightboxEl || !lightboxState.items.length) return;
    const total = lightboxState.items.length;
    const idx = ((lightboxState.index % total) + total) % total;
    lightboxState.index = idx;
    const item = lightboxState.items[idx];

    if (lightboxImgEl) {
      lightboxImgEl.src = item.src;
      lightboxImgEl.alt = item.alt || item.caption || 'Zdjęcie';
    }
    if (lightboxCapEl) {
      lightboxCapEl.textContent = item.caption || '';
    }
    if (lightboxCounterEl) {
      lightboxCounterEl.textContent = `${toRoman(idx + 1)} / ${toRoman(total)}`;
    }
    if (lightboxPrevEl) lightboxPrevEl.hidden = total <= 1;
    if (lightboxNextEl) lightboxNextEl.hidden = total <= 1;

    if (lightboxThumbsEl) {
      lightboxThumbsEl.hidden = total <= 1;
      lightboxThumbsEl.querySelectorAll('.lightbox-thumb').forEach((btn, i) => {
        btn.classList.toggle('is-active', i === idx);
      });
    }
  }

  function openLightbox(items, startIndex) {
    if (!lightboxEl || !Array.isArray(items) || !items.length) return;
    lightboxState.items = items;
    lightboxState.index = Number(startIndex) || 0;
    lightboxState.lastFocused = document.activeElement;

    if (lightboxThumbsEl) {
      if (items.length > 1) {
        lightboxThumbsEl.innerHTML = items
          .map(
            (item, i) => `
              <button
                type="button"
                class="lightbox-thumb ${i === lightboxState.index ? 'is-active' : ''}"
                data-lb-thumb="${i}"
                aria-label="Przejdź do zdjęcia ${i + 1}"
              >
                <img src="${escapeHtml(item.src)}" alt="" loading="lazy" />
              </button>
            `
          )
          .join('');
        lightboxThumbsEl.querySelectorAll('[data-lb-thumb]').forEach((btn) => {
          btn.addEventListener('click', () => {
            lightboxState.index = Number(btn.dataset.lbThumb) || 0;
            renderLightboxSlide();
          });
        });
      } else {
        lightboxThumbsEl.innerHTML = '';
      }
    }

    renderLightboxSlide();
    lightboxEl.hidden = false;
    if (document.body) document.body.classList.add('is-lightbox-open');
    if (lightboxCloseEl && typeof lightboxCloseEl.focus === 'function') {
      lightboxCloseEl.focus();
    }
  }

  function closeLightbox() {
    if (!lightboxEl || lightboxEl.hidden) return;
    lightboxEl.hidden = true;
    if (document.body) document.body.classList.remove('is-lightbox-open');
    if (lightboxState.lastFocused && typeof lightboxState.lastFocused.focus === 'function') {
      lightboxState.lastFocused.focus();
    }
  }

  function stepLightbox(delta) {
    if (!lightboxEl || lightboxEl.hidden || lightboxState.items.length <= 1) return;
    lightboxState.index += delta;
    renderLightboxSlide();
  }

  function initLightbox() {
    if (!lightboxEl) return;

    if (lightboxCloseEl) lightboxCloseEl.addEventListener('click', closeLightbox);
    if (lightboxPrevEl) lightboxPrevEl.addEventListener('click', () => stepLightbox(-1));
    if (lightboxNextEl) lightboxNextEl.addEventListener('click', () => stepLightbox(1));

    lightboxEl.addEventListener('click', (e) => {
      if (e.target === lightboxEl || (e.target && e.target.classList && e.target.classList.contains('lightbox-stage'))) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (lightboxEl.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'ArrowRight') stepLightbox(1);
    });

    lightboxEl.addEventListener(
      'touchstart',
      (e) => {
        if (e.changedTouches && e.changedTouches[0]) {
          lightboxState.touchStartX = e.changedTouches[0].clientX;
        }
      },
      { passive: true }
    );

    lightboxEl.addEventListener(
      'touchend',
      (e) => {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        const dx = e.changedTouches[0].clientX - lightboxState.touchStartX;
        if (Math.abs(dx) >= 42) {
          stepLightbox(dx < 0 ? 1 : -1);
        }
      },
      { passive: true }
    );
  }

  function bindLightboxTriggers(mediaList) {
    if (!Array.isArray(mediaList) || !mediaList.length) return;
    document.querySelectorAll('[data-lightbox-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openLightbox(mediaList, Number(btn.dataset.lightboxIndex) || 0);
      });
    });
  }

  // Przycisk powrotu na górę strony
  const scrollTopBtnEl = document.getElementById('scroll-top-btn');

  function updateScrollTopBtn() {
    if (!scrollTopBtnEl) return;
    scrollTopBtnEl.classList.toggle('is-visible', window.scrollY > 420);
  }

  if (scrollTopBtnEl) {
    scrollTopBtnEl.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function applyFocusMode(enabled) {
    state.focusMode = Boolean(enabled);
    if (document.body) {
      document.body.classList.toggle('is-focus-mode', state.focusMode);
    }
  }

  initKineticThreads();
  initAstrolabeMorph();
  initSymbolModal();
  initRagnarokClock();
  initPrivacyNotice();
  initLightbox();

  let isReadingArticle = false;

  function updateReadingProgress() {
    updateScrollTopBtn();
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
        { label: 'Biblioteka', url: '#/biblioteka' },
        { label: 'Kronika', url: '#/kronika' },
        { label: 'O mnie', url: '#/o-mnie' },
        { label: 'Polityka prywatności', url: '#/polityka-prywatnosci' },
        { label: 'RSS', url: 'feed.xml' },
        ...(config.footerLinks || [])
      ];
      linksEl.innerHTML =
        navLinks
          .map((link) => {
            const href = link.url === 'feed.xml' ? 'feed.xml' : sanitizeUrl(link.url);
            const ext = /^(https?:\/\/|feed\.xml)/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<a href="${escapeHtml(href)}"${ext}>${escapeHtml(link.label)}</a>`;
          })
          .join('') +
        `<button type="button" class="colophon-link-btn" id="open-symbol-index-btn">Symbole (XLII)</button>` +
        `<button type="button" class="colophon-link-btn" id="open-notice-settings-btn">Cookies</button>`;

      const openSymBtn = document.getElementById('open-symbol-index-btn');
      if (openSymBtn) {
        openSymBtn.addEventListener('click', () => openSymbolModal());
      }
      const openNoticeBtn = document.getElementById('open-notice-settings-btn');
      if (openNoticeBtn) {
        openNoticeBtn.addEventListener('click', openPrivacyNotice);
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

  function renderNowSection() {
    const now = config.now;
    if (!now) return '';

    const cols = [
      { key: 'listening', label: 'Teraz słucham', item: now.listening },
      { key: 'reading', label: 'Teraz czytam', item: now.reading },
      { key: 'researching', label: 'Teraz badam', item: now.researching }
    ].filter((c) => c.item && c.item.title);

    if (!cols.length) return '';

    return `
      <section class="now-shelf reveal" aria-label="Teraz — bieżące odsłuchy, lektury i badania">
        <div class="now-shelf-head">
          <span class="now-shelf-title">Teraz · Na biurku i na talerzu</span>
          <div class="now-shelf-links">
            <a href="#/biblioteka">Biblioteka i Płytoteka →</a>
            <a href="#/kronika">Kronika Piastów i Północy →</a>
          </div>
        </div>
        <div class="now-grid">
          ${cols
            .map((col) => {
              const titleHtml = col.item.url
                ? `<a href="${escapeHtml(sanitizeUrl(col.item.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(col.item.title)} ↗</a>`
                : escapeHtml(col.item.title);
              return `
                <div class="now-card">
                  <span class="now-card-label">${col.label}</span>
                  <div class="now-card-title">${titleHtml}</div>
                  ${col.item.note ? `<p class="now-card-note">${escapeHtml(col.item.note)}</p>` : ''}
                </div>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  function openRandomThread() {
    if (!posts.length) return;
    const pool = posts.map((p) => `#/wpis/${encodeURIComponent(p.slug)}`);
    pool.push('#/miscellanea', '#/biblioteka', '#/kronika');
    const currentHash = window.location.hash || '#/';
    const candidates = pool.filter((h) => h !== currentHash);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
    showToast('Nić Urðr wybrała kolejny wątek…');
    window.location.hash = chosen;
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

        <div class="toolbar-actions">
          <button type="button" id="random-thread-btn" class="random-thread-btn" title="Nić Urðr — otwórz losowy wpis lub sekcję">
            <span class="runic-term" aria-hidden="true">ᛟ</span> Losuj
          </button>
          <input
            type="search"
            id="index-search"
            class="index-search"
            placeholder="Szukaj w spisie…"
            value="${escapeHtml(state.query)}"
            aria-label="Szukaj w spisie wpisów"
          />
        </div>
      </section>

      <section id="toc-list" class="toc-list reveal" aria-live="polite">
        ${renderTocList(filtered)}
      </section>

      ${renderNowSection()}
    `;

    const randomBtn = document.getElementById('random-thread-btn');
    if (randomBtn) {
      randomBtn.addEventListener('click', openRandomThread);
    }

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

    const articleMedia = [];
    const parsed = renderMarkdown(post.content, articleMedia);
    const proseHtml = applyAutoGlossary(parsed.html);
    const galleryHtml = renderPostGallerySection(post.gallery, post.galleryTitle, articleMedia);
    const soundtrackHtml =
      post.soundtrack && post.soundtrack.title
        ? `
          <div class="article-soundtrack">
            <span class="soundtrack-label">Do lektury</span>
            <span aria-hidden="true">·</span>
            ${
              post.soundtrack.url
                ? `<a href="${escapeHtml(sanitizeUrl(post.soundtrack.url))}" target="_blank" rel="noopener noreferrer">${
                    post.soundtrack.artist ? `${escapeHtml(post.soundtrack.artist)} — ` : ''
                  }${escapeHtml(post.soundtrack.title)} ↗</a>`
                : `<span>${post.soundtrack.artist ? `${escapeHtml(post.soundtrack.artist)} — ` : ''}${escapeHtml(post.soundtrack.title)}</span>`
            }
          </div>
        `
        : '';

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
            <button type="button" id="focus-mode-btn" class="reader-btn ${state.focusMode ? 'is-active' : ''}" title="Ukryj nagłówek do spokojnej lektury">Skupienie</button>
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
          ${soundtrackHtml}
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
          ${proseHtml}
        </div>

        ${galleryHtml}

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

    // Tryb skupienia (ukrycie nagłówka podczas lektury)
    const focusBtn = document.getElementById('focus-mode-btn');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        applyFocusMode(!state.focusMode);
        focusBtn.classList.toggle('is-active', state.focusMode);
        showToast(state.focusMode ? 'Tryb skupienia włączony' : 'Przywrócono pełny widok');
      });
    }

    bindGlossTooltips();
    bindLightboxTriggers(articleMedia);
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

    const aboutMedia = [];
    const parsed = renderMarkdown(config.about.content, aboutMedia);

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
          ${applyAutoGlossary(parsed.html)}
        </div>

        ${renderNowSection()}
      </article>
    `;

    bindGlossTooltips();
    bindLightboxTriggers(aboutMedia);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ========================================================================
     Widok 5a: Biblioteka i Płytoteka (#/biblioteka)
     ======================================================================== */

  function renderLibrary() {
    isReadingArticle = false;
    updateReadingProgress();
    setActiveNav('');
    document.title = `Biblioteka i Płytoteka — ${config.siteName}`;

    const counts = new Map();
    counts.set('Wszystkie', libraryItems.length);
    libraryItems.forEach((item) => {
      const k = item.kind || 'Inne';
      counts.set(k, (counts.get(k) || 0) + 1);
    });

    function renderRows(list) {
      if (!list.length) {
        return `<div class="empty-note">Brak pozycji w tym dziale.</div>`;
      }
      return list
        .map(
          (item, idx) => `
            <article class="library-row">
              <span class="library-num" aria-hidden="true">${toRoman(idx + 1)}</span>
              <div class="library-meta">
                <span class="toc-thread">${escapeHtml(item.kind || '')}</span>
                ${item.year ? `<span class="library-year">${escapeHtml(item.year)}</span>` : ''}
              </div>
              <div class="library-main">
                <h2 class="library-title">
                  ${item.author ? `<span class="library-author">${escapeHtml(item.author)}</span> — ` : ''}${escapeHtml(item.title)}
                </h2>
                ${item.note ? `<p class="library-note">${escapeHtml(item.note)}</p>` : ''}
              </div>
            </article>
          `
        )
        .join('');
    }

    const filtered = libraryItems.filter(
      (i) => state.libraryKind === 'Wszystkie' || i.kind === state.libraryKind
    );

    appEl.innerHTML = `
      <section class="reveal">
        <div class="reader-bar">
          <a href="#/" class="back-btn">← Powrót do indeksu</a>
        </div>
        <h1 class="page-title">Biblioteka i Płytoteka</h1>
        <p class="page-lead">Książki, źródła wczesnośredniowieczne oraz płyty, do których wracam przy pisaniu i badaniu wątków Splotów.</p>

        <div class="index-toolbar" aria-label="Filtrowanie biblioteki">
          <div class="thread-filters" role="tablist" aria-label="Działy biblioteki">
            ${Array.from(counts.entries())
              .map(
                ([name, count]) => `
                  <button
                    type="button"
                    class="thread-chip ${state.libraryKind === name ? 'is-active' : ''}"
                    data-lib-kind="${escapeHtml(name)}"
                    role="tab"
                    aria-selected="${state.libraryKind === name}"
                  >
                    ${escapeHtml(name)}<span class="thread-count">(${count})</span>
                  </button>
                `
              )
              .join('')}
          </div>
        </div>

        <div id="library-list" class="library-list" aria-live="polite">
          ${renderRows(filtered)}
        </div>
      </section>
    `;

    const listEl = document.getElementById('library-list');
    document.querySelectorAll('[data-lib-kind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.libraryKind = btn.dataset.libKind;
        document.querySelectorAll('[data-lib-kind]').forEach((b) => {
          const active = b.dataset.libKind === state.libraryKind;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        const nextList = libraryItems.filter(
          (i) => state.libraryKind === 'Wszystkie' || i.kind === state.libraryKind
        );
        listEl.innerHTML = renderRows(nextList);
      });
    });

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ========================================================================
     Widok 5b: Oś czasu — Kronika Piastów i Północy (#/kronika)
     ======================================================================== */

  function renderChronicle() {
    isReadingArticle = false;
    updateReadingProgress();
    setActiveNav('');
    document.title = `Kronika Piastów i Północy — ${config.siteName}`;

    const counts = new Map();
    counts.set('Wszystkie', chronicleEvents.length);
    chronicleEvents.forEach((ev) => {
      const r = ev.realm || 'Inne';
      counts.set(r, (counts.get(r) || 0) + 1);
    });

    function renderEvents(list) {
      if (!list.length) {
        return `<div class="empty-note">Brak wydarzeń dla wybranego nurtu.</div>`;
      }
      return list
        .map(
          (ev) => `
            <article class="chronicle-item">
              <div class="chronicle-year-col">
                <span class="chronicle-year">${escapeHtml(ev.year)}</span>
                <span class="chronicle-realm">${escapeHtml(ev.realm)}</span>
              </div>
              <div class="chronicle-body">
                <h2 class="chronicle-title">${escapeHtml(ev.title)}</h2>
                <p class="chronicle-text">${escapeHtml(ev.text)}</p>
                ${
                  ev.postSlug
                    ? `<a class="chronicle-link" href="#/wpis/${encodeURIComponent(ev.postSlug)}">Czytaj powiązany esej →</a>`
                    : ''
                }
              </div>
            </article>
          `
        )
        .join('');
    }

    const filtered = chronicleEvents.filter(
      (e) => state.chronicleRealm === 'Wszystkie' || e.realm === state.chronicleRealm
    );

    appEl.innerHTML = `
      <section class="reveal">
        <div class="reader-bar">
          <a href="#/" class="back-btn">← Powrót do indeksu</a>
        </div>
        <h1 class="page-title">Kronika Piastów i Północy</h1>
        <p class="page-lead">Równoległa oś czasu spinająca budowę monarchii pierwszych Piastów z epoką wikingów i kulturą Północy (VIII–XI wiek).</p>

        <div class="index-toolbar" aria-label="Filtrowanie kroniki">
          <div class="thread-filters" role="tablist" aria-label="Nurty kroniki">
            ${Array.from(counts.entries())
              .map(
                ([name, count]) => `
                  <button
                    type="button"
                    class="thread-chip ${state.chronicleRealm === name ? 'is-active' : ''}"
                    data-chr-realm="${escapeHtml(name)}"
                    role="tab"
                    aria-selected="${state.chronicleRealm === name}"
                  >
                    ${escapeHtml(name)}<span class="thread-count">(${count})</span>
                  </button>
                `
              )
              .join('')}
          </div>
        </div>

        <div id="chronicle-timeline" class="chronicle-timeline" aria-live="polite">
          ${renderEvents(filtered)}
        </div>
      </section>
    `;

    const listEl = document.getElementById('chronicle-timeline');
    document.querySelectorAll('[data-chr-realm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.chronicleRealm = btn.dataset.chrRealm;
        document.querySelectorAll('[data-chr-realm]').forEach((b) => {
          const active = b.dataset.chrRealm === state.chronicleRealm;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        const nextList = chronicleEvents.filter(
          (e) => state.chronicleRealm === 'Wszystkie' || e.realm === state.chronicleRealm
        );
        listEl.innerHTML = renderEvents(nextList);
      });
    });

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
            <button type="button" id="privacy-reopen-banner" class="sploty-notice-btn sploty-notice-btn-primary">Zmień ustawienia cookies</button>
            <button type="button" id="privacy-clear-storage" class="sploty-notice-btn">Wyczyść zapisane preferencje</button>
          </div>
        </section>
      </article>
    `;

    const reopenBtn = document.getElementById('privacy-reopen-banner');
    if (reopenBtn) {
      reopenBtn.addEventListener('click', openPrivacyNotice);
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
    closeLightbox();
    closeSymbolModal();
    const hash = window.location.hash || '#/';
    const isAbout = hash === '#/o-mnie';
    const isArticle = /^#\/wpis\/.+/.test(hash);
    if (!isArticle && state.focusMode) {
      applyFocusMode(false);
    }

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

    if (hash === '#/biblioteka') {
      renderLibrary();
      return;
    }

    if (hash === '#/kronika') {
      renderChronicle();
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

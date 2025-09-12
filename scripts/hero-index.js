/* Hero Index builder: collects heroes from tables and builds a
   clickable index grouped by section (Strength/Agility/Intelligence/Universal).
   No tooltips; icons slightly grow on hover; click smooth-scrolls and highlights. */
(function () {
  // Excluded heroes: remove from quick-pick and ignore even if present
  const EXCLUDED_HEROES = new Set([
    'Arc Warden',
    'Dark Willow',
    'Dawnbreaker',
    'Grimstroke',
    'Hoodwink',
    'Marci',
    'Mars',
    'Monkey King',
    'Muerta',
    'Pangolier',
    'Primal Beast',
    'Ringmaster',
    'Snapfire',
    'Underlord',
    'Void Spirit',
  ].map(s => s.toLowerCase()));

  function isExcludedName(s) {
    if (!s) return false;
    const t = String(s).trim().toLowerCase();
    if (!t) return false;
    if (EXCLUDED_HEROES.has(t)) return true;
    // Be defensive: sometimes the cell text may include extra punctuation around the name
    for (const ex of EXCLUDED_HEROES) {
      if (t.includes(ex)) return true;
    }
    return false;
  }
  const GROUP_KEYWORDS = [
    { key: 'strength', labels: ['силовики', 'сила', 'strength'] },
    { key: 'agility', labels: ['ловкачи', 'ловкость', 'agility'] },
    { key: 'intelligence', labels: ['интеллект', 'intelligence'] },
    { key: 'universal', labels: ['универсалы', 'универсал', 'universal'] },
  ];

  const GROUP_TITLES = {
    strength: 'Сила',
    agility: 'Ловкость',
    intelligence: 'Интеллект',
    universal: 'Универсалы',
    other: 'Другое',
  };

  function slugify(text) {
    return (text || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-а-яё]/g, '')
      .replace(/-+/g, '-');
  }

  function guessGroupFromAbove(el) {
    let cur = el;
    for (let i = 0; i < 12 && cur; i++) {
      cur = cur.previousElementSibling;
      if (!cur) break;
      const txt = (cur.textContent || '').trim().toLowerCase();
      for (const g of GROUP_KEYWORDS) {
        if (g.labels.some((lab) => txt.includes(lab))) return g.key;
      }
    }
    // try parent chain
    cur = el.parentElement;
    for (let i = 0; i < 5 && cur; i++) {
      const txt = (cur.textContent || '').trim().toLowerCase();
      for (const g of GROUP_KEYWORDS) {
        if (g.labels.some((lab) => txt.includes(lab))) return g.key;
      }
      cur = cur.previousElementSibling;
    }
    return 'other';
  }

  function collect() {
    const tables = Array.from(document.querySelectorAll('table'));
    const groups = new Map();
    for (const key of ['strength', 'agility', 'intelligence', 'universal', 'other']) {
      groups.set(key, []);
    }

    for (const table of tables) {
      const group = guessGroupFromAbove(table);
      const rows = Array.from(table.querySelectorAll('tr'));
      for (let r = 1; r < rows.length; r++) { // skip first row as header
        const row = rows[r];
        const firstCell = row.cells && row.cells[0];
        if (!firstCell) continue;
        const img = firstCell.querySelector('img');
        if (!img) continue;
        // Prefer exact hero name from image attributes
        const exactName = (img.getAttribute('title') || img.getAttribute('alt') || '').trim();
        // Try to read hero name from text in first cell (fallback)
        let rawName = exactName || (firstCell.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        // Skip excluded heroes entirely (match by exact alt/title or by text content)
        if (isExcludedName(exactName) || isExcludedName(rawName)) continue;
        // Truncated name only for display/accessibility, after exclusion check
        let name = rawName;
        // Often the first cell has the hero name somewhere after the image
        if (name.length > 40) name = name.slice(0, 40) + '…';

        // Ensure row has an id for deep linking
        if (!row.id) {
          const base = slugify(name) || 'hero-' + r;
          let id = 'hero-' + base;
          let i = 2;
          while (document.getElementById(id)) {
            id = 'hero-' + base + '-' + i++;
          }
          row.id = id;
        }

        groups.get(group).push({
          src: img.src,
          rowId: row.id,
          name,
        });
      }
    }

    return { groups, firstTable: tables[0] || null };
  }

  function findHeadingBefore(table) {
    if (!table) return null;
    const tableTop = table.getBoundingClientRect().top + window.scrollY;
    const matchers = ['силов', 'strength']; // partial to be resilient
    const all = Array.from(document.body.getElementsByTagName('*'));
    let best = null; let bestTop = -Infinity;
    for (const el of all) {
      // Skip elements that are not displayed or very large blocks
      const rect = el.getBoundingClientRect();
      if (!rect || rect.height === 0 || rect.width === 0) continue;
      const top = rect.top + window.scrollY;
      if (top >= tableTop) continue; // must be above table
      const txt = (el.textContent || '').trim().toLowerCase();
      if (!txt) continue;
      // Short text is typical for headings; also accept when class names look like headings but we rely on text
      if (txt.length <= 40 && matchers.some((m) => txt.includes(m))) {
        if (top > bestTop) { bestTop = top; best = el; }
      }
    }
    return best;
  }

  function buildIndex({ groups, firstTable }) {
    if (!firstTable) return;
    const container = document.createElement('section');
    container.className = 'hero-index';
    container.id = 'hero-index';

    // Controls row: title + search input
    const controls = document.createElement('div');
    controls.className = 'hero-index__controls';

    const title = document.createElement('h2');
    title.className = 'hero-index__title';
    title.textContent = 'Быстрый выбор героя';

    const search = document.createElement('input');
    search.className = 'hero-index__search';
    search.type = 'search';
    search.placeholder = 'Поиск героя';
    search.setAttribute('aria-label', 'Поиск героя');

    controls.appendChild(title);
    controls.appendChild(search);
    container.appendChild(controls);

    for (const key of ['strength', 'agility', 'intelligence', 'universal']) {
      const items = groups.get(key) || [];
      if (!items.length) continue;

      const groupWrap = document.createElement('div');
      groupWrap.className = 'hero-group';

      const h = document.createElement('div');
      h.className = 'hero-group__title';
      h.textContent = GROUP_TITLES[key];
      groupWrap.appendChild(h);

      const grid = document.createElement('div');
      grid.className = 'hero-grid';
      for (const it of items) {
        const a = document.createElement('a');
        a.href = '#' + it.rowId; // will be prevented for smooth scroll
        a.className = 'hero-icon';
        a.setAttribute('aria-label', it.name || 'Герой');
        a.setAttribute('data-name', String(it.name || '').toLowerCase());
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById(it.rowId);
          if (!target) return;
          // Calculate offset for sticky header row inside the same table
          let offset = 0;
          const table = target.closest('table');
          if (table) {
            const headerRow = table.querySelector('tr:first-child');
            if (headerRow) offset = headerRow.getBoundingClientRect().height || 0;
          }
          const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset - 4);
          // Smooth scroll to computed position
          window.scrollTo({ top: y, behavior: 'smooth' });
          // Start highlight only when scroll reaches destination (or after timeout)
          const start = performance.now();
          const maxWait = 2000; // ms
          function maybeHighlight() {
            if (Math.abs(window.scrollY - y) <= 2 || performance.now() - start > maxWait) {
              // Remove previous highlights to keep it clean
              document.querySelectorAll('.row-highlight').forEach((el) => el.classList.remove('row-highlight'));
              target.classList.add('row-highlight');
              setTimeout(() => target.classList.remove('row-highlight'), 1600);
            } else {
              requestAnimationFrame(maybeHighlight);
            }
          }
          requestAnimationFrame(maybeHighlight);
        });
        const img = document.createElement('img');
        img.src = it.src;
        img.alt = '';
        a.appendChild(img);
        grid.appendChild(a);
      }
      groupWrap.appendChild(grid);
      container.appendChild(groupWrap);
    }

    // Hook up search interactions
    setupSearch(container);
    // Floating "back to top" button to jump to quick-pick
    setupBackToTop(container, firstTable);

    // Try to insert above the section heading (e.g., "Силовики"), so heading stays directly above its table
    const heading = findHeadingBefore(firstTable);
    // If the heading has a small icon element right above it, include it
    function expandAnchorToIncludeIcon(el){
      if (!el) return el;
      let anchor = el;
      const headTop = el.getBoundingClientRect().top + window.scrollY;
      let prev = el.previousElementSibling;
      for (let i=0; i<3 && prev; i++) {
        const rect = prev.getBoundingClientRect();
        if (!rect || rect.height === 0) break;
        const top = rect.top + window.scrollY;
        // only consider elements close to the heading (decorative icon, etc.)
        if (headTop - top > 80) break;
        const hasImg = !!(prev.querySelector && prev.querySelector('img'));
        const txtLen = ((prev.textContent||'').trim()).length;
        const looksDecorative = hasImg || txtLen <= 3;
        if (looksDecorative) { anchor = prev; prev = prev.previousElementSibling; continue; }
        break;
      }
      return anchor;
    }
    if (heading && heading.parentNode) {
      const anchor = expandAnchorToIncludeIcon(heading);
      anchor.parentNode.insertBefore(container, anchor);
    } else {
      // Fallback: insert before the first table
      firstTable.parentNode.insertBefore(container, firstTable);
    }
  }

  function ensureStyles() {
    if (document.getElementById('hero-index-inline-styles')) return;
    const css = `
      /* Stabilize page background to avoid white flashes */
      html, body{background-color:#0e1218}
      /* Do NOT transform body to keep fixed children positioned by viewport */
      body{backface-visibility:hidden}
      .hero-index{max-width:1127px;margin:10px auto 16px;padding:12px 14px;background:linear-gradient(180deg,var(--panel) 0%,var(--panel-2) 100%);border:1px solid var(--border);border-radius:8px;box-shadow:0 10px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.04)}
      .hero-index__controls{display:flex;align-items:baseline;justify-content:flex-start;gap:8px;margin-bottom:6px;flex-wrap:wrap}
      .hero-index__title{margin:4px 0 8px;font-family:'Cinzel','Times New Roman',serif;font-size:20px;letter-spacing:.4px;color:#e8eaec}
      .hero-index__controls .hero-index__title{margin:0 8px 0 0}
      .hero-index__search{width:280px;max-width:60vw;appearance:none;-webkit-appearance:none;border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:14px;color:#e6e8ea;background:rgba(0,0,0,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);margin-left:10px;position:relative;top:2px}
      .hero-index__search::placeholder{color:#9aa0a6}
      .hero-index__search:focus{outline:none;border-color:#7aa2ff;box-shadow:0 0 0 2px rgba(122,162,255,.18), inset 0 1px 0 rgba(255,255,255,.06)}
      .hero-group{margin:8px 0}
      .hero-group__title{font-family:'Cinzel','Times New Roman',serif;font-size:16px;color:#d8dadc;margin:6px 2px}
      /* Rectangular hero thumbnails, 2x larger */
      .hero-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(64px, 1fr));gap:10px;align-items:center}
      .hero-icon{width:64px;height:36px;border-radius:6px;display:inline-flex;overflow:hidden;border:1px solid var(--border);box-shadow:0 3px 12px rgba(0,0,0,.35);transition:transform .12s ease, box-shadow .12s ease, opacity .15s ease, filter .15s ease;background:rgba(0,0,0,.2)}
      .hero-icon:hover{transform:scale(1.08);box-shadow:0 6px 16px rgba(0,0,0,.45)}
      .hero-icon img{width:100%;height:100%;object-fit:contain;display:block}
      .hero-icon.dim{opacity:.25;filter:grayscale(.85)}
      /* Back-to-top button */
      /* Dota 2 6.84-inspired stone tile with custom texture */
      .back-to-top{position:fixed;right:24px;bottom:24px;width:168px;height:168px; /* ~4x */
        border-radius:22px 16px 20px 14px; /* неровные края */
        border:2px solid rgba(22,24,28,.9);
        background: url('images/Screenshot.png') center/cover no-repeat;
        box-shadow:
          0 18px 48px rgba(0,0,0,.55),
          inset 0 2px 0 rgba(255,255,255,.06),
          inset 0 -4px 0 rgba(0,0,0,.35),
          0 0 0 1px rgba(255,120,80,.08);
        display:grid;place-items:center;opacity:0;transform:translateZ(0) translateY(10px);
        pointer-events:none;transition:opacity .22s ease-out, transform .22s ease-out, box-shadow .15s ease-out;z-index:9999;
        will-change: opacity, transform;backface-visibility:hidden;contain:paint}
      .back-to-top.show{cursor:pointer}
      .back-to-top::after{content:"";position:absolute;inset:0;border-radius:22px 16px 20px 14px;
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.04),
          inset 0 10px 24px rgba(0,0,0,.35),
          inset 0 -30% 40% rgba(0,0,0,.18);
        pointer-events:none}
      .back-to-top svg{width:88px;height:88px;stroke:#e8eaec;stroke-width:3;fill:none}
      .back-to-top:hover{opacity:1;box-shadow:0 22px 60px rgba(0,0,0,.6),inset 0 2px 0 rgba(255,255,255,.08),inset 0 -4px 0 rgba(0,0,0,.38),0 0 0 1px rgba(255,150,110,.16)}
      .back-to-top.show{opacity:.6;transform:translateY(0);pointer-events:auto}
      .back-to-top.show:hover{opacity:1}
      @media (max-width:640px){.back-to-top{right:14px;bottom:14px;width:120px;height:120px;border-radius:18px 14px 16px 12px;background: url('images/Screenshot.png') center/cover no-repeat}.back-to-top svg{width:64px;height:64px}}
      /* Smooth, traveling glow across the row (per cell, synchronized) */
      .row-highlight>td,.row-highlight>th{position:relative;background:transparent}
      .row-highlight>td::after,.row-highlight>th::after{
        content:'';position:absolute;inset:-2px -2px;border-radius:6px;pointer-events:none;
        background:linear-gradient(110deg,
          rgba(183,58,58,0) 0%,
          rgba(183,58,58,.15) 42%,
          rgba(255,220,160,.36) 50%,
          rgba(183,58,58,.15) 58%,
          rgba(183,58,58,0) 100%);
        background-size:200% 100%;
        background-position:-60% 0;
        box-shadow:0 0 0 1px rgba(183,58,58,.35),0 8px 22px rgba(183,58,58,.22),0 0 30px rgba(183,58,58,.26);
        opacity:0; filter:blur(.6px);
        animation:rowSweep 1.6s cubic-bezier(.4,0,.2,1) forwards;
      }
      @keyframes rowSweep{
        0%{opacity:0;background-position:-60% 0}
        15%{opacity:.95}
        85%{opacity:.85}
        100%{opacity:0;background-position:160% 0}
      }
      @media (max-width:640px){.hero-grid{grid-template-columns:repeat(auto-fill, minmax(72px, 1fr));gap:10px}.hero-icon{width:72px;height:40px}}
    `;
    const style = document.createElement('style');
    style.id = 'hero-index-inline-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function setupSearch(container){
    const input = container.querySelector('.hero-index__search');
    if (!input) return;
    const icons = Array.from(container.querySelectorAll('.hero-icon'));
    function applyFilter(){
      const q = (input.value || '').trim().toLowerCase();
      if (!q){ icons.forEach(el=>el.classList.remove('dim')); return; }
      let matches = 0; let lastMatch = null;
      for (const el of icons){
        const name = el.getAttribute('data-name') || '';
        const ok = name.includes(q);
        el.classList.toggle('dim', !ok);
        if (ok){ matches++; lastMatch = el; }
      }
      // If exactly one match, allow Enter to open it
      input.onkeydown = (e)=>{
        if (e.key === 'Enter' && matches === 1 && lastMatch){ lastMatch.click(); }
      };
    }
    input.addEventListener('input', applyFilter);
  }

  function setupBackToTop(container, firstTable){
    try{
      const btn = document.createElement('button');
      btn.className = 'back-to-top';
      btn.type = 'button';
      btn.setAttribute('aria-label','К быстрому выбору');
      document.body.appendChild(btn);

      const heroIndexTop = () => (container.getBoundingClientRect().top + window.scrollY - 6);
      btn.addEventListener('click', ()=>{
        window.scrollTo({ top: Math.max(0, heroIndexTop()), behavior: 'smooth' });
      });

      // Show when scrolled below first data row (robust scroll-based logic)
      const firstRow = firstTable && firstTable.querySelector('tr:nth-child(2)');
      let thresholdTop = 400;
      function computeThreshold(){
        try{
          if (firstRow){
            const header = firstTable.querySelector('tr:first-child');
            const headerH = header ? (header.getBoundingClientRect().height || 0) : 0;
            const rect = firstRow.getBoundingClientRect();
            thresholdTop = rect.top + window.scrollY - Math.max(40, Math.round(headerH));
          } else if (firstTable){
            const rect = firstTable.getBoundingClientRect();
            thresholdTop = rect.top + window.scrollY + 120; // a bit below table top
          } else {
            thresholdTop = 400;
          }
        }catch{ thresholdTop = 400; }
      }
      computeThreshold();
      // Recompute after load and slight delay to account for late layout
      window.addEventListener('load', ()=>{ computeThreshold(); onScroll(); });
      setTimeout(()=>{ computeThreshold(); onScroll(); }, 150);

      let ticking = false;
      function onScroll(){
        if (ticking) return; ticking = true;
        requestAnimationFrame(()=>{
          btn.classList.toggle('show', window.scrollY > thresholdTop);
          ticking = false;
        });
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', ()=>{ computeThreshold(); onScroll(); }, { passive: true });
      window.addEventListener('orientationchange', ()=>{ computeThreshold(); onScroll(); }, { passive: true });
      onScroll();
    }catch(_){}
  }

  function init() {
    try {
      ensureStyles();
      // Remove excluded heroes from list blocks and table first-column rows
      pruneExcludedFromDom();
      pruneExcludedRows();
      // Also prune excluded items from the third column
      pruneExcludedItemsThirdColumn([
        'Spirit Vessel','Wind Waker','Gleipnir','Aeon Disk',"Revenant\'s Brooch",'Infused Raindrops','Disperser','Hurricane Pike','Eternal Shroud','Mage Slayer','Nullifier','Bloodthorn','Echo Sabre','Boots of Bearing'
      ]);
      // Hide standalone "Универсалы" heading and description block (from static content)
      removeUniversalHeadingDescription();
      redistributeUniversalHeroes();
      removeEmptyTrailingTables();
      optimizeImagesForScroll();
      const data = collect();
      buildIndex(data);
    } catch (e) {
      // fail silently to avoid breaking page
      console.error('Hero index init failed:', e);
    }
  }

  // Hint browser to decode images asynchronously and lazy-load offscreen ones
  function optimizeImagesForScroll(){
    try{
      const imgs = Array.from(document.querySelectorAll('table img'));
      for (const img of imgs){
        img.decoding = 'async';
        // Keep first two rows per table eager (more likely above fold)
        const row = img.closest('tr');
        const table = img.closest('table');
        let eager = false;
        if (row && table){
          const rows = Array.from(table.querySelectorAll('tr'));
          const idx = rows.indexOf(row);
          eager = idx >= 0 && idx <= 2; // header + first two data rows
        }
        img.loading = eager ? 'eager' : 'lazy';
        img.fetchPriority = 'low';
      }
    }catch(_){}
  }

  function pruneExcludedFromDom() {
    try {
      const items = Array.from(document.querySelectorAll('li'));
      for (const li of items) {
        const txt = (li.textContent || '').replace(/\s+/g,' ').trim();
        const img = li.querySelector('img');
        const t = (img && (img.getAttribute('title') || img.getAttribute('alt'))) || '';
        if (isExcludedName(t) || isExcludedName(txt)) {
          li.remove();
        }
      }
    } catch (_) {}
  }

  function pruneExcludedRows() {
    try {
      const tables = Array.from(document.querySelectorAll('table'));
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tr'));
        for (let i = 1; i < rows.length; i++) { // skip header
          const row = rows[i];
          const firstCell = row.cells && row.cells[0];
          if (!firstCell) continue;
          const img = firstCell.querySelector('img');
          const candidate = (img && (img.getAttribute('title') || img.getAttribute('alt'))) || firstCell.textContent || '';
          if (isExcludedName(candidate)) {
            row.remove();
          }
        }
      }
    } catch (_) {}
  }

  function pruneExcludedItemsThirdColumn(items) {
    try {
      const norm = (s) => String(s||'').toLowerCase()
        .replace(/[!"#$%&'()*+,./:;<=>?@[\]^_`{|}~-]+/g, ' ')
        .replace(/\s+/g, ' ').trim();
      const targets = (items||[]).map(norm).filter(Boolean);
      const rows = Array.from(document.querySelectorAll('tr'));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 3) continue;
        const cell = cells[2];
        const lis = Array.from(cell.querySelectorAll('li'));
        for (const li of lis) {
          const img = li.querySelector('img');
          const label = (img && (img.getAttribute('title') || img.getAttribute('alt'))) || li.textContent || '';
          const n = norm(label);
          if (targets.some(t => n.includes(t))) {
            li.remove();
          }
        }
      }
    } catch (_) {}
  }

  // Remove the bottom "Универсалы" title and its description paragraph (outside of quick-pick UI)
  function removeUniversalHeadingDescription() {
    try {
      const isInHeroIndex = (el) => !!(el && el.closest && el.closest('.hero-index'));
      const all = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,p'));
      for (const el of all) {
        if (isInHeroIndex(el)) continue;
        const txt = (el.textContent || '').trim().toLowerCase();
        if (!txt) continue;
        if (txt.includes('универсал')) {
          // remove heading element
          const parent = el.parentNode;
          if (parent) {
            // remove the next sibling if it looks like a description (non-table, non-list, longer text)
            let next = el.nextElementSibling;
            if (next && !isInHeroIndex(next)) {
              const tag = (next.tagName || '').toUpperCase();
              const longText = ((next.textContent || '').trim().length > 30);
              const isTable = tag === 'TABLE';
              if (longText && !isTable) next.remove();
            }
            el.remove();
          }
          // Only remove first match to avoid touching other parts
          break;
        }
      }
    } catch (_) {}
  }

  // Remove tables that are left empty (or only with header) after redistribution (e.g., old "Универсалы")
  function removeEmptyTrailingTables() {
    try {
      const tables = Array.from(document.querySelectorAll('table'));
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tr'));
        const bodyRows = rows.slice(1);
        const hasHeroImages = bodyRows.some(r => r.querySelector && r.querySelector('td img'));
        if (rows.length <= 1 || !hasHeroImages) {
          table.remove();
        }
      }
    } catch (_) {}
  }

  function redistributeUniversalHeroes() {
    const map = new Map([
      ['Abaddon','strength'],
      ['Bane','intelligence'],
      ['Batrider','intelligence'],
      ['Beastmaster','strength'],
      ['Brewmaster','strength'],
      ['Broodmother','agility'],
      ['Chen','intelligence'],
      ['Clockwerk','strength'],
      ['Dark Seer','intelligence'],
      ['Dazzle','intelligence'],
      ['Enigma','intelligence'],
      ['Invoker','intelligence'],
      ['Io','strength'],
      ['Lone Druid','agility'],
      ['Lycan','strength'],
      ['Magnus','strength'],
      ['Mirana','agility'],
      ['Nyx Assassin','agility'],
      ['Phoenix','strength'],
      ['Sand King','strength'],
      ['Techies','intelligence'],
      ['Vengeful Spirit','agility'],
      ['Venomancer','intelligence'],
      ['Visage','intelligence'],
      ['Windranger','intelligence'],
      ['Winter Wyvern','intelligence'],
      ['Ogre Magi','intelligence'],
    ]);

    const seeds = {
      strength: ['Axe','Sven','Tiny','Centaur Warrunner','Dragon Knight','Legion Commander','Tidehunter','Magnus','Lycan'],
      agility: ['Juggernaut','Phantom Assassin','Riki','Drow Ranger','Slark','Weaver','Vengeful Spirit','Mirana'],
      intelligence: ['Lina','Lion','Zeus','Crystal Maiden','Rubick','Skywrath Mage','Shadow Shaman','Warlock','Witch Doctor'],
    };

    function getHeroNameFromRow(row){
      const first = row && row.cells && row.cells[0];
      if (!first) return '';
      const img = first.querySelector && first.querySelector('img');
      const name = (img && (img.getAttribute('title') || img.getAttribute('alt'))) || (first.textContent || '');
      return (name || '').replace(/\s+/g,' ').trim();
    }

    const allTables = Array.from(document.querySelectorAll('table'));
    const groupTable = { strength: null, agility: null, intelligence: null };
    for (const table of allTables) {
      const rows = Array.from(table.querySelectorAll('tr'));
      for (let r=1; r<rows.length; r++) {
        const row = rows[r];
        const name = getHeroNameFromRow(row);
        if (!name) continue;
        for (const g of ['strength','agility','intelligence']) {
          if (groupTable[g]) continue;
          const nL = name.toLowerCase();
          if (seeds[g].some(s => nL.includes(String(s).toLowerCase()))) {
            groupTable[g] = table;
          }
        }
      }
      if (groupTable.strength && groupTable.agility && groupTable.intelligence) break;
    }

    if (!groupTable.strength || !groupTable.agility || !groupTable.intelligence) {
      const byOrder = allTables.slice(0,3);
      groupTable.strength = groupTable.strength || byOrder[0] || null;
      groupTable.agility = groupTable.agility || byOrder[1] || null;
      groupTable.intelligence = groupTable.intelligence || byOrder[2] || null;
    }

    for (const [hero, target] of map.entries()) {
      if (!groupTable[target]) continue;
      const hL = hero.toLowerCase();
      // collect all rows across all tables matching this hero
      const matches = [];
      for (const table of allTables) {
        const rows = Array.from(table.querySelectorAll('tr'));
        for (let r=1; r<rows.length; r++) {
          const row = rows[r];
          const first = row.cells && row.cells[0];
          if (!first) continue;
          const img = first.querySelector && first.querySelector('img');
          const exact = (img && (img.getAttribute('title') || img.getAttribute('alt'))) || '';
          const text = (first.textContent || '').replace(/\s+/g,' ').trim();
          const exL = String(exact||'').toLowerCase();
          const txL = String(text||'').toLowerCase();
          if ((exL && exL === hL) || (txL && txL.includes(hL))) {
            matches.push({ row, table });
          }
        }
      }
      if (!matches.length) continue;
      // ensure exactly one row ends up in target table; remove duplicates elsewhere
      const targetTable = groupTable[target];
      let kept = false;
      for (const m of matches) {
        if (m.table === targetTable && !kept) { kept = true; continue; }
        // remove non-target or duplicate rows
        try { m.row.remove(); } catch (_) {}
      }
      if (!kept) {
        // Move first occurrence to target
        const m = matches[0];
        try {
          const header = targetTable.querySelector('tr:first-child');
          if (m.row.parentNode) m.row.parentNode.removeChild(m.row);
          if (header && header.parentNode) header.parentNode.appendChild(m.row); else targetTable.appendChild(m.row);
        } catch (_) {}
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

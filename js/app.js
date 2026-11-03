// 5IVESAW — Application Shell & Router.
// Fast, zero-build static portal with YouTube streaming background music, in-browser tools & repo demos.
import {
  $, $$, icon, formatBytes, formatTime, download, copyText, toast, store, cssVar, onThemeChange, fitCanvas
} from './core/util.js';
import { sfx } from './core/sfx.js';
import { music, thumb } from './core/music.js';
import { TOOLS, DEMOS } from './registry.js';

// SVG icons for languages
const LANG_ICONS = {
  rust: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V18h-2v-1.07A6 6 0 0 1 6.07 12H5v-2h1.07A6 6 0 0 1 11 4.07V3h2v1.07A6 6 0 0 1 17.93 10H19v2h-1.07A6 6 0 0 1 13 16.93z"/></svg>',
  typescript: '<svg class="w-4 h-4 text-[#3178C6]" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="#3178C6"/><path d="M11.5 13.5H9.2v5H7.7v-5H5.5V12h6v1.5zm6.8 2.2c-.3-.2-.8-.4-1.4-.6-.7-.2-1.1-.4-1.3-.7-.2-.2-.3-.5-.3-.9 0-.4.2-.8.5-1 .3-.3.8-.4 1.5-.4.5 0 1 .1 1.4.3.4.2.7.5.8.9l-1.2.7c-.2-.4-.5-.6-1-.6s-.8.2-.8.5c0 .2.1.4.3.5.2.1.6.3 1.2.5.8.3 1.3.6 1.6 1 .3.3.4.8.4 1.3 0 .6-.2 1.1-.6 1.4-.4.4-1.1.6-1.9.6-.7 0-1.3-.2-1.8-.5-.5-.4-.8-.9-.9-1.5l1.3-.6c.1.4.3.7.6.9.3.2.7.3 1.1.3.4 0 .7-.1.9-.3.2-.2.3-.4.3-.6 0-.2-.1-.4-.3-.5z" fill="#fff"/></svg>',
  python: '<svg class="w-4 h-4 text-[#3776AB]" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9 2c-3.1 0-4.9 1.4-4.9 3.9v2.2h5.1V9H4.8C2.5 9 1 10.6 1 13.4c0 2.9 1.8 4.6 4.3 4.6h1.7v-2.3c0-2.4 1.7-4.1 4.1-4.1h5.1V9.4c0-2.6-1.9-4.1-4.3-4.1V2zm-2.4 1.8c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm2.6 18.2c3.1 0 4.9-1.4 4.9-3.9v-2.2h-5.1V15h7.3c2.3 0 3.8-1.6 3.8-4.4 0-2.9-1.8-4.6-4.3-4.6h-1.7v2.3c0 2.4-1.7 4.1-4.1 4.1H9.8v2.2c0 2.6 1.9 4.1 4.3 4.1V22zm2.4-1.8c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z"/></svg>',
  lua: '<svg class="w-4 h-4 text-[#000080]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="15.5" cy="8.5" r="3" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/></svg>',
  java: '<svg class="w-4 h-4 text-[#E76F00]" viewBox="0 0 24 24" fill="currentColor"><path d="M7.7 17.5s-.8.6.6.8c1.7.3 2.8.2 4.9-.2 0 0 .7.4 1.7.7-5.8 2.6-11.4-.4-7.2-1.3zm1.1-2.4s-1 .8.5.9c2 .2 3.8.3 6.9-.4 0 0 .5.4 1.2.6-6.6 2.3-12.7-.1-8.6-1.1zm4.7-6.2c.8 1 0 1.9-.9 2.7-1 1-1.6 1.8-.7 3.3.4-.6.9-1.2.9-1.8 0-.9-.7-1.4-.4-2.2.4-.9 1.1-1.4 1.1-2z"/></svg>',
  javascript: '<svg class="w-4 h-4 text-[#F7DF1E]" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="#F7DF1E"/><path d="M12.5 15.8c.2.9.7 1.4 1.6 1.4.7 0 1.2-.4 1.2-1 0-.7-.5-1-1.5-1.4l-.5-.2c-1.5-.6-2.5-1.4-2.5-3 0-1.8 1.4-3.1 3.6-3.1 1.6 0 2.7.6 3.3 1.9l-1.6 1c-.3-.7-.8-1-1.6-1-.7 0-1.1.4-1.1.9 0 .6.4.9 1.3 1.2l.5.2c1.8.7 2.8 1.5 2.8 3.2 0 2-1.6 3.2-3.8 3.2-2.1 0-3.4-1.1-3.8-2.5l2.1-.8zm-4.7-7.2h2.2v7.6c0 1.7-.8 2.3-2.3 2.3-.5 0-1.1-.1-1.5-.2l.3-1.8c.3.1.6.1.9.1.6 0 .8-.2.8-1V8.6z" fill="#000"/></svg>',
  html: '<svg class="w-4 h-4 text-[#E34F26]" viewBox="0 0 24 24" fill="currentColor"><path d="M3 2l1.6 18.2L12 22l7.4-1.8L21 2H3zm14.3 5.4h-7.7l.2 2.3h7.3l-.6 6.7-4.5 1.2-4.5-1.2-.3-3.4h2.2l.2 1.6 2.4.6 2.4-.6.3-3.1H6.7L6 4.3h11.6l-.3 3.1z"/></svg>',
  css: '<svg class="w-4 h-4 text-[#1572B6]" viewBox="0 0 24 24" fill="currentColor"><path d="M3 2l1.6 18.2L12 22l7.4-1.8L21 2H3zm14.3 5.4h-7.7l.2 2.3h7.3l-.6 6.7-4.5 1.2-4.5-1.2-.3-3.4h2.2l.2 1.6 2.4.6 2.4-.6.3-3.1H6.7L6 4.3h11.6l-.3 3.1z"/></svg>',
  c: '<svg class="w-4 h-4 text-[#A8B9CC]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/></svg>',
  powershell: '<svg class="w-4 h-4 text-[#5391FE]" viewBox="0 0 24 24" fill="currentColor"><path d="M2 4h20v16H2V4zm4 4l5 4-5 4v-2l2.5-2L6 10V8zm7 8h6v2h-6v-2z"/></svg>',
  shell: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v16H3V4zm3 3l5 5-5 5v-2l3-3-3-3V7zm7 10h6v2h-6v-2z"/></svg>',
  default: '<svg class="w-4 h-4 opacity-60" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>'
};

function getLangIcon(lang) {
  const k = (lang || '').toLowerCase();
  if (k.includes('rust')) return LANG_ICONS.rust;
  if (k.includes('typescript') || k === 'ts') return LANG_ICONS.typescript;
  if (k.includes('python') || k === 'py') return LANG_ICONS.python;
  if (k.includes('lua')) return LANG_ICONS.lua;
  if (k.includes('java') && !k.includes('script')) return LANG_ICONS.java;
  if (k.includes('javascript') || k === 'js') return LANG_ICONS.javascript;
  if (k.includes('html')) return LANG_ICONS.html;
  if (k.includes('css')) return LANG_ICONS.css;
  if (k.includes('c++') || k === 'c') return LANG_ICONS.c;
  if (k.includes('powershell')) return LANG_ICONS.powershell;
  if (k.includes('shell') || k.includes('bash')) return LANG_ICONS.shell;
  return LANG_ICONS.default;
}

// App State
const state = {
  route: '',
  repos: [],
  youtubeItems: [],
  currentUnmount: null,
  scope: 'flagship',
  filter: 'all',
  searchQuery: '',
  activeModalRepo: null,
  activeVideo: null,
  csmBoost: 1
};

// Theme palettes
const THEMES = {
  latte: 'Velvet Latte',
  cream: 'Warm Oat Cream',
  readme: 'README Crimson',
  chainsaw: 'Chainsaw Man ⚡',
  ostania: 'Ostania Emerald',
  cyber: 'Cyber Cobalt'
};

function applyTheme(tone, x, y) {
  const rootEl = document.documentElement;
  if (x && y && document.startViewTransition) {
    rootEl.style.setProperty('--vt-x', `${x}px`);
    rootEl.style.setProperty('--vt-y', `${y}px`);
    document.startViewTransition(() => {
      rootEl.setAttribute('data-tone', tone);
    });
  } else {
    rootEl.setAttribute('data-tone', tone);
  }
  store.set('tone', tone);
  $$('.tone-btn').forEach(b => b.classList.toggle('active-tone', b.dataset.setTone === tone));
  const lbl = $('#activeToneLabel');
  if (lbl) lbl.textContent = THEMES[tone] || tone;
  sfx('toggleOn');
}

// Hero background particle canvas
function initHeroCanvas() {
  const canvas = $('#heroFieldCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;
  let mx = -1000, my = -1000;
  let phase = 0;

  function resize() {
    w = canvas.width = canvas.parentElement.clientWidth;
    h = canvas.height = canvas.parentElement.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  canvas.parentElement.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener('mouseleave', () => { mx = -1000; my = -1000; });

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const accent = cssVar('--accent') || '#942929';
    ctx.fillStyle = accent;

    const spacing = 28;
    phase += 0.024 * state.csmBoost;

    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        const dx = x - mx;
        const dy = y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin(x * 0.022 + y * 0.022 + phase) * (2.2 * state.csmBoost);
        let pushX = 0, pushY = 0, radius = 1.2, alpha = 0.2;

        if (dist < 120 && dist > 0.1) {
          const force = (120 - dist) / 120;
          pushX = (dx / dist) * force * 14;
          pushY = (dy / dist) * force * 14;
          radius = 1.2 + force * 1.6;
          alpha = 0.2 + force * 0.5;
        }

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x + pushX, y + pushY + wave, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// Router
async function navigate() {
  const hash = location.hash.slice(1) || '/';
  if (state.currentUnmount) {
    try { state.currentUnmount(); } catch (e) { console.error(e); }
    state.currentUnmount = null;
  }

  const main = $('#appMain');
  const homeSections = $('#homeSections');
  const subViewContainer = $('#subViewContainer');

  if (hash === '/' || hash === '') {
    // Show Home
    homeSections.classList.remove('hidden');
    subViewContainer.classList.add('hidden');
    subViewContainer.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Hide home, show sub-view
  homeSections.classList.add('hidden');
  subViewContainer.classList.remove('hidden');
  subViewContainer.innerHTML = `
    <div class="view-head">
      <div class="crumbs">
        <a href="#/">Home</a> <span>/</span> <span id="crumbCurrent">...</span>
      </div>
      <a href="#/" class="btn sm ghost">${icon('arrowLeft')} Back to Portal</a>
    </div>
    <div id="subViewMount" class="view-enter"></div>
  `;

  const mountPoint = $('#subViewMount');
  const crumb = $('#crumbCurrent');

  if (hash.startsWith('/tools/')) {
    const id = hash.replace('/tools/', '');
    const tool = TOOLS.find(t => t.id === id);
    if (!tool) {
      mountPoint.innerHTML = `<div class="card pad center"><p>Tool "${id}" not found.</p><a href="#/" class="btn sm primary" style="margin-top:10px;">Return Home</a></div>`;
      return;
    }
    crumb.textContent = tool.title;
    try {
      const mod = await import(tool.module);
      state.currentUnmount = mod.default.mount(mountPoint, { toast, sfx, store });
    } catch (err) {
      console.error(err);
      mountPoint.innerHTML = `<div class="card pad center"><p class="accent">Failed to load tool module.</p><p class="xs mono faint">${err.message}</p></div>`;
    }
  } else if (hash.startsWith('/demos/')) {
    const id = hash.replace('/demos/', '');
    const demo = DEMOS.find(d => d.id === id);
    if (!demo) {
      mountPoint.innerHTML = `<div class="card pad center"><p>Demo "${id}" not found.</p><a href="#/" class="btn sm primary" style="margin-top:10px;">Return Home</a></div>`;
      return;
    }
    crumb.textContent = demo.title;

    if (demo.live) {
      // Live iframe preview
      mountPoint.innerHTML = `
        <div class="card pad" style="padding:16px;">
          <div class="row between wrap" style="margin-bottom:12px;">
            <div class="row">
              <span class="badge" style="background:var(--accent);">Live Build</span>
              <span class="mono xs font-semibold">${demo.title}</span>
            </div>
            <a href="${demo.url}" target="_blank" rel="noopener noreferrer" class="btn sm primary">
              ${icon('external')} Open in Fullscreen Window ↗
            </a>
          </div>
          <div style="width:100%;height:75vh;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);background:#000;">
            <iframe src="${demo.url}" style="width:100%;height:100%;border:0;" allowfullscreen></iframe>
          </div>
        </div>
      `;
    } else {
      try {
        const mod = await import(demo.module);
        state.currentUnmount = mod.default.mount(mountPoint, { toast, sfx, store });
      } catch (err) {
        console.error(err);
        mountPoint.innerHTML = `<div class="card pad center"><p class="accent">Failed to load demo module.</p><p class="xs mono faint">${err.message}</p></div>`;
      }
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Repositories Rendering
function renderRepositories() {
  const container = $('#repoContainer');
  const countBadge = $('#repoCountBadge');
  if (!container) return;

  const q = state.searchQuery.toLowerCase().trim();
  const filtered = state.repos.filter(r => {
    const matchesScope = state.scope === 'all' || q.length > 0 || state.filter !== 'all' ? true : (r.stars > 0 || r.icon || r.name.toLowerCase().includes('saw'));
    const matchesCat = state.filter === 'all' ||
      (state.filter === 'systems' && (r.lang === 'Rust' || r.lang === 'C' || r.lang === 'Java' || r.lang === 'Lua')) ||
      (state.filter === 'interface' && (r.lang === 'TypeScript' || r.lang === 'JavaScript' || r.lang === 'HTML')) ||
      (state.filter === 'tooling' && (r.lang === 'Python' || r.lang === 'PowerShell' || r.lang === 'Shell'));
    const matchesSearch = !q || r.name.toLowerCase().includes(q) || (r.desc && r.desc.toLowerCase().includes(q)) || (r.lang && r.lang.toLowerCase().includes(q));
    return matchesScope && matchesCat && matchesSearch;
  });

  if (countBadge) countBadge.textContent = `Showing ${filtered.length} of ${state.repos.length} repositories`;

  if (!filtered.length) {
    container.innerHTML = `<div class="card pad center mono xs faint" style="grid-column:1/-1;">No repositories match query "${q}".</div>`;
    return;
  }

  container.innerHTML = filtered.map((r, i) => `
    <article data-repo-id="${r.name}" class="tile hover repo-cartridge pop-in" style="--i:${i % 12};cursor:pointer;">
      <div class="row between xs mono faint pb-1" style="border-bottom:1px solid var(--line);">
        <span class="row">
          ${r.icon ? `<img src="${r.icon}" alt="" class="w-4 h-4 rounded object-contain" onerror="this.style.display='none'"/>` : getLangIcon(r.lang)}
          <strong style="color:var(--ink);">#${String(i + 1).padStart(2, '0')}</strong>
        </span>
        <span>${r.stars > 0 ? `★ ${r.stars}` : (r.fork ? 'Fork' : 'Source')}</span>
      </div>

      <div class="row between" style="margin:4px 0;">
        <h3 class="mono font-semibold truncate" style="font-size:14px;color:var(--ink);">${r.name}</h3>
      </div>

      <p class="xs muted clamp-2" style="min-height:32px;">${r.desc || 'Public repository by @5ivesaw.'}</p>

      <div class="row between xs mono faint" style="margin-top:auto;padding-top:6px;border-top:1px solid var(--line);">
        <span class="row">${getLangIcon(r.lang)} <span>${r.lang || 'Code'}</span></span>
        <span class="accent">Inspect ↗</span>
      </div>
    </article>
  `).join('');
}

// Media & YouTube Transmissions
function renderTransmissions() {
  const container = $('#mediaGridContainer');
  if (!container || !state.youtubeItems.length) return;

  container.innerHTML = state.youtubeItems.map(item => `
    <article data-yt-id="${item.id}" data-yt-title="${item.t.replace(/"/g, '&quot;')}" class="tile hover repo-cartridge pop-in" style="padding:0;overflow:hidden;cursor:pointer;">
      <div style="position:relative;aspect-ratio:16/9;background:#000;">
        <img src="https://i.ytimg.com/vi/${item.id}/hqdefault.jpg" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>
        <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.75), transparent);display:flex;align-items:flex-end;justify-content:space-between;padding:8px 10px;">
          <span class="badge" style="background:rgba(0,0,0,0.75);font-size:9.5px;">${item.k === 'shorts' ? '⚡ Short' : '▶ Video'}</span>
          <span class="badge" style="font-size:9.5px;">${formatTime(item.d)}</span>
        </div>
      </div>
      <div style="padding:12px 14px;">
        <h4 class="mono font-semibold xs clamp-2" style="color:var(--ink);">${item.t}</h4>
        <div class="row between xs mono faint" style="margin-top:8px;">
          <span>${item.views || 'Transmitted'}</span>
          <span>${item.date || ''}</span>
        </div>
      </div>
    </article>
  `).join('');
}

// Render Tools Grid on Home Page
function renderToolsGrid() {
  const container = $('#toolsGrid');
  if (!container) return;
  container.innerHTML = TOOLS.map(t => `
    <a href="#/tools/${t.id}" class="tile hover pop-in" style="padding:16px;">
      <div class="row between">
        <span class="tl-sticker" style="font-size:9px;padding:2px 8px;">${icon(t.icon)} TOOL</span>
        <span class="accent">Launch ↗</span>
      </div>
      <h3 class="font-semibold" style="margin-top:6px;font-size:16px;color:var(--ink);">${t.title}</h3>
      <p class="xs muted clamp-2">${t.blurb}</p>
      <div class="row wrap xs mono faint" style="margin-top:auto;gap:4px;">
        ${t.tags.map(tag => `<span class="chip xs" style="padding:2px 7px;">#${tag}</span>`).join('')}
      </div>
    </a>
  `).join('');
}

// Render Demos Grid on Home Page
function renderDemosGrid() {
  const container = $('#demosGrid');
  if (!container) return;
  container.innerHTML = DEMOS.map(d => `
    <a href="#/demos/${d.id}" class="tile hover pop-in" style="padding:16px;">
      <div class="row between">
        <span class="badge" style="font-size:9px;">${d.repo}</span>
        <span class="accent">${d.live ? 'Play Live ↗' : 'Run Demo ↗'}</span>
      </div>
      <h3 class="font-semibold" style="margin-top:6px;font-size:16px;color:var(--ink);">${d.title}</h3>
      <p class="xs muted clamp-2">${d.blurb}</p>
    </a>
  `).join('');
}

// Music Dock UI Wiring
function initMusicDock() {
  const dock = $('#musicDock');
  const playBtn = $('#dockPlayBtn');
  const prevBtn = $('#dockPrevBtn');
  const nextBtn = $('#dockNextBtn');
  const stopBtn = $('#dockStopBtn');
  const titleEl = $('#dockTitle');
  const artistEl = $('#dockArtist');
  const thumbEl = $('#dockThumb');
  const progressEl = $('#dockProgress');
  const timeCurEl = $('#dockTimeCur');
  const timeDurEl = $('#dockTimeDur');
  const volSlider = $('#dockVolSlider');
  const muteBtn = $('#dockMuteBtn');
  const shuffleBtn = $('#dockShuffleBtn');
  const repeatBtn = $('#dockRepeatBtn');
  const queueToggle = $('#dockQueueToggle');
  const queueDrawer = $('#dockQueueDrawer');
  const queueList = $('#dockQueueList');

  // Update track meta
  function updateTrackMeta(t) {
    if (!t) return;
    titleEl.textContent = t.t || 'Unknown Track';
    artistEl.textContent = t.a || 'FiveSaw';
    thumbEl.src = thumb(t.id, 'default');
    timeDurEl.textContent = formatTime(t.d || 0);
  }

  music.on('track', updateTrackMeta);

  music.on('state', st => {
    if (st === 'playing') {
      playBtn.innerHTML = icon('pause');
      playBtn.title = 'Pause';
      thumbEl.classList.add('playing');
    } else {
      playBtn.innerHTML = icon('play');
      playBtn.title = 'Play';
      thumbEl.classList.remove('playing');
    }
  });

  music.on('time', ({ time, duration }) => {
    timeCurEl.textContent = formatTime(time);
    timeDurEl.textContent = formatTime(duration);
    const pct = duration > 0 ? (time / duration) * 100 : 0;
    progressEl.style.width = `${pct}%`;
  });

  music.on('volume', v => {
    volSlider.value = v;
    muteBtn.innerHTML = music.muted ? icon('mute') : icon('vol');
  });

  music.on('mode', () => {
    shuffleBtn.classList.toggle('primary', music.shuffle);
    repeatBtn.classList.toggle('primary', music.repeat !== 'off');
    repeatBtn.title = `Repeat: ${music.repeat.toUpperCase()}`;
  });

  // Dock interactions
  playBtn.addEventListener('click', () => { music.toggle(); sfx('click'); });
  prevBtn.addEventListener('click', () => { music.prev(); sfx('click'); });
  nextBtn.addEventListener('click', () => { music.next(); sfx('click'); });
  stopBtn.addEventListener('click', () => { music.stop(); sfx('click'); });
  muteBtn.addEventListener('click', () => { music.toggleMute(); sfx('toggleOn'); });

  volSlider.addEventListener('input', e => {
    music.setVolume(Number(e.target.value));
  });

  shuffleBtn.addEventListener('click', () => {
    music.setShuffle(!music.shuffle);
    sfx('toggleOn');
  });

  repeatBtn.addEventListener('click', () => {
    music.cycleRepeat();
    sfx('toggleOn');
  });

  // Scrubbing progress
  const progressTrack = $('#dockProgressTrack');
  progressTrack.addEventListener('click', e => {
    const rect = progressTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    music.seek(ratio * (music.duration || music.track?.d || 100));
    sfx('tick');
  });

  // Up Next Queue Drawer
  queueToggle.addEventListener('click', () => {
    queueDrawer.classList.toggle('hidden');
    if (!queueDrawer.classList.contains('hidden')) {
      renderQueueDrawer();
    }
    sfx('click');
  });

  function renderQueueDrawer() {
    const upcoming = music.upNext(8);
    queueList.innerHTML = upcoming.map((t, idx) => `
      <div class="row between xs mono p-2 hover:bg-paper-surface rounded cursor-pointer" data-queue-id="${t.id}">
        <div class="row truncate">
          <img src="${thumb(t.id, 'default')}" alt="" class="w-7 h-7 rounded object-cover" />
          <div class="truncate">
            <div class="font-semibold text-paper-ink truncate">${t.t}</div>
            <div class="faint text-[10px] truncate">${t.a}</div>
          </div>
        </div>
        <span class="faint shrink-0">${formatTime(t.d)}</span>
      </div>
    `).join('');
  }

  queueList.addEventListener('click', e => {
    const item = e.target.closest('[data-queue-id]');
    if (!item) return;
    const id = item.dataset.queueId;
    const idx = music.tracks.findIndex(t => t.id === id);
    if (idx >= 0) {
      music.playAt(idx);
      queueDrawer.classList.add('hidden');
      sfx('click');
    }
  });

  // Start music engine
  music.init();
}

// Overview scroller
function initOverviewScroller() {
  const scroller = $('#workspacesScroller');
  const card = $('#overviewCard');
  if (!scroller || !card) return;

  card.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      scroller.scrollLeft += e.deltaY * 1.5;
    }
  }, { passive: false });

  const tray = $('#workspacesTray');
  if (tray) {
    tray.innerHTML = state.repos.slice(0, 24).map(r => `
      <button type="button" data-repo-jump="${r.name}" class="ws-item-btn text-xs font-mono" title="${r.name}">
        ${r.icon ? `<img src="${r.icon}" alt="" class="w-4 h-4 object-contain rounded"/>` : getLangIcon(r.lang)}
        <span class="ws-short-label">${r.name.slice(0, 8)}</span>
      </button>
    `).join('');
  }

  tray.addEventListener('click', e => {
    const btn = e.target.closest('[data-repo-jump]');
    if (!btn) return;
    const name = btn.dataset.repoJump;
    openRepoModal(name);
    sfx('click');
  });
}

// Modals
function openRepoModal(repoName) {
  const repo = state.repos.find(r => r.name === repoName);
  if (!repo) return;
  state.activeModalRepo = repo;

  $('#modalRepoName').textContent = repo.name;
  $('#modalRepoDesc').textContent = repo.desc || repo.readme || 'No description provided.';
  $('#modalRepoLang').innerHTML = `${getLangIcon(repo.lang)} <span>${repo.lang || 'Code'}</span>`;
  $('#modalRepoStars').textContent = `★ ${repo.stars || 0}`;
  $('#modalRepoClone').textContent = `git clone https://github.com/5ivesaw/${repo.name}.git`;
  $('#modalRepoGithubLink').href = `https://github.com/5ivesaw/${repo.name}`;

  const iconHolder = $('#modalRepoIconHolder');
  iconHolder.innerHTML = repo.icon
    ? `<img src="${repo.icon}" alt="" class="w-10 h-10 object-contain rounded"/>`
    : getLangIcon(repo.lang);

  const m = $('#repoModal');
  m.classList.remove('hidden');
  m.classList.add('open');
  sfx('open');
}

function closeRepoModal() {
  const m = $('#repoModal');
  m.classList.remove('open');
  m.classList.add('hidden');
  sfx('close');
}

// Global Video Modal
function openVideoModal(id, title) {
  $('#videoModalTitle').textContent = title || 'FiveSaw Transmission';
  $('#videoModalIframe').src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
  $('#videoModalExternalLink').href = `https://www.youtube.com/watch?v=${id}`;

  const m = $('#videoPlayerModal');
  m.classList.remove('hidden');
  m.classList.add('open');
  sfx('open');
}

function closeVideoModal() {
  $('#videoModalIframe').src = 'about:blank';
  const m = $('#videoPlayerModal');
  m.classList.remove('open');
  m.classList.add('hidden');
  sfx('close');
}

// Command Palette (Ctrl+K)
function openCmdPalette() {
  const m = $('#cmdPaletteModal');
  const input = $('#cmdPaletteInput');
  m.classList.remove('hidden');
  m.classList.add('open');
  input.value = '';
  renderCmdResults('');
  setTimeout(() => input.focus(), 40);
  sfx('open');
}

function closeCmdPalette() {
  const m = $('#cmdPaletteModal');
  m.classList.remove('open');
  m.classList.add('hidden');
  sfx('close');
}

function renderCmdResults(q) {
  const query = q.toLowerCase().trim();
  const res = $('#cmdPaletteResults');

  const items = [
    ...TOOLS.map(t => ({ label: `Tool: ${t.title}`, sub: 'Tools', action: () => location.hash = `#/tools/${t.id}` })),
    ...DEMOS.map(d => ({ label: `Demo: ${d.title}`, sub: 'Demos', action: () => location.hash = `#/demos/${d.id}` })),
    ...Object.entries(THEMES).map(([k, name]) => ({ label: `Theme: ${name}`, sub: 'Palette', action: () => applyTheme(k) })),
    ...state.repos.slice(0, 15).map(r => ({ label: `Repo: ${r.name}`, sub: r.lang || 'Code', action: () => openRepoModal(r.name) }))
  ].filter(it => !query || it.label.toLowerCase().includes(query) || it.sub.toLowerCase().includes(query)).slice(0, 12);

  res.innerHTML = items.map((it, idx) => `
    <button type="button" class="row between w-full p-2 hover:bg-paper-surface rounded text-left xs mono" data-cmd-idx="${idx}">
      <span class="text-paper-ink font-medium">${it.label}</span>
      <span class="badge" style="font-size:9px;">${it.sub}</span>
    </button>
  `).join('');

  res.onclick = e => {
    const btn = e.target.closest('[data-cmd-idx]');
    if (!btn) return;
    const idx = Number(btn.dataset.cmdIdx);
    closeCmdPalette();
    items[idx]?.action();
  };
}

// Initializer
async function initApp() {
  // Hydrate static data-icons
  $$('[data-icon]').forEach(el => {
    el.innerHTML = icon(el.dataset.icon);
  });

  // Load saved theme
  const savedTone = store.get('tone', 'latte');
  applyTheme(savedTone);

  // Fetch local data (pre-baked for instant load)
  try {
    const [rRes, yRes] = await Promise.all([
      fetch('./data/repos.json'),
      fetch('./data/youtube.json')
    ]);
    const rData = await rRes.json();
    const yData = await yRes.json();
    state.repos = rData.repos || [];
    state.youtubeItems = yData.items || [];
  } catch (e) {
    console.error('Data load error', e);
  }

  // Update repository stat counters
  const statRepos = $('#statRepos');
  if (statRepos) statRepos.textContent = state.repos.length;

  // Mount components
  renderToolsGrid();
  renderDemosGrid();
  renderRepositories();
  renderTransmissions();
  initOverviewScroller();
  initMusicDock();
  initHeroCanvas();

  // Wire Topbar & Search
  $('#openCmdPaletteBtn')?.addEventListener('click', openCmdPalette);
  $('#closeCmdPaletteBtn')?.addEventListener('click', closeCmdPalette);
  $('#cmdPaletteInput')?.addEventListener('input', e => renderCmdResults(e.target.value));

  // Socials modal
  const socialsModal = $('#socialsDropdown');
  const openSocials = () => { socialsModal.classList.remove('hidden'); socialsModal.classList.add('open'); sfx('open'); };
  const closeSocials = () => { socialsModal.classList.remove('open'); socialsModal.classList.add('hidden'); sfx('close'); };
  $('#socialsMenuBtn')?.addEventListener('click', openSocials);
  $('#heroOpenSocialsBtn')?.addEventListener('click', openSocials);
  $('#closeSocialsLauncherBtn')?.addEventListener('click', closeSocials);

  // Chainsaw Ripcord Mode
  $('#revChainsawBtn')?.addEventListener('click', () => {
    state.csmBoost = 6;
    sfx('rev');
    toast('⚡ CHAINSAW RIPCORD ENGAGED!', 'ok');
    setTimeout(() => state.csmBoost = 1, 2400);
  });

  // Sound effects toggle
  const sfxToggleBtn = $('#sfxToggleBtn');
  if (sfxToggleBtn) {
    sfxToggleBtn.addEventListener('click', () => {
      sfx.setEnabled(!sfx.isEnabled());
      sfxToggleBtn.classList.toggle('primary', sfx.isEnabled());
      sfxToggleBtn.title = `Sound Effects: ${sfx.isEnabled() ? 'ON' : 'MUTED'}`;
      toast(`Sound Effects ${sfx.isEnabled() ? 'Enabled' : 'Muted'}`, 'info');
      if (sfx.isEnabled()) sfx('success');
    });
  }

  // Repo search & filter tabs
  $('#repoSearchInput')?.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderRepositories();
  });

  $$('.repo-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.repo-filter-btn').forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
      state.filter = btn.dataset.filter;
      renderRepositories();
      sfx('click');
    });
  });

  $('#scopeFlagshipBtn')?.addEventListener('click', () => {
    state.scope = 'flagship';
    $('#scopeFlagshipBtn').classList.add('bg-paper-elevated');
    $('#scopeAllReposBtn').classList.remove('bg-paper-elevated');
    renderRepositories();
    sfx('click');
  });
  $('#scopeAllReposBtn')?.addEventListener('click', () => {
    state.scope = 'all';
    $('#scopeAllReposBtn').classList.add('bg-paper-elevated');
    $('#scopeFlagshipBtn').classList.remove('bg-paper-elevated');
    renderRepositories();
    sfx('click');
  });

  // Modals close buttons
  $('#closeRepoModalBtn')?.addEventListener('click', closeRepoModal);
  $('#closeVideoModalBtn')?.addEventListener('click', closeVideoModal);
  $('#copyModalCloneBtn')?.addEventListener('click', () => {
    if (state.activeModalRepo) {
      copyText(`git clone https://github.com/5ivesaw/${state.activeModalRepo.name}.git`);
      toast('Copied clone command', 'ok');
      sfx('copy');
    }
  });

  // Repos click to modal
  $('#repoContainer')?.addEventListener('click', e => {
    const card = e.target.closest('[data-repo-id]');
    if (card) openRepoModal(card.dataset.repoId);
  });

  // Video click to modal
  $('#mediaGridContainer')?.addEventListener('click', e => {
    const card = e.target.closest('[data-yt-id]');
    if (card) openVideoModal(card.dataset.ytId, card.dataset.ytTitle);
  });

  // Theme buttons
  $$('.tone-btn').forEach(btn => {
    btn.addEventListener('click', e => applyTheme(btn.dataset.setTone, e.clientX, e.clientY));
  });

  // Morph Title
  const morphBtn = $('#morphBrandBtn');
  const firstGlyph = $('#brandFirstGlyph');
  let morphed = false;
  if (morphBtn && firstGlyph) {
    morphBtn.addEventListener('click', () => {
      morphed = !morphed;
      firstGlyph.textContent = morphed ? 'S' : '5';
      sfx('tick');
      toast(morphed ? 'FIVESAW (S Mode)' : '5IVESAW (5 ≡ S Mode)', 'info');
    });
  }

  // Copy CLI Snippet button
  $('#copyCliBtn')?.addEventListener('click', () => {
    copyText('gh repo clone 5ivesaw/Sawbyte');
    toast('Copied CLI clone command', 'ok');
    sfx('copy');
  });

  // Global Keyboard shortcuts
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCmdPalette();
      return;
    }
    if (e.key === 'Escape') {
      closeRepoModal();
      closeVideoModal();
      closeCmdPalette();
      closeSocials();
    }
  });

  // Router listener
  window.addEventListener('hashchange', navigate);
  navigate();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

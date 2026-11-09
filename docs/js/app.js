import { discMaker } from './core/disc-maker.js';
import { mountDiscMakerPage } from './core/disc-maker-ui.js';
// 5IVESAW — Application Shell & Router.
// Fast, zero-build static portal with YouTube streaming background music, in-browser tools & repo demos.
import {
  $, $$, icon, formatBytes, formatTime, download, copyText, toast, store, cssVar, onThemeChange, fitCanvas
} from './core/util.js';
import { sfx } from './core/sfx.js';
import { music, thumb } from './core/music.js';
import { TOOLS, DEMOS } from './registry.js';
import fiveTube from './tube/5tube.js?v=2.5';
import { initContextMenu } from './core/context-menu.js';
import { initCustomCursor } from './core/cursor.js';
import { initMusicVibeReactor } from './core/vibe-reactor.js';

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

// Hero background particle canvas (Optimized: 0 style recalcs, pauses when offscreen or in subviews)
function initHeroCanvas() {
  const canvas = $('#heroFieldCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;
  let mx = -1000, my = -1000;
  let phase = 0;
  let cachedAccent = cssVar('--accent') || '#942929';
  onThemeChange(() => { cachedAccent = cssVar('--accent') || '#942929'; });

  function resize() {
    w = canvas.width = canvas.parentElement.clientWidth;
    h = canvas.height = canvas.parentElement.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  canvas.parentElement.addEventListener('mousemove', e => {
    mx = e.offsetX;
    my = e.offsetY;
  }, { passive: true });
  canvas.parentElement.addEventListener('mouseleave', () => { mx = -1000; my = -1000; }, { passive: true });

  const homeSections = $('#homeSections');
  let isVisible = true;
  const io = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
  }, { threshold: 0.05 });
  io.observe(canvas.parentElement);

  function draw() {
    if (!isVisible || document.hidden || (homeSections && homeSections.classList.contains('hidden'))) {
      requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = cachedAccent;

    // Use larger spacing on small screens to save battery & GPU
    const isMobile = w < 640;
    const spacing = isMobile ? 44 : 30;
    phase += 0.024 * state.csmBoost;

    const pulse = music.pulse || { isPlaying: false, kick: 0, energy: 0 };
    const musicKick = pulse.isPlaying ? pulse.kick : 0;
    const musicEnergy = pulse.isPlaying ? pulse.energy : 0;

    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        const dx = x - mx;
        const dy = y - my;
        const dist = Math.hypot(dx, dy);
        const wave = (Math.sin(x * 0.022 + y * 0.022 + phase) * (2.2 * state.csmBoost)) + (musicKick * Math.sin((x + y) * 0.03 - phase * 2) * 4);
        let pushX = 0, pushY = 0;
        let radius = 1.2 + (musicKick * 0.9);
        let alpha = 0.2 + (musicEnergy * 0.28);

        if (dist < 120 && dist > 0.1) {
          const force = (120 - dist) / 120;
          pushX = (dx / dist) * force * 14;
          pushY = (dy / dist) * force * 14;
          radius = 1.2 + force * 1.6 + (musicKick * 1.2);
          alpha = 0.2 + force * 0.5 + (musicEnergy * 0.3);
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

// Repository data is generated from GitHub metadata. Keep all external text escaped.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function repoUrl(repo) {
  return `https://github.com/5ivesaw/${encodeURIComponent(repo.name)}`;
}

function siteUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function repoSummary(repo) {
  return repo.desc ? escapeHtml(repo.desc) : 'Public repository. See GitHub for details.';
}

function repoCard(repo) {
  const site = siteUrl(repo.home);
  return `<article class="tile repo-compact-card">
    <div class="repo-compact-top">
      <span class="repo-compact-lang">${getLangIcon(repo.lang)} ${escapeHtml(repo.lang || 'Code')}</span>
      ${repo.fork ? '<span class="badge">Fork</span>' : ''}
      ${repo.archived ? '<span class="badge">Archived</span>' : ''}
    </div>
    <h3 class="mono font-semibold">${escapeHtml(repo.name)}</h3>
    <p class="xs muted clamp-2">${repoSummary(repo)}</p>
    <div class="repo-compact-actions">
      <a href="#/repos/${encodeURIComponent(repo.name)}" class="accent font-medium">Details ↗</a>
      ${site ? `<a href="${escapeHtml(site)}" target="_blank" rel="noopener noreferrer">Site ↗</a>` : ''}
      <a href="${repoUrl(repo)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </div>
  </article>`;
}

function sawbyteFeature(repo) {
  const site = siteUrl(repo?.home) || 'https://5ivesaw.github.io/Sawbyte/';
  const minecraft = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures/';
  return `<div class="sawbyte-feature" aria-label="Sawbyte project">
    <div class="sawbyte-mark"><img src="https://raw.githubusercontent.com/5ivesaw/Sawbyte/main/docs/assets/sawbyte.png" alt="Sawbyte logo" loading="lazy" /></div>
    <div class="sawbyte-copy">
      <span class="sawbyte-eyebrow"><img src="${minecraft}block/grass_block_side.png" alt="" loading="lazy" /> MINECRAFT 26.3 <img src="${minecraft}item/diamond.png" alt="" loading="lazy" /> RUST CLIENT + BOT ENGINE</span>
      <h3>sawbyte</h3>
      <p>Native client, desktop launcher, and programmable bot engine.</p>
    </div>
    <a class="sawbyte-enter" href="${escapeHtml(site)}" target="_blank" rel="noopener noreferrer"><img src="${minecraft}block/crafting_table_front.png" alt="" loading="lazy" /> Enter website <span aria-hidden="true">↗</span></a>
  </div>`;
}

function renderRepoPage(repoName, mountPoint) {
  const repo = state.repos.find(r => r.name.toLowerCase() === repoName.toLowerCase());
  if (!repo) {
    mountPoint.innerHTML = `<section class="card pad center"><h1>Repository not found</h1><p class="muted">This repository is not in the public catalog.</p><a href="#/repos" class="btn sm primary">Browse repositories</a></section>`;
    return;
  }

  const site = siteUrl(repo.home);
  const isSawbyte = repo.name.toLowerCase() === 'sawbyte';
  const demoLinks = {
    fivesawUtils: ['A* Pathfinder demo', '#/demos/pathfinder'],
    'Ascii-Media-Player': ['ASCII Media Player demo', '#/demos/ascii-player'],
    'a-apple-that-is-bad': ['Cursed Text demo', '#/demos/bad-apple']
  };
  const demo = demoLinks[repo.name];
  const clone = `git clone ${repoUrl(repo)}.git`;
  mountPoint.innerHTML = `<div class="repo-page-wrap stack" style="gap:16px;max-width:850px;margin:0 auto;padding-bottom:40px;">
    <section class="card pad repo-hero-card">
      <div class="repo-title-row">
        <span class="badge">5ivesaw /</span>
        <h1 class="repo-title">${escapeHtml(repo.name)}</h1>
        ${repo.fork ? '<span class="badge">Fork</span>' : ''}
        ${repo.archived ? '<span class="badge">Archived</span>' : ''}
      </div>
      <p class="repo-desc">${repoSummary(repo)}</p>
      <div class="repo-meta-chips">
        <span class="chip xs font-mono">${getLangIcon(repo.lang)} ${escapeHtml(repo.lang || 'Code')}</span>
        <span class="chip xs font-mono">★ ${Number(repo.stars) || 0}</span>
        ${repo.pushed ? `<span class="chip xs font-mono">Updated ${new Date(repo.pushed).toLocaleDateString()}</span>` : ''}
      </div>
      <div class="repo-header-actions" style="margin-top:16px;">
        <a href="${repoUrl(repo)}" target="_blank" rel="noopener noreferrer" class="btn sm primary">GitHub Repository ↗</a>
        ${site ? `<a href="${escapeHtml(site)}" target="_blank" rel="noopener noreferrer" class="btn sm ghost">Website ↗</a>` : ''}
        ${demo ? `<a href="${demo[1]}" class="btn sm ghost">${demo[0]} ↗</a>` : ''}
      </div>
    </section>
    ${isSawbyte ? sawbyteFeature(repo) : ''}
    <section class="card pad repo-quick-info">
      <span class="eyebrow">QUICK INFO</span>
      <div class="repo-info-grid">
        <div><span>Default branch</span><strong>${escapeHtml(repo.branch || 'main')}</strong></div>
        <div><span>Forks</span><strong>${Number(repo.forks) || 0}</strong></div>
        <div><span>Website</span><strong>${site ? `<a href="${escapeHtml(site)}" target="_blank" rel="noopener noreferrer">Visit site ↗</a>` : 'Not listed'}</strong></div>
      </div>
      ${repo.topics?.length ? `<div class="repo-topic-row">${repo.topics.slice(0, 6).map(t => `<span class="chip xs">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    </section>
    <section class="card pad repo-source-bar">
      <div><span class="eyebrow">SOURCE</span><p class="xs muted">Clone the repository or read its full documentation on GitHub.</p></div>
      <button type="button" id="copyCloneBtn" class="btn sm ghost">Copy clone command</button>
    </section>
  </div>`;
  $('#copyCloneBtn', mountPoint)?.addEventListener('click', () => {
    copyText(clone);
    toast('Copied clone command', 'ok');
    sfx('copy');
  });
}

// Dedicated Standalone Directory Views
function renderDemosDirectory(mountPoint) {
  let activeTag = 'all';
  let searchQuery = '';

  function renderList() {
    const list = DEMOS.filter(d => {
      const matchesTag = activeTag === 'all' || (d.tags && d.tags.includes(activeTag));
      const q = searchQuery.toLowerCase().trim();
      const matchesQ = !q || d.title.toLowerCase().includes(q) || d.blurb.toLowerCase().includes(q) || (d.tags && d.tags.some(t => t.includes(q)));
      return matchesTag && matchesQ;
    });

    const gridEl = $('#demosDirectoryGrid', mountPoint);
    if (!gridEl) return;

    if (!list.length) {
      gridEl.innerHTML = `<div class="card pad center mono xs faint" style="grid-column:1/-1;">No interactive demos match "${searchQuery}".</div>`;
      return;
    }

    gridEl.innerHTML = list.map(d => `
      <div class="tile hover repo-cartridge pop-in" style="display:flex;flex-direction:column;padding:16px;">
        <div class="row between items-center mb-2">
          <span class="badge" style="font-size:9.5px;background:var(--accent);color:#fff;">${d.repo}</span>
          <span class="chip xs font-mono">60 FPS</span>
        </div>
        <h3 class="font-bold text-base text-paper-ink mb-1">${d.title}</h3>
        <p class="xs muted clamp-3 mb-3" style="line-height:1.5;">${d.blurb}</p>
        <div class="row wrap xs mono faint mb-3" style="gap:4px;">
          ${(d.tags || []).map(t => `<span class="chip xs">#${t}</span>`).join('')}
        </div>
        <div class="row between items-center mt-auto pt-2" style="border-top:1px solid var(--line);">
          <span class="xs mono faint">Interactive</span>
          <a href="#/demos/${d.id}" class="btn sm primary" style="background:var(--accent);border-color:var(--accent);">
            ⚡ Run Demo ↗
          </a>
        </div>
      </div>
    `).join('');
  }

  mountPoint.innerHTML = `
    <div class="stack" style="gap:20px;">
      <section class="card pad">
        <div class="section-head mb-4">
          <span class="eyebrow">STANDALONE DIRECTORY</span>
          <h2>Flagship Interactive Demos</h2>
          <p class="muted sm" style="max-width:65ch;">
            15 bespoke in-browser experiments spanning physics, audio synthesis, 3D WebGL, computer vision, cellular emergence & retro terminal operating systems.
          </p>
          <div class="row wrap center mt-3" style="gap:8px;">
            <div class="seg" id="demosDirTagSeg">
              <button type="button" data-tag="all" class="bg-paper-elevated font-semibold">All (${DEMOS.length})</button>
              <button type="button" data-tag="audio">Audio &amp; Synths</button>
              <button type="button" data-tag="webcam">Vision &amp; Webcam</button>
              <button type="button" data-tag="physics">Physics &amp; Space</button>
              <button type="button" data-tag="3d">3D &amp; Voxels</button>
              <button type="button" data-tag="simulation">Simulations</button>
            </div>
            <input type="text" id="demosDirSearch" placeholder="Search demos, tags, physics..." class="input" style="max-width:240px;height:34px;font-size:12px;" />
          </div>
        </div>

        <div id="demosDirectoryGrid" class="grid grid-3"></div>
      </section>
    </div>
  `;

  renderList();

  $$('#demosDirTagSeg button', mountPoint).forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#demosDirTagSeg button', mountPoint).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
      activeTag = btn.dataset.tag;
      renderList();
      sfx('tick');
    });
  });

  $('#demosDirSearch', mountPoint)?.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderList();
  });
}

function renderReposDirectory(mountPoint) {
  let search = '';
  let filter = 'all';
  let visible = 12;
  let sort = 'pushed';

  mountPoint.innerHTML = `<section class="card pad">
    <div class="section-head mb-4">
      <span class="eyebrow">PUBLIC CODE</span>
      <h2>Repository Directory</h2>
      <p class="muted sm">Short summaries from GitHub. Open a project for links and details.</p>
      <div class="row wrap center mt-3" style="gap:8px;">
        <select id="reposDirFilter" class="input" aria-label="Filter repositories" style="max-width:160px;height:34px;font-size:12px;">
          <option value="all">All repositories</option><option value="featured">Featured</option>
          <option value="sites">With a site</option><option value="forks">Forks</option>
        </select>
        <select id="reposDirSort" class="input" aria-label="Sort repositories" style="max-width:160px;height:34px;font-size:12px;">
          <option value="pushed">Recently updated</option><option value="stars">Most stars</option><option value="name">Alphabetical</option>
        </select>
        <input type="search" id="reposDirSearch" placeholder="Search repositories..." aria-label="Search repositories" class="input" style="max-width:220px;height:34px;font-size:12px;" />
      </div>
      <span id="reposDirCountBadge" class="faint xs mono mt-2"></span>
    </div>
    <div id="reposDirectoryGrid" class="grid grid-3"></div>
    <div class="row center mt-4"><button type="button" id="reposShowMore" class="btn sm ghost" hidden>Show more repositories</button></div>
  </section>`;

  function draw() {
    const query = search.toLowerCase().trim();
    const list = state.repos.filter(r => {
      const matchesFilter = filter === 'all' ||
        (filter === 'featured' && r.featured) ||
        (filter === 'sites' && siteUrl(r.home)) ||
        (filter === 'forks' && r.fork);
      return matchesFilter && (!query || [r.name, r.desc, r.lang, ...(r.topics || [])]
        .some(value => String(value || '').toLowerCase().includes(query)));
    });
    list.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) :
      sort === 'stars' ? (b.stars || 0) - (a.stars || 0) || new Date(b.pushed || 0) - new Date(a.pushed || 0) :
      new Date(b.pushed || 0) - new Date(a.pushed || 0));
    $('#reposDirCountBadge', mountPoint).textContent = `Showing ${Math.min(visible, list.length)} of ${list.length} matches · ${state.repos.length} public repositories`;
    $('#reposDirectoryGrid', mountPoint).innerHTML = list.length ? list.slice(0, visible).map(repoCard).join('') :
      '<p class="muted" style="grid-column:1/-1;text-align:center;">No repositories match this search.</p>';
    $('#reposShowMore', mountPoint).hidden = visible >= list.length;
  }

  $('#reposDirFilter', mountPoint).addEventListener('change', e => { filter = e.target.value; visible = 12; draw(); });
  $('#reposDirSort', mountPoint).addEventListener('change', e => { sort = e.target.value; draw(); });
  $('#reposDirSearch', mountPoint).addEventListener('input', e => { search = e.target.value; visible = 12; draw(); });
  $('#reposShowMore', mountPoint).addEventListener('click', () => { visible += 12; draw(); });
  draw();
}

function renderToolsDirectory(mountPoint) {
  mountPoint.innerHTML = `
    <div class="stack" style="gap:20px;">
      <section class="card pad">
        <div class="section-head mb-4">
          <span class="eyebrow">LOCAL CREATIVE WORKSHOP</span>
          <h2>In-Browser Useful Tools Directory</h2>
          <p class="muted sm" style="max-width:65ch;">
            Convert, cut, edit, inspect and test directly inside your browser. Zero cloud telemetry, zero uploads, instant local execution.
          </p>
        </div>

        <div class="grid grid-2" style="gap:16px;">
          ${TOOLS.map(t => `
            <a href="#/tools/${t.id}" class="tile hover pop-in" style="padding:18px;">
              <div class="row between items-center mb-2">
                <span class="tl-sticker" style="font-size:9.5px;padding:2px 8px;">${icon(t.icon)} TOOL</span>
                <span class="accent font-medium text-xs">Launch Studio ↗</span>
              </div>
              <h3 class="font-bold text-lg mb-1" style="color:var(--ink);">${t.title}</h3>
              <p class="xs muted clamp-2 mb-3">${t.blurb}</p>
              <div class="row wrap xs mono faint mt-auto" style="gap:4px;">
                ${t.tags.map(tag => `<span class="chip xs">#${tag}</span>`).join('')}
              </div>
            </a>
          `).join('')}
        </div>
      </section>
    </div>
  `;
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

  if (hash === '/' || hash === '' || !hash.startsWith('/')) {
    // Show Home
    homeSections.classList.remove('hidden');
    subViewContainer.classList.add('hidden');
    subViewContainer.innerHTML = '';
    if (hash && hash !== '/') {
      const targetId = hash.replace(/^#/, '');
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 30);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  if (hash === '/disc-maker' || hash === '/disc-maker/') {
    crumb.textContent = 'disc_maker';
    state.currentUnmount = mountDiscMakerPage(mountPoint);
    return;
  } else if (hash === '/demos' || hash === '/demos/') {
    crumb.textContent = 'Flagship Demos Directory';
    renderDemosDirectory(mountPoint);
    return;
  } else if (hash === '/repos' || hash === '/repos/') {
    crumb.textContent = 'Repositories Archive';
    renderReposDirectory(mountPoint);
    return;
  } else if (hash === '/tools' || hash === '/tools/') {
    crumb.textContent = 'In-Browser Workshop';
    renderToolsDirectory(mountPoint);
    return;
  } else if (hash.startsWith('/5tube')) {
    crumb.textContent = '5Tube Multiplayer';
    try {
      state.currentUnmount = fiveTube.mount(mountPoint, { toast, sfx, store });
    } catch (err) {
      console.error(err);
      mountPoint.innerHTML = `<div class="card pad center"><p class="accent">Failed to mount 5Tube.</p><p class="xs mono faint">${err.message}</p></div>`;
    }
  } else if (hash.startsWith('/repos/')) {
    const repoName = decodeURIComponent(hash.replace('/repos/', ''));
    crumb.textContent = repoName;
    renderRepoPage(repoName, mountPoint);
  } else if (hash.startsWith('/tools/')) {
    const id = hash.replace('/tools/', '');
    const tool = TOOLS.find(t => t.id === id);
    if (!tool) {
      mountPoint.innerHTML = `<div class="card pad center"><p>Tool "${id}" not found.</p><a href="#/" class="btn sm primary" style="margin-top:10px;">Return Home</a></div>`;
      return;
    }
    crumb.textContent = tool.title;
    try {
      state.currentUnmount = tool.runner.mount(mountPoint, { toast, sfx, store });
    } catch (err) {
      console.error(err);
      mountPoint.innerHTML = `<div class="card pad center"><p class="accent">Failed to mount tool.</p><p class="xs mono faint">${err.message}</p></div>`;
    }
  } else if (hash.startsWith('/demos/')) {
    const id = hash.replace('/demos/', '');
    const demo = DEMOS.find(d => d.id === id);
    if (!demo) {
      mountPoint.innerHTML = `<div class="card pad center"><p>Demo "${id}" not found.</p><a href="#/" class="btn sm primary" style="margin-top:10px;">Return Home</a></div>`;
      return;
    }
    crumb.textContent = demo.title;

    try {
      state.currentUnmount = demo.runner.mount(mountPoint, { toast, sfx, store });
    } catch (err) {
      console.error(err);
      mountPoint.innerHTML = `<div class="card pad center"><p class="accent">Failed to mount demo.</p><p class="xs mono faint">${err.message}</p></div>`;
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Keep the homepage selective; the full public catalog lives in the directory.
function renderRepositories() {
  const container = $('#repoContainer');
  if (!container) return;
  const featured = state.repos.filter(repo => repo.featured && repo.name !== 'Sawbyte');
  const sawbyte = state.repos.find(repo => repo.name === 'Sawbyte');
  $('#sawbyteFeature').innerHTML = sawbyte ? sawbyteFeature(sawbyte) : '';
  container.innerHTML = featured.map(repoCard).join('');
  const count = $('#repoCountBadge');
  if (count) count.textContent = `${featured.length + (sawbyte ? 1 : 0)} featured · ${state.repos.length} public repositories`;
  const directory = $('#allReposLink');
  if (directory) directory.textContent = `Browse all ${state.repos.length} public repositories ↗`;
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
  const spotlight = DEMOS.slice(0, 6);
  container.innerHTML = spotlight.map(d => `
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

// 1. Home Page Quick In-Browser Workbench
function initHomeQuickWorkbench() {
  const devTab = $('#quickDevTab');
  const imgTab = $('#quickImageTab');
  const segBtns = $$('#quickToolSeg button');
  if (!devTab || !imgTab) return;

  segBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      segBtns.forEach(b => b.classList.toggle('bg-paper-surface', b === btn));
      const isDev = btn.dataset.qtool === 'dev';
      devTab.classList.toggle('hidden', !isDev);
      imgTab.classList.toggle('hidden', isDev);
      sfx('tick');
    });
  });

  // Quick Dev Actions
  const devInput = $('#quickDevInput');
  const devOutput = $('#quickDevOutput');
  const copyBtn = $('#copyQuickDevBtn');

  function setDevOut(val) {
    if (devOutput) devOutput.textContent = val;
  }

  $('#quickJsonBtn')?.addEventListener('click', () => {
    const raw = (devInput?.value || '').trim();
    if (!raw) return setDevOut('Please enter JSON text first.');
    try {
      const parsed = JSON.parse(raw);
      setDevOut(JSON.stringify(parsed, null, 2));
      toast('JSON parsed & formatted!', 'ok');
      sfx('tick');
    } catch (e) {
      setDevOut(`Invalid JSON: ${e.message}`);
      toast('Invalid JSON syntax', 'err');
    }
  });

  $('#quickB64Btn')?.addEventListener('click', () => {
    const raw = (devInput?.value || '').trim();
    if (!raw) return setDevOut('Please enter text to encode/decode.');
    try {
      if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length % 4 === 0) {
        setDevOut(decodeURIComponent(escape(atob(raw))));
        toast('Base64 decoded!', 'ok');
      } else {
        setDevOut(btoa(unescape(encodeURIComponent(raw))));
        toast('Encoded to Base64!', 'ok');
      }
      sfx('tick');
    } catch {
      setDevOut(btoa(unescape(encodeURIComponent(raw))));
      toast('Encoded to Base64!', 'ok');
    }
  });

  $('#quickShaBtn')?.addEventListener('click', async () => {
    const raw = (devInput?.value || '').trim();
    if (!raw) return setDevOut('Please enter text to hash.');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    setDevOut(hex);
    toast('SHA-256 generated!', 'ok');
    sfx('tick');
  });

  $('#quickUuidBtn')?.addEventListener('click', () => {
    const id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    setDevOut(id);
    if (devInput) devInput.value = id;
    toast('UUID v4 generated!', 'ok');
    sfx('tick');
  });

  copyBtn?.addEventListener('click', () => {
    const text = devOutput?.textContent;
    if (!text || text.startsWith('Result will appear')) return;
    copyText(text);
    toast('Copied result to clipboard!', 'ok');
    sfx('copy');
  });

  // Quick Image Dropper
  const dropZone = $('#quickDropZone');
  const imgInput = $('#quickImageInput');
  const imgResult = $('#quickImageResult');
  const imgThumb = $('#quickImageThumb');
  const imgMeta = $('#quickImageMeta');
  const dlWebpBtn = $('#quickDownloadWebpBtn');
  const dlPngBtn = $('#quickDownloadPngBtn');

  let activeImgCanvas = null;
  let activeImgName = 'image';

  function processImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      toast('Please provide a valid image file', 'err');
      return;
    }
    activeImgName = file.name.replace(/\.[^/.]+$/, '');
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        activeImgCanvas = c;

        imgThumb.src = e.target.result;
        imgMeta.textContent = `${file.name} (${img.naturalWidth}×${img.naturalHeight}px, ${formatBytes(file.size)})`;
        imgResult.classList.remove('hidden');
        toast('Image loaded! Select export format.', 'ok');
        sfx('toggleOn');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  dropZone?.addEventListener('click', () => imgInput?.click());
  imgInput?.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  });

  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)'; });
  dropZone?.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--line)'; });
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--line)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  });

  dlWebpBtn?.addEventListener('click', () => {
    if (!activeImgCanvas) return;
    activeImgCanvas.toBlob(blob => {
      download(URL.createObjectURL(blob), `${activeImgName}.webp`);
      toast('Saved as WebP!', 'ok');
      sfx('download');
    }, 'image/webp', 0.92);
  });

  dlPngBtn?.addEventListener('click', () => {
    if (!activeImgCanvas) return;
    activeImgCanvas.toBlob(blob => {
      download(URL.createObjectURL(blob), `${activeImgName}.png`);
      toast('Saved as PNG!', 'ok');
      sfx('download');
    }, 'image/png');
  });
}

// 2. Home Page Interactive Live Showcase Playground
function initHomeDemoPlayground() {
  const canvas = $('#playgroundCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const titleEl = $('#playgroundDemoTitle');
  const launchBtn = $('#playgroundLaunchBtn');
  const webcamBtn = $('#playgroundWebcamBtn');
  const effectBtn = $('#playgroundEffectBtn');
  const hintEl = $('#playgroundHint span');

  let activeDemo = 'matrix'; // 'matrix' | 'synth' | 'ascii' | 'pathfinder'
  let colorIdx = 0;
  const PALETTES = [
    { name: 'Matrix Green', primary: '#00FF66', glow: 'rgba(0,255,102,0.4)', trail: 'rgba(5,5,5,0.25)' },
    { name: 'Chainsaw Crimson', primary: '#FF3B14', glow: 'rgba(255,59,20,0.5)', trail: 'rgba(9,5,6,0.25)' },
    { name: 'Cyber Cyan', primary: '#00E5FF', glow: 'rgba(0,229,255,0.4)', trail: 'rgba(4,9,12,0.25)' },
    { name: 'Amber CRT', primary: '#FFB300', glow: 'rgba(255,179,0,0.4)', trail: 'rgba(10,8,4,0.25)' }
  ];

  let webcamStream = null;
  let videoEl = null;
  let isWebcamOn = false;

  const sampleCanvas = document.createElement('canvas');
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

  const KATAKANA = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ01234567895IVESAW';
  let columns = [];
  let colsCount = 0;
  let rowsCount = 0;
  let animTime = 0;
  let mouseX = -100, mouseY = -100, mouseActive = false;

  // WebAudio Synth
  let audioCtx = null;
  let oscNode = null;
  let filterNode = null;
  let gainNode = null;
  let isPointerDown = false;

  // Pathfinder mini grid
  const P_COLS = 28, P_ROWS = 14;
  const pGrid = Array.from({ length: P_ROWS }, () => Array(P_COLS).fill(0));
  let pStart = { r: 2, c: 2 };
  let pEnd = { r: 11, c: 25 };
  let pPath = [];

  // Seed default obstacle labyrinth
  for (let r = 0; r < P_ROWS; r++) {
    for (let c = 0; c < P_COLS; c++) {
      if ((c === 8 && r > 2) || (c === 16 && r < 11) || (c === 22 && r > 3)) {
        pGrid[r][c] = 1;
      }
    }
  }

  function solveMiniPath() {
    // Quick BFS / A*
    const queue = [[pStart.r, pStart.c]];
    const visited = Array.from({ length: P_ROWS }, () => Array(P_COLS).fill(false));
    const parent = Array.from({ length: P_ROWS }, () => Array(P_COLS).fill(null));
    visited[pStart.r][pStart.c] = true;

    let reached = false;
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (queue.length > 0) {
      const [cr, cc] = queue.shift();
      if (cr === pEnd.r && cc === pEnd.c) {
        reached = true;
        break;
      }
      for (const [dr, dc] of dirs) {
        const nr = cr + dr, nc = cc + dc;
        if (nr >= 0 && nr < P_ROWS && nc >= 0 && nc < P_COLS && !visited[nr][nc] && pGrid[nr][nc] === 0) {
          visited[nr][nc] = true;
          parent[nr][nc] = [cr, cc];
          queue.push([nr, nc]);
        }
      }
    }

    pPath = [];
    if (reached) {
      let cur = [pEnd.r, pEnd.c];
      while (cur) {
        pPath.unshift(cur);
        cur = parent[cur[0]][cur[1]];
      }
    }
  }

  function resizeCanvas() {
    fitCanvas(canvas);
    colsCount = Math.floor(canvas.width / 13);
    rowsCount = Math.floor(canvas.height / 13);
    sampleCanvas.width = Math.max(1, colsCount);
    sampleCanvas.height = Math.max(1, rowsCount);
    columns = Array.from({ length: colsCount }, () => ({
      y: Math.random() * -rowsCount,
      speed: 0.8 + Math.random() * 0.9,
      chars: Array.from({ length: rowsCount }, () => KATAKANA[Math.floor(Math.random() * KATAKANA.length)])
    }));
    solveMiniPath();
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Mouse / Pointer tracking
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    mouseActive = true;
  });

  canvas.addEventListener('mouseleave', () => {
    mouseActive = false;
  });

  // Audio Synth init
  function ensureAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 1600;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.0001;

    filterNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  }

  function startSynthVoice(pitch, cutoff) {
    ensureAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!oscNode) {
      oscNode = audioCtx.createOscillator();
      oscNode.type = 'sawtooth';
      oscNode.frequency.value = pitch;
      oscNode.connect(filterNode);
      oscNode.start();
    }
    const now = audioCtx.currentTime;
    oscNode.frequency.setTargetAtTime(pitch, now, 0.02);
    filterNode.frequency.setTargetAtTime(cutoff, now, 0.02);
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.04);
  }

  function stopSynthVoice() {
    if (!audioCtx || !gainNode) return;
    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  }

  canvas.addEventListener('pointerdown', e => {
    isPointerDown = true;
    const rect = canvas.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    if (activeDemo === 'synth') {
      const pitch = 80 * Math.pow(8, xRatio);
      const cutoff = 200 * Math.pow(30, 1 - yRatio);
      startSynthVoice(pitch, cutoff);
    } else if (activeDemo === 'pathfinder') {
      const c = Math.floor(xRatio * P_COLS);
      const r = Math.floor(yRatio * P_ROWS);
      if (r >= 0 && r < P_ROWS && c >= 0 && c < P_COLS) {
        if (!(r === pStart.r && c === pStart.c) && !(r === pEnd.r && c === pEnd.c)) {
          pGrid[r][c] = pGrid[r][c] === 1 ? 0 : 1;
          solveMiniPath();
          sfx('tick');
        }
      }
    }
  });

  window.addEventListener('pointermove', e => {
    if (!isPointerDown) return;
    const rect = canvas.getBoundingClientRect();
    const xRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (activeDemo === 'synth') {
      const pitch = 80 * Math.pow(8, xRatio);
      const cutoff = 200 * Math.pow(30, 1 - yRatio);
      startSynthVoice(pitch, cutoff);
    }
  });

  window.addEventListener('pointerup', () => {
    if (isPointerDown) {
      isPointerDown = false;
      stopSynthVoice();
    }
  });

  // Tab switching
  const tabBtns = $$('#playgroundTabsSeg button');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.toggle('bg-paper-surface', b === btn));
      activeDemo = btn.dataset.pdemo;
      sfx('tick');

      if (activeDemo === 'matrix') {
        titleEl.textContent = 'Matrix Digital Rain & Neural Mirror';
        launchBtn.href = '#/demos/matrix-rain';
        hintEl.textContent = 'Move cursor or drag to disrupt rain';
      } else if (activeDemo === 'synth') {
        titleEl.textContent = 'Cyber Theremin Audio Synth & CRT Scope';
        launchBtn.href = '#/demos/audio-synth';
        hintEl.textContent = 'Click & drag anywhere to play synthesizer';
      } else if (activeDemo === 'ascii') {
        titleEl.textContent = 'ASCII Video & Cursed Text Engine';
        launchBtn.href = '#/demos/bad-apple';
        hintEl.textContent = 'Real-time ASCII downsampler & video feed';
      } else if (activeDemo === 'pathfinder') {
        titleEl.textContent = 'A* Pathfinder Heuristic Grid';
        launchBtn.href = '#/demos/pathfinder';
        hintEl.textContent = 'Click cells to paint walls and reroute path';
      }
    });
  });

  // Cycle palette button
  effectBtn?.addEventListener('click', () => {
    colorIdx = (colorIdx + 1) % PALETTES.length;
    toast(`Palette: ${PALETTES[colorIdx].name}`, 'ok');
    sfx('tick');
  });

  // Webcam toggle
  webcamBtn?.addEventListener('click', async () => {
    if (isWebcamOn) {
      if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
      webcamStream = null;
      videoEl = null;
      isWebcamOn = false;
      toast('Webcam off', 'ok');
      sfx('toggleOff');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcamStream = stream;
        videoEl = document.createElement('video');
        videoEl.srcObject = stream;
        videoEl.playsInline = true;
        videoEl.muted = true;
        await videoEl.play();
        isWebcamOn = true;
        toast('Webcam online on homepage playground!', 'ok');
        sfx('toggleOn');
      } catch (err) {
        toast('Webcam permission denied or unavailable', 'err');
      }
    }
  });

  // Main Render Loop
  function renderPlayground() {
    animTime += 0.035;
    const w = canvas.width;
    const h = canvas.height;
    const theme = PALETTES[colorIdx];

    // Background fade
    ctx.fillStyle = theme.trail;
    ctx.fillRect(0, 0, w, h);

    if (activeDemo === 'matrix') {
      // 1. Matrix Digital Rain
      let sampleData = null;
      if (isWebcamOn && videoEl && videoEl.readyState >= 2) {
        sampleCtx.save();
        sampleCtx.translate(colsCount, 0);
        sampleCtx.scale(-1, 1);
        sampleCtx.drawImage(videoEl, 0, 0, colsCount, rowsCount);
        sampleCtx.restore();
        sampleData = sampleCtx.getImageData(0, 0, colsCount, rowsCount).data;
      }

      ctx.font = 'bold 12px monospace';
      ctx.textBaseline = 'top';

      for (let c = 0; c < colsCount; c++) {
        const col = columns[c];
        if (!col) continue;
        col.y += col.speed;
        if (col.y > rowsCount + 6) col.y = -Math.random() * 10;
        const headRow = Math.floor(col.y);

        for (let r = 0; r < rowsCount; r++) {
          const char = col.chars[r] || '5';
          const x = c * 13;
          const y = r * 13;
          let lum = 0;

          if (sampleData) {
            const idx = (r * colsCount + c) * 4;
            lum = (0.299 * sampleData[idx] + 0.587 * sampleData[idx + 1] + 0.114 * sampleData[idx + 2]) / 255;
          } else {
            const dx = c - colsCount / 2;
            const dy = r - rowsCount / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            lum = Math.max(0, Math.sin(dist * 0.25 - animTime * 2) * 0.6);
          }

          if (mouseActive) {
            const mdx = x - mouseX, mdy = y - mouseY;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mdist < 80) lum = Math.min(1, lum + (1 - mdist / 80));
          }

          const distHead = headRow - r;
          if (distHead === 0) {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = theme.glow;
            ctx.shadowBlur = 8;
            ctx.fillText(char, x, y);
            ctx.shadowBlur = 0;
          } else if (distHead > 0 && distHead < 12) {
            ctx.fillStyle = distHead < 3 ? '#E0FFE0' : theme.primary;
            ctx.fillText(char, x, y);
          } else if (lum > 0.3) {
            ctx.fillStyle = lum > 0.7 ? '#FFFFFF' : theme.primary;
            ctx.fillText(char, x, y);
          }
        }
      }

    } else if (activeDemo === 'synth') {
      // 2. Vector Lissajous Oscilloscope
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = theme.primary;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 10;

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.36;

      ctx.beginPath();
      const points = 360;
      for (let i = 0; i <= points; i++) {
        const t = (i / points) * Math.PI * 2;
        const wave = Math.sin(t * 3 + animTime * 3) * (isPointerDown ? 1.4 : 0.8);
        const x = cx + Math.sin(t * 2 + animTime * 1.5) * (radius + wave * 20);
        const y = cy + Math.cos(t * 3 - animTime * 1.2) * (radius + wave * 20);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

    } else if (activeDemo === 'ascii') {
      // 3. ASCII Torus & Cursed Camera
      ctx.font = 'bold 11px monospace';
      ctx.textBaseline = 'top';
      const RAMPS = [' ', '.', ':', '-', '=', '+', '*', 'S', 'A', 'W', '5', '@', '#'];
      const cx = Math.floor(colsCount / 2);
      const cy = Math.floor(rowsCount / 2);

      for (let r = 0; r < rowsCount; r++) {
        for (let c = 0; c < colsCount; c++) {
          const dx = c - cx;
          const dy = (r - cy) * 1.8;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const torus = Math.sin(dist * 0.4 - animTime * 2) * Math.cos(angle * 4 + animTime);
          const charIdx = Math.max(0, Math.min(RAMPS.length - 1, Math.floor(((torus + 1) / 2) * RAMPS.length)));
          ctx.fillStyle = charIdx > 8 ? '#FFFFFF' : theme.primary;
          ctx.fillText(RAMPS[charIdx], c * 13, r * 13);
        }
      }

    } else if (activeDemo === 'pathfinder') {
      // 4. A* Interactive Maze
      const cellW = w / P_COLS;
      const cellH = h / P_ROWS;

      for (let r = 0; r < P_ROWS; r++) {
        for (let c = 0; c < P_COLS; c++) {
          const x = c * cellW;
          const y = r * cellH;

          if (r === pStart.r && c === pStart.c) {
            ctx.fillStyle = '#22C55E';
            ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
          } else if (r === pEnd.r && c === pEnd.c) {
            ctx.fillStyle = '#EF4444';
            ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
          } else if (pGrid[r][c] === 1) {
            ctx.fillStyle = '#2A2022';
            ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
          } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.strokeRect(x, y, cellW, cellH);
          }
        }
      }

      // Draw Path
      if (pPath.length > 1) {
        ctx.save();
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < pPath.length; i++) {
          const [pr, pc] = pPath[i];
          const px = pc * cellW + cellW / 2;
          const py = pr * cellH + cellH / 2;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    requestAnimationFrame(renderPlayground);
  }

  requestAnimationFrame(renderPlayground);
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

  let source = 'playlist';
  const sourceBtn = $('#dockSourceBtn');
  function selectSource(next) {
    source = next;
    dock.classList.toggle('disc-source', next === 'disc');
    sourceBtn.title = next === 'disc' ? 'Switch to playlist' : 'Switch to disc_maker';
    sourceBtn.setAttribute('aria-label', sourceBtn.title);
    if (next === 'disc') {
      music.pause();
      titleEl.textContent = 'disc_maker';
      artistEl.textContent = 'Generated Minecraft music';
      thumbEl.src = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures/item/music_disc_creator.png';
      timeCurEl.textContent = '0'; timeDurEl.textContent = '∞'; progressEl.style.width = '0%';
      playBtn.innerHTML = icon(discMaker.playing ? 'pause' : 'play');
      volSlider.value = discMaker.volume;
    } else {
      discMaker.pause();
      updateTrackMeta(music.track);
      playBtn.innerHTML = icon('play');
      volSlider.value = music.volume;
    }
    if (!queueDrawer.classList.contains('hidden')) renderQueueDrawer();
  }
  sourceBtn.addEventListener('click', () => selectSource(source === 'disc' ? 'playlist' : 'disc'));
  discMaker.init();
  discMaker.on('state', st => {
    if (st === 'playing' && source !== 'disc') selectSource('disc');
    if (source === 'disc') { playBtn.innerHTML = icon(st === 'playing' ? 'pause' : 'play'); playBtn.title = st === 'playing' ? 'Pause' : 'Play'; thumbEl.classList.toggle('playing', st === 'playing'); }
  });
  discMaker.on('step', ({step, bar}) => { if (source === 'disc') { progressEl.style.width = `${(step + 1) / 16 * 100}%`; timeCurEl.textContent = `Bar ${bar + 1}`; } });
  discMaker.on('volume', v => { if (source === 'disc') { volSlider.value = v; muteBtn.innerHTML = discMaker.muted ? icon('mute') : icon('vol'); } });
  discMaker.on('notice', msg => toast(msg, 'info'));

  // Update track meta
  function updateTrackMeta(t) {
    if (!t || source === 'disc') return;
    titleEl.textContent = t.t || 'Unknown Track';
    artistEl.textContent = t.a || 'FiveSaw';
    thumbEl.src = thumb(t.id, 'default');
    timeDurEl.textContent = formatTime(t.d || 0);
  }

  music.on('track', updateTrackMeta);

  music.on('state', st => {
    if (source === 'disc') { if (st === 'playing') music.pause(); return; }
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
    if (source === 'disc') return;
    timeCurEl.textContent = formatTime(time);
    timeDurEl.textContent = formatTime(duration);
    const pct = duration > 0 ? (time / duration) * 100 : 0;
    progressEl.style.width = `${pct}%`;
  });

  music.on('volume', v => {
    if (source === 'disc') return;
    volSlider.value = v;
    muteBtn.innerHTML = music.muted ? icon('mute') : icon('vol');
  });

  music.on('mode', () => {
    shuffleBtn.classList.toggle('primary', music.shuffle);
    repeatBtn.classList.toggle('primary', music.repeat !== 'off');
    repeatBtn.title = `Repeat: ${music.repeat.toUpperCase()}`;
  });

  // Topbar & site-wide music reactive pulse
  const eqBars = $$('#topbarVisualizer .eq-bar');
  const hazardBar = $('.csm-hazard');
  let lastVibeBar = -1;
  let currentVibingEl = null;

  music.on('pulse', p => {
    if (p.isPlaying) {
      document.documentElement.style.setProperty('--music-beat-dur', `${(60 / (p.bpm || 120)).toFixed(3)}s`);

      // Subtle ambient environmental vibe every 16 bars during playback
      if (p.bar > 0 && p.bar % 16 === 0 && p.beat === 0 && p.bar !== lastVibeBar) {
        lastVibeBar = p.bar;
        if (currentVibingEl) {
          currentVibingEl.classList.remove('music-vibing');
          currentVibingEl = null;
        }
        const candidates = [
          $('.p-avatar'),
          $('#brandTitle'),
          $('.csm-head-badge'),
          $('#dockTrackTitle'),
          $('.eyebrow')
        ].filter(el => el && el.offsetParent !== null);

        if (candidates.length) {
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          chosen.classList.add('music-vibing');
          currentVibingEl = chosen;
          setTimeout(() => {
            if (currentVibingEl === chosen) {
              chosen.classList.remove('music-vibing');
              currentVibingEl = null;
            }
          }, (60 / (p.bpm || 120)) * 4000);
        }
      }
    }

    if (eqBars && eqBars.length) {
      if (p.isPlaying) {
        const b = p.bands || [p.kick, p.bass, p.snare, p.energy];
        eqBars[0].style.height = `${4 + (b[1] || p.kick) * 15}px`;
        eqBars[1].style.height = `${5 + (b[4] || p.bass) * 14}px`;
        eqBars[2].style.height = `${4 + (b[7] || p.snare) * 15}px`;
        eqBars[3].style.height = `${3 + (b[13] || p.hihat || p.energy) * 16}px`;
      } else {
        eqBars[0].style.height = '4px';
        eqBars[1].style.height = '6px';
        eqBars[2].style.height = '4px';
        eqBars[3].style.height = '5px';
      }
    }
    if (hazardBar && p.isPlaying) {
      hazardBar.style.filter = `brightness(${1 + p.snare * 0.45})`;
    }
    if (thumbEl && p.isPlaying) {
      thumbEl.style.transform = `scale(${1 + p.kick * 0.06})`;
    }
  });

  $('#topbarVisualizer')?.addEventListener('click', () => {
    if (source === 'disc') discMaker.toggle(); else music.toggle();
    sfx('click');
  });

  // Dock Audio Source Interactions (Tab Loopback, System Monitor, and Hardware Mic)
  const tabAudioBtn = $('#dockTabAudioBtn');
  const liveAudioBtn = $('#dockLiveAudioBtn');
  const audioSourceModal = $('#audioSourceModal');
  const audioDeviceSelect = $('#audioDeviceSelect');

  async function populateAudioInputDevices() {
    if (!audioDeviceSelect) return;
    const devices = await music.getAudioInputDevices();
    audioDeviceSelect.innerHTML = '<option value="">Default Audio Device</option>' +
      devices.map(d => `<option value="${d.deviceId}">${esc(d.label || `Input Device (${d.deviceId.slice(0, 8)})`)}</option>`).join('');
  }

  // 1. Direct Tab Audio Loopback Button (Zero Setup, Headphones Friendly)
  tabAudioBtn?.addEventListener('click', async () => {
    if (music.isHardwareLive && music.hardwareMode === 'tab') {
      music.disableHardwareAudio();
      sfx('toggleOff');
      toast('Switched back to Streaming Audio Sync', 'info');
    } else {
      const ok = await music.enableTabAudioLoopback();
      if (ok) {
        sfx('toggleOn');
        toast('Tab Audio Loopback Connected! Pure lossless FFT direct from player.', 'ok');
      } else {
        toast('Tab audio capture cancelled or no audio track shared.', 'info');
      }
    }
  });

  // 2. Open / Close Audio Source Modal
  const openAudioModal = async () => {
    if (!audioSourceModal) return;
    audioSourceModal.classList.remove('hidden');
    audioSourceModal.classList.add('open');
    await populateAudioInputDevices();
    sfx('open');
  };

  const closeAudioModal = () => {
    if (!audioSourceModal) return;
    audioSourceModal.classList.remove('open');
    audioSourceModal.classList.add('hidden');
    sfx('close');
  };

  liveAudioBtn?.addEventListener('click', openAudioModal);
  $('#closeAudioSourceModalBtn')?.addEventListener('click', closeAudioModal);
  audioSourceModal?.addEventListener('click', e => {
    if (e.target === audioSourceModal) closeAudioModal();
  });

  $('#connectTabAudioBtn')?.addEventListener('click', async () => {
    closeAudioModal();
    const ok = await music.enableTabAudioLoopback();
    if (ok) {
      sfx('toggleOn');
      toast('Tab Audio Loopback Connected! Lossless FFT straight to visualizers.', 'ok');
    } else {
      toast('Tab audio capture cancelled or no audio track shared.', 'info');
    }
  });

  $('#connectDeviceAudioBtn')?.addEventListener('click', async () => {
    closeAudioModal();
    const devId = audioDeviceSelect?.value || null;
    const ok = await music.enableHardwareAudio(devId);
    if (ok) {
      sfx('toggleOn');
      toast(`System Audio Connected (${music.hardwareDeviceName})! Voice DSP disabled.`, 'ok');
    } else {
      toast('Hardware audio input permission not granted.', 'err');
    }
  });

  $('#revertStreamingAudioBtn')?.addEventListener('click', () => {
    closeAudioModal();
    music.disableHardwareAudio();
    sfx('toggleOff');
    toast('Switched back to Built-In Streaming Sync Engine', 'info');
  });

  // Update button visual states
  music.on('hardware-audio', info => {
    const isLive = typeof info === 'object' ? info.active : !!info;
    const mode = typeof info === 'object' ? info.mode : (isLive ? 'device' : 'none');

    if (tabAudioBtn) {
      tabAudioBtn.classList.toggle('primary', isLive && mode === 'tab');
      tabAudioBtn.style.background = (isLive && mode === 'tab') ? '#10B981' : '';
      tabAudioBtn.style.color = (isLive && mode === 'tab') ? '#fff' : '';
      tabAudioBtn.style.borderColor = (isLive && mode === 'tab') ? '#10B981' : '';
    }

    if (liveAudioBtn) {
      liveAudioBtn.classList.toggle('primary', isLive && mode === 'device');
      liveAudioBtn.style.background = (isLive && mode === 'device') ? 'var(--accent)' : '';
      liveAudioBtn.style.color = (isLive && mode === 'device') ? '#fff' : '';
      liveAudioBtn.style.borderColor = (isLive && mode === 'device') ? 'var(--accent)' : '';
    }
  });

  playBtn.addEventListener('click', () => { source === 'disc' ? discMaker.toggle() : music.toggle(); sfx('click'); });
  prevBtn.addEventListener('click', () => { source === 'disc' ? discMaker.randomize() : music.prev(); sfx('click'); });
  nextBtn.addEventListener('click', () => { source === 'disc' ? discMaker.randomize() : music.next(); sfx('click'); });
  stopBtn.addEventListener('click', () => { source === 'disc' ? discMaker.stop() : music.stop(); sfx('click'); });
  muteBtn.addEventListener('click', () => { source === 'disc' ? discMaker.toggleMute() : music.toggleMute(); sfx('toggleOn'); });

  volSlider.addEventListener('input', e => {
    if (source === 'disc') discMaker.setVolume(Number(e.target.value)); else music.setVolume(Number(e.target.value));
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
    if (source === 'disc') return;
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
    if (source === 'disc') { queueList.innerHTML = '<a href="#/disc-maker" class="btn sm">Open disc_maker studio →</a>'; return; }
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
    tray.innerHTML = state.repos.filter(r => r.featured).map(r => `
      <a href="#/repos/${r.name}" class="ws-item-btn text-xs font-mono" title="${escapeHtml(r.name)} — Open workspace page">
        ${getLangIcon(r.lang)}
        <span class="ws-short-label">${escapeHtml(r.name.slice(0, 10))}</span>
      </a>
    `).join('');
  }
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
    { label: '5Tube: Multiplayer Synchronized Theater', sub: 'Multiplayer Party', action: () => location.hash = '#/5tube' },
    ...TOOLS.map(t => ({ label: `Tool: ${t.title}`, sub: 'Tools', action: () => location.hash = `#/tools/${t.id}` })),
    ...DEMOS.map(d => ({ label: `Demo: ${d.title}`, sub: 'Demos', action: () => location.hash = `#/demos/${d.id}` })),
    ...Object.entries(THEMES).map(([k, name]) => ({ label: `Theme: ${name}`, sub: 'Palette', action: () => applyTheme(k) })),
    ...state.repos.slice(0, 25).map(r => ({ label: `Repo: ${r.name}`, sub: r.lang || 'Code', action: () => location.hash = `#/repos/${r.name}` }))
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

  // Initialize interactive cursor & context menu
  initCustomCursor();
  initContextMenu();
  initMusicVibeReactor();

  // 1. Mount instant static tools & demos IMMEDIATELY without waiting for network
  renderToolsGrid();
  renderDemosGrid();
  initHomeQuickWorkbench();
  initHomeDemoPlayground();
  initHeroCanvas();
  initMusicDock();

  // Router listener
  window.addEventListener('hashchange', navigate);
  navigate();

  // 2. Fetch local data (pre-baked for instant load)
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

  // Mount components dependent on fetched data
  renderRepositories();
  renderTransmissions();
  initOverviewScroller();

  // If currently on repos directory or a repo page, re-render now that metadata is loaded
  if (location.hash === '#/repos' || location.hash === '#/repos/') {
    const mountPoint = $('#subViewMount');
    if (mountPoint) renderReposDirectory(mountPoint);
  } else if (location.hash.startsWith('#/repos/')) {
    const repoName = decodeURIComponent(location.hash.replace('#/repos/', ''));
    const mountPoint = $('#subViewMount');
    if (mountPoint) renderRepoPage(repoName, mountPoint);
  }

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

  // Dedicated Mobile Navigation Drawer & Bottom Tabs
  const mobileDrawer = $('#mobileDrawerModal');
  const openMobileDrawer = () => {
    if (!mobileDrawer) return;
    mobileDrawer.classList.remove('hidden');
    mobileDrawer.classList.add('open');
    sfx('open');
  };
  const closeMobileDrawer = () => {
    if (!mobileDrawer) return;
    mobileDrawer.classList.remove('open');
    mobileDrawer.classList.add('hidden');
    sfx('close');
  };

  $('#mobileMenuBtn')?.addEventListener('click', openMobileDrawer);
  $('#closeMobileDrawerBtn')?.addEventListener('click', closeMobileDrawer);
  mobileDrawer?.addEventListener('click', e => {
    if (e.target === mobileDrawer || e.target.closest('.mobile-drawer-link')) {
      closeMobileDrawer();
    }
  });

  $('#mobileSearchBtn')?.addEventListener('click', openCmdPalette);

  // Mobile Theme Cycle
  const mobileThemeCycleBtn = $('#mobileThemeCycleBtn');
  const mobileThemeDot = $('#mobileThemeDot');
  const TONE_KEYS = ['latte', 'cream', 'readme', 'chainsaw', 'ostania', 'cyber'];
  mobileThemeCycleBtn?.addEventListener('click', e => {
    const cur = document.documentElement.dataset.tone || 'latte';
    const next = TONE_KEYS[(TONE_KEYS.indexOf(cur) + 1) % TONE_KEYS.length];
    applyTheme(next, e.clientX, e.clientY);
    if (mobileThemeDot) mobileThemeDot.style.background = cssVar('--accent');
    toast(`Palette: ${next.toUpperCase()}`, 'info');
  });

  // Mobile theme choices in drawer
  $$('.mobile-theme-choice').forEach(btn => {
    btn.addEventListener('click', e => {
      applyTheme(btn.dataset.setTone, e.clientX, e.clientY);
      closeMobileDrawer();
    });
  });

  // Update active tab on hashchange
  function updateMobileNavTab() {
    const hash = location.hash || '#/';
    $$('.mob-tab-btn').forEach(btn => {
      const tab = btn.dataset.tab;
      const isActive = (tab === 'home' && (hash === '#/' || hash === '')) ||
                       (tab === 'demos' && hash.startsWith('#/demos')) ||
                       (tab === 'tools' && hash.startsWith('#/tools')) ||
                       (tab === 'repos' && hash.startsWith('#/repos')) ||
                       (tab === 'tube' && (hash.startsWith('#/5tube') || hash.startsWith('#/tube')));
      btn.classList.toggle('active', isActive);
    });
  }
  window.addEventListener('hashchange', updateMobileNavTab);
  updateMobileNavTab();

  // Chainsaw Ripcord Mode
  $('#revChainsawBtn')?.addEventListener('click', () => {
    state.csmBoost = 6;
    sfx('rev');
    toast('CHAINSAW RIPCORD ENGAGED!', 'ok');
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
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

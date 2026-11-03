// Shared building blocks for the demo modules (docs/js/demos/*).
// Keeps the five demos visually consistent: header sticker + lede, control
// builders, persisted settings, theme palette for canvas art, grain overlay.
import { icon, store, debounce, cssVar } from '../core/util.js';

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const KIT_CSS = `
.dk { display:flex; flex-direction:column; gap:16px; }
.dk-head { display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:14px 24px; }
.dk-head > div:first-child { min-width:0; flex:1 1 380px; }
.dk-lede { font-family:var(--font-serif); font-size:clamp(19px,2.3vw,25px); line-height:1.28; color:var(--ink); max-width:50ch; text-wrap:pretty; }
.dk-lede em { font-style:italic; color:var(--accent); position:relative; white-space:nowrap; }
.dk-scribble { position:absolute; left:-3%; bottom:-.34em; width:106%; height:.6em; overflow:visible; pointer-events:none; }
.dk-scribble path { fill:none; stroke:var(--accent); stroke-width:2.4; stroke-linecap:round; stroke-dasharray:300; stroke-dashoffset:300; animation:dkDraw 1.2s .45s var(--ease) forwards; vector-effect:non-scaling-stroke; }
@keyframes dkDraw { to { stroke-dashoffset:0; } }
.dk-sticker { display:inline-flex; align-items:center; gap:7px; margin:0 0 12px 2px; padding:4px 10px 4px 8px;
  font:600 10.5px var(--font-mono); letter-spacing:.14em; text-transform:uppercase; color:var(--accent);
  background:var(--elevated); border:1.5px dashed var(--line-strong); border-radius:8px;
  transform:rotate(-2.2deg); box-shadow:2px 3px 0 var(--line); transition:transform .4s var(--ease-spring); }
.dk-sticker:hover { transform:rotate(1deg) scale(1.04); }
.dk-sticker svg { width:13px; height:13px; }
.dk-local { display:inline-flex; align-items:center; gap:6px; font:500 11px var(--font-mono); color:var(--faint); }
.dk-local svg { width:13px; height:13px; }
.dk-head .btn svg:last-child { width:12px; height:12px; opacity:.6; }
.dk-grain { position:relative; }
.dk-grain::after { content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit; background-image:${GRAIN}; opacity:.22; mix-blend-mode:overlay; }
.dk-stage { position:relative; border-radius:var(--r); overflow:hidden; background:var(--surface); border:1px solid var(--line); box-shadow:inset 0 2px 10px rgba(0,0,0,.16); }
.dk-stage > canvas { display:block; width:100%; }
.dk-tool { padding:14px; display:flex; flex-direction:column; gap:12px; min-width:0; }
.dk-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.dk-bar .sp { flex:1 1 0; }
.dk-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(104px,1fr)); gap:8px; }
.dk-stat { position:relative; padding:9px 12px 10px; border-radius:var(--r-sm); background:var(--bg); border:1px solid var(--line); box-shadow:inset 0 1px 0 var(--hi); display:flex; flex-direction:column; gap:1px; overflow:hidden; }
.dk-stat b { font:600 18px/1.2 var(--font-mono); color:var(--ink); font-variant-numeric:tabular-nums; letter-spacing:-.02em; transition:color .3s; }
.dk-stat b small { font-size:11px; color:var(--faint); font-weight:500; margin-left:2px; }
.dk-stat span { font:500 9.5px var(--font-mono); letter-spacing:.14em; text-transform:uppercase; color:var(--faint); }
.dk-stat.hot b { color:var(--accent); }
.dk-stat.bump b { animation:dkBump .45s var(--ease-spring); }
@keyframes dkBump { 40% { transform:scale(1.12); } }
.dk-group { display:flex; flex-direction:column; gap:11px; }
.dk-group + .dk-group { padding-top:14px; border-top:1px dashed var(--line); }
.dk-f { display:flex; flex-direction:column; gap:3px; font:500 11px var(--font-mono); color:var(--muted); }
.dk-f > .lab { display:flex; justify-content:space-between; gap:8px; }
.dk-f output { color:var(--ink); font-variant-numeric:tabular-nums; }
.dk-sw { display:flex; align-items:center; justify-content:space-between; gap:10px; font:500 11.5px var(--font-mono); color:var(--muted); cursor:pointer; user-select:none; }
.dk-sw:hover { color:var(--ink); }
.dk-keys { display:flex; flex-wrap:wrap; gap:7px 12px; font:500 10.5px var(--font-mono); color:var(--faint); }
.dk-keys span { display:inline-flex; gap:5px; align-items:center; }
.dk .seg.full { display:flex; }
.dk .seg.full > button { flex:1 1 0; padding:0 6px; }
.dk .seg > button:disabled { opacity:.4; pointer-events:none; }
.dk .btn.primary { box-shadow:0 6px 16px -8px var(--accent), inset 0 1px 0 rgba(255,255,255,.18); }
.dk .btn:active { transform:scale(.94); }
.dk-note { font:500 11px/1.5 var(--font-mono); color:var(--faint); }
.dk-note b { color:var(--muted); font-weight:600; }
.dk-tape { position:absolute; width:62px; height:18px; background:color-mix(in srgb, var(--accent) 22%, transparent); border-left:2px dotted color-mix(in srgb, var(--ink) 18%, transparent); border-right:2px dotted color-mix(in srgb, var(--ink) 18%, transparent); transform:rotate(-6deg); z-index:3; pointer-events:none; backdrop-filter:blur(1px); }
.dk-overlay { position:absolute; inset:0; display:grid; place-items:center; z-index:2; pointer-events:none; }
.dk-overlay > * { pointer-events:auto; }
.dk .dropzone { min-height:0; padding:16px; gap:6px; }
.dk .dropzone .big svg { width:26px; height:26px; }
@media (max-width:560px) { .dk-tool { padding:10px; } .dk-hide-sm { display:none !important; } }
`;

let kitRefs = 0, kitEl = null;

/** Inject kit + module CSS, add root classes. Returns cleanup. */
export function useKit(root, cls, css = '') {
  if (!kitRefs++) { kitEl = document.createElement('style'); kitEl.dataset.owner = 'demo-kit'; kitEl.textContent = KIT_CSS; document.head.appendChild(kitEl); }
  const st = document.createElement('style'); st.dataset.owner = cls; st.textContent = css; document.head.appendChild(st);
  root.classList.add('dk', cls);
  return () => { st.remove(); root.classList.remove('dk', cls); if (!--kitRefs) { kitEl.remove(); kitEl = null; } };
}

export const scrib = `<svg class="dk-scribble" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8.5C18 4 31 10.5 47 6.8S78 3.6 92 6.4 112 8.6 118 5.2"/></svg>`;
const LOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>`;

/** Demo header: repo sticker, serif lede (may contain <em>), GitHub button. */
export function head({ repo, lede, local = true, note = 'Runs 100% on your device' }) {
  return `<header class="dk-head pop-in">
    <div><span class="dk-sticker">${icon('github')} 5ivesaw/${repo}</span><p class="dk-lede">${lede}</p></div>
    <div class="row wrap">${local ? `<span class="dk-local">${LOCK} ${note}</span>` : ''}
      <a class="btn" href="https://github.com/5ivesaw/${repo}" target="_blank" rel="noopener">${icon('github')} View source on GitHub ${icon('external')}</a></div>
  </header>`;
}

/** Persisted settings: returns [state, save()] */
export function prefs(key, defaults) {
  const saved = store.get('demo:' + key, {}) || {};
  const s = { ...defaults };
  for (const k in defaults) if (k in saved && typeof saved[k] === typeof defaults[k]) s[k] = saved[k];
  const save = debounce(() => store.set('demo:' + key, s), 250);
  return [s, save];
}

/* ---- control builders (HTML strings) ---- */
export const range = (k, label, min, max, step, v, out = v) =>
  `<label class="dk-f"><span class="lab">${label}<output data-out="${k}">${out}</output></span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}" aria-label="${label}"></label>`;
export const seg = (k, opts, v, cls = '', label = k) =>
  `<div class="seg ${cls}" role="group" aria-label="${label}" data-seg="${k}">${opts.map(([val, lab, tip]) => `<button type="button" data-v="${val}" aria-pressed="${String(val) === String(v)}"${tip ? ` title="${tip}"` : ''}>${lab}</button>`).join('')}</div>`;
export const sw = (k, label, on) =>
  `<label class="dk-sw"><span>${label}</span><button type="button" class="switch" role="switch" data-sw="${k}" aria-checked="${!!on}" aria-label="${label.replace(/<[^>]+>/g, '')}"></button></label>`;

/**
 * Wire [data-k] ranges, [data-seg] segmented controls and [data-sw] switches to state.
 * fmt: { key: v => 'label' } for <output>. onChange(key, value). Returns set(key, value).
 */
export function bindControls(root, s, save, onChange = () => {}, fmt = {}, sfx) {
  const outs = {};
  root.querySelectorAll('[data-out]').forEach(o => outs[o.dataset.out] = o);
  const show = k => { if (outs[k]) outs[k].textContent = fmt[k] ? fmt[k](s[k]) : s[k]; };
  const fill = el => { const min = +el.min || 0, max = +el.max || 100; el.style.setProperty('--p', `${((el.value - min) / (max - min)) * 100}%`); };
  root.querySelectorAll('input[data-k]').forEach(el => {
    const k = el.dataset.k; fill(el); show(k);
    el.addEventListener('input', () => { s[k] = +el.value; fill(el); show(k); save(); onChange(k, s[k]); });
  });
  root.querySelectorAll('[data-seg]').forEach(g => {
    const k = g.dataset.seg;
    g.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if (!b || b.disabled) return;
      const v = typeof s[k] === 'number' ? +b.dataset.v : b.dataset.v;
      if (s[k] === v) return;
      set(k, v); sfx?.('tick'); onChange(k, v);
    });
  });
  root.querySelectorAll('[data-sw]').forEach(b => {
    const k = b.dataset.sw;
    b.addEventListener('click', e => { e.preventDefault(); set(k, !s[k]); sfx?.(s[k] ? 'toggleOn' : 'toggleOff'); onChange(k, s[k]); });
  });
  function set(k, v) {
    s[k] = v; save();
    root.querySelectorAll(`[data-seg="${k}"] > button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
    root.querySelectorAll(`[data-sw="${k}"]`).forEach(b => b.setAttribute('aria-checked', String(!!v)));
    root.querySelectorAll(`input[data-k="${k}"]`).forEach(el => { el.value = v; fill(el); });
    show(k);
  }
  return set;
}

/* ---- misc helpers ---- */
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
/** true when a keyboard event should be left alone (typing in a field, or activating a focused button with space/enter). */
export function typing(e) {
  const t = e.target;
  if (!t || !t.closest) return false;
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  if (t.closest('textarea,select,[contenteditable],input:not([type=range]):not([type=checkbox])')) return true;
  if ((e.key === ' ' || e.key === 'Enter') && t.closest('button,a,input')) return true;
  return false;
}

const pc = document.createElement('canvas').getContext('2d');
/** Parse any CSS colour into [r,g,b,a]. */
export function rgbOf(c) {
  pc.fillStyle = '#000'; pc.fillStyle = c || '#000';
  const v = pc.fillStyle;
  if (v[0] === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1];
  const m = v.match(/[\d.]+/g) || [0, 0, 0, 1];
  return [+m[0], +m[1], +m[2], m[3] == null ? 1 : +m[3]];
}
export function rgba(c, a) { const [r, g, b] = rgbOf(c); return `rgba(${r},${g},${b},${a})`; }
/** Theme palette for canvas art. Re-read on onThemeChange. */
export function palette() {
  const p = {};
  for (const k of ['bg', 'surface', 'elevated', 'ink', 'muted', 'faint', 'accent', 'accent-2', 'line', 'on-accent']) p[k.replace('-2', '2').replace('on-accent', 'onAccent')] = cssVar('--' + k) || '#888';
  const bgL = rgbOf(p.bg); p.dark = (bgL[0] * .299 + bgL[1] * .587 + bgL[2] * .114) < 110;
  return p;
}

export const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; };
export const easeOutCubic = t => 1 - (1 - t) ** 3;
export const easeInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
/** roundRect with fallback */
export function rr(ctx, x, y, w, h, r) { if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
/** Seeded PRNG (mulberry32). */
export function rng(seed = 1) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/** Bump-animate a stat element's value. */
export function setStat(el, text, bump = false) {
  if (!el || el.innerHTML === text) return;
  el.innerHTML = text;
  if (bump && !reduced()) { const p = el.parentElement; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
}

// Shared utilities for the shell, tools and demos.
// Every tool/demo module imports from here rather than re-implementing these.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escape a string for safe insertion into innerHTML. */
export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Tagged-template helper: html`<div>${x}</div>` -> DocumentFragment (values are escaped unless wrapped in raw()). */
export function raw(s) { return { __raw: String(s) }; }
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) {
      const v = vals[i];
      if (v == null || v === false) return;
      if (Array.isArray(v)) out += v.map(x => (x && x.__raw != null) ? x.__raw : esc(x)).join('');
      else out += (v && v.__raw != null) ? v.__raw : esc(v);
    }
  });
  const t = document.createElement('template');
  t.innerHTML = out.trim();
  return t.content;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export function debounce(fn, ms = 150) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function throttleRaf(fn) { let q = false, last; return (...a) => { last = a; if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(...last); }); }; }

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '—';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i ? 1 : 0)} ${u[i]}`;
}
export function formatTime(sec, ms = false) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  const base = `${m}:${String(s).padStart(2, '0')}`;
  return ms ? `${base}.${String(Math.floor((sec % 1) * 100)).padStart(2, '0')}` : base;
}
export function timeAgo(date) {
  const d = (Date.now() - new Date(date).getTime()) / 1000;
  if (!Number.isFinite(d)) return '';
  const units = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [s, u] of units) if (d >= s) return `${Math.floor(d / s)}${u} ago`;
  return 'just now';
}

/** Trigger a browser download for a Blob (fully local, nothing uploaded). */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const baseName = name => String(name || 'file').replace(/\.[^.]+$/, '');

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    ta.remove(); return ok;
  }
}

/** Toasts. type: 'info' | 'ok' | 'err' */
export function toast(msg, type = 'info', ms = 2400) {
  let host = document.querySelector('.toast-host');
  if (!host) { host = document.createElement('div'); host.className = 'toast-host'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
  while (host.children.length > 2) host.firstElementChild.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="t-dot" style="${type === 'err' ? 'background:#e5484d' : type === 'ok' ? 'background:#30a46c' : ''}"></span><span></span>`;
  t.lastChild.textContent = msg;
  host.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
}

/**
 * Wire a .dropzone <label> (containing an <input type=file>) + window paste.
 * onFiles(FileList|File[]) is called with chosen files. Returns cleanup fn.
 */
export function bindDropzone(zone, onFiles, { accept, paste = true } = {}) {
  const input = zone.querySelector('input[type=file]');
  if (input && accept) input.accept = accept;
  const ok = f => !accept || accept.split(',').some(a => { a = a.trim(); return a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : (f.type === a || f.name.toLowerCase().endsWith(a)); });
  const handle = files => { const list = Array.from(files || []).filter(ok); if (list.length) onFiles(list); else if (files && files.length) toast('Unsupported file type', 'err'); };
  const onChange = () => { handle(input.files); input.value = ''; };
  const over = e => { e.preventDefault(); zone.classList.add('drag'); };
  const leave = () => zone.classList.remove('drag');
  const drop = e => { e.preventDefault(); leave(); handle(e.dataTransfer.files); };
  const onPaste = e => { if (e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return; const f = Array.from(e.clipboardData?.files || []); if (f.length) handle(f); };
  input?.addEventListener('change', onChange);
  zone.addEventListener('dragover', over); zone.addEventListener('dragleave', leave); zone.addEventListener('drop', drop);
  if (paste) window.addEventListener('paste', onPaste);
  return () => {
    input?.removeEventListener('change', onChange);
    zone.removeEventListener('dragover', over); zone.removeEventListener('dragleave', leave); zone.removeEventListener('drop', drop);
    if (paste) window.removeEventListener('paste', onPaste);
  };
}

/** Keep a range input's filled-track CSS var (--p) in sync. Call once per range (or on container). */
export function syncRange(input) {
  const set = () => { const min = +input.min || 0, max = +input.max || 100; input.style.setProperty('--p', `${((input.value - min) / (max - min)) * 100}%`); };
  input.addEventListener('input', set); set();
  return set;
}
export function syncRanges(root) { $$('input[type=range]', root).forEach(syncRange); }

/** Read a CSS custom property from :root (theme token), e.g. cssVar('--accent'). */
export const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Run cb whenever the theme changes (html[data-tone] mutates). Returns cleanup. */
export function onThemeChange(cb) {
  const mo = new MutationObserver(() => cb(document.documentElement.dataset.tone));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tone'] });
  return () => mo.disconnect();
}

/** Run a rAF loop only while `el` is on-screen and the tab is visible. Returns stop(). */
export function visibleLoop(el, frame) {
  let raf = 0, onScreen = true, last = performance.now(), stopped = false;
  const tick = now => { raf = 0; if (stopped) return; const dt = Math.min(64, now - last); last = now; frame(dt, now); schedule(); };
  const schedule = () => { if (!raf && !stopped && onScreen && !document.hidden) raf = requestAnimationFrame(tick); };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; last = performance.now(); schedule(); });
  io.observe(el);
  const vis = () => { last = performance.now(); schedule(); };
  document.addEventListener('visibilitychange', vis);
  schedule();
  return () => { stopped = true; cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', vis); };
}

/** Size a canvas to its CSS box at devicePixelRatio (capped). Returns {w,h,dpr} in CSS px. */
export function fitCanvas(canvas, maxDpr = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h, dpr, ctx };
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem('5s:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('5s:' + k, JSON.stringify(v)); } catch {} },
};

/** Small inline SVG icon set (stroke icons, 24px grid). icon('play') -> svg string */
const P = {
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
  next: '<path d="M5 5v14l10-7z" fill="currentColor" stroke="none"/><rect x="16.5" y="5" width="2.5" height="14" rx="1" fill="currentColor" stroke="none"/>',
  prev: '<path d="M19 5v14L9 12z" fill="currentColor" stroke="none"/><rect x="5" y="5" width="2.5" height="14" rx="1" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  vol: '<path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path d="m17 9.5 5 5m0-5-5 5"/>',
  shuffle: '<path d="M3 7h3.5c4 0 6 10 10 10H21M3 17h3.5c1.6 0 2.8-1.6 3.9-3.5M14 9.6C15 8 16 7 17.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h13l-3-3M20 13v2a3 3 0 0 1-3 3H4l3 3"/>',
  list: '<path d="M4 6h12M4 12h12M4 18h8M19 15v6m0 0-2.5-2M19 21l2.5-2"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"/>',
  upload: '<path d="M12 20V9m0 0-4.5 4.5M12 9l4.5 4.5M5 5h14"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  github: '<path fill="currentColor" stroke="none" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/>',
  youtube: '<path fill="currentColor" stroke="none" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6z"/>',
  discord: '<path fill="currentColor" stroke="none" d="M20.3 4.4a19.8 19.8 0 0 0-4.9-1.5l-.6 1.3a18.3 18.3 0 0 0-5.5 0l-.6-1.3a19.7 19.7 0 0 0-4.9 1.5C.5 9-.3 13.6.1 18a19.9 19.9 0 0 0 6 3.1l1.3-2c-.7-.3-1.3-.6-1.9-.9l.4-.3c3.9 1.8 8.2 1.8 12.1 0l.4.3c-.6.3-1.2.6-1.9.9l1.2 2a19.8 19.8 0 0 0 6-3.1c.5-5.1-.8-9.6-3.4-13.6ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  fork: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v1a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 11v6"/>',
  tools: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 1.4-1.4M14.7 6.3 9.3 11.7M14.7 6.3 13 4.5a4 4 0 0 0-5.6 5.6l1.9 1.6M3 21l6-6"/>',
  play2: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  audio: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
  text: '<path d="M5 6h14M12 6v13M8 19h8"/>',
  scissors: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5 20 18M8.5 15.5 20 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  sound: '<path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  rows: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.8-4M4 4v4h4M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4"/>',
  rotate: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5M4 4v4.5h4.5"/>',
  flipH: '<path d="M12 3v18M8 7 3 12l5 5zM16 7l5 5-5 5z"/>',
  flipV: '<path d="M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
  undo: '<path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  arrowLeft: '<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14m0 0-6-6m6 6-6 6"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  cam: '<path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
  pointer: '<path d="M5 3l14 7-6 2-2 6z"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h0M10 10h0M14 10h0M18 10h0M7 14h10"/>',
};
export function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.sparkle}</svg>`;
}

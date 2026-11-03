// Shared helpers for the four TOOL modules (image / audio / video / dev).
// Not a tool itself (no registry entry). Keeps the tool files focused.
import { icon, copyText, toast } from '../core/util.js';
import { sfx } from '../core/sfx.js';

export const reduceMotion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');

/** Link docs/css/tools.css (ref-counted) and optionally inject module CSS. Returns cleanup. */
let cssRefs = 0;
export function useStyles(moduleCss = '', key = 'mod') {
  const href = new URL('../../css/tools.css', import.meta.url).href;
  let link = document.querySelector('link[data-tl-css]');
  if (!link) {
    link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
    link.dataset.tlCss = '';
    document.head.appendChild(link);
  }
  cssRefs++;
  let style = null;
  if (moduleCss) {
    style = document.createElement('style');
    style.dataset.tl = key;
    style.textContent = moduleCss;
    document.head.appendChild(style);
  }
  return () => {
    style?.remove();
    if (--cssRefs <= 0) { cssRefs = 0; document.querySelector('link[data-tl-css]')?.remove(); }
  };
}

/** Hand-drawn underline around a word (html string). */
export const scribble = word =>
  `<span class="tl-scrib">${word}<svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true"><path d="M3 9.5C40 4 80 3.5 118 6.2c26 1.8 52 1.4 79-2.6M14 12c48-4.6 103-5 170-2.4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></span>`;

export const doneMark = () => `<span class="tl-done" aria-hidden="true">${icon('check')}</span>`;

/** Keyboard shortcuts that ignore typing in fields. map: { 'key': fn(e) } (key = e.key lowercased, or e.code like 'Space'). */
export function useKeys(map) {
  const h = e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('input:not([type=range]):not([type=checkbox]),textarea,select,[contenteditable]')) return;
    const fn = map[e.code] || map[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (fn) { if (fn(e) !== false) e.preventDefault(); }
  };
  window.addEventListener('keydown', h);
  return () => window.removeEventListener('keydown', h);
}

/** Copy button behaviour: swaps to a check for a moment. */
export async function copyFrom(btn, text) {
  if (!text) { toast('Nothing to copy'); return; }
  const ok = await copyText(text);
  if (ok) {
    sfx('copy');
    btn.classList.add('ok');
    const prev = btn.innerHTML;
    btn.innerHTML = icon('check');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.classList.remove('ok'); btn.innerHTML = prev; }, 1100);
  } else { sfx('error'); toast('Copy failed', 'err'); }
}

/** Tracks disposables so cleanup is one call. */
export function bag() {
  const fns = [];
  const add = fn => { if (typeof fn === 'function') fns.push(fn); return fn; };
  add.on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); fns.push(() => el.removeEventListener(ev, fn, opt)); };
  add.url = u => { fns.push(() => URL.revokeObjectURL(u)); return u; };
  add.run = () => { while (fns.length) { try { fns.pop()(); } catch (e) { console.warn(e); } } };
  return add;
}

/* ---------------- tiny STORE-only zip writer (no deps) ------------------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

/** files: [{ name, blob }] -> Blob (application/zip). Names are made unique. */
export async function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const seen = new Map();
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    let name = f.name;
    if (seen.has(name)) { const n = seen.get(name) + 1; seen.set(name, n); name = name.replace(/(\.[^.]+)?$/, m => ` (${n})${m}`); } else seen.set(name, 0);
    const data = new Uint8Array(await f.blob.arrayBuffer());
    const nb = enc.encode(name), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, nb, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nb.length, true);
    ch.setUint32(42, offset, true);
    central.push(ch.buffer, nb);
    offset += 30 + nb.length + data.length;
  }
  const cSize = central.reduce((s, p) => s + (p.byteLength ?? p.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

/** Load a classic <script> once (used for lamejs). */
const scripts = new Map();
export function loadScript(src) {
  if (!scripts.has(src)) {
    scripts.set(src, new Promise((res, rej) => {
      const s = Object.assign(document.createElement('script'), { src, async: true, crossOrigin: 'anonymous' });
      s.onload = () => res(); s.onerror = () => { scripts.delete(src); s.remove(); rej(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    }));
  }
  return scripts.get(src);
}

/** Intro strip shown at the top of every tool. */
export function intro(lede, keys = []) {
  return `<div class="tl-intro pop-in" style="--i:0">
    <div class="stack" style="gap:6px">
      <p class="lede">${lede}</p>
      <span class="tl-local">Files never leave your device, everything runs locally in your browser</span>
    </div>
    ${keys.length ? `<div class="tl-keys" aria-label="Keyboard shortcuts">${keys.map(([k, l]) => `<span>${k.split('+').map(x => `<kbd>${x}</kbd>`).join('')} ${l}</span>`).join('')}</div>` : ''}
  </div>`;
}

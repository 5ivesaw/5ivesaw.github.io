// Dev Toolkit: JSON, Base64, URL, hashes, UUIDs, timestamps, colours, text case.
// Everything is computed locally; nothing is sent anywhere.
import { icon, esc, toast, store, debounce, formatBytes, download } from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { useStyles, useKeys, copyFrom, bag, intro, scribble } from './_kit.js';

const TABS = [
  ['json', 'JSON'], ['b64', 'Base64'], ['url', 'URL'], ['hash', 'Hash'],
  ['uuid', 'UUID'], ['time', 'Time'], ['color', 'Colour'], ['text', 'Text'],
];

const CSS = `
.tl-dev .dev-tabs { position: sticky; top: 8px; z-index: 5; align-self: flex-start; max-width: 100%; overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; }
.tl-dev .dev-tabs::-webkit-scrollbar { display: none; }
.tl-dev .dev-tabs > button { flex-shrink: 0; }
.tl-dev .dev-tabs > button .n { font-size: 9px; opacity: .5; margin-left: 4px; }
.tl-dev .dev-card { padding: clamp(16px, 2.6vw, 26px); display: flex; flex-direction: column; gap: 14px; min-height: 380px; }
.tl-dev .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 760px) { .tl-dev .cols { grid-template-columns: 1fr; } }
.tl-dev .textarea { min-height: 220px; font-size: 12px; tab-size: 2; white-space: pre; overflow: auto; }
.tl-dev .textarea.wrap { white-space: pre-wrap; word-break: break-all; }
.tl-dev .status { display: flex; align-items: center; gap: 8px; min-height: 26px; font: 500 11.5px var(--font-mono); color: var(--muted); }
.tl-dev .status.err { color: #e5484d; }
.tl-dev .status.ok { color: #30a46c; }
.tl-dev .status .pip { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; animation: tlPop .4s var(--ease-spring) both; }
.tl-dev .kv { display: grid; grid-template-columns: 92px 1fr; gap: 8px 12px; align-items: center; }
.tl-dev .kv .lbl { text-align: right; }
@media (max-width: 520px) { .tl-dev .kv { grid-template-columns: 1fr; } .tl-dev .kv .lbl { text-align: left; } }
.tl-dev .hashrow { display: grid; grid-template-columns: 70px 1fr; gap: 10px; align-items: center; }
.tl-dev .hashrow .input { font-size: 11px; text-overflow: ellipsis; }
.tl-dev .swatch-wrap { display: grid; grid-template-columns: minmax(150px, 220px) 1fr; gap: 18px; align-items: start; }
@media (max-width: 620px) { .tl-dev .swatch-wrap { grid-template-columns: 1fr; } }
.tl-dev .swatch { position: relative; aspect-ratio: 1; border-radius: 20px; border: 1px solid var(--line); box-shadow: var(--shadow), inset 0 0 0 6px color-mix(in srgb, var(--elevated) 60%, transparent); transition: background-color .35s var(--ease); overflow: hidden; cursor: pointer; transform: rotate(-1.5deg); }
.tl-dev .swatch:hover { transform: rotate(0.5deg) scale(1.01); transition: transform .5s var(--ease-spring), background-color .35s var(--ease); }
.tl-dev .swatch input { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer; }
.tl-dev .swatch .tag { position: absolute; left: 12px; bottom: 12px; padding: 3px 8px; border-radius: 6px; font: 600 10.5px var(--font-mono); background: rgba(255,255,255,.85); color: #111; pointer-events: none; }
.tl-dev .shades { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; }
.tl-dev .shades button { aspect-ratio: 1; border-radius: 8px; border: 1px solid var(--line); transition: transform .3s var(--ease-spring); }
.tl-dev .shades button:hover { transform: translateY(-3px) scale(1.08); }
.tl-dev .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
.tl-dev .stat { padding: 12px 14px; border-radius: var(--r); background: var(--bg); border: 1px solid var(--line); display: flex; flex-direction: column; gap: 2px; }
.tl-dev .stat b { font: 600 22px var(--font-mono); color: var(--ink); font-variant-numeric: tabular-nums; }
.tl-dev .stat:nth-child(odd) { transform: rotate(-.6deg); } .tl-dev .stat:nth-child(even) { transform: rotate(.5deg); }
.tl-dev .case-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 10px; }
.tl-dev .case-grid .out .lbl { display: block; margin: 0 0 4px 10px; }
.tl-dev .uuid-list { font: 500 12.5px var(--font-mono); line-height: 1.9; min-height: 200px; }
.tl-dev .clock { font: 600 clamp(26px, 5vw, 40px) var(--font-mono); color: var(--ink); letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.tl-dev .clock small { font-size: .4em; color: var(--faint); letter-spacing: .1em; margin-left: 8px; }
.tl-dev .filepick { display: inline-flex; }
.tl-dev .filepick input { display: none; }
.tl-dev .hint { font: 500 11px var(--font-mono); color: var(--faint); }
`;

const copyBtn = (target, tip = 'Copy') => `<button class="btn sm icon copy" type="button" data-copy="${target}" aria-label="${tip}" data-tip="${tip}">${icon('copy')}</button>`;

export default {
  mount(root) {
    const B = bag();
    B(useStyles(CSS, 'dev'));
    root.classList.add('tl', 'tl-dev');
    let tab = store.get('dev:tab', 'json');
    if (!TABS.some(t => t[0] === tab)) tab = 'json';

    root.innerHTML = `
      ${intro(`The <em>everyday stuff</em>, ${scribble('in one drawer')}.`, [['1', '–'], ['8', 'switch tab']])}
      <div class="seg dev-tabs pop-in" style="--i:1" role="tablist" aria-label="Tool">
        ${TABS.map(([id, l], i) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === tab}" aria-pressed="${id === tab}">${l}<span class="n">${i + 1}</span></button>`).join('')}
      </div>
      <div class="card dev-card pop-in" style="--i:2" role="tabpanel"></div>`;
    const card = root.querySelector('.dev-card');
    const tabsEl = root.querySelector('.dev-tabs');
    let paneCleanup = null;

    const show = (id, sound = true) => {
      tab = id; store.set('dev:tab', id);
      tabsEl.querySelectorAll('button').forEach(b => { const on = b.dataset.tab === id; b.setAttribute('aria-pressed', on); b.setAttribute('aria-selected', on); });
      tabsEl.querySelector(`[data-tab="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      paneCleanup?.(); paneCleanup = null;
      card.innerHTML = `<div class="tl-pane stack" style="gap:14px"></div>`;
      paneCleanup = PANES[id](card.firstElementChild) || null;
      if (sound) sfx('tick');
    };
    B.on(tabsEl, 'click', e => { const b = e.target.closest('[data-tab]'); if (b && b.dataset.tab !== tab) show(b.dataset.tab); });
    // generic copy handler for every output
    B.on(card, 'click', e => {
      const b = e.target.closest('[data-copy]'); if (!b) return;
      const el = card.querySelector(b.dataset.copy);
      copyFrom(b, el ? (el.value ?? el.textContent) : '');
    });
    const keys = {};
    TABS.forEach(([id], i) => { keys[String(i + 1)] = () => show(id); });
    B(useKeys(keys));
    show(tab, false);
    return () => { paneCleanup?.(); B.run(); root.classList.remove('tl', 'tl-dev'); };
  },
};

/* ======================================================================== */
const status = (el, msg, kind = '') => { el.className = 'status ' + kind; el.innerHTML = msg ? `<span class="pip"></span><span>${esc(msg)}</span>` : ''; };

const PANES = {
  /* ----------------------------- JSON ---------------------------------- */
  json(p) {
    const saved = store.get('dev:json', '{\n  "name": "5ivesaw",\n  "tools": ["image", "audio", "video", "dev"],\n  "local": true\n}');
    p.innerHTML = `
      <div class="row wrap between">
        <h3 class="tl-h grow">JSON</h3>
        <div class="row wrap">
          <div class="seg" role="group" aria-label="Indent"><button type="button" data-ind="2" aria-pressed="true">2 sp</button><button type="button" data-ind="4" aria-pressed="false">4 sp</button><button type="button" data-ind="t" aria-pressed="false">tab</button></div>
          <button class="btn sm" data-act="fmt" type="button">Format</button>
          <button class="btn sm" data-act="min" type="button">Minify</button>
          <button class="btn sm" data-act="sort" type="button">Sort keys</button>
        </div>
      </div>
      <div class="cols">
        <label class="stack" style="gap:6px"><span class="lbl">Input</span><textarea class="textarea" id="dj-in" spellcheck="false" aria-label="JSON input">${esc(saved)}</textarea></label>
        <div class="stack" style="gap:6px"><span class="lbl">Output</span><div class="out"><textarea class="textarea" id="dj-out" readonly spellcheck="false" aria-label="JSON output"></textarea>${copyBtn('#dj-out')}</div></div>
      </div>
      <div class="status" id="dj-st" aria-live="polite"></div>`;
    const inp = p.querySelector('#dj-in'), out = p.querySelector('#dj-out'), st = p.querySelector('#dj-st');
    let ind = store.get('dev:jsonInd', '2'), mode = 'fmt';
    const setInd = v => { ind = v; store.set('dev:jsonInd', v); p.querySelectorAll('[data-ind]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ind === v)); };
    setInd(ind);
    const sortDeep = v => Array.isArray(v) ? v.map(sortDeep) : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortDeep(v[k])])) : v;
    const run = () => {
      const src = inp.value; store.set('dev:json', src.slice(0, 200000));
      if (!src.trim()) { out.value = ''; status(st, ''); return; }
      try {
        let v = JSON.parse(src);
        if (mode === 'sort') v = sortDeep(v);
        out.value = mode === 'min' ? JSON.stringify(v) : JSON.stringify(v, null, ind === 't' ? '\t' : +ind);
        const kind = Array.isArray(v) ? `array · ${v.length} items` : v && typeof v === 'object' ? `object · ${Object.keys(v).length} keys` : typeof v;
        status(st, `Valid JSON · ${kind} · ${formatBytes(new Blob([out.value]).size)}`, 'ok');
      } catch (e) {
        out.value = '';
        let msg = e.message, line, col;
        const lc = msg.match(/line (\d+) column (\d+)/);
        const pos = msg.match(/position (\d+)/);
        if (lc) { line = +lc[1]; col = +lc[2]; }
        else if (pos) { const before = src.slice(0, +pos[1]); line = before.split('\n').length; col = before.length - before.lastIndexOf('\n'); }
        msg = msg.replace(/^JSON\.parse: /, '').replace(/ in JSON at position \d+.*$/, '').replace(/\s*\(line \d+ column \d+\)/, '');
        status(st, line ? `Line ${line}, col ${col}: ${msg}` : msg, 'err');
        if (line && pos) { /* select the offending char for quick fixing */ inp.dataset.errpos = pos[1]; } else delete inp.dataset.errpos;
      }
    };
    const deb = debounce(run, 160);
    inp.addEventListener('input', deb);
    st.addEventListener('click', () => { const ps = +inp.dataset.errpos; if (Number.isFinite(ps)) { inp.focus(); inp.setSelectionRange(ps, ps + 1); } });
    p.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); const i = e.target.closest('[data-ind]');
      if (i) { setInd(i.dataset.ind); run(); sfx('tick'); }
      if (a) { mode = a.dataset.act; run(); sfx('click'); }
    });
    run();
  },

  /* ----------------------------- Base64 -------------------------------- */
  b64(p) {
    p.innerHTML = `
      <div class="row wrap between">
        <h3 class="tl-h grow">Base64</h3>
        <div class="row wrap">
          <div class="seg" role="group" aria-label="Direction"><button type="button" data-dir="enc" aria-pressed="true">Encode</button><button type="button" data-dir="dec" aria-pressed="false">Decode</button></div>
          <label class="switch-row" style="gap:8px">URL-safe <button class="switch" role="switch" aria-checked="false" id="b-url" type="button" aria-label="URL-safe alphabet"></button></label>
          <label class="btn sm filepick">${icon('upload')} File → data URL<input type="file" id="b-file"></label>
        </div>
      </div>
      <div class="cols">
        <label class="stack" style="gap:6px"><span class="lbl" id="b-il">Text</span><textarea class="textarea wrap" id="b-in" spellcheck="false" aria-labelledby="b-il">Hello from 5ivesaw ✦</textarea></label>
        <div class="stack" style="gap:6px"><span class="lbl" id="b-ol">Base64</span><div class="out"><textarea class="textarea wrap" id="b-out" readonly spellcheck="false" aria-labelledby="b-ol"></textarea>${copyBtn('#b-out')}</div></div>
      </div>
      <div class="row wrap between"><div class="status" id="b-st"></div><button class="btn sm ghost hidden" id="b-dl" type="button">${icon('download')} Save decoded bytes</button></div>`;
    const inp = p.querySelector('#b-in'), out = p.querySelector('#b-out'), st = p.querySelector('#b-st'), urlSw = p.querySelector('#b-url'), dl = p.querySelector('#b-dl');
    let dir = store.get('dev:b64dir', 'enc'), urlSafe = store.get('dev:b64url', false), lastBytes = null;
    const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
    const fromB64 = s => { s = s.replace(/^data:[^,]*,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; };
    const run = () => {
      p.querySelectorAll('[data-dir]').forEach(b => b.setAttribute('aria-pressed', b.dataset.dir === dir));
      urlSw.setAttribute('aria-checked', urlSafe);
      p.querySelector('#b-il').textContent = dir === 'enc' ? 'Text' : 'Base64';
      p.querySelector('#b-ol').textContent = dir === 'enc' ? 'Base64' : 'Text';
      dl.classList.add('hidden'); lastBytes = null;
      if (!inp.value) { out.value = ''; status(st, ''); return; }
      try {
        if (dir === 'enc') {
          let r = toB64(new TextEncoder().encode(inp.value));
          if (urlSafe) r = r.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          out.value = r; status(st, `${inp.value.length} chars → ${r.length} chars`, 'ok');
        } else {
          const u8 = fromB64(inp.value); lastBytes = u8;
          const txt = new TextDecoder('utf-8', { fatal: true });
          try { out.value = txt.decode(u8); status(st, `Decoded ${formatBytes(u8.length)} of UTF-8 text`, 'ok'); }
          catch { out.value = `[binary data · ${formatBytes(u8.length)}]`; status(st, 'Not UTF-8 text; you can save the raw bytes', 'ok'); }
          dl.classList.remove('hidden');
        }
      } catch { out.value = ''; status(st, 'That isn’t valid Base64', 'err'); }
    };
    inp.addEventListener('input', debounce(run, 120));
    p.addEventListener('click', e => {
      const d = e.target.closest('[data-dir]');
      if (d && d.dataset.dir !== dir) { const prevOut = out.value; dir = d.dataset.dir; store.set('dev:b64dir', dir); if (prevOut && !prevOut.startsWith('[binary')) inp.value = prevOut; run(); sfx('tick'); }
    });
    urlSw.addEventListener('click', e => { e.preventDefault(); urlSafe = !urlSafe; store.set('dev:b64url', urlSafe); sfx(urlSafe ? 'toggleOn' : 'toggleOff'); run(); });
    dl.addEventListener('click', () => { if (lastBytes) { download(new Blob([lastBytes]), 'decoded.bin'); sfx('success'); } });
    p.querySelector('#b-file').addEventListener('change', e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      if (f.size > 25 * 1024 * 1024) { toast('That file is over 25 MB, too big for a data URL', 'err'); return; }
      const fr = new FileReader();
      fr.onload = () => { out.value = fr.result; status(st, `${f.name} · ${formatBytes(f.size)} → ${formatBytes(fr.result.length)} data URL`, 'ok'); sfx('success'); };
      fr.readAsDataURL(f);
    });
    run();
  },

  /* ----------------------------- URL ----------------------------------- */
  url(p) {
    p.innerHTML = `
      <div class="row wrap between">
        <h3 class="tl-h grow">URL encode / decode</h3>
        <div class="seg" role="group" aria-label="Mode"><button type="button" data-m="comp" aria-pressed="true">Component</button><button type="button" data-m="full" aria-pressed="false">Full URL</button></div>
      </div>
      <label class="stack" style="gap:6px"><span class="lbl">Input</span><textarea class="textarea wrap" id="u-in" style="min-height:110px" spellcheck="false">https://5ivesaw.github.io/?q=hello world&tag=ñ✦</textarea></label>
      <div class="cols">
        <div class="stack" style="gap:6px"><span class="lbl">Encoded</span><div class="out"><textarea class="textarea wrap" id="u-enc" readonly style="min-height:110px"></textarea>${copyBtn('#u-enc')}</div></div>
        <div class="stack" style="gap:6px"><span class="lbl">Decoded</span><div class="out"><textarea class="textarea wrap" id="u-dec" readonly style="min-height:110px"></textarea>${copyBtn('#u-dec')}</div></div>
      </div>
      <div id="u-parts"></div>`;
    const inp = p.querySelector('#u-in'), enc = p.querySelector('#u-enc'), dec = p.querySelector('#u-dec'), parts = p.querySelector('#u-parts');
    let m = store.get('dev:urlm', 'comp');
    const run = () => {
      p.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m));
      const v = inp.value;
      enc.value = m === 'comp' ? encodeURIComponent(v) : encodeURI(v);
      try { dec.value = (m === 'comp' ? decodeURIComponent : decodeURI)(v.replace(/\+/g, ' ')); } catch { dec.value = '⚠ malformed percent-encoding'; }
      let u = null; try { u = new URL(v.trim()); } catch {}
      if (u && [...u.searchParams].length) {
        parts.innerHTML = `<h3 class="tl-h" style="margin-bottom:10px">Query params</h3><div class="kv">${[...u.searchParams].map(([k, val]) => `<span class="lbl">${esc(k)}</span><span class="val" style="word-break:break-all">${esc(val)}</span>`).join('')}</div>`;
      } else parts.innerHTML = '';
    };
    inp.addEventListener('input', debounce(run, 100));
    p.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { m = b.dataset.m; store.set('dev:urlm', m); run(); sfx('tick'); } });
    run();
  },

  /* ----------------------------- Hash ---------------------------------- */
  hash(p) {
    const ALG = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
    p.innerHTML = `
      <div class="row wrap between">
        <h3 class="tl-h grow">Hashes (SubtleCrypto)</h3>
        <div class="row wrap">
          <div class="seg" role="group" aria-label="Case"><button type="button" data-c="lo" aria-pressed="true">hex</button><button type="button" data-c="up" aria-pressed="false">HEX</button><button type="button" data-c="b64" aria-pressed="false">b64</button></div>
          <label class="btn sm filepick">${icon('upload')} Hash a file<input type="file" id="h-file"></label>
        </div>
      </div>
      <label class="stack" style="gap:6px"><span class="lbl" id="h-src">Text</span><textarea class="textarea wrap" id="h-in" style="min-height:120px" spellcheck="false">5ivesaw</textarea></label>
      <div class="stack" style="gap:8px">
        ${ALG.map(a => `<div class="hashrow"><span class="lbl">${a}</span><div class="out"><input class="input sq" id="h-${a}" readonly aria-label="${a}">${copyBtn('#h-' + a)}</div></div>`).join('')}
      </div>
      <label class="stack" style="gap:6px"><span class="lbl">Compare with (paste an expected hash)</span><input class="input" id="h-cmp" spellcheck="false" placeholder="paste a hash to verify…"></label>
      <div class="status" id="h-st"></div>`;
    const inp = p.querySelector('#h-in'), st = p.querySelector('#h-st'), cmp = p.querySelector('#h-cmp');
    let fmt = store.get('dev:hashfmt', 'lo'), buf = null, srcName = '', token = 0;
    const out = a => p.querySelector('#h-' + CSS.escape(a));
    const render = async () => {
      p.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === fmt));
      const data = buf || new TextEncoder().encode(inp.value);
      const my = ++token;
      const res = await Promise.all(ALG.map(a => crypto.subtle.digest(a, data)));
      if (my !== token) return;
      res.forEach((h, i) => {
        const u8 = new Uint8Array(h);
        let s = fmt === 'b64' ? btoa(String.fromCharCode(...u8)) : [...u8].map(b => b.toString(16).padStart(2, '0')).join('');
        if (fmt === 'up') s = s.toUpperCase();
        out(ALG[i]).value = s;
      });
      check();
    };
    const check = () => {
      const c = cmp.value.trim().toLowerCase();
      if (!c) { status(st, buf ? `Hashing file ${srcName} · ${formatBytes(buf.byteLength)}` : ''); return; }
      const hit = ALG.find(a => out(a).value.toLowerCase() === c);
      if (hit) { status(st, `Match ✓ (${hit})`, 'ok'); sfx('success'); } else status(st, 'No match', 'err');
    };
    inp.addEventListener('input', debounce(() => { buf = null; p.querySelector('#h-src').textContent = 'Text'; render(); }, 140));
    cmp.addEventListener('input', debounce(check, 120));
    p.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { fmt = b.dataset.c; store.set('dev:hashfmt', fmt); render(); sfx('tick'); } });
    p.querySelector('#h-file').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      if (f.size > 1024 * 1024 * 1024) { toast('Files over 1 GB are not supported here', 'err'); return; }
      status(st, `Reading ${f.name}…`);
      buf = await f.arrayBuffer(); srcName = f.name;
      p.querySelector('#h-src').textContent = `File: ${f.name}`;
      await render(); sfx('success');
    });
    render();
  },

  /* ----------------------------- UUID ---------------------------------- */
  uuid(p) {
    p.innerHTML = `
      <div class="row wrap between">
        <h3 class="tl-h grow">UUID v4</h3>
        <div class="row wrap">
          <label class="row" style="gap:6px"><span class="lbl">Count</span><input class="input sq num" id="g-n" type="number" min="1" max="1000" value="${store.get('dev:uuidN', 5)}" style="width:84px"></label>
          <div class="seg" role="group" aria-label="Format"><button type="button" data-f="lo" aria-pressed="true">lower</button><button type="button" data-f="up" aria-pressed="false">UPPER</button><button type="button" data-f="nd" aria-pressed="false">no dashes</button></div>
          <button class="btn sm primary" id="g-go" type="button">${icon('refresh')} Generate</button>
        </div>
      </div>
      <div class="out"><textarea class="textarea uuid-list" id="g-out" readonly spellcheck="false" aria-label="Generated UUIDs"></textarea>${copyBtn('#g-out', 'Copy all')}</div>
      <p class="hint">Uses crypto.randomUUID (cryptographically secure). Press <kbd>G</kbd> to regenerate.</p>`;
    const n = p.querySelector('#g-n'), out = p.querySelector('#g-out');
    let f = store.get('dev:uuidF', 'lo');
    const uuid = () => crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    const gen = (snd = true) => {
      p.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === f));
      const c = Math.max(1, Math.min(1000, +n.value || 1)); store.set('dev:uuidN', c);
      out.value = Array.from({ length: c }, () => { let u = uuid(); if (f === 'up') u = u.toUpperCase(); if (f === 'nd') u = u.replace(/-/g, ''); return u; }).join('\n');
      if (snd) sfx('click');
    };
    p.querySelector('#g-go').addEventListener('click', () => gen());
    n.addEventListener('change', () => gen());
    p.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { f = b.dataset.f; store.set('dev:uuidF', f); gen(); } });
    const off = useKeys({ g: () => gen() });
    gen(false);
    return off;
  },

  /* ----------------------------- Time ---------------------------------- */
  time(p) {
    p.innerHTML = `
      <div class="row wrap between"><h3 class="tl-h grow">Unix timestamp ⇄ date</h3></div>
      <div class="row wrap between" style="gap:12px">
        <div class="clock" id="t-now" aria-live="off">0<small>NOW · s</small></div>
        <div class="row"><button class="btn sm" id="t-use" type="button">Use now</button><button class="btn sm icon copy" type="button" id="t-cnow" aria-label="Copy current timestamp" data-tip="Copy">${icon('copy')}</button></div>
      </div>
      <div class="cols">
        <div class="stack">
          <span class="lbl">Timestamp → date</span>
          <input class="input num" id="t-ts" inputmode="numeric" spellcheck="false" aria-label="Unix timestamp">
          <div class="kv" id="t-res"></div>
        </div>
        <div class="stack">
          <span class="lbl">Date → timestamp</span>
          <input class="input" id="t-dt" type="datetime-local" step="1" aria-label="Local date and time">
          <div class="kv" id="t-res2"></div>
        </div>
      </div>`;
    const ts = p.querySelector('#t-ts'), res = p.querySelector('#t-res'), dt = p.querySelector('#t-dt'), res2 = p.querySelector('#t-res2'), now = p.querySelector('#t-now');
    const rel = ms => { const d = (ms - Date.now()) / 1000; const a = Math.abs(d); const u = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']]; for (const [s, n] of u) if (a >= s) { const v = Math.round(d / s); return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(v, n); } return 'now'; };
    const rows = (el, list) => { el.innerHTML = list.map(([k, v], i) => `<span class="lbl">${k}</span><div class="out"><input class="input sq" id="${el.id}-${i}" readonly value="${esc(v)}">${copyBtn('#' + el.id + '-' + i)}</div>`).join(''); };
    const fromTs = () => {
      const raw = ts.value.trim(); if (!raw) { res.innerHTML = ''; return; }
      let n = Number(raw);
      if (!Number.isFinite(n)) { const d = new Date(raw); if (isNaN(d)) { res.innerHTML = `<span></span><span class="status err"><span class="pip"></span>Not a number or date</span>`; return; } n = d.getTime() / 1000; }
      const ms = Math.abs(n) > 1e11 ? n : n * 1000; // auto-detect ms vs s
      const d = new Date(ms);
      if (isNaN(d)) { res.innerHTML = ''; return; }
      rows(res, [['Unit', Math.abs(n) > 1e11 ? 'milliseconds' : 'seconds'], ['Local', d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })], ['UTC', d.toUTCString()], ['ISO 8601', d.toISOString()], ['Relative', rel(ms)]]);
    };
    const pad = v => String(v).padStart(2, '0');
    const toLocalInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const fromDt = () => {
      const d = new Date(dt.value); if (isNaN(d)) { res2.innerHTML = ''; return; }
      rows(res2, [['Seconds', Math.floor(d.getTime() / 1000)], ['Millis', d.getTime()], ['ISO 8601', d.toISOString()], ['Relative', rel(d.getTime())]]);
    };
    const tick = () => { now.firstChild.nodeValue = Math.floor(Date.now() / 1000); };
    const iv = setInterval(tick, 1000); tick();
    const setNow = () => { const d = new Date(); ts.value = Math.floor(d.getTime() / 1000); dt.value = toLocalInput(d); fromTs(); fromDt(); };
    p.querySelector('#t-use').addEventListener('click', () => { setNow(); sfx('click'); });
    p.querySelector('#t-cnow').addEventListener('click', e => copyFrom(e.currentTarget, String(Math.floor(Date.now() / 1000))));
    ts.addEventListener('input', debounce(fromTs, 120));
    dt.addEventListener('input', fromDt);
    setNow();
    return () => clearInterval(iv);
  },

  /* ----------------------------- Colour -------------------------------- */
  color(p) {
    p.innerHTML = `
      <div class="row wrap between"><h3 class="tl-h grow">Colour converter</h3></div>
      <div class="swatch-wrap">
        <div class="stack">
          <label class="swatch" id="c-sw" aria-label="Pick a colour"><input type="color" id="c-pick"><span class="tag" id="c-tag"></span></label>
          <div class="shades" id="c-shades" aria-label="Lightness scale"></div>
        </div>
        <div class="stack">
          <label class="stack" style="gap:6px"><span class="lbl">Any colour (hex, rgb(), hsl(), oklch(), or a name)</span><input class="input" id="c-in" spellcheck="false" value="${esc(store.get('dev:color', '#c2504a'))}"></label>
          <div class="status" id="c-st"></div>
          <div class="kv" id="c-out"></div>
        </div>
      </div>`;
    const inp = p.querySelector('#c-in'), pick = p.querySelector('#c-pick'), sw = p.querySelector('#c-sw'), out = p.querySelector('#c-out'), st = p.querySelector('#c-st'), tag = p.querySelector('#c-tag'), shades = p.querySelector('#c-shades');
    const run = (fromPicker = false) => {
      const c = parseColor(inp.value);
      if (!c) { status(st, 'Can’t read that colour', 'err'); return; }
      status(st, '');
      store.set('dev:color', inp.value.trim());
      const [r, g, b, a] = c;
      const hex = toHex(r, g, b, a), [h, s, l] = rgbToHsl(r, g, b), [L, C, H] = rgbToOklch(r, g, b);
      const al = a < 1 ? ` / ${+a.toFixed(3)}` : '';
      const vals = [
        ['HEX', hex],
        ['RGB', a < 1 ? `rgb(${r} ${g} ${b}${al})` : `rgb(${r}, ${g}, ${b})`],
        ['HSL', `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%${al})`],
        ['OKLCH', `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${(C < 0.0005 ? 0 : H).toFixed(1)}${al})`],
      ];
      out.innerHTML = vals.map(([k, v], i) => `<span class="lbl">${k}</span><div class="out"><input class="input sq" id="c-o${i}" readonly value="${v}">${copyBtn('#c-o' + i)}</div>`).join('');
      sw.style.backgroundColor = `rgba(${r},${g},${b},${a})`;
      tag.textContent = hex;
      if (!fromPicker) pick.value = toHex(r, g, b, 1);
      // lightness scale in OKLCH (perceptually even)
      shades.innerHTML = [0.95, 0.88, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2].map(Lx => {
        const [rr, gg, bb] = oklchToRgb(Lx, Math.min(C, 0.2), H);
        const hx = toHex(rr, gg, bb, 1);
        return `<button type="button" style="background:${hx}" data-hex="${hx}" aria-label="Use ${hx}" data-tip="${hx}"></button>`;
      }).join('');
    };
    inp.addEventListener('input', debounce(() => run(), 80));
    pick.addEventListener('input', () => { inp.value = pick.value; run(true); });
    shades.addEventListener('click', e => { const b = e.target.closest('[data-hex]'); if (b) { inp.value = b.dataset.hex; run(); sfx('tick'); } });
    run();
  },

  /* ----------------------------- Text ---------------------------------- */
  text(p) {
    p.innerHTML = `
      <div class="row wrap between"><h3 class="tl-h grow">Text case &amp; counter</h3></div>
      <textarea class="textarea wrap" id="x-in" spellcheck="false" style="min-height:150px" aria-label="Text">${esc(store.get('dev:text', 'Hello world, this is the 5ivesaw dev toolkit. Paste anything here.'))}</textarea>
      <div class="stats" id="x-stats"></div>
      <div class="case-grid" id="x-cases"></div>`;
    const inp = p.querySelector('#x-in'), stats = p.querySelector('#x-stats'), cases = p.querySelector('#x-cases');
    const words = s => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-./]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    const CASES = [
      ['UPPER', s => s.toUpperCase()], ['lower', s => s.toLowerCase()],
      ['Title Case', s => s.toLowerCase().replace(/(^|[\s\-(["'])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())],
      ['Sentence case', s => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())],
      ['camelCase', s => words(s).map((w, i) => i ? cap(w) : w.toLowerCase()).join('')],
      ['PascalCase', s => words(s).map(cap).join('')],
      ['snake_case', s => words(s).map(w => w.toLowerCase()).join('_')],
      ['kebab-case', s => words(s).map(w => w.toLowerCase()).join('-')],
      ['CONSTANT_CASE', s => words(s).map(w => w.toUpperCase()).join('_')],
      ['aLtErNaTiNg', s => [...s].map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('')],
      ['Reversed', s => [...s].reverse().join('')],
      ['Slug', s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')],
    ];
    const run = () => {
      const s = inp.value; store.set('dev:text', s.slice(0, 50000));
      const w = (s.match(/\S+/g) || []).length;
      const graphemes = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter().segment(s)].length : [...s].length;
      const list = [['Words', w], ['Characters', graphemes], ['No spaces', s.replace(/\s/g, '').length], ['Lines', s ? s.split('\n').length : 0], ['Sentences', (s.match(/[^.!?]+[.!?]+/g) || []).length], ['Bytes', new TextEncoder().encode(s).length], ['Read time', `${Math.max(1, Math.round(w / 230))}m`]];
      stats.innerHTML = list.map(([k, v]) => `<div class="stat"><span class="lbl">${k}</span><b>${v}</b></div>`).join('');
      cases.innerHTML = CASES.map(([k, f], i) => `<div class="out"><span class="lbl">${k}</span><input class="input sq" id="x-c${i}" readonly value="${esc(f(s).slice(0, 5000))}">${copyBtn('#x-c' + i)}</div>`).join('');
      cases.querySelectorAll('.copy').forEach(b => { b.style.top = 'auto'; b.style.bottom = '3px'; });
    };
    inp.addEventListener('input', debounce(run, 120));
    run();
  },
};

/* ======================= colour maths =================================== */
const clamp255 = v => Math.max(0, Math.min(255, Math.round(v)));
function toHex(r, g, b, a = 1) { const h = [r, g, b].map(v => clamp255(v).toString(16).padStart(2, '0')).join(''); return '#' + h + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : ''); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2; let h = 0, s = 0;
  if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s * 100, l * 100];
}
function hslToRgb(h, s, l) {
  s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const fromLin = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function rgbToOklch(r, g, b) {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  let H = Math.atan2(Bb, A) * 180 / Math.PI; if (H < 0) H += 360;
  return [L, Math.hypot(A, Bb), H];
}
function oklchToRgb(L, C, H) {
  const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ].map(clamp255);
}
let probe = null;
function parseColor(str) {
  const s = String(str).trim().toLowerCase();
  if (!s) return null;
  const num = (v, scale = 1) => v.endsWith('%') ? parseFloat(v) / 100 * scale : parseFloat(v);
  let m;
  if ((m = s.match(/^#?([0-9a-f]{3,8})$/)) && [3, 4, 6, 8].includes(m[1].length)) {
    let h = m[1]; if (h.length < 6) h = [...h].map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
  }
  const args = t => t.replace(/[(),/]/g, ' ').trim().split(/\s+/);
  if ((m = s.match(/^rgba?\((.+)\)$/))) { const a = args(m[1]); if (a.length < 3) return null; return [clamp255(num(a[0], 255)), clamp255(num(a[1], 255)), clamp255(num(a[2], 255)), a[3] != null ? num(a[3], 1) : 1]; }
  if ((m = s.match(/^hsla?\((.+)\)$/))) { const a = args(m[1]); if (a.length < 3) return null; const [r, g, b] = hslToRgb(parseFloat(a[0]), parseFloat(a[1]), parseFloat(a[2])); return [clamp255(r), clamp255(g), clamp255(b), a[3] != null ? num(a[3], 1) : 1]; }
  if ((m = s.match(/^oklch\((.+)\)$/))) { const a = args(m[1]); if (a.length < 3) return null; const L = a[0].endsWith('%') ? parseFloat(a[0]) / 100 : parseFloat(a[0]); const C = a[1].endsWith('%') ? parseFloat(a[1]) / 100 * 0.4 : parseFloat(a[1]); return [...oklchToRgb(L, C, parseFloat(a[2]) || 0), a[3] != null ? num(a[3], 1) : 1]; }
  // named colours via the browser (2D context normalises them)
  probe = probe || document.createElement('canvas').getContext('2d');
  probe.fillStyle = '#010203'; probe.fillStyle = s;
  const v = probe.fillStyle;
  if (v === '#010203' && s !== '#010203') return null;
  return parseColor(v.startsWith('#') ? v : v);
}

// UI sound effects — synthesised with WebAudio (no audio files to load).
// Respects a persisted mute toggle; never plays before the first user gesture.
import { store } from './util.js';

let ctx = null, master = null;
let enabled = store.get('sfx', true);
let volume = store.get('sfxVol', 0.5);
let lastHover = 0;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ f = 600, f2, type = 'sine', dur = 0.08, gain = 0.2, attack = 0.004, delay = 0, q }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (q) { const bq = c.createBiquadFilter(); bq.type = 'lowpass'; bq.frequency.value = q; o.connect(bq); node = bq; }
  node.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.06, gain = 0.12, hp = 2000, delay = 0 }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

const SOUNDS = {
  hover: () => tone({ f: 1800, dur: 0.025, gain: 0.025, type: 'sine' }),
  click: () => { tone({ f: 900, f2: 600, dur: 0.06, gain: 0.12, type: 'triangle' }); noise({ dur: 0.02, gain: 0.04, hp: 4000 }); },
  tick: () => tone({ f: 1400, dur: 0.03, gain: 0.06, type: 'square', q: 3000 }),
  toggleOn: () => { tone({ f: 600, dur: 0.06, gain: 0.1, type: 'triangle' }); tone({ f: 900, dur: 0.08, gain: 0.1, type: 'triangle', delay: 0.05 }); },
  toggleOff: () => { tone({ f: 900, dur: 0.06, gain: 0.1, type: 'triangle' }); tone({ f: 600, dur: 0.08, gain: 0.1, type: 'triangle', delay: 0.05 }); },
  open: () => tone({ f: 380, f2: 760, dur: 0.16, gain: 0.1, type: 'sine' }),
  close: () => tone({ f: 700, f2: 340, dur: 0.14, gain: 0.08, type: 'sine' }),
  whoosh: () => { noise({ dur: 0.35, gain: 0.08, hp: 900 }); tone({ f: 220, f2: 880, dur: 0.3, gain: 0.05, type: 'sine' }); },
  success: () => [523, 659, 784].forEach((f, i) => tone({ f, dur: 0.14, gain: 0.09, type: 'triangle', delay: i * 0.07 })),
  error: () => { tone({ f: 260, dur: 0.12, gain: 0.12, type: 'sawtooth', q: 1200 }); tone({ f: 200, dur: 0.16, gain: 0.12, type: 'sawtooth', q: 1200, delay: 0.1 }); },
  copy: () => { tone({ f: 1200, dur: 0.05, gain: 0.08, type: 'triangle' }); tone({ f: 1600, dur: 0.07, gain: 0.07, type: 'triangle', delay: 0.04 }); },
  type: () => noise({ dur: 0.015, gain: 0.05, hp: 5000 }),
  rev: () => { // chainsaw rev for the Chainsaw theme
    const c = ac(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1400;
    o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.5); o.frequency.exponentialRampToValueAtTime(90, t + 1.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 1.5);
  },
};

/** sfx('click') — play a named UI sound if enabled. */
export function sfx(name) {
  if (!enabled || !navigator.userActivation?.hasBeenActive && !ctx) return;
  if (name === 'hover') { const n = performance.now(); if (n - lastHover < 45) return; lastHover = n; }
  try { SOUNDS[name]?.(); } catch {}
}
sfx.isEnabled = () => enabled;
sfx.setEnabled = v => { enabled = !!v; store.set('sfx', enabled); };
sfx.getVolume = () => volume;
sfx.setVolume = v => { volume = v; store.set('sfxVol', v); if (master) master.gain.value = v * 0.6; };
sfx.unlock = () => ac();

// Ostania 8-Bit Step Sequencer & Chiptune Synthesizer — by 5IVESAW
// 16-step matrix sequencer with WebAudio square/saw synthesis and WAV export.
import {
  $, $$, icon, download, toast, onThemeChange
} from '../core/util.js';
import { sfx } from '../core/sfx.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-chiptune-style';
    style.textContent = `
      .ct-wrap { display: flex; flex-direction: column; gap: 16px; }
      .ct-matrix { display: flex; flex-direction: column; gap: 8px; width: 100%; overflow-x: auto; padding-bottom: 8px; }
      .ct-row { display: flex; align-items: center; gap: 6px; min-width: 580px; }
      .ct-label { width: 75px; font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--ink); flex-shrink: 0; }
      .ct-cell { width: 30px; height: 38px; border-radius: var(--r-sm); background: var(--surface); border: 1px solid var(--line); cursor: pointer; transition: all 0.15s ease; flex-shrink: 0; }
      .ct-cell:hover { border-color: var(--accent); }
      .ct-cell.on { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 10px rgba(255,59,20,0.4); }
      .ct-cell.active-step { outline: 2px solid #FFF; }
    `;
    document.head.appendChild(style);

    const STEPS = 16;
    const TRACKS = [
      { id: 'lead', name: 'LEAD SYNTH', freq: 440, color: 'var(--accent)' },
      { id: 'bass', name: 'BASS PULSE', freq: 110, color: '#00E5FF' },
      { id: 'snare', name: 'SNARE', freq: 0, color: '#FFB300' },
      { id: 'kick', name: 'KICK DRUM', freq: 0, color: '#22C55E' }
    ];

    const grid = Array.from({ length: TRACKS.length }, () => new Uint8Array(STEPS));

    const state = {
      audioCtx: null,
      isPlaying: false,
      currentStep: 0,
      bpm: 128,
      timerId: null
    };

    // Preset: Ostania Theme
    grid[3][0] = grid[3][4] = grid[3][8] = grid[3][12] = 1; // Kick
    grid[2][4] = grid[2][12] = 1; // Snare
    grid[1][0] = grid[1][2] = grid[1][6] = grid[1][8] = grid[1][10] = grid[1][14] = 1; // Bass
    grid[0][0] = grid[0][3] = grid[0][6] = grid[0][9] = grid[0][12] = grid[0][15] = 1; // Lead

    root.innerHTML = `
      <div class="tl ct-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#245C49;color:#fff;font-weight:700;">OSTANIA 8-BIT</span>
              <span class="eyebrow">CHIPTUNE TRACKER // WEBAUDIO</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Ostania 8-Bit Step Sequencer</h2>
            <p class="faint sm mono">16-step matrix drum machine &amp; chiptune synth with square wave voice synthesis.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:16px;display:flex;flex-direction:column;gap:16px;">
            <!-- Sequencer Matrix -->
            <div class="ct-matrix" id="ctMatrixContainer"></div>

            <!-- Playback Bar -->
            <div class="row between wrap items-center" style="gap:8px;padding-top:8px;border-top:1px solid var(--line);">
              <div class="row wrap items-center" style="gap:8px;">
                <button type="button" id="ctPlayBtn" class="btn sm primary">
                  ${icon('play')} Play Sequence
                </button>
                <button type="button" id="ctClearBtn" class="btn sm ghost">Clear</button>
                <button type="button" id="ctRandomBtn" class="btn sm ghost">🎲 Randomize</button>
              </div>

              <div class="row items-center" style="gap:10px;">
                <span class="mono xs faint">TEMPO: <strong id="ctBpmText" style="color:var(--ink);">128 BPM</strong></span>
                <input type="range" id="ctBpmSlider" min="80" max="180" value="128" style="max-width:120px;" />
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">OSTANIA PRESETS</h3>

            <div class="stack" style="gap:8px;">
              <button type="button" class="btn sm text-left" data-preset="ostania">✦ Ostania Spy Mission</button>
              <button type="button" class="btn sm text-left" data-preset="chainsaw">⚡ Chainsaw Demon Hunt</button>
              <button type="button" class="btn sm text-left" data-preset="cyber">🕹️ 8-Bit Cyber Arcade</button>
            </div>

            <div class="divider"></div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Click cells on the 16-step matrix to program drums and retro arpeggios. Toggle playback to listen in real time!
            </div>
          </div>
        </div>
      </div>
    `;

    function ensureAudio() {
      if (!state.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        state.audioCtx = new AudioCtx();
      }
      if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
    }

    function playSound(trackIdx, time) {
      if (!state.audioCtx) return;
      const ctx_ = state.audioCtx;

      if (trackIdx === 3) {
        // Kick
        const osc = ctx_.createOscillator();
        const gain = ctx_.createGain();
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.14);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
        osc.connect(gain);
        gain.connect(ctx_.destination);
        osc.start(time);
        osc.stop(time + 0.16);
      } else if (trackIdx === 2) {
        // Snare
        const buf = ctx_.createBuffer(1, ctx_.sampleRate * 0.12, ctx_.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx_.sampleRate * 0.03));
        const src = ctx_.createBufferSource();
        src.buffer = buf;
        const filter = ctx_.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;
        src.connect(filter);
        filter.connect(ctx_.destination);
        src.start(time);
      } else if (trackIdx === 1) {
        // Bass
        const osc = ctx_.createOscillator();
        const gain = ctx_.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110 + (state.currentStep % 4) * 20, time);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        osc.connect(gain);
        gain.connect(ctx_.destination);
        osc.start(time);
        osc.stop(time + 0.18);
      } else if (trackIdx === 0) {
        // Lead
        const osc = ctx_.createOscillator();
        const gain = ctx_.createGain();
        osc.type = 'square';
        const freqs = [330, 392, 440, 523, 587, 659];
        const f = freqs[state.currentStep % freqs.length];
        osc.frequency.setValueAtTime(f, time);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
        osc.connect(gain);
        gain.connect(ctx_.destination);
        osc.start(time);
        osc.stop(time + 0.22);
      }
    }

    const container = $('#ctMatrixContainer', root);

    function renderMatrix() {
      container.innerHTML = TRACKS.map((t, trIdx) => `
        <div class="ct-row">
          <span class="ct-label">${t.name}</span>
          ${Array.from({ length: STEPS }, (_, stIdx) => `
            <div class="ct-cell ${grid[trIdx][stIdx] ? 'on' : ''} ${stIdx === state.currentStep && state.isPlaying ? 'active-step' : ''}" data-tr="${trIdx}" data-st="${stIdx}"></div>
          `).join('')}
        </div>
      `).join('');
    }

    renderMatrix();

    container.addEventListener('click', e => {
      const cell = e.target.closest('.ct-cell');
      if (!cell) return;
      const tr = parseInt(cell.dataset.tr, 10);
      const st = parseInt(cell.dataset.st, 10);
      grid[tr][st] = grid[tr][st] ? 0 : 1;
      cell.classList.toggle('on', !!grid[tr][st]);
      if (grid[tr][st]) {
        ensureAudio();
        playSound(tr, state.audioCtx.currentTime);
      }
      sfx('tick');
    });

    // Step clock
    function step() {
      if (!state.isPlaying) return;
      ensureAudio();
      const now = state.audioCtx.currentTime;

      for (let tr = 0; tr < TRACKS.length; tr++) {
        if (grid[tr][state.currentStep]) {
          playSound(tr, now);
        }
      }

      // Highlight current step column
      $$('.ct-cell', root).forEach(el => {
        const st = parseInt(el.dataset.st, 10);
        el.classList.toggle('active-step', st === state.currentStep);
      });

      state.currentStep = (state.currentStep + 1) % STEPS;
      const intervalMs = (60 / state.bpm / 4) * 1000;
      state.timerId = setTimeout(step, intervalMs);
    }

    const playBtn = $('#ctPlayBtn', root);
    playBtn.addEventListener('click', () => {
      state.isPlaying = !state.isPlaying;
      if (state.isPlaying) {
        ensureAudio();
        state.currentStep = 0;
        playBtn.innerHTML = `${icon('pause')} Stop Sequence`;
        playBtn.classList.add('danger');
        step();
        sfx('toggleOn');
      } else {
        clearTimeout(state.timerId);
        playBtn.innerHTML = `${icon('play')} Play Sequence`;
        playBtn.classList.remove('danger');
        $$('.ct-cell', root).forEach(el => el.classList.remove('active-step'));
        sfx('toggleOff');
      }
    });

    $('#ctClearBtn', root).addEventListener('click', () => {
      for (let tr = 0; tr < TRACKS.length; tr++) grid[tr].fill(0);
      renderMatrix();
      toast('Matrix cleared', 'ok');
      sfx('trash');
    });

    $('#ctRandomBtn', root).addEventListener('click', () => {
      for (let tr = 0; tr < TRACKS.length; tr++) {
        for (let st = 0; st < STEPS; st++) {
          grid[tr][st] = Math.random() < 0.25 ? 1 : 0;
        }
      }
      renderMatrix();
      toast('Synthesized random chiptune groove!', 'ok');
      sfx('pulse');
    });

    $('#ctBpmSlider', root).addEventListener('input', e => {
      state.bpm = parseInt(e.target.value, 10);
      $('#ctBpmText', root).textContent = `${state.bpm} BPM`;
    });

    // Presets
    $$('[data-preset]', root).forEach(btn => {
      btn.addEventListener('click', () => {
        for (let tr = 0; tr < TRACKS.length; tr++) grid[tr].fill(0);
        const p = btn.dataset.preset;
        if (p === 'ostania') {
          grid[3][0] = grid[3][4] = grid[3][8] = grid[3][12] = 1;
          grid[2][4] = grid[2][12] = 1;
          grid[1][0] = grid[1][2] = grid[1][6] = grid[1][8] = grid[1][14] = 1;
          grid[0][0] = grid[0][3] = grid[0][6] = grid[0][9] = grid[0][12] = grid[0][15] = 1;
        } else if (p === 'chainsaw') {
          grid[3][0] = grid[3][2] = grid[3][6] = grid[3][8] = grid[3][10] = grid[3][14] = 1;
          grid[2][2] = grid[2][6] = grid[2][10] = grid[2][14] = 1;
          grid[0][1] = grid[0][5] = grid[0][9] = grid[0][13] = 1;
        } else if (p === 'cyber') {
          grid[3][0] = grid[3][8] = 1;
          grid[2][4] = grid[2][12] = 1;
          grid[0][0] = grid[0][2] = grid[0][4] = grid[0][7] = grid[0][10] = grid[0][13] = 1;
        }
        renderMatrix();
        toast(`Loaded preset: ${btn.textContent}`, 'ok');
        sfx('tick');
      });
    });

    return () => {
      if (state.timerId) clearTimeout(state.timerId);
      if (state.audioCtx) state.audioCtx.close().catch(() => {});
      const s = document.getElementById('demo-chiptune-style');
      if (s) s.remove();
    };
  }
};

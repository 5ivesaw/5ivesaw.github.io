// ASCII Media Player Demo — Inspired by Ascii-Media-Player (Cross-platform audio visualizer).
// Converts live WebAudio Analyser FFT frequencies & waveform into ASCII text art matrices.
import {
  $, $$, icon, formatBytes, formatTime, toast, cssVar, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';
import { palette, rr, rgba } from './_kit.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.textContent = `
      .ap-wrap { display: flex; flex-direction: column; gap: 16px; }
      .ap-screen { position: relative; width: 100%; height: 420px; background: #0c0a0b; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; }
      .ap-screen canvas { width: 100%; height: 100%; display: block; font-family: var(--font-mono); }
      .ap-overlay-badge { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const state = {
      audioCtx: null,
      analyser: null,
      sourceNode: null,
      audioElement: null,
      micStream: null,
      isMic: false,
      isPlaying: false,
      style: 'bars', // 'bars' | 'mirror' | 'wave' | 'matrix'
      charSet: 'blocks', // 'blocks' | 'ascii' | 'dense' | 'fivesaw'
      colorMode: 'accent', // 'accent' | 'green' | 'amber' | 'mono'
      fftSize: 256,
      smoothing: 0.8,
      animId: null
    };

    const CHAR_SETS = {
      blocks: [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'],
      ascii: [' ', '.', ':', '-', '=', '+', '*', '%', '#', '@'],
      dense: [' ', '·', '░', '▒', '▓', '█'],
      fivesaw: [' ', '5', 'I', 'V', 'E', 'S', 'A', 'W', '█']
    };

    root.innerHTML = `
      <div class="tl ap-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#EAB308;color:#000;">Ascii-Media-Player</span>
              <span class="eyebrow">TERMINAL AUDIO VISUALIZER</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Real-Time ASCII Audio Engine</h2>
            <p class="faint sm mono">Real-time FFT spectrum to terminal character matrix with responsive audio dynamics.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw/Ascii-Media-Player" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} Ascii-Media-Player Repo ↗
            </a>
          </div>
        </div>

        <div class="card pad" style="padding:14px;background:color-mix(in srgb, var(--surface) 60%, transparent);">
          <div class="row" style="gap:8px;">
            <span class="accent">ℹ Note:</span>
            <span class="xs mono faint">Site background music streams via YouTube IFrame API which cannot be intercepted by WebAudio. Load your own local file or enable your microphone below for real-time visualization!</span>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <!-- ASCII Terminal Screen -->
            <div class="ap-screen">
              <div class="ap-overlay-badge">
                <span class="badge" style="background:rgba(0,0,0,0.7);color:var(--accent);border:1px solid var(--line);">ASCII CRT // 60 FPS</span>
              </div>
              <canvas id="apCanvas"></canvas>
            </div>

            <!-- Media Bar -->
            <div class="row between wrap" style="padding:6px 0;">
              <div class="row wrap">
                <button type="button" id="apPlayBtn" class="btn primary sm" disabled>
                  ${icon('play')} Play Track
                </button>
                <button type="button" id="apMicBtn" class="btn sm">
                  ${icon('audio')} Use Microphone
                </button>
              </div>

              <div class="row wrap">
                <label class="btn sm">
                  ${icon('upload')} Load Audio File
                  <input type="file" id="apFileInput" accept="audio/*" hidden />
                </label>
                <span id="apTrackName" class="mono xs faint truncate" style="max-width:180px;">No track loaded</span>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">VISUALIZER SETTINGS</h3>

            <label class="field">
              <span>VISUAL STYLE</span>
              <div class="seg full" id="apStyleSeg">
                <button type="button" data-style="bars" class="on">Bars</button>
                <button type="button" data-style="mirror">Mirror</button>
                <button type="button" data-style="wave">Oscilloscope</button>
                <button type="button" data-style="matrix">Matrix</button>
              </div>
            </label>

            <label class="field">
              <span>CHARACTER RAMP</span>
              <select id="apCharSelect" class="select sq">
                <option value="blocks" selected>Unicode Blocks ( ▂▃▄▅▆▇█)</option>
                <option value="ascii">Classic ASCII (.:-=+*%#@)</option>
                <option value="dense">Halftone Shading ( ░▒▓█)</option>
                <option value="fivesaw">5IVESAW Glyph Set (5IVESAW)</option>
              </select>
            </label>

            <label class="field">
              <span>COLOR PALETTE</span>
              <div class="seg full" id="apColorSeg">
                <button type="button" data-color="accent" class="on">Theme</button>
                <button type="button" data-color="green">Phosphor</button>
                <button type="button" data-color="amber">Amber</button>
                <button type="button" data-color="mono">Monochrome</button>
              </div>
            </label>

            <div class="tl-range" style="margin-top:4px;">
              <div class="field-row">
                <span class="lbl">FFT Smoothing:</span>
                <span id="apSmoothingVal" class="val">0.80</span>
              </div>
              <input type="range" id="apSmoothingSlider" min="0.1" max="0.95" step="0.05" value="0.80" />
            </div>

            <div class="tl-range">
              <div class="field-row">
                <span class="lbl">Volume:</span>
                <span id="apVolVal" class="val">80%</span>
              </div>
              <input type="range" id="apVolSlider" min="0" max="100" value="80" />
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#apCanvas', root);
    const ctx = canvas.getContext('2d');
    const playBtn = $('#apPlayBtn', root);
    const micBtn = $('#apMicBtn', root);

    function initAudio() {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        state.analyser = state.audioCtx.createAnalyser();
        state.analyser.fftSize = state.fftSize;
        state.analyser.smoothingTimeConstant = state.smoothing;
      }
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }
    }

    function setupAudioElement(file) {
      initAudio();
      stopMic();

      if (state.audioElement) {
        state.audioElement.pause();
        state.audioElement.remove();
      }

      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.crossOrigin = 'anonymous';
      state.audioElement = audio;

      const src = state.audioCtx.createMediaElementSource(audio);
      src.connect(state.analyser);
      state.analyser.connect(state.audioCtx.destination);
      state.sourceNode = src;

      audio.onplay = () => {
        state.isPlaying = true;
        playBtn.innerHTML = `${icon('pause')} Pause`;
      };
      audio.onpause = () => {
        state.isPlaying = false;
        playBtn.innerHTML = `${icon('play')} Play Track`;
      };

      $('#apTrackName', root).textContent = file.name;
      playBtn.disabled = false;
      playTrack();
      toast('Loaded audio into visualizer', 'ok');
      sfx('success');
    }

    function playTrack() {
      if (state.audioElement) {
        state.audioElement.play();
      }
    }

    function stopMic() {
      if (state.micStream) {
        state.micStream.getTracks().forEach(t => t.stop());
        state.micStream = null;
      }
      state.isMic = false;
      micBtn.classList.remove('primary');
      micBtn.innerHTML = `${icon('audio')} Use Microphone`;
    }

    async function toggleMic() {
      if (state.isMic) {
        stopMic();
        sfx('toggleOff');
        return;
      }

      try {
        initAudio();
        if (state.audioElement) state.audioElement.pause();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        state.micStream = stream;
        state.isMic = true;

        const micSource = state.audioCtx.createMediaStreamSource(stream);
        micSource.connect(state.analyser);
        // Do not connect mic to destination to avoid acoustic feedback!

        micBtn.classList.add('primary');
        micBtn.innerHTML = `${icon('audio')} Mic: ACTIVE`;
        $('#apTrackName', root).textContent = 'Microphone Feed (Live)';
        toast('Microphone input connected', 'ok');
        sfx('success');
      } catch (err) {
        console.error(err);
        toast('Microphone permission denied', 'err');
        sfx('error');
      }
    }

    let canvasW = 0, canvasH = 0;
    function handleResize() {
      const { w, h } = fitCanvas(canvas);
      canvasW = w;
      canvasH = h;
    }
    window.addEventListener('resize', handleResize, { passive: true });
    handleResize();

    const preFreqData = new Uint8Array(256);
    const preTimeData = new Uint8Array(256);
    let cachedAccentCol = cssVar('--accent') || '#942929';
    onThemeChange(() => { cachedAccentCol = cssVar('--accent') || '#942929'; });

    function renderLoop() {
      const w = canvasW || 600;
      const h = canvasH || 400;
      ctx.fillStyle = '#0c0a0b';
      ctx.fillRect(0, 0, w, h);

      const pulse = music.pulse;
      let freqData = preFreqData;
      let timeData = preTimeData;

      if (state.analyser) {
        state.analyser.getByteFrequencyData(freqData);
        state.analyser.getByteTimeDomainData(timeData);
      } else if (pulse && pulse.isPlaying && pulse.bands) {
        // Automatically sync with background radio stream!
        const len = 64;
        for (let i = 0; i < len; i++) {
          const bandIdx = Math.min(15, Math.floor((i / len) * 16));
          freqData[i] = Math.min(255, Math.floor((pulse.bands[bandIdx] || 0) * 255));
          const waveVal = pulse.waveform ? (pulse.waveform[i % 32] || 0) : 0;
          timeData[i] = Math.min(255, Math.max(0, Math.floor((waveVal + 1) * 127.5)));
        }
        if (!state.isMic && !state.audioElement) {
          const trackEl = $('#apTrackName', root);
          if (trackEl && trackEl.textContent !== 'Radio Stream (Live)') {
            trackEl.textContent = 'Radio Stream (Live)';
          }
        }
      } else {
        // Idle state when nothing is playing
        drawIdleState(w, h);
        state.animId = requestAnimationFrame(renderLoop);
        return;
      }

      // Color scheme
      let col = cachedAccentCol;
      if (state.colorMode === 'green') col = '#22C55E';
      if (state.colorMode === 'amber') col = '#F59E0B';
      if (state.colorMode === 'mono') col = '#E5E7EB';

      ctx.fillStyle = col;
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';

      const ramp = CHAR_SETS[state.charSet] || CHAR_SETS.blocks;
      const cols = Math.floor(w / 14);
      const rows = Math.floor(h / 18);

      if (state.style === 'bars') {
        const step = Math.floor(freqData.length / cols);
        for (let c = 0; c < cols; c++) {
          const val = freqData[c * step] / 255;
          const barHeight = Math.floor(val * rows);

          for (let r = 0; r < rows; r++) {
            const rowFromBottom = rows - 1 - r;
            if (rowFromBottom < barHeight) {
              const charIdx = Math.min(ramp.length - 1, Math.floor((rowFromBottom / rows) * ramp.length));
              ctx.fillText(ramp[charIdx] || '█', c * 14 + 7, r * 18 + 14);
            }
          }
        }
      } else if (state.style === 'mirror') {
        const step = Math.floor(freqData.length / cols);
        const midRow = Math.floor(rows / 2);
        for (let c = 0; c < cols; c++) {
          const val = freqData[c * step] / 255;
          const halfH = Math.floor(val * (rows / 2));
          for (let h = 0; h < halfH; h++) {
            const charIdx = Math.min(ramp.length - 1, Math.floor((h / (rows / 2)) * ramp.length));
            ctx.fillText(ramp[charIdx], c * 14 + 7, (midRow - h) * 18 + 14);
            ctx.fillText(ramp[charIdx], c * 14 + 7, (midRow + h) * 18 + 14);
          }
        }
      } else if (state.style === 'wave') {
        const step = Math.floor(timeData.length / cols);
        for (let c = 0; c < cols; c++) {
          const val = timeData[c * step] / 255; // 0..1
          const targetRow = Math.floor(val * rows);
          ctx.fillText(ramp[ramp.length - 1], c * 14 + 7, targetRow * 18 + 14);
        }
      } else {
        // Matrix style rain
        const step = Math.floor(freqData.length / cols);
        for (let c = 0; c < cols; c++) {
          const val = freqData[c * step] / 255;
          const count = Math.floor(val * rows);
          for (let r = 0; r < count; r++) {
            const char = ramp[(c + r) % ramp.length];
            ctx.fillText(char, c * 14 + 7, (rows - 1 - r) * 18 + 14);
          }
        }
      }

      state.animId = requestAnimationFrame(renderLoop);
    }

    function drawIdleState(w, h) {
      ctx.fillStyle = rgba(cssVar('--accent') || '#942929', 0.4);
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const t = Date.now() * 0.003;
      const msg = '5IVESAW ASCII SPECTRUM // READY';
      ctx.fillText(msg, w / 2, h / 2 - 10);
      const sub = 'Upload an audio track or turn on Mic to begin visualization';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = rgba(cssVar('--muted') || '#888', 0.6);
      ctx.fillText(sub, w / 2, h / 2 + 15);
    }

    // Wire events
    $('#apFileInput', root).addEventListener('change', e => {
      if (e.target.files[0]) setupAudioElement(e.target.files[0]);
    });

    playBtn.addEventListener('click', () => {
      if (!state.audioElement) return;
      if (state.audioElement.paused) state.audioElement.play(); else state.audioElement.pause();
      sfx('click');
    });

    micBtn.addEventListener('click', toggleMic);

    $('#apStyleSeg', root).addEventListener('click', e => {
      const b = e.target.closest('[data-style]');
      if (!b) return;
      $('#apStyleSeg', root).querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      state.style = b.dataset.style;
      sfx('click');
    });

    $('#apColorSeg', root).addEventListener('click', e => {
      const b = e.target.closest('[data-color]');
      if (!b) return;
      $('#apColorSeg', root).querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      state.colorMode = b.dataset.color;
      sfx('click');
    });

    $('#apCharSelect', root).addEventListener('change', e => {
      state.charSet = e.target.value;
    });

    $('#apSmoothingSlider', root).addEventListener('input', e => {
      state.smoothing = Number(e.target.value);
      if (state.analyser) state.analyser.smoothingTimeConstant = state.smoothing;
      $('#apSmoothingVal', root).textContent = state.smoothing.toFixed(2);
    });

    $('#apVolSlider', root).addEventListener('input', e => {
      const v = Number(e.target.value) / 100;
      if (state.audioElement) state.audioElement.volume = v;
      $('#apVolVal', root).textContent = `${e.target.value}%`;
    });

    renderLoop();

    return () => {
      style.remove();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(state.animId);
      stopMic();
      if (state.audioElement) {
        state.audioElement.pause();
        state.audioElement.remove();
      }
      if (state.audioCtx) {
        state.audioCtx.close();
      }
    };
  }
};

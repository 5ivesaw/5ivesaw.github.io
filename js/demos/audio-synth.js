// Cyber Audio Theremin & Lissajous Oscilloscope Demo — by 5IVESAW
// Interactive WebAudio synthesizer with real-time vector CRT oscilloscope and mic input.
import {
  $, $$, icon, download, copyText, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-synth-style';
    style.textContent = `
      .as-wrap { display: flex; flex-direction: column; gap: 16px; }
      .as-screen { position: relative; width: 100%; height: 440px; background: #07090b; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; touch-action: none; cursor: crosshair; user-select: none; }
      .as-screen canvas { width: 100%; height: 100%; display: block; }
      .as-scanlines::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 2px); }
      .as-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
      .as-overlay-hint { position: absolute; bottom: 12px; right: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const state = {
      source: 'synth', // 'synth' | 'mic'
      audioCtx: null,
      analyser: null,
      oscA: null,
      oscB: null,
      filter: null,
      gainNode: null,
      delayNode: null,
      micStream: null,
      micSource: null,
      isPlaying: false,
      waveformType: 'sawtooth', // 'sine' | 'sawtooth' | 'square' | 'triangle'
      scopeMode: 'lissajous', // 'lissajous' | 'wave' | 'radial' | 'fft'
      colorMode: 'neon', // 'neon' | 'amber' | 'emerald' | 'cyan'
      scaleMode: 'pentatonic', // 'free' | 'pentatonic' | 'hirajoshi'
      octave: 0,
      glow: true,
      scanlines: true,
      lastPitch: 220,
      lastCutoff: 1200,
      animId: null
    };

    const SCALES = {
      pentatonic: [0, 2, 4, 7, 9], // Minor pentatonic intervals
      hirajoshi: [0, 2, 3, 7, 8],  // Japanese Hirajoshi
      free: null
    };

    const THEMES = {
      neon: { stroke: '#FF3B14', glow: 'rgba(255, 59, 20, 0.7)', bg: '#090506' },
      amber: { stroke: '#FFB000', glow: 'rgba(255, 176, 0, 0.7)', bg: '#0a0804' },
      emerald: { stroke: '#00FF66', glow: 'rgba(0, 255, 102, 0.7)', bg: '#040a06' },
      cyan: { stroke: '#00F0FF', glow: 'rgba(0, 240, 255, 0.7)', bg: '#04090c' }
    };

    root.innerHTML = `
      <div class="tl as-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#FF3B14;color:#fff;font-weight:700;">AUDIO LAB</span>
              <span class="eyebrow">VECTOR CRT OSCILLOSCOPE // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Cyber Theremin &amp; Lissajous Scope</h2>
            <p class="faint sm mono">Interactive touch audio synthesizer with real-time vector beam oscilloscope and mic analyzer.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="asScreenBox" class="as-screen as-scanlines">
              <div class="as-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid rgba(255,255,255,0.15);">
                  MODE: <strong id="asModeText">THEREMIN SYNTH (CLICK/DRAG)</strong>
                </span>
              </div>
              <div class="as-overlay-hint">
                <span id="asCoordText" class="mono xs faint" style="background:rgba(0,0,0,0.7);padding:3px 8px;border-radius:4px;">
                  X: PITCH · Y: FILTER
                </span>
              </div>
              <canvas id="asCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <div class="seg" id="asSourceSeg">
                  <button type="button" data-src="synth" class="bg-paper-elevated font-semibold">Touch Synth</button>
                  <button type="button" data-src="radio">Radio Stream</button>
                  <button type="button" data-src="mic">Microphone Feed</button>
                </div>
                <div class="seg" id="asScopeSeg">
                  <button type="button" data-scope="lissajous" class="bg-paper-elevated font-semibold">Lissajous</button>
                  <button type="button" data-scope="wave">Waveform</button>
                  <button type="button" data-scope="radial">Radial Ring</button>
                  <button type="button" data-scope="fft">Spectrum</button>
                </div>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="asSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Scope PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">SYNTHESIZER OSCILLATOR</h3>

            <label class="field">
              <span>WAVEFORM ARCHITECTURE</span>
              <div class="seg" id="asWaveSeg">
                <button type="button" data-wave="sawtooth" class="bg-paper-elevated font-semibold">Chainsaw</button>
                <button type="button" data-wave="square">Square</button>
                <button type="button" data-wave="sine">Sine</button>
                <button type="button" data-wave="triangle">Triangle</button>
              </div>
            </label>

            <label class="field">
              <span>SCALE QUANTIZATION</span>
              <div class="seg" id="asScaleSeg">
                <button type="button" data-scale="pentatonic" class="bg-paper-elevated font-semibold">Pentatonic</button>
                <button type="button" data-scale="hirajoshi">Hirajoshi</button>
                <button type="button" data-scale="free">Continuous</button>
              </div>
            </label>

            <label class="field">
              <span>BEAM COLOR PALETTE</span>
              <div class="seg" id="asColorSeg">
                <button type="button" data-col="neon" class="bg-paper-elevated font-semibold" style="color:#FF3B14;">Crimson</button>
                <button type="button" data-col="emerald" style="color:#00FF66;">Emerald</button>
                <button type="button" data-col="cyan" style="color:#00F0FF;">Cyan</button>
                <button type="button" data-col="amber" style="color:#FFB000;">Amber</button>
              </div>
            </label>

            <div class="divider"></div>

            <div class="stack" style="gap:8px;">
              <label class="row between xs mono cursor-pointer">
                <span>CRT Scanlines</span>
                <input type="checkbox" id="asScanlinesCheck" checked />
              </label>
              <label class="row between xs mono cursor-pointer">
                <span>Phosphor Beam Glow</span>
                <input type="checkbox" id="asGlowCheck" checked />
              </label>
            </div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Click &amp; drag anywhere across the screen pad. Horizontal movement tunes frequency; vertical tunes lowpass resonance.
            </div>
          </div>
        </div>
      </div>
    `;

    // Elements
    const canvas = $('#asCanvas', root);
    const ctx = canvas.getContext('2d');
    const screenBox = $('#asScreenBox', root);
    const modeText = $('#asModeText', root);
    const coordText = $('#asCoordText', root);

    function initAudio() {
      if (state.audioCtx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx_ = new AudioCtx();
      state.audioCtx = ctx_;

      const analyser = ctx_.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;
      state.analyser = analyser;

      // Filter
      const filter = ctx_.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      filter.Q.value = 6;
      state.filter = filter;

      // Delay FX
      const delay = ctx_.createDelay();
      delay.delayTime.value = 0.22;
      const feedback = ctx_.createGain();
      feedback.gain.value = 0.35;
      delay.connect(feedback);
      feedback.connect(delay);
      state.delayNode = delay;

      // Master Gain
      const master = ctx_.createGain();
      master.gain.value = 0;
      state.gainNode = master;

      filter.connect(master);
      filter.connect(delay);
      delay.connect(master);
      master.connect(analyser);
      analyser.connect(ctx_.destination);
    }

    function startSynthVoice() {
      initAudio();
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }

      if (!state.oscA) {
        const oscA = state.audioCtx.createOscillator();
        const oscB = state.audioCtx.createOscillator();

        oscA.type = state.waveformType;
        oscB.type = 'sawtooth';
        oscB.detune.value = 8; // slight detune for warmth

        oscA.connect(state.filter);
        oscB.connect(state.filter);

        oscA.start();
        oscB.start();

        state.oscA = oscA;
        state.oscB = oscB;
      }

      // Smooth envelope attack
      const now = state.audioCtx.currentTime;
      state.gainNode.gain.cancelScheduledValues(now);
      state.gainNode.gain.setValueAtTime(state.gainNode.gain.value, now);
      state.gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05);
      state.isPlaying = true;
    }

    function stopSynthVoice() {
      if (!state.audioCtx || !state.gainNode) return;
      const now = state.audioCtx.currentTime;
      state.gainNode.gain.cancelScheduledValues(now);
      state.gainNode.gain.setValueAtTime(state.gainNode.gain.value, now);
      state.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      state.isPlaying = false;
    }

    function quantizeFreq(rawHz, scaleType) {
      if (!scaleType || scaleType === 'free') return rawHz;
      const scale = SCALES[scaleType] || SCALES.pentatonic;
      const midi = 69 + 12 * Math.log2(rawHz / 440);
      const noteInOctave = Math.round(midi) % 12;
      const octaveBase = Math.floor(Math.round(midi) / 12) * 12;

      let closest = scale[0];
      let minDiff = 999;
      for (const s of scale) {
        const diff = Math.abs(s - noteInOctave);
        if (diff < minDiff) {
          minDiff = diff;
          closest = s;
        }
      }
      const quantizedMidi = octaveBase + closest;
      return 440 * Math.pow(2, (quantizedMidi - 69) / 12);
    }

    function updateTouch(xRatio, yRatio) {
      if (state.source !== 'synth') return;
      startSynthVoice();

      // Pitch: 65Hz (C2) to 659Hz (E5)
      const rawHz = 65 * Math.pow(10, xRatio * 1.05);
      const pitch = quantizeFreq(rawHz, state.scaleMode);
      state.lastPitch = pitch;

      // Filter: 150Hz to 6000Hz (inverted: top is open)
      const cutoff = 150 * Math.pow(40, 1 - yRatio);
      state.lastCutoff = cutoff;

      const now = state.audioCtx.currentTime;
      if (state.oscA && state.oscB) {
        state.oscA.frequency.setTargetAtTime(pitch, now, 0.02);
        state.oscB.frequency.setTargetAtTime(pitch * 0.5, now, 0.02); // Sub oscillator
      }
      if (state.filter) {
        state.filter.frequency.setTargetAtTime(cutoff, now, 0.02);
      }

      coordText.textContent = `${Math.round(pitch)} Hz · Filter: ${Math.round(cutoff)} Hz`;
    }

    // Touch and mouse events on screen
    function getCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const xRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const yRatio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      return { xRatio, yRatio };
    }

    let isPointerDown = false;
    canvas.addEventListener('pointerdown', e => {
      isPointerDown = true;
      const { xRatio, yRatio } = getCoords(e);
      updateTouch(xRatio, yRatio);
    });

    window.addEventListener('pointermove', e => {
      if (!isPointerDown) return;
      const { xRatio, yRatio } = getCoords(e);
      updateTouch(xRatio, yRatio);
    });

    window.addEventListener('pointerup', () => {
      if (isPointerDown) {
        isPointerDown = false;
        stopSynthVoice();
      }
    });

    // Mic setup
    async function startMic() {
      initAudio();
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast('Microphone not supported on this browser', 'err');
          return;
        }
        stopSynthVoice();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        state.micStream = stream;
        const micSource = state.audioCtx.createMediaStreamSource(stream);
        micSource.connect(state.analyser);
        state.micSource = micSource;
        state.source = 'mic';
        modeText.textContent = 'MICROPHONE SPECTRUM ANALYZER';
        coordText.textContent = 'MIC STREAM ONLINE';
        toast('Microphone input connected!', 'ok');
        sfx('toggleOn');
      } catch (err) {
        console.error(err);
        toast('Microphone access denied or unavailable', 'err');
        state.source = 'synth';
        $$('#asSourceSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b.dataset.src === 'synth'));
      }
    }

    function stopMic() {
      if (state.micStream) {
        state.micStream.getTracks().forEach(t => t.stop());
        state.micStream = null;
      }
      if (state.micSource) {
        state.micSource.disconnect();
        state.micSource = null;
      }
      state.source = 'synth';
      modeText.textContent = 'THEREMIN SYNTH (CLICK/DRAG)';
      coordText.textContent = 'X: PITCH · Y: FILTER';
    }

    // Source buttons
    $$('#asSourceSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#asSourceSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        if (btn.dataset.src === 'mic') {
          startMic();
        } else if (btn.dataset.src === 'radio') {
          stopMic();
          state.source = 'radio';
          modeText.textContent = 'RADIO HARMONICS OSCILLOSCOPE';
          coordText.textContent = 'RADIO STREAM (LIVE)';
          sfx('toggleOn');
        } else {
          stopMic();
          state.source = 'synth';
        }
        sfx('tick');
      });
    });

    // Scope modes
    $$('#asScopeSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#asScopeSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.scopeMode = btn.dataset.scope;
        sfx('tick');
      });
    });

    // Waveforms
    $$('#asWaveSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#asWaveSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.waveformType = btn.dataset.wave;
        if (state.oscA) state.oscA.type = state.waveformType;
        sfx('tick');
      });
    });

    // Scale
    $$('#asScaleSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#asScaleSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.scaleMode = btn.dataset.scale;
        sfx('tick');
      });
    });

    // Colors
    $$('#asColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#asColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.colorMode = btn.dataset.col;
        sfx('tick');
      });
    });

    $('#asScanlinesCheck', root).addEventListener('change', e => {
      screenBox.classList.toggle('as-scanlines', e.target.checked);
    });

    $('#asGlowCheck', root).addEventListener('change', e => {
      state.glow = e.target.checked;
    });

    // Snapshot
    $('#asSnapshotBtn', root).addEventListener('click', () => {
      const dataUrl = canvas.toDataURL('image/png');
      download(dataUrl, `5ivesaw-oscilloscope-${Date.now()}.png`);
      toast('Saved oscilloscope vector capture!', 'ok');
      sfx('download');
    });

    function handleResize() {
      fitCanvas(canvas);
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    // Visualizer loop
    const timeData = new Uint8Array(1024);
    const freqData = new Uint8Array(512);
    let phase = 0;

    function draw() {
      phase += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      const theme = THEMES[state.colorMode] || THEMES.neon;

      // Phosphor persistence trail
      ctx.fillStyle = 'rgba(7, 9, 11, 0.25)';
      ctx.fillRect(0, 0, w, h);

      if (state.source === 'radio') {
        const pulse = music.pulse;
        const wave = pulse && pulse.waveform ? pulse.waveform : null;
        const bands = pulse && pulse.bands ? pulse.bands : null;
        for (let i = 0; i < 1024; i++) {
          if (wave && wave.length > 0) {
            const sample = wave[i % wave.length] || 0;
            timeData[i] = Math.max(0, Math.min(255, 128 + sample * 110));
          } else {
            timeData[i] = 128 + Math.sin(i * 0.05 + phase * 4) * 35 * (pulse ? pulse.kick : 0.3);
          }
        }
        for (let i = 0; i < 512; i++) {
          if (bands && bands.length > 0) {
            const b = bands[Math.floor((i / 512) * bands.length)] || 0;
            freqData[i] = Math.max(0, Math.min(255, b * 255));
          } else {
            freqData[i] = Math.max(0, Math.min(255, (pulse ? pulse.kick : 0.2) * 180));
          }
        }
      } else if (state.analyser) {
        state.analyser.getByteTimeDomainData(timeData);
        state.analyser.getByteFrequencyData(freqData);
      } else {
        // Idle baseline breathing wave
        for (let i = 0; i < 1024; i++) {
          timeData[i] = 128 + Math.sin(i * 0.03 + phase) * 12;
        }
      }

      ctx.save();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = theme.stroke;
      if (state.glow) {
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 12;
      }

      if (state.scopeMode === 'lissajous') {
        // Lissajous X-Y Vector Phase Plot
        ctx.beginPath();
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.38;

        for (let i = 0; i < 512; i++) {
          const v1 = (timeData[i] - 128) / 128;
          const v2 = (timeData[(i + 128) % 1024] - 128) / 128;
          const rotAngle = phase * 0.5;
          const x = cx + (v1 * Math.cos(rotAngle) - v2 * Math.sin(rotAngle)) * radius;
          const y = cy + (v1 * Math.sin(rotAngle) + v2 * Math.cos(rotAngle)) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

      } else if (state.scopeMode === 'wave') {
        // Linear Time Domain Oscilloscope Beam
        ctx.beginPath();
        const sliceWidth = w / 1024;
        let x = 0;
        for (let i = 0; i < 1024; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();

      } else if (state.scopeMode === 'radial') {
        // Radial Ring Waveform
        ctx.beginPath();
        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(w, h) * 0.28;
        const points = 360;

        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const dataIdx = Math.floor((i / points) * 512);
          const v = (timeData[dataIdx] - 128) / 128;
          const r = baseRadius + v * (baseRadius * 0.7);
          const x = cx + Math.cos(angle + phase * 0.2) * r;
          const y = cy + Math.sin(angle + phase * 0.2) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

      } else if (state.scopeMode === 'fft') {
        // Spectrum Bars & Peaks
        const barWidth = (w / 128) * 1.5;
        let x = 0;
        for (let i = 0; i < 128; i++) {
          const barHeight = (freqData[i] / 255) * (h * 0.75);
          ctx.fillStyle = theme.stroke;
          ctx.fillRect(x, h - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }
      }

      ctx.restore();
      state.animId = requestAnimationFrame(draw);
    }

    state.animId = requestAnimationFrame(draw);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      stopSynthVoice();
      stopMic();
      if (state.audioCtx) {
        state.audioCtx.close().catch(() => {});
      }
      window.removeEventListener('resize', handleResize);
      const s = document.getElementById('demo-synth-style');
      if (s) s.remove();
    };
  }
};

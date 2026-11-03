// Ernst Chladni Cymatics & Acoustic Resonance Physics Lab — by 5IVESAW
// Real-time 2D standing acoustic wave simulation with 4,000 sand particles dancing into sacred geometric nodal lines.
import {
  $, $$, icon, download, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-chladni-style';
    style.textContent = `
      .ch-wrap { display: flex; flex-direction: column; gap: 16px; }
      .ch-screen { position: relative; width: 100%; height: 480px; background: #040508; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: crosshair; user-select: none; }
      .ch-screen canvas { width: 100%; height: 100%; display: block; }
      .ch-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const PARTICLE_COUNT = 4500;
    const particles = new Float32Array(PARTICLE_COUNT * 4); // x, y, vx, vy

    const state = {
      m: 3,
      n: 5,
      a: 1.0,
      b: 1.0,
      amplitude: 1.0,
      radioSync: true,
      audioTone: false,
      palette: 'neon', // 'neon' | 'gold' | 'crimson' | 'emerald'
      audioCtx: null,
      osc: null,
      gain: null,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      animId: null
    };

    const THEMES = {
      neon: { stroke: '#00F0FF', glow: 'rgba(0, 240, 255, 0.4)', bg: '#040508', plate: 'rgba(0, 240, 255, 0.08)' },
      gold: { stroke: '#FFD700', glow: 'rgba(255, 215, 0, 0.4)', bg: '#080704', plate: 'rgba(255, 215, 0, 0.08)' },
      crimson: { stroke: '#FF3B14', glow: 'rgba(255, 59, 20, 0.4)', bg: '#080405', plate: 'rgba(255, 59, 20, 0.08)' },
      emerald: { stroke: '#00FF66', glow: 'rgba(0, 255, 102, 0.4)', bg: '#030805', plate: 'rgba(0, 255, 102, 0.08)' }
    };

    function initParticles() {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 4;
        particles[idx] = (Math.random() - 0.5) * 1.85;     // x in [-0.925, 0.925]
        particles[idx + 1] = (Math.random() - 0.5) * 1.85; // y in [-0.925, 0.925]
        particles[idx + 2] = 0; // vx
        particles[idx + 3] = 0; // vy
      }
    }
    initParticles();

    root.innerHTML = `
      <div class="tl ch-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#00F0FF;color:#000;font-weight:700;">CYMATICS LAB</span>
              <span class="eyebrow">CHLADNI RESONANCE // 4,500 PARTICLES</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Chladni Acoustic Resonance Engine</h2>
            <p class="faint sm mono">2D acoustic standing wave physics simulation: sound frequencies sculpt sand into sacred cymatics mandalas.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="chScreenBox" class="ch-screen">
              <div class="ch-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  MODE: <strong id="chModeText">M: 3 · N: 5</strong> · AUDIO: <strong id="chPulseText" style="color:#00F0FF;">RADIO SYNC</strong>
                </span>
              </div>
              <canvas id="chCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <button type="button" id="chScatterBtn" class="btn sm primary">⚡ Scatter Sand</button>
                <button type="button" id="chToneBtn" class="btn sm ghost">🎵 Resonant Tone: OFF</button>
                <button type="button" id="chRadioBtn" class="btn sm ghost bg-paper-elevated font-semibold">📻 Radio Sync: ON</button>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="chSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Mandala PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">CYMATICS HARMONICS</h3>

            <div class="grid grid-2" id="chPresetGrid" style="gap:6px;">
              <button type="button" class="btn sm bg-paper-elevated font-semibold" data-m="3" data-n="5">Sacred Star (3, 5)</button>
              <button type="button" class="btn sm ghost" data-m="6" data-n="6">Cyber Grid (6, 6)</button>
              <button type="button" class="btn sm ghost" data-m="4" data-n="7">Acoustic Lotus (4, 7)</button>
              <button type="button" class="btn sm ghost" data-m="5" data-n="8">Hyper Mandala (5, 8)</button>
            </div>

            <div class="divider"></div>

            <label class="field">
              <span>COLOR SPECTRUM</span>
              <div class="seg" id="chColorSeg">
                <button type="button" data-col="neon" class="bg-paper-elevated font-semibold" style="color:#00F0FF;">Neon</button>
                <button type="button" data-col="gold" style="color:#FFD700;">Gold</button>
                <button type="button" data-col="crimson" style="color:#FF3B14;">Crimson</button>
                <button type="button" data-col="emerald" style="color:#00FF66;">Matrix</button>
              </div>
            </label>

            <label class="field">
              <span>MODAL HARMONIC M (<span id="chMVal">3</span>)</span>
              <input type="range" id="chMSlider" min="1" max="10" step="1" value="3" />
            </label>

            <label class="field">
              <span>MODAL HARMONIC N (<span id="chNVal">5</span>)</span>
              <input type="range" id="chNSlider" min="1" max="10" step="1" value="5" />
            </label>

            <label class="field">
              <span>VIBRATION POWER</span>
              <input type="range" id="chAmpSlider" min="0.2" max="2.5" step="0.1" value="1.0" />
            </label>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Physics:</strong> Sand grains flee areas of high acoustic vibration and settle along nodal curves where net vibration is zero, visualizing literal sound geometry.
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#chCanvas', root);
    const ctx = canvas.getContext('2d');
    const modeText = $('#chModeText', root);
    const pulseText = $('#chPulseText', root);
    const mValText = $('#chMVal', root);
    const nValText = $('#chNVal', root);
    const mSlider = $('#chMSlider', root);
    const nSlider = $('#chNSlider', root);
    const ampSlider = $('#chAmpSlider', root);
    const toneBtn = $('#chToneBtn', root);
    const radioBtn = $('#chRadioBtn', root);

    function updateToneFreq() {
      if (state.audioTone && state.osc && state.audioCtx) {
        const freq = Math.sqrt(state.m * state.m + state.n * state.n) * 115;
        state.osc.frequency.setTargetAtTime(freq, state.audioCtx.currentTime, 0.05);
      }
    }

    function toggleTone() {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }

      if (!state.audioTone) {
        state.osc = state.audioCtx.createOscillator();
        state.gain = state.audioCtx.createGain();
        state.osc.type = 'sine';
        state.gain.gain.setValueAtTime(0.08, state.audioCtx.currentTime);
        state.osc.connect(state.gain);
        state.gain.connect(state.audioCtx.destination);
        state.osc.start();
        state.audioTone = true;
        toneBtn.textContent = '🎵 Resonant Tone: ON';
        toneBtn.classList.add('bg-paper-elevated', 'font-semibold');
        updateToneFreq();
        sfx('toggleOn');
      } else {
        if (state.osc) {
          try { state.osc.stop(); state.osc.disconnect(); } catch {}
          state.osc = null;
        }
        state.audioTone = false;
        toneBtn.textContent = '🎵 Resonant Tone: OFF';
        toneBtn.classList.remove('bg-paper-elevated', 'font-semibold');
        sfx('toggleOff');
      }
    }

    toneBtn.addEventListener('click', toggleTone);

    radioBtn.addEventListener('click', () => {
      state.radioSync = !state.radioSync;
      radioBtn.textContent = state.radioSync ? '📻 Radio Sync: ON' : '📻 Radio Sync: OFF';
      radioBtn.classList.toggle('bg-paper-elevated', state.radioSync);
      radioBtn.classList.toggle('font-semibold', state.radioSync);
      sfx('tick');
    });

    $('#chScatterBtn', root).addEventListener('click', () => {
      initParticles();
      toast('Sand particles scattered!', 'ok');
      sfx('pulse');
    });

    $$('#chPresetGrid button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#chPresetGrid button', root).forEach(b => b.classList.replace('bg-paper-elevated', 'ghost'));
        btn.classList.replace('ghost', 'bg-paper-elevated');
        state.m = parseInt(btn.dataset.m, 10);
        state.n = parseInt(btn.dataset.n, 10);
        mSlider.value = state.m;
        nSlider.value = state.n;
        mValText.textContent = state.m;
        nValText.textContent = state.n;
        modeText.textContent = `M: ${state.m} · N: ${state.n}`;
        updateToneFreq();
        sfx('tick');
      });
    });

    $$('#chColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#chColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.palette = btn.dataset.col;
        sfx('tick');
      });
    });

    mSlider.addEventListener('input', e => {
      state.m = parseInt(e.target.value, 10);
      mValText.textContent = state.m;
      modeText.textContent = `M: ${state.m} · N: ${state.n}`;
      updateToneFreq();
    });

    nSlider.addEventListener('input', e => {
      state.n = parseInt(e.target.value, 10);
      nValText.textContent = state.n;
      modeText.textContent = `M: ${state.m} · N: ${state.n}`;
      updateToneFreq();
    });

    ampSlider.addEventListener('input', e => {
      state.amplitude = parseFloat(e.target.value);
    });

    $('#chSnapshotBtn', root).addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-cymatics-${Date.now()}.png`);
      toast('Saved Cymatics mandala PNG!', 'ok');
      sfx('download');
    });

    // Interaction on canvas: tap/drag dampens or pushes sand
    canvas.addEventListener('pointerdown', e => {
      state.isDragging = true;
      applyInteraction(e);
    });
    window.addEventListener('pointermove', e => {
      if (state.isDragging) applyInteraction(e);
    });
    window.addEventListener('pointerup', () => {
      state.isDragging = false;
    });

    function applyInteraction(e) {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const py = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 4;
        const dx = particles[idx] - px;
        const dy = particles[idx + 1] - py;
        const distSq = dx * dx + dy * dy;
        if (distSq < 0.08) {
          const force = (0.08 - distSq) * 0.15;
          particles[idx + 2] += dx * force;
          particles[idx + 3] += dy * force;
        }
      }
    }

    function resize() {
      fitCanvas(canvas);
    }
    window.addEventListener('resize', resize);
    resize();

    // Chladni 2D nodal function: w(x, y) = a * sin(n*pi*x)*sin(m*pi*y) + b * sin(m*pi*x)*sin(n*pi*y)
    function chladniValue(x, y, m, n, a, b) {
      const piX = x * Math.PI;
      const piY = y * Math.PI;
      return a * Math.sin(n * piX) * Math.sin(m * piY) + b * Math.sin(m * piX) * Math.sin(n * piY);
    }

    // Gradient of |w(x, y)|^2
    const EPS = 0.005;
    function chladniGradient(x, y, m, n, a, b) {
      const w0 = chladniValue(x, y, m, n, a, b);
      const wx = chladniValue(x + EPS, y, m, n, a, b);
      const wy = chladniValue(x, y + EPS, m, n, a, b);

      const dWdx = (wx * wx - w0 * w0) / EPS;
      const dWdy = (wy * wy - w0 * w0) / EPS;
      return { gx: dWdx, gy: dWdy, val: Math.abs(w0) };
    }

    let phase = 0;

    function render() {
      phase += 0.02;
      const w = canvas.width;
      const h = canvas.height;
      const theme = THEMES[state.colorMode] || THEMES.neon;

      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, w, h);

      // Acoustic plate border
      const size = Math.min(w, h) * 0.88;
      const ox = (w - size) / 2;
      const oy = (h - size) / 2;

      ctx.strokeStyle = theme.plate;
      ctx.lineWidth = 2;
      ctx.strokeRect(ox, oy, size, size);

      const pulse = (state.radioSync && music.pulse && music.pulse.isPlaying) ? music.pulse : null;
      const kick = pulse ? pulse.kick : 0;
      const bands = pulse ? pulse.bands : null;

      let effM = state.m;
      let effN = state.n;
      let effAmp = state.amplitude;

      if (pulse) {
        pulseText.textContent = `RADIO SYNC [${pulse.bpm} BPM ⚡]`;
        pulseText.style.color = '#00F0FF';

        // Modulate with music harmonics
        if (bands && bands.length) {
          const bassBand = (bands[0] + bands[1]) / 2;
          const midBand = (bands[5] + bands[6]) / 2;
          if (kick > 0.82) {
            effAmp *= (1 + kick * 0.9);
          }
        }
      } else {
        pulseText.textContent = 'STANDBY';
        pulseText.style.color = 'var(--faint)';
      }

      // Physics integration for particles
      const moveScale = 0.0016 * effAmp;
      const jitter = 0.0008 * (1 + kick * 1.5);

      ctx.fillStyle = theme.stroke;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = kick > 0.5 ? 8 : 2;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 4;
        let x = particles[idx];
        let y = particles[idx + 1];
        let vx = particles[idx + 2];
        let vy = particles[idx + 3];

        const { gx, gy, val } = chladniGradient(x, y, effM, effN, state.a, state.b);

        // Particle moves down the gradient of vibration energy toward nodal curves (where val == 0)
        vx = vx * 0.88 - gx * moveScale + (Math.random() - 0.5) * jitter;
        vy = vy * 0.88 - gy * moveScale + (Math.random() - 0.5) * jitter;

        x += vx;
        y += vy;

        // Bounce off plate boundaries [-0.95, 0.95]
        if (x < -0.95) { x = -0.95; vx = -vx * 0.5; }
        if (x > 0.95) { x = 0.95; vx = -vx * 0.5; }
        if (y < -0.95) { y = -0.95; vy = -vy * 0.5; }
        if (y > 0.95) { y = 0.95; vy = -vy * 0.5; }

        particles[idx] = x;
        particles[idx + 1] = y;
        particles[idx + 2] = vx;
        particles[idx + 3] = vy;

        // Screen coordinate mapping
        const sx = ox + (x + 1) * 0.5 * size;
        const sy = oy + (y + 1) * 0.5 * size;

        // Particle dot
        const pSize = (val < 0.2 ? 1.6 : 1.0) * (1 + kick * 0.4);
        ctx.fillRect(sx, sy, pSize, pSize);
      }

      ctx.shadowBlur = 0;
      state.animId = requestAnimationFrame(render);
    }

    state.animId = requestAnimationFrame(render);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      if (state.osc) {
        try { state.osc.stop(); state.osc.disconnect(); } catch {}
      }
      if (state.audioCtx) {
        state.audioCtx.close().catch(() => {});
      }
      window.removeEventListener('resize', resize);
      const s = document.getElementById('demo-chladni-style');
      if (s) s.remove();
    };
  }
};

// Neon Synthwave 3D Wireframe Audio Mountain & Horizon Grid — by 5IVESAW
// 3D perspective vector terrain deformed by audio frequency harmonics & music beat pulses.
import {
  $, $$, icon, download, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-vis3d-style';
    style.textContent = `
      .v3-wrap { display: flex; flex-direction: column; gap: 16px; }
      .v3-screen { position: relative; width: 100%; height: 460px; background: #06050a; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: grab; user-select: none; }
      .v3-screen:active { cursor: grabbing; }
      .v3-screen canvas { width: 100%; height: 100%; display: block; }
      .v3-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const state = {
      source: 'music', // 'music' | 'mic'
      audioCtx: null,
      analyser: null,
      micStream: null,
      micSource: null,
      colorMode: 'neon', // 'neon' | 'cyber' | 'chainsaw' | 'emerald'
      speed: 1.0,
      elevation: 1.2,
      cameraAngleX: 0.55,
      cameraAngleY: 0,
      wireframeOnly: true,
      glow: true,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      animId: null
    };

    const THEMES = {
      neon: { grid: '#FF2E93', sun: '#FFC700', mountain: '#00F0FF', bg: '#06050c', glow: 'rgba(255,46,147,0.5)' },
      cyber: { grid: '#00E5FF', sun: '#38BDF8', mountain: '#818CF8', bg: '#030712', glow: 'rgba(0,229,255,0.5)' },
      chainsaw: { grid: '#FF3B14', sun: '#FFC700', mountain: '#FF8A00', bg: '#0d0708', glow: 'rgba(255,59,20,0.5)' },
      emerald: { grid: '#00FF66', sun: '#A3FFA8', mountain: '#059669', bg: '#030d07', glow: 'rgba(0,255,102,0.5)' }
    };

    root.innerHTML = `
      <div class="tl v3-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#FF2E93;color:#fff;font-weight:700;">3D VECTOR LAB</span>
              <span class="eyebrow">SYNTHWAVE WIREFRAME HORIZON // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Neon 3D Wireframe Audio Mountain</h2>
            <p class="faint sm mono">Perspective 3D terrain grid deformed in real time by music telemetry &amp; audio harmonics.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="v3ScreenBox" class="v3-screen">
              <div class="v3-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  TELEMETRY: <strong id="v3SourceText">BACKGROUND MUSIC SYNC</strong>
                </span>
              </div>
              <canvas id="v3Canvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <div class="seg" id="v3SourceSeg">
                  <button type="button" data-src="music" class="bg-paper-elevated font-semibold">Music Sync</button>
                  <button type="button" data-src="mic">Mic Input</button>
                </div>
                <button type="button" id="v3WireframeBtn" class="btn sm">Wireframe: ON</button>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="v3SnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save 3D PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">SYNTHWAVE HORIZON</h3>

            <label class="field">
              <span>COLOR PALETTE</span>
              <div class="seg" id="v3ColorSeg">
                <button type="button" data-col="neon" class="bg-paper-elevated font-semibold" style="color:#FF2E93;">Neon</button>
                <button type="button" data-col="chainsaw" style="color:#FF3B14;">Chainsaw</button>
                <button type="button" data-col="cyber" style="color:#00E5FF;">Cyber</button>
                <button type="button" data-col="emerald" style="color:#00FF66;">Ostania</button>
              </div>
            </label>

            <label class="field">
              <span>MOUNTAIN ELEVATION</span>
              <input type="range" id="v3ElevSlider" min="0.5" max="2.5" step="0.1" value="1.2" />
            </label>

            <label class="field">
              <span>FLIGHT SPEED</span>
              <input type="range" id="v3SpeedSlider" min="0.3" max="2.0" step="0.1" value="1.0" />
            </label>

            <div class="divider"></div>

            <div class="stack" style="gap:8px;">
              <label class="row between xs mono cursor-pointer">
                <span>Vector Phosphor Glow</span>
                <input type="checkbox" id="v3GlowCheck" checked />
              </label>
            </div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Click &amp; drag anywhere across the 3D viewport to orbit camera angles and tilt perspective.
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#v3Canvas', root);
    const ctx = canvas.getContext('2d');
    const sourceText = $('#v3SourceText', root);

    const COLS = 36;
    const ROWS = 26;
    const terrain = Array.from({ length: ROWS }, () => new Float32Array(COLS));
    let flightOffset = 0;

    // Mic setup
    async function startMic() {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        state.audioCtx = new AudioContextClass();
        state.analyser = state.audioCtx.createAnalyser();
        state.analyser.fftSize = 256;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        state.micStream = stream;
        state.micSource = state.audioCtx.createMediaStreamSource(stream);
        state.micSource.connect(state.analyser);
        state.source = 'mic';
        sourceText.textContent = 'LIVE MICROPHONE FFT';
        toast('Microphone audio connected!', 'ok');
        sfx('toggleOn');
      } catch (e) {
        toast('Microphone unavailable or blocked', 'err');
        state.source = 'music';
        $$('#v3SourceSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b.dataset.src === 'music'));
      }
    }

    function stopMic() {
      if (state.micStream) {
        state.micStream.getTracks().forEach(t => t.stop());
        state.micStream = null;
      }
      if (state.audioCtx) {
        state.audioCtx.close().catch(() => {});
        state.audioCtx = null;
      }
      state.source = 'music';
      sourceText.textContent = 'BACKGROUND MUSIC SYNC';
    }

    // Controls
    $$('#v3SourceSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#v3SourceSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        if (btn.dataset.src === 'mic') startMic();
        else stopMic();
        sfx('tick');
      });
    });

    $$('#v3ColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#v3ColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.colorMode = btn.dataset.col;
        sfx('tick');
      });
    });

    $('#v3ElevSlider', root).addEventListener('input', e => {
      state.elevation = parseFloat(e.target.value);
    });

    $('#v3SpeedSlider', root).addEventListener('input', e => {
      state.speed = parseFloat(e.target.value);
    });

    $('#v3GlowCheck', root).addEventListener('change', e => {
      state.glow = e.target.checked;
    });

    $('#v3WireframeBtn', root).addEventListener('click', () => {
      state.wireframeOnly = !state.wireframeOnly;
      $('#v3WireframeBtn', root).textContent = `Wireframe: ${state.wireframeOnly ? 'ON' : 'OFF'}`;
      sfx('tick');
    });

    $('#v3SnapshotBtn', root).addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-synthwave3d-${Date.now()}.png`);
      toast('3D landscape snapshot saved!', 'ok');
      sfx('download');
    });

    // Orbit drag
    canvas.addEventListener('pointerdown', e => {
      state.isDragging = true;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
    });

    window.addEventListener('pointermove', e => {
      if (!state.isDragging) return;
      const dx = e.clientX - state.lastMouseX;
      const dy = e.clientY - state.lastMouseY;
      state.cameraAngleY += dx * 0.005;
      state.cameraAngleX = Math.max(0.2, Math.min(1.1, state.cameraAngleX + dy * 0.005));
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
    });

    window.addEventListener('pointerup', () => {
      state.isDragging = false;
    });

    function resize() {
      fitCanvas(canvas);
    }
    window.addEventListener('resize', resize);
    resize();

    const fftBuf = new Uint8Array(128);

    // 3D Render Loop
    function render() {
      const w = canvas.width;
      const h = canvas.height;
      const theme = THEMES[state.colorMode] || THEMES.neon;

      flightOffset += 0.04 * state.speed;

      // Clear sky
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, w, h);

      // Draw Retro Horizon Sun
      const sunY = h * 0.38;
      const sunRadius = Math.min(w, h) * 0.18;
      const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
      sunGrad.addColorStop(0, '#FFE600');
      sunGrad.addColorStop(0.5, theme.sun);
      sunGrad.addColorStop(1, '#FF2E93');

      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.shadowColor = theme.sun;
      ctx.shadowBlur = state.glow ? 24 : 0;
      ctx.fill();
      ctx.restore();

      // Sun scanline blinds
      ctx.fillStyle = theme.bg;
      for (let s = 0; s < 6; s++) {
        const lineY = sunY + s * 8 + 4;
        const lineH = s * 1.5 + 1.5;
        ctx.fillRect(w / 2 - sunRadius - 10, lineY, sunRadius * 2 + 20, lineH);
      }

      // Compute audio energy
      let bassEnergy = 0;
      let midEnergy = 0;
      if (state.source === 'mic' && state.analyser) {
        state.analyser.getByteFrequencyData(fftBuf);
        bassEnergy = (fftBuf[2] + fftBuf[4]) / 512;
        midEnergy = (fftBuf[12] + fftBuf[16]) / 512;
      } else {
        const p = music.pulse || { isPlaying: false, kick: 0, energy: 0 };
        bassEnergy = p.isPlaying ? p.kick : 0;
        midEnergy = p.isPlaying ? p.energy : 0;
      }

      // Generate terrain heights
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const distFromCenter = Math.abs(c - COLS / 2);
          const mountainWeight = Math.pow(distFromCenter / (COLS / 2), 1.6);
          const wave1 = Math.sin(c * 0.4 + flightOffset + r * 0.3);
          const wave2 = Math.cos(c * 0.2 - flightOffset * 0.7);
          const audioSpike = (bassEnergy * 80 + midEnergy * 40) * mountainWeight;
          terrain[r][c] = (wave1 * 25 + wave2 * 35 + audioSpike) * state.elevation * mountainWeight;
        }
      }

      // 3D Perspective Projection
      const fov = 420;
      const cellW = (w * 1.4) / COLS;
      const cellD = 35;
      const originX = w / 2;
      const originY = h * 0.52;

      function project(c, r, zVal) {
        const x3d = (c - COLS / 2) * cellW;
        const y3d = zVal;
        const z3d = (ROWS - r) * cellD;

        // Apply camera tilt
        const cosY = Math.cos(state.cameraAngleY);
        const sinY = Math.sin(state.cameraAngleY);
        const cosX = Math.cos(state.cameraAngleX);
        const sinX = Math.sin(state.cameraAngleX);

        const rx = x3d * cosY - z3d * sinY;
        const rz = x3d * sinY + z3d * cosY;
        const ry = y3d * cosX - rz * sinX;
        const rz2 = y3d * sinX + rz * cosX + 350;

        const scale = fov / Math.max(10, rz2);
        return {
          x: originX + rx * scale,
          y: originY + ry * scale,
          depth: rz2
        };
      }

      // Draw Grid Mesh
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = theme.grid;
      if (state.glow) {
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 8;
      }

      // Horizontal lines
      for (let r = 0; r < ROWS; r++) {
        ctx.beginPath();
        for (let c = 0; c < COLS; c++) {
          const p = project(c, r, -terrain[r][c]);
          if (c === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Longitudinal lines
      for (let c = 0; c < COLS; c++) {
        ctx.beginPath();
        for (let r = 0; r < ROWS; r++) {
          const p = project(c, r, -terrain[r][c]);
          if (r === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      ctx.restore();
      state.animId = requestAnimationFrame(render);
    }

    state.animId = requestAnimationFrame(render);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      stopMic();
      window.removeEventListener('resize', resize);
      const s = document.getElementById('demo-vis3d-style');
      if (s) s.remove();
    };
  }
};

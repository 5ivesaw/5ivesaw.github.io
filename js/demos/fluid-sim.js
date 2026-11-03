// Real-Time Navier-Stokes Fluid & Chroma Smoke Simulation — by 5IVESAW
// Incompressible Eulerian fluid solver with multi-touch velocity advection & music beat bursts.
import {
  $, $$, icon, download, copyText, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-fluid-style';
    style.textContent = `
      .fl-wrap { display: flex; flex-direction: column; gap: 16px; }
      .fl-screen { position: relative; width: 100%; height: 460px; background: #040506; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: crosshair; touch-action: none; user-select: none; }
      .fl-screen canvas { width: 100%; height: 100%; display: block; }
      .fl-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const N = 64; // Fluid grid size (64x64)
    const size = (N + 2) * (N + 2);
    const u = new Float32Array(size);
    const v = new Float32Array(size);
    const u_prev = new Float32Array(size);
    const v_prev = new Float32Array(size);
    const densR = new Float32Array(size);
    const densG = new Float32Array(size);
    const densB = new Float32Array(size);
    const densR_prev = new Float32Array(size);
    const densG_prev = new Float32Array(size);
    const densB_prev = new Float32Array(size);

    const state = {
      visc: 0.0001,
      dissipation: 0.985,
      colorMode: 'neon', // 'neon' | 'fire' | 'emerald' | 'cyber'
      musicReactive: true,
      isPointerDown: false,
      lastX: 0,
      lastY: 0,
      animId: null
    };

    const PALETTES = {
      neon: [ [1.0, 0.23, 0.08], [0.1, 0.8, 1.0], [0.95, 0.1, 0.6] ],
      fire: [ [1.0, 0.2, 0.0], [1.0, 0.7, 0.0], [0.8, 0.05, 0.0] ],
      emerald: [ [0.0, 1.0, 0.4], [0.1, 0.7, 0.3], [0.8, 1.0, 0.2] ],
      cyber: [ [0.0, 0.9, 1.0], [0.6, 0.2, 1.0], [0.1, 0.4, 0.9] ]
    };

    root.innerHTML = `
      <div class="tl fl-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#00E5FF;color:#000;font-weight:700;">NAVIER-STOKES</span>
              <span class="eyebrow">PHYSICS LABORATORY // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Chroma Fluid &amp; Smoke Dynamic Engine</h2>
            <p class="faint sm mono">Incompressible fluid grid simulation with vorticity confinement, advection, and music beat bursts.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="flScreenBox" class="fl-screen">
              <div class="fl-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  SIMULATION: <strong>EULERIAN 64×64 GRID</strong>
                </span>
              </div>
              <canvas id="flCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <button type="button" id="flClearBtn" class="btn sm ghost">Clear Dye Field</button>
                <button type="button" id="flBurstBtn" class="btn sm">⚡ Vortex Burst</button>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="flSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Fluid PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">FLUID PROPERTIES</h3>

            <label class="field">
              <span>CHROMA DYE PALETTE</span>
              <div class="seg" id="flColorSeg">
                <button type="button" data-col="neon" class="bg-paper-elevated font-semibold">Neon</button>
                <button type="button" data-col="fire">Chainsaw</button>
                <button type="button" data-col="emerald">Ostania</button>
                <button type="button" data-col="cyber">Cyber</button>
              </div>
            </label>

            <label class="field">
              <span>SMOKE DISSIPATION</span>
              <input type="range" id="flDissipateSlider" min="0.95" max="0.995" step="0.005" value="0.985" />
            </label>

            <div class="divider"></div>

            <div class="stack" style="gap:8px;">
              <label class="row between xs mono cursor-pointer">
                <span>Music Reactive Dye Bursts</span>
                <input type="checkbox" id="flMusicCheck" checked />
              </label>
            </div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Click and drag swiftly across the pad to inject velocity and dye. Playing background music injects rhythmic color fountains!
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#flCanvas', root);
    const ctx = canvas.getContext('2d');
    const offCanvas = document.createElement('canvas');
    offCanvas.width = N;
    offCanvas.height = N;
    const offCtx = offCanvas.getContext('2d');
    const offImg = offCtx.createImageData(N, N);

    function IX(i, j) {
      return i + (N + 2) * j;
    }

    function addSource(x, s, dt) {
      for (let i = 0; i < size; i++) x[i] += dt * s[i];
    }

    function setBnd(b, x) {
      for (let i = 1; i <= N; i++) {
        x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
        x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
        x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
        x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
      }
      x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
      x[IX(0, N + 1)] = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
      x[IX(N + 1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
      x[IX(N + 1, N + 1)] = 0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);
    }

    function linSolve(b, x, x0, a, c) {
      for (let k = 0; k < 4; k++) {
        for (let j = 1; j <= N; j++) {
          for (let i = 1; i <= N; i++) {
            x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) / c;
          }
        }
        setBnd(b, x);
      }
    }

    function diffuse(b, x, x0, diff, dt) {
      const a = dt * diff * N * N;
      linSolve(b, x, x0, a, 1 + 4 * a);
    }

    function advect(b, d, d0, uVel, vVel, dt) {
      const dt0 = dt * N;
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          let x = i - dt0 * uVel[IX(i, j)];
          let y = j - dt0 * vVel[IX(i, j)];
          if (x < 0.5) x = 0.5;
          if (x > N + 0.5) x = N + 0.5;
          const i0 = Math.floor(x), i1 = i0 + 1;
          if (y < 0.5) y = 0.5;
          if (y > N + 0.5) y = N + 0.5;
          const j0 = Math.floor(y), j1 = j0 + 1;
          const s1 = x - i0, s0 = 1 - s1;
          const t1 = y - j0, t0 = 1 - t1;
          d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) + s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
        }
      }
      setBnd(b, d);
    }

    function project(uVel, vVel, p, div) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          div[IX(i, j)] = -0.5 * (uVel[IX(i + 1, j)] - uVel[IX(i - 1, j)] + vVel[IX(i, j + 1)] - vVel[IX(i, j - 1)]) / N;
          p[IX(i, j)] = 0;
        }
      }
      setBnd(0, div);
      setBnd(0, p);
      linSolve(0, p, div, 1, 4);

      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          uVel[IX(i, j)] -= 0.5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
          vVel[IX(i, j)] -= 0.5 * N * (p[IX(i, j + 1)] - p[IX(i, j - 1)]);
        }
      }
      setBnd(1, uVel);
      setBnd(2, vVel);
    }

    function step() {
      const dt = 0.1;
      // Velocity step
      diffuse(1, u_prev, u, state.visc, dt);
      diffuse(2, v_prev, v, state.visc, dt);
      project(u_prev, v_prev, u, v);
      advect(1, u, u_prev, u_prev, v_prev, dt);
      advect(2, v, v_prev, u_prev, v_prev, dt);
      project(u, v, u_prev, v_prev);

      // Density step
      advect(0, densR, densR_prev, u, v, dt);
      advect(0, densG, densG_prev, u, v, dt);
      advect(0, densB, densB_prev, u, v, dt);

      // Dissipation decay
      for (let i = 0; i < size; i++) {
        densR[i] *= state.dissipation;
        densG[i] *= state.dissipation;
        densB[i] *= state.dissipation;
        densR_prev[i] = densR[i];
        densG_prev[i] = densG[i];
        densB_prev[i] = densB[i];
      }
    }

    function injectDye(gridX, gridY, dx, dy, color) {
      const radius = 2;
      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          const gx = gridX + i;
          const gy = gridY + j;
          if (gx >= 1 && gx <= N && gy >= 1 && gy <= N) {
            const idx = IX(gx, gy);
            u[idx] += dx * 5;
            v[idx] += dy * 5;
            densR[idx] = Math.min(255, densR[idx] + color[0] * 180);
            densG[idx] = Math.min(255, densG[idx] + color[1] * 180);
            densB[idx] = Math.min(255, densB[idx] + color[2] * 180);
          }
        }
      }
    }

    function handlePointer(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const curX = ((clientX - rect.left) / rect.width) * N;
      const curY = ((clientY - rect.top) / rect.height) * N;

      if (state.isPointerDown) {
        const dx = curX - state.lastX;
        const dy = curY - state.lastY;
        const palette = PALETTES[state.colorMode] || PALETTES.neon;
        const color = palette[Math.floor(Math.random() * palette.length)];
        injectDye(Math.floor(curX), Math.floor(curY), dx, dy, color);
      }
      state.lastX = curX;
      state.lastY = curY;
    }

    canvas.addEventListener('pointerdown', e => {
      state.isPointerDown = true;
      handlePointer(e);
    });

    window.addEventListener('pointermove', e => {
      if (state.isPointerDown) handlePointer(e);
    });

    window.addEventListener('pointerup', () => {
      state.isPointerDown = false;
    });

    // Burst button
    $('#flBurstBtn', root)?.addEventListener('click', () => {
      const cx = Math.floor(N / 2);
      const cy = Math.floor(N / 2);
      const palette = PALETTES[state.colorMode] || PALETTES.neon;
      for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
        const dx = Math.cos(angle) * 8;
        const dy = Math.sin(angle) * 8;
        const color = palette[Math.floor(Math.random() * palette.length)];
        injectDye(cx, cy, dx, dy, color);
      }
      sfx('pulse');
    });

    // Clear
    $('#flClearBtn', root)?.addEventListener('click', () => {
      densR.fill(0);
      densG.fill(0);
      densB.fill(0);
      u.fill(0);
      v.fill(0);
      toast('Fluid field cleared', 'ok');
      sfx('trash');
    });

    // Save PNG
    $('#flSnapshotBtn', root)?.addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-fluid-${Date.now()}.png`);
      toast('Fluid snapshot saved!', 'ok');
      sfx('download');
    });

    // Color switcher
    $$('#flColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#flColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.colorMode = btn.dataset.col;
        sfx('tick');
      });
    });

    $('#flDissipateSlider', root).addEventListener('input', e => {
      state.dissipation = parseFloat(e.target.value);
    });

    $('#flMusicCheck', root).addEventListener('change', e => {
      state.musicReactive = e.target.checked;
    });

    function resize() {
      fitCanvas(canvas);
    }
    window.addEventListener('resize', resize);
    resize();

    let beatCounter = 0;

    // Simulation loop
    function loop() {
      step();

      // Music reactive burst
      if (state.musicReactive && music.pulse && music.pulse.isPlaying) {
        beatCounter++;
        const p = music.pulse;
        if (p.kick > 0.45 && beatCounter % 3 === 0) {
          const x = Math.floor(N * (0.25 + Math.random() * 0.5));
          const y = N - 3;
          const palette = PALETTES[state.colorMode] || PALETTES.neon;
          const color = palette[Math.floor(Math.random() * palette.length)];
          injectDye(x, y, (Math.random() - 0.5) * 6, -10 * p.kick, color);
        }
        if (p.snare > 0.55 && beatCounter % 4 === 0) {
          const x = Math.floor(N * (0.2 + Math.random() * 0.6));
          const y = Math.floor(N * 0.5);
          const palette = PALETTES[state.colorMode] || PALETTES.neon;
          injectDye(x, y, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, palette[0]);
        }
      }

      // Draw to offscreen buffer
      const data = offImg.data;
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          const idx = IX(i, j);
          const pIdx = ((j - 1) * N + (i - 1)) * 4;
          data[pIdx] = densR[idx];
          data[pIdx + 1] = densG[idx];
          data[pIdx + 2] = densB[idx];
          data[pIdx + 3] = Math.min(255, (densR[idx] + densG[idx] + densB[idx]) * 1.5);
        }
      }
      offCtx.putImageData(offImg, 0, 0);

      // Upscale smoothly to screen canvas
      ctx.fillStyle = '#040506';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);

      state.animId = requestAnimationFrame(loop);
    }

    state.animId = requestAnimationFrame(loop);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      window.removeEventListener('resize', resize);
      const s = document.getElementById('demo-fluid-style');
      if (s) s.remove();
    };
  }
};

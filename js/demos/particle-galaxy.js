// Gravitational N-Body Particle Galaxy & Black Hole Vortex — by 5IVESAW
// Real-time orbital gravitational physics with multi-hole singularities & hyperspace warp speed.
import {
  $, $$, icon, download, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-galaxy-style';
    style.textContent = `
      .gx-wrap { display: flex; flex-direction: column; gap: 16px; }
      .gx-screen { position: relative; width: 100%; height: 460px; background: #020204; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: crosshair; user-select: none; }
      .gx-screen canvas { width: 100%; height: 100%; display: block; }
      .gx-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const PARTICLE_COUNT = 3600;
    const px = new Float32Array(PARTICLE_COUNT);
    const py = new Float32Array(PARTICLE_COUNT);
    const vx = new Float32Array(PARTICLE_COUNT);
    const vy = new Float32Array(PARTICLE_COUNT);
    const colorIdx = new Uint8Array(PARTICLE_COUNT);

    const state = {
      blackHoles: [{ x: 0, y: 0, mass: 2800, type: 'attract' }],
      palette: 'violet', // 'violet' | 'crimson' | 'cyan' | 'gold'
      gravity: 1.0,
      damping: 0.994,
      trails: true,
      musicWarp: true,
      animId: null
    };

    const PALETTES = {
      violet: ['#E0C3FC', '#8EC5FC', '#B5179E', '#7209B7', '#4CC9F0'],
      crimson: ['#FFF0F0', '#FF8A80', '#FF3B14', '#D50000', '#FFAB91'],
      cyan: ['#E0F7FA', '#80DEEA', '#00E5FF', '#0097A7', '#B2EBF2'],
      gold: ['#FFF9C4', '#FFE082', '#FFB300', '#FF8F00', '#FFD54F']
    };

    root.innerHTML = `
      <div class="tl gx-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#8B5CF6;color:#fff;font-weight:700;">N-BODY ASTROPHYSICS</span>
              <span class="eyebrow">GRAVITATIONAL ACCRETION // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">N-Body Particle Galaxy &amp; Vortex</h2>
            <p class="faint sm mono">3,600 orbital star particles subject to multi-body gravitational mechanics and relativistic warp.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="gxScreenBox" class="gx-screen">
              <div class="gx-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  STARS: <strong>3,600</strong> · HOLES: <strong id="gxHoleCount">1</strong>
                </span>
              </div>
              <canvas id="gxCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <button type="button" id="gxResetBtn" class="btn sm ghost">Reset Galaxy</button>
                <button type="button" id="gxSupernovaBtn" class="btn sm">💥 Supernova Burst</button>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="gxSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Galaxy PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">GALACTIC MECHANICS</h3>

            <label class="field">
              <span>SPECTRAL PALETTE</span>
              <div class="seg" id="gxColorSeg">
                <button type="button" data-col="violet" class="bg-paper-elevated font-semibold">Andromeda</button>
                <button type="button" data-col="crimson">Chainsaw</button>
                <button type="button" data-col="cyan">Cyber</button>
                <button type="button" data-col="gold">Solar</button>
              </div>
            </label>

            <label class="field">
              <span>GRAVITATIONAL CONSTANT G</span>
              <input type="range" id="gxGravitySlider" min="0.3" max="2.5" step="0.1" value="1.0" />
            </label>

            <div class="divider"></div>

            <div class="stack" style="gap:8px;">
              <label class="row between xs mono cursor-pointer">
                <span>Relativistic Star Trails</span>
                <input type="checkbox" id="gxTrailsCheck" checked />
              </label>
              <label class="row between xs mono cursor-pointer">
                <span>Music Hyperspace Warp</span>
                <input type="checkbox" id="gxMusicCheck" checked />
              </label>
            </div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Click anywhere on the cosmos to spawn a new gravitational black hole. Right-click or shift-click to remove additional singularities!
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#gxCanvas', root);
    const ctx = canvas.getContext('2d');
    const holeCountEl = $('#gxHoleCount', root);

    function initGalaxy() {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      state.blackHoles = [{ x: cx, y: cy, mass: 2800, type: 'attract' }];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.pow(Math.random(), 0.6) * (Math.min(canvas.width, canvas.height) * 0.45);
        px[i] = cx + Math.cos(angle) * dist;
        py[i] = cy + Math.sin(angle) * dist;

        // Keplerian orbital speed: v = sqrt(G*M/r)
        const vOrbital = Math.sqrt((state.gravity * 2800) / (dist + 15)) * (0.85 + Math.random() * 0.3);
        vx[i] = -Math.sin(angle) * vOrbital;
        vy[i] = Math.cos(angle) * vOrbital;
        colorIdx[i] = Math.floor(Math.random() * 5);
      }
      if (holeCountEl) holeCountEl.textContent = state.blackHoles.length;
    }

    function resize() {
      fitCanvas(canvas);
      initGalaxy();
    }
    window.addEventListener('resize', resize);
    resize();

    // Click to add black holes
    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (e.shiftKey) {
        if (state.blackHoles.length > 1) {
          state.blackHoles.pop();
          toast('Black hole removed', 'ok');
          sfx('trash');
        }
      } else {
        if (state.blackHoles.length < 5) {
          state.blackHoles.push({ x, y, mass: 2200, type: 'attract' });
          toast(`Gravitational singularity #${state.blackHoles.length} created!`, 'ok');
          sfx('pulse');
        } else {
          toast('Maximum 5 singularities reached', 'err');
        }
      }
      if (holeCountEl) holeCountEl.textContent = state.blackHoles.length;
    });

    // Supernova burst
    $('#gxSupernovaBtn', root)?.addEventListener('click', () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const dx = px[i] - cx;
        const dy = py[i] - cy;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        vx[i] += (dx / dist) * 12;
        vy[i] += (dy / dist) * 12;
      }
      toast('Supernova shockwave exploded through the core!', 'ok');
      sfx('pulse');
    });

    $('#gxResetBtn', root)?.addEventListener('click', () => {
      initGalaxy();
      toast('Galaxy reformed', 'ok');
      sfx('tick');
    });

    $('#gxSnapshotBtn', root)?.addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-galaxy-${Date.now()}.png`);
      toast('Galaxy capture saved!', 'ok');
      sfx('download');
    });

    $$('#gxColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#gxColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.palette = btn.dataset.col;
        sfx('tick');
      });
    });

    $('#gxGravitySlider', root).addEventListener('input', e => {
      state.gravity = parseFloat(e.target.value);
    });

    $('#gxTrailsCheck', root).addEventListener('change', e => {
      state.trails = e.target.checked;
    });

    $('#gxMusicCheck', root).addEventListener('change', e => {
      state.musicWarp = e.target.checked;
    });

    // Physics Loop
    function loop() {
      const w = canvas.width;
      const h = canvas.height;
      const palette = PALETTES[state.palette] || PALETTES.violet;

      // Persistence fade trail
      ctx.fillStyle = state.trails ? 'rgba(2, 2, 4, 0.22)' : 'rgba(2, 2, 4, 1.0)';
      ctx.fillRect(0, 0, w, h);

      // Music reactive warp factor
      let warpBoost = 1.0;
      if (state.musicWarp && music.pulse && music.pulse.isPlaying) {
        warpBoost = 1.0 + music.pulse.kick * 0.8;
      }

      // Draw Black Holes
      for (const bh of state.blackHoles) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.shadowColor = palette[2];
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = palette[0];
        ctx.stroke();
        ctx.restore();
      }

      // Update Particles
      ctx.save();
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let ax = 0;
        let ay = 0;

        for (const bh of state.blackHoles) {
          const dx = bh.x - px[i];
          const dy = bh.y - py[i];
          const distSq = dx * dx + dy * dy + 400; // softening factor
          const dist = Math.sqrt(distSq);
          const force = (state.gravity * bh.mass) / distSq;
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }

        vx[i] = (vx[i] + ax * 0.016) * state.damping * warpBoost;
        vy[i] = (vy[i] + ay * 0.016) * state.damping * warpBoost;
        px[i] += vx[i];
        py[i] += vy[i];

        // Draw particle
        ctx.fillStyle = palette[colorIdx[i]];
        ctx.fillRect(px[i], py[i], 1.4, 1.4);
      }
      ctx.restore();

      state.animId = requestAnimationFrame(loop);
    }

    state.animId = requestAnimationFrame(loop);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      window.removeEventListener('resize', resize);
      const s = document.getElementById('demo-galaxy-style');
      if (s) s.remove();
    };
  }
};

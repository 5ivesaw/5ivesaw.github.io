// Hyperspace 3D Audio Warp Tunnel & Cyber Flight Simulator — by 5IVESAW
// 3D perspective infinite wormhole with 360-degree radial audio reactive spectrum rings and lightspeed flight controls.
import {
  $, $$, icon, download, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-warptunnel-style';
    style.textContent = `
      .wt-wrap { display: flex; flex-direction: column; gap: 16px; }
      .wt-screen { position: relative; width: 100%; height: 480px; background: #020306; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: none; user-select: none; }
      .wt-screen canvas { width: 100%; height: 100%; display: block; }
      .wt-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
      .wt-ship-crosshair { position: absolute; pointer-events: none; transform: translate(-50%, -50%); z-index: 10; width: 24px; height: 24px; }
      .wt-ship-crosshair::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #00F0FF; box-shadow: 0 0 6px #00F0FF; }
      .wt-ship-crosshair::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: #00F0FF; box-shadow: 0 0 6px #00F0FF; }
    `;
    document.head.appendChild(style);

    const RING_COUNT = 32;
    const STAR_COUNT = 180;
    const stars = new Float32Array(STAR_COUNT * 3); // x, y, z

    for (let i = 0; i < STAR_COUNT; i++) {
      const idx = i * 3;
      stars[idx] = (Math.random() - 0.5) * 1600;
      stars[idx + 1] = (Math.random() - 0.5) * 1600;
      stars[idx + 2] = Math.random() * 2000;
    }

    const state = {
      shape: 'hexagon', // 'hexagon' | 'octagon' | 'circle' | 'square'
      palette: 'synthwave', // 'synthwave' | 'cyberpunk' | 'chainsaw' | 'matrix'
      speed: 1.5,
      flightMode: 'manual', // 'manual' | 'autopilot'
      boost: false,
      radioSync: true,
      shipX: 0,
      shipY: 0,
      targetShipX: 0,
      targetShipY: 0,
      roll: 0,
      distanceTraveled: 0,
      animId: null
    };

    const THEMES = {
      synthwave: { ring: '#EC4899', accent: '#00F0FF', star: '#A855F7', glow: 'rgba(236, 72, 153, 0.6)' },
      cyberpunk: { ring: '#FFD700', accent: '#00E5FF', star: '#38BDF8', glow: 'rgba(255, 215, 0, 0.6)' },
      chainsaw: { ring: '#FF3B14', accent: '#FF8800', star: '#DC2626', glow: 'rgba(255, 59, 20, 0.6)' },
      matrix: { ring: '#00FF66', accent: '#10B981', star: '#059669', glow: 'rgba(0, 255, 102, 0.6)' }
    };

    root.innerHTML = `
      <div class="tl wt-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#EC4899;color:#fff;font-weight:700;">HYPERSPACE FLIGHT</span>
              <span class="eyebrow">WARP TUNNEL // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Hyperspace Audio Warp Tunnel</h2>
            <p class="faint sm mono">High-speed 3D perspective wormhole flight simulator locked to the radio audio spectrum &amp; bass drops.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="wtScreenBox" class="wt-screen">
              <div class="wt-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  WARP VELOCITY: <strong id="wtSpeedText">1.50c</strong> · DIST: <strong id="wtDistText">0 LY</strong> · AUDIO: <strong id="wtPulseText" style="color:#00F0FF;">RADIO SYNC</strong>
                </span>
              </div>
              <div id="wtCrosshair" class="wt-ship-crosshair"></div>
              <canvas id="wtCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <button type="button" id="wtBoostBtn" class="btn sm primary">⚡ Lightspeed Warp Boost</button>
                <button type="button" id="wtFlightBtn" class="btn sm ghost">🎮 Flight: Manual Steer</button>
                <button type="button" id="wtRadioBtn" class="btn sm ghost bg-paper-elevated font-semibold">📻 Radio Sync: ON</button>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="wtSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Warp PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">WARP CORE CONFIG</h3>

            <label class="field">
              <span>TUNNEL GEOMETRY</span>
              <div class="seg" id="wtShapeSeg">
                <button type="button" data-shape="hexagon" class="bg-paper-elevated font-semibold">Hexagon</button>
                <button type="button" data-shape="octagon">Octagon</button>
                <button type="button" data-shape="circle">Hyper-Ring</button>
                <button type="button" data-shape="square">Square</button>
              </div>
            </label>

            <label class="field">
              <span>COLOR STREAM</span>
              <div class="seg" id="wtColorSeg">
                <button type="button" data-col="synthwave" class="bg-paper-elevated font-semibold" style="color:#EC4899;">Synthwave</button>
                <button type="button" data-col="cyberpunk" style="color:#FFD700;">Cyber</button>
                <button type="button" data-col="chainsaw" style="color:#FF3B14;">Chainsaw</button>
                <button type="button" data-col="matrix" style="color:#00FF66;">Matrix</button>
              </div>
            </label>

            <label class="field">
              <span>BASE SPEED (<span id="wtBaseSpeedVal">1.5x</span>)</span>
              <input type="range" id="wtSpeedSlider" min="0.5" max="4.0" step="0.25" value="1.5" />
            </label>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Flight Control:</strong> Move your mouse cursor across the screen to steer the ship. The tunnel walls, speed lines, and neon light rings pulse in direct tempo with the music.
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#wtCanvas', root);
    const ctx = canvas.getContext('2d');
    const screenBox = $('#wtScreenBox', root);
    const crosshair = $('#wtCrosshair', root);
    const speedText = $('#wtSpeedText', root);
    const distText = $('#wtDistText', root);
    const pulseText = $('#wtPulseText', root);
    const speedValText = $('#wtBaseSpeedVal', root);
    const speedSlider = $('#wtSpeedSlider', root);
    const boostBtn = $('#wtBoostBtn', root);
    const flightBtn = $('#wtFlightBtn', root);
    const radioBtn = $('#wtRadioBtn', root);

    boostBtn.addEventListener('pointerdown', () => {
      state.boost = true;
      sfx('whoosh');
    });
    window.addEventListener('pointerup', () => {
      state.boost = false;
    });

    flightBtn.addEventListener('click', () => {
      state.flightMode = state.flightMode === 'manual' ? 'autopilot' : 'manual';
      flightBtn.textContent = state.flightMode === 'manual' ? '🎮 Flight: Manual Steer' : '🤖 Flight: Autopilot Cruise';
      sfx('tick');
    });

    radioBtn.addEventListener('click', () => {
      state.radioSync = !state.radioSync;
      radioBtn.textContent = state.radioSync ? '📻 Radio Sync: ON' : '📻 Radio Sync: OFF';
      radioBtn.classList.toggle('bg-paper-elevated', state.radioSync);
      radioBtn.classList.toggle('font-semibold', state.radioSync);
      sfx('tick');
    });

    $$('#wtShapeSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#wtShapeSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.shape = btn.dataset.shape;
        sfx('tick');
      });
    });

    $$('#wtColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#wtColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.palette = btn.dataset.col;
        sfx('tick');
      });
    });

    speedSlider.addEventListener('input', e => {
      state.speed = parseFloat(e.target.value);
      speedValText.textContent = `${state.speed.toFixed(1)}x`;
    });

    $('#wtSnapshotBtn', root).addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-warptunnel-${Date.now()}.png`);
      toast('Warp snapshot saved!', 'ok');
      sfx('download');
    });

    // Mouse steering
    screenBox.addEventListener('pointermove', e => {
      if (state.flightMode === 'manual') {
        const rect = screenBox.getBoundingClientRect();
        state.targetShipX = (e.clientX - rect.left - rect.width / 2);
        state.targetShipY = (e.clientY - rect.top - rect.height / 2);
      }
    });

    function resize() {
      fitCanvas(canvas);
    }
    window.addEventListener('resize', resize);
    resize();

    let tunnelZ = 0;
    let cameraCurveX = 0;
    let cameraCurveY = 0;

    function render() {
      const w = canvas.width;
      const h = canvas.height;
      const theme = THEMES[state.palette] || THEMES.synthwave;

      const pulse = (state.radioSync && music.pulse && music.pulse.isPlaying) ? music.pulse : null;
      const kick = pulse ? pulse.kick : 0;
      const bass = pulse ? pulse.bass : 0;
      const bands = pulse ? pulse.bands : null;

      const effectiveSpeed = (state.speed * (state.boost ? 2.8 : 1.0) * (1 + kick * 0.45)) * 14;
      tunnelZ += effectiveSpeed;
      state.distanceTraveled += effectiveSpeed * 0.005;

      speedText.textContent = `${(state.speed * (state.boost ? 3.2 : 1.0) * (1 + kick * 0.6)).toFixed(2)}c`;
      distText.textContent = `${Math.floor(state.distanceTraveled)} LY`;

      if (pulse) {
        pulseText.textContent = `RADIO SYNC [${pulse.bpm} BPM ⚡]`;
        pulseText.style.color = '#00F0FF';
      } else {
        pulseText.textContent = 'STANDBY';
        pulseText.style.color = 'var(--faint)';
      }

      if (state.flightMode === 'autopilot') {
        state.targetShipX = Math.sin(tunnelZ * 0.003) * (w * 0.25);
        state.targetShipY = Math.cos(tunnelZ * 0.002) * (h * 0.20);
      }

      // Smooth ship tracking
      state.shipX += (state.targetShipX - state.shipX) * 0.12;
      state.shipY += (state.targetShipY - state.shipY) * 0.12;
      state.roll += ((state.targetShipX * 0.001) - state.roll) * 0.1;

      // Update crosshair position in HUD
      if (crosshair) {
        crosshair.style.left = `${w / 2 + state.shipX}px`;
        crosshair.style.top = `${h / 2 + state.shipY}px`;
      }

      // Clear with persistence motion blur
      ctx.fillStyle = state.boost ? 'rgba(2, 3, 6, 0.4)' : 'rgba(2, 3, 6, 0.25)';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2 - state.shipX * 0.35;
      const cy = h / 2 - state.shipY * 0.35;

      // Draw Starfield Streaks
      ctx.fillStyle = theme.star;
      for (let i = 0; i < STAR_COUNT; i++) {
        const idx = i * 3;
        stars[idx + 2] -= effectiveSpeed * 1.5;
        if (stars[idx + 2] <= 10) {
          stars[idx] = (Math.random() - 0.5) * 1600;
          stars[idx + 1] = (Math.random() - 0.5) * 1600;
          stars[idx + 2] = 2000;
        }

        const sz = stars[idx + 2];
        const sx = cx + (stars[idx] / sz) * 500;
        const sy = cy + (stars[idx + 1] / sz) * 500;

        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          const starSize = Math.max(1, (1 - sz / 2000) * 3 * (1 + kick));
          ctx.beginPath();
          ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Concentric 3D Tunnel Rings
      const ringSpacing = 60;
      const fov = 400 + kick * 60;

      for (let i = RING_COUNT - 1; i >= 0; i--) {
        const rz = ((i * ringSpacing - (tunnelZ % ringSpacing)) + 20);
        if (rz <= 10) continue;

        const scale = fov / rz;
        const radius = Math.min(w, h) * 0.55 * scale * (1 + kick * 0.15);

        // Curvature bend
        const ringCenterX = cx + Math.sin((tunnelZ + rz) * 0.002) * (180 * scale);
        const ringCenterY = cy + Math.cos((tunnelZ + rz) * 0.0018) * (140 * scale);

        const ringAngle = state.roll + (i * 0.06);

        ctx.save();
        ctx.translate(ringCenterX, ringCenterY);
        ctx.rotate(ringAngle);

        const alpha = Math.min(1, Math.max(0, 1 - rz / 1800));
        ctx.strokeStyle = theme.ring;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(1.2, 3.5 * scale * (1 + kick * 0.5));
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = kick > 0.6 ? 16 : 6;

        ctx.beginPath();
        let sides = 6;
        if (state.shape === 'octagon') sides = 8;
        else if (state.shape === 'square') sides = 4;
        else if (state.shape === 'circle') sides = 24;

        for (let s = 0; s <= sides; s++) {
          const a = (s / sides) * Math.PI * 2;
          const rx = Math.cos(a) * radius;
          const ry = Math.sin(a) * radius;
          if (s === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.stroke();

        // 360-degree Radial Spectrum Audio Spikes
        if (bands && bands.length && i % 3 === 0) {
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let b = 0; b < 16; b++) {
            const angle = (b / 16) * Math.PI * 2;
            const bVal = bands[b] || 0;
            const r1 = radius;
            const r2 = radius + (bVal * 45 * scale * (1 + kick));
            ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
            ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
          }
          ctx.stroke();
        }

        ctx.restore();
      }

      state.animId = requestAnimationFrame(render);
    }

    state.animId = requestAnimationFrame(render);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      window.removeEventListener('resize', resize);
      const s = document.getElementById('demo-warptunnel-style');
      if (s) s.remove();
    };
  }
};

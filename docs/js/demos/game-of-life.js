// Quantum Conway's Cellular Automata Lab — by 5IVESAW
// Multi-state color-decay cellular life with audio triggers and music cosmic ray mutations.
import {
  $, $$, icon, download, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-life-style';
    style.textContent = `
      .lf-wrap { display: flex; flex-direction: column; gap: 16px; }
      .lf-screen { position: relative; width: 100%; height: 460px; background: #050608; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: crosshair; user-select: none; }
      .lf-screen canvas { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
      .lf-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const COLS = 80;
    const ROWS = 50;
    let grid = new Uint8Array(COLS * ROWS);
    let nextGrid = new Uint8Array(COLS * ROWS);
    let ageGrid = new Uint8Array(COLS * ROWS);

    const state = {
      isRunning: true,
      speed: 12, // generations per second
      brush: 'cell', // 'cell' | 'glider' | 'pulsar' | 'gun'
      palette: 'neon', // 'neon' | 'matrix' | 'chainsaw' | 'cyber'
      sound: true,
      musicCosmic: true,
      lastTick: 0,
      animId: null
    };

    const THEMES = {
      neon: { live: '#00F0FF', trail: '#8B5CF6', bg: '#04050a' },
      matrix: { live: '#00FF66', trail: '#064E3B', bg: '#020a04' },
      chainsaw: { live: '#FF3B14', trail: '#7F1D1D', bg: '#0a0405' },
      cyber: { live: '#38BDF8', trail: '#1E3A8A', bg: '#030712' }
    };

    root.innerHTML = `
      <div class="tl lf-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#00F0FF;color:#000;font-weight:700;">QUANTUM LIFE</span>
              <span class="eyebrow">CELLULAR AUTOMATA // EMERGENCE</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Quantum Cellular Automata Lab</h2>
            <p class="faint sm mono">Conway's game of life with phosphor age-decay trails, macro presets &amp; cosmic ray mutations.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="lfScreenBox" class="lf-screen">
              <div class="lf-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  GRID: <strong>80×50</strong> · GEN: <strong id="lfGenCount">0</strong>
                </span>
              </div>
              <canvas id="lfCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <button type="button" id="lfPlayBtn" class="btn sm primary">Pause</button>
                <button type="button" id="lfStepBtn" class="btn sm ghost">Step 1x</button>
                <button type="button" id="lfClearBtn" class="btn sm ghost">Clear</button>
                <button type="button" id="lfRandomBtn" class="btn sm">🎲 Chaos Seed</button>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="lfSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Life PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">AUTOMATA PRESETS</h3>

            <div class="grid grid-2" id="lfBrushGrid" style="gap:6px;">
              <button type="button" class="btn sm bg-paper-elevated font-semibold" data-brush="cell">Single Cell</button>
              <button type="button" class="btn sm ghost" data-brush="glider">Glider</button>
              <button type="button" class="btn sm ghost" data-brush="pulsar">Pulsar</button>
              <button type="button" class="btn sm ghost" data-brush="gun">Glider Gun</button>
            </div>

            <div class="divider"></div>

            <label class="field">
              <span>COLOR STREAM</span>
              <div class="seg" id="lfColorSeg">
                <button type="button" data-col="neon" class="bg-paper-elevated font-semibold">Neon</button>
                <button type="button" data-col="matrix">Matrix</button>
                <button type="button" data-col="chainsaw">Chainsaw</button>
                <button type="button" data-col="cyber">Cyber</button>
              </div>
            </label>

            <label class="field">
              <span>EVOLUTION SPEED</span>
              <input type="range" id="lfSpeedSlider" min="2" max="30" value="12" />
            </label>

            <div class="stack" style="gap:8px;">
              <label class="row between xs mono cursor-pointer">
                <span>Music Cosmic Ray Mutations</span>
                <input type="checkbox" id="lfMusicCheck" checked />
              </label>
            </div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Click or drag across the grid to paint living cells or stamp cellular spaceships.
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#lfCanvas', root);
    const ctx = canvas.getContext('2d');
    const genCountEl = $('#lfGenCount', root);
    let genCount = 0;

    function seedRandom() {
      genCount = 0;
      for (let i = 0; i < COLS * ROWS; i++) {
        grid[i] = Math.random() < 0.22 ? 1 : 0;
        ageGrid[i] = grid[i] ? 10 : 0;
      }
    }

    seedRandom();

    function stamp(name, startX, startY) {
      if (name === 'cell') {
        const idx = startY * COLS + startX;
        grid[idx] = grid[idx] ? 0 : 1;
        ageGrid[idx] = grid[idx] ? 10 : 0;
      } else if (name === 'glider') {
        const pattern = [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]];
        for (const [r, c] of pattern) {
          const x = (startX + c) % COLS;
          const y = (startY + r) % ROWS;
          grid[y * COLS + x] = 1;
          ageGrid[y * COLS + x] = 10;
        }
      } else if (name === 'pulsar') {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            if (Math.abs(dr) + Math.abs(dc) === 3) {
              const x = (startX + dc + COLS) % COLS;
              const y = (startY + dr + ROWS) % ROWS;
              grid[y * COLS + x] = 1;
              ageGrid[y * COLS + x] = 10;
            }
          }
        }
      }
    }

    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
      stamp(state.brush, x, y);
      sfx('tick');
    });

    let isPointerDown = false;
    canvas.addEventListener('pointerdown', e => { isPointerDown = true; });
    window.addEventListener('pointermove', e => {
      if (!isPointerDown) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
        grid[y * COLS + x] = 1;
        ageGrid[y * COLS + x] = 10;
      }
    });
    window.addEventListener('pointerup', () => { isPointerDown = false; });

    // Step generation
    function step() {
      genCount++;
      if (genCountEl) genCountEl.textContent = genCount;

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          let neighbors = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = (x + dx + COLS) % COLS;
              const ny = (y + dy + ROWS) % ROWS;
              neighbors += grid[ny * COLS + nx];
            }
          }

          const idx = y * COLS + x;
          const current = grid[idx];
          let next = 0;

          if (current === 1 && (neighbors === 2 || neighbors === 3)) next = 1;
          else if (current === 0 && neighbors === 3) next = 1;

          nextGrid[idx] = next;
          if (next === 1) ageGrid[idx] = 10;
          else if (ageGrid[idx] > 0) ageGrid[idx]--;
        }
      }

      // Music cosmic ray mutation
      if (state.musicCosmic && music.pulse && music.pulse.isPlaying && music.pulse.kick > 0.7) {
        for (let k = 0; k < 6; k++) {
          const rx = Math.floor(Math.random() * COLS);
          const ry = Math.floor(Math.random() * ROWS);
          nextGrid[ry * COLS + rx] = 1;
          ageGrid[ry * COLS + rx] = 10;
        }
      }

      const temp = grid;
      grid = nextGrid;
      nextGrid = temp;
    }

    const playBtn = $('#lfPlayBtn', root);
    playBtn.addEventListener('click', () => {
      state.isRunning = !state.isRunning;
      playBtn.textContent = state.isRunning ? 'Pause' : 'Resume';
      sfx('tick');
    });

    $('#lfStepBtn', root).addEventListener('click', () => {
      step();
      sfx('tick');
    });

    $('#lfClearBtn', root).addEventListener('click', () => {
      grid.fill(0);
      ageGrid.fill(0);
      genCount = 0;
      if (genCountEl) genCountEl.textContent = '0';
      toast('Grid cleared', 'ok');
      sfx('trash');
    });

    $('#lfRandomBtn', root).addEventListener('click', () => {
      seedRandom();
      toast('New cellular soup seeded!', 'ok');
      sfx('pulse');
    });

    $$('#lfBrushGrid button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#lfBrushGrid button', root).forEach(b => b.classList.replace('bg-paper-elevated', 'ghost'));
        btn.classList.replace('ghost', 'bg-paper-elevated');
        state.brush = btn.dataset.brush;
        sfx('tick');
      });
    });

    $$('#lfColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#lfColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.palette = btn.dataset.col;
        sfx('tick');
      });
    });

    $('#lfSpeedSlider', root).addEventListener('input', e => {
      state.speed = parseInt(e.target.value, 10);
    });

    $('#lfSnapshotBtn', root).addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-life-${Date.now()}.png`);
      toast('Saved cellular snapshot!', 'ok');
      sfx('download');
    });

    function resize() {
      fitCanvas(canvas);
    }
    window.addEventListener('resize', resize);
    resize();

    // Loop
    function render(time) {
      if (state.isRunning && time - state.lastTick > (1000 / state.speed)) {
        step();
        state.lastTick = time;
      }

      const w = canvas.width;
      const h = canvas.height;
      const theme = THEMES[state.palette] || THEMES.neon;
      const cellW = w / COLS;
      const cellH = h / ROWS;

      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, w, h);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const idx = y * COLS + x;
          const isAlive = grid[idx] === 1;
          const age = ageGrid[idx];

          if (isAlive) {
            ctx.fillStyle = theme.live;
            ctx.fillRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1);
          } else if (age > 0) {
            ctx.fillStyle = theme.trail;
            ctx.globalAlpha = age / 10;
            ctx.fillRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1);
            ctx.globalAlpha = 1.0;
          }
        }
      }

      state.animId = requestAnimationFrame(render);
    }

    state.animId = requestAnimationFrame(render);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      window.removeEventListener('resize', resize);
      const s = document.getElementById('demo-life-style');
      if (s) s.remove();
    };
  }
};

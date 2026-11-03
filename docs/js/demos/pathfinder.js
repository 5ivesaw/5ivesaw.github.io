// A* Pathfinder Demo — Inspired by fivesawUtils (A* Pathfinding Library for NeoScripts / Baritone-inspired).
// Interactive 2D grid search with open/closed set bloom animation and humanized Catmull-Rom spline path smoothing.
import {
  $, $$, icon, toast, cssVar, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { palette, setStat, rgba, rr, reduced } from './_kit.js';

export default {
  mount(root, api) {
    // Style injection
    const style = document.createElement('style');
    style.textContent = `
      .pf-wrap { display: flex; flex-direction: column; gap: 16px; }
      .pf-grid-stage { position: relative; width: 100%; height: 500px; background: var(--surface); border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; cursor: crosshair; user-select: none; }
      .pf-grid-stage canvas { width: 100%; height: 100%; display: block; }
      .pf-stats-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-top: 10px; }
      .pf-stat-chip { padding: 8px 12px; background: var(--bg); border: 1px solid var(--line); border-radius: var(--r-sm); display: flex; flex-direction: column; gap: 2px; }
      .pf-stat-val { font: 700 16px/1.2 var(--font-mono); color: var(--ink); }
      .pf-stat-lbl { font: 500 9.5px var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--faint); }
    `;
    document.head.appendChild(style);

    // State
    const COLS = 42;
    const ROWS = 24;
    const grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS)); // 0: empty, 1: wall, 2: mud
    let startNode = { r: 12, c: 5 };
    let goalNode = { r: 12, c: 36 };

    let searched = false;
    let searching = false;
    let closedSet = [];
    let openSet = [];
    let finalPath = [];
    let splinePoints = [];
    let walkerProgress = 0;
    let animRaf = null;

    let toolMode = 'wall'; // 'wall' | 'mud' | 'erase'
    let isDrawing = false;
    let dragTarget = null; // 'start' | 'goal' | null

    const config = {
      algo: 'astar', // 'astar' | 'dijkstra' | 'greedy'
      heuristic: 'manhattan', // 'manhattan' | 'euclidean' | 'octile'
      diagonal: true,
      humanize: true,
      speed: 25 // steps per frame
    };

    root.innerHTML = `
      <div class="tl pf-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#5865F2;">fivesawUtils</span>
              <span class="eyebrow">A* PATHFINDING LAB</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Humanized A* Heuristic Solver</h2>
            <p class="faint sm mono">Draw walls or mud, drag Start &amp; Goal, and observe Baritone-style spline smoothing.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw/fivesawUtils" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} fivesawUtils Source ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <!-- Canvas Grid Stage -->
          <div class="card pad" style="padding:14px;">
            <div class="row between wrap" style="margin-bottom:8px;">
              <div class="row wrap">
                <span class="lbl">Draw Mode:</span>
                <div class="seg" id="pfDrawSeg">
                  <button type="button" data-tool="wall" class="on">Wall</button>
                  <button type="button" data-tool="mud">Mud (Weight)</button>
                  <button type="button" data-tool="erase">Erase</button>
                </div>
              </div>
              <div class="row wrap">
                <button type="button" id="pfMazeBtn" class="btn sm">Random Maze</button>
                <button type="button" id="pfClearBtn" class="btn sm ghost">Clear Grid</button>
              </div>
            </div>

            <div id="pfStage" class="pf-grid-stage">
              <canvas id="pfCanvas"></canvas>
            </div>

            <!-- Stats Bar -->
            <div class="pf-stats-bar">
              <div class="pf-stat-chip">
                <span id="pfStatNodes" class="pf-stat-val">0</span>
                <span class="pf-stat-lbl">Nodes Visited</span>
              </div>
              <div class="pf-stat-chip">
                <span id="pfStatLength" class="pf-stat-val">0.0</span>
                <span class="pf-stat-lbl">Path Length</span>
              </div>
              <div class="pf-stat-chip">
                <span id="pfStatTime" class="pf-stat-val accent">0 ms</span>
                <span class="pf-stat-lbl">Compute Time</span>
              </div>
              <div class="pf-stat-chip">
                <span id="pfStatStatus" class="pf-stat-val" style="color:var(--accent);">Ready</span>
                <span class="pf-stat-lbl">Solver State</span>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">ALGORITHM &amp; HEURISTIC</h3>

            <label class="field">
              <span>ALGORITHM</span>
              <div class="seg full" id="pfAlgoSeg">
                <button type="button" data-algo="astar" class="on">A*</button>
                <button type="button" data-algo="dijkstra">Dijkstra</button>
                <button type="button" data-algo="greedy">Greedy</button>
              </div>
            </label>

            <label class="field">
              <span>HEURISTIC</span>
              <select id="pfHeuristicSelect" class="select sq">
                <option value="manhattan" selected>Manhattan (Grid L1)</option>
                <option value="euclidean">Euclidean (Straight-Line L2)</option>
                <option value="octile">Octile (Diagonal Grid)</option>
              </select>
            </label>

            <div class="stack" style="gap:8px;margin-top:4px;">
              <label class="switch-row">
                <input type="checkbox" id="pfDiagonalCheck" checked />
                <span>Allow Diagonal Movement</span>
              </label>
              <label class="switch-row">
                <input type="checkbox" id="pfHumanizeCheck" checked />
                <span>Humanize Path (Catmull-Rom)</span>
              </label>
            </div>

            <div class="tl-range" style="margin-top:4px;">
              <div class="field-row">
                <span class="lbl">Search Visual Speed:</span>
                <span id="pfSpeedVal" class="val">Fast</span>
              </div>
              <input type="range" id="pfSpeedSlider" min="1" max="100" value="25" />
            </div>

            <div class="divider"></div>

            <button type="button" id="pfSolveBtn" class="btn primary lg" style="width:100%;">
              ${icon('play')} Run Pathfinding Search
            </button>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#pfCanvas', root);
    const ctx = canvas.getContext('2d');
    const stage = $('#pfStage', root);

    function getCellSize() {
      const rect = stage.getBoundingClientRect();
      return {
        cw: rect.width / COLS,
        ch: rect.height / ROWS
      };
    }

    function renderGrid() {
      const { w, h } = fitCanvas(canvas);
      ctx.clearRect(0, 0, w, h);

      const pal = palette();
      const cw = w / COLS;
      const ch = h / ROWS;

      // Draw grid lines
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cw, 0);
        ctx.lineTo(c * cw, h);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * ch);
        ctx.lineTo(w, r * ch);
        ctx.stroke();
      }

      // Draw cells (mud and walls)
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const type = grid[r][c];
          if (type === 1) {
            // Wall
            ctx.fillStyle = pal.ink;
            ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
          } else if (type === 2) {
            // Mud
            ctx.fillStyle = rgba(pal.accent, 0.28);
            ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
            ctx.fillStyle = pal.accent;
            ctx.fillRect(c * cw + cw / 2 - 2, r * ch + ch / 2 - 2, 4, 4);
          }
        }
      }

      // Draw Closed Set bloom
      ctx.fillStyle = rgba(pal.accent, 0.18);
      for (let i = 0; i < closedSet.length; i++) {
        const node = closedSet[i];
        ctx.fillRect(node.c * cw + 1, node.r * ch + 1, cw - 2, ch - 2);
      }

      // Draw Open Set frontier
      ctx.fillStyle = rgba(pal.accent, 0.45);
      for (let i = 0; i < openSet.length; i++) {
        const node = openSet[i];
        ctx.fillRect(node.c * cw + 2, node.r * ch + 2, cw - 4, ch - 4);
      }

      // Draw Path
      if (finalPath.length > 1) {
        if (config.humanize && splinePoints.length > 1) {
          // Spline smooth line
          ctx.strokeStyle = pal.accent;
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(splinePoints[0].x, splinePoints[0].y);
          for (let i = 1; i < splinePoints.length; i++) {
            ctx.lineTo(splinePoints[i].x, splinePoints[i].y);
          }
          ctx.stroke();

          // Walking robot cursor
          if (walkerProgress < splinePoints.length - 1) {
            const p = splinePoints[Math.floor(walkerProgress)];
            ctx.fillStyle = '#fff';
            ctx.shadowColor = pal.accent;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            walkerProgress = (walkerProgress + 0.6) % splinePoints.length;
          }
        } else {
          // Standard path segments
          ctx.strokeStyle = pal.accent;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo((finalPath[0].c + 0.5) * cw, (finalPath[0].r + 0.5) * ch);
          for (let i = 1; i < finalPath.length; i++) {
            ctx.lineTo((finalPath[i].c + 0.5) * cw, (finalPath[i].r + 0.5) * ch);
          }
          ctx.stroke();
        }
      }

      // Draw Start Node (Green circle with S)
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc((startNode.c + 0.5) * cw, (startNode.r + 0.5) * ch, Math.min(cw, ch) * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', (startNode.c + 0.5) * cw, (startNode.r + 0.5) * ch);

      // Draw Goal Node (Red circle with G)
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc((goalNode.c + 0.5) * cw, (goalNode.r + 0.5) * ch, Math.min(cw, ch) * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('G', (goalNode.c + 0.5) * cw, (goalNode.r + 0.5) * ch);

      if (searching || (config.humanize && finalPath.length > 1)) {
        animRaf = requestAnimationFrame(renderGrid);
      }
    }

    // Heuristic function
    function getH(r1, c1, r2, c2) {
      const dr = Math.abs(r1 - r2);
      const dc = Math.abs(c1 - c2);
      if (config.heuristic === 'manhattan') return (dr + dc) * 10;
      if (config.heuristic === 'euclidean') return Math.sqrt(dr * dr + dc * dc) * 10;
      // Octile
      return (dr + dc) * 10 + (Math.SQRT2 * 10 - 20) * Math.min(dr, dc);
    }

    // Search algorithm
    function solvePath(animated = true) {
      if (searching) return;
      const t0 = performance.now();
      cancelAnimationFrame(animRaf);

      closedSet = [];
      openSet = [];
      finalPath = [];
      splinePoints = [];
      walkerProgress = 0;

      const gScore = Array.from({ length: ROWS }, () => new Float32Array(COLS).fill(Infinity));
      const fScore = Array.from({ length: ROWS }, () => new Float32Array(COLS).fill(Infinity));
      const parent = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
      const closedMap = Array.from({ length: ROWS }, () => new Uint8Array(COLS));

      const start = { r: startNode.r, c: startNode.c };
      const goal = { r: goalNode.r, c: goalNode.c };

      gScore[start.r][start.c] = 0;
      fScore[start.r][start.c] = config.algo === 'dijkstra' ? 0 : getH(start.r, start.c, goal.r, goal.c);

      const openHeap = [start];
      let found = false;

      function step() {
        if (!openHeap.length) {
          searching = false;
          $('#pfStatStatus', root).textContent = 'No Path';
          sfx('error');
          return;
        }

        // Pop best node from open heap
        openHeap.sort((a, b) => fScore[a.r][a.c] - fScore[b.r][b.c]);
        const cur = openHeap.shift();

        if (cur.r === goal.r && cur.c === goal.c) {
          // Reconstruct path
          found = true;
          searching = false;
          let curr = cur;
          while (curr) {
            finalPath.unshift(curr);
            curr = parent[curr.r][curr.c];
          }

          // Generate Catmull-Rom spline points for humanized smoothing
          buildSpline();

          const t1 = performance.now();
          $('#pfStatNodes', root).textContent = closedSet.length;
          $('#pfStatLength', root).textContent = (finalPath.length * 1.0).toFixed(1);
          $('#pfStatTime', root).textContent = `${Math.round(t1 - t0)} ms`;
          $('#pfStatStatus', root).textContent = 'Resolved';
          searched = true;
          sfx('success');
          renderGrid();
          return;
        }

        closedMap[cur.r][cur.c] = 1;
        closedSet.push(cur);

        // Expand neighbours
        const dirs = [
          [-1, 0, 10], [1, 0, 10], [0, -1, 10], [0, 1, 10]
        ];
        if (config.diagonal) {
          dirs.push([-1, -1, 14], [-1, 1, 14], [1, -1, 14], [1, 1, 14]);
        }

        for (const [dr, dc, baseCost] of dirs) {
          const nr = cur.r + dr;
          const nc = cur.c + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          if (grid[nr][nc] === 1) continue; // wall
          if (closedMap[nr][nc]) continue;

          // Mud adds cost
          const weight = grid[nr][nc] === 2 ? 30 : 0;
          const tentG = gScore[cur.r][cur.c] + baseCost + weight;

          if (tentG < gScore[nr][nc]) {
            parent[nr][nc] = cur;
            gScore[nr][nc] = tentG;
            const h = config.algo === 'dijkstra' ? 0 : getH(nr, nc, goal.r, goal.c);
            fScore[nr][nc] = config.algo === 'greedy' ? h : tentG + h;

            if (!openHeap.some(n => n.r === nr && n.c === nc)) {
              openHeap.push({ r: nr, c: nc });
              openSet.push({ r: nr, c: nc });
            }
          }
        }
      }

      if (!animated) {
        // Run synchronously to completion (e.g. during drag)
        while (openHeap.length && !found) {
          step();
        }
        renderGrid();
        return;
      }

      // Animated search loop
      searching = true;
      $('#pfStatStatus', root).textContent = 'Searching...';

      function animBatch() {
        for (let i = 0; i < config.speed && openHeap.length && !found; i++) {
          step();
        }
        renderGrid();
        if (searching) {
          requestAnimationFrame(animBatch);
        }
      }
      animBatch();
    }

    function buildSpline() {
      if (finalPath.length < 2) return;
      const { cw, ch } = getCellSize();
      const points = finalPath.map(p => ({ x: (p.c + 0.5) * cw, y: (p.r + 0.5) * ch }));
      splinePoints = [];

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        for (let t = 0; t <= 1; t += 0.15) {
          const t2 = t * t;
          const t3 = t2 * t;

          const x = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
          );
          const y = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
          );
          splinePoints.push({ x, y });
        }
      }
    }

    function generateMaze() {
      // Clear
      for (let r = 0; r < ROWS; r++) grid[r].fill(1);
      // Recursive backtracker
      function carve(r, c) {
        grid[r][c] = 0;
        const dirs = [[-2, 0], [2, 0], [0, -2], [0, 2]].sort(() => Math.random() - 0.5);
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && grid[nr][nc] === 1) {
            grid[r + dr / 2][c + dc / 2] = 0;
            carve(nr, nc);
          }
        }
      }
      carve(1, 1);
      grid[startNode.r][startNode.c] = 0;
      grid[goalNode.r][goalNode.c] = 0;
      closedSet = [];
      openSet = [];
      finalPath = [];
      renderGrid();
      sfx('whoosh');
    }

    // Pointer events for drawing & dragging endpoints
    function getCellFromEvent(e) {
      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const c = Math.floor((x / rect.width) * COLS);
      const r = Math.floor((y / rect.height) * ROWS);
      return { r: Math.max(0, Math.min(ROWS - 1, r)), c: Math.max(0, Math.min(COLS - 1, c)) };
    }

    stage.addEventListener('pointerdown', e => {
      e.preventDefault();
      const cell = getCellFromEvent(e);

      if (cell.r === startNode.r && cell.c === startNode.c) {
        dragTarget = 'start';
      } else if (cell.r === goalNode.r && cell.c === goalNode.c) {
        dragTarget = 'goal';
      } else {
        isDrawing = true;
        applyDraw(cell);
      }
      stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener('pointermove', e => {
      const cell = getCellFromEvent(e);
      if (dragTarget === 'start') {
        startNode = cell;
        if (searched) solvePath(false); else renderGrid();
      } else if (dragTarget === 'goal') {
        goalNode = cell;
        if (searched) solvePath(false); else renderGrid();
      } else if (isDrawing) {
        applyDraw(cell);
      }
    });

    stage.addEventListener('pointerup', e => {
      isDrawing = false;
      dragTarget = null;
    });

    function applyDraw(cell) {
      if ((cell.r === startNode.r && cell.c === startNode.c) || (cell.r === goalNode.r && cell.c === goalNode.c)) return;
      if (toolMode === 'wall') grid[cell.r][cell.c] = 1;
      else if (toolMode === 'mud') grid[cell.r][cell.c] = 2;
      else grid[cell.r][cell.c] = 0;
      renderGrid();
    }

    // Buttons
    $('#pfSolveBtn', root).addEventListener('click', () => {
      sfx('click');
      solvePath(true);
    });

    $('#pfMazeBtn', root).addEventListener('click', generateMaze);
    $('#pfClearBtn', root).addEventListener('click', () => {
      for (let r = 0; r < ROWS; r++) grid[r].fill(0);
      closedSet = [];
      openSet = [];
      finalPath = [];
      splinePoints = [];
      searched = false;
      renderGrid();
      sfx('tick');
    });

    $('#pfDrawSeg', root).addEventListener('click', e => {
      const b = e.target.closest('[data-tool]');
      if (!b) return;
      $('#pfDrawSeg', root).querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      toolMode = b.dataset.tool;
      sfx('click');
    });

    $('#pfAlgoSeg', root).addEventListener('click', e => {
      const b = e.target.closest('[data-algo]');
      if (!b) return;
      $('#pfAlgoSeg', root).querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      config.algo = b.dataset.algo;
      if (searched) solvePath(false);
      sfx('click');
    });

    $('#pfHeuristicSelect', root).addEventListener('change', e => {
      config.heuristic = e.target.value;
      if (searched) solvePath(false);
    });

    $('#pfDiagonalCheck', root).addEventListener('change', e => {
      config.diagonal = e.target.checked;
      if (searched) solvePath(false);
      sfx('toggleOn');
    });

    $('#pfHumanizeCheck', root).addEventListener('change', e => {
      config.humanize = e.target.checked;
      renderGrid();
      sfx('toggleOn');
    });

    $('#pfSpeedSlider', root).addEventListener('input', e => {
      config.speed = Number(e.target.value);
    });

    const unTheme = onThemeChange(renderGrid);
    window.addEventListener('resize', renderGrid);
    renderGrid();

    return () => {
      style.remove();
      unTheme();
      window.removeEventListener('resize', renderGrid);
      cancelAnimationFrame(animRaf);
    };
  }
};

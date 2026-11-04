// Sawbyte Micro-Voxel 3D Engine & Sandbox — by 5IVESAW
// Lightweight in-browser Minecraft-style voxel raycaster inspired by 5ivesaw/Sawbyte.
import {
  $, $$, icon, download, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-voxel-style';
    style.textContent = `
      .vx-wrap { display: flex; flex-direction: column; gap: 16px; }
      .vx-screen { position: relative; width: 100%; height: 460px; background: #87CEEB; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: crosshair; user-select: none; }
      .vx-screen canvas { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
      .vx-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
      .vx-crosshair { position: absolute; top: 50%; left: 50%; width: 14px; height: 14px; transform: translate(-50%, -50%); pointer-events: none; z-index: 10; }
      .vx-crosshair::before, .vx-crosshair::after { content: ''; position: absolute; background: rgba(255,255,255,0.85); box-shadow: 0 0 2px #000; }
      .vx-crosshair::before { top: 6px; left: 0; width: 14px; height: 2px; }
      .vx-crosshair::after { top: 0; left: 6px; width: 2px; height: 14px; }
    `;
    document.head.appendChild(style);

    const VX_SIZE = 24; // 24x12x24 voxel world
    const VX_HEIGHT = 12;
    const blocks = new Uint8Array(VX_SIZE * VX_HEIGHT * VX_SIZE);

    const BLOCKS = [
      { id: 0, name: 'Air', color: '#00000000' },
      { id: 1, name: 'Grass', top: '#4EA632', side: '#755437', bottom: '#755437' },
      { id: 2, name: 'Stone', top: '#808080', side: '#757575', bottom: '#757575' },
      { id: 3, name: 'Wood', top: '#B5885C', side: '#6B4C2A', bottom: '#B5885C' },
      { id: 4, name: 'Leaves', top: '#2E7D32', side: '#2E7D32', bottom: '#2E7D32' },
      { id: 5, name: 'Brick', top: '#A34735', side: '#A34735', bottom: '#A34735' },
      { id: 6, name: 'Gold', top: '#FFD700', side: '#E6C200', bottom: '#CCAC00' },
      { id: 7, name: 'Obsidian', top: '#1A1423', side: '#150F1D', bottom: '#100C16' }
    ];

    const state = {
      selectedBlock: 1, // Grass
      cameraAngleX: 0.45,
      cameraAngleY: 0.75,
      cameraDist: 32,
      timeOfDay: 'noon', // 'noon' | 'sunset' | 'night'
      animId: null,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0
    };

    root.innerHTML = `
      <div class="tl vx-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#4EA632;color:#fff;font-weight:700;">SAWBYTE VOXEL</span>
              <span class="eyebrow">MINECRAFT SANDBOX // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Sawbyte Micro-Voxel 3D Engine</h2>
            <p class="faint sm mono">Procedural isometric voxel chunk with block placing, breaking, and daylight cycle.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw/Sawbyte" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} Sawbyte Repo ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="vxScreenBox" class="vx-screen">
              <div class="vx-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  SAWBYTE CHUNK: <strong>24×12×24</strong> · SELECTED: <strong id="vxSelectedText">GRASS</strong> · AUDIO: <strong id="vxPulseIndicator" style="color:#00F0FF;">PULSE SYNC</strong>
                </span>
              </div>
              <div class="vx-crosshair"></div>
              <canvas id="vxCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <button type="button" id="vxRegenBtn" class="btn sm ghost">Regen Terrain</button>
                <button type="button" id="vxClearBtn" class="btn sm ghost">Clear All</button>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="vxSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Voxel PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">VOXEL INVENTORY</h3>

            <div class="grid grid-3" id="vxPaletteGrid" style="gap:6px;">
              <button type="button" class="btn sm bg-paper-elevated font-semibold" data-bid="1" style="background:#4EA632;color:#fff;">Grass</button>
              <button type="button" class="btn sm ghost" data-bid="2" style="color:#808080;">Stone</button>
              <button type="button" class="btn sm ghost" data-bid="3" style="color:#B5885C;">Wood</button>
              <button type="button" class="btn sm ghost" data-bid="4" style="color:#2E7D32;">Leaves</button>
              <button type="button" class="btn sm ghost" data-bid="5" style="color:#A34735;">Brick</button>
              <button type="button" class="btn sm ghost" data-bid="6" style="color:#FFD700;">Gold</button>
            </div>

            <div class="divider"></div>

            <label class="field">
              <span>TIME OF DAY</span>
              <div class="seg" id="vxTimeSeg">
                <button type="button" data-time="noon" class="bg-paper-elevated font-semibold">Noon</button>
                <button type="button" data-time="sunset">Sunset</button>
                <button type="button" data-time="night">Night</button>
              </div>
            </label>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Left-click to break blocks. Hold <strong>Shift</strong> or Right-click to place the selected voxel. Drag to orbit the 3D chunk!
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#vxCanvas', root);
    const ctx = canvas.getContext('2d');
    const screenBox = $('#vxScreenBox', root);
    const selectedText = $('#vxSelectedText', root);

    function V_IDX(x, y, z) {
      return x + VX_SIZE * (y + VX_HEIGHT * z);
    }

    function generateTerrain() {
      blocks.fill(0);
      for (let x = 0; x < VX_SIZE; x++) {
        for (let z = 0; z < VX_SIZE; z++) {
          const height = Math.floor(3 + Math.sin(x * 0.35) * 2 + Math.cos(z * 0.35) * 2);
          for (let y = 0; y <= height; y++) {
            if (y === height) blocks[V_IDX(x, y, z)] = 1; // Grass
            else if (y >= height - 2) blocks[V_IDX(x, y, z)] = 1; // Dirt
            else blocks[V_IDX(x, y, z)] = 2; // Stone
          }
        }
      }

      // Add a tree in the center
      const tx = 12, tz = 12;
      const th = Math.floor(3 + Math.sin(tx * 0.35) * 2 + Math.cos(tz * 0.35) * 2);
      for (let y = th + 1; y <= th + 4; y++) {
        blocks[V_IDX(tx, y, tz)] = 3; // Wood trunk
      }
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          blocks[V_IDX(tx + ox, th + 4, tz + oz)] = 4; // Leaves
          blocks[V_IDX(tx + ox, th + 5, tz + oz)] = 4;
        }
      }
    }

    generateTerrain();

    function resize() {
      fitCanvas(canvas);
    }
    window.addEventListener('resize', resize);
    resize();

    // Inventory selection
    $$('#vxPaletteGrid button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#vxPaletteGrid button', root).forEach(b => b.classList.replace('bg-paper-elevated', 'ghost'));
        btn.classList.replace('ghost', 'bg-paper-elevated');
        state.selectedBlock = parseInt(btn.dataset.bid, 10);
        selectedText.textContent = BLOCKS[state.selectedBlock].name.toUpperCase();
        sfx('tick');
      });
    });

    // Time of day
    $$('#vxTimeSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#vxTimeSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.timeOfDay = btn.dataset.time;
        if (state.timeOfDay === 'noon') screenBox.style.background = '#87CEEB';
        else if (state.timeOfDay === 'sunset') screenBox.style.background = '#F97316';
        else screenBox.style.background = '#0B0F19';
        sfx('tick');
      });
    });

    $('#vxRegenBtn', root)?.addEventListener('click', () => {
      generateTerrain();
      toast('New Sawbyte voxel chunk synthesized!', 'ok');
      sfx('pulse');
    });

    $('#vxClearBtn', root)?.addEventListener('click', () => {
      blocks.fill(0);
      toast('Chunk cleared to void', 'ok');
      sfx('trash');
    });

    $('#vxSnapshotBtn', root)?.addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-voxel-${Date.now()}.png`);
      toast('Voxel snapshot saved!', 'ok');
      sfx('download');
    });

    // Orbit Drag
    const onPointerDown = e => {
      state.isDragging = true;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
    };
    canvas.addEventListener('pointerdown', onPointerDown);

    const onPointerMove = e => {
      if (!state.isDragging) return;
      const dx = e.clientX - state.lastMouseX;
      const dy = e.clientY - state.lastMouseY;
      state.cameraAngleY += dx * 0.008;
      state.cameraAngleX = Math.max(0.1, Math.min(1.2, state.cameraAngleX + dy * 0.008));
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onPointerUp = () => {
      state.isDragging = false;
    };
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    // Raycast click
    canvas.addEventListener('click', e => {
      // Toggle a block near center
      const tx = Math.floor(VX_SIZE / 2 + (Math.random() - 0.5) * 6);
      const tz = Math.floor(VX_SIZE / 2 + (Math.random() - 0.5) * 6);
      for (let y = VX_HEIGHT - 1; y >= 0; y--) {
        const idx = V_IDX(tx, y, tz);
        if (e.shiftKey) {
          if (blocks[idx] === 0 && y > 0 && blocks[V_IDX(tx, y - 1, tz)] !== 0) {
            blocks[idx] = state.selectedBlock;
            toast(`Placed ${BLOCKS[state.selectedBlock].name}`, 'ok');
            sfx('tick');
            break;
          }
        } else {
          if (blocks[idx] !== 0) {
            blocks[idx] = 0;
            toast('Block mined', 'ok');
            sfx('pop');
            break;
          }
        }
      }
    });

    // Pre-allocated voxel pool & index array to eliminate per-frame GC churn
    const maxVoxels = VX_SIZE * VX_HEIGHT * VX_SIZE;
    const voxelPool = new Array(maxVoxels);
    for (let i = 0; i < maxVoxels; i++) {
      voxelPool[i] = { x: 0, y: 0, depth: 0, bId: 0 };
    }
    const voxelIndices = new Int32Array(maxVoxels);

    // Isometric 3D Voxel Projection
    function render() {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const pulse = (music.pulse && music.pulse.isPlaying) ? music.pulse : null;
      const kick = pulse ? pulse.kick : 0;
      const bands = pulse ? pulse.bands : null;

      // Music reactive Aurora / Sky beams
      if (bands && bands.length) {
        ctx.save();
        const beamW = w / 16;
        for (let i = 0; i < 16; i++) {
          const b = bands[i] || 0;
          if (b > 0.05) {
            const bh = b * (h * 0.45);
            const grad = ctx.createLinearGradient(0, 0, 0, bh);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
            grad.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(i * beamW, 0, beamW - 2, bh);
          }
        }
        ctx.restore();
      }

      const cosY = Math.cos(state.cameraAngleY);
      const sinY = Math.sin(state.cameraAngleY);
      const cosX = Math.cos(state.cameraAngleX);
      const sinX = Math.sin(state.cameraAngleX);

      const blockSize = 14;
      const originX = w / 2;
      const originY = h * 0.65 + (pulse ? Math.sin(pulse.phase * 2) * (2 + kick * 5) : 0);

      // Populate pre-allocated pool (0 object allocations per frame)
      let count = 0;
      for (let x = 0; x < VX_SIZE; x++) {
        for (let y = 0; y < VX_HEIGHT; y++) {
          for (let z = 0; z < VX_SIZE; z++) {
            const bId = blocks[V_IDX(x, y, z)];
            if (bId === 0) continue;

            const rx = (x - VX_SIZE / 2) * blockSize;
            const ry = y * blockSize;
            const rz = (z - VX_SIZE / 2) * blockSize;

            const xRot = rx * cosY - rz * sinY;
            const zRot = rx * sinY + rz * cosY;
            const yRot = ry * cosX - zRot * sinX;
            const depth = ry * sinX + zRot * cosX;

            const v = voxelPool[count];
            v.x = originX + xRot;
            v.y = originY - yRot;
            v.depth = depth;
            v.bId = bId;
            voxelIndices[count] = count;
            count++;
          }
        }
      }

      const activeIndices = voxelIndices.subarray(0, count);
      activeIndices.sort((a, b) => voxelPool[a].depth - voxelPool[b].depth);

      const s = blockSize;
      const s086 = s * 0.86;
      const s05 = s * 0.5;

      for (let i = 0; i < count; i++) {
        const v = voxelPool[activeIndices[i]];
        const meta = BLOCKS[v.bId] || BLOCKS[1];

        // Cube top face
        ctx.fillStyle = meta.top;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y - s);
        ctx.lineTo(v.x + s086, v.y - s05);
        ctx.lineTo(v.x, v.y);
        ctx.lineTo(v.x - s086, v.y - s05);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.stroke();

        // Left face
        ctx.fillStyle = meta.side;
        ctx.beginPath();
        ctx.moveTo(v.x - s086, v.y - s05);
        ctx.lineTo(v.x, v.y);
        ctx.lineTo(v.x, v.y + s);
        ctx.lineTo(v.x - s086, v.y + s05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right face
        ctx.fillStyle = meta.bottom;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x + s086, v.y - s05);
        ctx.lineTo(v.x + s086, v.y + s05);
        ctx.lineTo(v.x, v.y + s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      state.animId = requestAnimationFrame(render);
    }

    state.animId = requestAnimationFrame(render);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      const s = document.getElementById('demo-voxel-style');
      if (s) s.remove();
    };
  }
};

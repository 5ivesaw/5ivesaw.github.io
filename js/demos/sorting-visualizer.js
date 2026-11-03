// Humanized Audio Sorting Algorithm Visualizer — by 5IVESAW
// Real-time sorting engine with WebAudio musical pitch synthesis for every array swap & comparison.
import {
  $, $$, icon, download, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-sort-style';
    style.textContent = `
      .sv-wrap { display: flex; flex-direction: column; gap: 16px; }
      .sv-screen { position: relative; width: 100%; height: 460px; background: #07080c; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: flex-end; justify-content: center; user-select: none; }
      .sv-screen canvas { width: 100%; height: 100%; display: block; }
      .sv-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    let arraySize = 64;
    let array = new Float32Array(arraySize);
    let activeIndices = new Set();
    let compareIndices = new Set();

    const state = {
      algorithm: 'quicksort', // 'quicksort' | 'mergesort' | 'heapsort' | 'bubblesort'
      audioCtx: null,
      sound: true,
      delayMs: 25,
      isSorting: false,
      comparisons: 0,
      swaps: 0,
      animId: null
    };

    function resetArray() {
      state.isSorting = false;
      state.comparisons = 0;
      state.swaps = 0;
      array = new Float32Array(arraySize);
      for (let i = 0; i < arraySize; i++) {
        array[i] = (i + 1) / arraySize;
      }
      // Fisher-Yates Shuffle
      for (let i = arraySize - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }
      activeIndices.clear();
      compareIndices.clear();
    }

    resetArray();

    root.innerHTML = `
      <div class="tl sv-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#F59E0B;color:#000;font-weight:700;">ALGORITHMIC SOUND</span>
              <span class="eyebrow">SORTING HARMONICS // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Audio Sorting Algorithm Engine</h2>
            <p class="faint sm mono">Visual and auditory representation of algorithm complexity with WebAudio tone synthesis.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="svScreenBox" class="sv-screen">
              <div class="sv-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  CMP: <strong id="svCmpCount">0</strong> · SWAP: <strong id="svSwapCount">0</strong>
                </span>
              </div>
              <canvas id="svCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <button type="button" id="svStartBtn" class="btn sm primary">⚡ Start Sorting</button>
                <button type="button" id="svShuffleBtn" class="btn sm ghost">Shuffle Array</button>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="svSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Sorting PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">ALGORITHM ENGINE</h3>

            <div class="grid grid-2" id="svAlgoGrid" style="gap:6px;">
              <button type="button" class="btn sm bg-paper-elevated font-semibold" data-algo="quicksort">QuickSort</button>
              <button type="button" class="btn sm ghost" data-algo="mergesort">MergeSort</button>
              <button type="button" class="btn sm ghost" data-algo="heapsort">HeapSort</button>
              <button type="button" class="btn sm ghost" data-algo="bubblesort">BubbleSort</button>
            </div>

            <div class="divider"></div>

            <label class="field">
              <span>ARRAY DENSITY (${arraySize} BARS)</span>
              <input type="range" id="svSizeSlider" min="24" max="120" step="8" value="64" />
            </label>

            <label class="field">
              <span>STEP DELAY</span>
              <input type="range" id="svDelaySlider" min="2" max="60" value="25" />
            </label>

            <div class="stack" style="gap:8px;">
              <label class="row between xs mono cursor-pointer">
                <span>Synthesize Tone On Comparison</span>
                <input type="checkbox" id="svSoundCheck" checked />
              </label>
            </div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Harmonics:</strong> Higher value bars emit higher musical pitch frequencies when swapped, playing the acoustic signature of each sorting algorithm.
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#svCanvas', root);
    const ctx = canvas.getContext('2d');
    const cmpEl = $('#svCmpCount', root);
    const swapEl = $('#svSwapCount', root);

    function ensureAudio() {
      if (!state.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        state.audioCtx = new AudioCtx();
      }
      if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
    }

    function playTone(val) {
      if (!state.sound) return;
      ensureAudio();
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      const freq = 120 + val * 1200;
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(state.audioCtx.destination);
      osc.start();
      osc.stop(state.audioCtx.currentTime + 0.05);
    }

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function swap(i, j) {
      state.swaps++;
      if (swapEl) swapEl.textContent = state.swaps;
      activeIndices.add(i);
      activeIndices.add(j);
      playTone(array[i]);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
      await sleep(state.delayMs);
      activeIndices.delete(i);
      activeIndices.delete(j);
    }

    async function compare(i, j) {
      state.comparisons++;
      if (cmpEl) cmpEl.textContent = state.comparisons;
      compareIndices.add(i);
      compareIndices.add(j);
      await sleep(state.delayMs * 0.4);
      compareIndices.delete(i);
      compareIndices.delete(j);
      return array[i] - array[j];
    }

    // QuickSort
    async function quickSort(start = 0, end = arraySize - 1) {
      if (!state.isSorting || start >= end) return;
      const pivot = array[end];
      let pIdx = start;
      for (let i = start; i < end; i++) {
        if (!state.isSorting) return;
        if (await compare(i, end) < 0) {
          await swap(i, pIdx);
          pIdx++;
        }
      }
      await swap(pIdx, end);
      await quickSort(start, pIdx - 1);
      await quickSort(pIdx + 1, end);
    }

    // BubbleSort
    async function bubbleSort() {
      for (let i = 0; i < arraySize; i++) {
        for (let j = 0; j < arraySize - i - 1; j++) {
          if (!state.isSorting) return;
          if (await compare(j, j + 1) > 0) {
            await swap(j, j + 1);
          }
        }
      }
    }

    // HeapSort
    async function heapSort() {
      async function heapify(n, i) {
        if (!state.isSorting) return;
        let largest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        if (l < n && await compare(l, largest) > 0) largest = l;
        if (r < n && await compare(r, largest) > 0) largest = r;
        if (largest !== i) {
          await swap(i, largest);
          await heapify(n, largest);
        }
      }
      for (let i = Math.floor(arraySize / 2) - 1; i >= 0; i--) await heapify(arraySize, i);
      for (let i = arraySize - 1; i > 0; i--) {
        if (!state.isSorting) return;
        await swap(0, i);
        await heapify(i, 0);
      }
    }

    const startBtn = $('#svStartBtn', root);
    startBtn.addEventListener('click', async () => {
      if (state.isSorting) {
        state.isSorting = false;
        startBtn.textContent = '⚡ Start Sorting';
        sfx('toggleOff');
        return;
      }
      ensureAudio();
      state.isSorting = true;
      startBtn.textContent = '⏹ Stop Sorting';
      sfx('toggleOn');

      if (state.algorithm === 'quicksort') await quickSort();
      else if (state.algorithm === 'bubblesort') await bubbleSort();
      else if (state.algorithm === 'heapsort') await heapSort();

      state.isSorting = false;
      startBtn.textContent = '⚡ Start Sorting';
      activeIndices.clear();
      compareIndices.clear();
      toast('Sorting complete!', 'ok');
      sfx('pulse');
    });

    $('#svShuffleBtn', root).addEventListener('click', () => {
      resetArray();
      if (cmpEl) cmpEl.textContent = '0';
      if (swapEl) swapEl.textContent = '0';
      toast('Array randomized', 'ok');
      sfx('tick');
    });

    $$('#svAlgoGrid button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#svAlgoGrid button', root).forEach(b => b.classList.replace('bg-paper-elevated', 'ghost'));
        btn.classList.replace('ghost', 'bg-paper-elevated');
        state.algorithm = btn.dataset.algo;
        sfx('tick');
      });
    });

    $('#svSizeSlider', root).addEventListener('input', e => {
      arraySize = parseInt(e.target.value, 10);
      resetArray();
    });

    $('#svDelaySlider', root).addEventListener('input', e => {
      state.delayMs = parseInt(e.target.value, 10);
    });

    $('#svSoundCheck', root).addEventListener('change', e => {
      state.sound = e.target.checked;
    });

    $('#svSnapshotBtn', root).addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-sort-${Date.now()}.png`);
      toast('Sorting snapshot saved!', 'ok');
      sfx('download');
    });

    function resize() {
      fitCanvas(canvas);
    }
    window.addEventListener('resize', resize);
    resize();

    // Render loop
    function render() {
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, w, h);

      const barW = w / arraySize;
      for (let i = 0; i < arraySize; i++) {
        const val = array[i];
        const barH = val * (h * 0.82);
        const x = i * barW;
        const y = h - barH;

        if (activeIndices.has(i)) {
          ctx.fillStyle = '#FF3B14'; // Active swap
        } else if (compareIndices.has(i)) {
          ctx.fillStyle = '#FFC700'; // Comparison
        } else {
          ctx.fillStyle = `hsl(${val * 240 + 160}, 90%, 55%)`;
        }

        ctx.fillRect(x + 1, y, barW - 2, barH);
      }

      state.animId = requestAnimationFrame(render);
    }

    state.animId = requestAnimationFrame(render);

    return () => {
      state.isSorting = false;
      if (state.animId) cancelAnimationFrame(state.animId);
      if (state.audioCtx) state.audioCtx.close().catch(() => {});
      window.removeEventListener('resize', resize);
      const s = document.getElementById('demo-sort-style');
      if (s) s.remove();
    };
  }
};

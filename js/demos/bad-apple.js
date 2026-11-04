// Cursed Text Renderer Demo — Inspired by a-apple-that-is-bad (Bad Apple in cursed 5ivesaw text).
// Real-time ASCII/Unicode text art video renderer from procedural animation, webcam or video files.
import {
  $, $$, icon, formatBytes, download, copyText, toast, cssVar, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { palette, rgba } from './_kit.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.textContent = `
      .ba-wrap { display: flex; flex-direction: column; gap: 16px; }
      .ba-screen { position: relative; width: 100%; height: 440px; background: #070506; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; }
      .ba-screen canvas { width: 100%; height: 100%; display: block; }
      .ba-scanlines::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 2px); }
      .ba-overlay-tape { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const state = {
      sourceType: 'demo', // 'demo' | 'webcam' | 'file'
      webcamStream: null,
      videoElement: null,
      cols: 80,
      charSet: 'fivesaw', // 'fivesaw' | 'badapple' | 'blocks' | 'binary'
      colorMode: 'green', // 'green' | 'accent' | 'mono' | 'color'
      contrast: 1.2,
      invert: false,
      scanlines: true,
      phase: 0,
      animId: null
    };

    const RAMPS = {
      fivesaw: [' ', '.', ':', '-', '=', '+', '*', 'S', 'A', 'W', 'V', 'I', '5', '@', '#'],
      badapple: [' ', '░', '▒', '▓', '█'],
      blocks: [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'],
      binary: [' ', '0', '1']
    };

    root.innerHTML = `
      <div class="tl ba-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#EF4444;">a-apple-that-is-bad</span>
              <span class="eyebrow">CURSED TEXT RENDERER</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Cursed 5ivesaw ASCII Engine</h2>
            <p class="faint sm mono">Downsamples video feeds into real-time glyph matrices and retro CRT frames.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw/a-apple-that-is-bad" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} a-apple-that-is-bad Repo ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="baScreenBox" class="ba-screen ba-scanlines">
              <div class="ba-overlay-tape">
                <span class="badge" style="background:rgba(0,0,0,0.8);color:#22C55E;border:1px solid rgba(34,197,94,0.3);">
                  LIVE GLYPH MATRIX
                </span>
              </div>
              <canvas id="baCanvas"></canvas>
            </div>

            <!-- Source & Snapshot Actions -->
            <div class="row between wrap" style="padding:6px 0;">
              <div class="row wrap">
                <div class="seg" id="baSourceSeg">
                  <button type="button" data-src="demo" class="on">Procedural Demo</button>
                  <button type="button" data-src="webcam">Webcam</button>
                </div>
                <label class="btn sm">
                  ${icon('upload')} Video / Image
                  <input type="file" id="baFileInput" accept="video/*,image/*" hidden />
                </label>
              </div>

              <div class="row wrap">
                <button type="button" id="baCopyTextBtn" class="btn sm">
                  ${icon('copy')} Copy Text Frame
                </button>
                <button type="button" id="baSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">MATRIX CONFIGURATION</h3>

            <label class="field">
              <span>GLYPH SET</span>
              <select id="baCharSelect" class="select sq">
                <option value="fivesaw" selected>5IVESAW Cursed Glyphs (.:-=+*SAWVI5@#)</option>
                <option value="badapple">Bad Apple Halftone ( ░▒▓█)</option>
                <option value="blocks">Vertical Blocks ( ▂▃▄▅▆▇█)</option>
                <option value="binary">Cyber Binary (0 &amp; 1)</option>
              </select>
            </label>

            <label class="field">
              <span>COLOR DISPLAY</span>
              <div class="seg full" id="baColorSeg">
                <button type="button" data-col="green" class="on">Phosphor</button>
                <button type="button" data-col="accent">Crimson</button>
                <button type="button" data-col="mono">Monochrome</button>
                <button type="button" data-col="color">RGB Color</button>
              </div>
            </label>

            <div class="tl-range" style="margin-top:4px;">
              <div class="field-row">
                <span class="lbl">Columns (Resolution):</span>
                <span id="baColsVal" class="val">80</span>
              </div>
              <input type="range" id="baColsSlider" min="40" max="130" value="80" />
            </div>

            <div class="tl-range">
              <div class="field-row">
                <span class="lbl">Contrast / Gain:</span>
                <span id="baContrastVal" class="val">1.2x</span>
              </div>
              <input type="range" id="baContrastSlider" min="0.5" max="2.5" step="0.1" value="1.2" />
            </div>

            <div class="stack" style="gap:8px;margin-top:4px;">
              <label class="switch-row">
                <input type="checkbox" id="baInvertCheck" />
                <span>Invert Luminance</span>
              </label>
              <label class="switch-row">
                <input type="checkbox" id="baScanlinesCheck" checked />
                <span>CRT Scanlines Effect</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#baCanvas', root);
    const ctx = canvas.getContext('2d');
    const screenBox = $('#baScreenBox', root);

    // Offscreen capture canvas
    const sampleCanvas = document.createElement('canvas');
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    let latestAsciiFrame = '';

    function stopWebcam() {
      if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(t => t.stop());
        state.webcamStream = null;
      }
    }

    async function setSource(src) {
      state.sourceType = src;
      stopWebcam();

      if (state.videoElement) {
        state.videoElement.pause();
        state.videoElement.remove();
        state.videoElement = null;
      }

      if (src === 'webcam') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
          state.webcamStream = stream;
          const vid = document.createElement('video');
          vid.srcObject = stream;
          vid.playsInline = true;
          vid.play();
          state.videoElement = vid;
          toast('Webcam active', 'ok');
          sfx('success');
        } catch (err) {
          toast('Could not access webcam', 'err');
          setSource('demo');
          $('#baSourceSeg', root).querySelectorAll('button').forEach(b => {
            b.classList.toggle('on', b.dataset.src === 'demo');
          });
        }
      } else {
        sfx('click');
      }
    }

    // Procedural animation drawer (Silhouette Bad Apple / Chainsaw head bouncing with radio tempo)
    function drawProceduralFrame(t) {
      const sw = sampleCanvas.width;
      const sh = sampleCanvas.height;
      sampleCtx.fillStyle = '#000';
      sampleCtx.fillRect(0, 0, sw, sh);

      const pulse = (music.pulse && music.pulse.isPlaying) ? music.pulse : null;
      const kick = pulse ? pulse.kick : 0;
      const bands = pulse ? pulse.bands : null;
      const scale = 1 + kick * 0.28;

      const cx = sw / 2 + Math.sin(t * 1.5) * (sw * 0.12);
      const cy = sh / 2 + Math.cos(t * 2) * (sh * 0.08);

      // Audio spectrum soundwaves in background
      if (bands && bands.length) {
        sampleCtx.strokeStyle = 'rgba(255,255,255,0.2)';
        sampleCtx.lineWidth = 1;
        sampleCtx.beginPath();
        for (let b = 0; b < 16; b++) {
          const r = 35 + (bands[b] || 0) * 25 * scale;
          const a = (b / 16) * Math.PI * 2;
          sampleCtx.moveTo(cx, cy);
          sampleCtx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        sampleCtx.stroke();
      }

      // White apple shape
      sampleCtx.fillStyle = '#fff';
      sampleCtx.beginPath();
      sampleCtx.arc(cx - 15 * scale, cy, 28 * scale, 0, Math.PI * 2);
      sampleCtx.arc(cx + 15 * scale, cy, 28 * scale, 0, Math.PI * 2);
      sampleCtx.arc(cx, cy + 12 * scale, 30 * scale, 0, Math.PI * 2);
      sampleCtx.fill();

      // Stem & Leaf
      sampleCtx.fillStyle = '#fff';
      sampleCtx.fillRect(cx - 3 * scale, cy - 38 * scale, 6 * scale, 16 * scale);
      sampleCtx.beginPath();
      sampleCtx.ellipse(cx + 12 * scale, cy - 35 * scale, 12 * scale, 6 * scale, Math.PI / 4, 0, Math.PI * 2);
      sampleCtx.fill();

      // Inverted '5' cut in center
      sampleCtx.fillStyle = '#000';
      sampleCtx.font = `bold ${Math.floor(36 * scale)}px sans-serif`;
      sampleCtx.textAlign = 'center';
      sampleCtx.textBaseline = 'middle';
      sampleCtx.fillText('5', cx, cy + 5 * scale);
    }

    let canvasW = 0, canvasH = 0;
    function handleResize() {
      const { w, h } = fitCanvas(canvas);
      canvasW = w;
      canvasH = h;
    }
    window.addEventListener('resize', handleResize, { passive: true });
    handleResize();

    let cachedAccentCol = cssVar('--accent') || '#942929';
    onThemeChange(() => { cachedAccentCol = cssVar('--accent') || '#942929'; });

    function renderLoop() {
      const w = canvasW || 600;
      const h = canvasH || 400;
      ctx.fillStyle = '#070506';
      ctx.fillRect(0, 0, w, h);

      state.phase += 0.03;
      const numCols = state.cols;
      const aspect = h / w;
      const numRows = Math.max(1, Math.floor(numCols * aspect * 0.55));

      if (sampleCanvas.width !== numCols || sampleCanvas.height !== numRows) {
        sampleCanvas.width = numCols;
        sampleCanvas.height = numRows;
      }

      if (state.sourceType === 'demo') {
        drawProceduralFrame(state.phase);
      } else if (state.videoElement && state.videoElement.readyState >= 2) {
        sampleCtx.drawImage(state.videoElement, 0, 0, numCols, numRows);
      }

      const imgData = sampleCtx.getImageData(0, 0, numCols, numRows);
      const data = imgData.data;

      const ramp = RAMPS[state.charSet] || RAMPS.fivesaw;
      const cellW = w / numCols;
      const cellH = h / numRows;

      ctx.font = `${Math.max(8, Math.floor(cellH * 1.1))}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let defaultCol = '#22C55E';
      if (state.colorMode === 'accent') defaultCol = cachedAccentCol;
      if (state.colorMode === 'mono') defaultCol = '#E5E7EB';

      const rampLenMinus1 = ramp.length - 1;
      const invContrast = 1 / state.contrast;
      const isColor = state.colorMode === 'color';

      for (let r = 0; r < numRows; r++) {
        const rowOffset = r * numCols;
        const cy = (r + 0.5) * cellH;
        for (let c = 0; c < numCols; c++) {
          const idx = (rowOffset + c) * 4;
          const red = data[idx];
          const green = data[idx + 1];
          const blue = data[idx + 2];

          let lum = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
          if (invContrast !== 1) lum = Math.pow(lum, invContrast);
          if (state.invert) lum = 1 - lum;
          if (lum < 0) lum = 0; else if (lum > 1) lum = 1;

          const charIdx = Math.floor(lum * rampLenMinus1);
          const char = ramp[charIdx] || ' ';

          if (char !== ' ') {
            ctx.fillStyle = isColor ? `rgb(${red},${green},${blue})` : defaultCol;
            ctx.fillText(char, (c + 0.5) * cellW, cy);
          }
        }
      }

      state.animId = requestAnimationFrame(renderLoop);
    }

    // Events
    $('#baSourceSeg', root).addEventListener('click', e => {
      const b = e.target.closest('[data-src]');
      if (!b) return;
      $('#baSourceSeg', root).querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      setSource(b.dataset.src);
    });

    $('#baFileInput', root).addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      stopWebcam();

      if (file.type.startsWith('video/')) {
        const vid = document.createElement('video');
        vid.src = URL.createObjectURL(file);
        vid.playsInline = true;
        vid.loop = true;
        vid.play();
        state.videoElement = vid;
        state.sourceType = 'file';
        toast('Custom video playing', 'ok');
      } else if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          sampleCanvas.width = state.cols;
          sampleCanvas.height = Math.floor(state.cols * 0.55);
          sampleCtx.drawImage(img, 0, 0, sampleCanvas.width, sampleCanvas.height);
          state.sourceType = 'image';
          state.videoElement = null;
          toast('Image loaded into text grid', 'ok');
        };
        img.src = URL.createObjectURL(file);
      }
      sfx('whoosh');
    });

    $('#baCharSelect', root).addEventListener('change', e => {
      state.charSet = e.target.value;
      sfx('tick');
    });

    $('#baColorSeg', root).addEventListener('click', e => {
      const b = e.target.closest('[data-col]');
      if (!b) return;
      $('#baColorSeg', root).querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      state.colorMode = b.dataset.col;
      sfx('click');
    });

    $('#baColsSlider', root).addEventListener('input', e => {
      state.cols = Number(e.target.value);
      $('#baColsVal', root).textContent = state.cols;
    });

    $('#baContrastSlider', root).addEventListener('input', e => {
      state.contrast = Number(e.target.value);
      $('#baContrastVal', root).textContent = `${state.contrast.toFixed(1)}x`;
    });

    $('#baInvertCheck', root).addEventListener('change', e => {
      state.invert = e.target.checked;
      sfx('toggleOn');
    });

    $('#baScanlinesCheck', root).addEventListener('change', e => {
      state.scanlines = e.target.checked;
      screenBox.classList.toggle('ba-scanlines', state.scanlines);
      sfx('toggleOn');
    });

    $('#baCopyTextBtn', root).addEventListener('click', async () => {
      // Generate text frame on-demand
      const numCols = state.cols;
      const numRows = sampleCanvas.height;
      const imgData = sampleCtx.getImageData(0, 0, numCols, numRows);
      const data = imgData.data;
      const ramp = RAMPS[state.charSet] || RAMPS.fivesaw;
      const rampLenMinus1 = ramp.length - 1;
      const invContrast = 1 / state.contrast;
      let text = '';

      for (let r = 0; r < numRows; r++) {
        let line = '';
        const rowOffset = r * numCols;
        for (let c = 0; c < numCols; c++) {
          const idx = (rowOffset + c) * 4;
          let lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
          if (invContrast !== 1) lum = Math.pow(lum, invContrast);
          if (state.invert) lum = 1 - lum;
          if (lum < 0) lum = 0; else if (lum > 1) lum = 1;
          line += ramp[Math.floor(lum * rampLenMinus1)] || ' ';
        }
        text += line + '\n';
      }

      await copyText(text);
      toast('Copied ASCII frame to clipboard!', 'ok');
      sfx('copy');
    });

    $('#baSnapshotBtn', root).addEventListener('click', () => {
      canvas.toBlob(blob => {
        if (!blob) return;
        download(blob, `5ivesaw-cursed-apple-${Date.now()}.png`);
        toast('Downloaded text art frame PNG', 'ok');
        sfx('success');
      });
    });

    renderLoop();

    return () => {
      style.remove();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(state.animId);
      stopWebcam();
      if (state.videoElement) {
        state.videoElement.pause();
        state.videoElement.remove();
      }
    };
  }
};

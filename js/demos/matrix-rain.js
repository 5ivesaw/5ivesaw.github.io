// Matrix Digital Rain & Motion Mirror Demo — by 5IVESAW
// Real-time falling Japanese Katakana & Latin glyph matrix with interactive webcam silhouette tracking.
import {
  $, $$, icon, download, copyText, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { palette, rgba } from './_kit.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-matrix-style';
    style.textContent = `
      .mx-wrap { display: flex; flex-direction: column; gap: 16px; }
      .mx-screen { position: relative; width: 100%; height: 440px; background: #050505; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; }
      .mx-screen canvas { width: 100%; height: 100%; display: block; }
      .mx-scanlines::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 2px); }
      .mx-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const state = {
      sourceType: 'procedural', // 'procedural' | 'webcam'
      webcamStream: null,
      videoElement: null,
      colorMode: 'green', // 'green' | 'amber' | 'cyan' | 'crimson' | 'white'
      fontSize: 14,
      speed: 1.0,
      bloom: true,
      scanlines: true,
      invert: false,
      mousePos: { x: -100, y: -100 },
      mouseActive: false,
      animId: null
    };

    const COLORS = {
      green: { head: '#FFFFFF', lead: '#A3FFA8', body: '#00FF66', tail: '#003B14', glow: 'rgba(0, 255, 102, 0.4)' },
      amber: { head: '#FFF8E1', lead: '#FFE082', body: '#FFB300', tail: '#4E2C00', glow: 'rgba(255, 179, 0, 0.4)' },
      cyan: { head: '#E0F7FA', lead: '#80DEEA', body: '#00E5FF', tail: '#00363A', glow: 'rgba(0, 229, 255, 0.4)' },
      crimson: { head: '#FFEAEA', lead: '#FF8A80', body: '#FF3B14', tail: '#4A0800', glow: 'rgba(255, 59, 20, 0.4)' },
      white: { head: '#FFFFFF', lead: '#E0E0E0', body: '#9E9E9E', tail: '#212121', glow: 'rgba(255, 255, 255, 0.3)' }
    };

    const KATAKANA = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ01234567895IVESAW<>+-*=%$#';

    root.innerHTML = `
      <div class="tl mx-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#00FF66;color:#000;font-weight:700;">NEURAL MIRROR</span>
              <span class="eyebrow">MATRIX DIGITAL RAIN // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Matrix Neural Camera &amp; Rain Stream</h2>
            <p class="faint sm mono">Downsamples video or procedural depth buffers into dripping cyberpunk matrix code.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="mxScreenBox" class="mx-screen mx-scanlines">
              <div class="mx-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid rgba(255,255,255,0.15);">
                  FEED: <strong id="mxFeedModeText">PROCEDURAL FIELD</strong>
                </span>
              </div>
              <canvas id="mxCanvas"></canvas>
            </div>

            <!-- Feed Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <div class="seg" id="mxSourceSeg">
                  <button type="button" data-src="procedural" class="bg-paper-elevated font-semibold">Procedural Pulse</button>
                  <button type="button" data-src="webcam">Webcam Stream</button>
                </div>
                <button type="button" id="mxClearRipplesBtn" class="btn sm ghost">Clear Ripples</button>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="mxCopyTextBtn" class="btn sm">
                  ${icon('copy')} Copy Text Frame
                </button>
                <button type="button" id="mxSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Matrix PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">RAIN MATRIX CONFIG</h3>

            <label class="field">
              <span>COLOR STREAM</span>
              <div class="seg" id="mxColorSeg">
                <button type="button" data-col="green" class="bg-paper-elevated font-semibold" style="color:#00FF66;">Green</button>
                <button type="button" data-col="amber" style="color:#FFB300;">Amber</button>
                <button type="button" data-col="cyan" style="color:#00E5FF;">Cyan</button>
                <button type="button" data-col="crimson" style="color:#FF3B14;">Crimson</button>
              </div>
            </label>

            <div class="grid grid-2" style="gap:10px;">
              <label class="field">
                <span>RAIN SPEED</span>
                <input type="range" id="mxSpeedSlider" min="0.3" max="2.5" step="0.1" value="1.0" />
              </label>

              <label class="field">
                <span>GLYPH DENSITY</span>
                <input type="range" id="mxFontSlider" min="10" max="22" step="2" value="14" />
              </label>
            </div>

            <div class="divider"></div>

            <div class="stack" style="gap:8px;">
              <label class="row between xs mono cursor-pointer">
                <span>CRT Scanlines</span>
                <input type="checkbox" id="mxScanlinesCheck" checked />
              </label>
              <label class="row between xs mono cursor-pointer">
                <span>Glow Bloom Effect</span>
                <input type="checkbox" id="mxBloomCheck" checked />
              </label>
              <label class="row between xs mono cursor-pointer">
                <span>Invert Luminescence</span>
                <input type="checkbox" id="mxInvertCheck" />
              </label>
            </div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Hover or move your cursor over the screen to disrupt the digital stream and cast electromagnetic ripples through the code rain.
            </div>
          </div>
        </div>
      </div>
    `;

    // Elements & Canvas Init
    const canvas = $('#mxCanvas', root);
    const ctx = canvas.getContext('2d');
    const screenBox = $('#mxScreenBox', root);
    const feedText = $('#mxFeedModeText', root);

    let columns = [];
    let colsCount = 0;
    let rowsCount = 0;
    let procTime = 0;

    // Offscreen sampling canvas for webcam
    const sampleCanvas = document.createElement('canvas');
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    function initColumns() {
      const { w, h } = fitCanvas(canvas);
      colsCount = Math.floor(w / state.fontSize);
      rowsCount = Math.floor(h / state.fontSize);
      sampleCanvas.width = colsCount;
      sampleCanvas.height = rowsCount;

      columns = [];
      for (let i = 0; i < colsCount; i++) {
        columns.push({
          y: Math.random() * -rowsCount,
          speed: (0.7 + Math.random() * 0.8) * state.speed,
          chars: Array.from({ length: rowsCount }, () => KATAKANA[Math.floor(Math.random() * KATAKANA.length)]),
          mutationRate: 0.03 + Math.random() * 0.05
        });
      }
    }

    window.addEventListener('resize', initColumns);
    initColumns();

    // Mouse disruption
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      state.mousePos.x = e.clientX - rect.left;
      state.mousePos.y = e.clientY - rect.top;
      state.mouseActive = true;
    });

    canvas.addEventListener('mouseleave', () => {
      state.mouseActive = false;
    });

    // Webcam setup
    async function startWebcam() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast('Webcam not supported on this browser', 'err');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });
        state.webcamStream = stream;
        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        await video.play();
        state.videoElement = video;
        state.sourceType = 'webcam';
        feedText.textContent = 'WEBCAM SILHOUETTE';
        toast('Webcam feed online!', 'ok');
        sfx('toggleOn');
      } catch (err) {
        console.error(err);
        toast('Webcam permission denied or unavailable', 'err');
        state.sourceType = 'procedural';
        $$('#mxSourceSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b.dataset.src === 'procedural'));
      }
    }

    function stopWebcam() {
      if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(t => t.stop());
        state.webcamStream = null;
      }
      if (state.videoElement) {
        state.videoElement.pause();
        state.videoElement = null;
      }
      state.sourceType = 'procedural';
      feedText.textContent = 'PROCEDURAL FIELD';
    }

    // Source switcher
    $$('#mxSourceSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#mxSourceSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        const src = btn.dataset.src;
        if (src === 'webcam') {
          startWebcam();
        } else {
          stopWebcam();
        }
        sfx('tick');
      });
    });

    // Color switcher
    $$('#mxColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#mxColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.colorMode = btn.dataset.col;
        sfx('tick');
      });
    });

    // Sliders
    $('#mxSpeedSlider', root).addEventListener('input', e => {
      state.speed = parseFloat(e.target.value);
      columns.forEach(c => c.speed = (0.7 + Math.random() * 0.8) * state.speed);
    });

    $('#mxFontSlider', root).addEventListener('input', e => {
      state.fontSize = parseInt(e.target.value, 10);
      initColumns();
    });

    $('#mxScanlinesCheck', root).addEventListener('change', e => {
      screenBox.classList.toggle('mx-scanlines', e.target.checked);
    });

    $('#mxBloomCheck', root).addEventListener('change', e => {
      state.bloom = e.target.checked;
    });

    $('#mxInvertCheck', root).addEventListener('change', e => {
      state.invert = e.target.checked;
    });

    $('#mxClearRipplesBtn', root).addEventListener('click', () => {
      initColumns();
      toast('Rain field cleared', 'ok');
      sfx('trash');
    });

    // Copy text snapshot
    $('#mxCopyTextBtn', root).addEventListener('click', () => {
      let frame = '';
      for (let r = 0; r < Math.min(rowsCount, 40); r++) {
        let rowStr = '';
        for (let c = 0; c < Math.min(colsCount, 80); c++) {
          rowStr += columns[c] ? columns[c].chars[r] || ' ' : ' ';
        }
        frame += rowStr + '\n';
      }
      copyText(frame);
      toast('Copied ASCII frame to clipboard!', 'ok');
      sfx('copy');
    });

    // Save PNG snapshot
    $('#mxSnapshotBtn', root).addEventListener('click', () => {
      const dataUrl = canvas.toDataURL('image/png');
      download(dataUrl, `5ivesaw-matrix-${Date.now()}.png`);
      toast('Snapshot saved to PNG!', 'ok');
      sfx('download');
    });

    // Render loop
    function render() {
      procTime += 0.03;
      const theme = COLORS[state.colorMode] || COLORS.green;
      const w = canvas.width;
      const h = canvas.height;

      // Dark fade trail
      ctx.fillStyle = 'rgba(5, 5, 5, 0.28)';
      ctx.fillRect(0, 0, w, h);

      ctx.font = `bold ${state.fontSize}px monospace`;
      ctx.textBaseline = 'top';

      let sampleData = null;
      if (state.sourceType === 'webcam' && state.videoElement && state.videoElement.readyState >= 2) {
        sampleCtx.save();
        sampleCtx.translate(colsCount, 0);
        sampleCtx.scale(-1, 1); // Mirror
        sampleCtx.drawImage(state.videoElement, 0, 0, colsCount, rowsCount);
        sampleCtx.restore();
        sampleData = sampleCtx.getImageData(0, 0, colsCount, rowsCount).data;
      }

      for (let c = 0; c < colsCount; c++) {
        const col = columns[c];
        if (!col) continue;

        col.y += col.speed;
        if (col.y > rowsCount + 10) {
          col.y = -Math.random() * 15;
          col.speed = (0.7 + Math.random() * 0.8) * state.speed;
        }

        const headRow = Math.floor(col.y);

        for (let r = 0; r < rowsCount; r++) {
          // Glyph mutation
          if (Math.random() < col.mutationRate) {
            col.chars[r] = KATAKANA[Math.floor(Math.random() * KATAKANA.length)];
          }

          const char = col.chars[r] || ' ';
          const x = c * state.fontSize;
          const y = r * state.fontSize;

          // Luminance modifier from source
          let lum = 0;
          if (sampleData) {
            const idx = (r * colsCount + c) * 4;
            const rVal = sampleData[idx];
            const gVal = sampleData[idx + 1];
            const bVal = sampleData[idx + 2];
            lum = (0.299 * rVal + 0.587 * gVal + 0.114 * bVal) / 255;
            if (state.invert) lum = 1 - lum;
          } else {
            // Procedural pulsing wave & 5IVESAW cyber torus
            const cx = colsCount / 2;
            const cy = rowsCount / 2;
            const dx = c - cx;
            const dy = r - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const wave = Math.sin(dist * 0.2 - procTime * 2);
            const angle = Math.atan2(dy, dx);
            const petal = Math.cos(angle * 5 + procTime);
            lum = Math.max(0, (wave + petal * 0.5) * 0.7);
          }

          // Mouse disruption radius
          if (state.mouseActive) {
            const mdx = x - state.mousePos.x;
            const mdy = y - state.mousePos.y;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mdist < 100) {
              lum = Math.min(1, lum + (1 - mdist / 100));
            }
          }

          const distFromHead = headRow - r;

          if (distFromHead === 0) {
            // Lead glyph (Glowing white)
            ctx.fillStyle = theme.head;
            if (state.bloom) {
              ctx.shadowColor = theme.glow;
              ctx.shadowBlur = 10;
            }
            ctx.fillText(char, x, y);
            ctx.shadowBlur = 0;
          } else if (distFromHead > 0 && distFromHead < 4) {
            ctx.fillStyle = theme.lead;
            ctx.fillText(char, x, y);
          } else if (lum > 0.28) {
            // Silhouette lit glyph
            const brightness = Math.min(1, lum * 1.4);
            ctx.fillStyle = brightness > 0.8 ? theme.head : (brightness > 0.5 ? theme.body : theme.tail);
            if (state.bloom && brightness > 0.7) {
              ctx.shadowColor = theme.glow;
              ctx.shadowBlur = 6;
            }
            ctx.fillText(char, x, y);
            ctx.shadowBlur = 0;
          } else if (distFromHead > 0 && distFromHead < 18) {
            // Natural matrix falling tail
            const fade = 1 - distFromHead / 18;
            ctx.fillStyle = fade > 0.5 ? theme.body : theme.tail;
            ctx.fillText(char, x, y);
          }
        }
      }

      state.animId = requestAnimationFrame(render);
    }

    state.animId = requestAnimationFrame(render);

    // Unmount cleanup
    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      stopWebcam();
      window.removeEventListener('resize', initColumns);
      const s = document.getElementById('demo-matrix-style');
      if (s) s.remove();
    };
  }
};

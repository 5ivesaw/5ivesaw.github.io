// Image Studio — Local browser image converter, cropper, resizer & filter workshop.
// 100% client-side: files never leave your device. EXIF metadata is stripped during re-encoding.
import {
  $, $$, icon, formatBytes, download, toast, cssVar, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { useStyles, useKeys, scribble, doneMark, reduceMotion } from './_kit.js';

export default {
  mount(root, api) {
    const unCss = useStyles(`
      .im-wrap { display: flex; flex-direction: column; gap: 16px; }
      .im-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 16px; align-items: start; }
      @media (max-width: 900px) { .im-workspace { grid-template-columns: 1fr; } }
      .im-canvas-box { position: relative; min-height: 420px; max-height: 72vh; display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--surface); border-radius: var(--r); border: 1px solid var(--line); }
      .im-canvas-box canvas { max-width: 100%; max-height: 70vh; object-fit: contain; box-shadow: 0 8px 30px rgba(0,0,0,0.25); }
      .im-queue { display: flex; gap: 8px; overflow-x: auto; padding: 6px 2px 10px; scrollbar-width: thin; }
      .im-thumb { position: relative; width: 64px; height: 64px; border-radius: 8px; overflow: hidden; border: 2px solid var(--line); cursor: pointer; flex-shrink: 0; background: var(--bg); transition: transform .2s ease, border-color .2s; }
      .im-thumb.active { border-color: var(--accent); transform: scale(1.06); }
      .im-thumb img { width: 100%; height: 100%; object-fit: cover; }
      .im-thumb-del { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.65); color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .2s; }
      .im-thumb:hover .im-thumb-del { opacity: 1; }
      .im-crop-layer { position: absolute; inset: 0; pointer-events: none; }
      .im-crop-rect { position: absolute; border: 2px dashed var(--accent); box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); pointer-events: auto; cursor: move; }
      .im-crop-handle { position: absolute; width: 12px; height: 12px; background: var(--accent); border: 2px solid #fff; border-radius: 2px; }
      .im-crop-tl { top: -6px; left: -6px; cursor: nwse-resize; }
      .im-crop-tr { top: -6px; right: -6px; cursor: nesw-resize; }
      .im-crop-bl { bottom: -6px; left: -6px; cursor: nesw-resize; }
      .im-crop-br { bottom: -6px; right: -6px; cursor: nwse-resize; }
      .im-badge-tape { position: absolute; top: 12px; left: 12px; z-index: 5; pointer-events: none; }
    `, 'image-studio');

    // State
    const state = {
      queue: [],
      activeIdx: 0,
      format: 'image/webp',
      quality: 0.85,
      scalePct: 100,
      targetW: 0,
      targetH: 0,
      lockAspect: true,
      rotate: 0, // 0, 90, 180, 270
      flipH: false,
      flipV: false,
      cropEnabled: false,
      cropAspect: 'free', // 'free', '1:1', '16:9', '4:3', '9:16'
      cropRect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }, // normalised 0..1
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        invert: 0
      },
      comparing: false,
      history: [],
      estimatedSize: null,
      avifSupported: false
    };

    // Test AVIF encoding support
    try {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = testCanvas.height = 1;
      testCanvas.toBlob((b) => {
        if (b && b.type === 'image/avif') {
          state.avifSupported = true;
          const avifOpt = root.querySelector('[data-fmt="image/avif"]');
          if (avifOpt) avifOpt.classList.remove('hidden');
        }
      }, 'image/avif');
    } catch (e) {}

    // Scaffold HTML
    root.innerHTML = `
      <div class="tl im-wrap">
        <div class="tl-intro">
          <div>
            <span class="tl-sticker">${icon('image')} IMAGE STUDIO</span>
            <div class="lede" style="margin-top:6px">
              ${scribble('Convert')}, resize, crop & enhance images locally.
            </div>
          </div>
          <div class="tl-keys">
            <span><kbd>Space</kbd> compare original</span>
            <span><kbd>Ctrl+Z</kbd> undo</span>
            <span><kbd>D</kbd> download</span>
          </div>
        </div>

        <div class="im-queue-card card pad" style="padding:12px 16px;">
          <div class="row between wrap">
            <div class="row">
              <span class="eyebrow">Queue</span>
              <span id="imQueueCount" class="badge">0</span>
            </div>
            <div class="row">
              <label class="btn sm primary">
                ${icon('upload')} Add Images
                <input type="file" id="imFileInput" multiple accept="image/*" hidden />
              </label>
              <button type="button" id="imClearQueue" class="btn sm ghost" title="Clear all">${icon('trash')} Clear</button>
            </div>
          </div>
          <div id="imQueueList" class="im-queue" style="margin-top:8px;"></div>
        </div>

        <div id="imDropEmpty" class="dropzone" style="min-height:300px;">
          <div class="big">${icon('image')}</div>
          <p style="font-size:15px;font-weight:600;color:var(--ink);">Drop images here, or paste from clipboard</p>
          <p class="faint xs">PNG, JPEG, WebP, GIF, SVG, AVIF, BMP, TIFF — processed 100% in your browser</p>
          <label class="btn primary" style="margin-top:10px;">
            ${icon('upload')} Browse Files
            <input type="file" id="imFileInputEmpty" multiple accept="image/*" hidden />
          </label>
        </div>

        <div id="imWorkspace" class="im-workspace hidden">
          <!-- Left: Canvas preview & crop overlay -->
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div class="row between wrap">
              <div class="row">
                <span id="imActiveName" class="mono xs truncate" style="max-width:200px;font-weight:600;">image.png</span>
                <span id="imOrigDim" class="chip xs">0×0</span>
                <span id="imOrigSize" class="chip xs">0 KB</span>
              </div>
              <div class="row">
                <button type="button" id="imCompareBtn" class="btn sm" title="Hold Space to compare original">Hold to Compare</button>
                <button type="button" id="imUndoBtn" class="btn sm ghost" title="Undo change" disabled>${icon('undo')}</button>
              </div>
            </div>

            <div id="imCanvasContainer" class="im-canvas-box">
              <div class="im-badge-tape">
                <span id="imMetaStripNotice" class="badge" style="background:var(--elevated);color:var(--muted);border:1px solid var(--line);">EXIF STRIPPED</span>
              </div>
              <canvas id="imCanvas"></canvas>
              <div id="imCropLayer" class="im-crop-layer hidden">
                <div id="imCropRect" class="im-crop-rect">
                  <div class="im-crop-handle im-crop-tl" data-dir="tl"></div>
                  <div class="im-crop-handle im-crop-tr" data-dir="tr"></div>
                  <div class="im-crop-handle im-crop-bl" data-dir="bl"></div>
                  <div class="im-crop-handle im-crop-br" data-dir="br"></div>
                </div>
              </div>
            </div>

            <!-- Transforms Bar -->
            <div class="row between wrap" style="padding:4px 0;">
              <div class="row wrap">
                <span class="lbl">Rotate:</span>
                <button type="button" id="imRotateCCW" class="btn sm icon" title="Rotate 90° CCW">${icon('rotate')}</button>
                <button type="button" id="imRotateCW" class="btn sm icon" title="Rotate 90° CW" style="transform:scaleX(-1);">${icon('rotate')}</button>
                <button type="button" id="imFlipH" class="btn sm icon" title="Flip Horizontal">${icon('flipH')}</button>
                <button type="button" id="imFlipV" class="btn sm icon" title="Flip Vertical">${icon('flipV')}</button>
              </div>

              <div class="row wrap">
                <span class="lbl">Crop:</span>
                <button type="button" id="imToggleCrop" class="btn sm" data-active="false">${icon('crop')} Crop</button>
                <div id="imCropAspectSeg" class="seg hidden">
                  <button type="button" data-aspect="free" class="on">Free</button>
                  <button type="button" data-aspect="1:1">1:1</button>
                  <button type="button" data-aspect="16:9">16:9</button>
                  <button type="button" data-aspect="4:3">4:3</button>
                  <button type="button" data-aspect="9:16">9:16</button>
                </div>
                <button type="button" id="imApplyCrop" class="btn sm primary hidden">Apply</button>
              </div>
            </div>
          </div>

          <!-- Right: Control Panel (Export, Resize, Filters) -->
          <div class="card pad panel" style="gap:14px;">
            <div class="row between">
              <h3 class="tl-h">EXPORT FORMAT</h3>
              <span id="imEstimatedSize" class="mono xs accent font-semibold">...</span>
            </div>

            <div class="seg full" id="imFormatSeg">
              <button type="button" data-fmt="image/webp" class="on">WebP</button>
              <button type="button" data-fmt="image/jpeg">JPEG</button>
              <button type="button" data-fmt="image/png">PNG</button>
              <button type="button" data-fmt="image/avif" class="hidden">AVIF</button>
            </div>

            <div id="imQualityBox" class="tl-range">
              <div class="field-row">
                <span class="lbl">Quality:</span>
                <span id="imQualityVal" class="val">85%</span>
              </div>
              <input type="range" id="imQualitySlider" min="10" max="100" value="85" />
            </div>

            <h3 class="tl-h" style="margin-top:6px;">RESIZE &amp; SCALE</h3>
            <div class="tl-grid2">
              <label class="field">
                <span>WIDTH (PX)</span>
                <input type="number" id="imWidthInput" class="input sq num" />
              </label>
              <label class="field">
                <span>HEIGHT (PX)</span>
                <input type="number" id="imHeightInput" class="input sq num" />
              </label>
            </div>
            <div class="row between">
              <label class="switch-row">
                <input type="checkbox" id="imLockAspect" checked />
                <span>Maintain Aspect Ratio</span>
              </label>
              <button type="button" id="imResetDim" class="btn sm ghost">Reset</button>
            </div>

            <h3 class="tl-h" style="margin-top:6px;">FILTERS &amp; ADJUSTMENTS</h3>
            <div class="stack" style="gap:10px;">
              <div class="tl-range">
                <div class="field-row"><span class="lbl">Brightness:</span><span id="imBrVal" class="val">100%</span></div>
                <input type="range" id="imBrSlider" min="0" max="200" value="100" />
              </div>
              <div class="tl-range">
                <div class="field-row"><span class="lbl">Contrast:</span><span id="imCtVal" class="val">100%</span></div>
                <input type="range" id="imCtSlider" min="0" max="200" value="100" />
              </div>
              <div class="tl-range">
                <div class="field-row"><span class="lbl">Saturation:</span><span id="imStVal" class="val">100%</span></div>
                <input type="range" id="imStSlider" min="0" max="200" value="100" />
              </div>
              <div class="tl-range">
                <div class="field-row"><span class="lbl">Hue Rotate:</span><span id="imHueVal" class="val">0°</span></div>
                <input type="range" id="imHueSlider" min="0" max="360" value="0" />
              </div>
              <div class="tl-range">
                <div class="field-row"><span class="lbl">Blur:</span><span id="imBlurVal" class="val">0px</span></div>
                <input type="range" id="imBlurSlider" min="0" max="20" value="0" step="0.5" />
              </div>
              <div class="row between">
                <label class="switch-row">
                  <input type="checkbox" id="imGrayscaleCheck" />
                  <span>Grayscale</span>
                </label>
                <label class="switch-row">
                  <input type="checkbox" id="imInvertCheck" />
                  <span>Invert</span>
                </label>
              </div>
              <button type="button" id="imResetFilters" class="btn sm ghost" style="align-self:flex-start;">Reset Filters</button>
            </div>

            <div class="divider" style="margin:4px 0;"></div>

            <!-- Export Actions -->
            <button type="button" id="imDownloadBtn" class="btn primary lg" style="width:100%;">
              ${icon('download')} Download Current Image
            </button>
            <button type="button" id="imDownloadAllBtn" class="btn lg" style="width:100%;">
              ${icon('download')} Export All in Queue (<span id="imQueueExportNum">0</span>)
            </button>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#imCanvas', root);
    const ctx = canvas.getContext('2d');
    let activeImg = null;

    // Helper: Push undo snapshot
    function pushHistory() {
      state.history.push({
        rotate: state.rotate,
        flipH: state.flipH,
        flipV: state.flipV,
        targetW: state.targetW,
        targetH: state.targetH,
        filters: { ...state.filters },
        cropRect: { ...state.cropRect }
      });
      if (state.history.length > 25) state.history.shift();
      $('#imUndoBtn', root).disabled = false;
    }

    function undo() {
      if (!state.history.length) return;
      const prev = state.history.pop();
      state.rotate = prev.rotate;
      state.flipH = prev.flipH;
      state.flipV = prev.flipV;
      state.targetW = prev.targetW;
      state.targetH = prev.targetH;
      state.filters = { ...prev.filters };
      state.cropRect = { ...prev.cropRect };
      syncControls();
      render();
      sfx('click');
      if (!state.history.length) $('#imUndoBtn', root).disabled = true;
    }

    function syncControls() {
      $('#imWidthInput', root).value = state.targetW;
      $('#imHeightInput', root).value = state.targetH;
      $('#imBrSlider', root).value = state.filters.brightness;
      $('#imBrVal', root).textContent = `${state.filters.brightness}%`;
      $('#imCtSlider', root).value = state.filters.contrast;
      $('#imCtVal', root).textContent = `${state.filters.contrast}%`;
      $('#imStSlider', root).value = state.filters.saturation;
      $('#imStVal', root).textContent = `${state.filters.saturation}%`;
      $('#imHueSlider', root).value = state.filters.hue;
      $('#imHueVal', root).textContent = `${state.filters.hue}°`;
      $('#imBlurSlider', root).value = state.filters.blur;
      $('#imBlurVal', root).textContent = `${state.filters.blur}px`;
      $('#imGrayscaleCheck', root).checked = state.filters.grayscale > 0;
      $('#imInvertCheck', root).checked = state.filters.invert > 0;
    }

    // Add files to queue
    function addFiles(files) {
      const list = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (!list.length) return;
      sfx('whoosh');

      list.forEach(file => {
        const item = {
          file,
          name: file.name,
          size: file.size,
          url: URL.createObjectURL(file),
          img: null,
          w: 0,
          h: 0
        };
        const img = new Image();
        img.onload = () => {
          item.img = img;
          item.w = img.naturalWidth;
          item.h = img.naturalHeight;
          if (state.queue[state.activeIdx] === item) {
            selectItem(state.activeIdx);
          }
          renderQueue();
        };
        img.src = item.url;
        state.queue.push(item);
      });

      renderQueue();
      if ($('#imWorkspace', root).classList.contains('hidden')) {
        selectItem(0);
      }
    }

    function renderQueue() {
      const qList = $('#imQueueList', root);
      const qCard = $('.im-queue-card', root);
      const qCount = $('#imQueueCount', root);
      const qExportNum = $('#imQueueExportNum', root);
      const emptyBox = $('#imDropEmpty', root);
      const ws = $('#imWorkspace', root);

      qCount.textContent = state.queue.length;
      qExportNum.textContent = state.queue.length;

      if (!state.queue.length) {
        qCard.classList.add('hidden');
        ws.classList.add('hidden');
        emptyBox.classList.remove('hidden');
        qList.innerHTML = '';
        return;
      }

      qCard.classList.remove('hidden');
      emptyBox.classList.add('hidden');
      ws.classList.remove('hidden');

      qList.innerHTML = state.queue.map((item, idx) => `
        <div class="im-thumb ${idx === state.activeIdx ? 'active' : ''}" data-q-idx="${idx}">
          <img src="${item.url}" alt="${item.name}" />
          <button type="button" class="im-thumb-del" data-del-idx="${idx}" title="Remove">✕</button>
        </div>
      `).join('');
    }

    function selectItem(idx) {
      if (!state.queue[idx]) return;
      state.activeIdx = idx;
      const cur = state.queue[idx];
      activeImg = cur.img;

      state.rotate = 0;
      state.flipH = false;
      state.flipV = false;
      state.cropEnabled = false;
      $('#imToggleCrop', root).dataset.active = 'false';
      $('#imCropAspectSeg', root).classList.add('hidden');
      $('#imApplyCrop', root).classList.add('hidden');
      $('#imCropLayer', root).classList.add('hidden');

      if (activeImg) {
        state.targetW = cur.w;
        state.targetH = cur.h;
        $('#imWidthInput', root).value = cur.w;
        $('#imHeightInput', root).value = cur.h;
        $('#imOrigDim', root).textContent = `${cur.w} × ${cur.h}`;
      }
      $('#imActiveName', root).textContent = cur.name;
      $('#imOrigSize', root).textContent = formatBytes(cur.size);

      renderQueue();
      render();
    }

    function render() {
      if (!activeImg) return;
      const cur = state.queue[state.activeIdx];
      if (!cur) return;

      const isRotated90 = state.rotate === 90 || state.rotate === 270;
      const tw = state.targetW || cur.w;
      const th = state.targetH || cur.h;
      const dw = isRotated90 ? th : tw;
      const dh = isRotated90 ? tw : th;

      canvas.width = dw;
      canvas.height = dh;

      ctx.save();
      ctx.clearRect(0, 0, dw, dh);

      if (!state.comparing) {
        // Apply CSS filters
        const f = state.filters;
        ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg) blur(${f.blur}px) grayscale(${f.grayscale}%) sepia(${f.sepia}%) invert(${f.invert}%)`;

        // Transforms
        ctx.translate(dw / 2, dh / 2);
        ctx.rotate((state.rotate * Math.PI) / 180);
        ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
        ctx.drawImage(activeImg, -tw / 2, -th / 2, tw, th);
      } else {
        // Original comparison mode
        ctx.filter = 'none';
        ctx.drawImage(activeImg, 0, 0, dw, dh);
      }
      ctx.restore();

      updateEstimatedSize();
      updateCropUI();
    }

    function updateEstimatedSize() {
      if (!canvas.width || !canvas.height) return;
      canvas.toBlob(blob => {
        if (!blob) return;
        $('#imEstimatedSize', root).textContent = `Est. ${formatBytes(blob.size)}`;
      }, state.format, state.quality);
    }

    function updateCropUI() {
      const layer = $('#imCropLayer', root);
      if (!state.cropEnabled) {
        layer.classList.add('hidden');
        return;
      }
      layer.classList.remove('hidden');
      const box = $('#imCropRect', root);
      const cRect = canvas.getBoundingClientRect();
      const parentRect = $('#imCanvasContainer', root).getBoundingClientRect();

      const offsetX = cRect.left - parentRect.left;
      const offsetY = cRect.top - parentRect.top;

      box.style.left = `${offsetX + state.cropRect.x * cRect.width}px`;
      box.style.top = `${offsetY + state.cropRect.y * cRect.height}px`;
      box.style.width = `${state.cropRect.w * cRect.width}px`;
      box.style.height = `${state.cropRect.h * cRect.height}px`;
    }

    // Crop dragging
    let dragInfo = null;
    const cropLayer = $('#imCropLayer', root);

    cropLayer.addEventListener('pointerdown', e => {
      const handle = e.target.closest('.im-crop-handle');
      const rect = $('#imCropRect', root);
      const isMove = e.target === rect;
      if (!handle && !isMove) return;

      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const initialCrop = { ...state.cropRect };
      const cRect = canvas.getBoundingClientRect();

      dragInfo = {
        type: handle ? handle.dataset.dir : 'move',
        startX,
        startY,
        initialCrop,
        cW: cRect.width,
        cH: cRect.height
      };
      cropLayer.setPointerCapture(e.pointerId);
    });

    cropLayer.addEventListener('pointermove', e => {
      if (!dragInfo) return;
      const dx = (e.clientX - dragInfo.startX) / dragInfo.cW;
      const dy = (e.clientY - dragInfo.startY) / dragInfo.cH;
      const c = { ...dragInfo.initialCrop };

      if (dragInfo.type === 'move') {
        c.x = Math.max(0, Math.min(1 - c.w, c.x + dx));
        c.y = Math.max(0, Math.min(1 - c.h, c.y + dy));
      } else {
        if (dragInfo.type.includes('r')) c.w = Math.max(0.05, Math.min(1 - c.x, c.w + dx));
        if (dragInfo.type.includes('l')) {
          const newW = Math.max(0.05, c.w - dx);
          c.x = Math.max(0, c.x + (c.w - newW));
          c.w = newW;
        }
        if (dragInfo.type.includes('b')) c.h = Math.max(0.05, Math.min(1 - c.y, c.h + dy));
        if (dragInfo.type.includes('t')) {
          const newH = Math.max(0.05, c.h - dy);
          c.y = Math.max(0, c.y + (c.h - newH));
          c.h = newH;
        }

        // Apply aspect ratio preset if locked
        if (state.cropAspect !== 'free') {
          const [aw, ah] = state.cropAspect.split(':').map(Number);
          const targetRatio = (aw / ah) * (dragInfo.cH / dragInfo.cW);
          c.h = Math.min(1 - c.y, c.w / targetRatio);
        }
      }

      state.cropRect = c;
      updateCropUI();
    });

    cropLayer.addEventListener('pointerup', e => {
      if (dragInfo) {
        cropLayer.releasePointerCapture(e.pointerId);
        dragInfo = null;
      }
    });

    // Wire listeners
    $('#imFileInput', root).addEventListener('change', e => addFiles(e.target.files));
    $('#imFileInputEmpty', root).addEventListener('change', e => addFiles(e.target.files));

    // Dropzone & paste
    const dropArea = $('#imDropEmpty', root);
    const prevent = e => e.preventDefault();
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => dropArea.addEventListener(ev, prevent));
    dropArea.addEventListener('drop', e => {
      if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
    });

    window.addEventListener('paste', e => {
      if (e.clipboardData?.files) addFiles(e.clipboardData.files);
    });

    // Queue selection & deletion
    $('#imQueueList', root).addEventListener('click', e => {
      const del = e.target.closest('[data-del-idx]');
      if (del) {
        const i = Number(del.dataset.delIdx);
        URL.revokeObjectURL(state.queue[i].url);
        state.queue.splice(i, 1);
        if (state.activeIdx >= state.queue.length) state.activeIdx = Math.max(0, state.queue.length - 1);
        renderQueue();
        if (state.queue.length) selectItem(state.activeIdx);
        sfx('tick');
        return;
      }
      const thumb = e.target.closest('[data-q-idx]');
      if (thumb) {
        selectItem(Number(thumb.dataset.qIdx));
        sfx('click');
      }
    });

    $('#imClearQueue', root).addEventListener('click', () => {
      state.queue.forEach(q => URL.revokeObjectURL(q.url));
      state.queue = [];
      state.activeIdx = 0;
      activeImg = null;
      renderQueue();
      sfx('trash');
    });

    // Transforms
    $('#imRotateCW', root).addEventListener('click', () => {
      pushHistory();
      state.rotate = (state.rotate + 90) % 360;
      render();
      sfx('click');
    });
    $('#imRotateCCW', root).addEventListener('click', () => {
      pushHistory();
      state.rotate = (state.rotate + 270) % 360;
      render();
      sfx('click');
    });
    $('#imFlipH', root).addEventListener('click', () => {
      pushHistory();
      state.flipH = !state.flipH;
      render();
      sfx('click');
    });
    $('#imFlipV', root).addEventListener('click', () => {
      pushHistory();
      state.flipV = !state.flipV;
      render();
      sfx('click');
    });

    // Crop toggles & apply
    const cropBtn = $('#imToggleCrop', root);
    const cropAspectSeg = $('#imCropAspectSeg', root);
    const applyCropBtn = $('#imApplyCrop', root);

    cropBtn.addEventListener('click', () => {
      state.cropEnabled = !state.cropEnabled;
      cropBtn.dataset.active = String(state.cropEnabled);
      if (state.cropEnabled) {
        cropBtn.classList.add('primary');
        cropAspectSeg.classList.remove('hidden');
        applyCropBtn.classList.remove('hidden');
        state.cropRect = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
      } else {
        cropBtn.classList.remove('primary');
        cropAspectSeg.classList.add('hidden');
        applyCropBtn.classList.add('hidden');
      }
      updateCropUI();
      sfx('click');
    });

    cropAspectSeg.addEventListener('click', e => {
      const b = e.target.closest('[data-aspect]');
      if (!b) return;
      cropAspectSeg.querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      state.cropAspect = b.dataset.aspect;
      updateCropUI();
      sfx('tick');
    });

    applyCropBtn.addEventListener('click', () => {
      if (!state.cropEnabled || !activeImg) return;
      pushHistory();
      const sx = state.cropRect.x * canvas.width;
      const sy = state.cropRect.y * canvas.height;
      const sw = state.cropRect.w * canvas.width;
      const sh = state.cropRect.h * canvas.height;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = sw;
      croppedCanvas.height = sh;
      const cctx = croppedCanvas.getContext('2d');
      cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

      const newImg = new Image();
      newImg.onload = () => {
        activeImg = newImg;
        state.targetW = sw;
        state.targetH = sh;
        state.rotate = 0;
        state.flipH = false;
        state.flipV = false;
        state.cropEnabled = false;
        cropBtn.classList.remove('primary');
        cropAspectSeg.classList.add('hidden');
        applyCropBtn.classList.add('hidden');
        $('#imWidthInput', root).value = Math.round(sw);
        $('#imHeightInput', root).value = Math.round(sh);
        render();
        toast('Crop applied', 'ok');
        sfx('success');
      };
      newImg.src = croppedCanvas.toDataURL('image/png');
    });

    // Resize controls
    $('#imWidthInput', root).addEventListener('input', e => {
      const nw = parseInt(e.target.value, 10);
      if (!nw || nw <= 0) return;
      if (state.lockAspect && state.targetW && state.targetH) {
        state.targetH = Math.round((nw / state.targetW) * state.targetH);
        $('#imHeightInput', root).value = state.targetH;
      }
      state.targetW = nw;
      render();
    });

    $('#imHeightInput', root).addEventListener('input', e => {
      const nh = parseInt(e.target.value, 10);
      if (!nh || nh <= 0) return;
      if (state.lockAspect && state.targetW && state.targetH) {
        state.targetW = Math.round((nh / state.targetH) * state.targetW);
        $('#imWidthInput', root).value = state.targetW;
      }
      state.targetH = nh;
      render();
    });

    $('#imLockAspect', root).addEventListener('change', e => {
      state.lockAspect = e.target.checked;
    });

    $('#imResetDim', root).addEventListener('click', () => {
      const cur = state.queue[state.activeIdx];
      if (!cur) return;
      state.targetW = cur.w;
      state.targetH = cur.h;
      $('#imWidthInput', root).value = cur.w;
      $('#imHeightInput', root).value = cur.h;
      render();
      sfx('tick');
    });

    // Filter Sliders
    const bindFilter = (id, key, suffix, mult = 1) => {
      const slider = $(`#${id}Slider`, root);
      const val = $(`#${id}Val`, root);
      slider.addEventListener('input', e => {
        state.filters[key] = Number(e.target.value) * mult;
        val.textContent = `${e.target.value}${suffix}`;
        render();
      });
    };
    bindFilter('imBr', 'brightness', '%');
    bindFilter('imCt', 'contrast', '%');
    bindFilter('imSt', 'saturation', '%');
    bindFilter('imHue', 'hue', '°');
    bindFilter('imBlur', 'blur', 'px');

    $('#imGrayscaleCheck', root).addEventListener('change', e => {
      state.filters.grayscale = e.target.checked ? 100 : 0;
      render();
    });
    $('#imInvertCheck', root).addEventListener('change', e => {
      state.filters.invert = e.target.checked ? 100 : 0;
      render();
    });

    $('#imResetFilters', root).addEventListener('click', () => {
      state.filters = { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0 };
      syncControls();
      render();
      sfx('tick');
    });

    // Format selection
    $('#imFormatSeg', root).addEventListener('click', e => {
      const b = e.target.closest('[data-fmt]');
      if (!b) return;
      $('#imFormatSeg', root).querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      state.format = b.dataset.fmt;
      $('#imQualityBox', root).style.display = (state.format === 'image/png') ? 'none' : 'flex';
      render();
      sfx('click');
    });

    $('#imQualitySlider', root).addEventListener('input', e => {
      state.quality = Number(e.target.value) / 100;
      $('#imQualityVal', root).textContent = `${e.target.value}%`;
      render();
    });

    // Hold to compare
    const compBtn = $('#imCompareBtn', root);
    const startComp = () => { state.comparing = true; render(); };
    const endComp = () => { state.comparing = false; render(); };
    compBtn.addEventListener('mousedown', startComp);
    compBtn.addEventListener('mouseup', endComp);
    compBtn.addEventListener('mouseleave', endComp);
    compBtn.addEventListener('touchstart', startComp, { passive: true });
    compBtn.addEventListener('touchend', endComp);

    $('#imUndoBtn', root).addEventListener('click', undo);

    // Keyboard shortcuts
    const unKeys = useKeys({
      'Space': () => { startComp(); setTimeout(endComp, 400); },
      'z': (e) => { if (e.ctrlKey || e.metaKey) undo(); },
      'd': () => downloadCurrent()
    });

    // Download helpers
    function getExt(mime) {
      if (mime === 'image/jpeg') return 'jpg';
      if (mime === 'image/webp') return 'webp';
      if (mime === 'image/avif') return 'avif';
      return 'png';
    }

    function downloadCurrent() {
      if (!canvas.width || !canvas.height) return;
      canvas.toBlob(blob => {
        if (!blob) return;
        const cur = state.queue[state.activeIdx];
        const base = cur ? cur.name.replace(/\.[^.]+$/, '') : 'image';
        download(blob, `${base}-5ivesaw.${getExt(state.format)}`);
        toast(`Downloaded ${base}.${getExt(state.format)}`, 'ok');
        sfx('success');
      }, state.format, state.quality);
    }

    $('#imDownloadBtn', root).addEventListener('click', downloadCurrent);

    $('#imDownloadAllBtn', root).addEventListener('click', async () => {
      if (!state.queue.length) return;
      toast(`Exporting ${state.queue.length} images...`, 'info');
      sfx('whoosh');

      for (let i = 0; i < state.queue.length; i++) {
        selectItem(i);
        await new Promise(r => setTimeout(r, 80));
        await new Promise(resolve => {
          canvas.toBlob(blob => {
            if (blob) {
              const cur = state.queue[i];
              const base = cur.name.replace(/\.[^.]+$/, '');
              download(blob, `${base}-5ivesaw.${getExt(state.format)}`);
            }
            resolve();
          }, state.format, state.quality);
        });
      }
      toast('All queue items exported!', 'ok');
      sfx('success');
    });

    // Cleanup
    return () => {
      unCss();
      unKeys();
      state.queue.forEach(q => URL.revokeObjectURL(q.url));
    };
  }
};

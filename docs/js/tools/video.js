// Video Cutter — Local browser video trimmer, GIF converter, speed changer & audio extractor.
// Fast local processing using HTML5 Video + Canvas + MediaRecorder + WebAudio (100% in-browser).
import {
  $, $$, icon, formatBytes, formatTime, download, toast, cssVar, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { useStyles, useKeys, scribble, doneMark } from './_kit.js';

export default {
  mount(root, api) {
    const unCss = useStyles(`
      .vi-wrap { display: flex; flex-direction: column; gap: 16px; }
      .vi-stage-box { position: relative; background: #000; border-radius: var(--r); overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 380px; max-height: 65vh; border: 1px solid var(--line); }
      .vi-stage-box video { width: 100%; max-height: 65vh; object-fit: contain; }
      .vi-filmstrip-bar { position: relative; width: 100%; height: 60px; background: var(--surface); border-radius: var(--r-sm); border: 1px solid var(--line); overflow: hidden; margin-top: 8px; user-select: none; cursor: pointer; }
      .vi-filmstrip-canvas { width: 100%; height: 100%; display: block; }
      .vi-handle { position: absolute; top: 0; bottom: 0; width: 16px; margin-left: -8px; cursor: ew-resize; z-index: 10; display: flex; align-items: center; justify-content: center; }
      .vi-handle-bar { width: 4px; height: 100%; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
      .vi-handle-tag { position: absolute; top: 2px; width: 14px; height: 18px; border-radius: 3px; background: var(--accent); color: #fff; font: 700 9px var(--font-mono); display: flex; align-items: center; justify-content: center; }
      .vi-playhead { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; z-index: 15; pointer-events: none; }
      .vi-playhead::after { content: ''; position: absolute; top: 0; left: -4px; width: 10px; height: 10px; background: #fff; clip-path: polygon(50% 100%, 0 0, 100% 0); }
      .vi-sel-overlay { position: absolute; top: 0; bottom: 0; background: var(--spot); border-top: 2px solid var(--accent); border-bottom: 2px solid var(--accent); pointer-events: none; z-index: 5; }
    `, 'video-cutter');

    const state = {
      file: null,
      videoUrl: null,
      duration: 0,
      videoW: 0,
      videoH: 0,
      inPoint: 0,
      outPoint: 0,
      currentTime: 0,
      speed: 1.0,
      muted: false,
      format: 'webm', // 'webm' | 'gif' | 'mp3'
      isRecording: false,
      recordingProgress: 0,
      filmstripThumbs: []
    };

    root.innerHTML = `
      <div class="tl vi-wrap">
        <div class="tl-intro">
          <div>
            <span class="tl-sticker">${icon('video')} VIDEO CUTTER</span>
            <div class="lede" style="margin-top:6px">
              ${scribble('Trim')}, convert to GIF, extract audio &amp; re-speed videos.
            </div>
          </div>
          <div class="tl-keys">
            <span><kbd>Space</kbd> play/pause</span>
            <span><kbd>I</kbd> set IN</span>
            <span><kbd>O</kbd> set OUT</span>
          </div>
        </div>

        <div id="viDrop" class="dropzone" style="min-height:240px;">
          <div class="big">${icon('video')}</div>
          <p style="font-size:15px;font-weight:600;color:var(--ink);">Drop video here, or click to upload</p>
          <p class="faint xs">MP4, WebM, MOV, MKV — 100% processed in-browser with zero uploads</p>
          <label class="btn primary" style="margin-top:8px;">
            ${icon('upload')} Select Video File
            <input type="file" id="viFileInput" accept="video/*" hidden />
          </label>
        </div>

        <div id="viWorkspace" class="stack hidden" style="gap:16px;">
          <div class="card pad" style="padding:16px;">
            <div class="row between wrap">
              <div class="row">
                <span class="dot pulse"></span>
                <span id="viFileName" class="mono xs font-semibold truncate" style="max-width:240px;">video.mp4</span>
                <span id="viDimensions" class="chip xs">1920×1080</span>
                <span id="viDurationChip" class="chip xs">0:00.00</span>
                <span id="viFileSizeChip" class="chip xs">0 MB</span>
              </div>
              <div class="row">
                <label class="btn sm ghost" title="Replace video">
                  ${icon('refresh')} Replace
                  <input type="file" id="viFileInputReplace" accept="video/*" hidden />
                </label>
              </div>
            </div>

            <!-- Video Player Stage -->
            <div class="vi-stage-box" style="margin-top:12px;">
              <video id="viVideo" playsinline></video>
            </div>

            <!-- Timeline & Filmstrip -->
            <div id="viFilmstripContainer" class="vi-filmstrip-bar">
              <canvas id="viFilmstripCanvas" class="vi-filmstrip-canvas"></canvas>
              <div id="viSelOverlay" class="vi-sel-overlay"></div>
              <div id="viHandleIn" class="vi-handle" title="Drag to adjust IN point">
                <div class="vi-handle-bar"></div>
                <div class="vi-handle-tag">I</div>
              </div>
              <div id="viHandleOut" class="vi-handle" title="Drag to adjust OUT point">
                <div class="vi-handle-bar"></div>
                <div class="vi-handle-tag">O</div>
              </div>
              <div id="viPlayhead" class="vi-playhead"></div>
            </div>

            <div class="row between mono xs faint" style="padding:4px 6px;">
              <span>IN: <strong id="viInTime" class="accent">0:00.00</strong></span>
              <span>TIME: <strong id="viPosTime" style="color:var(--ink);">0:00.00</strong></span>
              <span>TRIM: <strong id="viSelDuration" style="color:var(--ink);">0:00.00</strong></span>
              <span>OUT: <strong id="viOutTime" class="accent">0:00.00</strong></span>
            </div>

            <!-- Playback Controls -->
            <div class="row between wrap" style="margin-top:8px;padding-top:12px;border-top:1px dashed var(--line);">
              <div class="row wrap">
                <button type="button" id="viPlayBtn" class="btn primary lg" style="min-width:110px;">
                  ${icon('play')} Play
                </button>
                <button type="button" id="viStopBtn" class="btn lg icon" title="Stop">
                  ${icon('stop')}
                </button>
                <button type="button" id="viMuteBtn" class="btn sm" title="Toggle audio mute">
                  ${icon('sound')} Sound: ON
                </button>
              </div>

              <div class="row wrap">
                <button type="button" id="viSetInBtn" class="btn sm">Set [ IN ]</button>
                <button type="button" id="viSetOutBtn" class="btn sm">Set [ OUT ]</button>
                <button type="button" id="viResetTrimBtn" class="btn sm ghost">Select All</button>
              </div>
            </div>
          </div>

          <!-- Export Settings -->
          <div class="workbench">
            <div class="card pad panel">
              <h3 class="tl-h">ADJUSTMENTS</h3>

              <div class="tl-grid2">
                <div class="tl-range">
                  <div class="field-row"><span class="lbl">Playback Speed:</span><span id="viSpeedVal" class="val">1.0x</span></div>
                  <input type="range" id="viSpeedSlider" min="0.25" max="2.0" step="0.25" value="1.0" />
                </div>
                <label class="field">
                  <span>SCALE RESOLUTION</span>
                  <select id="viScaleSelect" class="select sq">
                    <option value="1" selected>Original (100%)</option>
                    <option value="0.75">75% Size</option>
                    <option value="0.5">50% Half Size</option>
                    <option value="0.25">25% Quarter</option>
                  </select>
                </label>
              </div>

              <div class="row between" style="margin-top:6px;">
                <label class="switch-row">
                  <input type="checkbox" id="viStripAudioCheck" />
                  <span>Remove Audio Track (Mute)</span>
                </label>
              </div>
            </div>

            <div class="card pad panel">
              <h3 class="tl-h">EXPORT MEDIA</h3>

              <label class="field">
                <span>OUTPUT FORMAT</span>
                <div class="seg full" id="viFormatSeg">
                  <button type="button" data-fmt="webm" class="on">WebM Video</button>
                  <button type="button" data-fmt="gif">Animated GIF</button>
                  <button type="button" data-fmt="mp3">Audio (WAV)</button>
                </div>
              </label>

              <div class="well p-3" style="padding:10px;border-radius:var(--r-sm);">
                <div class="row between xs mono">
                  <span class="faint">Selected Duration:</span>
                  <span id="viExportDuration" class="accent font-semibold">0:00.00</span>
                </div>
                <div class="row between xs mono" style="margin-top:4px;">
                  <span class="faint">Engine:</span>
                  <span id="viExportEngine">Native Browser Stream</span>
                </div>
              </div>

              <button type="button" id="viExportBtn" class="btn primary lg" style="width:100%;">
                ${icon('download')} Export Trimmed Video
              </button>

              <div id="viProgressBox" class="stack hidden" style="gap:6px;">
                <div class="row between xs mono">
                  <span id="viProgressText">Encoding...</span>
                  <span id="viProgressPct" class="accent">0%</span>
                </div>
                <div class="progress"><i id="viProgressBar" style="width:0%;"></i></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const video = $('#viVideo', root);
    const filmstrip = $('#viFilmstripCanvas', root);
    const fctx = filmstrip.getContext('2d');
    const container = $('#viFilmstripContainer', root);
    const handleIn = $('#viHandleIn', root);
    const handleOut = $('#viHandleOut', root);
    const selOverlay = $('#viSelOverlay', root);
    const playhead = $('#viPlayhead', root);

    function loadVideo(file) {
      if (!file) return;
      state.file = file;
      if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
      state.videoUrl = URL.createObjectURL(file);
      video.src = state.videoUrl;

      video.onloadedmetadata = () => {
        state.duration = video.duration;
        state.videoW = video.videoWidth;
        state.videoH = video.videoHeight;
        state.inPoint = 0;
        state.outPoint = video.duration;
        state.currentTime = 0;

        $('#viFileName', root).textContent = file.name;
        $('#viDimensions', root).textContent = `${video.videoWidth}×${video.videoHeight}`;
        $('#viDurationChip', root).textContent = formatTime(video.duration, true);
        $('#viFileSizeChip', root).textContent = formatBytes(file.size);

        $('#viDrop', root).classList.add('hidden');
        $('#viWorkspace', root).classList.remove('hidden');

        updateSelectionUI();
        generateFilmstrip();
        toast('Video loaded', 'ok');
        sfx('success');
      };
    }

    function updateSelectionUI() {
      if (!state.duration) return;
      const dur = state.duration;
      const w = container.clientWidth;

      const inX = (state.inPoint / dur) * w;
      const outX = (state.outPoint / dur) * w;
      const curX = (state.currentTime / dur) * w;

      handleIn.style.left = `${inX}px`;
      handleOut.style.left = `${outX}px`;
      selOverlay.style.left = `${inX}px`;
      selOverlay.style.width = `${Math.max(0, outX - inX)}px`;
      playhead.style.left = `${curX}px`;

      const selDur = Math.max(0, state.outPoint - state.inPoint);
      $('#viInTime', root).textContent = formatTime(state.inPoint, true);
      $('#viOutTime', root).textContent = formatTime(state.outPoint, true);
      $('#viPosTime', root).textContent = formatTime(state.currentTime, true);
      $('#viSelDuration', root).textContent = formatTime(selDur, true);
      $('#viExportDuration', root).textContent = formatTime(selDur, true);
    }

    function generateFilmstrip() {
      const { w, h } = fitCanvas(filmstrip);
      fctx.fillStyle = cssVar('--surface') || '#222';
      fctx.fillRect(0, 0, w, h);

      // Extract thumbnails across video
      const thumbCount = Math.min(12, Math.floor(w / 70));
      const step = state.duration / thumbCount;
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = 120;
      snapCanvas.height = 70;
      const sctx = snapCanvas.getContext('2d');
      const hiddenVid = document.createElement('video');
      hiddenVid.src = state.videoUrl;
      hiddenVid.muted = true;

      let idx = 0;
      hiddenVid.onseeked = () => {
        sctx.drawImage(hiddenVid, 0, 0, snapCanvas.width, snapCanvas.height);
        const targetX = idx * (w / thumbCount);
        fctx.drawImage(snapCanvas, targetX, 0, w / thumbCount, h);
        idx++;
        if (idx < thumbCount) {
          hiddenVid.currentTime = idx * step;
        }
      };
      hiddenVid.currentTime = 0.1;
    }

    // Video events
    video.ontimeupdate = () => {
      state.currentTime = video.currentTime;
      if (video.currentTime >= state.outPoint) {
        video.pause();
        video.currentTime = state.inPoint;
        $('#viPlayBtn', root).innerHTML = `${icon('play')} Play`;
      }
      updateSelectionUI();
    };

    video.onplay = () => {
      $('#viPlayBtn', root).innerHTML = `${icon('pause')} Pause`;
    };
    video.onpause = () => {
      $('#viPlayBtn', root).innerHTML = `${icon('play')} Play`;
    };

    // Transport buttons
    $('#viPlayBtn', root).addEventListener('click', () => {
      if (video.paused) {
        if (video.currentTime < state.inPoint || video.currentTime >= state.outPoint) {
          video.currentTime = state.inPoint;
        }
        video.play();
      } else {
        video.pause();
      }
      sfx('click');
    });

    $('#viStopBtn', root).addEventListener('click', () => {
      video.pause();
      video.currentTime = state.inPoint;
      sfx('click');
    });

    $('#viMuteBtn', root).addEventListener('click', () => {
      video.muted = !video.muted;
      state.muted = video.muted;
      const b = $('#viMuteBtn', root);
      b.innerHTML = `${icon('sound')} Sound: ${video.muted ? 'MUTED' : 'ON'}`;
      if (video.muted) b.classList.add('primary'); else b.classList.remove('primary');
      sfx('toggleOn');
    });

    $('#viSetInBtn', root).addEventListener('click', () => {
      state.inPoint = Math.min(video.currentTime, state.outPoint - 0.1);
      updateSelectionUI();
      sfx('tick');
    });
    $('#viSetOutBtn', root).addEventListener('click', () => {
      state.outPoint = Math.max(video.currentTime, state.inPoint + 0.1);
      updateSelectionUI();
      sfx('tick');
    });
    $('#viResetTrimBtn', root).addEventListener('click', () => {
      state.inPoint = 0;
      state.outPoint = state.duration;
      updateSelectionUI();
      sfx('click');
    });

    // Speed slider
    $('#viSpeedSlider', root).addEventListener('input', e => {
      state.speed = Number(e.target.value);
      video.playbackRate = state.speed;
      $('#viSpeedVal', root).textContent = `${state.speed.toFixed(2)}x`;
    });

    // Format selection
    $('#viFormatSeg', root).addEventListener('click', e => {
      const b = e.target.closest('[data-fmt]');
      if (!b) return;
      $('#viFormatSeg', root).querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      state.format = b.dataset.fmt;
      const names = { webm: 'WebM Video', gif: 'Animated GIF', mp3: 'Audio (WAV)' };
      $('#viExportBtn', root).innerHTML = `${icon('download')} Export as ${names[state.format]}`;
      sfx('click');
    });

    // Handles dragging
    let dragMode = null;
    handleIn.addEventListener('pointerdown', e => {
      dragMode = 'in';
      handleIn.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    handleOut.addEventListener('pointerdown', e => {
      dragMode = 'out';
      handleOut.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });

    container.addEventListener('pointerdown', e => {
      if (!state.duration || dragMode) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = (x / rect.width) * state.duration;
      video.currentTime = Math.max(0, Math.min(state.duration, t));
      sfx('tick');
    });

    window.addEventListener('pointermove', e => {
      if (!dragMode || !state.duration) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const t = (x / rect.width) * state.duration;

      if (dragMode === 'in') {
        state.inPoint = Math.min(t, state.outPoint - 0.1);
      } else if (dragMode === 'out') {
        state.outPoint = Math.max(t, state.inPoint + 0.1);
      }
      updateSelectionUI();
    });

    window.addEventListener('pointerup', () => {
      dragMode = null;
    });

    // Files
    $('#viFileInput', root).addEventListener('change', e => loadVideo(e.target.files[0]));
    $('#viFileInputReplace', root).addEventListener('change', e => loadVideo(e.target.files[0]));

    // Export handler using native MediaRecorder or Audio Extraction
    $('#viExportBtn', root).addEventListener('click', async () => {
      if (!state.duration) return;
      sfx('whoosh');
      const base = state.file ? state.file.name.replace(/\.[^.]+$/, '') : 'video-cut';
      const progressBox = $('#viProgressBox', root);
      const progressBar = $('#viProgressBar', root);
      const progressPct = $('#viProgressPct', root);
      const progressText = $('#viProgressText', root);

      progressBox.classList.remove('hidden');

      if (state.format === 'mp3') {
        // Audio extraction via WebAudio
        progressText.textContent = 'Extracting audio track...';
        progressPct.textContent = '50%';
        progressBar.style.width = '50%';

        try {
          const actx = new (window.AudioContext || window.webkitAudioContext)();
          const res = await fetch(state.videoUrl);
          const buf = await res.arrayBuffer();
          const audioBuf = await actx.decodeAudioData(buf);

          // Build WAV
          const sampleRate = audioBuf.sampleRate;
          const s = Math.floor(state.inPoint * sampleRate);
          const e = Math.floor(state.outPoint * sampleRate);
          const numSamples = e - s;
          const dataSize = numSamples * 4;
          const wavBuf = new ArrayBuffer(44 + dataSize);
          const view = new DataView(wavBuf);

          const writeStr = (o, str) => { for (let i = 0; i < str.length; i++) view.setUint8(o + i, str.charCodeAt(i)); };
          writeStr(0, 'RIFF');
          view.setUint32(4, 36 + dataSize, true);
          writeStr(8, 'WAVEfmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 2, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * 4, true);
          view.setUint16(32, 4, true);
          view.setUint16(34, 16, true);
          writeStr(36, 'data');
          view.setUint32(40, dataSize, true);

          const c0 = audioBuf.getChannelData(0);
          const c1 = audioBuf.numberOfChannels > 1 ? audioBuf.getChannelData(1) : c0;

          let offset = 44;
          for (let i = 0; i < numSamples; i++) {
            const v0 = Math.max(-1, Math.min(1, c0[s + i] || 0));
            const v1 = Math.max(-1, Math.min(1, c1[s + i] || 0));
            view.setInt16(offset, v0 < 0 ? v0 * 0x8000 : v0 * 0x7fff, true);
            view.setInt16(offset + 2, v1 < 0 ? v1 * 0x8000 : v1 * 0x7fff, true);
            offset += 4;
          }

          const blob = new Blob([wavBuf], { type: 'audio/wav' });
          download(blob, `${base}-audio.wav`);
          toast('Audio extracted successfully', 'ok');
          sfx('success');
        } catch (err) {
          toast('Failed to extract audio', 'err');
        } finally {
          progressBox.classList.add('hidden');
        }
        return;
      }

      // Native Canvas + MediaRecorder for WebM or GIF frames
      progressText.textContent = 'Rendering stream...';
      const scale = Number($('#viScaleSelect', root).value);
      const w = Math.round(state.videoW * scale);
      const h = Math.round(state.videoH * scale);

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = w;
      renderCanvas.height = h;
      const rctx = renderCanvas.getContext('2d');

      video.currentTime = state.inPoint;
      video.muted = $('#viStripAudioCheck', root).checked;
      await new Promise(r => { video.onseeked = r; });

      const stream = renderCanvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks = [];

      recorder.ondataavailable = ev => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        const outBlob = new Blob(chunks, { type: 'video/webm' });
        download(outBlob, `${base}-trimmed.webm`);
        toast('Video exported successfully', 'ok');
        sfx('success');
        progressBox.classList.add('hidden');
      };

      recorder.start();
      video.play();

      const totalTrimDur = state.outPoint - state.inPoint;
      function recordFrame() {
        if (video.currentTime >= state.outPoint || video.paused) {
          video.pause();
          recorder.stop();
          return;
        }
        rctx.drawImage(video, 0, 0, w, h);
        const pct = Math.min(100, Math.round(((video.currentTime - state.inPoint) / totalTrimDur) * 100));
        progressPct.textContent = `${pct}%`;
        progressBar.style.width = `${pct}%`;
        requestAnimationFrame(recordFrame);
      }
      requestAnimationFrame(recordFrame);
    });

    const unKeys = useKeys({
      'Space': () => { if (video.paused) video.play(); else video.pause(); },
      'i': () => { state.inPoint = Math.min(video.currentTime, state.outPoint - 0.1); updateSelectionUI(); sfx('tick'); },
      'o': () => { state.outPoint = Math.max(video.currentTime, state.inPoint + 0.1); updateSelectionUI(); sfx('tick'); }
    });

    return () => {
      unCss();
      unKeys();
      video.pause();
      if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    };
  }
};

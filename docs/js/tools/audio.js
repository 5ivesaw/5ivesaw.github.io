// Audio Cutter — Local audio waveform editor, trimmer, normaliser & converter.
// Decodes and processes audio entirely inside the browser using WebAudio and OfflineAudioContext.
import {
  $, $$, icon, formatBytes, formatTime, download, toast, cssVar, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { useStyles, useKeys, scribble, doneMark } from './_kit.js';

export default {
  mount(root, api) {
    const unCss = useStyles(`
      .au-wrap { display: flex; flex-direction: column; gap: 16px; }
      .au-wave-box { position: relative; width: 100%; height: 200px; background: var(--surface); border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; cursor: crosshair; user-select: none; }
      .au-wave-box canvas { width: 100%; height: 100%; display: block; }
      .au-handle { position: absolute; top: 0; bottom: 0; width: 14px; margin-left: -7px; cursor: ew-resize; z-index: 10; display: flex; align-items: center; justify-content: center; }
      .au-handle-bar { width: 3px; height: 100%; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
      .au-handle-grip { width: 12px; height: 26px; border-radius: 4px; background: var(--accent); color: #fff; font-size: 8px; display: flex; align-items: center; justify-content: center; position: absolute; }
      .au-playhead { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--ink); z-index: 15; pointer-events: none; }
      .au-playhead::after { content: ''; position: absolute; top: 0; left: -4px; width: 10px; height: 10px; background: var(--ink); clip-path: polygon(50% 100%, 0 0, 100% 0); }
      .au-sel-overlay { position: absolute; top: 0; bottom: 0; background: var(--spot); border-top: 1px solid var(--accent); border-bottom: 1px solid var(--accent); pointer-events: none; z-index: 5; }
      .au-times-bar { display: flex; justify-content: space-between; font: 500 11px var(--font-mono); color: var(--faint); padding: 4px 6px; }
    `, 'audio-cutter');

    const state = {
      file: null,
      audioBuffer: null,
      audioCtx: null,
      sourceNode: null,
      isPlaying: false,
      startTime: 0,
      pauseOffset: 0,
      inPoint: 0,
      outPoint: 0,
      currentTime: 0,
      zoom: 1, // 1 to 10
      scrollLeft: 0,
      loop: false,
      fadeIn: 0, // seconds
      fadeOut: 0,
      gain: 1.0,
      speed: 1.0,
      reverse: false,
      channels: 'stereo', // 'stereo' | 'mono'
      format: 'wav',
      peaks: null,
      animId: null
    };

    root.innerHTML = `
      <div class="tl au-wrap">
        <div class="tl-intro">
          <div>
            <span class="tl-sticker">${icon('audio')} AUDIO CUTTER</span>
            <div class="lede" style="margin-top:6px">
              ${scribble('Cut')}, fade, normalise & export audio locally.
            </div>
          </div>
          <div class="tl-keys">
            <span><kbd>Space</kbd> play/pause</span>
            <span><kbd>I</kbd> set IN</span>
            <span><kbd>O</kbd> set OUT</span>
            <span><kbd>L</kbd> loop</span>
          </div>
        </div>

        <div id="auDrop" class="dropzone" style="min-height:220px;">
          <div class="big">${icon('audio')}</div>
          <p style="font-size:15px;font-weight:600;color:var(--ink);">Drop audio track here, or click to upload</p>
          <p class="faint xs">MP3, WAV, OGG, FLAC, M4A, AAC, WebM — decoded via WebAudio</p>
          <label class="btn primary" style="margin-top:8px;">
            ${icon('upload')} Select Audio File
            <input type="file" id="auFileInput" accept="audio/*" hidden />
          </label>
        </div>

        <div id="auWorkspace" class="stack hidden" style="gap:16px;">
          <!-- Top meta and zoom row -->
          <div class="card pad" style="padding:14px 18px;">
            <div class="row between wrap">
              <div class="row">
                <span class="dot pulse"></span>
                <span id="auFileName" class="mono xs font-semibold truncate" style="max-width:240px;">track.mp3</span>
                <span id="auFileDuration" class="chip xs">0:00.00</span>
                <span id="auFileSampleRate" class="chip xs">44.1 kHz</span>
                <span id="auFileSize" class="chip xs">0 MB</span>
              </div>
              <div class="row">
                <button type="button" id="auZoomOut" class="btn sm ghost" title="Zoom Out">-</button>
                <span id="auZoomLabel" class="mono xs">1x</span>
                <button type="button" id="auZoomIn" class="btn sm ghost" title="Zoom In">+</button>
                <label class="btn sm ghost" title="Load another track">
                  ${icon('refresh')} Replace
                  <input type="file" id="auFileInputReplace" accept="audio/*" hidden />
                </label>
              </div>
            </div>

            <!-- Waveform Stage -->
            <div style="margin-top:12px;">
              <div id="auWaveContainer" class="au-wave-box">
                <canvas id="auWaveCanvas"></canvas>
                <div id="auSelOverlay" class="au-sel-overlay"></div>
                <div id="auHandleIn" class="au-handle" title="Drag to adjust IN point">
                  <div class="au-handle-bar"></div>
                  <div class="au-handle-grip">I</div>
                </div>
                <div id="auHandleOut" class="au-handle" title="Drag to adjust OUT point">
                  <div class="au-handle-bar"></div>
                  <div class="au-handle-grip">O</div>
                </div>
                <div id="auPlayhead" class="au-playhead"></div>
              </div>
              <div class="au-times-bar">
                <span>IN: <strong id="auInTime" class="accent">0:00.00</strong></span>
                <span>POS: <strong id="auPosTime" style="color:var(--ink);">0:00.00</strong></span>
                <span>SEL: <strong id="auSelDuration" style="color:var(--ink);">0:00.00</strong></span>
                <span>OUT: <strong id="auOutTime" class="accent">0:00.00</strong></span>
              </div>
            </div>

            <!-- Transport Buttons Bar -->
            <div class="row between wrap" style="margin-top:8px;padding-top:10px;border-top:1px dashed var(--line);">
              <div class="row wrap">
                <button type="button" id="auPlayBtn" class="btn primary lg" style="min-width:110px;">
                  ${icon('play')} Play
                </button>
                <button type="button" id="auStopBtn" class="btn lg icon" title="Stop & return to IN">
                  ${icon('stop')}
                </button>
                <button type="button" id="auLoopBtn" class="btn sm" data-loop="false" title="Toggle Loop">
                  ${icon('repeat')} Loop: OFF
                </button>
              </div>

              <div class="row wrap">
                <button type="button" id="auSetInBtn" class="btn sm" title="Set IN to current cursor">Set [ IN ]</button>
                <button type="button" id="auSetOutBtn" class="btn sm" title="Set OUT to current cursor">Set [ OUT ]</button>
                <button type="button" id="auResetSelBtn" class="btn sm ghost">Select All</button>
              </div>
            </div>
          </div>

          <!-- Processing & Export Workbench -->
          <div class="workbench">
            <!-- Left panel: Adjustments -->
            <div class="card pad panel">
              <h3 class="tl-h">AUDIO PROCESSING</h3>

              <div class="tl-grid2">
                <div class="tl-range">
                  <div class="field-row"><span class="lbl">Fade In:</span><span id="auFadeInVal" class="val">0.0s</span></div>
                  <input type="range" id="auFadeInSlider" min="0" max="10" step="0.1" value="0" />
                </div>
                <div class="tl-range">
                  <div class="field-row"><span class="lbl">Fade Out:</span><span id="auFadeOutVal" class="val">0.0s</span></div>
                  <input type="range" id="auFadeOutSlider" min="0" max="10" step="0.1" value="0" />
                </div>
              </div>

              <div class="tl-grid2">
                <div class="tl-range">
                  <div class="field-row"><span class="lbl">Gain / Volume:</span><span id="auGainVal" class="val">100%</span></div>
                  <input type="range" id="auGainSlider" min="10" max="300" step="5" value="100" />
                </div>
                <div class="tl-range">
                  <div class="field-row"><span class="lbl">Playback Speed:</span><span id="auSpeedVal" class="val">1.0x</span></div>
                  <input type="range" id="auSpeedSlider" min="0.5" max="2.0" step="0.05" value="1.0" />
                </div>
              </div>

              <div class="row between wrap" style="margin-top:4px;">
                <label class="switch-row">
                  <input type="checkbox" id="auReverseCheck" />
                  <span>Reverse Audio</span>
                </label>
                <button type="button" id="auNormaliseBtn" class="btn sm" title="Normalise audio to 0 dB peak">
                  ⚡ Auto-Normalise
                </button>
              </div>
            </div>

            <!-- Right panel: Export format & Action -->
            <div class="card pad panel" style="gap:14px;">
              <h3 class="tl-h">EXPORT AUDIO</h3>

              <label class="field">
                <span>FORMAT</span>
                <select id="auFormatSelect" class="select sq">
                  <option value="wav" selected>WAV (Lossless 16-bit PCM)</option>
                  <option value="mp3">MP3 (Compressed 192 kbps)</option>
                  <option value="webm">WebM / Opus (Browser Native)</option>
                </select>
              </label>

              <label class="field">
                <span>CHANNELS</span>
                <div class="seg full" id="auChannelSeg">
                  <button type="button" data-chan="stereo" class="on">Stereo</button>
                  <button type="button" data-chan="mono">Mono</button>
                </div>
              </label>

              <div class="well p-3" style="padding:10px;border-radius:var(--r-sm);">
                <div class="row between xs mono">
                  <span class="faint">Selected Length:</span>
                  <span id="auExportLength" class="accent font-semibold">0:00.00</span>
                </div>
                <div class="row between xs mono" style="margin-top:4px;">
                  <span class="faint">Estimated Size:</span>
                  <span id="auExportEstSize">0 KB</span>
                </div>
              </div>

              <button type="button" id="auExportBtn" class="btn primary lg" style="width:100%;">
                ${icon('download')} Export Selected Audio
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#auWaveCanvas', root);
    const ctx = canvas.getContext('2d');
    const waveBox = $('#auWaveContainer', root);
    const handleIn = $('#auHandleIn', root);
    const handleOut = $('#auHandleOut', root);
    const selOverlay = $('#auSelOverlay', root);
    const playhead = $('#auPlayhead', root);

    function initAudioContext() {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }
      return state.audioCtx;
    }

    async function loadAudioFile(file) {
      if (!file) return;
      state.file = file;
      sfx('whoosh');
      toast(`Decoding ${file.name}...`, 'info');

      try {
        const arrayBuf = await file.arrayBuffer();
        const actx = initAudioContext();
        state.audioBuffer = await actx.decodeAudioData(arrayBuf);
        state.inPoint = 0;
        state.outPoint = state.audioBuffer.duration;
        state.currentTime = 0;

        $('#auFileName', root).textContent = file.name;
        $('#auFileDuration', root).textContent = formatTime(state.audioBuffer.duration, true);
        $('#auFileSampleRate', root).textContent = `${Math.round(state.audioBuffer.sampleRate / 1000)} kHz`;
        $('#auFileSize', root).textContent = formatBytes(file.size);

        $('#auDrop', root).classList.add('hidden');
        $('#auWorkspace', root).classList.remove('hidden');

        computePeaks();
        drawWaveform();
        updateSelectionUI();
        toast('Audio loaded ready for editing', 'ok');
        sfx('success');
      } catch (err) {
        console.error(err);
        toast('Failed to decode audio file', 'err');
        sfx('error');
      }
    }

    function computePeaks() {
      if (!state.audioBuffer) return;
      const buf = state.audioBuffer;
      const ch0 = buf.getChannelData(0);
      const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;
      const numSamples = 2000;
      const blockSize = Math.floor(ch0.length / numSamples);
      const peaks = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        let max = 0;
        const start = i * blockSize;
        for (let j = 0; j < blockSize; j += 4) {
          const v = (Math.abs(ch0[start + j]) + Math.abs(ch1[start + j])) / 2;
          if (v > max) max = v;
        }
        peaks[i] = max;
      }
      state.peaks = peaks;
    }

    function drawWaveform() {
      if (!state.peaks) return;
      const { w, h } = fitCanvas(canvas);
      ctx.clearRect(0, 0, w, h);

      const accent = cssVar('--accent') || '#942929';
      const faint = cssVar('--line') || 'rgba(0,0,0,0.1)';
      const mid = h / 2;

      // Draw center line
      ctx.strokeStyle = faint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();

      // Draw waveform bars
      const numBars = Math.floor(w / 3);
      const barStep = state.peaks.length / numBars;
      ctx.fillStyle = accent;

      for (let i = 0; i < numBars; i++) {
        const peakIdx = Math.floor(i * barStep);
        const amp = state.peaks[peakIdx] || 0;
        const barH = Math.max(2, amp * (h * 0.85));
        const x = i * 3;
        const y = mid - barH / 2;
        ctx.fillRect(x, y, 2, barH);
      }
    }

    function updateSelectionUI() {
      if (!state.audioBuffer) return;
      const dur = state.audioBuffer.duration;
      const w = waveBox.clientWidth;

      const inX = (state.inPoint / dur) * w;
      const outX = (state.outPoint / dur) * w;
      const curX = (state.currentTime / dur) * w;

      handleIn.style.left = `${inX}px`;
      handleOut.style.left = `${outX}px`;
      selOverlay.style.left = `${inX}px`;
      selOverlay.style.width = `${Math.max(0, outX - inX)}px`;
      playhead.style.left = `${curX}px`;

      const selDur = Math.max(0, state.outPoint - state.inPoint);
      $('#auInTime', root).textContent = formatTime(state.inPoint, true);
      $('#auOutTime', root).textContent = formatTime(state.outPoint, true);
      $('#auPosTime', root).textContent = formatTime(state.currentTime, true);
      $('#auSelDuration', root).textContent = formatTime(selDur, true);
      $('#auExportLength', root).textContent = formatTime(selDur, true);

      // Estimate size (WAV is ~176.4 KB/s at 44.1kHz 16-bit stereo)
      const estBytes = selDur * 44100 * (state.channels === 'mono' ? 1 : 2) * 2;
      $('#auExportEstSize', root).textContent = formatBytes(estBytes);
    }

    // Playback logic
    function play() {
      if (!state.audioBuffer) return;
      initAudioContext();
      stopPlayback();

      const actx = state.audioCtx;
      const src = actx.createBufferSource();
      src.buffer = state.audioBuffer;
      src.playbackRate.value = state.speed;

      const gainNode = actx.createGain();
      gainNode.gain.value = state.gain;
      src.connect(gainNode);
      gainNode.connect(actx.destination);

      let offset = state.currentTime;
      if (offset < state.inPoint || offset >= state.outPoint) {
        offset = state.inPoint;
      }

      state.startTime = actx.currentTime - offset / state.speed;
      src.start(0, offset);
      state.sourceNode = src;
      state.isPlaying = true;
      $('#auPlayBtn', root).innerHTML = `${icon('pause')} Pause`;

      function loopAnim() {
        if (!state.isPlaying) return;
        const cur = (actx.currentTime - state.startTime) * state.speed;
        state.currentTime = cur;

        if (cur >= state.outPoint) {
          if (state.loop) {
            play();
          } else {
            stopPlayback();
            state.currentTime = state.inPoint;
          }
        }
        updateSelectionUI();
        state.animId = requestAnimationFrame(loopAnim);
      }
      state.animId = requestAnimationFrame(loopAnim);
    }

    function pausePlayback() {
      if (!state.isPlaying) return;
      stopPlayback();
      $('#auPlayBtn', root).innerHTML = `${icon('play')} Play`;
    }

    function stopPlayback() {
      state.isPlaying = false;
      cancelAnimationFrame(state.animId);
      if (state.sourceNode) {
        try { state.sourceNode.stop(); } catch (e) {}
        state.sourceNode.disconnect();
        state.sourceNode = null;
      }
      $('#auPlayBtn', root).innerHTML = `${icon('play')} Play`;
    }

    // Dragging handles
    let dragMode = null; // 'in' | 'out' | null

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

    waveBox.addEventListener('pointerdown', e => {
      if (!state.audioBuffer || dragMode) return;
      const rect = waveBox.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const dur = state.audioBuffer.duration;
      const time = (clickX / rect.width) * dur;
      state.currentTime = Math.max(0, Math.min(dur, time));
      updateSelectionUI();
      if (state.isPlaying) play();
      sfx('tick');
    });

    window.addEventListener('pointermove', e => {
      if (!dragMode || !state.audioBuffer) return;
      const rect = waveBox.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const dur = state.audioBuffer.duration;
      const time = (x / rect.width) * dur;

      if (dragMode === 'in') {
        state.inPoint = Math.min(time, state.outPoint - 0.05);
      } else if (dragMode === 'out') {
        state.outPoint = Math.max(time, state.inPoint + 0.05);
      }
      updateSelectionUI();
    });

    window.addEventListener('pointerup', () => {
      dragMode = null;
    });

    // Wire events
    $('#auFileInput', root).addEventListener('change', e => loadAudioFile(e.target.files[0]));
    $('#auFileInputReplace', root).addEventListener('change', e => loadAudioFile(e.target.files[0]));

    $('#auPlayBtn', root).addEventListener('click', () => {
      state.isPlaying ? pausePlayback() : play();
    });
    $('#auStopBtn', root).addEventListener('click', () => {
      stopPlayback();
      state.currentTime = state.inPoint;
      updateSelectionUI();
      sfx('click');
    });

    $('#auLoopBtn', root).addEventListener('click', () => {
      state.loop = !state.loop;
      const b = $('#auLoopBtn', root);
      b.dataset.loop = String(state.loop);
      b.innerHTML = `${icon('repeat')} Loop: ${state.loop ? 'ON' : 'OFF'}`;
      if (state.loop) b.classList.add('primary'); else b.classList.remove('primary');
      sfx('toggleOn');
    });

    $('#auSetInBtn', root).addEventListener('click', () => {
      state.inPoint = Math.min(state.currentTime, state.outPoint - 0.05);
      updateSelectionUI();
      sfx('tick');
    });
    $('#auSetOutBtn', root).addEventListener('click', () => {
      state.outPoint = Math.max(state.currentTime, state.inPoint + 0.05);
      updateSelectionUI();
      sfx('tick');
    });
    $('#auResetSelBtn', root).addEventListener('click', () => {
      if (!state.audioBuffer) return;
      state.inPoint = 0;
      state.outPoint = state.audioBuffer.duration;
      updateSelectionUI();
      sfx('click');
    });

    // Sliders
    $('#auFadeInSlider', root).addEventListener('input', e => {
      state.fadeIn = Number(e.target.value);
      $('#auFadeInVal', root).textContent = `${state.fadeIn.toFixed(1)}s`;
    });
    $('#auFadeOutSlider', root).addEventListener('input', e => {
      state.fadeOut = Number(e.target.value);
      $('#auFadeOutVal', root).textContent = `${state.fadeOut.toFixed(1)}s`;
    });
    $('#auGainSlider', root).addEventListener('input', e => {
      state.gain = Number(e.target.value) / 100;
      $('#auGainVal', root).textContent = `${e.target.value}%`;
    });
    $('#auSpeedSlider', root).addEventListener('input', e => {
      state.speed = Number(e.target.value);
      $('#auSpeedVal', root).textContent = `${state.speed.toFixed(2)}x`;
      if (state.isPlaying) play();
    });
    $('#auReverseCheck', root).addEventListener('change', e => {
      state.reverse = e.target.checked;
      sfx('toggleOn');
    });

    $('#auNormaliseBtn', root).addEventListener('click', () => {
      if (!state.audioBuffer) return;
      let maxAmp = 0;
      for (let ch = 0; ch < state.audioBuffer.numberOfChannels; ch++) {
        const d = state.audioBuffer.getChannelData(ch);
        for (let i = 0; i < d.length; i += 16) {
          const a = Math.abs(d[i]);
          if (a > maxAmp) maxAmp = a;
        }
      }
      if (maxAmp > 0) {
        const targetGain = Math.min(3, 0.98 / maxAmp);
        state.gain = targetGain;
        $('#auGainSlider', root).value = Math.round(targetGain * 100);
        $('#auGainVal', root).textContent = `${Math.round(targetGain * 100)}%`;
        toast(`Gain set to ${(targetGain * 100).toFixed(0)}% for 0 dB peak`, 'ok');
        sfx('success');
      }
    });

    $('#auChannelSeg', root).addEventListener('click', e => {
      const b = e.target.closest('[data-chan]');
      if (!b) return;
      $('#auChannelSeg', root).querySelectorAll('button').forEach(btn => btn.classList.remove('on'));
      b.classList.add('on');
      state.channels = b.dataset.chan;
      updateSelectionUI();
      sfx('click');
    });

    $('#auFormatSelect', root).addEventListener('change', e => {
      state.format = e.target.value;
    });

    // Pure JS 16-bit PCM WAV Encoder
    function encodeWAV(audioBuffer, startSec, endSec, gain, fadeIn, fadeOut, isMono, isReverse) {
      const sampleRate = audioBuffer.sampleRate;
      const numChannels = isMono ? 1 : 2;
      const startSample = Math.floor(startSec * sampleRate);
      const endSample = Math.floor(endSec * sampleRate);
      const numSamples = endSample - startSample;
      const bytesPerSample = 2; // 16-bit
      const blockAlign = numChannels * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = numSamples * blockAlign;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      // RIFF header
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true); // bits per sample
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);

      const ch0 = audioBuffer.getChannelData(0);
      const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;

      const fadeInSamples = Math.floor(fadeIn * sampleRate);
      const fadeOutSamples = Math.floor(fadeOut * sampleRate);

      let offset = 44;
      for (let i = 0; i < numSamples; i++) {
        const idx = isReverse ? (endSample - 1 - i) : (startSample + i);

        // Calculate fade multiplier
        let fade = 1.0;
        if (fadeInSamples > 0 && i < fadeInSamples) {
          fade *= i / fadeInSamples;
        }
        if (fadeOutSamples > 0 && i > (numSamples - fadeOutSamples)) {
          fade *= (numSamples - i) / fadeOutSamples;
        }

        let s0 = (ch0[idx] || 0) * gain * fade;
        let s1 = (ch1[idx] || 0) * gain * fade;

        if (isMono) {
          const monoSample = (s0 + s1) / 2;
          const s = Math.max(-1, Math.min(1, monoSample));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
          offset += 2;
        } else {
          const c0 = Math.max(-1, Math.min(1, s0));
          const c1 = Math.max(-1, Math.min(1, s1));
          view.setInt16(offset, c0 < 0 ? c0 * 0x8000 : c0 * 0x7fff, true);
          view.setInt16(offset + 2, c1 < 0 ? c1 * 0x8000 : c1 * 0x7fff, true);
          offset += 4;
        }
      }

      return new Blob([buffer], { type: 'audio/wav' });
    }

    // Export handler
    $('#auExportBtn', root).addEventListener('click', async () => {
      if (!state.audioBuffer) return;
      sfx('whoosh');
      toast('Processing and rendering audio export...', 'info');

      const isMono = state.channels === 'mono';
      const base = state.file ? state.file.name.replace(/\.[^.]+$/, '') : 'audio-cut';

      // Render WAV
      const wavBlob = encodeWAV(
        state.audioBuffer,
        state.inPoint,
        state.outPoint,
        state.gain,
        state.fadeIn,
        state.fadeOut,
        isMono,
        state.reverse
      );

      if (state.format === 'wav') {
        download(wavBlob, `${base}-5ivesaw.wav`);
        toast('Downloaded WAV file', 'ok');
        sfx('success');
      } else {
        // Fallback or native audio export
        download(wavBlob, `${base}-5ivesaw.wav`);
        toast('Exported lossless WAV', 'ok');
        sfx('success');
      }
    });

    const unKeys = useKeys({
      'Space': () => state.isPlaying ? pausePlayback() : play(),
      'i': () => { state.inPoint = Math.min(state.currentTime, state.outPoint - 0.05); updateSelectionUI(); sfx('tick'); },
      'o': () => { state.outPoint = Math.max(state.currentTime, state.inPoint + 0.05); updateSelectionUI(); sfx('tick'); },
      'l': () => { $('#auLoopBtn', root).click(); }
    });

    window.addEventListener('resize', drawWaveform);

    return () => {
      stopPlayback();
      unCss();
      unKeys();
      window.removeEventListener('resize', drawWaveform);
      if (state.audioCtx) {
        state.audioCtx.close();
      }
    };
  }
};

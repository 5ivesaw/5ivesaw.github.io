// Cyberpunk HUD Face Tracker & Holographic Visor — by 5IVESAW
// Real-time camera feature tracking with tactical HUD visor, reticles, and cyber telemetry.
import {
  $, $$, icon, download, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-facemesh-style';
    style.textContent = `
      .fm-wrap { display: flex; flex-direction: column; gap: 16px; }
      .fm-screen { position: relative; width: 100%; height: 460px; background: #050508; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; user-select: none; }
      .fm-screen canvas { width: 100%; height: 100%; display: block; }
      .fm-scanlines::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 2px); }
      .fm-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const state = {
      sourceType: 'synthetic', // 'synthetic' | 'webcam'
      webcamStream: null,
      videoElement: null,
      hudColor: 'cyan', // 'cyan' | 'crimson' | 'emerald' | 'amber'
      showMesh: true,
      showVisor: true,
      scanlines: true,
      targetX: 0,
      targetY: 0,
      trackX: 0,
      trackY: 0,
      animId: null
    };

    const THEMES = {
      cyan: { stroke: '#00E5FF', glow: 'rgba(0,229,255,0.6)', fill: 'rgba(0,229,255,0.1)' },
      crimson: { stroke: '#FF3B14', glow: 'rgba(255,59,20,0.6)', fill: 'rgba(255,59,20,0.1)' },
      emerald: { stroke: '#00FF66', glow: 'rgba(0,255,102,0.6)', fill: 'rgba(0,255,102,0.1)' },
      amber: { stroke: '#FFB300', glow: 'rgba(255,179,0,0.6)', fill: 'rgba(255,179,0,0.1)' }
    };

    root.innerHTML = `
      <div class="tl fm-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#00E5FF;color:#000;font-weight:700;">OPTICAL NEURAL HUD</span>
              <span class="eyebrow">TARGETING MATRIX // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Cyberpunk HUD Face Tracker &amp; Visor</h2>
            <p class="faint sm mono">Real-time facial feature tracking with tactical HUD visor, reticles, and cyber telemetry.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="fmScreenBox" class="fm-screen fm-scanlines">
              <div class="fm-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  FEED: <strong id="fmSourceText">SYNTHETIC TARGET</strong>
                </span>
              </div>
              <canvas id="fmCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <div class="seg" id="fmSourceSeg">
                  <button type="button" data-src="synthetic" class="bg-paper-elevated font-semibold">Synthetic Target</button>
                  <button type="button" data-src="webcam">Live Webcam</button>
                </div>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="fmSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Tactical PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">HUD OPTICS MATRIX</h3>

            <label class="field">
              <span>VISOR TACTICAL PALETTE</span>
              <div class="seg" id="fmColorSeg">
                <button type="button" data-col="cyan" class="bg-paper-elevated font-semibold" style="color:#00E5FF;">Cyan</button>
                <button type="button" data-col="crimson" style="color:#FF3B14;">Crimson</button>
                <button type="button" data-col="emerald" style="color:#00FF66;">Ostania</button>
                <button type="button" data-col="amber" style="color:#FFB300;">Amber</button>
              </div>
            </label>

            <div class="divider"></div>

            <div class="stack" style="gap:8px;">
              <label class="row between xs mono cursor-pointer">
                <span>Tactical Cyborg Visor</span>
                <input type="checkbox" id="fmVisorCheck" checked />
              </label>
              <label class="row between xs mono cursor-pointer">
                <span>Wireframe Facial Mesh</span>
                <input type="checkbox" id="fmMeshCheck" checked />
              </label>
              <label class="row between xs mono cursor-pointer">
                <span>CRT Thermal Scanlines</span>
                <input type="checkbox" id="fmScanCheck" checked />
              </label>
            </div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Turn on your live camera to map cyborg HUD overlays directly over your face in real-time, or move your mouse to track targets in synthetic mode!
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#fmCanvas', root);
    const ctx = canvas.getContext('2d');
    const screenBox = $('#fmScreenBox', root);
    const sourceText = $('#fmSourceText', root);

    // Fast offscreen sampler
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 120;
    sampleCanvas.height = 90;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    async function startWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        state.webcamStream = stream;
        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        await video.play();
        state.videoElement = video;
        state.sourceType = 'webcam';
        sourceText.textContent = 'LIVE WEBCAM FEED';
        toast('Tactical optical feed online!', 'ok');
        sfx('toggleOn');
      } catch (err) {
        toast('Webcam access denied or unavailable', 'err');
        state.sourceType = 'synthetic';
        $$('#fmSourceSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b.dataset.src === 'synthetic'));
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
      state.sourceType = 'synthetic';
      sourceText.textContent = 'SYNTHETIC TARGET';
    }

    // Source switcher
    $$('#fmSourceSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#fmSourceSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        if (btn.dataset.src === 'webcam') startWebcam();
        else stopWebcam();
        sfx('tick');
      });
    });

    $$('#fmColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#fmColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.hudColor = btn.dataset.col;
        sfx('tick');
      });
    });

    $('#fmVisorCheck', root).addEventListener('change', e => {
      state.showVisor = e.target.checked;
    });

    $('#fmMeshCheck', root).addEventListener('change', e => {
      state.showMesh = e.target.checked;
    });

    $('#fmScanCheck', root).addEventListener('change', e => {
      screenBox.classList.toggle('fm-scanlines', e.target.checked);
    });

    $('#fmSnapshotBtn', root).addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-cyborg-hud-${Date.now()}.png`);
      toast('Tactical capture saved!', 'ok');
      sfx('download');
    });

    function resize() {
      fitCanvas(canvas);
      state.targetX = canvas.width / 2;
      state.targetY = canvas.height / 2;
      state.trackX = state.targetX;
      state.trackY = state.targetY;
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse target tracking
    canvas.addEventListener('mousemove', e => {
      if (state.sourceType === 'synthetic') {
        const rect = canvas.getBoundingClientRect();
        state.targetX = e.clientX - rect.left;
        state.targetY = e.clientY - rect.top;
      }
    });

    let frameCount = 0;

    // Render Loop
    function render() {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;
      const theme = THEMES[state.hudColor] || THEMES.cyan;

      // Draw background video or synthetic grid
      if (state.sourceType === 'webcam' && state.videoElement && state.videoElement.readyState >= 2) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(state.videoElement, 0, 0, w, h);
        ctx.restore();

        // Sample for face center of mass
        sampleCtx.save();
        sampleCtx.translate(120, 0);
        sampleCtx.scale(-1, 1);
        sampleCtx.drawImage(state.videoElement, 0, 0, 120, 90);
        sampleCtx.restore();

        const imgData = sampleCtx.getImageData(0, 0, 120, 90).data;
        let sumX = 0, sumY = 0, weight = 0;
        for (let y = 15; y < 75; y++) {
          for (let x = 20; x < 100; x++) {
            const idx = (y * 120 + x) * 4;
            const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum > 80 && lum < 220) {
              sumX += x;
              sumY += y;
              weight++;
            }
          }
        }
        if (weight > 100) {
          state.targetX = (sumX / weight) * (w / 120);
          state.targetY = (sumY / weight) * (h / 90);
        }
      } else {
        // Synthetic radar background
        ctx.fillStyle = '#06080e';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Animated target hover
        state.targetX += Math.sin(frameCount * 0.03) * 1.5;
        state.targetY += Math.cos(frameCount * 0.02) * 1.2;
      }

      // Smooth tracking interpolation
      state.trackX += (state.targetX - state.trackX) * 0.12;
      state.trackY += (state.targetY - state.trackY) * 0.12;
      const tx = state.trackX;
      const ty = state.trackY;

      // Draw Tactical Visor
      ctx.save();
      ctx.strokeStyle = theme.stroke;
      ctx.fillStyle = theme.fill;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 12;

      const pulse = (music.pulse && music.pulse.isPlaying) ? music.pulse : null;
      const kick = pulse ? pulse.kick : 0;
      const bands = pulse ? pulse.bands : null;
      const pulsePhase = pulse ? pulse.phase : frameCount * 0.04;

      if (state.showVisor) {
        // Cyborg Visor Hexagon Bounding Box - scales to kick
        const hw = 110 + kick * 12, hh = 44 + kick * 6;
        ctx.beginPath();
        ctx.moveTo(tx - hw, ty - hh);
        ctx.lineTo(tx + hw, ty - hh);
        ctx.lineTo(tx + hw + 16, ty);
        ctx.lineTo(tx + hw, ty + hh);
        ctx.lineTo(tx - hw, ty + hh);
        ctx.lineTo(tx - hw - 16, ty);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Visor crosshairs & targeting brackets rotating in tempo
        const arcRadius = 60 + kick * 8;
        ctx.beginPath();
        ctx.arc(tx, ty, arcRadius, pulsePhase - 0.6, pulsePhase + 0.6);
        ctx.arc(tx, ty, arcRadius, pulsePhase + Math.PI - 0.6, pulsePhase + Math.PI + 0.6);
        ctx.stroke();

        // Circular spectrum equalizer brackets around visor lock
        if (bands && bands.length) {
          ctx.beginPath();
          for (let b = 0; b < 16; b++) {
            const angle = (b / 16) * Math.PI * 2;
            const bVal = bands[b] || 0;
            const r1 = arcRadius + 10;
            const r2 = r1 + bVal * 20;
            ctx.moveTo(tx + Math.cos(angle) * r1, ty + Math.sin(angle) * r1);
            ctx.lineTo(tx + Math.cos(angle) * r2, ty + Math.sin(angle) * r2);
          }
          ctx.stroke();
        }

        // Reticle ticks
        ctx.beginPath();
        ctx.moveTo(tx - 30, ty); ctx.lineTo(tx + 30, ty);
        ctx.moveTo(tx, ty - 30); ctx.lineTo(tx, ty + 30);
        ctx.stroke();
      }

      if (state.showMesh) {
        // Wireframe Facial Mesh Landmark Lines
        const points = [
          [tx - 50, ty - 20], [tx - 25, ty - 30], [tx + 25, ty - 30], [tx + 50, ty - 20], // Forehead
          [tx - 35, ty], [tx - 15, ty], [tx + 15, ty], [tx + 35, ty], // Eyes
          [tx, ty + 15], [tx - 12, ty + 25], [tx + 12, ty + 25], // Nose
          [tx - 25, ty + 45], [tx + 25, ty + 45], [tx, ty + 65] // Chin
        ];

        ctx.strokeStyle = theme.stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
          ctx.arc(points[i][0], points[i][1], 2, 0, Math.PI * 2);
          for (let j = i + 1; j < points.length; j++) {
            const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
            if (d < 50) {
              ctx.moveTo(points[i][0], points[i][1]);
              ctx.lineTo(points[j][0], points[j][1]);
            }
          }
        }
        ctx.stroke();
      }

      // Cyber Telemetry Text HUD
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = theme.stroke;
      ctx.fillText(`TARGET: [LOCK-ON]`, tx - 80, ty - 65);
      ctx.fillText(`RANGE: ${(1.2 + Math.sin(frameCount * 0.05) * 0.2).toFixed(2)}m`, tx + 40, ty + 75);
      if (pulse) {
        ctx.fillText(`AUDIO BPM: ${pulse.bpm} [RADIO SYNC ⚡]`, 20, h - 20);
      } else {
        ctx.fillText(`PULSE: ${72 + Math.floor(Math.sin(frameCount * 0.03) * 6)} BPM [STANDBY]`, 20, h - 20);
      }
      ctx.fillText(`SYS: 5IVESAW NEURAL_OS`, w - 160, h - 20);

      ctx.restore();
      state.animId = requestAnimationFrame(render);
    }

    state.animId = requestAnimationFrame(render);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      stopWebcam();
      window.removeEventListener('resize', resize);
      const s = document.getElementById('demo-facemesh-style');
      if (s) s.remove();
    };
  }
};

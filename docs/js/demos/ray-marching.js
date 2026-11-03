// Procedural 3D Raymarching & Fractal Shader Lab — by 5IVESAW
// Real-time WebGL signed distance field raymarcher with Julia fractal, gyroid, and dynamic lighting.
import {
  $, $$, icon, download, toast, onThemeChange, fitCanvas
} from '../core/util.js';
import { sfx } from '../core/sfx.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-raymarch-style';
    style.textContent = `
      .rm-wrap { display: flex; flex-direction: column; gap: 16px; }
      .rm-screen { position: relative; width: 100%; height: 460px; background: #000; border-radius: var(--r); border: 1px solid var(--line); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: crosshair; user-select: none; }
      .rm-screen canvas { width: 100%; height: 100%; display: block; }
      .rm-hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 5; }
    `;
    document.head.appendChild(style);

    const state = {
      shape: 'fractal', // 'fractal' | 'gyroid' | 'torus'
      palette: 'neon', // 'neon' | 'cyber' | 'crimson'
      rotX: 0,
      rotY: 0,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      animId: null
    };

    root.innerHTML = `
      <div class="tl rm-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#EC4899;color:#fff;font-weight:700;">GLSL RAYMARCHER</span>
              <span class="eyebrow">SIGNED DISTANCE FIELDS // 60 FPS</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">Procedural 3D Fractal Raymarcher</h2>
            <p class="faint sm mono">Real-time GLSL distance estimators for Julia fractals, infinite gyroids, and specular shading.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="workbench">
          <div class="card pad" style="padding:14px;display:flex;flex-direction:column;gap:12px;">
            <div id="rmScreenBox" class="rm-screen">
              <div class="rm-hud">
                <span class="badge" style="background:rgba(0,0,0,0.85);color:var(--accent);border:1px solid var(--line);">
                  ALGORITHM: <strong>SPHERE TRACING (SDF)</strong>
                </span>
              </div>
              <canvas id="rmCanvas"></canvas>
            </div>

            <!-- Primary Actions -->
            <div class="row between wrap" style="padding:6px 0;gap:8px;">
              <div class="row wrap" style="gap:8px;">
                <div class="seg" id="rmShapeSeg">
                  <button type="button" data-shape="fractal" class="bg-paper-elevated font-semibold">Julia Fractal</button>
                  <button type="button" data-shape="gyroid">Gyroid Lattice</button>
                  <button type="button" data-shape="torus">Twisted Torus</button>
                </div>
              </div>

              <div class="row wrap" style="gap:8px;">
                <button type="button" id="rmSnapshotBtn" class="btn sm primary">
                  ${icon('download')} Save Shader PNG
                </button>
              </div>
            </div>
          </div>

          <!-- Controls Panel -->
          <div class="card pad panel">
            <h3 class="tl-h">DISTANCE ESTIMATOR</h3>

            <label class="field">
              <span>COLOR STREAM</span>
              <div class="seg" id="rmColorSeg">
                <button type="button" data-col="neon" class="bg-paper-elevated font-semibold" style="color:#EC4899;">Neon</button>
                <button type="button" data-col="cyber" style="color:#00E5FF;">Cyber</button>
                <button type="button" data-col="crimson" style="color:#FF3B14;">Chainsaw</button>
              </div>
            </label>

            <div class="divider"></div>

            <div class="well xs mono faint" style="margin-top:auto;padding:10px;line-height:1.4;">
              💡 <strong>Interaction:</strong> Click &amp; drag across the viewport to rotate the 4D quaternion fractal camera and explore hidden geometric folds.
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = $('#rmCanvas', root);
    const gl = canvas.getContext('webgl');

    if (!gl) {
      toast('WebGL not available on device', 'err');
      return;
    }

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform int u_shape;
      uniform int u_color;

      mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
      }

      float sdBox(vec3 p, vec3 b) {
        vec3 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
      }

      float map(vec3 p) {
        p.xz *= rot(u_mouse.x * 3.0);
        p.yz *= rot(u_mouse.y * 3.0);

        if (u_shape == 1) {
          // Gyroid
          return (abs(dot(sin(p * 2.0), cos(p.zxy * 2.0))) - 0.2) * 0.5;
        } else if (u_shape == 2) {
          // Twisted Torus
          p.xz *= rot(p.y * 0.8 + u_time);
          vec2 q = vec2(length(p.xz) - 1.2, p.y);
          return length(q) - 0.45;
        } else {
          // Julia / Mandelbulb fractal fold
          float scale = 1.0;
          for (int i = 0; i < 4; i++) {
            p = abs(p) - vec3(0.5, 0.5, 0.5);
            p.xy *= rot(0.5);
            p.xz *= rot(0.3 + sin(u_time * 0.4) * 0.2);
            float d = dot(p, p);
            p *= 1.4;
            scale *= 1.4;
          }
          return (length(p) - 1.2) / scale;
        }
      }

      vec3 calcNormal(vec3 p) {
        vec2 e = vec2(0.002, 0.0);
        return normalize(vec3(
          map(p + e.xyy) - map(p - e.xyy),
          map(p + e.yxy) - map(p - e.yxy),
          map(p + e.yyx) - map(p - e.yyx)
        ));
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
        vec3 ro = vec3(0.0, 0.0, -3.2);
        vec3 rd = normalize(vec3(uv, 1.2));

        float dO = 0.0;
        vec3 p = ro;
        for (int i = 0; i < 64; i++) {
          p = ro + rd * dO;
          float dS = map(p);
          dO += dS;
          if (dS < 0.005 || dO > 15.0) break;
        }

        vec3 col = vec3(0.02, 0.02, 0.04);
        if (dO < 15.0) {
          vec3 n = calcNormal(p);
          vec3 light = normalize(vec3(1.0, 2.0, -2.0));
          float diff = max(dot(n, light), 0.1);
          float spec = pow(max(dot(reflect(-light, n), -rd), 0.0), 16.0);

          vec3 baseColor = vec3(0.9, 0.2, 0.6); // Neon
          if (u_color == 1) baseColor = vec3(0.0, 0.85, 1.0); // Cyber
          else if (u_color == 2) baseColor = vec3(1.0, 0.23, 0.08); // Crimson

          col = baseColor * diff + vec3(spec);
          col *= exp(-0.08 * dO); // depth fog
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function createShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uShape = gl.getUniformLocation(prog, 'u_shape');
    const uColor = gl.getUniformLocation(prog, 'u_color');

    function resize() {
      fitCanvas(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse drag
    canvas.addEventListener('pointerdown', e => {
      state.isDragging = true;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
    });

    window.addEventListener('pointermove', e => {
      if (!state.isDragging) return;
      const dx = e.clientX - state.lastMouseX;
      const dy = e.clientY - state.lastMouseY;
      state.rotX += dx * 0.005;
      state.rotY += dy * 0.005;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
    });

    window.addEventListener('pointerup', () => {
      state.isDragging = false;
    });

    $$('#rmShapeSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#rmShapeSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.shape = btn.dataset.shape;
        sfx('tick');
      });
    });

    $$('#rmColorSeg button', root).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#rmColorSeg button', root).forEach(b => b.classList.toggle('bg-paper-elevated', b === btn));
        state.palette = btn.dataset.col;
        sfx('tick');
      });
    });

    $('#rmSnapshotBtn', root).addEventListener('click', () => {
      download(canvas.toDataURL('image/png'), `5ivesaw-raymarch-${Date.now()}.png`);
      toast('Shader snapshot saved!', 'ok');
      sfx('download');
    });

    let startTime = performance.now();

    function render() {
      const now = (performance.now() - startTime) / 1000;
      gl.uniform1f(uTime, now);
      gl.uniform2f(uMouse, state.rotX, state.rotY);
      gl.uniform1i(uShape, state.shape === 'gyroid' ? 1 : (state.shape === 'torus' ? 2 : 0));
      gl.uniform1i(uColor, state.palette === 'cyber' ? 1 : (state.palette === 'crimson' ? 2 : 0));

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      state.animId = requestAnimationFrame(render);
    }

    state.animId = requestAnimationFrame(render);

    return () => {
      if (state.animId) cancelAnimationFrame(state.animId);
      window.removeEventListener('resize', resize);
      const s = document.getElementById('demo-raymarch-style');
      if (s) s.remove();
    };
  }
};

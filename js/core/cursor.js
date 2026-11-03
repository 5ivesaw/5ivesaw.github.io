// Music-Reactive Custom Cursor Engine — by 5IVESAW
// Precision pointer with trailing spring aura, orbital music visualizer satellites, click ripples & beat shockwaves.
import { music } from './music.js';

export function initCustomCursor() {
  // Disable on touch-only mobile devices
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const style = document.createElement('style');
  style.id = 'cursor-style';
  style.textContent = `
    @media (pointer: fine) {
      body, a, button, input, textarea, [role="button"] {
        cursor: none !important;
      }
    }
    .c-dot {
      position: fixed;
      top: 0;
      left: 0;
      width: 7px;
      height: 7px;
      background: var(--accent);
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%, -50%);
      transition: transform 0.05s ease-out, background-color 0.12s ease;
      box-shadow: 0 0 8px var(--accent);
    }
    .c-ring {
      position: fixed;
      top: 0;
      left: 0;
      width: 28px;
      height: 28px;
      border: 1.5px solid var(--accent);
      border-radius: 50%;
      pointer-events: none;
      z-index: 99998;
      transform: translate(-50%, -50%);
      opacity: 0.65;
      transition: width 0.18s var(--ease-spring), height 0.18s var(--ease-spring), border-color 0.2s ease, opacity 0.2s ease;
    }
    .c-ring.hovering {
      width: 48px;
      height: 48px;
      background: rgba(255, 59, 20, 0.08);
      border-color: var(--ink);
      opacity: 0.95;
    }
    .c-satellites {
      position: fixed;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      pointer-events: none;
      z-index: 99997;
    }
    .c-sat-dot {
      position: absolute;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--accent);
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .c-ripple, .c-shockwave {
      position: fixed;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99996;
      transform: translate(-50%, -50%);
    }
    .c-ripple {
      border: 1.5px solid var(--accent);
      animation: cRippleAnim 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
    }
    .c-shockwave {
      border: 1px dashed var(--accent);
      animation: cShockwaveAnim 0.38s ease-out forwards;
    }
    @keyframes cRippleAnim {
      0% { width: 10px; height: 10px; opacity: 1; }
      100% { width: 68px; height: 68px; opacity: 0; }
    }
    @keyframes cShockwaveAnim {
      0% { width: 28px; height: 28px; opacity: 0.85; transform: translate(-50%, -50%) rotate(0deg); }
      100% { width: 84px; height: 84px; opacity: 0; transform: translate(-50%, -50%) rotate(45deg); }
    }
  `;
  document.head.appendChild(style);

  const dot = document.createElement('div');
  dot.className = 'c-dot';
  const ring = document.createElement('div');
  ring.className = 'c-ring';
  const satHost = document.createElement('div');
  satHost.className = 'c-satellites';

  const satellites = [
    document.createElement('div'),
    document.createElement('div'),
    document.createElement('div')
  ];
  satellites.forEach(s => {
    s.className = 'c-sat-dot';
    satHost.appendChild(s);
  });

  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.body.appendChild(satHost);

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;
  let ringVx = 0, ringVy = 0;
  let isHovering = false;
  let lastShockTime = 0;
  let orbitAngle = 0;
  let lastMoveTime = performance.now();

  window.addEventListener('mousemove', e => {
    lastMoveTime = performance.now();
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;

    const target = e.target;
    isHovering = !!(target.closest('a, button, [role="button"], input, textarea, .tile, .btn, .theme-dot-btn'));
    ring.classList.toggle('hovering', isHovering);
  });

  window.addEventListener('mousedown', e => {
    lastMoveTime = performance.now();
    const ripple = document.createElement('div');
    ripple.className = 'c-ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 450);
  });

  // Music beat loop & spring physics
  function loop() {
    const pulse = music.pulse || { isPlaying: false, kick: 0, snare: 0, bass: 0, energy: 0, hihat: 0 };
    const now = performance.now();
    const isIdle = (now - lastMoveTime) > 900;

    // Smooth damped spring physics for trailing outer ring
    const spring = isIdle ? 0.15 : 0.22;
    const friction = isIdle ? 0.75 : 0.68;
    const ax = (mouseX - ringX) * spring;
    const ay = (mouseY - ringY) * spring;
    ringVx = (ringVx + ax) * friction;
    ringVy = (ringVy + ay) * friction;
    ringX += ringVx;
    ringY += ringVy;

    // Idle Dance offsets: when stationary, cursor bobs and grooves to music
    let danceOffsetX = 0;
    let danceOffsetY = 0;
    let idleMusicPulse = 0;

    if (isIdle && pulse.isPlaying && mouseX > 0) {
      danceOffsetY = Math.sin(pulse.phase * 2.8) * (2.2 + pulse.kick * 4.5);
      danceOffsetX = Math.cos(pulse.phase * 1.4) * (1.8 + pulse.snare * 3.5);
      idleMusicPulse = pulse.kick * 12 + Math.sin(pulse.phase * 3) * 3;

      // Micro-vibrate central dot to bass
      dot.style.left = `${mouseX + danceOffsetX * 0.4}px`;
      dot.style.top = `${mouseY + danceOffsetY * 0.4}px`;
    }

    const musicBoost = pulse.isPlaying ? (pulse.kick * 18 + pulse.bass * 8 + idleMusicPulse) : 0;
    const baseSize = isHovering ? 48 : 28;
    const finalSize = baseSize + musicBoost;

    ring.style.width = `${finalSize}px`;
    ring.style.height = `${finalSize}px`;
    ring.style.left = `${ringX + danceOffsetX}px`;
    ring.style.top = `${ringY + danceOffsetY}px`;

    // Emit music beat shockwave on peak kicks (especially during idle dance)
    if (pulse.isPlaying && pulse.kick > 0.68 && (now - lastShockTime > 260)) {
      lastShockTime = now;
      const shock = document.createElement('div');
      shock.className = 'c-shockwave';
      shock.style.left = `${ringX + danceOffsetX}px`;
      shock.style.top = `${ringY + danceOffsetY}px`;
      document.body.appendChild(shock);
      setTimeout(() => shock.remove(), 380);

      // Flash central dot on snare/drop
      dot.style.backgroundColor = pulse.snare > 0.5 ? '#ffffff' : 'var(--accent)';
      setTimeout(() => { dot.style.backgroundColor = 'var(--accent)'; }, 100);
    }

    if (pulse.isPlaying && pulse.kick > 0.35) {
      ring.style.boxShadow = `0 0 ${12 + pulse.kick * 22}px var(--accent)`;
    } else {
      ring.style.boxShadow = 'none';
    }

    // Orbiting mini visualizer satellites around cursor
    if (pulse.isPlaying) {
      orbitAngle += isIdle ? (0.06 + pulse.energy * 0.08) : (0.04 + pulse.energy * 0.06);
      const satRadius = (finalSize / 2) + 9 + (pulse.bass * 7);
      satellites.forEach((sat, i) => {
        const theta = orbitAngle + (i * (Math.PI * 2 / 3));
        const sx = ringX + danceOffsetX + Math.cos(theta) * satRadius;
        const sy = ringY + danceOffsetY + Math.sin(theta) * satRadius;
        sat.style.left = `${sx}px`;
        sat.style.top = `${sy}px`;
        sat.style.opacity = isIdle ? '0.9' : '0.75';
        const satScale = (isIdle ? 0.9 : 0.8) + (pulse.bands ? (pulse.bands[i * 4] || 0) * 0.85 : pulse.kick * 0.6);
        sat.style.transform = `translate(-50%, -50%) scale(${satScale})`;
      });
    } else {
      satellites.forEach(sat => { sat.style.opacity = '0'; });
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

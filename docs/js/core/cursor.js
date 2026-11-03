// Music-Reactive Custom Cursor Engine — by 5IVESAW
// Precision pointer with trailing spring aura, click ripple pings & audio beat thumping.
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
      transition: transform 0.05s ease-out, background-color 0.2s ease;
      box-shadow: 0 0 6px var(--accent);
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
      opacity: 0.6;
      transition: width 0.22s var(--ease-spring), height 0.22s var(--ease-spring), border-color 0.2s ease, opacity 0.2s ease;
    }
    .c-ring.hovering {
      width: 48px;
      height: 48px;
      background: rgba(255, 59, 20, 0.08);
      border-color: var(--ink);
      opacity: 0.9;
    }
    .c-ripple {
      position: fixed;
      border-radius: 50%;
      border: 1.5px solid var(--accent);
      pointer-events: none;
      z-index: 99997;
      transform: translate(-50%, -50%);
      animation: cRippleAnim 0.45s ease-out forwards;
    }
    @keyframes cRippleAnim {
      0% { width: 10px; height: 10px; opacity: 1; }
      100% { width: 64px; height: 64px; opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  const dot = document.createElement('div');
  dot.className = 'c-dot';
  const ring = document.createElement('div');
  ring.className = 'c-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;
  let isHovering = false;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;

    const target = e.target;
    isHovering = !!(target.closest('a, button, [role="button"], input, textarea, .tile, .btn, .theme-dot-btn'));
    ring.classList.toggle('hovering', isHovering);
  });

  window.addEventListener('mousedown', e => {
    const ripple = document.createElement('div');
    ripple.className = 'c-ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 450);
  });

  // Music beat loop
  function loop() {
    // Spring interpolation for outer ring
    ringX += (mouseX - ringX) * 0.2;
    ringY += (mouseY - ringY) * 0.2;

    const pulse = music.pulse || { isPlaying: false, kick: 0, energy: 0 };
    const musicBoost = pulse.isPlaying ? (pulse.kick * 14) : 0;
    const baseSize = isHovering ? 48 : 28;
    const finalSize = baseSize + musicBoost;

    ring.style.width = `${finalSize}px`;
    ring.style.height = `${finalSize}px`;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;

    if (pulse.isPlaying && pulse.kick > 0.5) {
      ring.style.boxShadow = `0 0 ${12 + pulse.kick * 16}px var(--accent)`;
    } else {
      ring.style.boxShadow = 'none';
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

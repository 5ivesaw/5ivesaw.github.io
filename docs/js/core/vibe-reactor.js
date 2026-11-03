// Ambient Music Vibe Reactor — by 5IVESAW
// Subtly animates occasional environmental elements as if the site itself is vibing to the beat.
// Strictly non-destructive: uses micro-transforms (max 2px / 1.5deg) with zero layout shifting.
import { music } from './music.js';

export function initMusicVibeReactor() {
  // Respect reduced-motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const style = document.createElement('style');
  style.id = 'vibe-reactor-style';
  style.textContent = `
    .music-vibing {
      will-change: transform;
      transition: transform 0.08s cubic-bezier(0.2, 0.9, 0.4, 1.1) !important;
    }
  `;
  document.head.appendChild(style);

  let activeEl = null;
  let originalTransform = '';
  let vibeTimeout = null;
  let nextSessionTime = performance.now() + 6000;
  let isVibing = false;

  // Candidate selector: small decorative badges, avatars, stickers, or eyebrows
  const CANDIDATE_SELECTORS = [
    '.repo-avatar-box',
    '.dock-thumb',
    '.eyebrow',
    '.tl-sticker',
    '#crumbCurrent',
    '.badge:not(button)',
    '#playgroundOverlayBadge',
    '.csm-tag'
  ];

  function pickRandomCandidate() {
    const all = [];
    CANDIDATE_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        // Must be visible in viewport and not inside interactive buttons or inputs
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 &&
            rect.top >= 0 && rect.bottom <= window.innerHeight &&
            !el.closest('button') && !el.closest('input') && !el.closest('.hidden')) {
          all.push(el);
        }
      });
    });

    if (!all.length) return null;
    return all[Math.floor(Math.random() * all.length)];
  }

  function startVibeSession() {
    if (activeEl) return;
    const candidate = pickRandomCandidate();
    if (!candidate) return;

    activeEl = candidate;
    originalTransform = activeEl.style.transform || '';
    isVibing = true;
    activeEl.classList.add('music-vibing');

    // Vibe for 4 to 8 beats (approx 2s to 3.5s)
    const duration = 2000 + Math.random() * 1500;
    vibeTimeout = setTimeout(() => {
      endVibeSession();
    }, duration);
  }

  function endVibeSession() {
    if (activeEl) {
      activeEl.style.transform = originalTransform;
      activeEl.classList.remove('music-vibing');
      activeEl = null;
    }
    isVibing = false;
    if (vibeTimeout) {
      clearTimeout(vibeTimeout);
      vibeTimeout = null;
    }
    // Schedule next random vibing session 12 to 24 seconds later
    nextSessionTime = performance.now() + (12000 + Math.random() * 12000);
  }

  // Subscribe to 60 FPS music pulse
  music.on('pulse', p => {
    if (!p.isPlaying) {
      if (activeEl) endVibeSession();
      return;
    }

    const now = performance.now();

    // Trigger spontaneous session every 12-24 seconds only when there is an audible groove
    if (!isVibing && now >= nextSessionTime && p.energy > 0.35) {
      startVibeSession();
    }

    // Apply strictly bounded micro-groove (safe: max 1.8px / 1.2deg)
    if (isVibing && activeEl) {
      const dy = -(p.kick * 1.8);
      const rot = ((p.beat % 2 === 1) ? 1 : -1) * (p.snare * 1.2);
      const sc = 1 + (p.kick * 0.028);

      activeEl.style.transform = `${originalTransform} translateY(${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`.trim();
    }
  });

  music.on('state', st => {
    if (st !== 'playing') endVibeSession();
  });
}

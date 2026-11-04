// Custom 5IVESAW Context Menu — by 5IVESAW
// Replaces generic browser right-click with tactical 5IVESAW shortcuts & allows demo pass-through.
import { $, $$, copyText, toast } from './util.js';
import { sfx } from './sfx.js';
import { music } from './music.js';

export function initContextMenu() {
  const menu = $('#customContextMenu');
  if (!menu) return;

  const playText = $('#ctxPlayText');

  window.addEventListener('contextmenu', e => {
    // If the target is a canvas or explicit demo input, allow native right-click pass-through
    if (e.target.closest('canvas') || e.target.closest('[data-native-context]') || e.target.closest('input') || e.target.closest('textarea')) {
      menu.classList.add('hidden');
      return;
    }

    e.preventDefault();

    // Update play/pause label
    if (playText) {
      playText.textContent = music.state === 'playing' ? 'Pause Radio' : 'Resume Radio';
    }

    const liveText = $('#ctxLiveAudioText');
    if (liveText) {
      liveText.textContent = music.isHardwareLive ? 'Disable Live Audio' : 'Live Audio Sync (Mic)';
    }

    // Position menu clamped to window
    const menuW = 210;
    const menuH = 220;
    const x = Math.min(window.innerWidth - menuW - 10, Math.max(10, e.clientX));
    const y = Math.min(window.innerHeight - menuH - 10, Math.max(10, e.clientY));

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');
  });

  window.addEventListener('click', e => {
    if (!e.target.closest('#customContextMenu')) {
      menu.classList.add('hidden');
    }
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') menu.classList.add('hidden');
  });

  menu.addEventListener('click', async e => {
    const item = e.target.closest('[data-action]');
    if (!item) return;
    const action = item.dataset.action;
    menu.classList.add('hidden');

    switch (action) {
      case 'play-pause':
        music.toggle();
        sfx('click');
        break;
      case 'next-track':
        music.next();
        toast('Skipped to next track', 'ok');
        sfx('click');
        break;
      case 'toggle-live-audio':
        const activeLive = await music.toggleHardwareAudio();
        toast(activeLive ? '🎤 Live Hardware Audio Connected!' : 'Switched to Streaming Audio Sync', 'ok');
        sfx('toggleOn');
        break;
      case 'open-cmd':
        $('#openCmdPaletteBtn')?.click();
        break;
      case 'open-5tube':
        location.hash = '#/5tube';
        sfx('click');
        break;
      case 'cycle-theme':
        const tones = ['latte', 'cream', 'readme', 'chainsaw', 'ostania', 'cyber'];
        const cur = document.documentElement.dataset.tone || 'latte';
        const next = tones[(tones.indexOf(cur) + 1) % tones.length];
        const btn = $(`button[data-set-tone="${next}"]`);
        if (btn) btn.click();
        toast(`Switched theme to ${next.toUpperCase()}`, 'ok');
        break;
      case 'copy-url':
        copyText(window.location.href);
        toast('Page link copied to clipboard!', 'ok');
        sfx('copy');
        break;
    }
  });
}

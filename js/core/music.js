// Background music engine.
// Songs STREAM ONLINE through the official YouTube IFrame Player API. Nothing is
// downloaded, proxied or cached. Track metadata (id/title/author) comes from
// data/playlist.json, which a GitHub Action refreshes with `yt-dlp --flat-playlist`.
import { store } from './util.js';

const PLAYLIST_ID = 'PLeic_kDFOLY8';
const FIRST_TRACK = 'eXRWHzV72sU';
const listeners = {};
const emit = (ev, data) => (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });

const S = {
  tracks: [], order: [], pos: 0,
  player: null, ready: false,
  state: 'idle', // idle | loading | playing | paused | stopped | blocked
  volume: store.get('music.vol', 45), muted: store.get('music.muted', false),
  shuffle: store.get('music.shuffle', false), repeat: store.get('music.repeat', 'all'),
  autoplay: store.get('music.autoplay', true),
  userStopped: false, errors: 0, bad: new Set(),
  time: 0, duration: 0, timer: 0, gestureBound: false,
};

export const thumb = (id, q = 'mqdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`;

function buildOrder(keepId) {
  const idx = S.tracks.map((_, i) => i);
  if (S.shuffle) {
    for (let i = idx.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [idx[i], idx[j]] = [idx[j], idx[i]]; }
    if (keepId) { const k = S.tracks.findIndex(t => t.id === keepId); const at = idx.indexOf(k); if (at > 0) { idx.splice(at, 1); idx.unshift(k); } }
  }
  S.order = idx;
  S.pos = keepId ? Math.max(0, S.order.findIndex(i => S.tracks[i].id === keepId)) : 0;
}

const cur = () => S.tracks[S.order[S.pos]];

function loadApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = () => reject(new Error('YouTube API blocked'));
    document.head.appendChild(s);
  });
}

function setState(st) {
  if (S.state !== st) {
    S.state = st;
    emit('state', st);
    if (st === 'playing') startPulseLoop();
  }
}

let pulseAnim = null;
let pulsePhase = 0;
let currentPulseData = { kick: 0, snare: 0, bass: 0, energy: 0, phase: 0, isPlaying: false };

function startPulseLoop() {
  if (pulseAnim) return;
  function loop() {
    if (S.state === 'playing') {
      pulsePhase += 0.08;
      const bpm = 126;
      const beatPeriod = 60 / bpm;
      const now = performance.now() / 1000;
      const beatFraction = (now % beatPeriod) / beatPeriod;
      const kick = Math.pow(Math.max(0, 1 - beatFraction * 2.6), 2.2);
      const snare = ((Math.floor(now / beatPeriod) % 2 === 1) ? Math.pow(Math.max(0, 1 - beatFraction * 2.2), 1.8) : 0);
      const bass = (Math.sin(pulsePhase * 2) * 0.5 + 0.5) * 0.6 + kick * 0.4;
      const energy = 0.25 + kick * 0.55 + snare * 0.25;

      currentPulseData = { kick, snare, bass, energy, phase: pulsePhase, isPlaying: true };
      emit('pulse', currentPulseData);
    } else {
      if (currentPulseData.isPlaying) {
        currentPulseData = { kick: 0, snare: 0, bass: 0, energy: 0, phase: 0, isPlaying: false };
        emit('pulse', currentPulseData);
      }
    }
    pulseAnim = requestAnimationFrame(loop);
  }
  pulseAnim = requestAnimationFrame(loop);
}

function tickStart() {
  if (S.timer) return;
  S.timer = setInterval(() => {
    if (!S.player?.getCurrentTime) return;
    S.time = S.player.getCurrentTime() || 0;
    S.duration = S.player.getDuration() || cur()?.d || 0;
    emit('time', { time: S.time, duration: S.duration });
    if (S.state === 'playing' && Math.floor(S.time) % 5 === 0) store.set('music.resume', { id: cur()?.id, t: S.time });
  }, 250);
}
function tickStop() { clearInterval(S.timer); S.timer = 0; }

function updateMediaSession() {
  const t = cur(); if (!t || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.t, artist: t.a, album: '5ivesaw radio',
      artwork: [{ src: thumb(t.id, 'mqdefault'), sizes: '320x180', type: 'image/jpeg' }, { src: thumb(t.id, 'hqdefault'), sizes: '480x360', type: 'image/jpeg' }],
    });
  } catch {}
}
function bindMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const h = { play: () => music.play(), pause: () => music.pause(), previoustrack: () => music.prev(), nexttrack: () => music.next(), stop: () => music.stop(), seekto: d => music.seek(d.seekTime) };
  for (const [k, fn] of Object.entries(h)) { try { navigator.mediaSession.setActionHandler(k, fn); } catch {} }
}

function onPlayerState(e) {
  const YTS = window.YT.PlayerState;
  switch (e.data) {
    case YTS.PLAYING: S.errors = 0; S.userStopped = false; setState('playing'); tickStart(); break;
    case YTS.PAUSED: if (S.state !== 'stopped') setState('paused'); break;
    case YTS.BUFFERING: if (S.state !== 'playing') setState('loading'); break;
    case YTS.ENDED:
      if (S.repeat === 'one') { S.player.seekTo(0, true); S.player.playVideo(); }
      else music.next(true);
      break;
    case YTS.CUED: if (S.state === 'loading') setState('paused'); break;
  }
}

function onPlayerError(e) {
  // 2 bad id, 5 html5 error, 100 removed/private, 101/150 embedding disabled
  const t = cur(); if (t) S.bad.add(t.id);
  emit('error', { code: e.data, track: t });
  if (++S.errors > 12) { setState('stopped'); return; }
  setTimeout(() => music.next(true), 350);
}

function bindGesture() {
  if (S.gestureBound) return; S.gestureBound = true;
  const go = ev => {
    // Ignore gestures that are themselves music controls (they handle it).
    if (ev.target?.closest?.('[data-music-ctl]')) { off(); return; }
    off();
    if (S.autoplay && !S.userStopped && S.state !== 'playing') music.play();
  };
  const off = () => { ['pointerdown', 'keydown', 'touchend'].forEach(t => window.removeEventListener(t, go, true)); };
  ['pointerdown', 'keydown', 'touchend'].forEach(t => window.addEventListener(t, go, true));
}

function createPlayer() {
  const host = document.createElement('div');
  host.id = 'yt-host';
  // The player must be >=200x200 and "rendered" for playback; it sits invisibly behind the page.
  host.style.cssText = 'position:fixed;left:0;bottom:0;width:200px;height:200px;opacity:0.001;pointer-events:none;z-index:-1;overflow:hidden';
  const div = document.createElement('div'); host.appendChild(div); document.body.appendChild(host);
  const t = cur();
  const resume = store.get('music.resume', null);
  const start = resume && resume.id === t?.id ? Math.floor(resume.t || 0) : 0;
  S.player = new window.YT.Player(div, {
    width: 200, height: 200, videoId: t?.id,
    host: 'https://www.youtube-nocookie.com',
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, playsinline: 1, modestbranding: 1, start, origin: location.origin },
    events: {
      onReady: () => {
        S.ready = true;
        S.player.setVolume(S.volume); S.muted ? S.player.mute() : S.player.unMute();
        emit('ready'); emit('track', t);
        if (S.autoplay) {
          S.player.playVideo(); // succeeds if the browser allows autoplay with sound
          setTimeout(() => { if (S.state !== 'playing' && !S.userStopped) { setState('blocked'); bindGesture(); } }, 1200);
        } else setState('paused');
      },
      onStateChange: onPlayerState,
      onError: onPlayerError,
    },
  });
}

export const music = {
  on(ev, fn) { (listeners[ev] ||= []).push(fn); return () => { listeners[ev] = listeners[ev].filter(f => f !== fn); }; },
  get state() { return S.state; },
  get track() { return cur(); },
  get tracks() { return S.tracks; },
  get index() { return S.order[S.pos]; },
  get volume() { return S.volume; },
  get muted() { return S.muted; },
  get shuffle() { return S.shuffle; },
  get repeat() { return S.repeat; },
  get autoplay() { return S.autoplay; },
  get time() { return S.time; },
  get duration() { return S.duration; },
  get playlistId() { return PLAYLIST_ID; },
  isBad: id => S.bad.has(id),

  async init() {
    try {
      const res = await fetch('./data/playlist.json', { cache: 'no-cache' });
      const data = await res.json();
      S.tracks = data.tracks || [];
    } catch { S.tracks = []; }
    if (!S.tracks.length) { setState('stopped'); emit('empty'); return; }
    const resume = store.get('music.resume', null);
    const startId = (resume && S.tracks.some(t => t.id === resume.id)) ? resume.id : FIRST_TRACK;
    buildOrder(startId);
    emit('tracks', S.tracks); emit('track', cur()); emit('mode');
    setState('loading');
    bindMediaSession();
    try { await loadApi(); createPlayer(); updateMediaSession(); }
    catch { setState('stopped'); emit('blocked-api'); }
  },

  play() {
    if (!S.ready) { bindGesture(); return; }
    S.userStopped = false;
    if (S.state === 'stopped') S.player.loadVideoById(cur().id); else S.player.playVideo();
    setState('loading');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  },
  pause() {
    if (!S.ready) return;
    S.userStopped = true; S.player.pauseVideo(); setState('paused');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  },
  toggle() { (S.state === 'playing' || S.state === 'loading') && S.ready && S.state !== 'blocked' ? music.pause() : music.play(); },
  stop() {
    if (!S.ready) return;
    S.userStopped = true; S.player.stopVideo(); tickStop();
    S.time = 0; emit('time', { time: 0, duration: S.duration });
    setState('stopped');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
  },
  playAt(trackIndex) {
    const p = S.order.indexOf(trackIndex);
    if (p < 0) return;
    S.pos = p; music._load(true);
  },
  next(auto = false) {
    if (!S.tracks.length) return;
    if (S.pos >= S.order.length - 1) {
      if (auto && S.repeat === 'off') { music.stop(); return; }
      if (S.shuffle) buildOrder(); S.pos = 0;
    } else S.pos++;
    // skip known-bad entries quickly
    let guard = 0; while (S.bad.has(cur().id) && guard++ < S.order.length) S.pos = (S.pos + 1) % S.order.length;
    music._load(true);
  },
  prev() {
    if (!S.tracks.length) return;
    if (S.ready && S.time > 3) { music.seek(0); return; }
    S.pos = (S.pos - 1 + S.order.length) % S.order.length;
    music._load(true);
  },
  _load(autoplay) {
    const t = cur(); S.time = 0; S.duration = t.d || 0;
    emit('track', t); emit('time', { time: 0, duration: S.duration }); updateMediaSession();
    store.set('music.resume', { id: t.id, t: 0 });
    if (!S.ready) return;
    S.userStopped = false;
    if (autoplay) { S.player.loadVideoById(t.id); setState('loading'); } else S.player.cueVideoById(t.id);
  },
  seek(sec) { if (S.ready) { S.player.seekTo(Math.max(0, sec), true); S.time = sec; emit('time', { time: sec, duration: S.duration }); } },
  setVolume(v) {
    S.volume = Math.round(Math.max(0, Math.min(100, v))); store.set('music.vol', S.volume);
    if (S.ready) { S.player.setVolume(S.volume); if (S.muted && S.volume > 0) music.setMuted(false); }
    emit('volume', S.volume);
  },
  setMuted(m) { S.muted = !!m; store.set('music.muted', S.muted); if (S.ready) S.muted ? S.player.mute() : S.player.unMute(); emit('volume', S.volume); },
  toggleMute() { music.setMuted(!S.muted); },
  setShuffle(on) { S.shuffle = !!on; store.set('music.shuffle', S.shuffle); buildOrder(cur()?.id); emit('mode'); },
  cycleRepeat() { S.repeat = { all: 'one', one: 'off', off: 'all' }[S.repeat]; store.set('music.repeat', S.repeat); emit('mode'); },
  setAutoplay(on) { S.autoplay = !!on; store.set('music.autoplay', S.autoplay); emit('mode'); },
  upNext(n = 5) { const out = []; for (let i = 1; i <= n && i < S.order.length; i++) out.push(S.tracks[S.order[(S.pos + i) % S.order.length]]); return out; },
  get pulse() { return currentPulseData; },
};

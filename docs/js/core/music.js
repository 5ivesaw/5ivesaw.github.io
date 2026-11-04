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

// Hardware & Internal Loopback Real-Time Audio Capture
// Direct tab loopback (getDisplayMedia) + System Monitor / Mic (getUserMedia with voice DSP OFF)
let hardwareAudio = {
  active: false,
  ctx: null,
  analyser: null,
  dataArray: null,
  stream: null,
  mode: 'none', // 'tab' | 'device' | 'none'
  deviceId: null,
  deviceName: ''
};

export async function getAudioInputDevices() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  } catch (err) {
    console.warn('enumerateDevices error:', err);
    return [];
  }
}

export async function enableTabAudioLoopback() {
  disableHardwareAudio();
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      console.warn('getDisplayMedia not supported');
      return false;
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false
      },
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      systemAudio: 'include'
    });

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      stream.getTracks().forEach(t => t.stop());
      return false;
    }

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);
    // Crucial: do NOT connect to ctx.destination, otherwise audio plays twice!

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    hardwareAudio = {
      active: true,
      ctx,
      analyser,
      dataArray,
      stream,
      mode: 'tab',
      deviceId: null,
      deviceName: 'Tab Audio Loopback'
    };

    stream.getTracks().forEach(track => {
      track.addEventListener('ended', () => {
        if (hardwareAudio.mode === 'tab') {
          disableHardwareAudio();
        }
      });
    });

    startPulseLoop();
    emit('hardware-audio', { active: true, mode: 'tab', name: 'Tab Audio Loopback' });
    return true;
  } catch (err) {
    console.warn('Tab audio loopback error:', err);
    return false;
  }
}

export async function enableHardwareAudio(deviceId = null) {
  disableHardwareAudio();
  try {
    const constraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      },
      video: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let deviceName = 'Hardware Input';
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack && audioTrack.label) {
      deviceName = audioTrack.label;
    }

    hardwareAudio = {
      active: true,
      ctx,
      analyser,
      dataArray,
      stream,
      mode: 'device',
      deviceId,
      deviceName
    };

    stream.getTracks().forEach(track => {
      track.addEventListener('ended', () => {
        if (hardwareAudio.mode === 'device') {
          disableHardwareAudio();
        }
      });
    });

    startPulseLoop();
    emit('hardware-audio', { active: true, mode: 'device', name: deviceName, deviceId });
    return true;
  } catch (err) {
    console.warn('Hardware audio capture unavailable:', err);
    return false;
  }
}

export function disableHardwareAudio() {
  if (hardwareAudio.stream) {
    try { hardwareAudio.stream.getTracks().forEach(t => t.stop()); } catch {}
  }
  if (hardwareAudio.ctx) {
    try { hardwareAudio.ctx.close(); } catch {}
  }
  hardwareAudio = { active: false, ctx: null, analyser: null, dataArray: null, stream: null, mode: 'none', deviceId: null, deviceName: '' };
  emit('hardware-audio', { active: false, mode: 'none', name: '' });
}

export async function toggleHardwareAudio(preferredMode = 'tab', deviceId = null) {
  if (hardwareAudio.active) {
    disableHardwareAudio();
    return false;
  } else {
    if (preferredMode === 'tab') {
      const ok = await enableTabAudioLoopback();
      if (!ok) return await enableHardwareAudio(deviceId);
      return ok;
    } else {
      return await enableHardwareAudio(deviceId);
    }
  }
}

// Structural Energy Maps for Key Playlist Tracks (intros, verses, drops, solos)
const SONG_MAPS = {
  // Linkin Park - What I've Done (206s)
  'eXRWHzV72sU': {
    bpm: 120,
    offset: 0.1,
    getEnergy: t => {
      if (t < 16.4) return { kick: 0, snare: 0, hihat: 0, bass: 0.1, energy: 0.18, piano: 0.85 }; // Piano solo intro
      if (t < 32.5) return { kick: 0.85, snare: 0.8, hihat: 0.6, bass: 0.7, energy: 0.75, piano: 0.2 }; // Drum entrance
      if (t < 48.5) return { kick: 0.9, snare: 0.85, hihat: 0.75, bass: 0.8, energy: 0.88, piano: 0 }; // Rock guitar riff
      if (t < 64.5) return { kick: 0.5, snare: 0.6, hihat: 0.45, bass: 0.6, energy: 0.48, piano: 0 }; // Verse 1
      if (t < 80.5) return { kick: 0.7, snare: 0.75, hihat: 0.65, bass: 0.7, energy: 0.72, piano: 0 }; // Pre-chorus riser
      if (t < 104.5) return { kick: 1.25, snare: 1.15, hihat: 0.95, bass: 1.0, energy: 1.0, drop: true }; // CHORUS 1 DROP!
      if (t < 112.5) return { kick: 0.8, snare: 0.8, hihat: 0.6, bass: 0.8, energy: 0.8 }; // Post-chorus
      if (t < 128.5) return { kick: 0.55, snare: 0.6, hihat: 0.5, bass: 0.6, energy: 0.5 }; // Verse 2
      if (t < 144.5) return { kick: 0.75, snare: 0.8, hihat: 0.65, bass: 0.75, energy: 0.76 }; // Pre-chorus 2
      if (t < 168.5) return { kick: 1.25, snare: 1.15, hihat: 0.95, bass: 1.0, energy: 1.0, drop: true }; // CHORUS 2!
      if (t < 184.5) return { kick: 0.95, snare: 0.9, hihat: 0.85, bass: 0.85, energy: 0.92 }; // Guitar solo
      if (t < 200.0) return { kick: 1.3, snare: 1.2, hihat: 1.0, bass: 1.0, energy: 1.0, drop: true }; // Final chorus
      return { kick: 0, snare: 0, hihat: 0, bass: 0, energy: 0.1, piano: 0.6 }; // Outro piano fade
    }
  },
  // Three Days Grace - Riot (208s)
  'IGlg75esXws': {
    bpm: 145,
    offset: 0.0,
    getEnergy: t => {
      if (t < 13.0) return { kick: 0.3, snare: 0, hihat: 0, bass: 0.85, energy: 0.4 }; // Bass riff intro
      if (t < 26.0) return { kick: 1.15, snare: 1.05, hihat: 0.85, bass: 0.95, energy: 0.95 }; // Heavy intro
      if (t < 52.0) return { kick: 0.7, snare: 0.7, hihat: 0.6, bass: 0.75, energy: 0.65 }; // Verse 1
      if (t < 78.0) return { kick: 1.25, snare: 1.15, hihat: 0.95, bass: 1.0, energy: 1.0, drop: true }; // CHORUS RIOT!
      return { kick: 0.9, snare: 0.9, hihat: 0.8, bass: 0.85, energy: 0.85 };
    }
  },
  // Øneheart - snowfall (125s)
  'OtLcqr3RQJY': {
    bpm: 80,
    offset: 0.0,
    getEnergy: t => {
      // Pure ambient lo-fi: no harsh kicks, soft floating sub-bass
      return { kick: 0, snare: 0, hihat: 0.2, bass: 0.65, energy: 0.35, ambient: 0.9 };
    }
  },
  // The Weeknd - Blinding Lights (202s)
  'J7p4bzqLvCw': {
    bpm: 171,
    offset: 0.2,
    getEnergy: t => {
      if (t < 14.0) return { kick: 0, snare: 0, hihat: 0, bass: 0.4, energy: 0.3 }; // Synth intro
      if (t < 25.0) return { kick: 0.95, snare: 0.85, hihat: 0.75, bass: 0.8, energy: 0.85 }; // Four on the floor enters
      return { kick: 1.05, snare: 0.95, hihat: 0.85, bass: 0.9, energy: 0.95 };
    }
  }
};

function getGenericSongEnergy(t, duration) {
  if (!duration || duration <= 0) duration = 180;
  const progress = Math.max(0, Math.min(1, t / duration));

  let sectionEnergy = 0.55;
  let kickScale = 0.85;
  let snareScale = 0.8;
  let isDrop = false;

  if (progress < 0.07) {
    // Intro
    const introRamp = progress / 0.07;
    sectionEnergy = 0.18 + introRamp * 0.35;
    kickScale = introRamp * 0.4;
    snareScale = introRamp * 0.3;
  } else if (progress >= 0.22 && progress < 0.38) {
    // Chorus 1
    sectionEnergy = 0.95;
    kickScale = 1.15;
    snareScale = 1.05;
    isDrop = progress < 0.26;
  } else if (progress >= 0.52 && progress < 0.68) {
    // Chorus 2
    sectionEnergy = 1.0;
    kickScale = 1.2;
    snareScale = 1.1;
    isDrop = progress < 0.55;
  } else if (progress >= 0.68 && progress < 0.78) {
    // Breakdown
    sectionEnergy = 0.42;
    kickScale = 0.45;
    snareScale = 0.4;
  } else if (progress >= 0.78 && progress < 0.92) {
    // Final Climax Drop
    sectionEnergy = 1.05;
    kickScale = 1.25;
    snareScale = 1.15;
    isDrop = progress < 0.81;
  } else if (progress >= 0.92) {
    // Outro fade
    const fadeOut = (1 - progress) / 0.08;
    sectionEnergy = 0.3 * fadeOut;
    kickScale = 0.2 * fadeOut;
    snareScale = 0.2 * fadeOut;
  }

  return {
    energy: sectionEnergy,
    kick: kickScale,
    snare: snareScale,
    hihat: 0.7,
    bass: sectionEnergy * 0.85,
    drop: isDrop
  };
}

// Authentic Track Tempo & Rhythm Profile Engine
function getTrackProfile(track) {
  if (!track) return { bpm: 124, genre: 'rock', pattern: 'straight', kickPower: 1.1 };
  const str = `${track.t} ${track.a}`.toLowerCase();

  if (str.includes("what i've done")) return { bpm: 120, genre: 'rock', pattern: 'straight', kickPower: 1.15 };
  if (str.includes("riot")) return { bpm: 145, genre: 'metal', pattern: 'driving', kickPower: 1.25 };
  if (str.includes("fe!n") || str.includes("fein")) return { bpm: 148, genre: 'trap', pattern: 'trap', kickPower: 1.3 };
  if (str.includes("not like us")) return { bpm: 101, genre: 'hiphop', pattern: 'westcoast', kickPower: 1.2 };
  if (str.includes("blinding lights")) return { bpm: 171, genre: 'synthwave', pattern: 'fourfloor', kickPower: 1.1 };
  if (str.includes("hardstyle") || str.includes("jumpstyle")) return { bpm: 150, genre: 'hardstyle', pattern: 'fourfloor', kickPower: 1.4 };
  if (str.includes("snowfall") || str.includes("lo-fi") || str.includes("lofi")) return { bpm: 84, genre: 'lofi', pattern: 'chill', kickPower: 0.85 };
  if (str.includes("slowed") || str.includes("phonk")) return { bpm: 98, genre: 'phonk', pattern: 'slowed', kickPower: 1.3 };
  if (str.includes("seven nation army")) return { bpm: 124, genre: 'rock', pattern: 'stomper', kickPower: 1.3 };
  if (str.includes("all my fellas")) return { bpm: 132, genre: 'bounce', pattern: 'bounce', kickPower: 1.25 };

  if (str.includes("rock") || str.includes("metal") || str.includes("punk") || str.includes("slipknot") || str.includes("linkin park") || str.includes("korn") || str.includes("system of a down")) {
    return { bpm: 128, genre: 'rock', pattern: 'driving', kickPower: 1.2 };
  }
  if (str.includes("rap") || str.includes("hip hop") || str.includes("eminem") || str.includes("juice wrld") || str.includes("lil ")) {
    return { bpm: 96, genre: 'hiphop', pattern: 'trap', kickPower: 1.2 };
  }
  if (str.includes("acoustic") || str.includes("cohen") || str.includes("piano") || str.includes("quiet")) {
    return { bpm: 90, genre: 'acoustic', pattern: 'ballad', kickPower: 0.75 };
  }

  let hash = 0;
  for (let i = 0; i < (track.id || '').length; i++) {
    hash = (hash << 5) - hash + track.id.charCodeAt(i);
    hash |= 0;
  }
  const bpm = 100 + (Math.abs(hash) % 50);
  return { bpm, genre: 'pop', pattern: 'standard', kickPower: 1.05 };
}

let pulseAnim = null;
let pulsePhase = 0;
let lastYtTime = 0;
let lastYtPerfTime = performance.now();

const spectrumBands = new Float32Array(16);
const oscWaveform = new Float32Array(32);

let currentPulseData = {
  kick: 0,
  snare: 0,
  hihat: 0,
  bass: 0,
  energy: 0,
  phase: 0,
  bpm: 120,
  beat: 0,
  bar: 0,
  subdivision: 0,
  isPlaying: false,
  isHardwareLive: false,
  bands: spectrumBands,
  waveform: oscWaveform
};

function getAccuratePlaybackTime() {
  if (S.ready && S.player && typeof S.player.getCurrentTime === 'function') {
    try {
      const ytTime = S.player.getCurrentTime();
      if (typeof ytTime === 'number' && !isNaN(ytTime)) {
        const now = performance.now();
        if (Math.abs(ytTime - lastYtTime) > 0.02) {
          lastYtTime = ytTime;
          lastYtPerfTime = now;
          return ytTime;
        } else {
          const dt = (now - lastYtPerfTime) / 1000;
          if (dt < 0.4) {
            return lastYtTime + dt;
          }
        }
        return ytTime;
      }
    } catch {}
  }
  return 0;
}

function startPulseLoop() {
  if (pulseAnim) return;

  function loop() {
    // 1. If Hardware Live Audio (Mic/Speaker capture) is active:
    if (hardwareAudio.active && hardwareAudio.analyser) {
      hardwareAudio.analyser.getByteFrequencyData(hardwareAudio.dataArray);
      const arr = hardwareAudio.dataArray;

      // Extract literal frequency bands from actual sound waves
      const sub = (arr[0] + arr[1] + arr[2]) / (3 * 255);
      const bass = (arr[3] + arr[4] + arr[5] + arr[6]) / (4 * 255);
      const mid = (arr[10] + arr[11] + arr[12] + arr[13] + arr[14]) / (5 * 255);
      const treble = (arr[24] + arr[25] + arr[26] + arr[27]) / (4 * 255);
      const energy = (sub * 0.45 + bass * 0.35 + mid * 0.15 + treble * 0.05);

      for (let i = 0; i < 16; i++) {
        const idx = Math.min(arr.length - 1, Math.floor(i * (arr.length / 16)));
        spectrumBands[i] = arr[idx] / 255;
      }

      currentPulseData = {
        kick: sub > 0.35 ? sub : 0,
        snare: mid > 0.3 ? mid : 0,
        hihat: treble,
        bass,
        energy,
        phase: pulsePhase += 0.05,
        bpm: 120,
        beat: 0,
        bar: 0,
        subdivision: 0,
        isPlaying: true,
        isHardwareLive: true,
        bands: spectrumBands,
        waveform: oscWaveform
      };

      emit('pulse', currentPulseData);
      pulseAnim = requestAnimationFrame(loop);
      return;
    }

    // 2. YouTube Streaming Mode (Synchronized Timecode Engine)
    if (S.state === 'playing') {
      pulsePhase += 0.08;
      const track = cur();
      const profile = getTrackProfile(track);
      const bpm = profile.bpm;
      const beatPeriod = 60 / bpm;

      const t = getAccuratePlaybackTime();
      const beatTotal = t / beatPeriod;
      const bar = Math.floor(beatTotal / 4);
      const beatInBar = Math.floor(beatTotal) % 4;
      const subBeat = beatTotal % 1;
      const sixteenth = Math.floor((beatTotal * 4) % 16);
      const sixteenthSub = (beatTotal * 4) % 1;

      // Check specific track song map or generic energy
      const specificMap = track ? SONG_MAPS[track.id] : null;
      const songDynamic = specificMap ? specificMap.getEnergy(t) : getGenericSongEnergy(t, S.duration || track?.d || 180);

      // 1. Kick Trigger (faithful to song sections)
      let kickHit = 0;
      if (profile.pattern === 'fourfloor') {
        kickHit = Math.pow(Math.max(0, 1 - subBeat * 2.8), 2.2);
      } else if (profile.pattern === 'trap') {
        if (beatInBar === 0 || (beatInBar === 2 && sixteenth >= 8 && sixteenth <= 10)) {
          kickHit = Math.pow(Math.max(0, 1 - subBeat * 2.6), 2.2);
        }
      } else {
        if (beatInBar === 0 || beatInBar === 2) {
          kickHit = Math.pow(Math.max(0, 1 - subBeat * 2.7), 2.3);
        }
      }
      kickHit *= (songDynamic.kick !== undefined ? songDynamic.kick : 1.0) * profile.kickPower;

      // 2. Snare Trigger (Backbeat on 2 & 4, suppressed during piano/vocal intros)
      let snareHit = 0;
      if (beatInBar === 1 || beatInBar === 3) {
        snareHit = Math.pow(Math.max(0, 1 - subBeat * 3.1), 2.0);
      }
      snareHit *= (songDynamic.snare !== undefined ? songDynamic.snare : 1.0);

      // 3. Hi-Hat Shimmer
      const hihatHit = Math.pow(Math.max(0, 1 - sixteenthSub * 4.2), 1.6) * (songDynamic.hihat !== undefined ? songDynamic.hihat : 0.7);

      // 4. Drop boost
      if (songDynamic.drop) {
        kickHit *= 1.35;
      }

      // 5. Bassline Wave
      const bass = ((Math.sin(pulsePhase * 2.4) * 0.5 + 0.5) * 0.4 + kickHit * 0.6) * (songDynamic.bass !== undefined ? songDynamic.bass : 1.0);
      const energy = songDynamic.energy || (0.2 + kickHit * 0.45 + snareHit * 0.25);

      // 6. Multi-Band Spectrum Physics Simulation (16 bands)
      spectrumBands[0] = Math.max(spectrumBands[0] * 0.88, kickHit * 1.05 + bass * 0.4);
      spectrumBands[1] = Math.max(spectrumBands[1] * 0.87, kickHit * 0.95 + bass * 0.5);
      spectrumBands[2] = Math.max(spectrumBands[2] * 0.86, kickHit * 0.85 + bass * 0.6);

      spectrumBands[3] = Math.max(spectrumBands[3] * 0.84, kickHit * 0.7 + bass * 0.7);
      spectrumBands[4] = Math.max(spectrumBands[4] * 0.83, bass * 0.8 + snareHit * 0.4);
      spectrumBands[5] = Math.max(spectrumBands[5] * 0.82, bass * 0.7 + snareHit * 0.5);

      spectrumBands[6] = Math.max(spectrumBands[6] * 0.82, snareHit * 0.8 + (Math.sin(pulsePhase * 3) * 0.2 + 0.3) * energy);
      spectrumBands[7] = Math.max(spectrumBands[7] * 0.81, snareHit * 0.9 + (Math.cos(pulsePhase * 3.5) * 0.2 + 0.3) * energy);
      spectrumBands[8] = Math.max(spectrumBands[8] * 0.80, snareHit * 0.85 + (Math.sin(pulsePhase * 4) * 0.2 + 0.25) * energy);
      spectrumBands[9] = Math.max(spectrumBands[9] * 0.80, snareHit * 0.7 + hihatHit * 0.3);

      spectrumBands[10] = Math.max(spectrumBands[10] * 0.79, hihatHit * 0.6 + energy * 0.3);
      spectrumBands[11] = Math.max(spectrumBands[11] * 0.78, hihatHit * 0.7 + energy * 0.4);
      spectrumBands[12] = Math.max(spectrumBands[12] * 0.78, hihatHit * 0.8 + energy * 0.5);

      spectrumBands[13] = Math.max(spectrumBands[13] * 0.76, hihatHit * 0.95);
      spectrumBands[14] = Math.max(spectrumBands[14] * 0.75, hihatHit * 0.85);
      spectrumBands[15] = Math.max(spectrumBands[15] * 0.74, hihatHit * 0.75);

      // 7. Oscilloscope Waveform snapshot
      for (let i = 0; i < 32; i++) {
        oscWaveform[i] = (kickHit * Math.sin(i * 0.7) * 0.6) +
                         (snareHit * Math.cos(i * 1.4) * 0.4) +
                         (Math.sin(pulsePhase + i * 0.35) * 0.3 * energy);
      }

      currentPulseData = {
        kick: kickHit,
        snare: snareHit,
        hihat: hihatHit,
        bass,
        energy,
        phase: pulsePhase,
        bpm,
        beat: beatInBar,
        bar,
        subdivision: sixteenth,
        isPlaying: true,
        isHardwareLive: false,
        bands: spectrumBands,
        waveform: oscWaveform
      };

      emit('pulse', currentPulseData);
    } else {
      if (currentPulseData.isPlaying) {
        for (let i = 0; i < 16; i++) spectrumBands[i] = 0;
        for (let i = 0; i < 32; i++) oscWaveform[i] = 0;
        currentPulseData = {
          kick: 0,
          snare: 0,
          hihat: 0,
          bass: 0,
          energy: 0,
          phase: 0,
          bpm: 120,
          beat: 0,
          bar: 0,
          subdivision: 0,
          isPlaying: false,
          isHardwareLive: false,
          bands: spectrumBands,
          waveform: oscWaveform
        };
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
  get isHardwareLive() { return hardwareAudio.active; },
  get hardwareMode() { return hardwareAudio.mode; },
  get hardwareDeviceName() { return hardwareAudio.deviceName; },
  enableTabAudioLoopback,
  enableHardwareAudio,
  disableHardwareAudio,
  toggleHardwareAudio,
  getAudioInputDevices,
};

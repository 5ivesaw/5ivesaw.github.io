// Adapted from Sawbyte's disc_maker (5ivesaw/Sawbyte/docs/app.js).
// The composer and Vorbis export remain local to the browser. Its original
// Euclidean patterns, Markov pitch choices, Minecraft sound pools, and encoder
// are retained; the portal supplies its own controls and music-dock routing.
const SOUND_SHA1_CACHE = {};
const DECODED_BUFFER_CACHE = {};
const ALL_MINECRAFT_DISCS = [
  'item/music_disc_pigstep.png', 'item/music_disc_otherside.png',
  'item/music_disc_relic.png', 'item/music_disc_creator.png',
  'item/music_disc_creator_music_box.png', 'item/music_disc_precipice.png',
  'item/music_disc_5.png', 'item/music_disc_cat.png'
];
const listeners = new Map();
let audioCtx = null;
let masterGain = null;
let dmIconTimerId = null;
let dmInitialized = false;
let dmVolume = 45;
let dmMuted = false;
const dmSettings = {
  'dm-sound-pool-select': 'all_mc_random', 'dm-scale-select': 'phrygian',
  'dm-root-select': '0', 'dm-bpm-slider': '114', 'dm-swing-slider': '20',
  'dm-density-slider': '64', 'dm-consonance-slider': '84',
  'dm-harmonic-lock-slider': '88'
};
function readSetting(id, fallback) {
  const value = document.getElementById(id)?.value;
  if (value != null) dmSettings[id] = value;
  return value ?? dmSettings[id] ?? fallback;
}
const sfxEnabled = true;

function emit(type, value) {
  for (const fn of listeners.get(type) || []) fn(value);
}
function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    setMasterGain();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}
function setMasterGain() {
  if (masterGain) masterGain.gain.value = dmMuted ? 0 : (dmVolume / 100) * 0.8;
}
function getSoundUrls(path) {
  const clean = path.replace(/^\/+/, '');
  return [
    `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/sounds/${clean}`,
    `https://assets.mcasset.cloud/1.20.1/assets/minecraft/sounds/${clean}`
  ];
}
function getTextureUrls(path) {
  const clean = path.replace(/^\/+/, '');
  return [
    `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures/${clean}`,
    `https://assets.mcasset.cloud/1.21.4/assets/minecraft/textures/${clean}`
  ];
}
function attachMultiSourceImage(image, urls) {
  let index = 0;
  image.onerror = () => { if (index < urls.length) image.src = urls[index++]; };
  image.onerror();
}
function showAdvancementToast(title, detail) { emit('notice', `${title} ${detail}`); }
function playMcClick() {}
function preloadCurrentSamples() {
  [...dmTracks.slice(0, 4).map(track => track.sound),
    'note/bd.ogg', 'note/snare.ogg', 'note/hat.ogg', 'random/orb.ogg']
    .forEach(ensureSoundDecodedInCache);
}

// 5. 100% True Non-Hardcoded Stochastic disc_maker Composer & .OGG Disc Exporter
//    - Supports Total Random All-Minecraft-Sounds Mode (Mobs, Blocks, World, Items
//      & Dynamic Asset Index .ogg sounds — NOT restricted to Note Blocks!)
//    - Uses Bjorklund's Euclidean Algorithm E(k, 16, rotation) for rhythms
//    - Uses Markov Melodic Step-Walk + Consonance Gravity + Harmonic Pitch-Lock & Gate
//    - Exports genuine Xiph.org Ogg Vorbis I (.ogg) music discs & MC Resource Packs (.zip)
// ==============================================================================

const DM_SCALES = {
  phrygian: [0, 1, 4, 5, 7, 8, 10],    // Nether Phrygian Dominant
  dorian: [0, 2, 3, 5, 7, 9, 10],      // Aria Dorian Groove
  pentatonic: [0, 3, 5, 7, 10],        // Minor Pentatonic Funk
  lydian: [0, 2, 4, 6, 7, 9, 11],      // C418 Lydian Dream
  hirajoshi: [0, 2, 3, 7, 8],          // Cherry Blossom Hirajoshi
  mixolydian: [0, 2, 4, 5, 7, 9, 10]   // Upbeat Jam
};

// Classic Note Block Instruments (when placing a block under a Note Block)
const NOTEBLOCK_MELODIC_POOL = [
  { name: 'Note Pling', sound: 'note/pling.ogg', synth: 'square', timbre: 'pling', baseRate: 1.0, tex: 'block/glowstone.png', isNoteblock: true },
  { name: 'Chiptune Bit', sound: 'note/bit.ogg', synth: 'square', timbre: 'bit', baseRate: 1.0, tex: 'block/emerald_block.png', isNoteblock: true },
  { name: 'Bamboo Flute', sound: 'note/flute.ogg', synth: 'sine', timbre: 'flute', baseRate: 1.0, tex: 'item/bamboo.png', isNoteblock: true },
  { name: 'Iron Xylophone', sound: 'note/iron_xylophone.ogg', synth: 'triangle', timbre: 'xylophone', baseRate: 1.0, tex: 'item/iron_ingot.png', isNoteblock: true },
  { name: 'Bone Xylophone', sound: 'note/xylophone.ogg', synth: 'sine', timbre: 'xylophone', baseRate: 1.0, tex: 'item/bone.png', isNoteblock: true },
  { name: 'Hay Banjo', sound: 'note/banjo.ogg', synth: 'sawtooth', timbre: 'banjo', baseRate: 1.0, tex: 'item/wheat.png', isNoteblock: true }
];

const NOTEBLOCK_HARMONIC_POOL = [
  { name: 'Note Harp', sound: 'note/harp.ogg', synth: 'triangle', timbre: 'harp', baseRate: 1.0, tex: 'block/note_block.png', isNoteblock: true },
  { name: 'Wool Guitar', sound: 'note/guitar.ogg', synth: 'sawtooth', timbre: 'guitar', baseRate: 1.0, tex: 'block/white_wool.png', isNoteblock: true },
  { name: 'Ice Chime', sound: 'note/chime.ogg', synth: 'sine', timbre: 'chime', baseRate: 1.0, tex: 'item/amethyst_shard.png', isNoteblock: true },
  { name: 'Gold Bell', sound: 'note/bell.ogg', synth: 'sine', timbre: 'bell', baseRate: 1.0, tex: 'item/bell.png', isNoteblock: true }
];

const NOTEBLOCK_BASS_POOL = [
  { name: 'Wood Bass', sound: 'note/bass.ogg', synth: 'sawtooth', timbre: 'bass', baseRate: 1.0, tex: 'block/oak_log.png', isNoteblock: true },
  { name: 'Didgeridoo', sound: 'note/didgeridoo.ogg', synth: 'sawtooth', timbre: 'didgeridoo', baseRate: 1.0, tex: 'block/pumpkin_side.png', isNoteblock: true }
];

// Non-Noteblock Wild Minecraft Sounds (Mobs, Blocks, World, Items — Pitch-Quantized & ADSR-Gated!)
const WILD_MC_MELODIC_POOL = [
  { name: 'Amethyst Chime', sound: 'block/amethyst/chime1.ogg', synth: 'sine', timbre: 'amethyst', baseRate: 1.0, tex: 'item/amethyst_shard.png', isNoteblock: false },
  { name: 'Allay Song', sound: 'mob/allay/idle1.ogg', synth: 'sine', timbre: 'allay', baseRate: 1.05, tex: 'item/diamond.png', isNoteblock: false },
  { name: 'XP Orb Lead', sound: 'random/orb.ogg', synth: 'sine', timbre: 'orb', baseRate: 1.0, tex: 'item/experience_bottle.png', isNoteblock: false },
  { name: 'Enderman Warp', sound: 'mob/endermen/portal.ogg', synth: 'sawtooth', timbre: 'enderman', baseRate: 1.1, tex: 'item/ender_pearl.png', isNoteblock: false },
  { name: 'Cat Meow Synth', sound: 'mob/cat/meow1.ogg', synth: 'triangle', timbre: 'cat', baseRate: 1.0, tex: 'item/cod.png', isNoteblock: false },
  { name: 'Fox Squeak', sound: 'mob/fox/spit.ogg', synth: 'square', timbre: 'fox', baseRate: 1.1, tex: 'item/sweet_berries.png', isNoteblock: false },
  { name: 'Ghast Cry Lead', sound: 'mob/ghast/moan1.ogg', synth: 'sawtooth', timbre: 'ghast', baseRate: 0.95, tex: 'item/ghast_tear.png', isNoteblock: false },
  { name: 'LevelUp Fanfare', sound: 'random/levelup.ogg', synth: 'triangle', timbre: 'amethyst', baseRate: 1.0, tex: 'item/nether_star.png', isNoteblock: false },
  { name: 'Firework Twinkle', sound: 'fireworks/twinkle1.ogg', synth: 'sine', timbre: 'chime', baseRate: 1.15, tex: 'item/firework_rocket.png', isNoteblock: false }
];

const WILD_MC_HARMONIC_POOL = [
  { name: 'Villager Hmmm', sound: 'mob/villager/haggle1.ogg', synth: 'sawtooth', timbre: 'villager', baseRate: 1.0, tex: 'item/emerald.png', isNoteblock: false },
  { name: 'Portal Shimmer', sound: 'portal/portal.ogg', synth: 'sine', timbre: 'portal', baseRate: 1.0, tex: 'block/obsidian.png', isNoteblock: false },
  { name: 'Sculk Click', sound: 'block/sculk_sensor/sculk_clicking1.ogg', synth: 'triangle', timbre: 'sculk', baseRate: 1.1, tex: 'item/ender_eye.png', isNoteblock: false },
  { name: 'Glass Shatter', sound: 'random/glass1.ogg', synth: 'sine', timbre: 'glass', baseRate: 1.05, tex: 'block/glass.png', isNoteblock: false },
  { name: 'Bow String Pluck', sound: 'random/bow.ogg', synth: 'triangle', timbre: 'bow', baseRate: 1.0, tex: 'item/bow.png', isNoteblock: false },
  { name: 'Pig Oink Chord', sound: 'mob/pig/say1.ogg', synth: 'sawtooth', timbre: 'pig', baseRate: 1.0, tex: 'item/porkchop.png', isNoteblock: false },
  { name: 'Blaze Breathe', sound: 'mob/blaze/breathe1.ogg', synth: 'sawtooth', timbre: 'blaze', baseRate: 0.95, tex: 'item/blaze_rod.png', isNoteblock: false },
  { name: 'Totem Resonance', sound: 'item/totem/use_totem.ogg', synth: 'triangle', timbre: 'totem', baseRate: 1.0, tex: 'item/totem_of_undying.png', isNoteblock: false }
];

const WILD_MC_BASS_POOL = [
  { name: 'Anvil Drop Sub', sound: 'random/anvil_land.ogg', synth: 'square', timbre: 'anvil', baseRate: 0.72, tex: 'block/iron_block.png', isNoteblock: false },
  { name: 'Golem Hit Bass', sound: 'mob/irongolem/hit1.ogg', synth: 'sawtooth', timbre: 'golem', baseRate: 0.78, tex: 'item/iron_ingot.png', isNoteblock: false },
  { name: 'TNT Boom Sub', sound: 'random/explode1.ogg', synth: 'sawtooth', timbre: 'tnt', baseRate: 0.7, tex: 'block/tnt_side.png', isNoteblock: false },
  { name: 'Piston Thump', sound: 'tile/piston/out.ogg', synth: 'triangle', timbre: 'piston', baseRate: 0.82, tex: 'block/piston_side.png', isNoteblock: false },
  { name: 'Lava Pop Sub', sound: 'liquid/lavapop.ogg', synth: 'sine', timbre: 'lava', baseRate: 0.88, tex: 'item/lava_bucket.png', isNoteblock: false },
  { name: 'Slime Squish Bass', sound: 'mob/slime/big1.ogg', synth: 'triangle', timbre: 'slime', baseRate: 0.85, tex: 'item/slime_ball.png', isNoteblock: false },
  { name: 'Thunder Sub', sound: 'ambient/weather/thunder1.ogg', synth: 'sawtooth', timbre: 'tnt', baseRate: 0.72, tex: 'item/trident.png', isNoteblock: false }
];

const WILD_MC_FOLEY_KIT = [
  { fxType: 'orb', label: 'XP', name: 'XP Orb', sound: 'random/orb.ogg', tex: 'item/experience_bottle.png' },
  { fxType: 'pig', label: 'PIG', name: 'Pig Oink', sound: 'mob/pig/say1.ogg', tex: 'item/porkchop.png' },
  { fxType: 'anvil', label: 'ANV', name: 'Anvil Clang', sound: 'random/anvil_land.ogg', tex: 'block/iron_block.png' },
  { fxType: 'tnt', label: 'TNT', name: 'TNT Igniter', sound: 'random/fuse.ogg', tex: 'block/tnt_side.png' },
  { fxType: 'totem', label: 'TOT', name: 'Totem Pop', sound: 'item/totem/use_totem.ogg', tex: 'item/totem_of_undying.png' },
  { fxType: 'eat', label: 'EAT', name: 'Potato Crunch', sound: 'random/eat1.ogg', tex: 'item/baked_potato.png' },
  { fxType: 'ender', label: 'END', name: 'Ender Warp', sound: 'mob/endermen/portal.ogg', tex: 'item/ender_pearl.png' },
  { fxType: 'glass', label: 'GLS', name: 'Glass Clink', sound: 'random/glass1.ogg', tex: 'block/glass.png' }
];

const ALL_COMBINED_MELODIC_POOL = [...WILD_MC_MELODIC_POOL, ...NOTEBLOCK_MELODIC_POOL];
const ALL_COMBINED_HARMONIC_POOL = [...WILD_MC_HARMONIC_POOL, ...NOTEBLOCK_HARMONIC_POOL];
const ALL_COMBINED_BASS_POOL = [...WILD_MC_BASS_POOL, ...NOTEBLOCK_BASS_POOL];
const ALL_ANY_MC_VOICES = [...ALL_COMBINED_MELODIC_POOL, ...ALL_COMBINED_HARMONIC_POOL, ...ALL_COMBINED_BASS_POOL];

let dmTracks = [
  { id: 'lead', name: 'Amethyst Chime', tex: 'item/amethyst_shard.png', sound: 'block/amethyst/chime1.ogg', synthType: 'sine', timbre: 'amethyst', baseRate: 1.0, css: 'track-lead' },
  { id: 'arp', name: 'Villager Hmmm', tex: 'item/emerald.png', sound: 'mob/villager/haggle1.ogg', synthType: 'sawtooth', timbre: 'villager', baseRate: 1.0, css: 'track-arp' },
  { id: 'bell', name: 'Enderman Warp', tex: 'item/ender_pearl.png', sound: 'mob/endermen/portal.ogg', synthType: 'sawtooth', timbre: 'enderman', baseRate: 1.1, css: 'track-bell' },
  { id: 'bass', name: 'Anvil Drop Sub', tex: 'block/iron_block.png', sound: 'random/anvil_land.ogg', synthType: 'square', timbre: 'anvil', baseRate: 0.72, css: 'track-bass' },
  { id: 'drums', name: 'MC World Kit', tex: 'block/tnt_side.png', sound: 'note/bd.ogg', synthType: 'drum', timbre: 'drum', baseRate: 1.0, css: 'track-drums' },
  { id: 'fx', name: 'Any MC Foley', tex: 'item/experience_bottle.png', sound: 'random/orb.ogg', synthType: 'fx', timbre: 'fx', baseRate: 1.0, css: 'track-fx' }
];

let dmPlaying = false;
let dmAutoMutate = true;
let dmStep = 0;
let dmBar = 0;
let dmTimerId = null;
let dmCurrentChords = [0, 5, 2, 6];
let dmPattern = Array.from({ length: 6 }, () => Array(16).fill(null));
let lastExportedOggBlobUrl = null;

/**
 * Picks a dynamic random sound from the 1,000+ official Minecraft Asset Index entries in SOUND_SHA1_CACHE
 * when available, or from the curated wild Minecraft sound pools.
 */
function pickRandomMinecraftVoiceFromPool(role = 'melodic', poolMode = 'all_mc_random') {
  if (poolMode === 'noteblock_only') {
    if (role === 'bass') return NOTEBLOCK_BASS_POOL[Math.floor(Math.random() * NOTEBLOCK_BASS_POOL.length)];
    if (role === 'harmonic') return NOTEBLOCK_HARMONIC_POOL[Math.floor(Math.random() * NOTEBLOCK_HARMONIC_POOL.length)];
    return NOTEBLOCK_MELODIC_POOL[Math.floor(Math.random() * NOTEBLOCK_MELODIC_POOL.length)];
  }

  // Try occasionally sampling a brand-new sound path from SOUND_SHA1_CACHE (the full Minecraft asset index)
  const shaKeys = Object.keys(SOUND_SHA1_CACHE);
  if (shaKeys.length > 25 && Math.random() < 0.28) {
    const filtered = shaKeys.filter((k) => !k.includes('records/') && !k.includes('music/') && !k.includes('ambient/cave'));
    if (filtered.length > 0) {
      const chosenKey = filtered[Math.floor(Math.random() * filtered.length)];
      const relPath = chosenKey.replace(/^minecraft\/sounds\//, '');
      const parts = relPath.replace('.ogg', '').split('/');
      const shortLabel = parts.slice(-2).join('/').slice(0, 15);
      // Asynchronously warm the buffer cache for this asset-index sound
      ensureSoundDecodedInCache(relPath);
      const fallbackTimbres = ['amethyst', 'villager', 'enderman', 'cat', 'anvil', 'piston', 'slime', 'glass'];
      const fallbackTextures = [
        'item/amethyst_shard.png', 'item/ender_pearl.png', 'item/emerald.png',
        'block/tnt_side.png', 'item/blaze_rod.png', 'item/slime_ball.png', 'item/totem_of_undying.png'
      ];
      return {
        name: `MC: ${shortLabel}`,
        sound: relPath,
        synth: role === 'bass' ? 'sawtooth' : 'triangle',
        timbre: fallbackTimbres[Math.floor(Math.random() * fallbackTimbres.length)],
        baseRate: role === 'bass' ? 0.78 : 1.0,
        tex: fallbackTextures[Math.floor(Math.random() * fallbackTextures.length)],
        isNoteblock: false
      };
    }
  }

  if (poolMode === 'pure_non_noteblock' || poolMode === 'per_note_chaos') {
    if (role === 'bass') return WILD_MC_BASS_POOL[Math.floor(Math.random() * WILD_MC_BASS_POOL.length)];
    if (role === 'harmonic') return WILD_MC_HARMONIC_POOL[Math.floor(Math.random() * WILD_MC_HARMONIC_POOL.length)];
    return WILD_MC_MELODIC_POOL[Math.floor(Math.random() * WILD_MC_MELODIC_POOL.length)];
  }

  // Default 'all_mc_random': combines all wild Minecraft game sounds + Note Block instruments
  if (role === 'bass') return ALL_COMBINED_BASS_POOL[Math.floor(Math.random() * ALL_COMBINED_BASS_POOL.length)];
  if (role === 'harmonic') return ALL_COMBINED_HARMONIC_POOL[Math.floor(Math.random() * ALL_COMBINED_HARMONIC_POOL.length)];
  return ALL_COMBINED_MELODIC_POOL[Math.floor(Math.random() * ALL_COMBINED_MELODIC_POOL.length)];
}

function ensureSoundDecodedInCache(relPath) {
  if (!relPath || DECODED_BUFFER_CACHE[relPath]) return;
  const urls = getSoundUrls(relPath);
  (async () => {
    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (!res.ok) continue;
        const arr = await res.arrayBuffer();
        const ctx = ensureAudioCtx();
        if (ctx) {
          const buf = await ctx.decodeAudioData(arr);
          DECODED_BUFFER_CACHE[relPath] = buf;
          break;
        }
      } catch (_) {}
    }
  })();
}

/**
 * Bjorklund's Euclidean Rhythm Generator E(pulses, steps, rotation)
 */
function generateEuclideanRhythm(pulses, steps, rotation = 0) {
  const k = Math.max(0, Math.min(steps, Math.round(pulses)));
  const pattern = new Array(steps).fill(false);
  if (k === 0) return pattern;
  for (let i = 0; i < steps; i++) {
    if (((i * k) % steps) < k) {
      pattern[(i + rotation) % steps] = true;
    }
  }
  return pattern;
}

/**
 * Markov + Consonance-Gravity Pitch Picker
 */
function pickStochasticScaleDegree(prevDegree, isStrongBeat, consonanceWeight) {
  const candidates = [0, 1, 2, 3, 4, 5, 6];
  const weights = candidates.map((deg) => {
    const isChordTone = deg === 0 || deg === 2 || deg === 4;
    const dist = Math.abs(deg - prevDegree);
    const proximityScore = 1 / (1 + dist * 0.75);
    const harmonicScore = isChordTone
      ? (isStrongBeat ? consonanceWeight * 4.5 : consonanceWeight * 2.2)
      : (1 - consonanceWeight * 0.7) * 1.8;
    return proximityScore * harmonicScore;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return 0;
}

function initDiscMakerStudio() {
  dmIconTimerId = setInterval(() => {
    const randomDiscTex = ALL_MINECRAFT_DISCS[Math.floor(Math.random() * ALL_MINECRAFT_DISCS.length)];
    document.querySelectorAll('.disc-maker-cycling-icon').forEach((img) => {
      attachMultiSourceImage(img, getTextureUrls(randomDiscTex));
    });
    const targetDiscSel = document.getElementById('dm-target-disc-select');
    const chosenDisc = targetDiscSel ? targetDiscSel.value : randomDiscTex.replace('item/music_disc_', '').replace('.png', '');
    const poolSelect = document.getElementById('dm-sound-pool-select');
    const poolLabel = poolSelect ? poolSelect.options[poolSelect.selectedIndex]?.text.split('(')[0].trim() : 'Total Random';
    const readout = document.getElementById('dm-active-disc-label');
    if (readout) {
      readout.textContent = `Target Disc: ${chosenDisc}.ogg • Mode: ${poolLabel}`;
    }
  }, 1500);

  buildSequencerDOM();
  renderSequencerGridUI();

  const playBtn = document.getElementById('dm-play-btn');
  const turntableBtn = document.getElementById('dm-turntable-btn');
  const randBtn = document.getElementById('dm-randomize-btn');
  const mutateBtn = document.getElementById('dm-mutate-btn');
  const bpmSlider = document.getElementById('dm-bpm-slider');
  const swingSlider = document.getElementById('dm-swing-slider');
  const densitySlider = document.getElementById('dm-density-slider');
  const consonanceSlider = document.getElementById('dm-consonance-slider');
  const harmonicLockSlider = document.getElementById('dm-harmonic-lock-slider');
  const scaleSelect = document.getElementById('dm-scale-select');
  const rootSelect = document.getElementById('dm-root-select');
  const poolSelect = document.getElementById('dm-sound-pool-select');
  const targetDiscSelect = document.getElementById('dm-target-disc-select');
  const exportOggBtn = document.getElementById('dm-export-ogg-btn');
  const exportPackBtn = document.getElementById('dm-export-pack-btn');

  const toggleStudioPlay = () => {
    if (dmPlaying) stopDiscMaker();
    else { preloadCurrentSamples(); startDiscMaker(); }
  };

  if (playBtn) playBtn.addEventListener('click', toggleStudioPlay);
  if (turntableBtn) turntableBtn.addEventListener('click', toggleStudioPlay);

  if (randBtn) {
    randBtn.addEventListener('click', () => {
      randomizeAllStudioParameters();
      generateStochasticMusicalPattern(true);
      preloadCurrentSamples();
      if (!dmPlaying) startDiscMaker();
      showAdvancementToast('disc_maker Randomized!', `${dmTracks[0].name} + ${dmTracks[1].name} + ${dmTracks[3].name}`, 'item/music_disc_creator.png');
    });
  }

  if (mutateBtn) {
    mutateBtn.addEventListener('click', () => {
      dmAutoMutate = !dmAutoMutate;
      const lbl = document.getElementById('dm-mutate-label');
      if (lbl) lbl.textContent = `Live Mutate: ${dmAutoMutate ? 'ON' : 'OFF'}`;
      playMcClick(1.1);
    });
  }

  if (bpmSlider) {
    bpmSlider.addEventListener('input', (e) => {
      const el = document.getElementById('dm-bpm-val');
      if (el) el.textContent = `${e.target.value} BPM`;
    });
  }
  if (swingSlider) {
    swingSlider.addEventListener('input', (e) => {
      const el = document.getElementById('dm-swing-val');
      if (el) el.textContent = `${e.target.value}%`;
    });
  }
  if (consonanceSlider) {
    consonanceSlider.addEventListener('input', (e) => {
      const el = document.getElementById('dm-consonance-val');
      if (el) el.textContent = `${e.target.value}%`;
      generateStochasticMusicalPattern(false);
    });
  }
  if (harmonicLockSlider) {
    harmonicLockSlider.addEventListener('input', (e) => {
      const el = document.getElementById('dm-harmonic-lock-val');
      if (el) el.textContent = `${e.target.value}%`;
    });
  }
  if (densitySlider) {
    densitySlider.addEventListener('input', (e) => {
      const el = document.getElementById('dm-density-val');
      if (el) el.textContent = `${e.target.value}%`;
      generateStochasticMusicalPattern(false);
    });
  }
  if (scaleSelect) scaleSelect.addEventListener('change', () => generateStochasticMusicalPattern(false));
  if (rootSelect) rootSelect.addEventListener('change', () => generateStochasticMusicalPattern(false));
  if (poolSelect) {
    poolSelect.addEventListener('change', () => {
      generateStochasticMusicalPattern(true);
      showAdvancementToast('Sound Palette Updated', poolSelect.options[poolSelect.selectedIndex].text, 'block/note_block.png');
    });
  }

  if (targetDiscSelect) {
    targetDiscSelect.addEventListener('change', () => {
      const disc = targetDiscSelect.value || 'pigstep';
      const lbl = document.getElementById('dm-export-ogg-label');
      if (lbl) lbl.textContent = `EXPORT .OGG DISC (${disc}.ogg)`;
    });
  }

  if (exportOggBtn) {
    exportOggBtn.addEventListener('click', () => {
      exportDiscMakerAsOggFile(false);
    });
  }

  if (exportPackBtn) {
    exportPackBtn.addEventListener('click', () => {
      exportDiscMakerAsOggFile(true);
    });
  }

  window.startDiscMakerFromConsole = () => {
    randomizeAllStudioParameters();
    generateStochasticMusicalPattern(true);
    startDiscMaker();
  };
}

function buildSequencerDOM() {
  const gridContainer = document.getElementById('dm-sequencer-grid');
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  dmTracks.forEach((track, tIdx) => {
    const row = document.createElement('div');
    row.className = 'sequencer-row';

    const label = document.createElement('div');
    label.className = 'seq-track-label';
    label.style.cursor = 'pointer';
    label.title = 'Click to roll a new random Minecraft sound for this track';
    label.addEventListener('click', () => {
      if (tIdx < 4) {
        const poolMode = readSetting('dm-sound-pool-select', 'all_mc_random');
        const role = tIdx === 3 ? 'bass' : (tIdx === 0 ? 'melodic' : 'harmonic');
        const v = pickRandomMinecraftVoiceFromPool(role, poolMode);
        dmTracks[tIdx] = { ...dmTracks[tIdx], name: v.name, sound: v.sound, synthType: v.synth, timbre: v.timbre, baseRate: v.baseRate || 1.0, tex: v.tex };
        const iconEl = document.getElementById(`seq-track-icon-${tIdx}`);
        const nameEl = document.getElementById(`seq-track-name-${tIdx}`);
        if (iconEl) attachMultiSourceImage(iconEl, getTextureUrls(v.tex));
        if (nameEl) nameEl.textContent = v.name;
        playQuantizedMinecraftNote(dmTracks[tIdx], 0);
      }
    });

    const icon = document.createElement('img');
    icon.className = 'mc-png mc-png-sm';
    icon.id = `seq-track-icon-${tIdx}`;
    attachMultiSourceImage(icon, getTextureUrls(track.tex));
    const text = document.createElement('span');
    text.className = 'mc-f';
    text.id = `seq-track-name-${tIdx}`;
    text.textContent = track.name;
    label.appendChild(icon);
    label.appendChild(text);
    row.appendChild(label);

    for (let s = 0; s < 16; s++) {
      const cell = document.createElement('div');
      cell.className = `seq-cell ${s % 4 === 0 ? 'beat-marker' : ''} ${track.css}`;
      cell.dataset.track = String(tIdx);
      cell.dataset.step = String(s);

      cell.addEventListener('click', () => {
        toggleSequencerCell(tIdx, s);
        playMcClick(1.2);
      });

      row.appendChild(cell);
    }
    gridContainer.appendChild(row);
  });
}

function randomizeAllStudioParameters() {
  const scaleSelect = document.getElementById('dm-scale-select');
  const rootSelect = document.getElementById('dm-root-select');
  const bpmSlider = document.getElementById('dm-bpm-slider');
  const swingSlider = document.getElementById('dm-swing-slider');
  const densitySlider = document.getElementById('dm-density-slider');
  const consonanceSlider = document.getElementById('dm-consonance-slider');
  const harmonicLockSlider = document.getElementById('dm-harmonic-lock-slider');

  if (scaleSelect) scaleSelect.selectedIndex = Math.floor(Math.random() * scaleSelect.options.length);
  if (rootSelect) rootSelect.selectedIndex = Math.floor(Math.random() * rootSelect.options.length);

  const randomBpm = Math.floor(96 + Math.random() * 42);
  const randomSwing = Math.floor(8 + Math.random() * 24);
  const randomDensity = Math.floor(48 + Math.random() * 36);
  const randomConsonance = Math.floor(74 + Math.random() * 22);
  const randomHarmonicLock = Math.floor(78 + Math.random() * 20);

  if (bpmSlider) {
    bpmSlider.value = String(randomBpm);
    const el = document.getElementById('dm-bpm-val');
    if (el) el.textContent = `${randomBpm} BPM`;
  }
  if (swingSlider) {
    swingSlider.value = String(randomSwing);
    const el = document.getElementById('dm-swing-val');
    if (el) el.textContent = `${randomSwing}%`;
  }
  if (densitySlider) {
    densitySlider.value = String(randomDensity);
    const el = document.getElementById('dm-density-val');
    if (el) el.textContent = `${randomDensity}%`;
  }
  if (consonanceSlider) {
    consonanceSlider.value = String(randomConsonance);
    const el = document.getElementById('dm-consonance-val');
    if (el) el.textContent = `${randomConsonance}%`;
  }
  if (harmonicLockSlider) {
    harmonicLockSlider.value = String(randomHarmonicLock);
    const el = document.getElementById('dm-harmonic-lock-val');
    if (el) el.textContent = `${randomHarmonicLock}%`;
  }
}

/**
 * 100% Stochastic Pattern Generator supporting Any Minecraft Sound!
 */
function generateStochasticMusicalPattern(randomizeVoices = false) {
  const poolMode = readSetting('dm-sound-pool-select', 'all_mc_random');

  if (randomizeVoices) {
    const leadVoice = pickRandomMinecraftVoiceFromPool('melodic', poolMode);
    const arpVoice = pickRandomMinecraftVoiceFromPool('harmonic', poolMode);
    const bellVoice = pickRandomMinecraftVoiceFromPool('melodic', poolMode);
    const bassVoice = pickRandomMinecraftVoiceFromPool('bass', poolMode);

    dmTracks[0] = { ...dmTracks[0], name: leadVoice.name, sound: leadVoice.sound, synthType: leadVoice.synth, timbre: leadVoice.timbre, baseRate: leadVoice.baseRate || 1.0, tex: leadVoice.tex };
    dmTracks[1] = { ...dmTracks[1], name: arpVoice.name, sound: arpVoice.sound, synthType: arpVoice.synth, timbre: arpVoice.timbre, baseRate: arpVoice.baseRate || 1.0, tex: arpVoice.tex };
    dmTracks[2] = { ...dmTracks[2], name: bellVoice.name, sound: bellVoice.sound, synthType: bellVoice.synth, timbre: bellVoice.timbre, baseRate: bellVoice.baseRate || 1.0, tex: bellVoice.tex };
    dmTracks[3] = { ...dmTracks[3], name: bassVoice.name, sound: bassVoice.sound, synthType: bassVoice.synth, timbre: bassVoice.timbre, baseRate: bassVoice.baseRate || 1.0, tex: bassVoice.tex };

    for (let i = 0; i < 4; i++) {
      const iconEl = document.getElementById(`seq-track-icon-${i}`);
      const nameEl = document.getElementById(`seq-track-name-${i}`);
      if (iconEl) attachMultiSourceImage(iconEl, getTextureUrls(dmTracks[i].tex));
      if (nameEl) nameEl.textContent = dmTracks[i].name;
    }
  }

  const chordPool = [1, 2, 3, 4, 5, 6];
  dmCurrentChords = [
    0,
    chordPool[Math.floor(Math.random() * chordPool.length)],
    chordPool[Math.floor(Math.random() * chordPool.length)],
    chordPool[Math.floor(Math.random() * chordPool.length)]
  ];

  const density = (parseInt(readSetting('dm-density-slider', '64'), 10) || 64) / 100;
  const consonance = (parseInt(readSetting('dm-consonance-slider', '84'), 10) || 84) / 100;

  const leadPulses = Math.max(4, Math.min(12, Math.round(density * 11 + (Math.random() * 3 - 1.5))));
  const arpPulses = Math.max(5, Math.min(13, Math.round(density * 12 + (Math.random() * 3 - 1.5))));
  const bellPulses = Math.max(2, Math.min(7, Math.round(density * 5 + Math.random() * 2)));
  const bassPulses = Math.max(4, Math.min(9, Math.round(density * 8 + Math.random() * 2)));
  const kickPulses = Math.max(3, Math.min(6, Math.round(3 + density * 3)));
  const hatPulses = Math.max(5, Math.min(14, Math.round(density * 13)));
  const foleyPulses = Math.max(2, Math.min(6, Math.round(2 + density * 4)));

  const leadEuc = generateEuclideanRhythm(leadPulses, 16, Math.floor(Math.random() * 4));
  const arpEuc = generateEuclideanRhythm(arpPulses, 16, Math.floor(Math.random() * 4));
  const bellEuc = generateEuclideanRhythm(bellPulses, 16, Math.floor(Math.random() * 8));
  const bassEuc = generateEuclideanRhythm(bassPulses, 16, 0);
  const kickEuc = generateEuclideanRhythm(kickPulses, 16, 0);
  const hatEuc = generateEuclideanRhythm(hatPulses, 16, Math.floor(Math.random() * 2));
  const foleyEuc = generateEuclideanRhythm(foleyPulses, 16, Math.floor(Math.random() * 5));

  const newPat = Array.from({ length: 6 }, () => Array(16).fill(null));
  let prevLeadDeg = 0;
  let prevArpDeg = 2;

  for (let s = 0; s < 16; s++) {
    const isStrongBeat = s % 4 === 0;
    const isBackbeat = s % 8 === 4;

    if (leadEuc[s]) {
      const deg = pickStochasticScaleDegree(prevLeadDeg, isStrongBeat, consonance);
      prevLeadDeg = deg;
      const oct = Math.random() < 0.22 ? 1 : 0;
      const stepVoice = poolMode === 'per_note_chaos' ? pickRandomMinecraftVoiceFromPool('melodic', 'all_mc_random') : null;
      newPat[0][s] = { degree: deg, octave: oct, label: stepVoice ? stepVoice.name.slice(0, 2).toUpperCase() : String(deg + 1), customVoice: stepVoice };
    }

    if (arpEuc[s]) {
      const deg = pickStochasticScaleDegree(prevArpDeg, true, Math.min(0.98, consonance + 0.1));
      prevArpDeg = deg;
      const stepVoice = poolMode === 'per_note_chaos' ? pickRandomMinecraftVoiceFromPool('harmonic', 'all_mc_random') : null;
      newPat[1][s] = { degree: deg, octave: 0, label: stepVoice ? stepVoice.name.slice(0, 2).toUpperCase() : String(deg + 1), customVoice: stepVoice };
    }

    if (bellEuc[s]) {
      const deg = pickStochasticScaleDegree(4, true, 0.92);
      const stepVoice = poolMode === 'per_note_chaos' ? pickRandomMinecraftVoiceFromPool('melodic', 'all_mc_random') : null;
      newPat[2][s] = { degree: deg, octave: 1, label: stepVoice ? stepVoice.name.slice(0, 2).toUpperCase() : '★', customVoice: stepVoice };
    }

    if (bassEuc[s]) {
      const deg = isStrongBeat || Math.random() < consonance ? 0 : 4;
      const stepVoice = poolMode === 'per_note_chaos' ? pickRandomMinecraftVoiceFromPool('bass', 'all_mc_random') : null;
      newPat[3][s] = { degree: deg, octave: -1, label: deg === 0 ? 'R' : '5', customVoice: stepVoice };
    }

    if (isBackbeat) {
      newPat[4][s] = { drumType: 'snare', label: 'S' };
    } else if (kickEuc[s]) {
      newPat[4][s] = { drumType: 'kick', label: 'K' };
    } else if (hatEuc[s]) {
      newPat[4][s] = { drumType: 'hat', label: 'H' };
    }

    if (foleyEuc[s] && (poolMode !== 'noteblock_only' || isStrongBeat)) {
      const foleyItem = WILD_MC_FOLEY_KIT[Math.floor(Math.random() * WILD_MC_FOLEY_KIT.length)];
      const deg = pickStochasticScaleDegree(0, true, 0.9);
      newPat[5][s] = { fxType: foleyItem.fxType, sound: foleyItem.sound, degree: deg, label: foleyItem.label };
    }
  }

  dmPattern = newPat;
  renderSequencerGridUI();
  emit('pattern', dmTracks);
}

function toggleSequencerCell(tIdx, sIdx) {
  if (dmPattern[tIdx][sIdx]) {
    dmPattern[tIdx][sIdx] = null;
  } else {
    if (tIdx === 4) {
      dmPattern[tIdx][sIdx] = { drumType: sIdx % 4 === 0 ? 'kick' : 'snare', label: sIdx % 4 === 0 ? 'K' : 'S' };
    } else if (tIdx === 5) {
      const foleyItem = WILD_MC_FOLEY_KIT[Math.floor(Math.random() * WILD_MC_FOLEY_KIT.length)];
      dmPattern[tIdx][sIdx] = { fxType: foleyItem.fxType, sound: foleyItem.sound, degree: 0, label: foleyItem.label };
    } else {
      const deg = pickStochasticScaleDegree(0, sIdx % 4 === 0, 0.85);
      dmPattern[tIdx][sIdx] = { degree: deg, octave: tIdx === 3 ? -1 : 0, label: String(deg + 1) };
    }
  }
  renderSequencerGridUI();
}

function renderSequencerGridUI() {
  document.querySelectorAll('#dm-sequencer-grid .seq-cell').forEach((cell) => {
    const t = parseInt(cell.dataset.track, 10);
    const s = parseInt(cell.dataset.step, 10);
    const data = dmPattern[t]?.[s];
    cell.classList.toggle('active-step', Boolean(data));
    cell.textContent = data ? (data.label || '●') : '';
  });
}

function startDiscMaker() {
  if (dmPlaying) return;
  ensureAudioCtx();
  dmPlaying = true;
  emit('state', 'playing');

  const playLabel = document.getElementById('dm-play-label');
  const badge = document.getElementById('dm-status-badge');
  const mainDisc = document.getElementById('dm-main-disc-icon');
  if (playLabel) playLabel.textContent = 'PAUSE COMPOSER';
  if (badge) badge.textContent = 'COMPOSING LIVE';
  if (mainDisc) mainDisc.classList.add('disc-spinning');

  scheduleNextDiscMakerStep();
}

function stopDiscMaker() {
  dmPlaying = false;
  emit('state', 'paused');
  if (dmTimerId) {
    clearTimeout(dmTimerId);
    dmTimerId = null;
  }
  const playLabel = document.getElementById('dm-play-label');
  const badge = document.getElementById('dm-status-badge');
  const mainDisc = document.getElementById('dm-main-disc-icon');
  if (playLabel) playLabel.textContent = 'PLAY COMPOSER';
  if (badge) badge.textContent = 'PAUSED';
  if (mainDisc) mainDisc.classList.remove('disc-spinning');

  document.querySelectorAll('#dm-sequencer-grid .seq-cell.playhead-now').forEach((c) => {
    c.classList.remove('playhead-now');
  });
}

function scheduleNextDiscMakerStep() {
  if (!dmPlaying) return;

  const bpm = parseInt(readSetting('dm-bpm-slider', '114'), 10) || 114;
  const swingPct = (parseInt(readSetting('dm-swing-slider', '20'), 10) || 20) / 100;

  const sixteenthMs = (60000 / bpm) / 4;
  const currentStepDuration = (dmStep % 2 === 0)
    ? sixteenthMs * (1 + swingPct * 0.5)
    : sixteenthMs * (1 - swingPct * 0.5);

  playDiscMakerStep(dmStep, dmBar);
  emit('step', { step: dmStep, bar: dmBar });

  dmStep++;
  if (dmStep >= 16) {
    dmStep = 0;
    dmBar = (dmBar + 1) % 4;
    if (dmBar === 0 && dmAutoMutate) {
      generateStochasticMusicalPattern(Math.random() < 0.45);
    }
  }

  dmTimerId = setTimeout(scheduleNextDiscMakerStep, currentStepDuration);
}

function playDiscMakerStep(stepIdx, barIdx) {
  document.querySelectorAll('#dm-sequencer-grid .seq-cell').forEach((cell) => {
    const s = parseInt(cell.dataset.step, 10);
    cell.classList.toggle('playhead-now', s === stepIdx);
  });

  const scaleKey = readSetting('dm-scale-select', 'phrygian');
  const scale = DM_SCALES[scaleKey] || DM_SCALES.phrygian;
  const rootOffset = parseInt(readSetting('dm-root-select', '0'), 10) || 0;
  const activeChordDegree = dmCurrentChords[barIdx % dmCurrentChords.length] || 0;

  const readout = document.getElementById('dm-chord-readout');
  if (readout) {
    readout.textContent = `Bar ${barIdx + 1}/4 • Chord Root: +${activeChordDegree} • Step ${stepIdx + 1}/16 • Pitch-Locked`;
  }

  for (let t = 0; t < dmTracks.length; t++) {
    const cellData = dmPattern[t][stepIdx];
    if (!cellData) continue;
    const baseTrack = dmTracks[t];
    const activeVoice = cellData.customVoice ? { ...baseTrack, ...cellData.customVoice, synthType: cellData.customVoice.synth } : baseTrack;

    if (baseTrack.id === 'drums') {
      playComposerDrum(cellData.drumType);
    } else if (baseTrack.id === 'fx') {
      const foleySemi = rootOffset + (scale[(activeChordDegree + (cellData.degree || 0)) % scale.length] || 0);
      playComposerFoley(cellData.fxType, foleySemi, cellData.sound);
    } else {
      const totalDegree = activeChordDegree + (cellData.degree || 0);
      const scaleLen = scale.length;
      const octaveFromDegree = Math.floor(totalDegree / scaleLen);
      const scaleSemitone = scale[((totalDegree % scaleLen) + scaleLen) % scaleLen];
      const semitoneOffset = rootOffset + scaleSemitone + (octaveFromDegree + (cellData.octave || 0)) * 12;

      playQuantizedMinecraftNote(activeVoice, semitoneOffset);
    }
  }
}

function preloadNoteBlockSamples() {
  const paths = [
    'note/pling.ogg', 'note/harp.ogg', 'note/bell.ogg', 'note/bass.ogg',
    'note/bit.ogg', 'note/flute.ogg', 'note/guitar.ogg', 'note/chime.ogg',
    'note/xylophone.ogg', 'note/iron_xylophone.ogg', 'note/banjo.ogg', 'note/didgeridoo.ogg',
    'note/bd.ogg', 'note/snare.ogg', 'note/hat.ogg',
    'random/orb.ogg', 'mob/pig/say1.ogg', 'random/anvil_land.ogg',
    'mob/endermen/portal.ogg', 'mob/cat/meow1.ogg', 'mob/villager/haggle1.ogg',
    'random/glass1.ogg', 'random/bow.ogg', 'liquid/lavapop.ogg',
    'mob/slime/big1.ogg', 'random/explode1.ogg', 'item/totem/use_totem.ogg',
    'random/eat1.ogg', 'random/levelup.ogg', 'fireworks/twinkle1.ogg'
  ];

  paths.forEach((p) => ensureSoundDecodedInCache(p));
}

function playQuantizedMinecraftNote(track, semitoneOffset) {
  if (!sfxEnabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;

  const harmonicLock = (parseInt(readSetting('dm-harmonic-lock-slider', '88'), 10) || 88) / 100;
  const baseRate = track.baseRate || 1.0;
  const exactRate = baseRate * Math.pow(2, semitoneOffset / 12);
  // When Harmonic Pitch-Lock < 100%, allow subtle organic Minecraft sample pitch character
  const lockedRate = exactRate * harmonicLock + baseRate * (1 - harmonicLock);
  const clampedRate = Math.max(0.35, Math.min(2.8, lockedRate));
  const now = ctx.currentTime;
  const gateDecay = track.id === 'bass' ? 0.28 : (track.id === 'bell' ? 0.36 : 0.24);

  const buf = DECODED_BUFFER_CACHE[track.sound];
  if (buf) {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(clampedRate, now);

    // Apply musical ADSR gate and resonant filter so even long non-noteblock Minecraft sounds lock tightly to the groove!
    filter.type = track.id === 'bass' ? 'lowpass' : 'bandpass';
    const targetFreq = (track.id === 'bass' ? 110 : 370) * Math.pow(2, semitoneOffset / 12);
    filter.frequency.setValueAtTime(Math.max(80, Math.min(4800, targetFreq * 2.2)), now);
    filter.Q.setValueAtTime(track.isNoteblock ? 0.7 : (1.2 + harmonicLock * 2.5), now);

    const peak = track.id === 'bass' ? 0.38 : 0.26;
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + gateDecay + 0.08);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
    src.stop(now + gateDecay + 0.1);
  }

  // Layer pitch-locked Minecraft character formant/harmonic voice so every sound is 100% in key!
  const osc = ctx.createOscillator();
  const subOsc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  const baseHz = track.id === 'bass' ? 92.5 : (track.id === 'bell' ? 739.99 : 369.99);
  const freq = baseHz * Math.pow(2, semitoneOffset / 12);
  const timbre = track.timbre || 'pling';

  osc.type = track.synthType || 'triangle';
  subOsc.type = timbre === 'anvil' || timbre === 'amethyst' ? 'square' : 'sine';

  if (timbre === 'enderman' || timbre === 'portal') {
    osc.frequency.setValueAtTime(freq * 1.06, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.07);
    subOsc.frequency.setValueAtTime(freq * 1.5, now);
  } else if (timbre === 'villager' || timbre === 'cat' || timbre === 'pig' || timbre === 'ghast') {
    osc.frequency.setValueAtTime(freq * 0.94, now);
    osc.frequency.linearRampToValueAtTime(freq * 1.02, now + 0.05);
    osc.frequency.linearRampToValueAtTime(freq, now + 0.14);
    subOsc.frequency.setValueAtTime(freq * 2.0, now);
  } else if (timbre === 'anvil' || timbre === 'glass') {
    osc.frequency.setValueAtTime(freq, now);
    subOsc.frequency.setValueAtTime(freq * 2.756, now); // Metallic inharmonic overtone locked to root
  } else if (timbre === 'slime' || timbre === 'lava' || timbre === 'piston') {
    osc.frequency.setValueAtTime(freq * 1.35, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.08);
    subOsc.frequency.setValueAtTime(freq * 0.5, now);
  } else {
    osc.frequency.setValueAtTime(freq, now);
    subOsc.frequency.setValueAtTime(freq * 2.0, now);
  }

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(track.id === 'bass' ? 480 : 2800, now);

  const synthScale = buf ? (0.45 * harmonicLock) : 1.0;
  const peakGain = (track.id === 'bass' ? 0.15 : 0.095) * synthScale;

  gain.gain.setValueAtTime(Math.max(0.002, peakGain), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + gateDecay);

  osc.connect(filter);
  subOsc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  subOsc.start(now);
  osc.stop(now + gateDecay + 0.02);
  subOsc.stop(now + gateDecay + 0.02);
}

function playComposerDrum(drumType) {
  if (!sfxEnabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (drumType === 'kick') {
    const buf = DECODED_BUFFER_CACHE['note/bd.ogg'];
    if (buf) {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      g.gain.setValueAtTime(0.5, now);
      src.connect(g);
      g.connect(masterGain);
      src.start(now);
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (drumType === 'snare') {
    const buf = DECODED_BUFFER_CACHE['note/snare.ogg'];
    if (buf) {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      g.gain.setValueAtTime(0.42, now);
      src.connect(g);
      g.connect(masterGain);
      src.start(now);
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.09);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  } else {
    const buf = DECODED_BUFFER_CACHE['note/hat.ogg'];
    if (buf) {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      g.gain.setValueAtTime(0.26, now);
      src.connect(g);
      g.connect(masterGain);
      src.start(now);
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(3200, now);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}

function playComposerFoley(fxType, semitoneOffset = 0, soundPath = null) {
  if (!sfxEnabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const rate = Math.max(0.55, Math.min(1.85, Math.pow(2, semitoneOffset / 12)));
  const now = ctx.currentTime;

  const targetPath = soundPath || (fxType === 'pig' ? 'mob/pig/say1.ogg' : (fxType === 'anvil' ? 'random/anvil_land.ogg' : 'random/orb.ogg'));
  const buf = DECODED_BUFFER_CACHE[targetPath];
  if (buf) {
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(rate, now);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    src.connect(g);
    g.connect(masterGain);
    src.start(now);
    src.stop(now + 0.3);
    return;
  }

  // Immediate pitch-locked synthesis for Foley accent
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const baseF = 369.99 * rate;
  osc.type = fxType === 'anvil' ? 'square' : (fxType === 'pig' ? 'sawtooth' : 'sine');
  osc.frequency.setValueAtTime(baseF, now);
  osc.frequency.exponentialRampToValueAtTime(fxType === 'ender' ? baseF * 1.5 : baseF * 1.25, now + 0.14);
  g.gain.setValueAtTime(0.08, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.17);
}

// ==============================================================================
// 5B. Offline Multi-Track PCM Renderer + Genuine Xiph.org Ogg Vorbis I (.ogg)
//     Encoder + Minecraft Resource Pack (.zip) Builder
// ==============================================================================

/**
 * Renders `numBars` of the current stochastic `disc_maker` composition at 44,100 Hz Mono
 * (mixing decoded Minecraft `.ogg` buffers + pitch-locked physical modeling + drums + foley).
 */
function renderDiscMakerToMonoPcm(numBars = 4, sampleRate = 44100) {
  const bpm = parseInt(readSetting('dm-bpm-slider', '114'), 10) || 114;
  const swingPct = (parseInt(readSetting('dm-swing-slider', '20'), 10) || 20) / 100;
  const scaleKey = readSetting('dm-scale-select', 'phrygian');
  const scale = DM_SCALES[scaleKey] || DM_SCALES.phrygian;
  const rootOffset = parseInt(readSetting('dm-root-select', '0'), 10) || 0;
  const harmonicLock = (parseInt(readSetting('dm-harmonic-lock-slider', '88'), 10) || 88) / 100;

  const sixteenthSec = (60 / bpm) / 4;
  const totalSteps = numBars * 16;
  const totalDurationSec = totalSteps * sixteenthSec + 0.6;
  const totalSamples = Math.ceil(totalDurationSec * sampleRate);
  const mix = new Float32Array(totalSamples);

  let cursorSec = 0.05;
  for (let bar = 0; bar < numBars; bar++) {
    const activeChordDegree = dmCurrentChords[bar % dmCurrentChords.length] || 0;
    for (let step = 0; step < 16; step++) {
      const stepDur = (step % 2 === 0)
        ? sixteenthSec * (1 + swingPct * 0.5)
        : sixteenthSec * (1 - swingPct * 0.5);
      const startSample = Math.floor(cursorSec * sampleRate);

      for (let t = 0; t < dmTracks.length; t++) {
        const cellData = dmPattern[t][step];
        if (!cellData) continue;
        const baseTrack = dmTracks[t];
        const activeVoice = cellData.customVoice ? { ...baseTrack, ...cellData.customVoice, synthType: cellData.customVoice.synth } : baseTrack;

        if (baseTrack.id === 'drums') {
          mixDrumIntoPcm(mix, startSample, sampleRate, cellData.drumType);
        } else if (baseTrack.id === 'fx') {
          const foleySemi = rootOffset + (scale[(activeChordDegree + (cellData.degree || 0)) % scale.length] || 0);
          mixFoleyIntoPcm(mix, startSample, sampleRate, cellData.fxType, foleySemi, cellData.sound);
        } else {
          const totalDegree = activeChordDegree + (cellData.degree || 0);
          const scaleLen = scale.length;
          const octaveFromDegree = Math.floor(totalDegree / scaleLen);
          const scaleSemitone = scale[((totalDegree % scaleLen) + scaleLen) % scaleLen];
          const semitoneOffset = rootOffset + scaleSemitone + (octaveFromDegree + (cellData.octave || 0)) * 12;
          mixPitchedMinecraftVoiceIntoPcm(mix, startSample, sampleRate, activeVoice, semitoneOffset, harmonicLock);
        }
      }
      cursorSec += stepDur;
    }
  }

  // Normalize and soft-clip to -0.8 dBFS for warm Minecraft Jukebox playback
  let peak = 0.001;
  for (let i = 0; i < mix.length; i++) {
    const a = Math.abs(mix[i]);
    if (a > peak) peak = a;
  }
  const normGain = 0.88 / peak;
  for (let i = 0; i < mix.length; i++) {
    mix[i] = Math.tanh(mix[i] * normGain * 1.15);
  }
  return mix;
}

function mixPitchedMinecraftVoiceIntoPcm(mix, startSample, sampleRate, track, semitoneOffset, harmonicLock) {
  const baseRate = track.baseRate || 1.0;
  const exactRate = baseRate * Math.pow(2, semitoneOffset / 12);
  const clampedRate = Math.max(0.35, Math.min(2.8, exactRate * harmonicLock + baseRate * (1 - harmonicLock)));
  const gateDecay = track.id === 'bass' ? 0.30 : (track.id === 'bell' ? 0.38 : 0.25);
  const durSamples = Math.floor(gateDecay * sampleRate);

  // 1. Mix decoded Minecraft .ogg sample if available in DECODED_BUFFER_CACHE
  const buf = DECODED_BUFFER_CACHE[track.sound];
  if (buf) {
    const chData = buf.getChannelData(0);
    const bufRateRatio = (buf.sampleRate / sampleRate) * clampedRate;
    const amp = track.id === 'bass' ? 0.42 : 0.30;
    const maxS = Math.min(durSamples, Math.floor(chData.length / bufRateRatio));
    for (let i = 0; i < maxS; i++) {
      const dstIdx = startSample + i;
      if (dstIdx >= mix.length) break;
      const srcPos = i * bufRateRatio;
      const idx0 = Math.floor(srcPos);
      const frac = srcPos - idx0;
      const s0 = chData[idx0] || 0;
      const s1 = chData[idx0 + 1] || s0;
      const env = Math.exp(-3.8 * (i / durSamples));
      mix[dstIdx] += (s0 + (s1 - s0) * frac) * amp * env;
    }
  }

  // 2. Mix pitch-locked Minecraft timbre resonator / physical model
  const baseHz = track.id === 'bass' ? 92.5 : (track.id === 'bell' ? 739.99 : 369.99);
  const freq = baseHz * Math.pow(2, semitoneOffset / 12);
  const timbre = track.timbre || 'pling';
  const synthAmp = (track.id === 'bass' ? 0.26 : 0.18) * (buf ? 0.55 * harmonicLock : 1.0);

  let phase1 = 0;
  let phase2 = 0;
  for (let i = 0; i < durSamples; i++) {
    const dstIdx = startSample + i;
    if (dstIdx >= mix.length) break;
    const t = i / sampleRate;
    const env = Math.min(1, i / (0.004 * sampleRate)) * Math.exp(-4.5 * (t / gateDecay));

    let f1 = freq;
    let f2 = freq * 2.0;
    if (timbre === 'enderman' || timbre === 'portal') {
      f1 = freq * (1 + 0.06 * Math.exp(-t * 22));
      f2 = freq * 1.5;
    } else if (timbre === 'villager' || timbre === 'cat' || timbre === 'pig' || timbre === 'ghast') {
      f1 = freq * (1 + 0.03 * Math.sin(2 * Math.PI * 6.5 * t));
      f2 = freq * 3.0;
    } else if (timbre === 'anvil' || timbre === 'glass') {
      f2 = freq * 2.756; // Metallic bell overtone
    } else if (timbre === 'slime' || timbre === 'lava' || timbre === 'piston') {
      f1 = freq * (1 + 0.28 * Math.exp(-t * 28));
      f2 = freq * 0.5;
    }

    phase1 += (2 * Math.PI * f1) / sampleRate;
    phase2 += (2 * Math.PI * f2) / sampleRate;

    let w1 = Math.sin(phase1);
    if (track.synthType === 'square') w1 = w1 >= 0 ? 0.75 : -0.75;
    else if (track.synthType === 'sawtooth') w1 = 2 * ((phase1 / (2 * Math.PI)) - Math.floor(0.5 + phase1 / (2 * Math.PI)));

    const w2 = Math.sin(phase2) * 0.35;
    mix[dstIdx] += (w1 * 0.7 + w2) * synthAmp * env;
  }
}

function mixDrumIntoPcm(mix, startSample, sampleRate, drumType) {
  if (drumType === 'kick') {
    const dur = Math.floor(0.16 * sampleRate);
    let phase = 0;
    for (let i = 0; i < dur; i++) {
      const dst = startSample + i;
      if (dst >= mix.length) break;
      const t = i / sampleRate;
      const f = 38 + 105 * Math.exp(-t * 26);
      phase += (2 * Math.PI * f) / sampleRate;
      const env = Math.exp(-t * 18);
      mix[dst] += Math.sin(phase) * 0.42 * env;
    }
  } else if (drumType === 'snare') {
    const dur = Math.floor(0.13 * sampleRate);
    let phase = 0;
    for (let i = 0; i < dur; i++) {
      const dst = startSample + i;
      if (dst >= mix.length) break;
      const t = i / sampleRate;
      const f = 95 + 125 * Math.exp(-t * 30);
      phase += (2 * Math.PI * f) / sampleRate;
      const noise = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const env = Math.exp(-t * 24);
      mix[dst] += (Math.sin(phase) * 0.45 + noise * 0.55) * 0.28 * env;
    }
  } else {
    const dur = Math.floor(0.05 * sampleRate);
    for (let i = 0; i < dur; i++) {
      const dst = startSample + i;
      if (dst >= mix.length) break;
      const t = i / sampleRate;
      const noise = ((Math.sin(i * 78.233) * 43758.5453) % 1) * (i % 2 === 0 ? 1 : -1);
      const env = Math.exp(-t * 65);
      mix[dst] += noise * 0.14 * env;
    }
  }
}

function mixFoleyIntoPcm(mix, startSample, sampleRate, fxType, semitoneOffset, soundPath) {
  const rate = Math.max(0.55, Math.min(1.85, Math.pow(2, semitoneOffset / 12)));
  const targetPath = soundPath || (fxType === 'pig' ? 'mob/pig/say1.ogg' : (fxType === 'anvil' ? 'random/anvil_land.ogg' : 'random/orb.ogg'));
  const buf = DECODED_BUFFER_CACHE[targetPath];
  if (buf) {
    const chData = buf.getChannelData(0);
    const ratio = (buf.sampleRate / sampleRate) * rate;
    const maxS = Math.min(Math.floor(0.28 * sampleRate), Math.floor(chData.length / ratio));
    for (let i = 0; i < maxS; i++) {
      const dst = startSample + i;
      if (dst >= mix.length) break;
      const srcIdx = Math.floor(i * ratio);
      const env = Math.exp(-4.5 * (i / maxS));
      mix[dst] += (chData[srcIdx] || 0) * 0.28 * env;
    }
    return;
  }
  const dur = Math.floor(0.16 * sampleRate);
  let phase = 0;
  const baseF = 369.99 * rate;
  for (let i = 0; i < dur; i++) {
    const dst = startSample + i;
    if (dst >= mix.length) break;
    const t = i / sampleRate;
    const f = baseF * (1 + 0.25 * (t / 0.16));
    phase += (2 * Math.PI * f) / sampleRate;
    const env = Math.exp(-t * 18);
    mix[dst] += Math.sin(phase) * 0.18 * env;
  }
}

// Precomputed Ogg CRC-32 Lookup Table (Polynomial 0x04C11DB7)
const OGG_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) {
      r = (r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1);
    }
    table[i] = r >>> 0;
  }
  return table;
})();

function computeOggCrc32(bytes) {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    crc = ((crc << 8) ^ OGG_CRC_TABLE[((crc >>> 24) ^ bytes[i]) & 0xff]) >>> 0;
  }
  return crc >>> 0;
}

function buildOggPageFromPackets(packets, headerType, granulePos, serialNo, pageSeqNo) {
  const segTable = [];
  let totalPayloadBytes = 0;
  for (const pkt of packets) {
    let rem = pkt.length;
    while (rem >= 255) {
      segTable.push(255);
      rem -= 255;
    }
    segTable.push(rem);
    totalPayloadBytes += pkt.length;
  }

  const headerLen = 27 + segTable.length;
  const page = new Uint8Array(headerLen + totalPayloadBytes);
  const view = new DataView(page.buffer);

  // 'OggS' capture pattern
  page[0] = 0x4f; page[1] = 0x67; page[2] = 0x67; page[3] = 0x53;
  page[4] = 0; // stream_structure_version
  page[5] = headerType;
  // 64-bit granule_position (little-endian)
  view.setUint32(6, granulePos >>> 0, true);
  view.setUint32(10, Math.floor(granulePos / 4294967296) >>> 0, true);
  view.setUint32(14, serialNo >>> 0, true);
  view.setUint32(18, pageSeqNo >>> 0, true);
  view.setUint32(22, 0, true); // CRC placeholder
  page[26] = segTable.length;
  for (let i = 0; i < segTable.length; i++) {
    page[27 + i] = segTable[i];
  }

  let offset = headerLen;
  for (const pkt of packets) {
    page.set(pkt, offset);
    offset += pkt.length;
  }

  const crc = computeOggCrc32(page);
  view.setUint32(22, crc, true);
  return page;
}

function vorbisFloat32Pack(val) {
  if (val === 0) return 0;
  let sign = 0;
  if (val < 0) {
    sign = 0x80000000;
    val = -val;
  }
  let exp = Math.floor(Math.log2(val));
  let mant = Math.round(val / Math.pow(2, exp - 20));
  if (mant >= 0x200000) {
    mant >>>= 1;
    exp += 1;
  }
  return (sign | ((exp + 788 - 20) << 21) | (mant & 0x1fffff)) >>> 0;
}

class VorbisBitWriter {
  constructor() {
    this.bytes = [];
    this.cur = 0;
    this.nbits = 0;
  }
  write(val, bits) {
    for (let i = 0; i < bits; i++) {
      if ((val >>> i) & 1) {
        this.cur |= (1 << this.nbits);
      }
      this.nbits++;
      if (this.nbits === 8) {
        this.bytes.push(this.cur);
        this.cur = 0;
        this.nbits = 0;
      }
    }
  }
  writeAscii(str) {
    for (let i = 0; i < str.length; i++) {
      this.write(str.charCodeAt(i), 8);
    }
  }
  finish() {
    if (this.nbits > 0) {
      this.bytes.push(this.cur);
      this.cur = 0;
      this.nbits = 0;
    }
    return new Uint8Array(this.bytes);
  }
}

// Precomputed 256-sample Vorbis window & MDCT cosine matrix for fast in-browser encoding
const VORBIS_N = 256;
const VORBIS_N2 = 128;
const VORBIS_WIN = (() => {
  const w = new Float32Array(VORBIS_N);
  for (let i = 0; i < VORBIS_N; i++) {
    const s = Math.sin(((i + 0.5) / VORBIS_N) * Math.PI);
    w[i] = Math.sin(0.5 * Math.PI * s * s);
  }
  return w;
})();

const VORBIS_COS_TABLE = (() => {
  const tbl = new Float32Array(VORBIS_N2 * VORBIS_N);
  for (let k = 0; k < VORBIS_N2; k++) {
    for (let n = 0; n < VORBIS_N; n++) {
      tbl[k * VORBIS_N + n] = Math.cos((Math.PI / VORBIS_N) * (n + 0.5 + VORBIS_N / 4) * (k + 0.5));
    }
  }
  return tbl;
})();

/**
 * Encodes 44.1 kHz Mono Float32 PCM samples into a 100% compliant Xiph.org Ogg Vorbis I (.ogg) file
 * compatible with Minecraft Jukeboxes (stb_vorbis / OpenAL), ffmpeg, VLC, and browser <audio>.
 */
function encodeMonoPcmToOggVorbis(samples, sampleRate = 44100) {
  const serialNo = 0x53415742;
  const pages = [];
  let seqNo = 0;

  // 1. Identification Header (\x01vorbis)
  const idHdr = new Uint8Array(30);
  const idView = new DataView(idHdr.buffer);
  idHdr[0] = 1;
  idHdr.set([118, 111, 114, 98, 105, 115], 1); // 'vorbis'
  idView.setUint32(7, 0, true); // version = 0
  idHdr[11] = 1; // channels = 1 (Mono for positional Minecraft Jukebox audio)
  idView.setUint32(12, sampleRate, true);
  idView.setInt32(16, 0, true);
  idView.setInt32(20, 128000, true);
  idView.setInt32(24, 0, true);
  idHdr[28] = 0x88; // blocksize_0 = 256 (2^8), blocksize_1 = 256 (2^8)
  idHdr[29] = 1;    // framing_flag = 1
  pages.push(buildOggPageFromPackets([idHdr], 0x02, 0, serialNo, seqNo++));

  // 2. Comment Header (\x03vorbis)
  const vendor = 'SawbyteDiscMaker26.3';
  const cmtHdr = new Uint8Array(7 + 4 + vendor.length + 4 + 1);
  const cmtView = new DataView(cmtHdr.buffer);
  cmtHdr[0] = 3;
  cmtHdr.set([118, 111, 114, 98, 105, 115], 1);
  cmtView.setUint32(7, vendor.length, true);
  for (let i = 0; i < vendor.length; i++) cmtHdr[11 + i] = vendor.charCodeAt(i);
  cmtView.setUint32(11 + vendor.length, 0, true);
  cmtHdr[11 + vendor.length + 4] = 1;
  pages.push(buildOggPageFromPackets([cmtHdr], 0x00, 0, serialNo, seqNo++));

  // 3. Setup Header (\x05vorbis)
  const bw = new VorbisBitWriter();
  bw.write(5, 8);
  bw.writeAscii('vorbis');
  bw.write(1, 8); // 2 codebooks (count - 1 = 1)

  // Codebook 0: 2 entries, dim 1, lengths [1, 1], lookup_type = 0 (classbook)
  bw.write(0x564342, 24);
  bw.write(1, 16);
  bw.write(2, 24);
  bw.write(0, 1);
  bw.write(0, 1);
  bw.write(0, 5);
  bw.write(0, 5);
  bw.write(0, 4);

  // Codebook 1: 256 entries, dim 1, uniform 8-bit codewords, lookup_type = 1 (-1.5 .. +1.5)
  bw.write(0x564342, 24);
  bw.write(1, 16);
  bw.write(256, 24);
  bw.write(0, 1);
  bw.write(0, 1);
  for (let i = 0; i < 256; i++) bw.write(7, 5);
  bw.write(1, 4);
  bw.write(vorbisFloat32Pack(-1.5), 32);
  bw.write(vorbisFloat32Pack(3.0 / 255.0), 32);
  bw.write(7, 4);
  bw.write(0, 1);
  for (let i = 0; i < 256; i++) bw.write(i, 8);

  // Time domain transforms = 1 (0)
  bw.write(0, 6);
  bw.write(0, 16);

  // Floor 0: Floor1 with 0 partitions (flat unity floor)
  bw.write(0, 6);
  bw.write(1, 16);
  bw.write(0, 5);
  bw.write(0, 2);
  bw.write(4, 4);

  // Residue 0: Residue1 over 0..128 using Codebook 1
  bw.write(0, 6);
  bw.write(1, 16);
  bw.write(0, 24);
  bw.write(128, 24);
  bw.write(127, 24);
  bw.write(0, 6);
  bw.write(0, 8);
  bw.write(1, 3);
  bw.write(0, 1);
  bw.write(1, 8);

  // Mapping 0
  bw.write(0, 6);
  bw.write(0, 16);
  bw.write(0, 1);
  bw.write(0, 1);
  bw.write(0, 2);
  bw.write(0, 8);
  bw.write(0, 8);
  bw.write(0, 8);

  // Mode 0
  bw.write(0, 6);
  bw.write(0, 1);
  bw.write(0, 16);
  bw.write(0, 16);
  bw.write(0, 8);
  bw.write(1, 1);

  const setupHdr = bw.finish();
  pages.push(buildOggPageFromPackets([setupHdr], 0x00, 0, serialNo, seqNo++));

  // 4. Encode Audio Frames (hop = 128 samples, 32 packets per Ogg page)
  const totalFrames = Math.max(2, Math.floor((samples.length - VORBIS_N) / VORBIS_N2));
  const windowed = new Float32Array(VORBIS_N);
  let batchPackets = [];
  let granulePos = 0;

  for (let f = 0; f < totalFrames; f++) {
    const baseIdx = f * VORBIS_N2;
    for (let n = 0; n < VORBIS_N; n++) {
      windowed[n] = (samples[baseIdx + n] || 0) * VORBIS_WIN[n];
    }

    const fbw = new VorbisBitWriter();
    fbw.write(0, 1);   // packet_type = 0 (audio)
    fbw.write(1, 1);   // floor nonzero = 1
    fbw.write(255, 8); // Y0 = 255 (0 dB unity floor)
    fbw.write(255, 8); // Y1 = 255 (0 dB unity floor)
    fbw.write(0, 1);   // residue classword = 0

    for (let k = 0; k < VORBIS_N2; k++) {
      let sum = 0;
      const rowOffset = k * VORBIS_N;
      for (let n = 0; n < VORBIS_N; n++) {
        sum += windowed[n] * VORBIS_COS_TABLE[rowOffset + n];
      }
      const normMdct = sum / 128.0;
      let qIdx = Math.round(((normMdct + 1.5) / 3.0) * 255.0);
      if (qIdx < 0) qIdx = 0;
      else if (qIdx > 255) qIdx = 255;
      fbw.write(qIdx, 8);
    }

    batchPackets.push(fbw.finish());
    granulePos = (f + 1) * VORBIS_N2;

    const isLast = (f === totalFrames - 1);
    if (batchPackets.length >= 32 || isLast) {
      pages.push(buildOggPageFromPackets(batchPackets, isLast ? 0x04 : 0x00, granulePos, serialNo, seqNo++));
      batchPackets = [];
    }
  }

  let totalLen = 0;
  for (const p of pages) totalLen += p.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of pages) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

// Standard IEEE 802.3 CRC-32 for .ZIP archive generation
const ZIP_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeZipCrc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ ZIP_CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildUncompressedZipArchive(files) {
  const enc = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = enc.encode(file.path);
    const dataBytes = file.data instanceof Uint8Array ? file.data : enc.encode(String(file.data));
    const crc = computeZipCrc32(dataBytes);

    const localHdr = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHdr.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true); // store (uncompressed)
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x5421, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHdr.set(nameBytes, 30);

    const centralHdr = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHdr.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHdr.set(nameBytes, 46);

    localParts.push(localHdr, dataBytes);
    centralParts.push(centralHdr);
    offset += localHdr.length + dataBytes.length;
  }

  let centralSize = 0;
  for (const c of centralParts) centralSize += c.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const total = offset + centralSize + 22;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of localParts) { out.set(p, pos); pos += p.length; }
  for (const p of centralParts) { out.set(p, pos); pos += p.length; }
  out.set(eocd, pos);
  return out;
}

function exportDiscMakerAsOggFile(asResourcePack = false) {
  const targetDisc = document.getElementById('dm-target-disc-select')?.value || 'pigstep';
  const numBars = parseInt(document.getElementById('dm-export-bars-select')?.value || '4', 10) || 4;
  const statusEl = document.getElementById('dm-export-status-text');
  if (statusEl) {
    statusEl.innerHTML = `<span class="mc-e">Rendering ${numBars} bars of stochastic Minecraft audio to Ogg Vorbis (${targetDisc}.ogg)...</span>`;
  }

  setTimeout(() => {
    try {
      const pcm = renderDiscMakerToMonoPcm(numBars, 44100);
      const oggBytes = encodeMonoPcmToOggVorbis(pcm, 44100);
      const oggBlob = new Blob([oggBytes], { type: 'audio/ogg' });

      if (lastExportedOggBlobUrl) {
        URL.revokeObjectURL(lastExportedOggBlobUrl);
      }
      lastExportedOggBlobUrl = URL.createObjectURL(oggBlob);

      const previewWrap = document.getElementById('dm-exported-preview-wrap');
      const previewAudio = document.getElementById('dm-exported-audio-preview');
      const previewLabel = document.getElementById('dm-exported-preview-label');
      if (previewWrap && previewAudio) {
        previewWrap.style.display = 'flex';
        previewAudio.src = lastExportedOggBlobUrl;
        if (previewLabel) {
          previewLabel.textContent = `Rendered ${targetDisc}.ogg (${(oggBytes.length / 1024).toFixed(1)} KB, 44.1 kHz Mono Ogg Vorbis):`;
        }
      }

      if (asResourcePack) {
        const mcmeta = JSON.stringify({
          pack: {
            pack_format: 34,
            supported_formats: [15, 64],
            description: `§bSawbyte disc_maker Custom Disc (§e${targetDisc}.ogg§b)`
          }
        }, null, 2);

        const readme = [
          `Sawbyte disc_maker — Custom Minecraft Music Disc Resource Pack`,
          `==============================================================`,
          `Replaced Music Disc: assets/minecraft/sounds/records/${targetDisc}.ogg`,
          `Format: Ogg Vorbis I (44,100 Hz Mono — 100% compatible with Minecraft Jukeboxes)`,
          ``,
          `How to listen in Minecraft:`,
          `1. Drop this .zip file directly into your Minecraft 'resourcepacks' folder`,
          `   (or ~/.sawbyte/instances/<instance>/resourcepacks/).`,
          `2. In Minecraft, open Options -> Resource Packs and enable this pack.`,
          `3. Insert the '${targetDisc}' Music Disc into any Jukebox in-game!`
        ].join('\n');

        const zipBytes = buildUncompressedZipArchive([
          { path: 'pack.mcmeta', data: mcmeta },
          { path: `assets/minecraft/sounds/records/${targetDisc}.ogg`, data: oggBytes },
          { path: 'README.txt', data: readme }
        ]);
        const zipBlob = new Blob([zipBytes], { type: 'application/zip' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `Sawbyte_DiscPack_${targetDisc}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(zipUrl), 5000);

        if (statusEl) {
          statusEl.innerHTML = `<span class="mc-a">Exported <code>Sawbyte_DiscPack_${targetDisc}.zip</code> (contains <code>assets/minecraft/sounds/records/${targetDisc}.ogg</code>)! Drop into <code>resourcepacks/</code> to play in a Jukebox!</span>`;
        }
        showAdvancementToast('Resource Pack Exported!', `Sawbyte_DiscPack_${targetDisc}.zip ready for Minecraft`, 'block/jukebox_side.png');
      } else {
        const a = document.createElement('a');
        a.href = lastExportedOggBlobUrl;
        a.download = `${targetDisc}.ogg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (statusEl) {
          statusEl.innerHTML = `<span class="mc-a">Exported <code>${targetDisc}.ogg</code> (${(oggBytes.length / 1024).toFixed(1)} KB, Ogg Vorbis 44.1 kHz Mono)! Replace <code>assets/minecraft/sounds/records/${targetDisc}.ogg</code> in any Resource Pack!</span>`;
        }
        showAdvancementToast('Exported .OGG Music Disc!', `Saved ${targetDisc}.ogg for Minecraft Jukeboxes`, 'item/music_disc_pigstep.png');
      }
    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = `<span class="mc-c">Export error: ${err.message || err}</span>`;
      }
    }
  }, 30);
}

// ==============================================================================
export const discMaker = {
  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type)?.delete(fn);
  },
  init() {
    if (dmInitialized) return;
    dmInitialized = true;
    generateStochasticMusicalPattern(true);
  },
  mountStudio() {
    this.init();
    for (const [id, value] of Object.entries(dmSettings)) {
      const input = document.getElementById(id);
      if (input) input.value = value;
    }
    initDiscMakerStudio();
    renderSequencerGridUI();
    const label = document.getElementById('dm-play-label');
    if (label) label.textContent = dmPlaying ? 'PAUSE COMPOSER' : 'PLAY COMPOSER';
    const badge = document.getElementById('dm-status-badge');
    if (badge) badge.textContent = dmPlaying ? 'COMPOSING LIVE' : 'READY';
    return () => {
      for (const id of Object.keys(dmSettings)) readSetting(id, dmSettings[id]);
      if (dmIconTimerId) clearInterval(dmIconTimerId);
      dmIconTimerId = null;
    };
  },
  play() { this.init(); preloadCurrentSamples(); startDiscMaker(); },
  pause() { stopDiscMaker(); },
  toggle() { dmPlaying ? this.pause() : this.play(); },
  stop() { stopDiscMaker(); dmStep = 0; dmBar = 0; emit('step', { step: 0, bar: 0 }); },
  randomize() { this.init(); generateStochasticMusicalPattern(true); preloadCurrentSamples(); emit('pattern', dmTracks); },
  setVolume(value) { dmVolume = Math.max(0, Math.min(100, Number(value) || 0)); setMasterGain(); emit('volume', dmVolume); },
  toggleMute() { dmMuted = !dmMuted; setMasterGain(); emit('volume', dmVolume); },
  get volume() { return dmVolume; },
  get muted() { return dmMuted; },
  get playing() { return dmPlaying; },
  get tracks() { return dmTracks; }
};

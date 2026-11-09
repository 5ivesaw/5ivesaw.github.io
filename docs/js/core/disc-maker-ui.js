import { discMaker } from './disc-maker.js';

const tex = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures/';
const icon = (path) => `<img src="${tex}${path}" alt="" loading="lazy" class="dm-icon" />`;
const range = (label, id, min, max, value, suffix = '%') => `<label class="dm-control"><span>${label} <output id="${id}-val">${value}${suffix}</output></span><input type="range" id="${id}-slider" min="${min}" max="${max}" value="${value}" /></label>`;

export function mountDiscMakerPage(mount) {
  mount.innerHTML = `<div class="disc-maker-page stack" style="gap:16px;">
    <section class="card pad dm-intro">
      <div class="row between wrap items-center" style="gap:12px;">
        <div><span class="eyebrow">SAWBYTE · SOUND WORKSHOP</span><h1>disc_maker</h1><p class="muted sm">Generate a Minecraft soundscape, edit its 16-step pattern, and play it through the site music dock.</p></div>
        <a href="https://5ivesaw.github.io/Sawbyte/#disc-maker" target="_blank" rel="noopener noreferrer" class="btn sm ghost">Explore on Sawbyte ↗</a>
      </div>
    </section>
    <section class="card pad dm-studio">
      <div class="dm-stage">
        <button id="dm-turntable-btn" class="dm-disc-button" type="button" aria-label="Play or pause disc maker"><img id="dm-main-disc-icon" class="disc-maker-cycling-icon" src="${tex}item/music_disc_pigstep.png" alt="Minecraft music disc" /></button>
        <div class="dm-stage-copy"><span class="eyebrow">LIVE COMPOSER <span id="dm-status-badge" class="badge">READY</span></span><h2>Make a disc</h2><p id="dm-chord-readout">Euclidean rhythm and pitch-locked Minecraft sounds.</p><small id="dm-active-disc-label">Minecraft sound palette</small></div>
        <div class="dm-stage-actions"><button id="dm-play-btn" type="button" class="btn sm primary">${icon('block/note_block.png')} <span id="dm-play-label">PLAY COMPOSER</span></button><button id="dm-randomize-btn" type="button" class="btn sm ghost">${icon('item/diamond.png')} Randomize</button><button id="dm-mutate-btn" type="button" class="btn sm ghost">${icon('item/redstone.png')} <span id="dm-mutate-label">Live Mutate: ON</span></button></div>
      </div>
      <div class="dm-controls-grid">
        <label class="dm-control"><span>Sound palette</span><select id="dm-sound-pool-select" class="input"><option value="all_mc_random">Minecraft mix</option><option value="pure_non_noteblock">World and mob sounds</option><option value="per_note_chaos">Per-note chaos</option><option value="noteblock_only">Note blocks</option></select></label>
        <label class="dm-control"><span>Scale</span><select id="dm-scale-select" class="input"><option value="phrygian">Nether Phrygian</option><option value="dorian">Dorian</option><option value="pentatonic">Minor pentatonic</option><option value="lydian">Lydian</option><option value="hirajoshi">Hirajoshi</option><option value="mixolydian">Mixolydian</option></select></label>
        <label class="dm-control"><span>Root pitch</span><select id="dm-root-select" class="input"><option value="0">F#</option><option value="1">G</option><option value="3">A</option><option value="5">B</option><option value="6">C</option><option value="8">D</option><option value="-2">E</option></select></label>
        ${range('Tempo', 'dm-bpm', 82, 148, 114, ' BPM')}
        ${range('Pulse density', 'dm-density', 25, 92, 64)}
        ${range('Swing', 'dm-swing', 0, 42, 20)}
        ${range('Consonance', 'dm-consonance', 45, 98, 84)}
        ${range('Pitch lock', 'dm-harmonic-lock', 40, 100, 88)}
      </div>
      <div class="dm-sequencer-head"><div><span class="eyebrow">16-STEP SEQUENCER</span><p class="xs muted">Tap a cell to add or remove a note. Tap a track name to roll a new Minecraft sound.</p></div><span class="xs mono faint">6 tracks · 4 bars</span></div>
      <div class="dm-sequencer-scroll"><div id="dm-sequencer-grid"></div></div>
    </section>
    <section class="card pad dm-export"><div><span class="eyebrow">TAKE IT WITH YOU</span><h2>Export a music disc</h2><p class="xs muted" id="dm-export-status-text">Render this pattern as an Ogg Vorbis disc or a Minecraft resource pack.</p></div>
      <div class="dm-export-controls"><label>Disc<select id="dm-target-disc-select" class="input"><option value="pigstep">Pigstep</option><option value="otherside">Otherside</option><option value="relic">Relic</option><option value="creator">Creator</option><option value="cat">Cat</option><option value="blocks">Blocks</option></select></label><label>Length<select id="dm-export-bars-select" class="input"><option value="4">4 bars</option><option value="8">8 bars</option><option value="12">12 bars</option></select></label><button id="dm-export-ogg-btn" class="btn sm primary" type="button"><span id="dm-export-ogg-label">EXPORT .OGG DISC (pigstep.ogg)</span></button><button id="dm-export-pack-btn" class="btn sm ghost" type="button">Export resource pack .zip</button></div>
      <div id="dm-exported-preview-wrap" style="display:none;"><span id="dm-exported-preview-label"></span><audio id="dm-exported-audio-preview" controls></audio></div>
    </section>
  </div>`;
  const unmount = discMaker.mountStudio();
  return unmount;
}

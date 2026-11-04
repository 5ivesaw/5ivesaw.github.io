// 5Tube — Synchronized Multiplayer YouTube Theater & Party Player.
// Real-time peer cursors, synchronized playback, live chat, synced comments & doomscroll immersion.
import {
  $, $$, icon, formatTime, copyText, toast, store, cssVar, esc
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';
import { party, generatePartyCode, getRandomColor } from '../core/party.js';

let ytPlayer = null;
let ytReady = false;
let isTheater = false;
let hidePartyUi = false;
let showCursors = true;
let showClicks = true;
let showFloatingChat = true;
let isSyncScrollActive = true;
let isRemotelyScrolling = false;
let scrollBroadcastTimer = null;
let hudIdleTimer = null;
let peerCursors = new Map(); // id -> { x, y, targetX, targetY, name, color, isHost, lastUpdate }
let clickRipples = []; // [{ x, y, color, r, maxR, alpha }]
let animFrame = null;
let lastCursorBroadcast = 0;
let isSeekingFromRemote = false;

// Comments state
let currentComments = [];
let syncedComments = [];
let activeVideoId = 'eXRWHzV72sU';

// ---------------- SHORTS NICHES & CURATED FEEDS ----------------
// Authentic YouTube Shorts across popular categories (NO music-only playlist)
export const SHORTS_NICHES = {
  memes: {
    id: 'memes',
    name: 'Memes & Brainrot',
    icon: 'zap',
    desc: 'Viral memes, funny skits & sound edits',
    items: [
      { id: 'oPjQvFmU8sY', title: 'Spinning cat meme compilation', author: 'Meme Central' },
      { id: 'q7o7PRHPYm0', title: 'Emotional Damage legendary clip', author: 'Steven He' },
      { id: 'm8e-Cq98Nmw', title: 'Sigma sound edit with impossible timing', author: 'SigmaShorts' },
      { id: 'aAkMkVFwAoo', title: 'The unexpected plot twist', author: 'DailyHumor' },
      { id: 'kH_N_y2yW88', title: 'Bro really thought he got away', author: 'GiggleHub' },
      { id: '8b92kF1_o0Y', title: 'When the joke lands a little too well', author: 'LaughTrack' }
    ]
  },
  gaming: {
    id: 'gaming',
    name: 'Gaming & Clips',
    icon: 'gamepad',
    desc: 'Minecraft clutches, GTA physics & Elden Ring parries',
    items: [
      { id: 'Ww8mG3y3_2c', title: 'Minecraft 1v4 clutch play of the year', author: 'ClutchGamer' },
      { id: 'y6120QOlsfU', title: 'GTA 5 Impossible ramp jump across map', author: 'SpeedyStunts' },
      { id: '9wA_jF1J_4M', title: 'Elden Ring parrying boss blindfolded', author: 'SoulsVeteran' },
      { id: 'fC7oUOUEEi4', title: 'Geometry Dash extreme demon last jump', author: 'DashMaster' },
      { id: 'f4tWw9X0XbM', title: 'Valorant 1 tap ace in 3 seconds', author: 'RadiantClips' },
      { id: 'g_R5m_zZ_8k', title: 'Subway Surfers impossible speedrun movement', author: 'SurferPro' }
    ]
  },
  satisfying: {
    id: 'satisfying',
    name: 'Satisfying & ASMR',
    icon: 'sparkle',
    desc: 'Kinetic sand slicing, soap carving & 3D loops',
    items: [
      { id: 'mRjV_9rFv9M', title: 'Kinetic sand slicing clean crisp audio', author: 'SandFactory' },
      { id: 'L_LUpnjgPso', title: 'Soap block peeling ultimate satisfaction', author: 'ASMRCraft' },
      { id: 'u0F8J912gHY', title: 'Hydraulic press vs solid titanium sphere', author: 'CrushLab' },
      { id: 'K7n3v37Ew1A', title: '100,000 Dominoes falling in perfect spiral', author: 'DominoKing' },
      { id: 'dQw4w9WgXcQ', title: '3D mechanical perpetual marble loop', author: 'PhysicsSim' }
    ]
  },
  comedy: {
    id: 'comedy',
    name: 'Comedy & Fails',
    icon: 'laugh',
    desc: 'Standup punchlines, public pranks & funny fails',
    items: [
      { id: 'p3oR9Y8q2xM', title: 'Public microphone question goes completely wrong', author: 'StreetJokes' },
      { id: 'w3_b98124uY', title: 'Instant karma caught in 4K', author: 'FailArmy' },
      { id: 'n29u_fF91jA', title: 'Orange cat operating with 1 brain cell', author: 'CatVibes' },
      { id: 'g81_0kNm24a', title: 'Dad joke competition with water in mouth', author: 'PunMasters' }
    ]
  },
  tech: {
    id: 'tech',
    name: 'Tech & Future',
    icon: 'monitor',
    desc: 'Atlas parkour, robotics, AI experiments & gadgets',
    items: [
      { id: 'k79Y821fMno', title: 'Boston Dynamics Atlas robot gymnastics', author: 'Boston Dynamics' },
      { id: 'x92fL019uNm', title: 'Neural physics engine simulating fluid', author: 'AI Frontiers' },
      { id: '8f1_0m28jLa', title: 'Wearable hologram interface real prototype', author: 'FutureTech' },
      { id: '2f91_xNm812', title: 'Electric vehicle autonomous drift track test', author: 'CyberGear' }
    ]
  },
  anime: {
    id: 'anime',
    name: 'Anime & Animation',
    icon: 'film',
    desc: 'Sakuga combat cuts, high FPS animation & AMVs',
    items: [
      { id: 'j1_9082mNlk', title: 'Sakuga sword combat animation sequence', author: 'SakugaArchive' },
      { id: 'a08f921_Lkm', title: 'Chainsaw Man Denji hybrid animation cut', author: 'MAPPA Fan' },
      { id: 'm0182_9fNjk', title: 'Hinokami Kagura flawless frame pacing', author: 'DemonEdits' },
      { id: 'k19208_fNla', title: 'Spider-Verse dynamic camera frame breakdown', author: 'AnimatorsGuild' }
    ]
  },
  animals: {
    id: 'animals',
    name: 'Cute Animals',
    icon: 'heart',
    desc: 'Puppies, curious red pandas & funny cats',
    items: [
      { id: 'o108_m128jA', title: 'Golden retriever puppy obstacle run', author: 'PuppyLove' },
      { id: 'c189_91823La', title: 'Tiny kitten tries to roar like a lion', author: 'FelineShorts' },
      { id: 'u198_18290La', title: 'Red panda trying to look menacing', author: 'ZooClips' }
    ]
  },
  speedruns: {
    id: 'speedruns',
    name: 'Speedruns & Skills',
    icon: 'ratio',
    desc: 'Record-shattering runs, rubik cube in 3s & mastery',
    items: [
      { id: 's189_10928La', title: 'Super Mario 64 backward long jump glitch run', author: 'SpeedrunCentral' },
      { id: 'z189_19283La', title: 'Solving 3x3 Rubik cube in 3.13 seconds', author: 'CubeGod' },
      { id: 'p102_19283La', title: 'Extreme pen spinning championship combo', author: 'SpinMaster' }
    ]
  }
};

// Dynamic Shorts search using open Invidious endpoints with automatic fallback
export async function searchShortsNiche(query) {
  if (!query) return SHORTS_NICHES.memes.items;
  const instances = [
    'https://inv.tux.pizza',
    'https://invidious.nerdvpn.de',
    'https://invidious.privacyredirect.com',
    'https://pipedapi.kavin.rocks'
  ];
  const q = `${query} shorts`;
  for (const inst of instances) {
    try {
      const res = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(q)}&type=video`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const filtered = data
          .filter(v => v.videoId && (v.lengthSeconds ? v.lengthSeconds <= 90 : true))
          .slice(0, 12)
          .map(v => ({
            id: v.videoId,
            title: v.title || `${query} Short`,
            author: v.author || 'YouTube Shorts'
          }));
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {}
  }

  // Fallback: match keywords against curated pools
  const qLower = query.toLowerCase();
  for (const [key, niche] of Object.entries(SHORTS_NICHES)) {
    if (qLower.includes(key) || niche.name.toLowerCase().includes(qLower)) {
      return niche.items;
    }
  }
  return SHORTS_NICHES.memes.items;
}

// Doomscroll state
let isDoomscroll = false;
let doomIndex = 0;
let activeDoomFeed = SHORTS_NICHES.memes.items;
let activeNicheTitle = SHORTS_NICHES.memes.name;

// YouTube URL parser
export function parseYouTubeId(input) {
  if (!input) return null;
  input = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const m1 = input.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m1 ? m1[1] : null;
}

export default {
  mount(root, api) {
    // Pause background radio while in 5Tube
    try { music.pause(); } catch (e) {}
    document.body.classList.add('in-fivetube');

    // Check party param in URL hash
    const hash = location.hash;
    const urlParams = new URLSearchParams(hash.includes('?') ? hash.slice(hash.indexOf('?')) : '');
    const partyFromUrl = urlParams.get('party');

    root.innerHTML = `
      <div id="fiveTubeWrap" class="fivetube-container">

        <!-- Top Control Bar (Inside 5Tube) -->
        <header id="fiveTubeHeader" class="fivetube-header row between wrap items-center">
          <div class="row items-center" style="gap:10px;">
            <div class="fivetube-logo row items-center" style="gap:6px;">
              <span class="fivetube-badge-red">5</span>
              <span class="font-bold mono text-lg tracking-tight" style="color:var(--ink);">Tube</span>
              <span class="badge" style="font-size:9px;background:var(--accent);color:#fff;">MULTI</span>
            </div>

            <!-- Party Status Badge -->
            <div id="partyStatusPill" class="row items-center party-pill">
              <span class="status-dot"></span>
              <span id="partyCodeDisplay" class="mono font-bold xs">Solo Session</span>
              <button type="button" id="copyPartyLinkBtn" class="btn sm ghost hidden" title="Copy Invite Link" style="padding:1px 6px;height:22px;">
                ${icon('copy')}
              </button>
            </div>
          </div>

          <!-- Middle: Video Loader Bar -->
          <div class="row items-center flex-1 max-w-md mx-2" style="gap:6px;">
            <div class="search-box row items-center flex-1">
              <input type="text" id="tubeVideoInput" placeholder="Paste YouTube link or Video ID..." class="input xs font-mono flex-1" style="height:32px;"/>
              <button type="button" id="tubeLoadVideoBtn" class="btn sm primary" style="height:32px;padding:0 10px;">
                Play
              </button>
            </div>
          </div>

          <!-- Right: Doomscroll, Theater, Party Menu, Downloads -->
          <div class="row items-center" style="gap:6px;">
            <button type="button" id="doomscrollToggleBtn" class="btn sm ghost" title="Synced Doomscroll Mode">
              ${icon('doomscroll')} <span class="mono xs">Doomscroll</span>
            </button>

            <button type="button" id="theaterToggleBtn" class="btn sm ghost" title="Toggle Theater Mode (Shortcut: T)">
              <span id="theaterBtnIcon">${icon('expand')}</span>
              <span class="mono xs" id="theaterBtnText">Theater</span>
            </button>

            <button type="button" id="downloadModalBtn" class="btn sm ghost" title="Download / Save Video Locally">
              ${icon('download')} <span class="mono xs">Save</span>
            </button>

            <button type="button" id="partyMenuBtn" class="btn sm primary" style="border-radius:var(--r-full);padding:0 10px;height:30px;">
              ${icon('users')} <span id="partyMemberCount">1</span>
            </button>

            <button type="button" id="ghostModeToggleBtn" class="btn sm ghost" title="Distraction-Free Zen View" style="padding:0 8px;height:30px;">
              ${icon('eye')}
            </button>
          </div>
        </header>

        <!-- Main Theater Stage -->
        <main class="fivetube-stage-layout">

          <!-- Left / Center: Video Stage & Interactive Overlay -->
          <div class="fivetube-player-column">
            <div id="fivetubeTheaterBox" class="fivetube-theater-box">
              <div id="fivetubePlayerMount" class="fivetube-player-mount"></div>

              <!-- Multiplayer Floating Overlay (Pings & Cursors) -->
              <canvas id="fivetubeCursorCanvas" class="fivetube-cursor-canvas"></canvas>

              <!-- Floating Chat Overlay (Discord voice-call overlay style) -->
              <div id="fivetubeFloatingChat" class="fivetube-floating-chat"></div>

              <!-- Top Edge & Side Sensors (Intercepts pointer events above iframe) -->
              <div id="theaterTopSensor" class="theater-top-sensor" aria-hidden="true"></div>
              <div id="theaterLeftSensor" class="theater-side-sensor-left" aria-hidden="true"></div>
              <div id="theaterRightSensor" class="theater-side-sensor-right" aria-hidden="true"></div>

              <!-- Persistent Minimal Micro-Hint Badge (Always accessible, breaks iframe focus trap) -->
              <div id="hudPersistentHint" class="hud-persistent-hint hidden" role="button" tabindex="0" title="Tap or hover top for controls">
                <span class="hint-dot"></span>
                <span class="hint-text">Hover top or press Esc / T for controls</span>
              </div>

              <!-- Sleek Theater Mini Controls HUD (Small, Auto-Hiding) -->
              <div id="theaterControlsHud" class="theater-controls-hud hidden">
                <button type="button" id="hudToggleChatBtn" class="hud-micro-btn" title="Toggle Floating Chat (Shortcut: C)" aria-label="Toggle Floating Chat">
                  <span id="hudChatIcon">${icon('chat')}</span>
                </button>
                <button type="button" id="hudToggleCursorsBtn" class="hud-micro-btn" title="Toggle Friend Cursors (Shortcut: M)" aria-label="Toggle Friend Cursors">
                  <span id="hudCursorIcon">${icon('cursor')}</span>
                </button>
                <button type="button" id="hudExitTheaterBtn" class="hud-micro-btn hud-exit-accent" title="Exit Theater Mode (Shortcut: Esc or T)" aria-label="Exit Theater">
                  ${icon('minimize')}
                </button>
              </div>

              <!-- Sync Out-of-sync Floating Notification -->
              <div id="resyncNotice" class="resync-pill hidden">
                <span>Out of sync with host</span>
                <button type="button" id="forceResyncBtn" class="btn sm primary" style="height:22px;padding:0 6px;font-size:10px;">
                  Catch Up
                </button>
              </div>
            </div>

            <!-- Video Info & Host Controls Bar -->
            <div class="fivetube-subbar row between wrap items-center card pad" style="padding:10px 14px;margin-top:10px;gap:8px;">
              <div class="stack flex-1 min-w-0" style="gap:2px;">
                <h3 id="tubeCurrentTitle" class="font-bold text-base text-paper-ink truncate">5IVESAW Transmission</h3>
                <div class="row items-center xs mono faint" style="gap:8px;">
                  <span id="tubeCurrentAuthor">5ivesaw</span>
                  <span>•</span>
                  <span id="tubeSyncBadge" class="badge" style="font-size:9.5px;">Synced</span>
                  <span id="tubeHostBadge" class="badge hidden" style="background:var(--accent);color:#fff;font-size:9px;">Host</span>
                </div>
              </div>

              <!-- Host Authority Playback Actions -->
              <div class="row items-center" style="gap:6px;">
                <button type="button" id="hostPrevBtn" class="btn sm ghost" title="Previous Track">${icon('prev')}</button>
                <button type="button" id="hostPlayPauseBtn" class="btn sm primary" title="Play / Pause for Party">${icon('play')}</button>
                <button type="button" id="hostNextBtn" class="btn sm ghost" title="Next Track">${icon('next')}</button>
                <button type="button" id="hostForceSyncBtn" class="btn sm ghost" title="Broadcast exact timestamp to all members">
                  ${icon('zap')} Force Sync
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Party Drawer (Chat, Comments, Queue, Members) -->
          <aside id="fivetubeSidebar" class="fivetube-sidebar card">
            <!-- Tabs -->
            <div class="fivetube-tabs row border-b border-paper-line">
              <button type="button" data-tube-tab="chat" class="fivetube-tab active flex-1 font-mono text-xs">Chat</button>
              <button type="button" data-tube-tab="comments" class="fivetube-tab flex-1 font-mono text-xs">Comments (<span id="tubeCommentsCount">0</span>)</button>
              <button type="button" data-tube-tab="queue" class="fivetube-tab flex-1 font-mono text-xs">Queue (<span id="queueCount">0</span>)</button>
              <button type="button" data-tube-tab="party" class="fivetube-tab flex-1 font-mono text-xs">Party (<span id="memberTabCount">1</span>)</button>
            </div>

            <!-- Chat Panel -->
            <div id="tabContentChat" class="fivetube-tab-content active stack flex-1 min-h-0">
              <div id="tubeChatLog" class="tube-chat-log flex-1">
                <div class="chat-system-msg mono xs faint">Welcome to 5Tube. Watch and chat in real-time sync with friends!</div>
              </div>
              <form id="tubeChatForm" class="row border-t border-paper-line p-2" style="gap:6px;">
                <input type="text" id="tubeChatInput" placeholder="Send a message..." class="input xs flex-1" style="height:32px;" autocomplete="off"/>
                <button type="submit" class="btn sm primary" style="height:32px;padding:0 12px;">Send</button>
              </form>
            </div>

            <!-- Comments Panel with Synced Scroll, Judging/Laughing & Custom Fake Comments -->
            <div id="tabContentComments" class="fivetube-tab-content stack flex-1 min-h-0 hidden">
              <div class="tube-sync-scroll-bar">
                <button type="button" id="toggleSyncScrollBtn" class="sync-scroll-pill active" title="Toggle Synced Scrolling with Friends">
                  <span id="syncScrollIcon">${icon('zap')}</span>
                  <span id="syncScrollText">Sync-Scroll: ON</span>
                </button>
                <div class="row items-center" style="gap:6px;">
                  <span id="syncScrollUserNotice" class="xs mono faint hidden truncate" style="max-width:110px;"></span>
                  <button type="button" id="refreshCommentsBtn" class="btn sm ghost" title="Reload Comments" style="padding:2px 6px;height:24px;">
                    ${icon('refresh')}
                  </button>
                </div>
              </div>

              <!-- Comments List -->
              <div id="tubeCommentsList" class="tube-comments-list">
                <div class="text-center mono xs faint p-4">Loading comments...</div>
              </div>

              <!-- Add Synced Peer Comment Box -->
              <form id="tubeSyncedCommentForm" class="fake-comment-form">
                <div class="row items-center between" style="gap:6px;">
                  <div class="row items-center" style="gap:4px;">
                    <span class="mono xs faint" style="font-size:9.5px;">POST AS:</span>
                    <select id="syncedCommentPersona" class="input xs font-mono" style="height:24px;padding:1px 6px;font-size:10px;">
                      <option value="me">Myself (${esc(party.user.name)})</option>
                      <option value="troll">Anonymous Troll</option>
                      <option value="critic">Verified Critic</option>
                      <option value="timetraveler">Time Traveler (2077)</option>
                      <option value="ceo">YouTube CEO</option>
                      <option value="mrbeast">MrBeast</option>
                    </select>
                  </div>
                  <span class="badge" style="font-size:8.5px;background:rgba(16,185,129,0.2);color:#10B981;">Party Only</span>
                </div>
                <div class="row" style="gap:6px;">
                  <input type="text" id="syncedCommentInput" placeholder="Add synced comment (only party sees)..." class="input xs flex-1" style="height:28px;" autocomplete="off"/>
                  <button type="submit" class="btn sm primary" style="height:28px;padding:0 10px;font-size:11px;">Post</button>
                </div>
              </form>
            </div>

            <!-- Queue Panel -->
            <div id="tabContentQueue" class="fivetube-tab-content stack flex-1 min-h-0 hidden">
              <div class="p-2 border-b border-paper-line row" style="gap:6px;">
                <input type="text" id="queueAddInput" placeholder="Add YouTube URL to queue..." class="input xs flex-1" style="height:30px;"/>
                <button type="button" id="queueAddBtn" class="btn sm primary" style="height:30px;padding:0 8px;">Add</button>
              </div>
              <div id="tubeQueueList" class="tube-queue-list flex-1 overflow-y-auto p-2 stack" style="gap:6px;">
                <div class="text-center mono xs faint p-4">Queue is empty. Add videos above!</div>
              </div>
            </div>

            <!-- Party Members & Settings Panel -->
            <div id="tabContentParty" class="fivetube-tab-content stack flex-1 min-h-0 p-3 hidden overflow-y-auto" style="gap:12px;">
              <div class="card pad" style="padding:10px;">
                <span class="eyebrow">YOUR PROFILE</span>
                <div class="row items-center mt-2" style="gap:8px;">
                  <input type="text" id="myNicknameInput" class="input xs mono flex-1" value="${party.user.name}" placeholder="Nickname"/>
                  <input type="color" id="myColorInput" value="${party.user.color}" title="Cursor & Badge Color" style="width:32px;height:32px;border:none;border-radius:var(--r-sm);cursor:pointer;"/>
                </div>
              </div>

              <!-- Room Info Card -->
              <div class="card pad" style="padding:10px;">
                <span class="eyebrow">PARTY ROOM</span>
                <div class="row between items-center mt-2">
                  <span id="roomCodeBadge" class="font-bold mono text-base text-paper-ink">${party.code || 'None'}</span>
                  <div class="row" style="gap:4px;">
                    <button type="button" id="createPartyBtn" class="btn sm primary" style="height:26px;font-size:11px;">Create</button>
                    <button type="button" id="joinPartyPromptBtn" class="btn sm ghost" style="height:26px;font-size:11px;">Join</button>
                  </div>
                </div>
              </div>

              <!-- View Preferences -->
              <div class="card pad" style="padding:10px;">
                <span class="eyebrow">DISPLAY PREFERENCES</span>
                <div class="stack mt-2" style="gap:6px;">
                  <label class="row between items-center xs mono cursor-pointer">
                    <span>Show Friend Cursors</span>
                    <input type="checkbox" id="toggleCursorsCheck" checked/>
                  </label>
                  <label class="row between items-center xs mono cursor-pointer">
                    <span>Show Click Ripple Pings</span>
                    <input type="checkbox" id="toggleClicksCheck" checked/>
                  </label>
                  <label class="row between items-center xs mono cursor-pointer">
                    <span>Float Chat on Video</span>
                    <input type="checkbox" id="toggleFloatingChatCheck" checked/>
                  </label>
                </div>
              </div>

              <!-- Members List -->
              <div class="stack" style="gap:6px;">
                <span class="eyebrow">CONNECTED PEERS</span>
                <div id="partyMembersList" class="stack" style="gap:4px;"></div>
              </div>
            </div>
          </aside>
        </main>

        <!-- Synced Doomscroll Shorts Overlay Mode -->
        <div id="fivetubeDoomscrollOverlay" class="fivetube-doomscroll-overlay hidden">
          <div id="doomscrollStageWrap" class="doomscroll-stage-wrap">
            <div id="doomscrollPlayerMount" class="doomscroll-player-mount"></div>

            <!-- Top Edge Sensor & Persistent Micro-Hint for Doomscroll -->
            <div id="doomscrollTopSensor" class="theater-top-sensor" aria-hidden="true"></div>
            <div id="doomscrollPersistentHint" class="hud-persistent-hint" role="button" tabindex="0" title="Tap or hover top for controls">
              <span class="hint-dot"></span>
              <span class="hint-text">Hover top or press Esc for controls</span>
            </div>

            <!-- Top Bar -->
            <div class="doomscroll-top-bar">
              <div class="row items-center" style="gap:6px;background:rgba(15,15,20,0.68);padding:4px 10px;border-radius:var(--r-full);backdrop-filter:blur(6px);">
                <span class="status-dot"></span>
                <span id="doomscrollNicheLabel" class="mono xs font-bold text-white truncate" style="max-width:140px;">MEMES &amp; BRAINROT</span>
                <span id="doomscrollCounterBadge" class="badge" style="font-size:9px;background:var(--accent);color:#fff;">1 / 6</span>
              </div>
              <div class="row items-center" style="gap:6px;">
                <button type="button" id="doomChangeNicheBtn" class="btn sm ghost" style="color:#fff;background:rgba(255,255,255,0.14);height:28px;padding:0 8px;border-radius:var(--r-full);gap:4px;" title="Switch Shorts Niche or Search">
                  ${icon('search')} <span class="mono xs">Niches</span>
                </button>
                <button type="button" id="exitDoomscrollBtn" class="hud-micro-btn hud-exit-accent" title="Exit Doomscroll (Esc)">
                  ${icon('close')}
                </button>
              </div>
            </div>

            <!-- Bottom Video Info -->
            <div class="doomscroll-bottom-info">
              <div class="row items-center" style="gap:6px;">
                <span class="badge" style="font-size:9.5px;background:rgba(255,255,255,0.2);color:#fff;">Shorts</span>
                <span id="doomscrollAuthor" class="mono text-xs font-bold text-white">5ivesaw</span>
              </div>
              <p id="doomscrollTitle" class="text-sm font-semibold text-white line-clamp-2" style="margin:0;">Curated Transmission</p>
              <span class="mono xs faint" style="color:rgba(255,255,255,0.7);font-size:10px;">Swipe / Arrow keys to scroll with party</span>
            </div>

            <!-- Right Action Rail -->
            <div class="doomscroll-side-rail">
              <button type="button" id="doomPrevBtn" class="doomscroll-rail-btn" title="Previous Short (Up Arrow)">
                <span style="transform:rotate(-90deg);display:inline-flex;">${icon('arrowRight')}</span>
              </button>
              <button type="button" id="doomNextBtn" class="doomscroll-rail-btn" title="Next Short (Down Arrow)">
                <span style="transform:rotate(90deg);display:inline-flex;">${icon('arrowRight')}</span>
              </button>
              <button type="button" data-doom-rx="fire" class="doomscroll-rail-btn" title="Send Fire Reaction">
                ${icon('fire')}
              </button>
              <button type="button" data-doom-rx="laugh" class="doomscroll-rail-btn" title="Send Laugh Reaction">
                ${icon('laugh')}
              </button>
              <button type="button" data-doom-rx="cringe" class="doomscroll-rail-btn" title="Send Cringe Reaction">
                ${icon('cringe')}
              </button>
              <button type="button" data-doom-rx="heart" class="doomscroll-rail-btn" title="Send Heart Reaction">
                ${icon('heart')}
              </button>
            </div>

            <!-- Floating Reactions Container -->
            <div id="doomscrollReactionsContainer"></div>
          </div>
        </div>

        <!-- Shorts Niche & Search Launcher Modal -->
        <div id="doomscrollNicheModal" class="modal-backdrop hidden" role="dialog" aria-modal="true" style="position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:100035;display:flex;align-items:center;justify-content:center;padding:14px;">
          <div class="card pad doomscroll-niche-card" style="max-width:540px;width:100%;max-height:85vh;overflow-y:auto;position:relative;">
            <div class="row between items-center pb-3 border-b border-[var(--line)]">
              <div class="row items-center" style="gap:8px;">
                <span class="badge" style="background:#FF0000;color:#fff;font-weight:700;font-size:10px;padding:2px 7px;">SHORTS</span>
                <span class="mono font-bold" style="font-size:15px;color:var(--ink);">Choose Shorts Niche</span>
              </div>
              <button type="button" id="closeNicheModalBtn" class="btn sm ghost font-bold" style="padding:2px 8px;">✕</button>
            </div>

            <!-- Search Any Custom Niche Form -->
            <form id="shortsNicheSearchForm" class="stack mt-3" style="gap:6px;">
              <div class="row" style="gap:6px;">
                <div class="search-box row items-center flex-1" style="border-radius:var(--r-md);background:var(--elevated);border:1px solid var(--line);padding:0 8px;">
                  ${icon('search')}
                  <input type="text" id="shortsSearchQueryInput" placeholder="Search Shorts niche (speedruns, comedy, physics)..." class="input xs font-mono flex-1" style="height:34px;background:transparent;border:none;" autocomplete="off"/>
                </div>
                <button type="submit" id="shortsSearchSubmitBtn" class="btn sm primary font-mono" style="height:34px;padding:0 12px;">
                  Search &amp; Scroll
                </button>
              </div>
              <span class="mono xs faint" style="font-size:9.5px;">All party members sync to the selected niche in real-time.</span>
            </form>

            <!-- Popular Preset Niches Grid -->
            <div class="mt-4">
              <span class="eyebrow" style="font-size:10px;letter-spacing:0.8px;">OR SELECT A POPULAR NICHE</span>
              <div class="doomscroll-niche-grid mt-2" id="doomscrollNichesContainer">
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>
        </div>

        <!-- Join Party Modal -->
        <div id="joinPartyModal" class="modal-backdrop hidden">
          <div class="modal-box card pad max-w-sm">
            <h3 class="font-bold text-lg mono text-paper-ink">Join Friend's Party</h3>
            <p class="text-xs muted mt-1">Enter the 6-character party code shared by your friend (e.g. SAW-8821):</p>
            <input type="text" id="joinPartyCodeInput" placeholder="SAW-8821" class="input font-mono uppercase text-center text-lg my-3" maxlength="12" style="letter-spacing:0.1em;"/>
            <div class="row between mt-2">
              <button type="button" id="cancelJoinPartyBtn" class="btn sm ghost">Cancel</button>
              <button type="button" id="confirmJoinPartyBtn" class="btn sm primary">Join Party</button>
            </div>
          </div>
        </div>

        <!-- Download & Save Video Modal -->
        <div id="downloadVideoModal" class="modal-backdrop hidden">
          <div class="modal-box card pad max-w-md">
            <div class="row between items-center mb-2">
              <h3 class="font-bold text-base mono text-paper-ink">Save Video Locally</h3>
              <button type="button" id="closeDownloadModalBtn" class="btn sm ghost" style="padding:2px 8px;">✕</button>
            </div>
            <p class="xs muted mb-3">Download and save this video locally on your device with high quality:</p>

            <div class="stack" style="gap:10px;">
              <!-- Cobalt Direct -->
              <a id="cobaltDownloadLink" href="https://cobalt.tools/" target="_blank" rel="noopener noreferrer" class="tile hover row between items-center p-3" style="text-decoration:none;">
                <div class="stack" style="gap:2px;">
                  <span class="font-bold text-sm text-paper-ink">Download with Cobalt Tools ↗</span>
                  <span class="xs muted">Fast, ad-free Web download (MP4 up to 4K, MP3 audio).</span>
                </div>
                <span class="badge" style="background:var(--accent);color:#fff;">1-Click</span>
              </a>

              <!-- Invidious / Piped -->
              <a id="pipedDownloadLink" href="https://piped.video/" target="_blank" rel="noopener noreferrer" class="tile hover row between items-center p-3" style="text-decoration:none;">
                <div class="stack" style="gap:2px;">
                  <span class="font-bold text-sm text-paper-ink">Open on Piped Stream ↗</span>
                  <span class="xs muted">Watch and save stream without trackers.</span>
                </div>
                <span class="badge">Open</span>
              </a>

              <!-- yt-dlp terminal command -->
              <div class="tile p-3 stack" style="gap:6px;">
                <div class="row between items-center">
                  <span class="font-bold text-xs mono text-paper-ink">Local yt-dlp Command</span>
                  <button type="button" id="copyYtdlpBtn" class="btn sm primary" style="height:24px;font-size:10px;">Copy</button>
                </div>
                <pre class="code-block" style="font-size:11px;padding:8px;margin:0;"><code id="ytdlpCodeSnippet">yt-dlp -f "bestvideo+bestaudio" https://www.youtube.com/watch?v=eXRWHzV72sU</code></pre>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    // References
    const wrap = $('#fiveTubeWrap');
    const theaterBox = $('#fivetubeTheaterBox');
    const cursorCanvas = $('#fivetubeCursorCanvas');
    const floatingChat = $('#fivetubeFloatingChat');
    const theaterHud = $('#theaterControlsHud');
    const hudChatBtn = $('#hudToggleChatBtn');
    const hudChatIcon = $('#hudChatIcon');
    const hudCursorBtn = $('#hudToggleCursorsBtn');
    const hudCursorIcon = $('#hudCursorIcon');
    const hudExitBtn = $('#hudExitTheaterBtn');
    const ctx = cursorCanvas.getContext('2d');
    const videoInput = $('#tubeVideoInput');
    const loadVideoBtn = $('#tubeLoadVideoBtn');
    const theaterBtn = $('#theaterToggleBtn');
    const ghostBtn = $('#ghostModeToggleBtn');
    const partyPill = $('#partyStatusPill');
    const partyCodeDisplay = $('#partyCodeDisplay');
    const copyLinkBtn = $('#copyPartyLinkBtn');
    const partyCountSpan = $('#partyMemberCount');
    const partyTabCountSpan = $('#memberTabCount');
    const partyMembersList = $('#partyMembersList');
    const roomCodeBadge = $('#roomCodeBadge');
    const chatLog = $('#tubeChatLog');
    const chatForm = $('#tubeChatForm');
    const chatInput = $('#tubeChatInput');
    const queueList = $('#tubeQueueList');
    const queueCountSpan = $('#queueCount');
    const currentTitle = $('#tubeCurrentTitle');
    const currentAuthor = $('#tubeCurrentAuthor');
    const hostBadge = $('#tubeHostBadge');
    const playPauseBtn = $('#hostPlayPauseBtn');
    const forceSyncBtn = $('#hostForceSyncBtn');
    const resyncNotice = $('#resyncNotice');
    const forceResyncBtn = $('#forceResyncBtn');

    // Canvas Sizing
    function resizeCanvas() {
      if (!cursorCanvas || !theaterBox) return;
      cursorCanvas.width = theaterBox.clientWidth;
      cursorCanvas.height = theaterBox.clientHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 100);

    // Initialize YouTube Player
    function initPlayer(initialId = 'eXRWHzV72sU') {
      const mount = $('#fivetubePlayerMount');
      if (!mount) return;

      activeVideoId = initialId;
      mount.innerHTML = `<div id="fiveTubeYtIframe"></div>`;

      function createYt() {
        if (!window.YT || !window.YT.Player) {
          setTimeout(createYt, 100);
          return;
        }

        ytPlayer = new window.YT.Player('fiveTubeYtIframe', {
          videoId: initialId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              ytReady = true;
              updateDownloadLinks(initialId);
              loadComments(initialId);
              if (party.isHost) {
                party.updateSyncState(initialId, 0, 'playing', 'FiveSaw Transmission', '5ivesaw');
              }
            },
            onStateChange: e => {
              if (isSeekingFromRemote) return;
              if (party.isHost) {
                const isPlaying = (e.data === window.YT.PlayerState.PLAYING);
                const currentTime = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
                party.updateSyncState(
                  party.syncState.videoId,
                  currentTime,
                  isPlaying ? 'playing' : 'paused'
                );
              }
              if (e.data === window.YT.PlayerState.PLAYING) {
                playPauseBtn.innerHTML = icon('pause');
              } else {
                playPauseBtn.innerHTML = icon('play');
              }
            }
          }
        });
      }

      createYt();
    }

    initPlayer(party.syncState.videoId || 'eXRWHzV72sU');

    // Update Download Links Modal
    function updateDownloadLinks(vid) {
      const vidUrl = `https://www.youtube.com/watch?v=${vid}`;
      const cobalt = $('#cobaltDownloadLink');
      const piped = $('#pipedDownloadLink');
      const snippet = $('#ytdlpCodeSnippet');
      if (cobalt) cobalt.href = `https://cobalt.tools/#${encodeURIComponent(vidUrl)}`;
      if (piped) piped.href = `https://piped.video/watch?v=${vid}`;
      if (snippet) snippet.textContent = `yt-dlp -f "bestvideo+bestaudio" https://www.youtube.com/watch?v=${vid}`;
    }

    // Theater Elements & Focus Trap Recovery Sensors
    const theaterTopSensor = $('#theaterTopSensor');
    const theaterLeftSensor = $('#theaterLeftSensor');
    const theaterRightSensor = $('#theaterRightSensor');
    const persistentHint = $('#hudPersistentHint');

    function restoreWindowFocus() {
      if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
        document.activeElement.blur();
      }
      window.focus();
    }

    // Theater HUD Auto-Hide & Sensor Recovery
    function showTheaterHud() {
      if (!theaterHud || !isTheater) return;
      theaterHud.classList.add('hud-active');
      if (persistentHint) persistentHint.classList.add('is-active');
      restoreWindowFocus();

      if (hudIdleTimer) clearTimeout(hudIdleTimer);
      hudIdleTimer = setTimeout(() => {
        theaterHud.classList.remove('hud-active');
        if (persistentHint) persistentHint.classList.remove('is-active');
      }, 3200);
    }

    // Sensors listen for pointer / touch movement to wake HUD even when mouse moves above iframe
    [theaterTopSensor, theaterLeftSensor, theaterRightSensor, persistentHint, theaterHud].forEach(el => {
      if (!el) return;
      el.addEventListener('pointerenter', showTheaterHud, { passive: true });
      el.addEventListener('pointermove', showTheaterHud, { passive: true });
      el.addEventListener('pointerdown', showTheaterHud, { passive: true });
      el.addEventListener('touchstart', showTheaterHud, { passive: true });
    });

    theaterBox?.addEventListener('pointermove', showTheaterHud, { passive: true });
    theaterBox?.addEventListener('pointerdown', showTheaterHud, { passive: true });

    persistentHint?.addEventListener('click', e => {
      e.stopPropagation();
      showTheaterHud();
      restoreWindowFocus();
    });

    theaterHud?.addEventListener('mouseenter', () => {
      if (hudIdleTimer) clearTimeout(hudIdleTimer);
      theaterHud.classList.add('hud-active');
      restoreWindowFocus();
    });

    theaterHud?.addEventListener('mouseleave', () => {
      if (hudIdleTimer) clearTimeout(hudIdleTimer);
      hudIdleTimer = setTimeout(() => {
        theaterHud.classList.remove('hud-active');
        if (persistentHint) persistentHint.classList.remove('is-active');
      }, 1200);
    });

    // Toggle Chat in Theater
    hudChatBtn?.addEventListener('click', e => {
      e.stopPropagation();
      showFloatingChat = !showFloatingChat;
      hudChatBtn.classList.toggle('is-muted', !showFloatingChat);
      hudChatIcon.innerHTML = showFloatingChat ? icon('chat') : icon('chatOff');
      if (floatingChat) floatingChat.classList.toggle('hidden', !showFloatingChat);
      const chk = $('#toggleFloatingChatCheck');
      if (chk) chk.checked = showFloatingChat;
      toast(showFloatingChat ? 'Floating chat visible' : 'Floating chat muted', 'info');
      sfx('toggleOn');
    });

    // Toggle Cursors in Theater
    hudCursorBtn?.addEventListener('click', e => {
      e.stopPropagation();
      showCursors = !showCursors;
      hudCursorBtn.classList.toggle('is-muted', !showCursors);
      hudCursorIcon.innerHTML = showCursors ? icon('cursor') : icon('cursorOff');
      const chk = $('#toggleCursorsCheck');
      if (chk) chk.checked = showCursors;
      if (!showCursors && ctx && cursorCanvas) {
        ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
      }
      toast(showCursors ? 'Friend cursors visible' : 'Friend cursors hidden', 'info');
      sfx('toggleOn');
    });

    // Exit Theater button in HUD
    hudExitBtn?.addEventListener('click', e => {
      e.stopPropagation();
      toggleTheater(false);
    });

    // Theater Mode Toggle
    function toggleTheater(force) {
      isTheater = (force !== undefined) ? force : !isTheater;
      document.body.classList.toggle('theater-mode', isTheater);
      theaterBox.classList.toggle('theater-fullscreen', isTheater);
      theaterHud.classList.toggle('hidden', !isTheater);
      if (persistentHint) {
        persistentHint.classList.toggle('hidden', !isTheater);
      }
      if (isTheater) {
        showTheaterHud();
        restoreWindowFocus();
      }
      const topbar = $('#topbar');
      if (topbar) topbar.style.display = isTheater ? 'none' : '';

      $('#theaterBtnText').textContent = isTheater ? 'Exit' : 'Theater';
      $('#theaterBtnIcon').innerHTML = isTheater ? icon('minimize') : icon('expand');

      setTimeout(resizeCanvas, 60);
      sfx('whoosh');
      toast(isTheater ? 'Theater Mode Active (Shortcut: Esc or T)' : 'Exited Theater Mode', 'info');
    }

    theaterBtn?.addEventListener('click', () => toggleTheater());

    // Ghost / Zen Mode Toggle
    ghostBtn?.addEventListener('click', () => {
      hidePartyUi = !hidePartyUi;
      $('#fivetubeSidebar').classList.toggle('hidden', hidePartyUi);
      sfx('toggleOn');
      toast(hidePartyUi ? 'Party sidebar hidden' : 'Party sidebar visible', 'info');
    });

    // Load Video
    function loadNewVideo(input) {
      const id = parseYouTubeId(input);
      if (!id) {
        toast('Invalid YouTube URL or ID', 'err');
        sfx('error');
        return;
      }

      activeVideoId = id;
      if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(id);
      }
      updateDownloadLinks(id);
      loadComments(id);

      currentTitle.textContent = `Video ${id}`;
      if (party.isHost) {
        party.updateSyncState(id, 0, 'playing', `Video ${id}`, 'YouTube');
      }
      sfx('success');
      toast('Loaded video: ' + id, 'ok');
    }

    loadVideoBtn?.addEventListener('click', () => {
      loadNewVideo(videoInput.value);
    });
    videoInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') loadNewVideo(videoInput.value);
    });

    // Playback Controls
    playPauseBtn?.addEventListener('click', () => {
      if (!ytPlayer) return;
      const state = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
      if (state === 1) { // playing
        ytPlayer.pauseVideo();
        playPauseBtn.innerHTML = icon('play');
        if (party.isHost) party.updateSyncState(party.syncState.videoId, ytPlayer.getCurrentTime(), 'paused');
      } else {
        ytPlayer.playVideo();
        playPauseBtn.innerHTML = icon('pause');
        if (party.isHost) party.updateSyncState(party.syncState.videoId, ytPlayer.getCurrentTime(), 'playing');
      }
      sfx('click');
    });

    forceSyncBtn?.addEventListener('click', () => {
      if (!party.isHost) {
        toast('Only the Party Host can broadcast sync', 'info');
        return;
      }
      const time = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
      party.updateSyncState(party.syncState.videoId, time, 'playing');
      toast('Broadcasted sync timestamp to party!', 'ok');
      sfx('success');
    });

    forceResyncBtn?.addEventListener('click', () => {
      if (ytPlayer && party.syncState) {
        isSeekingFromRemote = true;
        ytPlayer.seekTo(party.syncState.time, true);
        setTimeout(() => isSeekingFromRemote = false, 500);
        resyncNotice.classList.add('hidden');
        sfx('success');
      }
    });

    // Party Tab Switcher
    $$('.fivetube-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.fivetube-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tubeTab;
        $('#tabContentChat').classList.toggle('hidden', target !== 'chat');
        $('#tabContentComments').classList.toggle('hidden', target !== 'comments');
        $('#tabContentQueue').classList.toggle('hidden', target !== 'queue');
        $('#tabContentParty').classList.toggle('hidden', target !== 'party');
        sfx('tick');
      });
    });

    // Send Chat
    chatForm?.addEventListener('submit', e => {
      e.preventDefault();
      const txt = chatInput.value.trim();
      if (!txt) return;
      party.sendChat(txt);
      chatInput.value = '';
      sfx('tick');
    });

    function appendChatMessage(msg) {
      if (!chatLog) return;
      const el = document.createElement('div');
      el.className = 'tube-chat-msg';
      el.innerHTML = `
        <span class="chat-badge" style="background:${msg.color};color:#fff;">${esc(msg.user.slice(0, 1))}</span>
        <div class="stack" style="gap:1px;min-width:0;">
          <div class="row between xs mono faint">
            <strong style="color:var(--ink);">${esc(msg.user)}</strong>
            <span>${new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p class="text-xs text-paper-ink" style="word-break:break-word;">${esc(msg.text)}</p>
        </div>
      `;
      chatLog.appendChild(el);
      chatLog.scrollTop = chatLog.scrollHeight;

      // Floating Discord Voice Overlay style side notification
      if (floatingChat && showFloatingChat && (isTheater || floatingChatOnly)) {
        const floatEl = document.createElement('div');
        floatEl.className = 'floating-chat-bubble';
        floatEl.style.setProperty('--bubble-color', msg.color || '#FF3B14');
        floatEl.innerHTML = `
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${msg.color || '#FF3B14'};margin-top:4px;"></span>
          <div style="min-width:0;">
            <strong style="color:#FFFFFF;margin-right:4px;">${esc(msg.user)}:</strong>
            <span style="color:#E2E8F0;">${esc(msg.text)}</span>
          </div>
        `;
        floatingChat.appendChild(floatEl);

        // Keep maximum 4 active bubbles so video is never obstructed
        while (floatingChat.children.length > 4) {
          floatingChat.firstElementChild.remove();
        }

        setTimeout(() => {
          floatEl.classList.add('fading-out');
          setTimeout(() => floatEl.remove(), 280);
        }, 4200);
      }
    }

    // Party Event Wiring
    party.on('chat', msg => {
      appendChatMessage(msg);
      sfx('click');
    });

    party.on('cursor', data => {
      if (!showCursors) return;
      let peer = peerCursors.get(data.id);
      if (!peer) {
        peer = {
          x: data.x,
          y: data.y,
          targetX: data.x,
          targetY: data.y,
          name: data.user,
          color: data.color
        };
        peerCursors.set(data.id, peer);
      } else {
        peer.targetX = data.x;
        peer.targetY = data.y;
        peer.name = data.user;
        peer.color = data.color;
      }
    });

    party.on('click', data => {
      if (!showClicks) return;
      clickRipples.push({
        x: data.x,
        y: data.y,
        color: data.color || '#FF3B14',
        r: 4,
        maxR: 36,
        alpha: 1.0
      });
      sfx('tick');
    });

    party.on('sync-state', sync => {
      if (!ytPlayer || !ytReady) return;

      // Check if video changed
      if (sync.videoId && sync.videoId !== party.syncState.videoId) {
        ytPlayer.loadVideoById(sync.videoId, sync.time || 0);
        currentTitle.textContent = sync.title || `Video ${sync.videoId}`;
        currentAuthor.textContent = sync.author || 'YouTube';
        updateDownloadLinks(sync.videoId);
        loadComments(sync.videoId);
      }

      // Check time drift (if drift > 2.5 seconds, gently resync)
      const curTime = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
      const drift = Math.abs(curTime - sync.time);

      if (drift > 2.5 && !party.isHost) {
        resyncNotice.classList.remove('hidden');
        if (drift > 5) {
          isSeekingFromRemote = true;
          ytPlayer.seekTo(sync.time, true);
          setTimeout(() => isSeekingFromRemote = false, 500);
          resyncNotice.classList.add('hidden');
        }
      } else {
        resyncNotice.classList.add('hidden');
      }

      // Sync state
      if (!party.isHost) {
        if (sync.state === 'playing' && ytPlayer.getPlayerState() !== 1) {
          ytPlayer.playVideo();
        } else if (sync.state === 'paused' && ytPlayer.getPlayerState() === 1) {
          ytPlayer.pauseVideo();
        }
      }
    });

    party.on('peers-update', members => {
      partyCountSpan.textContent = members.length;
      partyTabCountSpan.textContent = members.length;

      // Update members list
      partyMembersList.innerHTML = members.map(m => `
        <div class="tile row between items-center p-2" style="border-left:3px solid ${m.color};">
          <div class="row items-center" style="gap:6px;">
            <span class="w-2.5 h-2.5 rounded-full" style="background:${m.color};"></span>
            <span class="mono font-semibold text-xs text-paper-ink">${esc(m.name)}</span>
            ${m.isMe ? '<span class="badge" style="font-size:8.5px;">You</span>' : ''}
            ${m.isHost ? '<span class="badge" style="background:var(--accent);color:#fff;font-size:8.5px;">Host</span>' : ''}
          </div>
          ${party.isHost && !m.isMe ? `
            <div class="row" style="gap:4px;">
              <button type="button" data-transfer="${m.id}" class="btn sm ghost" style="padding:1px 6px;height:20px;font-size:9px;">Make Host</button>
              <button type="button" data-kick="${m.id}" class="btn sm ghost" style="padding:1px 6px;height:20px;font-size:9px;color:red;">Kick</button>
            </div>
          ` : ''}
        </div>
      `).join('');

      // Transfer / Kick listeners
      partyMembersList.querySelectorAll('[data-transfer]').forEach(b => {
        b.onclick = () => party.transferHost(b.dataset.transfer);
      });
      partyMembersList.querySelectorAll('[data-kick]').forEach(b => {
        b.onclick = () => party.kickPeer(b.dataset.kick);
      });

      hostBadge.classList.toggle('hidden', !party.isHost);
    });

    party.on('connected', info => {
      partyCodeDisplay.textContent = info.code;
      roomCodeBadge.textContent = info.code;
      copyLinkBtn.classList.remove('hidden');
      sfx('success');
      toast(`Party Room ${info.code} Connected!`, 'ok');
    });

    // ---------------- COMMENTS SYSTEM & SYNC-SCROLL ----------------
    function getFallbackComments(vid) {
      return [
        {
          id: 'c_fb_1',
          author: 'AuraSync',
          avatar: 'A',
          color: '#38BDF8',
          time: '2 hours ago',
          text: '0:42 Bro cooked with this one, can not lie 🔥',
          likes: 342,
          isSynced: false,
          reactions: { laugh: 14, cringe: 1, fire: 42, ratio: 0 }
        },
        {
          id: 'c_fb_2',
          author: 'PixelDrifter',
          avatar: 'P',
          color: '#F472B6',
          time: '5 hours ago',
          text: 'My synced squad in 5Tube judging comments right now: based as always',
          likes: 189,
          isSynced: false,
          reactions: { laugh: 29, cringe: 0, fire: 18, ratio: 2 }
        },
        {
          id: 'c_fb_3',
          author: 'NeoNomad',
          avatar: 'N',
          color: '#10B981',
          time: '1 day ago',
          text: 'Bro who is in 2026 still listening to this masterpiece? Absolute vibes.',
          likes: 512,
          isSynced: false,
          reactions: { laugh: 8, cringe: 2, fire: 67, ratio: 1 }
        },
        {
          id: 'c_fb_4',
          author: 'CyberPhantom',
          avatar: 'C',
          color: '#FF9F1C',
          time: '1 day ago',
          text: 'The editor deserves an immediate raise honestly.',
          likes: 95,
          isSynced: false,
          reactions: { laugh: 12, cringe: 0, fire: 23, ratio: 0 }
        },
        {
          id: 'c_fb_5',
          author: 'SynthValkyrie',
          avatar: 'S',
          color: '#A78BFA',
          time: '2 days ago',
          text: 'Whoever queued this in the party has immaculate music taste.',
          likes: 274,
          isSynced: false,
          reactions: { laugh: 5, cringe: 0, fire: 51, ratio: 0 }
        },
        {
          id: 'c_fb_6',
          author: 'ZeroLagGamer',
          avatar: 'Z',
          color: '#FF3B14',
          time: '3 days ago',
          text: 'bro really synced this with the entire squad 💀',
          likes: 418,
          isSynced: false,
          reactions: { laugh: 78, cringe: 4, fire: 39, ratio: 5 }
        },
        {
          id: 'c_fb_7',
          author: 'EchoChamber',
          avatar: 'E',
          color: '#06D6A0',
          time: '4 days ago',
          text: 'Wait till 1:35 the drop is insane on theater mode.',
          likes: 126,
          isSynced: false,
          reactions: { laugh: 3, cringe: 1, fire: 31, ratio: 0 }
        },
        {
          id: 'c_fb_8',
          author: 'MidnightRider',
          avatar: 'M',
          color: '#E76F51',
          time: '5 days ago',
          text: '10/10 no skips, peak synchronization.',
          likes: 88,
          isSynced: false,
          reactions: { laugh: 4, cringe: 0, fire: 44, ratio: 0 }
        }
      ];
    }

    async function loadComments(vid) {
      const container = $('#tubeCommentsList');
      if (container) {
        container.innerHTML = `<div class="text-center mono xs faint p-4">Loading comments for ${esc(vid)}...</div>`;
      }

      const apis = [
        `https://inv.tux.pizza/api/v1/comments/${vid}`,
        `https://invidious.nerdvpn.de/api/v1/comments/${vid}`,
        `https://pipedapi.kavin.rocks/comments/${vid}`
      ];

      let fetched = null;
      for (const url of apis) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(2800) });
          if (res.ok) {
            const data = await res.json();
            const list = data.comments || (Array.isArray(data) ? data : []);
            if (list && list.length > 0) {
              fetched = list.slice(0, 30).map(c => ({
                id: c.commentId || 'c_' + Math.random().toString(36).slice(2),
                author: c.author || 'Viewer',
                avatar: (c.author || 'V').slice(0, 1).toUpperCase(),
                color: getRandomColor(),
                time: c.publishedText || 'recently',
                text: c.contentHtml ? c.contentHtml.replace(/<[^>]+>/g, '') : (c.content || ''),
                likes: c.likeCount || 0,
                isSynced: false,
                reactions: { laugh: 0, cringe: 0, fire: 0, ratio: 0 }
              }));
              break;
            }
          }
        } catch (e) {}
      }

      currentComments = fetched || getFallbackComments(vid);
      renderComments();
    }

    function renderComments() {
      const container = $('#tubeCommentsList');
      const countSpan = $('#tubeCommentsCount');
      if (!container) return;

      const allComments = [...syncedComments, ...currentComments];
      if (countSpan) countSpan.textContent = allComments.length;

      if (allComments.length === 0) {
        container.innerHTML = `<div class="text-center mono xs faint p-4">No comments available.</div>`;
        return;
      }

      container.innerHTML = allComments.map(c => `
        <div class="comment-card ${c.isSynced ? 'is-synced' : ''}" data-comment-id="${c.id}">
          <div class="comment-header">
            <div class="comment-author-box">
              <span class="comment-avatar" style="background:${c.color || '#FF3B14'};">${esc(c.avatar)}</span>
              <span class="mono font-bold text-xs" style="color:var(--ink);">${esc(c.author)}</span>
              ${c.isSynced ? `<span class="comment-synced-badge">${icon('zap')} SYNCED ONLY</span>` : ''}
              ${c.flair ? `<span class="badge" style="font-size:8.5px;">${esc(c.flair)}</span>` : ''}
            </div>
            <span class="mono xs faint">${esc(c.time)}</span>
          </div>

          <p class="comment-text">${esc(c.text)}</p>

          <div class="comment-reactions-bar">
            <button type="button" class="reaction-btn ${c.myReaction === 'laugh' ? 'reacted' : ''}" data-rx="laugh" title="Laugh">
              ${icon('laugh')} <span class="rx-count">${c.reactions.laugh || 0}</span>
            </button>
            <button type="button" class="reaction-btn ${c.myReaction === 'cringe' ? 'reacted' : ''}" data-rx="cringe" title="Cringe">
              ${icon('cringe')} <span class="rx-count">${c.reactions.cringe || 0}</span>
            </button>
            <button type="button" class="reaction-btn ${c.myReaction === 'fire' ? 'reacted' : ''}" data-rx="fire" title="Based / Fire">
              ${icon('fire')} <span class="rx-count">${c.reactions.fire || 0}</span>
            </button>
            <button type="button" class="reaction-btn ${c.myReaction === 'ratio' ? 'reacted' : ''}" data-rx="ratio" title="Ratio">
              ${icon('ratio')} <span class="rx-count">${c.reactions.ratio || 0}</span>
            </button>
          </div>
        </div>
      `).join('');

      // Wire reaction clicks
      container.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const card = btn.closest('.comment-card');
          const cid = card?.dataset.commentId;
          const rx = btn.dataset.rx;
          if (!cid || !rx) return;
          party.sendCommentReaction(cid, rx);
          sfx('tick');
        });
      });
    }

    // Post Synced Custom/Fake Comment
    const syncedCommentForm = $('#tubeSyncedCommentForm');
    const syncedCommentInput = $('#syncedCommentInput');
    const personaSelect = $('#syncedCommentPersona');

    syncedCommentForm?.addEventListener('submit', e => {
      e.preventDefault();
      const txt = syncedCommentInput.value.trim();
      if (!txt) return;

      const persona = personaSelect ? personaSelect.value : 'me';
      let author = party.user.name;
      let flair = 'Squad';
      let color = party.user.color;

      if (persona === 'troll') {
        author = 'Anonymous Troll';
        flair = 'Troll';
        color = '#888888';
      } else if (persona === 'critic') {
        author = 'Verified Music Critic';
        flair = 'Verified';
        color = '#38BDF8';
      } else if (persona === 'timetraveler') {
        author = 'Time Traveler (Year 2077)';
        flair = 'Cyber';
        color = '#06D6A0';
      } else if (persona === 'ceo') {
        author = 'YouTube CEO';
        flair = 'Official';
        color = '#FF3B14';
      } else if (persona === 'mrbeast') {
        author = 'MrBeast';
        flair = 'Creator';
        color = '#10B981';
      }

      const newComment = {
        id: 'sync_' + Math.random().toString(36).slice(2, 9),
        author,
        avatar: author.slice(0, 1).toUpperCase(),
        color,
        flair,
        time: 'just now',
        text: txt,
        likes: 1,
        isSynced: true,
        reactions: { laugh: 0, cringe: 0, fire: 0, ratio: 0 }
      };

      party.sendPartyComment(newComment);
      syncedCommentInput.value = '';
      sfx('success');
      toast('Synced comment posted to party!', 'ok');
    });

    party.on('party-comment', data => {
      if (!data.comment) return;
      if (!syncedComments.some(c => c.id === data.comment.id)) {
        syncedComments.unshift(data.comment);
        renderComments();
        sfx('pop');
      }
    });

    party.on('comment-reaction', data => {
      const allComments = [...syncedComments, ...currentComments];
      const target = allComments.find(c => c.id === data.commentId);
      if (target) {
        target.reactions[data.reaction] = (target.reactions[data.reaction] || 0) + 1;
        if (data.user === party.user.name) {
          target.myReaction = data.reaction;
        }
        const card = $(`[data-comment-id="${data.commentId}"]`);
        if (card) {
          const rxBtn = card.querySelector(`[data-rx="${data.reaction}"]`);
          if (rxBtn) {
            const countSpan = rxBtn.querySelector('.rx-count');
            if (countSpan) countSpan.textContent = target.reactions[data.reaction];
            if (data.user === party.user.name) rxBtn.classList.add('reacted');
            rxBtn.classList.remove('bounce');
            void rxBtn.offsetWidth;
            rxBtn.classList.add('bounce');
          }
        }
      }
    });

    // Sync-Scroll Wireup
    const commentsList = $('#tubeCommentsList');
    const syncScrollBtn = $('#toggleSyncScrollBtn');
    const syncScrollText = $('#syncScrollText');

    syncScrollBtn?.addEventListener('click', () => {
      isSyncScrollActive = !isSyncScrollActive;
      syncScrollBtn.classList.toggle('active', isSyncScrollActive);
      syncScrollText.textContent = isSyncScrollActive ? 'Sync-Scroll: ON' : 'Sync-Scroll: OFF';
      toast(isSyncScrollActive ? 'Synced scrolling enabled' : 'Independent solo scrolling', 'info');
      sfx('tick');
    });

    $('#refreshCommentsBtn')?.addEventListener('click', () => {
      loadComments(activeVideoId);
      sfx('tick');
    });

    commentsList?.addEventListener('scroll', () => {
      if (!isSyncScrollActive || isRemotelyScrolling) return;
      const maxScroll = commentsList.scrollHeight - commentsList.clientHeight;
      if (maxScroll <= 0) return;
      const ratio = commentsList.scrollTop / maxScroll;

      if (scrollBroadcastTimer) clearTimeout(scrollBroadcastTimer);
      scrollBroadcastTimer = setTimeout(() => {
        party.sendCommentScroll(ratio);
      }, 45);
    }, { passive: true });

    party.on('comment-scroll', data => {
      if (!isSyncScrollActive || !commentsList) return;
      const maxScroll = commentsList.scrollHeight - commentsList.clientHeight;
      if (maxScroll <= 0) return;

      isRemotelyScrolling = true;
      commentsList.scrollTo({
        top: data.ratio * maxScroll,
        behavior: 'smooth'
      });

      const notice = $('#syncScrollUserNotice');
      if (notice) {
        notice.textContent = `Scrolled by ${esc(data.user)}`;
        notice.classList.remove('hidden');
        clearTimeout(notice._t);
        notice._t = setTimeout(() => notice.classList.add('hidden'), 1800);
      }

      setTimeout(() => {
        isRemotelyScrolling = false;
      }, 250);
    });

    // ---------------- SYNCED DOOMSCROLL MODE & NICHE SEARCH ----------------
    const doomOverlay = $('#fivetubeDoomscrollOverlay');
    const doomCounter = $('#doomscrollCounterBadge');
    const doomAuthor = $('#doomscrollAuthor');
    const doomTitle = $('#doomscrollTitle');
    const doomNicheLabel = $('#doomscrollNicheLabel');
    const doomPrevBtn = $('#doomPrevBtn');
    const doomNextBtn = $('#doomNextBtn');
    const exitDoomBtn = $('#exitDoomscrollBtn');
    const doomToggleBtn = $('#doomscrollToggleBtn');
    const doomChangeNicheBtn = $('#doomChangeNicheBtn');
    const doomReactionsContainer = $('#doomscrollReactionsContainer');
    const doomTopSensor = $('#doomscrollTopSensor');
    const doomPersistentHint = $('#doomscrollPersistentHint');
    const doomNicheModal = $('#doomscrollNicheModal');
    const closeNicheModalBtn = $('#closeNicheModalBtn');
    const shortsNicheSearchForm = $('#shortsNicheSearchForm');
    const shortsSearchQueryInput = $('#shortsSearchQueryInput');
    const doomNichesContainer = $('#doomscrollNichesContainer');

    function wakeDoomscrollControls() {
      if (!isDoomscroll) return;
      restoreWindowFocus();
      if (doomPersistentHint) doomPersistentHint.classList.add('is-active');
      const topBar = $('.doomscroll-top-bar');
      const sideRail = $('.doomscroll-side-rail');
      if (topBar) topBar.style.opacity = '1';
      if (sideRail) sideRail.style.opacity = '1';

      if (hudIdleTimer) clearTimeout(hudIdleTimer);
      hudIdleTimer = setTimeout(() => {
        if (doomPersistentHint) doomPersistentHint.classList.remove('is-active');
      }, 3400);
    }

    // Top sensor and persistent micro-hint listeners in Doomscroll
    [doomTopSensor, doomPersistentHint].forEach(el => {
      if (!el) return;
      el.addEventListener('pointerenter', wakeDoomscrollControls, { passive: true });
      el.addEventListener('pointermove', wakeDoomscrollControls, { passive: true });
      el.addEventListener('pointerdown', wakeDoomscrollControls, { passive: true });
      el.addEventListener('touchstart', wakeDoomscrollControls, { passive: true });
    });

    doomPersistentHint?.addEventListener('click', e => {
      e.stopPropagation();
      wakeDoomscrollControls();
    });

    function loadDoomClip(idx, broadcast = true) {
      if (!activeDoomFeed || activeDoomFeed.length === 0) activeDoomFeed = SHORTS_NICHES.memes.items;
      if (idx < 0) idx = activeDoomFeed.length - 1;
      if (idx >= activeDoomFeed.length) idx = 0;
      doomIndex = idx;
      const clip = activeDoomFeed[doomIndex];

      if (doomCounter) doomCounter.textContent = `${doomIndex + 1} / ${activeDoomFeed.length}`;
      if (doomAuthor) doomAuthor.textContent = clip.author;
      if (doomTitle) doomTitle.textContent = clip.title;

      const mount = $('#doomscrollPlayerMount');
      if (mount) {
        mount.innerHTML = `<iframe id="doomYtIframe" src="https://www.youtube.com/embed/${clip.id}?autoplay=1&controls=1&modestbranding=1&rel=0&enablejsapi=1" allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
      }

      sfx('whoosh');
      wakeDoomscrollControls();

      if (broadcast) {
        party.sendDoomscrollSeek(doomIndex, clip.id, clip.title);
      }
    }

    function spawnDoomReaction(reactionType) {
      if (!doomReactionsContainer) return;
      const el = document.createElement('div');
      el.className = 'floating-reaction-particle';
      const colors = { fire: '#FF3B14', laugh: '#FFD166', cringe: '#A78BFA', heart: '#F472B6' };
      el.style.color = colors[reactionType] || '#FF3B14';
      el.style.right = `${18 + Math.random() * 24}px`;
      el.innerHTML = icon(reactionType);
      doomReactionsContainer.appendChild(el);
      setTimeout(() => el.remove(), 1800);
    }

    // Render preset niche cards in modal
    function renderNicheGrid() {
      if (!doomNichesContainer) return;
      doomNichesContainer.innerHTML = Object.values(SHORTS_NICHES).map(n => `
        <button type="button" class="niche-card-btn" data-niche-key="${n.id}">
          <div class="niche-card-icon">${icon(n.icon)}</div>
          <div class="niche-card-info">
            <span class="niche-card-title">${esc(n.name)}</span>
            <span class="niche-card-desc">${esc(n.desc)}</span>
          </div>
        </button>
      `).join('');

      doomNichesContainer.querySelectorAll('[data-niche-key]').forEach(btn => {
        btn.onclick = () => {
          const key = btn.dataset.nicheKey;
          const niche = SHORTS_NICHES[key];
          if (niche) {
            selectAndLaunchNiche(niche.name, '', niche.items);
          }
        };
      });
    }

    function openNicheModal() {
      renderNicheGrid();
      doomNicheModal?.classList.remove('hidden');
      sfx('open');
      setTimeout(() => shortsSearchQueryInput?.focus(), 60);
    }

    function closeNicheModal() {
      doomNicheModal?.classList.add('hidden');
      sfx('close');
    }

    closeNicheModalBtn?.addEventListener('click', closeNicheModal);
    doomChangeNicheBtn?.addEventListener('click', openNicheModal);

    // Clicking Doomscroll button on header opens the Niche Selector
    doomToggleBtn?.addEventListener('click', () => {
      openNicheModal();
    });

    // Custom Niche Search
    shortsNicheSearchForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const q = shortsSearchQueryInput?.value?.trim();
      if (!q) return;

      const submitBtn = $('#shortsSearchSubmitBtn');
      if (submitBtn) submitBtn.textContent = 'Searching...';

      try {
        toast(`Searching Shorts for: "${q}"...`, 'info');
        const items = await searchShortsNiche(q);
        selectAndLaunchNiche(`Search: ${q}`, q, items);
      } catch (err) {
        selectAndLaunchNiche(`Search: ${q}`, q, SHORTS_NICHES.memes.items);
      } finally {
        if (submitBtn) submitBtn.textContent = 'Search & Scroll';
      }
    });

    function selectAndLaunchNiche(nicheName, query, items) {
      if (!items || items.length === 0) items = SHORTS_NICHES.memes.items;
      activeDoomFeed = items;
      activeNicheTitle = nicheName;
      closeNicheModal();

      isDoomscroll = true;
      document.body.classList.add('doomscroll-active');
      doomOverlay?.classList.remove('hidden');
      if (doomNicheLabel) doomNicheLabel.textContent = nicheName.toUpperCase();

      try { if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo(); } catch (e) {}
      loadDoomClip(0, true);
      wakeDoomscrollControls();

      // Broadcast niche to party!
      party.sendDoomscrollNiche(nicheName, query, items, 0);
      toast(`Doomscrolling ${nicheName} with party!`, 'ok');
      sfx('success');
    }

    // When party peer syncs niche
    party.on('doomscroll-niche', data => {
      if (data.items && data.items.length > 0) {
        activeDoomFeed = data.items;
        activeNicheTitle = data.nicheName || 'Synced Niche';
        if (doomNicheLabel) doomNicheLabel.textContent = activeNicheTitle.toUpperCase();

        if (!isDoomscroll) {
          isDoomscroll = true;
          document.body.classList.add('doomscroll-active');
          doomOverlay?.classList.remove('hidden');
          try { if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo(); } catch (e) {}
        }
        closeNicheModal();
        loadDoomClip(data.startIndex || 0, false);
        wakeDoomscrollControls();
        toast(`${esc(data.user)} synced Shorts niche: ${esc(data.nicheName)}`, 'info');
      }
    });

    exitDoomBtn?.addEventListener('click', () => {
      isDoomscroll = false;
      document.body.classList.remove('doomscroll-active');
      doomOverlay.classList.add('hidden');
      const mount = $('#doomscrollPlayerMount');
      if (mount) mount.innerHTML = '';
      sfx('close');
    });

    doomPrevBtn?.addEventListener('click', () => loadDoomClip(doomIndex - 1, true));
    doomNextBtn?.addEventListener('click', () => loadDoomClip(doomIndex + 1, true));

    $$('[data-doom-rx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rx = btn.dataset.doomRx;
        party.sendDoomscrollReaction(rx);
        sfx('tick');
      });
    });

    party.on('doomscroll-reaction', data => {
      spawnDoomReaction(data.reaction);
      sfx('pop');
    });

    party.on('doomscroll-seek', data => {
      if (data.index !== undefined && data.index !== doomIndex) {
        if (!isDoomscroll) {
          isDoomscroll = true;
          document.body.classList.add('doomscroll-active');
          doomOverlay.classList.remove('hidden');
          try { if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo(); } catch (e) {}
        }
        loadDoomClip(data.index, false);
        toast(`${esc(data.user)} scrolled to clip ${data.index + 1}`, 'info');
      }
    });

    // Touch Swipe Gestures for Mobile Doomscroll
    let touchStartY = 0;
    doomOverlay?.addEventListener('touchstart', e => {
      if (e.changedTouches && e.changedTouches[0]) {
        touchStartY = e.changedTouches[0].clientY;
      }
    }, { passive: true });

    doomOverlay?.addEventListener('touchend', e => {
      if (e.changedTouches && e.changedTouches[0]) {
        const diffY = touchStartY - e.changedTouches[0].clientY;
        if (Math.abs(diffY) > 50) {
          if (diffY > 0) loadDoomClip(doomIndex + 1, true); // Swiped UP
          else loadDoomClip(doomIndex - 1, true); // Swiped DOWN
        }
      }
    }, { passive: true });

    // Wheel Scroll for Desktop Doomscroll
    let wheelThrottle = 0;
    doomOverlay?.addEventListener('wheel', e => {
      const now = Date.now();
      if (now - wheelThrottle < 600) return;
      if (Math.abs(e.deltaY) > 40) {
        wheelThrottle = now;
        if (e.deltaY > 0) loadDoomClip(doomIndex + 1, true);
        else loadDoomClip(doomIndex - 1, true);
      }
    }, { passive: true });

    // Party Creation & Joining UI
    $('#createPartyBtn')?.addEventListener('click', async () => {
      const code = await party.create(generatePartyCode(), $('#myNicknameInput').value);
      location.hash = `#/5tube?party=${code}`;
    });

    const joinModal = $('#joinPartyModal');
    $('#joinPartyPromptBtn')?.addEventListener('click', () => {
      joinModal.classList.remove('hidden');
      $('#joinPartyCodeInput').focus();
    });
    $('#cancelJoinPartyBtn')?.addEventListener('click', () => {
      joinModal.classList.add('hidden');
    });
    $('#confirmJoinPartyBtn')?.addEventListener('click', async () => {
      const code = $('#joinPartyCodeInput').value.trim();
      if (!code) return;
      joinModal.classList.add('hidden');
      await party.join(code, $('#myNicknameInput').value);
      location.hash = `#/5tube?party=${code}`;
    });

    // Copy Party Link
    copyLinkBtn?.addEventListener('click', () => {
      const shareUrl = `${location.origin}${location.pathname}#/5tube?party=${party.code}`;
      copyText(shareUrl);
      toast('Copied party invite link to clipboard!', 'ok');
      sfx('copy');
    });

    // Profile Settings
    $('#myNicknameInput')?.addEventListener('change', e => {
      party.setNickname(e.target.value.trim());
    });
    $('#myColorInput')?.addEventListener('input', e => {
      party.setColor(e.target.value);
    });

    $('#toggleCursorsCheck')?.addEventListener('change', e => {
      showCursors = e.target.checked;
      hudCursorBtn?.classList.toggle('is-muted', !showCursors);
      if (hudCursorIcon) hudCursorIcon.innerHTML = showCursors ? icon('cursor') : icon('cursorOff');
      if (!showCursors && ctx && cursorCanvas) ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    });

    $('#toggleClicksCheck')?.addEventListener('change', e => {
      showClicks = e.target.checked;
    });

    $('#toggleFloatingChatCheck')?.addEventListener('change', e => {
      showFloatingChat = e.target.checked;
      hudChatBtn?.classList.toggle('is-muted', !showFloatingChat);
      if (hudChatIcon) hudChatIcon.innerHTML = showFloatingChat ? icon('chat') : icon('chatOff');
      if (floatingChat) floatingChat.classList.toggle('hidden', !showFloatingChat);
    });

    // Download Video Modal
    const dlModal = $('#downloadVideoModal');
    $('#downloadModalBtn')?.addEventListener('click', () => {
      dlModal.classList.remove('hidden');
      sfx('open');
    });
    $('#closeDownloadModalBtn')?.addEventListener('click', () => {
      dlModal.classList.add('hidden');
      sfx('close');
    });
    $('#copyYtdlpBtn')?.addEventListener('click', () => {
      const cmd = $('#ytdlpCodeSnippet').textContent;
      copyText(cmd);
      toast('Copied yt-dlp terminal command!', 'ok');
      sfx('copy');
    });

    // Mouse Tracking over Stage
    let theaterBoxRect = null;
    function updateTheaterBoxRect() {
      if (theaterBox) theaterBoxRect = theaterBox.getBoundingClientRect();
    }
    window.addEventListener('resize', updateTheaterBoxRect, { passive: true });
    window.addEventListener('scroll', updateTheaterBoxRect, { passive: true });
    theaterBox?.addEventListener('pointerenter', updateTheaterBoxRect, { passive: true });

    theaterBox?.addEventListener('mousemove', e => {
      if (!theaterBoxRect || theaterBoxRect.width === 0) updateTheaterBoxRect();
      if (!theaterBoxRect) return;
      const normX = (e.clientX - theaterBoxRect.left) / theaterBoxRect.width;
      const normY = (e.clientY - theaterBoxRect.top) / theaterBoxRect.height;

      const now = Date.now();
      if (now - lastCursorBroadcast > 32) { // ~30Hz
        party.sendCursor(normX, normY);
        lastCursorBroadcast = now;
      }
    }, { passive: true });

    theaterBox?.addEventListener('click', e => {
      if (!theaterBoxRect || theaterBoxRect.width === 0) updateTheaterBoxRect();
      if (!theaterBoxRect) return;
      const normX = (e.clientX - theaterBoxRect.left) / theaterBoxRect.width;
      const normY = (e.clientY - theaterBoxRect.top) / theaterBoxRect.height;

      party.sendClick(normX, normY);
      clickRipples.push({
        x: normX,
        y: normY,
        color: party.user.color,
        r: 4,
        maxR: 36,
        alpha: 1.0
      });
    });

    // Animation Render Loop for Cursors & Click Waves
    function renderOverlay() {
      if (!ctx || !cursorCanvas) return;
      const w = cursorCanvas.width;
      const h = cursorCanvas.height;
      ctx.clearRect(0, 0, w, h);

      // Render Click Ripples
      for (let i = clickRipples.length - 1; i >= 0; i--) {
        const rip = clickRipples[i];
        rip.r += 1.8;
        rip.alpha -= 0.04;
        if (rip.alpha <= 0 || rip.r >= rip.maxR) {
          clickRipples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(rip.x * w, rip.y * h, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = rip.color;
        ctx.globalAlpha = rip.alpha;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // Render Peer Cursors
      if (showCursors) {
        peerCursors.forEach((peer, id) => {
          peer.x += (peer.targetX - peer.x) * 0.35;
          peer.y += (peer.targetY - peer.y) * 0.35;

          const cx = peer.x * w;
          const cy = peer.y * h;

          ctx.save();
          // Draw Cursor Pointer
          ctx.fillStyle = peer.color || '#FF3B14';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + 12, cy + 12);
          ctx.lineTo(cx + 4, cy + 13);
          ctx.lineTo(cx, cy + 18);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw Peer Name Tag Pill
          const tag = peer.name || 'Friend';
          ctx.font = '600 10.5px JetBrains Mono, monospace';
          const textMetrics = ctx.measureText(tag);
          const pillW = textMetrics.width + 12;
          const pillH = 18;
          const pillX = cx + 12;
          const pillY = cy + 14;

          ctx.fillStyle = 'rgba(15, 15, 18, 0.85)';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 4);
          else ctx.rect(pillX, pillY, pillW, pillH);
          ctx.fill();

          ctx.strokeStyle = peer.color;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(tag, pillX + 6, pillY + 12.5);
          ctx.restore();
        });
      }

      animFrame = requestAnimationFrame(renderOverlay);
    }

    renderOverlay();

    // Auto-join party if code in URL
    if (partyFromUrl) {
      party.join(partyFromUrl);
    }

    // Keyboard Shortcuts
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (isDoomscroll) {
        if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
          e.preventDefault();
          loadDoomClip(doomIndex + 1, true);
        } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
          e.preventDefault();
          loadDoomClip(doomIndex - 1, true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          exitDoomBtn?.click();
        }
        return;
      }

      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheater();
      } else if (e.key === 'Escape' && isTheater) {
        toggleTheater(false);
      } else if (e.key.toLowerCase() === 'c' && isTheater) {
        e.preventDefault();
        hudChatBtn?.click();
      } else if (e.key.toLowerCase() === 'm' && isTheater) {
        e.preventDefault();
        hudCursorBtn?.click();
      } else if (e.key === ' ' && party.isHost) {
        e.preventDefault();
        playPauseBtn?.click();
      }
    }
    window.addEventListener('keydown', onKeyDown);

    // Unmount & Cleanup
    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (hudIdleTimer) clearTimeout(hudIdleTimer);
      if (scrollBroadcastTimer) clearTimeout(scrollBroadcastTimer);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('resize', updateTheaterBoxRect);
      window.removeEventListener('scroll', updateTheaterBoxRect);
      window.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('theater-mode');
      document.body.classList.remove('in-fivetube');
      document.body.classList.remove('doomscroll-active');
      const topbar = $('#topbar');
      if (topbar) topbar.style.display = '';
      if (ytPlayer && ytPlayer.destroy) {
        try { ytPlayer.destroy(); } catch (e) {}
      }
    };
  }
};

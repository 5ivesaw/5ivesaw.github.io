// 5Tube — Synchronized Multiplayer YouTube Theater & Party Player.
// Real-time peer cursors, synchronized playback, live chat & theater immersion.
import {
  $, $$, icon, formatTime, copyText, toast, store, cssVar
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';
import { party, generatePartyCode } from '../core/party.js';

let ytPlayer = null;
let ytReady = false;
let isTheater = false;
let hidePartyUi = false;
let showCursors = true;
let showClicks = true;
let floatingChatOnly = false;
let peerCursors = new Map(); // id -> { x, y, targetX, targetY, name, color, isHost, lastUpdate }
let clickRipples = []; // [{ x, y, color, r, maxR, alpha }]
let animFrame = null;
let lastCursorBroadcast = 0;
let isSeekingFromRemote = false;

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

          <!-- Right: Theater, Party Menu, Downloads -->
          <div class="row items-center" style="gap:6px;">
            <button type="button" id="theaterToggleBtn" class="btn sm ghost" title="Toggle Theater Mode (Shortcut: T)">
              <span id="theaterBtnIcon">${icon('expand')}</span>
              <span class="mono xs" id="theaterBtnText">Theater</span>
            </button>

            <button type="button" id="downloadModalBtn" class="btn sm ghost" title="Download / Save Video Locally">
              ${icon('download')} <span class="mono xs">Save</span>
            </button>

            <button type="button" id="partyMenuBtn" class="btn sm primary" style="border-radius:var(--r-full);">
              👥 <span id="partyMemberCount">1</span>
            </button>

            <button type="button" id="ghostModeToggleBtn" class="btn sm ghost" title="Distraction-Free Zen View">
              👁️
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

              <!-- Floating Chat Overlay (Zen Mode) -->
              <div id="fivetubeFloatingChat" class="fivetube-floating-chat"></div>

              <!-- HUD Exit Theater Floating Button -->
              <button type="button" id="hudExitTheaterBtn" class="hud-exit-btn hidden" title="Exit Theater Mode (Esc or T)">
                ${icon('minimize')} Exit Theater
              </button>

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
                  <span id="tubeHostBadge" class="badge hidden" style="background:var(--accent);color:#fff;font-size:9px;">👑 You are Host</span>
                </div>
              </div>

              <!-- Host Authority Playback Actions -->
              <div class="row items-center" style="gap:6px;">
                <button type="button" id="hostPrevBtn" class="btn sm ghost" title="Previous Track">${icon('prev')}</button>
                <button type="button" id="hostPlayPauseBtn" class="btn sm primary" title="Play / Pause for Party">${icon('play')}</button>
                <button type="button" id="hostNextBtn" class="btn sm ghost" title="Next Track">${icon('next')}</button>
                <button type="button" id="hostForceSyncBtn" class="btn sm ghost" title="Broadcast exact timestamp to all members">
                  ⚡ Force Sync
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Party Drawer (Chat, Queue, Members) -->
          <aside id="fivetubeSidebar" class="fivetube-sidebar card">
            <!-- Tabs -->
            <div class="fivetube-tabs row border-b border-paper-line">
              <button type="button" data-tube-tab="chat" class="fivetube-tab active flex-1 font-mono text-xs">Chat</button>
              <button type="button" data-tube-tab="queue" class="fivetube-tab flex-1 font-mono text-xs">Queue (<span id="queueCount">0</span>)</button>
              <button type="button" data-tube-tab="party" class="fivetube-tab flex-1 font-mono text-xs">Party (<span id="memberTabCount">1</span>)</button>
            </div>

            <!-- Chat Panel -->
            <div id="tabContentChat" class="fivetube-tab-content active stack flex-1 min-h-0">
              <div id="tubeChatLog" class="tube-chat-log flex-1">
                <div class="chat-system-msg mono xs faint">Welcome to 5Tube. Invite friends to watch together in sync!</div>
              </div>
              <form id="tubeChatForm" class="row border-t border-paper-line p-2" style="gap:6px;">
                <input type="text" id="tubeChatInput" placeholder="Send a message..." class="input xs flex-1" style="height:32px;" autocomplete="off"/>
                <button type="submit" class="btn sm primary" style="height:32px;padding:0 12px;">Send</button>
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
                    <input type="checkbox" id="toggleFloatingChatCheck"/>
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

    // Theater Mode Toggle
    function toggleTheater(force) {
      isTheater = (force !== undefined) ? force : !isTheater;
      document.body.classList.toggle('theater-mode', isTheater);
      theaterBox.classList.toggle('theater-fullscreen', isTheater);
      hudExitBtn.classList.toggle('hidden', !isTheater);
      const topbar = $('#topbar');
      if (topbar) topbar.style.display = isTheater ? 'none' : '';

      $('#theaterBtnText').textContent = isTheater ? 'Exit' : 'Theater';
      $('#theaterBtnIcon').innerHTML = isTheater ? icon('minimize') : icon('expand');

      setTimeout(resizeCanvas, 60);
      sfx('whoosh');
      toast(isTheater ? 'Theater Mode Active (Press T or Esc to exit)' : 'Exited Theater Mode', 'info');
    }

    theaterBtn?.addEventListener('click', () => toggleTheater());
    hudExitBtn?.addEventListener('click', () => toggleTheater(false));

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

      if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(id);
      }
      updateDownloadLinks(id);

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
        <span class="chat-badge" style="background:${msg.color};color:#fff;">${msg.user.slice(0, 1)}</span>
        <div class="stack" style="gap:1px;min-width:0;">
          <div class="row between xs mono faint">
            <strong style="color:var(--ink);">${msg.user}</strong>
            <span>${new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p class="text-xs text-paper-ink" style="word-break:break-word;">${escapeHtml(msg.text)}</p>
        </div>
      `;
      chatLog.appendChild(el);
      chatLog.scrollTop = chatLog.scrollHeight;

      // Floating chat overlay (for theater/zen view)
      if (floatingChat && (isTheater || floatingChatOnly)) {
        const floatEl = document.createElement('div');
        floatEl.className = 'floating-chat-bubble pop-in';
        floatEl.innerHTML = `<strong style="color:${msg.color};">${msg.user}:</strong> ${escapeHtml(msg.text)}`;
        floatingChat.appendChild(floatEl);
        setTimeout(() => floatEl.remove(), 4200);
      }
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
      }

      // Check time drift (if drift > 2 seconds, gently seek)
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
            <span class="mono font-semibold text-xs text-paper-ink">${m.name}</span>
            ${m.isMe ? '<span class="badge" style="font-size:8.5px;">You</span>' : ''}
            ${m.isHost ? '<span class="badge" style="background:var(--accent);color:#fff;font-size:8.5px;">Host 👑</span>' : ''}
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
    theaterBox?.addEventListener('mousemove', e => {
      const rect = theaterBox.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      const now = Date.now();
      if (now - lastCursorBroadcast > 32) { // ~30Hz
        party.sendCursor(normX, normY);
        lastCursorBroadcast = now;
      }
    });

    theaterBox?.addEventListener('click', e => {
      const rect = theaterBox.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

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
          // Lerp position
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
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheater();
      } else if (e.key === 'Escape' && isTheater) {
        toggleTheater(false);
      } else if (e.key === ' ' && party.isHost) {
        e.preventDefault();
        playPauseBtn.click();
      }
    }
    window.addEventListener('keydown', onKeyDown);

    // Unmount & Cleanup
    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('theater-mode');
      const topbar = $('#topbar');
      if (topbar) topbar.style.display = '';
      if (ytPlayer && ytPlayer.destroy) {
        try { ytPlayer.destroy(); } catch (e) {}
      }
    };
  }
};

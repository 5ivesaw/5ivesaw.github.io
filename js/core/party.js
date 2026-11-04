// 5IVESAW — Serverless Multiplayer Party Engine.
// Uses WebRTC DataChannels (via PeerJS) + BroadcastChannel fallback.
// Normalized peer cursor tracking, click pings, synchronized video playback & chat.

function loadPeerJs() {
  if (typeof window !== 'undefined' && window.Peer) return Promise.resolve(window.Peer);
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve(window.Peer);
    s.onerror = () => {
      console.warn('PeerJS CDN unreachable; falling back to BroadcastChannel mode.');
      resolve(null);
    };
    document.head.appendChild(s);
  });
}

// Word prefixes for human-friendly party codes
const PREFIXES = ['SAW', 'BYTE', 'SYNC', 'NOVA', 'PULSE', 'CORE', 'FLOW', 'NEON', 'ECHO'];
const PEER_COLORS = [
  '#FF3B14', '#FF9F1C', '#FFD166', '#06D6A0', '#118AB2', '#38BDF8',
  '#A78BFA', '#F472B6', '#E63946', '#2A9D8F', '#E76F51', '#48CAE4'
];

export function generatePartyCode() {
  const p = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${p}-${n}`;
}

export function getRandomColor() {
  return PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
}

export class PartySession {
  constructor() {
    this.code = '';
    this.isHost = false;
    this.myId = 'p_' + Math.random().toString(36).slice(2, 9);
    this.user = {
      id: this.myId,
      name: 'User ' + this.myId.slice(-3),
      color: getRandomColor()
    };
    this.hostId = null;
    this.peers = new Map(); // id -> { id, name, color, lastSeen, cursor: {x, y} }
    this.listeners = new Map();
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.bc = null;
    this.syncState = {
      videoId: 'eXRWHzV72sU',
      time: 0,
      state: 'paused',
      title: 'FiveSaw Transmission',
      author: '5ivesaw',
      ts: Date.now()
    };
    this.playlist = [];
    this._heartbeatInterval = null;
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(fn => {
      try { fn(data); } catch (e) { console.error('Party event error', event, e); }
    });
  }

  async create(code = generatePartyCode(), nickname = '') {
    this.leave();
    this.code = code.toUpperCase().trim();
    this.isHost = true;
    this.hostId = this.myId;
    if (nickname) this.user.name = nickname;

    this.peers.set(this.myId, { ...this.user, isHost: true });
    this._initBroadcastChannel();

    const PeerClass = await loadPeerJs();
    if (PeerClass) {
      try {
        const hostPeerId = `5s-party-${this.code}`;
        this.peer = new PeerClass(hostPeerId, { debug: 1 });

        this.peer.on('open', id => {
          this.emit('connected', { code: this.code, isHost: true, id });
        });

        this.peer.on('connection', conn => {
          this._handleIncomingConnection(conn);
        });

        this.peer.on('error', err => {
          console.warn('PeerJS Host Error:', err.type, err.message);
          // If ID is taken, we might already be running or need a sub-key
          if (err.type === 'unavailable-id') {
            this.emit('error', 'Party code already in use. Please create a new one or join it.');
          }
        });
      } catch (e) {
        console.warn('Failed to start WebRTC host', e);
      }
    } else {
      this.emit('connected', { code: this.code, isHost: true, id: this.myId });
    }

    this._startHeartbeat();
    this.emit('peers-update', this.getMemberList());
    return this.code;
  }

  async join(code, nickname = '') {
    this.leave();
    this.code = code.toUpperCase().trim();
    this.isHost = false;
    if (nickname) this.user.name = nickname;

    this.peers.set(this.myId, { ...this.user, isHost: false });
    this._initBroadcastChannel();

    // Broadcast hello
    this._bcSend({
      type: 'hello',
      from: this.myId,
      user: this.user
    });

    const PeerClass = await loadPeerJs();
    if (PeerClass) {
      try {
        this.peer = new PeerClass(undefined, { debug: 1 });

        this.peer.on('open', id => {
          this.myId = id;
          this.user.id = id;
          const hostPeerId = `5s-party-${this.code}`;
          const conn = this.peer.connect(hostPeerId, { reliable: true });

          conn.on('open', () => {
            this.connections.set('host', conn);
            conn.send({
              type: 'hello',
              from: this.myId,
              user: this.user
            });
            this.emit('connected', { code: this.code, isHost: false, id });
          });

          conn.on('data', data => this._handleMessage(data));

          conn.on('close', () => {
            this.emit('host-disconnected');
          });

          conn.on('error', err => {
            console.warn('Connection to host error', err);
          });
        });

        this.peer.on('error', err => {
          console.warn('PeerJS Client Error:', err);
          this.emit('error', 'Could not reach party host. Check the party code.');
        });
      } catch (e) {
        console.warn('WebRTC client error', e);
      }
    } else {
      this.emit('connected', { code: this.code, isHost: false, id: this.myId });
    }

    this.emit('peers-update', this.getMemberList());
    return this.code;
  }

  _initBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.bc = new BroadcastChannel(`5s_party_${this.code}`);
      this.bc.onmessage = e => {
        if (!e.data || e.data.from === this.myId) return;
        this._handleMessage(e.data);
      };
    } catch (e) {
      console.warn('BroadcastChannel error', e);
    }
  }

  _bcSend(data) {
    if (this.bc) {
      try { this.bc.postMessage(data); } catch (e) {}
    }
  }

  _handleIncomingConnection(conn) {
    conn.on('open', () => {
      // Wait for hello
    });

    conn.on('data', data => {
      this._handleMessage(data);

      // If host, relay data to other peers
      if (this.isHost && data.type !== 'hello') {
        this.broadcast(data, conn.peer);
      }
    });

    conn.on('close', () => {
      this.peers.delete(conn.peer);
      this.connections.delete(conn.peer);
      this.emit('peer-leave', conn.peer);
      this.emit('peers-update', this.getMemberList());
      if (this.isHost) {
        this.broadcast({ type: 'peer-left', peerId: conn.peer });
      }
    });
  }

  _handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'hello': {
        const u = msg.user || { id: msg.from, name: 'Guest', color: getRandomColor() };
        this.peers.set(msg.from, { ...u, isHost: msg.from === this.hostId });
        this.emit('peer-join', u);
        this.emit('peers-update', this.getMemberList());

        if (this.isHost) {
          // Send welcome packet with current state, playlist, and peer list
          const welcome = {
            type: 'welcome',
            from: this.myId,
            hostId: this.myId,
            syncState: this.syncState,
            playlist: this.playlist,
            members: this.getMemberList()
          };
          this.sendTo(msg.from, welcome);
          this._bcSend(welcome);
        }
        break;
      }

      case 'welcome': {
        this.hostId = msg.hostId;
        if (msg.syncState) {
          this.syncState = msg.syncState;
          this.emit('sync-state', this.syncState);
        }
        if (msg.playlist) {
          this.playlist = msg.playlist;
          this.emit('playlist-update', this.playlist);
        }
        if (Array.isArray(msg.members)) {
          msg.members.forEach(m => this.peers.set(m.id, m));
          this.emit('peers-update', this.getMemberList());
        }
        break;
      }

      case 'cursor': {
        const peer = this.peers.get(msg.from);
        if (peer) {
          peer.cursor = { x: msg.x, y: msg.y };
          peer.lastSeen = Date.now();
        }
        this.emit('cursor', {
          id: msg.from,
          x: msg.x,
          y: msg.y,
          user: peer ? peer.name : 'Peer',
          color: peer ? peer.color : '#FF3B14'
        });
        break;
      }

      case 'click': {
        const peer = this.peers.get(msg.from);
        this.emit('click', {
          id: msg.from,
          x: msg.x,
          y: msg.y,
          user: peer ? peer.name : 'Peer',
          color: peer ? peer.color : '#FF3B14'
        });
        break;
      }

      case 'chat': {
        this.emit('chat', {
          id: msg.id || Math.random().toString(36).slice(2),
          user: msg.user || 'Guest',
          color: msg.color || '#888',
          text: msg.text || '',
          time: msg.time || Date.now()
        });
        break;
      }

      case 'sync': {
        this.syncState = msg.syncState;
        this.emit('sync-state', this.syncState);
        break;
      }

      case 'playlist-add': {
        this.playlist.push(msg.item);
        this.emit('playlist-update', this.playlist);
        break;
      }

      case 'playlist-update': {
        this.playlist = msg.playlist || [];
        this.emit('playlist-update', this.playlist);
        break;
      }

      case 'comment-scroll': {
        this.emit('comment-scroll', {
          ratio: msg.ratio,
          from: msg.from,
          user: msg.user || 'Friend'
        });
        break;
      }

      case 'comment-reaction': {
        this.emit('comment-reaction', {
          commentId: msg.commentId,
          reaction: msg.reaction,
          user: msg.user || 'Friend'
        });
        break;
      }

      case 'party-comment': {
        this.emit('party-comment', {
          comment: msg.comment
        });
        break;
      }

      case 'doomscroll-seek': {
        this.emit('doomscroll-seek', {
          index: msg.index,
          videoId: msg.videoId,
          title: msg.title || '',
          user: msg.user || 'Friend'
        });
        break;
      }

      case 'doomscroll-reaction': {
        this.emit('doomscroll-reaction', {
          reaction: msg.reaction,
          user: msg.user || 'Friend'
        });
        break;
      }

      case 'doomscroll-niche': {
        this.emit('doomscroll-niche', {
          nicheName: msg.nicheName,
          query: msg.query || '',
          items: msg.items || [],
          startIndex: msg.startIndex || 0,
          user: msg.user || 'Friend'
        });
        break;
      }

      case 'peer-left': {
        this.peers.delete(msg.peerId);
        this.emit('peer-leave', msg.peerId);
        this.emit('peers-update', this.getMemberList());
        break;
      }

      case 'transfer-host': {
        this.hostId = msg.targetId;
        this.isHost = (this.myId === this.hostId);
        this.emit('host-change', { hostId: this.hostId, isMe: this.isHost });
        this.emit('peers-update', this.getMemberList());
        break;
      }

      case 'kick': {
        if (msg.targetId === this.myId) {
          this.leave();
          this.emit('kicked');
        }
        break;
      }
    }
  }

  broadcast(msg, exceptPeerId = null) {
    msg.from = this.myId;
    this._bcSend(msg);

    // Send through active WebRTC data channels
    this.connections.forEach((conn, peerId) => {
      if (peerId !== exceptPeerId && conn.open) {
        try { conn.send(msg); } catch (e) {}
      }
    });

    // If connected to host, send to host
    const hostConn = this.connections.get('host');
    if (hostConn && hostConn.open) {
      try { hostConn.send(msg); } catch (e) {}
    }
  }

  sendTo(peerId, msg) {
    msg.from = this.myId;
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      try { conn.send(msg); } catch (e) {}
    }
  }

  sendCursor(x, y) {
    if (!this.code) return;
    this.broadcast({
      type: 'cursor',
      x,
      y
    });
  }

  sendClick(x, y) {
    if (!this.code) return;
    this.broadcast({
      type: 'click',
      x,
      y
    });
  }

  sendChat(text) {
    if (!this.code || !text.trim()) return;
    const msg = {
      type: 'chat',
      id: Math.random().toString(36).slice(2),
      user: this.user.name,
      color: this.user.color,
      text: text.trim(),
      time: Date.now()
    };
    this.broadcast(msg);
    // Also emit locally
    this.emit('chat', msg);
  }

  sendCommentScroll(ratio) {
    if (!this.code) return;
    this.broadcast({
      type: 'comment-scroll',
      ratio,
      user: this.user.name
    });
  }

  sendCommentReaction(commentId, reaction) {
    if (!this.code) return;
    const msg = {
      type: 'comment-reaction',
      commentId,
      reaction,
      user: this.user.name
    };
    this.broadcast(msg);
    this.emit('comment-reaction', msg);
  }

  sendPartyComment(comment) {
    if (!this.code || !comment) return;
    const msg = {
      type: 'party-comment',
      comment
    };
    this.broadcast(msg);
    this.emit('party-comment', msg);
  }

  sendDoomscrollSeek(index, videoId, title = '') {
    if (!this.code) return;
    const msg = {
      type: 'doomscroll-seek',
      index,
      videoId,
      title,
      user: this.user.name
    };
    this.broadcast(msg);
    this.emit('doomscroll-seek', msg);
  }

  sendDoomscrollReaction(reaction) {
    if (!this.code) return;
    const msg = {
      type: 'doomscroll-reaction',
      reaction,
      user: this.user.name
    };
    this.broadcast(msg);
    this.emit('doomscroll-reaction', msg);
  }

  sendDoomscrollNiche(nicheName, query, items, startIndex = 0) {
    if (!this.code) return;
    const msg = {
      type: 'doomscroll-niche',
      nicheName,
      query,
      items,
      startIndex,
      user: this.user.name
    };
    this.broadcast(msg);
    this.emit('doomscroll-niche', msg);
  }

  // Host playback controls
  updateSyncState(videoId, time, state, title = '', author = '') {
    this.syncState = {
      videoId,
      time,
      state, // 'playing' | 'paused'
      title: title || this.syncState.title,
      author: author || this.syncState.author,
      ts: Date.now()
    };
    this.broadcast({
      type: 'sync',
      syncState: this.syncState
    });
    this.emit('sync-state', this.syncState);
  }

  addToPlaylist(video) {
    this.playlist.push(video);
    this.broadcast({
      type: 'playlist-add',
      item: video
    });
    this.emit('playlist-update', this.playlist);
  }

  setPlaylist(items) {
    this.playlist = items;
    this.broadcast({
      type: 'playlist-update',
      playlist: this.playlist
    });
    this.emit('playlist-update', this.playlist);
  }

  transferHost(targetId) {
    if (!this.isHost) return;
    this.hostId = targetId;
    this.isHost = (this.myId === targetId);
    this.broadcast({
      type: 'transfer-host',
      targetId
    });
    this.emit('host-change', { hostId: targetId, isMe: this.isHost });
  }

  kickPeer(targetId) {
    if (!this.isHost) return;
    this.broadcast({
      type: 'kick',
      targetId
    });
    this.peers.delete(targetId);
    this.emit('peers-update', this.getMemberList());
  }

  setNickname(name) {
    this.user.name = name;
    const me = this.peers.get(this.myId);
    if (me) me.name = name;
    this.broadcast({
      type: 'hello',
      user: this.user
    });
    this.emit('peers-update', this.getMemberList());
  }

  setColor(color) {
    this.user.color = color;
    const me = this.peers.get(this.myId);
    if (me) me.color = color;
    this.broadcast({
      type: 'hello',
      user: this.user
    });
    this.emit('peers-update', this.getMemberList());
  }

  getMemberList() {
    return Array.from(this.peers.values()).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isHost: p.id === this.hostId,
      isMe: p.id === this.myId
    }));
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatInterval = setInterval(() => {
      if (this.isHost && this.code) {
        this.broadcast({
          type: 'sync',
          syncState: this.syncState
        });
      }
    }, 4000);
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  leave() {
    this._stopHeartbeat();
    if (this.code) {
      this.broadcast({ type: 'peer-left', peerId: this.myId });
    }
    this.code = '';
    this.isHost = false;
    this.hostId = null;
    this.peers.clear();
    this.connections.forEach(conn => {
      try { conn.close(); } catch (e) {}
    });
    this.connections.clear();
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    if (this.bc) {
      try { this.bc.close(); } catch (e) {}
      this.bc = null;
    }
    this.emit('left');
  }
}

export const party = new PartySession();

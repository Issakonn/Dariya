/* Dariya Islam — синхронизация для двоих.
   - Кто есть кто: localStorage (навсегда на этом устройстве), ?as=islam|dariya — только для этой вкладки
   - Общее состояние: LWW key/value, хранится локально и синхронизируется с партнёром
   - Транспорт: PeerJS (прямое P2P между двумя устройствами) + BroadcastChannel (вкладки одного браузера)
   - Единые часы: Дария подстраивается под часы Ислама (NTP-пинг)
   - Медиа (фото, ленты, рисунки): IndexedDB + досылка партнёру
*/
(function () {
  const LS = 'di_';
  const PEOPLE = {
    islam: { id: 'islam', name: 'Ислам', short: 'И', city: 'Лодзь', cityLat: 'Łódź', color: 'var(--islam)' },
    dariya: { id: 'dariya', name: 'Дария', short: 'Д', city: 'Шмалькальден', cityLat: 'Schmalkalden', color: 'var(--dariya)' },
  };
  const params = new URLSearchParams(location.search);
  if (params.get('as') && PEOPLE[params.get('as')]) sessionStorage.setItem(LS + 'who', params.get('as'));
  let who = sessionStorage.getItem(LS + 'who') || localStorage.getItem(LS + 'who');
  if (!PEOPLE[who]) who = null;
  let room = localStorage.getItem(LS + 'room') || 'DARIS';
  const tabId = Math.random().toString(36).slice(2, 10);

  // ---------- store ----------
  let store = {};
  try { store = JSON.parse(localStorage.getItem(LS + 'store') || '{}'); } catch (e) { store = {}; }
  let persistT = null;
  function persist() {
    clearTimeout(persistT);
    persistT = setTimeout(() => {
      try { localStorage.setItem(LS + 'store', JSON.stringify(store)); } catch (e) { console.warn('store full', e); }
    }, 120);
  }
  const listeners = new Map(); // key -> Set
  function on(key, cb) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(cb);
    return () => listeners.get(key) && listeners.get(key).delete(cb);
  }
  function emit(key) {
    (listeners.get(key) || []).forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
    const pre = key.split(':')[0] + ':*';
    (listeners.get(pre) || []).forEach((cb) => { try { cb(key); } catch (e) { console.error(e); } });
    (listeners.get('*') || []).forEach((cb) => { try { cb(key); } catch (e) { console.error(e); } });
  }
  function get(key, def) { const e = store[key]; return e === undefined || e.v === undefined || e.v === null ? def : e.v; }
  function apply(key, e, local) {
    const cur = store[key];
    if (cur && (cur.t > e.t || (cur.t === e.t && cur.n >= e.n))) return false;
    store[key] = e; persist(); emit(key);
    if (local) send({ type: 'set', key, e });
    return true;
  }
  function set(key, v) {
    const cur = store[key];
    let t = now();
    if (cur && cur.t >= t) t = cur.t + 1; // локально всегда побеждает новая запись
    apply(key, { v, t, n: Math.random(), by: who }, true);
  }
  function keys(prefix) { return Object.keys(store).filter((k) => k.startsWith(prefix) && store[k].v !== null && store[k].v !== undefined); }
  function meta(key) { return store[key]; }

  // ---------- clock ----------
  let offset = Number(localStorage.getItem(LS + 'offset') || 0);
  let bestRtt = Infinity;
  function now() { return Date.now() + offset; }

  // ---------- transport ----------
  const seen = new Set();
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('dariyaislam-' + room) : null;
  let peer = null; const conns = new Set();
  let peerState = 'off';
  function send(msg) {
    msg.mid = msg.mid || (tabId + Math.random().toString(36).slice(2, 8));
    msg.from = who; msg.tab = tabId;
    seen.add(msg.mid);
    try { bc && bc.postMessage(msg); } catch (e) {}
    conns.forEach((c) => { if (c.open) { try { c.send(msg); } catch (e) {} } });
  }
  const ephL = new Map();
  function onEph(ch, cb) { if (!ephL.has(ch)) ephL.set(ch, new Set()); ephL.get(ch).add(cb); return () => ephL.get(ch).delete(cb); }
  function sendEph(ch, data) { send({ type: 'eph', ch, data }); }

  let partner = { online: false, last: 0, route: '', via: '' };
  const presL = new Set();
  function onPresence(cb) { presL.add(cb); return () => presL.delete(cb); }
  function setPartner(p) { partner = Object.assign({}, partner, p); presL.forEach((cb) => cb(partner)); }

  function receive(msg, via) {
    if (!msg || !msg.mid || seen.has(msg.mid) || msg.tab === tabId) return;
    seen.add(msg.mid);
    if (seen.size > 5000) { const arr = [...seen]; arr.slice(0, 2500).forEach((x) => seen.delete(x)); }
    const fromPartner = msg.from && msg.from !== who;
    switch (msg.type) {
      case 'set': apply(msg.key, msg.e, false); break;
      case 'full': Object.keys(msg.store || {}).forEach((k) => apply(k, msg.store[k], false)); break;
      case 'hello':
        sendFull(); sendMediaList(); break;
      case 'eph':
        if (!fromPartner) return;
        (ephL.get(msg.ch) || []).forEach((cb) => cb(msg.data, msg));
        break;
      case 'hb':
        if (!fromPartner) return;
        setPartner({ online: true, last: Date.now(), route: msg.route, via });
        break;
      case 'ping':
        if (who === 'islam' && fromPartner) send({ type: 'pong', t0: msg.t0, t1: Date.now(), to: msg.tab });
        break;
      case 'pong':
        if (msg.to === tabId) {
          const t2 = Date.now(); const rtt = t2 - msg.t0;
          if (rtt < bestRtt + 30) {
            bestRtt = Math.min(bestRtt, rtt);
            offset = Math.round(msg.t1 - (msg.t0 + t2) / 2);
            localStorage.setItem(LS + 'offset', offset);
          }
        }
        break;
      case 'mlist': {
        const ids = msg.ids || [];
        mediaIds().then((mine) => {
          const missingThere = mine.filter((x) => !ids.includes(x));
          missingThere.forEach((id) => mediaGet(id).then((d) => d && send({ type: 'media', id, data: d })));
        });
        break;
      }
      case 'media':
        mediaPutRaw(msg.id, msg.data).then(() => { (mediaL.get(msg.id) || []).forEach((cb) => cb(msg.data)); emit('media:' + msg.id); });
        break;
      case 'mreq':
        mediaGet(msg.id).then((d) => d && send({ type: 'media', id: msg.id, data: d }));
        break;
    }
  }
  if (bc) bc.onmessage = (ev) => receive(ev.data, 'tab');

  function sendFull() { send({ type: 'full', store }); }
  function sendMediaList() { mediaIds().then((ids) => send({ type: 'mlist', ids })); }

  // heartbeat + clock
  let route = location.hash || '#/';
  window.addEventListener('hashchange', () => { route = location.hash; hb(); });
  function hb() { if (who) send({ type: 'hb', route }); }
  setInterval(() => {
    hb();
    if (partner.online && Date.now() - partner.last > 9000) setPartner({ online: false });
  }, 3000);
  setInterval(() => { if (who === 'dariya') send({ type: 'ping', t0: Date.now() }); }, 5000);

  function peerId(w) { return ('dariyaislam-' + room + '-' + w).toLowerCase(); }
  function other() { return who === 'islam' ? 'dariya' : 'islam'; }
  function setupConn(c) {
    c.on('open', () => {
      conns.add(c); peerState = 'connected'; emit('__net');
      send({ type: 'hello' }); sendFull(); sendMediaList(); hb();
      if (who === 'dariya') for (let i = 0; i < 4; i++) setTimeout(() => send({ type: 'ping', t0: Date.now() }), 300 * i);
    });
    c.on('data', (d) => receive(d, 'p2p'));
    c.on('close', () => { conns.delete(c); if (![...conns].some((x) => x.open)) { peerState = 'searching'; emit('__net'); } });
    c.on('error', () => { conns.delete(c); });
  }
  let suffixTry = 0;
  function startPeer() {
    if (!window.Peer || !who) { peerState = window.Peer ? 'off' : 'nopeer'; return; }
    try { peer && peer.destroy(); } catch (e) {}
    const id = peerId(who) + (suffixTry ? '-' + tabId : '');
    peer = new window.Peer(id, { debug: 0 });
    peerState = 'searching'; emit('__net');
    peer.on('open', () => { tryConnect(); });
    peer.on('connection', setupConn);
    peer.on('call', (call) => { incomingCall(call); });
    peer.on('error', (e) => {
      if (e.type === 'unavailable-id' && !suffixTry) { suffixTry = 1; setTimeout(startPeer, 200); }
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  }
  function tryConnect() {
    if (!peer || peer.disconnected || peer.destroyed) return;
    if ([...conns].some((c) => c.open)) return;
    try { setupConn(peer.connect(peerId(other()), { reliable: true })); } catch (e) {}
  }
  setInterval(tryConnect, 5000);

  // ---------- media calls (живое видео в фотобудке) ----------
  let localStream = null; const streamL = new Set(); let activeCall = null;
  function onRemoteStream(cb) { streamL.add(cb); return () => streamL.delete(cb); }
  function incomingCall(call) {
    activeCall = call;
    call.answer(localStream || undefined);
    call.on('stream', (s) => streamL.forEach((cb) => cb(s)));
  }
  function startCall(stream) {
    localStream = stream;
    if (!peer || !stream) return;
    try {
      const call = peer.call(peerId(other()), stream);
      if (!call) return;
      activeCall = call;
      call.on('stream', (s) => streamL.forEach((cb) => cb(s)));
    } catch (e) {}
  }
  function setLocalStream(s) { localStream = s; }
  function endCall() { try { activeCall && activeCall.close(); } catch (e) {} activeCall = null; localStream = null; }

  // ---------- media (IndexedDB) ----------
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('dariyaislam-media', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('m');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(mode, fn) { return db().then((d) => new Promise((res, rej) => { const t = d.transaction('m', mode); const s = t.objectStore('m'); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); })); }
  const mediaCache = new Map(); const mediaL = new Map();
  function mediaPutRaw(id, data) { mediaCache.set(id, data); return tx('readwrite', (s) => s.put(data, id)); }
  function mediaPut(data, id) {
    id = id || ('m' + now().toString(36) + Math.random().toString(36).slice(2, 7));
    return mediaPutRaw(id, data).then(() => { send({ type: 'media', id, data }); return id; });
  }
  function mediaGet(id) {
    if (!id) return Promise.resolve(null);
    if (mediaCache.has(id)) return Promise.resolve(mediaCache.get(id));
    return tx('readonly', (s) => s.get(id)).then((d) => { if (d) mediaCache.set(id, d); else send({ type: 'mreq', id }); return d || null; }).catch(() => null);
  }
  function mediaIds() { return tx('readonly', (s) => s.getAllKeys()).catch(() => []); }
  function onMedia(id, cb) { if (!mediaL.has(id)) mediaL.set(id, new Set()); mediaL.get(id).add(cb); return () => mediaL.get(id).delete(cb); }

  // ---------- identity ----------
  function setWho(w, r) {
    who = w; localStorage.setItem(LS + 'who', w); sessionStorage.removeItem(LS + 'who');
    if (r) { room = r.toUpperCase(); localStorage.setItem(LS + 'room', room); }
    startPeer(); emit('__who');
  }
  function setRoom(r) { room = r.toUpperCase(); localStorage.setItem(LS + 'room', room); location.reload(); }
  function forget() { localStorage.removeItem(LS + 'who'); sessionStorage.removeItem(LS + 'who'); location.reload(); }

  window.Sync = {
    PEOPLE,
    get who() { return who; }, get other() { return who ? other() : null; }, get room() { return room; },
    get me() { return PEOPLE[who]; }, get them() { return who ? PEOPLE[other()] : null; },
    get partner() { return partner; }, get net() { return peerState; },
    setWho, setRoom, forget,
    get, set, on, keys, meta, now,
    onEph, sendEph, onPresence,
    mediaPut, mediaGet, onMedia,
    startCall, onRemoteStream, setLocalStream, endCall,
    send,
  };
  window.addEventListener('load', () => setTimeout(startPeer, 50));
})();

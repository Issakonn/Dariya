/* Синхронная фотобудка: комната → формат → рамка/фон → «Я готов» → 6 кадров одновременно → вместе выбираем 4, фильтр, стикеры, дудл → HD + видео */
const SHOT_GAP = 4200, SHOTS = 6, CELL_W = 540, CELL_H = 360;

function stripGeom(layout) {
  const m = 30, g = 18, foot = 130;
  if (layout === '2x2') return { W: m * 2 + CELL_W * 2 + g, H: m + CELL_H * 2 + g + foot, cells: [0, 1, 2, 3].map((i) => ({ x: m + (i % 2) * (CELL_W + g), y: m + Math.floor(i / 2) * (CELL_H + g) })), foot };
  return { W: m * 2 + CELL_W, H: m + CELL_H * 4 + g * 3 + foot, cells: [0, 1, 2, 3].map((i) => ({ x: m, y: m + i * (CELL_H + g) })), foot };
}
function loadImg(src) { return new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function coverDraw(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}
function paintBackdrop(ctx, id, x, y, w, h) {
  const b = DATA.backdrops.find((z) => z.id === id);
  const stops = { paris: ['#f4c9a5', '#e9a08a', '#7d6a8f'], tokyo: ['#2c2f4a', '#7a4f7a', '#e98aa0'], cinema: ['#8a1f2b', '#3a0d12', '#120507'], picnic: ['#bfe0f0', '#d9efd0', '#7fae6a'], santorini: ['#e9f3fb', '#9cc6e6', '#2a5e9a'] }[id];
  if (!b || !stops) { ctx.fillStyle = '#ddd2c4'; ctx.fillRect(x, y, w, h); return; }
  const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, stops[0]); gr.addColorStop(.55, stops[1]); gr.addColorStop(1, stops[2]);
  ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.globalAlpha = .28; ctx.fillStyle = '#fff';
  if (id === 'paris') { ctx.beginPath(); ctx.moveTo(x + w * .5, y + h * .12); ctx.lineTo(x + w * .43, y + h * .9); ctx.lineTo(x + w * .57, y + h * .9); ctx.closePath(); ctx.fill(); }
  if (id === 'tokyo') { for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + w * (0.1 + i * 0.16), y + h * .18, 10, 0, 7); ctx.fill(); } }
  if (id === 'cinema') { ctx.fillRect(x + w * .15, y + h * .1, w * .7, h * .35); }
  if (id === 'picnic') { for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) ctx.fillRect(x + i * w / 8, y + h * .82 + j * h * .09, w / 8, h * .09); }
  if (id === 'santorini') { ctx.beginPath(); ctx.arc(x + w * .8, y + h * .25, h * .1, 0, 7); ctx.fill(); ctx.fillRect(x, y + h * .7, w, 4); }
  ctx.restore();
}
function paintFrame(ctx, f, W, H) {
  ctx.fillStyle = f.bg; ctx.fillRect(0, 0, W, H);
  if (f.check) { ctx.fillStyle = f.ink; ctx.globalAlpha = .14; const s = 28; for (let x = 0; x < W; x += s) for (let y = 0; y < H; y += s) if (((x + y) / s) % 2 === 0) ctx.fillRect(x, y, s, s); ctx.globalAlpha = 1; }
  if (f.glyph) { ctx.fillStyle = f.ink; ctx.globalAlpha = .22; ctx.font = '22px serif'; ctx.textAlign = 'center'; for (let y = 14, r = 0; y < H; y += 46, r++) for (let x = (r % 2 ? 23 : 0); x < W + 30; x += 46) ctx.fillText(f.glyph, x, y + 10); ctx.globalAlpha = 1; }
  if (f.kind === 'ticket') { ctx.fillStyle = '#f7f1e8'; for (let y = 40; y < H; y += 60) { ctx.beginPath(); ctx.arc(0, y, 9, 0, 7); ctx.arc(W, y, 9, 0, 7); ctx.fill(); } }
}
function applyFace(ctx, face, x, y, w, h) {
  if (face === 'blush') { ['.3', '.7'].forEach((fx) => { const g = ctx.createRadialGradient(x + w * fx, y + h * .58, 0, x + w * fx, y + h * .58, w * .12); g.addColorStop(0, 'rgba(240,110,120,.35)'); g.addColorStop(1, 'rgba(240,110,120,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }); }
  if (face === 'glow') { const g = ctx.createRadialGradient(x + w / 2, y + h * .4, 0, x + w / 2, y + h * .4, w * .7); g.addColorStop(0, 'rgba(255,240,220,.25)'); g.addColorStop(1, 'rgba(255,200,180,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  if (face === 'hearts') { ctx.font = Math.round(h * .12) + 'px serif'; ctx.fillStyle = '#e8606c'; [[.25, .12], [.5, .07], [.75, .13]].forEach(([a, b]) => ctx.fillText('♥', x + w * a, y + h * b + h * .1)); }
}
/* Ячейка: две половины (Ислам слева, Дария справа) на общем фоне */
async function paintCell(ctx, shot, x, y, cfg) {
  const { backdrop, solo } = cfg;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, CELL_W, CELL_H); ctx.clip();
  paintBackdrop(ctx, backdrop, x, y, CELL_W, CELL_H);
  const people = solo ? [solo] : ['islam', 'dariya'];
  for (let k = 0; k < people.length; k++) {
    const w = people[k]; const img = await loadImg(shot && shot[w]);
    const hx = solo ? x : x + k * CELL_W / 2, hw = solo ? CELL_W : CELL_W / 2;
    if (img) { ctx.save(); ctx.beginPath(); ctx.rect(hx, y, hw, CELL_H); ctx.clip(); coverDraw(ctx, img, hx, y, hw, CELL_H); ctx.restore(); }
    else { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(hx, y, hw, CELL_H); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.font = '600 18px Manrope'; ctx.textAlign = 'center'; ctx.fillText(nameOf(w), hx + hw / 2, y + CELL_H / 2); }
  }
  ctx.restore();
}
async function renderStrip(cfg, opts = {}) {
  const { layout, frame, shots, picks, filter, caption, date } = cfg;
  const G = stripGeom(layout); const f = DATA.frames.find((z) => z.id === frame) || DATA.frames[0];
  const c = opts.canvas || document.createElement('canvas'); c.width = G.W; c.height = G.H; const ctx = c.getContext('2d');
  paintFrame(ctx, f, G.W, G.H);
  const fl = (DATA.filters.find((z) => z.id === filter) || DATA.filters[0]).css;
  for (let i = 0; i < 4; i++) {
    const cell = G.cells[i]; const shot = shots[picks[i]];
    const tmp = document.createElement('canvas'); tmp.width = CELL_W; tmp.height = CELL_H;
    await paintCell(tmp.getContext('2d'), shot, 0, 0, cfg);
    ctx.save(); ctx.filter = fl; ctx.drawImage(tmp, cell.x, cell.y); ctx.restore();
  }
  ctx.fillStyle = f.ink; ctx.textAlign = 'center';
  ctx.font = 'italic 600 46px "Cormorant Garamond"'; ctx.fillText(caption || 'Ислам + Дария', G.W / 2, G.H - G.foot / 2 + 6);
  ctx.font = '600 15px Manrope'; ctx.globalAlpha = .7; ctx.fillText((date || new Date(Sync.now()).toLocaleDateString('ru-RU')) + ' · Лодзь ⇄ Шмалькальден', G.W / 2, G.H - G.foot / 2 + 36); ctx.globalAlpha = 1;
  if (f.kind === 'ticket') { ctx.setLineDash([8, 8]); ctx.strokeStyle = f.ink; ctx.globalAlpha = .4; ctx.beginPath(); ctx.moveTo(20, G.H - G.foot); ctx.lineTo(G.W - 20, G.H - G.foot); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  // наклейки и рисунок
  if (opts.overlay) {
    (opts.strokes || []).forEach((s) => { ctx.strokeStyle = s.c; ctx.lineWidth = s.w * G.W; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); s.p.forEach(([px, py], j) => j ? ctx.lineTo(px * G.W, py * G.H) : ctx.moveTo(px * G.W, py * G.H)); ctx.stroke(); });
    (opts.stickers || []).forEach((s) => { ctx.save(); ctx.translate(s.x * G.W, s.y * G.H); ctx.rotate(s.r || 0); ctx.font = Math.round(s.s * G.W) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.ch, 0, 0); ctx.restore(); });
  }
  return c;
}

/* ----- сегментация фона (MediaPipe), подгружается по требованию ----- */
let segP = null;
function getSegmenter() {
  if (segP) return segP;
  const imp = new Function('u', 'return import(u)');
  segP = imp('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs').then(async (v) => {
    const fs = await v.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    return v.ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite' }, runningMode: 'IMAGE', outputConfidenceMasks: true });
  }).catch((e) => { console.warn('Сегментация недоступна', e); segP = null; return null; });
  return segP;
}
async function cutout(canvas) {
  const seg = await getSegmenter(); if (!seg) return null;
  try {
    const res = seg.segment(canvas); const mask = res.confidenceMasks[0].getAsFloat32Array();
    const ctx = canvas.getContext('2d'); const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < mask.length; i++) { const a = Math.max(0, Math.min(1, (mask[i] - 0.3) / 0.4)); d.data[i * 4 + 3] = a * 255; }
    ctx.putImageData(d, 0, 0); res.close && res.close(); return canvas;
  } catch (e) { return null; }
}

/* ----- камера ----- */
function useCamera(on) {
  const [stream, setStream] = useState(null); const [err, setErr] = useState(null);
  useEffect(() => {
    if (!on) return; let s; let alive = true;
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 1280 }, facingMode: 'user' }, audio: false })
      .then((st) => { if (!alive) { st.getTracks().forEach((t) => t.stop()); return; } s = st; setStream(st); })
      .catch((e) => setErr(e.message || 'нет доступа'));
    if (!navigator.mediaDevices) setErr('камера недоступна');
    return () => { alive = false; s && s.getTracks().forEach((t) => t.stop()); };
  }, [on]);
  return [stream, err];
}
function Video({ stream, mirror = true, style }) {
  const ref = useRef();
  useEffect(() => { if (ref.current && stream) { ref.current.srcObject = stream; ref.current.play().catch(() => {}); } }, [stream]);
  return <video ref={ref} muted playsInline autoPlay style={Object.assign({ width: '100%', height: '100%', objectFit: 'cover', transform: mirror ? 'scaleX(-1)' : 'none', display: 'block' }, style)} />;
}
async function grab(video, face, needCut, who) {
  const c = document.createElement('canvas'); c.width = 405; c.height = 540; const ctx = c.getContext('2d');
  if (video && video.videoWidth) {
    ctx.save(); ctx.translate(c.width, 0); ctx.scale(-1, 1);
    if (face === 'soft') ctx.filter = 'blur(.6px) brightness(1.06) contrast(.95)';
    coverDraw(ctx, video, 0, 0, c.width, c.height); ctx.restore();
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, who === 'islam' ? '#bcd0ea' : '#f1c4c6'); g.addColorStop(1, who === 'islam' ? '#6f8fbf' : '#d87c84'); ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(c.width / 2, c.height * .42, 70, 0, 7); ctx.fill(); ctx.fillRect(c.width / 2 - 110, c.height * .62, 220, 260);
    ctx.fillStyle = '#2a221d'; ctx.font = '600 22px Manrope'; ctx.textAlign = 'center'; ctx.fillText(nameOf(who) + ' · без камеры', c.width / 2, 40);
  }
  if (needCut) await cutout(c);
  applyFace(ctx, face, 0, 0, c.width, c.height);
  return c.toDataURL(needCut ? 'image/webp' : 'image/jpeg', 0.82);
}

/* ----- превью полоски (DOM) ----- */
function StripView({ strip, width = 160 }) {
  return <div className="polaroid" style={{ padding: 6, width, boxShadow: 'var(--shadow-lg)' }}><MediaImg id={strip.img} style={{ width: '100%' }} /></div>;
}
function FrameSwatch({ f, on, onClick }) {
  const style = { width: 64, height: 86, borderRadius: 10, background: f.bg, border: on ? '2.5px solid var(--ink)' : '1px solid var(--line)', position: 'relative', overflow: 'hidden', flex: 'none' };
  return <button onClick={onClick} style={{ border: 0, background: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
    <div style={style}>
      {f.glyph && <div style={{ position: 'absolute', inset: 0, color: f.ink, opacity: .3, fontSize: 10, lineHeight: '13px', letterSpacing: 4, padding: 3, wordBreak: 'break-all' }}>{f.glyph.repeat(40)}</div>}
      {f.check && <div style={{ position: 'absolute', inset: 0, opacity: .18, background: `repeating-conic-gradient(${f.ink} 0 25%, transparent 0 50%) 0 0/14px 14px` }} />}
      {[0, 1, 2].map((i) => <div key={i} style={{ position: 'absolute', left: 8, right: 8, top: 7 + i * 20, height: 16, background: 'rgba(255,255,255,.75)', borderRadius: 2 }} />)}
    </div>
    <span style={{ fontSize: 11, fontWeight: 700 }}>{f.name}</span>
  </button>;
}

function Photobooth() {
  const [st, setSt] = useStore('booth:state', null);
  const state = st || { phase: 'setup', layout: '1x4', frame: 'cream', backdrop: 'none', face: 'none', caption: 'Ислам + Дария', session: 's0', solo: null };
  const upd = (o) => setSt({ ...state, ...o });
  return <div className="page">
    <div className="row wrap" style={{ marginBottom: 22 }}>
      <div><div className="eyebrow">Фотобудка для двоих · комната <span className="mono" style={{ color: 'var(--ink)' }}>{Sync.room}</span></div><h1 className="h-l mt8">{state.phase === 'edit' ? 'Собираем ленту вместе' : state.phase === 'shoot' ? 'Улыбаемся!' : 'Фотобудка для двоих'}</h1></div>
      <span className="spacer" /><PartnerStatus />
    </div>
    {state.phase === 'setup' && <BoothSetup state={state} upd={upd} />}
    {state.phase === 'shoot' && <BoothShoot state={state} upd={upd} />}
    {state.phase === 'edit' && <BoothEdit state={state} upd={upd} />}
    {state.phase === 'setup' && <StripGallery />}
  </div>;
}

function BoothSetup({ state, upd }) {
  const p = usePartner();
  const start = (solo) => { const session = 's' + uid(); upd({ phase: 'shoot', session, solo: solo ? Sync.who : null }); if (solo) Sync.set('ready:booth-' + session + ':solo', Sync.who); };
  return <CursorStage id="booth-setup">
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 22 }}>
      <div className="card pad col" style={{ gap: 26 }}>
        <div><span className="label">1 · Формат ленты</span><div className="row">
          {[['1x4', 'Полоска 1×4'], ['2x2', 'Сетка 2×2']].map(([k, l]) => <button key={k} className={'chip' + (state.layout === k ? ' on' : '')} onClick={() => upd({ layout: k })} style={{ padding: '12px 18px' }}>
            <span style={{ display: 'inline-grid', gridTemplateColumns: k === '2x2' ? '1fr 1fr' : '1fr', gap: 2, width: k === '2x2' ? 18 : 9 }}>{[0, 1, 2, 3].map((i) => <i key={i} style={{ width: k === '2x2' ? 8 : 9, height: k === '2x2' ? 6 : 4, background: 'currentColor', opacity: .6, borderRadius: 1 }} />)}</span>{l}</button>)}
        </div></div>
        <div><span className="label">2 · Рамка</span><div className="row" style={{ gap: 12, overflowX: 'auto', paddingBottom: 6 }}>{DATA.frames.map((f) => <FrameSwatch key={f.id} f={f} on={state.frame === f.id} onClick={() => upd({ frame: f.id })} />)}</div></div>
        <div><span className="label">3 · Фон за вами</span><div className="row wrap">{DATA.backdrops.map((b) => <button key={b.id} className={'chip' + (state.backdrop === b.id ? ' on' : '')} onClick={() => { upd({ backdrop: b.id }); if (b.id !== 'none') getSegmenter(); }}>
          <i style={{ width: 14, height: 14, borderRadius: 4, background: b.g || 'repeating-linear-gradient(45deg,#ddd 0 3px,#fff 3px 6px)' }} />{b.name}</button>)}</div>
          {state.backdrop !== 'none' && <p className="faint" style={{ fontSize: 12, margin: '8px 0 0' }}>Фон заменяется на снимке автоматически (нейросеть в браузере, первая загрузка ~5 сек).</p>}</div>
        <div><span className="label">4 · Лицо</span><div className="row wrap">{[['none', 'Как есть'], ['soft', 'Мягкая кожа'], ['blush', 'Румянец'], ['glow', 'Сияние'], ['hearts', 'Сердечки']].map(([k, l]) => <button key={k} className={'chip' + (state.face === k ? ' on' : '')} onClick={() => upd({ face: k })}>{l}</button>)}</div></div>
        <div><span className="label">5 · Подпись</span><input className="input" value={state.caption} onChange={(e) => upd({ caption: e.target.value })} style={{ maxWidth: 360 }} /></div>
        <div className="row wrap" style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
          <button className="btn lg" onClick={() => start(false)}>Вместе — в будку</button>
          <button className="btn lg ghost" onClick={() => start(true)}>Solo · потренировать позы</button>
          <span className="muted" style={{ fontSize: 13 }}>{p.online ? `${Sync.them.name} в комнате — видит твой выбор` : `${Sync.them.name} пока не в сети`}</span>
        </div>
      </div>
      <div className="col" style={{ alignItems: 'center' }}><span className="label">Так будет выглядеть</span><StripPreview state={state} /></div>
    </div>
  </CursorStage>;
}
function StripPreview({ state }) {
  const ref = useRef();
  useEffect(() => { renderStrip({ ...state, shots: [], picks: [0, 1, 2, 3], filter: 'none' }, { canvas: ref.current }); }, [state.layout, state.frame, state.backdrop, state.caption]);
  return <canvas ref={ref} style={{ width: state.layout === '2x2' ? 290 : 190, boxShadow: 'var(--shadow-lg)', borderRadius: 4 }} />;
}

function BoothShoot({ state, upd }) {
  const scope = 'booth-' + state.session;
  const [stream, err] = useCamera(true);
  const [remote, setRemote] = useState(null);
  const vref = useRef();
  const r = useReady(scope);
  const now = useNow(100);
  const poses = useMemo(() => shuffleSeeded(DATA.poses, state.session).slice(0, SHOTS), [state.session]);
  const [flash, setFlash] = useState(false);
  const [taken, setTaken] = useState(0);
  useEffect(() => Sync.onRemoteStream(setRemote), []);
  useEffect(() => { if (stream) { Sync.setLocalStream(stream); if (Sync.who === 'islam' && !state.solo) setTimeout(() => Sync.startCall(stream), 600); } return () => Sync.endCall(); }, [stream]);
  // Планировщик: снимки по единым часам
  useEffect(() => {
    if (!r.startAt) return; const timers = [];
    for (let i = 0; i < SHOTS; i++) {
      const at = r.startAt + i * SHOT_GAP + 3000;
      const key = 'booth:shot:' + state.session + ':' + i + ':' + Sync.who;
      if (Sync.get(key)) continue;
      timers.push(setTimeout(async () => {
        setFlash(true); setTimeout(() => setFlash(false), 280);
        const v = document.getElementById('booth-video');
        const d = await grab(v, state.face, state.backdrop !== 'none', Sync.who);
        const id = await Sync.mediaPut(d); Sync.set(key, id); setTaken((x) => x + 1);
      }, Math.max(0, at - Sync.now())));
    }
    const done = r.startAt + SHOTS * SHOT_GAP + 1200;
    timers.push(setTimeout(() => { if (Sync.get('booth:state').phase === 'shoot') upd({ phase: 'edit' }); }, Math.max(0, done - Sync.now())));
    return () => timers.forEach(clearTimeout);
  }, [r.startAt]);
  const running = r.startAt && now >= r.startAt;
  const i = running ? Math.min(SHOTS - 1, Math.floor((now - r.startAt) / SHOT_GAP)) : 0;
  const into = running ? (now - r.startAt) - i * SHOT_GAP : 0;
  const cd = running ? Math.max(0, Math.ceil((3000 - into) / 1000)) : null;
  const shotsMine = useKeys('booth:shot:' + state.session + ':');
  const theirLast = shotsMine.filter((k) => k.endsWith(':' + Sync.other)).sort().pop();
  const bd = DATA.backdrops.find((b) => b.id === state.backdrop);
  const half = (w, content) => <div style={{ position: 'relative', flex: 1, background: bd && bd.g ? bd.g : '#2a221d', overflow: 'hidden' }}>{content}
    <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(0,0,0,.45)', color: '#fff', padding: '4px 10px 4px 4px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}><Av w={w} size={20} />{nameOf(w)}</div></div>;
  const mine = half(Sync.who, stream ? <Video stream={stream} /> : <div className="ph-slot" style={{ height: '100%', background: 'transparent', color: '#fff' }}>{err ? 'Камера недоступна: ' + err + '. Снимем заглушку.' : 'включаем камеру…'}</div>);
  const theirs = state.solo ? null : half(Sync.other, remote ? <Video stream={remote} /> : theirLast ? <MediaImg id={Sync.get(theirLast)} style={{ width: '100%', height: '100%' }} /> : <div className="ph-slot" style={{ height: '100%', background: 'transparent', color: 'rgba(255,255,255,.7)' }}>камера {Sync.them.name === 'Дария' ? 'Дарии' : 'Ислама'}</div>);
  const order = Sync.who === 'islam' ? [mine, theirs] : [theirs, mine];
  return <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 22 }}>
    <div className="col" style={{ gap: 16 }}>
      {/* шторка будки */}
      <div style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', background: '#1c1714', padding: 14 }}>
        <div id="booth-video-wrap" style={{ display: 'flex', gap: 4, aspectRatio: state.solo ? '3/2' : '3/2', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
          {order.filter(Boolean)}
          {stream && <video id="booth-video" ref={(el) => { if (el && el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => {}); } }} muted playsInline style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />}
          {running && cd > 0 && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}><div key={i + '-' + cd} className="countdown-big" style={{ color: '#fff', textShadow: '0 4px 30px rgba(0,0,0,.5)' }}>{cd}</div></div>}
          {flash && <div style={{ position: 'absolute', inset: 0, background: '#fff', animation: 'fade .3s reverse' }} />}
        </div>
        {!running && <div style={{ position: 'absolute', inset: 14, borderRadius: 16, background: 'repeating-linear-gradient(90deg,#8a2d2f 0 18px,#7a2527 18px 36px)', display: 'grid', placeItems: 'center', transition: '.6s' }}>
          <div style={{ background: 'var(--paper)', borderRadius: 24, maxWidth: 460, width: '90%' }}><ReadyGate scope={scope} compact title="Заходим в будку" hint={`6 снимков подряд, каждый — в одну миллисекунду на обоих экранах. Перед каждым щелчком — подсказка позы.`} allowSolo={!state.solo}>{null}</ReadyGate></div>
        </div>}
      </div>
      {running && <div className="card pad center" style={{ background: 'var(--butter)', borderColor: 'transparent' }}>
        <div className="eyebrow">Поза {i + 1} из {SHOTS}</div>
        <div className="h-m mt8">{poses[i]}</div>
      </div>}
      <div className="row"><button className="btn ghost sm" onClick={() => { r.reset(); upd({ phase: 'setup' }); }}>← Выйти из будки</button><span className="spacer" />
        {running && <span className="muted" style={{ fontSize: 13 }}>Снято: {shotsMine.filter((k) => k.endsWith(':' + Sync.who)).length} / {SHOTS}</span>}</div>
    </div>
    <div className="card pad"><div className="eyebrow">Подсказки поз</div>
      <ol style={{ paddingLeft: 18, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: 10 }}>{poses.map((p, k) => <li key={k} style={{ fontSize: 14, fontWeight: running && k === i ? 700 : 400, color: running && k < i ? 'var(--ink3)' : 'var(--ink)' }}>{p}</li>)}</ol>
    </div>
  </div>;
}

function useShots(session) {
  useKeys('booth:shot:' + session + ':');
  const shots = [];
  for (let i = 0; i < SHOTS; i++) shots.push({ islam: null, dariya: null, _i: i });
  return shots.map((s, i) => ({ ...s, islamId: Sync.get('booth:shot:' + session + ':' + i + ':islam'), dariyaId: Sync.get('booth:shot:' + session + ':' + i + ':dariya') }));
}
function ShotThumb({ s, solo, backdrop }) {
  const a = useMedia(s.islamId), b = useMedia(s.dariyaId);
  const bd = DATA.backdrops.find((x) => x.id === backdrop);
  const ppl = solo ? [solo === 'islam' ? a : b] : [a, b];
  return <div style={{ display: 'flex', aspectRatio: '3/2', background: bd && bd.g ? bd.g : '#ddd', borderRadius: 8, overflow: 'hidden' }}>
    {ppl.map((src, k) => src ? <img key={k} src={src} style={{ flex: 1, minWidth: 0, objectFit: 'cover' }} /> : <div key={k} className="ph-slot" style={{ flex: 1, background: 'transparent' }}>…</div>)}
  </div>;
}

function BoothEdit({ state, upd }) {
  const S = state.session;
  const shotsRaw = useShots(S);
  const [ed, setEd] = useStore('booth:edit:' + S, null);
  const edit = ed || { picks: [0, 1, 2, 3], filter: 'none', stickers: [] };
  const setE = (o) => setEd({ ...edit, ...o });
  const strokeKeys = useKeys('booth:stroke:' + S + ':');
  const strokes = strokeKeys.map((k) => Sync.get(k)).filter(Boolean).sort((a, b) => a.t - b.t);
  const [tool, setTool] = useState('move');
  const [penColor, setPenColor] = useState(Sync.who === 'islam' ? '#4b74b0' : '#d7646a');
  const [live, setLive] = useState(null);
  const [mineLive, setMineLive] = useState(null);
  const cv = useRef(); const wrap = useRef();
  const G = stripGeom(state.layout);
  const [srcs, setSrcs] = useState({});
  useEffect(() => { let alive = true; (async () => { const o = {}; for (const s of shotsRaw) { o[s._i] = { islam: s.islamId ? await Sync.mediaGet(s.islamId) : null, dariya: s.dariyaId ? await Sync.mediaGet(s.dariyaId) : null }; } alive && setSrcs(o); })(); return () => { alive = false; }; }, [JSON.stringify(shotsRaw.map((s) => [s.islamId, s.dariyaId]))]);
  const shots = shotsRaw.map((s) => srcs[s._i] || {});
  const cfg = { ...state, shots, picks: edit.picks, filter: edit.filter, solo: state.solo };
  useEffect(() => { renderStrip(cfg, { canvas: cv.current }); }, [JSON.stringify(edit.picks), edit.filter, srcs, state.layout, state.frame]);
  useEph('booth-ink', (d) => { if (d.s === S) setLive(d.p ? d : null); });

  const togglePick = (i) => {
    let p = edit.picks.slice();
    if (p.includes(i)) p = p.filter((x) => x !== i); else if (p.length < 4) p.push(i); else { p.shift(); p.push(i); }
    setE({ picks: p });
  };
  const rel = (e) => { const r = wrap.current.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  const drag = useRef(null);
  const onDown = (e) => {
    if (tool === 'pen') { e.currentTarget.setPointerCapture(e.pointerId); const p = [rel(e)]; setMineLive({ c: penColor, w: 0.008, p }); drag.current = { pen: p }; }
  };
  const onMove = (e) => {
    const d = drag.current; if (!d) return;
    if (d.pen) { d.pen.push(rel(e)); setMineLive({ c: penColor, w: 0.008, p: d.pen.slice() }); Sync.sendEph('booth-ink', { s: S, c: penColor, w: 0.008, p: d.pen.slice(-60) }); }
    if (d.st !== undefined) { const [x, y] = rel(e); const st = edit.stickers.map((s, k) => k === d.st ? { ...s, x, y } : s); d.cur = st; setE({ stickers: st }); }
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (d && d.pen && d.pen.length > 1) { Sync.set('booth:stroke:' + S + ':' + uid(), { c: penColor, w: 0.008, p: d.pen, t: Sync.now(), by: Sync.who }); Sync.sendEph('booth-ink', { s: S, p: null }); }
    setMineLive(null);
  };
  const addSticker = (ch) => setE({ stickers: [...edit.stickers, { ch, x: 0.5 + (Math.random() - .5) * .3, y: 0.3 + Math.random() * .4, s: 0.09, r: (Math.random() - .5) * .5 }] });
  const [saving, setSaving] = useState(false);
  const saveStrip = async () => {
    setSaving(true);
    const c = await renderStrip(cfg, { overlay: true, strokes, stickers: edit.stickers });
    const img = await Sync.mediaPut(c.toDataURL('image/jpeg', 0.92));
    const shotIds = shotsRaw.map((s) => ({ islam: s.islamId, dariya: s.dariyaId }));
    Sync.set('strip:' + S, { img, session: S, layout: state.layout, frame: state.frame, backdrop: state.backdrop, solo: state.solo, shots: shotIds, t: Sync.now(), caption: state.caption });
    markDone('booth'); setSaving(false); burst(); toast('Лента сохранена у обоих');
    downloadURL(c.toDataURL('image/png'), 'dariya-islam-' + todayKey() + '.png');
  };
  const svgPath = (s) => s.p.map(([x, y], j) => (j ? 'L' : 'M') + (x * G.W).toFixed(1) + ' ' + (y * G.H).toFixed(1)).join(' ');
  return <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', gap: 26 }}>
    <div className="col" style={{ gap: 18 }}>
      <div className="card pad"><div className="row"><div><span className="label">Выберите 4 лучших из 6</span><span className="muted" style={{ fontSize: 13 }}>Выбирает любой — второй видит сразу. Порядок = порядок нажатия.</span></div></div>
        <CursorStage id={'pick-' + S}><div className="grid mt16" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {shotsRaw.map((s, i) => { const k = edit.picks.indexOf(i); return <button key={i} onClick={() => togglePick(i)} style={{ position: 'relative', padding: 4, borderRadius: 12, border: k >= 0 ? '2.5px solid var(--ink)' : '2.5px solid transparent', background: 'var(--paper)' }}>
            <ShotThumb s={s} solo={state.solo} backdrop={state.backdrop} />
            {k >= 0 && <span style={{ position: 'absolute', right: 10, top: 10, width: 26, height: 26, borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13 }}>{k + 1}</span>}
          </button>; })}
        </div></CursorStage></div>
      <div className="card pad col" style={{ gap: 16 }}>
        <div><span className="label">Фильтр на всю ленту</span><div className="row wrap">{DATA.filters.map((f) => <button key={f.id} className={'chip' + (edit.filter === f.id ? ' on' : '')} onClick={() => setE({ filter: f.id })}>{f.name}</button>)}</div></div>
        <div><span className="label">Инструмент</span><div className="row wrap">
          <button className={'chip' + (tool === 'move' ? ' on' : '')} onClick={() => setTool('move')}>Двигать стикеры</button>
          <button className={'chip' + (tool === 'pen' ? ' on' : '')} onClick={() => setTool('pen')}>Рисовать</button>
          {tool === 'pen' && ['#4b74b0', '#d7646a', '#2a221d', '#ffffff', '#e2b23c'].map((c) => <button key={c} onClick={() => setPenColor(c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: penColor === c ? '3px solid var(--ink)' : '1px solid var(--line2)' }} />)}
          <button className="chip" onClick={() => { strokeKeys.forEach((k) => Sync.set(k, null)); setE({ stickers: [] }); }}>Очистить всё</button>
        </div></div>
        <div><span className="label">Стикеры</span><div className="row wrap">{DATA.stickers.map((s) => <button key={s} className="chip" style={{ fontSize: 20, padding: '4px 10px' }} onClick={() => addSticker(s)}>{s}</button>)}</div></div>
        <div className="row wrap" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <button className="btn lg" onClick={saveStrip} disabled={saving || edit.picks.length < 4}>{saving ? 'Сохраняем…' : 'Сохранить HD-ленту'}</button>
          <button className="btn ghost" onClick={() => makeBoothVideo(cfg, shotsRaw)}>Скачать видео из будки</button>
          <button className="btn ghost" onClick={() => upd({ phase: 'setup' })}>Новая съёмка</button>
        </div>
      </div>
    </div>
    <CursorStage id={'strip-' + S} style={{ alignSelf: 'start' }}>
      <div ref={wrap} style={{ position: 'relative', width: state.layout === '2x2' ? 520 : 300, maxWidth: '80vw', touchAction: 'none', cursor: tool === 'pen' ? 'crosshair' : 'default' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        <canvas ref={cv} style={{ width: '100%', display: 'block', boxShadow: 'var(--shadow-lg)' }} />
        <svg viewBox={`0 0 ${G.W} ${G.H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {[...strokes, live, mineLive].filter(Boolean).map((s, k) => <path key={k} d={svgPath(s)} stroke={s.c} strokeWidth={s.w * G.W} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
        </svg>
        {edit.stickers.map((s, k) => <div key={k} onPointerDown={(e) => { if (tool !== 'move') return; e.stopPropagation(); wrap.current.setPointerCapture(e.pointerId); drag.current = { st: k }; }}
          onDoubleClick={() => setE({ stickers: edit.stickers.filter((_, j) => j !== k) })}
          style={{ position: 'absolute', left: (s.x * 100) + '%', top: (s.y * 100) + '%', transform: `translate(-50%,-50%) rotate(${s.r}rad)`, fontSize: `calc(${s.s * 100}cqw)`, lineHeight: 1, cursor: tool === 'move' ? 'grab' : 'inherit', userSelect: 'none', containerType: 'normal' }}>
          <span style={{ fontSize: (s.s * (state.layout === '2x2' ? 520 : 300)) + 'px' }}>{s.ch}</span></div>)}
      </div>
      <div className="faint center mt8" style={{ fontSize: 12 }}>Двойной клик по стикеру — удалить</div>
    </CursorStage>
  </div>;
}
function downloadURL(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

/* Видео из будки: все 6 дублей подряд с вспышками, записывается в webm */
async function makeBoothVideo(cfg, shotsRaw) {
  if (!window.MediaRecorder) return toast('Браузер не умеет записывать видео');
  toast('Собираем видео… ~8 сек');
  const c = document.createElement('canvas'); c.width = CELL_W * 2; c.height = CELL_H * 2; const ctx = c.getContext('2d');
  const cells = [];
  for (let i = 0; i < shotsRaw.length; i++) { const t = document.createElement('canvas'); t.width = CELL_W; t.height = CELL_H; await paintCell(t.getContext('2d'), cfg.shots[i], 0, 0, cfg); cells.push(t); }
  const rec = new MediaRecorder(c.captureStream(30), { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
  const chunks = []; rec.ondataavailable = (e) => chunks.push(e.data);
  rec.onstop = () => { const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); downloadURL(url, 'booth-video-' + todayKey() + '.webm'); toast('Видео скачано'); };
  rec.start();
  const per = 1300, total = per * cells.length + 600; const t0 = performance.now();
  const f = DATA.frames.find((z) => z.id === cfg.frame) || DATA.frames[0];
  await new Promise((res) => {
    (function tick() {
      const t = performance.now() - t0; const i = Math.min(cells.length - 1, Math.floor(t / per)); const k = (t % per) / per;
      ctx.fillStyle = f.bg; ctx.fillRect(0, 0, c.width, c.height);
      const z = 1.04 - k * 0.04; ctx.save(); ctx.translate(c.width / 2, c.height / 2 - 30); ctx.scale(z * 1.7, z * 1.7); ctx.filter = (DATA.filters.find((x) => x.id === cfg.filter) || {}).css || 'none'; ctx.drawImage(cells[i], -CELL_W / 2, -CELL_H / 2); ctx.restore();
      ctx.fillStyle = f.ink; ctx.font = 'italic 600 44px "Cormorant Garamond"'; ctx.textAlign = 'center'; ctx.fillText((cfg.caption || 'Ислам + Дария') + ' · дубль ' + (i + 1), c.width / 2, c.height - 40);
      if (k < 0.12) { ctx.fillStyle = `rgba(255,255,255,${1 - k / 0.12})`; ctx.fillRect(0, 0, c.width, c.height); }
      if (t < total) requestAnimationFrame(tick); else res();
    })();
  });
  rec.stop();
}

function StripGallery() {
  const ks = useKeys('strip:');
  const strips = ks.map((k) => ({ k, ...Sync.get(k) })).sort((a, b) => b.t - a.t);
  if (!strips.length) return null;
  return <section className="mt48"><div className="eyebrow">Свежее из будки</div><h2 className="h-m mt8">Наши ленты · {strips.length}</h2>
    <div className="row wrap mt24" style={{ gap: 22, alignItems: 'flex-start' }}>
      {strips.map((s, i) => <div key={s.k} style={{ transform: `rotate(${(i % 3 - 1) * 2}deg)` }}><StripView strip={s} width={s.layout === '2x2' ? 240 : 140} />
        <div className="row mt8" style={{ justifyContent: 'center', gap: 6 }}><span className="faint" style={{ fontSize: 12 }}>{new Date(s.t).toLocaleDateString('ru-RU')}</span>
          <button className="btn sm soft" style={{ padding: '4px 10px' }} onClick={async () => downloadURL(await Sync.mediaGet(s.img), 'strip.jpg')}>HD</button>
          <button className="btn sm soft" style={{ padding: '4px 10px' }} onClick={() => confirm('Удалить ленту?') && Sync.set(s.k, null)}>✕</button></div></div>)}
    </div></section>;
}

window.__cutout = cutout;
Object.assign(window, { Photobooth, StripView, renderStrip, downloadURL, useCamera, Video, coverDraw, loadImg });

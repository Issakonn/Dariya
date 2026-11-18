/* Общие хуки и компоненты: состояние, курсоры, «Я готов», модалки, тосты, конфетти */
const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } = React;

function useStore(key, def) {
  const [, force] = useState(0);
  useEffect(() => Sync.on(key, () => force((x) => x + 1)), [key]);
  const v = Sync.get(key, def);
  const set = useCallback((nv) => Sync.set(key, typeof nv === 'function' ? nv(Sync.get(key, def)) : nv), [key]);
  return [v, set];
}
function useKeys(prefix) {
  const [, force] = useState(0);
  useEffect(() => Sync.on(prefix.split(':')[0] + ':*', () => force((x) => x + 1)), [prefix]);
  return Sync.keys(prefix);
}
function useNow(ms = 1000) {
  const [t, setT] = useState(Sync.now());
  useEffect(() => { const i = setInterval(() => setT(Sync.now()), ms); return () => clearInterval(i); }, [ms]);
  return t;
}
function usePartner() {
  const [p, setP] = useState(Sync.partner);
  useEffect(() => Sync.onPresence(setP), []);
  return p;
}
function useEph(ch, cb) {
  const ref = useRef(cb); ref.current = cb;
  useEffect(() => Sync.onEph(ch, (d, m) => ref.current(d, m)), [ch]);
}
function useRoute() {
  const [r, setR] = useState(location.hash || '#/');
  useEffect(() => { const f = () => { setR(location.hash || '#/'); window.scrollTo(0, 0); }; window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return r;
}
function go(h) { location.hash = h; }
function nameOf(w) { return Sync.PEOPLE[w] ? Sync.PEOPLE[w].name : '—'; }
function colorOf(w) { return w === 'islam' ? 'var(--islam)' : 'var(--dariya)'; }
function seeded(seed) { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function shuffleSeeded(arr, seed) { const r = seeded(seed); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function uid() { return Sync.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function markDone(id) { if (!Sync.get('done:' + id)) Sync.set('done:' + id, Sync.now()); }
function todayKey(d) { const x = d ? new Date(d) : new Date(Sync.now()); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
function plural(n, a, b, c) { const m = Math.abs(n) % 100, m1 = m % 10; if (m > 10 && m < 20) return c; if (m1 > 1 && m1 < 5) return b; if (m1 === 1) return a; return c; }

/* ---------- toasts / confetti / floaties ---------- */
function toast(msg, ms = 2600) { window.dispatchEvent(new CustomEvent('di-toast', { detail: { msg, ms } })); }
function Toasts() {
  const [list, setList] = useState([]);
  useEffect(() => {
    const f = (e) => { const id = Math.random(); setList((l) => [...l, { id, msg: e.detail.msg }]); setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), e.detail.ms); };
    window.addEventListener('di-toast', f); return () => window.removeEventListener('di-toast', f);
  }, []);
  return <div className="toasts">{list.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}</div>;
}
function burst(opts = {}) {
  const c = document.createElement('canvas'); c.className = 'confetti'; c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c); const ctx = c.getContext('2d'); ctx.scale(devicePixelRatio, devicePixelRatio);
  const colors = opts.colors || ['#e8797d', '#6f95c9', '#f2c76e', '#8fbf8f', '#c89bd6', '#2a221d'];
  const N = opts.n || 160; const P = [];
  const fireworks = opts.fireworks;
  for (let k = 0; k < (fireworks ? 4 : 1); k++) {
    const cx = fireworks ? innerWidth * (0.2 + 0.6 * Math.random()) : innerWidth / 2, cy = fireworks ? innerHeight * (0.2 + 0.3 * Math.random()) : innerHeight * 0.45;
    for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9; P.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (fireworks ? 0 : 4), c: colors[i % colors.length], r: 3 + Math.random() * 5, rot: Math.random() * 6, life: 0, delay: k * 18, heart: Math.random() < .25 }); }
  }
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight); f++;
    P.forEach((p) => {
      if (f < p.delay) return;
      p.vy += 0.22; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += 0.1; p.life++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, 1 - p.life / 140); ctx.fillStyle = p.c;
      if (p.heart) { ctx.font = (p.r * 3) + 'px serif'; ctx.fillText('♥', 0, 0); } else ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
    });
    if (f < 190) requestAnimationFrame(tick); else c.remove();
  })();
}
function floaty(ch, n = 8) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div'); el.className = 'floaty'; el.textContent = ch;
    el.style.left = (15 + Math.random() * 70) + 'vw'; el.style.top = (70 + Math.random() * 20) + 'vh';
    el.style.animationDelay = (i * 0.12) + 's'; el.style.setProperty('--rot', (Math.random() * 40 - 20) + 'deg');
    document.body.appendChild(el); setTimeout(() => el.remove(), 3200 + i * 120);
  }
}

/* ---------- avatars & presence ---------- */
function Av({ w, size = 30, online }) {
  return <div className={'av ' + w} style={{ width: size, height: size, fontSize: size * 0.42 }} title={nameOf(w)}>
    {Sync.PEOPLE[w].short}{online !== undefined && <span className={'dot' + (online ? ' on' : '')} />}
  </div>;
}
function PartnerStatus({ compact }) {
  const p = usePartner();
  const them = Sync.them;
  const where = p.route ? routeName(p.route) : '';
  return <div className="presence">
    <div className="avs"><Av w={Sync.who} online={true} /><Av w={Sync.other} online={p.online} /></div>
    {!compact && <span className="hide-sm" style={{ color: p.online ? 'var(--ink)' : 'var(--ink3)' }}>
      {p.online ? `${them.name} здесь${where ? ' · ' + where : ''}` : `${them.name} не в сети`}
    </span>}
  </div>;
}
function routeName(r) {
  const base = r.replace('#/', '').split('/')[0];
  const a = DATA.activities.find((x) => x.route === '#/' + base);
  if (a) return a.title;
  return { '': 'на главной', activity: 'в играх', photobooth: 'в фотобудке', scrapbook: 'в скрапбуке', passport: 'в паспорте', goals: 'в целях', admin: 'в настройках' }[base] || '';
}

/* ---------- live cursors ---------- */
function CursorArrow({ color }) {
  return <svg width="22" height="22" viewBox="0 0 22 22"><path d="M2 2 L2 18 L7 13.5 L10.5 20 L13 19 L9.6 12.5 L16 12.5 Z" fill={color} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}
/* Оборачивает область: шлёт позицию мыши/пальца (в долях от размера) и рисует курсор партнёра.
   freeze=true → свои движения не отправляются, курсор партнёра замирает (нельзя подсмотреть). */
function CursorStage({ id, freeze = false, children, className, style }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const [theirFrozen, setTheirFrozen] = useState(false);
  const last = useRef(0);
  useEph('cur', (d) => {
    if (d.id !== id) return;
    if (d.gone) { setPos(null); return; }
    setTheirFrozen(!!d.frozen);
    if (!freeze && !d.frozen) setPos({ x: d.x, y: d.y });
  });
  useEffect(() => { Sync.sendEph('cur', { id, frozen: freeze, x: -1, y: -1, ping: 1 }); }, [freeze, id]);
  useEffect(() => () => Sync.sendEph('cur', { id, gone: true }), [id]);
  const onMove = (e) => {
    if (freeze) return;
    const t = performance.now(); if (t - last.current < 40) return; last.current = t;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    Sync.sendEph('cur', { id, x, y });
  };
  const frozen = freeze || theirFrozen;
  const them = Sync.them;
  return <div ref={ref} className={'stage ' + (className || '')} style={style} onPointerMove={onMove} onPointerLeave={() => Sync.sendEph('cur', { id, gone: true })}>
    {children}
    <div className="cursor-layer">
      {pos && pos.x >= 0 && <div className={'lcursor' + (frozen ? ' frozen' : '')} style={{ transform: `translate(${pos.x * (ref.current ? ref.current.clientWidth : 0)}px, ${pos.y * (ref.current ? ref.current.clientHeight : 0)}px)` }}>
        <CursorArrow color={colorOf(Sync.other)} />
        <div className="nm" style={{ background: colorOf(Sync.other) }}>{them.name}</div>
      </div>}
    </div>
  </div>;
}

/* ---------- «Я готов»: единые часы ---------- */
/* Каждый пишет свой ключ ready:<scope>:<who> = серверное время нажатия.
   Старт = max(нажатий) + 3.5с — одинаково вычисляется на обоих устройствах. */
const LEAD = 3500;
function useReady(scope) {
  const [mine, setMine] = useStore('ready:' + scope + ':' + Sync.who, null);
  const [theirs] = useStore('ready:' + scope + ':' + Sync.other, null);
  const [solo, setSolo] = useStore('ready:' + scope + ':solo', null);
  const startAt = mine && (theirs || solo) ? Math.max(mine, theirs || 0) + LEAD : null;
  return {
    mine, theirs, solo, startAt,
    ready: () => setMine(Sync.now()),
    goSolo: () => { setSolo(Sync.who); setMine(Sync.now()); },
    reset: () => { Sync.set('ready:' + scope + ':islam', null); Sync.set('ready:' + scope + ':dariya', null); Sync.set('ready:' + scope + ':solo', null); },
  };
}
function ReadyGate({ scope, title, hint, children, allowSolo = true, compact }) {
  const r = useReady(scope);
  const now = useNow(100);
  const p = usePartner();
  if (r.startAt && now >= r.startAt) return typeof children === 'function' ? children(r) : children;
  if (r.startAt) {
    const s = Math.ceil((r.startAt - now) / 1000);
    return <div className="ready"><div className="eyebrow">Старт одновременно на двух экранах</div><div key={s} className="countdown-big">{s}</div></div>;
  }
  const P = (w, v) => <div className={'ready-p' + (v ? ' ok' : '')}><Av w={w} size={44} /><b>{nameOf(w)}</b><span className="s">{v ? 'Готов(а) ✓' : (w === Sync.who ? 'Нажми кнопку' : 'Ждём…')}</span></div>;
  return <div className={'ready' + (compact ? '' : ' card')} style={compact ? {} : { padding: 36 }}>
    {title && <h2 className="h-m">{title}</h2>}
    {hint && <p className="muted" style={{ margin: 0, maxWidth: 440 }}>{hint}</p>}
    <div className="ready-people">{P(Sync.who, r.mine)}{P(Sync.other, r.theirs)}</div>
    {!r.mine ? <button className="btn lg" onClick={r.ready}>Я готов{Sync.who === 'dariya' ? 'а' : ''}</button>
      : <div className="muted" style={{ fontWeight: 600 }}>Ждём, когда {Sync.them.name} нажмёт «Я готов{Sync.other === 'dariya' ? 'а' : ''}»…</div>}
    {allowSolo && !p.online && <button className="btn sm soft" onClick={r.goSolo}>{Sync.them.name} не в сети — начать одному</button>}
  </div>;
}

/* ---------- media image ---------- */
function useMedia(id) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true; setSrc(null);
    if (!id) return;
    if (/^(data:|https?:|blob:|assets\/)/.test(id)) { setSrc(id); return; }
    Sync.mediaGet(id).then((d) => alive && d && setSrc(d));
    const off = Sync.onMedia(id, (d) => alive && setSrc(d));
    return () => { alive = false; off(); };
  }, [id]);
  return src;
}
function MediaImg({ id, alt = '', style, className, ph = 'фото', ...rest }) {
  const src = useMedia(id);
  if (!src) return <div className={'ph-slot ' + (className || '')} style={style}>{id ? 'загрузка…' : ph}</div>;
  return <img src={src} alt={alt} className={className} style={Object.assign({ objectFit: 'cover', display: 'block' }, style)} {...rest} />;
}
function fileToDataURL(file, max = 1400, q = 0.85) {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
function PickPhotos({ onPick, multiple = true, children, className = 'btn ghost sm' }) {
  const ref = useRef();
  return <>
    <button className={className} onClick={() => ref.current.click()}>{children || 'Добавить фото'}</button>
    <input ref={ref} type="file" accept="image/*" multiple={multiple} hidden onChange={async (e) => {
      const files = [...e.target.files]; const ids = [];
      for (const f of files) { const d = await fileToDataURL(f); ids.push(await Sync.mediaPut(d)); }
      e.target.value = ''; onPick(ids);
    }} />
  </>;
}

/* ---------- modal ---------- */
function Modal({ onClose, children, wide }) {
  useEffect(() => { const f = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, []);
  return <div className="modal-bg" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={wide ? { width: 'min(860px,100%)' } : {}}>{children}</div>
  </div>;
}

/* ---------- moments (one-tap) ---------- */
const MOMENTS = [
  { k: 'hug', label: 'Обнять', ch: '🤗', msg: 'обнимает тебя' },
  { k: 'miss', label: 'Скучаю', ch: '💗', msg: 'скучает по тебе' },
  { k: 'kiss', label: 'Поцелуй', ch: '💋', msg: 'целует тебя' },
  { k: 'think', label: 'Думаю о тебе', ch: '💭', msg: 'думает о тебе' },
];
function sendMoment(k) {
  const m = MOMENTS.find((x) => x.k === k);
  Sync.sendEph('moment', { k });
  const day = todayKey(); const key = 'moment:' + day + ':' + Sync.who;
  Sync.set(key, (Sync.get(key, 0) || 0) + 1);
  Sync.set('mlog:' + uid(), { k, by: Sync.who, t: Sync.now() });
  floaty(m.ch, 5); toast(`Отправлено: ${m.label.toLowerCase()} → ${Sync.them.name}`);
}
function MomentReceiver() {
  const [hug, setHug] = useState(null);
  useEph('moment', (d) => {
    const m = MOMENTS.find((x) => x.k === d.k); if (!m) return;
    floaty(m.ch, 12);
    if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
    setHug(`${Sync.them.name} ${m.msg}`); setTimeout(() => setHug(null), 2800);
  });
  useEph('doodle-moment', () => toast(`${Sync.them.name} прислал${Sync.other === 'dariya' ? 'а' : ''} дудл — смотри в «Моментах»`));
  return hug ? <div className="hug-overlay"><div>{hug}</div></div> : null;
}
function useStreak() {
  useKeys('moment:');
  let streak = 0; const d = new Date(Sync.now());
  for (let i = 0; i < 400; i++) {
    const k = todayKey(d);
    const a = Sync.get('moment:' + k + ':islam', 0), b = Sync.get('moment:' + k + ':dariya', 0);
    if (a && b) streak++; else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/* ---------- quick add (+) ---------- */
function Fab() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(null);
  const items = [['goal', 'Новая цель'], ['saving', 'Копилка'], ['habit', 'Привычка'], ['note', 'Записка'], ['money', 'Добавить деньги']];
  return <>
    {open && <div className="fab-menu">{items.map(([k, l], i) => <button key={k} className="btn" style={{ animationDelay: i * 35 + 'ms', boxShadow: 'var(--shadow-lg)' }} onClick={() => { setKind(k); setOpen(false); }}>{l}</button>)}</div>}
    <button className={'fab' + (open ? ' open' : '')} onClick={() => setOpen(!open)} aria-label="Добавить">+</button>
    {kind && <QuickAdd kind={kind} onClose={() => setKind(null)} />}
  </>;
}
function QuickAdd({ kind, onClose }) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState(kind === 'habit' ? 'me' : 'together');
  const [target, setTarget] = useState(kind === 'saving' ? 1000 : 30);
  const [amount, setAmount] = useState(50);
  const goals = Sync.keys('goal:').map((k) => ({ id: k, ...Sync.get(k) })).filter((g) => g.type === 'saving');
  const [gid, setGid] = useState(goals[0] ? goals[0].id : '');
  const titles = { goal: 'Новая цель', saving: 'Новая копилка', habit: 'Новая привычка', note: 'Записка партнёру', money: 'Положить в копилку' };
  const save = () => {
    if (kind === 'note') { if (!title.trim()) return; Sync.set('note:' + uid(), { text: title, by: Sync.who, t: Sync.now() }); toast(`Записка появилась у ${Sync.them.name === 'Дария' ? 'Дарии' : 'Ислама'}`); }
    else if (kind === 'money') { if (!gid) return; const g = Sync.get(gid); Sync.set(gid, { ...g, deposits: [...(g.deposits || []), { by: Sync.who, a: Number(amount), t: Sync.now() }] }); toast('+' + amount + ' € в копилку'); }
    else {
      if (!title.trim()) return;
      const type = kind === 'saving' ? 'saving' : kind === 'habit' ? 'me' : scope === 'race' ? 'race' : scope;
      Sync.set('goal:' + uid(), { title, type, owner: Sync.who, target: Number(target), created: Sync.now(), checks: [], deposits: [] });
      toast('Цель добавлена — видна у обоих');
    }
    onClose();
  };
  return <Modal onClose={onClose}>
    <h2 className="h-m">{titles[kind]}</h2>
    <div className="col mt16">
      {kind === 'money' ? (goals.length ? <>
        <label><span className="label">Копилка</span><select className="input" value={gid} onChange={(e) => setGid(e.target.value)}>{goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
        <label><span className="label">Сумма, €</span><input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      </> : <p className="muted">Сначала создайте копилку.</p>) : <>
        <label><span className="label">{kind === 'note' ? 'Текст' : 'Название'}</span>
          {kind === 'note' ? <textarea className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Пару слов…" />
            : <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'saving' ? 'Поездка в Прагу' : 'Пить 2 литра воды'} />}
        </label>
        {kind === 'goal' && <div><span className="label">Для кого</span><div className="row wrap">
          {[['together', 'Вместе'], ['me', 'Только я'], ['race', 'Гонка 30 дней']].map(([k, l]) => <button key={k} className={'chip' + (scope === k ? ' on' : '')} onClick={() => setScope(k)}>{l}</button>)}
        </div></div>}
        {(kind === 'saving') && <label><span className="label">Цель, €</span><input className="input" type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></label>}
        {(kind === 'goal' || kind === 'habit') && scope !== 'race' && <label><span className="label">Сколько дней</span><input className="input" type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></label>}
      </>}
      <div className="row mt8"><button className="btn" onClick={save}>Сохранить</button><button className="btn ghost" onClick={onClose}>Отмена</button></div>
    </div>
  </Modal>;
}

/* ---------- game page shell ---------- */
function GameShell({ id, eyebrow, title, sub, right, children, narrow }) {
  return <div className={'page' + (narrow ? ' narrow' : '')}>
    <a className="back" href="#/activity">← Все игры</a>
    <div className="game-head">
      <div><div className="eyebrow">{eyebrow || 'Комната · ' + Sync.room}</div><h1 className="h-l mt8">{title}</h1>{sub && <p className="lead mt8" style={{ marginBottom: 0 }}>{sub}</p>}</div>
      <div className="row">{right}<PartnerStatus /></div>
    </div>
    {children}
  </div>;
}
function Score({ s }) {
  return <div className="row" style={{ gap: 18 }}>
    {['islam', 'dariya'].map((w) => <div key={w} className="row" style={{ gap: 8 }}><Av w={w} size={28} /><b style={{ fontFamily: 'var(--serif)', fontSize: 28 }}>{s[w] || 0}</b></div>)}
  </div>;
}

Object.assign(window, { useStore, useKeys, useNow, usePartner, useEph, useRoute, go, nameOf, colorOf, seeded, shuffleSeeded, uid, markDone, todayKey, plural,
  toast, Toasts, burst, floaty, Av, PartnerStatus, CursorStage, CursorArrow, useReady, ReadyGate, useMedia, MediaImg, fileToDataURL, PickPhotos, Modal,
  MOMENTS, sendMoment, MomentReceiver, useStreak, Fab, QuickAdd, GameShell, Score, routeName });

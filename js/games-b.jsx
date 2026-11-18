/* Игры: Кино-мэтч + синхронный пульт, Правда или действие, Квест-комната, Фото-охота */

/* ================= Кино-мэтч ================= */
function allMovies() { return [...DATA.movies, ...Sync.keys('movie:').filter((k) => !k.startsWith('movie:game') && !k.startsWith('movie:v:') && !k.startsWith('movie:ctl:')).map((k) => ({ id: k.slice(6), ...Sync.get(k) }))]; }
function Poster({ m, style }) {
  return <div style={Object.assign({ position: 'relative', borderRadius: 18, overflow: 'hidden', background: `linear-gradient(160deg, ${m.c ? m.c[0] : '#8a6d5a'}, ${m.c ? m.c[1] : '#2a221d'})`, color: '#fff' }, style)}>
    {m.poster ? <MediaImg id={m.poster} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} /> : <div style={{ position: 'absolute', inset: 0, opacity: .18, background: 'repeating-linear-gradient(135deg,#fff 0 2px,transparent 2px 14px)' }} />}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.75))' }} />
    <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
      <div className="row" style={{ gap: 6 }}><span className="tag" style={{ background: 'rgba(255,255,255,.18)', border: 0, color: '#fff' }}>{m.g}</span><span className="tag" style={{ background: 'rgba(255,255,255,.18)', border: 0, color: '#fff' }}>{m.len} мин</span></div>
      <h2 style={{ fontSize: 36, lineHeight: 1, marginTop: 10 }}>{m.t} <span style={{ opacity: .6, fontSize: 22 }}>{m.y}</span></h2>
      <p style={{ margin: '8px 0 0', fontSize: 14, opacity: .9, lineHeight: 1.4 }}>{m.d}</p>
    </div>
  </div>;
}
function MovieMatch() {
  const [g, setG] = useStore('movie:game', null);
  const [adding, setAdding] = useState(false);
  const start = () => { const s = uid(); setG({ session: s, order: shuffleSeeded(allMovies().map((m) => m.id), s).slice(0, 10), match: null }); };
  return <GameShell id="movies" title="Кино-мэтч" sub="Одни и те же 10 карточек у обоих. Вправо — хочу, влево — нет. Как только оба лайкнули один фильм — мэтч и пульт для совместного просмотра.">
    {!g ? <div className="card pad center" style={{ padding: 40 }}><button className="btn lg" onClick={start}>Начать свайпать</button><div className="mt16"><button className="btn ghost sm" onClick={() => setAdding(true)}>+ Добавить свой фильм</button></div></div>
      : g.match ? <WatchRoom g={g} setG={setG} onNew={start} /> : <ReadyGate scope={'movie-' + g.session} title="Свайпаем одновременно" hint="Карточки одинаковые и в одном порядке у обоих."><SwipeDeck g={g} setG={setG} /></ReadyGate>}
    {adding && <AddMovie onClose={() => setAdding(false)} />}
  </GameShell>;
}
function AddMovie({ onClose }) {
  const [m, setM] = useState({ t: '', y: 2024, len: 110, g: 'Фильм', d: '', url: '', poster: null });
  return <Modal onClose={onClose}><h2 className="h-m">Свой фильм</h2><div className="col mt16">
    <input className="input" placeholder="Название" value={m.t} onChange={(e) => setM({ ...m, t: e.target.value })} />
    <div className="row"><input className="input" type="number" placeholder="Год" value={m.y} onChange={(e) => setM({ ...m, y: +e.target.value })} /><input className="input" type="number" placeholder="Минут" value={m.len} onChange={(e) => setM({ ...m, len: +e.target.value })} /><input className="input" placeholder="Жанр" value={m.g} onChange={(e) => setM({ ...m, g: e.target.value })} /></div>
    <textarea className="input" placeholder="Коротко, без воды" value={m.d} onChange={(e) => setM({ ...m, d: e.target.value })} />
    <input className="input" placeholder="Ссылка (mp4 или YouTube), необязательно" value={m.url} onChange={(e) => setM({ ...m, url: e.target.value })} />
    <PickPhotos multiple={false} onPick={([id]) => setM({ ...m, poster: id })}>{m.poster ? 'Постер выбран ✓' : 'Постер'}</PickPhotos>
    <button className="btn" disabled={!m.t} onClick={() => { Sync.set('movie:x' + uid(), { ...m, c: ['#6d5f55', '#2a221d'] }); onClose(); toast('Фильм добавлен'); }}>Сохранить</button></div></Modal>;
}
function SwipeDeck({ g, setG }) {
  const movies = allMovies(); const order = g.order.map((id) => movies.find((m) => m.id === id)).filter(Boolean);
  const base = 'movie:v:' + g.session + ':';
  useKeys(base);
  const myVotes = order.map((m) => Sync.get(base + m.id + ':' + Sync.who));
  const i = myVotes.findIndex((v) => v === null || v === undefined);
  const [drag, setDrag] = useState(null); const start = useRef(null);
  useEffect(() => {
    const cur = Sync.get('movie:game'); if (!cur || cur.match) return;
    const hit = order.find((m) => Sync.get(base + m.id + ':islam') === 1 && Sync.get(base + m.id + ':dariya') === 1);
    if (hit) setG({ ...cur, match: hit.id });
  });
  const vote = (v) => { const m = order[i]; if (!m) return; Sync.set(base + m.id + ':' + Sync.who, v); setDrag(null); };
  const theirCount = order.filter((m) => { const v = Sync.get(base + m.id + ':' + Sync.other); return v !== null && v !== undefined; }).length;
  if (i === -1) return <div className="card pad center" style={{ padding: 40 }}><h2 className="h-m">Карточки закончились</h2><p className="muted">Совпадений пока нет{theirCount < order.length ? ` — ${Sync.them.name} ещё свайпает (${theirCount}/${order.length})` : ''}.</p><button className="btn mt16" onClick={() => setG(null)}>Новая колода</button></div>;
  const m = order[i]; const dx = drag ? drag.dx : 0;
  return <CursorStage id={'movies-' + g.session}>
    <div style={{ display: 'grid', placeItems: 'center' }}>
      <div className="row" style={{ marginBottom: 14 }}><span className="tag">{i + 1} / {order.length}</span><span className="faint" style={{ fontSize: 13 }}>{Sync.them.name}: {theirCount}/{order.length}</span></div>
      <div style={{ position: 'relative', width: 'min(380px,90vw)', height: 540 }}>
        {order[i + 1] && <Poster m={order[i + 1]} style={{ position: 'absolute', inset: 0, transform: 'scale(.95) translateY(14px)', opacity: .6 }} />}
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${dx}px) rotate(${dx / 18}deg)`, transition: drag ? 'none' : 'transform .3s', touchAction: 'none', cursor: 'grab' }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start.current = e.clientX; setDrag({ dx: 0 }); }}
          onPointerMove={(e) => start.current !== null && setDrag({ dx: e.clientX - start.current })}
          onPointerUp={() => { const d = drag ? drag.dx : 0; start.current = null; if (d > 110) vote(1); else if (d < -110) vote(0); else setDrag(null); }}>
          <Poster m={m} style={{ width: '100%', height: '100%', boxShadow: 'var(--shadow-lg)' }} />
          {dx > 40 && <div style={{ position: 'absolute', left: 20, top: 24, border: '4px solid #7fd08a', color: '#7fd08a', padding: '4px 14px', borderRadius: 10, fontWeight: 800, fontSize: 28, transform: 'rotate(-12deg)' }}>ХОЧУ</div>}
          {dx < -40 && <div style={{ position: 'absolute', right: 20, top: 24, border: '4px solid #ff8a8a', color: '#ff8a8a', padding: '4px 14px', borderRadius: 10, fontWeight: 800, fontSize: 28, transform: 'rotate(12deg)' }}>НЕТ</div>}
        </div>
      </div>
      <div className="row mt24" style={{ gap: 20 }}>
        <button className="btn lg ghost" style={{ width: 72, height: 72, borderRadius: '50%', padding: 0, fontSize: 28 }} onClick={() => vote(0)}>✕</button>
        <button className="btn lg rose" style={{ width: 72, height: 72, borderRadius: '50%', padding: 0, fontSize: 28 }} onClick={() => vote(1)}>♥</button>
      </div>
    </div>
  </CursorStage>;
}
function ytId(u) { const m = (u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; }
function WatchRoom({ g, setG, onNew }) {
  const m = allMovies().find((x) => x.id === g.match);
  const [ctl, setCtl] = useStore('movie:ctl:' + g.session, { playing: false, pos: 0, at: 0, url: (m && m.url) || '' });
  const [url, setUrl] = useState(ctl.url);
  const vref = useRef(); const ytRef = useRef(); const [ytReady, setYtReady] = useState(false);
  useEffect(() => { burst({ fireworks: true, n: 90 }); markDone('movies'); }, []);
  const posNow = () => ctl.playing ? ctl.pos + Math.max(0, Sync.now() - ctl.at) / 1000 : ctl.pos;
  const curTime = () => { if (vref.current) return vref.current.currentTime; if (ytRef.current && ytRef.current.getCurrentTime) return ytRef.current.getCurrentTime(); return posNow(); };
  const cmd = (playing, pos) => setCtl({ ...ctl, playing, pos: pos !== undefined ? pos : curTime(), at: Sync.now() + 400, by: Sync.who });
  const yid = ytId(ctl.url);
  useEffect(() => {
    const delay = Math.max(0, ctl.at - Sync.now());
    const t = setTimeout(() => {
      const target = posNow();
      const v = vref.current;
      if (v) { if (Math.abs(v.currentTime - target) > 0.6) v.currentTime = target; ctl.playing ? v.play().catch(() => {}) : v.pause(); }
      const y = ytRef.current;
      if (y && y.seekTo && ytReady) { if (Math.abs(y.getCurrentTime() - target) > 0.8) y.seekTo(target, true); ctl.playing ? y.playVideo() : y.pauseVideo(); }
    }, delay);
    return () => clearTimeout(t);
  }, [ctl.at, ctl.playing, ctl.pos, ytReady]);
  useEffect(() => {
    if (!yid) return;
    const mk = () => { ytRef.current = new YT.Player('yt-player', { videoId: yid, playerVars: { controls: 0, rel: 0, modestbranding: 1 }, events: { onReady: () => setYtReady(true) } }); };
    if (window.YT && window.YT.Player) mk(); else { window.onYouTubeIframeAPIReady = mk; if (!document.getElementById('yt-api')) { const s = document.createElement('script'); s.id = 'yt-api'; s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); } }
    return () => { try { ytRef.current && ytRef.current.destroy(); } catch (e) {} ytRef.current = null; setYtReady(false); };
  }, [yid]);
  useNow(500);
  const p = Math.max(0, posNow());
  const fmt = (s) => Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  return <div className="col" style={{ gap: 18 }}>
    <div className="card pad center" style={{ background: 'linear-gradient(135deg,var(--rose),var(--plum))', borderColor: 'transparent', padding: 30 }}>
      <div className="eyebrow">100% MATCH</div><h2 className="h-xl mt8" style={{ fontSize: 60 }}>Смотрим это!</h2>
      <div className="h-m mt8">{m ? m.t : ''}</div>
    </div>
    <CursorStage id={'watch-' + g.session}>
      <div className="card pad">
        <div className="eyebrow">Синхронный пульт</div>
        <div style={{ marginTop: 14, borderRadius: 16, overflow: 'hidden', background: '#111', aspectRatio: '16/9', display: 'grid', placeItems: 'center', color: '#c9bcae' }}>
          {yid ? <div id="yt-player" style={{ width: '100%', height: '100%' }} /> : ctl.url ? <video ref={vref} src={ctl.url} style={{ width: '100%', height: '100%' }} playsInline /> :
            <div className="center" style={{ padding: 20 }}><div style={{ fontFamily: 'var(--serif)', fontSize: 64, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(p)}</div><p style={{ maxWidth: 420, margin: '8px auto 0', fontSize: 14 }}>Смотрите каждый в своём сервисе — пульт держит общий таймкод: «Плей» и «Пауза» срабатывают у обоих в одну секунду. Или вставьте ссылку ниже.</p></div>}
        </div>
        <div className="row mt16 wrap">
          <button className="btn" onClick={() => cmd(!ctl.playing)}>{ctl.playing ? '❚❚ Пауза у обоих' : '▶ Плей у обоих'}</button>
          <button className="btn ghost" onClick={() => cmd(ctl.playing, Math.max(0, curTime() - 10))}>−10 с</button>
          <button className="btn ghost" onClick={() => cmd(ctl.playing, curTime() + 10)}>+10 с</button>
          <span className="mono muted">{fmt(p)}</span>
          <span className="spacer" />{ctl.by && <span className="faint" style={{ fontSize: 12 }}>последним нажал(а): {nameOf(ctl.by)}</span>}
        </div>
        <div className="row mt16"><input className="input" placeholder="Ссылка на YouTube или .mp4 (необязательно)" value={url} onChange={(e) => setUrl(e.target.value)} /><button className="btn soft" onClick={() => setCtl({ ...ctl, url, pos: 0, playing: false, at: Sync.now() })}>Загрузить у обоих</button></div>
      </div>
    </CursorStage>
    <div className="row"><button className="btn ghost" onClick={onNew}>Новая колода</button><button className="btn ghost" onClick={() => setG(null)}>Выйти</button></div>
  </div>;
}

/* ================= Правда или действие ================= */
const MINI = ['rps', 'ttt', 'coin', 'reflex', 'hilo', 'number', 'rps', 'ttt', 'reflex', 'coin', 'hilo', 'number', 'rps', 'ttt', 'coin', 'reflex', 'hilo', 'number', 'rps', 'ttt'];
const MINI_NAMES = { rps: 'Камень-ножницы-бумага', ttt: 'Крестики-нолики', coin: 'Орёл или решка', reflex: 'Реакция', hilo: 'Больше-меньше', number: 'Угадай число' };
function Dare() {
  const [g, setG] = useStore('dare:game', null);
  const [myStake, setMyStake] = useStore('dare:stake:' + Sync.who, '');
  const [theirStake] = useStore('dare:stake:' + Sync.other, '');
  const [txt, setTxt] = useState(myStake);
  const start = () => { const s = uid(); setG({ session: s, round: 0, score: {}, games: shuffleSeeded(MINI, s), pending: null }); };
  return <GameShell id="dare" title="Правда или действие" sub="Сначала ставки. Потом серия из 20 быстрых мини-игр — проигравший раунда тянет правду или действие." right={g && <Score s={g.score} />} narrow>
    {!g ? <div className="card pad col" style={{ gap: 18 }}>
      <div className="eyebrow">Ставки на всю серию</div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><div className="row" style={{ marginBottom: 8 }}><Av w={Sync.who} size={24} /><b>Если выиграю я, ты…</b></div><textarea className="input" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={() => setMyStake(txt)} placeholder="…угощаешь меня ужином при встрече" /></div>
        <div><div className="row" style={{ marginBottom: 8 }}><Av w={Sync.other} size={24} /><b>Если выиграет {Sync.them.name}:</b></div><div className="card pad hand" style={{ fontSize: 22, minHeight: 80, boxShadow: 'none' }}>{theirStake || <span className="faint" style={{ fontFamily: 'var(--sans)', fontSize: 14 }}>ещё пишет…</span>}</div></div>
      </div>
      <button className="btn lg" style={{ alignSelf: 'flex-start' }} onClick={() => { setMyStake(txt); start(); }}>Ставки сделаны — играем</button>
    </div> : <ReadyGate scope={'dare-' + g.session}><DareRun g={g} setG={setG} /></ReadyGate>}
  </GameShell>;
}
function DareRun({ g, setG }) {
  if (g.round >= 20) return <DareEnd g={g} setG={setG} />;
  if (g.pending) return <DarePenalty g={g} setG={setG} />;
  const kind = g.games[g.round];
  const finish = (winner) => { const cur = Sync.get('dare:game'); if (!cur || cur.round !== g.round || cur.pending) return; const score = { ...cur.score }; if (winner) score[winner] = (score[winner] || 0) + 1; const loser = winner ? (winner === 'islam' ? 'dariya' : 'islam') : null; setG({ ...cur, score, pending: loser ? { loser, choice: null } : null, round: loser ? cur.round : cur.round + 1 }); };
  const props = { key: g.round, sid: g.session + ':' + g.round, finish };
  return <div>
    <div className="row" style={{ marginBottom: 12 }}><span className="tag">Раунд {g.round + 1} / 20</span><b>{MINI_NAMES[kind]}</b></div>
    {kind === 'rps' && <MiniRPS {...props} />}{kind === 'ttt' && <MiniTTT {...props} />}{kind === 'coin' && <MiniCoin {...props} />}
    {kind === 'reflex' && <MiniReflex {...props} />}{kind === 'hilo' && <MiniHiLo {...props} />}{kind === 'number' && <MiniNumber {...props} />}
  </div>;
}
function useBoth(key) { const [a, setA] = useStore(key + ':' + Sync.who, null); const [b] = useStore(key + ':' + Sync.other, null); return [a, b, setA, Sync.get(key + ':islam'), Sync.get(key + ':dariya')]; }
function RevealRow({ a, b, fmt, result }) {
  return <div className="mt24"><div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[['islam', a], ['dariya', b]].map(([w, v]) => <div key={w} className="card pad center"><Av w={w} size={28} /><div style={{ fontSize: 46, marginTop: 6 }}>{fmt(v)}</div></div>)}</div>
    <div className="h-m center mt16">{result}</div></div>;
}
function useFinishOnce(cond, winner, finish, delay = 1800) { useEffect(() => { if (!cond) return; const t = setTimeout(() => finish(winner), delay); return () => clearTimeout(t); }, [!!cond]); }
function MiniRPS({ sid, finish }) {
  const [mine, theirs, setMine, a, b] = useBoth('dare:rps:' + sid);
  const ic = { r: '✊', p: '✋', s: '✌' }; const beats = { r: 's', p: 'r', s: 'p' };
  const both = mine && theirs; const w = both ? (a === b ? null : beats[a] === b ? 'islam' : 'dariya') : undefined;
  useFinishOnce(both, w, finish);
  return <CursorStage id={'rps-' + sid} freeze={!both}><div className="card pad center">
    {!mine ? <div className="row" style={{ justifyContent: 'center', gap: 16 }}>{Object.keys(ic).map((k) => <button key={k} className="btn ghost" style={{ fontSize: 46, width: 100, height: 100, borderRadius: 24 }} onClick={() => setMine(k)}>{ic[k]}</button>)}</div>
      : !both ? <p className="muted">Выбор закрыт. Ждём…</p> : <RevealRow a={a} b={b} fmt={(v) => ic[v]} result={w ? nameOf(w) + ' выигрывает' : 'Ничья — без штрафа'} />}
  </div></CursorStage>;
}
function MiniCoin({ sid, finish }) {
  const [mine, theirs, setMine, a, b] = useBoth('dare:coin:' + sid);
  const coin = seeded(sid)() < .5 ? 'h' : 't'; const both = mine && theirs;
  const ok = (v) => v === coin; const w = both ? (ok(a) === ok(b) ? null : ok(a) ? 'islam' : 'dariya') : undefined;
  useFinishOnce(both, w, finish, 2200);
  return <CursorStage id={'coin-' + sid} freeze={!both}><div className="card pad center">
    {!mine ? <div className="row" style={{ justifyContent: 'center' }}><button className="btn lg" onClick={() => setMine('h')}>Орёл</button><button className="btn lg ghost" onClick={() => setMine('t')}>Решка</button></div>
      : !both ? <p className="muted">Ждём выбор партнёра…</p> : <><div className="h-l">{coin === 'h' ? 'Выпал орёл' : 'Выпала решка'}</div><RevealRow a={a} b={b} fmt={(v) => v === 'h' ? 'Орёл' : 'Решка'} result={w ? nameOf(w) + ' угадал(а)' : 'Одинаково — ничья'} /></>}
  </div></CursorStage>;
}
function MiniHiLo({ sid, finish }) {
  const r = seeded(sid); const n1 = 1 + Math.floor(r() * 9); let n2 = 1 + Math.floor(r() * 9); if (n2 === n1) n2 = n1 === 9 ? 1 : n1 + 1;
  const [mine, theirs, setMine, a, b] = useBoth('dare:hilo:' + sid);
  const both = mine && theirs; const truth = n2 > n1 ? 'hi' : 'lo';
  const ok = (v) => v === truth; const w = both ? (ok(a) === ok(b) ? null : ok(a) ? 'islam' : 'dariya') : undefined;
  useFinishOnce(both, w, finish, 2200);
  return <CursorStage id={'hilo-' + sid} freeze={!both}><div className="card pad center"><div style={{ fontFamily: 'var(--serif)', fontSize: 90, fontWeight: 700 }}>{n1} → {both ? n2 : '?'}</div>
    {!mine ? <div className="row" style={{ justifyContent: 'center' }}><button className="btn lg" onClick={() => setMine('hi')}>Больше ↑</button><button className="btn lg ghost" onClick={() => setMine('lo')}>Меньше ↓</button></div>
      : !both ? <p className="muted">Ждём…</p> : <RevealRow a={a} b={b} fmt={(v) => v === 'hi' ? '↑' : '↓'} result={w ? nameOf(w) + ' угадал(а)' : 'Ничья'} />}</div></CursorStage>;
}
function MiniNumber({ sid, finish }) {
  const target = 1 + Math.floor(seeded(sid)() * 100);
  const [mine, theirs, setMine, a, b] = useBoth('dare:num:' + sid);
  const [v, setV] = useState(50); const both = mine !== null && theirs !== null;
  const w = both ? (Math.abs(a - target) === Math.abs(b - target) ? null : Math.abs(a - target) < Math.abs(b - target) ? 'islam' : 'dariya') : undefined;
  useFinishOnce(both, w, finish, 2400);
  return <CursorStage id={'num-' + sid} freeze={!both}><div className="card pad center"><p className="muted">Загадано число от 1 до 100. Кто ближе?</p>
    {mine === null ? <><div style={{ fontFamily: 'var(--serif)', fontSize: 70, fontWeight: 700 }}>{v}</div><input type="range" min="1" max="100" value={v} onChange={(e) => setV(+e.target.value)} style={{ width: '80%' }} /><div className="mt16"><button className="btn lg" onClick={() => setMine(v)}>Закрыть 🔒</button></div></>
      : !both ? <p className="muted">Ждём…</p> : <><div className="h-m">Было: {target}</div><RevealRow a={a} b={b} fmt={(x) => x} result={w ? nameOf(w) + ' ближе' : 'Ничья'} /></>}</div></CursorStage>;
}
function MiniReflex({ sid, finish }) {
  const r = useReady('reflex-' + sid);
  const now = useNow(30);
  const delay = 1500 + Math.floor(seeded(sid)() * 3000);
  const [mine, theirs, setMine, a, b] = useBoth('dare:reflex:' + sid);
  const goAt = r.startAt ? r.startAt + delay : null; const isGo = goAt && now >= goAt;
  const both = mine !== null && theirs !== null;
  const val = (x) => x < 0 ? 99999 : x; const w = both ? (val(a) === val(b) ? null : val(a) < val(b) ? 'islam' : 'dariya') : undefined;
  useFinishOnce(both, w, finish, 2000);
  useEffect(() => { if (!r.mine) r.ready(); }, []);
  return <div className="card pad center" style={{ padding: 0, overflow: 'hidden' }}>
    <button disabled={mine !== null || !r.startAt} onClick={() => setMine(isGo ? Sync.now() - goAt : -1)} style={{ width: '100%', height: 260, border: 0, background: !r.startAt ? 'var(--line)' : isGo ? '#7fbf86' : '#d97a7a', color: '#fff', fontSize: 30, fontWeight: 800 }}>
      {mine !== null ? (mine < 0 ? 'Фальстарт!' : mine + ' мс') : !r.startAt ? 'Ждём партнёра…' : isGo ? 'ЖМИ!' : 'Жди зелёный…'}</button>
    {both && <div className="pad"><RevealRow a={a} b={b} fmt={(x) => x < 0 ? '✕' : x + 'мс'} result={w ? nameOf(w) + ' быстрее' : 'Ничья'} /></div>}
  </div>;
}
function MiniTTT({ sid, finish }) {
  const [st, setSt] = useStore('dare:ttt:' + sid, { b: Array(9).fill(null), turn: 'islam' });
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const win = lines.map((l) => l.map((i) => st.b[i])).find((x) => x[0] && x[0] === x[1] && x[1] === x[2]);
  const winner = win ? win[0] : null; const full = st.b.every(Boolean);
  useFinishOnce(winner || full, winner, finish, 1600);
  const myTurn = st.turn === Sync.who && !winner;
  return <CursorStage id={'ttt-' + sid}><div className="card pad center">
    <p className="muted">{winner ? nameOf(winner) + ' выиграл(а)!' : full ? 'Ничья' : myTurn ? 'Твой ход' : 'Ход ' + (Sync.other === 'dariya' ? 'Дарии' : 'Ислама')}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,90px)', gap: 8, justifyContent: 'center' }}>{st.b.map((c, i) => <button key={i} disabled={!myTurn || !!c} onClick={() => { const b = st.b.slice(); b[i] = Sync.who; setSt({ b, turn: Sync.other }); }}
      style={{ height: 90, borderRadius: 18, border: '1.5px solid var(--line)', background: 'var(--paper)', fontSize: 44, fontWeight: 800, color: c ? colorOf(c) : 'inherit' }}>{c === 'islam' ? '✕' : c === 'dariya' ? '○' : ''}</button>)}</div>
    <div className="faint mt16" style={{ fontSize: 12 }}>Ислам — ✕, Дария — ○</div>
  </div></CursorStage>;
}
function DarePenalty({ g, setG }) {
  const { loser, choice } = g.pending; const r = seeded(g.session + g.round);
  const truth = DATA.truths[Math.floor(r() * DATA.truths.length)], dare = DATA.dares[Math.floor(r() * DATA.dares.length)];
  const set = (c) => setG({ ...g, pending: { loser, choice: c } });
  const done = () => { const cur = Sync.get('dare:game'); if (!cur.pending) return; setG({ ...cur, pending: null, round: cur.round + 1 }); };
  const iLose = loser === Sync.who;
  return <div className="card pad center" style={{ padding: 40, background: 'var(--rose)', borderColor: 'transparent' }}>
    <div className="eyebrow">Раунд проиграл(а) {nameOf(loser)}</div>
    {!choice ? <><h2 className="h-l mt8">{iLose ? 'Тянешь…' : `${nameOf(loser)} выбирает`}</h2>
      {iLose && <div className="row mt24" style={{ justifyContent: 'center' }}><button className="btn lg" onClick={() => set('truth')}>Правда</button><button className="btn lg ghost" onClick={() => set('dare')}>Действие</button></div>}</>
      : <><div className="tag mt16">{choice === 'truth' ? 'Правда' : 'Действие'}</div><h2 className="h-l mt16" style={{ animation: 'rise .4s' }}>{choice === 'truth' ? truth : dare}</h2>
        <button className="btn lg mt24" onClick={done}>{iLose ? 'Сделано' : 'Принято'} → следующий раунд</button></>}
  </div>;
}
function DareEnd({ g, setG }) {
  useEffect(() => { markDone('dare'); burst(); }, []);
  const s = g.score; const w = (s.islam || 0) === (s.dariya || 0) ? null : (s.islam || 0) > (s.dariya || 0) ? 'islam' : 'dariya';
  const stake = w ? Sync.get('dare:stake:' + w) : '';
  return <div className="card pad center" style={{ padding: 44 }}><div className="eyebrow">Серия окончена</div><h2 className="h-l mt8">{w ? nameOf(w) + ' выигрывает ставку' : 'Ничья!'}</h2>
    {stake && <p className="hand mt16" style={{ fontSize: 30 }}>«{stake}»</p>}<div className="row mt16" style={{ justifyContent: 'center' }}><Score s={s} /></div><button className="btn lg mt24" onClick={() => setG(null)}>Новая серия</button></div>;
}

/* ================= Квест-комната ================= */
function Escape() {
  const [g, setG] = useStore('esc:game', null);
  if (!g) return <GameShell id="escape" title="Квест-комната" sub="Кооператив на двоих: у каждого свои улики. Без разговора не выбраться.">
    <div className="acts">{DATA.escapeCases.map((c, i) => <button key={c.id} className={'act tone-' + ['sky', 'butter', 'ink'][i]} style={{ border: 0, textAlign: 'left' }} onClick={() => setG({ id: c.id, session: uid(), step: 0, hints: 0 })}>
      <span className="tag">{c.diff} · ~{c.mins} мин</span><div><h3>{c.name}</h3><p>{c.intro.slice(0, 90)}…</p></div></button>)}</div></GameShell>;
  const C = DATA.escapeCases.find((c) => c.id === g.id);
  return <GameShell id="escape" title={C.name} right={<button className="btn sm ghost" onClick={() => setG(null)}>Сдаться</button>} narrow>
    <ReadyGate scope={'esc-' + g.session} title="Дело открыто" hint={C.intro}>{(r) => <EscapeRun g={g} setG={setG} C={C} startAt={r.startAt} />}</ReadyGate>
  </GameShell>;
}
function EscapeRun({ g, setG, C, startAt }) {
  const now = useNow(1000); const el = Math.floor((now - startAt) / 1000);
  const [txt, setTxt] = useState(''); const [bad, setBad] = useState(false);
  const [chat, setChat] = useStore('esc:chat:' + g.session, []);
  const [msg, setMsg] = useState('');
  if (g.step >= C.steps.length) return <EscapeWin C={C} el={g.time || el} onExit={() => setG(null)} />;
  const S = C.steps[g.step]; const myClue = Sync.who === 'islam' ? S.a : S.b;
  const submit = () => { if (S.ans.some((a) => txt.trim().toLowerCase() === a)) { burst({ n: 50 }); setTxt(''); setG({ ...g, step: g.step + 1, time: g.step + 1 >= C.steps.length ? el : undefined }); } else { setBad(true); setTimeout(() => setBad(false), 600); } };
  return <CursorStage id={'esc-' + g.session}>
    <div className="row" style={{ marginBottom: 14 }}><span className="tag">Загадка {g.step + 1} / {C.steps.length}</span><span className="spacer" /><span className="mono">{Math.floor(el / 60)}:{String(el % 60).padStart(2, '0')}</span></div>
    <div className="card pad" style={{ background: '#2f2925', color: '#f3eadf', borderColor: '#2f2925', padding: 30 }}>
      <div className="row"><Av w={Sync.who} size={24} /><span className="eyebrow" style={{ color: '#c9bcae' }}>Твоя улика — {Sync.them.name} её не видит</span></div>
      <p style={{ fontSize: 21, lineHeight: 1.5, fontFamily: 'var(--serif)' }}>{myClue}</p>
      <div className="h-s mt16" style={{ fontFamily: 'var(--serif)' }}>{S.q}</div>
      <div className="row mt16"><input className="input" style={{ background: '#3d3530', borderColor: bad ? '#d97a7a' : '#4d443e', color: '#fff' }} value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Ответ" /><button className="btn" style={{ background: '#f3eadf', color: '#2a221d' }} onClick={submit}>Проверить</button></div>
      {bad && <p style={{ color: '#f0a0a0', margin: '8px 0 0' }}>Не подходит</p>}
      {S.hint && g.hints > g.step && <p style={{ color: '#f2c76e' }}>{S.hint}</p>}
      {S.hint && g.hints <= g.step && <button className="btn sm mt8" style={{ background: '#3d3530', color: '#f3eadf' }} onClick={() => setG({ ...g, hints: g.step + 1 })}>Подсказка</button>}
    </div>
    <div className="card pad mt16"><div className="eyebrow">Рация</div>
      <div className="col mt8" style={{ maxHeight: 180, overflow: 'auto', gap: 6 }}>{chat.slice(-30).map((m, i) => <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 8 }}><Av w={m.w} size={20} /><span style={{ fontSize: 14 }}>{m.t}</span></div>)}</div>
      <div className="row mt8"><input className="input" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && msg.trim()) { setChat([...chat, { w: Sync.who, t: msg }]); setMsg(''); } }} placeholder="Расскажи, что видишь… (Enter)" /></div></div>
  </CursorStage>;
}
function EscapeWin({ C, el, onExit }) { useEffect(() => { markDone('escape'); burst({ fireworks: true }); }, []); return <div className="card pad center" style={{ padding: 44 }}><div className="eyebrow">Выбрались!</div><h2 className="h-l mt8">{C.name} — раскрыто</h2><p className="h-m mt16">{Math.floor(el / 60)} мин {el % 60} сек</p><button className="btn lg mt24" onClick={onExit}>Другое дело</button></div>; }

/* ================= Фото-охота ================= */
function SnapHunt() {
  const [g, setG] = useStore('snap:game', null);
  const start = () => { const s = uid(); setG({ session: s, items: shuffleSeeded(DATA.snapItems, s).slice(0, 5), idx: 0, score: {} }); };
  return <GameShell id="snap" title="Фото-охота" sub="Гонка по квартире: найти и сфоткать предмет по описанию. Кто первый прислал фото — забирает раунд." right={g && <Score s={g.score} />} narrow>
    {!g ? <div className="card pad center" style={{ padding: 40 }}><button className="btn lg" onClick={start}>Старт охоты</button></div>
      : g.idx >= g.items.length ? <SnapEnd g={g} onAgain={start} /> : <ReadyGate scope={'snap-' + g.session + '-' + g.idx} title={`Раунд ${g.idx + 1}`} hint="Задание появится одновременно.">{(r) => <SnapRound key={g.idx} g={g} setG={setG} startAt={r.startAt} />}</ReadyGate>}
  </GameShell>;
}
function SnapRound({ g, setG, startAt }) {
  const base = 'snap:p:' + g.session + ':' + g.idx + ':';
  const [mine, setMine] = useStore(base + Sync.who, null); const [theirs] = useStore(base + Sync.other, null);
  const now = useNow(100); const el = ((now - startAt) / 1000).toFixed(1);
  const both = mine && theirs;
  const winner = both ? (Sync.get(base + 'islam').t <= Sync.get(base + 'dariya').t ? 'islam' : 'dariya') : null;
  const next = () => { const cur = Sync.get('snap:game'); if (cur.idx !== g.idx) return; const score = { ...cur.score }; const a = Sync.get(base + 'islam'), b = Sync.get(base + 'dariya'); const w = a && b ? (a.t <= b.t ? 'islam' : 'dariya') : a ? 'islam' : b ? 'dariya' : null; if (w) score[w] = (score[w] || 0) + 1; setG({ ...cur, idx: cur.idx + 1, score }); };
  return <div className="card pad" style={{ padding: 30 }}>
    <div className="row"><div className="eyebrow">Найди и сфоткай</div><span className="spacer" /><span className="mono">{el} с</span></div>
    <h2 className="h-xl mt8" style={{ fontSize: 54 }}>{g.items[g.idx]}</h2>
    <div className="grid mt24" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {['islam', 'dariya'].map((w) => { const v = Sync.get(base + w); return <div key={w} className="card" style={{ overflow: 'hidden', boxShadow: 'none' }}>
        {v ? <MediaImg id={v.img} style={{ width: '100%', aspectRatio: '1' }} /> : <div className="ph-slot" style={{ aspectRatio: '1' }}>{w === Sync.who ? 'твоё фото' : 'ищет…'}</div>}
        <div className="row pad" style={{ padding: 10 }}><Av w={w} size={22} /><b style={{ fontSize: 13 }}>{nameOf(w)}</b><span className="spacer" />{v && <span className="mono" style={{ fontSize: 12 }}>{((v.t - startAt) / 1000).toFixed(1)} с</span>}</div></div>; })}
    </div>
    <div className="row mt16 wrap">{!mine && <PickPhotos multiple={false} className="btn lg" onPick={([id]) => setMine({ img: id, t: Sync.now() })}>📷 Сфоткать</PickPhotos>}
      {both && <><span className="h-s" style={{ fontFamily: 'var(--serif)' }}>{nameOf(winner)} быстрее!</span><span className="spacer" /><button className="btn" onClick={next}>Дальше</button></>}
      {mine && !theirs && <span className="muted">Ждём фото партнёра… <button className="btn sm soft" onClick={next}>Засчитать мне</button></span>}</div>
  </div>;
}
function SnapEnd({ g, onAgain }) { useEffect(() => { markDone('snap'); burst(); }, []); return <div className="card pad center" style={{ padding: 40 }}><h2 className="h-l">Охота окончена</h2><div className="row mt16" style={{ justifyContent: 'center' }}><Score s={g.score} /></div><button className="btn lg mt24" onClick={onAgain}>Ещё раз</button></div>; }

Object.assign(window, { MovieMatch, Dare, Escape, SnapHunt });

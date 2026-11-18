/* Игры: Насколько ты меня знаешь, Рисуем вместе, Цвет по памяти, IQ-дуэль, Загадки */

/* ================= Насколько ты меня знаешь ================= */
function Quiz() {
  const [g, setG] = useStore('quiz:game', null);
  const [used, setUsed] = useStore('quiz:used', {});
  const start = (pack) => {
    const P = DATA.quizPacks.find((p) => p.id === pack);
    const all = P.q.map((_, i) => i).filter((i) => !(used[pack] || []).includes(i));
    const pool = all.length >= 2 ? all : P.q.map((_, i) => i);
    const session = uid();
    const order = shuffleSeeded(pool, session).slice(0, Math.min(6, pool.length));
    setG({ pack, order, idx: 0, session, first: Math.random() < .5 ? 'islam' : 'dariya', score: { islam: 0, dariya: 0 } });
  };
  if (!g) return <GameShell id="quiz" title="Насколько ты меня знаешь" sub="Один отвечает о себе, второй угадывает, потом меняетесь. Оба закрывают ответ втайне — карточки переворачиваются одновременно.">
    <CursorStage id="quiz-packs"><div className="acts">{DATA.quizPacks.map((p, i) => { const left = p.q.length - (used[p.id] || []).length;
      return <button key={p.id} className={'act tone-' + ['butter', 'rose', 'plum', 'mint', 'sky'][i % 5]} style={{ textAlign: 'left', border: 0 }} onClick={() => start(p.id)}>
        <span className="tag">{p.q.length} вопросов</span><div><h3>{p.name}</h3><p>{left > 0 ? `${left} ещё не было` : 'Все сыграны — начнём заново'}</p></div></button>; })}</div></CursorStage>
  </GameShell>;
  const P = DATA.quizPacks.find((p) => p.id === g.pack);
  return <GameShell id="quiz" title={P.name} right={<Score s={g.score} />} narrow>
    <ReadyGate scope={'quiz-' + g.session} title="Готовы?" hint="Ответы видны только когда оба закрыли свой выбор. Курсоры замораживаются, пока вы выбираете.">
      {g.idx >= g.order.length ? <QuizEnd g={g} onAgain={() => setG(null)} /> : <QuizRound key={g.idx} g={g} P={P} setG={setG} setUsed={setUsed} used={used} />}
    </ReadyGate>
  </GameShell>;
}
function QuizRound({ g, P, setG, used, setUsed }) {
  const qi = g.order[g.idx]; const [q, opts] = P.q[qi];
  const subject = g.idx % 2 === 0 ? g.first : (g.first === 'islam' ? 'dariya' : 'islam');
  const guesser = subject === 'islam' ? 'dariya' : 'islam';
  const base = 'quiz:a:' + g.session + ':' + g.idx + ':';
  const [mine, setMine] = useStore(base + Sync.who, null);
  const [theirs] = useStore(base + Sync.other, null);
  const [sel, setSel] = useState(null);
  const iAmSubject = Sync.who === subject;
  const both = mine !== null && theirs !== null;
  const subjAns = Sync.get(base + subject), guessAns = Sync.get(base + guesser);
  const ok = both && subjAns === guessAns;
  useEffect(() => { if (both && ok) burst({ n: 60 }); }, [both]);
  const next = () => {
    if (Sync.get('quiz:game').idx !== g.idx) return;
    const score = { ...g.score }; if (ok) score[guesser] = (score[guesser] || 0) + 1;
    setUsed({ ...used, [g.pack]: [...new Set([...(used[g.pack] || []), qi])] });
    setG({ ...g, idx: g.idx + 1, score });
  };
  const qtext = iAmSubject ? q.replace(/^/, '') : q;
  return <CursorStage id={'quiz-' + g.session} freeze={!both}>
    <div className="row" style={{ marginBottom: 14 }}><span className="tag">Вопрос {g.idx + 1} / {g.order.length}</span><span className="spacer" />
      <span className={'lock' + (Sync.get(base + 'islam') !== null ? ' on' : '')}>🔒 Ислам</span><span className={'lock' + (Sync.get(base + 'dariya') !== null ? ' on' : '')}>🔒 Дария</span></div>
    <div className={'flip' + (both ? ' on' : '')}>
      <div className="flip-in">
        <div className="flip-f card pad" style={{ padding: 32 }}>
          <div className="eyebrow">{iAmSubject ? 'Ответь честно о себе' : `Угадай, что ответит ${nameOf(subject)}`}</div>
          <h2 className="h-l mt8" style={{ fontSize: 40 }}>{qtext}</h2>
          <div className="col mt24" style={{ gap: 10 }}>{opts.map((o, i) => <button key={i} className={'opt' + ((mine ?? sel) === i ? ' sel' : '')} disabled={mine !== null} onClick={() => setSel(i)}>{o}</button>)}</div>
          <div className="row mt24">{mine === null ? <button className="btn lg" disabled={sel === null} onClick={() => setMine(sel)}>Закрыть ответ 🔒</button>
            : <span className="muted" style={{ fontWeight: 600 }}>Закрыто. Ждём {Sync.them.name === 'Дария' ? 'Дарию' : 'Ислама'}… курсоры заморожены</span>}</div>
        </div>
        <div className="flip-b card pad" style={{ padding: 32, background: ok ? 'var(--mint)' : 'var(--rose)' }}>
          <div className="eyebrow">{ok ? 'Совпало! +1 ' + nameOf(guesser) : 'Мимо'}</div>
          <h2 className="h-m mt8">{q}</h2>
          <div className="grid mt24" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card pad"><div className="row"><Av w={subject} size={24} /><b style={{ fontSize: 13 }}>{nameOf(subject)} о себе</b></div><div className="hand mt8" style={{ fontSize: 30 }}>{opts[subjAns]}</div></div>
            <div className="card pad"><div className="row"><Av w={guesser} size={24} /><b style={{ fontSize: 13 }}>{nameOf(guesser)} угадывал(а)</b></div><div className="hand mt8" style={{ fontSize: 30 }}>{opts[guessAns]}</div></div>
          </div>
          <button className="btn lg mt24" onClick={next}>Дальше →</button>
        </div>
      </div>
    </div>
  </CursorStage>;
}
function QuizEnd({ g, onAgain }) {
  useEffect(() => { markDone('quiz'); burst(); }, []);
  const w = g.score.islam === g.score.dariya ? null : g.score.islam > g.score.dariya ? 'islam' : 'dariya';
  return <div className="card pad center" style={{ padding: 48 }}><div className="eyebrow">Итог</div>
    <h2 className="h-l mt8">{w ? `${nameOf(w)} знает тебя лучше` : 'Ничья — знаете друг друга одинаково'}</h2>
    <div className="row mt24" style={{ justifyContent: 'center' }}><Score s={g.score} /></div>
    <button className="btn lg mt32" onClick={onAgain}>Другой пак</button></div>;
}

/* ================= Рисуем вместе ================= */
function DrawTogether() {
  const [g, setG] = useStore('draw:game', null);
  const newRound = () => { const s = uid(); setG({ session: s, prompt: shuffleSeeded(DATA.drawPrompts, s)[0] }); };
  const gallery = useKeys('drawing:').map((k) => ({ k, ...Sync.get(k) })).sort((a, b) => b.t - a.t);
  return <GameShell id="draw" title="Рисуем вместе" sub="Экран делится на два холста. Одно задание, рисуете одновременно и видите каждый штрих. Без очков и победителей.">
    {!g ? <div className="card pad center" style={{ padding: 40 }}><button className="btn lg" onClick={newRound}>Получить задание</button></div>
      : <ReadyGate scope={'draw-' + g.session} title={`Задание: «${g.prompt}»`} hint="Как только оба будут готовы — холсты откроются.">
        <DrawBoard g={g} onNext={newRound} />
      </ReadyGate>}
    {gallery.length > 0 && <section className="mt48"><div className="eyebrow">Общая галерея · {gallery.length}</div>
      <div className="grid mt16" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>{gallery.map((d) => <div key={d.k} className="polaroid"><MediaImg id={d.img} style={{ width: '100%' }} /><div className="hand" style={{ position: 'absolute', bottom: 6, left: 12, fontSize: 20 }}>{d.prompt}</div></div>)}</div></section>}
  </GameShell>;
}
function DrawCanvas({ owner, session, editable, color, size }) {
  const ref = useRef(); const W = 900, H = 420;
  const ks = useKeys('draw:s:' + session + ':' + owner + ':');
  const live = useRef(null); const [, force] = useState(0);
  useEph('draw-live', (d) => { if (d.s === session && d.o === owner) { live.current = d.p ? d : null; force((x) => x + 1); } });
  const cur = useRef(null);
  const paint = () => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); ctx.fillStyle = '#fffaf3'; ctx.fillRect(0, 0, W, H);
    const strokes = ks.map((k) => Sync.get(k)).filter(Boolean).sort((a, b) => a.t - b.t);
    [...strokes, live.current, cur.current].filter(Boolean).forEach((s) => { ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = s.c === 'erase' ? 'destination-out' : 'source-over'; if (s.c === 'erase') { ctx.strokeStyle = '#fffaf3'; ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = s.w * 3; } ctx.beginPath(); s.p.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); });
  };
  useEffect(() => { ref.current.width = W; ref.current.height = H; });
  useEffect(paint);
  const pt = (e) => { const r = ref.current.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * W / r.width), Math.round((e.clientY - r.top) * H / r.height)]; };
  return <canvas ref={ref} data-owner={owner} style={{ width: '100%', aspectRatio: W + '/' + H, display: 'block', borderRadius: 16, touchAction: 'none', cursor: editable ? 'crosshair' : 'default', border: '1px solid var(--line)' }}
    onPointerDown={(e) => { if (!editable) return; e.currentTarget.setPointerCapture(e.pointerId); cur.current = { c: color, w: size, p: [pt(e)] }; paint(); }}
    onPointerMove={(e) => { if (!cur.current) return; cur.current.p.push(pt(e)); paint(); Sync.sendEph('draw-live', { s: session, o: owner, c: cur.current.c, w: cur.current.w, p: cur.current.p }); }}
    onPointerUp={() => { if (!cur.current) return; const s = cur.current; cur.current = null; if (s.p.length > 0) Sync.set('draw:s:' + session + ':' + owner + ':' + uid(), { ...s, t: Sync.now() }); Sync.sendEph('draw-live', { s: session, o: owner, p: null }); }} />;
}
function DrawBoard({ g, onNext }) {
  const [color, setColor] = useState(Sync.who === 'islam' ? '#3e5f93' : '#c24f59');
  const [size, setSize] = useState(6);
  const save = async () => {
    const cs = document.querySelectorAll('canvas[data-owner]'); const c = document.createElement('canvas'); c.width = 900; c.height = 960; const x = c.getContext('2d');
    x.fillStyle = '#f4ece0'; x.fillRect(0, 0, 900, 960); x.drawImage(cs[0], 0, 40); x.drawImage(cs[1], 0, 500);
    x.fillStyle = '#2a221d'; x.font = 'italic 600 30px "Cormorant Garamond"'; x.fillText('«' + g.prompt + '»', 20, 30); x.font = '600 14px Manrope'; x.fillText(nameOf(cs[0].dataset.owner), 20, 480); x.fillText(nameOf(cs[1].dataset.owner), 20, 948);
    const img = await Sync.mediaPut(c.toDataURL('image/jpeg', .9)); Sync.set('drawing:' + g.session, { img, prompt: g.prompt, t: Sync.now() }); markDone('draw'); toast('Сохранено в общую галерею'); burst({ n: 70 });
  };
  return <CursorStage id={'draw-' + g.session}>
    <div className="card pad" style={{ background: 'var(--sky)', borderColor: 'transparent' }}><div className="row wrap"><div><div className="eyebrow">Задание</div><div className="h-m">{g.prompt}</div></div><span className="spacer" />
      <div className="row wrap">{['#2a221d', '#3e5f93', '#c24f59', '#3d7a4a', '#e2a93c', '#8c5bb0'].map((c) => <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid #fff' : '0', boxShadow: color === c ? '0 0 0 2px var(--ink)' : 'none' }} />)}
        <button className={'chip' + (color === 'erase' ? ' on' : '')} onClick={() => setColor('erase')}>Ластик</button>
        <input type="range" min="2" max="24" value={size} onChange={(e) => setSize(+e.target.value)} /></div></div></div>
    <div className="col mt16" style={{ gap: 12 }}>
      {['islam', 'dariya'].map((w) => <div key={w}><div className="row" style={{ marginBottom: 6 }}><Av w={w} size={22} /><b style={{ fontSize: 13 }}>{w === Sync.who ? 'Твой холст' : 'Холст ' + (w === 'dariya' ? 'Дарии' : 'Ислама') + ' — в реальном времени'}</b></div>
        <DrawCanvas owner={w} session={g.session} editable={w === Sync.who} color={color} size={size} /></div>)}
    </div>
    <div className="row mt16"><button className="btn lg" onClick={save}>Сохранить в галерею</button><button className="btn ghost" onClick={onNext}>Новое задание</button></div>
  </CursorStage>;
}

/* ================= Цвет по памяти ================= */
function hsl(h, s, l) { return `hsl(${h} ${s}% ${l}%)`; }
function hueScore(a, b) { const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) / 180, ds = Math.abs(a.s - b.s) / 100, dl = Math.abs(a.l - b.l) / 100; return Math.max(0, Math.round(10 * (1 - Math.sqrt(dh * dh * 2 + ds * ds * .5 + dl * dl * 1.5) / 1.3) * 10) / 10); }
function HueGame() {
  const [g, setG] = useStore('hue:game', null);
  const start = (mode) => { const s = uid(); const r = seeded(s); setG({ mode, session: s, round: 0, rounds: 5, target: Array.from({ length: 5 }, () => ({ h: Math.round(r() * 360), s: Math.round(35 + r() * 60), l: Math.round(30 + r() * 45) })), viewer: Math.random() < .5 ? 'islam' : 'dariya', score: {} }); };
  return <GameShell id="hue" title="Цвет по памяти" sub="Оттенок показывают на 1 секунду — потом воссоздайте его ползунками. Дуэль или кооператив «Дуэт»." right={g && <Score s={g.score} />} narrow>
    {!g ? <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <button className="act tone-rose" style={{ border: 0, textAlign: 'left' }} onClick={() => start('duel')}><span className="tag">2 игрока</span><div><h3>Дуэль</h3><p>Оба видят цвет, кто ближе — тот выиграл раунд</p></div></button>
      <button className="act tone-sky" style={{ border: 0, textAlign: 'left' }} onClick={() => start('duet')}><span className="tag">Кооператив</span><div><h3>Дуэт</h3><p>Один видит цвет и подсказывает, второй крутит ползунки</p></div></button>
    </div> : <ReadyGate scope={'hue-' + g.session + '-' + g.round} title={`Раунд ${g.round + 1} из ${g.rounds}`} hint={g.mode === 'duet' ? `${nameOf(g.viewer)} увидит цвет, ${nameOf(g.viewer === 'islam' ? 'dariya' : 'islam')} — крутит ползунки.` : 'Цвет появится на 1 секунду на обоих экранах одновременно.'}>
      {(r) => <HueRound key={g.round} g={g} setG={setG} startAt={r.startAt} />}
    </ReadyGate>}
  </GameShell>;
}
function HueRound({ g, setG, startAt }) {
  const now = useNow(50);
  const t = g.target[g.round];
  const showing = now - startAt < 1000;
  const base = 'hue:a:' + g.session + ':' + g.round + ':';
  const [mine, setMine] = useStore(base + Sync.who, null);
  const [theirs] = useStore(base + Sync.other, null);
  const [duetVal, setDuetVal] = useStore(base + 'duet', { h: 180, s: 50, l: 50 });
  const [v, setV] = useState({ h: 180, s: 50, l: 50 });
  const duet = g.mode === 'duet'; const iView = duet && Sync.who === g.viewer;
  const val = duet ? duetVal : v; const setVal = duet ? setDuetVal : setV;
  const done = duet ? !!Sync.get(base + 'lock') : mine !== null && theirs !== null;
  const next = () => {
    if (Sync.get('hue:game').round !== g.round) return;
    const score = { ...g.score };
    if (duet) { score.islam = Math.round(((score.islam || 0) + hueScore(t, duetVal)) * 10) / 10; score.dariya = score.islam; }
    else { const a = hueScore(t, Sync.get(base + 'islam')), b = hueScore(t, Sync.get(base + 'dariya')); score.islam = Math.round(((score.islam || 0) + a) * 10) / 10; score.dariya = Math.round(((score.dariya || 0) + b) * 10) / 10; }
    if (g.round + 1 >= g.rounds) { markDone('hue'); burst(); setG({ ...g, round: g.round + 1, score }); } else setG({ ...g, round: g.round + 1, score });
  };
  if (g.round >= g.rounds) return <div className="card pad center" style={{ padding: 40 }}><h2 className="h-l">Готово!</h2><div className="row mt16" style={{ justifyContent: 'center' }}><Score s={g.score} /></div><button className="btn lg mt24" onClick={() => setG(null)}>Ещё раз</button></div>;
  const Slider = ({ k, max, bg }) => <div className="col" style={{ gap: 6 }}><div className="row"><span className="label" style={{ margin: 0 }}>{{ h: 'Оттенок', s: 'Насыщенность', l: 'Яркость' }[k]}</span><span className="spacer" /><span className="mono faint" style={{ fontSize: 12 }}>{val[k]}</span></div>
    <input type="range" min="0" max={max} value={val[k]} disabled={done || (duet && iView) || (!duet && mine !== null)} onChange={(e) => setVal({ ...val, [k]: +e.target.value })} style={{ width: '100%', height: 26, appearance: 'none', borderRadius: 13, background: bg, outline: 'none' }} /></div>;
  return <CursorStage id={'hue-' + g.session} freeze={!duet && !done}>
    <div className="card pad" style={{ padding: 28 }}>
      <div style={{ height: 220, borderRadius: 20, background: (showing && (!duet || iView)) || done || (iView) ? hsl(t.h, t.s, t.l) : hsl(val.h, val.s, val.l), transition: showing ? 'none' : 'background .1s', display: 'grid', placeItems: 'center', position: 'relative' }}>
        {showing && (!duet || iView) && <span className="tag">Запоминай!</span>}
        {duet && !iView && !done && <span className="tag">Слушай подсказки {g.viewer === 'dariya' ? 'Дарии' : 'Ислама'}</span>}
        {iView && !done && <span className="tag">Опиши цвет словами — {nameOf(Sync.other)} крутит ползунки</span>}
      </div>
      {iView && !done && <div className="row mt16"><div style={{ width: 70, height: 70, borderRadius: 14, background: hsl(val.h, val.s, val.l), border: '1px solid var(--line)' }} /><span className="muted">Так сейчас у {Sync.them.name === 'Дария' ? 'Дарии' : 'Ислама'}</span></div>}
      {!showing && !done && !(duet && iView) && <div className="col mt24" style={{ gap: 14 }}>
        <Slider k="h" max={360} bg="linear-gradient(90deg,hsl(0 80% 55%),hsl(60 80% 55%),hsl(120 80% 55%),hsl(180 80% 55%),hsl(240 80% 55%),hsl(300 80% 55%),hsl(360 80% 55%))" />
        <Slider k="s" max={100} bg={`linear-gradient(90deg,${hsl(val.h, 0, val.l)},${hsl(val.h, 100, val.l)})`} />
        <Slider k="l" max={100} bg={`linear-gradient(90deg,#000,${hsl(val.h, val.s, 50)},#fff)`} />
        {duet ? <button className="btn lg" onClick={() => Sync.set(base + 'lock', true)}>Зафиксировать</button>
          : mine === null ? <button className="btn lg" onClick={() => setMine(v)}>Закрыть ответ 🔒</button> : <span className="muted">Закрыто. Ждём партнёра…</span>}
      </div>}
      {done && <div className="mt24"><div className="grid" style={{ gridTemplateColumns: duet ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>
        <div><div style={{ height: 80, borderRadius: 14, background: hsl(t.h, t.s, t.l) }} /><div className="center mt8" style={{ fontSize: 13, fontWeight: 700 }}>Оригинал</div></div>
        {(duet ? [['Вместе', duetVal]] : [['Ислам', Sync.get(base + 'islam')], ['Дария', Sync.get(base + 'dariya')]]).map(([n, c]) => <div key={n}><div style={{ height: 80, borderRadius: 14, background: hsl(c.h, c.s, c.l) }} /><div className="center mt8" style={{ fontSize: 13, fontWeight: 700 }}>{n} · {hueScore(t, c)}/10</div></div>)}
      </div><button className="btn lg mt24" onClick={next}>Дальше →</button></div>}
    </div>
  </CursorStage>;
}

/* ================= IQ-дуэль ================= */
function IQDuel() {
  const [g, setG] = useStore('iq:game', null);
  const start = (n) => { const s = uid(); setG({ session: s, qs: shuffleSeeded(DATA.iqQs.map((_, i) => i), s).slice(0, n), per: 15000 }); };
  return <GameShell id="iq" title="IQ-дуэль" sub="Логика, паттерны и математика на скорость. На каждый вопрос — свой таймер. В конце шуточный подсчёт IQ." narrow>
    {!g ? <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {[12, 20].map((n) => <button key={n} className={'act tone-' + (n === 12 ? 'plum' : 'butter')} style={{ border: 0, textAlign: 'left' }} onClick={() => start(n)}><span className="tag">15 сек на вопрос</span><div><h3>{n} вопросов</h3><p>{n === 12 ? 'Быстрая разминка' : 'Полная дуэль'}</p></div></button>)}
    </div> : <ReadyGate scope={'iq-' + g.session} title="Гонка начнётся одновременно" hint="Курсоры заморожены всю игру — подсмотреть нельзя.">{(r) => <IQRun g={g} startAt={r.startAt} onAgain={() => setG(null)} />}</ReadyGate>}
  </GameShell>;
}
function IQRun({ g, startAt, onAgain }) {
  const now = useNow(100);
  const el = now - startAt; const i = Math.floor(el / g.per); const left = Math.max(0, g.per - (el - i * g.per));
  const base = 'iq:a:' + g.session + ':';
  useKeys(base);
  if (i >= g.qs.length) {
    const sc = (w) => g.qs.reduce((s, q, k) => { const a = Sync.get(base + k + ':' + w); return s + (a && a.o === DATA.iqQs[q].a ? 1 + (1 - a.ms / g.per) * 0.5 : 0); }, 0);
    const right = (w) => g.qs.filter((q, k) => { const a = Sync.get(base + k + ':' + w); return a && a.o === DATA.iqQs[q].a; }).length;
    const iq = (w) => Math.round(85 + sc(w) / (g.qs.length * 1.5) * 70);
    return <IQEnd iq={iq} right={right} n={g.qs.length} onAgain={onAgain} />;
  }
  const Q = DATA.iqQs[g.qs[i]];
  const mine = Sync.get(base + i + ':' + Sync.who); const theirs = Sync.get(base + i + ':' + Sync.other);
  return <CursorStage id="iq" freeze>
    <div className="card pad" style={{ padding: 30 }}>
      <div className="row"><span className="tag">Вопрос {i + 1} / {g.qs.length}</span><span className="spacer" /><span className={'lock' + (mine ? ' on' : '')}>Ты</span><span className={'lock' + (theirs ? ' on' : '')}>{Sync.them.name}</span></div>
      <div style={{ height: 6, background: 'var(--line)', borderRadius: 6, marginTop: 14, overflow: 'hidden' }}><div style={{ height: '100%', width: (left / g.per * 100) + '%', background: left < 4000 ? 'var(--dariya)' : 'var(--ink)', transition: 'width .1s linear' }} /></div>
      <h2 className="h-l mt24" style={{ fontSize: 40 }}>{Q.q}</h2>
      <div className="grid mt24" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>{Q.o.map((o, k) => <button key={k} className={'opt' + (mine && mine.o === k ? ' sel' : '')} disabled={!!mine} onClick={() => Sync.set(base + i + ':' + Sync.who, { o: k, ms: g.per - left })}>{o}</button>)}</div>
      {mine && <p className="muted mt16">Ответ принят. Следующий вопрос через {Math.ceil(left / 1000)} сек.</p>}
    </div>
  </CursorStage>;
}
function IQEnd({ iq, right, n, onAgain }) {
  useEffect(() => { markDone('iq'); burst(); }, []);
  return <div className="card pad center" style={{ padding: 44 }}><div className="eyebrow">Шуточный IQ</div>
    <div className="grid mt24" style={{ gridTemplateColumns: '1fr 1fr', gap: 18 }}>{['islam', 'dariya'].map((w) => <div key={w} className="card pad"><Av w={w} size={40} /><div style={{ fontFamily: 'var(--serif)', fontSize: 72, fontWeight: 700, lineHeight: 1 }} className="mt8">{iq(w)}</div><div className="muted">{nameOf(w)} · {right(w)}/{n} верно</div></div>)}</div>
    <p className="hand mt24" style={{ fontSize: 26 }}>{iq('islam') === iq('dariya') ? 'Два гения — идеальная пара' : `${nameOf(iq('islam') > iq('dariya') ? 'islam' : 'dariya')} сегодня умнее. Ненадолго.`}</p>
    <button className="btn lg mt16" onClick={onAgain}>Ещё раз</button></div>;
}

/* ================= Вечер загадок ================= */
function Riddles() {
  const [g, setG] = useStore('riddle:game', null);
  const start = () => { const s = uid(); setG({ session: s, order: shuffleSeeded(DATA.riddles.map((_, i) => i), s).slice(0, 6), idx: 0, score: {} }); };
  return <GameShell id="riddle" title="Вечер загадок" sub="Одна загадка на двоих. Кто первым напишет правильный ответ — забирает очко." right={g && <Score s={g.score} />} narrow>
    {!g ? <div className="card pad center" style={{ padding: 40 }}><button className="btn lg" onClick={start}>Начать вечер</button></div>
      : <ReadyGate scope={'riddle-' + g.session}>{g.idx >= g.order.length ? <div className="card pad center" style={{ padding: 40 }}><h2 className="h-l">Вечер окончен</h2><div className="row mt16" style={{ justifyContent: 'center' }}><Score s={g.score} /></div><button className="btn lg mt24" onClick={start}>Ещё</button></div> : <RiddleRound key={g.idx} g={g} setG={setG} />}</ReadyGate>}
  </GameShell>;
}
function RiddleRound({ g, setG }) {
  const [q, ans] = DATA.riddles[g.order[g.idx]];
  const [win, setWin] = useStore('riddle:w:' + g.session + ':' + g.idx, null);
  const [txt, setTxt] = useState(''); const [wrong, setWrong] = useState(0);
  const [hint, setHint] = useState(false);
  const typing = useRef(0); const [theyType, setTheyType] = useState(false);
  useEph('riddle-typing', () => { setTheyType(true); clearTimeout(typing.current); typing.current = setTimeout(() => setTheyType(false), 1200); });
  const tryA = () => { if (ans.some((a) => txt.trim().toLowerCase().includes(a))) { if (!Sync.get('riddle:w:' + g.session + ':' + g.idx)) { setWin(Sync.who); burst({ n: 50 }); } } else { setWrong((x) => x + 1); setTxt(''); } };
  const next = () => { if (Sync.get('riddle:game').idx !== g.idx) return; const score = { ...g.score }; if (win) score[win] = (score[win] || 0) + 1; if (g.idx + 1 >= g.order.length) markDone('riddle'); setG({ ...g, idx: g.idx + 1, score }); };
  return <div className="card pad" style={{ padding: 32, background: '#2f2925', color: '#f3eadf', borderColor: '#2f2925' }}>
    <div className="eyebrow" style={{ color: '#c9bcae' }}>Загадка {g.idx + 1}</div>
    <h2 className="h-l mt16" style={{ fontSize: 38 }}>{q}</h2>
    {!win ? <div className="row mt24"><input className="input" style={{ background: '#3d3530', borderColor: '#4d443e', color: '#f3eadf' }} value={txt} placeholder="Ответ…" onChange={(e) => { setTxt(e.target.value); Sync.sendEph('riddle-typing', 1); }} onKeyDown={(e) => e.key === 'Enter' && tryA()} /><button className="btn" style={{ background: '#f3eadf', color: '#2a221d' }} onClick={tryA}>Ответить</button></div>
      : <div className="mt24"><div className="hand" style={{ fontSize: 34 }}>{nameOf(win)} отгадал(а)! Ответ: {ans[0]}</div><button className="btn mt16" style={{ background: '#f3eadf', color: '#2a221d' }} onClick={next}>Следующая</button></div>}
    <div className="row mt16" style={{ fontSize: 13, color: '#c9bcae' }}>{theyType && !win && <span>{Sync.them.name} печатает…</span>}{wrong > 0 && !win && <span>Не то ({wrong})</span>}<span className="spacer" />
      {!win && <button className="btn sm" style={{ background: '#3d3530', color: '#f3eadf' }} onClick={() => setHint(true)}>{hint ? 'Первая буква: ' + ans[0][0].toUpperCase() : 'Подсказка'}</button>}</div>
  </div>;
}

Object.assign(window, { Quiz, DrawTogether, HueGame, IQDuel, Riddles });

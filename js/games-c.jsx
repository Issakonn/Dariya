/* Аркада, Дебаты, Суд, Совместимость, Лаборатория, Наше будущее */

/* ================= ИИ-судья ================= */
async function aiJudge(prompt) {
  try {
    const api = window.genspark || window.claude;
    if (!api) throw new Error('no ai');
    return await api.complete(prompt);
  } catch (e) { return null; }
}
function parseVerdict(txt) {
  if (!txt) return null;
  const m = txt.match(/ПОБЕДИТЕЛЬ:\s*(Ислам|Дария|Ничья)/i);
  const w = m ? (/ислам/i.test(m[1]) ? 'islam' : /дария/i.test(m[1]) ? 'dariya' : null) : null;
  return { winner: w, text: txt.replace(/ПОБЕДИТЕЛЬ:.*$/im, '').trim() };
}
/* Голосовой ввод (Web Speech) — «спорите на камеру/микрофон», ИИ слушает расшифровку */
function useSpeech(onText) {
  const [on, setOn] = useState(false); const rec = useRef(null);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const toggle = () => {
    if (!SR) return toast('Голосовой ввод не поддерживается этим браузером');
    if (on) { rec.current && rec.current.stop(); setOn(false); return; }
    const r = new SR(); r.lang = 'ru-RU'; r.continuous = true; r.interimResults = false;
    r.onresult = (e) => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + ' '; if (t) onText(t); };
    r.onend = () => setOn(false); r.start(); rec.current = r; setOn(true);
  };
  return [on, toggle, !!SR];
}
function ArgBox({ value, onChange, disabled, placeholder }) {
  const [on, toggle, has] = useSpeech((t) => onChange((value || '') + t));
  return <div className="col" style={{ gap: 8 }}>
    <textarea className="input" style={{ minHeight: 130 }} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    {!disabled && has && <button className={'btn sm ' + (on ? 'rose' : 'soft')} style={{ alignSelf: 'flex-start' }} onClick={toggle}>{on ? '● Запись… остановить' : '🎙 Говорить голосом'}</button>}
  </div>;
}

/* ================= Дебаты ================= */
function Debate() {
  const [g, setG] = useStore('debate:game', null);
  const start = (pack) => { const s = uid(); const r = seeded(s); const topic = shuffleSeeded(DATA.debateTopics[pack], s)[0]; setG({ session: s, pack, topic, pro: r() < .5 ? 'islam' : 'dariya', verdict: null }); };
  return <GameShell id="debate" title="Дебаты пары" sub="Система случайно даёт одному «За», другому «Против». Спорите — ИИ-судья выносит вердикт." narrow>
    {!g ? <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <button className="act tone-butter" style={{ border: 0, textAlign: 'left' }} onClick={() => start('fun')}><span className="tag">{DATA.debateTopics.fun.length} тем</span><div><h3>Смешные</h3><p>Пицца, носки, кошки</p></div></button>
      <button className="act tone-rose" style={{ border: 0, textAlign: 'left' }} onClick={() => start('spicy')}><span className="tag">{DATA.debateTopics.spicy.length} тем</span><div><h3>Спорные</h3><p>Пароли, ревность, расстояние</p></div></button>
    </div> : <ReadyGate scope={'debate-' + g.session} title={`«${g.topic}»`} hint={`${nameOf(g.pro)} — ЗА, ${nameOf(g.pro === 'islam' ? 'dariya' : 'islam')} — ПРОТИВ. У каждого 2 минуты.`}>{(r) => <DebateRun g={g} setG={setG} startAt={r.startAt} />}</ReadyGate>}
  </GameShell>;
}
function DebateRun({ g, setG, startAt }) {
  const base = 'debate:arg:' + g.session + ':';
  const [mine, setMine] = useStore(base + Sync.who, '');
  const [sent, setSent] = useStore(base + 'sent:' + Sync.who, false);
  const [theirSent] = useStore(base + 'sent:' + Sync.other, false);
  const [busy, setBusy] = useState(false);
  const now = useNow(1000); const left = Math.max(0, 120 - Math.floor((now - startAt) / 1000));
  const con = g.pro === 'islam' ? 'dariya' : 'islam';
  const role = (w) => w === g.pro ? 'ЗА' : 'ПРОТИВ';
  useEffect(() => { if (left === 0 && !sent) setSent(true); }, [left]);
  const judge = async () => {
    setBusy(true);
    const a = Sync.get(base + g.pro, ''), b = Sync.get(base + con, '');
    const txt = await aiJudge(`Ты — остроумный и справедливый судья шуточных дебатов пары. Тема: «${g.topic}».\n${nameOf(g.pro)} (ЗА): ${a || '(молчал)'}\n${nameOf(con)} (ПРОТИВ): ${b || '(молчал)'}\nОцени убедительность, логику и юмор. Ответь по-русски 3–4 предложениями с лёгким юмором, затем отдельной строкой: ПОБЕДИТЕЛЬ: Ислам или Дария или Ничья.`);
    const v = parseVerdict(txt) || { winner: (a.length > b.length ? g.pro : con), text: 'Судья задумался и решил по объёму аргументов (ИИ сейчас недоступен).' };
    setG({ ...Sync.get('debate:game'), verdict: v }); markDone('debate'); setBusy(false); burst({ n: 80 });
  };
  const both = sent && theirSent;
  if (g.verdict) return <div className="card pad" style={{ padding: 36 }}>
    <div className="eyebrow">Вердикт ИИ-судьи</div><h2 className="h-l mt8">{g.verdict.winner ? `Победа: ${nameOf(g.verdict.winner)} (${role(g.verdict.winner)})` : 'Ничья'}</h2>
    <p style={{ fontSize: 18, lineHeight: 1.55, fontFamily: 'var(--serif)' }}>{g.verdict.text}</p>
    <button className="btn lg mt16" onClick={() => setG(null)}>Новая тема</button></div>;
  return <CursorStage id={'debate-' + g.session}>
    <div className="card pad center" style={{ background: 'var(--butter)', borderColor: 'transparent' }}><div className="eyebrow">Тема</div><h2 className="h-l mt8">«{g.topic}»</h2><div className="mono mt8">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div></div>
    <div className="grid mt16" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {[g.pro, con].map((w) => <div key={w} className="card pad"><div className="row"><Av w={w} size={26} /><b>{nameOf(w)}</b><span className="tag">{role(w)}</span></div>
        <div className="mt16">{w === Sync.who ? <ArgBox value={mine} onChange={setMine} disabled={sent} placeholder="Твои аргументы…" />
          : Sync.get(base + 'sent:' + w) ? <p style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{Sync.get(base + w, '')}</p> : <p className="muted">Готовит аргументы… (откроется, когда отправит)</p>}</div>
        {w === Sync.who && !sent && <button className="btn mt16" onClick={() => setSent(true)}>Отправить судье</button>}</div>)}
    </div>
    {both && <div className="center mt24"><button className="btn lg" disabled={busy} onClick={judge}>{busy ? 'Судья совещается…' : 'Узнать вердикт'}</button></div>}
  </CursorStage>;
}

/* ================= Суд пары ================= */
function Court() {
  const [g, setG] = useStore('court:case', null);
  const [title, setTitle] = useState('');
  return <GameShell id="court" title="Суд пары" sub="Шуточный суд для бытовых споров. Каждый выступает, прикладывает фото-улики — ИИ-судья выносит приговор." narrow>
    {!g ? <div className="card pad col">
      <span className="label">Суть спора</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Кто виноват, что мы опять не созвонились в 22:00" />
      <button className="btn lg" style={{ alignSelf: 'flex-start' }} disabled={!title.trim()} onClick={() => setG({ session: uid(), title, by: Sync.who, verdict: null })}>Открыть дело</button>
      <CourtArchive />
    </div> : <CourtRun g={g} setG={setG} />}
  </GameShell>;
}
function CourtArchive() {
  const ks = useKeys('courtlog:'); const list = ks.map((k) => Sync.get(k)).sort((a, b) => b.t - a.t);
  if (!list.length) return null;
  return <div className="mt24"><span className="label">Архив дел</span>{list.map((c, i) => <div key={i} className="row" style={{ padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}><b style={{ flex: 1 }}>{c.title}</b><span className="muted">{c.winner ? 'в пользу: ' + nameOf(c.winner) : 'ничья'}</span></div>)}</div>;
}
function CourtRun({ g, setG }) {
  const base = 'court:' + g.session + ':';
  const [speech, setSpeech] = useStore(base + 'speech:' + Sync.who, '');
  const [ev, setEv] = useStore(base + 'ev:' + Sync.who, []);
  const [done, setDone] = useStore(base + 'done:' + Sync.who, false);
  const [theirDone] = useStore(base + 'done:' + Sync.other, false);
  const [busy, setBusy] = useState(false);
  const judge = async () => {
    setBusy(true);
    const s = (w) => Sync.get(base + 'speech:' + w, ''), n = (w) => (Sync.get(base + 'ev:' + w, []) || []).length;
    const txt = await aiJudge(`Ты — судья в шуточном «Суде пары». Ислам и Дария — пара на расстоянии (Лодзь и Шмалькальден). Дело: «${g.title}».\nРечь Ислама: ${s('islam') || '(молчит)'} [фото-улик: ${n('islam')}]\nРечь Дарии: ${s('dariya') || '(молчит)'} [фото-улик: ${n('dariya')}]\nВынеси тёплый, смешной, но справедливый приговор (4–5 предложений по-русски) и назначь милое «наказание» виновному (например, сделать сюрприз). В конце строка: ПОБЕДИТЕЛЬ: Ислам или Дария или Ничья.`);
    const v = parseVerdict(txt) || { winner: null, text: 'Суд постановил: оба виноваты и оба прощены. Наказание — длинный созвон сегодня вечером. (ИИ-судья сейчас недоступен.)' };
    setG({ ...Sync.get('court:case'), verdict: v }); Sync.set('courtlog:' + g.session, { title: g.title, winner: v.winner, t: Sync.now() }); markDone('court'); setBusy(false);
  };
  if (g.verdict) return <div className="card pad" style={{ padding: 36, background: '#2f2925', color: '#f3eadf' }}>
    <div className="eyebrow" style={{ color: '#c9bcae' }}>Приговор по делу «{g.title}»</div>
    <h2 className="h-l mt8">{g.verdict.winner ? `В пользу: ${nameOf(g.verdict.winner)}` : 'Оба оправданы'}</h2>
    <p style={{ fontSize: 19, lineHeight: 1.55, fontFamily: 'var(--serif)' }}>{g.verdict.text}</p>
    <button className="btn lg mt16" style={{ background: '#f3eadf', color: '#2a221d' }} onClick={() => setG(null)}>Закрыть дело</button></div>;
  return <CursorStage id={'court-' + g.session}>
    <div className="card pad center" style={{ background: 'var(--sky)', borderColor: 'transparent' }}><div className="eyebrow">Дело</div><h2 className="h-m mt8">{g.title}</h2></div>
    <div className="grid mt16" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {['islam', 'dariya'].map((w) => { const me = w === Sync.who; const evs = Sync.get(base + 'ev:' + w, []) || []; const fin = Sync.get(base + 'done:' + w);
        return <div key={w} className="card pad"><div className="row"><Av w={w} size={26} /><b>{nameOf(w)}</b>{fin && <span className="tag">выступил(а)</span>}</div>
          <div className="mt16">{me ? <ArgBox value={speech} onChange={setSpeech} disabled={done} placeholder="Ваша честь, я невиновен(на), потому что…" />
            : fin ? <p style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{Sync.get(base + 'speech:' + w, '')}</p> : <p className="muted">Готовит речь…</p>}</div>
          <div className="row wrap mt8">{(me || fin) && evs.map((id, i) => <MediaImg key={i} id={id} style={{ width: 64, height: 64, borderRadius: 10 }} />)}</div>
          {me && !done && <div className="row mt16"><PickPhotos onPick={(ids) => setEv([...ev, ...ids])}>+ Фото-улика</PickPhotos><button className="btn sm" onClick={() => setDone(true)}>Закончить речь</button></div>}
        </div>; })}
    </div>
    {done && theirDone && <div className="center mt24"><button className="btn lg" disabled={busy} onClick={judge}>{busy ? 'Суд удаляется на совещание…' : 'Огласить приговор'}</button></div>}
  </CursorStage>;
}

/* ================= Совместимость ================= */
const ZOD = [['Козерог', 1, 19], ['Водолей', 2, 18], ['Рыбы', 3, 20], ['Овен', 4, 19], ['Телец', 5, 20], ['Близнецы', 6, 20], ['Рак', 7, 22], ['Лев', 8, 22], ['Дева', 9, 22], ['Весы', 10, 22], ['Скорпион', 11, 21], ['Стрелец', 12, 21], ['Козерог', 12, 31]];
const ZEL = { 'Овен': 'огонь', 'Лев': 'огонь', 'Стрелец': 'огонь', 'Телец': 'земля', 'Дева': 'земля', 'Козерог': 'земля', 'Близнецы': 'воздух', 'Весы': 'воздух', 'Водолей': 'воздух', 'Рак': 'вода', 'Скорпион': 'вода', 'Рыбы': 'вода' };
function zodiac(d) { if (!d) return null; const x = new Date(d); const m = x.getMonth() + 1, day = x.getDate(); for (const [n, mm, dd] of ZOD) if (m < mm || (m === mm && day <= dd)) return n; return 'Козерог'; }
function Match() {
  const [test, setTest] = useStore('match:test', null);
  return <GameShell id="match" title="Совместимость" sub="Проходите тест одновременно — ответы закрыты, пока оба не закончат. Потом — наглядное сравнение." narrow>
    {!test ? <div className="acts">
      <button className="act tone-rose" style={{ border: 0, textAlign: 'left' }} onClick={() => setTest({ id: 'love', session: uid() })}><span className="tag">4 вопроса</span><div><h3>Языки любви</h3><p>Как каждый из вас чувствует любовь</p></div></button>
      <button className="act tone-mint" style={{ border: 0, textAlign: 'left' }} onClick={() => setTest({ id: 'big5', session: uid() })}><span className="tag">10 вопросов</span><div><h3>Большая пятёрка</h3><p>Мини-версия теста характера</p></div></button>
      <button className="act tone-plum" style={{ border: 0, textAlign: 'left' }} onClick={() => setTest({ id: 'zodiac', session: uid() })}><span className="tag">2 даты</span><div><h3>Зодиак</h3><p>Знаки, стихии и шуточный прогноз</p></div></button>
    </div> : <ReadyGate scope={'match-' + test.session}>{test.id === 'zodiac' ? <Zodiac test={test} onExit={() => setTest(null)} /> : <MatchRun test={test} onExit={() => setTest(null)} />}</ReadyGate>}
  </GameShell>;
}
function MatchRun({ test, onExit }) {
  const T = DATA.match[test.id]; const base = 'match:a:' + test.session + ':';
  const [mine, setMine] = useStore(base + Sync.who, null); const [theirs] = useStore(base + Sync.other, null);
  const [ans, setAns] = useState([]); const i = ans.length;
  useEffect(() => { if (mine && theirs) { markDone('match'); burst({ n: 60 }); } }, [!!(mine && theirs)]);
  const calc = (a) => { const s = T.types.map(() => 0); if (!a) return s; if (T.scale) T.q.forEach((q, k) => { s[q[1]] += a[k]; }); else a.forEach((v) => { s[v] += 1; }); return s; };
  if (!mine) {
    const q = T.q[i];
    return <CursorStage id={'match-' + test.session} freeze><div className="card pad" style={{ padding: 30 }}>
      <div className="row"><span className="tag">{i + 1} / {T.q.length}</span><span className="spacer" /><span className={'lock' + (theirs ? ' on' : '')}>{Sync.them.name} {theirs ? 'закончил(а)' : 'проходит'}</span></div>
      <h2 className="h-m mt16" style={{ fontSize: 32 }}>{q[0]}</h2>
      {T.scale ? <div className="row mt24 wrap">{[1, 2, 3, 4, 5].map((v) => <button key={v} className="opt" style={{ width: 'auto', flex: 1, textAlign: 'center' }} onClick={() => { const n = [...ans, v]; n.length === T.q.length ? setMine(n) : setAns(n); }}>{['Нет', 'Скорее нет', 'Средне', 'Скорее да', 'Да'][v - 1]}</button>)}</div>
        : <div className="col mt24" style={{ gap: 10 }}>{q[1].map((o, k) => <button key={k} className="opt" onClick={() => { const n = [...ans, k]; n.length === T.q.length ? setMine(n) : setAns(n); }}>{o}</button>)}</div>}
    </div></CursorStage>;
  }
  if (!theirs) return <div className="card pad center" style={{ padding: 40 }}><h2 className="h-m">Готово! Ждём {Sync.them.name === 'Дария' ? 'Дарию' : 'Ислама'}…</h2><p className="muted">Результаты откроются у обоих одновременно.</p></div>;
  const A = calc(Sync.get(base + 'islam')), B = calc(Sync.get(base + 'dariya'));
  const max = Math.max(...A, ...B, 1);
  const sim = Math.round(100 - A.reduce((s, v, k) => s + Math.abs(v - B[k]), 0) / (max * T.types.length) * 100);
  return <div className="card pad" style={{ padding: 32 }}>
    <div className="eyebrow">{T.name}</div><h2 className="h-l mt8">Совпадение {Math.max(0, sim)}%</h2>
    <div className="col mt24" style={{ gap: 14 }}>{T.types.map((t, k) => <div key={t}><div className="row" style={{ fontSize: 14, fontWeight: 700 }}>{t}</div>
      {[['islam', A[k]], ['dariya', B[k]]].map(([w, v]) => <div key={w} className="row mt8" style={{ gap: 8 }}><Av w={w} size={20} /><div style={{ flex: 1, height: 12, background: 'var(--line)', borderRadius: 9, overflow: 'hidden' }}><div style={{ height: '100%', width: (v / max * 100) + '%', background: colorOf(w), transition: 'width 1s' }} /></div><span className="mono" style={{ width: 24, fontSize: 12 }}>{v}</span></div>)}</div>)}</div>
    {!T.scale && <p className="hand mt24" style={{ fontSize: 26 }}>Ислам: {T.types[A.indexOf(Math.max(...A))]} · Дария: {T.types[B.indexOf(Math.max(...B))]}</p>}
    <button className="btn lg mt16" onClick={onExit}>Другой тест</button></div>;
}
function Zodiac({ onExit }) {
  const [bi, setBi] = useStore('profile:birthday:islam', ''); const [bd, setBd] = useStore('profile:birthday:dariya', '');
  const mineSet = Sync.who === 'islam' ? setBi : setBd;
  const zi = zodiac(bi), zd = zodiac(bd);
  const score = zi && zd ? (() => { const a = ZEL[zi], b = ZEL[zd]; if (a === b) return 92; const good = { огонь: 'воздух', воздух: 'огонь', земля: 'вода', вода: 'земля' }; return good[a] === b ? 88 : 71; })() : null;
  useEffect(() => { if (score) markDone('match'); }, [score]);
  return <div className="card pad" style={{ padding: 30 }}>
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>{['islam', 'dariya'].map((w) => { const v = w === 'islam' ? bi : bd; const z = zodiac(v);
      return <div key={w} className="card pad center"><Av w={w} size={34} /><div className="mt8"><b>{nameOf(w)}</b></div>
        {w === Sync.who ? <input type="date" className="input mt8" value={v} onChange={(e) => mineSet(e.target.value)} /> : <div className="muted mt8">{v ? new Date(v).toLocaleDateString('ru-RU') : 'ещё не указал(а)'}</div>}
        {z && <div className="h-m mt16">{z}<div className="muted" style={{ fontFamily: 'var(--sans)', fontSize: 13 }}>стихия: {ZEL[z]}</div></div>}</div>; })}</div>
    {score && <div className="center mt24"><div className="eyebrow">Звёзды говорят</div><div style={{ fontFamily: 'var(--serif)', fontSize: 80, fontWeight: 700 }}>{score}%</div>
      <p className="hand" style={{ fontSize: 26 }}>{ZEL[zi] === ZEL[zd] ? 'Одна стихия — понимаете друг друга без слов.' : score > 80 ? `${ZEL[zi]} и ${ZEL[zd]} — подпитываете друг друга.` : 'Разные стихии — зато никогда не скучно.'}</p></div>}
    <button className="btn mt16" onClick={onExit}>Назад</button></div>;
}

/* ================= Аркада ================= */
/* Селфи → вырезаем лицо кругом, белая обводка как у стикера → мультяшные ручки в перчатках и ножки в кроссовках */
async function makeFaceSticker(dataUrl) {
  const img = await loadImg(dataUrl); const S = 240; const c = document.createElement('canvas'); c.width = S; c.height = S; const x = c.getContext('2d');
  let cut = null;
  try { const tmp = document.createElement('canvas'); tmp.width = img.width; tmp.height = img.height; tmp.getContext('2d').drawImage(img, 0, 0); if (window.__cutout) cut = await window.__cutout(tmp); } catch (e) {}
  x.save(); x.beginPath(); x.ellipse(S / 2, S / 2, S * .46, S * .48, 0, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill(); x.restore();
  x.save(); x.beginPath(); x.ellipse(S / 2, S / 2, S * .42, S * .44, 0, 0, Math.PI * 2); x.clip();
  const src = cut || img; const s = Math.max(S / src.width, S / src.height) * 1.05; x.drawImage(src, (S - src.width * s) / 2, (S - src.height * s) / 2 - 6, src.width * s, src.height * s); x.restore();
  return c.toDataURL('image/png');
}
function FaceBuddy({ face, size = 80, flip, color }) {
  const w = size, h = size * 1.5;
  return <svg width={w} height={h} viewBox="0 0 100 150" style={{ overflow: 'visible', transform: flip ? 'scaleX(-1)' : 'none' }}>
    <line x1="35" y1="95" x2="28" y2="135" stroke="#2a221d" strokeWidth="4" strokeLinecap="round" /><line x1="65" y1="95" x2="72" y2="135" stroke="#2a221d" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="22" cy="138" rx="13" ry="7" fill={color || '#e8606c'} stroke="#2a221d" strokeWidth="2.5" /><ellipse cx="78" cy="138" rx="13" ry="7" fill={color || '#e8606c'} stroke="#2a221d" strokeWidth="2.5" />
    <line x1="15" y1="62" x2="2" y2="82" stroke="#2a221d" strokeWidth="4" strokeLinecap="round" /><line x1="85" y1="62" x2="98" y2="45" stroke="#2a221d" strokeWidth="4" strokeLinecap="round" />
    <circle cx="2" cy="85" r="9" fill="#fff" stroke="#2a221d" strokeWidth="2.5" /><circle cx="98" cy="42" r="9" fill="#fff" stroke="#2a221d" strokeWidth="2.5" />
    {face ? <image href={face} x="0" y="0" width="100" height="100" /> : <circle cx="50" cy="50" r="46" fill="#f4d3d1" stroke="#fff" strokeWidth="6" />}
  </svg>;
}
const ARCADE_GAMES = [
  { id: 'flappy', name: 'Flappy Face', d: 'Тап — взлёт. Пролетай в щели. 1 жизнь.' },
  { id: 'catch', name: 'Ловим сердца', d: 'Двигай лицо, лови ♥, избегай 💣. 30 сек.' },
  { id: 'tap', name: 'Тап-марафон', d: 'Кто больше тапнет за 10 секунд.' },
  { id: 'aim', name: 'Снайпер', d: 'Попадай по мишеням, пока не кончилось время.' },
  { id: 'memory', name: 'Память', d: 'Повтори последовательность цветов.' },
  { id: 'jump', name: 'Прыгун', d: 'Перепрыгивай препятствия на бегу.' },
  { id: 'stack', name: 'Башня', d: 'Ставь блоки ровно друг на друга.' },
  { id: 'math', name: 'Счёт на скорость', d: 'Решай примеры, пока есть время.' },
  { id: 'dodge', name: 'Уворот', d: 'Уворачивайся от падающих облаков.' },
  { id: 'type', name: 'Печатаем', d: 'Набери фразы о любви быстрее.' },
];
function Arcade() {
  const [faceI] = useStore('arcade:face:islam', null); const [faceD] = useStore('arcade:face:dariya', null);
  const [g, setG] = useStore('arcade:game', null);
  const myFace = useMedia(Sync.who === 'islam' ? faceI : faceD); const fI = useMedia(faceI), fD = useMedia(faceD);
  const [snapOn, setSnapOn] = useState(false);
  const total = useKeys('arcade:win:');
  const wins = { islam: total.filter((k) => Sync.get(k) === 'islam').length, dariya: total.filter((k) => Sync.get(k) === 'dariya').length };
  return <GameShell id="arcade" title="Аркада" sub="Быстрое селфи — и ваши лица превращаются в мультяшных человечков с ручками в перчатках. 10 ретро-дуэлей лицом к лицу." right={<Score s={wins} />}>
    <div className="card pad row wrap" style={{ gap: 30, justifyContent: 'center', background: 'var(--mint)', borderColor: 'transparent' }}>
      <div className="center"><FaceBuddy face={fI} size={90} color="#6f95c9" /><div className="mt8"><b>Ислам</b></div></div>
      <div className="hand" style={{ fontSize: 46 }}>vs</div>
      <div className="center"><FaceBuddy face={fD} size={90} flip color="#e8797d" /><div className="mt8"><b>Дария</b></div></div>
      <div className="col"><button className="btn" onClick={() => setSnapOn(true)}>{myFace ? 'Переснять селфи' : 'Сделать селфи'}</button>
        <PickPhotos multiple={false} onPick={async ([id]) => { const d = await Sync.mediaGet(id); const st = await makeFaceSticker(d); Sync.set('arcade:face:' + Sync.who, await Sync.mediaPut(st)); }}>или загрузить фото</PickPhotos></div>
    </div>
    {snapOn && <SelfieModal onClose={() => setSnapOn(false)} />}
    {!g ? <div className="acts mt24">{ARCADE_GAMES.map((a, i) => <button key={a.id} className={'act tone-' + ['mint', 'rose', 'butter', 'sky', 'plum'][i % 5]} style={{ border: 0, textAlign: 'left', minHeight: 150 }} onClick={() => setG({ id: a.id, session: uid() })}><span className="tag">#{i + 1}</span><div><h3 style={{ fontSize: 24 }}>{a.name}</h3><p>{a.d}</p></div></button>)}</div>
      : <div className="mt24"><ReadyGate scope={'arc-' + g.session} title={ARCADE_GAMES.find((a) => a.id === g.id).name} hint="Играете одновременно, каждый на своём экране. Счёт сравнится в конце.">{(r) => <ArcadeRun g={g} startAt={r.startAt} face={myFace} onExit={() => setG(null)} />}</ReadyGate></div>}
  </GameShell>;
}
function SelfieModal({ onClose }) {
  const [stream, err] = useCamera(true); const [busy, setBusy] = useState(false); const v = useRef();
  const snap = async () => { setBusy(true); const vid = v.current.querySelector('video'); const c = document.createElement('canvas'); c.width = 480; c.height = 480; const x = c.getContext('2d'); x.translate(480, 0); x.scale(-1, 1); coverDraw(x, vid, 0, 0, 480, 480);
    const st = await makeFaceSticker(c.toDataURL('image/jpeg', .9)); Sync.set('arcade:face:' + Sync.who, await Sync.mediaPut(st)); setBusy(false); onClose(); toast('Твой человечек готов'); };
  return <Modal onClose={onClose}><h2 className="h-m">Быстрое селфи</h2>
    <div ref={v} style={{ width: 280, height: 280, borderRadius: '50%', overflow: 'hidden', margin: '18px auto', background: '#222', border: '6px solid #fff', boxShadow: 'var(--shadow-lg)' }}>{stream ? <Video stream={stream} /> : <div className="ph-slot" style={{ height: '100%' }}>{err || 'камера…'}</div>}</div>
    <div className="row" style={{ justifyContent: 'center' }}><button className="btn lg" disabled={!stream || busy} onClick={snap}>{busy ? 'Вырезаем…' : 'Щёлк!'}</button></div></Modal>;
}
function ArcadeRun({ g, startAt, face, onExit }) {
  const base = 'arcade:s:' + g.session + ':';
  const [mine, setMine] = useStore(base + Sync.who, null); const [theirs] = useStore(base + Sync.other, null);
  const [live, setLive] = useState(0); const [theirLive, setTheirLive] = useState(0);
  useEph('arc-live', (d) => d.s === g.session && setTheirLive(d.v));
  const report = (v) => { setLive(v); Sync.sendEph('arc-live', { s: g.session, v }); };
  const both = mine !== null && theirs !== null;
  useEffect(() => { if (both) { const a = Sync.get(base + 'islam'), b = Sync.get(base + 'dariya'); const w = a === b ? null : a > b ? 'islam' : 'dariya'; if (w && !Sync.get('arcade:win:' + g.session)) Sync.set('arcade:win:' + g.session, w); markDone('arcade'); burst({ n: 70 }); } }, [both]);
  const A = ARCADE_GAMES.find((a) => a.id === g.id);
  const props = { face, onScore: report, onEnd: (v) => mine === null && setMine(v), seed: g.session };
  return <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 240px', gap: 18 }}>
    <div className="card" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
      {mine === null ? <ArcadeEngine kind={g.id} {...props} /> : <div className="center pad" style={{ padding: 60 }}><div className="eyebrow">Твой счёт</div><div style={{ fontFamily: 'var(--serif)', fontSize: 90, fontWeight: 700 }}>{mine}</div>{!both && <p className="muted">Ждём, пока {Sync.them.name} доиграет…</p>}</div>}
    </div>
    <div className="col">
      <div className="card pad"><div className="eyebrow">{A.name} · live</div>{['islam', 'dariya'].map((w) => <div key={w} className="row mt16"><Av w={w} size={28} /><b style={{ flex: 1 }}>{nameOf(w)}</b><span style={{ fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 700 }}>{Sync.get(base + w) ?? (w === Sync.who ? live : theirLive)}</span></div>)}</div>
      {both && <div className="card pad center" style={{ background: 'var(--butter)', borderColor: 'transparent' }}><div className="h-m">{Sync.get(base + 'islam') === Sync.get(base + 'dariya') ? 'Ничья!' : nameOf(Sync.get(base + 'islam') > Sync.get(base + 'dariya') ? 'islam' : 'dariya') + ' побеждает'}</div></div>}
      <button className="btn ghost" onClick={onExit}>Другая игра</button>
    </div>
  </div>;
}
/* Единый движок на canvas: 10 мини-игр */
function ArcadeEngine({ kind, face, onScore, onEnd, seed }) {
  const ref = useRef(); const W = 640, H = 420;
  const [txt, setTxt] = useState(''); const [prompt, setPrompt] = useState('');
  const stRef = useRef({});
  useEffect(() => {
    const c = ref.current, x = c.getContext('2d'); c.width = W; c.height = H;
    const img = new Image(); if (face) img.src = face;
    const R = seeded(seed + kind); let raf, ended = false, score = 0, t0 = performance.now();
    const S = stRef.current = { y: H / 2, vy: 0, px: W / 2, items: [], pipes: [], taps: 0, target: null, seq: [], input: [], show: 0, blocks: [{ x: W / 2 - 80, w: 160 }], bx: 0, bdir: 1, mq: null, phrases: ['я скучаю по тебе', 'до встречи осталось мало', 'лодзь и шмалькальден', 'ты мой человек', 'обнимаю крепко'], pi: 0, jy: 0, jv: 0, obs: [] };
    const setScore = (v) => { score = v; onScore(v); };
    const end = () => { if (ended) return; ended = true; onEnd(score); };
    const drawFace = (px, py, r) => { x.save(); x.beginPath(); x.arc(px, py, r, 0, 7); x.fillStyle = '#fff'; x.fill(); if (face && img.complete) x.drawImage(img, px - r, py - r, r * 2, r * 2); else { x.fillStyle = Sync.who === 'islam' ? '#6f95c9' : '#e8797d'; x.beginPath(); x.arc(px, py, r - 4, 0, 7); x.fill(); } x.restore(); };
    const bg = (c1, c2) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(1, c2); x.fillStyle = gr; x.fillRect(0, 0, W, H); };
    const timeLeft = (sec) => Math.max(0, sec - (performance.now() - t0) / 1000);
    const hud = (s) => { x.fillStyle = 'rgba(0,0,0,.6)'; x.font = '700 18px Manrope'; x.textAlign = 'left'; x.fillText(s, 14, 26); };
    if (kind === 'memory') { S.seq = [Math.floor(R() * 4)]; S.show = performance.now(); }
    if (kind === 'math') { const a = 2 + Math.floor(R() * 20), b = 2 + Math.floor(R() * 20); S.mq = { a, b, ans: a + b }; setPrompt(a + ' + ' + b + ' = ?'); }
    if (kind === 'type') setPrompt(S.phrases[0]);
    const loop = () => {
      const now = performance.now(); const el = (now - t0) / 1000;
      if (kind === 'flappy') {
        bg('#bfe0f0', '#f4ece0'); S.vy += 0.45; S.y += S.vy;
        if (S.pipes.length === 0 || S.pipes[S.pipes.length - 1].x < W - 230) S.pipes.push({ x: W, gap: 90 + R() * (H - 260), passed: false });
        S.pipes.forEach((p) => { p.x -= 3 + el * 0.03; x.fillStyle = '#8fbf8f'; x.fillRect(p.x, 0, 60, p.gap); x.fillRect(p.x, p.gap + 150, 60, H); if (!p.passed && p.x + 60 < 120) { p.passed = true; setScore(score + 1); } if (p.x < 140 && p.x + 60 > 100 && (S.y - 20 < p.gap || S.y + 20 > p.gap + 150)) end(); });
        S.pipes = S.pipes.filter((p) => p.x > -70); if (S.y > H || S.y < 0) end(); drawFace(120, S.y, 22); hud('Счёт: ' + score);
      } else if (kind === 'catch' || kind === 'dodge') {
        bg(kind === 'catch' ? '#f7d6d9' : '#d6e4f0', '#fffaf3'); const tl = timeLeft(30);
        if (R() < 0.06 + el * 0.002) S.items.push({ x: 20 + R() * (W - 40), y: -20, v: 2 + R() * 3 + el * 0.08, bad: kind === 'dodge' ? true : R() < .25 });
        S.items.forEach((it) => { it.y += it.v; x.font = '30px serif'; x.textAlign = 'center'; x.fillText(kind === 'dodge' ? '☁' : it.bad ? '💣' : '♥', it.x, it.y);
          if (!it.hit && Math.abs(it.x - S.px) < 34 && Math.abs(it.y - (H - 50)) < 30) { it.hit = true; if (kind === 'dodge') end(); else setScore(Math.max(0, score + (it.bad ? -3 : 1))); } });
        S.items = S.items.filter((i) => i.y < H + 30 && !i.hit); if (kind === 'dodge' && !ended) setScore(Math.floor(el)); drawFace(S.px, H - 50, 26);
        hud(kind === 'catch' ? `♥ ${score} · ${tl.toFixed(0)} с` : `Продержался: ${score} с`); if (kind === 'catch' && tl <= 0) end();
      } else if (kind === 'tap') {
        bg('#f6e3b4', '#fffaf3'); const tl = timeLeft(10); drawFace(W / 2, H / 2, 60 + Math.sin(S.taps) * 6); x.fillStyle = '#2a221d'; x.font = '700 60px "Cormorant Garamond"'; x.textAlign = 'center'; x.fillText(S.taps, W / 2, H - 50); hud('Тапай! ' + tl.toFixed(1) + ' с'); if (tl <= 0) end();
      } else if (kind === 'aim') {
        bg('#e3d4ea', '#fffaf3'); const tl = timeLeft(20); if (!S.target) S.target = { x: 40 + R() * (W - 80), y: 40 + R() * (H - 80), r: 30, born: now };
        const T = S.target; const k = 1 - (now - T.born) / 1600; if (k <= 0) S.target = null; else { x.fillStyle = '#e8797d'; x.beginPath(); x.arc(T.x, T.y, T.r * k + 8, 0, 7); x.fill(); drawFace(T.x, T.y, T.r * k); }
        hud(`Попаданий: ${score} · ${tl.toFixed(0)} с`); if (tl <= 0) end();
      } else if (kind === 'memory') {
        bg('#fffaf3', '#f4ece0'); const cols = ['#e8797d', '#6f95c9', '#f2c76e', '#8fbf8f'];
        const showing = Math.floor((now - S.show) / 600); const lit = showing < S.seq.length ? S.seq[showing] : -1;
        cols.forEach((cc, i) => { x.fillStyle = cc; x.globalAlpha = lit === i || S.flash === i ? 1 : .35; x.fillRect(80 + (i % 2) * 250, 40 + Math.floor(i / 2) * 180, 230, 160); }); x.globalAlpha = 1;
        hud(showing < S.seq.length ? 'Запоминай…' : 'Повтори! Уровень ' + S.seq.length); S.canInput = showing >= S.seq.length;
      } else if (kind === 'jump') {
        bg('#d4e6d6', '#fffaf3'); S.jv += 0.8; S.jy = Math.min(0, S.jy + S.jv); if (S.jy === 0) S.jv = 0;
        if (S.obs.length === 0 || S.obs[S.obs.length - 1].x < W - 200 - R() * 200) S.obs.push({ x: W + 20 });
        S.obs.forEach((o) => { o.x -= 5 + el * 0.15; x.fillStyle = '#6b4f3a'; x.fillRect(o.x, H - 70, 26, 40); if (o.x < 125 && o.x + 26 > 75 && S.jy > -40) end(); if (!o.p && o.x < 75) { o.p = true; setScore(score + 1); } });
        S.obs = S.obs.filter((o) => o.x > -40); x.fillStyle = '#a39486'; x.fillRect(0, H - 30, W, 30); drawFace(100, H - 56 + S.jy, 24); hud('Прыжков: ' + score);
      } else if (kind === 'stack') {
        bg('#d6e4f0', '#fffaf3'); const top = S.blocks[S.blocks.length - 1]; S.bx += S.bdir * (3 + score * 0.3); if (S.bx < 0 || S.bx + top.w > W) S.bdir *= -1;
        S.blocks.slice(-12).forEach((b, i, arr) => { x.fillStyle = i % 2 ? '#e8797d' : '#6f95c9'; x.fillRect(b.x, H - 30 - (arr.length - i) * 26, b.w, 24); });
        x.fillStyle = '#2a221d'; x.fillRect(S.bx, H - 30 - (Math.min(S.blocks.length, 12) + 1) * 26, top.w, 24); hud('Этаж: ' + score);
      } else if (kind === 'math' || kind === 'type') {
        bg('#f6e3b4', '#fffaf3'); const tl = timeLeft(kind === 'math' ? 30 : 40); x.fillStyle = '#2a221d'; x.font = '600 44px "Cormorant Garamond"'; x.textAlign = 'center'; x.fillText(kind === 'math' ? (S.mq.a + ' + ' + S.mq.b) : S.phrases[S.pi % S.phrases.length], W / 2, H / 2 - 20); drawFace(W / 2, 80, 30); hud(`Очки: ${score} · ${tl.toFixed(0)} с`); if (tl <= 0) end();
      }
      if (!ended) raf = requestAnimationFrame(loop);
    };
    loop();
    const pt = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    const down = (e) => {
      const [px, py] = pt(e);
      if (kind === 'flappy') S.vy = -7.5;
      if (kind === 'tap') { S.taps++; setScore(S.taps); }
      if (kind === 'jump' && S.jy === 0) S.jv = -15;
      if (kind === 'aim' && S.target && Math.hypot(px - S.target.x, py - S.target.y) < S.target.r + 10) { setScore(score + 1); S.target = null; }
      if (kind === 'memory' && S.canInput) { const i = (px > 330 ? 1 : 0) + (py > 210 ? 2 : 0); S.flash = i; setTimeout(() => S.flash = -1, 200); S.input.push(i);
        if (S.seq[S.input.length - 1] !== i) end(); else if (S.input.length === S.seq.length) { setScore(S.seq.length); S.seq.push(Math.floor(R() * 4)); S.input = []; S.show = performance.now() + 500; } }
      if (kind === 'stack') { const top = S.blocks[S.blocks.length - 1]; const l = Math.max(S.bx, top.x), r = Math.min(S.bx + top.w, top.x + top.w); if (r - l < 6) end(); else { S.blocks.push({ x: l, w: r - l }); setScore(score + 1); S.bx = 0; } }
    };
    const move = (e) => { if (kind === 'catch' || kind === 'dodge') S.px = Math.max(26, Math.min(W - 26, pt(e)[0])); };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move);
    const key = (e) => { if (e.code === 'Space' && ['flappy', 'jump', 'tap', 'stack'].includes(kind)) { e.preventDefault(); down({ clientX: 0, clientY: 0 }); } if (kind === 'catch' || kind === 'dodge') { if (e.key === 'ArrowLeft') S.px -= 30; if (e.key === 'ArrowRight') S.px += 30; } };
    addEventListener('keydown', key);
    S.answer = (v) => { if (kind === 'math') { if (+v === S.mq.ans) { setScore(score + 1); const a = 2 + Math.floor(R() * 30), b = 2 + Math.floor(R() * 30); S.mq = { a, b, ans: a + b }; return true; } }
      if (kind === 'type') { if (v.trim().toLowerCase() === S.phrases[S.pi % S.phrases.length]) { setScore(score + 1); S.pi++; return true; } } return false; };
    return () => { cancelAnimationFrame(raf); c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); removeEventListener('keydown', key); };
  }, []);
  return <div><canvas ref={ref} style={{ width: '100%', display: 'block', touchAction: 'none', cursor: 'pointer' }} />
    {(kind === 'math' || kind === 'type') && <div className="row pad"><input className="input" autoFocus value={txt} onChange={(e) => { setTxt(e.target.value); if (kind === 'type' && stRef.current.answer(e.target.value)) setTxt(''); }} onKeyDown={(e) => { if (e.key === 'Enter' && stRef.current.answer(txt)) setTxt(''); else if (e.key === 'Enter') setTxt(''); }} placeholder={kind === 'math' ? 'Ответ + Enter' : 'Печатай фразу'} /></div>}
  </div>;
}

/* ================= Лаборатория (учёба вместе) ================= */
function Lab() {
  const [s, setS] = useStore('lab:session', null);
  const [tasks, setTasks] = useStore('lab:tasks:' + Sync.who, []);
  const [theirTasks] = useStore('lab:tasks:' + Sync.other, []);
  const [t, setT] = useState('');
  const now = useNow(1000);
  const len = s ? (s.phase === 'focus' ? s.focus : s.brk) * 60000 : 0;
  const left = s && s.at ? Math.max(0, len - (now - s.at)) : len;
  useEffect(() => { if (s && s.at && left === 0) { const nx = s.phase === 'focus' ? 'break' : 'focus'; if (Sync.get('lab:session').at === s.at) { setS({ ...s, phase: nx, at: Sync.now(), rounds: s.rounds + (s.phase === 'focus' ? 1 : 0) }); if (s.phase === 'focus') { burst({ n: 40 }); markDone('lab'); } } } }, [left === 0]);
  const fmt = (ms) => String(Math.floor(ms / 60000)).padStart(2, '0') + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0');
  const TaskCol = ({ w, list, editable }) => <div className="card pad"><div className="row"><Av w={w} size={24} /><b>{w === Sync.who ? 'Мои задачи' : 'Задачи ' + (w === 'dariya' ? 'Дарии' : 'Ислама')}</b></div>
    <div className="col mt16" style={{ gap: 8 }}>{list.map((it, i) => <label key={i} className="row" style={{ fontSize: 15, textDecoration: it.d ? 'line-through' : 'none', color: it.d ? 'var(--ink3)' : 'inherit' }}>
      <input type="checkbox" checked={!!it.d} disabled={!editable} onChange={() => setTasks(list.map((x, k) => k === i ? { ...x, d: !x.d } : x))} />{it.t}</label>)}</div>
    {editable && <div className="row mt16"><input className="input" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && t.trim()) { setTasks([...list, { t }]); setT(''); } }} placeholder="Добавить задачу + Enter" /></div>}</div>;
  return <GameShell id="lab" title="Лаборатория" sub="Стади-дейт: общий помодоро-таймер на двоих и списки задач друг друга. Фокус — вместе, перерыв — вместе." narrow>
    {!s ? <div className="card pad center" style={{ padding: 36 }}><div className="row" style={{ justifyContent: 'center' }}>{[[25, 5], [50, 10]].map(([f, b]) => <button key={f} className="btn lg ghost" onClick={() => setS({ focus: f, brk: b, phase: 'focus', at: null, rounds: 0, id: uid() })}>{f} / {b} мин</button>)}</div></div>
      : <ReadyGate scope={'lab-' + s.id} title="Начинаем фокус вместе">{(r) => { if (!s.at) setTimeout(() => !Sync.get('lab:session').at && setS({ ...s, at: r.startAt }), 0);
        return <div className="card pad center" style={{ padding: 36, background: s.phase === 'focus' ? 'var(--sky)' : 'var(--mint)', borderColor: 'transparent' }}>
          <div className="eyebrow">{s.phase === 'focus' ? 'Фокус' : 'Перерыв'} · раунд {s.rounds + 1}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 120, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmt(left)}</div>
          <div className="row mt16" style={{ justifyContent: 'center' }}><button className="btn ghost" onClick={() => setS(null)}>Закончить сессию</button></div></div>; }}</ReadyGate>}
    <div className="grid mt16" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}><TaskCol w={Sync.who} list={tasks} editable /><TaskCol w={Sync.other} list={theirTasks} /></div>
  </GameShell>;
}

/* ================= Наше будущее ================= */
function Future() {
  return <GameShell id="future" title="Наше будущее" sub="Планируем по главам. Каждый пишет своё — и видит, как мечтает другой." narrow>
    <div className="col" style={{ gap: 16 }}>{DATA.futureChapters.map((c) => <FutureChapter key={c.id} c={c} />)}</div>
  </GameShell>;
}
function FutureChapter({ c }) {
  const [mine, setMine] = useStore('future:' + c.id + ':' + Sync.who, ''); const [theirs] = useStore('future:' + c.id + ':' + Sync.other, '');
  const [txt, setTxt] = useState(mine); const [agree, setAgree] = useStore('future:' + c.id + ':agreed', false);
  useEffect(() => { if (mine && theirs) markDone('future'); }, [!!(mine && theirs)]);
  return <div className="card pad"><h3 className="h-m">{c.t}</h3><p className="muted" style={{ margin: '4px 0 0' }}>{c.p}</p>
    <div className="grid mt16" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div><div className="row" style={{ marginBottom: 6 }}><Av w={Sync.who} size={20} /><b style={{ fontSize: 13 }}>Я</b></div><textarea className="input" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={() => setMine(txt)} placeholder="Пиши…" /></div>
      <div><div className="row" style={{ marginBottom: 6 }}><Av w={Sync.other} size={20} /><b style={{ fontSize: 13 }}>{Sync.them.name}</b></div><div className="hand" style={{ fontSize: 22, minHeight: 80, padding: '8px 4px', lineHeight: 1.15 }}>{theirs || <span className="faint" style={{ fontFamily: 'var(--sans)', fontSize: 14 }}>пока пусто</span>}</div></div>
    </div>
    {mine && theirs && <button className={'btn sm mt16 ' + (agree ? '' : 'ghost')} onClick={() => setAgree(!agree)}>{agree ? '✓ Договорились' : 'Мы договорились'}</button>}
  </div>;
}

Object.assign(window, { Debate, Court, Match, Arcade, Lab, Future, aiJudge });

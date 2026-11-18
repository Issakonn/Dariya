/* Скрапбук: книга, которая листается как настоящая. 10 шаблонов, ленты на скотче, фото, текст от руки, стикеры, карта двух городов, письмо с плейлистом. */
const BOOK_TEMPLATES = [
  { id: 'anniv', name: 'Годовщина', bg: '#f4e4dc', ink: '#5a2a2e', cover: 'Наша годовщина', accent: '#c24f59' },
  { id: 'bday', name: 'День рождения', bg: '#f6e3b4', ink: '#5c3d12', cover: 'С днём рождения', accent: '#e2a93c' },
  { id: 'miss', name: 'Скучаю', bg: '#dde6ee', ink: '#24384f', cover: 'Далеко, но всё ещё мы', accent: '#3e5f93' },
  { id: 'just', name: 'Просто так', bg: '#f3ece2', ink: '#2a221d', cover: 'Просто так', accent: '#6d5f55' },
  { id: 'trip', name: 'Наша поездка', bg: '#e3ecdc', ink: '#2e3b2a', cover: 'Там, где мы были', accent: '#3d7a4a' },
  { id: 'first', name: 'Первое свидание', bg: '#f7d6d9', ink: '#5a2a2e', cover: 'Как всё началось', accent: '#d7646a' },
  { id: 'xmas', name: 'Зима', bg: '#e8eef2', ink: '#1f3a4a', cover: 'Наша зима', accent: '#b5352f' },
  { id: 'sorry', name: 'Прости', bg: '#ece4f1', ink: '#3b2a4a', cover: 'Прости меня', accent: '#8c5bb0' },
  { id: 'thanks', name: 'Спасибо', bg: '#f1e6d2', ink: '#4a3520', cover: 'Спасибо, что ты есть', accent: '#9a6533' },
  { id: 'count', name: 'До встречи', bg: '#fbefe5', ink: '#3b2f28', cover: 'Скоро увидимся', accent: '#d0563c' },
];
const PAGE_W = 420, PAGE_H = 560;

function Scrapbook() {
  const ks = useKeys('book:');
  const books = ks.map((k) => ({ id: k, ...Sync.get(k) })).sort((a, b) => b.t - a.t);
  const [openId, setOpenId] = useStore('book:__open', null);
  const open = books.find((b) => b.id === openId);
  const create = (tpl) => { const id = 'book:' + uid(); Sync.set(id, { tpl: tpl.id, title: tpl.cover, t: Sync.now(), by: Sync.who, pages: Array.from({ length: 6 }, () => ({ items: [] })) }); setOpenId(id); };
  if (open) return <BookEditor book={open} onClose={() => setOpenId(null)} />;
  return <div className="page">
    <div className="eyebrow">Скрапбук</div><h1 className="h-xl mt8">Книга о нас двоих.</h1>
    <p className="lead mt16">Выбираем шаблон, добавляем ленты, фото и пару слов. Страницы уже сделаны и листаются как настоящая книга. Открываешь — {Sync.them.name} видит то же самое.</p>
    {books.length > 0 && <section className="mt32"><span className="label">Наши книги</span><div className="row wrap mt16" style={{ gap: 22 }}>{books.filter((b) => b.pages).map((b) => { const T = BOOK_TEMPLATES.find((t) => t.id === b.tpl) || BOOK_TEMPLATES[0];
      return <button key={b.id} onClick={() => setOpenId(b.id)} style={{ border: 0, padding: 0, background: 'none', textAlign: 'left' }}>
        <div style={{ width: 170, height: 226, background: T.bg, color: T.ink, borderRadius: '4px 14px 14px 4px', boxShadow: 'inset 8px 0 12px -6px rgba(0,0,0,.25), var(--shadow-lg)', padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', transition: 'transform .3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(-2deg) translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = ''}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{b.title}</div><div className="hand" style={{ fontSize: 18, opacity: .7 }}>Ислам + Дария</div></div>
        <div className="faint mt8" style={{ fontSize: 12 }}>{T.name} · {new Date(b.t).toLocaleDateString('ru-RU')}</div></button>; })}</div></section>}
    <section className="mt48"><span className="label">Новая книга · 10 шаблонов</span>
      <div className="grid mt16" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>{BOOK_TEMPLATES.map((t) => <button key={t.id} onClick={() => create(t)} className="card" style={{ background: t.bg, color: t.ink, border: 0, padding: 18, minHeight: 150, textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform .2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = ''}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: t.accent }} /><div><div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{t.name}</div><div style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>«{t.cover}»</div></div></button>)}</div>
    </section>
  </div>;
}

function songEmbed(u) {
  if (!u) return null;
  let m = u.match(/open\.spotify\.com\/(track|album|playlist)\/([\w]+)/); if (m) return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, h: 80, name: 'Spotify' };
  m = u.match(/(?:youtu\.be\/|v=|music\.youtube\.com\/watch\?v=)([\w-]{11})/); if (m) return { src: `https://www.youtube.com/embed/${m[1]}`, h: 160, name: 'YouTube' };
  m = u.match(/music\.apple\.com\/(.+)/); if (m) return { src: `https://embed.music.apple.com/${m[1]}`, h: 150, name: 'Apple Music' };
  return { link: u };
}

function BookEditor({ book, onClose }) {
  const T = BOOK_TEMPLATES.find((t) => t.id === book.tpl) || BOOK_TEMPLATES[0];
  const [spread, setSpread] = useStore('bookview:' + book.id, 0); // 0 = обложка
  const [turning, setTurning] = useState(null); // {dir, from}
  const [sel, setSel] = useState(null);
  const [letterOpen, setLetterOpen] = useState(null);
  const pages = book.pages || [];
  const nSpreads = Math.ceil(pages.length / 2) + 1;
  const save = (o) => Sync.set(book.id, { ...Sync.get(book.id), ...o });
  const setPage = (pi, page) => { const p = (Sync.get(book.id).pages || []).slice(); p[pi] = page; save({ pages: p }); };
  const turn = (dir) => { const to = spread + dir; if (to < 0 || to >= nSpreads || turning) return; setTurning({ dir, from: spread }); setTimeout(() => { setSpread(to); setTurning(null); }, 750); };
  useEph('book-turn', (d) => { if (d.id === book.id && !turning && d.to !== spread) { setTurning({ dir: d.to > spread ? 1 : -1, from: spread }); setTimeout(() => setTurning(null), 750); } });
  const doTurn = (dir) => { Sync.sendEph('book-turn', { id: book.id, to: spread + dir }); turn(dir); };
  useEffect(() => { const f = (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; if (e.key === 'ArrowRight') doTurn(1); if (e.key === 'ArrowLeft') doTurn(-1); }; addEventListener('keydown', f); return () => removeEventListener('keydown', f); });
  const leftIdx = spread === 0 ? null : (spread - 1) * 2, rightIdx = spread === 0 ? 'cover' : (spread - 1) * 2 + 1;
  const curPageIdx = sel ? sel.pi : (rightIdx === 'cover' ? 0 : leftIdx);
  const addItem = (item) => { const pi = typeof curPageIdx === 'number' ? curPageIdx : 0; const p = pages[pi] || { items: [] }; setPage(pi, { items: [...(p.items || []), { id: uid(), x: .2 + Math.random() * .3, y: .15 + Math.random() * .4, r: (Math.random() - .5) * 8, w: .55, ...item }] }); if (spread === 0) setSpread(1); };
  const fillForMe = async () => {
    const strips = Sync.keys('strip:').map((k) => Sync.get(k)).sort((a, b) => b.t - a.t).slice(0, 4);
    const tm = nextMeeting();
    const np = [
      { items: [{ id: uid(), type: 'text', text: 'Ислам & Дария', x: .1, y: .1, w: .8, r: -2, size: 44, font: 'serif' }, { id: uid(), type: 'text', text: 'Лодзь ⇄ Шмалькальден, ' + new Date(Sync.now()).getFullYear(), x: .12, y: .3, w: .8, r: 1, size: 26 }, ...(strips[0] ? [{ id: uid(), type: 'strip', img: strips[0].img, x: .3, y: .42, w: .35, r: -4 }] : [])] },
      { items: [{ id: uid(), type: 'map', x: .08, y: .08, w: .84, r: 0 }, { id: uid(), type: 'text', text: tm ? `До встречи в «${tm.place}» — совсем чуть-чуть` : 'До встречи — совсем чуть-чуть', x: .1, y: .62, w: .8, r: -1, size: 28 }] },
      ...strips.slice(1).map((s, i) => ({ items: [{ id: uid(), type: 'strip', img: s.img, x: .3, y: .08, w: s.layout === '2x2' ? .7 : .38, r: i % 2 ? 3 : -3 }, { id: uid(), type: 'sticker', ch: ['♥', '✿', '★'][i], x: .78, y: .1, w: .12, r: 10 }] })),
      { items: [{ id: uid(), type: 'letter', text: 'Привет, любимая. Я скучаю по тебе каждый день…', songs: [], x: .18, y: .25, w: .64, r: -2 }] },
    ];
    while (np.length < 6) np.push({ items: [] });
    save({ pages: np }); setSpread(1); burst({ n: 60 }); toast('Книга заполнена вашими именами и лентами');
  };
  const Page = ({ pi, side }) => {
    if (pi === 'cover') return <Cover T={T} book={book} save={save} />;
    if (pi === null || pi === undefined) return <div style={{ width: '100%', height: '100%', background: '#3a302a' }} />;
    const page = pages[pi]; if (!page) return <div style={{ width: '100%', height: '100%', background: T.bg, opacity: .6 }} />;
    return <BookPage T={T} page={page} pi={pi} side={side} sel={sel} setSel={setSel} setPage={setPage} openLetter={(it) => setLetterOpen({ pi, it })} />;
  };
  // листание перетаскиванием
  const dragX = useRef(null);
  return <div className="page" style={{ maxWidth: 1240 }}>
    <div className="row wrap" style={{ marginBottom: 18 }}><button className="back" style={{ border: 0, background: 'none', margin: 0 }} onClick={onClose}>← Все книги</button><span className="spacer" />
      <PartnerStatus /></div>
    <div className="row wrap" style={{ gap: 8, marginBottom: 18 }}>
      <button className="btn sm" onClick={fillForMe}>✨ Заполнить за меня</button>
      <PickPhotos className="btn sm ghost" onPick={(ids) => ids.forEach((id) => addItem({ type: 'photo', img: id, w: .5 }))}>+ Фото</PickPhotos>
      <StripPicker onPick={(s) => addItem({ type: 'strip', img: s.img, w: s.layout === '2x2' ? .6 : .32 })} />
      <button className="btn sm ghost" onClick={() => addItem({ type: 'text', text: 'Напиши что-нибудь…', size: 28, w: .6 })}>+ Текст от руки</button>
      <button className="btn sm ghost" onClick={() => addItem({ type: 'map', w: .8, x: .1 })}>+ Карта двух городов</button>
      <button className="btn sm ghost" onClick={() => addItem({ type: 'letter', text: '', songs: [], w: .6 })}>+ Письмо с музыкой</button>
      <VideoAdd onAdd={(v) => addItem({ type: 'video', src: v, w: .6 })} />
      <div className="row" style={{ gap: 4 }}>{DATA.stickers.slice(0, 8).map((s) => <button key={s} className="chip" style={{ padding: '4px 8px', fontSize: 18 }} onClick={() => addItem({ type: 'sticker', ch: s, w: .12 })}>{s}</button>)}</div>
    </div>
    <CursorStage id={'book-' + book.id}>
      <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 20px', overflowX: 'auto' }}
        onPointerDown={(e) => { if (e.target.closest('[data-item]') || e.target.closest('button,textarea,input,iframe')) return; dragX.current = e.clientX; }}
        onPointerUp={(e) => { if (dragX.current === null) return; const d = e.clientX - dragX.current; dragX.current = null; if (d < -60) doTurn(1); else if (d > 60) doTurn(-1); }}>
        <div className="book" style={{ position: 'relative', width: PAGE_W * 2, height: PAGE_H, perspective: 2400 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE_H, overflow: 'hidden', borderRadius: '10px 0 0 10px', boxShadow: spread === 0 ? 'none' : 'var(--shadow-lg)', visibility: spread === 0 && !turning ? 'hidden' : 'visible' }}
            onClick={(e) => { if (e.target === e.currentTarget || e.target.dataset.bg) doTurn(-1); }}>
            <Page pi={turning && turning.dir === -1 ? (turning.from - 2 >= 0 ? (turning.from - 2) * 2 : null) : leftIdx} side="L" />
          </div>
          <div style={{ position: 'absolute', left: PAGE_W, top: 0, width: PAGE_W, height: PAGE_H, overflow: 'hidden', borderRadius: '0 10px 10px 0', boxShadow: 'var(--shadow-lg)' }}>
            <Page pi={turning && turning.dir === 1 ? (turning.from) * 2 + 1 < pages.length ? turning.from * 2 + 1 : null : rightIdx} side="R" />
          </div>
          {spread > 0 && <div style={{ position: 'absolute', left: PAGE_W - 14, top: 0, width: 28, height: PAGE_H, background: 'linear-gradient(90deg,transparent,rgba(0,0,0,.18) 45%,rgba(0,0,0,.25) 50%,rgba(0,0,0,.18) 55%,transparent)', pointerEvents: 'none', zIndex: 5 }} />}
          {turning && <TurningLeaf turning={turning} Page={Page} pages={pages} />}
        </div>
      </div>
    </CursorStage>
    <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
      <button className="btn ghost" disabled={spread === 0} onClick={() => doTurn(-1)}>←</button>
      <span className="muted" style={{ fontSize: 13, minWidth: 120, textAlign: 'center' }}>{spread === 0 ? 'Обложка' : `Страницы ${leftIdx + 1}–${leftIdx + 2} из ${pages.length}`}</span>
      <button className="btn ghost" disabled={spread >= nSpreads - 1} onClick={() => doTurn(1)}>→</button>
      <button className="btn sm soft" onClick={() => save({ pages: [...pages, { items: [] }, { items: [] }] })}>+ 2 страницы</button>
    </div>
    <p className="faint center mt8" style={{ fontSize: 12 }}>Нажми или потяни страницу, чтобы перевернуть. Элементы двигаются мышкой; двойной клик — удалить.</p>
    {letterOpen && <LetterModal book={book} pi={letterOpen.pi} itemId={letterOpen.it.id} setPage={setPage} onClose={() => setLetterOpen(null)} />}
  </div>;
}
function TurningLeaf({ turning, Page }) {
  const [go, setGo] = useState(false);
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setGo(true))); }, []);
  const f = turning.from; const fwd = turning.dir === 1;
  // вперёд: лист с правой стороны (front = правая стр. текущего разворота, back = левая следующего)
  const front = fwd ? (f === 0 ? 'cover' : (f - 1) * 2 + 1) : (f - 1) * 2;
  const back = fwd ? f * 2 : (f - 1 === 0 ? 'cover' : (f - 2) * 2 + 1);
  const style = { position: 'absolute', top: 0, width: PAGE_W, height: PAGE_H, left: PAGE_W, transformOrigin: 'left center', transformStyle: 'preserve-3d', transition: 'transform .75s cubic-bezier(.45,.05,.3,1)', zIndex: 10,
    transform: fwd ? (go ? 'rotateY(-180deg)' : 'rotateY(0)') : (go ? 'rotateY(0)' : 'rotateY(-180deg)') };
  return <div style={style}>
    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden', borderRadius: '0 10px 10px 0', boxShadow: '0 10px 40px rgba(0,0,0,.25)' }}><Page pi={fwd ? front : back} side="R" /></div>
    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', overflow: 'hidden', borderRadius: '10px 0 0 10px', boxShadow: '0 10px 40px rgba(0,0,0,.25)' }}><Page pi={fwd ? back : front} side="L" /></div>
  </div>;
}
function Cover({ T, book, save }) {
  const [edit, setEdit] = useState(false);
  return <div style={{ width: '100%', height: '100%', background: T.bg, color: T.ink, padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'inset 14px 0 20px -10px rgba(0,0,0,.25)', position: 'relative' }}>
    <div className="row"><span style={{ width: 14, height: 14, borderRadius: '50%', background: T.accent }} /><span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase' }}>Ислам + Дария</span></div>
    <div>{edit ? <input className="input" autoFocus defaultValue={book.title} onBlur={(e) => { save({ title: e.target.value }); setEdit(false); }} style={{ fontFamily: 'var(--serif)', fontSize: 34 }} />
      : <h1 onDoubleClick={() => setEdit(true)} style={{ fontSize: 58, lineHeight: .95, cursor: 'text' }}>{book.title}</h1>}
      <div className="hand" style={{ fontSize: 28, marginTop: 14, opacity: .8 }}>{DATA.cities.islam.name} ⇄ {DATA.cities.dariya.name}</div></div>
    <div style={{ fontSize: 12, opacity: .6 }}>Двойной клик по названию — изменить · листай →</div>
  </div>;
}
function BookPage({ T, page, pi, side, sel, setSel, setPage, openLetter }) {
  const ref = useRef(); const drag = useRef(null);
  const items = page.items || [];
  const upd = (id, o) => setPage(pi, { items: items.map((it) => it.id === id ? { ...it, ...o } : it) });
  const del = (id) => setPage(pi, { items: items.filter((it) => it.id !== id) });
  return <div ref={ref} data-bg="1" style={{ width: '100%', height: '100%', background: T.bg, position: 'relative', boxShadow: side === 'L' ? 'inset -14px 0 20px -12px rgba(0,0,0,.2)' : 'inset 14px 0 20px -12px rgba(0,0,0,.2)', backgroundImage: 'radial-gradient(rgba(0,0,0,.035) 1px, transparent 1px)', backgroundSize: '5px 5px' }}
    onPointerMove={(e) => { const d = drag.current; if (!d) return; const r = ref.current.getBoundingClientRect(); upd(d.id, { x: Math.max(-.1, Math.min(.95, d.ox + (e.clientX - d.sx) / r.width)), y: Math.max(-.05, Math.min(.95, d.oy + (e.clientY - d.sy) / r.height)) }); }}
    onPointerUp={() => drag.current = null}>
    <div data-bg="1" style={{ position: 'absolute', bottom: 14, [side === 'L' ? 'left' : 'right']: 20, fontSize: 11, color: T.ink, opacity: .5 }}>{pi + 1}</div>
    {items.map((it) => <div key={it.id} data-item="1" onDoubleClick={() => del(it.id)}
      onPointerDown={(e) => { if (e.target.closest('textarea,iframe,button,video')) return; e.stopPropagation(); e.currentTarget.parentElement.setPointerCapture(e.pointerId); drag.current = { id: it.id, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y }; setSel({ pi, id: it.id }); }}
      style={{ position: 'absolute', left: (it.x * 100) + '%', top: (it.y * 100) + '%', width: (it.w * 100) + '%', transform: `rotate(${it.r || 0}deg)`, cursor: 'grab', outline: sel && sel.id === it.id ? '1.5px dashed ' + T.accent : 'none', outlineOffset: 4 }}>
      <BookItem it={it} T={T} upd={(o) => upd(it.id, o)} openLetter={() => openLetter(it)} />
      {sel && sel.id === it.id && <div style={{ position: 'absolute', right: -10, bottom: -10, display: 'flex', gap: 3 }}>
        <button className="chip" style={{ padding: '2px 7px', background: '#fff' }} onClick={() => upd(it.id, { w: Math.max(.08, it.w - .06) })}>−</button>
        <button className="chip" style={{ padding: '2px 7px', background: '#fff' }} onClick={() => upd(it.id, { w: Math.min(1, it.w + .06) })}>+</button>
        <button className="chip" style={{ padding: '2px 7px', background: '#fff' }} onClick={() => upd(it.id, { r: (it.r || 0) + 6 })}>↻</button></div>}
    </div>)}
  </div>;
}
function BookItem({ it, T, upd, openLetter }) {
  if (it.type === 'photo') return <div style={{ background: '#fff', padding: '6px 6px 22px', boxShadow: '0 4px 14px rgba(0,0,0,.18)', position: 'relative' }}><div className="tape" style={{ width: 70, height: 20 }} /><MediaImg id={it.img} style={{ width: '100%', pointerEvents: 'none' }} /></div>;
  if (it.type === 'strip') return <div style={{ position: 'relative', boxShadow: '0 6px 16px rgba(0,0,0,.2)' }}><div className="tape" style={{ width: 60, height: 20, top: -8 }} /><MediaImg id={it.img} style={{ width: '100%', pointerEvents: 'none' }} /></div>;
  if (it.type === 'sticker') return <div style={{ fontSize: `${it.w * PAGE_W}px`, lineHeight: 1, textAlign: 'center', userSelect: 'none' }}>{it.ch}</div>;
  if (it.type === 'text') return <TextItem it={it} T={T} upd={upd} />;
  if (it.type === 'map') return <div style={{ background: '#fff', padding: 6, boxShadow: '0 4px 14px rgba(0,0,0,.15)', position: 'relative' }}><div className="tape" style={{ width: 70, height: 20 }} /><div style={{ pointerEvents: 'none' }}><RealMap height={it.w * PAGE_W * 0.7} /></div>
    <div className="row" style={{ padding: '6px 4px 0', fontSize: 12, color: T.ink }}><b>{DATA.cities.islam.name}</b><span className="spacer" /><span className="hand" style={{ fontSize: 18 }}>{haversine(DATA.cities.islam, DATA.cities.dariya)} км</span><span className="spacer" /><b>{DATA.cities.dariya.name}</b></div></div>;
  if (it.type === 'letter') return <button onClick={openLetter} style={{ border: 0, padding: 0, background: 'none', width: '100%', cursor: 'pointer' }}>
    <div style={{ position: 'relative', width: '100%', aspectRatio: '3/2', background: '#efe1c3', boxShadow: '0 6px 18px rgba(0,0,0,.2)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, transparent 49.5%, #e3d1ab 50%) left/50% 100% no-repeat, linear-gradient(to bottom left, transparent 49.5%, #e3d1ab 50%) right/50% 100% no-repeat' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '55%', background: '#e8d7b4', clipPath: 'polygon(0 0,100% 0,50% 100%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-30%)', width: 36, height: 36, borderRadius: '50%', background: T.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, boxShadow: '0 2px 4px rgba(0,0,0,.3)' }}>♥</div>
      <div className="hand" style={{ position: 'absolute', bottom: 8, width: '100%', textAlign: 'center', fontSize: 18, color: T.ink }}>открой меня{(it.songs || []).length ? ` · ♪ ${it.songs.length}` : ''}</div>
    </div></button>;
  if (it.type === 'video') return <div style={{ background: '#fff', padding: 6, boxShadow: '0 4px 14px rgba(0,0,0,.18)' }}><VideoItem src={it.src} /></div>;
  return null;
}
function VideoItem({ src }) { const s = useMedia(src); return s ? <video src={s} controls playsInline style={{ width: '100%', display: 'block' }} /> : <div className="ph-slot" style={{ aspectRatio: '16/9' }}>видео…</div>; }
function VideoAdd({ onAdd }) {
  const ref = useRef();
  return <><button className="btn sm ghost" onClick={() => ref.current.click()}>+ Видео</button><input ref={ref} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 25e6) { toast('Видео до 25 МБ'); return; } const fr = new FileReader(); fr.onload = async () => onAdd(await Sync.mediaPut(fr.result)); fr.readAsDataURL(f); e.target.value = ''; }} /></>;
}
function TextItem({ it, T, upd }) {
  const [ed, setEd] = useState(false);
  if (ed) return <textarea autoFocus defaultValue={it.text} onBlur={(e) => { upd({ text: e.target.value }); setEd(false); }} style={{ width: '100%', minHeight: 80, fontFamily: 'var(--hand)', fontSize: it.size, color: T.ink, background: 'rgba(255,255,255,.6)', border: '1px dashed ' + T.accent, borderRadius: 6, padding: 4 }} />;
  return <div onClick={(e) => { if (e.detail === 1) setTimeout(() => {}, 0); }} onDoubleClickCapture={(e) => { e.stopPropagation(); setEd(true); }}
    style={{ fontFamily: it.font === 'serif' ? 'var(--serif)' : 'var(--hand)', fontWeight: it.font === 'serif' ? 700 : 500, fontSize: it.size, lineHeight: 1.05, color: T.ink, whiteSpace: 'pre-wrap', userSelect: 'none' }}>{it.text}
    <div style={{ fontFamily: 'var(--sans)', fontSize: 10, opacity: .4, marginTop: 2 }}>двойной клик — править</div></div>;
}
function StripPicker({ onPick }) {
  const [o, setO] = useState(false); const ks = useKeys('strip:'); const strips = ks.map((k) => Sync.get(k)).sort((a, b) => b.t - a.t);
  return <><button className="btn sm ghost" onClick={() => setO(true)}>+ Лента из будки</button>
    {o && <Modal onClose={() => setO(false)} wide><h2 className="h-m">Приклеить ленту скотчем</h2>
      {strips.length === 0 ? <p className="muted mt16">Лент пока нет — сначала сходите в <a href="#/photobooth">фотобудку</a>.</p>
        : <div className="row wrap mt16" style={{ gap: 14 }}>{strips.map((s, i) => <button key={i} style={{ border: 0, background: 'none', padding: 0 }} onClick={() => { onPick(s); setO(false); }}><StripView strip={s} width={s.layout === '2x2' ? 180 : 100} /></button>)}</div>}</Modal>}</>;
}
function LetterModal({ book, pi, itemId, setPage, onClose }) {
  const page = (Sync.get(book.id).pages || [])[pi]; const it = page.items.find((x) => x.id === itemId);
  const [text, setText] = useState(it.text || ''); const [songs, setSongs] = useState(it.songs || []); const [url, setUrl] = useState('');
  const [opened, setOpened] = useState(false);
  useEffect(() => { setTimeout(() => setOpened(true), 80); }, []);
  const save = () => { setPage(pi, { items: page.items.map((x) => x.id === itemId ? { ...x, text, songs } : x) }); onClose(); toast('Письмо сохранено'); };
  const mine = !it.by || it.by === Sync.who;
  return <Modal onClose={save} wide>
    <div style={{ background: '#fbf5e9', borderRadius: 14, padding: 30, transform: opened ? 'none' : 'translateY(40px) scale(.95)', opacity: opened ? 1 : 0, transition: '.5s cubic-bezier(.3,1.3,.6,1)', backgroundImage: 'repeating-linear-gradient(transparent 0 33px, #e8dccd 33px 34px)' }}>
      <div className="eyebrow">Письмо</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Дорогая Дария…" style={{ width: '100%', minHeight: 220, border: 0, background: 'transparent', fontFamily: 'var(--hand)', fontSize: 27, lineHeight: '34px', outline: 'none', resize: 'vertical', marginTop: 8 }} />
      <div className="hand" style={{ textAlign: 'right', fontSize: 24 }}>— {Sync.me.name}</div>
    </div>
    <div className="mt24"><span className="label">Плейлист · до 5 треков (Spotify, YouTube Music, Apple Music)</span>
      <div className="col" style={{ gap: 10 }}>{songs.map((s, i) => { const e = songEmbed(s); return <div key={i} className="row" style={{ alignItems: 'stretch' }}>
        <div style={{ flex: 1 }}>{e && e.src ? <iframe src={e.src} style={{ width: '100%', height: e.h, border: 0, borderRadius: 12 }} allow="autoplay; clipboard-write; encrypted-media" loading="lazy" /> : <a href={s} target="_blank">{s}</a>}</div>
        <button className="btn sm soft" onClick={() => setSongs(songs.filter((_, k) => k !== i))}>✕</button></div>; })}</div>
      {songs.length < 5 && <div className="row mt16"><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Вставь ссылку на трек" /><button className="btn" disabled={!url} onClick={() => { setSongs([...songs, url]); setUrl(''); }}>Добавить</button></div>}
    </div>
    <div className="row mt24"><button className="btn lg" onClick={save}>Запечатать письмо</button></div>
  </Modal>;
}

Object.assign(window, { Scrapbook });

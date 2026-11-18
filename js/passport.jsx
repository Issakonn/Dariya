/* Паспорт поездок: дашборд Лодзь ⇄ Шмалькальден, карта мест, штампы, планировщик трипов с копилкой */
async function geocode(q) {
  try { const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru&q=' + encodeURIComponent(q)); const d = await r.json(); return d[0] ? { lat: +d[0].lat, lon: +d[0].lon, name: d[0].display_name.split(',')[0] } : null; } catch (e) { return null; }
}
const STAMP_COLORS = ['#b8433a', '#2f5d8a', '#3d6b48', '#8c5bb0', '#c47a1d', '#2a221d'];

function Stamp({ p, onClick, i = 0 }) {
  const [data] = useStore('stampdata:' + p.id, {});
  const shape = p.shape || ['circle', 'rect', 'oval'][i % 3];
  const c = p.color || STAMP_COLORS[i % STAMP_COLORS.length];
  const rot = ((i * 37) % 17) - 8;
  const date = data.date || p.date;
  const br = shape === 'circle' ? '50%' : shape === 'oval' ? '50% / 40%' : '10px';
  return <button onClick={onClick} className="stamp" style={{ border: 0, background: 'none', padding: 0, transform: `rotate(${rot}deg)`, transition: 'transform .25s cubic-bezier(.3,1.5,.6,1)' }}
    onMouseEnter={(e) => e.currentTarget.style.transform = `rotate(${rot}deg) scale(1.08)`} onMouseLeave={(e) => e.currentTarget.style.transform = `rotate(${rot}deg)`}>
    <div style={{ width: shape === 'oval' ? 170 : 140, height: 140, borderRadius: br, border: `3px solid ${c}`, outline: `1.5px solid ${c}`, outlineOffset: -9, color: c, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, opacity: .88, mixBlendMode: 'multiply', position: 'relative',
      maskImage: 'radial-gradient(circle at 30% 20%, #000 60%, rgba(0,0,0,.75) 61%, #000 75%)', WebkitMaskImage: 'radial-gradient(circle at 30% 20%, #000 60%, rgba(0,0,0,.75) 61%, #000 75%)' }}>
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.2em' }}>{(p.country || 'DE')} · ВЪЕЗД</span>
      <span style={{ fontFamily: 'var(--serif)', fontSize: p.name.length > 9 ? 20 : 26, fontWeight: 700, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '.02em' }}>{p.name}</span>
      <span style={{ fontSize: 16 }}>♥</span>
      <span className="mono" style={{ fontSize: 10 }}>{date ? new Date(date).toLocaleDateString('ru-RU') : 'И + Д'}</span>
    </div>
  </button>;
}

function StampModal({ p, onClose }) {
  const [data, setData] = useStore('stampdata:' + p.id, {});
  const [text, setText] = useState(data.text || '');
  const [lb, setLb] = useState(null);
  const photos = data.photos || [];
  return <Modal onClose={() => { if (text !== (data.text || '')) setData({ ...data, text }); onClose(); }} wide>
    <div className="row"><div><div className="eyebrow">Штамп · {p.country || ''}</div><h2 className="h-l mt8">{p.name}</h2></div><span className="spacer" />
      <input type="date" className="input" style={{ width: 170 }} value={data.date || ''} onChange={(e) => setData({ ...data, date: e.target.value })} /></div>
    <div className="row wrap mt24" style={{ gap: 14 }}>
      {photos.map((id, i) => <div key={id} className="polaroid" style={{ width: 170, transform: `rotate(${(i % 3 - 1) * 3}deg)`, cursor: 'zoom-in' }} onClick={() => setLb(id)}>
        <div className="tape" style={{ width: 60, height: 18 }} /><MediaImg id={id} style={{ width: '100%', aspectRatio: '1' }} />
        <button onClick={(e) => { e.stopPropagation(); setData({ ...data, photos: photos.filter((x) => x !== id) }); }} style={{ position: 'absolute', bottom: 6, right: 8, border: 0, background: 'none', color: 'var(--ink3)', fontSize: 12 }}>убрать</button></div>)}
      <PickPhotos className="ph-slot" onPick={(ids) => setData({ ...data, photos: [...photos, ...ids] })}><span style={{ display: 'grid', placeItems: 'center', width: 150, height: 150 }}>+ наши фото отсюда</span></PickPhotos>
    </div>
    <span className="label mt24" style={{ marginTop: 24 }}>Воспоминание · 2–3 предложения</span>
    <textarea className="input hand" style={{ fontSize: 24, lineHeight: 1.2, minHeight: 110 }} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => setData({ ...data, text })} placeholder="Что мы там делали, что запомнилось…" />
    {data.text && data.by !== undefined && <div className="faint" style={{ fontSize: 12 }}>последним правил(а): {nameOf(data.by)}</div>}
    {lb && <div className="modal-bg" style={{ zIndex: 100 }} onClick={() => setLb(null)}><MediaImg id={lb} style={{ maxWidth: '90vw', maxHeight: '86vh', borderRadius: 8, boxShadow: 'var(--shadow-lg)' }} /></div>}
  </Modal>;
}

function TripCard({ t }) {
  const [open, setOpen] = useState(false);
  const total = (t.deposits || []).reduce((s, d) => s + d.a, 0);
  const days = Math.ceil((new Date(t.start).getTime() - Sync.now()) / 864e5);
  const len = t.end ? Math.max(1, Math.round((new Date(t.end) - new Date(t.start)) / 864e5) + 1) : null;
  const upd = (o) => Sync.set(t.id, { ...Sync.get(t.id), ...o });
  const [item, setItem] = useState('');
  const past = days < -((len || 1));
  return <div className="card" style={{ overflow: 'hidden', opacity: past ? .6 : 1 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', background: past ? 'var(--line)' : 'var(--butter)' }}>
      <div style={{ padding: '18px 22px' }}>
        <div className="eyebrow">{t.who === 'islam' ? 'Ислам едет к Дарии' : t.who === 'dariya' ? 'Дария едет к Исламу' : 'Едем вместе'}</div>
        <div className="h-m mt8">{t.place}</div>
        <div className="mono muted mt8" style={{ fontSize: 13 }}>{new Date(t.start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}{t.end ? ' — ' + new Date(t.end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}{len ? ` · ${len} ${plural(len, 'день', 'дня', 'дней')}` : ''}</div>
      </div>
      <div style={{ borderLeft: '2px dashed rgba(0,0,0,.15)', padding: '18px 22px', textAlign: 'center', minWidth: 110 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 44, fontWeight: 700, lineHeight: 1 }}>{past ? '✓' : Math.max(0, days)}</div>
        <div className="faint" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>{past ? 'были' : plural(Math.max(0, days), 'день', 'дня', 'дней')}</div>
      </div>
    </div>
    <div className="pad col" style={{ gap: 12 }}>
      {t.budget > 0 && <div><div className="row" style={{ fontSize: 13 }}><b>Копилка: {total} € из {t.budget} €</b><span className="spacer" />{['islam', 'dariya'].map((w) => <span key={w} className="row" style={{ gap: 4 }}><Av w={w} size={18} />{(t.deposits || []).filter((d) => d.by === w).reduce((s, d) => s + d.a, 0)} €</span>)}</div>
        <div style={{ height: 8, background: 'var(--line)', borderRadius: 9, overflow: 'hidden', marginTop: 8 }}><div style={{ width: Math.min(100, total / t.budget * 100) + '%', height: '100%', background: 'linear-gradient(90deg,var(--islam),var(--dariya))', transition: '.5s' }} /></div></div>}
      <div className="row wrap">
        {t.budget > 0 && <button className="btn sm" onClick={() => { const a = Number(prompt('Сколько отложить, €?', '20')); if (a > 0) { upd({ deposits: [...(t.deposits || []), { by: Sync.who, a, t: Sync.now() }] }); toast('+' + a + ' € на ' + t.place); } }}>+ Отложить</button>}
        <button className="btn sm ghost" onClick={() => setOpen(!open)}>{open ? 'Свернуть' : 'Список и планы'}</button>
        <span className="spacer" /><button style={{ border: 0, background: 'none', color: 'var(--ink3)', fontSize: 12 }} onClick={() => confirm('Удалить поездку?') && Sync.set(t.id, null)}>удалить</button>
      </div>
      {open && <div className="col" style={{ gap: 8 }}>
        {(t.list || []).map((it, i) => <label key={i} className="row" style={{ fontSize: 14 }}><input type="checkbox" checked={!!it.d} onChange={() => upd({ list: t.list.map((x, k) => k === i ? { ...x, d: !x.d } : x) })} /><span style={{ textDecoration: it.d ? 'line-through' : 'none', flex: 1 }}>{it.t}</span><Av w={it.by} size={18} /></label>)}
        <div className="row"><input className="input" value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && item.trim()) { upd({ list: [...(t.list || []), { t: item, by: Sync.who }] }); setItem(''); } }} placeholder="Билеты, что взять, куда сходить… + Enter" /></div>
        <textarea className="input" defaultValue={t.notes || ''} onBlur={(e) => upd({ notes: e.target.value })} placeholder="Заметки (бронь, адрес, номер поезда)" />
      </div>}
    </div>
  </div>;
}

function NewTrip({ onClose }) {
  const [f, setF] = useState({ place: DATA.cities.dariya.name, start: '', end: '', who: 'islam', budget: 200 });
  return <Modal onClose={onClose}><h2 className="h-m">Новая встреча</h2><div className="col mt16">
    <label><span className="label">Где встречаемся</span><input className="input" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} /></label>
    <div className="row wrap">{[['islam', 'Ислам → Шмалькальден', DATA.cities.dariya.name], ['dariya', 'Дария → Лодзь', DATA.cities.islam.name], ['both', 'Вместе куда-то', '']].map(([k, l, pl]) => <button key={k} className={'chip' + (f.who === k ? ' on' : '')} onClick={() => setF({ ...f, who: k, place: pl || f.place })}>{l}</button>)}</div>
    <div className="row"><label style={{ flex: 1 }}><span className="label">С</span><input className="input" type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
      <label style={{ flex: 1 }}><span className="label">По</span><input className="input" type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label></div>
    <label><span className="label">Бюджет / копилка, € (0 — без копилки)</span><input className="input" type="number" value={f.budget} onChange={(e) => setF({ ...f, budget: +e.target.value })} /></label>
    <button className="btn" disabled={!f.place || !f.start} onClick={() => { Sync.set('trip:' + uid(), { ...f, deposits: [], list: [], by: Sync.who, created: Sync.now() }); onClose(); toast('Встреча в календаре у обоих'); }}>Сохранить</button>
  </div></Modal>;
}

function AddPlace({ onClose }) {
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [date, setDate] = useState('');
  const go = async () => { setBusy(true); const r = await geocode(q); setBusy(false); if (!r) return toast('Не нашёл такой город');
    const id = 'x' + uid(); Sync.set('place:' + id, { name: r.name, lat: r.lat, lon: r.lon, country: '', color: STAMP_COLORS[Math.floor(Math.random() * STAMP_COLORS.length)] });
    if (date) Sync.set('stampdata:' + id, { date }); onClose(); burst({ n: 40 }); toast('Новый штамп: ' + r.name); };
  return <Modal onClose={onClose}><h2 className="h-m">Новый город в паспорте</h2><div className="col mt16">
    <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="Например: Прага" />
    <label><span className="label">Когда были (необязательно)</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
    <button className="btn" disabled={!q || busy} onClick={go}>{busy ? 'Ищем на карте…' : 'Поставить штамп'}</button></div></Modal>;
}

function Passport() {
  useKeys('place:'); useKeys('stampdata:'); const tks = useKeys('trip:');
  const [openP, setOpenP] = useState(null); const [newTrip, setNewTrip] = useState(false); const [addP, setAddP] = useState(false);
  const [focus, setFocus] = useState(null);
  const w = useWeather();
  const places = allPlaces();
  const trips = tks.map((k) => ({ id: k, ...Sync.get(k) })).sort((a, b) => new Date(a.start) - new Date(b.start));
  const upcoming = trips.filter((t) => new Date(t.end || t.start).getTime() + 864e5 > Sync.now());
  const pastT = trips.filter((t) => new Date(t.end || t.start).getTime() + 864e5 <= Sync.now());
  const km = haversine(DATA.cities.islam, DATA.cities.dariya);
  const now = useNow(1000);
  const savedAll = trips.reduce((s, t) => s + (t.deposits || []).reduce((a, d) => a + d.a, 0), 0);
  const travelled = places.reduce((s, p) => s + haversine(DATA.cities.islam, p), 0);
  const P = places.find((x) => x.id === openP);
  return <div className="page">
    <div className="row wrap"><div><div className="eyebrow">Бортовой журнал</div><h1 className="h-xl mt8">Паспорт<br />наших поездок</h1></div><span className="spacer" /><PartnerStatus /></div>

    {/* Дашборд */}
    <section className="card mt32" style={{ overflow: 'hidden', background: '#2f2925', color: '#f3eadf', borderColor: '#2f2925' }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 0 }}>
        {[
          ['Сейчас у нас', new Date(now).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit' }), 'CET · одно время на двоих'],
          ['Между нами', km + ' км', `${DATA.cities.islam.name} ⇄ ${DATA.cities.dariya.name}`],
          [DATA.cities.islam.name + ' · Ислам', w && w.islam ? Math.round(w.islam.temperature_2m) + '° ' + ((WMO_P[w.islam.weather_code] || '')) : '…', 'погода прямо сейчас'],
          [DATA.cities.dariya.name + ' · Дария', w && w.dariya ? Math.round(w.dariya.temperature_2m) + '° ' + ((WMO_P[w.dariya.weather_code] || '')) : '…', 'погода прямо сейчас'],
        ].map(([a, b, c], i) => <div key={i} style={{ padding: '22px 24px', borderLeft: i ? '1px solid #4d443e' : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#c9bcae' }}>{a}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{b}</div>
          <div style={{ fontSize: 12, color: '#a39486' }}>{c}</div></div>)}
      </div>
      <div style={{ borderTop: '1px solid #4d443e', padding: '22px 24px', display: 'flex', gap: 30, alignItems: 'center', flexWrap: 'wrap', background: '#3a322d' }}>
        <div style={{ filter: 'invert(0)' }}><DarkCountdown /></div>
        <span className="spacer" /><button className="btn" style={{ background: '#f3eadf', color: '#2a221d' }} onClick={() => setNewTrip(true)}>+ Запланировать встречу</button>
      </div>
    </section>

    {/* Карта */}
    <section className="grid mt24" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 18 }}>
      <div className="card pad" style={{ padding: 14 }}><RealMap height={440} showPlaces onPlace={(id) => setOpenP(id)} focus={focus} /></div>
      <div className="card pad col" style={{ gap: 14 }}>
        <div className="eyebrow">Где мы уже были вместе</div>
        <div className="h-m">{places.length} {plural(places.length, 'город', 'города', 'городов')}</div>
        <div className="col" style={{ gap: 4, maxHeight: 250, overflow: 'auto' }}>{places.map((p) => <button key={p.id} className="row" onClick={() => setFocus({ ...p, _t: Date.now() })} style={{ border: 0, background: 'none', padding: '8px 4px', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color || 'var(--dariya)' }} /><b style={{ flex: 1 }}>{p.name}</b><span className="mono faint" style={{ fontSize: 12 }}>{haversine(DATA.cities.islam, p)} км от Лодзи</span></button>)}</div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="card pad" style={{ padding: 14, boxShadow: 'none' }}><div className="faint" style={{ fontSize: 11, fontWeight: 700 }}>ОТЛОЖЕНО НА ПОЕЗДКИ</div><div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 700 }}>{savedAll} €</div></div>
          <div className="card pad" style={{ padding: 14, boxShadow: 'none' }}><div className="faint" style={{ fontSize: 11, fontWeight: 700 }}>ВСТРЕЧ В ЖУРНАЛЕ</div><div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 700 }}>{trips.length}</div></div>
        </div>
        <button className="btn ghost" onClick={() => setAddP(true)}>+ Добавить город</button>
      </div>
    </section>

    {/* Штампы */}
    <section className="mt48">
      <div className="eyebrow">Штампы в загранпаспорте</div><h2 className="h-l mt8">Нажми на штамп — там наши фото</h2>
      <div style={{ marginTop: 24, background: '#ece3d3', borderRadius: 26, padding: '36px 30px', position: 'relative', boxShadow: 'inset 0 0 0 1px #dcd0bb, var(--shadow)', backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 28px, rgba(120,90,60,.06) 28px 29px), radial-gradient(circle at 50% 50%, rgba(255,255,255,.5), transparent 70%)' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(0,0,0,.06)' }} />
        <div className="row wrap" style={{ gap: 30, justifyContent: 'center' }}>{places.map((p, i) => <Stamp key={p.id} p={p} i={i} onClick={() => setOpenP(p.id)} />)}
          <button onClick={() => setAddP(true)} style={{ width: 140, height: 140, borderRadius: '50%', border: '2px dashed #bfae94', background: 'none', color: '#8a7a64', fontWeight: 700 }}>+ новый<br />штамп</button></div>
        <div className="mono" style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: '#a39486', letterSpacing: '.3em' }}>P&lt;ISLAM&lt;&lt;DARIYA&lt;&lt;&lt;&lt;LODZ&lt;&lt;SCHMALKALDEN&lt;&lt;&lt;&lt;</div>
      </div>
    </section>

    {/* Планировщик */}
    <section className="mt48">
      <div className="row wrap"><div><div className="eyebrow">Планировщик и копилка</div><h2 className="h-l mt8">Следующие встречи</h2></div><span className="spacer" /><button className="btn" onClick={() => setNewTrip(true)}>+ Новая встреча</button></div>
      {upcoming.length === 0 ? <div className="card pad mt24 center"><p className="muted">Пока ничего не запланировано. Самая ближайшая встреча станет обратным отсчётом на главной.</p></div>
        : <TripTimeline trips={upcoming} />}
      <div className="grid mt24" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>{upcoming.map((t) => <TripCard key={t.id} t={t} />)}</div>
      {pastT.length > 0 && <><div className="label mt32" style={{ marginTop: 32 }}>Уже были</div><div className="grid mt16" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>{pastT.map((t) => <TripCard key={t.id} t={t} />)}</div></>}
    </section>

    {P && <StampModal p={P} onClose={() => setOpenP(null)} />}
    {newTrip && <NewTrip onClose={() => setNewTrip(false)} />}
    {addP && <AddPlace onClose={() => setAddP(false)} />}
  </div>;
}
const WMO_P = { 0: '☀', 1: '🌤', 2: '⛅', 3: '☁', 45: '🌫', 48: '🌫', 51: '🌦', 53: '🌦', 55: '🌦', 61: '🌧', 63: '🌧', 65: '🌧', 71: '🌨', 73: '🌨', 75: '❄', 80: '🌦', 81: '🌦', 82: '⛈', 95: '⛈' };
function DarkCountdown() { return <div style={{ color: '#f3eadf' }} className="dark-cd"><Countdown /></div>; }
function TripTimeline({ trips }) {
  const t0 = Sync.now(); const last = Math.max(...trips.map((t) => new Date(t.end || t.start).getTime())); const span = Math.max(30 * 864e5, last - t0 + 10 * 864e5);
  const months = []; const d = new Date(t0); d.setDate(1);
  while (d.getTime() < t0 + span) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
  return <div className="card pad mt24" style={{ padding: '26px 24px 18px' }}>
    <div style={{ position: 'relative', height: 70 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 30, height: 2, background: 'var(--line2)' }} />
      {months.map((m, i) => { const x = Math.max(0, (m.getTime() - t0) / span * 100); return <div key={i} style={{ position: 'absolute', left: x + '%', top: 40, fontSize: 11, color: 'var(--ink3)', fontWeight: 700 }}>{m.toLocaleDateString('ru-RU', { month: 'short' })}</div>; })}
      <div style={{ position: 'absolute', left: 0, top: 22, width: 18, height: 18, borderRadius: '50%', background: 'var(--ink)', border: '3px solid var(--paper)' }} title="сегодня" />
      <div style={{ position: 'absolute', left: 0, top: 0, fontSize: 11, fontWeight: 800 }}>сегодня</div>
      {trips.map((t) => { const a = (new Date(t.start).getTime() - t0) / span * 100, b = ((new Date(t.end || t.start).getTime() + 864e5) - t0) / span * 100;
        return <div key={t.id} style={{ position: 'absolute', left: Math.max(0, a) + '%', width: Math.max(1.2, b - Math.max(0, a)) + '%', top: 24, height: 14, borderRadius: 8, background: t.who === 'islam' ? 'var(--islam)' : t.who === 'dariya' ? 'var(--dariya)' : 'linear-gradient(90deg,var(--islam),var(--dariya))' }} title={t.place}>
          <span className="hand" style={{ position: 'absolute', bottom: 16, left: 0, whiteSpace: 'nowrap', fontSize: 20 }}>{t.place}</span></div>; })}
    </div>
  </div>;
}

Object.assign(window, { Passport, geocode });

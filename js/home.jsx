/* Главная: отсчёт, карта, погода, путь, вопрос дня, моменты, дерево, записки */
function haversine(a, b) {
  const R = 6371, toR = (x) => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
const WMO = { 0: ['Ясно', '☀'], 1: ['Почти ясно', '🌤'], 2: ['Облачно', '⛅'], 3: ['Пасмурно', '☁'], 45: ['Туман', '🌫'], 48: ['Изморозь', '🌫'], 51: ['Морось', '🌦'], 53: ['Морось', '🌦'], 55: ['Морось', '🌦'], 61: ['Дождь', '🌧'], 63: ['Дождь', '🌧'], 65: ['Ливень', '🌧'], 66: ['Ледяной дождь', '🌧'], 67: ['Ледяной дождь', '🌧'], 71: ['Снег', '🌨'], 73: ['Снег', '🌨'], 75: ['Снегопад', '❄'], 77: ['Снег', '🌨'], 80: ['Ливни', '🌦'], 81: ['Ливни', '🌦'], 82: ['Ливни', '⛈'], 85: ['Снег', '🌨'], 86: ['Снег', '❄'], 95: ['Гроза', '⛈'], 96: ['Гроза', '⛈'], 99: ['Гроза', '⛈'] };
function useWeather() {
  const [w, setW] = useState(null);
  useEffect(() => {
    const c = DATA.cities;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.islam.lat},${c.dariya.lat}&longitude=${c.islam.lon},${c.dariya.lon}&current=temperature_2m,weather_code,apparent_temperature,wind_speed_10m&timezone=Europe%2FBerlin`;
    const load = () => fetch(url).then((r) => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : [d];
      setW({ islam: arr[0] && arr[0].current, dariya: arr[1] && arr[1].current });
    }).catch(() => setW({ err: true }));
    load(); const i = setInterval(load, 10 * 60 * 1000); return () => clearInterval(i);
  }, []);
  return w;
}

function nextMeeting() {
  const trips = Sync.keys('trip:').map((k) => ({ id: k, ...Sync.get(k) })).filter((t) => t.start && new Date(t.start).getTime() > Sync.now() - 86400000 * 0.5);
  trips.sort((a, b) => new Date(a.start) - new Date(b.start));
  return trips[0] || null;
}

function Countdown({ big }) {
  useKeys('trip:');
  const now = useNow(1000);
  const t = nextMeeting();
  if (!t) return <div className="col" style={{ gap: 10 }}>
    <div className="eyebrow">До нашей следующей встречи</div>
    <p className="muted" style={{ margin: 0 }}>Дата ещё не выбрана.</p>
    <a className="btn sm" href="#/passport" style={{ alignSelf: 'flex-start' }}>Запланировать встречу</a>
  </div>;
  const diff = Math.max(0, new Date(t.start).getTime() - now);
  const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
  const U = (v, l) => <div style={{ textAlign: 'center', minWidth: big ? 74 : 54 }}>
    <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: big ? 68 : 44, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{String(v).padStart(2, '0')}</div>
    <div className="faint" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4 }}>{l}</div>
  </div>;
  return <div className="col" style={{ gap: 12 }}>
    <div className="eyebrow">До нашей следующей встречи</div>
    <div className="row" style={{ gap: 6, alignItems: 'flex-start' }}>{U(d, plural(d, 'день', 'дня', 'дней'))}<b style={{ fontSize: big ? 50 : 34, fontFamily: 'var(--serif)', opacity: .3 }}>:</b>{U(h, 'час')}<b style={{ fontSize: big ? 50 : 34, fontFamily: 'var(--serif)', opacity: .3 }}>:</b>{U(m, 'мин')}<b style={{ fontSize: big ? 50 : 34, fontFamily: 'var(--serif)', opacity: .3 }}>:</b>{U(s, 'сек')}</div>
    <div style={{ fontSize: 15 }}><span className="hand" style={{ fontSize: 24 }}>{t.place}</span> <span className="muted">· {new Date(t.start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}</span></div>
  </div>;
}

/* Карта: Leaflet + OSM-тайлы (реальная география) */
function RealMap({ height = 300, showPlaces = false, onPlace, focus }) {
  const ref = useRef(); const mapRef = useRef();
  useKeys('stamp:');
  useEffect(() => {
    if (!window.L || mapRef.current) return;
    const c = DATA.cities;
    const map = L.map(ref.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, © CARTO', subdomains: 'abcd', maxZoom: 18 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;
    const mk = (who) => L.marker([c[who].lat, c[who].lon], { icon: L.divIcon({ className: '', html: `<div class="mpin ${who}"><span>${Sync.PEOPLE[who].short}</span><b>${c[who].name}</b></div>`, iconSize: [0, 0] }) }).addTo(map);
    mk('islam'); mk('dariya');
    const line = L.polyline([[c.islam.lat, c.islam.lon], [c.dariya.lat, c.dariya.lon]], { color: '#2a221d', weight: 2, dashArray: '6 8', opacity: .7 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [60, 60] });
    map._di_layer = L.layerGroup().addTo(map);
  }, []);
  useEffect(() => {
    const map = mapRef.current; if (!map || !showPlaces) return;
    map._di_layer.clearLayers();
    const places = allPlaces();
    const pts = [[DATA.cities.islam.lat, DATA.cities.islam.lon], [DATA.cities.dariya.lat, DATA.cities.dariya.lon]];
    places.forEach((p) => {
      pts.push([p.lat, p.lon]);
      const m = L.marker([p.lat, p.lon], { icon: L.divIcon({ className: '', html: `<div class="mplace" style="--c:${p.color}">♥<i>${p.name}</i></div>`, iconSize: [0, 0] }) }).addTo(map._di_layer);
      if (onPlace) m.on('click', () => onPlace(p.id));
    });
    map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 7 });
  });
  useEffect(() => { const map = mapRef.current; if (map && focus) map.flyTo([focus.lat, focus.lon], 9, { duration: 1 }); }, [focus && focus.id]);
  return <div ref={ref} style={{ height, borderRadius: 18, overflow: 'hidden', background: '#e9e4dc' }} />;
}
function allPlaces() {
  const custom = Sync.keys('place:').map((k) => ({ ...Sync.get(k), id: k.slice(6) }));
  const hidden = Sync.get('hiddenPlaces', []);
  return [...DATA.places.filter((p) => !hidden.includes(p.id)), ...custom];
}

function CityTile({ who, w }) {
  const c = DATA.cities[who];
  const now = useNow(1000);
  const cur = w && w[who];
  const [lbl, ic] = cur ? (WMO[cur.weather_code] || ['—', '·']) : ['…', ''];
  const time = new Date(now).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
  return <div className="card pad" style={{ background: who === 'islam' ? 'var(--islam-soft)' : 'var(--dariya-soft)', borderColor: 'transparent', boxShadow: 'none' }}>
    <div className="row"><Av w={who} size={26} /><b>{nameOf(who)}</b><span className="spacer" /><span className="mono faint" style={{ fontSize: 12 }}>{c.country}</span></div>
    <div className="h-m mt16" style={{ fontSize: 30 }}>{c.name}</div>
    <div className="row mt8" style={{ alignItems: 'baseline', gap: 10 }}>
      <span style={{ fontSize: 30 }}>{ic}</span>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 700 }}>{cur ? Math.round(cur.temperature_2m) + '°' : '—'}</span>
      <span className="muted" style={{ fontSize: 13 }}>{lbl}{cur ? ` · ощущ. ${Math.round(cur.apparent_temperature)}°` : ''}</span>
    </div>
    <div className="mono muted mt8" style={{ fontSize: 13 }}>{time} CET</div>
  </div>;
}

function Dashboard() {
  const w = useWeather();
  const km = haversine(DATA.cities.islam, DATA.cities.dariya);
  return <section className="grid mt48" style={{ gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: 18 }} data-screen-label="Дашборд">
    <div className="card pad" style={{ padding: 18 }}>
      <div className="row" style={{ padding: '4px 6px 14px' }}>
        <div><div className="eyebrow">Между нами</div><div className="h-m" style={{ marginTop: 4 }}>{km} км · <span className="hand" style={{ fontSize: 30 }}>{DATA.cities.islam.name} ⇄ {DATA.cities.dariya.name}</span></div></div>
        <span className="spacer" /><a className="btn sm ghost" href="#/passport">Паспорт</a>
      </div>
      <RealMap height={320} />
    </div>
    <div className="col" style={{ gap: 18 }}>
      <div className="card pad"><Countdown big /></div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}><CityTile who="islam" w={w} /><CityTile who="dariya" w={w} /></div>
      {w && w.err && <div className="faint" style={{ fontSize: 12 }}>Погода не загрузилась — нет сети.</div>}
    </div>
  </section>;
}

function PathBar() {
  useKeys('done:');
  const ids = DATA.path;
  const done = ids.filter((id) => Sync.get('done:' + id));
  const nextId = ids.find((id) => !Sync.get('done:' + id));
  return <section className="card pad mt24" data-screen-label="Путь">
    <div className="row wrap"><div><div className="eyebrow">Наш путь</div><div className="h-m mt8">{done.length} из {ids.length} попробовали</div></div><span className="spacer" />
      <div style={{ flex: '0 1 280px', height: 8, borderRadius: 9, background: 'var(--line)', overflow: 'hidden' }}><div style={{ width: (done.length / ids.length * 100) + '%', height: '100%', background: 'linear-gradient(90deg,var(--islam),var(--dariya))', transition: 'width .6s' }} /></div>
    </div>
    <div className="path mt16">
      {ids.map((id, i) => { const a = DATA.activities.find((x) => x.id === id); const isD = !!Sync.get('done:' + id);
        return <React.Fragment key={id}>
          {i > 0 && <div className={'path-line' + (isD ? ' done' : '')} />}
          <a href={a.route} className={'path-node' + (isD ? ' done' : '') + (id === nextId ? ' next' : '')}><div className="path-dot">{isD ? '✓' : i + 1}</div><span>{a.title}</span></a>
        </React.Fragment>; })}
    </div>
  </section>;
}

function TodayQuestion() {
  const day = todayKey();
  const idx = Math.floor(new Date(day).getTime() / 864e5) % DATA.todayQuestions.length;
  const q = DATA.todayQuestions[idx];
  const [mine, setMine] = useStore('tq:' + day + ':' + Sync.who, null);
  const [theirs] = useStore('tq:' + day + ':' + Sync.other, null);
  const [txt, setTxt] = useState('');
  return <div className="card pad" style={{ background: 'var(--butter)', borderColor: 'transparent' }}>
    <div className="eyebrow">Вопрос дня · {new Date(day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
    <h3 className="h-m mt8">{q}</h3>
    {!mine ? <div className="col mt16"><textarea className="input" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={`Ответ ${Sync.them.name === 'Дария' ? 'Дарии' : 'Ислама'} откроется после твоего`} />
      <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={!txt.trim()} onClick={() => setMine(txt.trim())}>Ответить</button></div>
      : <div className="grid mt16" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card pad" style={{ padding: 16 }}><div className="row"><Av w={Sync.who} size={22} /><b style={{ fontSize: 13 }}>Ты</b></div><p className="hand" style={{ fontSize: 24, margin: '8px 0 0', lineHeight: 1.1 }}>{mine}</p></div>
        <div className="card pad" style={{ padding: 16 }}><div className="row"><Av w={Sync.other} size={22} /><b style={{ fontSize: 13 }}>{Sync.them.name}</b></div>
          {theirs ? <p className="hand" style={{ fontSize: 24, margin: '8px 0 0', lineHeight: 1.1 }}>{theirs}</p> : <p className="muted" style={{ margin: '8px 0 0', fontSize: 14 }}>Ещё не ответил{Sync.other === 'dariya' ? 'а' : ''}. Откроется сразу, как напишет.</p>}
        </div>
      </div>}
  </div>;
}

function MomentsCard() {
  const streak = useStreak();
  const day = todayKey();
  const [a] = useStore('moment:' + day + ':' + Sync.who, 0);
  const [b] = useStore('moment:' + day + ':' + Sync.other, 0);
  return <div className="card pad">
    <div className="row"><div className="eyebrow">Моменты в одно касание</div><span className="spacer" /><span className="tag">🔥 {streak} {plural(streak, 'день', 'дня', 'дней')} подряд</span></div>
    <div className="grid mt16" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
      {MOMENTS.map((m) => <button key={m.k} className="card" style={{ padding: '16px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, boxShadow: 'none', transition: '.15s' }}
        onClick={() => sendMoment(m.k)} onPointerDown={(e) => e.currentTarget.style.transform = 'scale(.94)'} onPointerUp={(e) => e.currentTarget.style.transform = ''}>
        <span style={{ fontSize: 30 }}>{m.ch}</span><b style={{ fontSize: 12 }}>{m.label}</b></button>)}
    </div>
    <div className="row mt16" style={{ fontSize: 13 }}>
      <span className="muted">Сегодня: ты — {a || 0}, {Sync.them.name} — {b || 0}.</span><span className="spacer" />
      <a href="#/moments" className="btn sm soft">Селфи / дудл</a>
    </div>
  </div>;
}

/* Дерево отношений: растёт процедурно от очков (игры, фото, цели, моменты) */
function useTreePoints() {
  useKeys('done:'); useKeys('strip:'); useKeys('goal:'); useKeys('mlog:'); useKeys('drawing:');
  const p = Sync.keys('done:').length * 5 + Sync.keys('strip:').length * 4 + Sync.keys('drawing:').length * 2 + Sync.keys('mlog:').length +
    Sync.keys('goal:').reduce((s, k) => s + ((Sync.get(k).checks || []).length), 0) * 2;
  return p;
}
function ConnectionTree({ size = 280 }) {
  const pts = useTreePoints();
  const ref = useRef();
  const level = Math.min(9, 1 + Math.floor(Math.sqrt(pts)));
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d'), dpr = devicePixelRatio || 1, W = size, H = size;
    c.width = W * dpr; c.height = H * dpr; ctx.scale(dpr, dpr);
    let prog = 0, raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); const rnd = seeded('tree-dariya-islam');
      ctx.fillStyle = '#e6d9c6'; ctx.beginPath(); ctx.ellipse(W / 2, H - 14, 80, 9, 0, 0, Math.PI * 2); ctx.fill();
      const leaves = [];
      const br = (x, y, len, ang, d) => {
        if (d > level) return;
        const k = Math.min(1, Math.max(0, prog * level - d + 1));
        const x2 = x + Math.cos(ang) * len * k, y2 = y + Math.sin(ang) * len * k;
        ctx.strokeStyle = '#6b4f3a'; ctx.lineWidth = Math.max(1, (level - d + 1) * 1.6); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
        if (k < 1) return;
        if (d >= level - 2 || d > 3) leaves.push([x2, y2, rnd()]);
        const n = d < 2 ? 2 : (rnd() < .3 ? 3 : 2);
        for (let i = 0; i < n; i++) br(x2, y2, len * (0.68 + rnd() * 0.12), ang + (i - (n - 1) / 2) * (0.5 + rnd() * 0.25) + (rnd() - .5) * .2, d + 1);
      };
      br(W / 2, H - 14, H * 0.2, -Math.PI / 2, 1);
      leaves.forEach(([x, y, r]) => { ctx.fillStyle = r < .5 ? '#e8797d' : r < .8 ? '#8fbf8f' : '#f2c76e'; ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(x, y, 3 + r * 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
      prog = Math.min(1, prog + 0.02); if (prog < 1) raf = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, [level, size]);
  return <div className="card pad center" style={{ background: 'var(--mint)', borderColor: 'transparent' }}>
    <div className="eyebrow">Наше дерево</div>
    <canvas ref={ref} style={{ width: size, height: size, maxWidth: '100%', display: 'block', margin: '6px auto 0' }} />
    <div className="h-s" style={{ fontFamily: 'var(--serif)' }}>Уровень {level}</div>
    <div className="muted" style={{ fontSize: 13 }}>{pts} {plural(pts, 'листик', 'листика', 'листиков')} — растёт от игр, лент, целей и моментов</div>
  </div>;
}

function NotesStrip() {
  const ks = useKeys('note:');
  const notes = ks.map((k) => ({ k, ...Sync.get(k) })).sort((a, b) => b.t - a.t).slice(0, 6);
  if (!notes.length) return null;
  return <section className="mt32"><div className="eyebrow">Записки на холодильнике</div>
    <div className="row wrap mt16" style={{ gap: 16 }}>
      {notes.map((n, i) => <div key={n.k} style={{ background: n.by === 'islam' ? 'var(--islam-soft)' : 'var(--dariya-soft)', padding: '18px 18px 14px', width: 210, transform: `rotate(${(i % 2 ? 1 : -1) * (1 + i % 3)}deg)`, boxShadow: 'var(--shadow)', position: 'relative' }}>
        <div className="tape" style={{ width: 60 }} />
        <p className="hand" style={{ fontSize: 23, lineHeight: 1.1, margin: 0 }}>{n.text}</p>
        <div className="row mt8" style={{ fontSize: 12 }}><span className="muted">— {nameOf(n.by)}</span><span className="spacer" />
          <button style={{ border: 0, background: 'none', fontSize: 12, color: 'var(--ink3)' }} onClick={() => Sync.set(n.k, null)}>убрать</button></div>
      </div>)}
    </div>
  </section>;
}

function Hero() {
  const [hero] = useStore('cfg:hero', {});
  const photoI = hero.islam, photoD = hero.dariya;
  const strips = useKeys('strip:').map((k) => ({ k, ...Sync.get(k) })).sort((a, b) => b.t - a.t);
  const latest = strips[0];
  return <section className="grid" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 40, alignItems: 'center' }} data-screen-label="Главная">
    <div>
      <div className="row" style={{ gap: 10 }}><span className="tag">Для двоих · {DATA.activities.length} занятий</span></div>
      <h1 className="h-xl mt24">Свидания<br />на расстоянии<br /><i style={{ color: 'var(--dariya)' }}>для нас двоих</i></h1>
      <p className="lead mt24">{hero.intro || 'Я сделал это для Дарии. Мы живём между Лодзью и Шмалькальденом, и здесь — свидания и игры, в которые мы правда играем. Одна комната на двоих, с двух устройств, ничего не надо скачивать.'}</p>
      <div className="row mt24 wrap"><a className="btn lg" href="#/photobooth">Открыть фотобудку</a><a className="btn lg ghost" href="#/activity">Выбрать игру на вечер</a></div>
    </div>
    <div style={{ position: 'relative', height: 460 }}>
      <div className="polaroid" style={{ position: 'absolute', left: 0, top: 30, width: '48%', transform: 'rotate(-5deg)' }}>
        <div className="tape" /><MediaImg id={photoI} style={{ width: '100%', aspectRatio: '4/5' }} ph="фото Ислама · Админка" />
        <div className="row" style={{ position: 'absolute', bottom: 8, left: 12, right: 12 }}><b style={{ fontSize: 13 }}>{DATA.cities.islam.name}</b><span className="spacer" /><span className="faint" style={{ fontSize: 12 }}>Польша</span></div>
      </div>
      <div className="polaroid" style={{ position: 'absolute', right: 0, top: 0, width: '48%', transform: 'rotate(4deg)' }}>
        <div className="tape" /><MediaImg id={photoD} style={{ width: '100%', aspectRatio: '4/5' }} ph="фото Дарии · Админка" />
        <div className="row" style={{ position: 'absolute', bottom: 8, left: 12, right: 12 }}><b style={{ fontSize: 13 }}>{DATA.cities.dariya.name}</b><span className="spacer" /><span className="faint" style={{ fontSize: 12 }}>Германия</span></div>
      </div>
      <div style={{ position: 'absolute', left: '50%', top: 150, transform: 'translateX(-50%) rotate(-2deg)', zIndex: 3 }}>
        {latest ? <a href="#/photobooth"><StripView strip={latest} width={120} /></a>
          : <div className="card center" style={{ width: 120, padding: '18px 10px', fontSize: 12 }}><div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700 }}>Ты+Я</div><div className="muted mt8">Здесь будет ваша последняя лента</div></div>}
      </div>
      <div className="hand" style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', fontSize: 28, whiteSpace: 'nowrap', color: 'var(--ink2)' }}>Ислам + Дария</div>
    </div>
  </section>;
}

function Home() {
  return <div className="page">
    <Hero />
    <Dashboard />
    <PathBar />
    <section className="grid mt24" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 18 }}>
      <div className="col" style={{ gap: 18 }}><TodayQuestion /><MomentsCard /></div>
      <ConnectionTree />
    </section>
    <NotesStrip />
    <section className="mt48">
      <div className="row wrap"><div><div className="eyebrow">Занятия вместе, на расстоянии</div><h2 className="h-l mt8">Что делаем сегодня?</h2></div><span className="spacer" /><a className="btn ghost" href="#/activity">Все {DATA.activities.length}</a></div>
      <div className="acts mt24">{DATA.activities.slice(1, 5).map((a) => <ActCard key={a.id} a={a} />)}</div>
    </section>
    <GoalsSection />
  </div>;
}

function ActCard({ a }) {
  const [d] = useStore('done:' + a.id, null);
  return <a href={a.route} className={'act tone-' + a.tone}>
    {d && <span className="done">✓</span>}
    <div>{a.tag && <span className="tag">{a.tag}</span>}</div>
    <div><h3>{a.title}</h3><p>{a.sub}</p></div>
  </a>;
}
function Activity() {
  useKeys('done:');
  return <div className="page">
    <div className="eyebrow">Занятия вместе, на расстоянии</div>
    <h1 className="h-xl mt8">Выбираем<br />на вечер.</h1>
    <p className="lead mt16">Открываешь — и {Sync.them.name} сразу видит то же самое: два курсора, один отсчёт, ответы открываются одновременно.</p>
    <PathBar />
    <div className="acts mt32">{DATA.activities.map((a) => <ActCard key={a.id} a={a} />)}</div>
  </div>;
}

/* ---------- Цели ---------- */
function GoalCard({ g }) {
  const checks = g.checks || [];
  const [photoFor, setPhotoFor] = useState(false);
  const today = todayKey();
  const myToday = checks.find((c) => c.by === Sync.who && c.day === today);
  const by = (w) => checks.filter((c) => c.by === w).length;
  const label = { together: 'Вместе', me: 'Только ' + nameOf(g.owner), saving: 'Копилка', race: 'Гонка · 30 дней' }[g.type];
  const canCheck = g.type !== 'saving' && (g.type !== 'me' || g.owner === Sync.who);
  const total = (g.deposits || []).reduce((s, d) => s + d.a, 0);
  const pct = g.type === 'saving' ? total / (g.target || 1) : g.type === 'race' ? Math.max(by('islam'), by('dariya')) / 30 : checks.length / ((g.target || 30) * (g.type === 'together' ? 2 : 1));
  const winner = g.type === 'race' && (by('islam') >= 30 ? 'islam' : by('dariya') >= 30 ? 'dariya' : null);
  const last = checks.filter((c) => c.photo).slice(-3);
  return <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div className="row"><span className="tag">{label}</span><span className="spacer" />
      <button style={{ border: 0, background: 'none', color: 'var(--ink3)', fontSize: 12 }} onClick={() => confirm('Удалить цель?') && Sync.set(g.id, null)}>удалить</button></div>
    <h3 className="h-s" style={{ fontSize: 26 }}>{g.title}</h3>
    {g.type === 'saving' ? <>
      <div className="row" style={{ alignItems: 'baseline' }}><b style={{ fontFamily: 'var(--serif)', fontSize: 40 }}>{total} €</b><span className="muted">из {g.target} €</span></div>
      <div className="row" style={{ fontSize: 13 }}>{['islam', 'dariya'].map((w) => <span key={w} className="row" style={{ gap: 6 }}><Av w={w} size={20} />{(g.deposits || []).filter((d) => d.by === w).reduce((s, d) => s + d.a, 0)} €</span>)}</div>
    </> : g.type === 'race' ? <div className="col" style={{ gap: 8 }}>{['islam', 'dariya'].map((w) => <div key={w} className="row"><Av w={w} size={22} />
      <div style={{ flex: 1, height: 10, background: 'var(--line)', borderRadius: 9, overflow: 'hidden' }}><div style={{ width: Math.min(100, by(w) / 30 * 100) + '%', height: '100%', background: colorOf(w), transition: '.5s' }} /></div><b style={{ width: 40, textAlign: 'right' }}>{by(w)}/30</b></div>)}
      {winner && <div className="hand" style={{ fontSize: 24 }}>{nameOf(winner)} дошёл(ла) первым — выбирает приз!</div>}</div>
      : <div className="row" style={{ fontSize: 13 }}>{(g.type === 'together' ? ['islam', 'dariya'] : [g.owner]).map((w) => <span key={w} className="row" style={{ gap: 6 }}><Av w={w} size={20} />{by(w)} / {g.target}</span>)}</div>}
    {g.type !== 'race' && <div style={{ height: 8, background: 'var(--line)', borderRadius: 9, overflow: 'hidden' }}><div style={{ width: Math.min(100, pct * 100) + '%', height: '100%', background: 'var(--ink)', transition: '.5s' }} /></div>}
    {last.length > 0 && <div className="row" style={{ gap: 6 }}>{last.map((c, i) => <MediaImg key={i} id={c.photo} style={{ width: 46, height: 46, borderRadius: 10 }} />)}</div>}
    {canCheck && (myToday ? <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Сегодня отмечено ✓</div>
      : <PickPhotos multiple={false} className="btn sm" onPick={([pid]) => { Sync.set(g.id, { ...g, checks: [...checks, { by: Sync.who, day: today, photo: pid, t: Sync.now() }] }); toast('Отмечено — ' + Sync.them.name + ' уже видит'); }}>Отметить с фото-отчётом</PickPhotos>)}
    {g.type === 'saving' && <button className="btn sm" onClick={() => { const a = Number(prompt('Сколько положить, €?', '50')); if (a > 0) Sync.set(g.id, { ...g, deposits: [...(g.deposits || []), { by: Sync.who, a, t: Sync.now() }] }); }}>Положить деньги</button>}
  </div>;
}
function GoalsSection({ full }) {
  const ks = useKeys('goal:');
  const goals = ks.map((k) => ({ id: k, ...Sync.get(k) })).sort((a, b) => b.created - a.created);
  return <section className={full ? '' : 'mt48'}>
    {!full && <div className="row wrap"><div><div className="eyebrow">Каждая цель — карточка</div><h2 className="h-l mt8">Цели и копилка</h2></div><span className="spacer" /><a className="btn ghost" href="#/goals">Открыть все</a></div>}
    {goals.length === 0 ? <div className="card pad mt24 center"><p className="muted">Целей пока нет. Нажми круглый <b>+</b> внизу справа — цель сразу появится у обоих.</p></div>
      : <div className="grid mt24" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))' }}>{goals.slice(0, full ? 99 : 3).map((g) => <GoalCard key={g.id} g={g} />)}</div>}
  </section>;
}
function GoalsPage() {
  return <div className="page"><a className="back" href="#/">← Главная</a><div className="eyebrow">Вместе · Только я · Копилка · Гонка</div><h1 className="h-xl mt8">Наши цели</h1>
    <p className="lead mt16">Отмечаешь с фото — {Sync.them.name} видит сразу. В гонке первый, кто дойдёт до 30 дней, выбирает приз.</p>
    <div className="row mt16 wrap">{[['goal', 'Новая цель'], ['saving', 'Копилка'], ['habit', 'Привычка']].map(([k, l]) => <QuickBtn key={k} k={k} l={l} />)}</div>
    <div className="mt24"><GoalsSection full /></div></div>;
}
function QuickBtn({ k, l }) { const [o, setO] = useState(false); return <><button className="btn ghost sm" onClick={() => setO(true)}>+ {l}</button>{o && <QuickAdd kind={k} onClose={() => setO(false)} />}</>; }

/* ---------- Моменты: селфи и дудл ---------- */
function MomentsPage() {
  const ks = useKeys('mlog:');
  const log = ks.map((k) => ({ k, ...Sync.get(k) })).sort((a, b) => b.t - a.t).slice(0, 40);
  const cv = useRef(); const drawing = useRef(false);
  useEffect(() => { const c = cv.current; c.width = 600; c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#fffaf3'; x.fillRect(0, 0, 600, 400); }, []);
  const pt = (e) => { const r = cv.current.getBoundingClientRect(); return [(e.clientX - r.left) * 600 / r.width, (e.clientY - r.top) * 400 / r.height]; };
  const sendDoodle = async () => { const id = await Sync.mediaPut(cv.current.toDataURL('image/png')); Sync.set('mlog:' + uid(), { k: 'doodle', by: Sync.who, t: Sync.now(), img: id }); Sync.sendEph('doodle-moment', {}); toast('Дудл отправлен'); const x = cv.current.getContext('2d'); x.fillStyle = '#fffaf3'; x.fillRect(0, 0, 600, 400); };
  return <div className="page"><a className="back" href="#/">← Главная</a><h1 className="h-l">Моменты</h1>
    <div className="grid mt24" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 18 }}>
      <div className="card pad"><div className="eyebrow">Быстрый дудл</div>
        <canvas ref={cv} style={{ width: '100%', aspectRatio: '3/2', borderRadius: 14, border: '1px solid var(--line)', touchAction: 'none', marginTop: 12, cursor: 'crosshair' }}
          onPointerDown={(e) => { drawing.current = pt(e); }} onPointerUp={() => drawing.current = false} onPointerLeave={() => drawing.current = false}
          onPointerMove={(e) => { if (!drawing.current) return; const p = pt(e); const x = cv.current.getContext('2d'); x.strokeStyle = Sync.who === 'islam' ? '#4b74b0' : '#d7646a'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(...drawing.current); x.lineTo(...p); x.stroke(); drawing.current = p; }} />
        <div className="row mt16"><button className="btn" onClick={sendDoodle}>Отправить</button>
          <PickPhotos multiple={false} onPick={([id]) => { Sync.set('mlog:' + uid(), { k: 'selfie', by: Sync.who, t: Sync.now(), img: id }); Sync.sendEph('moment', { k: 'think' }); toast('Селфи отправлено'); }}>Селфи</PickPhotos></div>
      </div>
      <div className="card pad"><div className="eyebrow">Лента</div>
        <div className="col mt16" style={{ maxHeight: 460, overflow: 'auto' }}>
          {log.length === 0 && <p className="muted">Пока пусто.</p>}
          {log.map((m) => { const mm = MOMENTS.find((x) => x.k === m.k); return <div key={m.k} className="row" style={{ alignItems: 'flex-start' }}><Av w={m.by} size={26} />
            <div><div style={{ fontSize: 14 }}><b>{nameOf(m.by)}</b> {mm ? mm.msg.replace('тебя', '').replace('тебе', '') + ' ' + mm.ch : m.k === 'doodle' ? 'прислал(а) дудл' : 'прислал(а) селфи'}</div>
              <div className="faint" style={{ fontSize: 12 }}>{new Date(m.t).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              {m.img && <MediaImg id={m.img} style={{ width: 200, borderRadius: 10, marginTop: 6 }} />}</div></div>; })}
        </div></div>
    </div></div>;
}

Object.assign(window, { Home, Activity, GoalsPage, MomentsPage, Countdown, RealMap, allPlaces, haversine, ConnectionTree, ActCard, nextMeeting, useWeather });

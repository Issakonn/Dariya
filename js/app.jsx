/* Каркас: кто ты (один раз), верхняя навигация, роутер */
function Welcome() {
  const [pick, setPick] = useState(null);
  const [code, setCode] = useState(Sync.room);
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
    <div style={{ maxWidth: 620, width: '100%', textAlign: 'center' }}>
      <div className="brand" style={{ justifyContent: 'center', fontSize: 34 }}>Dariya <i>&</i> Islam</div>
      <h1 className="h-xl mt24" style={{ fontSize: 'clamp(42px,7vw,72px)' }}>Кто ты?</h1>
      <p className="lead" style={{ margin: '14px auto 0' }}>Этот сайт только для нас двоих. Выбери себя один раз — устройство запомнит навсегда.</p>
      <div className="row mt32" style={{ justifyContent: 'center', gap: 18 }}>
        {['islam', 'dariya'].map((w) => <button key={w} onClick={() => setPick(w)} className="card" style={{ width: 220, padding: '28px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, border: pick === w ? '2.5px solid var(--ink)' : '1px solid var(--line)', transform: pick === w ? 'translateY(-4px) rotate(' + (w === 'islam' ? -1.5 : 1.5) + 'deg)' : 'none', transition: '.25s cubic-bezier(.3,1.4,.6,1)', background: w === 'islam' ? 'var(--islam-soft)' : 'var(--dariya-soft)' }}>
          <Av w={w} size={74} />
          <div style={{ fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 700 }}>{nameOf(w)}</div>
          <div className="muted" style={{ fontSize: 13 }}>{DATA.cities[w].name}, {DATA.cities[w].country}</div>
        </button>)}
      </div>
      <div className="row mt32" style={{ justifyContent: 'center' }}>
        <span className="label" style={{ margin: 0 }}>Код комнаты</span>
        <input className="input mono" style={{ width: 150, textAlign: 'center', fontSize: 20, letterSpacing: '.25em' }} maxLength={5} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
      </div>
      <button className="btn lg mt24" disabled={!pick || code.length !== 5} onClick={() => Sync.setWho(pick, code)}>Войти как {pick ? nameOf(pick) : '…'}</button>
      <p className="faint mt16" style={{ fontSize: 12 }}>Код должен быть одинаковым у обоих — по нему ваши устройства находят друг друга.</p>
    </div>
  </div>;
}

const NAV = [['#/', 'Главная'], ['#/activity', 'Игры'], ['#/photobooth', 'Фотобудка'], ['#/scrapbook', 'Скрапбук'], ['#/passport', 'Паспорт'], ['#/goals', 'Цели']];
function TopBar({ route }) {
  const base = '#/' + route.replace('#/', '').split('/')[0];
  const gameRoutes = DATA.activities.map((a) => a.route);
  const isOn = (h) => h === base || (h === '#/activity' && gameRoutes.includes(base) && base !== '#/photobooth');
  return <header className="topbar">
    <a href="#/" className="brand">Dariya <i>&</i> Islam</a>
    <nav className="nav">{NAV.map(([h, l]) => <a key={h} href={h} className={isOn(h) ? 'on' : ''}>{l}</a>)}</nav>
    <PartnerStatus />
    <a href="#/admin" className="btn sm soft" title="Настройки" style={{ padding: '8px 11px' }}>⚙</a>
  </header>;
}
function NetBanner() {
  const [, f] = useState(0); useEffect(() => Sync.on('__net', () => f((x) => x + 1)), []);
  return null;
}

function Router({ route }) {
  const r = route.replace('#/', '').split('?')[0].split('/')[0];
  const map = {
    '': Home, activity: Activity, photobooth: Photobooth, scrapbook: Scrapbook, passport: Passport, goals: GoalsPage, moments: MomentsPage, admin: Admin,
    quiz: Quiz, draw: DrawTogether, arcade: Arcade, movies: MovieMatch, dare: Dare, escape: Escape, debate: Debate, court: Court,
    match: Match, iq: IQDuel, hue: HueGame, snap: SnapHunt, riddle: Riddles, lab: Lab, future: Future,
  };
  const C = map[r] || Home;
  return <div key={r} style={{ animation: 'pageIn .45s cubic-bezier(.3,1.1,.5,1)' }}><C /></div>;
}

/* Следовать за партнёром: если партнёр открыл игру — предложить зайти тоже */
function FollowPrompt({ route }) {
  const p = usePartner(); const [dismissed, setDismissed] = useState('');
  if (!p.online || !p.route || p.route === route || dismissed === p.route) return null;
  const name = routeName(p.route); if (!name || p.route === '#/' || p.route === '#/admin') return null;
  return <div style={{ position: 'fixed', left: 24, bottom: 24, zIndex: 65, animation: 'rise .3s both' }} className="card pad row">
    <Av w={Sync.other} size={30} online /><div style={{ fontSize: 14 }}><b>{Sync.them.name}</b> сейчас {name.startsWith('в ') || name.startsWith('на ') ? name : 'в «' + name + '»'}</div>
    <a className="btn sm" href={p.route}>Зайти</a><button className="btn sm soft" onClick={() => setDismissed(p.route)}>✕</button>
  </div>;
}

function App() {
  const [, force] = useState(0);
  useEffect(() => Sync.on('__who', () => force((x) => x + 1)), []);
  const route = useRoute();
  if (!Sync.who) return <><Welcome /><Toasts /></>;
  return <>
    <BgCollage />
    <TopBar route={route} />
    <Router route={route} />
    <FollowPrompt route={route} />
    <Fab />
    <MomentReceiver />
    <Toasts />
  </>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

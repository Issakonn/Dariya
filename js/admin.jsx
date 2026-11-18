/* Настройки (админка): кто я, комната, фото на главной, коллаж на фоне, тексты, резервная копия */
const COLLAGE_STYLES = [
  { id: 'scatter', name: 'Россыпь полароидов' },
  { id: 'mosaic', name: 'Мозаика' },
  { id: 'film', name: 'Плёнка по краям' },
  { id: 'hearts', name: 'Облако-сердце' },
  { id: 'single', name: 'Одно фото, размытое' },
];

function BgCollage() {
  const [cfg] = useStore('cfg:bg', { photos: [], style: 'scatter', veil: 0.78, blur: 0 });
  const photos = cfg.photos || [];
  const [vw, setVw] = useState(innerWidth);
  useEffect(() => { const f = () => setVw(innerWidth); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  if (!photos.length) return null;
  const r = seeded('bg' + photos.join());
  const st = cfg.style || 'scatter';
  let tiles = [];
  if (st === 'scatter') {
    const n = Math.max(photos.length, Math.min(18, Math.round(vw / 110)));
    tiles = Array.from({ length: n }, (_, i) => ({ id: photos[i % photos.length], style: { left: (r() * 92 - 4) + '%', top: (r() * 90 - 5) + '%', width: 160 + r() * 90, height: 160 + r() * 90, transform: `rotate(${r() * 30 - 15}deg)` } }));
  } else if (st === 'mosaic') {
    const cols = Math.ceil(vw / 240); const rows = Math.ceil(innerHeight / 240) + 1;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) tiles.push({ id: photos[(y * cols + x) % photos.length], bare: true, style: { left: x * 240, top: y * 240, width: 240, height: 240, padding: 0, boxShadow: 'none' } });
  } else if (st === 'film') {
    const n = Math.ceil(innerHeight / 150) + 1;
    for (let i = 0; i < n; i++) { tiles.push({ id: photos[i % photos.length], bare: true, style: { left: 14, top: i * 150, width: 150, height: 140, padding: 0, border: '6px solid #1c1714' } }); tiles.push({ id: photos[(i + 3) % photos.length], bare: true, style: { right: 14, top: i * 150 + 70, width: 150, height: 140, padding: 0, border: '6px solid #1c1714' } }); }
  } else if (st === 'hearts') {
    const n = Math.max(14, photos.length); const cx = vw / 2, cy = innerHeight / 2, S = Math.min(vw, innerHeight) / 34;
    tiles = Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2; const hx = 16 * Math.sin(t) ** 3, hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); return { id: photos[i % photos.length], style: { left: cx + hx * S - 60, top: cy + hy * S - 60, width: 120, height: 120, transform: `rotate(${r() * 20 - 10}deg)` } }; });
  } else if (st === 'single') {
    tiles = [{ id: photos[0], bare: true, style: { inset: 0, width: '100%', height: '100%', padding: 0, boxShadow: 'none', filter: 'blur(' + (cfg.blur || 8) + 'px)', transform: 'scale(1.1)' } }];
  }
  return <div className="bg-collage" style={{ '--veil': cfg.veil ?? 0.78 }}>
    {tiles.map((t, i) => <div key={i} className="ph" style={Object.assign({ animation: `bgIn .8s ${i * 40}ms both` }, t.bare ? { background: 'transparent' } : {}, t.style)}><MediaImg id={t.id} style={{ width: '100%', height: '100%' }} /></div>)}
  </div>;
}

function Admin() {
  const [bg, setBg] = useStore('cfg:bg', { photos: [], style: 'scatter', veil: 0.78, blur: 8 });
  const [hero, setHero] = useStore('cfg:hero', {});
  const [code, setCode] = useState(Sync.room);
  const [intro, setIntro] = useState(hero.intro || '');
  const resetGames = () => { if (!confirm('Сбросить все текущие игры (не трогает ленты, книги, цели)?')) return; ['quiz:game', 'draw:game', 'hue:game', 'iq:game', 'riddle:game', 'movie:game', 'dare:game', 'esc:game', 'snap:game', 'debate:game', 'court:case', 'match:test', 'arcade:game', 'lab:session', 'booth:state'].forEach((k) => Sync.set(k, null)); toast('Игры сброшены у обоих'); };
  const exportAll = async () => { const store = JSON.parse(localStorage.getItem('di_store') || '{}'); const blob = new Blob([JSON.stringify({ v: 1, store, at: Date.now() })], { type: 'application/json' }); downloadURL(URL.createObjectURL(blob), 'dariya-islam-backup-' + todayKey() + '.json'); };
  const importRef = useRef();
  return <div className="page narrow">
    <a className="back" href="#/">← Главная</a>
    <div className="eyebrow">Только для нас двоих</div><h1 className="h-xl mt8">Настройки</h1>

    <section className="card pad mt32">
      <div className="eyebrow">Кто я на этом устройстве</div>
      <div className="row mt16 wrap">
        {['islam', 'dariya'].map((w) => <div key={w} className={'ready-p' + (Sync.who === w ? ' ok' : '')} style={{ flexDirection: 'row', minWidth: 0 }}><Av w={w} size={34} /><b>{nameOf(w)}</b>{Sync.who === w && <span className="s">это я</span>}</div>)}
        <span className="spacer" /><button className="btn sm ghost" onClick={() => confirm('Сменить человека на этом устройстве?') && Sync.forget()}>Я не {Sync.me.name}</button>
      </div>
      <p className="faint" style={{ fontSize: 13, marginBottom: 0 }}>Устройство запоминает, кто ты, навсегда. Вводить ничего не нужно.</p>
    </section>

    <section className="card pad mt16">
      <div className="eyebrow">Наша комната</div>
      <div className="row mt16"><input className="input mono" style={{ maxWidth: 180, fontSize: 22, letterSpacing: '.2em', textTransform: 'uppercase' }} maxLength={5} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
        <button className="btn" disabled={code.length !== 5 || code === Sync.room} onClick={() => Sync.setRoom(code)}>Сменить</button>
        <span className="muted" style={{ fontSize: 13 }}>Связь: {{ connected: 'напрямую с ' + (Sync.other === 'dariya' ? 'Дарией' : 'Исламом'), searching: 'ищем партнёра…', off: 'выкл', nopeer: 'нет сети' }[Sync.net] || Sync.net}</span></div>
      <p className="faint" style={{ fontSize: 13, marginBottom: 0 }}>5-буквенный код должен совпадать на обоих устройствах. Все данные лежат только у вас двоих и синхронизируются напрямую между вашими устройствами.</p>
    </section>

    <section className="card pad mt16">
      <div className="eyebrow">Фото на главной</div>
      <div className="grid mt16" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {['islam', 'dariya'].map((w) => <div key={w} className="col" style={{ alignItems: 'flex-start' }}>
          <div className="polaroid" style={{ width: 160, transform: `rotate(${w === 'islam' ? -3 : 3}deg)` }}><MediaImg id={hero[w]} style={{ width: '100%', aspectRatio: '4/5' }} ph={'фото: ' + nameOf(w)} /></div>
          <PickPhotos multiple={false} onPick={([id]) => setHero({ ...Sync.get('cfg:hero', {}), [w]: id })}>Фото: {nameOf(w)}</PickPhotos></div>)}
      </div>
      <span className="label" style={{ marginTop: 20 }}>Текст под заголовком</span>
      <textarea className="input" value={intro} onChange={(e) => setIntro(e.target.value)} onBlur={() => setHero({ ...Sync.get('cfg:hero', {}), intro })} placeholder="Я сделал это для Дарии…" />
    </section>

    <section className="card pad mt16">
      <div className="eyebrow">Коллаж на фоне всего сайта</div>
      <p className="muted" style={{ fontSize: 14 }}>Загрузите несколько фото — они разложатся красивым коллажем под всеми страницами.</p>
      <div className="row wrap mt8" style={{ gap: 8 }}>
        {(bg.photos || []).map((id) => <div key={id} style={{ position: 'relative' }}><MediaImg id={id} style={{ width: 74, height: 74, borderRadius: 12 }} />
          <button onClick={() => setBg({ ...bg, photos: bg.photos.filter((x) => x !== id) })} style={{ position: 'absolute', right: -6, top: -6, width: 22, height: 22, borderRadius: '50%', border: 0, background: 'var(--ink)', color: '#fff', fontSize: 11 }}>✕</button></div>)}
        <PickPhotos className="ph-slot" onPick={(ids) => setBg({ ...Sync.get('cfg:bg', bg), photos: [...(Sync.get('cfg:bg', bg).photos || []), ...ids] })}><span style={{ display: 'grid', placeItems: 'center', width: 74, height: 74, borderRadius: 12 }}>+ фото</span></PickPhotos>
      </div>
      <span className="label" style={{ marginTop: 20 }}>Раскладка</span>
      <div className="row wrap">{COLLAGE_STYLES.map((s) => <button key={s.id} className={'chip' + (bg.style === s.id ? ' on' : '')} onClick={() => setBg({ ...bg, style: s.id })}>{s.name}</button>)}</div>
      <span className="label" style={{ marginTop: 20 }}>Насколько приглушить фото · {Math.round((bg.veil ?? .78) * 100)}%</span>
      <input type="range" min="0.3" max="0.95" step="0.01" value={bg.veil ?? .78} onChange={(e) => setBg({ ...bg, veil: +e.target.value })} style={{ width: '100%' }} />
      {bg.style === 'single' && <><span className="label" style={{ marginTop: 14 }}>Размытие · {bg.blur || 8}px</span><input type="range" min="0" max="30" value={bg.blur || 8} onChange={(e) => setBg({ ...bg, blur: +e.target.value })} style={{ width: '100%' }} /></>}
    </section>

    <section className="card pad mt16">
      <div className="eyebrow">Наши города и места</div>
      <p className="muted" style={{ fontSize: 14, margin: '8px 0' }}>Стартовые штампы: Берлин, Франкфурт, Шмалькальден. Новые города добавляются в <a href="#/passport">Паспорте</a>.</p>
      <div className="row wrap">{DATA.places.map((p) => { const hidden = Sync.get('hiddenPlaces', []).includes(p.id); return <button key={p.id} className={'chip' + (hidden ? '' : ' on')} onClick={() => { const h = Sync.get('hiddenPlaces', []); Sync.set('hiddenPlaces', hidden ? h.filter((x) => x !== p.id) : [...h, p.id]); }}>{p.name}</button>; })}
        {Sync.keys('place:').map((k) => <button key={k} className="chip on" onClick={() => confirm('Удалить город?') && Sync.set(k, null)}>{Sync.get(k).name} ✕</button>)}</div>
    </section>

    <section className="card pad mt16">
      <div className="eyebrow">Обслуживание</div>
      <div className="row wrap mt16">
        <button className="btn ghost sm" onClick={resetGames}>Сбросить текущие игры</button>
        <button className="btn ghost sm" onClick={() => { DATA.path.forEach((id) => Sync.set('done:' + id, null)); toast('Путь сброшен'); }}>Сбросить «Наш путь»</button>
        <button className="btn ghost sm" onClick={exportAll}>Скачать резервную копию</button>
        <button className="btn ghost sm" onClick={() => importRef.current.click()}>Загрузить копию</button>
        <input ref={importRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { const d = JSON.parse(t); Object.keys(d.store || {}).forEach((k) => Sync.set(k, d.store[k].v)); toast('Копия загружена'); }); }} />
      </div>
      <p className="faint" style={{ fontSize: 12, marginBottom: 0 }}>Для проверки на одном компьютере: откройте вторую вкладку с <span className="mono">?as={Sync.other}</span> в адресе.</p>
    </section>
  </div>;
}

Object.assign(window, { Admin, BgCollage });

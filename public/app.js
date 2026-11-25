(() => {
const $ = (s) => document.querySelector(s);
const OPOLE = [50.6751, 17.9213];
const FRESH = { high: 'Przed chwilą', medium: 'Kilka minut temu', low: 'Nieaktualne' };
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
                set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
let cid = store.get('cid'); if (!cid) { cid = crypto.randomUUID(); store.set('cid', cid); }
const H = { 'Content-Type': 'application/json', 'x-client-id': cid };

// ---- карта ----
const map = L.map('map', { zoomControl: false }).setView(OPOLE, 13);
let tiles;
const TILES = {
  osm: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap'],
  light: ['https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', '© OpenStreetMap © CARTO'],
  dark: ['https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', '© OpenStreetMap © CARTO'],
};
const setTheme = (t) => {
  if (tiles) map.removeLayer(tiles);
  const [url, attribution] = TILES[t] || TILES.osm;
  tiles = L.tileLayer(url, { maxZoom: 19, attribution }).addTo(map);
};
setTheme(store.get('theme', 'osm'));
const repLayer = L.layerGroup().addTo(map), busLayer = L.layerGroup().addTo(map);
let meMarker, myPos = null, reports = [], buses = [];

// ---- linie i przystanki ----
const LINES = ['1','3','5','7','8','9','10','11','12','13','14','15','16','17','18','21','25','28','30','80','N1','N2','SZ1','SZ2','SZ4','SZ10','SZ20'];
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let lineFilter = '', stops = [], stopsHaveLines = false, stopsMsg = 'Przystanki: ładowanie…';
const passLine = (r) => !lineFilter || r.route === lineFilter;
function chips(box, search, selected, pick) {
  const draw = () => {
    const q = search.value.trim().toUpperCase();
    box.innerHTML = LINES.filter((l) => l.includes(q)).map((l) =>
      `<button type="button" class="chip${selected() === l ? ' on' : ''}" data-l="${l}">${l}</button>`).join('') || '<span class="muted">Brak takiej linii</span>';
  };
  search.oninput = draw;
  box.onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; pick(selected() === b.dataset.l ? '' : b.dataset.l); draw(); };
  draw(); return draw;
}


// ---- вкладки ----
document.querySelectorAll('nav button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
  if (b.dataset.tab === 'map') setTimeout(() => map.invalidateSize(), 50);
});
const gotoTab = (n) => document.querySelector(`nav button[data-tab=${n}]`).click();

// ---- геолокация ----
const geo = () => navigator.geolocation?.watchPosition((p) => {
  myPos = [p.coords.latitude, p.coords.longitude];
  if (!meMarker) meMarker = L.marker(myPos, { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [16, 16] }) }).addTo(map);
  else meMarker.setLatLng(myPos);
  $('#geoState').textContent = 'włączona';
}, () => { $('#geoState').textContent = 'niedostępna'; }, { enableHighAccuracy: true, maximumAge: 5000 });
geo();
$('#geoAsk').onclick = geo;
$('#locate').onclick = () => myPos ? map.flyTo(myPos, 16) : alert('Geolokalizacja niedostępna — zezwól na nią w ustawieniach przeglądarki.');

// ---- отметки ----
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'przed chwilą' : m + ' min temu'; };
const popup = (r) => `<b>Kontrolerów: ${r.count}</b>${r.route ? ' · linia ' + r.route : ''}<br>
  ${FRESH[r.freshness]} · potwierdzono ${ago(r.lastConfirmedAt)}<br>👍 ${r.confirms} · 👎 ${r.denies}<br>
  <button class="btn" onclick="vote('${r.id}','confirm')">Nadal tu są</button>
  <button class="btn ghost" onclick="vote('${r.id}','deny')">Już ich nie ma</button>`;
window.vote = async (id, kind) => {
  const r = await fetch(`/api/reports/${id}/${kind}`, { method: 'POST', headers: H });
  if (!r.ok) alert((await r.json()).error); map.closePopup();
};
let prevIds = new Set();
function renderReports() {
  repLayer.clearLayers();
  reports.filter(passLine).forEach((r) => L.marker([r.lat, r.lon], { icon: L.divIcon({ className: '',
    html: `<div class="kmark ${r.freshness}">🚨</div>`, iconSize: [38, 38] }) }).bindPopup(popup(r)).addTo(repLayer));
  $('#feedList').innerHTML = reports.filter(passLine).sort((a, b) => b.createdAt - a.createdAt).map((r) =>
    `<div class="card"><div><b>Kontrolerów: ${r.count}</b> ${r.route ? `<span class="badge">${r.route}</span>` : ''}
     <div class="muted">${FRESH[r.freshness]} · ${ago(r.lastConfirmedAt)} · 👍${r.confirms} 👎${r.denies}</div></div>
     <button class="btn ghost" onclick="showOn(${r.lat},${r.lon})">Na mapie</button></div>`).join('')
    || '<p class="muted">Brak aktywnych zgłoszeń.</p>';
  if (prevIds.size && store.get('notify', false) && 'Notification' in window && Notification.permission === 'granted')
    reports.filter((r) => !prevIds.has(r.id)).forEach((r) => new Notification('Kanary Opole', { body: `Kontrolerów: ${r.count}${r.route ? ', linia ' + r.route : ''}` }));
  prevIds = new Set(reports.map((r) => r.id));
}
window.showOn = (la, lo) => { gotoTab('map'); map.flyTo([la, lo], 17); };
const es = new EventSource('/api/stream');
es.onmessage = (e) => { reports = JSON.parse(e.data); renderReports(); };

// ---- создание отметки ----
let pickMode = false, picked = null, count = 1;
const open = () => { $('#sheet').hidden = false; $('#err').textContent = ''; updatePlace(); };
const updatePlace = () => { const p = picked || myPos;
  $('#placeInfo').textContent = p ? `Miejsce: ${picked ? 'wybrane na mapie' : 'Twoja lokalizacja'} (${p[0].toFixed(5)}, ${p[1].toFixed(5)})` : 'Lokalizacja nieznana — wskaż miejsce na mapie.'; };
$('#report').onclick = () => { picked = null; open(); };
$('#cancel').onclick = () => { $('#sheet').hidden = true; };
$('#pickOnMap').onclick = () => { $('#sheet').hidden = true; pickMode = true; $('#busStatus').textContent = 'Dotknij mapy, aby wskazać miejsce'; $('#busStatus').className = 'pill'; };
map.on('click', (e) => { if (!pickMode) return; pickMode = false; picked = [e.latlng.lat, e.latlng.lng]; open(); renderBusStatus(); });
$('#plus').onclick = () => $('#cnt').textContent = count = Math.min(10, count + 1);
$('#minus').onclick = () => $('#cnt').textContent = count = Math.max(1, count - 1);
$('#send').onclick = async () => {
  const p = picked || myPos; if (!p) { $('#err').textContent = 'Wskaż miejsce na mapie'; return; }
  const r = await fetch('/api/reports', { method: 'POST', headers: H, body: JSON.stringify({ lat: p[0], lon: p[1], count, route: $('#route').value }) });
  const j = await r.json();
  if (!r.ok) { $('#err').textContent = j.error; return; }
  $('#sheet').hidden = true; $('#route').value = ''; picked = null; map.flyTo(p, 16);
  if (j.merged) alert('Obok jest już takie zgłoszenie — potwierdziliśmy je.');
};

// ---- автобусы (только реальный источник) ----
let busState = { ok: false, msg: 'Ładowanie autobusów…' };
function renderBusStatus() {
  const el = $('#busStatus'); el.className = 'pill ' + (busState.ok ? 'ok' : 'bad'); el.textContent = busState.msg + ' · ' + stopsMsg;
}
async function loadBuses() {
  try {
    const r = await fetch('/api/buses'); const j = await r.json();
    if (!r.ok) { buses = []; busState = { ok: false, msg: 'Pozycje autobusów na mapie: źródło niepodłączone (użyj zakładki Autobusy)' }; }
    else { buses = j.buses; busState = { ok: true, msg: `Autobusów na mapie: ${buses.length} · aktualizacja ${new Date(j.fetchedAt).toLocaleTimeString('pl')}` }; }
  } catch { buses = []; busState = { ok: false, msg: 'Autobusy: brak połączenia z serwerem' }; }
  if (!pickMode) renderBusStatus();
  busLayer.clearLayers();
  buses.forEach((b) => L.marker([b.lat, b.lon], { icon: L.divIcon({ className: '', html: `<div class="bmark">${b.route}</div>`, iconSize: [34, 24] }) })
    .bindPopup(`<b>Linia ${b.route}</b>${b.headsign ? ' → ' + b.headsign : ''}<br>Aktualizacja: ${new Date(b.updatedAt).toLocaleTimeString('pl')}${b.bearing != null ? '<br>Kierunek: ' + Math.round(b.bearing) + '°' : ''}`).addTo(busLayer));
}
loadBuses(); setInterval(loadBuses, 10000);

// ---- настройки ----
$('#setTheme').value = store.get('theme', 'osm');
$('#setTheme').onchange = (e) => { store.set('theme', e.target.value); setTheme(e.target.value); };
$('#setNotify').checked = store.get('notify', false);
$('#setNotify').onchange = async (e) => {
  if (e.target.checked && 'Notification' in window) { const p = await Notification.requestPermission(); e.target.checked = p === 'granted'; }
  else if (e.target.checked) { alert('Przeglądarka nie obsługuje powiadomień.'); e.target.checked = false; }
  store.set('notify', e.target.checked);
};

// ---- wybór linii (formularz + filtr mapy) ----
const drawForm = chips($('#routeChips'), $('#routeSearch'), () => $('#route').value, (v) => { $('#route').value = v; });
$('#report').addEventListener('click', drawForm);
$('#send').addEventListener('click', () => setTimeout(drawForm, 500));
const stopLayer = L.layerGroup(), stopRenderer = L.canvas({ padding: 0.5 });
function renderStops() {
  stopLayer.clearLayers();
  if (map.getZoom() < 14) { if (map.hasLayer(stopLayer)) map.removeLayer(stopLayer); return; }
  if (!map.hasLayer(stopLayer)) stopLayer.addTo(map);
  const b = map.getBounds().pad(0.2);
  stops.filter((s) => b.contains([s.lat, s.lon]) && (!lineFilter || !stopsHaveLines || s.lines.includes(lineFilter))).forEach((s) =>
    L.circleMarker([s.lat, s.lon], { renderer: stopRenderer, radius: 5, weight: 2, color: '#fff', fillColor: '#2f7de1', fillOpacity: 1 })
      .bindPopup(`<b>${esc(s.name)}</b>${s.lines.length ? '<br>Linie: ' + s.lines.map(esc).join(', ') : ''}`).addTo(stopLayer));
}
map.on('moveend zoomend', renderStops);
const drawFilter = chips($('#lineChips'), $('#lineSearch'), () => lineFilter, (v) => {
  lineFilter = v; $('#lineBtn').classList.toggle('on', !!v); renderReports(); renderStops();
  $('#lineNote').textContent = v ? `Pokazuję tylko linię ${v}.` + (stopsHaveLines ? '' : ' Brak danych o liniach na przystankach — przystanki nie są filtrowane.') : 'Wybierz linię, aby pokazać tylko jej zgłoszenia i przystanki.';
});
$('#lineBtn').onclick = () => { $('#linePanel').hidden = !$('#linePanel').hidden; drawFilter(); };
let stopsTries = 0;
async function loadStops() {
  try {
    const j = await (await fetch('/api/stops')).json();
    stops = j.stops || []; stopsHaveLines = stops.some((s) => s.lines.length);
    stopsMsg = stops.length ? `Przystanki: ${stops.length}` : (j.status === 'error' ? 'Przystanki: błąd pobierania danych' : 'Przystanki: ładowanie…');
    renderStops(); if (!pickMode) renderBusStatus();
    if (!stops.length && j.status !== 'error' && ++stopsTries < 20) setTimeout(loadStops, 15000);
  } catch { stopsMsg = 'Przystanki: brak połączenia'; renderBusStatus(); }
}
loadStops();

// ---- офлайн + PWA ----
const off = () => $('#offline').hidden = navigator.onLine;
addEventListener('online', off); addEventListener('offline', off); off();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
})();

(() => {
const $ = (s) => document.querySelector(s);
const OPOLE = [50.6751, 17.9213];
const TTL_MIN = 180; // musi zgadzać się z TTL_MIN w server.js
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
                set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
let cid = store.get('cid'); if (!cid) { cid = crypto.randomUUID(); store.set('cid', cid); }
const H = { 'Content-Type': 'application/json', 'x-client-id': cid };
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let toastT;
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3500); };

// ---- mapa ----
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
const repLayer = L.layerGroup().addTo(map);
let meMarker, myPos = null, reports = [];

// ---- linie i przystanki ----
const LINES = ['1','3','5','7','8','9','10','11','12','13','14','15','16','17','18','21','25','28','30','80','N1','N2','SZ1','SZ2','SZ4','SZ10','SZ20'];
let lineFilter = '', stops = [], stopsHaveLines = false;
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

// ---- zakładki ----
document.querySelectorAll('nav button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
  if (b.dataset.tab === 'map') setTimeout(() => map.invalidateSize(), 50);
});
const gotoTab = (n) => document.querySelector(`nav button[data-tab=${n}]`).click();

// ---- geolokalizacja ----
const geo = () => navigator.geolocation?.watchPosition((p) => {
  myPos = [p.coords.latitude, p.coords.longitude];
  if (!meMarker) meMarker = L.marker(myPos, { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [16, 16] }) }).addTo(map);
  else meMarker.setLatLng(myPos);
  $('#geoState').textContent = 'włączona';
}, () => { $('#geoState').textContent = 'niedostępna'; }, { enableHighAccuracy: true, maximumAge: 5000 });
geo();
$('#geoAsk').onclick = geo;
$('#locate').onclick = () => myPos ? map.flyTo(myPos, 16) : toast('Geolokalizacja niedostępna — zezwól na nią w ustawieniach przeglądarki.');

// ---- zgłoszenia: kolor znaczka zależy od wieku (czerwony -> szary) ----
const ageMin = (r) => (Date.now() - r.lastConfirmedAt) / 60000;
const agoTxt = (m) => { m = Math.round(m); if (m < 1) return 'przed chwilą'; if (m < 60) return m + ' min temu';
  const h = Math.floor(m / 60), mm = m % 60; return h + ' godz.' + (mm ? ' ' + mm + ' min' : '') + ' temu'; };
const freshTxt = (m) => m < 5 ? 'Świeże zgłoszenie' : m < 20 ? 'Kilka minut temu' : m < 60 ? 'Może być nieaktualne' : 'Prawdopodobnie nieaktualne';
function tone(r) {
  const m = ageMin(r), t = Math.min(1, Math.max(0, m / TTL_MIN));
  const s = Math.round(100 - 90 * t), l = Math.round(57 + 3 * t);
  return { m, t, c: `hsl(355 ${s}% ${l}%)`, l: `hsl(355 ${Math.max(10, s - 10)}% ${Math.min(84, l + 24)}%)`,
           o: (1 - 0.4 * t).toFixed(2), g: (1 - Math.min(1, t * 2.5)).toFixed(2), fresh: m < 5 };
}
const GLYPH = '<g transform="translate(0 -2) translate(24 22.5) scale(1.2) translate(-24 -22.5)">' +
  '<path class="ray" d="M24 13.5V11M29.8 15.6l1.6-1.9M18.2 15.6l-1.6-1.9M32.9 20.9l2.4-.4M15.1 20.9l-2.4-.4"/>' +
  '<path class="dome" d="M17.5 27v-4.5a6.5 6.5 0 0 1 13 0V27z"/>' +
  '<path d="M20.6 27v-3.6a3.4 3.4 0 0 1 6.8 0V27z" fill="#fff" fill-opacity=".28"/>' +
  '<path d="M19.6 22.4a4.6 4.6 0 0 1 2.8-4.2" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
  '<rect x="16" y="27" width="16" height="3.6" rx="1.2" fill="#d7def2"/><rect x="14.5" y="30.4" width="19" height="2.6" rx="1.2" fill="#8da0cf"/></g>';
const markerHTML = (r, k) => `<div class="sm${k.fresh ? ' fresh' : ''}" style="--c:${k.c};--l:${k.l};--o:${k.o};--g:${k.g}">${k.fresh ? '<i class="ping"></i>' : ''}` +
  `<svg viewBox="0 0 48 60" aria-hidden="true"><path class="pin" d="M24 58C24 58 4 36 4 22a20 20 0 1 1 40 0c0 14-20 36-20 36z"/>` +
  `<circle cx="24" cy="22" r="16.5" fill="#0a1430" stroke="rgba(255,255,255,.2)"/>${GLYPH}</svg><b class="cnt">${r.count}</b></div>`;
const popup = (r) => { const k = tone(r); return `<div class="pp"><div class="pp-h"><span class="dot" style="background:${k.c}"></span><b>Kontrolerów: ${r.count}</b>${r.route ? ` <span class="badge">${esc(r.route)}</span>` : ''}</div>
  <div class="muted">${freshTxt(k.m)} · potwierdzono ${agoTxt(k.m)}</div>
  <div class="muted">Potwierdzenia: ${r.confirms} · Zaprzeczenia: ${r.denies}</div>
  <div class="pp-a"><button class="btn sm" onclick="vote('${esc(r.id)}','confirm')">Nadal tu są</button>
  <button class="btn ghost sm" onclick="vote('${esc(r.id)}','deny')">Już ich nie ma</button></div></div>`; };
window.vote = async (id, kind) => {
  const r = await fetch(`/api/reports/${id}/${kind}`, { method: 'POST', headers: H });
  map.closePopup();
  toast(r.ok ? 'Dziękujemy za odpowiedź!' : (await r.json()).error);
};
const marks = new Map(), byId = new Map();
let prevIds = new Set();
function renderReports() {
  const list = reports.filter(passLine);
  byId.clear(); reports.forEach((r) => byId.set(r.id, r));
  const ids = new Set(list.map((r) => r.id));
  for (const [id, m] of marks) if (!ids.has(id)) { repLayer.removeLayer(m); marks.delete(id); }
  list.forEach((r) => {
    const k = tone(r);
    const icon = L.divIcon({ className: '', html: markerHTML(r, k), iconSize: [44, 55], iconAnchor: [22, 55], popupAnchor: [0, -50] });
    let m = marks.get(r.id);
    if (!m) { m = L.marker([r.lat, r.lon], { icon }).bindPopup(() => popup(byId.get(r.id) || r)); marks.set(r.id, m); m.addTo(repLayer); }
    else { m.setIcon(icon); if (m.isPopupOpen()) m.getPopup().setContent(popup(r)); }
    m.setZIndexOffset(Math.round((1 - k.t) * 1000));
  });
  $('#feedList').innerHTML = list.sort((a, b) => b.createdAt - a.createdAt).map((r) => { const k = tone(r); return `<div class="card"><div>
    <span class="dot" style="background:${k.c}"></span> <b>Kontrolerów: ${r.count}</b> ${r.route ? `<span class="badge">${esc(r.route)}</span>` : ''}
    <div class="muted">${freshTxt(k.m)} · ${agoTxt(k.m)}</div></div>
    <button class="btn ghost sm" onclick="showOn(${r.lat},${r.lon})">Na mapie</button></div>`; }).join('')
    || '<p class="muted">Brak aktywnych zgłoszeń.</p>';
  if (prevIds.size && store.get('notify', false) && 'Notification' in window && Notification.permission === 'granted')
    reports.filter((r) => !prevIds.has(r.id)).forEach((r) => new Notification('Kanary Opole', { body: `Kontrolerów: ${r.count}${r.route ? ', linia ' + r.route : ''}` }));
  prevIds = new Set(reports.map((r) => r.id));
}
window.showOn = (la, lo) => { gotoTab('map'); map.flyTo([la, lo], 17); };
const es = new EventSource('/api/stream');
es.onmessage = (e) => { reports = JSON.parse(e.data); renderReports(); };
setInterval(renderReports, 60000);

// ---- nowe zgłoszenie ----
let pickMode = false, picked = null, count = 1;
const setPick = (on) => { pickMode = on; $('#hint').hidden = !on; };
const open = () => { $('#sheet').hidden = false; $('#err').textContent = ''; updatePlace(); };
const updatePlace = () => { const p = picked || myPos;
  $('#placeInfo').textContent = p ? `Miejsce: ${picked ? 'wybrane na mapie' : 'Twoja lokalizacja'} (${p[0].toFixed(5)}, ${p[1].toFixed(5)})` : 'Lokalizacja nieznana — wskaż miejsce na mapie.'; };
$('#report').onclick = () => { picked = null; open(); };
$('#cancel').onclick = () => { $('#sheet').hidden = true; };
$('#pickOnMap').onclick = () => { $('#sheet').hidden = true; setPick(true); };
$('#hintCancel').onclick = () => { setPick(false); open(); };
map.on('click', (e) => { if (!pickMode) return; setPick(false); picked = [e.latlng.lat, e.latlng.lng]; open(); });
$('#plus').onclick = () => $('#cnt').textContent = count = Math.min(10, count + 1);
$('#minus').onclick = () => $('#cnt').textContent = count = Math.max(1, count - 1);
$('#send').onclick = async () => {
  const p = picked || myPos; if (!p) { $('#err').textContent = 'Wskaż miejsce na mapie'; return; }
  const r = await fetch('/api/reports', { method: 'POST', headers: H, body: JSON.stringify({ lat: p[0], lon: p[1], count, route: $('#route').value }) });
  const j = await r.json();
  if (!r.ok) { $('#err').textContent = j.error; return; }
  $('#sheet').hidden = true; $('#route').value = ''; picked = null; count = 1; $('#cnt').textContent = 1; map.flyTo(p, 16);
  toast(j.merged ? 'Obok jest już takie zgłoszenie — potwierdziliśmy je.' : 'Zgłoszenie dodane. Dziękujemy!');
};

// ---- ustawienia ----
$('#setTheme').value = store.get('theme', 'osm');
$('#setTheme').onchange = (e) => { store.set('theme', e.target.value); setTheme(e.target.value); };
$('#setNotify').checked = store.get('notify', false);
$('#setNotify').onchange = async (e) => {
  if (e.target.checked && 'Notification' in window) { const p = await Notification.requestPermission(); e.target.checked = p === 'granted'; }
  else if (e.target.checked) { toast('Przeglądarka nie obsługuje powiadomień.'); e.target.checked = false; }
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
    L.circleMarker([s.lat, s.lon], { renderer: stopRenderer, radius: 5, weight: 2, color: '#fff', fillColor: '#2f6bff', fillOpacity: 1 })
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
    renderStops();
    if (!stops.length && j.status !== 'error' && ++stopsTries < 20) setTimeout(loadStops, 15000);
  } catch {}
}
loadStops();

// ---- offline + PWA ----
const off = () => $('#offline').hidden = navigator.onLine;
addEventListener('online', off); addEventListener('offline', off); off();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
})();

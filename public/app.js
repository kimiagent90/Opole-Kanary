(() => {
const $ = (s) => document.querySelector(s);
const t = (k, v) => I18N.t(k, v);
const OPOLE = [50.6751, 17.9213];
const TTL_MIN = 180; // musi zgadzać się z TTL_MIN w server.js
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
                set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
let cid = store.get('cid'); if (!cid) { cid = (crypto.randomUUID && crypto.randomUUID()) || (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)); store.set('cid', cid); }
const H = { 'Content-Type': 'application/json', 'x-client-id': cid };
const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let toastT;
const toast = (m) => { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3500); };
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// ---- API ----
async function api(path, opts = {}) {
  try {
    const r = await fetch(path, { ...opts, headers: H });
    let j = {}; try { j = await r.json(); } catch {}
    return { ok: r.ok, status: r.status, j };
  } catch { return { ok: false, status: 0, j: { error: 'network' } }; }
}
const errTxt = (j) => { const k = 'e_' + (j && j.error); return I18N.has(k) ? t(k, { s: j.retry }) : t('e_generic'); };

// ---- obecność: sygnał życia + stan blokady ----
let me = '', blocked = false;
function setBlocked(b) {
  blocked = b;
  $('#blockedNote').hidden = !b;
  $('#msg').disabled = b; $('#msgSend').disabled = b; $('#nick').disabled = b;
}
async function hb() {
  const r = await api('/api/hb', { method: 'POST', body: JSON.stringify({ standalone: isStandalone(), lang: I18N.lang }) });
  if (r.ok) { if (r.j.me) me = r.j.me; setBlocked(!!r.j.blocked); renderChat(); }
}
hb(); setInterval(hb, 45000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) hb(); });

// ---- mapa ----
const MAXB = L.latLngBounds([50.45, 17.65], [50.9, 18.25]);
const map = L.map('map', { zoomControl: false, zoomSnap: 0.5, zoomDelta: 1, minZoom: 10, maxZoom: 19, maxBounds: MAXB, maxBoundsViscosity: 0.7, wheelPxPerZoomLevel: 90, fadeAnimation: true }).setView(OPOLE, 13);
L.control.zoom({ position: 'bottomleft' }).addTo(map);
let tiles;
const TILES = {
  voyager: ['https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', '© OpenStreetMap © CARTO'],
  osm: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap'],
  light: ['https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', '© OpenStreetMap © CARTO'],
  dark: ['https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', '© OpenStreetMap © CARTO'],
};
const setTheme = (k) => {
  if (tiles) map.removeLayer(tiles);
  const [url, attribution] = TILES[k] || TILES.voyager;
  tiles = L.tileLayer(url, { maxZoom: 19, subdomains: 'abcd', attribution, keepBuffer: 4, updateWhenIdle: false }).addTo(map);
  document.body.dataset.map = k;
};
setTheme(store.get('theme2', 'voyager'));
const repLayer = L.layerGroup().addTo(map);
let meMarker, myPos = null, reports = [], loaded = false;

// ---- linie i przystanki ----
const LINES = ['1','3','5','7','8','9','10','11','12','13','14','15','16','17','18','21','25','28','30','80','N1','N2','SZ1','SZ2','SZ4','SZ10','SZ20'];
let lineFilter = '', stops = [], stopsHaveLines = false;
const passLine = (r) => !lineFilter || r.route === lineFilter;
function chips(box, search, selected, pick) {
  const draw = () => {
    const q = search.value.trim().toUpperCase();
    box.innerHTML = LINES.filter((l) => l.includes(q)).map((l) =>
      `<button type="button" class="chip${selected() === l ? ' on' : ''}" data-l="${l}">${l}</button>`).join('') || `<span class="muted">${esc(t('no_line'))}</span>`;
  };
  search.oninput = draw;
  box.onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; pick(selected() === b.dataset.l ? '' : b.dataset.l); draw(); };
  draw(); return draw;
}

// ---- zakładki ----
let curTab = 'map';
function gotoTab(n) {
  curTab = n;
  document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('on', x.dataset.tab === n));
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.id === 'tab-' + n));
  if (n === 'map') setTimeout(() => map.invalidateSize(), 50);
  if (n === 'chat') { unread = 0; badge(); setTimeout(() => { const l = $('#chatList'); l.scrollTop = l.scrollHeight; }, 30); }
}
document.querySelectorAll('nav button').forEach((b) => b.onclick = () => gotoTab(b.dataset.tab));
$('#listBtn').onclick = () => gotoTab('feed');

// ---- geolokalizacja ----
let geoKey = '';
const geoText = () => { $('#geoState').textContent = geoKey ? t(geoKey) : '—'; };
const geo = () => navigator.geolocation?.watchPosition((p) => {
  myPos = [p.coords.latitude, p.coords.longitude];
  if (!meMarker) meMarker = L.marker(myPos, { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [16, 16] }), interactive: false, keyboard: false }).addTo(map);
  else meMarker.setLatLng(myPos);
  geoKey = 'geo_on'; geoText();
}, () => { geoKey = 'geo_off'; geoText(); }, { enableHighAccuracy: true, maximumAge: 5000 });
geo();
$('#geoAsk').onclick = geo;
$('#locate').onclick = () => myPos ? map.flyTo(myPos, 16) : toast(t('geo_toast'));

// ---- zgłoszenia: kolor znaczka zależy od wieku (czerwony -> szary) ----
const ageMin = (r) => (Date.now() - r.lastConfirmedAt) / 60000;
const agoTxt = (m) => { m = Math.round(m); if (m < 1) return t('ago_now'); if (m < 60) return t('ago_min', { n: m });
  const h = Math.floor(m / 60), mm = m % 60; return mm ? t('ago_hm', { h, m: mm }) : t('ago_h', { h }); };
const freshTxt = (m) => t(m < 5 ? 'fresh1' : m < 20 ? 'fresh2' : m < 60 ? 'fresh3' : 'fresh4');
function tone(r) {
  const m = ageMin(r), k = Math.min(1, Math.max(0, m / TTL_MIN));
  const s = Math.round(100 - 90 * k), l = Math.round(57 + 3 * k);
  return { m, t: k, c: `hsl(355 ${s}% ${l}%)`, l: `hsl(355 ${Math.max(10, s - 10)}% ${Math.min(84, l + 24)}%)`,
           o: (1 - 0.4 * k).toFixed(2), g: (1 - Math.min(1, k * 2.5)).toFixed(2), fresh: m < 5 };
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
const popup = (r) => { const k = tone(r); return `<div class="pp"><div class="pp-h"><span class="dot" style="background:${k.c}"></span><b>${esc(t('pp_count', { n: r.count }))}</b>${r.route ? ` <span class="badge">${esc(t('pp_line', { n: r.route }))}</span>` : ''}</div>${r.comment ? `<div class="pp-c">${esc(r.comment)}</div>` : ''}
  <div class="muted">${esc(freshTxt(k.m))} · ${esc(t('pp_conf', { ago: agoTxt(k.m) }))}</div>
  <div class="muted">${esc(t('pp_votes', { a: r.confirms, b: r.denies }))}</div>
  <div class="pp-a"><button class="btn sm" onclick="vote('${esc(r.id)}','confirm')">${esc(t('still'))}</button>
  <button class="btn ghost sm" onclick="vote('${esc(r.id)}','deny')">${esc(t('gone'))}</button></div></div>`; };
window.vote = async (id, kind) => {
  const r = await api(`/api/reports/${id}/${kind}`, { method: 'POST' });
  map.closePopup();
  toast(r.ok ? t('thanks') : errTxt(r.j));
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
    if (!m) { m = L.marker([r.lat, r.lon], { icon }).bindPopup(() => popup(byId.get(r.id) || r), { minWidth: 250, maxWidth: 300 }); marks.set(r.id, m); m.addTo(repLayer); }
    else { m.setIcon(icon); if (m.isPopupOpen()) m.getPopup().setContent(popup(r)); }
    m.setZIndexOffset(Math.round((1 - k.t) * 1000));
  });
  renderFeed(list);
  // plakietka „dziś nie zauważono kontrolerów” — widoczna, dopóki mapa jest pusta
  $('#noToday').hidden = !loaded || reports.length > 0;
  const lc = $('#listCount'); lc.hidden = !reports.length; lc.textContent = reports.length;
  if (prevIds.size && store.get('notify', false) && 'Notification' in window && Notification.permission === 'granted')
    reports.filter((r) => !prevIds.has(r.id)).forEach((r) => new Notification('Kanary Opole', { body: t('pp_count', { n: r.count }) + (r.route ? ', ' + t('pp_line', { n: r.route }) : '') }));
  prevIds = new Set(reports.map((r) => r.id));
}
function renderFeed(list = reports.filter(passLine)) {
  $('#feedList').innerHTML = [...list].sort((a, b) => b.createdAt - a.createdAt).map((r) => { const k = tone(r); return `<div class="card"><div>
    <span class="dot" style="background:${k.c}"></span> <b>${esc(t('pp_count', { n: r.count }))}</b> ${r.route ? `<span class="badge">${esc(t('pp_line', { n: r.route }))}</span>` : ''}
    ${r.comment ? `<div class="cm">${esc(r.comment)}</div>` : ''}<div class="muted">${esc(freshTxt(k.m))} · ${esc(agoTxt(k.m))}</div></div>
    <button class="btn ghost sm" onclick="showOn(${r.lat},${r.lon})">${esc(t('on_map'))}</button></div>`; }).join('')
    || `<p class="muted">${esc(t('feed_empty'))}</p>`;
}
window.showOn = (la, lo) => { gotoTab('map'); map.flyTo([la, lo], 17); };

// ---- strumień zdarzeń (zgłoszenia + czat) ----
let msgs = [], unread = 0;
const es = new EventSource('/api/stream');
es.addEventListener('reports', (e) => { reports = JSON.parse(e.data); loaded = true; renderReports(); });
es.addEventListener('chat', (e) => { const m = JSON.parse(e.data); if (msgs.some((x) => x.id === m.id)) return; msgs.push(m); if (msgs.length > 200) msgs.shift();
  if (curTab !== 'chat' && m.u !== me) { unread++; badge(); } renderChat(m.u === me); });
es.addEventListener('chatdel', (e) => { const id = JSON.parse(e.data); msgs = msgs.filter((x) => x.id !== id); renderChat(); });
es.addEventListener('chatclear', () => { msgs = []; renderChat(); });
es.onopen = () => loadChat();
setInterval(renderReports, 60000);

// ---- czat ----
const badge = () => { const b = $('#chatBadge'); b.hidden = !unread; b.textContent = unread > 9 ? '9+' : unread; };
const hhmm = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });
function renderChat(stick) {
  const l = $('#chatList'), near = l.scrollHeight - l.scrollTop - l.clientHeight < 90;
  l.innerHTML = msgs.length ? msgs.map((m) => `<div class="msg${m.u === me ? ' mine' : ''}"><div class="mh"><b>${esc(m.nick)}</b><span>${hhmm(m.createdAt)}</span></div><div class="mt">${esc(m.text)}</div></div>`).join('')
    : `<p class="muted empty">${esc(t('chat_empty'))}</p>`;
  if (stick || near) l.scrollTop = l.scrollHeight;
}
async function loadChat() { const r = await api('/api/chat'); if (r.ok && Array.isArray(r.j)) { msgs = r.j; renderChat(true); } }
$('#nick').value = store.get('nick', '');
$('#nick').onchange = (e) => store.set('nick', e.target.value.trim());
$('#chatForm').onsubmit = async (e) => {
  e.preventDefault();
  const text = $('#msg').value.trim(); if (!text || blocked) return;
  store.set('nick', $('#nick').value.trim());
  $('#msgSend').disabled = true;
  const r = await api('/api/chat', { method: 'POST', body: JSON.stringify({ text, nick: $('#nick').value }) });
  $('#msgSend').disabled = blocked;
  if (r.ok) { $('#msg').value = ''; if (!msgs.some((x) => x.id === r.j.id)) { msgs.push(r.j); } renderChat(true); }
  else { if (r.j.error === 'blocked') setBlocked(true); toast(errTxt(r.j)); }
  $('#msg').focus();
};

// ---- pomysły / błędy ----
let fbKind = 'idea';
$('#fbKind').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; fbKind = b.dataset.k; document.querySelectorAll('#fbKind button').forEach((x) => x.classList.toggle('on', x === b)); };
$('#fbSend').onclick = async () => {
  const text = $('#fbText').value.trim(); $('#fbErr').textContent = '';
  if (!text) { $('#fbErr').textContent = t('e_empty'); return; }
  $('#fbSend').disabled = true;
  const r = await api('/api/feedback', { method: 'POST', body: JSON.stringify({ kind: fbKind, text, contact: $('#fbContact').value }) });
  $('#fbSend').disabled = false;
  if (r.ok) { $('#fbText').value = ''; toast(t('fb_thanks')); } else $('#fbErr').textContent = errTxt(r.j);
};

// ---- nowe zgłoszenie ----
let pickMode = false, picked = null, count = 1;
const setPick = (on) => { pickMode = on; $('#hint').hidden = !on; };
const updatePlace = () => { const p = picked || myPos;
  $('#placeInfo').textContent = p ? t(picked ? 'place_picked' : 'place_me', { c: p[0].toFixed(5) + ', ' + p[1].toFixed(5) }) : t('place_none'); };
const open = () => { $('#sheet').hidden = false; $('#err').textContent = ''; updatePlace(); };
$('#report').onclick = () => { picked = null; open(); };
$('#cancel').onclick = () => { $('#sheet').hidden = true; };
$('#pickOnMap').onclick = () => { $('#sheet').hidden = true; setPick(true); };
$('#hintCancel').onclick = () => { setPick(false); open(); };
map.on('click', (e) => { if (!pickMode) return; setPick(false); picked = [e.latlng.lat, e.latlng.lng]; open(); });
$('#plus').onclick = () => $('#cnt').textContent = count = Math.min(10, count + 1);
$('#minus').onclick = () => $('#cnt').textContent = count = Math.max(1, count - 1);
$('#send').onclick = async () => {
  const p = picked || myPos; if (!p) { $('#err').textContent = t('pick_first'); return; }
  $('#send').disabled = true;
  const r = await api('/api/reports', { method: 'POST', body: JSON.stringify({ lat: p[0], lon: p[1], count, route: $('#route').value, comment: $('#comment').value }) });
  $('#send').disabled = false;
  if (!r.ok) { if (r.j.error === 'blocked') setBlocked(true); $('#err').textContent = errTxt(r.j); return; }
  $('#sheet').hidden = true; $('#route').value = ''; $('#comment').value = ''; picked = null; count = 1; $('#cnt').textContent = 1; map.flyTo(p, 16);
  toast(t(r.j.merged ? 'merged' : 'added'));
};
$('#quick').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; const i = $('#comment'), v = i.value.trim();
  i.value = (v ? v + ', ' + b.textContent.toLowerCase() : b.textContent).slice(0, 140); };

// ---- ustawienia ----
$('#setTheme').value = store.get('theme2', 'voyager');
$('#setTheme').onchange = (e) => { store.set('theme2', e.target.value); setTheme(e.target.value); };
$('#setNotify').checked = store.get('notify', false);
$('#setNotify').onchange = async (e) => {
  if (e.target.checked && 'Notification' in window) { const p = await Notification.requestPermission(); e.target.checked = p === 'granted'; }
  else if (e.target.checked) { toast(t('notif_unsupported')); e.target.checked = false; }
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
    L.circleMarker([s.lat, s.lon], { renderer: stopRenderer, radius: 5.5, weight: 2.5, color: '#fff', fillColor: '#2f6bff', fillOpacity: 1 })
      .bindPopup(`<b>${esc(s.name)}</b>${s.lines.length ? '<br>' + esc(t('stop_lines', { l: s.lines.join(', ') })) : ''}`).addTo(stopLayer));
}
map.on('moveend zoomend', renderStops);
const lineNote = () => { $('#lineNote').textContent = lineFilter ? t('line_only', { n: lineFilter }) + (stopsHaveLines ? '' : t('line_nostops')) : t('line_note'); };
const drawFilter = chips($('#lineChips'), $('#lineSearch'), () => lineFilter, (v) => {
  lineFilter = v; $('#lineBtn').classList.toggle('on', !!v); renderReports(); renderStops(); lineNote();
});
lineNote();
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

// ---- zmiana języka: odśwież teksty generowane dynamicznie ----
addEventListener('langchange', () => {
  geoText(); lineNote(); drawFilter(); drawForm(); updatePlace(); renderReports(); renderChat(); hb();
});
geoText();

// ---- offline + PWA ----
const off = () => $('#offline').hidden = navigator.onLine;
addEventListener('online', off); addEventListener('offline', off); off();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
})();

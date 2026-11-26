// Kanary Opole — сервер без внешних зависимостей (Node >= 18).
// Статика + REST API отметок + SSE (реальное время) + адаптер автобусов MZK.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { LINES, createStore } = require('./stops.js');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DB_FILE = path.join(__dirname, 'data', 'reports.json');
const TTL_MIN = 180;           // znaczek szarzeje stopniowo i znika po 3 h bez potwierdzeń (musi zgadzać się z app.js)
const RATE_LIMIT_MS = 60_000;  // не чаще 1 отметки в минуту с одного клиента
const DUP_RADIUS_M = 150;      // повтор рядом => считается подтверждением
const OPOLE = { latMin: 50.55, latMax: 50.78, lonMin: 17.78, lonMax: 18.08 };

// ---- Конфиг адаптера автобусов (заполняется после анализа dip.mzkopole.pl) ----
const BUS = {
  url: process.env.BUS_FEED_URL || '',       // реальный URL JSON-эндпоинта OnTime
  headers: {},                                // при необходимости
  // функция превращает ответ источника в массив {id,route,lat,lon,bearing,updatedAt,extra}
  parse: (json) => { throw new Error('BUS parser not configured'); },
};
try { Object.assign(BUS, require('./bus-adapter.js')); } catch {}

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
let reports = [];
try { reports = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {}
const save = () => fs.writeFile(DB_FILE, JSON.stringify(reports), () => {});
const stopsStore = createStore(path.join(__dirname, 'data', 'stops.json'),
  `${OPOLE.latMin},${OPOLE.lonMin},${OPOLE.latMax},${OPOLE.lonMax}`);
const lastByClient = new Map();
const clients = new Set();

const now = () => Date.now();
const alive = (r) => now() - r.lastConfirmedAt < TTL_MIN * 60_000;
const freshness = (r) => {
  const m = (now() - r.lastConfirmedAt) / 60_000;
  return m < 5 ? 'high' : m < 20 ? 'medium' : 'low';
};
const view = (r) => ({ ...r, clientHash: undefined, voters: undefined, freshness: freshness(r) });
const active = () => reports.filter(alive).map(view);
const dist = (a, b, c, d) => {
  const R = 6371000, t = Math.PI / 180;
  const x = (c - a) * t, y = (d - b) * t * Math.cos(((a + c) / 2) * t);
  return R * Math.hypot(x, y);
};
const broadcast = () => {
  const data = `data: ${JSON.stringify(active())}\n\n`;
  for (const c of clients) c.write(data);
};
setInterval(() => {
  const before = reports.length;
  reports = reports.filter((r) => now() - r.lastConfirmedAt < 6 * 3600_000); // архив 6 ч
  if (before !== reports.length) save();
  broadcast(); // пересчёт актуальности/удаление просроченных
}, 30_000);

const clientId = (req) =>
  crypto.createHash('sha256').update((req.headers['x-client-id'] || '') + req.socket.remoteAddress).digest('hex').slice(0, 24);

const readBody = (req) => new Promise((res, rej) => {
  let b = ''; req.on('data', (c) => { b += c; if (b.length > 10_000) req.destroy(); });
  req.on('end', () => { try { res(JSON.parse(b || '{}')); } catch (e) { rej(e); } });
});
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

async function api(req, res, url) {
  if (url.pathname === '/api/reports' && req.method === 'GET') return json(res, 200, active());

  if (url.pathname === '/api/reports' && req.method === 'POST') {
    const b = await readBody(req);
    const lat = Number(b.lat), lon = Number(b.lon);
    const count = Math.min(10, Math.max(1, parseInt(b.count) || 1));
    const comment = String(b.comment || '').replace(/https?:\/\/\S+/gi, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
    const route = String(b.route || '').trim().slice(0, 4).replace(/[^\w]/g, '').toUpperCase();
    if (route && !LINES.includes(route)) return json(res, 400, { error: 'Nieznana linia' });
    if (!(lat > OPOLE.latMin && lat < OPOLE.latMax && lon > OPOLE.lonMin && lon < OPOLE.lonMax))
      return json(res, 400, { error: 'Miejsce poza Opolem' });
    const cid = clientId(req);
    const last = lastByClient.get(cid) || 0;
    if (now() - last < RATE_LIMIT_MS)
      return json(res, 429, { error: `Odczekaj ${Math.ceil((RATE_LIMIT_MS - (now() - last)) / 1000)} s przed kolejnym zgłoszeniem` });
    lastByClient.set(cid, now());
    // дубликат рядом и недавно => подтверждение вместо новой отметки
    const dup = reports.find((r) => alive(r) && dist(r.lat, r.lon, lat, lon) < DUP_RADIUS_M && (!route || !r.route || r.route === route));
    if (dup) {
      dup.lastConfirmedAt = now(); dup.confirms++; dup.count = Math.max(dup.count, count);
      if (comment) dup.comment = comment;
      if (route && !dup.route) dup.route = route;
      save(); broadcast();
      return json(res, 200, { merged: true, report: view(dup) });
    }
    const r = { id: crypto.randomUUID(), lat, lon, count, route, comment, transport: 'bus',
      createdAt: now(), lastConfirmedAt: now(), confirms: 1, denies: 0, voters: [cid] };
    reports.push(r); save(); broadcast();
    return json(res, 201, { merged: false, report: view(r) });
  }

  const m = url.pathname.match(/^\/api\/reports\/([\w-]+)\/(confirm|deny)$/);
  if (m && req.method === 'POST') {
    const r = reports.find((x) => x.id === m[1] && alive(x));
    if (!r) return json(res, 404, { error: 'Zgłoszenie nie istnieje lub wygasło' });
    const cid = clientId(req);
    if (r.voters.includes(cid)) return json(res, 409, { error: 'Już głosowałeś(-aś)' });
    r.voters.push(cid);
    if (m[2] === 'confirm') { r.confirms++; r.lastConfirmedAt = now(); }
    else { r.denies++; if (r.denies >= 3 && r.denies > r.confirms) r.lastConfirmedAt = 0; } // скрыть
    save(); broadcast();
    return json(res, 200, view(r));
  }

  if (url.pathname === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(active())}\n\n`);
    clients.add(res); req.on('close', () => clients.delete(res)); return;
  }

  if (url.pathname === '/api/lines') return json(res, 200, LINES);
  if (url.pathname === '/api/stops') {
    res.setHeader('Cache-Control', 'public, max-age=600');
    return json(res, 200, { status: stopsStore.status, updatedAt: stopsStore.updatedAt, matched: stopsStore.matched, note: stopsStore.note,
      stops: stopsStore.stops.map(({ id, name, lat, lon, lines }) => ({ id, name, lat, lon, lines })) });
  }

  if (url.pathname === '/api/buses') {
    if (!BUS.url) return json(res, 503, { error: 'bus_source_not_configured',
      message: 'Źródło pozycji autobusów nie jest skonfigurowane (BUS_FEED_URL i bus-adapter.js).' });
    try {
      const r = await fetch(BUS.url, { headers: BUS.headers });
      if (!r.ok) throw new Error('upstream HTTP ' + r.status);
      const buses = BUS.parse(await r.json());
      return json(res, 200, { fetchedAt: now(), buses });
    } catch (e) { return json(res, 502, { error: 'bus_source_failed', message: String(e.message || e) }); }
  }
  json(res, 404, { error: 'not found' });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let p = path.normalize(path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!p.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
    fs.readFile(p, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) { json(res, 400, { error: String(e.message || e) }); }
}).listen(PORT, () => console.log(`Kanary Opole: http://localhost:${PORT}`));

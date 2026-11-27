// Kanary Opole — serwer: statyka, API (zgłoszenia, czat, pomysły), panel admina, SSE, baza danych.
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { LINES, createStore } = require('./stops.js');
const db = require('./db.js');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const TTL_MIN = 180;        // znaczek żyje 3 h od ostatniego potwierdzenia (zgodne z app.js)
const DUP_RADIUS_M = 150;   // powtórka w tym promieniu = potwierdzenie
const ONLINE_MS = 120_000;  // "online" = sygnał życia w ostatnich 2 minutach
const OPOLE = { latMin: 50.55, latMax: 50.78, lonMin: 17.78, lonMax: 18.08 };
const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const BOT_RE = /bot|crawl|spider|headless|lighthouse|uptime|monitor|curl\/|wget|python|node-fetch|axios|go-http|preview/i;

const now = () => Date.now();
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const warsawDay = (ts = now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(ts);
const dist = (a, b, c, d) => { const R = 6371000, t = Math.PI / 180; const x = (c - a) * t, y = (d - b) * t * Math.cos(((a + c) / 2) * t); return R * Math.hypot(x, y); };

// ---------- limity ----------
const hits = new Map();
function limited(key, max, windowMs) { // zwraca 0 gdy OK, albo liczbę sekund do odczekania
  const t = now(), arr = (hits.get(key) || []).filter((x) => t - x < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return Math.max(1, Math.ceil((windowMs - (t - arr[0])) / 1000)); }
  arr.push(t); hits.set(key, arr); return 0;
}
setInterval(() => { const t = now(); for (const [k, a] of hits) if (!a.length || t - a[a.length - 1] > 3600_000) hits.delete(k); }, 600_000).unref();

// ---------- identyfikacja ----------
const rawCid = (req) => { const h = String(req.headers['x-client-id'] || ''); return /^[\w-]{16,64}$/.test(h) ? h : ''; };
const cidOf = (req) => { const r = rawCid(req); return r ? sha('c:' + r).slice(0, 24) : ''; };
const ipOf = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
const ipHashOf = (req) => sha('ip:' + ipOf(req)).slice(0, 16);

async function touch(req, extra = {}) {
  const cid = cidOf(req); if (!cid) return null;
  const t = now(), ua = String(req.headers['user-agent'] || '').slice(0, 200), bot = BOT_RE.test(ua) ? 1 : 0;
  await db.run(`INSERT INTO clients(id,first_seen,last_seen,standalone,is_bot,ua,ip_hash,lang) VALUES($1,$2,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (id) DO UPDATE SET last_seen=$2, standalone=CASE WHEN $3=1 THEN 1 ELSE clients.standalone END, ua=$5, ip_hash=$6,
    lang=CASE WHEN $7='' THEN clients.lang ELSE $7 END`,
    [cid, t, extra.standalone ? 1 : 0, bot, ua, ipHashOf(req), String(extra.lang || '').slice(0, 5)]);
  if (!bot) await db.run('INSERT INTO daily_users(day,client_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [warsawDay(t), cid]);
  const row = await db.get('SELECT blocked FROM clients WHERE id=$1', [cid]);
  return { cid, blocked: !!(row && row.blocked) };
}
async function guard(req, res) { // dla akcji zapisu: poprawny klient i brak blokady
  const r = await touch(req); if (!r) { send(res, 400, { error: 'bad_client' }); return ''; }
  if (r.blocked) { send(res, 403, { error: 'blocked' }); return ''; }
  return r.cid;
}

// ---------- HTTP helpers ----------
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve, reject) => {
  let b = ''; req.on('data', (c) => { b += c; if (b.length > 20_000) { reject(new Error('too_big')); req.destroy(); } });
  req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { reject(new Error('bad_json')); } });
  req.on('error', reject);
});
const cleanText = (s, max) => String(s || '').replace(/(https?:\/\/|www\.)\S+/gi, '…').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// ---------- SSE ----------
const sse = new Set();
const sseSend = (event, data) => { const m = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; for (const c of sse) c.write(m); };
setInterval(() => { for (const c of sse) c.write(': ping\n\n'); }, 25_000).unref();

// ---------- zgłoszenia ----------
const rv = (r) => ({ id: r.id, lat: r.lat, lon: r.lon, count: r.cnt, route: r.route, comment: r.comment, transport: r.transport,
  createdAt: r.created_at, lastConfirmedAt: r.last_confirmed_at, confirms: r.confirms, denies: r.denies });
const cutoff = () => now() - TTL_MIN * 60_000;
const activeReports = async () => (await db.all('SELECT * FROM reports WHERE status=0 AND last_confirmed_at>$1 ORDER BY created_at DESC LIMIT 500', [cutoff()])).map(rv);
const pushReports = async () => { if (sse.size) sseSend('reports', await activeReports()); };
setInterval(() => pushReports().catch(() => {}), 30_000).unref();


// ---------- Web Push (VAPID, powiadomienie bez ładunku: SW pobiera treść z /api/push/peek) ----------
let VAPID = null;
async function initVapid() {
  let v = null; try { v = JSON.parse(await db.getSetting('vapid') || 'null'); } catch {}
  if (!v) { const jwk = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ format: 'jwk' }); v = { d: jwk.d, x: jwk.x, y: jwk.y }; await db.setSetting('vapid', JSON.stringify(v)); }
  VAPID = { priv: crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', ...v }, format: 'jwk' }),
    pub: Buffer.concat([Buffer.from([4]), Buffer.from(v.x, 'base64url'), Buffer.from(v.y, 'base64url')]).toString('base64url') };
}
const PUSH_HOSTS = /(^|\.)(googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;
const pushOk = (ep) => { try { const u = new URL(ep); return process.env.PUSH_ALLOW_HTTP === '1' || (u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname)); } catch { return false; } };
function vapidHeader(ep) {
  const h = b64(JSON.stringify({ typ: 'JWT', alg: 'ES256' })),
    p = b64(JSON.stringify({ aud: new URL(ep).origin, exp: Math.floor(now() / 1000) + 12 * 3600, sub: 'mailto:' + (process.env.VAPID_CONTACT || 'admin@kanary-opole.onrender.com') }));
  const sig = crypto.sign('sha256', Buffer.from(h + '.' + p), { key: VAPID.priv, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `vapid t=${h}.${p}.${sig}, k=${VAPID.pub}`;
}
const sendPush = (ep) => new Promise((resolve) => {
  try {
    const u = new URL(ep);
    const rq = (u.protocol === 'http:' ? http : https).request(u, { method: 'POST', timeout: 10000,
      headers: { Authorization: vapidHeader(ep), TTL: '900', Urgency: 'high', 'Content-Length': '0' } }, (r) => { r.resume(); resolve(r.statusCode); });
    rq.on('error', () => resolve(0)); rq.on('timeout', () => { rq.destroy(); resolve(0); }); rq.end();
  } catch { resolve(0); }
});
async function notifyNear(r) { // r: wiersz z tabeli reports
  if (!VAPID) return;
  const subs = await db.all('SELECT s.*, COALESCE(c.blocked,0) AS bl FROM push_subs s LEFT JOIN clients c ON c.id=s.client_id WHERE s.fails<5');
  const t = now(), todo = [];
  for (const s of subs) {
    if (s.bl || s.client_id === r.client_id || t - s.last_sent < 180_000) continue;
    const d = s.has_pos ? dist(s.lat, s.lon, r.lat, r.lon) : Infinity;
    const byLine = !!r.route && s.lines.split(',').includes(r.route), byDist = s.radius > 0 && d <= s.radius;
    if (!byLine && !byDist) continue;
    todo.push({ s, msg: JSON.stringify({ id: r.id, count: r.cnt, route: r.route, comment: r.comment, lat: r.lat, lon: r.lon, near: byDist ? Math.round(d) : null }) });
  }
  await Promise.all(todo.map(async ({ s, msg }) => {
    await db.run('UPDATE push_subs SET pending=$1, last_sent=$2 WHERE endpoint=$3', [msg, t, s.endpoint]);
    const code = await sendPush(s.endpoint);
    if (code === 404 || code === 410) await db.run('DELETE FROM push_subs WHERE endpoint=$1', [s.endpoint]);
    else if (code === 0 || code >= 400) await db.run('UPDATE push_subs SET fails=fails+1 WHERE endpoint=$1', [s.endpoint]);
    else await db.run('UPDATE push_subs SET fails=0 WHERE endpoint=$1', [s.endpoint]);
  }));
}

// ---------- przystanki ----------
const stopsStore = createStore(path.join(__dirname, 'data', 'stops.json'),
  `${OPOLE.latMin},${OPOLE.lonMin},${OPOLE.latMax},${OPOLE.lonMax}`);

// ---------- admin: sesja ----------
const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (p) => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const mkToken = () => { const p = b64(JSON.stringify({ u: ADMIN_USER, exp: now() + 12 * 3600_000 })); return p + '.' + sign(p); };
function checkToken(tok) {
  if (!tok || !tok.includes('.')) return false;
  const [p, s] = tok.split('.'), good = sign(p);
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return false;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString()).exp > now(); } catch { return false; }
}
const cookiesOf = (req) => Object.fromEntries(String(req.headers.cookie || '').split(';').map((s) => s.trim()).filter(Boolean)
  .map((s) => { const i = s.indexOf('='); return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))]; }));
const isAdmin = (req) => !!ADMIN_USER && req.headers['x-admin'] === '1' && checkToken(cookiesOf(req).adm);
const safeEq = (a, b) => crypto.timingSafeEqual(Buffer.from(sha(a)), Buffer.from(sha(b)));
const cookie = (req, val, maxAge) => `adm=${val}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;

// ---------- API publiczne ----------
async function api(req, res, url) {
  const p = url.pathname, m = req.method;

  if (p === '/api/lines') return send(res, 200, LINES);
  if (p === '/api/stops') {
    res.setHeader('Cache-Control', 'public, max-age=600');
    return send(res, 200, { status: stopsStore.status, updatedAt: stopsStore.updatedAt, matched: stopsStore.matched, note: stopsStore.note,
      stops: stopsStore.stops.map(({ id, name, lat, lon, lines }) => ({ id, name, lat, lon, lines })) });
  }
  if (p === '/api/reports' && m === 'GET') return send(res, 200, await activeReports());

  if (p === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write(`event: reports\ndata: ${JSON.stringify(await activeReports())}\n\n`);
    sse.add(res); req.on('close', () => sse.delete(res)); return;
  }

  if (p === '/api/hb' && m === 'POST') {
    const b = await readBody(req).catch(() => ({}));
    const r = await touch(req, { standalone: !!b.standalone, lang: b.lang });
    if (!r) return send(res, 400, { error: 'bad_client' });
    return send(res, 200, { ok: true, me: r.cid.slice(0, 8), blocked: r.blocked });
  }

  if (p === '/api/reports' && m === 'POST') {
    const cid = await guard(req, res); if (!cid) return;
    const b = await readBody(req);
    const lat = Number(b.lat), lon = Number(b.lon);
    const count = Math.min(10, Math.max(1, parseInt(b.count) || 1));
    const route = String(b.route || '').trim().slice(0, 4).replace(/[^\w]/g, '').toUpperCase();
    const comment = cleanText(b.comment, 140);
    if (!(lat > OPOLE.latMin && lat < OPOLE.latMax && lon > OPOLE.lonMin && lon < OPOLE.lonMax)) return send(res, 400, { error: 'out_of_city' });
    if (route && !LINES.includes(route)) return send(res, 400, { error: 'bad_line' });
    let w = limited('rep:' + cid, 1, 60_000) || limited('repip:' + ipHashOf(req), 8, 3600_000);
    if (w) return send(res, 429, { error: 'rate_limit', retry: w });
    const t = now();
    const near = (await db.all('SELECT * FROM reports WHERE status=0 AND last_confirmed_at>$1', [cutoff()]))
      .find((r) => dist(r.lat, r.lon, lat, lon) < DUP_RADIUS_M && (!route || !r.route || r.route === route));
    if (near) {
      await db.run('UPDATE reports SET last_confirmed_at=$1, confirms=confirms+1, cnt=$2, route=$3, comment=$4 WHERE id=$5',
        [t, Math.max(near.cnt, count), near.route || route, comment || near.comment, near.id]);
      await db.run("INSERT INTO votes(report_id,client_id,kind) VALUES($1,$2,'confirm') ON CONFLICT DO NOTHING", [near.id, cid]);
      await pushReports();
      return send(res, 200, { merged: true, report: rv(await db.get('SELECT * FROM reports WHERE id=$1', [near.id])) });
    }
    const id = crypto.randomUUID();
    await db.run('INSERT INTO reports(id,lat,lon,cnt,route,comment,transport,created_at,last_confirmed_at,confirms,denies,client_id,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,1,0,$9,0)',
      [id, lat, lon, count, route, comment, 'bus', t, cid]);
    await db.run("INSERT INTO votes(report_id,client_id,kind) VALUES($1,$2,'confirm') ON CONFLICT DO NOTHING", [id, cid]);
    await db.run('UPDATE clients SET reports_count=reports_count+1 WHERE id=$1', [cid]);
    await pushReports();
    const fresh = await db.get('SELECT * FROM reports WHERE id=$1', [id]);
    notifyNear(fresh).catch((e) => console.error('push:', e.message));
    return send(res, 201, { merged: false, report: rv(fresh) });
  }

  const vm = p.match(/^\/api\/reports\/([\w-]+)\/(confirm|deny)$/);
  if (vm && m === 'POST') {
    const cid = await guard(req, res); if (!cid) return;
    const w = limited('vote:' + cid, 30, 60_000); if (w) return send(res, 429, { error: 'rate_limit', retry: w });
    const r = await db.get('SELECT * FROM reports WHERE id=$1 AND status=0 AND last_confirmed_at>$2', [vm[1], cutoff()]);
    if (!r) return send(res, 404, { error: 'not_found' });
    if (await db.get('SELECT 1 AS x FROM votes WHERE report_id=$1 AND client_id=$2', [r.id, cid])) return send(res, 409, { error: 'already_voted' });
    await db.run('INSERT INTO votes(report_id,client_id,kind) VALUES($1,$2,$3)', [r.id, cid, vm[2]]);
    if (vm[2] === 'confirm') await db.run('UPDATE reports SET confirms=confirms+1, last_confirmed_at=$1 WHERE id=$2', [now(), r.id]);
    else {
      await db.run('UPDATE reports SET denies=denies+1 WHERE id=$1', [r.id]);
      const x = await db.get('SELECT confirms, denies FROM reports WHERE id=$1', [r.id]);
      if (x.denies >= 3 && x.denies > x.confirms) await db.run('UPDATE reports SET status=1 WHERE id=$1', [r.id]);
    }
    await pushReports();
    return send(res, 200, { ok: true });
  }


  // ---- push ----
  if (p === '/api/push/key') return send(res, 200, { key: VAPID ? VAPID.pub : '' });
  if (p === '/api/push/sub' && m === 'POST') {
    const cid = await guard(req, res); if (!cid) return;
    const b = await readBody(req), ep = String(b.endpoint || '');
    if (!pushOk(ep) || ep.length > 600) return send(res, 400, { error: 'bad_endpoint' });
    const w = limited('psub:' + cid, 30, 3600_000); if (w) return send(res, 429, { error: 'rate_limit', retry: w });
    const lat = Number(b.lat), lon = Number(b.lon), has = lat > OPOLE.latMin - 0.2 && lat < OPOLE.latMax + 0.2 && lon > OPOLE.lonMin - 0.3 && lon < OPOLE.lonMax + 0.3 ? 1 : 0;
    const radius = [0, 500, 1000, 2000, 5000].includes(Number(b.radius)) ? Number(b.radius) : 0;
    const lines = (Array.isArray(b.lines) ? b.lines : []).map(String).filter((l) => LINES.includes(l)).slice(0, 40).join(',');
    await db.run(`INSERT INTO push_subs(endpoint,client_id,lat,lon,has_pos,radius,lines,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (endpoint) DO UPDATE SET client_id=$2, lat=CASE WHEN $5=1 THEN $3 ELSE push_subs.lat END, lon=CASE WHEN $5=1 THEN $4 ELSE push_subs.lon END,
      has_pos=CASE WHEN $5=1 THEN 1 ELSE push_subs.has_pos END, radius=$6, lines=$7, fails=0`, [ep, cid, has ? lat : 0, has ? lon : 0, has, radius, lines, now()]);
    return send(res, 200, { ok: true });
  }
  if (p === '/api/push/unsub' && m === 'POST') {
    const cid = await guard(req, res); if (!cid) return; const b = await readBody(req);
    await db.run('DELETE FROM push_subs WHERE endpoint=$1 AND client_id=$2', [String(b.endpoint || ''), cid]);
    return send(res, 200, { ok: true });
  }
  if (p === '/api/push/peek' && m === 'POST') {
    const w = limited('peek:' + ipHashOf(req), 60, 60_000); if (w) return send(res, 429, { error: 'rate_limit' });
    const b = await readBody(req), row = await db.get('SELECT pending FROM push_subs WHERE endpoint=$1', [String(b.endpoint || '')]);
    let j = {}; try { j = JSON.parse((row && row.pending) || '{}'); } catch {}
    return send(res, 200, j);
  }

  // ---- czat ----
  const mv = (r) => ({ id: r.id, nick: r.nick, text: r.text, createdAt: r.created_at, u: r.client_id.slice(0, 8) });
  if (p === '/api/chat' && m === 'GET') {
    const rows = await db.all('SELECT * FROM messages WHERE deleted=0 ORDER BY created_at DESC LIMIT 100');
    return send(res, 200, rows.reverse().map(mv));
  }
  if (p === '/api/chat' && m === 'POST') {
    const cid = await guard(req, res); if (!cid) return;
    const b = await readBody(req);
    const text = cleanText(b.text, 300);
    const nick = String(b.nick || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 20) || 'Opolanin';
    if (!text) return send(res, 400, { error: 'empty' });
    const w = limited('chat:' + cid, 1, 1500) || limited('chatm:' + cid, 25, 60_000);
    if (w) return send(res, 429, { error: 'chat_slow', retry: w });
    const id = crypto.randomUUID(), t = now();
    await db.run('INSERT INTO messages(id,client_id,nick,text,created_at,deleted) VALUES($1,$2,$3,$4,$5,0)', [id, cid, nick, text, t]);
    await db.run('UPDATE clients SET messages_count=messages_count+1 WHERE id=$1', [cid]);
    const msg = mv({ id, client_id: cid, nick, text, created_at: t });
    sseSend('chat', msg);
    return send(res, 201, msg);
  }

  // ---- pomysły / błędy ----
  if (p === '/api/feedback' && m === 'POST') {
    const cid = await guard(req, res); if (!cid) return;
    const b = await readBody(req);
    const kind = ['bug', 'idea', 'other'].includes(b.kind) ? b.kind : 'other';
    const text = cleanText(b.text, 1000), contact = cleanText(b.contact, 100);
    if (!text) return send(res, 400, { error: 'empty' });
    const w = limited('fb:' + cid, 3, 3600_000); if (w) return send(res, 429, { error: 'rate_limit', retry: w });
    await db.run("INSERT INTO feedback(id,kind,text,contact,client_id,created_at,status) VALUES($1,$2,$3,$4,$5,$6,'new')",
      [crypto.randomUUID(), kind, text, contact, cid, now()]);
    return send(res, 201, { ok: true });
  }

  return send(res, 404, { error: 'not_found' });
}

// ---------- API admina ----------
async function admin(req, res, url) {
  const p = url.pathname.replace(/^\/api\/admin/, ''), m = req.method;

  if (p === '/login' && m === 'POST') {
    if (!ADMIN_USER || !ADMIN_PASS) return send(res, 503, { error: 'admin_disabled' });
    const w = limited('adm:' + ipHashOf(req), 8, 900_000);
    if (w) return send(res, 429, { error: 'rate_limit', retry: w });
    const b = await readBody(req);
    const okU = safeEq(String(b.user || ''), ADMIN_USER), okP = safeEq(String(b.pass || ''), ADMIN_PASS);
    if (!(okU && okP)) return send(res, 401, { error: 'bad_credentials' });
    res.setHeader('Set-Cookie', cookie(req, mkToken(), 43200));
    return send(res, 200, { ok: true });
  }
  if (p === '/logout' && m === 'POST') { res.setHeader('Set-Cookie', cookie(req, '', 0)); return send(res, 200, { ok: true }); }
  if (!isAdmin(req)) return send(res, 401, { error: 'unauthorized' });
  if (p === '/me') return send(res, 200, { ok: true });

  if (p === '/stats') {
    const t = now(), today = warsawDay(t);
    const cnt = async (sql, a = []) => (await db.get(sql, a)).c;
    const days = Array.from({ length: 14 }, (_, i) => warsawDay(t - (13 - i) * 86400_000));
    const du = await db.all('SELECT day, COUNT(*) AS c FROM daily_users WHERE day>=$1 GROUP BY day', [days[0]]);
    const created = await db.all('SELECT created_at FROM reports WHERE created_at>=$1', [t - 16 * 86400_000]);
    const rep = {}; created.forEach((r) => { const d = warsawDay(r.created_at); rep[d] = (rep[d] || 0) + 1; });
    const msgs = await db.all('SELECT created_at FROM messages WHERE created_at>=$1', [t - 2 * 86400_000]);
    return send(res, 200, {
      online: await cnt('SELECT COUNT(*) AS c FROM clients WHERE is_bot=0 AND last_seen>$1', [t - ONLINE_MS]),
      today: await cnt('SELECT COUNT(*) AS c FROM daily_users WHERE day=$1', [today]),
      total: await cnt('SELECT COUNT(*) AS c FROM clients WHERE is_bot=0'),
      pwa: await cnt('SELECT COUNT(*) AS c FROM clients WHERE is_bot=0 AND standalone=1'),
      blocked: await cnt('SELECT COUNT(*) AS c FROM clients WHERE blocked=1'),
      push: await cnt('SELECT COUNT(*) AS c FROM push_subs'),
      reportsActive: await cnt('SELECT COUNT(*) AS c FROM reports WHERE status=0 AND last_confirmed_at>$1', [cutoff()]),
      reportsToday: rep[today] || 0,
      messagesToday: msgs.filter((x) => warsawDay(x.created_at) === today).length,
      feedbackNew: await cnt("SELECT COUNT(*) AS c FROM feedback WHERE status='new'"),
      lastReset: await db.getSetting('reset_day'), day: today, db: db.kind(), uptime: Math.round(process.uptime()),
      series: { days, users: days.map((d) => Number((du.find((x) => x.day === d) || {}).c || 0)), reports: days.map((d) => rep[d] || 0) },
    });
  }

  if (p === '/reports' && m === 'GET') {
    const f = url.searchParams.get('f') || 'active', t = now();
    const base = 'SELECT r.*, COALESCE(c.blocked,0) AS ablocked FROM reports r LEFT JOIN clients c ON c.id=r.client_id';
    let rows;
    if (f === 'active') rows = await db.all(base + ' WHERE r.status=0 AND r.last_confirmed_at>$1 ORDER BY r.created_at DESC LIMIT 300', [cutoff()]);
    else if (f === 'today') rows = (await db.all(base + ' WHERE r.created_at>=$1 ORDER BY r.created_at DESC LIMIT 600', [t - 36 * 3600_000])).filter((r) => warsawDay(r.created_at) === warsawDay(t));
    else rows = await db.all(base + ' WHERE r.created_at>=$1 ORDER BY r.created_at DESC LIMIT 300', [t - 7 * 86400_000]);
    return send(res, 200, rows.map((r) => ({ ...rv(r), status: r.status, active: r.status === 0 && r.last_confirmed_at > cutoff(), author: r.client_id, authorBlocked: !!r.ablocked })));
  }
  let mm = p.match(/^\/reports\/([\w-]+)$/);
  if (mm && m === 'DELETE') { await db.run('UPDATE reports SET status=2 WHERE id=$1', [mm[1]]); await pushReports(); return send(res, 200, { ok: true }); }
  if (p === '/reports/clear' && m === 'POST') { const r = await db.run('UPDATE reports SET status=2 WHERE status=0'); await pushReports(); return send(res, 200, { ok: true, removed: r.changes }); }

  if (p === '/clients' && m === 'GET') {
    const f = url.searchParams.get('f') || 'all', t = now();
    let where = 'is_bot=0', a = [];
    if (f === 'online') { where += ' AND last_seen>$1'; a = [t - ONLINE_MS]; } else if (f === 'blocked') where += ' AND blocked=1';
    const rows = await db.all(`SELECT * FROM clients WHERE ${where} ORDER BY last_seen DESC LIMIT 300`, a);
    return send(res, 200, rows.map((c) => ({ id: c.id, firstSeen: c.first_seen, lastSeen: c.last_seen, online: c.last_seen > t - ONLINE_MS,
      standalone: !!c.standalone, lang: c.lang, blocked: !!c.blocked, reports: c.reports_count, messages: c.messages_count, ua: c.ua })));
  }
  mm = p.match(/^\/clients\/([a-f0-9]{24})\/block$/);
  if (mm && m === 'POST') {
    const b = await readBody(req), blocked = b.blocked ? 1 : 0;
    await db.run('UPDATE clients SET blocked=$1, blocked_at=$2 WHERE id=$3', [blocked, blocked ? now() : 0, mm[1]]);
    if (blocked && b.purge) {
      await db.run('UPDATE reports SET status=2 WHERE client_id=$1 AND status=0', [mm[1]]);
      const ids = await db.all('SELECT id FROM messages WHERE client_id=$1 AND deleted=0', [mm[1]]);
      await db.run('UPDATE messages SET deleted=1 WHERE client_id=$1', [mm[1]]);
      ids.forEach((x) => sseSend('chatdel', x.id));
      await pushReports();
    }
    return send(res, 200, { ok: true });
  }

  const av = (r) => ({ id: r.id, nick: r.nick, text: r.text, createdAt: r.created_at, deleted: !!r.deleted, author: r.client_id, authorBlocked: !!r.ablocked });
  if (p === '/chat' && m === 'GET') return send(res, 200, (await db.all('SELECT m.*, COALESCE(c.blocked,0) AS ablocked FROM messages m LEFT JOIN clients c ON c.id=m.client_id ORDER BY m.created_at DESC LIMIT 200')).map(av));
  mm = p.match(/^\/chat\/([\w-]+)$/);
  if (mm && m === 'DELETE') { await db.run('UPDATE messages SET deleted=1 WHERE id=$1', [mm[1]]); sseSend('chatdel', mm[1]); return send(res, 200, { ok: true }); }
  if (p === '/chat/clear' && m === 'POST') { await db.run('UPDATE messages SET deleted=1'); sseSend('chatclear', 1); return send(res, 200, { ok: true }); }

  if (p === '/feedback' && m === 'GET') {
    const f = url.searchParams.get('f') || 'new';
    const rows = await db.all(f === 'new' ? "SELECT * FROM feedback WHERE status='new' ORDER BY created_at DESC LIMIT 300" : 'SELECT * FROM feedback ORDER BY created_at DESC LIMIT 300');
    return send(res, 200, rows.map((r) => ({ id: r.id, kind: r.kind, text: r.text, contact: r.contact, createdAt: r.created_at, status: r.status, author: r.client_id })));
  }
  mm = p.match(/^\/feedback\/([\w-]+)$/);
  if (mm && m === 'POST') {
    const b = await readBody(req); const st = ['new', 'read', 'done'].includes(b.status) ? b.status : 'read';
    await db.run('UPDATE feedback SET status=$1 WHERE id=$2', [st, mm[1]]); return send(res, 200, { ok: true });
  }
  if (mm && m === 'DELETE') { await db.run('DELETE FROM feedback WHERE id=$1', [mm[1]]); return send(res, 200, { ok: true }); }

  return send(res, 404, { error: 'not_found' });
}

// ---------- zadania cykliczne ----------
async function dailyTick() {
  const day = warsawDay(), last = await db.getSetting('reset_day');
  if (last === day) return;
  if (last) await db.run('UPDATE reports SET status=1 WHERE status=0'); // północ (Europe/Warsaw): czyścimy mapę
  await db.setSetting('reset_day', day);
  const t = now();
  await db.run('DELETE FROM reports WHERE created_at<$1', [t - 30 * 86400_000]);
  await db.run('DELETE FROM push_subs WHERE fails>=5');
  await db.run('DELETE FROM votes WHERE report_id NOT IN (SELECT id FROM reports)');
  await db.run('DELETE FROM messages WHERE created_at<$1', [t - 7 * 86400_000]);
  await db.run('DELETE FROM daily_users WHERE day<$1', [warsawDay(t - 120 * 86400_000)]);
  await pushReports();
  console.log('daily reset done for', day);
}

// ---------- statyka ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  try {
    if (url.pathname.startsWith('/api/admin/')) return await admin(req, res, url);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let rel = url.pathname === '/' ? '/index.html' : url.pathname;
    if (rel === '/admin' || rel === '/admin/') rel = '/admin/index.html';
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      const ext = path.extname(file);
      const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.png' ? 'public, max-age=86400' : 'no-cache' };
      if (rel.startsWith('/admin')) h['X-Robots-Tag'] = 'noindex, nofollow';
      res.writeHead(200, h); res.end(data);
    });
  } catch (e) {
    console.error('request error:', req.method, url.pathname, e.message);
    const code = /bad_json|too_big/.test(e.message) ? 400 : 500;
    if (!res.headersSent) send(res, code, { error: code === 400 ? e.message : 'server' });
  }
});

(async () => {
  const kind = await db.init();
  console.log(`DB: ${kind}${kind === 'sqlite' ? ' (lokalnie, bez trwałości na hostingu!)' : ''}; admin: ${ADMIN_USER && ADMIN_PASS ? 'włączony' : 'WYŁĄCZONY (brak ADMIN_USER/ADMIN_PASS)'}`);
  await initVapid().catch((e) => console.error('vapid:', e.message));
  await dailyTick().catch((e) => console.error('dailyTick:', e.message));
  setInterval(() => dailyTick().catch((e) => console.error('dailyTick:', e.message)), 30_000).unref();
  server.listen(PORT, () => console.log(`Kanary Opole: http://localhost:${PORT}`));
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });

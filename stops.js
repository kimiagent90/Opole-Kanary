// Przystanki: współrzędne z OpenStreetMap (Overpass), linie z rozklady.mzkopole.pl (jeśli się uda dopasować po nazwie).
const fs = require('fs');

const LINES = ['1','3','5','7','8','9','10','11','12','13','14','15','16','17','18','21','25','28','30','80','N1','N2','SZ1','SZ2','SZ4','SZ10','SZ20'];
const KNOWN = new Set(LINES);
const UA = 'KanaryOpole/0.1 (https://github.com/kimiagent90/Opole-Kanary)';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];

const strip = (h) => String(h).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
const norm = (s) => String(s || '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s*[-–—]\s*/g, ' - ').replace(/\s+/g, ' ').trim();

// HTML przystanki.html -> Map(nazwaZnormalizowana -> Set(linie))
function parseMzk(html) {
  const out = new Map();
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const anchors = [...row.matchAll(/<a[^>]*href="[^"]*przystanek-\d+\.html[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => strip(m[1]));
    if (!anchors.length) continue;
    const name = anchors.find((t) => t && !KNOWN.has(t));
    if (!name) continue;
    let lines = anchors.filter((t) => KNOWN.has(t));
    if (!lines.length) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => strip(m[1]));
      lines = (cells[cells.length - 1] || '').split(/[,\s]+/).filter((t) => KNOWN.has(t));
    }
    const k = norm(name);
    if (!out.has(k)) out.set(k, new Set());
    lines.forEach((l) => out.get(k).add(l));
  }
  return out;
}

// elementy Overpass + mapa MZK -> lista przystanków
function toStops(elements, mzk) {
  const seen = new Set(), stops = [];
  for (const e of elements) {
    if (e.type !== 'node' || seen.has(e.id) || !e.tags || !e.tags.name) continue;
    seen.add(e.id);
    const own = String(e.tags.route_ref || e.tags.lines || '').split(/[;,]/).map((x) => x.trim().toUpperCase()).filter((x) => KNOWN.has(x));
    const fromMzk = mzk && mzk.get(norm(e.tags.name));
    const lines = [...new Set([...own, ...(fromMzk || [])])].sort((a, b) => LINES.indexOf(a) - LINES.indexOf(b));
    stops.push({ id: e.id, name: e.tags.name, lat: e.lat, lon: e.lon, lines, mzk: !!fromMzk });
  }
  return stops;
}

async function fetchOverpass(bbox) {
  const q = `[out:json][timeout:50];(node["highway"="bus_stop"](${bbox});node["public_transport"="platform"]["bus"="yes"](${bbox}););out body;`;
  let err;
  for (const ep of OVERPASS) {
    try {
      const r = await fetch(ep, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
      if (!r.ok) throw new Error(ep + ' HTTP ' + r.status);
      return (await r.json()).elements || [];
    } catch (e) { err = e; console.error('stops: Overpass:', e.message); }
  }
  throw err;
}

async function fetchMzk() {
  const r = await fetch('https://rozklady.mzkopole.pl/przystanki.html', { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('MZK HTTP ' + r.status);
  return parseMzk(await r.text());
}

function createStore(file, bbox) {
  const state = { status: 'loading', updatedAt: 0, matched: 0, stops: [], note: '' };
  try { Object.assign(state, JSON.parse(fs.readFileSync(file, 'utf8')), { status: 'cached' }); } catch {}
  let retries = 0;
  async function refresh() {
    try {
      const elements = await fetchOverpass(bbox);
      let mzk = null, note = '';
      try { mzk = await fetchMzk(); if (!mzk.size) note = 'MZK: nie rozpoznano listy przystanków'; }
      catch (e) { note = 'MZK: ' + e.message; }
      const stops = toStops(elements, mzk);
      Object.assign(state, { status: 'ok', updatedAt: Date.now(), stops, matched: stops.filter((s) => s.mzk).length, note });
      fs.writeFile(file, JSON.stringify(state), () => {});
      console.log(`stops: ${stops.length} z OSM, ${state.matched} dopasowanych do listy MZK (${mzk ? mzk.size : 0} nazw MZK). ${note}`);
    } catch (e) {
      if (!state.stops.length) state.status = 'error';
      state.note = String(e.message || e);
      console.error('stops: błąd pobierania:', state.note);
      if (!state.stops.length && ++retries <= 15) setTimeout(refresh, 120_000);
    }
  }
  const old = () => Date.now() - state.updatedAt > 7 * 86400_000;
  if (!state.stops.length || old()) refresh();
  setInterval(() => { if (!state.stops.length || old()) refresh(); }, 3600_000);
  return state;
}

module.exports = { LINES, parseMzk, toStops, createStore, norm };

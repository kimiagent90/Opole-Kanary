// Silnik mapy: MapLibre GL (wektorowa, obrót, nachylenie, budynki 3D) z automatycznym zapasem na Leaflet (rastrowa).
// Biblioteki ładowane z unpkg, a gdy ten zawiedzie — z jsDelivr.
(() => {
'use strict';
const OPOLE = [50.6751, 17.9213];
const BOUNDS = [[17.65, 50.45], [18.25, 50.9]]; // [lon,lat] SW, NE

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(false), ms))]);
const loadJS = (src) => withTimeout(new Promise((res) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = () => res(true); s.onerror = () => { s.remove(); res(false); }; document.head.appendChild(s); }), 9000);
const loadCSS = (href) => new Promise((res) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = () => res(true); l.onerror = () => res(false); document.head.appendChild(l); setTimeout(() => res(true), 4000); });
async function lib(test, bases, js, css) {
  if (test()) return true;
  for (const b of bases) { const [ok] = await Promise.all([loadJS(b + js), loadCSS(b + css)]); if (ok && test()) return true; }
  return false;
}
const hasGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };
const ML = () => lib(() => window.maplibregl, ['https://unpkg.com/maplibre-gl@4.7.1/dist/', 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/'], 'maplibre-gl.js', 'maplibre-gl.css');
const LF = () => lib(() => window.L, ['https://unpkg.com/leaflet@1.9.4/dist/', 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/'], 'leaflet.js', 'leaflet.css');

const OSM = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
const STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  osm: { version: 8, sources: { r: { type: 'raster', tiles: OSM, tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'r', type: 'raster', source: 'r' }] },
};
const RASTER = {
  liberty: ['https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', '© OpenStreetMap © CARTO'],
  voyager: ['https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', '© OpenStreetMap © CARTO'],
  dark: ['https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', '© OpenStreetMap © CARTO'],
  osm: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap'],
};

/* ---------------- MapLibre ---------------- */
function createML(o) {
  return new Promise((resolve, reject) => {
    const map = new maplibregl.Map({ container: 'map', style: STYLES[o.theme] || STYLES.liberty, center: [OPOLE[1], OPOLE[0]], zoom: 13.2,
      minZoom: 9.5, maxZoom: 19.5, maxBounds: BOUNDS, attributionControl: { compact: true }, dragRotate: true, touchPitch: true, pitchWithRotate: true });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-left');
    let done = false, sawStyle = false, stops = [], line = '';
    const fail = (e) => { if (done) return; done = true; try { map.remove(); } catch {} reject(e); };
    const timer = setTimeout(() => fail(new Error('timeout')), 12000);
    map.on('styledata', () => { sawStyle = true; });
    map.on('error', (e) => { if (!sawStyle && !done) fail(e.error || new Error('style')); });

    const fc = () => ({ type: 'FeatureCollection', features: stops.map((s) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { name: s.name, lines: ',' + s.lines.join(',') + ',' } })) });
    const flt = () => (line ? ['in', ',' + line + ',', ['get', 'lines']] : null);
    function addStopsLayer() {
      try {
        if (map.getSource('stops')) return;
        map.addSource('stops', { type: 'geojson', data: fc() });
        const def = { id: 'stops', type: 'circle', source: 'stops', minzoom: 14,
          paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 4, 18, 8], 'circle-color': '#2f6bff', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.2 } };
        const f = flt(); if (f) def.filter = f;
        map.addLayer(def);
      } catch {}
    }
    function add3d() { // dodaj budynki 3D, jeśli styl ich nie ma (schemat OpenMapTiles)
      try {
        const st = map.getStyle(); if (!st || st.layers.some((l) => l.type === 'fill-extrusion')) return;
        const src = Object.keys(st.sources).find((k) => st.sources[k].type === 'vector'); if (!src) return;
        const before = st.layers.find((l) => l.type === 'symbol');
        map.addLayer({ id: 'bld3d', type: 'fill-extrusion', source: src, 'source-layer': 'building', minzoom: 15,
          paint: { 'fill-extrusion-color': o.theme === 'dark' ? '#2a3350' : '#dfe3ec', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 7],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.82 } }, before && before.id);
      } catch {}
    }
    map.on('style.load', () => { add3d(); addStopsLayer(); });
    map.on('click', 'stops', (e) => {
      if (o.isPicking()) return; const f = e.features && e.features[0]; if (!f) return;
      new maplibregl.Popup({ offset: 10, maxWidth: '260px' }).setLngLat(e.lngLat).setHTML(o.stopHtml({ name: f.properties.name, lines: String(f.properties.lines).split(',').filter(Boolean) })).addTo(map);
    });
    map.on('mouseenter', 'stops', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'stops', () => { map.getCanvas().style.cursor = ''; });
    let clickCb = () => {};
    map.on('click', (e) => clickCb(e.lngLat.lat, e.lngLat.lng));

    const mk = new Map(); let me = null;
    const engine = {
      kind: 'maplibre',
      flyTo: (la, lo, z) => map.flyTo({ center: [lo, la], zoom: z || 16, essential: true }),
      onClick: (cb) => { clickCb = cb; },
      setTheme: (k) => { o.theme = k; map.setStyle(STYLES[k] || STYLES.liberty); },
      setMe: (la, lo) => { if (!me) { const el = document.createElement('div'); el.className = 'me'; me = new maplibregl.Marker({ element: el }).setLngLat([lo, la]).addTo(map); } else me.setLngLat([lo, la]); },
      syncReports(list, html, popup, zOf) {
        const ids = new Set(list.map((r) => r.id));
        for (const [id, e] of mk) if (!ids.has(id)) { e.marker.remove(); mk.delete(id); }
        list.forEach((r) => {
          let e = mk.get(r.id);
          if (!e) {
            const el = document.createElement('div'); el.className = 'mlm'; el.innerHTML = html(r);
            const p = new maplibregl.Popup({ offset: [0, -52], maxWidth: '300px', closeButton: false });
            e = { r, el, p, marker: new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([r.lon, r.lat]).setPopup(p).addTo(map) };
            p.on('open', () => p.setHTML(popup(e.r)));
            mk.set(r.id, e);
          } else { e.r = r; e.el.innerHTML = html(r); if (e.p.isOpen()) e.p.setHTML(popup(r)); }
          e.el.style.zIndex = String(zOf(r));
        });
      },
      setStops(list) { stops = list; const s = map.getSource('stops'); if (s) s.setData(fc()); else if (map.isStyleLoaded()) addStopsLayer(); },
      setStopLine(l) { line = l; if (map.getLayer('stops')) map.setFilter('stops', flt()); },
      closePopups: () => mk.forEach((e) => e.p.isOpen() && e.p.remove()),
      resize: () => map.resize(),
      tilt() { const on = map.getPitch() < 10; map.easeTo({ pitch: on ? 58 : 0, bearing: on ? map.getBearing() : 0, duration: 700 }); return on; },
      canTilt: true,
      destroy: () => map.remove(),
    };
    map.once('load', () => { if (done) return; done = true; clearTimeout(timer); resolve(engine); });
  });
}

/* ---------------- Leaflet (zapas) ---------------- */
function createLF(o) {
  const map = L.map('map', { zoomControl: false, zoomSnap: 0.5, minZoom: 10, maxZoom: 19, maxBounds: L.latLngBounds([BOUNDS[0][1], BOUNDS[0][0]], [BOUNDS[1][1], BOUNDS[1][0]]), maxBoundsViscosity: 0.7 }).setView(OPOLE, 13);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  let tiles; const setTheme = (k) => { if (tiles) map.removeLayer(tiles); const [url, attr] = RASTER[k] || RASTER.voyager; tiles = L.tileLayer(url, { maxZoom: 19, subdomains: 'abcd', attribution: attr }).addTo(map); };
  setTheme(o.theme);
  const layer = L.layerGroup().addTo(map), mk = new Map();
  const stopLayer = L.layerGroup(), renderer = L.canvas({ padding: 0.5 }); let stops = [], line = '', hasLines = false, me = null;
  function renderStops() {
    stopLayer.clearLayers();
    if (map.getZoom() < 14) { if (map.hasLayer(stopLayer)) map.removeLayer(stopLayer); return; }
    if (!map.hasLayer(stopLayer)) stopLayer.addTo(map);
    const b = map.getBounds().pad(0.2);
    stops.filter((s) => b.contains([s.lat, s.lon]) && (!line || !hasLines || s.lines.includes(line))).forEach((s) =>
      L.circleMarker([s.lat, s.lon], { renderer, radius: 5.5, weight: 2.5, color: '#fff', fillColor: '#2f6bff', fillOpacity: 1 }).bindPopup(o.stopHtml(s)).addTo(stopLayer));
  }
  map.on('moveend zoomend', renderStops);
  return {
    kind: 'leaflet',
    flyTo: (la, lo, z) => map.flyTo([la, lo], z || 16),
    onClick: (cb) => map.on('click', (e) => cb(e.latlng.lat, e.latlng.lng)),
    setTheme,
    setMe: (la, lo) => { if (!me) me = L.marker([la, lo], { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [16, 16] }), interactive: false, keyboard: false }).addTo(map); else me.setLatLng([la, lo]); },
    syncReports(list, html, popup, zOf) {
      const ids = new Set(list.map((r) => r.id));
      for (const [id, e] of mk) if (!ids.has(id)) { layer.removeLayer(e.m); mk.delete(id); }
      list.forEach((r) => {
        const icon = L.divIcon({ className: '', html: html(r), iconSize: [44, 55], iconAnchor: [22, 55], popupAnchor: [0, -50] });
        let e = mk.get(r.id);
        if (!e) { e = { r, m: L.marker([r.lat, r.lon], { icon }).bindPopup(() => popup(e.r), { minWidth: 250, maxWidth: 300 }) }; mk.set(r.id, e); e.m.addTo(layer); }
        else { e.r = r; e.m.setIcon(icon); if (e.m.isPopupOpen()) e.m.getPopup().setContent(popup(r)); }
        e.m.setZIndexOffset(zOf(r));
      });
    },
    setStops(list, has) { stops = list; hasLines = !!has; renderStops(); },
    setStopLine(l) { line = l; renderStops(); },
    closePopups: () => map.closePopup(),
    resize: () => map.invalidateSize(),
    tilt: () => false, canTilt: false,
  };
}

async function create(o) {
  if (hasGL() && await ML()) {
    try { return await createML(o); } catch (e) { console.warn('MapLibre niedostępny, przełączam na Leaflet:', e && e.message);
      const m = document.getElementById('map'); m.innerHTML = ''; m.className = ''; m.removeAttribute('style'); }
  }
  if (await LF()) return createLF(o);
  throw new Error('no_map_lib');
}
window.MapEngine = { create };
})();

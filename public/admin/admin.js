(() => {
const $ = (s) => document.querySelector(s);
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let toastT; const toast = (m) => { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2800); };
const ERR = { bad_credentials: 'Неверный логин или пароль', rate_limit: 'Слишком много попыток. Подождите.', admin_disabled: 'Админ-доступ не настроен на сервере', unauthorized: 'Сессия истекла' };

async function api(path, opts = {}) {
  const r = await fetch('/api/admin' + path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-admin': '1' }, credentials: 'same-origin',
    body: opts.body ? JSON.stringify(opts.body) : undefined });
  let j = {}; try { j = await r.json(); } catch {}
  if (r.status === 401 && path !== '/login') showLogin();
  return { ok: r.ok, status: r.status, j };
}
const fmt = (ts) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ts);
const ago = (ts) => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return 'только что'; if (m < 60) return m + ' мин назад'; const h = Math.floor(m / 60); return h < 24 ? h + ' ч назад' : Math.floor(h / 24) + ' д назад'; };
const device = (ua) => { ua = ua || ''; const os = /iphone|ipad/i.test(ua) ? 'iPhone' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : '?';
  const br = /edg\//i.test(ua) ? 'Edge' : /firefox|fxios/i.test(ua) ? 'Firefox' : /samsungbrowser/i.test(ua) ? 'Samsung' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : ''; return os + (br ? ' · ' + br : ''); };
const short = (id) => String(id).slice(0, 8);

function showLogin() { $('#app').hidden = true; $('#login').hidden = false; stopTimer(); }
function showApp() { $('#login').hidden = true; $('#app').hidden = false; refresh(true); startTimer(); }

$('#loginForm').onsubmit = async (e) => {
  e.preventDefault(); $('#lerr').textContent = '';
  const r = await api('/login', { method: 'POST', body: { user: $('#lu').value.trim(), pass: $('#lp').value } });
  if (r.ok) { $('#lp').value = ''; showApp(); } else $('#lerr').textContent = (r.j.error === 'rate_limit' ? `Подождите ${r.j.retry} с.` : ERR[r.j.error]) || 'Ошибка входа';
};
$('#logout').onclick = async () => { await api('/logout', { method: 'POST' }); showLogin(); };

// ---- вкладки ----
let tab = 'overview'; const filt = { reports: 'active', users: 'online', feedback: 'new' };
$('#tabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t;
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === 'p-' + tab)); refresh(true); };
for (const [k, id] of [['reports', 'fReports'], ['users', 'fUsers'], ['feedback', 'fFeedback']])
  $('#' + id).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; filt[k] = b.dataset.f; document.querySelectorAll('#' + id + ' button').forEach((x) => x.classList.toggle('on', x === b)); refresh(true); };

// ---- potwierdzenie dwuetapowe: pierwszy klik uzbraja przycisk ----
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-confirm],[data-do]'); if (!b) return;
  if (b.dataset.confirm && !b.classList.contains('armed')) {
    b.classList.add('armed'); b.dataset.orig = b.textContent; b.textContent = 'Точно? Нажмите ещё раз';
    setTimeout(() => { b.classList.remove('armed'); if (b.dataset.orig) b.textContent = b.dataset.orig; }, 3500); return; }
  b.classList.remove('armed');
  act(b);
});
async function act(b) {
  const d = b.dataset; let r;
  if (b.id === 'clearMap') r = await api('/reports/clear', { method: 'POST' });
  else if (b.id === 'clearChat') r = await api('/chat/clear', { method: 'POST' });
  else if (d.do === 'delReport') r = await api('/reports/' + d.id, { method: 'DELETE' });
  else if (d.do === 'delMsg') r = await api('/chat/' + d.id, { method: 'DELETE' });
  else if (d.do === 'block') r = await api(`/clients/${d.id}/block`, { method: 'POST', body: { blocked: true, purge: true } });
  else if (d.do === 'unblock') r = await api(`/clients/${d.id}/block`, { method: 'POST', body: { blocked: false } });
  else if (d.do === 'fbStatus') r = await api('/feedback/' + d.id, { method: 'POST', body: { status: d.s } });
  else if (d.do === 'fbDel') r = await api('/feedback/' + d.id, { method: 'DELETE' });
  if (r && r.ok) { toast('Готово'); refresh(true); } else if (r) toast('Ошибка: ' + (r.j.error || r.status));
}

// ---- рендер ----
const kpi = (v, l, cls = '', s = '') => `<div class="kpi ${cls}"><div class="v">${v}</div><div class="l">${l}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
function bars(vals, days) {
  const W = 340, H = 150, pad = 18, max = Math.max(1, ...vals), bw = (W - 8) / vals.length;
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${vals.map((v, i) => { const h = Math.round((H - pad - 18) * v / max), x = 4 + i * bw;
    return `<rect class="bar${i === vals.length - 1 ? ' last' : ''}" x="${x + 2}" y="${H - pad - h}" width="${bw - 4}" height="${Math.max(h, 2)}" rx="3"/>` +
      `<text class="val" x="${x + bw / 2}" y="${H - pad - h - 4}" text-anchor="middle">${v || ''}</text>` +
      `<text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${days[i].slice(8)}</text>`; }).join('')}</svg>`;
}
async function loadStats() {
  const r = await api('/stats'); if (!r.ok) return; const s = r.j;
  $('#liveOnline').textContent = s.online; $('#nFeedback').textContent = s.feedbackNew || ''; $('#nReports').textContent = s.reportsActive || '';
  $('#dbinfo').textContent = 'БД: ' + (s.db === 'pg' ? 'PostgreSQL' : 'SQLite (временная!)');
  $('#kpis').innerHTML = kpi(s.online, 'Сейчас онлайн', 'big', 'настоящие пользователи, без ботов') + kpi(s.today, 'Уникальных сегодня', 'big') + kpi(s.total, 'Всего пользователей') + kpi(s.pwa, 'Установили PWA') + kpi(s.push, 'Push-подписчиков') +
    kpi(s.reportsActive, 'Меток на карте') + kpi(s.reportsToday, 'Меток сегодня') + kpi(s.messagesToday, 'Сообщений сегодня') +
    kpi(s.feedbackNew, 'Новых обращений', s.feedbackNew ? 'warn' : '') + kpi(s.blocked, 'Заблокировано', s.blocked ? 'red' : '');
  $('#chUsers').innerHTML = bars(s.series.users, s.series.days); $('#chReports').innerHTML = bars(s.series.reports, s.series.days);
  $('#sysinfo').innerHTML = `<span>Сегодня: <b>${esc(s.day)}</b></span><span>Последняя очистка карты: <b>${esc(s.lastReset || '—')}</b> (каждую полночь, Варшава)</span><span>Аптайм сервера: <b>${Math.round(s.uptime / 60)} мин</b></span>`;
}
const empty = (t) => `<div class="empty">${t}</div>`;
async function loadReports() {
  const r = await api('/reports?f=' + filt.reports); if (!r.ok) return;
  $('#listReports').innerHTML = r.j.map((x) => `<div class="item${x.active ? '' : ' dim'}"><div class="main"><div class="t"><span class="tag amber">${x.route ? 'Линия ' + esc(x.route) : 'без линии'}</span> <b>Контролёров: ${x.count}</b>${x.comment ? ' — ' + esc(x.comment) : ''}</div>
    <div class="m"><span>${fmt(x.createdAt)} (${ago(x.lastConfirmedAt)})</span><span>👍 ${x.confirms} · 👎 ${x.denies}</span><span>автор ${short(x.author)}${x.authorBlocked ? ' (заблокирован)' : ''}</span>
    <span>${x.status === 2 ? '<span class="tag red">удалена админом</span>' : x.active ? '<span class="tag ok">активна</span>' : '<span class="tag">истекла</span>'}</span>
    <a style="color:var(--blue2)" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=17/${x.lat}/${x.lon}">карта ↗</a></div></div>
    <div class="acts">${x.active ? `<button class="btn danger sm" data-confirm="1" data-do="delReport" data-id="${esc(x.id)}">Удалить</button>` : ''}
    ${x.authorBlocked ? '' : `<button class="btn warn sm" data-confirm="1" data-do="block" data-id="${esc(x.author)}">Блок автора</button>`}</div></div>`).join('') || empty('Меток нет');
}
async function loadUsers() {
  const r = await api('/clients?f=' + filt.users); if (!r.ok) return;
  $('#listUsers').innerHTML = r.j.map((c) => `<div class="item${c.blocked ? ' dim' : ''}"><div class="main"><div class="t"><b>${short(c.id)}</b> ${c.online ? '<span class="tag ok">онлайн</span>' : ''} ${c.blocked ? '<span class="tag red">заблокирован</span>' : ''} ${c.standalone ? '<span class="tag blue">PWA</span>' : ''} <span class="tag">${esc((c.lang || '?').toUpperCase())}</span></div>
    <div class="m"><span>${esc(device(c.ua))}</span><span>был ${ago(c.lastSeen)}</span><span>впервые ${fmt(c.firstSeen)}</span><span>меток: ${c.reports}</span><span>сообщений: ${c.messages}</span></div></div>
    <div class="acts">${c.blocked ? `<button class="btn ghost sm" data-do="unblock" data-id="${esc(c.id)}">Разблокировать</button>` : `<button class="btn warn sm" data-confirm="1" data-do="block" data-id="${esc(c.id)}">Блок + удалить следы</button>`}</div></div>`).join('') || empty('Нет пользователей');
}
async function loadChat() {
  const r = await api('/chat'); if (!r.ok) return;
  $('#listChat').innerHTML = r.j.map((m) => `<div class="item${m.deleted ? ' dim' : ''}"><div class="main"><div class="t"><b>${esc(m.nick)}</b>: ${esc(m.text)}</div>
    <div class="m"><span>${fmt(m.createdAt)}</span><span>автор ${short(m.author)}${m.authorBlocked ? ' (заблокирован)' : ''}</span>${m.deleted ? '<span class="tag red">удалено</span>' : ''}</div></div>
    <div class="acts">${m.deleted ? '' : `<button class="btn danger sm" data-do="delMsg" data-id="${esc(m.id)}">Удалить</button>`}${m.authorBlocked ? '' : `<button class="btn warn sm" data-confirm="1" data-do="block" data-id="${esc(m.author)}">Блок автора</button>`}</div></div>`).join('') || empty('Сообщений нет');
}
const KIND = { bug: ['Ошибка', 'red'], idea: ['Идея', 'blue'], other: ['Другое', ''] };
async function loadFeedback() {
  const r = await api('/feedback?f=' + filt.feedback); if (!r.ok) return;
  $('#listFeedback').innerHTML = r.j.map((f) => { const [kn, kc] = KIND[f.kind] || KIND.other; return `<div class="item${f.status === 'done' ? ' dim' : ''}"><div class="main"><div class="t"><span class="tag ${kc}">${kn}</span> ${f.status === 'new' ? '<span class="tag amber">новое</span>' : f.status === 'done' ? '<span class="tag ok">сделано</span>' : ''} ${esc(f.text)}</div>
    <div class="m"><span>${fmt(f.createdAt)}</span>${f.contact ? `<span>контакт: <b>${esc(f.contact)}</b></span>` : ''}<span>автор ${short(f.author)}</span></div></div>
    <div class="acts">${f.status !== 'read' ? `<button class="btn ghost sm" data-do="fbStatus" data-s="read" data-id="${esc(f.id)}">Прочитано</button>` : ''}${f.status !== 'done' ? `<button class="btn sm" data-do="fbStatus" data-s="done" data-id="${esc(f.id)}">Сделано</button>` : ''}<button class="btn danger sm" data-confirm="1" data-do="fbDel" data-id="${esc(f.id)}">Удалить</button></div></div>`; }).join('') || empty('Обращений нет');
}
const LOAD = { overview: () => {}, reports: loadReports, users: loadUsers, chat: loadChat, feedback: loadFeedback };
let busy = false;
async function refresh() { if (busy) return; busy = true; try { await Promise.all([loadStats(), LOAD[tab]()]); } finally { busy = false; } }
let timer; const startTimer = () => { stopTimer(); timer = setInterval(() => { if (!document.hidden) refresh(); }, 10000); }; const stopTimer = () => clearInterval(timer);

(async () => { const r = await api('/me'); r.ok ? showApp() : showLogin(); })();
})();

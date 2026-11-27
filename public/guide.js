// Instrukcja instalacji PWA: ilustracje SVG kroków dla iPhone (Safari) i Android (Chrome).
(() => {
const root = document.getElementById('tab-guide');
const t = (k, v) => I18N.t(k, v);
if (!root) return;
const URL_TXT = location.host || 'kanary-opole.onrender.com';
const hl = (x, y, w, h, r = 8) => `<rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
const T = (x, y, s, fill, txt, extra = '') => `<text x="${x}" y="${y}" font-size="${s}" fill="${fill}" font-family="Inter,system-ui,sans-serif" ${extra}>${txt}</text>`;

const phone = (inner) => `<svg class="ph" viewBox="0 0 160 300" role="img" aria-hidden="true">
<defs><clipPath id="scr"><rect x="7" y="7" width="146" height="286" rx="18"/></clipPath>
<linearGradient id="wpI" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2f7a"/><stop offset="1" stop-color="#7a2f8f"/></linearGradient>
<linearGradient id="wpA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f5c6e"/><stop offset="1" stop-color="#1c2f6b"/></linearGradient></defs>
<rect x="1.5" y="1.5" width="157" height="297" rx="25" fill="#1a2547" stroke="#3a4d8a" stroke-width="3"/>
<g clip-path="url(#scr)">${inner}</g>
<rect x="62" y="12" width="36" height="9" rx="4.5" fill="#000"/></svg>`;

// mini ekran aplikacji (jasna mapa + znaczki + granatowy pasek)
const appScreen = (top = 7, bottom = 293, bar = false) => `
<rect x="7" y="${top}" width="146" height="${bottom - top}" fill="#e7edf2"/>
<path d="M7 150c30-14 52 22 80 8s48-24 66-14" stroke="#a9cdee" stroke-width="12" fill="none"/>
<path d="M7 90h146M7 200h146M40 ${top}v${bottom - top}M110 ${top}v${bottom - top}M7 130l146 40" stroke="#fff" stroke-width="5" fill="none"/>
<rect x="46" y="212" width="34" height="26" rx="4" fill="#cfe5c6"/><rect x="118" y="96" width="28" height="30" rx="4" fill="#cfe5c6"/>
<g fill="#ff2d3d" stroke="#fff" stroke-width="2"><circle cx="58" cy="108" r="6"/><circle cx="100" cy="176" r="6"/><circle cx="26" cy="186" r="5" fill="#9aa3b5"/></g>
<rect x="14" y="${top + 8}" width="20" height="20" rx="6" fill="#0a1430"/>
${bar ? `<rect x="7" y="${bottom - 30}" width="146" height="30" fill="#07122f"/><g fill="#6f9bff"><circle cx="27" cy="${bottom - 15}" r="3"/><circle cx="56" cy="${bottom - 15}" r="3" fill="#93a5d3"/><circle cx="85" cy="${bottom - 15}" r="3" fill="#93a5d3"/><circle cx="114" cy="${bottom - 15}" r="3" fill="#93a5d3"/><circle cx="141" cy="${bottom - 15}" r="3" fill="#93a5d3"/></g>` : ''}`;
const dim = (a = .5) => `<rect x="7" y="7" width="146" height="286" fill="rgba(0,0,0,${a})"/>`;
const share = (cx, cy, c) => `<g stroke="${c}" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M${cx} ${cy + 3}V${cy - 8}M${cx - 3.2} ${cy - 5}L${cx} ${cy - 8}L${cx + 3.2} ${cy - 5}M${cx - 5} ${cy - 3}H${cx - 6}V${cy + 8}H${cx + 6}V${cy - 3}H${cx + 5}"/></g>`;
const homeIcons = (cols, x0, y0, step, size, skip, r) => {
  let s = ''; for (let row = 0; row < 4; row++) for (let c = 0; c < cols; c++) {
    if (row === skip[1] && c === skip[0]) continue;
    s += `<rect x="${x0 + c * step}" y="${y0 + row * 44}" width="${size}" height="${size}" rx="${r}" fill="rgba(255,255,255,${(.14 + ((row + c) % 3) * .06).toFixed(2)})"/>`;
  } return s;
};

/* ---------- iPhone ---------- */
const iosStep1 = () => phone(`${appScreen(7, 236)}
<rect x="7" y="236" width="146" height="57" fill="#f4f6fa"/>
<rect x="16" y="241" width="128" height="20" rx="10" fill="#dfe4ee"/>${T(80, 254.5, 6.2, '#25304a', URL_TXT, 'text-anchor="middle"')}${T(23, 254.5, 6.2, '#25304a', 'aA')}
<g stroke="#8a94ab" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M27 273l-5 5 5 5M57 273l5 5-5 5"/><path d="M104 273h10v10h-10zM136 275h8v8h-8z"/></g>${share(80, 279, '#2b6df0')}`);
const iosStep2 = () => phone(`${appScreen(7, 236)}
<rect x="7" y="236" width="146" height="57" fill="#f4f6fa"/>
<rect x="16" y="241" width="128" height="20" rx="10" fill="#dfe4ee"/>${T(80, 254.5, 6.2, '#25304a', URL_TXT, 'text-anchor="middle"')}
<g stroke="#8a94ab" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M27 273l-5 5 5 5M57 273l5 5-5 5"/><path d="M104 273h10v10h-10zM136 275h8v8h-8z"/></g>${share(80, 279, '#2b6df0')}
${hl(62, 262, 36, 32, 14)}`);
const iosStep3 = () => phone(`${appScreen(7, 293)}${dim(.5)}
<rect x="7" y="86" width="146" height="207" rx="16" fill="#eef0f5"/><rect x="70" y="91" width="20" height="3" rx="1.5" fill="#c3c8d4"/>
<image href="/icon-64.png" x="16" y="101" width="22" height="22"/>${T(44, 110, 7.4, '#111a33', 'Kanary Opole', 'font-weight="700"')}${T(44, 119, 5.4, '#7b86a3', URL_TXT)}
<rect x="14" y="132" width="132" height="104" rx="9" fill="#fff"/>
<path d="M14 157h132M14 182h132M14 207h132" stroke="#e4e7ef" stroke-width="1"/>
${T(22, 148, 6.8, '#111a33', t('s_copy'))}${T(22, 173, 6.8, '#111a33', t('s_bookmark'))}${T(22, 198, 6.8, '#111a33', t('s_addhome'))}${T(22, 223, 6.8, '#111a33', t('s_find'))}
<g stroke="#111a33" fill="none" stroke-width="1.2"><rect x="133" y="192" width="8" height="8" rx="2"/><path d="M137 194v4M135 196h4"/></g>
${hl(13, 183, 134, 24, 7)}`);
const iosStep4 = () => phone(`${appScreen(7, 293)}${dim(.5)}
<rect x="7" y="40" width="146" height="253" rx="16" fill="#f2f2f7"/>
${T(18, 62, 7, '#2b6df0', t('s_cancel'))}${T(80, 58, 6, '#111a33', t('s_add_t1'), 'text-anchor="middle" font-weight="700"')}${T(80, 66, 6, '#111a33', t('s_add_t2'), 'text-anchor="middle" font-weight="700"')}${T(133, 62, 7, '#2b6df0', t('s_add'), 'text-anchor="middle" font-weight="700"')}
<rect x="14" y="80" width="132" height="62" rx="9" fill="#fff"/>
<image href="/icon-180.png" x="20" y="88" width="26" height="26"/>${T(54, 105, 7.8, '#111a33', 'Kanary Opole')}
<path d="M20 122h126" stroke="#e4e7ef"/>${T(22, 135, 5.6, '#7b86a3', URL_TXT)}
${T(20, 160, 5.6, '#6b7491', t('s_hint1'))}${T(20, 169, 5.6, '#6b7491', t('s_hint2'))}
${hl(116, 48, 34, 20, 9)}`);
const iosStep5 = () => phone(`<rect x="7" y="7" width="146" height="286" fill="url(#wpI)"/>
${homeIcons(4, 13, 40, 36, 28, [1, 1], 7)}
<clipPath id="ci"><rect x="49" y="84" width="28" height="28" rx="7"/></clipPath><image href="/icon-180.png" x="49" y="84" width="28" height="28" clip-path="url(#ci)"/>
${T(63, 124, 5.6, '#fff', t('s_kanary'), 'text-anchor="middle"')}
<rect x="13" y="252" width="134" height="34" rx="13" fill="rgba(255,255,255,.22)"/>
${hl(44, 80, 38, 50, 9)}`);

/* ---------- Android ---------- */
const chromeBar = () => `<rect x="7" y="7" width="146" height="32" fill="#f1f3f4"/>
<rect x="14" y="14" width="92" height="18" rx="9" fill="#e1e5e8"/>${T(22, 26, 5.6, '#25304a', URL_TXT)}
<rect x="113" y="15" width="14" height="14" rx="4" fill="none" stroke="#3b4252" stroke-width="1.6"/>${T(120, 25.4, 6.4, '#3b4252', '1', 'text-anchor="middle" font-weight="700"')}
<g fill="#3b4252"><circle cx="141" cy="17" r="1.8"/><circle cx="141" cy="23" r="1.8"/><circle cx="141" cy="29" r="1.8"/></g>`;
const andStep1 = () => phone(`${appScreen(39, 293, true)}${chromeBar()}`);
const andStep2 = () => phone(`${appScreen(39, 293, true)}${chromeBar()}${hl(129, 11, 22, 26, 11)}`);
const andRows = () => [1, 2, 3, 4, 5, 6, 7].map((i) => t('s_a' + i));
const andStep3 = () => phone(`${appScreen(39, 293, true)}${chromeBar()}${dim(.35)}
<rect x="40" y="42" width="108" height="152" rx="9" fill="#fff"/>
${andRows().map((t, i) => T(48, 59 + i * 20, 6.4, '#1b2233', t, i === 4 ? 'font-weight="700"' : '')).join('')}
<g stroke="#1b2233" fill="none" stroke-width="1.1"><rect x="133" y="129" width="8" height="8" rx="2"/><path d="M137 131v4M135 133h4"/></g>
${hl(43, 126, 102, 21, 6)}`);
const andStep4 = () => phone(`${appScreen(39, 293, true)}${chromeBar()}${dim(.55)}
<rect x="16" y="100" width="128" height="98" rx="14" fill="#fff"/>
${T(26, 120, 7.4, '#111a33', t('s_dlg'), 'font-weight="700"')}
<image href="/icon-180.png" x="26" y="128" width="24" height="24"/>${T(57, 138, 7, '#111a33', 'Kanary Opole', 'font-weight="700"')}${T(57, 147, 5.2, '#6b7491', URL_TXT)}
${T(70, 184, 7, '#1a73e8', t('s_cancel'), 'font-weight="700"')}<rect x="98" y="171" width="38" height="18" rx="9" fill="#1a73e8"/>${T(117, 183, 6.6, '#fff', t('s_dlg_ok'), 'text-anchor="middle" font-weight="700"')}
${hl(95, 168, 44, 24, 12)}`);
const andStep5 = () => phone(`<rect x="7" y="7" width="146" height="286" fill="url(#wpA)"/>
${homeIcons(4, 14, 44, 36, 28, [0, 1], 14)}
<clipPath id="ca"><rect x="14" y="88" width="28" height="28" rx="9"/></clipPath><image href="/icon-180.png" x="14" y="88" width="28" height="28" clip-path="url(#ca)"/>
${T(28, 127, 5.6, '#fff', t('s_kanary'), 'text-anchor="middle"')}
<rect x="14" y="258" width="132" height="22" rx="11" fill="rgba(255,255,255,.88)"/>${T(26, 272, 6.4, '#5b6478', t('s_search'))}
${hl(10, 84, 36, 50, 10)}`);

const GUIDE = () => ({
  ios: { name: t('g_ios_name'), intro: t('g_ios_intro'), steps: [1, 2, 3, 4, 5].map((n, i) => [t('g_ios' + n), t('g_ios' + n + 't'), [iosStep1, iosStep2, iosStep3, iosStep4, iosStep5][i]]) },
  android: { name: t('g_and_name'), intro: t('g_and_intro'), steps: [1, 2, 3, 4, 5].map((n, i) => [t('g_and' + n), t('g_and' + n + 't'), [andStep1, andStep2, andStep3, andStep4, andStep5][i]]) },
});

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let which = 'android';
try { which = localStorage.getItem('guideOs') || (isIOS ? 'ios' : 'android'); } catch { which = isIOS ? 'ios' : 'android'; }
if (which !== 'ios' && which !== 'android') which = 'android';
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; draw(); });
addEventListener('appinstalled', () => { deferred = null; draw(); });

function draw() {
  const G = GUIDE(), g = G[which];
  const cta = standalone()
    ? `<div class="cta"><div><b>${t('g_installed')}</b><div class="muted">${t('g_installed_s')}</div></div></div>`
    : deferred ? `<div class="cta"><div><b>${t('g_cta')}</b><div class="muted">${t('g_cta_s')}</div></div><button id="installNow" class="btn">${t('g_install')}</button></div>` : '';
  root.innerHTML = `<h2>${t('g_title')}</h2><p class="lead">${t('g_lead')}</p>${cta}
  <div class="seg" role="tablist">${Object.entries(G).map(([k, v]) => `<button role="tab" data-os="${k}" aria-selected="${k === which}" class="${k === which ? 'on' : ''}">${v.name}</button>`).join('')}</div>
  <p class="muted" style="margin:0 2px 14px">${g.intro}</p>
  <ol class="steps">${g.steps.map(([title, text, art], i) => `<li class="gstep">${art()}<div><span class="gnum">${i + 1}</span><h3>${title}</h3><p>${text}</p></div></li>`).join('')}</ol>
  <p class="note">${t('g_note')}</p>`;
  root.querySelectorAll('.seg button').forEach((b) => b.onclick = () => { which = b.dataset.os; try { localStorage.setItem('guideOs', which); } catch {} draw(); });
  const inst = root.querySelector('#installNow');
  if (inst) inst.onclick = async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch {} deferred = null; draw(); };
}
addEventListener('langchange', draw);
draw();
})();

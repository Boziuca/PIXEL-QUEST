/* =========================================================
   Profil / Setări, Magazinul cosmetic și Sala trofeelor.
   ========================================================= */
import { state, save, resetState } from '../store.js';
import { rerender } from '../router.js';
import { heroById, heroSVG, formIndex, HEROES } from '../heroes.js';
import { levelInfo, ACHIEVEMENTS, currentStreak, evaluate } from '../game.js';
import { screenHead, heroStage, toast, confirmBox, modal, bar } from '../ui.js';
import { icon } from '../icons.js';
import { esc, fmtNum, fmtDate, num } from '../util.js';
import { exportJSON, readBackup, importBackup, pdfsSize } from '../backup.js';
import { clearPhotos, clearPdfs } from '../db.js';
import { sfx } from '../audio.js';

const FORM_NAMES = ['Ucenic', 'Veteran', 'Legendar'];

/* =================== PROFIL =================== */
export function renderProfile(view) {
  const h = heroById(state.hero.id), li = levelInfo(), s = state.settings, g = s.goals;
  const ach = Object.keys(state.achievements).length;
  view.innerHTML = `
    ${screenHead('gear', 'Profil', 'Eroul tău și setările', '')}
    <div class="win">
      ${heroStage(li.level)}
      <div class="mt"><div class="pix" style="font-size:12px">${esc(h.name)}, ${esc(h.title)}</div>
        <p class="muted">${esc(h.story)}</p>
        <p style="color:var(--accent)">★ ${esc(h.spec.label)}</p>
        <p>Nivel ${li.level} · formă: ${FORM_NAMES[formIndex(li.level)]} · ${state.hero.unlocked.length}/${HEROES.length} eroi deblocați</p>
        ${bar(li.cur, li.need, 'bar-xp')}
      </div>
      <a class="btn block mt" href="#/eroi">${icon('hero')} Schimbă eroul</a>
    </div>
    <div class="grid2">
      <a class="btn alt" href="#/realizari">${icon('trophy')} Realizări ${ach}/${ACHIEVEMENTS.length}</a>
      <a class="btn" href="#/magazin">${icon('chest')} Magazin</a>
    </div>
    <div class="win mt"><div class="kpis">
      <div class="kpi"><div class="k-lbl">Total XP</div><div class="k-val">${fmtNum(state.player.xp)}</div></div>
      <div class="kpi"><div class="k-lbl">Monede</div><div class="k-val">${fmtNum(state.player.coins)}</div></div>
      <div class="kpi"><div class="k-lbl">Seria</div><div class="k-val">${currentStreak()} 🔥</div></div>
      <div class="kpi"><div class="k-lbl">Cea mai lungă</div><div class="k-val">${state.counters.bestStreak || 0}</div></div>
    </div></div>

    <div class="win">
      <div class="win-title">${icon('star')} Obiective</div>
      <form id="p-goals">
        <div class="grid2">
          <label class="f"><span>Pași / zi</span><input type="number" id="g-steps" min="500" max="100000" value="${g.steps}"></label>
          <label class="f"><span>Apă / zi (ml)</span><input type="number" id="g-water" min="250" max="8000" step="50" value="${g.water}"></label>
          <label class="f"><span>Kcal / zi</span><input type="number" id="g-kcal" min="800" max="8000" value="${g.kcal}"></label>
          <label class="f"><span>Pagini / zi</span><input type="number" id="g-pages" min="1" max="1000" value="${g.pages}"></label>
          <label class="f"><span>Antrenamente / săpt.</span><input type="number" id="g-wk" min="1" max="14" value="${g.workoutsWeek}"></label>
          <label class="f"><span>Greutate-țintă (kg)</span><input type="number" id="g-weight" min="20" max="400" step="0.1" value="${g.weight || ''}"></label>
        </div>
        <button class="btn block" type="submit">Salvează obiectivele</button>
      </form>
    </div>

    <div class="win">
      <div class="win-title">${icon('gear')} Setări</div>
      <ul class="list">
        <li class="item"><div class="i-main">Temă</div><button class="btn sm ghost" id="p-theme">${s.theme === 'dark' ? '🌙 Întunecată' : '☀ Luminoasă'}</button></li>
        <li class="item"><div class="i-main">Efecte sonore chiptune</div><button class="check ${s.sound ? 'on' : ''}" id="p-sound" aria-label="Sunet"></button></li>
        <li class="item"><div class="i-main">Notificări pentru obiceiuri<div class="i-sub">Merg cât timp aplicația e deschisă sau în fundal.</div></div><button class="check ${s.notifications ? 'on' : ''}" id="p-notif" aria-label="Notificări"></button></li>
        <li class="item"><div class="i-main">Pauză implicită între serii</div><input type="number" class="inline-num" id="p-rest" min="15" max="600" step="15" value="${s.restSec}" aria-label="secunde"> s</li>
      </ul>
    </div>

    <div class="win">
      <div class="win-title">${icon('download')} Date și backup</div>
      <p class="muted small">Totul se salvează doar pe acest dispozitiv. Fă din când în când un backup.</p>
      <div class="grid2">
        <button class="btn alt" id="p-export">${icon('download')} Export JSON</button>
        <button class="btn ghost" id="p-import">${icon('upload')} Import JSON</button>
      </div>
      <button class="btn bad block mt" id="p-reset">Șterge toate datele</button>
    </div>
    <p class="muted small center">PixelQuest · grafică și sunete originale, generate în cod</p>`;

  const $ = q => view.querySelector(q);
  $('#p-goals').addEventListener('submit', e => {
    e.preventDefault();
    const clampI = (v, a, b, d) => { const n = num(v); return n ? Math.min(b, Math.max(a, Math.round(n))) : d; };
    g.steps = clampI($('#g-steps').value, 500, 100000, g.steps);
    g.water = clampI($('#g-water').value, 250, 8000, g.water);
    g.kcal = clampI($('#g-kcal').value, 800, 8000, g.kcal);
    g.pages = clampI($('#g-pages').value, 1, 1000, g.pages);
    g.workoutsWeek = clampI($('#g-wk').value, 1, 14, g.workoutsWeek);
    const w = num($('#g-weight').value); g.weight = w >= 20 ? Math.round(w * 10) / 10 : null;
    save(); evaluate(); toast('Obiective salvate', { icon: 'check' }); rerender();
  });
  $('#p-theme').addEventListener('click', () => { s.theme = s.theme === 'dark' ? 'light' : 'dark'; save(); window.dispatchEvent(new Event('pq-theme')); rerender(); });
  $('#p-sound').addEventListener('click', () => { s.sound = !s.sound; save(); sfx('click'); window.dispatchEvent(new Event('pq-theme')); rerender(); });
  $('#p-notif').addEventListener('click', async () => {
    if (!s.notifications) {
      if (!('Notification' in window)) { toast('Browserul nu suportă notificări', { icon: 'lock' }); return; }
      const p = await Notification.requestPermission();
      if (p !== 'granted') { toast('Permisiunea pentru notificări a fost refuzată', { icon: 'lock' }); return; }
      s.notifications = true; toast('Notificări activate', { icon: 'check' });
    } else s.notifications = false;
    save(); rerender();
  });
  $('#p-rest').addEventListener('change', e => { s.restSec = Math.min(600, Math.max(15, Math.round(num(e.target.value)) || 90)); save(); });
  const doExport = async withPdfs => {
    toast('Se pregătește backup-ul…', { icon: 'download' });
    try { const r = await exportJSON({ withPdfs }); toast(`Backup creat (${r.photos} poze${withPdfs ? `, ${r.pdfs} PDF-uri` : ''}, ${(r.bytes / 1048576).toFixed(1)} MB)`, { icon: 'download' }); }
    catch (e) { console.error(e); toast('Exportul a eșuat (poate e prea mare)', { icon: 'lock' }); }
  };
  $('#p-export').addEventListener('click', async () => {
    const size = await pdfsSize();
    if (!size) { doExport(false); return; }
    modal(`<h2>Export JSON</h2>
      <p>Ai cărți PDF salvate (${(size / 1048576).toFixed(1).replace('.', ',')} MB). Le incluzi în backup?</p>
      <p class="muted small">Fără PDF-uri, backup-ul e mic. Progresul cărților se păstrează, iar fișierele le poți reatașa oricând.</p>
      <div class="modal-actions"><button class="btn ghost" data-close>Renunță</button>
        <button class="btn alt" id="ex-with">Cu PDF-uri</button><button class="btn" id="ex-without">Fără PDF-uri</button></div>`, {
      onMount: (el, close) => {
        el.querySelector('#ex-with').addEventListener('click', () => { close(); doExport(true); });
        el.querySelector('#ex-without').addEventListener('click', () => { close(); doExport(false); });
      },
    });
  });
  $('#p-import').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      try {
        const data = await readBackup(f);
        if (!(await confirmBox(`Importul ÎNLOCUIEȘTE toate datele actuale cu backup-ul din ${data.exported ? fmtDate(data.exported.slice(0, 10)) : 'fișier'} (${(data.photos || []).length} poze). Continui?`, { ok: 'Importă', danger: true }))) return;
        await importBackup(data);
        window.dispatchEvent(new Event('pq-theme'));
        toast('Date importate cu succes', { icon: 'check' }); location.hash = '#/harta'; rerender();
      } catch (e) { console.error(e); toast(e.message || 'Fișier invalid', { icon: 'lock' }); }
    };
    inp.click();
  });
  $('#p-reset').addEventListener('click', async () => {
    if (!(await confirmBox('Ștergi DEFINITIV toate datele: progres, poze, eroi? Fă întâi un export dacă vrei să le păstrezi.', { ok: 'Șterge tot', danger: true }))) return;
    if (!(await confirmBox('Sigur? Acțiunea nu poate fi anulată.', { ok: 'Da, șterge', danger: true }))) return;
    await clearPhotos(); await clearPdfs(); resetState(); location.hash = '#/eroi'; location.reload();
  });
}

/* =================== MAGAZIN =================== */
export const SHOP = [
  { id: 'hat_party', slot: 'hat', name: 'Coif de petrecere', price: 80 },
  { id: 'hat_flower', slot: 'hat', name: 'Floare de câmp', price: 60 },
  { id: 'hat_helm', slot: 'hat', name: 'Coif de oțel', price: 200 },
  { id: 'hat_wizard', slot: 'hat', name: 'Pălărie de mag', price: 250 },
  { id: 'hat_crown', slot: 'hat', name: 'Coroana regelui', price: 600 },
  { id: 'cape_red', slot: 'cape', name: 'Mantie roșie', price: 120 },
  { id: 'cape_blue', slot: 'cape', name: 'Mantie albastră', price: 120 },
  { id: 'cape_green', slot: 'cape', name: 'Mantie de pădurar', price: 150 },
  { id: 'cape_purple', slot: 'cape', name: 'Mantie regală', price: 300 },
  { id: 'cape_gold', slot: 'cape', name: 'Mantie de aur', price: 700 },
  { id: 'aura_blue', slot: 'aura', name: 'Aură de gheață', price: 250 },
  { id: 'aura_pink', slot: 'aura', name: 'Aură de petale', price: 250 },
  { id: 'aura_fire', slot: 'aura', name: 'Aură de foc', price: 350 },
  { id: 'aura_gold', slot: 'aura', name: 'Aură aurie', price: 500 },
  { id: 'pet_slime', slot: 'pet', name: 'Slime prietenos', price: 300 },
  { id: 'pet_bird', slot: 'pet', name: 'Pui de canar', price: 300 },
  { id: 'pet_ghost', slot: 'pet', name: 'Fantomiță', price: 400 },
  { id: 'verde', slot: 'palette', name: 'Temă: Consolă verde', price: 150, colors: ['#0f1f0f', '#306230', '#9bbc0f', '#5f8f2f'] },
  { id: 'apus', slot: 'palette', name: 'Temă: Apus', price: 150, colors: ['#2a1630', '#46254f', '#ff8e5e', '#c94f9a'] },
  { id: 'ocean', slot: 'palette', name: 'Temă: Ocean', price: 150, colors: ['#0d1b2e', '#183454', '#5ee0d6', '#3b8bf0'] },
  { id: 'bomboane', slot: 'palette', name: 'Temă: Bomboane', price: 150, colors: ['#241a33', '#3d2c57', '#ff9bd0', '#9b8cff'] },
];
const SLOTS = { hat: 'Pălării', cape: 'Mantii', aura: 'Aure', pet: 'Companioni', palette: 'Teme' };
let shopTab = 'hat';

export function renderShop(view) {
  const li = levelInfo();
  const eq = state.shop.equipped;
  const items = SHOP.filter(i => i.slot === shopTab);
  view.innerHTML = `
    ${screenHead('chest', 'Magazinul', 'Haine, accesorii și teme', 'profil')}
    <div class="win tight row spread"><span>Monedele tale</span><span class="bigval" style="font-size:16px">${icon('coin').replace('<svg ', '<svg style="width:18px;display:inline-block;vertical-align:middle" ')} ${fmtNum(state.player.coins)}</span></div>
    <div class="tabs">${Object.entries(SLOTS).map(([k, v]) => `<button class="${shopTab === k ? 'on' : ''}" data-t="${k}">${v}</button>`).join('')}</div>
    <div class="shop">
      ${shopTab === 'palette' ? `<div class="shop-item"><div class="swatch"><i style="background:#1a1c2c"></i><i style="background:#2a2f4e"></i><i style="background:#ffcd75"></i><i style="background:#41a6f6"></i></div><div class="small">Temă: Clasică</div>
        ${eq.palette === 'default' || !eq.palette ? '<span class="tag good">ACTIVĂ</span>' : '<button class="btn sm" data-eq="default">Folosește</button>'}</div>` : ''}
      ${items.map(it => {
        const owned = state.shop.owned.includes(it.id);
        const on = eq[it.slot] === it.id;
        const preview = it.slot === 'palette'
          ? `<div class="swatch">${it.colors.map(c => `<i style="background:${c}"></i>`).join('')}</div>`
          : `<div class="hero-sprite">${heroSVG(state.hero.id, li.level, { equipped: { ...eq, [it.slot]: it.id } })}</div>`;
        return `<div class="shop-item">${preview}<div class="small">${esc(it.name)}</div>
          ${owned ? (on ? `<button class="btn sm good" data-uneq="${it.slot}">Echipat ✓</button>` : `<button class="btn sm" data-eq="${it.id}">Echipează</button>`)
            : `<button class="btn sm alt" data-buy="${it.id}" ${state.player.coins >= it.price ? '' : 'disabled'}>${fmtNum(it.price)} ¢</button>`}
        </div>`;
      }).join('')}
    </div>`;
  view.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { shopTab = b.dataset.t; rerender(); }));
  const equip = id => {
    if (id === 'default') eq.palette = 'default';
    else { const it = SHOP.find(x => x.id === id); eq[it.slot] = id; }
    save(); window.dispatchEvent(new Event('pq-theme')); sfx('tick'); rerender();
  };
  view.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => equip(b.dataset.eq)));
  view.querySelectorAll('[data-uneq]').forEach(b => b.addEventListener('click', () => {
    const sl = b.dataset.uneq; eq[sl] = sl === 'palette' ? 'default' : null; save(); window.dispatchEvent(new Event('pq-theme')); rerender();
  }));
  view.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', async () => {
    const it = SHOP.find(x => x.id === b.dataset.buy);
    if (state.player.coins < it.price) { sfx('error'); return; }
    if (!(await confirmBox(`Cumperi „${it.name}” cu ${it.price} monede?`, { ok: 'Cumpără' }))) return;
    state.player.coins -= it.price; state.shop.owned.push(it.id);
    sfx('coin'); toast(`Ai cumpărat: ${it.name}`, { icon: 'chest' });
    equip(it.id);
  }));
}

/* =================== REALIZĂRI =================== */
export function renderAchievements(view) {
  const got = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
  view.innerHTML = `
    ${screenHead('trophy', 'Sala trofeelor', `${got} din ${ACHIEVEMENTS.length} insigne`, 'profil')}
    <div class="win tight">${bar(got, ACHIEVEMENTS.length, 'bar-xp')}</div>
    <div class="badges">${ACHIEVEMENTS.map(a => `<button class="badge ${state.achievements[a.id] ? '' : 'locked'}" data-a="${a.id}">${icon(state.achievements[a.id] ? a.icon : 'lock')}<div class="b-name">${esc(a.name)}</div></button>`).join('')}</div>`;
  view.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
    const a = ACHIEVEMENTS.find(x => x.id === b.dataset.a), d = state.achievements[a.id];
    modal(`<div class="center"><div style="width:64px;margin:0 auto">${icon(d ? a.icon : 'lock')}</div><h2 class="mt">${esc(a.name)}</h2><p>${esc(a.desc)}</p>
      <p class="muted">${d ? `Obținută: ${esc(fmtDate(d))}` : 'Încă blocată'} · +50 XP, +25 monede</p></div>
      <div class="modal-actions"><button class="btn" data-close>OK</button></div>`);
  }));
}

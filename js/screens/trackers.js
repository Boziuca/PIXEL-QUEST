/* =========================================================
   Ecranele de notare simple: Pași (Arena), Apă (Fântâna),
   Mâncare (Taverna), Greutate (Cântarul), Jurnal (Scriptoriul).
   ========================================================= */
import { state, save, day, peekDay } from '../store.js';
import { sel, rerender, setDate, go } from '../router.js';
import { award, revoke, evaluate, waterTotal, foodTotals } from '../game.js';
import { bar, screenHead, dateNav, bindDateNav, emptyState, toast, confirmBox, animateHero } from '../ui.js';
import { barChart, lineChart, drawWhenReady } from '../charts.js';
import { icon } from '../icons.js';
import { esc, fmtNum, fmtDate, fmtShort, uid, num, nowTime, lastNDays, ZILE_SCURT, weekday, todayKey } from '../util.js';
import { hydratePhotos } from '../db.js';
import { addPhoto, removePhoto } from '../photos.js';
import { sfx } from '../audio.js';

/** După orice modificare: salvează, evaluează misiunile, redesenează. */
function commit() { save(); evaluate(sel.date); rerender(); }

/**
 * Ajustează XP-ul legat de o valoare care se poate schimba (pași, greutate, jurnal).
 * obj[field + 'Base'] ține „punctele” de bază, obj[field + 'Xp'] XP-ul acordat efectiv.
 */
function adjustXp(obj, field, cat, newBase, reason) {
  const bk = field + 'Base', xk = field + 'Xp';
  const old = obj[bk] || 0;
  if (newBase > old) obj[xk] = (obj[xk] || 0) + award(cat, newBase - old, { reason });
  else if (newBase < old) { const amt = Math.round((obj[xk] || 0) * (1 - newBase / old)); revoke(cat, amt); obj[xk] = (obj[xk] || 0) - amt; }
  obj[bk] = newBase;
}

const week = () => lastNDays(7, sel.date);
const dayLabel = k => ZILE_SCURT[weekday(k)];

/* =================== PAȘI =================== */
export function renderSteps(view) {
  const k = sel.date, d = peekDay(k), g = state.settings.goals.steps;
  const steps = d?.steps || 0;
  const hist = lastNDays(14, todayKey()).reverse().filter(x => peekDay(x)?.steps);
  view.innerHTML = `
    ${screenHead('shoe', 'Arena', 'Pași · statistica Agilitate')}
    ${dateNav()}
    <div class="win">
      <div class="center"><div class="bigval">${fmtNum(steps)}</div><div class="muted">pași din ${fmtNum(g)}</div></div>
      <div class="mt">${bar(steps, g, steps >= g ? 'bar-good' : 'bar-alt')}</div>
      <form id="st-form" class="row nowrap mt">
        <input type="number" inputmode="numeric" min="0" max="200000" id="st-val" placeholder="Total pași azi" value="${steps || ''}" aria-label="Total pași">
        <button class="btn" type="submit">Salvează</button>
      </form>
      <div class="quick mt">
        <button class="btn sm ghost" data-add="500">+500</button>
        <button class="btn sm ghost" data-add="1000">+1.000</button>
        <button class="btn sm ghost" data-add="2500">+2.500</button>
      </div>
      <p class="muted small mt">Fiecare 1.000 de pași aduce XP. Obiectivul atins dă bonus.</p>
    </div>
    <div class="win"><div class="win-title">${icon('chart')} Ultimele 7 zile</div><canvas class="chart" id="st-chart"></canvas></div>
    <div class="win"><div class="win-title">${icon('scroll')} Istoric</div>
      ${hist.length ? `<ul class="list">${hist.map(x => `<li class="item"><div class="i-main"><div class="i-title">${esc(fmtDate(x))}</div></div><b>${fmtNum(state.days[x].steps)}</b>${state.days[x].steps >= g ? icon('check') : ''}</li>`).join('')}</ul>` : emptyState('shoe', 'Încă nu ai notat pași.')}
    </div>`;
  const setSteps = v => {
    const dd = day(k);
    dd.steps = Math.max(0, Math.min(200000, Math.round(v)));
    adjustXp(dd, 'steps', 'steps', Math.min(60, Math.floor(dd.steps / 1000) * 3), 'Pași notați');
    sfx('tick'); commit();
  };
  view.querySelector('#st-form').addEventListener('submit', e => { e.preventDefault(); setSteps(num(view.querySelector('#st-val').value)); });
  view.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => setSteps(steps + Number(b.dataset.add))));
  bindDateNav(view);
  drawWhenReady(() => barChart(view.querySelector('#st-chart'), week().map(x => ({ label: dayLabel(x), value: peekDay(x)?.steps || 0 })), { goal: g }));
}

/* =================== APĂ =================== */
function glassSVG(p) {
  const H = 20, fill = Math.round(p * 16);
  let s = '<rect x="2" y="1" width="14" height="20" fill="#0b0c15"/><rect x="3" y="1" width="12" height="19" fill="rgba(200,230,255,.25)"/>';
  if (fill > 0) {
    s += `<rect x="3" y="${H - fill}" width="12" height="${fill}" fill="#41a6f6"/>`;
    s += `<g class="wave"><rect x="3" y="${H - fill}" width="3" height="1" fill="#73eff7"/><rect x="8" y="${H - fill}" width="3" height="1" fill="#73eff7"/><rect x="13" y="${H - fill}" width="2" height="1" fill="#73eff7"/></g>`;
  }
  s += '<rect x="4" y="3" width="1" height="12" fill="rgba(255,255,255,.5)"/>';
  return `<svg class="px" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}
export function renderWater(view) {
  const k = sel.date, g = state.settings.goals.water, d = peekDay(k);
  const total = waterTotal(k), list = d?.water || [];
  view.innerHTML = `
    ${screenHead('drop', 'Fântâna', 'Apă · statistica Mana')}
    ${dateNav()}
    <div class="win">
      <div class="water-glass">${glassSVG(Math.min(1, total / g))}</div>
      <div class="center"><div class="bigval">${fmtNum(total)} <small>ml</small></div><div class="muted">din ${fmtNum(g)} ml (${(total / 250).toFixed(1).replace('.0', '')} pahare)</div></div>
      <div class="mt">${bar(total, g, 'bar-mana')}</div>
      <div class="quick mt">
        <button class="btn alt" data-ml="250">+250 ml</button>
        <button class="btn alt" data-ml="500">+500 ml</button>
        <button class="btn alt" data-ml="330">+330 ml</button>
      </div>
      <form id="w-form" class="row nowrap mt">
        <input type="number" inputmode="numeric" min="1" max="3000" id="w-ml" placeholder="Altă cantitate (ml)" aria-label="Cantitate în ml">
        <button class="btn ghost" type="submit">Adaugă</button>
      </form>
    </div>
    <div class="win"><div class="win-title">${icon('scroll')} Azi</div>
      ${list.length ? `<ul class="list">${list.slice().reverse().map(w => `<li class="item">${icon('water')}<div class="i-main"><div class="i-title">${fmtNum(w.ml)} ml</div><div class="i-sub">${esc(w.t)}</div></div><button class="del" data-del="${w.id}" aria-label="Șterge">${icon('trash')}</button></li>`).join('')}</ul>` : emptyState('drop', 'Niciun pahar încă. Fântâna așteaptă!')}
    </div>
    <div class="win"><div class="win-title">${icon('chart')} Ultimele 7 zile</div><canvas class="chart" id="w-chart"></canvas></div>`;
  const add = ml => {
    if (!(ml > 0)) return;
    const dd = day(k);
    const xp = dd.water.length < 12 ? award('water', 2, { reason: `+${ml} ml de apă`, ic: 'drop' }) : 0;
    dd.water.push({ id: uid(), ml: Math.round(ml), t: nowTime(), xp });
    commit();
  };
  view.querySelectorAll('[data-ml]').forEach(b => b.addEventListener('click', () => add(Number(b.dataset.ml))));
  view.querySelector('#w-form').addEventListener('submit', e => { e.preventDefault(); add(Math.min(3000, num(view.querySelector('#w-ml').value))); });
  view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const dd = day(k), w = dd.water.find(x => x.id === b.dataset.del);
    if (!w) return;
    revoke('water', w.xp); dd.water = dd.water.filter(x => x !== w); sfx('delete'); commit();
  }));
  bindDateNav(view);
  drawWhenReady(() => barChart(view.querySelector('#w-chart'), week().map(x => ({ label: dayLabel(x), value: waterTotal(x) })), { goal: g, color: getComputedStyle(document.documentElement).getPropertyValue('--mana') }));
}

/* =================== MÂNCARE =================== */
let pendingFoodPhoto = null;
export function renderFood(view) {
  const k = sel.date, g = state.settings.goals.kcal, d = peekDay(k);
  const t = foodTotals(k), list = (d?.food || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  // alimente notate anterior (pentru completare rapidă)
  const known = {};
  Object.values(state.days).forEach(dd => (dd.food || []).forEach(f => { known[f.name.toLowerCase()] = f; }));
  const knownList = Object.values(known).slice(-80);
  view.innerHTML = `
    ${screenHead('apple', 'Taverna', 'Mâncare · statistica Stamina')}
    ${dateNav()}
    <div class="win">
      <div class="center"><div class="bigval">${fmtNum(t.kcal)} <small>kcal</small></div><div class="muted">obiectiv ${fmtNum(g)} kcal · rămase ${fmtNum(Math.max(0, g - t.kcal))}</div></div>
      <div class="mt">${bar(t.kcal, g, t.kcal > g * 1.1 ? 'bar-hp' : 'bar-warn')}</div>
      <div class="macro">
        <div>Proteine<b>${fmtNum(t.p)} g</b></div><div>Carbohidrați<b>${fmtNum(t.c)} g</b></div><div>Grăsimi<b>${fmtNum(t.f)} g</b></div>
      </div>
    </div>
    <div class="win">
      <div class="win-title">${icon('plus')} Adaugă o masă</div>
      <form id="f-form">
        <label class="f"><span>Aliment</span><input id="f-name" list="f-known" required maxlength="80" placeholder="ex. Omletă cu legume" autocomplete="off"></label>
        <datalist id="f-known">${knownList.map(f => `<option value="${esc(f.name)}">`).join('')}</datalist>
        <div class="grid2">
          <label class="f"><span>Kcal</span><input id="f-kcal" type="number" inputmode="decimal" min="0" step="any" required></label>
          <label class="f"><span>Ora mesei</span><input id="f-time" type="time" value="${nowTime()}"></label>
        </div>
        <div class="grid3">
          <label class="f"><span>Prot. g</span><input id="f-p" type="number" inputmode="decimal" min="0" step="any"></label>
          <label class="f"><span>Carb. g</span><input id="f-c" type="number" inputmode="decimal" min="0" step="any"></label>
          <label class="f"><span>Grăs. g</span><input id="f-f" type="number" inputmode="decimal" min="0" step="any"></label>
        </div>
        <div class="row">
          <button class="btn ghost sm" type="button" id="f-photo">${icon('camera')} ${pendingFoodPhoto ? 'Poză atașată ✓' : 'Poză'}</button>
          <button class="btn grow" type="submit">Adaugă masa</button>
        </div>
      </form>
    </div>
    <div class="win"><div class="win-title">${icon('plate')} Mesele zilei</div>
      ${list.length ? `<ul class="list">${list.map(f => `<li class="item">
        ${f.photoId ? `<img class="i-thumb" data-photo="${f.photoId}" alt="">` : ''}
        <div class="i-main"><div class="i-title">${esc(f.name)}</div><div class="i-sub">${esc(f.time || '')} · ${fmtNum(f.kcal)} kcal · P${fmtNum(f.p)} C${fmtNum(f.c)} G${fmtNum(f.f)}</div></div>
        <button class="del" data-del="${f.id}" aria-label="Șterge">${icon('trash')}</button></li>`).join('')}</ul>` : emptyState('apple', 'Nicio masă notată. Taverna e goală!')}
    </div>
    <div class="win"><div class="win-title">${icon('chart')} Kcal, ultimele 7 zile</div><canvas class="chart" id="f-chart"></canvas></div>`;

  const $ = s => view.querySelector(s);
  $('#f-name').addEventListener('change', () => {
    const f = known[$('#f-name').value.trim().toLowerCase()];
    if (f) { $('#f-kcal').value = f.kcal; $('#f-p').value = f.p || ''; $('#f-c').value = f.c || ''; $('#f-f').value = f.f || ''; }
  });
  $('#f-photo').addEventListener('click', async () => {
    const rec = await addPhoto({ date: k, tag: 'masa', caption: $('#f-name').value.trim() || 'Masă' });
    if (rec) { pendingFoodPhoto = rec.id; $('#f-photo').innerHTML = `${icon('camera')} Poză atașată ✓`; }
  });
  $('#f-form').addEventListener('submit', e => {
    e.preventDefault();
    const dd = day(k);
    const name = $('#f-name').value.trim();
    if (!name) return;
    const xp = dd.food.length < 8 ? award('food', 5, { reason: `Masă notată: ${name}`, ic: 'apple' }) : 0;
    dd.food.push({ id: uid(), name, kcal: num($('#f-kcal').value), p: num($('#f-p').value), c: num($('#f-c').value), f: num($('#f-f').value), time: $('#f-time').value, photoId: pendingFoodPhoto, xp });
    pendingFoodPhoto = null;
    commit();
  });
  view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const dd = day(k), f = dd.food.find(x => x.id === b.dataset.del);
    if (!f || !(await confirmBox(`Ștergi „${f.name}”?`, { ok: 'Șterge', danger: true }))) return;
    revoke('food', f.xp);
    if (f.photoId) await removePhoto(f.photoId, k);
    dd.food = dd.food.filter(x => x !== f); sfx('delete'); commit();
  }));
  bindDateNav(view);
  hydratePhotos(view);
  drawWhenReady(() => barChart($('#f-chart'), week().map(x => ({ label: dayLabel(x), value: foodTotals(x).kcal })), { goal: g, color: getComputedStyle(document.documentElement).getPropertyValue('--warn') }));
}

/* =================== GREUTATE =================== */
export function renderWeight(view) {
  const k = sel.date, d = peekDay(k), goal = state.settings.goals.weight;
  const entries = Object.keys(state.days).sort().filter(x => state.days[x].weight).map(x => ({ k: x, v: state.days[x].weight }));
  const last = entries[entries.length - 1], first = entries[0];
  view.innerHTML = `
    ${screenHead('scale', 'Cântarul', 'Greutate · statistica Forță')}
    ${dateNav()}
    <div class="win">
      <div class="kpis">
        <div class="kpi"><div class="k-lbl">Azi / ziua aleasă</div><div class="k-val">${d?.weight ? fmtNum(d.weight, 1) + ' kg' : '–'}</div></div>
        <div class="kpi"><div class="k-lbl">Țintă</div><div class="k-val">${goal ? fmtNum(goal, 1) + ' kg' : '–'}</div></div>
        <div class="kpi"><div class="k-lbl">Evoluție totală</div><div class="k-val">${first && last && entries.length > 1 ? (last.v - first.v > 0 ? '+' : '') + fmtNum(last.v - first.v, 1) + ' kg' : '–'}</div></div>
        <div class="kpi"><div class="k-lbl">Până la țintă</div><div class="k-val">${goal && last ? fmtNum(Math.abs(last.v - goal), 1) + ' kg' : '–'}</div></div>
      </div>
      <form id="kg-form" class="row nowrap mt">
        <input type="number" inputmode="decimal" step="0.1" min="20" max="400" id="kg-val" placeholder="Greutatea (kg)" value="${d?.weight || ''}" aria-label="Greutate în kg">
        <button class="btn" type="submit">Salvează</button>
      </form>
      <form id="kg-goal" class="row nowrap mt">
        <input type="number" inputmode="decimal" step="0.1" min="20" max="400" id="kg-goalv" placeholder="Greutatea-țintă (kg)" value="${goal || ''}" aria-label="Greutate-țintă">
        <button class="btn ghost" type="submit">Setează ținta</button>
      </form>
      <div class="row mt"><button class="btn sm ghost" id="kg-photo">${icon('camera')} Poză de progres</button></div>
    </div>
    <div class="win"><div class="win-title">${icon('chart')} Evoluție (ultimele 30 de cântăriri)</div><canvas class="chart" id="kg-chart"></canvas></div>
    <div class="win"><div class="win-title">${icon('scroll')} Istoric</div>
      ${entries.length ? `<ul class="list">${entries.slice(-30).reverse().map((e, i, arr) => { const prev = arr[i + 1]; const diff = prev ? e.v - prev.v : 0; return `<li class="item"><div class="i-main"><div class="i-title">${esc(fmtDate(e.k))}</div>${prev ? `<div class="i-sub">${diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '= '}${fmtNum(diff, 1)} kg</div>` : ''}</div><b>${fmtNum(e.v, 1)} kg</b><button class="del" data-del="${e.k}" aria-label="Șterge">${icon('trash')}</button></li>`; }).join('')}</ul>` : emptyState('scale', 'Nicio cântărire încă.')}
    </div>`;
  const $ = s => view.querySelector(s);
  $('#kg-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = num($('#kg-val').value); if (v < 20 || v > 400) { toast('Introdu o greutate validă', { icon: 'scale' }); return; }
    const dd = day(k); dd.weight = Math.round(v * 10) / 10;
    adjustXp(dd, 'weight', 'weight', 10, 'Cântărire notată');
    sfx('tick'); commit();
  });
  $('#kg-goal').addEventListener('submit', e => {
    e.preventDefault();
    const v = num($('#kg-goalv').value);
    state.settings.goals.weight = v >= 20 ? Math.round(v * 10) / 10 : null;
    toast('Ținta a fost salvată', { icon: 'scale' }); commit();
  });
  $('#kg-photo').addEventListener('click', async () => { if (await addPhoto({ date: k, tag: 'progres', caption: 'Progres' })) commit(); });
  view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const dd = day(b.dataset.del); dd.weight = null; adjustXp(dd, 'weight', 'weight', 0); sfx('delete'); commit();
  }));
  bindDateNav(view);
  drawWhenReady(() => lineChart($('#kg-chart'), entries.slice(-30).map(e => ({ label: fmtShort(e.k), value: e.v })), { goal, unit: ' kg' }));
}

/* =================== JURNAL =================== */
export function renderJournal(view) {
  const k = sel.date, d = peekDay(k);
  const past = Object.keys(state.days).sort().reverse().filter(x => (state.days[x].journal || '').trim()).slice(0, 30);
  view.innerHTML = `
    ${screenHead('quill', 'Scriptoriul', 'Jurnalul aventurierului')}
    ${dateNav()}
    <div class="win">
      <label class="f"><span>Ce s-a întâmplat azi în aventura ta?</span>
        <textarea id="j-text" maxlength="4000" placeholder="Azi am învins dragonul lenei…">${esc(d?.journal || '')}</textarea></label>
      <div class="row spread"><span class="muted small" id="j-count">${(d?.journal || '').length} / 4000</span><button class="btn" id="j-save">Salvează</button></div>
      <p class="muted small mt">Minimum 20 de caractere pentru XP.</p>
    </div>
    <div class="win"><div class="win-title">${icon('book')} Pagini din cronică</div>
      ${past.length ? `<ul class="list">${past.map(x => `<li class="item" data-goto="${x}" style="cursor:pointer"><div class="i-main"><div class="i-title">${esc(fmtDate(x))}</div><div class="i-sub journal-text">${esc(state.days[x].journal.slice(0, 140))}${state.days[x].journal.length > 140 ? '…' : ''}</div></div></li>`).join('')}</ul>` : emptyState('quill', 'Cronica ta e încă albă.')}
    </div>`;
  const ta = view.querySelector('#j-text');
  ta.addEventListener('input', () => { view.querySelector('#j-count').textContent = `${ta.value.length} / 4000`; });
  view.querySelector('#j-save').addEventListener('click', () => {
    const dd = day(k); dd.journal = ta.value;
    adjustXp(dd, 'journal', 'journal', ta.value.trim().length >= 20 ? 10 : 0, 'Pagină de jurnal scrisă');
    toast('Jurnal salvat', { icon: 'quill' }); animateHero('quest'); commit();
  });
  view.querySelectorAll('[data-goto]').forEach(li => li.addEventListener('click', () => { setDate(li.dataset.goto); go('jurnal'); }));
  bindDateNav(view);
}

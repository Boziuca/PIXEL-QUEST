/* =========================================================
   Calendar lunar – zilele colorate după performanță
   (câte obiective au fost atinse), cu marcaj pentru antrenamente.
   ========================================================= */
import { state, peekDay } from '../store.js';
import { rerender, setDate, go } from '../router.js';
import { dayGoals, dayScore, waterTotal, foodTotals, pagesTotal, workoutsOn, dailyHabits, habitCount, tasksDoneOn } from '../game.js';
import { screenHead, modal } from '../ui.js';
import { icon } from '../icons.js';
import { esc, dkey, todayKey, fmtDate, fmtNum, LUNI, ZILE_SCURT, weekday } from '../util.js';
import { hydratePhotos } from '../db.js';

let ym = null; // [an, lună]

export function renderCalendar(view) {
  const now = new Date();
  if (!ym) ym = [now.getFullYear(), now.getMonth()];
  const [y, m] = ym;
  const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  const pad = weekday(dkey(first));
  const t = todayKey();
  let wins = 0, workouts = 0;
  const cells = [];
  for (let i = 0; i < pad; i++) cells.push('<div class="day out"></div>');
  for (let d = 1; d <= days; d++) {
    const k = dkey(new Date(y, m, d));
    const future = k > t;
    const sc = future ? 0 : dayScore(k);
    if (sc >= 2) wins++;
    const w = workoutsOn(k).length; workouts += w;
    const lvl = sc >= 5 ? 4 : sc >= 3 ? 3 : sc >= 2 ? 2 : sc >= 1 ? 1 : 0;
    const dd = peekDay(k);
    cells.push(`<button class="day l${lvl} ${k === t ? 'today' : ''}" data-k="${k}" ${future ? 'disabled style="opacity:.4"' : ''} aria-label="${d} ${LUNI[m]}: ${sc} obiective">${d}
      <span class="marks">${w ? '<i class="gym"></i>' : ''}${(dd?.journal || '').trim() ? '<i></i>' : ''}</span></button>`);
  }

  view.innerHTML = `
    ${screenHead('calendar', 'Calendar', 'Zilele tale, colorate după performanță', '')}
    <div class="win">
      <div class="datenav">
        <button class="btn sm ghost" data-m="-1" aria-label="Luna anterioară">◀</button>
        <div class="d-label">${LUNI[m].toUpperCase()} ${y}</div>
        <button class="btn sm ghost" data-m="1" aria-label="Luna următoare">▶</button>
      </div>
      <div class="cal">${ZILE_SCURT.map(z => `<div class="dow">${z}</div>`).join('')}${cells.join('')}</div>
      <div class="legend"><span>Obiective:</span><i style="background:var(--heat0)"></i>0 <i style="background:var(--heat1)"></i>1 <i style="background:var(--heat2)"></i>2 <i style="background:var(--heat3)"></i>3-4 <i style="background:var(--heat4)"></i>5+</div>
      <div class="legend"><i style="background:var(--bad)"></i>antrenament <i style="background:var(--accent2)"></i>jurnal</div>
    </div>
    <div class="win"><div class="kpis">
      <div class="kpi"><div class="k-lbl">Zile câștigate</div><div class="k-val">${wins}</div></div>
      <div class="kpi"><div class="k-lbl">Antrenamente</div><div class="k-val">${workouts}</div></div>
    </div><p class="muted small mt">O zi e „câștigată” când atingi cel puțin 2 obiective: pași, apă, kcal, pagini, toate obiceiurile, antrenament.</p></div>`;

  view.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
    let [yy, mm] = ym; mm += Number(b.dataset.m);
    if (mm < 0) { mm = 11; yy--; } if (mm > 11) { mm = 0; yy++; }
    ym = [yy, mm]; rerender();
  }));
  view.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => dayDetails(b.dataset.k)));
}

function dayDetails(k) {
  const d = peekDay(k), g = state.settings.goals, goals = dayGoals(k), f = foodTotals(k);
  const hs = dailyHabits(k);
  const line = (ok, ic, text) => `<li class="item">${icon(ic)}<div class="i-main">${text}</div>${ok ? icon('check') : ''}</li>`;
  modal(`<h2>${esc(fmtDate(k))}</h2>
    <ul class="list">
      ${line(goals.steps, 'shoe', `${fmtNum(d?.steps || 0)} / ${fmtNum(g.steps)} pași`)}
      ${line(goals.water, 'drop', `${fmtNum(waterTotal(k))} / ${fmtNum(g.water)} ml apă`)}
      ${line(goals.kcal, 'apple', `${fmtNum(f.kcal)} / ${fmtNum(g.kcal)} kcal (${d?.food?.length || 0} mese)`)}
      ${line(goals.pages, 'book', `${pagesTotal(k)} / ${g.pages} pagini`)}
      ${line(goals.habits, 'lotus', `${hs.filter(h => habitCount(h, k) >= h.times).length} / ${hs.length} obiceiuri`)}
      ${line(goals.workout, 'dumbbell', workoutsOn(k).map(w => esc(w.name)).join(', ') || 'Fără antrenament')}
      ${d?.weight ? line(false, 'scale', `${fmtNum(d.weight, 1)} kg`) : ''}
      ${line(false, 'scroll', `${tasksDoneOn(k)} sarcini îndeplinite`)}
    </ul>
    ${d?.journal ? `<div class="win tight mt"><div class="journal-text">${esc(d.journal)}</div></div>` : ''}
    ${d?.photos?.length ? `<div class="photo-strip mt">${d.photos.map(id => `<img data-photo="${id}" alt="">`).join('')}</div>` : ''}
    <div class="modal-actions"><button class="btn ghost" data-close>Închide</button><button class="btn" id="dd-open">Deschide ziua</button></div>`, {
    onMount: (el, close) => {
      hydratePhotos(el);
      el.querySelector('#dd-open').addEventListener('click', () => { close(); setDate(k); go('azi'); });
    },
  });
}

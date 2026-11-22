/* =========================================================
   Statistici – grafice săptămânale și lunare în stil pixel,
   plus statisticile personajului (Agilitate, Mana, Forță …).
   ========================================================= */
import { state, peekDay } from '../store.js';
import { rerender } from '../router.js';
import { CATS, statLevel, waterTotal, foodTotals, pagesTotal, workoutsOn, dailyHabits, habitCount, levelInfo } from '../game.js';
import { screenHead, bar } from '../ui.js';
import { barChart, lineChart, drawWhenReady } from '../charts.js';
import { icon } from '../icons.js';
import { esc, fmtNum, lastNDays, fmtShort, ZILE_SCURT, weekday } from '../util.js';

let range = 7;

export function renderStats(view) {
  const ks = lastNDays(range);
  const lab = k => (range === 7 ? ZILE_SCURT[weekday(k)] : fmtShort(k));
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const avg = arr => { const v = arr.filter(x => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
  const habitPct = k => { const hs = dailyHabits(k); return hs.length ? Math.round(hs.filter(h => habitCount(h, k) >= h.times).length / hs.length * 100) : 0; };
  const steps = ks.map(k => peekDay(k)?.steps || 0), water = ks.map(waterTotal), kcal = ks.map(k => foodTotals(k).kcal);
  const workouts = ks.reduce((s, k) => s + workoutsOn(k).length, 0);
  const g = state.settings.goals;
  const li = levelInfo();
  const maxStat = Math.max(1, ...Object.keys(CATS).map(c => statLevel(c)));

  view.innerHTML = `
    ${screenHead('chart', 'Statistici', 'Cronica progresului tău', '')}
    <div class="tabs">
      <button class="${range === 7 ? 'on' : ''}" data-r="7">Săptămâna</button>
      <button class="${range === 30 ? 'on' : ''}" data-r="30">Luna (30 zile)</button>
    </div>
    <div class="win"><div class="kpis">
      <div class="kpi"><div class="k-lbl">Pași / zi</div><div class="k-val">${fmtNum(avg(steps))}</div></div>
      <div class="kpi"><div class="k-lbl">Apă / zi</div><div class="k-val">${fmtNum(avg(water))} ml</div></div>
      <div class="kpi"><div class="k-lbl">Kcal / zi</div><div class="k-val">${fmtNum(avg(kcal))}</div></div>
      <div class="kpi"><div class="k-lbl">Pagini</div><div class="k-val">${fmtNum(ks.reduce((s, k) => s + pagesTotal(k), 0))}</div></div>
      <div class="kpi"><div class="k-lbl">Antrenamente</div><div class="k-val">${workouts}</div></div>
      <div class="kpi"><div class="k-lbl">Obiceiuri</div><div class="k-val">${Math.round(ks.map(habitPct).reduce((a, b) => a + b, 0) / ks.length)}%</div></div>
    </div></div>

    <div class="win"><div class="win-title">${icon('shoe')} Pași</div><canvas class="chart" id="c-steps"></canvas></div>
    <div class="win"><div class="win-title">${icon('drop')} Apă (ml)</div><canvas class="chart" id="c-water"></canvas></div>
    <div class="win"><div class="win-title">${icon('apple')} Kcal</div><canvas class="chart" id="c-kcal"></canvas></div>
    <div class="win"><div class="win-title">${icon('book')} Pagini citite</div><canvas class="chart" id="c-pages"></canvas></div>
    <div class="win"><div class="win-title">${icon('lotus')} Obiceiuri îndeplinite (%)</div><canvas class="chart" id="c-habits"></canvas></div>
    <div class="win"><div class="win-title">${icon('scale')} Greutate</div><canvas class="chart" id="c-weight"></canvas></div>
    <div class="win"><div class="win-title">${icon('dumbbell')} Volum la sală (kg)</div><canvas class="chart" id="c-gym"></canvas></div>

    <div class="win stat-list">
      <div class="win-title">${icon('hero')} Statisticile eroului · niv. ${li.level}</div>
      ${Object.entries(CATS).map(([c, v]) => `<div class="statbar"><span class="small">${esc(v.stat)}</span>${bar(statLevel(c), maxStat, 'bar-alt', `${fmtNum(state.player.catXp[c] || 0)} XP`)}<span class="lvl">${statLevel(c)}</span></div>`).join('')}
      <p class="muted small mt">Total XP: ${fmtNum(state.player.xp)} · Monede: ${fmtNum(state.player.coins)}</p>
    </div>`;

  view.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { range = Number(b.dataset.r); rerender(); }));
  drawWhenReady(() => {
    const $ = s => view.querySelector(s);
    if (!$('#c-steps')) return;
    barChart($('#c-steps'), ks.map((k, i) => ({ label: lab(k), value: steps[i] })), { goal: g.steps });
    barChart($('#c-water'), ks.map((k, i) => ({ label: lab(k), value: water[i] })), { goal: g.water, color: css('--mana') });
    barChart($('#c-kcal'), ks.map((k, i) => ({ label: lab(k), value: kcal[i] })), { goal: g.kcal, color: css('--warn') });
    barChart($('#c-pages'), ks.map(k => ({ label: lab(k), value: pagesTotal(k) })), { goal: g.pages, color: css('--accent2') });
    barChart($('#c-habits'), ks.map(k => ({ label: lab(k), value: habitPct(k) })), { goal: 100, color: css('--good') });
    lineChart($('#c-weight'), ks.filter(k => peekDay(k)?.weight).map(k => ({ label: fmtShort(k), value: peekDay(k).weight })), { goal: g.weight, unit: ' kg' });
    barChart($('#c-gym'), ks.map(k => ({ label: lab(k), value: workoutsOn(k).reduce((s, w) => s + (w.volume || 0), 0) })), { color: css('--bad') });
  });
}

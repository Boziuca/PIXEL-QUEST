/* =========================================================
   Harta – meniul principal. Fiecare categorie e o clădire.
   Semnul „!” = obiectivul de azi nu e atins, „✓” = atins.
   ========================================================= */
import { icon } from '../icons.js';
import { esc, todayKey } from '../util.js';
import { dayGoals, dailyHabits, habitCount, tasksDoneOn } from '../game.js';
import { state, peekDay } from '../store.js';

/** Clădire pixel-art generată: acoperiș colorat, ziduri, ușă și firmă cu iconiță. */
function building(roof, wall, ic, kind = 'house') {
  const k = '#0b0c15';
  const roofRows = kind === 'tower'
    ? [[8, 4], [7, 6], [6, 8], [6, 8], [5, 10]]
    : [[8, 4], [6, 8], [4, 12], [2, 16], [1, 18]];
  let s = '';
  roofRows.forEach(([x, w], y) => {
    s += `<rect x="${x - 1}" y="${y + 1}" width="${w + 2}" height="1" fill="${k}"/><rect x="${x}" y="${y + 1}" width="${w}" height="1" fill="${roof}"/>`;
  });
  if (kind === 'tower') s += `<rect x="9" y="0" width="2" height="1" fill="${k}"/><rect x="10" y="-2" width="1" height="2" fill="${k}"/><rect x="11" y="-2" width="3" height="2" fill="#e04f5f"/>`;
  const wx = kind === 'tower' ? 5 : 3, ww = kind === 'tower' ? 10 : 14;
  s += `<rect x="${wx - 1}" y="6" width="${ww + 2}" height="14" fill="${k}"/><rect x="${wx}" y="6" width="${ww}" height="13" fill="${wall}"/>`;
  s += `<rect x="${wx}" y="6" width="${ww}" height="1" fill="rgba(0,0,0,.25)"/>`;
  // ușă
  s += `<rect x="8" y="14" width="4" height="5" fill="${k}"/><rect x="9" y="15" width="2" height="4" fill="#5d4037"/>`;
  // firmă cu iconiță
  s += `<rect x="6" y="7" width="8" height="7" fill="${k}"/><rect x="7" y="8" width="6" height="5" fill="#f4f0e1"/>`;
  const iconSvg = icon(ic).replace('<svg ', '<svg x="7" y="8" width="6" height="5" preserveAspectRatio="xMidYMid meet" ');
  return `<svg class="px" viewBox="0 -2 20 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s}${iconSvg}</svg>`;
}

export function renderMap(view) {
  const k = todayKey();
  const goals = dayGoals(k);
  const d = peekDay(k);
  const habitsLeft = dailyHabits(k).filter(h => habitCount(h, k) < h.times).length;
  const tasksToday = state.tasks.filter(t => !t.done && t.date && t.date <= k).length;

  // [rută, nume, culoare acoperiș, culoare zid, iconiță, stare]
  const B = [
    ['pasi', 'Arena', '#e04f5f', '#c2a37a', 'shoe', goals.steps, 'house'],
    ['apa', 'Fântâna', '#41a6f6', '#94b0c2', 'drop', goals.water, 'tower'],
    ['mancare', 'Taverna', '#ef7d57', '#c9a26b', 'apple', goals.kcal, 'house'],
    ['greutate', 'Cântarul', '#566c86', '#c2c3c7', 'scale', !!d?.weight, 'tower'],
    ['carti', 'Biblioteca', '#6a3c8f', '#d8c9a3', 'book', goals.pages, 'house'],
    ['sala', 'Sala de forță', '#b13e53', '#9a8a7a', 'dumbbell', goals.workout ? true : null, 'house'],
    ['obiceiuri', 'Templul', '#38b764', '#e6e3f2', 'lotus', habitsLeft === 0, 'tower'],
    ['sarcini', 'Turnul misiunilor', '#c98f2e', '#a7a0b8', 'scroll', tasksToday === 0 ? null : false, 'tower'],
    ['jurnal', 'Scriptoriul', '#257179', '#d8c9a3', 'quill', (d?.journal || '').trim().length >= 20, 'house'],
    ['galerie', 'Atelierul', '#ff9bd0', '#e6dbbd', 'camera', null, 'house'],
    ['magazin', 'Magazinul', '#ffcd75', '#b8865a', 'chest', null, 'house'],
    ['realizari', 'Sala trofeelor', '#ffcd75', '#94b0c2', 'trophy', null, 'tower'],
  ];

  view.innerHTML = `
    <div class="screen-head">
      <div class="scr-icon">${icon('map')}</div>
      <div class="grow"><h1>Harta regatului</h1><div class="sub">Atinge o clădire ca să intri.</div></div>
    </div>
    <div class="map">
      ${B.map(([r, name, roof, wall, ic, st, kind]) => `
        <a class="bld" href="#/${r}">
          ${st === true ? '<span class="bld-badge bld-done">✓</span>' : st === false ? '<span class="bld-badge">!</span>' : ''}
          ${building(roof, wall, ic, kind)}
          <span class="bld-name">${esc(name)}</span>
        </a>`).join('')}
    </div>
    <div class="row mt">
      <a class="btn block" href="#/azi">${icon('sword')} Misiunile zilei</a>
    </div>`;
}

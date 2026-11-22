/* =========================================================
   Dashboard zilnic: avatarul, barele HP / Mana / Stamina / XP,
   misiunile zilei și ale săptămânii, obiceiuri și sarcini.
   ========================================================= */
import { state, peekDay } from '../store.js';
import { sel } from '../router.js';
import { heroById, formIndex } from '../heroes.js';
import { levelInfo, dailyQuests, weeklyQuests, waterTotal, foodTotals, pagesTotal, dailyHabits, habitCount, currentStreak, dayScore, CATS, statLevel } from '../game.js';
import { bar, dateNav, bindDateNav, heroStage } from '../ui.js';
import { icon } from '../icons.js';
import { esc, fmtNum, todayKey, pct } from '../util.js';

const FORM_NAMES = ['Ucenic', 'Veteran', 'Legendar'];

function questHTML(q) {
  return `<div class="quest ${q.done ? 'done' : ''}">
    <div class="q-icon">${icon(q.done ? 'check' : q.icon)}</div>
    <div class="q-main">
      <div class="q-title">${esc(q.title)}</div>
      ${bar(Math.min(q.cur, q.target), q.target, q.done ? 'bar-good' : 'bar-alt', `${fmtNum(Math.min(q.cur, q.target))} / ${fmtNum(q.target)}`)}
    </div>
    <div class="q-reward">${q.done ? 'GATA' : `+${q.xp}XP<br>+${q.coins}¢`}</div>
  </div>`;
}

export function renderDash(view) {
  const k = sel.date;
  const g = state.settings.goals;
  const d = peekDay(k);
  const hero = heroById(state.hero.id);
  const li = levelInfo();
  const water = waterTotal(k), kcal = foodTotals(k).kcal;
  const habits = dailyHabits(k);
  const habitsDone = habits.filter(h => habitCount(h, k) >= h.times).length;
  const hp = Math.round(((pct(d?.steps || 0, g.steps) + (habits.length ? habitsDone / habits.length : 0) + pct(pagesTotal(k), g.pages)) / 3) * 100);
  const streak = currentStreak();
  const tasks = state.tasks.filter(t => !t.done && t.date && t.date <= k).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const isToday = k === todayKey();
  const topStats = Object.entries(CATS).filter(([c]) => (state.player.catXp[c] || 0) > 0).sort((a, b) => (state.player.catXp[b[0]] || 0) - (state.player.catXp[a[0]] || 0)).slice(0, 3);

  view.innerHTML = `
    ${dateNav()}
    <div class="win">
      ${heroStage(li.level)}
      <div class="row spread mt">
        <div><div class="pix" style="font-size:12px">${esc(hero.name)}</div><div class="muted small">${esc(hero.title)} · ${FORM_NAMES[formIndex(li.level)]}</div></div>
        <div class="center"><div class="bigval">${li.level}</div><div class="muted small">nivel</div></div>
      </div>
      <div class="mt">
        <div class="statbar"><span class="lbl" style="color:var(--hp)">HP</span>${bar(hp, 100, 'bar-hp', `${hp}%`)}</div>
        <div class="statbar"><span class="lbl" style="color:var(--mana)">MANA</span>${bar(water, g.water, 'bar-mana', `${fmtNum(water)} / ${fmtNum(g.water)} ml`)}</div>
        <div class="statbar"><span class="lbl" style="color:var(--warn)">STA</span>${bar(kcal, g.kcal, 'bar-warn', `${fmtNum(kcal)} / ${fmtNum(g.kcal)} kcal`)}</div>
        <div class="statbar"><span class="lbl" style="color:var(--xp)">XP</span>${bar(li.cur, li.need, 'bar-xp')}</div>
      </div>
      <div class="row spread mt">
        <span class="flame">${icon('flame')} Serie: ${streak} ${streak === 1 ? 'zi' : 'zile'}</span>
        <span class="muted">Obiective azi: ${dayScore(k)}/6</span>
      </div>
      ${topStats.length ? `<div class="row mt">${topStats.map(([c, v]) => `<span class="tag">${esc(v.stat)} ${statLevel(c)}</span>`).join('')}</div>` : ''}
    </div>

    <div class="win">
      <div class="win-title">${icon('sword')} Misiunile zilei</div>
      ${dailyQuests(k).map(questHTML).join('')}
      <div class="win-title mt">${icon('trophy')} Misiunile săptămânii</div>
      ${weeklyQuests(k).map(questHTML).join('')}
    </div>

    <div class="win">
      <div class="win-title">${icon('lotus')} Obiceiuri <span class="right muted small">${habitsDone}/${habits.length}</span></div>
      ${bar(habitsDone, Math.max(1, habits.length), 'bar-good', habits.length ? `${habitsDone} din ${habits.length}` : 'niciun obicei azi')}
      <a class="btn block mt" href="#/obiceiuri">Bifează obiceiurile</a>
    </div>

    <div class="win">
      <div class="win-title">${icon('scroll')} ${isToday ? 'Sarcini de azi' : 'Sarcini până la această zi'}</div>
      ${tasks.length ? `<ul class="list">${tasks.slice(0, 5).map(t => `<li class="item"><div class="i-main"><div class="i-title">${esc(t.title)}</div><div class="i-sub">${t.date < k ? '⚠ restantă · ' : ''}${esc(t.time || '')}</div></div></li>`).join('')}</ul>` : '<p class="muted">Nicio sarcină în așteptare. Odihnă binemeritată!</p>'}
      <a class="btn ghost block mt" href="#/sarcini">Turnul misiunilor</a>
    </div>

    <div class="win">
      <div class="win-title">${icon('star')} Notare rapidă</div>
      <div class="grid3">
        <a class="btn sm ghost" href="#/apa">${icon('drop')} Apă</a>
        <a class="btn sm ghost" href="#/pasi">${icon('shoe')} Pași</a>
        <a class="btn sm ghost" href="#/mancare">${icon('apple')} Masă</a>
        <a class="btn sm ghost" href="#/greutate">${icon('scale')} Kg</a>
        <a class="btn sm ghost" href="#/carti">${icon('book')} Pagini</a>
        <a class="btn sm ghost" href="#/sala">${icon('dumbbell')} Sală</a>
      </div>
    </div>`;
  bindDateNav(view);
}

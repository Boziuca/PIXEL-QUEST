/* =========================================================
   game.js – mecanicile de joc: XP, niveluri, monede, misiuni,
   serii (streak), realizări și deblocarea eroilor.
   ========================================================= */
import { state, save, day, peekDay } from './store.js';
import { todayKey, addDays, weekKeys, weekStart, weekday, seeded, fmtNum, lastNDays } from './util.js';
import { heroById, HEROES, formIndex } from './heroes.js';
import { toast, celebrate, animateHero, setLevelGetter } from './ui.js';
import { sfx } from './audio.js';

/* ---------- Niveluri ---------- */
/** XP necesar pentru a trece de la nivelul n la n+1. */
export const xpForNext = n => 60 + 40 * (n - 1);
export function levelInfo(xp = state.player.xp) {
  let lvl = 1, rest = Math.max(0, xp);
  while (rest >= xpForNext(lvl)) { rest -= xpForNext(lvl); lvl++; }
  return { level: lvl, cur: rest, need: xpForNext(lvl) };
}
export const level = () => levelInfo().level;
setLevelGetter(level);

/* Categoriile și statisticile personajului */
export const CATS = {
  steps: { stat: 'Agilitate', icon: 'shoe', name: 'Pași' },
  water: { stat: 'Mana', icon: 'drop', name: 'Apă' },
  food: { stat: 'Stamina', icon: 'apple', name: 'Nutriție' },
  weight: { stat: 'Forță', icon: 'scale', name: 'Greutate' },
  books: { stat: 'Înțelepciune', icon: 'book', name: 'Cărți' },
  gym: { stat: 'Putere', icon: 'dumbbell', name: 'Sală' },
  tasks: { stat: 'Disciplină', icon: 'scroll', name: 'Sarcini' },
  habits: { stat: 'Vitalitate', icon: 'heart', name: 'Obiceiuri' },
  journal: { stat: 'Spirit', icon: 'quill', name: 'Jurnal' },
  photos: { stat: 'Memorie', icon: 'camera', name: 'Poze' },
  streak: { stat: 'Perseverență', icon: 'flame', name: 'Serii' },
  misc: { stat: 'Noroc', icon: 'star', name: 'Diverse' },
};
/** Nivelul unei statistici, din XP-ul cumulat pe categorie. */
export function statLevel(cat) {
  const x = state.player.catXp[cat] || 0;
  return Math.floor(Math.sqrt(x / 15)) + 1;
}

/** Multiplicatorul de XP dat de specialitatea eroului. */
export function heroMult(cat) {
  const s = heroById(state.hero.id).spec;
  if (s.cat === 'all') return cat === 'streak' ? 1 : s.mult;
  if (s.cat === cat) return s.mult;
  if (s.cat === 'weight' && cat === 'gym') return s.mult;
  return 1;
}

/**
 * Acordă XP (cu bonusul eroului) și monede. Returnează XP-ul acordat,
 * ca să poată fi retras dacă intrarea e ștearsă.
 */
export function award(cat, base, { reason = '', silent = false, ic } = {}) {
  if (base <= 0) return 0;
  const before = level();
  const xp = Math.round(base * heroMult(cat));
  const coins = Math.max(1, Math.round(xp / 4));
  state.player.xp += xp;
  state.player.coins += coins;
  state.player.catXp[cat] = (state.player.catXp[cat] || 0) + xp;
  state.counters.coinsEarned = (state.counters.coinsEarned || 0) + coins;
  if (!silent) { toast(reason || 'XP câștigat', { icon: ic || CATS[cat]?.icon || 'star', xp, coins }); sfx('xp'); }
  const after = level();
  if (after > before) onLevelUp(before, after);
  save();
  return xp;
}
/** Retrage XP (la ștergerea unei intrări). */
export function revoke(cat, xp) {
  if (!xp) return;
  state.player.xp = Math.max(0, state.player.xp - xp);
  state.player.coins = Math.max(0, state.player.coins - Math.max(1, Math.round(xp / 4)));
  state.player.catXp[cat] = Math.max(0, (state.player.catXp[cat] || 0) - xp);
  save();
}
export function addCoins(n) { state.player.coins += n; state.counters.coinsEarned = (state.counters.coinsEarned || 0) + n; save(); }

/** Bonus acordat o singură dată pe zi pentru o cheie (idempotent). */
export function bonusOnce(k, key, cat, base, reason, ic) {
  const d = day(k);
  if (d.awards[key]) return 0;
  d.awards[key] = award(cat, base, { reason, ic }) || 1;
  return d.awards[key];
}

function onLevelUp(from, to) {
  const formChanged = formIndex(to) !== formIndex(from);
  celebrate({
    title: `NIVEL ${to}!`,
    sub: formChanged ? 'Eroul tău a evoluat! Formă nouă, echipament nou.' : 'Ai crescut în nivel. Continuă aventura!',
    level: to, sound: 'levelup',
  });
}

/* ---------- Obiceiuri ---------- */
export function habitScheduled(h, k) {
  if (h.freq?.type === 'days') return (h.freq.days || []).includes(weekday(k));
  return true;
}
export const habitCount = (h, k) => peekDay(k)?.habits?.[h.id] || 0;
export function habitWeekCount(h, k) { return weekKeys(k).filter(x => x <= todayKey()).reduce((s, x) => s + (habitCount(h, x) >= h.times ? 1 : 0), 0); }
/** Obiceiul e „îndeplinit” în ziua k (pentru cele săptămânale: ținta săptămânii atinsă). */
export function habitDone(h, k) {
  if (h.freq?.type === 'weekly') return habitWeekCount(h, k) >= (h.freq.n || 1);
  return habitCount(h, k) >= h.times;
}
/** Obiceiurile care contează pentru „Zi perfectă” (zilnice / în zile fixe). */
export function dailyHabits(k) { return state.habits.filter(h => h.freq?.type !== 'weekly' && habitScheduled(h, k)); }
export function allHabitsDone(k) { const hs = dailyHabits(k); return hs.length > 0 && hs.every(h => habitCount(h, k) >= h.times); }
/** Seria unui obicei (zile, sau săptămâni pentru cele săptămânale). */
export function habitStreak(h) {
  const t = todayKey();
  if (h.freq?.type === 'weekly') {
    let n = 0, w = weekStart(t);
    if (habitWeekCount(h, w) < (h.freq.n || 1)) w = addDays(w, -7);
    while (habitWeekCount(h, w) >= (h.freq.n || 1) && n < 520) { n++; w = addDays(w, -7); }
    return n;
  }
  let n = 0, k = t;
  if (habitScheduled(h, k) && habitCount(h, k) < h.times) k = addDays(k, -1);
  for (let i = 0; i < 1000; i++) {
    if (!habitScheduled(h, k)) { k = addDays(k, -1); continue; }
    if (habitCount(h, k) >= h.times) { n++; k = addDays(k, -1); } else break;
  }
  return n;
}

/* ---------- Totaluri pe zi ---------- */
export const waterTotal = k => (peekDay(k)?.water || []).reduce((s, w) => s + w.ml, 0);
export const foodTotals = k => (peekDay(k)?.food || []).reduce((a, f) => ({ kcal: a.kcal + (+f.kcal || 0), p: a.p + (+f.p || 0), c: a.c + (+f.c || 0), f: a.f + (+f.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
export const pagesTotal = k => (peekDay(k)?.pages || []).reduce((s, p) => s + p.n, 0);
export const tasksDoneOn = k => state.tasks.filter(t => t.done && t.doneDay === k).length;
export const workoutsOn = k => state.gym.workouts.filter(w => w.date === k);

/** Obiectivele atinse într-o zi. */
export function dayGoals(k) {
  const g = state.settings.goals, d = peekDay(k);
  const kcal = foodTotals(k).kcal;
  return {
    steps: (d?.steps || 0) >= g.steps,
    water: waterTotal(k) >= g.water,
    kcal: kcal > 0 && kcal >= g.kcal * 0.8 && kcal <= g.kcal * 1.1,
    pages: pagesTotal(k) >= g.pages,
    habits: allHabitsDone(k),
    workout: workoutsOn(k).length > 0,
  };
}
export const dayScore = k => Object.values(dayGoals(k)).filter(Boolean).length;
/** O zi „câștigată” = cel puțin 2 obiective atinse. */
export const isWinDay = k => dayScore(k) >= 2;
export function currentStreak() {
  let k = todayKey(), n = 0;
  if (!isWinDay(k)) k = addDays(k, -1);
  while (isWinDay(k) && n < 5000) { n++; k = addDays(k, -1); }
  return n;
}

/* ---------- Misiuni ---------- */
const g = () => state.settings.goals;
const QUEST_POOL = [
  { id: 'water', icon: 'drop', title: () => `Bea ${fmtNum(g().water)} ml de apă`, prog: k => [waterTotal(k), g().water], xp: 30, coins: 10 },
  { id: 'steps', icon: 'shoe', title: () => 'Fă 8.000 de pași', prog: k => [peekDay(k)?.steps || 0, 8000], xp: 30, coins: 10 },
  { id: 'read', icon: 'book', title: () => 'Citește 20 de pagini', prog: k => [pagesTotal(k), 20], xp: 30, coins: 10 },
  { id: 'meals', icon: 'apple', title: () => 'Notează 3 mese', prog: k => [peekDay(k)?.food?.length || 0, 3], xp: 25, coins: 8 },
  { id: 'tasks', icon: 'scroll', title: () => 'Îndeplinește 3 sarcini', prog: k => [tasksDoneOn(k), 3], xp: 30, coins: 10 },
  { id: 'habits', icon: 'heart', title: () => 'Bifează toate obiceiurile zilei', prog: k => { const hs = dailyHabits(k); return [hs.filter(h => habitCount(h, k) >= h.times).length, Math.max(1, hs.length)]; }, xp: 35, coins: 12 },
  { id: 'journal', icon: 'quill', title: () => 'Scrie în jurnalul aventurierului', prog: k => [(peekDay(k)?.journal || '').trim().length >= 20 ? 1 : 0, 1], xp: 20, coins: 6 },
  { id: 'weigh', icon: 'scale', title: () => 'Cântărește-te', prog: k => [peekDay(k)?.weight ? 1 : 0, 1], xp: 15, coins: 5 },
  { id: 'workout', icon: 'dumbbell', title: () => 'Termină un antrenament', prog: k => [workoutsOn(k).length, 1], xp: 40, coins: 12 },
  { id: 'photo', icon: 'camera', title: () => 'Adaugă o poză-amintire', prog: k => [peekDay(k)?.photos?.length || 0, 1], xp: 15, coins: 5 },
];
const WEEKLY_POOL = [
  { id: 'w_workouts', icon: 'dumbbell', title: () => `${g().workoutsWeek} antrenamente săptămâna asta`, prog: k => [weekKeys(k).reduce((s, x) => s + workoutsOn(x).length, 0), g().workoutsWeek], xp: 100, coins: 40 },
  { id: 'w_pr', icon: 'trophy', title: () => 'Bate un record personal', prog: k => { const ks = weekKeys(k); return [state.gym.workouts.filter(w => ks.includes(w.date) && w.prs?.length).length ? 1 : 0, 1]; }, xp: 80, coins: 30 },
  { id: 'w_steps', icon: 'shoe', title: () => '50.000 de pași în săptămână', prog: k => [weekKeys(k).reduce((s, x) => s + (peekDay(x)?.steps || 0), 0), 50000], xp: 100, coins: 40 },
  { id: 'w_water', icon: 'drop', title: () => '5 zile cu obiectivul de apă', prog: k => [weekKeys(k).filter(x => waterTotal(x) >= g().water).length, 5], xp: 90, coins: 35 },
  { id: 'w_books', icon: 'book', title: () => 'Citește 100 de pagini', prog: k => [weekKeys(k).reduce((s, x) => s + pagesTotal(x), 0), 100], xp: 90, coins: 35 },
];

/** Cele 3 misiuni ale zilei (alese determinist după dată). */
export function dailyQuests(k = todayKey()) {
  const rnd = seeded('d' + k);
  const pool = [...QUEST_POOL];
  const out = [];
  while (out.length < 3) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out.map(q => questView(q, k, k));
}
export function weeklyQuests(k = todayKey()) {
  const ws = weekStart(k);
  const rnd = seeded('w' + ws);
  const pool = [...WEEKLY_POOL];
  const out = [pool.splice(0, 1)[0]]; // antrenamentele săptămânale apar mereu
  out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out.map(q => questView(q, k, 'W' + ws));
}
function questView(q, k, bucket) {
  const [cur, target] = q.prog(k);
  return { id: q.id, icon: q.icon, title: q.title(), cur, target, xp: q.xp, coins: q.coins, done: cur >= target, claimed: !!state.quests[bucket]?.[q.id], bucket };
}

/* ---------- Realizări ---------- */
const habitByKey = key => state.habits.find(h => h.key === key);
function consecutiveDays(test, maxBack = 400) {
  let best = 0, cur = 0;
  const days = lastNDays(maxBack);
  for (const k of days) { if (test(k)) { cur++; best = Math.max(best, cur); } else cur = 0; }
  return best;
}
const sumHabit = key => { const h = habitByKey(key); if (!h) return 0; return Object.values(state.days).reduce((s, d) => s + (d.habits?.[h.id] || 0), 0); };

export const ACHIEVEMENTS = [
  { id: 'first_entry', icon: 'star', name: 'Primul pas', desc: 'Notează prima activitate', check: () => state.player.xp > 0 },
  { id: 'steps_goal', icon: 'shoe', name: 'Maratonist', desc: 'Atinge obiectivul de pași', check: () => Object.values(state.days).some(d => d.steps >= g().steps) },
  { id: 'steps_100k', icon: 'shoe', name: 'Drumeț de fier', desc: '100.000 de pași într-o săptămână', check: () => { const ks = Object.keys(state.days).sort(); return ks.some(k => weekKeys(k).reduce((s, x) => s + (peekDay(x)?.steps || 0), 0) >= 100000); } },
  { id: 'hydrated_7', icon: 'drop', name: '7 zile hidratat', desc: 'Obiectivul de apă, 7 zile la rând', check: () => consecutiveDays(k => waterTotal(k) >= g().water) >= 7 },
  { id: 'first_book', icon: 'book', name: 'Prima carte terminată', desc: 'Termină o carte', check: () => state.books.some(b => b.status === 'gata') },
  { id: 'books_5', icon: 'book', name: 'Șoarece de bibliotecă', desc: 'Termină 5 cărți', check: () => state.books.filter(b => b.status === 'gata').length >= 5 },
  { id: 'first_workout', icon: 'dumbbell', name: 'Primul antrenament', desc: 'Termină un antrenament', check: () => state.gym.workouts.length >= 1 },
  { id: 'workouts_30', icon: 'dumbbell', name: 'Veteranul sălii', desc: '30 de antrenamente', check: () => state.gym.workouts.length >= 30 },
  { id: 'pr_first', icon: 'trophy', name: 'NEW RECORD!', desc: 'Bate primul record personal', check: () => state.gym.workouts.some(w => w.prs?.length) },
  { id: 'squat_100', icon: 'trophy', name: '100 kg la genuflexiuni', desc: 'O serie de lucru cu 100 kg la genuflexiuni', check: () => (state.gym.prs.squat?.kg || 0) >= 100 },
  { id: 'ton_10', icon: 'dumbbell', name: '10 tone', desc: '10.000 kg ridicate într-o săptămână', check: () => { const by = {}; state.gym.workouts.forEach(w => { const s = weekStart(w.date); by[s] = (by[s] || 0) + (w.volume || 0); }); return Object.values(by).some(v => v >= 10000); } },
  { id: 'tasks_10', icon: 'scroll', name: 'Om de acțiune', desc: 'Îndeplinește 10 sarcini', check: () => state.tasks.filter(t => t.done).length >= 10 },
  { id: 'tasks_50', icon: 'scroll', name: 'Maestrul misiunilor', desc: 'Îndeplinește 50 de sarcini', check: () => state.tasks.filter(t => t.done).length >= 50 },
  { id: 'bed_7', icon: 'bed', name: 'Patul ca la armată', desc: '7 zile la rând cu patul făcut', check: () => { const h = habitByKey('bed'); return !!h && consecutiveDays(k => habitCount(h, k) >= h.times) >= 7; } },
  { id: 'hygiene_30', icon: 'tooth', name: 'Igienă perfectă', desc: '30 de zile la rând: dinți (de 2 ori) și duș', check: () => { const t = habitByKey('teeth'), s = habitByKey('shower'); return !!t && !!s && consecutiveDays(k => habitCount(t, k) >= t.times && habitCount(s, k) >= s.times) >= 30; } },
  { id: 'showers_100', icon: 'shower', name: '100 de dușuri', desc: 'Bifează dușul de 100 de ori', check: () => sumHabit('shower') >= 100 },
  { id: 'perfect_day', icon: 'heart', name: 'Zi perfectă', desc: 'Toate obiceiurile unei zile bifate', check: () => Object.keys(state.days).some(allHabitsDone) },
  { id: 'journal_7', icon: 'quill', name: 'Cronicar', desc: '7 zile la rând cu jurnal', check: () => consecutiveDays(k => (peekDay(k)?.journal || '').trim().length >= 20) >= 7 },
  { id: 'photos_10', icon: 'camera', name: 'Album de amintiri', desc: 'Adaugă 10 poze', check: () => (state.counters.photos || 0) >= 10 },
  { id: 'weight_goal', icon: 'scale', name: 'Ținta atinsă', desc: 'Ajungi la greutatea-țintă', check: () => { const t = g().weight; if (!t) return false; const ws = Object.keys(state.days).sort().map(k => state.days[k].weight).filter(Boolean); if (ws.length < 2) return false; const first = ws[0], last = ws[ws.length - 1]; return first > t ? last <= t : first < t ? last >= t : false; } },
  { id: 'streak_7', icon: 'flame', name: 'Flacăra vie', desc: 'Serie de 7 zile', check: () => (state.counters.bestStreak || 0) >= 7 },
  { id: 'streak_30', icon: 'flame', name: 'Flacăra eternă', desc: 'Serie de 30 de zile', check: () => (state.counters.bestStreak || 0) >= 30 },
  { id: 'level_5', icon: 'star', name: 'Aventurier', desc: 'Ajungi la nivelul 5', check: () => level() >= 5 },
  { id: 'level_10', icon: 'shield', name: 'Erou', desc: 'Ajungi la nivelul 10', check: () => level() >= 10 },
  { id: 'level_25', icon: 'trophy', name: 'Legendă', desc: 'Ajungi la nivelul 25', check: () => level() >= 25 },
  { id: 'coins_1000', icon: 'coin', name: 'Negustor', desc: 'Câștigă 1.000 de monede în total', check: () => (state.counters.coinsEarned || 0) >= 1000 },
];

/* ---------- Deblocarea eroilor ---------- */
export function heroUnlockMet(h) {
  const u = h.unlock; if (!u) return true;
  if (u.achievement && state.achievements[u.achievement]) return true;
  if (u.level && level() >= u.level) return true;
  return false;
}
export function unlockHero(id, { paid = false } = {}) {
  if (state.hero.unlocked.includes(id)) return;
  state.hero.unlocked.push(id);
  save();
  const h = heroById(id);
  celebrate({ title: 'Un nou erou s-a alăturat!', sub: `${h.name}, ${h.title}: ${h.spec.label}.${paid ? '' : ' Poți schimba eroul din Profil.'}`, heroId: id, form: 0, silhouetteFirst: true, sound: 'unlock' });
}

/* ---------- Evaluare după fiecare schimbare ---------- */
let evaluating = false;
/**
 * Verifică bonusurile de obiectiv, misiunile, seria, realizările
 * și eroii deblocabili. Se apelează după orice notare.
 */
export function evaluate(k = todayKey()) {
  if (evaluating) return;
  evaluating = true;
  try {
    const goals = dayGoals(k);
    if (goals.steps) bonusOnce(k, 'goal_steps', 'steps', 30, 'Obiectiv de pași atins!', 'shoe');
    if (goals.water) bonusOnce(k, 'goal_water', 'water', 25, 'Hidratare completă!', 'drop');
    if (goals.kcal && (peekDay(k)?.food?.length || 0) >= 2) bonusOnce(k, 'goal_kcal', 'food', 25, 'Kcal în țintă!', 'apple');
    if (goals.pages) bonusOnce(k, 'goal_pages', 'books', 20, 'Ai citit cât ți-ai propus!', 'book');
    if (goals.habits && !day(k).awards.perfect) { bonusOnce(k, 'perfect', 'habits', 30, 'Zi perfectă! Toate obiceiurile bifate', 'heart'); animateHero('quest'); }

    // Seria (streak)
    const streak = currentStreak();
    if (streak > (state.counters.bestStreak || 0)) state.counters.bestStreak = streak;
    if (k === todayKey() && isWinDay(k)) bonusOnce(k, 'streak', 'streak', Math.min(5 * streak, 50), `Seria continuă: ${streak} ${streak === 1 ? 'zi' : 'zile'}!`, 'flame');

    // Misiuni
    for (const q of [...dailyQuests(k), ...weeklyQuests(k)]) {
      if (q.done && !q.claimed) {
        state.quests[q.bucket] = { ...(state.quests[q.bucket] || {}), [q.id]: true };
        award('misc', q.xp, { reason: `Misiune îndeplinită: ${q.title}`, ic: q.icon, silent: true });
        addCoins(q.coins);
        toast(`Misiune îndeplinită: ${q.title}`, { icon: 'trophy', xp: Math.round(q.xp * heroMult('misc')), coins: q.coins });
        sfx('quest'); animateHero('quest');
      }
    }

    // Realizări
    for (const a of ACHIEVEMENTS) {
      if (!state.achievements[a.id] && a.check()) {
        state.achievements[a.id] = todayKey();
        award('misc', 50, { silent: true });
        addCoins(25);
        toast(`Realizare: ${a.name}`, { icon: a.icon, xp: 50, coins: 25 });
        sfx('coin');
      }
    }

    // Eroi deblocați prin progres
    for (const h of HEROES) if (!state.hero.unlocked.includes(h.id) && heroUnlockMet(h)) unlockHero(h.id);
    save();
  } finally { evaluating = false; }
}

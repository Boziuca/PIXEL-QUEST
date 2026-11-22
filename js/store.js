/* =========================================================
   store.js – starea aplicației, salvată în localStorage.
   Pozele stau separat în IndexedDB (vezi db.js).
   ========================================================= */
import { uid, todayKey } from './util.js';
import { DEFAULT_EXERCISES } from './data/exercises.js';
import { DEFAULT_HABITS } from './data/habits-default.js';

const KEY = 'pixelquest_state_v1';
export const VERSION = 1;

/** Structura unei zile goale. */
export function emptyDay() {
  return {
    steps: 0,          // pași
    stepsXp: 0,
    water: [],         // [{id, ml, t, xp}]
    food: [],          // [{id, name, kcal, p, c, f, time, photoId, xp}]
    weight: null,      // kg
    weightXp: 0,
    pages: [],         // [{id, bookId, n, xp}]
    journal: '',
    journalXp: 0,
    photos: [],        // id-uri de poze atașate zilei
    habits: {},        // habitId -> număr de bifări
    awards: {},        // chei de bonusuri deja date (idempotent)
  };
}

export function defaultState() {
  return {
    version: VERSION,
    created: todayKey(),
    onboarded: false,
    settings: {
      theme: 'dark',
      sound: true,
      notifications: false,
      restSec: 90,
      goals: { steps: 10000, water: 2000, kcal: 2200, weight: null, pages: 20, workoutsWeek: 3 },
    },
    hero: { id: null, unlocked: ['kael', 'mira', 'bruno', 'pip'], seen: ['kael', 'mira', 'bruno', 'pip'] },
    player: { xp: 0, coins: 50, catXp: {} },
    days: {},
    books: [],          // {id, title, author, pages, read, status, coverId, created, finished}
    tasks: [],          // {id, title, date, time, done, doneAt, xp}
    habits: DEFAULT_HABITS.map((h, i) => ({ ...h, id: uid() + i, order: i })),
    gym: {
      exercises: DEFAULT_EXERCISES.map(e => ({ ...e })),
      routines: [
        { id: 'r_a', name: 'Ziua A: Piept + Triceps', items: [{ ex: 'bench', sets: 4, reps: 8 }, { ex: 'incline_db', sets: 3, reps: 10 }, { ex: 'dips', sets: 3, reps: 10 }, { ex: 'triceps_push', sets: 3, reps: 12 }] },
        { id: 'r_push', name: 'Push', items: [{ ex: 'bench', sets: 4, reps: 8 }, { ex: 'ohp', sets: 3, reps: 8 }, { ex: 'lateral', sets: 3, reps: 12 }, { ex: 'triceps_push', sets: 3, reps: 12 }] },
        { id: 'r_pull', name: 'Pull', items: [{ ex: 'deadlift', sets: 3, reps: 5 }, { ex: 'pullup', sets: 3, reps: 8 }, { ex: 'row', sets: 3, reps: 10 }, { ex: 'curl', sets: 3, reps: 12 }] },
        { id: 'r_legs', name: 'Legs', items: [{ ex: 'squat', sets: 4, reps: 6 }, { ex: 'rdl', sets: 3, reps: 10 }, { ex: 'legpress', sets: 3, reps: 12 }, { ex: 'calf', sets: 3, reps: 15 }] },
        { id: 'r_full', name: 'Full Body', items: [{ ex: 'squat', sets: 3, reps: 8 }, { ex: 'bench', sets: 3, reps: 8 }, { ex: 'row', sets: 3, reps: 10 }, { ex: 'plank', sets: 3, reps: 1 }] },
      ],
      workouts: [],     // sesiuni terminate
      active: null,     // sesiune în desfășurare
      prs: {},          // exId -> {kg, e1rm, vol, date}
    },
    achievements: {},   // id -> dată
    quests: {},         // 'YYYY-MM-DD' / 'W-YYYY-MM-DD' -> {questId: true}
    shop: { owned: [], equipped: { hat: null, cape: null, aura: null, pet: null, palette: 'default' } },
    counters: {},       // contoare generale pentru realizări
  };
}

/* ---------- Încărcare / salvare ---------- */
export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { console.warn('Stare coruptă, pornesc de la zero', e); }
  return defaultState();
}

/** Completează câmpurile lipsă (de ex. după actualizări sau import). */
export function migrate(s) {
  const d = defaultState();
  const out = { ...d, ...s };
  out.settings = { ...d.settings, ...(s.settings || {}), goals: { ...d.settings.goals, ...(s.settings?.goals || {}) } };
  out.hero = { ...d.hero, ...(s.hero || {}) };
  out.player = { ...d.player, ...(s.player || {}) };
  out.gym = { ...d.gym, ...(s.gym || {}) };
  out.shop = { ...d.shop, ...(s.shop || {}), equipped: { ...d.shop.equipped, ...(s.shop?.equipped || {}) } };
  for (const k of Object.keys(out.days || {})) out.days[k] = { ...emptyDay(), ...out.days[k] };
  out.version = VERSION;
  return out;
}

let saveTimer = null;
const listeners = new Set();

/** Salvează (cu mică întârziere) și anunță ascultătorii. */
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
  listeners.forEach(fn => fn(state));
}
export function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.error('Nu pot salva', e); }
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Înlocuiește complet starea (import). */
export function replaceState(s) {
  state = migrate(s);
  flush();
  listeners.forEach(fn => fn(state));
}
export function resetState() { state = defaultState(); flush(); }

/** Returnează (și creează la nevoie) datele unei zile. */
export function day(k = todayKey()) {
  if (!state.days[k]) state.days[k] = emptyDay();
  return state.days[k];
}
/** Citire fără creare (pentru statistici). */
export function peekDay(k) { return state.days[k] || null; }

window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

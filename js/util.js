/* =========================================================
   util.js – funcții ajutătoare generale (date, format, DOM)
   ========================================================= */

/** Escapează text pentru a fi pus sigur în HTML. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** ID scurt și unic. */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- Date calendaristice (fus orar local) ---------- */
export function dkey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayKey() { return dkey(new Date()); }
export function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); }
/** Luni = 0 … Duminică = 6 */
export function weekday(k) { return (parseKey(k).getDay() + 6) % 7; }
export function weekStart(k) { return addDays(k, -weekday(k)); }
export function weekKeys(k) { const s = weekStart(k); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }
export function lastNDays(n, end = todayKey()) { return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1)); }
export function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }

export const ZILE = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
export const ZILE_SCURT = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
export const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

export function fmtDate(k, withDay = true) {
  const d = parseKey(k);
  const base = `${d.getDate()} ${LUNI[d.getMonth()]}`;
  if (k === todayKey()) return withDay ? `Azi, ${base}` : base;
  if (k === addDays(todayKey(), -1)) return withDay ? `Ieri, ${base}` : base;
  return withDay ? `${ZILE[weekday(k)]}, ${base}` : base;
}
export function fmtShort(k) { const d = parseKey(k); return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`; }

/* ---------- Numere ---------- */
const nf = new Intl.NumberFormat('ro-RO');
export function fmtNum(n, dec = 0) {
  if (n == null || isNaN(n)) return '–';
  return dec ? new Intl.NumberFormat('ro-RO', { maximumFractionDigits: dec }).format(n) : nf.format(Math.round(n));
}
export function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function pct(v, goal) { return goal > 0 ? clamp(v / goal, 0, 1) : 0; }
export function num(v) { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; }

/** Ora curentă „HH:MM”. */
export function nowTime() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

/* ---------- DOM ---------- */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Generator pseudo-aleator determinist (pentru misiuni pe zi). */
export function seeded(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

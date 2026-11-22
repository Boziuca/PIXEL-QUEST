/* =========================================================
   router.js – navigare pe bază de hash (#/harta, #/apa …)
   și data selectată (pentru a nota și zile trecute).
   ========================================================= */
import { todayKey } from './util.js';

let renderFn = () => {};
export function setRenderer(fn) { renderFn = fn; }
/** Redesenează ecranul curent (după o modificare de date). */
export function rerender() { renderFn(); }
export function go(route) { if (location.hash !== '#/' + route) location.hash = '#/' + route; else rerender(); }

/** Ruta curentă: { name, params } */
export function currentRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, ...rest] = h.split('/');
  return { name: name || '', params: rest.map(decodeURIComponent) };
}

/** Data selectată în ecranele de notare. Se resetează la azi la o zi nouă. */
export const sel = { date: todayKey() };
export function setDate(k) { sel.date = k > todayKey() ? todayKey() : k; }

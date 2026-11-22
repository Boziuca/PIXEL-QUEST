/* =========================================================
   app.js – punctul de intrare: rute, HUD, temă, notificări, PWA.
   ========================================================= */
import { state, save, subscribe } from './store.js';
import { setRenderer, currentRoute, sel, setDate } from './router.js';
import { hydrateIcons, icon } from './icons.js';
import { heroSVG } from './heroes.js';
import { levelInfo, currentStreak, evaluate, habitScheduled, habitDone } from './game.js';
import { animateBars } from './ui.js';
import { sfx } from './audio.js';
import { fmtNum, todayKey } from './util.js';

import { renderHeroSelect } from './screens/heroselect.js';
import { renderMap } from './screens/map.js';
import { renderDash } from './screens/dashboard.js';
import { renderSteps, renderWater, renderFood, renderWeight, renderJournal } from './screens/trackers.js';
import { renderBooks } from './screens/books.js';
import { renderTasks } from './screens/tasks.js';
import { renderHabits } from './screens/habits.js';
import { renderGym } from './screens/gym.js';
import { renderCalendar } from './screens/calendar.js';
import { renderStats } from './screens/stats.js';
import { renderGallery } from './screens/gallery.js';
import { renderProfile, renderShop, renderAchievements } from './screens/profile.js';

/* Rutele aplicației → funcția care desenează ecranul */
const ROUTES = {
  eroi: renderHeroSelect,
  harta: renderMap,
  azi: renderDash,
  pasi: renderSteps,
  apa: renderWater,
  mancare: renderFood,
  greutate: renderWeight,
  jurnal: renderJournal,
  carti: renderBooks,
  sarcini: renderTasks,
  obiceiuri: renderHabits,
  sala: renderGym,
  calendar: renderCalendar,
  statistici: renderStats,
  galerie: renderGallery,
  profil: renderProfile,
  magazin: renderShop,
  realizari: renderAchievements,
};
/* Ce tab din bara de jos e activ pentru fiecare rută */
const NAV_OF = { harta: 'harta', azi: 'azi', calendar: 'calendar', statistici: 'statistici', profil: 'profil', magazin: 'profil', realizari: 'profil', eroi: 'profil' };

const view = document.getElementById('view');
let cleanup = null;
let lastRouteName = '';

function render() {
  const { name, params } = currentRoute();
  // Prima pornire: alegerea eroului
  if (!state.onboarded || !state.hero.id) {
    if (name !== 'eroi') { location.replace('#/eroi'); return; }
  } else if (!ROUTES[name]) { location.replace('#/harta'); return; }

  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* */ } }
  cleanup = null;
  const scrollY = name === lastRouteName ? window.scrollY : 0;
  const chrome = state.onboarded && state.hero.id;
  document.getElementById('topbar').hidden = !chrome;
  document.getElementById('bottomnav').hidden = !chrome;

  cleanup = ROUTES[name](view, params) || null;
  hydrateIcons(view);
  animateBars(view);
  document.querySelectorAll('#bottomnav a').forEach(a => a.classList.toggle('active', a.dataset.nav === (NAV_OF[name] || 'harta')));
  if (name !== lastRouteName) window.scrollTo(0, 0); else window.scrollTo(0, scrollY);
  lastRouteName = name;
  updateHud();
}
setRenderer(render);

/* ---------- HUD (bara de sus) ---------- */
let lastHud = '';
function updateHud() {
  if (!state.hero.id) return;
  const li = levelInfo();
  const streak = currentStreak();
  const key = [state.hero.id, li.level, li.cur, state.player.coins, streak, JSON.stringify(state.shop.equipped)].join('|');
  if (key === lastHud) return;
  lastHud = key;
  document.getElementById('hud-hero').innerHTML = heroSVG(state.hero.id, li.level, { equipped: state.shop.equipped });
  document.getElementById('hud-level').textContent = `NIV ${li.level}`;
  document.getElementById('hud-coins').innerHTML = `${icon('coin')}${fmtNum(state.player.coins)}`;
  document.getElementById('hud-streak').innerHTML = streak ? `${icon('flame')}${streak}` : '';
  const xp = document.getElementById('hud-xp');
  xp.querySelector('.bar-fill').style.width = (li.cur / li.need * 100).toFixed(1) + '%';
  xp.querySelector('.bar-label').textContent = `${fmtNum(li.cur)} / ${fmtNum(li.need)} XP`;
}
subscribe(updateHud);

/* ---------- Temă și sunet ---------- */
export function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.dataset.palette = state.shop.equipped.palette || 'default';
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg2').trim();
  document.querySelector('meta[name="theme-color"]').setAttribute('content', bg || '#1a1c2c');
}
window.addEventListener('pq-theme', () => { applyTheme(); soundIcon(); });
function soundIcon() { document.getElementById('hud-sound').innerHTML = icon(state.settings.sound ? 'soundOn' : 'soundOff'); }
document.getElementById('hud-sound').addEventListener('click', () => {
  state.settings.sound = !state.settings.sound; save(); soundIcon(); sfx('click');
});
document.getElementById('hud-hero').addEventListener('click', () => { location.hash = '#/profil'; });

/* ---------- Notificări pentru obiceiuri (cât timp aplicația e deschisă) ---------- */
function checkReminders() {
  if (!state.settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), k = todayKey();
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem('pq_notified') || '{}'); } catch { /* */ }
  if (sent.day !== k) sent = { day: k, ids: [] };
  for (const h of state.habits) {
    if (h.hour == null || !habitScheduled(h, k) || habitDone(h, k) || sent.ids.includes(h.id)) continue;
    if (now.getHours() >= h.hour) {
      const body = h.key === 'teeth' ? 'Nu uita să te speli pe dinți! 🦷' : `Nu uita: ${h.name}!`;
      navigator.serviceWorker?.ready.then(r => r.showNotification('PixelQuest', { body, icon: 'icons/icon-192.png', tag: 'habit-' + h.id }))
        .catch(() => new Notification('PixelQuest', { body }));
      sent.ids.push(h.id);
    }
  }
  try { localStorage.setItem('pq_notified', JSON.stringify(sent)); } catch { /* */ }
}

/* ---------- Pornire ---------- */
let lastDay = todayKey();
function tick() {
  // la trecerea în ziua următoare, data selectată devine noua zi
  if (todayKey() !== lastDay) { if (sel.date === lastDay) setDate(todayKey()); lastDay = todayKey(); render(); }
  checkReminders();
}

applyTheme();
soundIcon();
hydrateIcons(document.getElementById('bottomnav'));
window.addEventListener('hashchange', render);
if (state.hero.id) evaluate();
render();
setInterval(tick, 60000);
setTimeout(checkReminders, 3000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e)));
}
// tastele ← → schimbă ziua în ecranele cu navigator de dată
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select')) return;
  const b = document.querySelector(`[data-datenav="${e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0}"]`);
  if (b && !b.disabled) b.click();
});

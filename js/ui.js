/* =========================================================
   ui.js – componente comune: toast, modal, confetti, ecrane de
   sărbătoare, bare de progres, antete de ecran, navigator de dată.
   ========================================================= */
import { icon, hydrateIcons } from './icons.js';
import { esc, fmtDate, addDays, todayKey, fmtNum } from './util.js';
import { heroSVG, heroById } from './heroes.js';
import { state } from './store.js';
import { sel, setDate, rerender } from './router.js';
import { sfx } from './audio.js';

/* ---------- Toast ---------- */
export function toast(text, { icon: ic = 'star', xp = 0, coins = 0 } = {}) {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  const reward = [xp ? `+${xp} XP` : '', coins ? `+${coins}¢` : ''].filter(Boolean).join(' ');
  el.innerHTML = `${icon(ic)}<span>${esc(text)}</span>${reward ? `<span class="xp">${reward}</span>` : ''}`;
  root.appendChild(el);
  while (root.children.length > 4) root.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2600);
}

/* ---------- Modal ---------- */
export function modal(html, { onMount, dismiss = true } = {}) {
  const root = document.getElementById('overlay-root');
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="win" role="dialog" aria-modal="true">${html}</div>`;
  root.appendChild(ov);
  hydrateIcons(ov);
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape' && dismiss) close(); };
  document.addEventListener('keydown', onKey);
  if (dismiss) ov.addEventListener('click', e => { if (e.target === ov) close(); });
  ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  onMount?.(ov.querySelector('.win'), close);
  return { el: ov.querySelector('.win'), close };
}

export function confirmBox(text, { ok = 'Da', cancel = 'Anulează', danger = false } = {}) {
  return new Promise(resolve => {
    modal(`<p>${esc(text)}</p><div class="modal-actions">
      <button class="btn ghost" data-r="0">${esc(cancel)}</button>
      <button class="btn ${danger ? 'bad' : ''}" data-r="1">${esc(ok)}</button></div>`, {
      onMount: (el, close) => el.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { close(); resolve(b.dataset.r === '1'); })),
    });
  });
}

/* ---------- Confetti pixelat (canvas) ---------- */
export function confetti(n = 90) {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  const W = c.width = Math.ceil(innerWidth / 4), H = c.height = Math.ceil(innerHeight / 4);
  c.style.width = '100%'; c.style.height = '100%'; c.style.imageRendering = 'pixelated';
  document.body.appendChild(c);
  const g = c.getContext('2d');
  const cols = ['#ffcd75', '#e04f5f', '#41a6f6', '#38b764', '#a7f070', '#ff9bd0', '#73eff7'];
  const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * 20, y: H / 3, vx: (Math.random() - .5) * 3, vy: -Math.random() * 3 - 1, c: cols[Math.random() * cols.length | 0], s: Math.random() < .3 ? 2 : 1 }));
  let f = 0;
  (function tick() {
    g.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += 0.06; p.x += p.vx; p.y += p.vy; g.fillStyle = p.c; g.fillRect(p.x | 0, p.y | 0, p.s, p.s); }
    if (++f < 150) requestAnimationFrame(tick); else c.remove();
  })();
}

/* ---------- Ecrane de sărbătoare, puse la coadă ---------- */
const queue = [];
let showing = false;
/**
 * celebrate({ title, sub, heroId, anim, form, silhouetteFirst, sound, body })
 */
export function celebrate(o) { queue.push(o); if (!showing) nextCelebration(); }
function nextCelebration() {
  const o = queue.shift();
  if (!o) { showing = false; return; }
  showing = true;
  const heroId = o.heroId || state.hero.id || 'pip';
  const lvl = o.level ?? levelNow();
  sfx(o.sound || 'levelup');
  confetti();
  const { el, close } = modal(`
    <div class="celebrate celebrate-wrap">
      <div class="rays"></div>
      <div class="big-title">${esc(o.title)}</div>
      <div class="hero-sprite ${o.silhouetteFirst ? 'silhouette' : ''}" id="cel-hero">${heroSVG(heroId, lvl, { form: o.form, equipped: state.shop.equipped })}</div>
      ${o.sub ? `<p class="mt">${esc(o.sub)}</p>` : ''}
      ${o.body || ''}
      <button class="btn big block mt" data-close>Continuă</button>
    </div>`, { dismiss: false });
  const sp = el.querySelector('#cel-hero');
  const anim = o.anim || heroById(heroId).anims.levelUp;
  if (o.silhouetteFirst) setTimeout(() => { sp.classList.remove('silhouette'); sp.classList.add('anim-' + anim); confetti(60); }, 900);
  else sp.classList.add('anim-' + anim);
  el.querySelector('[data-close]').addEventListener('click', () => setTimeout(nextCelebration, 150));
  return close;
}
// nivelul curent (fără import circular din game.js)
let levelNow = () => 1;
export function setLevelGetter(fn) { levelNow = fn; }

/** Animă eroul vizibil pe ecran (de ex. la misiune îndeplinită). */
export function animateHero(kind = 'quest') {
  const hero = heroById(state.hero.id);
  const a = hero.anims[kind] || 'jump';
  document.querySelectorAll('.hero-sprite.live').forEach(sp => {
    sp.classList.remove('anim-' + a); void sp.offsetWidth; sp.classList.add('anim-' + a);
    setTimeout(() => sp.classList.remove('anim-' + a), 2200);
  });
}

/* ---------- Fragmente HTML ---------- */
export function bar(value, goal, cls = '', label = null) {
  const p = goal > 0 ? Math.max(0, Math.min(1, value / goal)) : 0;
  const lab = label ?? `${fmtNum(value)} / ${fmtNum(goal)}`;
  return `<div class="bar ${cls}"><div class="bar-fill" data-w="${(p * 100).toFixed(1)}"></div><span class="bar-label">${esc(lab)}</span></div>`;
}
/** Animă umplerea barelor (pornesc de la 0 și cresc treptat). */
export function animateBars(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.bar-fill[data-w]').forEach(b => { b.style.width = b.dataset.w + '%'; })));
}

export function screenHead(ic, title, sub = '', back = 'harta') {
  return `<div class="screen-head">
    ${back ? `<a class="icon-btn back-btn" href="#/${back}" aria-label="Înapoi">${icon('back')}</a>` : ''}
    <div class="scr-icon">${icon(ic)}</div>
    <div class="grow"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>
  </div>`;
}

export function dateNav() {
  const isToday = sel.date === todayKey();
  return `<div class="datenav">
    <button class="btn sm ghost" data-datenav="-1" aria-label="Ziua anterioară">◀</button>
    <div class="d-label">${esc(fmtDate(sel.date))}</div>
    <button class="btn sm ghost" data-datenav="1" ${isToday ? 'disabled' : ''} aria-label="Ziua următoare">▶</button>
  </div>`;
}
/** Leagă butoanele navigatorului de dată dintr-un container. */
export function bindDateNav(root) {
  root.querySelectorAll('[data-datenav]').forEach(b => b.addEventListener('click', () => {
    setDate(addDays(sel.date, Number(b.dataset.datenav))); sfx('click'); rerender();
  }));
}

export function emptyState(ic, text) {
  return `<div class="empty">${icon(ic)}<div>${esc(text)}</div></div>`;
}

export function heroStage(level, { small = false, live = true } = {}) {
  return `<div class="hero-stage ${small ? 'small' : ''}"><div class="hero-sprite ${live ? 'live' : ''}">${heroSVG(state.hero.id || 'pip', level, { equipped: state.shop.equipped })}</div></div>`;
}

/** Deschide selectorul de fișiere pentru o poză (cameră sau galerie). */
export function pickImage({ camera = false } = {}) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    if (camera) inp.capture = 'environment';
    inp.onchange = () => resolve(inp.files?.[0] || null);
    inp.click();
  });
}

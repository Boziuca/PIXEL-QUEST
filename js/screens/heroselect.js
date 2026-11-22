/* =========================================================
   Ecranul „Alege-ți eroul” – carusel cu săgeți stânga/dreapta.
   Eroii blocați apar ca siluete negre cu lacăt și „???”.
   ========================================================= */
import { state, save } from '../store.js';
import { HEROES, heroSVG, FORM_LEVELS } from '../heroes.js';
import { level, unlockHero, heroUnlockMet, evaluate } from '../game.js';
import { icon } from '../icons.js';
import { esc, fmtNum } from '../util.js';
import { toast, confirmBox } from '../ui.js';
import { sfx } from '../audio.js';
import { rerender } from '../router.js';

let idx = -1;

export function renderHeroSelect(view) {
  const first = !state.onboarded;
  if (idx < 0) idx = Math.max(0, HEROES.findIndex(h => h.id === state.hero.id));
  const h = HEROES[idx];
  const unlocked = state.hero.unlocked.includes(h.id);
  const lvl = first ? 1 : level();
  const isCurrent = state.hero.id === h.id;

  view.innerHTML = `
  <div class="hero-select">
    ${first ? '' : `<div class="row"><a class="icon-btn" href="#/profil" aria-label="Înapoi">${icon('back')}</a></div>`}
    <div class="title">ALEGE-ȚI EROUL</div>
    <div class="carousel">
      <button class="btn ghost arrow" data-dir="-1" aria-label="Eroul anterior">◀</button>
      <div class="hero-stage"><div class="hero-sprite ${unlocked ? '' : 'silhouette'}" id="hs-sprite">${heroSVG(h.id, unlocked ? lvl : 1, { plain: true })}</div></div>
      <button class="btn ghost arrow" data-dir="1" aria-label="Eroul următor">▶</button>
    </div>
    <div class="hero-dots">
      ${HEROES.map((x, i) => `<button class="${i === idx ? 'on' : ''} ${state.hero.unlocked.includes(x.id) ? '' : 'locked'}" data-i="${i}" aria-label="${state.hero.unlocked.includes(x.id) ? esc(x.name) : 'Erou blocat'}">${heroSVG(x.id, 1, { plain: true })}</button>`).join('')}
    </div>
    <div class="win hero-info">
      ${unlocked ? `
        <div class="name">${esc(h.name)}, ${esc(h.title)}</div>
        <p>${esc(h.story)}</p>
        <p class="spec">★ Specialitate: ${esc(h.spec.label)}</p>
        <div class="forms">
          ${FORM_LEVELS.map((L, fi) => `<div class="f-item ${!first && lvl >= L ? '' : (fi ? 'locked' : '')}"><div class="hero-sprite">${heroSVG(h.id, L, { form: fi, plain: true })}</div>NIV ${L}</div>`).join('')}
        </div>
        ${isCurrent && !first ? '<p class="center tag good">EROUL TĂU ACTUAL</p>' : `<button class="btn big block" id="hs-pick">${first ? 'Începe aventura!' : 'Alege acest erou'}</button>`}
      ` : `
        <div class="name">???</div>
        <p class="lock-badge">${icon('lock')} Erou blocat</p>
        <p class="muted">${esc(h.unlock?.hint || '')}</p>
        ${heroUnlockMet(h) ? '' : `<button class="btn block" id="hs-buy" ${state.player.coins >= h.unlock.coins ? '' : 'disabled'}>${icon('coin')} Deblochează: ${fmtNum(h.unlock.coins)}</button>
        <p class="muted small center mt">Ai ${fmtNum(state.player.coins)} monede.</p>`}
      `}
    </div>
  </div>`;

  const move = d => { idx = (idx + d + HEROES.length) % HEROES.length; sfx('tick'); rerender(); };
  view.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => move(Number(b.dataset.dir))));
  view.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { idx = Number(b.dataset.i); sfx('tick'); rerender(); }));

  // glisare cu degetul pe scenă
  const stage = view.querySelector('.hero-stage');
  let x0 = null;
  stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1); x0 = null; });

  view.querySelector('#hs-pick')?.addEventListener('click', () => {
    state.hero.id = h.id;
    const wasFirst = !state.onboarded;
    state.onboarded = true;
    save();
    sfx('unlock');
    const sp = view.querySelector('#hs-sprite');
    sp.classList.add('anim-' + h.anims.levelUp);
    toast(`${h.name} ți s-a alăturat!`, { icon: 'star' });
    setTimeout(() => { idx = -1; evaluate(); location.hash = wasFirst ? '#/harta' : '#/profil'; }, 900);
  });
  view.querySelector('#hs-buy')?.addEventListener('click', async () => {
    if (!(await confirmBox(`Deblochezi eroul pentru ${h.unlock.coins} monede?`, { ok: 'Deblochează' }))) return;
    state.player.coins -= h.unlock.coins; save(); sfx('coin');
    unlockHero(h.id, { paid: true }); rerender();
  });

  const onKey = e => { if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1); };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

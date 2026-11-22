/* =========================================================
   Turnul misiunilor – sarcini / agendă cu dată și oră.
   O sarcină bifată = „misiune îndeplinită”.
   ========================================================= */
import { state, save } from '../store.js';
import { rerender } from '../router.js';
import { award, revoke, evaluate } from '../game.js';
import { screenHead, emptyState, toast, confirmBox, animateHero } from '../ui.js';
import { icon } from '../icons.js';
import { esc, uid, todayKey, fmtDate, nowTime } from '../util.js';
import { sfx } from '../audio.js';

let showDone = false;

export function renderTasks(view) {
  const t = todayKey();
  const open = state.tasks.filter(x => !x.done).sort((a, b) => ((a.date || '9999') + (a.time || '')).localeCompare((b.date || '9999') + (b.time || '')));
  const groups = [
    ['Restante', open.filter(x => x.date && x.date < t), 'bad'],
    ['Azi', open.filter(x => x.date === t), 'acc'],
    ['Viitoare', open.filter(x => x.date && x.date > t), 'alt'],
    ['Fără dată', open.filter(x => !x.date), ''],
  ];
  const done = state.tasks.filter(x => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));

  const row = x => `<li class="item">
    <button class="check ${x.done ? 'on' : ''}" data-toggle="${x.id}" aria-label="${x.done ? 'Debifează' : 'Bifează'}"></button>
    <div class="i-main"><div class="i-title">${esc(x.title)}</div>
      <div class="i-sub">${x.date ? esc(fmtDate(x.date)) : ''}${x.time ? ' · ' + esc(x.time) : ''}${x.done && x.doneDay ? ' · îndeplinită ' + esc(fmtDate(x.doneDay, false)) : ''}</div></div>
    <button class="del" data-del="${x.id}" aria-label="Șterge">${icon('trash')}</button></li>`;

  view.innerHTML = `
    ${screenHead('scroll', 'Turnul misiunilor', 'Sarcini · statistica Disciplină')}
    <div class="win">
      <div class="win-title">${icon('plus')} Misiune nouă</div>
      <form id="t-form">
        <label class="f"><span>Ce ai de făcut?</span><input id="t-title" required maxlength="140" placeholder="ex. Sună la dentist"></label>
        <div class="grid2">
          <label class="f"><span>Data</span><input id="t-date" type="date" value="${t}"></label>
          <label class="f"><span>Ora</span><input id="t-time" type="time"></label>
        </div>
        <button class="btn block" type="submit">Adaugă misiunea</button>
      </form>
    </div>
    ${groups.filter(g => g[1].length).map(([name, list, cls]) => `
      <div class="win"><div class="win-title"><span class="tag ${cls}">${esc(name)}</span><span class="right muted small">${list.length}</span></div>
        <ul class="list">${list.map(row).join('')}</ul></div>`).join('') || `<div class="win">${emptyState('scroll', 'Nicio misiune activă. Turnul e liniștit.')}</div>`}
    <div class="win">
      <button class="btn ghost block" id="t-showdone">${showDone ? 'Ascunde' : 'Arată'} misiunile îndeplinite (${done.length})</button>
      ${showDone ? (done.length ? `<ul class="list mt">${done.slice(0, 50).map(row).join('')}</ul>` : '<p class="muted mt">Nicio misiune îndeplinită încă.</p>') : ''}
    </div>`;

  view.querySelector('#t-form').addEventListener('submit', e => {
    e.preventDefault();
    const title = view.querySelector('#t-title').value.trim(); if (!title) return;
    state.tasks.push({ id: uid(), title, date: view.querySelector('#t-date').value || null, time: view.querySelector('#t-time').value || '', done: false, doneAt: null, doneDay: null, xp: 0 });
    save(); sfx('tick'); toast('Misiune adăugată', { icon: 'scroll' }); rerender();
  });
  view.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
    const x = state.tasks.find(y => y.id === b.dataset.toggle); if (!x) return;
    if (!x.done) {
      x.done = true; x.doneAt = Date.now(); x.doneDay = todayKey();
      // bonus dacă e îndeplinită la timp
      const onTime = !x.date || x.date > todayKey() || (x.date === todayKey() && (!x.time || nowTime() <= x.time));
      x.xp = award('tasks', onTime ? 15 : 10, { reason: `Misiune îndeplinită: ${x.title}${onTime ? ' (la timp!)' : ''}`, ic: 'check' });
      sfx('quest'); animateHero('quest');
    } else {
      x.done = false; revoke('tasks', x.xp); x.xp = 0; x.doneAt = null; x.doneDay = null; sfx('delete');
    }
    save(); evaluate(); rerender();
  }));
  view.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const x = state.tasks.find(y => y.id === b.dataset.del); if (!x) return;
    if (!(await confirmBox(`Ștergi „${x.title}”?`, { ok: 'Șterge', danger: true }))) return;
    state.tasks = state.tasks.filter(y => y !== x); save(); sfx('delete'); rerender();
  }));
  view.querySelector('#t-showdone').addEventListener('click', () => { showDone = !showDone; rerender(); });
}

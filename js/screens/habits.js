/* =========================================================
   Templul – obiceiuri zilnice (habits). Bifare dintr-o atingere,
   contoare de tip 0/2 → 1/2 → 2/2, grupare Dimineața/Ziua/Seara,
   serii per obicei, statistici și heatmap.
   ========================================================= */
import { state, save, day } from '../store.js';
import { sel, rerender } from '../router.js';
import { award, revoke, evaluate, habitScheduled, habitCount, habitDone, habitStreak, habitWeekCount, dailyHabits } from '../game.js';
import { screenHead, dateNav, bindDateNav, emptyState, modal, confirmBox, bar, toast } from '../ui.js';
import { icon, HABIT_ICONS } from '../icons.js';
import { esc, uid, ZILE_SCURT, lastNDays, todayKey, weekKeys, weekday, fmtNum } from '../util.js';
import { sfx } from '../audio.js';

let tab = 'azi';
const PERIODS = [['Dimineața', 'sunrise', h => h != null && h < 12], ['Ziua', 'sun', h => h != null && h >= 12 && h < 18], ['Seara', 'moon', h => h != null && h >= 18], ['Oricând', 'star', h => h == null]];

function freqLabel(h) {
  if (h.freq?.type === 'days') return (h.freq.days || []).map(d => ZILE_SCURT[d]).join(' ');
  if (h.freq?.type === 'weekly') return `de ${h.freq.n}× pe săptămână`;
  return 'zilnic';
}

export function renderHabits(view) {
  view.innerHTML = `
    ${screenHead('lotus', 'Templul', 'Obiceiuri zilnice · statistica Vitalitate')}
    <div class="tabs">
      <button class="${tab === 'azi' ? 'on' : ''}" data-tab="azi">Bifează</button>
      <button class="${tab === 'stat' ? 'on' : ''}" data-tab="stat">Statistici</button>
      <button class="${tab === 'edit' ? 'on' : ''}" data-tab="edit">Editează</button>
    </div>
    <div id="h-body"></div>`;
  view.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; rerender(); }));
  const body = view.querySelector('#h-body');
  if (tab === 'azi') renderToday(body);
  else if (tab === 'stat') renderStatsTab(body);
  else renderEdit(body);
}

/* ---------- Bifarea de azi ---------- */
function renderToday(root) {
  const k = sel.date;
  const list = state.habits.filter(h => habitScheduled(h, k)).sort((a, b) => (a.hour ?? 99) - (b.hour ?? 99) || a.order - b.order);
  const daily = dailyHabits(k);
  const doneN = daily.filter(h => habitCount(h, k) >= h.times).length;
  root.innerHTML = `
    ${dateNav()}
    <div class="win tight">${bar(doneN, Math.max(1, daily.length), 'bar-good', `${doneN} / ${daily.length} obiceiuri`)}
      ${doneN === daily.length && daily.length ? '<p class="center mt pix" style="font-size:10px;color:var(--good)">★ ZI PERFECTĂ! ★</p>' : ''}</div>
    ${list.length ? PERIODS.map(([name, ic, test]) => {
      const hs = list.filter(h => test(h.hour));
      if (!hs.length) return '';
      return `<div class="period-title">${icon(ic)} ${name}</div>` + hs.map(h => {
        const c = habitCount(h, k), done = habitDone(h, k), st = habitStreak(h);
        const weekly = h.freq?.type === 'weekly';
        return `<div class="habit ${done ? 'done' : ''}" data-h="${h.id}" role="button" tabindex="0" aria-label="${esc(h.name)} ${c} din ${h.times}">
          <div class="h-icon">${icon(h.icon)}</div>
          <div class="h-main"><div>${esc(h.name)}</div>
            ${h.times > 1 ? `<div class="pips">${Array.from({ length: h.times }, (_, i) => `<i class="${i < c ? 'on' : ''}"></i>`).join('')}</div>` : ''}
            <div class="h-streak">${st ? `🔥 ${st} ${weekly ? (st === 1 ? 'săptămână' : 'săptămâni') : (st === 1 ? 'zi' : 'zile')}` : ''}${weekly ? ` · ${habitWeekCount(h, k)}/${h.freq.n} săpt.` : ''}</div></div>
          <div class="h-count">${c}/${h.times}</div>
          ${c > 0 ? `<button class="btn sm ghost" data-minus="${h.id}" aria-label="Scade">−</button>` : ''}
        </div>`;
      }).join('');
    }).join('') : `<div class="win">${emptyState('lotus', 'Niciun obicei programat azi.')}</div>`}`;

  const tick = (id, delta) => {
    const h = state.habits.find(x => x.id === id); if (!h) return;
    const dd = day(k); dd.habitXp = dd.habitXp || {};
    const c = dd.habits[id] || 0;
    let n = c + delta;
    if (n > h.times) n = 0; // o nouă atingere după completare resetează contorul
    if (n < 0) return;
    dd.habits[id] = n;
    if (n > c) {
      dd.habitXp[id] = (dd.habitXp[id] || 0) + award('habits', 3, { reason: `${h.name} ${n}/${h.times}`, ic: h.icon });
      sfx('habit');
    } else {
      const per = c ? Math.round((dd.habitXp[id] || 0) / c) : 0;
      const amt = per * (c - n);
      revoke('habits', amt); dd.habitXp[id] = Math.max(0, (dd.habitXp[id] || 0) - amt);
      sfx('delete');
    }
    save(); evaluate(k); rerender();
    const el = document.querySelector(`[data-h="${id}"]`);
    if (el) { el.classList.add('pop'); }
  };
  root.querySelectorAll('[data-h]').forEach(el => {
    el.addEventListener('click', e => { if (e.target.closest('[data-minus]')) return; tick(el.dataset.h, 1); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tick(el.dataset.h, 1); } });
  });
  root.querySelectorAll('[data-minus]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); tick(b.dataset.minus, -1); }));
  bindDateNav(root);
}

/* ---------- Statistici + heatmap ---------- */
function completion(keys) {
  let need = 0, got = 0;
  for (const k of keys) for (const h of dailyHabits(k)) { need++; if (habitCount(h, k) >= h.times) got++; }
  return need ? Math.round(got / need * 100) : 0;
}
function renderStatsTab(root) {
  const t = todayKey();
  const wk = weekKeys(t).filter(x => x <= t), month = lastNDays(30);
  // heatmap: ultimele 5 săptămâni, aliniat pe coloane L–D (începe într-o zi de luni)
  const heatDays = lastNDays(28 + weekday(t) + 1);
  const pad = 0;
  root.innerHTML = `
    <div class="win">
      <div class="kpis">
        <div class="kpi"><div class="k-lbl">Săptămâna asta</div><div class="k-val">${completion(wk)}%</div></div>
        <div class="kpi"><div class="k-lbl">Ultimele 30 de zile</div><div class="k-val">${completion(month)}%</div></div>
      </div>
    </div>
    ${state.habits.slice().sort((a, b) => a.order - b.order).map(h => {
      const sched = month.filter(k => habitScheduled(h, k));
      const pctM = h.freq?.type === 'weekly'
        ? Math.round(Math.min(1, month.filter(k => habitCount(h, k) >= h.times).length / ((h.freq.n || 1) * 30 / 7)) * 100)
        : (sched.length ? Math.round(sched.filter(k => habitCount(h, k) >= h.times).length / sched.length * 100) : 0);
      const pctW = (() => { const s = wk.filter(k => habitScheduled(h, k)); if (h.freq?.type === 'weekly') return Math.round(Math.min(1, habitWeekCount(h, t) / (h.freq.n || 1)) * 100); return s.length ? Math.round(s.filter(k => habitCount(h, k) >= h.times).length / s.length * 100) : 0; })();
      const st = habitStreak(h);
      return `<div class="win tight">
        <div class="row nowrap"><span style="width:28px;height:28px;display:block">${icon(h.icon)}</span><b class="grow">${esc(h.name)}</b><span class="h-streak" style="color:var(--warn)">${st ? '🔥 ' + st : ''}</span></div>
        <div class="row mt small muted"><span>Săpt.: ${pctW}%</span><span>Lună: ${pctM}%</span><span>Total: ${fmtNum(Object.values(state.days).reduce((s, d) => s + (d.habits?.[h.id] || 0), 0))}×</span></div>
        <div class="heat mt">${ZILE_SCURT.map(z => `<span class="center small muted">${z}</span>`).join('')}${'<i class="na"></i>'.repeat(pad)}${heatDays.map(k => {
          const c = habitCount(h, k), sch = habitScheduled(h, k);
          return `<i class="${!sch ? 'na' : c >= h.times ? 'on' : c > 0 ? 'half' : ''}" title="${k}: ${c}/${h.times}"></i>`;
        }).join('')}</div>
      </div>`;
    }).join('')}
    <div class="legend"><i style="background:var(--heat0)"></i>nefăcut <i style="background:var(--heat1)"></i>parțial <i style="background:var(--heat3)"></i>făcut</div>`;
}

/* ---------- Editare: adaugă, șterge, reordonează ---------- */
function renderEdit(root) {
  const list = state.habits.slice().sort((a, b) => a.order - b.order);
  root.innerHTML = `
    <div class="win">
      <button class="btn block" id="h-add">${icon('plus')} Obicei nou</button>
      <ul class="list mt">${list.map((h, i) => `<li class="item">
        <span style="width:30px;height:30px;display:block;flex-shrink:0">${icon(h.icon)}</span>
        <div class="i-main"><div class="i-title">${esc(h.name)}</div><div class="i-sub">${h.times}×/zi · ${esc(freqLabel(h))}${h.hour != null ? ` · ${String(h.hour).padStart(2, '0')}:00` : ''}</div></div>
        <button class="btn sm ghost" data-up="${h.id}" ${i === 0 ? 'disabled' : ''} aria-label="Mută sus">▲</button>
        <button class="btn sm ghost" data-down="${h.id}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Mută jos">▼</button>
        <button class="btn sm ghost" data-edit="${h.id}" aria-label="Editează">${icon('quill')}</button>
      </li>`).join('')}</ul>
    </div>
    <p class="muted small">Notificările de reamintire se activează din Profil → Setări.</p>`;
  root.querySelector('#h-add').addEventListener('click', () => editHabit(null));
  root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editHabit(b.dataset.edit)));
  const move = (id, d) => {
    const arr = state.habits.slice().sort((a, b) => a.order - b.order);
    const i = arr.findIndex(h => h.id === id), j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    arr.forEach((h, n) => { h.order = n; });
    save(); sfx('tick'); rerender();
  };
  root.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => move(b.dataset.up, -1)));
  root.querySelectorAll('[data-down]').forEach(b => b.addEventListener('click', () => move(b.dataset.down, 1)));
}

function editHabit(id) {
  const h = state.habits.find(x => x.id === id) || { name: '', icon: 'star', times: 1, hour: 9, freq: { type: 'daily' } };
  let chosenIcon = h.icon;
  const f = h.freq || { type: 'daily' };
  modal(`<h2>${id ? 'Editează obiceiul' : 'Obicei nou'}</h2>
    <form id="he-form">
      <label class="f"><span>Nume</span><input id="he-name" value="${esc(h.name)}" maxlength="40" required></label>
      <label class="f"><span>Iconiță</span></label>
      <div class="icon-pick">${HABIT_ICONS.map(n => `<button type="button" class="${n === chosenIcon ? 'on' : ''}" data-ic="${n}" aria-label="${n}">${icon(n)}</button>`).join('')}</div>
      <div class="grid2 mt">
        <label class="f"><span>De câte ori pe zi</span><input id="he-times" type="number" min="1" max="12" value="${h.times}"></label>
        <label class="f"><span>Ora preferată</span><select id="he-hour"><option value="">Oricând</option>${Array.from({ length: 24 }, (_, i) => `<option value="${i}" ${h.hour === i ? 'selected' : ''}>${String(i).padStart(2, '0')}:00</option>`).join('')}</select></label>
      </div>
      <label class="f"><span>Frecvență</span><select id="he-freq">
        <option value="daily" ${f.type === 'daily' ? 'selected' : ''}>Zilnic</option>
        <option value="days" ${f.type === 'days' ? 'selected' : ''}>Doar în anumite zile</option>
        <option value="weekly" ${f.type === 'weekly' ? 'selected' : ''}>De X ori pe săptămână</option></select></label>
      <div id="he-days" class="weekdays" ${f.type === 'days' ? '' : 'hidden'}>${ZILE_SCURT.map((z, i) => `<label><input type="checkbox" value="${i}" ${(f.days || []).includes(i) ? 'checked' : ''}>${z}</label>`).join('')}</div>
      <label class="f" id="he-n-wrap" ${f.type === 'weekly' ? '' : 'hidden'}><span>De câte ori pe săptămână</span><input id="he-n" type="number" min="1" max="7" value="${f.n || 3}"></label>
      <div class="modal-actions">
        ${id ? '<button type="button" class="btn bad sm" id="he-del">Șterge</button>' : ''}
        <button type="button" class="btn ghost" data-close>Renunță</button>
        <button type="submit" class="btn">Salvează</button>
      </div>
    </form>`, {
    onMount: (el, close) => {
      el.querySelectorAll('[data-ic]').forEach(b => b.addEventListener('click', () => {
        chosenIcon = b.dataset.ic; el.querySelectorAll('[data-ic]').forEach(x => x.classList.toggle('on', x === b)); sfx('click');
      }));
      const fr = el.querySelector('#he-freq');
      fr.addEventListener('change', () => { el.querySelector('#he-days').hidden = fr.value !== 'days'; el.querySelector('#he-n-wrap').hidden = fr.value !== 'weekly'; });
      el.querySelector('#he-form').addEventListener('submit', e => {
        e.preventDefault();
        const type = fr.value;
        const freq = type === 'days' ? { type, days: [...el.querySelectorAll('#he-days input:checked')].map(i => Number(i.value)) } : type === 'weekly' ? { type, n: Math.max(1, Math.min(7, Number(el.querySelector('#he-n').value) || 1)) } : { type: 'daily' };
        if (type === 'days' && !freq.days.length) { toast('Alege cel puțin o zi', { icon: 'calendar' }); return; }
        const hv = el.querySelector('#he-hour').value;
        const data = { name: el.querySelector('#he-name').value.trim() || 'Obicei', icon: chosenIcon, times: Math.max(1, Math.min(12, Number(el.querySelector('#he-times').value) || 1)), hour: hv === '' ? null : Number(hv), freq };
        if (id) Object.assign(h, data);
        else state.habits.push({ ...data, id: uid(), order: state.habits.length, key: null });
        close(); save(); sfx('tick'); rerender();
      });
      el.querySelector('#he-del')?.addEventListener('click', async () => {
        close();
        if (!(await confirmBox(`Ștergi obiceiul „${h.name}”? Istoricul lui nu se mai afișează.`, { ok: 'Șterge', danger: true }))) return;
        state.habits = state.habits.filter(x => x.id !== id); save(); sfx('delete'); rerender();
      });
    },
  });
}

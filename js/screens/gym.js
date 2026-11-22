/* =========================================================
   Sala de forță – antrenamente, rutine, recorduri personale (PR),
   sugestii de progresie și rezumat săptămânal. Statistica Putere.
   ========================================================= */
import { state, save } from '../store.js';
import { rerender } from '../router.js';
import { award, evaluate, heroMult } from '../game.js';
import { screenHead, emptyState, modal, confirmBox, toast, celebrate } from '../ui.js';
import { lineChart, drawWhenReady } from '../charts.js';
import { GROUPS } from '../data/exercises.js';
import { icon } from '../icons.js';
import { esc, uid, fmtNum, fmtDur, fmtDate, fmtShort, todayKey, weekKeys, num } from '../util.js';
import { sfx } from '../audio.js';
import { blankMatrix, stamp, rectsFromMatrix } from '../pixel.js';

/* ---------- Calcule ---------- */
const exById = id => state.gym.exercises.find(e => e.id === id) || { id, name: '(exercițiu șters)', group: 'piept' };
const e1rm = (kg, reps) => (reps > 0 ? kg * (1 + reps / 30) : 0); // formula Epley
const working = ex => (ex.sets || []).filter(s => s.done && !s.warm && s.reps > 0);
const exVolume = ex => working(ex).reduce((s, x) => s + x.kg * x.reps, 0);

/** Ultimele apariții ale unui exercițiu în antrenamentele terminate (cele mai noi primele). */
function history(exId, n = 50) {
  const out = [];
  for (let i = state.gym.workouts.length - 1; i >= 0 && out.length < n; i--) {
    const w = state.gym.workouts[i];
    const ex = w.exercises.find(e => e.exId === exId);
    if (ex && working(ex).length) out.push({ w, ex });
  }
  return out;
}
/** Sugestie de progresie: toate repetările țintă făcute de 2 ori la rând → +2,5 / +5 kg. */
function suggestion(exId, targetReps) {
  const h = history(exId, 2);
  if (h.length < 2 || !targetReps) return null;
  const ok = h.every(({ ex }) => { const ws = working(ex); return ws.length && ws.every(s => s.reps >= targetReps); });
  if (!ok) return null;
  const last = Math.max(...working(h[0].ex).map(s => s.kg));
  const inc = exById(exId).lower ? 5 : 2.5;
  return { kg: last + inc, inc };
}

/* ---------- Ceasul global (pauza continuă și dacă schimbi ecranul) ---------- */
let ticker = null;
function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    const a = state.gym.active;
    if (!a) { clearInterval(ticker); ticker = null; return; }
    const t = document.getElementById('g-timer');
    if (t) t.textContent = fmtDur((Date.now() - a.start) / 1000);
    if (a.restEnd) {
      const left = Math.ceil((a.restEnd - Date.now()) / 1000);
      const rt = document.getElementById('g-rest');
      if (left <= 0) {
        a.restEnd = null; save(); sfx('rest');
        toast('Pauza s-a terminat! Următoarea serie.', { icon: 'clock' });
        if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
        document.querySelector('.rest-banner')?.remove();
      } else if (rt) rt.textContent = fmtDur(left);
    }
  }, 500);
}

/* ---------- Ecran ---------- */
let progEx = null, progMetric = 'kg';

export function renderGym(view) {
  if (state.gym.active) { ensureTicker(); renderWorkout(view); }
  else renderHome(view);
}

/* ===== Pagina principală a sălii ===== */
function renderHome(view) {
  const wk = weekKeys(todayKey());
  const weekW = state.gym.workouts.filter(w => wk.includes(w.date));
  const weekVol = weekW.reduce((s, w) => s + (w.volume || 0), 0);
  const groupSets = {};
  weekW.forEach(w => w.exercises.forEach(ex => { const g = exById(ex.exId).group; groupSets[g] = (groupSets[g] || 0) + working(ex).length; }));
  const withHist = [...new Set(state.gym.workouts.flatMap(w => w.exercises.filter(e => working(e).length).map(e => e.exId)))];
  if (!progEx || !withHist.includes(progEx)) progEx = withHist[0] || null;
  const pr = progEx ? state.gym.prs[progEx] : null;

  view.innerHTML = `
    ${screenHead('dumbbell', 'Sala de forță', 'Antrenamente · statistica Putere')}
    <div class="win">
      <button class="btn big block" id="g-start">${icon('sword')} Începe antrenamentul</button>
      <div class="win-title mt">${icon('scroll')} Rutine</div>
      <ul class="list">${state.gym.routines.map(r => `<li class="item">
        <div class="i-main"><div class="i-title">${esc(r.name)}</div><div class="i-sub">${r.items.map(i => esc(exById(i.ex).name)).join(', ')}</div></div>
        <button class="btn sm ghost" data-edit-r="${r.id}" aria-label="Editează">${icon('quill')}</button>
        <button class="btn sm" data-start-r="${r.id}">Start</button></li>`).join('')}</ul>
      <button class="btn ghost sm mt" id="g-new-r">${icon('plus')} Rutină nouă</button>
    </div>

    <div class="win">
      <div class="win-title">${icon('calendar')} Săptămâna asta</div>
      <div class="kpis">
        <div class="kpi"><div class="k-lbl">Antrenamente</div><div class="k-val">${weekW.length} / ${state.settings.goals.workoutsWeek}</div></div>
        <div class="kpi"><div class="k-lbl">Volum total</div><div class="k-val">${fmtNum(weekVol)} kg</div></div>
      </div>
      <div class="muscle-wrap mt">
        ${muscleSVG(groupSets)}
        <div class="small">${Object.keys(GROUPS).filter(g => g !== 'cardio').map(g => `<div>${groupSets[g] ? '■' : '□'} ${GROUPS[g]}${groupSets[g] ? ` · ${groupSets[g]} serii` : ''}</div>`).join('')}${groupSets.cardio ? `<div>■ Cardio · ${groupSets.cardio}</div>` : ''}</div>
      </div>
    </div>

    <div class="win">
      <div class="win-title">${icon('chart')} Progres pe exercițiu</div>
      ${withHist.length ? `
        <select id="g-prog-ex">${withHist.map(id => `<option value="${id}" ${id === progEx ? 'selected' : ''}>${esc(exById(id).name)}</option>`).join('')}</select>
        <div class="tabs mt">
          <button class="${progMetric === 'kg' ? 'on' : ''}" data-metric="kg">Greutate max</button>
          <button class="${progMetric === 'vol' ? 'on' : ''}" data-metric="vol">Volum</button>
          <button class="${progMetric === 'e1rm' ? 'on' : ''}" data-metric="e1rm">1RM estimat</button>
        </div>
        <canvas class="chart" id="g-chart"></canvas>
        ${pr ? `<p class="mt">🏆 Record: <b>${fmtNum(pr.kg, 1)} kg</b> · 1RM estimat <b>${fmtNum(pr.e1rm, 1)} kg</b> · volum max <b>${fmtNum(pr.vol)} kg</b></p>` : ''}
      ` : emptyState('chart', 'Termină un antrenament ca să vezi progresul.')}
    </div>

    <div class="win">
      <div class="win-title">${icon('scroll')} Istoric</div>
      ${state.gym.workouts.length ? `<ul class="list">${state.gym.workouts.slice().reverse().slice(0, 25).map(w => `<li class="item" data-w="${w.id}" style="cursor:pointer">
        <div class="i-main"><div class="i-title">${esc(w.name)}</div><div class="i-sub">${esc(fmtDate(w.date))} · ${fmtDur((w.end - w.start) / 1000)} · ${fmtNum(w.volume)} kg</div></div>
        ${w.prs?.length ? `<span class="tag acc">PR ×${w.prs.length}</span>` : ''}</li>`).join('')}</ul>` : emptyState('dumbbell', 'Niciun antrenament încă.')}
    </div>
    <button class="btn ghost block" id="g-lib">${icon('book')} Biblioteca de exerciții</button>`;

  view.querySelector('#g-start').addEventListener('click', () => startWorkout(null));
  view.querySelectorAll('[data-start-r]').forEach(b => b.addEventListener('click', () => startWorkout(b.dataset.startR)));
  view.querySelectorAll('[data-edit-r]').forEach(b => b.addEventListener('click', () => editRoutine(b.dataset.editR)));
  view.querySelector('#g-new-r').addEventListener('click', () => editRoutine(null));
  view.querySelectorAll('[data-w]').forEach(li => li.addEventListener('click', () => workoutDetails(li.dataset.w)));
  view.querySelector('#g-lib').addEventListener('click', () => library());
  const sel = view.querySelector('#g-prog-ex');
  if (sel) {
    sel.addEventListener('change', () => { progEx = sel.value; rerender(); });
    view.querySelectorAll('[data-metric]').forEach(b => b.addEventListener('click', () => { progMetric = b.dataset.metric; rerender(); }));
    const pts = history(progEx, 30).reverse().map(({ w, ex }) => {
      const ws = working(ex);
      const v = progMetric === 'kg' ? Math.max(...ws.map(s => s.kg)) : progMetric === 'vol' ? exVolume(ex) : Math.max(...ws.map(s => e1rm(s.kg, s.reps)));
      return { label: fmtShort(w.date), value: Math.round(v * 10) / 10 };
    });
    drawWhenReady(() => lineChart(view.querySelector('#g-chart'), pts, { unit: ' kg' }));
  }
}

/** Siluetă pixel-art (față + spate), colorată pe grupele lucrate. */
function muscleSVG(groupSets) {
  const T = [
    '.....kkkk.....', '....kcccck....', '....kcccck....', '.....kcck.....', '..kUUTTTTUUk..', '.kRUTTTTTTURk.',
    '.kRkTTTTTTkRk.', '.kRkAAAAAAkRk.', '.kRkAAAAAAkRk.', '.kRkAAAAAAkRk.', '.kckkkkkkkkck.', '...kLLkkLLk...',
    '...kLLkkLLk...', '...kLLkkLLk...', '...kLLkkLLk...', '...kLLkkLLk...', '...kLLkkLLk...', '...kckkkkck....', '...kkk..kkk...',
  ];
  const col = g => { const n = groupSets[g] || 0; return n >= 8 ? '#e04f5f' : n >= 4 ? '#ef7d57' : n > 0 ? '#ffcd75' : '#566c86'; };
  const base = { k: '#0b0c15', c: '#94b0c2', U: col('umeri'), R: col('brate'), L: col('picioare') };
  const m = blankMatrix(30, 19);
  stamp(m, T, { ...base, T: col('piept'), A: col('abdomen') }, 0, 0);
  stamp(m, T, { ...base, T: col('spate'), A: col('spate') }, 16, 0);
  return `<svg class="px" viewBox="0 0 30 19" xmlns="http://www.w3.org/2000/svg" aria-label="Grupe musculare lucrate: față și spate">${rectsFromMatrix(m)}</svg>`;
}

/* ===== Pornirea unui antrenament ===== */
function startWorkout(routineId) {
  const r = state.gym.routines.find(x => x.id === routineId);
  const exercises = (r?.items || []).map(it => {
    const last = history(it.ex, 1)[0];
    const lastKg = last ? Math.max(...working(last.ex).map(s => s.kg)) : 0;
    const sug = suggestion(it.ex, it.reps);
    const kg = sug ? sug.kg : lastKg;
    return { exId: it.ex, note: '', target: { sets: it.sets, reps: it.reps }, sets: Array.from({ length: it.sets }, () => ({ kg, reps: it.reps, warm: false, done: false })) };
  });
  state.gym.active = { id: uid(), start: Date.now(), routineId: r?.id || null, name: r?.name || 'Antrenament liber', exercises, restEnd: null };
  save(); sfx('quest'); ensureTicker(); rerender();
}

/* ===== Antrenamentul în desfășurare ===== */
function renderWorkout(view) {
  const a = state.gym.active;
  const restLeft = a.restEnd ? Math.ceil((a.restEnd - Date.now()) / 1000) : 0;
  view.innerHTML = `
    <div class="win">
      <div class="row spread"><h1 class="mb0">${esc(a.name)}</h1></div>
      <div class="timer-big mt" id="g-timer">${fmtDur((Date.now() - a.start) / 1000)}</div>
      <div class="row mt"><button class="btn bad sm" id="g-cancel">Anulează</button><button class="btn good grow" id="g-finish">${icon('trophy')} Termină antrenamentul</button></div>
    </div>
    ${a.exercises.map((ex, ei) => {
      const e = exById(ex.exId);
      const last = history(ex.exId, 1)[0];
      const sug = suggestion(ex.exId, ex.target?.reps);
      return `<div class="exo" data-ei="${ei}">
        <div class="exo-head"><span class="name">${esc(e.name)}</span><span class="tag">${esc(GROUPS[e.group] || '')}</span><button class="del" data-rm-ex="${ei}" aria-label="Scoate exercițiul">${icon('trash')}</button></div>
        ${last ? `<div class="prev">Data trecută (${esc(fmtShort(last.w.date))}): ${working(last.ex).map(s => `${fmtNum(s.kg, 1)}×${s.reps}`).join(' · ')}</div>` : '<div class="prev">Prima dată la acest exercițiu.</div>'}
        ${sug ? `<div class="suggest">▲ Sugestie: crește la ${fmtNum(sug.kg, 1)} kg (+${String(sug.inc).replace('.', ',')} kg). Ai făcut toate repetările de 2 ori la rând!</div>` : ''}
        <table class="sets"><thead><tr><th>SERIE</th><th>KG</th><th>REP.</th><th>✓</th><th></th></tr></thead><tbody>
        ${ex.sets.map((s, si) => `<tr class="${s.warm ? 'warm' : ''} ${s.done ? 'done' : ''}">
          <td><button class="set-no" data-warm="${ei}:${si}" title="Atinge pentru serie de încălzire">${s.warm ? 'Î' : si + 1 - ex.sets.slice(0, si).filter(x => x.warm).length}</button></td>
          <td><div class="kg-cell"><button data-kg="${ei}:${si}:-2.5" aria-label="minus 2,5 kg">−</button><input type="number" inputmode="decimal" step="0.5" min="0" value="${s.kg || ''}" data-f="kg" data-s="${ei}:${si}" aria-label="kg"><button data-kg="${ei}:${si}:2.5" aria-label="plus 2,5 kg">+</button></div></td>
          <td><input type="number" inputmode="numeric" min="0" style="width:56px" value="${s.reps || ''}" data-f="reps" data-s="${ei}:${si}" aria-label="repetări"></td>
          <td><button class="check ${s.done ? 'on' : ''}" data-done="${ei}:${si}" aria-label="Serie făcută"></button></td>
          <td><button class="del" data-rm-set="${ei}:${si}" aria-label="Șterge seria" style="width:24px;height:24px">${icon('trash')}</button></td>
        </tr>`).join('')}
        </tbody></table>
        <div class="row mt"><button class="btn sm ghost" data-add-set="${ei}">+ serie</button><button class="btn sm ghost" data-copy-set="${ei}" ${ex.sets.length ? '' : 'disabled'}>Copiază seria anterioară</button></div>
        <input class="mt" placeholder="Notițe (ex. priză largă, mă doare umărul)" value="${esc(ex.note || '')}" data-note="${ei}" maxlength="200" aria-label="Notițe">
      </div>`;
    }).join('')}
    <button class="btn alt block" id="g-add-ex">${icon('plus')} Adaugă exercițiu</button>
    <div class="row mt"><span class="muted small">Pauză între serii:</span>
      <button class="btn sm ghost" data-restset="-15">−15s</button><b>${state.settings.restSec}s</b><button class="btn sm ghost" data-restset="15">+15s</button></div>
    ${restLeft > 0 ? `<div class="rest-banner">${icon('clock')}<div class="grow"><div class="small">Pauză</div><div class="rt" id="g-rest">${fmtDur(restLeft)}</div></div>
      <button class="btn sm ghost" data-rest="-15">−15</button><button class="btn sm ghost" data-rest="15">+15</button><button class="btn sm" data-rest="skip">Sari</button></div>` : ''}`;

  const at = s => s.split(':').map(Number);
  // modificări în câmpuri: salvăm fără redesenare (păstrăm focusul)
  view.querySelectorAll('input[data-f]').forEach(inp => inp.addEventListener('input', () => {
    const [ei, si] = at(inp.dataset.s); a.exercises[ei].sets[si][inp.dataset.f] = Math.max(0, num(inp.value)); save();
  }));
  view.querySelectorAll('[data-note]').forEach(inp => inp.addEventListener('input', () => { a.exercises[Number(inp.dataset.note)].note = inp.value; save(); }));
  view.querySelectorAll('[data-kg]').forEach(b => b.addEventListener('click', () => {
    const [ei, si, d] = at(b.dataset.kg); const s = a.exercises[ei].sets[si];
    s.kg = Math.max(0, Math.round(((s.kg || 0) + d) * 10) / 10); save(); sfx('click'); rerender();
  }));
  view.querySelectorAll('[data-warm]').forEach(b => b.addEventListener('click', () => { const [ei, si] = at(b.dataset.warm); const s = a.exercises[ei].sets[si]; s.warm = !s.warm; save(); rerender(); }));
  view.querySelectorAll('[data-done]').forEach(b => b.addEventListener('click', () => {
    const [ei, si] = at(b.dataset.done); const s = a.exercises[ei].sets[si];
    s.done = !s.done;
    if (s.done) { sfx('tick'); a.restEnd = Date.now() + state.settings.restSec * 1000; } // pornește automat pauza
    save(); rerender();
  }));
  view.querySelectorAll('[data-rm-set]').forEach(b => b.addEventListener('click', () => { const [ei, si] = at(b.dataset.rmSet); a.exercises[ei].sets.splice(si, 1); save(); rerender(); }));
  view.querySelectorAll('[data-add-set]').forEach(b => b.addEventListener('click', () => {
    const ex = a.exercises[Number(b.dataset.addSet)]; const prev = ex.sets[ex.sets.length - 1];
    ex.sets.push({ kg: prev?.kg || 0, reps: 0, warm: false, done: false }); save(); rerender();
  }));
  view.querySelectorAll('[data-copy-set]').forEach(b => b.addEventListener('click', () => {
    const ex = a.exercises[Number(b.dataset.copySet)]; const prev = ex.sets[ex.sets.length - 1]; if (!prev) return;
    ex.sets.push({ kg: prev.kg, reps: prev.reps, warm: prev.warm, done: false }); save(); rerender();
  }));
  view.querySelectorAll('[data-rm-ex]').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmBox('Scoți exercițiul din antrenament?', { ok: 'Scoate', danger: true }))) return;
    a.exercises.splice(Number(b.dataset.rmEx), 1); save(); rerender();
  }));
  view.querySelectorAll('[data-rest]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.rest === 'skip') a.restEnd = null; else a.restEnd = Math.max(Date.now() + 1000, a.restEnd + Number(b.dataset.rest) * 1000);
    save(); rerender();
  }));
  view.querySelectorAll('[data-restset]').forEach(b => b.addEventListener('click', () => {
    state.settings.restSec = Math.max(15, Math.min(600, state.settings.restSec + Number(b.dataset.restset))); save(); rerender();
  }));
  view.querySelector('#g-add-ex').addEventListener('click', () => pickExercise(id => {
    const last = history(id, 1)[0];
    const kg = last ? Math.max(...working(last.ex).map(s => s.kg)) : 0;
    a.exercises.push({ exId: id, note: '', target: { sets: 3, reps: 8 }, sets: [{ kg, reps: 0, warm: false, done: false }] });
    save(); rerender();
  }));
  view.querySelector('#g-cancel').addEventListener('click', async () => {
    if (!(await confirmBox('Renunți la antrenament? Nimic nu se salvează.', { ok: 'Renunță', danger: true }))) return;
    state.gym.active = null; save(); rerender();
  });
  view.querySelector('#g-finish').addEventListener('click', finishWorkout);
}

/* ===== Finalul antrenamentului: PR-uri, XP, ecranul „Victorie!” ===== */
async function finishWorkout() {
  const a = state.gym.active;
  const done = a.exercises.filter(ex => working(ex).length);
  if (!done.length) {
    if (await confirmBox('Nicio serie bifată. Închizi antrenamentul fără să-l salvezi?', { ok: 'Închide', danger: true })) { state.gym.active = null; save(); rerender(); }
    return;
  }
  const end = Date.now();
  const prs = [];
  let volume = 0, sets = 0;
  for (const ex of done) {
    const ws = working(ex);
    sets += ws.length;
    const vol = exVolume(ex); volume += vol;
    const kg = Math.max(...ws.map(s => s.kg)), best = Math.max(...ws.map(s => e1rm(s.kg, s.reps)));
    const old = state.gym.prs[ex.exId];
    if (old && (kg > old.kg || best > old.e1rm + 0.05)) prs.push({ exId: ex.exId, kg, e1rm: best, oldKg: old.kg });
    state.gym.prs[ex.exId] = { kg: Math.max(kg, old?.kg || 0), e1rm: Math.max(best, old?.e1rm || 0), vol: Math.max(vol, old?.vol || 0), date: todayKey() };
  }
  const w = { id: a.id, date: todayKey(), start: a.start, end, routineId: a.routineId, name: a.name, exercises: done.map(ex => ({ ...ex, sets: ex.sets.filter(s => s.done) })), volume: Math.round(volume), sets, prs: prs.map(p => p.exId) };
  state.gym.workouts.push(w);
  state.gym.active = null;
  // XP-ul e calculat înainte, ca ecranul „Victorie!” să apară înaintea celui de nivel nou
  const baseXp = 50 + Math.min(40, sets * 2) + 25 * prs.length;
  const xp = Math.round(baseXp * heroMult('gym'));
  save();

  if (prs.length) {
    celebrate({
      title: 'NEW RECORD!', sound: 'record',
      body: `<ul class="list">${prs.map(p => `<li class="item">${icon('trophy')}<div class="i-main"><div class="i-title">${esc(exById(p.exId).name)}</div><div class="i-sub">${fmtNum(p.kg, 1)} kg · 1RM ≈ ${fmtNum(p.e1rm, 1)} kg (înainte ${fmtNum(p.oldKg, 1)} kg)</div></div></li>`).join('')}</ul>`,
    });
  }
  celebrate({
    title: 'VICTORIE!', sound: 'victory', anim: undefined,
    sub: 'Bătălia de azi e câștigată.',
    body: `<div class="kpis mt">
      <div class="kpi"><div class="k-lbl">Durată</div><div class="k-val">${fmtDur((end - a.start) / 1000)}</div></div>
      <div class="kpi"><div class="k-lbl">Volum</div><div class="k-val">${fmtNum(volume)} kg</div></div>
      <div class="kpi"><div class="k-lbl">Serii</div><div class="k-val">${sets}</div></div>
      <div class="kpi"><div class="k-lbl">Recorduri</div><div class="k-val">${prs.length}</div></div>
      <div class="kpi"><div class="k-lbl">XP câștigat</div><div class="k-val">+${xp}</div></div>
    </div>`,
  });
  award('gym', baseXp, { silent: true });
  evaluate();
  rerender();
}

/* ===== Alegerea unui exercițiu ===== */
function pickExercise(onPick) {
  modal(`<h2>Alege exercițiul</h2>
    <input id="px-q" placeholder="Caută…" aria-label="Caută exercițiu">
    <div id="px-list" class="mt"></div>
    <div class="modal-actions"><button class="btn ghost" data-close>Închide</button></div>`, {
    onMount: (el, close) => {
      const draw = () => {
        const q = el.querySelector('#px-q').value.trim().toLowerCase();
        el.querySelector('#px-list').innerHTML = Object.entries(GROUPS).map(([g, gn]) => {
          const list = state.gym.exercises.filter(e => e.group === g && (!q || e.name.toLowerCase().includes(q)));
          return list.length ? `<h3 class="mt">${esc(gn)}</h3>${list.map(e => `<button class="btn ghost sm block" style="justify-content:flex-start;margin-bottom:6px" data-pick="${e.id}">${esc(e.name)}${e.custom ? ' ★' : ''}</button>`).join('')}` : '';
        }).join('') || '<p class="muted">Niciun rezultat. Adaugă-l din Biblioteca de exerciții.</p>';
        el.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => { close(); onPick(b.dataset.pick); }));
      };
      el.querySelector('#px-q').addEventListener('input', draw);
      draw();
    },
  });
}

/* ===== Biblioteca de exerciții (și exerciții proprii) ===== */
function library() {
  modal(`<h2>Biblioteca de exerciții</h2>
    <form id="lib-form" class="win tight">
      <label class="f"><span>Exercițiu propriu</span><input id="lib-name" maxlength="60" required placeholder="ex. Hip thrust"></label>
      <label class="f"><span>Grupa musculară</span><select id="lib-group">${Object.entries(GROUPS).map(([g, n]) => `<option value="${g}">${n}</option>`).join('')}</select></label>
      <label class="row"><input type="checkbox" id="lib-lower"> <span>Exercițiu pentru picioare (progresie +5 kg)</span></label>
      <button class="btn block mt" type="submit">Adaugă</button>
    </form>
    <div id="lib-list"></div>
    <div class="modal-actions"><button class="btn ghost" data-close>Închide</button></div>`, {
    onMount: el => {
      const draw = () => {
        el.querySelector('#lib-list').innerHTML = Object.entries(GROUPS).map(([g, gn]) => `<h3 class="mt">${esc(gn)}</h3><ul class="list">${state.gym.exercises.filter(e => e.group === g).map(e => `<li class="item"><div class="i-main">${esc(e.name)}${e.custom ? ' <span class="tag acc">PROPRIU</span>' : ''}</div>${e.custom ? `<button class="del" data-del-ex="${e.id}" aria-label="Șterge">${icon('trash')}</button>` : ''}</li>`).join('')}</ul>`).join('');
        el.querySelectorAll('[data-del-ex]').forEach(b => b.addEventListener('click', () => { state.gym.exercises = state.gym.exercises.filter(e => e.id !== b.dataset.delEx); save(); draw(); }));
      };
      el.querySelector('#lib-form').addEventListener('submit', e => {
        e.preventDefault();
        const g = el.querySelector('#lib-group').value;
        state.gym.exercises.push({ id: 'c_' + uid(), name: el.querySelector('#lib-name').value.trim(), group: g, lower: el.querySelector('#lib-lower').checked || g === 'picioare', custom: true });
        el.querySelector('#lib-name').value = ''; save(); sfx('tick'); toast('Exercițiu adăugat', { icon: 'dumbbell' }); draw();
      });
      draw();
    },
  });
}

/* ===== Editorul de rutine (șabloane) ===== */
function editRoutine(id) {
  const orig = state.gym.routines.find(r => r.id === id);
  const r = orig ? JSON.parse(JSON.stringify(orig)) : { id: 'r_' + uid(), name: '', items: [] };
  const { el, close } = modal(`<h2>${orig ? 'Editează rutina' : 'Rutină nouă'}</h2><div id="re-body"></div>`);
  const draw = () => {
    el.querySelector('#re-body').innerHTML = `
      <label class="f"><span>Nume</span><input id="re-name" value="${esc(r.name)}" maxlength="60" placeholder="ex. Ziua B: Spate + Biceps"></label>
      <ul class="list">${r.items.map((it, i) => `<li class="item"><div class="i-main"><div class="i-title">${esc(exById(it.ex).name)}</div>
        <div class="row small"><input type="number" class="inline-num" min="1" max="10" value="${it.sets}" data-sets="${i}" aria-label="serii"> serii × <input type="number" class="inline-num" min="1" max="100" value="${it.reps}" data-reps="${i}" aria-label="repetări"> rep.</div></div>
        <button class="del" data-rm="${i}" aria-label="Scoate">${icon('trash')}</button></li>`).join('')}</ul>
      <button class="btn ghost sm" id="re-add">${icon('plus')} Exercițiu</button>
      <div class="modal-actions">
        ${orig ? '<button class="btn bad sm" id="re-del">Șterge rutina</button>' : ''}
        <button class="btn ghost" id="re-cancel">Renunță</button><button class="btn" id="re-save">Salvează</button>
      </div>`;
    const b = el.querySelector('#re-body');
    b.querySelector('#re-name').addEventListener('input', e => { r.name = e.target.value; });
    b.querySelectorAll('[data-sets]').forEach(i => i.addEventListener('input', () => { r.items[i.dataset.sets].sets = Math.max(1, Number(i.value) || 1); }));
    b.querySelectorAll('[data-reps]').forEach(i => i.addEventListener('input', () => { r.items[i.dataset.reps].reps = Math.max(1, Number(i.value) || 1); }));
    b.querySelectorAll('[data-rm]').forEach(x => x.addEventListener('click', () => { r.items.splice(Number(x.dataset.rm), 1); draw(); }));
    b.querySelector('#re-add').addEventListener('click', () => pickExercise(ex => { r.items.push({ ex, sets: 3, reps: 8 }); draw(); }));
    b.querySelector('#re-cancel').addEventListener('click', close);
    b.querySelector('#re-save').addEventListener('click', () => {
      r.name = r.name.trim() || 'Rutină fără nume';
      if (orig) Object.assign(orig, r); else state.gym.routines.push(r);
      save(); close(); rerender();
    });
    b.querySelector('#re-del')?.addEventListener('click', async () => {
      close();
      if (await confirmBox(`Ștergi rutina „${orig.name}”?`, { ok: 'Șterge', danger: true })) { state.gym.routines = state.gym.routines.filter(x => x !== orig); save(); rerender(); }
    });
  };
  draw();
}

/* ===== Detaliile unui antrenament din istoric ===== */
function workoutDetails(id) {
  const w = state.gym.workouts.find(x => x.id === id); if (!w) return;
  modal(`<h2>${esc(w.name)}</h2>
    <p class="muted">${esc(fmtDate(w.date))} · ${fmtDur((w.end - w.start) / 1000)} · ${fmtNum(w.volume)} kg</p>
    ${w.exercises.map(ex => `<div class="exo"><div class="exo-head"><span class="name">${esc(exById(ex.exId).name)}</span>${w.prs?.includes(ex.exId) ? '<span class="tag acc">PR</span>' : ''}</div>
      <div>${ex.sets.map(s => `${s.warm ? '<span class="muted">Î</span> ' : ''}${fmtNum(s.kg, 1)} kg × ${s.reps}`).join(' · ')}</div>
      ${ex.note ? `<div class="muted small mt">📝 ${esc(ex.note)}</div>` : ''}</div>`).join('')}
    <div class="modal-actions"><button class="btn bad sm" id="wd-del">Șterge</button><button class="btn ghost" data-close>Închide</button></div>`, {
    onMount: (el, close) => el.querySelector('#wd-del').addEventListener('click', async () => {
      close();
      if (!(await confirmBox('Ștergi antrenamentul din istoric? Recordurile rămân.', { ok: 'Șterge', danger: true }))) return;
      state.gym.workouts = state.gym.workouts.filter(x => x !== w); save(); rerender();
    }),
  });
}

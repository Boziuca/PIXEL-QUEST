/* =========================================================
   Atelierul – galeria foto, un „album de amintiri” cu rame polaroid.
   ========================================================= */
import { allPhotos, hydratePhotos, putPhoto } from '../db.js';
import { state, save } from '../store.js';
import { rerender } from '../router.js';
import { screenHead, emptyState, modal, confirmBox } from '../ui.js';
import { icon } from '../icons.js';
import { esc, fmtDate, todayKey } from '../util.js';
import { addPhoto, removePhoto } from '../photos.js';
import { evaluate } from '../game.js';
import { sfx } from '../audio.js';

const TAGS = { toate: 'Toate', masa: 'Mese', progres: 'Progres', coperta: 'Coperți', altele: 'Altele' };
let filter = 'toate';

export function renderGallery(view) {
  view.innerHTML = `
    ${screenHead('camera', 'Atelierul', 'Albumul tău de amintiri')}
    <div class="win">
      <div class="grid2">
        <button class="btn" id="g-cam">${icon('camera')} Cameră</button>
        <button class="btn alt" id="g-file">${icon('upload')} Din galerie</button>
      </div>
      <label class="f mt"><span>Etichetă pentru poza nouă</span><select id="g-tag">${Object.entries(TAGS).filter(([k]) => k !== 'toate').map(([k, v]) => `<option value="${k}" ${k === 'altele' ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    </div>
    <div class="tabs">${Object.entries(TAGS).map(([k, v]) => `<button class="${filter === k ? 'on' : ''}" data-f="${k}">${v}</button>`).join('')}</div>
    <div id="album"><p class="muted center">Se încarcă albumul…</p></div>`;

  const add = camera => addPhoto({ date: todayKey(), tag: view.querySelector('#g-tag').value, caption: '', camera }).then(r => { if (r) { save(); evaluate(); rerender(); } });
  view.querySelector('#g-cam').addEventListener('click', () => add(true));
  view.querySelector('#g-file').addEventListener('click', () => add(false));
  view.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; rerender(); }));

  allPhotos().then(photos => {
    const album = view.querySelector('#album');
    if (!album) return;
    const list = photos.filter(p => filter === 'toate' || p.tag === filter).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.created - a.created);
    album.innerHTML = list.length
      ? `<div class="album">${list.map(p => `<div class="polaroid" data-id="${p.id}" role="button" tabindex="0"><img data-photo="${p.id}" alt="${esc(p.caption || 'Poză')}"><div class="cap">${esc(p.caption || (p.date ? fmtDate(p.date, false) : TAGS[p.tag] || ''))}</div></div>`).join('')}</div>`
      : `<div class="win">${emptyState('camera', 'Albumul e gol. Adaugă prima amintire!')}</div>`;
    hydratePhotos(album);
    album.querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', () => viewPhoto(photos.find(p => p.id === el.dataset.id))));
  });
}

function viewPhoto(p) {
  modal(`<img class="photo-preview" data-photo="${p.id}" alt="">
    <label class="f mt"><span>Descriere</span><input id="pv-cap" value="${esc(p.caption || '')}" maxlength="80"></label>
    <p class="muted small">${p.date ? esc(fmtDate(p.date)) : ''} · ${TAGS[p.tag] || ''}</p>
    <div class="modal-actions"><button class="btn bad sm" id="pv-del">Șterge</button><button class="btn ghost" data-close>Închide</button><button class="btn" id="pv-save">Salvează</button></div>`, {
    onMount: (el, close) => {
      hydratePhotos(el);
      el.querySelector('#pv-save').addEventListener('click', async () => { await putPhoto({ ...p, caption: el.querySelector('#pv-cap').value.trim() }); close(); rerender(); });
      el.querySelector('#pv-del').addEventListener('click', async () => {
        close();
        if (!(await confirmBox('Ștergi poza definitiv? Nu poate fi recuperată (decât dintr-un backup).', { ok: 'Șterge', danger: true }))) return;
        await removePhoto(p.id, p.date);
        // curăță referințele din mese și cărți
        Object.values(state.days).forEach(d => (d.food || []).forEach(f => { if (f.photoId === p.id) f.photoId = null; }));
        state.books.forEach(b => { if (b.coverId === p.id) b.coverId = null; });
        save(); sfx('delete'); rerender();
      });
    },
  });
}

/* =========================================================
   Biblioteca – cărți citite: titlu, autor, pagini, progres,
   status (în curs / terminată), copertă. Statistica Înțelepciune.
   ========================================================= */
import { state, save, day, peekDay } from '../store.js';
import { sel, rerender } from '../router.js';
import { revoke, evaluate, pagesTotal } from '../game.js';
import { bar, screenHead, dateNav, bindDateNav, emptyState, toast, confirmBox, modal } from '../ui.js';
import { icon } from '../icons.js';
import { esc, fmtNum, uid, num, todayKey } from '../util.js';
import { hydratePhotos, deletePdf, storageUsedMB } from '../db.js';
import { addPhoto, removePhoto } from '../photos.js';
import { pickPdf, savePdfFile, setBookPdf, removeBookPdf, logPages as logBookPages, finishBook as finishBookLogic } from '../pdfbooks.js';
import { sfx } from '../audio.js';

let tab = 'curs';
let showForm = false;
let pendingCover = null;
let pendingPdf = null;   // PDF ales în formularul de carte nouă
const mb = b => (b / 1048576).toFixed(1).replace('.', ',') + ' MB';

function commit() { save(); evaluate(sel.date); rerender(); }

export function renderBooks(view) {
  const k = sel.date, g = state.settings.goals.pages;
  const today = pagesTotal(k);
  const books = state.books.filter(b => (tab === 'curs' ? b.status !== 'gata' : b.status === 'gata'));
  const dayLog = peekDay(k)?.pages || [];
  const bookName = id => state.books.find(b => b.id === id)?.title || '(carte ștearsă)';

  view.innerHTML = `
    ${screenHead('book', 'Biblioteca', 'Cărți · statistica Înțelepciune')}
    ${dateNav()}
    <div class="win">
      <div class="row spread"><span>Pagini citite</span><span class="bigval" style="font-size:16px">${fmtNum(today)}</span></div>
      <div class="mt">${bar(today, g, today >= g ? 'bar-good' : 'bar-alt')}</div>
      ${dayLog.length ? `<ul class="list mt">${dayLog.map(p => `<li class="item"><div class="i-main"><div class="i-title">${esc(bookName(p.bookId))}</div><div class="i-sub">${p.n} pagini</div></div><button class="del" data-delpg="${p.id}" aria-label="Șterge">${icon('trash')}</button></li>`).join('')}</ul>` : ''}
    </div>

    <div class="tabs">
      <button class="${tab === 'curs' ? 'on' : ''}" data-tab="curs">În curs (${state.books.filter(b => b.status !== 'gata').length})</button>
      <button class="${tab === 'gata' ? 'on' : ''}" data-tab="gata">Terminate (${state.books.filter(b => b.status === 'gata').length})</button>
      <button data-new="1">${icon('plus')} Carte nouă</button>
    </div>

    ${showForm ? `<div class="win"><div class="win-title">${icon('plus')} Carte nouă</div>
      <form id="b-form">
        <button class="btn alt block" type="button" id="b-pdf" style="margin-bottom:10px">${icon('book')} ${pendingPdf ? `PDF: ${esc(pendingPdf.name)} ✓` : 'Creează din PDF (opțional)'}</button>
        <label class="f"><span>Titlu</span><input id="b-title" required maxlength="120"></label>
        <label class="f"><span>Autor</span><input id="b-author" maxlength="80"></label>
        <div class="grid2">
          <label class="f"><span>Total pagini</span><input id="b-pages" type="number" inputmode="numeric" min="1" max="20000" required></label>
          <label class="f"><span>Deja citite</span><input id="b-read" type="number" inputmode="numeric" min="0" value="0"></label>
        </div>
        <div class="row"><button class="btn ghost sm" type="button" id="b-cover">${icon('camera')} ${pendingCover ? 'Copertă ✓' : 'Copertă'}</button>
          <button class="btn ghost sm" type="button" id="b-cancel">Renunță</button>
          <button class="btn grow" type="submit">Adaugă</button></div>
      </form></div>` : ''}

    ${books.length ? books.map(b => {
      const p = b.pages ? Math.round(b.read / b.pages * 100) : 0;
      return `<div class="book-card">
        ${b.coverId ? `<img class="cover-big" data-photo="${b.coverId}" alt="Copertă">` : `<div class="cover-ph" style="background:${coverColor(b.title)}">${icon('book')}</div>`}
        <div class="bk-main">
          <div class="bk-title">${esc(b.title)}</div>
          <div class="muted">${esc(b.author || 'autor necunoscut')}</div>
          <div class="mt">${bar(b.read, b.pages, b.status === 'gata' ? 'bar-good' : 'bar-alt', `${fmtNum(b.read)} / ${fmtNum(b.pages)} · ${p}%`)}</div>
          ${b.pdfId ? `<a class="btn sm block mt" href="#/citeste/${b.id}">${icon('book')} Citește PDF · pag. ${b.pdfPage || 1}/${b.pdfPages || '?'}</a>` : ''}
          <div class="row mt">
            ${b.status === 'gata' ? `<span class="tag good">TERMINATĂ</span>` : `
              <form class="row nowrap" data-log="${b.id}" style="flex:1">
                <input type="number" inputmode="numeric" min="1" max="2000" class="inline-num" placeholder="pag." aria-label="Pagini citite">
                <button class="btn sm" type="submit">+ pagini</button>
              </form>`}
            <button class="btn sm ghost" data-more="${b.id}" aria-label="Opțiuni">${icon('gear')}</button>
          </div>
        </div>
      </div>`;
    }).join('') : `<div class="win">${emptyState('book', tab === 'curs' ? 'Niciun tom deschis. Adaugă o carte nouă!' : 'Nicio carte terminată încă.')}</div>`}
    <p class="muted small center" id="b-storage"></p>`;
  storageUsedMB().then(s => {
    const el = view.querySelector('#b-storage');
    const n = state.books.filter(b => b.pdfId).length;
    if (el && s) el.textContent = `${n} ${n === 1 ? 'carte PDF' : 'cărți PDF'} · spațiu folosit de aplicație: ${fmtNum(s.used, 1)} MB din ~${fmtNum(s.quota / 1024, 1)} GB disponibili`;
  });

  view.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; rerender(); }));
  view.querySelector('[data-new]').addEventListener('click', () => { showForm = true; rerender(); view.querySelector('#b-title')?.focus(); });
  const f = view.querySelector('#b-form');
  if (f) {
    view.querySelector('#b-cancel').addEventListener('click', async () => {
      if (pendingPdf) { await deletePdf(pendingPdf.id); pendingPdf = null; }
      showForm = false; rerender();
    });
    view.querySelector('#b-pdf').addEventListener('click', async () => {
      const info = await savePdfFile(await pickPdf());
      if (!info) return;
      if (pendingPdf) await deletePdf(pendingPdf.id);
      pendingPdf = info;
      // completăm automat titlul (din numele fișierului) și numărul de pagini
      const t = view.querySelector('#b-title');
      if (!t.value.trim()) t.value = info.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 120);
      view.querySelector('#b-pages').value = info.pages;
      view.querySelector('#b-pdf').innerHTML = `${icon('book')} PDF: ${esc(info.name)} ✓ (${info.pages} pag., ${mb(info.size)})`;
      sfx('tick');
    });
    view.querySelector('#b-cover').addEventListener('click', async () => {
      const rec = await addPhoto({ tag: 'coperta', caption: view.querySelector('#b-title').value || 'Copertă' });
      if (rec) { pendingCover = rec.id; view.querySelector('#b-cover').innerHTML = `${icon('camera')} Copertă ✓`; }
    });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const pages = Math.max(1, Math.round(num(view.querySelector('#b-pages').value)));
      const book = { id: uid(), title: view.querySelector('#b-title').value.trim(), author: view.querySelector('#b-author').value.trim(), pages, read: Math.min(pages, Math.round(num(view.querySelector('#b-read').value))), status: 'curs', coverId: pendingCover, created: todayKey(), finished: null };
      if (pendingPdf) setBookPdf(book, pendingPdf);
      state.books.push(book);
      pendingCover = null; pendingPdf = null; showForm = false; tab = 'curs';
      toast('Carte nouă în bibliotecă', { icon: 'book' }); sfx('tick'); commit();
    });
  }
  view.querySelectorAll('[data-log]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const n = Math.round(num(form.querySelector('input').value));
    if (n > 0) logPages(form.dataset.log, n);
  }));
  view.querySelectorAll('[data-more]').forEach(b => b.addEventListener('click', () => bookMenu(b.dataset.more)));
  view.querySelectorAll('[data-delpg]').forEach(b => b.addEventListener('click', () => {
    const dd = day(k), p = dd.pages.find(x => x.id === b.dataset.delpg); if (!p) return;
    const book = state.books.find(x => x.id === p.bookId);
    if (book) { book.read = Math.max(0, book.read - p.n); if (book.status === 'gata' && book.read < book.pages) { book.status = 'curs'; book.finished = null; } }
    revoke('books', p.xp); dd.pages = dd.pages.filter(x => x !== p); sfx('delete'); commit();
  }));
  bindDateNav(view);
  hydratePhotos(view);
}

/** Notează pagini citite într-o carte. */
function logPages(bookId, n) {
  if (logBookPages(bookId, n, sel.date)) commit();
}
function finishBook(b) { finishBookLogic(b, sel.date); }

function bookMenu(id) {
  const b = state.books.find(x => x.id === id); if (!b) return;
  modal(`<h2>${esc(b.title)}</h2>
    <form id="bm-form">
      <label class="f"><span>Titlu</span><input id="bm-title" value="${esc(b.title)}" maxlength="120" required></label>
      <label class="f"><span>Autor</span><input id="bm-author" value="${esc(b.author)}" maxlength="80"></label>
      <label class="f"><span>Total pagini</span><input id="bm-pages" type="number" min="1" value="${b.pages}"></label>
      <button class="btn block" type="submit">Salvează</button>
    </form>
    <div class="win tight mt">
      ${b.pdfId ? `<p class="small">📖 ${esc(b.pdfName || 'PDF')} · ${b.pdfPages || '?'} pag. · ${mb(b.pdfSize || 0)}</p>` : '<p class="small muted">Fără PDF atașat.</p>'}
      <div class="row"><button class="btn alt sm" id="bm-pdf">${icon('book')} ${b.pdfId ? 'Înlocuiește PDF' : 'Atașează PDF'}</button>
        ${b.pdfId ? '<button class="btn ghost sm" id="bm-pdf-rm">Scoate PDF</button>' : ''}</div>
    </div>
    <div class="modal-actions">
      <button class="btn ghost sm" id="bm-cover">${icon('camera')} Schimbă coperta</button>
      ${b.status !== 'gata' ? '<button class="btn good sm" id="bm-finish">Marchează terminată</button>' : '<button class="btn ghost sm" id="bm-reopen">Redeschide</button>'}
      <button class="btn bad sm" id="bm-del">Șterge</button>
      <button class="btn ghost sm" data-close>Închide</button>
    </div>`, {
    onMount: (el, close) => {
      el.querySelector('#bm-form').addEventListener('submit', e => {
        e.preventDefault();
        b.title = el.querySelector('#bm-title').value.trim() || b.title;
        b.author = el.querySelector('#bm-author').value.trim();
        b.pages = Math.max(1, Math.round(num(el.querySelector('#bm-pages').value)) || b.pages);
        b.read = Math.min(b.read, b.pages);
        close(); commit();
      });
      el.querySelector('#bm-cover').addEventListener('click', async () => {
        const rec = await addPhoto({ tag: 'coperta', caption: b.title });
        if (rec) { if (b.coverId) await removePhoto(b.coverId); b.coverId = rec.id; close(); commit(); }
      });
      el.querySelector('#bm-pdf').addEventListener('click', async () => {
        const info = await savePdfFile(await pickPdf());
        if (!info) return;
        await setBookPdf(b, info);
        if (b.read === 0 && b.pages !== info.pages && await confirmBox(`PDF-ul are ${info.pages} pagini. Actualizez totalul cărții (acum ${b.pages})?`, { ok: 'Da', cancel: 'Nu' })) b.pages = info.pages;
        toast('PDF atașat', { icon: 'book' }); close(); commit();
      });
      el.querySelector('#bm-pdf-rm')?.addEventListener('click', async () => {
        close();
        if (!(await confirmBox('Scoți PDF-ul? Cartea și progresul rămân, doar fișierul se șterge de pe dispozitiv.', { ok: 'Scoate', danger: true }))) return;
        await removeBookPdf(b); sfx('delete'); commit();
      });
      el.querySelector('#bm-finish')?.addEventListener('click', () => { finishBook(b); close(); commit(); });
      el.querySelector('#bm-reopen')?.addEventListener('click', () => { b.status = 'curs'; b.finished = null; close(); commit(); });
      el.querySelector('#bm-del').addEventListener('click', async () => {
        close();
        if (!(await confirmBox(`Ștergi „${b.title}” din bibliotecă?`, { ok: 'Șterge', danger: true }))) return;
        if (b.coverId) await removePhoto(b.coverId);
        if (b.pdfId) await deletePdf(b.pdfId);
        state.books = state.books.filter(x => x !== b); sfx('delete'); commit();
      });
    },
  });
}

function coverColor(t) {
  const cols = ['#b13e53', '#3b5dc9', '#257179', '#6a3c8f', '#c98f2e', '#38b764'];
  let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return cols[h % cols.length];
}

/* =========================================================
   Cititorul de PDF (#/citeste/<idCarte>).
   – ține minte pagina unde ai rămas
   – o pagină se numără „citită” după 8 secunde pe ea, o singură dată
   – paginile numărate se notează automat în Bibliotecă (XP, misiuni)
   – zoom, mod de noapte, glisare stânga/dreapta, săgeți pe tastatură
   ========================================================= */
import { state, save } from '../store.js';
import { evaluate } from '../game.js';
import { icon } from '../icons.js';
import { esc, todayKey, clamp } from '../util.js';
import { getPdf } from '../db.js';
import { openPdf, logPages } from '../pdfbooks.js';
import { sfx } from '../audio.js';

const DWELL_MS = 8000;      // cât trebuie să stai pe o pagină ca să se numere
const FLUSH_EVERY = 5;      // notăm în Bibliotecă la fiecare 5 pagini numărate (și la ieșire)
const MAX_CANVAS = 16e6;    // limită de pixeli (telefoanele refuză canvas-uri prea mari)

let cache = { pdfId: null, doc: null };

export function renderReader(view, [bookId]) {
  const book = state.books.find(b => b.id === bookId);
  if (!book || !book.pdfId) {
    view.innerHTML = `<div class="win center"><p>Cartea nu are un PDF atașat.</p><a class="btn" href="#/carti">Înapoi la Bibliotecă</a></div>`;
    return;
  }
  book.pdfCounted = book.pdfCounted || [];
  let page = clamp(book.pdfPage || 1, 1, book.pdfPages || 1);
  let zoom = 1, shownAt = Date.now(), pending = 0, doc = null, task = null, alive = true;
  const night = () => !!state.settings.readerNight;

  view.innerHTML = `
  <div class="reader ${night() ? 'night' : ''}">
    <div class="reader-bar">
      <a class="icon-btn" href="#/carti" aria-label="Înapoi">${icon('back')}</a>
      <div class="grow" style="min-width:0">
        <div class="rd-title">${esc(book.title)}</div>
        <div class="small muted" id="rd-info">Se deschide…</div>
      </div>
      <button class="icon-btn rd-txt" id="rd-zout" aria-label="Micșorează">−</button>
      <button class="icon-btn rd-txt" id="rd-zin" aria-label="Mărește">+</button>
      <button class="icon-btn" id="rd-night" aria-label="Mod de noapte">${icon(night() ? 'sun' : 'moon')}</button>
    </div>
    <div class="reader-page" id="rd-wrap"><canvas id="rd-canvas"></canvas></div>
    <div class="reader-nav">
      <button class="btn ghost" id="rd-prev" aria-label="Pagina anterioară">◀</button>
      <input type="range" id="rd-range" min="1" max="${book.pdfPages || 1}" value="${page}" aria-label="Pagina">
      <button class="btn ghost" id="rd-next" aria-label="Pagina următoare">▶</button>
    </div>
  </div>`;

  const $ = s => view.querySelector(s);
  const canvas = $('#rd-canvas'), wrap = $('#rd-wrap'), info = $('#rd-info'), range = $('#rd-range');

  function updateInfo() {
    const counted = book.pdfCounted.includes(page);
    const left = Math.max(0, Math.ceil((DWELL_MS - (Date.now() - shownAt)) / 1000));
    info.textContent = `pag. ${page} / ${doc?.numPages || book.pdfPages || '?'} · ${counted ? '✓ numărată' : `se numără în ${left}s`} · ${Math.min(book.pages, book.read + pending)}/${book.pages} citite`;
  }

  /** Notează în Bibliotecă paginile numărate (XP, misiuni, progresul cărții). */
  function flush() {
    if (!pending) return;
    const n = pending; pending = 0;
    logPages(book.id, n, todayKey());
    save(); evaluate();
  }

  let gen = 0; // ignorăm desenările vechi dacă între timp s-a cerut alta
  async function draw() {
    if (!doc || !alive) return;
    const my = ++gen;
    try {
      task?.cancel();
      const p = await doc.getPage(page);
      if (my !== gen || !alive) return;
      const base = p.getViewport({ scale: 1 });
      const avail = Math.max(200, wrap.clientWidth - 8);
      let s = (avail / base.width) * zoom * Math.min(window.devicePixelRatio || 1, 3);
      while (base.width * base.height * s * s > MAX_CANVAS) s *= 0.85;
      const vp = p.getViewport({ scale: s });
      const cssW = (avail * zoom);
      canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
      canvas.style.width = cssW + 'px';
      canvas.style.height = (cssW * vp.height / vp.width) + 'px';
      task = p.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
      await task.promise;
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') console.error(e);
    }
  }

  function goTo(n) {
    if (!doc) return;
    const np = clamp(n, 1, doc.numPages);
    if (np === page) return;
    page = np; shownAt = Date.now();
    book.pdfPage = page; save();
    range.value = page; wrap.scrollTo(0, 0);
    sfx('click'); updateInfo(); draw();
  }

  // ceas: numără pagina curentă după DWELL_MS
  const timer = setInterval(() => {
    if (!doc || document.hidden) return;
    if (!book.pdfCounted.includes(page) && Date.now() - shownAt >= DWELL_MS) {
      book.pdfCounted.push(page); pending++; save();
      if (pending >= FLUSH_EVERY) flush();
    }
    updateInfo();
  }, 1000);

  // butoane
  $('#rd-prev').addEventListener('click', () => goTo(page - 1));
  $('#rd-next').addEventListener('click', () => goTo(page + 1));
  range.addEventListener('change', () => goTo(Number(range.value)));
  $('#rd-zin').addEventListener('click', () => { zoom = Math.min(3, +(zoom + 0.25).toFixed(2)); draw(); });
  $('#rd-zout').addEventListener('click', () => { zoom = Math.max(0.5, +(zoom - 0.25).toFixed(2)); draw(); });
  $('#rd-night').addEventListener('click', () => {
    state.settings.readerNight = !night(); save();
    view.querySelector('.reader').classList.toggle('night', night());
    $('#rd-night').innerHTML = icon(night() ? 'sun' : 'moon');
  });
  // atingere: jumătatea stângă / dreaptă a paginii; glisare stânga / dreapta
  let t0 = null;
  wrap.addEventListener('touchstart', e => { if (e.touches.length === 1) t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    if (!t0 || zoom > 1) { t0 = null; return; }
    const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 60) goTo(page + (dx < 0 ? 1 : -1));
    t0 = null;
  });
  const onKey = e => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(page + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(page - 1); }
  };
  document.addEventListener('keydown', onKey);
  const onVis = () => { if (document.hidden) flush(); else shownAt = Math.max(shownAt, Date.now() - DWELL_MS / 2); };
  document.addEventListener('visibilitychange', onVis);
  const onResize = () => draw();
  window.addEventListener('resize', onResize);

  // deschiderea documentului (reutilizat dacă e aceeași carte)
  (async () => {
    try {
      if (cache.pdfId === book.pdfId && cache.doc) doc = cache.doc;
      else {
        cache.doc?.destroy();
        cache = { pdfId: null, doc: null };
        const rec = await getPdf(book.pdfId);
        if (!rec?.blob) throw new Error('missing');
        doc = await openPdf(rec.blob);
        cache = { pdfId: book.pdfId, doc };
      }
      if (!alive) return;
      if (book.pdfPages !== doc.numPages) { book.pdfPages = doc.numPages; range.max = doc.numPages; save(); }
      page = clamp(page, 1, doc.numPages);
      shownAt = Date.now();
      updateInfo(); draw();
    } catch (e) {
      console.error(e);
      if (!alive) return;
      wrap.innerHTML = `<div class="win center" style="margin:16px">${e.message === 'missing'
        ? 'PDF-ul nu mai e pe acest dispozitiv (de ex. după un import fără PDF-uri). Reatașează-l din meniul cărții, în Bibliotecă.'
        : 'Nu am putut deschide PDF-ul.'}<br><a class="btn mt" href="#/carti">Înapoi</a></div>`;
      info.textContent = '';
    }
  })();

  // la ieșirea din cititor: notăm ce a rămas și curățăm
  return () => {
    alive = false;
    clearInterval(timer);
    task?.cancel();
    flush();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
  };
}

/* =========================================================
   pdfbooks.js – cărțile PDF: atașare, încărcarea PDF.js și
   notarea paginilor citite (folosită de Bibliotecă și de cititor).
   PDF.js (Mozilla, licență Apache 2.0) e inclus local în
   js/vendor/pdfjs, ca să meargă și fără internet.
   ========================================================= */
import { state, day } from './store.js';
import { award } from './game.js';
import { confetti, toast } from './ui.js';
import { putPdf, deletePdf, requestPersist } from './db.js';
import { uid } from './util.js';
import { sfx } from './audio.js';

const MAX_MB = 300;
let libP = null;

/** Încarcă PDF.js o singură dată, doar când e nevoie (nu încetinește pornirea aplicației). */
export function loadPdfjs() {
  if (!libP) {
    libP = import('./vendor/pdfjs/pdf.min.mjs').then(lib => {
      lib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
      return lib;
    });
  }
  return libP;
}

/** Deschide un PDF dintr-un Blob. isEvalSupported: false = mai sigur pentru fișiere necunoscute. */
export async function openPdf(blob) {
  const lib = await loadPdfjs();
  const data = new Uint8Array(await blob.arrayBuffer());
  return lib.getDocument({ data, isEvalSupported: false }).promise;
}

/** Cere un fișier PDF utilizatorului. */
export function pickPdf() {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/pdf,.pdf';
    inp.onchange = () => resolve(inp.files?.[0] || null);
    inp.click();
  });
}

/**
 * Salvează un PDF ales de utilizator. Returnează { id, name, size, pages } sau null.
 */
export async function savePdfFile(file) {
  if (!file) return null;
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { toast('Fișierul ales nu e PDF', { icon: 'book' }); return null; }
  if (file.size > MAX_MB * 1048576) { toast(`PDF prea mare (peste ${MAX_MB} MB)`, { icon: 'book' }); return null; }
  toast('Se încarcă PDF-ul…', { icon: 'book' });
  try {
    const doc = await openPdf(file);
    const pages = doc.numPages;
    doc.destroy();
    const rec = await putPdf({ blob: file, name: file.name, size: file.size });
    requestPersist();
    return { id: rec.id, name: file.name, size: file.size, pages };
  } catch (e) {
    console.error(e);
    toast(e?.name === 'PasswordException' ? 'PDF-ul are parolă. Nu-l pot deschide.' : 'Nu am putut citi PDF-ul', { icon: 'lock' });
    return null;
  }
}

/** Leagă un PDF salvat de o carte (înlocuiește PDF-ul vechi, dacă exista). */
export async function setBookPdf(book, info) {
  if (book.pdfId && book.pdfId !== info.id) await deletePdf(book.pdfId);
  Object.assign(book, { pdfId: info.id, pdfName: info.name, pdfSize: info.size, pdfPages: info.pages, pdfPage: 1, pdfCounted: [] });
}
export async function removeBookPdf(book) {
  await deletePdf(book.pdfId);
  for (const k of ['pdfId', 'pdfName', 'pdfSize', 'pdfPages', 'pdfPage', 'pdfCounted']) delete book[k];
}

/**
 * Notează pagini citite într-o carte (XP, progres, carte terminată).
 * Nu salvează și nu redesenează – apelantul face asta.
 * @returns numărul de pagini notate efectiv
 */
export function logPages(bookId, n, date) {
  const b = state.books.find(x => x.id === bookId); if (!b) return 0;
  const real = Math.min(n, b.pages - b.read);
  if (real <= 0) return 0;
  b.read += real;
  const xp = award('books', Math.min(40, Math.max(1, Math.round(real / 2))), { reason: `${real} ${real === 1 ? 'pagină' : 'pagini'} din „${b.title}”`, ic: 'book' });
  day(date).pages.push({ id: uid(), bookId, n: real, xp });
  if (b.read >= b.pages) finishBook(b, date);
  return real;
}
export function finishBook(b, date) {
  b.status = 'gata'; b.read = b.pages; b.finished = date;
  award('books', 100, { reason: `Carte terminată: ${b.title}!`, ic: 'trophy' });
  confetti(); sfx('quest');
}

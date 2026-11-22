/* =========================================================
   db.js – IndexedDB pentru poze (blob-uri comprimate)
   Fiecare poză: { id, blob, date, tag, caption, ref, created }
   tag: 'masa' | 'progres' | 'coperta' | 'altele'
   ========================================================= */
import { uid } from './util.js';

const DB_NAME = 'pixelquest';
const STORE = 'photos';
const PDFS = 'pdfs';   // cărți PDF: { id, blob, name, size, created }
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: 'id' });
        st.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains(PDFS)) db.createObjectStore(PDFS, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(mode, fn, storeName = STORE) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const st = t.objectStore(storeName);
    let result;
    Promise.resolve(fn(st)).then(r => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
  }));
}
const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function putPhoto(p) {
  const rec = { id: p.id || uid(), created: Date.now(), caption: '', tag: 'altele', ...p };
  await tx('readwrite', st => st.put(rec));
  urlCache.delete(rec.id);
  return rec;
}
export function getPhoto(id) { return tx('readonly', st => reqP(st.get(id))); }
export function allPhotos() { return tx('readonly', st => reqP(st.getAll())); }
export async function deletePhoto(id) {
  if (!id) return;
  await tx('readwrite', st => st.delete(id));
  const u = urlCache.get(id); if (u) URL.revokeObjectURL(u); urlCache.delete(id);
}
export function clearPhotos() { urlCache.forEach(u => URL.revokeObjectURL(u)); urlCache.clear(); return tx('readwrite', st => st.clear()); }

/* ---------- Cărți PDF ---------- */
export async function putPdf(p) {
  const rec = { id: p.id || uid(), created: Date.now(), ...p };
  await tx('readwrite', st => st.put(rec), PDFS);
  return rec;
}
export function getPdf(id) { return id ? tx('readonly', st => reqP(st.get(id)), PDFS) : Promise.resolve(null); }
export function allPdfs() { return tx('readonly', st => reqP(st.getAll()), PDFS); }
export function deletePdf(id) { return id ? tx('readwrite', st => st.delete(id), PDFS) : Promise.resolve(); }
export function clearPdfs() { return tx('readwrite', st => st.clear(), PDFS); }

/** Cere browserului să nu șteargă datele când are nevoie de spațiu. */
export async function requestPersist() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* */ }
}
/** Spațiul folosit de aplicație, în MB (estimare). */
export async function storageUsedMB() {
  try { const e = await navigator.storage.estimate(); return { used: (e.usage || 0) / 1048576, quota: (e.quota || 0) / 1048576 }; } catch { return null; }
}

/* URL-uri obiect reutilizate, ca să nu recreăm blob-uri la fiecare randare */
const urlCache = new Map();
export async function photoURL(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const p = await getPhoto(id);
  if (!p || !p.blob) return null;
  const u = URL.createObjectURL(p.blob);
  urlCache.set(id, u);
  return u;
}

/** Completează toate <img data-photo="id"> dintr-un container. */
export function hydratePhotos(root) {
  root.querySelectorAll('img[data-photo]').forEach(async img => {
    const u = await photoURL(img.dataset.photo);
    if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'muted small', textContent: '(poză lipsă)' }));
  });
}

/**
 * Comprimă o imagine: max 1280 px pe latura lungă, JPEG ~0.78.
 * Returnează un Blob.
 */
export async function compressImage(file, maxSide = 1280, quality = 0.78) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    bmp = await new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }
  const w = bmp.width, h = bmp.height;
  const s = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', quality));
}

/** Blob → dataURL (pentru export JSON). */
export function blobToDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}
export async function dataURLToBlob(u) { return (await fetch(u)).blob(); }

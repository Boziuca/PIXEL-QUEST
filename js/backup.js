/* =========================================================
   backup.js – export și import al tuturor datelor în JSON
   (inclusiv pozele și, opțional, cărțile PDF, ca data-URL).
   ========================================================= */
import { state, replaceState, flush, VERSION } from './store.js';
import { allPhotos, clearPhotos, putPhoto, allPdfs, clearPdfs, putPdf, blobToDataURL, dataURLToBlob } from './db.js';
import { todayKey } from './util.js';

/** Mărimea totală a PDF-urilor salvate (bytes). */
export async function pdfsSize() { return (await allPdfs()).reduce((s, p) => s + (p.size || p.blob?.size || 0), 0); }

export async function exportJSON({ withPdfs = false } = {}) {
  flush();
  const photos = await allPhotos();
  const pdfs = withPdfs ? await allPdfs() : [];
  const pack = list => Promise.all(list.map(async p => ({ ...p, blob: undefined, data: p.blob ? await blobToDataURL(p.blob) : null })));
  const out = {
    app: 'pixelquest', version: VERSION, exported: new Date().toISOString(),
    state,
    photos: await pack(photos),
    ...(withPdfs ? { pdfs: await pack(pdfs) } : {}),
  };
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pixelquest-backup-${todayKey()}${withPdfs ? '-cu-pdf' : ''}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return { photos: photos.length, pdfs: pdfs.length, bytes: blob.size };
}

/** Citește și validează un fișier de backup. Aruncă o eroare dacă nu e valid. */
export async function readBackup(file) {
  const data = JSON.parse(await file.text());
  if (data?.app !== 'pixelquest' || typeof data.state !== 'object' || !data.state) throw new Error('Fișierul nu este un backup PixelQuest.');
  return data;
}

/**
 * Înlocuiește toate datele cu cele din backup.
 * PDF-urile: dacă backup-ul le conține, le înlocuiește; dacă nu, le păstrează pe cele de pe dispozitiv.
 */
export async function importBackup(data) {
  await clearPhotos();
  for (const p of data.photos || []) {
    if (!p?.id || !p.data) continue;
    const { data: d, ...rest } = p;
    await putPhoto({ ...rest, blob: await dataURLToBlob(d) });
  }
  if (Array.isArray(data.pdfs)) {
    await clearPdfs();
    for (const p of data.pdfs) {
      if (!p?.id || !p.data) continue;
      const { data: d, ...rest } = p;
      await putPdf({ ...rest, blob: await dataURLToBlob(d) });
    }
  }
  replaceState(data.state);
}

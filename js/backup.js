/* =========================================================
   backup.js – export și import al tuturor datelor în JSON
   (inclusiv pozele, codificate ca data-URL).
   ========================================================= */
import { state, replaceState, flush, VERSION } from './store.js';
import { allPhotos, clearPhotos, putPhoto, blobToDataURL, dataURLToBlob } from './db.js';
import { todayKey } from './util.js';

export async function exportJSON() {
  flush();
  const photos = await allPhotos();
  const out = {
    app: 'pixelquest', version: VERSION, exported: new Date().toISOString(),
    state,
    photos: await Promise.all(photos.map(async p => ({ ...p, blob: undefined, data: p.blob ? await blobToDataURL(p.blob) : null }))),
  };
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pixelquest-backup-${todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return { photos: photos.length, bytes: blob.size };
}

/** Citește și validează un fișier de backup. Aruncă o eroare dacă nu e valid. */
export async function readBackup(file) {
  const data = JSON.parse(await file.text());
  if (data?.app !== 'pixelquest' || typeof data.state !== 'object' || !data.state) throw new Error('Fișierul nu este un backup PixelQuest.');
  return data;
}

/** Înlocuiește toate datele cu cele din backup. */
export async function importBackup(data) {
  await clearPhotos();
  for (const p of data.photos || []) {
    if (!p?.id || !p.data) continue;
    const { data: d, ...rest } = p;
    await putPhoto({ ...rest, blob: await dataURLToBlob(d) });
  }
  replaceState(data.state);
}

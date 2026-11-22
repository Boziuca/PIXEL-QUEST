/* =========================================================
   photos.js – adăugarea unei poze (cameră / galerie), comprimată
   și salvată în IndexedDB, plus legarea ei de o zi.
   ========================================================= */
import { compressImage, putPhoto, deletePhoto } from './db.js';
import { state, day, save } from './store.js';
import { award, revoke } from './game.js';
import { pickImage, toast } from './ui.js';

/**
 * Cere o poză utilizatorului și o salvează.
 * @param {object} o { date, tag: 'masa'|'progres'|'coperta'|'altele', caption, camera }
 * @returns {Promise<object|null>} înregistrarea pozei
 */
export async function addPhoto({ date, tag = 'altele', caption = '', camera = false } = {}) {
  const file = await pickImage({ camera });
  if (!file) return null;
  try {
    const blob = await compressImage(file);
    const rec = await putPhoto({ blob, date, tag, caption });
    if (date) day(date).photos.push(rec.id);
    state.counters.photos = (state.counters.photos || 0) + 1;
    rec.xp = award('photos', 3, { reason: 'Amintire salvată', ic: 'camera' });
    save();
    return rec;
  } catch (e) {
    console.error(e);
    toast('Nu am putut salva poza', { icon: 'camera' });
    return null;
  }
}

/** Șterge o poză și o scoate din ziua de care era legată. */
export async function removePhoto(id, date) {
  if (!id) return;
  await deletePhoto(id);
  if (date && state.days[date]) state.days[date].photos = state.days[date].photos.filter(p => p !== id);
  else for (const d of Object.values(state.days)) d.photos = (d.photos || []).filter(p => p !== id);
  state.counters.photos = Math.max(0, (state.counters.photos || 0) - 1);
  revoke('photos', 3);
  save();
}

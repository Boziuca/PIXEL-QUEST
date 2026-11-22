/* =========================================================
   audio.js – efecte sonore chiptune generate cu Web Audio API.
   Nimic preluat din jocuri existente: doar unde pătrate/triunghi
   și arpegii simple compuse aici.
   ========================================================= */
import { state } from './store.js';

let ctx = null;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Cântă o notă: frecvență (Hz), start (s), durată (s), formă de undă. */
function note(freq, t0, dur, type = 'square', vol = 0.08) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  const t = a.currentTime + t0;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
const N = f => 440 * Math.pow(2, (f - 69) / 12); // MIDI → Hz

/** Secvență: [[notă MIDI, durată în pași]], pas = 0.07 s */
function seq(notes, step = 0.07, type = 'square', vol = 0.07) {
  let t = 0;
  for (const [n, d = 1] of notes) { if (n) note(N(n), t, step * d * 0.95, type, vol); t += step * d; }
}

const SFX = {
  click: () => note(N(84), 0, 0.03, 'square', 0.04),
  tick: () => seq([[76], [83]], 0.05),
  coin: () => seq([[83], [88, 3]], 0.06),
  xp: () => seq([[72], [76], [79]], 0.05, 'triangle', 0.1),
  habit: () => seq([[67], [72], [79, 2]], 0.055),
  quest: () => seq([[72], [76], [79], [84, 2], [0], [79], [84, 4]], 0.07),
  levelup: () => { seq([[60], [64], [67], [72], [67], [72], [76], [79, 2], [0], [84, 6]], 0.075); seq([[48, 4], [55, 4], [60, 8]], 0.075, 'triangle', 0.1); },
  unlock: () => { seq([[67], [71], [74], [79, 2], [74], [79], [83, 2], [86, 6]], 0.08); seq([[43, 4], [50, 4], [55, 8]], 0.08, 'triangle', 0.1); },
  record: () => seq([[72], [72], [79], [79], [84, 2], [0], [88, 4]], 0.06),
  victory: () => { seq([[67], [67], [67], [72, 3], [0], [71], [72], [76, 6]], 0.09); seq([[43, 3], [48, 3], [52, 3], [55, 6]], 0.09, 'triangle', 0.1); },
  rest: () => seq([[84], [0], [84], [0], [91, 4]], 0.09),
  error: () => seq([[52], [47, 2]], 0.08),
  delete: () => seq([[64], [60], [55]], 0.05, 'triangle', 0.1),
};

/** Redă un efect, dacă sunetul e activ. */
export function sfx(name) {
  if (!state.settings.sound) return;
  try { SFX[name]?.(); } catch { /* fără sunet */ }
}

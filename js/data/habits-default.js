/* Obiceiurile precompletate. Utilizatorul le poate modifica oricum.
   times: de câte ori pe zi; hour: ora preferată (0–23);
   freq: { type: 'daily' } | { type: 'days', days: [0..6] (L=0) } | { type: 'weekly', n } */
export const DEFAULT_HABITS = [
  { name: 'Făcut patul', icon: 'bed', times: 1, hour: 8, freq: { type: 'daily' }, key: 'bed' },
  { name: 'Spălat pe dinți', icon: 'tooth', times: 2, hour: 8, freq: { type: 'daily' }, key: 'teeth' },
  { name: 'Duș', icon: 'shower', times: 1, hour: 8, freq: { type: 'daily' }, key: 'shower' },
  { name: 'Vitamine', icon: 'pill', times: 1, hour: 9, freq: { type: 'daily' }, key: 'vitamins' },
  { name: 'Skincare', icon: 'drop', times: 1, hour: 21, freq: { type: 'daily' }, key: 'skincare' },
  { name: 'Plimbare', icon: 'shoe', times: 1, hour: 13, freq: { type: 'daily' }, key: 'walk' },
  { name: 'Meditație', icon: 'lotus', times: 1, hour: 20, freq: { type: 'daily' }, key: 'meditate' },
  { name: 'Curățenie', icon: 'broom', times: 1, hour: 17, freq: { type: 'weekly', n: 2 }, key: 'clean' },
  { name: 'Somn la timp', icon: 'moon', times: 1, hour: 23, freq: { type: 'daily' }, key: 'sleep' },
];

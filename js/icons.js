/* =========================================================
   icons.js – iconițe pixel-art originale (10×10), desenate în cod.
   Folosire: icon('drop') → șir SVG.  <span data-icon="drop"> se
   completează automat cu hydrateIcons(root).
   ========================================================= */
import { gridSVG } from './pixel.js';

/* Paleta comună a iconițelor */
const P = {
  k: '#0b0c15', w: '#f4f4f4', g: '#94b0c2', G: '#566c86', r: '#e04f5f', R: '#a33040',
  o: '#ef7d57', y: '#ffcd75', Y: '#c98f2e', l: '#a7f070', e: '#38b764', E: '#257179',
  b: '#41a6f6', B: '#3b5dc9', c: '#73eff7', p: '#b55dc9', P: '#6a3c8f', n: '#8b6d4c',
  N: '#5d4037', s: '#f2c6a0', z: '#ff9bd0',
};

export const ICONS = {
  coin: ['...kkkk...', '..kyyyyk..', '.kyywyyYk.', '.kywyyyYk.', '.kyyyyyYk.', '.kyyyyyYk.', '.kyyyyYYk.', '..kYYYYk..', '...kkkk...', '..........'],
  heart: ['..........', '.kkk..kkk.', 'krwrkkrrrk', 'krrrrrrrrk', 'krrrrrrrRk', '.krrrrrRk.', '..krrrRk..', '...krRk...', '....kk....', '..........'],
  flame: ['....k.....', '...kok....', '...kyok...', '..kyyok.k.', '.kyywyokok', '.kywwyyok.', 'kyywwwyyok', 'kyywwwyok.', '.kyyyyyok.', '..kkkkkk..'],
  star: ['....kk....', '...kyyk...', 'kkkkyykkkk', 'kyyyyyyyYk', '.kyyyyyYk.', '..kyyyyYk.', '.kyyykkyYk', '.kyykk.kYk', '.kkk....kk', '..........'],
  drop: ['....kk....', '...kbbk...', '...kbbk...', '..kbbbbk..', '.kbwbbbbk.', '.kbwbbbBk.', '.kbbbbbBk.', '.kbbbbBBk.', '..kBBBBk..', '...kkkk...'],
  shoe: ['..........', '..kkk.....', '.kbbbk....', '.kbwbk....', '.kbbbbkk..', '.kbbwbbbk.', 'kbbbbbbbbk', 'kwwwwwwwwk', '.kkkkkkkk.', '..........'],
  apple: ['.....kk...', '....kek...', '..kk.kkk..', '.krrkrrrk.', 'krwrrrrrrk', 'krwrrrrrRk', 'krrrrrrrRk', '.krrrrrRk.', '..krRkRk..', '...k..k...'],
  scale: ['..........', '.kkkkkkkk.', 'kggggggggk', 'kgkkkkkkgk', 'kgkwwrwkgk', 'kgkwwkwkgk', 'kgkkkkkkgk', 'kggggggggk', 'kGGGGGGGGk', '.kkkkkkkk.'],
  book: ['.kkkkkkkk.', 'kBbbbbbbbk', 'kBbyyyybbk', 'kBbbbbbbbk', 'kBbyyybbbk', 'kBbbbbbbbk', 'kBbbbbbbbk', 'kBwwwwwwwk', '.kkkkkkkk.', '..........'],
  camera: ['..........', '...kkkk...', '.kkggggkk.', 'kGGGGGGGGk', 'kGGkkkkGrk', 'kGkbcbBkGk', 'kGkbbBBkGk', 'kGGkkkkGGk', '.kkkkkkkk.', '..........'],
  scroll: ['.kkkkkkk..', 'kwwwwwwwk.', '.kwggggwk.', '.kwwwwwwk.', '.kwggggwk.', '.kwwwwwwk.', '.kwgggwwk.', '.kwwwwwwwk', '..kkkkkkkk', '..........'],
  quill: ['........kk', '.......kwk', '......kwgk', '.....kwgk.', '....kwgk..', '...kwgk...', '..kngk....', '..knk.....', '.kk.......', 'k.........'],
  dumbbell: ['..........', '.kk....kk.', 'kggk..kggk', 'kggkkkkggk', 'kgggggggGk', 'kgGkkkkGGk', 'kGGk..kGGk', '.kk....kk.', '..........', '..........'],
  bed: ['..........', 'kk........', 'knk.......', 'knwwkkkkkk', 'knwwkrrrrk', 'knkkkrrrrk', 'knnnnnnnnk', 'knNNNNNNNk', 'kk......kk', '..........'],
  tooth: ['..........', '.kkk.kkk..', 'kwwwkwwwk.', 'kwwwwwwgk.', 'kwwwwwwgk.', '.kwwwwgk..', '.kwwkwgk..', '.kwk.kgk..', '..k...k...', '..........'],
  shower: ['...kkk....', '..kGGGk...', '.kggggGk..', 'kkkkkkkkk.', '..........', '.b..b..b..', '..b..b..b.', '.b..b..b..', '..b..b..b.', '..........'],
  pill: ['..........', '.....kkk..', '....krrrk.', '...krrrRk.', '..kwkrRk..', '.kwwwkk...', '.kwwwgk...', '.kwwgk....', '..kkk.....', '..........'],
  lotus: ['..........', '....kk....', '...kzzk...', '.k.kzzk.k.', 'kzkzzzzkzk', 'kzzkzzkzzk', '.kzzzzzzk.', '..kkkkkk..', '.keeeeeek.', '..kkkkkk..'],
  broom: ['.......kk.', '......knk.', '.....knk..', '....knk...', '...knk....', '..kyyk....', '.kyyyyk...', 'kyYyYyk...', 'kYyYyk....', '.kkkk.....'],
  moon: ['...kkkk...', '..kyyyyk..', '.kyyykk...', '.kyyk.....', '.kyyk.....', '.kyyk.....', '.kyyykk...', '..kyyyyk..', '...kkkk...', '..........'],
  sun: ['....y.....', '.y.kkk.y..', '..kyyyk...', '.kyywyyk..', 'ykyyyyykyy', '.kyyyyyk..', '..kyyyk...', '.y.kkk.y..', '....y.....', '..........'],
  sunrise: ['..........', '....y.....', '.y.....y..', '...kkk....', '..kyyyk...', '.kyywyyk..', 'oooooooooo', 'kkkkkkkkkk', '.b.b.b.b..', '..........'],
  check: ['..........', '........kk', '.......kek', 'kk....keek', 'kek..keek.', 'keekkeek..', '.keeeek...', '..keek....', '...kk.....', '..........'],
  lock: ['...kkkk...', '..kGGGGk..', '.kGk..kGk.', '.kGk..kGk.', 'kkkkkkkkkk', 'kyyyyyyyYk', 'kyyykkyyYk', 'kyyykkyyYk', 'kYYYYYYYYk', 'kkkkkkkkkk'],
  trophy: ['.kkkkkkkk.', 'kkyywyyYkk', 'kykyyyyYky', 'kkkyyyyYkk', '...kyyYk..', '....kYk...', '....kYk...', '...kyyYk..', '..kkkkkkk.', '..........'],
  plus: ['..........', '...kkkk...', '...kwwk...', '.kkkwwkkk.', '.kwwwwwwk.', '.kwwwwwwk.', '.kkkwwkkk.', '...kwwk...', '...kkkk...', '..........'],
  trash: ['...kkkk...', 'kkkkkkkkkk', 'kggggggggk', '.kgGgGgGk.', '.kgGgGgGk.', '.kgGgGgGk.', '.kgGgGgGk.', '.kggggggk.', '..kkkkkk..', '..........'],
  back: ['..........', '...kk.....', '..kwk.....', '.kwwkkkkk.', 'kwwwwwwwwk', '.kwwkkkkk.', '..kwk.....', '...kk.....', '..........', '..........'],
  chest: ['..........', '.kkkkkkkk.', 'knnnnnnnnk', 'kyyyyyyyyk', 'knnnkknnnk', 'knnnyynnnk', 'knnnnnnnnk', 'kNNNNNNNNk', '.kkkkkkkk.', '..........'],
  soundOn: ['..........', '....k...k.', '...kk.k..k', 'kkkgk..k.k', 'kgggk..k.k', 'kgggk..k.k', 'kkkgk..k.k', '...kk.k..k', '....k...k.', '..........'],
  soundOff: ['..........', '....k.....', '...kk.....', 'kkkgk.r..r', 'kgggk..rr.', 'kgggk..rr.', 'kkkgk.r..r', '...kk.....', '....k.....', '..........'],
  map: ['kkkkkkkkkk', 'knyyknyyyk', 'kyeyykyeyk', 'kyyrykyyyk', 'kyyykyyeyk', 'kyeykyryyk', 'kyyykyyyyk', 'kyyykyyyyk', 'knyykyyynk', 'kkkkkkkkkk'],
  sword: ['........kk', '.......kwk', '......kwgk', '.....kwgk.', '.k..kwgk..', '.kkkwgk...', '..kyyk....', '.kyNkk....', 'kyNk.k....', 'kkk.......'],
  calendar: ['.kk....kk.', 'kkkkkkkkkk', 'krrrrrrrrk', 'kkkkkkkkkk', 'kwwwwwwwwk', 'kwkwkwkwwk', 'kwwwwwwwwk', 'kwkwkwkrwk', 'kwwwwwwwwk', 'kkkkkkkkkk'],
  chart: ['k.........', 'k.......kk', 'k.......kb', 'k....kk.kb', 'k....ke.kb', 'k.kk.ke.kb', 'k.kr.ke.kb', 'k.kr.ke.kb', 'kkkkkkkkkk', '..........'],
  gear: ['...kkkk...', '.kkggggkk.', '.kgggggGk.', 'kggkkkkgGk', 'kggk..kgGk', 'kggk..kgGk', 'kggkkkkgGk', '.kgggggGk.', '.kkGGGGkk.', '...kkkk...'],
  leaf: ['........kk', '.....kkkek', '...kkeeelk', '..keeeelek', '.keeeelek.', '.keeelek..', '.keelek...', '.kelkk....', '.kkk......', 'k.........'],
  music: ['...kkkkkk.', '...kbbbbk.', '...kk..kk.', '...k....k.', '...k....k.', '.kkk..kkk.', 'kbbk.kbbk.', 'kbbk.kbbk.', '.kk...kk..', '..........'],
  bolt: ['.....kkk..', '....kyyk..', '...kyyk...', '..kyyykkk.', '.kkkkyyyk.', '....kyyk..', '...kyyk...', '..kyk.....', '..kk......', '..........'],
  potion: ['...kkkk...', '...kwwk...', '....kk....', '...kggk...', '..kgccgk..', '.kcbbbbck.', '.kbbwbbbk.', '.kbbbbbBk.', '..kBBBBk..', '...kkkk...'],
  shield: ['kkkkkkkkkk', 'kbbbbyyyyk', 'kbbbbyyyYk', 'kbbbbyyyYk', 'kyyyybbbBk', '.kyyybbBk.', '.kyyybbBk.', '..kyyBBk..', '...kkkk...', '..........'],
  clock: ['..kkkkkk..', '.kwwwwwwk.', 'kwwwkwwwwk', 'kwwwkwwwwk', 'kwwwkkkwwk', 'kwwwwwwwwk', 'kwwwwwwwgk', '.kwwwwwgk.', '..kkkkkk..', '..........'],
  water: ['..........', '.kkkkkkkk.', '.kwcccccwk', '.kwbbbbbk.', '.kbbbbbbk.', '..kbbbbk..', '..kbbbbk..', '..kbbbbk..', '...kkkk...', '..........'],
  eye: ['..........', '..........', '..kkkkkk..', '.kwwkkwwk.', 'kwwkbbkwwk', 'kwwkbbkwwk', '.kwwkkwwk.', '..kkkkkk..', '..........', '..........'],
  upload: ['....kk....', '...kwwk...', '..kwwwwk..', '.kkkwwkkk.', '...kwwk...', '...kwwk...', 'k..kkkk..k', 'kk......kk', 'kkkkkkkkkk', '..........'],
  download: ['...kkkk...', '...kwwk...', '...kwwk...', '.kkkwwkkk.', '..kwwwwk..', '...kwwk...', 'k...kk...k', 'kk......kk', 'kkkkkkkkkk', '..........'],
  phone: ['..kkkkkk..', '..kGGGGk..', '..kbbbbk..', '..kbccbk..', '..kbbbbk..', '..kbbbbk..', '..kGGGGk..', '..kGkkGk..', '..kkkkkk..', '..........'],
  plate: ['..........', '..kkkkkk..', '.kwwwwwwk.', 'kwgggggwwk', 'kwgeorgwwk', 'kwggoggwwk', 'kwwgggwwgk', '.kwwwwwgk.', '..kkkkkk..', '..........'],
  hero: ['...kkkk...', '..kNNNNk..', '..ksssskk.', '..kskskk..', '..kssssk..', '.kkbbbbkk.', 'ksbbbbbbsk', 'kkbbyybbkk', '..kbkkbk..', '..kk..kk..'],
};

/** Returnează SVG-ul unei iconițe. */
export function icon(name, cls = '') {
  const g = ICONS[name] || ICONS.star;
  return gridSVG(g, P, cls);
}

/** Completează toate elementele [data-icon] dintr-un container. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    if (el.dataset.iconDone === el.dataset.icon) return;
    el.innerHTML = icon(el.dataset.icon);
    el.dataset.iconDone = el.dataset.icon;
  });
}

/** Iconițe ce pot fi alese pentru obiceiuri. */
export const HABIT_ICONS = ['bed', 'tooth', 'shower', 'pill', 'drop', 'shoe', 'lotus', 'broom', 'moon', 'sun', 'sunrise', 'book', 'apple', 'dumbbell', 'heart', 'leaf', 'music', 'quill', 'water', 'phone', 'potion', 'star', 'clock', 'eye', 'bolt', 'plate'];

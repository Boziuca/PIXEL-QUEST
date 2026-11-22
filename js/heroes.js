/* =========================================================
   heroes.js – cei 8 eroi originali, desenați în cod (SVG pixel-art).
   Pânză de 24×24 pixeli. Corpul (16×20) stă la poziția (4,4).
   Fiecare erou are 3 forme (niv. 1, 10, 25) cu echipament tot mai bun.
   ========================================================= */
import { blankMatrix, stamp, rectsFromMatrix } from './pixel.js';

export const FORM_LEVELS = [1, 10, 25];
export function formIndex(level) { return level >= 25 ? 2 : level >= 10 ? 1 : 0; }

/* ---------- Șabloane de corp ---------- */
const HUMAN = [
  '................',
  '................',
  '.....kkkkkk.....',
  '....kSSSSSSk....',
  '...kSSSSSSSSk...',
  '...kSSSSSSSSk...',
  '...kSSSSSSSSk...',
  '...kSSSSSSSsk...',
  '....kSSSSSsk....',
  '.....kkSskk.....',
  '...kkOOOOOOkk...',
  '..kOOOOAAOOOOk..',
  '.kSkOOOAAOOOkSk.',
  '.kSkOOOOOOOokSk.',
  '.kSkOOOOOOOokSk.',
  '.kskAAAAAAAAksk.',
  '..kkPPPPPPPPkk..',
  '...kPPPkkPPPk...',
  '...kBBBkkBBBk...',
  '...kkkkkkkkkk...',
];
const HUMAN_EYES = [[10, 9], [10, 10], [13, 9], [13, 10]];

const CAT = [
  '................',
  '................',
  '..kk........kk..',
  '..kFk......kFk..',
  '..kFFkkkkkkFFk..',
  '..kFFFFFFFFFFk..',
  '.kFFFFFFFFFFFFk.',
  '.kFFFFFFFFFFFFk.',
  '.kFFFFFFFFFFFFk.',
  '.kFFFFFzzFFFFFk.',
  '..kFFFFFFFFFFk..',
  '...kkFFFFFFkk...',
  '...kFFffffFFk...',
  '..kFFffffffFFk..',
  '..kFFffffffFFk..',
  '..kFFffffffFFkk.',
  '..kFFFffffFFFkFk',
  '..kFkFFFFFFkFkFk',
  '..kffkkkkkkffkk.',
  '...kk......kk...',
];
const CAT_EYES = [[9, 11], [9, 12], [14, 11], [14, 12]];

/* ---------- Coafuri (suprapuse peste cap, rândurile 0–11 ale corpului) ---------- */
const HAIR = {
  short: ['................', '.....kkkkkk.....', '....kHHHHHHk....', '...kHHHHHHHHk...', '...kHhSSSShHk...', '...kh......hk...'],
  long: ['................', '.....kkkkkk.....', '....kHHHHHHk....', '...kHHHHHHHHk...', '..kHHHHHHHHHHk..', '..kHh......hHk..', '..kHh......hHk..', '..kHh......hHk..', '..kHHk....kHHk..', '..kHHk....kHHk..', '..kHk......kHk..', '..kk........kk..'],
  spiky: ['....k.k..k.k....', '...kHkHkkHkHk...', '...kHHHHHHHHk...', '..kHHHHHHHHHHk..', '...kHhHHHHhHk...', '...kh......hk...'],
  bun: ['......kkkk......', '.....kHHHHk.....', '....kkHHHHkk....', '...kHHHHHHHHk...', '...kHHHHHHHHk...', '...kh......hk...', '...kh......hk...', '...kh......hk...', '....k......k....'],
  band: ['................', '................', '.....kkkkkk.....', '....kAAAAAAkAA..', '....kSSSSSSk.A..'],
  hood: ['................', '.....kkkkkk.....', '....kHHHHHHk....', '...kHHHHHHHHkAA.', '...kHHHHHHHHk.A.', '...kH......Hk...', '...kH......Hk...', '...kHhhhhhhHk...', '....kHhhhhHk....'],
  beard: ['................', '.....kkkkkk.....', '....kHHHHHHk....', '...kHHHHHHHHk...', '...kHSSSSSSHk...', '...k........k...', '...k........k...', '...kH.hhhh.Hk...', '....kHHHHHHk....', '.....kHHHHk.....'],
};

/* ---------- Obiecte și echipament (coordonate pe pânza 24×24) ---------- */
const ITEMS = {
  sword: { at: [18, 5], g: ['.k.', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'xxx', 'khk', 'khk', '.k.'] },
  bigsword: { at: [18, 1], g: ['.k.', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'kbk', 'xxx', 'khk', 'khk', 'kxk'] },
  shield: { at: [0, 13], g: ['kkkkkk', 'kbbbbk', 'kbxxbk', 'kbxxbk', 'kbbbbk', '.kbbk.', '..kk..'] },
  crown: { at: [7, 2], g: ['k.k.kk.k.k', 'kykkyykkyk', 'kyyyryyyyk', 'kkkkkkkkkk'] },
  plume: { at: [11, 0], g: ['.kk', 'krk', 'krk', '.k.'] },
  wizhat: { at: [6, 0], g: ['......kk....', '.....kHHk...', '.....kHHk...', '....kHHHHk..', '....kHyHHk..', '...kHHHHHHk.', '.kkkkkkkkkkk', 'kHHHHHHHHHHk', '.kkkkkkkkkk.'] },
  staff: { at: [18, 3], g: ['kkk', 'kck', 'kbk', 'kkk', '.n.', '.n.', '.n.', '.n.', '.n.', '.n.', '.n.', '.n.', '.n.', '.n.', '.n.', '.k.'] },
  orbstaff: { at: [17, 1], g: ['.kkk.', 'kcwck', 'kccbk', 'kbbBk', '.kkk.', '..x..', '..n..', '..n..', '..n..', '..n..', '..n..', '..n..', '..n..', '..n..', '..n..', '..n..', '..n..', '..k..'] },
  chefhat: { at: [7, 0], g: ['..kkkkkk..', '.kwwwwwwk.', 'kwwwwwwwwk', 'kwwwwwwwgk', '.kwwwwwgk.', '.kkkkkkkk.'] },
  chefhat2: { at: [7, 0], g: ['..kkkkkk..', '.kwwwwwwk.', 'kwwwwwwwwk', 'kwwwwwwwgk', '.kyyyyyyk.', '.kkkkkkkk.'] },
  bandana: { at: [8, 5], g: ['kkkkkkkk', 'krrwrrrk'] },
  ladle: { at: [18, 7], g: ['kkk', 'kgk', 'kgk', 'kkk', '.n.', '.n.', '.n.', '.n.', '.n.', '.N.', '.k.'] },
  pan: { at: [17, 7], g: ['.kkk.', 'kGGGk', 'kGgGk', 'kGGGk', '.kkk.', '..n..', '..n..', '..n..', '..N..', '..k..'] },
  book: { at: [1, 15], g: ['kkkkk', 'kBwwk', 'kBwwk', 'kBwwk', 'kkkkk'] },
  tome: { at: [0, 14], g: ['kkkkkk', 'kPyyPk', 'kPwwPk', 'kPwwPk', 'kPyyPk', 'kkkkkk'] },
  floatbook: { at: [18, 2], g: ['kkkkk', 'kwkwk', 'kwkwk', 'kkkkk'], fx: true },
  laurel: { at: [6, 4], g: ['ke........ek', '.ke......ek.'] },
  glasses: { at: [9, 9], g: ['kkk.kk', 'k.kkk.'] },
  hammer: { at: [17, 6], g: ['kkkkk', 'kgggk', 'kgGgk', 'kkkkk', '..n..', '..n..', '..n..', '..n..', '..n..', '..n..', '..n..', '..k..'] },
  bighammer: { at: [16, 3], g: ['kkkkkkk', 'kyyyyyk', 'kyYYYyk', 'kyyyyyk', 'kkkkkkk', '...n...', '...n...', '...n...', '...n...', '...n...', '...n...', '...n...', '...n...', '...n...', '...k...'] },
  belt: { at: [7, 19], g: ['yyyyyyyyyy'] },
  kunai: { at: [18, 11], g: ['.k.', 'kwk', 'kgk', 'kkk', '.n.', '.n.', '.k.'] },
  katana: { at: [19, 1], g: ['.k', 'kw', 'kw', 'kw', 'kw', 'kw', 'kw', 'kw', 'kw', 'kw', 'kw', 'kw', 'kk', 'kx', 'kx', 'kk'] },
  shuriken: { at: [1, 15], g: ['.k.k.', 'kgkgk', '.kwk.', 'kgkgk', '.k.k.'] },
  scarf: { at: [6, 13], g: ['krrrrrrrrrrk', '..........krrk', '...........krk'] },
  explorer: { at: [6, 3], g: ['...kkkkkk...', '..knnnnnnk..', '..kNNNNNNk..', 'kkknnnnnnkkk', 'knnnnnnnnnnk', 'kkkkkkkkkkkk'] },
  backpack: { at: [17, 13], g: ['kkk.', 'knnk', 'kNnk', 'knnk', 'kNNk', 'kkkk'], back: true },
  mapscroll: { at: [18, 15], g: ['kkk', 'kyk', 'kyk', 'kyk', 'kkk'] },
  compass: { at: [1, 15], g: ['.kkk.', 'kyryk', 'kywyk', 'kyyyk', '.kkk.'] },
  collar: { at: [9, 15], g: ['rrrrrr', '..yy..'] },
  catsword: { at: [17, 10], g: ['.k.', 'kwk', 'kwk', 'kwk', 'kwk', 'xxx', '.h.'] },
};

/* Capă (desenată în spatele corpului) */
const CAPE = ['...kCCCCCCCCk...', '..kCCCCCCCCCCk..', '..kCCCCCCCCCCk..', '.kCCCCCCCCCCCCk.', '.kCCCCCCCCCCCCk.', 'kCCCCCCCCCCCCCCk', 'kCCCCCCCCCCCCCCk', 'kcCcCcCcCcCcCcCk', 'kkkkkkkkkkkkkkkk'];

/* Culori de bază pentru obiecte */
const BASE_PAL = { k: '#0b0c15', w: '#f4f4f4', g: '#94b0c2', G: '#566c86', y: '#ffcd75', Y: '#c98f2e', r: '#e04f5f', n: '#8b6d4c', N: '#5d4037', c: '#73eff7', b: '#94b0c2', B: '#3b5dc9', P: '#6a3c8f', e: '#38b764', x: '#c98f2e', h: '#5d4037' };

/* ---------- Definițiile eroilor ---------- */
export const HEROES = [
  {
    id: 'kael', name: 'Kael', title: 'Cavalerul',
    story: 'Un scutier din satul Vânturilor, care a jurat să străbată fiecare drum din regat. Pas cu pas.',
    spec: { cat: 'steps', mult: 1.5, label: '+50% XP la pași' },
    anims: { levelUp: 'jump', quest: 'shake' },
    kind: 'human', hair: 'short',
    pal: { S: '#f2c6a0', s: '#d39b7a', H: '#8b4f2e', h: '#5d3420', O: '#41a6f6', o: '#3b5dc9', A: '#94b0c2', P: '#566c86', B: '#5d4037', E: '#1a1c2c' },
    forms: [
      { items: [['sword', { b: '#c9a26b', x: '#8b6d4c' }]] },
      { pal: { A: '#ffcd75', O: '#3b8bf0' }, items: [['sword', { b: '#f4f4f4' }], ['shield', { b: '#3b5dc9', x: '#ffcd75' }]] },
      { pal: { A: '#ffcd75', O: '#f4f4f4', o: '#94b0c2' }, cape: '#e04f5f', aura: '#ffcd75', items: [['bigsword', { b: '#73eff7', x: '#ffcd75' }], ['shield', { b: '#ffcd75', x: '#e04f5f' }], ['plume', {}]] },
    ],
  },
  {
    id: 'mira', name: 'Mira', title: 'Vrăjitoarea apelor',
    story: 'Păzitoarea izvoarelor ascunse. Spune că orice vrajă începe cu un pahar de apă rece.',
    spec: { cat: 'water', mult: 1.5, label: '+50% XP la apă' },
    anims: { levelUp: 'float', quest: 'spin' },
    kind: 'human', hair: 'long',
    pal: { S: '#f7d9c4', s: '#d9a98d', H: '#73eff7', h: '#41a6f6', O: '#3b5dc9', o: '#29366f', A: '#73eff7', P: '#29366f', B: '#29366f', E: '#1a1c2c' },
    forms: [
      { items: [['staff', { c: '#73eff7', b: '#41a6f6' }]] },
      { items: [['wizhat', { H: '#3b5dc9' }], ['staff', { c: '#f4f4f4', b: '#73eff7' }]] },
      { pal: { O: '#257179', o: '#1a4a5a', A: '#ffcd75' }, cape: '#41a6f6', aura: '#73eff7', items: [['wizhat', { H: '#257179', y: '#ffcd75' }], ['orbstaff', { x: '#ffcd75' }]] },
    ],
  },
  {
    id: 'bruno', name: 'Bruno', title: 'Bucătarul-războinic',
    story: 'Fost bucătar al unei taverne de la răscruce. Crede că o masă bună câștigă mai multe bătălii decât o sabie.',
    spec: { cat: 'food', mult: 1.5, label: '+50% XP la nutriție' },
    anims: { levelUp: 'grow', quest: 'jump' },
    kind: 'human', hair: 'beard',
    pal: { S: '#e8b48a', s: '#c28866', H: '#3b2a20', h: '#5d4037', O: '#f4f4f4', o: '#c2c3c7', A: '#e04f5f', P: '#566c86', B: '#3b2a20', E: '#1a1c2c' },
    forms: [
      { items: [['bandana', {}], ['ladle', {}]] },
      { items: [['chefhat', {}], ['pan', {}]] },
      { pal: { A: '#ffcd75' }, cape: '#e04f5f', aura: '#ef7d57', items: [['chefhat2', {}], ['pan', { G: '#c98f2e', g: '#ffcd75' }]] },
    ],
  },
  {
    id: 'sora', name: 'Sora', title: 'Bibliotecara',
    story: 'Ține inventarul celei mai mari biblioteci din regat și a citit fiecare carte de pe raftul de jos. Încă.',
    spec: { cat: 'books', mult: 1.5, label: '+50% XP la cărți și pagini' },
    anims: { levelUp: 'float', quest: 'flip' },
    kind: 'human', hair: 'bun',
    pal: { S: '#f2c6a0', s: '#d39b7a', H: '#6a3c8f', h: '#4a2766', O: '#38b764', o: '#257179', A: '#ffcd75', P: '#257179', B: '#3b2a20', E: '#1a1c2c' },
    forms: [
      { items: [['book', { B: '#e04f5f' }]] },
      { items: [['glasses', {}], ['tome', {}]] },
      { pal: { O: '#6a3c8f', o: '#4a2766' }, cape: '#38b764', aura: '#b55dc9', items: [['glasses', {}], ['tome', { P: '#ffcd75', y: '#e04f5f' }], ['floatbook', {}], ['laurel', {}]] },
    ],
    unlock: { achievement: 'first_book', coins: 300, hint: 'Termină prima carte sau plătește 300 de monede' },
  },
  {
    id: 'titan', name: 'Titan', title: 'Gladiatorul',
    story: 'Campion al arenei de nisip. Își măsoară zilele în repetări și nu sare niciodată peste ziua de picioare.',
    spec: { cat: 'weight', mult: 1.5, label: '+50% XP la greutate și sală' },
    anims: { levelUp: 'grow', quest: 'shake' },
    kind: 'human', hair: 'band',
    pal: { S: '#c68a5e', s: '#9a6643', H: '#1a1c2c', h: '#1a1c2c', O: '#b13e53', o: '#7a2838', A: '#e04f5f', P: '#5d4037', B: '#3b2a20', E: '#1a1c2c' },
    forms: [
      { items: [['hammer', {}]] },
      { pal: { A: '#ffcd75' }, items: [['hammer', { g: '#c2c3c7' }], ['belt', {}]] },
      { pal: { A: '#ffcd75', O: '#ffcd75', o: '#c98f2e' }, cape: '#b13e53', aura: '#e04f5f', items: [['bighammer', {}], ['belt', {}], ['crown', {}]] },
    ],
    unlock: { level: 5, coins: 400, hint: 'Ajungi la nivelul 5 sau plătești 400 de monede' },
  },
  {
    id: 'nyx', name: 'Nyx', title: 'Ninja',
    story: 'Nimeni nu l-a văzut terminându-și sarcinile. Le găsești pur și simplu bifate, dimineața.',
    spec: { cat: 'tasks', mult: 1.5, label: '+50% XP la sarcini îndeplinite' },
    anims: { levelUp: 'dash', quest: 'flip' },
    kind: 'human', hair: 'hood',
    pal: { S: '#e8b48a', s: '#c28866', H: '#29243a', h: '#3d3554', O: '#29243a', o: '#1a1626', A: '#b55dc9', P: '#29243a', B: '#1a1626', E: '#f4f4f4' },
    forms: [
      { items: [['kunai', {}]] },
      { items: [['katana', { x: '#b55dc9' }], ['shuriken', {}]] },
      { pal: { A: '#e04f5f' }, aura: '#b55dc9', items: [['scarf', {}], ['katana', { x: '#ffcd75', w: '#73eff7' }], ['shuriken', { g: '#ffcd75' }]] },
    ],
    unlock: { achievement: 'tasks_10', coins: 450, hint: 'Îndeplinește 10 sarcini sau plătește 450 de monede' },
  },
  {
    id: 'pip', name: 'Pip', title: 'Exploratorul',
    story: 'Are o hartă pentru fiecare zi și un rucsac pentru fiecare hartă. Nu se pricepe la nimic anume, dar la toate puțin.',
    spec: { cat: 'all', mult: 1.15, label: '+15% XP la toate' },
    anims: { levelUp: 'jump', quest: 'spin' },
    kind: 'human', hair: 'spiky',
    pal: { S: '#f2c6a0', s: '#d39b7a', H: '#ef7d57', h: '#b8532f', O: '#a7f070', o: '#38b764', A: '#8b6d4c', P: '#8b6d4c', B: '#5d4037', E: '#1a1c2c' },
    forms: [
      { items: [['backpack', {}], ['mapscroll', {}]] },
      { items: [['backpack', {}], ['explorer', {}], ['mapscroll', {}], ['compass', {}]] },
      { pal: { O: '#257179', o: '#1a4a5a', A: '#ffcd75' }, cape: '#ef7d57', aura: '#a7f070', items: [['backpack', { n: '#ffcd75', N: '#c98f2e' }], ['explorer', { n: '#c98f2e', N: '#8b6d4c' }], ['compass', {}], ['mapscroll', {}]] },
    ],
  },
  {
    id: 'luna', name: 'Luna', title: 'Pisica-aventurier',
    story: 'A apărut într-o noapte cu lună plină și a refuzat să plece. Revine în fiecare zi, fără excepție.',
    spec: { cat: 'streak', mult: 2, label: 'XP dublu din serii (streak)' },
    anims: { levelUp: 'pounce', quest: 'flip' },
    kind: 'cat',
    pal: { F: '#8f93b8', f: '#e6e3f2', z: '#ff9bd0', E: '#a7f070' },
    forms: [
      { items: [['collar', {}]] },
      { cape: '#3b5dc9', items: [['collar', {}], ['catsword', {}]] },
      { pal: { F: '#c2c3d9' }, cape: '#6a3c8f', aura: '#ffcd75', items: [['collar', { r: '#ffcd75', y: '#e04f5f' }], ['catsword', { x: '#ffcd75', w: '#73eff7' }], ['crown', {}]] },
    ],
    unlock: { achievement: 'streak_7', coins: 600, hint: 'Atinge o serie de 7 zile sau plătește 600 de monede' },
  },
];

export function heroById(id) { return HEROES.find(h => h.id === id) || HEROES[0]; }

/* ---------- Cosmetice din magazin (suprapuse peste erou) ---------- */
export const COSMETIC_ITEMS = {
  hat_crown: { slot: 'hat', item: 'crown', pal: {} },
  hat_party: { slot: 'hat', grid: { at: [9, 0], g: ['...k...', '..kyk..', '..krk..', '.kbyrk.', '.kyrbk.', 'kbyrbyk', 'kkkkkkk'] } },
  hat_flower: { slot: 'hat', grid: { at: [13, 4], g: ['.k.', 'kzk', '.k.'] }, pal: { z: '#ff9bd0' } },
  hat_wizard: { slot: 'hat', item: 'wizhat', pal: { H: '#b55dc9' } },
  hat_helm: { slot: 'hat', grid: { at: [7, 3], g: ['..kkkkkk..', '.kggggggk.', 'kggwggggGk', 'kgggggggGk', 'kkkkkkkkkk'] } },
};
export const COSMETIC_CAPES = { cape_red: '#e04f5f', cape_blue: '#3b5dc9', cape_purple: '#6a3c8f', cape_gold: '#ffcd75', cape_green: '#38b764' };
export const COSMETIC_AURAS = { aura_gold: '#ffcd75', aura_blue: '#73eff7', aura_pink: '#ff9bd0', aura_fire: '#ef7d57' };
const PETS = {
  pet_slime: { at: [0, 19], g: ['..kkk..', '.kllk..', 'klwlllk', 'kllllek', '.kkkkk.'], pal: { l: '#a7f070', e: '#38b764' } },
  pet_bird: { at: [0, 2], g: ['.kk...', 'kyyk..', 'kykyyk', '.kyyk.', '..oo..'], pal: { o: '#ef7d57' } },
  pet_ghost: { at: [0, 16], g: ['.kkkk.', 'kwwwwk', 'kwkwkk', 'kwwwwk', 'kwkwkw'] },
};

/**
 * Generează SVG-ul eroului.
 * @param {string} id      id erou
 * @param {number} level   nivelul jucătorului (alege forma)
 * @param {object} opt     { form, equipped: {hat, cape, aura, pet}, plain }
 */
export function heroSVG(id, level = 1, opt = {}) {
  const hero = heroById(id);
  const fi = opt.form ?? formIndex(level);
  const form = hero.forms[fi] || hero.forms[0];
  const eq = opt.plain ? {} : (opt.equipped || {});
  const pal = { ...BASE_PAL, ...hero.pal, ...(form.pal || {}) };
  const W = 24, H = 24;
  const m = blankMatrix(W, H);

  // 1) Capă (din formă sau din magazin) – în spate
  const capeColor = COSMETIC_CAPES[eq.cape] || form.cape;
  if (capeColor) stamp(m, CAPE, { k: '#0b0c15', C: capeColor, c: shade(capeColor) }, 4, 14);

  // 2) Obiecte din spate (rucsac)
  const items = (form.items || []).map(([name, p]) => ({ ...ITEMS[name], pal: p }));
  items.filter(it => it.back).forEach(it => stamp(m, it.g, { ...pal, ...it.pal }, ...it.at));

  // 3) Corpul + coafura
  const body = hero.kind === 'cat' ? CAT : HUMAN;
  stamp(m, body, pal, 4, 4);
  if (hero.hair) stamp(m, HAIR[hero.hair], pal, 4, 4);

  // 4) Obiecte în față
  const fxMatrix = blankMatrix(W, H);
  items.filter(it => !it.back).forEach(it => stamp(it.fx ? fxMatrix : m, it.g, { ...pal, ...it.pal }, ...it.at));

  // 5) Pălărie din magazin
  const hat = COSMETIC_ITEMS[eq.hat];
  if (hat) {
    const def = hat.item ? ITEMS[hat.item] : hat.grid;
    stamp(m, def.g, { ...pal, ...(hat.pal || {}) }, ...def.at);
  }
  // 6) Animal de companie
  const pet = PETS[eq.pet];
  if (pet) stamp(m, pet.g, { ...BASE_PAL, ...(pet.pal || {}) }, ...pet.at);

  // 7) Ochii – strat separat, pentru clipit
  const eyes = blankMatrix(W, H);
  (hero.kind === 'cat' ? CAT_EYES : HUMAN_EYES).forEach(([x, y]) => { eyes[y][x] = pal.E; });

  // 8) Aură (pixeli în jurul eroului)
  const auraColor = COSMETIC_AURAS[eq.aura] || form.aura;
  let aura = '';
  if (auraColor) {
    const am = blankMatrix(W, H);
    for (let a = 0; a < 360; a += 20) {
      const x = Math.round(12 + Math.cos(a * Math.PI / 180) * 11), y = Math.round(13 + Math.sin(a * Math.PI / 180) * 10.5);
      if (x >= 0 && x < W && y >= 0 && y < H) am[y][x] = auraColor;
    }
    aura = `<g class="h-aura">${rectsFromMatrix(am)}</g>`;
  }

  return `<svg class="px" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-label="${hero.name}">` +
    aura +
    `<g class="h-body">${rectsFromMatrix(m)}<g class="h-eyes">${rectsFromMatrix(eyes)}</g></g>` +
    `<g class="h-fx">${rectsFromMatrix(fxMatrix)}</g></svg>`;
}

/** Culoare mai închisă (pentru umbre). */
function shade(hex, f = 0.7) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

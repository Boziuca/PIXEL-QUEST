/* Biblioteca implicită de exerciții, pe grupe musculare.
   lower: true → exercițiu pentru picioare (progresie +5 kg), altfel +2,5 kg. */
export const GROUPS = {
  piept: 'Piept', spate: 'Spate', picioare: 'Picioare', umeri: 'Umeri', brate: 'Brațe', abdomen: 'Abdomen', cardio: 'Cardio',
};

export const DEFAULT_EXERCISES = [
  // Piept
  { id: 'bench', name: 'Împins la bancă', group: 'piept' },
  { id: 'incline_db', name: 'Împins înclinat cu gantere', group: 'piept' },
  { id: 'flyes', name: 'Fluturări cu gantere', group: 'piept' },
  { id: 'pushup', name: 'Flotări', group: 'piept' },
  { id: 'dips', name: 'Flotări la paralele', group: 'piept' },
  { id: 'cable_cross', name: 'Crossover la cablu', group: 'piept' },
  // Spate
  { id: 'deadlift', name: 'Îndreptări', group: 'spate', lower: true },
  { id: 'pullup', name: 'Tracțiuni', group: 'spate' },
  { id: 'row', name: 'Ramat cu bara', group: 'spate' },
  { id: 'db_row', name: 'Ramat cu ganteră', group: 'spate' },
  { id: 'lat_pull', name: 'Helcometru', group: 'spate' },
  { id: 'seated_row', name: 'Ramat la cablu', group: 'spate' },
  // Picioare
  { id: 'squat', name: 'Genuflexiuni', group: 'picioare', lower: true },
  { id: 'front_squat', name: 'Genuflexiuni frontale', group: 'picioare', lower: true },
  { id: 'rdl', name: 'Îndreptări românești', group: 'picioare', lower: true },
  { id: 'legpress', name: 'Presă pentru picioare', group: 'picioare', lower: true },
  { id: 'lunge', name: 'Fandări', group: 'picioare', lower: true },
  { id: 'leg_curl', name: 'Flexii femurale', group: 'picioare', lower: true },
  { id: 'leg_ext', name: 'Extensii cvadriceps', group: 'picioare', lower: true },
  { id: 'calf', name: 'Ridicări pe vârfuri', group: 'picioare', lower: true },
  // Umeri
  { id: 'ohp', name: 'Presă militară', group: 'umeri' },
  { id: 'db_press', name: 'Presă cu gantere pentru umeri', group: 'umeri' },
  { id: 'lateral', name: 'Ridicări laterale', group: 'umeri' },
  { id: 'face_pull', name: 'Face pull', group: 'umeri' },
  // Brațe
  { id: 'curl', name: 'Flexii biceps cu bara', group: 'brate' },
  { id: 'hammer', name: 'Flexii ciocan', group: 'brate' },
  { id: 'triceps_push', name: 'Extensii triceps la cablu', group: 'brate' },
  { id: 'skull', name: 'Extensii triceps culcat', group: 'brate' },
  // Abdomen
  { id: 'plank', name: 'Planșă (secunde)', group: 'abdomen' },
  { id: 'crunch', name: 'Abdomene', group: 'abdomen' },
  { id: 'leg_raise', name: 'Ridicări de picioare', group: 'abdomen' },
  { id: 'russian', name: 'Răsuciri rusești', group: 'abdomen' },
  // Cardio
  { id: 'run', name: 'Alergare (minute)', group: 'cardio' },
  { id: 'bike', name: 'Bicicletă (minute)', group: 'cardio' },
  { id: 'rope', name: 'Coardă (minute)', group: 'cardio' },
  { id: 'rowing', name: 'Aparat de vâslit (minute)', group: 'cardio' },
];

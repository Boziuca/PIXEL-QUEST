/* =========================================================
   pixel.js – randare de grile pixel-art în SVG.
   O grilă = listă de șiruri; fiecare caracter = o culoare din paletă,
   '.' = transparent. Pixelii consecutivi de aceeași culoare sunt
   uniți într-un singur <rect> pentru un SVG mai mic.
   ========================================================= */

/** Transformă o matrice de culori (null = gol) în <rect>-uri. */
export function rectsFromMatrix(m) {
  let out = '';
  for (let y = 0; y < m.length; y++) {
    const row = m[y];
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (!c) { x++; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === c) w++;
      out += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
      x += w;
    }
  }
  return out;
}

/** Grilă de caractere + paletă → matrice de culori. */
export function gridToMatrix(grid, pal) {
  return grid.map(r => [...r].map(ch => (ch === '.' || ch === ' ' ? null : (pal[ch] ?? null))));
}

/** SVG complet dintr-o grilă. */
export function gridSVG(grid, pal, cls = '') {
  const h = grid.length, w = Math.max(...grid.map(r => r.length));
  return `<svg class="px ${cls}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${rectsFromMatrix(gridToMatrix(grid, pal))}</svg>`;
}

/** Desenează o grilă peste o matrice existentă, la poziția (ox, oy). */
export function stamp(matrix, grid, pal, ox = 0, oy = 0) {
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const yy = y + oy, xx = x + ox;
      if (yy < 0 || yy >= matrix.length || xx < 0 || xx >= matrix[0].length) return;
      matrix[yy][xx] = pal[ch] ?? matrix[yy][xx];
    });
  });
}
export function blankMatrix(w, h) { return Array.from({ length: h }, () => Array(w).fill(null)); }

/** Oglindește o grilă pe orizontală. */
export function mirror(grid) { return grid.map(r => [...r].reverse().join('')); }

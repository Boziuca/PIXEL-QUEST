/* =========================================================
   charts.js – grafice desenate „în pixeli” pe canvas.
   Canvasul are rezoluție mică (1/3 din lățimea afișată) și e
   mărit cu image-rendering: pixelated → aspect retro.
   ========================================================= */
import { fmtNum } from './util.js';

const SCALE = 3;
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function setup(canvas) {
  const w = Math.max(60, Math.floor(canvas.clientWidth / SCALE));
  const h = Math.max(40, Math.floor(canvas.clientHeight / SCALE));
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, w, h);
  return { g, w, h };
}
/** Text pixel mic (5 px înălțime, fontul VT323 la scară mică). */
function txt(g, s, x, y, color, align = 'left') {
  g.fillStyle = color; g.font = '8px VT323, monospace'; g.textAlign = align; g.textBaseline = 'top';
  g.fillText(s, Math.round(x), Math.round(y));
}
function short(v) { return v >= 10000 ? Math.round(v / 1000) + 'k' : v >= 1000 ? (v / 1000).toFixed(1).replace('.0', '') + 'k' : fmtNum(v, 1); }

/**
 * Grafic cu bare. data: [{ label, value }], opt: { goal, color, empty }
 */
export function barChart(canvas, data, opt = {}) {
  if (!canvas?.isConnected) return; // ecranul s-a schimbat între timp
  const { g, w, h } = setup(canvas);
  const ink2 = cssVar('--ink2'), color = opt.color || cssVar('--accent'), border = cssVar('--border'), good = cssVar('--good');
  const top = 10, bottom = h - 9, left = 3, right = w - 3;
  const max = Math.max(1, opt.goal || 0, ...data.map(d => d.value)) * 1.1;
  const n = data.length, slot = (right - left) / n, bw = Math.max(1, Math.floor(slot * 0.7));
  const yOf = v => bottom - Math.round((v / max) * (bottom - top));
  if (!data.some(d => d.value > 0)) txt(g, opt.empty || 'Nicio dată încă', w / 2, h / 2 - 4, ink2, 'center');
  data.forEach((d, i) => {
    const x = Math.round(left + i * slot + (slot - bw) / 2), y = yOf(d.value);
    if (d.value > 0) {
      g.fillStyle = border; g.fillRect(x - 1, y - 1, bw + 2, bottom - y + 1);
      g.fillStyle = opt.goal && d.value >= opt.goal ? good : color; g.fillRect(x, y, bw, bottom - y);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, Math.max(1, Math.floor(bw / 4)), bottom - y);
    }
    if (n <= 14 || i % Math.ceil(n / 10) === 0) txt(g, d.label, x + bw / 2, bottom + 1, ink2, 'center');
  });
  if (opt.goal) {
    const y = yOf(opt.goal);
    g.fillStyle = cssVar('--bad');
    for (let x = left; x < right; x += 3) g.fillRect(x, y, 2, 1);
    txt(g, short(opt.goal), right, y - 9, cssVar('--bad'), 'right');
  }
  const mx = Math.max(...data.map(d => d.value));
  if (mx > 0) txt(g, 'max ' + short(mx), left, 0, ink2);
}

/**
 * Grafic linie (în trepte). points: [{ label, value }], opt: { goal, color }
 */
export function lineChart(canvas, points, opt = {}) {
  if (!canvas?.isConnected) return;
  const { g, w, h } = setup(canvas);
  const ink2 = cssVar('--ink2'), color = opt.color || cssVar('--accent2'), border = cssVar('--border');
  const top = 10, bottom = h - 9, left = 3, right = w - 4;
  if (points.length === 0) { txt(g, opt.empty || 'Nicio dată încă', w / 2, h / 2 - 4, ink2, 'center'); return; }
  const vals = points.map(p => p.value).concat(opt.goal ? [opt.goal] : []);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const xOf = i => points.length === 1 ? (left + right) / 2 : left + Math.round(i * (right - left) / (points.length - 1));
  const yOf = v => bottom - Math.round(((v - min) / (max - min)) * (bottom - top));
  if (opt.goal) {
    const y = yOf(opt.goal); g.fillStyle = cssVar('--good');
    for (let x = left; x < right; x += 3) g.fillRect(x, y, 2, 1);
    txt(g, 'țintă ' + short(opt.goal), right, y - 9, cssVar('--good'), 'right');
  }
  // linie pixel cu pixel (Bresenham)
  g.fillStyle = color;
  for (let i = 1; i < points.length; i++) line(g, xOf(i - 1), yOf(points[i - 1].value), xOf(i), yOf(points[i].value));
  points.forEach((p, i) => {
    const x = xOf(i), y = yOf(p.value);
    g.fillStyle = border; g.fillRect(x - 2, y - 2, 5, 5);
    g.fillStyle = color; g.fillRect(x - 1, y - 1, 3, 3);
  });
  const step = Math.ceil(points.length / 6);
  points.forEach((p, i) => { if (i % step === 0 || i === points.length - 1) txt(g, p.label, xOf(i), bottom + 1, ink2, 'center'); });
  const last = points[points.length - 1].value;
  txt(g, short(last) + (opt.unit || ''), left, 0, ink2);
}
function line(g, x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 2000; i++) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Desenează graficele după ce fontul e gata și elementul are dimensiuni. */
export function drawWhenReady(fn) {
  (document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(fn));
}

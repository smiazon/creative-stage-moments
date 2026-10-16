// The drone swarm's formations, shared by the swarm itself (spectacle.js) and the tiles' previews,
// so a tile shows exactly what flies. Each gives drone i of n its spot at time t as [u, v, w]:
// u across (as the crowd sees it, left to right), v up, w toward the crowd, in units of the
// formation's size (about -1..1; the fly-overs reach out over the floor, w up to 4).
const TAU = Math.PI * 2;
const fib = (i, n) => { const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
const rotY = ([x, y, z], a) => [x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a)];
const rotX = ([x, y, z], a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const hash = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

export const SHAPES = {
  grid: (i, n) => { const c = Math.ceil(Math.sqrt(n * 1.7)); return [((i % c) / (c - 1) - 0.5) * 2.2, (Math.floor(i / c) / (Math.ceil(n / c) - 1) - 0.5) * 1.3, 0]; },
  ring: (i, n, t) => { const a = (i / n) * TAU + t * 0.25, r = i % 2 ? 1 : 0.7; return [Math.cos(a) * r, Math.sin(a) * r, 0]; },
  heart: (i, n, t) => { const a = (i / n) * TAU, k = 0.05 * Math.max(0, Math.sin(t * 3.2)), s = (i % 3 ? 1 : 0.62) * (1 + k); return [16 * Math.sin(a) ** 3 / 16 * s, (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16 * s + 0.1, 0]; },
  star: (i, n, t) => { const a = (i / n) * TAU + t * 0.15, f = Math.abs((((a * 5) / TAU) % 1) - 0.5) * 2, r = (0.45 + 0.55 * f) * (i % 4 ? 1 : 0.55); return [Math.cos(a) * r, Math.sin(a) * r, 0]; },
  sphere: (i, n, t) => { const p = rotY(fib(i, n), t * 0.5); return [p[0] * 0.8, p[1] * 0.8, p[2] * 0.8]; },
  galaxy: (i, n, t) => { const arm = i % 3, k = Math.floor(i / 3) / (n / 3), a = k * 5 + (arm * TAU) / 3 + t * 0.4, r = 0.12 + k * 1.05; return [Math.cos(a) * r, Math.sin(a) * r * 0.55, Math.sin(a * 2) * 0.08]; },
  helix: (i, n, t) => { const k = Math.floor(i / 2) / (n / 2), a = k * TAU * 2.5 + t * 1.1 + (i % 2) * Math.PI; return [(k - 0.5) * 2.4, Math.cos(a) * 0.45, Math.sin(a) * 0.45]; },
  wave: (i, n, t) => { const c = 24, u = ((i % c) / (c - 1) - 0.5) * 2.4, v = (Math.floor(i / c) / (Math.ceil(n / c) - 1) - 0.5) * 1.1; return [u, v + Math.sin(u * 3 + t * 2) * 0.18, Math.cos(v * 4 + t * 1.6) * 0.25]; },
  // the wild ones
  tornado: (i, n, t) => { const k = i / n, a = k * TAU * 9 + t * (2.5 - k), r = 0.08 + k * 0.85; return [Math.cos(a) * r, k * 2 - 1, Math.sin(a) * r]; },
  torus: (i, n, t) => { const a = (i / n) * TAU * 1, b = (i * 0.618 * TAU) % TAU, p = [(0.8 + 0.28 * Math.cos(b)) * Math.cos(a), 0.28 * Math.sin(b), (0.8 + 0.28 * Math.cos(b)) * Math.sin(a)]; return rotY(rotX(p, 1.1 + Math.sin(t * 0.4) * 0.3), t * 0.6); },
  knot: (i, n, t) => { const a = (i / n) * TAU, p = [Math.sin(a) + 2 * Math.sin(2 * a), Math.cos(a) - 2 * Math.cos(2 * a), -Math.sin(3 * a)].map((v) => v * 0.3); return rotY(p, t * 0.5); },
  cube: (i, n, t) => { const e = i % 12, k = (Math.floor(i / 12) / Math.ceil(n / 12)) * 2 - 1, E = [[k, -1, -1], [k, 1, -1], [k, -1, 1], [k, 1, 1], [-1, k, -1], [1, k, -1], [-1, k, 1], [1, k, 1], [-1, -1, k], [1, -1, k], [-1, 1, k], [1, 1, k]][e]; return rotY(rotX(E.map((v) => v * 0.55), t * 0.4), t * 0.6); },
  pyramid: (i, n, t) => { const e = i % 8, k = (Math.floor(i / 8) / Math.ceil(n / 8)), B = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; let p; if (e < 4) { const a = B[e], b = B[(e + 1) % 4]; p = [a[0] + (b[0] - a[0]) * k, -0.8, a[1] + (b[1] - a[1]) * k]; } else { const a = B[e - 4]; p = [a[0] * (1 - k), -0.8 + k * 1.8, a[1] * (1 - k)]; } return rotY(p.map((v) => v * 0.7), t * 0.5); },
  saturn: (i, n, t) => { if (i % 3) { const p = fib(i, n); return rotY(p.map((v) => v * 0.55), t * 0.3); } const a = (i / n) * TAU * 3 + t * 0.6, r = 0.85 + (i % 2) * 0.12; return rotX([Math.cos(a) * r, 0, Math.sin(a) * r], 0.45); },
  flower: (i, n, t) => { const a = (i / n) * TAU, bloom = 0.55 + 0.45 * Math.sin(t * 0.8), r = Math.cos(5 * a) * bloom; return [Math.cos(a) * r, Math.sin(a) * r, Math.sin(t + a * 3) * 0.1]; },
  infinity: (i, n, t) => { const a = (i / n) * TAU + t * 0.6, d = 1 + Math.sin(a) ** 2; return [Math.cos(a) / d * 1.2, Math.sin(a) * Math.cos(a) / d * 1.2, 0]; },
  butterfly: (i, n, t) => { const a = (i / n) * TAU * 2, r = Math.exp(Math.sin(a)) - 2 * Math.cos(4 * a) + Math.sin((2 * a - Math.PI) / 24) ** 5, flap = Math.cos(t * 4) * 0.6 * Math.sign(Math.sin(a)); const x = Math.sin(a) * r * 0.24, y = Math.cos(a) * r * 0.24; return [x * Math.cos(flap), y - 0.1, Math.abs(x) * Math.sin(Math.abs(flap))]; },
  jellyfish: (i, n, t) => { if (i < n * 0.45) { const p = fib(i, n * 0.9); if (p[1] < 0) p[1] = -p[1]; return [p[0] * 0.6 * (1 + 0.1 * Math.sin(t * 2)), p[1] * 0.45 + 0.3, p[2] * 0.6]; } const k = (i - n * 0.45) / (n * 0.55), arm = (k * 10) | 0, s = (k * 10) % 1, a = (arm / 10) * TAU; return [Math.cos(a) * 0.4 + Math.sin(t * 2 + s * 6) * 0.08, 0.3 - s * 1.3, Math.sin(a) * 0.4 + Math.cos(t * 2 + s * 6) * 0.08]; },
  spiral: (i, n, t) => { const k = i / n, a = k * TAU * 4 + t; return [Math.cos(a) * (0.3 + k * 0.7), k * 1.8 - 0.9, Math.sin(a) * (0.3 + k * 0.7)]; },
  eye: (i, n, t) => { const blink = Math.min(1, Math.abs(Math.sin(t * 0.7)) * 3); if (i < n * 0.6) { const a = (i / (n * 0.6)) * TAU; return [Math.cos(a) * 1.1, Math.sin(a) * 0.55 * blink * (Math.cos(a) * Math.cos(a) < 0.98 ? 1 : 1), 0]; } const a = (i / (n * 0.4)) * TAU * 2, r = ((i % 7) / 7) * 0.35; return [Math.cos(a) * r + Math.sin(t * 0.9) * 0.3, Math.sin(a) * r * blink, 0.05]; },
  smiley: (i, n) => { const k = i / n; if (k < 0.55) { const a = (k / 0.55) * TAU; return [Math.cos(a), Math.sin(a), 0]; } if (k < 0.65) { const a = ((k - 0.55) / 0.1) * TAU; return [-0.35 + Math.cos(a) * 0.1, 0.3 + Math.sin(a) * 0.14, 0]; } if (k < 0.75) { const a = ((k - 0.65) / 0.1) * TAU; return [0.35 + Math.cos(a) * 0.1, 0.3 + Math.sin(a) * 0.14, 0]; } const a = Math.PI * 1.15 + ((k - 0.75) / 0.25) * Math.PI * 0.7; return [Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0]; },
  bolt: (i, n) => { const P = [[0.2, 1], [-0.35, 0.05], [0.1, 0.05], [-0.25, -1], [0.45, 0.2], [-0.02, 0.2], [0.35, 1]]; const k = (i / n) * (P.length - 1), s = Math.floor(k), f = k - s, a = P[s], b = P[Math.min(P.length - 1, s + 1)]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0]; },
  crown: (i, n) => { const k = i / n, u = k * 2 - 1, spikes = Math.abs(Math.sin(u * Math.PI * 2.5)); return i % 3 ? [u, -0.4 + spikes * 0.9, 0] : [u, -0.5, 0]; },
  rain: (i, n, t) => { const u = hash(i) * 2.4 - 1.2, w = hash(i + 7) * 1.2 - 0.6, v = 1 - (((t * (0.5 + hash(i + 3) * 0.6)) + hash(i + 5)) % 2); return [u, v, w]; },
  // they come out to the crowd
  // (the ones that reach out over the floor fly low, about 11 m up: under the jumbotron, over the heads)
  burst: (i, n, t) => { const p = fib(i, n), r = 0.15 + ((t * 0.9) % 1.25); return [p[0] * r, p[1] * r, p[2] * r * 0.6 + r * 0.5]; },
  tunnel: (i, n, t) => { const rings = 10, ring = i % rings, a = (Math.floor(i / rings) / Math.ceil(n / rings)) * TAU + t * 0.5, z = ((ring / rings + t * 0.15) % 1) * 1.25; return [Math.cos(a) * 0.8, Math.sin(a) * 0.8, z]; },
  flyover: (i, n, t) => { const c = 20, u = ((i % c) / (c - 1) - 0.5) * 2.4, r = Math.floor(i / c), out = 0.3 + ((t * 0.22) % 1) * 3.6; return [u, -1.12 + Math.sin(u * 3 + t * 2) * 0.1 - r * 0.02, out - r * 0.15]; },
  canopy: (i, n, t) => { const c = 20, u = ((i % c) / (c - 1) - 0.5) * 2.6, s = Math.floor(i / c) / Math.ceil(n / c); return [u, -1.15 + Math.sin(u * 2 + t * 1.5 + s * 4) * 0.1, 0.4 + s * 3.4]; },
  comet: (i, n, t) => { const k = i / n, a = t * 0.9 - k * 2.2; return [Math.cos(a) * (1 - k * 0.3), -1.1 + Math.sin(a * 2) * 0.12, 1.6 + Math.sin(a) * 1.4]; },
};
// a word or a number as dots (sampled from a canvas), centred
const wordCache = {};
export function wordPoints(word) {
  if (wordCache[word]) return wordCache[word];
  const c = document.createElement('canvas'); c.width = 240; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${word.length > 3 ? 54 : 72}px Arial Black, Arial, sans-serif`;
  g.fillText(word, 120, 42);
  const d = g.getImageData(0, 0, 240, 80).data, pts = [];
  for (let y = 0; y < 80; y += 3) for (let x = 0; x < 240; x += 3) if (d[(y * 240 + x) * 4 + 3] > 128) pts.push([(x - 120) / 40, (40 - y) / 40, 0]);
  return (wordCache[word] = pts.length ? pts : [[0, 0, 0]]);
}
export const wordShape = (word) => (i, n) => { const P = wordPoints(word), p = P[Math.floor((i / n) * P.length) % P.length]; return [p[0] * 0.75, p[1] * 0.75, 0]; };
export const shapeOf = (opts) => (opts.word ? wordShape(opts.word) : SHAPES[opts.shape] || SHAPES.ring);
// for a tile: the formation as dots on a canvas, the way the crowd sees it (depth as size)
export function previewPoints(opts, t, n = 110) {
  const f = shapeOf(opts);
  return Array.from({ length: n }, (_, i) => { const [u, v, w] = f(i, n, t); return [u, v, w]; });
}

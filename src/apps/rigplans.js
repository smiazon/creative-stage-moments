// Truss layouts for the Build app: rig plans in the rig's own contract (rig.js, the designer's
// plan v2), over the end stage and clear of the centre-hung jumbotron. Hanging one reloads the
// room (the rig is built at boot from localStorage 'arena-active-rigplan').
const FRONT = -20, r2 = (v) => Math.round(v * 100) / 100;
const row = (x, len, y) => ({ x, z: 0, len, rot: Math.PI / 2, y, axis: 'z', shape: 'straight', r: 0 });
function fill(t, types) {
  const out = [], n = Math.max(2, Math.round(t.len / 1.8));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n - 0.5;
    out.push({ type: types[i % types.length], x: r2(t.x + Math.cos(t.rot) * t.len * u), z: r2(t.z + Math.sin(t.rot) * t.len * u), y: t.y, rot: null, aim: null });
  }
  return out;
}
function plan(name, trusses, types, extra = {}) {
  return {
    name, version: 2, trusses,
    fixtures: trusses.flatMap((t, i) => (t.shape === 'straight' ? fill(t, types[i % types.length]) : [])),
    fx: [...[-11, 11].map((z) => ({ type: 'confetti', x: FRONT - 1, z })), ...[-6, 0, 6].map((z) => ({ type: 'pyro', x: FRONT - 1.5, z }))],
    speakers: [], barricades: [{ x: FRONT + 2.5, z: 0, len: 28, rot: Math.PI / 2, axis: 'z', shape: 'straight', r: 0 }], stages: [], screens: [],
    ...extra,
  };
}
export const TRUSS = [
  ['house', 'House rig', null],
  ['front', 'Front truss', plan('Front truss', [row(FRONT - 2, 26, 15.4)], [['spot', 'beam', 'wash', 'laser']])],
  ['three', 'Three rows', plan('Three rows', [row(FRONT - 2, 26, 15.4), row(FRONT - 8, 24, 15.4), row(FRONT - 14, 22, 15.4)], [['spot', 'beam'], ['wash', 'beam'], ['beam', 'strobe']])],
  ['five', 'Festival five', plan('Festival five', [-1, -5, -9, -13, -17].map((d, i) => row(FRONT + d, 28 - i * 1.5, 15.4)), [['beam', 'wash'], ['wash', 'spot'], ['spot', 'strobe'], ['beam', 'laser'], ['wash', 'beam']])],
  ['box', 'Box grid', plan('Box grid', [row(FRONT - 2, 26, 15.4), row(FRONT - 16, 26, 15.4), { x: FRONT - 9, z: -13, len: 15, rot: 0, y: 15.4, axis: 'x', shape: 'straight', r: 0 }, { x: FRONT - 9, z: 13, len: 15, rot: 0, y: 15.4, axis: 'x', shape: 'straight', r: 0 }], [['spot', 'beam'], ['wash', 'beam'], ['beam'], ['beam']])],
  ['vee', 'V shape', plan('V shape', [{ x: FRONT - 7, z: -7, len: 16, rot: 1.15, y: 15.4, axis: 'z', shape: 'straight', r: 0 }, { x: FRONT - 7, z: 7, len: 16, rot: -1.15, y: 15.4, axis: 'z', shape: 'straight', r: 0 }, row(FRONT - 2, 14, 14)], [['beam', 'spot'], ['beam', 'spot'], ['wash', 'laser']])],
  ['square', 'Square pod', plan('Square pod', [{ x: FRONT - 9, z: 0, len: 12, r: 8, rot: 0, y: 15.4, shape: 'square', axis: 'x' }, row(FRONT - 2, 24, 14)], [['spot'], ['beam', 'wash', 'laser']])],
  ['club', 'Minimal club', plan('Minimal club', [row(FRONT - 3, 18, 12), row(FRONT - 10, 16, 12)], [['spot', 'wash'], ['beam', 'strobe']])],
  ['ladder', 'Ladder rows', plan('Ladder rows', [-2, -5, -8, -11, -14, -17].map((d, i) => row(FRONT + d, 18 + (i % 2) * 8, 14 + i * 0.5)), [['beam'], ['wash'], ['beam', 'laser'], ['spot'], ['beam'], ['wash', 'strobe']])],
  ['wide', 'Wide wings', plan('Wide wings', [row(FRONT - 2, 32, 15.4), row(FRONT - 10, 30, 16), ...[-1, 1].map((s) => ({ x: FRONT + 4, z: s * 15, len: 10, rot: 0, y: 13, axis: 'x', shape: 'straight', r: 0 }))], [['spot', 'beam', 'laser'], ['wash', 'beam'], ['beam', 'wash'], ['beam', 'wash']])],
];

export const RIG_KEY = 'arena-active-rigplan';

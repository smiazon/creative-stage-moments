// STAGE CONCEPTS for the Build app: whole productions, each one consistent with itself. A concept
// is the room's stage set-up (the builder's: where the stage stands, its shape, the catwalk) plus a
// rig plan (rig.js): its own decks (side catwalks, ramps, islands, wings, risers), its trusses
// following the stage's shape, the lights on them (an in-the-round stage aims every light outward,
// a ring plan), the PA hung where that stage needs it, barricades, effects. On top, screen add-ons
// (many at once) and a rig style (how much truss, which lights). Everything is clear of the centre-
// hung jumbotron (nothing over the floor's middle above 12 m).
//
// Conventions (rig.js): a straight truss runs along z at rot PI/2, along x at rot 0; a deck is w
// along x, d along z, turned by rot; a screen faces the way its "face" angle points (0: toward the
// crowd at the back, +x), stored as rot = face - PI/2; a PA hang faces yaw = -face.
const PI = Math.PI, TAU = PI * 2;
const r2 = (v) => Math.round(v * 100) / 100;
export const FRONT = -20;   // the end stage's front edge

// --- the parts ---------------------------------------------------------------------------------------
const along = (x, z, len, y) => ({ x: r2(x), z: r2(z), len: r2(len), rot: PI / 2, y, axis: 'z', shape: 'straight', r: 0 });   // across the room
const across = (x, len, y) => along(x, 0, len, y);   // a full row across the stage, centred
const runX = (x, z, len, y) => ({ x: r2(x), z: r2(z), len: r2(len), rot: 0, y, axis: 'x', shape: 'straight', r: 0 });          // toward the back
const diag = (x0, z0, x1, z1, y) => ({ x: r2((x0 + x1) / 2), z: r2((z0 + z1) / 2), len: r2(Math.hypot(x1 - x0, z1 - z0)), rot: Math.atan2(z1 - z0, x1 - x0), y, axis: 'x', shape: 'straight', r: 0 });
const circle = (x, z, r, y) => ({ x, z, r, len: 12, rot: 0, y, shape: 'circle' });
const square = (x, z, r, y) => ({ x, z, r, len: 12, rot: 0, y, shape: 'square' });
const deck = (x, z, w, d, h, rot = 0) => ({ x: r2(x), z: r2(z), w: r2(w), d: r2(d), h, rot });
const panel = (x, z, w, h, y, face = 0) => ({ x: r2(x), z: r2(z), w, h, y, rot: face - PI / 2 });
const hang = (x, z, y, face = 0) => ({ type: 'main', x: r2(x), z: r2(z), y, rot: -face, yaw: -face });
const sub = (x, z, y = 0) => ({ type: 'sub', x: r2(x), z: r2(z), y, rot: 0, yaw: 0 });
const bar = (x, z, len, rot = PI / 2, shape = 'straight', r = 0) => ({ x: r2(x), z: r2(z), len, rot, axis: rot ? 'z' : 'x', shape, r });
// lights along a truss: n by its length, the types in turn; a ring truss's aim outward (at the stands)
function fill(t, types, every = 1.8) {
  const out = [];
  if (t.shape === 'circle' || t.shape === 'square') {
    const n = Math.max(6, Math.round((t.shape === 'square' ? 8 * t.r : TAU * t.r) / every));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      let x = Math.cos(a), z = Math.sin(a);
      if (t.shape === 'square') { const k = Math.SQRT1_2 / Math.max(Math.abs(x), Math.abs(z)); x *= k; z *= k; }   // the rig's square: corners at r
      out.push({ type: types[i % types.length], x: r2(t.x + x * t.r), z: r2(t.z + z * t.r), y: t.y, rot: null, aim: [r2(t.x + Math.cos(a) * (t.r + 26)), 2, r2(t.z + Math.sin(a) * (t.r + 26))] });
    }
    return out;
  }
  if (t.shape === 'arc') {   // the rig's arc: three-eighths of a turn, centred on its rot
    const sweep = PI * 0.75, n = Math.max(4, Math.round((sweep * t.r) / every));
    for (let i = 0; i < n; i++) { const a = t.rot - sweep / 2 + (sweep * (i + 0.5)) / n; out.push({ type: types[i % types.length], x: r2(t.x + Math.cos(a) * t.r), z: r2(t.z + Math.sin(a) * t.r), y: t.y, rot: null, aim: null }); }
    return out;
  }
  const n = Math.max(2, Math.round(t.len / every));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n - 0.5;
    out.push({ type: types[i % types.length], x: r2(t.x + Math.cos(t.rot) * t.len * u), z: r2(t.z + Math.sin(t.rot) * t.len * u), y: t.y, rot: null, aim: null });
  }
  return out;
}

// --- rig styles: how much truss the concept flies, and which lights on it --------------------------------
export const RIG_STYLES = [
  ['standard', 'Standard', { level: 1, mix: ['spot', 'beam', 'wash'] }],
  ['heavy', 'Heavy rig', { level: 2, mix: ['beam', 'spot', 'wash', 'beam'] }],
  ['minimal', 'Minimal', { level: 0, mix: ['spot', 'wash'] }],
  ['beams', 'Beam rig', { level: 1, mix: ['beam', 'beam', 'spot'] }],
  ['washes', 'Wash rig', { level: 1, mix: ['wash', 'wash', 'beam'] }],
  ['lasers', 'Laser rig', { level: 1, mix: ['beam', 'laser', 'spot'] }],
  ['strobes', 'Strobe rig', { level: 1, mix: ['beam', 'strobe', 'wash'] }],
];

// --- the concepts -----------------------------------------------------------------------------------------
// each: (style) => { cfg (the builder's stage), plan parts }. `L` adds a truss and its lights.
const F = FRONT;
const END = { position: 'far', curtains: 'full', farSize: 'default', catwalk: 'none', bstage: 'none', cstage: false, screen: 'wall' };
const ROUND = { position: 'middle', curtains: 'full', middleShape: 'circle', catwalk: 'none', bstage: 'none', screen: 'cyl' };
const mainsEnd = (y = 15, z = 14) => [hang(F + 0.5, -z, y, 0.12), hang(F + 0.5, z, y, -0.12), sub(F - 0.5, -4, 2), sub(F - 0.5, 4, 2)];
const fxEnd = () => [...[-11, 11].map((z) => ({ type: 'confetti', x: F - 1, z })), ...[-7, 0, 7].map((z) => ({ type: 'pyro', x: F - 1.5, z })), ...[-12, 12].map((z) => ({ type: 'flame', x: F - 1.2, z }))];
const rowsEnd = (lv) => [across(F - 2, 26, 15.4), ...(lv >= 1 ? [across(F - 8, 24, 15.6)] : []), ...(lv >= 2 ? [across(F - 13, 22, 16), across(F + 1.5, 20, 14.2)] : [])];

export const CONCEPTS = [
  ['classic', 'Classic arena', 'end', (lv) => ({
    cfg: { ...END, catwalk: 'standard', bstage: 'circle' },
    trusses: [...rowsEnd(lv), ...(lv >= 1 ? [across(F - 14, 22, 15.4)] : [])],
    speakers: mainsEnd(), barricades: [bar(F + 2.5, 0, 28)], fx: fxEnd(),
  })],
  ['sidecats', 'Side catwalks', 'end', (lv) => ({
    cfg: { ...END },
    // two catwalks down the sides of the floor, joined at the far end: a U to walk round the crowd
    stages: [deck(-6, -10.5, 28, 2.4, 1.6), deck(-6, 10.5, 28, 2.4, 1.6), deck(10.5, -10.5, 5.5, 5.5, 1.6), deck(10.5, 10.5, 5.5, 5.5, 1.6), deck(12.2, 0, 2.2, 15.6, 1.6),
      deck(14.2, -10.5, 1.6, 3, 1.1), deck(15.6, -10.5, 1.4, 3, 0.6), deck(14.2, 10.5, 1.6, 3, 1.1), deck(15.6, 10.5, 1.4, 3, 0.6)],
    trusses: [...rowsEnd(lv), runX(-5, -10.5, 28, 13), runX(-5, 10.5, 28, 13), ...(lv >= 1 ? [along(12.2, 0, 24, 12.5)] : []), ...(lv >= 2 ? [runX(-5, -13.5, 26, 14), runX(-5, 13.5, 26, 14)] : [])],
    screens: [panel(13.6, -10.5, 4, 5.5, 2.6, PI / 2 + 0.2), panel(13.6, 10.5, 4, 5.5, 2.6, -PI / 2 - 0.2)],
    speakers: [...mainsEnd(), hang(11, -13.5, 13, -PI * 0.75), hang(11, 13.5, 13, PI * 0.75)],
    barricades: [bar(F + 2.5, 0, 16), bar(-6, -8.6, 28, 0), bar(-6, 8.6, 28, 0)], fx: [...fxEnd(), ...[-10.5, 10.5].map((z) => ({ type: 'confetti', x: 11, z }))],
  })],
  ['ramps', 'Ramps to the floor', 'end', (lv) => ({
    cfg: { ...END, catwalk: 'standard', bstage: 'square' },
    // stepped ramps off both front corners down into the crowd, and a thrust in the middle
    stages: [deck(F + 1.6, -12, 3.2, 3.6, 1.6), deck(F + 4.6, -12, 3, 3.6, 1.1), deck(F + 7.4, -12, 2.8, 3.6, 0.6),
      deck(F + 1.6, 12, 3.2, 3.6, 1.6), deck(F + 4.6, 12, 3, 3.6, 1.1), deck(F + 7.4, 12, 2.8, 3.6, 0.6), deck(F + 1.8, 0, 3.6, 9, 1.8)],
    trusses: [...rowsEnd(lv), diag(F - 1, -13, F + 9, -10, 13), diag(F - 1, 13, F + 9, 10, 13), ...(lv >= 1 ? [square(-3.4, 0, 4, 10.5)] : [])],
    screens: [panel(F - 1, -17, 7, 6, 4, -0.35), panel(F - 1, 17, 7, 6, 4, 0.35)],
    speakers: mainsEnd(), barricades: [bar(F + 9.5, -12, 6), bar(F + 9.5, 12, 6), bar(F + 4, 0, 8)], fx: fxEnd(),
  })],
  ['tstage', 'T-stage', 'end', (lv) => ({
    cfg: { ...END, catwalk: 'long', bstage: 'x' },
    trusses: [...rowsEnd(lv), runX(F + 11, 0, 22, 11.4), along(F + 24.6, 0, 12, 11), ...(lv >= 1 ? [runX(F + 11, -6, 18, 12.2), runX(F + 11, 6, 18, 12.2)] : [])],
    speakers: mainsEnd(), barricades: [bar(F + 2.5, -9, 10), bar(F + 2.5, 9, 10), bar(F + 13, 0, 20, 0, 'tpit', 2.4)], fx: fxEnd(),
  })],
  ['wings', 'Wide wings', 'end', (lv) => ({
    cfg: { ...END, farSize: 'large' },
    stages: [deck(F - 2, -16.2, 9, 4.2, 2.0), deck(F - 2, 16.2, 9, 4.2, 2.0)],
    trusses: [across(F - 2, 34, 16), across(F - 9, 32, 16.4), square(F - 2, -16.2, 3, 13), square(F - 2, 16.2, 3, 13), ...(lv >= 1 ? [across(F - 15, 28, 16.8)] : []), ...(lv >= 2 ? [across(F + 2, 30, 14.6)] : [])],
    screens: [panel(F - 4, -12.5, 9, 7, 4.5, 0.45), panel(F - 4, 12.5, 9, 7, 4.5, -0.45)],
    speakers: [hang(F + 1, -19, 15.5, 0.25), hang(F + 1, 19, 15.5, -0.25), sub(F - 0.5, -5, 2), sub(F - 0.5, 5, 2)],
    barricades: [bar(F + 2.8, 0, 36)], fx: [...fxEnd(), ...[-16, 16].map((z) => ({ type: 'flame', x: F + 1, z }))],
  })],
  ['festival', 'Festival main stage', 'end', (lv) => ({
    cfg: { ...END, farSize: 'large', catwalk: 'standard', bstage: 'circle' },
    trusses: [-1, -5, -9, -13, -17].slice(0, 3 + lv).map((d, i) => across(F + d, 30 - i * 1.5, 15.4 + i * 0.4)),
    screens: [panel(F - 1.5, -16.5, 3, 12, 2.4, 0.15), panel(F - 1.5, 16.5, 3, 12, 2.4, -0.15)],
    speakers: mainsEnd(16, 15.5), barricades: [bar(F + 2.8, 0, 32)],
    fx: [...fxEnd(), ...[-8, 8].map((z) => ({ type: 'flame', x: F - 1, z }))],
  })],
  ['cubes', 'Floating cubes', 'end', (lv) => ({
    cfg: { ...END, catwalk: 'standard', bstage: 'circle', screen: 'circle' },
    trusses: [across(F - 2, 26, 15.4), across(F - 12, 26, 15.4), runX(F - 7, -13, 12, 15.4), runX(F - 7, 13, 12, 15.4), ...(lv >= 1 ? [across(F - 7, 22, 15.8)] : [])],
    screens: [-8, 0, 8].flatMap((z) => cube(F - 6, z, 9.5, 2.8)),
    speakers: mainsEnd(), barricades: [bar(F + 2.5, 0, 28)], fx: fxEnd(),
  })],
  ['arch', 'The arch', 'end', (lv) => ({
    cfg: { ...END, catwalk: 'standard', bstage: 'heart', screen: 'circle' },
    trusses: [{ x: F + 4, z: 0, len: 12, r: 12, rot: PI, y: 15.4, shape: 'arc' }, across(F - 3, 24, 16), ...(lv >= 1 ? [across(F - 10, 24, 16.4)] : [])],
    screens: archTiles(F - 7.5, 11.5, 13, 2.4),
    speakers: mainsEnd(), barricades: [bar(F + 2.5, 0, 28)], fx: fxEnd(),
  })],
  ['staircase', 'Staircase', 'end', (lv) => ({
    cfg: { ...END, catwalk: 'standard', bstage: 'heart' },
    stages: [deck(F - 9, 0, 3, 16, 2.6), deck(F - 6.5, 0, 2.5, 14, 2.3)],
    trusses: [13, 14.4, 15.8, 17.2].slice(0, 2 + lv).map((y, i) => across(F - 2 - i * 4, 26 - i * 2, y)),
    screens: [0, 1, 2, 3, 4].map((i) => panel(F - 11.5, -10 + i * 5, 4.4, 3 + i * 1.1, 2.8, 0)),
    speakers: mainsEnd(), barricades: [bar(F + 2.5, 0, 28)], fx: fxEnd(),
  })],
  ['chevron', 'Chevron', 'end', (lv) => ({
    cfg: { ...END, catwalk: 'standard', bstage: 'x' },
    trusses: [diag(F - 13, 0, F - 3, -12, 15.4), diag(F - 13, 0, F - 3, 12, 15.4), across(F - 2, 26, 15), ...(lv >= 1 ? [diag(F - 16, 0, F - 7, -13, 16.2), diag(F - 16, 0, F - 7, 13, 16.2)] : [])],
    screens: [panel(F - 9.5, -6.3, 13, 9, 3, 0.45), panel(F - 9.5, 6.3, 13, 9, 3, -0.45)],
    speakers: mainsEnd(), barricades: [bar(F + 2.5, 0, 28)], fx: fxEnd(),
  })],
  ['pillars', 'LED pillars', 'end', (lv) => ({
    cfg: { ...END, screen: 'circle' },
    trusses: [across(F - 2, 26, 15.4), ...[-12.5, -7.5, -2.5, 2.5, 7.5, 12.5].map((z) => runX(F - 6, z, 5, 14.6)), ...(lv >= 1 ? [across(F - 10, 26, 15.8)] : [])],
    screens: [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5].map((z) => panel(F - 8, z, 1.8, 11, 2.4, 0)),
    speakers: mainsEnd(), barricades: [bar(F + 2.5, 0, 28)], fx: fxEnd(),
  })],
  ['diamond', 'Diamond runway', 'end', (lv) => ({
    cfg: { ...END },
    // two catwalks from the stage's corners, meeting at a diamond in the middle of the floor
    stages: [deckBetween(F, -12, 4, -1.6, 2.4, 1.5), deckBetween(F, 12, 4, 1.6, 2.4, 1.5), deck(6, 0, 6.5, 6.5, 1.5, PI / 4)],
    trusses: [...rowsEnd(lv), diag(F + 1, -11, 3, -2, 11.5), diag(F + 1, 11, 3, 2, 11.5), square(6, 0, 4.2, 10.5)],
    speakers: mainsEnd(), barricades: [bar(F + 2.5, 0, 10), bar(6, 0, 6, 0, 'ring', 6)], fx: [...fxEnd(), { type: 'confetti', x: 6, z: 0 }],
  })],
  ['islands', 'Satellite islands', 'end', (lv) => ({
    cfg: { ...END },
    stages: [deck(-6, -10, 5, 5, 1.4), deck(-6, 10, 5, 5, 1.4), deck(12, 0, 6, 6, 1.4)],
    trusses: [...rowsEnd(lv), square(-6, -10, 2.8, 9), square(-6, 10, 2.8, 9), square(12, 0, 3.3, 9.5)],
    screens: [[-6, -10], [-6, 10], [12, 0]].flatMap(([x, z]) => [panel(x - 1.3, z, 3.5, 2.6, 2.6, 0), panel(x + 1.3, z, 3.5, 2.6, 2.6, PI)]),
    speakers: mainsEnd(), barricades: [bar(F + 2.5, 0, 28), bar(-6, -10, 6, 0, 'ring', 4.3), bar(-6, 10, 6, 0, 'ring', 4.3), bar(12, 0, 6, 0, 'ring', 5)],
    fx: [...fxEnd(), ...[[-6, -10], [-6, 10], [12, 0]].map(([x, z]) => ({ type: 'confetti', x, z }))],
  })],
  // in the round: the stage in the middle of the floor; every light, speaker and screen faces out
  ['round360', '360 in the round', 'round', (lv) => ({
    cfg: { ...ROUND }, ring: true,
    stages: [deck(16.5, 0, 15, 2.4, 1.4), deck(-16.5, 0, 15, 2.4, 1.4), deck(0, 11.6, 2.4, 6.6, 1.4), deck(0, -11.6, 2.4, 6.6, 1.4)],
    trusses: [circle(0, 0, 10.5, 11), ...(lv >= 1 ? [circle(0, 0, 15, 12)] : []), ...(lv >= 2 ? [circle(0, 0, 19, 13)] : [])],
    screens: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * TAU; return panel(Math.cos(a) * 8.6, Math.sin(a) * 8.6, 4.2, 2.6, 9.2, a); }),
    speakers: [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + PI / 4; return hang(Math.cos(a) * 12.5, Math.sin(a) * 12.5, 11.2, a); }),
    barricades: [bar(0, 0, 6, 0, 'ring', 10.4)], fx: [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + PI / 4; return { type: 'confetti', x: r2(Math.cos(a) * 7), z: r2(Math.sin(a) * 7) }; }),
  })],
  ['squareround', 'Square in the round', 'round', (lv) => ({
    cfg: { ...ROUND, middleShape: 'square' }, ring: true,
    stages: [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + PI / 4; return deck(Math.cos(a) * 14, Math.sin(a) * 11, 9, 2.2, 1.4, a); }),
    trusses: [square(0, 0, 10.5, 11), ...(lv >= 1 ? [square(0, 0, 6.5, 10.2)] : []), ...(lv >= 2 ? [square(0, 0, 14.5, 12.5)] : [])],
    screens: [0, PI / 2, PI, -PI / 2].map((a) => panel(Math.cos(a) * 7.4, Math.sin(a) * 7.4, 11, 3, 9, a)),   // a band of screens round the middle, under the jumbotron
    speakers: [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + PI / 4; return hang(Math.cos(a) * 14.5, Math.sin(a) * 12, 11.5, a); }),
    barricades: [bar(0, 0, 6, 0, 'ring', 10.4)], fx: [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU; return { type: 'pyro', x: r2(Math.cos(a) * 7.5), z: r2(Math.sin(a) * 7.5) }; }),
  })],
  ['cross', 'Cross', 'round', (lv) => ({
    cfg: { ...ROUND }, ring: true,
    stages: [deck(17, 0, 16, 2.6, 1.4), deck(-17, 0, 16, 2.6, 1.4), deck(0, 11.8, 2.6, 7, 1.4), deck(0, -11.8, 2.6, 7, 1.4), deck(25.5, 0, 4, 6, 1.4), deck(-25.5, 0, 4, 6, 1.4)],
    trusses: [circle(0, 0, 10, 11), runX(17, 0, 14, 12.5), runX(-17, 0, 14, 12.5), ...(lv >= 1 ? [circle(0, 0, 14, 12)] : [])],
    screens: [panel(26, 0, 5, 4, 3.4, PI), panel(-26, 0, 5, 4, 3.4, 0)],
    speakers: [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + PI / 4; return hang(Math.cos(a) * 12, Math.sin(a) * 12, 11.2, a); }),
    barricades: [bar(0, 0, 6, 0, 'ring', 10)], fx: [[25.5, 0], [-25.5, 0]].map(([x, z]) => ({ type: 'confetti', x, z })),
  })],
  ['ringstage', 'Ring stage', 'round', (lv) => ({
    cfg: { ...ROUND }, ring: true,
    // a walkway all the way round the crowd at the centre: twelve deck segments on a ring
    stages: Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return deck(Math.cos(a) * 15, Math.sin(a) * 12, 7.2, 2.2, 1.2, a + PI / 2); }),
    trusses: [circle(0, 0, 9.5, 10.8), ...(lv >= 1 ? [circle(0, 0, 15.5, 12.5)] : []), ...(lv >= 2 ? [circle(0, 0, 19.5, 13.5)] : [])],
    screens: [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * TAU; return panel(Math.cos(a) * 8.2, Math.sin(a) * 8.2, 5, 2.4, 9, a); }),
    speakers: [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU; return hang(Math.cos(a) * 13, Math.sin(a) * 11, 11.5, a); }),
    barricades: [bar(0, 0, 6, 0, 'ring', 9.8)], fx: Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU; return { type: 'flame', x: r2(Math.cos(a) * 15), z: r2(Math.sin(a) * 12) }; }),
  })],
];
// a deck from one point to another (its long side along the way), at a width and height
function deckBetween(x0, z0, x1, z1, d, h) { return deck((x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0), d, h, Math.atan2(z1 - z0, x1 - x0)); }
// four panels round a point, each facing out: a cube of screens (its bottom at y)
function cube(x, z, y, s) { return [0, PI / 2, PI, -PI / 2].map((a) => panel(x + Math.cos(a) * s / 2, z + Math.sin(a) * s / 2, s, s, y, a)); }
// square tiles along a half circle over the stage, facing the crowd: an arch of LED
function archTiles(x, cy, R, s) { return Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * PI; return panel(x, Math.cos(a) * R, s, s, Math.max(2.4, cy - R + Math.sin(a) * R + 2), 0); }); }

// --- screen add-ons: as many as you like, on top of the concept ---------------------------------------------
export const SCREEN_ADDONS = [
  ['imag', 'IMAG pair', 'end', () => [panel(F - 1.5, -18, 5, 8, 4, 0.25), panel(F - 1.5, 18, 5, 8, 4, -0.25)]],
  ['wings', 'Chevron wings', 'end', () => [panel(F - 3, -13.5, 9, 7, 4.5, 0.45), panel(F - 3, 13.5, 9, 7, 4.5, -0.45)]],
  ['pillars', 'Pillars', 'end', () => [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5].map((z) => panel(F - 9, z, 1.6, 11, 2.4, 0))],
  ['cubes', 'Floating cubes', 'end', () => [-7, 7].flatMap((z) => cube(F - 5, z, 9.8, 2.6))],
  ['ribbons', 'LED ribbons', 'end', () => [10.6, 11.6, 12.6].map((y) => panel(F - 0.6, 0, 26, 0.6, y, 0))],
  ['lip', 'Stage lip LED', 'end', () => [panel(F + 0.15, 0, 28, 0.9, 0.9, 0)]],
  ['steps', 'Stepped screens', 'end', () => [0, 1, 2, 3, 4].map((i) => panel(F - 11.5, -10 + i * 5, 4.4, 3 + i * 1.1, 2.8, 0))],
  ['arch', 'Arch tiles', 'end', () => archTiles(F - 7.5, 11.5, 12, 2.2)],
  ['wrap', 'Wraparound', 'end', () => Array.from({ length: 9 }, (_, i) => { const a = PI - 0.62 + (i / 8) * 1.24; return panel(F + 10 + Math.cos(a) * 24, Math.sin(a) * 24, 5.4, 6.5, 3, a + PI); })],
  ['mosaic', 'Mosaic', 'end', () => [[-11, 3, 3, 3], [-7.5, 2.4, 2.4, 6.5], [-4, 4, 2, 4], [0, 3, 5, 2.5], [0, 2, 2.6, 8], [3.8, 3, 2.4, 3.6], [7.4, 2.6, 3.6, 5], [11, 3.4, 2.4, 2.4], [-2.5, 2.4, 1.8, 10.5], [5.6, 2.2, 1.6, 9.4]]
    .map(([z, w, y, h]) => panel(F - 12 + (z % 2), z, w, h, y + 0.4, 0))],
  ['totems', 'Floor totems', 'any', () => [[2, -9], [2, 9], [16, -9], [16, 9]].flatMap(([x, z]) => [panel(x, z, 1.8, 6, 0.4, PI), panel(x + 0.3, z, 1.8, 6, 0.4, 0)])],
  ['delays', 'Delay screens', 'end', () => [panel(14, -14.5, 6, 3.4, 7, -0.25), panel(14, 14.5, 6, 3.4, 7, 0.25)]],
  ['halo', 'Halo', 'round', () => Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return panel(Math.cos(a) * 12.4, Math.sin(a) * 12.4, 5.6, 2.6, 7.4, a); })],
  ['lipring', 'Stage-edge ring', 'round', () => Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return panel(Math.cos(a) * 8.7, Math.sin(a) * 8.7, 4.4, 0.8, 0.6, a); })],
  // the weird ones
  ['zigzag', 'Zigzag wall', 'end', () => Array.from({ length: 8 }, (_, i) => panel(F - 10.6 + (i % 2) * 1.2, -13.1 + i * 3.75, 3.9, 8, 3, i % 2 ? -0.55 : 0.55))],
  ['fan', 'Peacock fan', 'end', () => Array.from({ length: 11 }, (_, i) => { const a = -1.15 + (i / 10) * 2.3; return panel(F - 15 + Math.cos(a) * 7.5, Math.sin(a) * 9.5, 2.6, 4 + 7 * Math.cos(a * 0.9) ** 2, 2.4, a * 0.7); })],
  ['shards', 'Shards', 'end', () => [[-12, 3, 2.6, 5, 0.6], [-8.5, 7.5, 3.4, 3.4, -0.4], [-4, 3.6, 2.2, 7.4, 0.35], [-0.5, 8.6, 4.2, 2.6, -0.2], [3, 2.8, 2.8, 5.6, -0.6], [6.8, 7, 2.4, 4.2, 0.5], [10.6, 3.8, 3.2, 4.6, -0.35], [1.4, 4.4, 1.6, 3.2, 0.7], [-6.2, 11.2, 3, 1.8, 0.25]]
    .map(([z, y, w, h, f], i) => panel(F - 5 - (i % 3) * 2.4, z, w, h, y, f))],
  ['portal', 'Portal frame', 'end', () => [panel(F - 9.8, -13.8, 2.4, 11, 2.4, 0.2), panel(F - 9.8, 13.8, 2.4, 11, 2.4, -0.2), panel(F - 9.8, 0, 30, 1.8, 13, 0),
    panel(F - 7.6, -10.6, 1.2, 8, 3.2, 0.3), panel(F - 7.6, 10.6, 1.2, 8, 3.2, -0.3), panel(F - 7.6, 0, 22.4, 1, 11.4, 0)]],
  ['checker', 'Checkerboard', 'end', () => [0, 1, 2, 3, 4, 5, 6, 7].flatMap((c) => [0, 1, 2, 3].filter((r) => (r + c) % 2 === 0).map((r) => panel(F - 10.2, -12.25 + c * 3.5, 3.3, 2.3, 2.8 + r * 2.4, 0)))],
  ['towers', 'Twisting towers', 'end', () => [-10, 10].flatMap((z) => [0, 1, 2, 3, 4].map((k) => panel(F - 6, z, 3.6, 2.2, 2.4 + k * 2.4, (z < 0 ? 0.2 : -0.2) + (k - 2) * 0.28 * Math.sign(z))))],
  ['blades', 'Louvre blades', 'end', () => Array.from({ length: 13 }, (_, i) => panel(F - 6 - (i % 2) * 2, -12 + i * 2, 1, 8 + (i % 3), 2.6, 0.75))],
  ['skyline', 'Skyline', 'end', () => [6.5, 9, 4.6, 11, 7.6, 10, 5.2, 8.4, 11.4, 6, 8].map((h, i) => panel(F - 11.8 + (i % 2) * 0.4, -13.75 + i * 2.75, 2.65, h, 2.4, 0))],
  ['ladders', 'LED ladders', 'end', () => [-7.5, 7.5, -16, 16].flatMap((z) => [0, 1, 2, 3, 4, 5, 6].map((k) => panel(F - (Math.abs(z) > 10 ? 3 : 7), z, 3, 0.5, 3 + k * 1.6, z < 0 ? 0.25 : -0.25)))],
  ['runway', 'Runway screens', 'end', () => [0, 1, 2, 3].flatMap((k) => [panel(F + 3.4 + k * 3.4, -1.5, 3, 0.7, 0.25, -PI / 2), panel(F + 3.4 + k * 3.4, 1.5, 3, 0.7, 0.25, PI / 2)])],
  ['banners', 'Hanging banners', 'any', () => [-6, 0, 6, 12].flatMap((x) => [panel(x, -13.6, 1.6, 5.4, 6.6, PI / 2), panel(x, 13.6, 1.6, 5.4, 6.6, -PI / 2)])],
  ['crown', 'Crown', 'round', () => Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * TAU; return panel(Math.cos(a) * 10.2, Math.sin(a) * 10.2, 3.6, i % 2 ? 2.4 : 4.6, 6.6, a); })],
  ['pods', 'Corner pods', 'round', () => [[16, 10], [16, -10], [-16, 10], [-16, -10]].flatMap(([x, z]) => cube(x, z, 7, 3))],
  ['spokes', 'Spoke screens', 'round', () => [0, PI / 2, PI, -PI / 2].flatMap((a) => [11, 14.5].flatMap((r) => [-1, 1].map((sd) => panel(Math.cos(a) * r - Math.sin(a) * sd * 1.6, Math.sin(a) * r + Math.cos(a) * sd * 1.6, 3, 0.7, 0.2, a + sd * PI / 2))))],
  ['petals', 'Petals', 'round', () => Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU; return panel(Math.cos(a) * 9.6, Math.sin(a) * 9.6, 4.6, 3.4, 7.8, a + 0.5); })],
];

// --- a whole plan: the concept, the rig style, the screen add-ons ------------------------------------------
export function makePlan(conceptId, styleId = 'standard', addons = []) {
  const C = CONCEPTS.find((c) => c[0] === conceptId) || CONCEPTS[0];
  const S = (RIG_STYLES.find((s) => s[0] === styleId) || RIG_STYLES[0])[2];
  const p = C[3](S.level);
  const kind = C[2];
  const screens = [...(p.screens || []), ...SCREEN_ADDONS.filter((a) => addons.includes(a[0]) && (a[2] === 'any' || a[2] === kind)).flatMap((a) => a[3]())];
  const trusses = p.trusses || [];
  return {
    cfg: p.cfg,
    plan: {
      name: `${C[1]} · ${styleId} · ${addons.join('+') || 'no add-ons'}`, version: 2, ring: !!p.ring,
      trusses, fixtures: trusses.flatMap((t, i) => fill(t, i % 2 && S.mix.length > 2 ? [...S.mix.slice(1), S.mix[0]] : S.mix)),
      fx: p.fx || [], speakers: p.speakers || [], barricades: p.barricades || [], stages: p.stages || [], screens,
    },
    kind,
  };
}

// CREATIVE STAGE MOMENTS: one effect, one moment, one tap. Each tab is an effect (pyro, the
// stadium's fireworks, flames, confetti, balloons, drones, bubbles and smoke) and each of its tiles
// a moment built round it, with a character of its own: its timing, its colours, its rhythm, where
// it fires from. The tab's AMOUNT slider says how much of the effect a moment uses (how many drones,
// balloons, launch points, nozzles...). A tab is a layer: a moment cuts its own tab's last one and
// leaves the others' alone, so a drone show can fly over a pyro moment. COMBOS: a few moments that
// are several effects together, with the big words on the screens (GOAL!, HAPPY BIRTHDAY, 3·2·1).
// The room starts quiet (the rig out, the screens black, the wristbands dark, nothing firing) and a
// combo goes back to it when it ends; the wristbands join in only when Settings → Wristbands is on.
// createMomentsPlayer is the moments themselves, with no page of their own: the phone app (buildApp)
// and the desktop's hub fire the very same ones.
import * as T from './thumbs.js';
import { createMessageScreen } from './message.js';
import { previewPoints } from '../droneshapes.js';

const TEAM = ['#ff1430', '#1e5aff', '#ffffff', '#ffd24a', '#00c853', '#ff7a00', '#8a2bff', '#00e5ff', '#ff2bd6'];
const PARTY = ['#ff1430', '#ffe600', '#1e5aff', '#00ff6a', '#ff2bd6', '#ff7a00'];
const GOLD = ['#ffd24a', '#f0f0f6', '#ffe08a', '#d9d9e3'];
const PASTEL = ['#ffb3de', '#b3f0ff', '#d6b3ff', '#fff3a8', '#b8ffcf'];
const LOVE = ['#ff1430', '#ff2bd6', '#ffffff'];
const NEON = ['#39ff5e', '#ff2fd4', '#2fd4ff', '#ffe22f'];
const WHITE = ['#ffffff'];
const SMOKE = '#d9e0f2';   // the smoke's own colour
const KEY = 'pm-moments-2';

// --- the amounts: what each tab's slider counts, its range, and what it says ------------------
const AMT = {
  pyro: { min: 15, max: 100, step: 5, def: 70, label: (v) => `Pyro: ${v}%` },           // of the launch points, each volley
  fireworks: { min: 2, max: 28, step: 1, def: 14, label: (v) => `Racks: ${v}` },         // mortar racks round the bowl
  flames: { min: 1, max: 8, step: 1, def: 8, label: (v) => `Nozzles: ${v}` },            // along the stage lip
  confetti: { min: 10, max: 100, step: 5, def: 70, label: (v) => `Paper: ${v}%` },       // the paper's density
  balloons: { min: 40, max: 420, step: 20, def: 280, label: (v) => `Balloons: ${v}` },   // per drop (beach balls: a tenth)
  drones: { min: 36, max: 360, step: 12, def: 240, label: (v) => `Drones: ${v}` },
  air: { min: 10, max: 100, step: 5, def: 60, label: (v) => `Amount: ${v}%` },           // bubble and smoke rate, fog, CO2 blasts
};
const TABS = [['pyro', 'Pyro'], ['fireworks', 'Fireworks'], ['flames', 'Flames'], ['confetti', 'Confetti'], ['balloons', 'Balloons'],
  ['drones', 'Drones'], ['air', 'Bubbles & smoke'], ['combos', 'Combos']];

// a fresh visit: the night's colours and name, the wristbands off, every amount at its default
export function defaultMomentsState() {
  return { a: '#ff1430', b: '#ffffff', name: 'PIXMOB', crowd: false, amounts: Object.fromEntries(Object.entries(AMT).map(([k, A]) => [k, A.def])), fired: [], last: null };
}

// --- a colour to the nearest one an effect can do -------------------------------------------------
const hueOf = (hex) => {
  const c = parseInt(String(hex).slice(1), 16) || 0, r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  if (!mx || d < 0.25 * mx) return -1;   // white or grey
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const nearest = (hex, table, grey) => {
  const h = hueOf(hex);
  if (h < 0) return grey;
  let best = grey, bd = 1e9;
  for (const [key, hh] of table) { const d = Math.min(Math.abs(h - hh), 360 - Math.abs(h - hh)); if (d < bd) { bd = d; best = key; } }
  return best;
};
const pyroPal = (hex) => nearest(hex, [[0, 40], [1, 84], [2, 133], [3, 183], [4, 232], [5, 281], [6, 331]], 7);   // pyrofx's shells (7: silver)
const fwCol = (hex) => nearest(hex, [['red', 2], ['orange', 25], ['gold', 42], ['lime', 85], ['green', 128], ['cyan', 187], ['blue', 220], ['purple', 285], ['pink', 322]], 'white');
const flameMode = (hex) => nearest(hex, [['red', 8], ['gold', 40], ['green', 115], ['blue', 215], ['purple', 285]], 'gold');
const FLAMEHEX = { gold: '#ff9a1a', red: '#ff3a1a', blue: '#3a8cff', green: '#3cff6a', purple: '#c060ff' };
const FWHEX = { red: '#ff3b30', gold: '#ffc84a', green: '#3cff6a', blue: '#4a8cff', purple: '#c060ff', silver: '#e8ecff', orange: '#ff8a20', pink: '#ff5cc8', cyan: '#3ce8ff', lime: '#b8ff3a', white: '#ffffff', amber: '#ffa830' };
const FWDEF = { peony: '#ff5cc8', chrys: '#ffc84a', willow: '#ffc84a', kamuro: '#ffc84a', horsetail: '#e8ecff', dahlia: '#ff3b30', change: '#4a8cff', ring: '#3ce8ff', strobe: '#ffffff', salute: '#ffffff', heart: '#ff3b30' };
const FWSTYLE = { willow: 'willow', kamuro: 'willow', horsetail: 'willow', ring: 'ring', saturn: 'ring', heart: 'heart', salute: 'salute', strobe: 'salute' };
// the pyro's looks: the shell type (0 peony, 1 willow, 2 ring, 3 crackle) and palette (0 gold, -2 rainbow, 7 silver)
const LOOK = { classic: { type: -1, pal: -1 }, gold: { type: 0, pal: 0 }, willow: { type: 1, pal: 0 }, rings: { type: 2, pal: -1 }, crackle: { type: 3, pal: 7 }, rainbow: { type: 0, pal: -2 } };
const SPOTS = { centre: [0, 0.2, 0], stage: [-23, 2.2, 0], bstage: [-3, 1.6, 0] };
// n of N spread evenly and symmetrically (the nozzles along the lip, the racks round the bowl)
const spread = (n, N) => { const c = (N - 1) / 2; return [...new Set(Array.from({ length: Math.max(1, Math.min(N, n)) }, (_, i) => { const x = ((i + 0.5) * N) / Math.max(1, Math.min(N, n)) - 0.5; return Math.round(x + (x < c ? -1e-6 : 1e-6)); }))]; };
const ease = (x) => x * x * (3 - 2 * x);
const val = (v) => (typeof v === 'function' ? v() : v);

// =================================================================================================
// THE PLAYER: the moments, headless. state is read live ({ a, b, name, crowd, amounts, fired, last },
// as capture() gives it); fire(id) records it there. No page, no storage: buildApp does those.
export function createMomentsPlayer(eng, state, { onFire } = {}) {
  const S = state;
  const { rigFX, pyroFX, arenaFX, smokeFX, balloonFX, orbFX, showUI, THREE } = eng;
  let spUsed = false;
  const SP = () => { spUsed = true; return eng.spectacle; };
  const FW = eng.IS_STADIUM && eng.fireworks?.fireShell && eng.fireworks.sites?.length ? eng.fireworks : null;
  const NF = FW ? FW.sites.length : AMT.fireworks.max, NZ = pyroFX.flameCount || AMT.flames.max;
  const A = { ...AMT, fireworks: { ...AMT.fireworks, max: NF, def: Math.round(NF / 2) }, flames: { ...AMT.flames, max: NZ, def: NZ } };
  const units = (tab) => { const a = A[tab], v = Number(S.amounts?.[tab]); return Math.max(a.min, Math.min(a.max, Number.isFinite(v) ? Math.round(v) : a.def)); };
  const k = (tab) => units(tab) / A[tab].max;   // 0..1: of the most the effect can do
  const team = () => [S.a || '#ff1430', S.b || '#ffffff'];
  const NAME = () => String(S.name || '').trim().toUpperCase();
  const nameOr = (fallback) => () => NAME() || fallback;

  // --- the effects, as the moments use them --------------------------------------------------------
  const volley = (frac, look) => pyroFX.firePyro(Math.max(0.06, Math.min(1, frac)), look);
  const pk = () => k('pyro');
  const nozzles = () => spread(units('flames'), NZ);
  const flames = {
    start: (mode) => { pyroFX.setFlameMode(mode); if (pyroFX.setFlameNozzles) { pyroFX.setFlameNozzles([]); pyroFX.setFlames(true); } },
    show: (list) => (pyroFX.setFlameNozzles ? pyroFX.setFlameNozzles(list) : pyroFX.setFlames(list.length > 0)),
    stop: () => { pyroFX.setFlames(false); pyroFX.setFlameNozzles?.(null); },
  };
  const paper = () => {
    const v = units('confetti') / 100;
    if (eng.confettiAmount) eng.confettiAmount(v);
    else { pyroFX.setConfettiDensity?.(v); arenaFX.setConfettiDensity?.(v); const u = rigFX.confetti?.mesh?.material?.uniforms; if (u?.uDensity) u.uDensity.value = v; }
  };
  const cannons = () => { paper(); rigFX.fireConfetti(); };
  const floor = () => { paper(); arenaFX.firePoppers(); };
  const poppers = () => { paper(); pyroFX.firePoppers(); };
  const streamers = () => pyroFX.fireStreamers();
  const drop = (n, pal, wave = 0) => SP().balloonDrop({ count: Math.max(1, Math.round(n)), pal, wave });
  const beachN = () => Math.max(4, Math.round(units('balloons') / 420 * 40));
  let beachWas = null;
  const beachOn = (mode) => {
    if (!beachWas) beachWas = { count: balloonFX.state?.count ?? 26, mode: balloonFX.state?.mode ?? 'mix' };
    balloonFX.setMode?.(mode); balloonFX.setCount?.(beachN()); balloonFX.setOn(true);
  };
  const beachOff = () => { if (!beachWas) return; balloonFX.setOn(false); balloonFX.setCount?.(beachWas.count); balloonFX.setMode?.(beachWas.mode); beachWas = null; };
  const R = (o) => ({ ...o, pal: val(o.pal) || team(), word: val(o.word) || null });   // a formation, its colours read now
  const fly = (o) => SP().droneShow({ ...R(o), count: units('drones') });
  const land = () => { if (spUsed) eng.spectacle.droneLand(); };
  const airRate = (lo, hi) => lo + (hi - lo) * k('air');
  const bubbles = (from, seconds, rate, size) => SP().bubbleBurst({ from, seconds, rate, ...(size ? { size } : {}) });
  const smoke = (where, seconds, tint = SMOKE) => SP().smokeDrop({ where, seconds, rate: airRate(40, 300), tint });
  // the fog: as thick as the amount, then (once it has faded) back to the thickness it had
  let fogWas = null, fogT = 0;
  const fogOn = () => { clearTimeout(fogT); if (fogWas == null) fogWas = smokeFX.state?.fogDensity ?? 0.5; smokeFX.setFogDensity?.(0.15 + 0.85 * k('air')); smokeFX.setFog(true); };
  const fogOff = () => { if (fogWas == null) return; smokeFX.setFog(false); clearTimeout(fogT); fogT = setTimeout(() => { smokeFX.setFogDensity?.(fogWas); fogWas = null; }, 2500); };

  // --- the room: the wristbands, the screens, the lights ----------------------------------------------
  const crowd = (kind, text) => {
    if (!S.crowd || !showUI) return;
    const [a, b] = team();
    showUI.setBrand?.({ a, b, rainbow: false });
    if (kind === 'message') { showUI.setText?.({ str: val(text) || NAME() || 'GO!', a: '#ffffff' }); showUI.playDemo?.('message'); return; }
    showUI.playDemo?.(kind);
  };
  const wristOff = () => orbFX.set({ mode: 'off' });
  let MS = null, msgT = 0, black = null;
  const dark = () => {   // the screens black (not handed back to the room's film)
    if (!black) { black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); black.needsUpdate = true; }
    eng.setScreens?.({ wall: black, b: black });
  };
  // big words on the wall, the B-stage and the jumbotron, for a while
  const msg = (main, sub = '', style = 'flash', secs = 4) => {
    MS = MS || createMessageScreen(THREE);
    MS.show({ main: val(main), sub: val(sub), style, cols: team() });
    eng.setScreens?.({ wall: MS.tex, b: MS.tex }); eng.jumbo?.(MS.tex);
    clearTimeout(msgT); msgT = setTimeout(msgOff, secs * 1000);
  };
  function msgOff() { clearTimeout(msgT); if (!MS?.up) return; MS.hide(); dark(); eng.jumbo?.(null); }
  const look = (cue) => { rigFX.cue(cue); rigFX.colorA?.set?.(S.a); rigFX.colorB?.set?.(S.b); };
  const house = (mode) => eng.setLighting?.(mode);   // 'blackout' (house down), 'game', 'house'
  const spot = (where) => eng.followSpot?.(SPOTS[where] || where || null);
  // quiet: the rig out, the wristbands dark, the house lights as for a game, no follow spot, the screens black
  function rest() { msgOff(); rigFX.cue('blackout'); wristOff(); house('game'); eng.followSpot?.(null); dark(); }

  // --- the layers: one per tab, each with its own timers ----------------------------------------------
  const layers = {};
  const busy = () => Object.values(layers).some((l) => l.until > performance.now());
  // what a moment may leave on, switched off when it ends or is cut (a combo, when it's cut)
  const END = { flames: () => flames.stop(), balloons: beachOff, air: fogOff, combos: () => { flames.stop(); beachOff(); fogOff(); } };
  function cut(tab) {
    const l = layers[tab];
    if (!l) return;
    for (const id of l.timers) clearTimeout(id);
    l.timers.clear();
    if (l.until > performance.now()) END[tab]?.();
    l.until = 0;
  }
  function stopAll() {
    for (const tab of Object.keys(layers)) cut(tab);
    pyroFX.setPyro?.(false); flames.stop(); smokeFX.setFog(false); smokeFX.setJets?.(false); beachOff(); balloonFX.setOn(false);
    FW?.setShow?.(false);
    if (spUsed) eng.spectacle.stop();
    rest();
  }

  // --- the moments ----------------------------------------------------------------------------------
  // { id, name, tab, secs, crowd (the wristbands' show while it runs), run(at), draw(g, w, h, t) }
  const list = [];
  const M = (tab, id, name, secs, crowdKind, run, draw) => list.push({ id, name, tab, secs, crowd: crowdKind, run, draw });

  // PYRO: the stage's launch points; one volley in the air at a time, so a moment's rhythm is its
  // volleys ~3 s apart, each with its own shell and colour (amount: how many points fire)
  const shellsN = () => Math.max(1, Math.round(pk() * 7));
  const pyroDraw = (style, cols, period = 3) => (g, w, h, t) => T.pyro(g, w, h, t, { style, cols: val(cols), n: shellsN(), period });
  M('pyro', 'p-salute', 'Gold salute', 5, 'goldrush', (at) => at(0, () => volley(pk(), LOOK.gold)), pyroDraw('peony', ['#ffd24a', '#fff3c4']));
  M('pyro', 'p-willows', 'Willow curtain', 10, 'glitter', (at) => { at(0, () => volley(pk(), LOOK.willow)); at(4.4, () => volley(pk(), LOOK.willow)); },
    pyroDraw('willow', ['#ffcf4a', '#ffa830'], 4.4));
  M('pyro', 'p-rings', 'Ring cascade', 11, 'pulsering', (at) => [3, 5, 7].forEach((pal, i) => at(i * 3.2, () => volley(pk() * 0.8, { type: 2, pal }))),
    (g, w, h, t) => T.pyro(g, w, h, t, { style: 'ring', cols: [['#3ce8ff'], ['#c060ff'], ['#e8ecff']][Math.floor(t / 3.2) % 3], n: shellsN(), period: 3.2 }));
  M('pyro', 'p-crackle', 'Crackle', 8, 'glitter', (at) => { at(0, () => volley(pk(), LOOK.crackle)); at(3.4, () => volley(pk() * 0.6, LOOK.crackle)); },
    pyroDraw('crackle', ['#e8ecff', '#fff7d6'], 3.4));
  M('pyro', 'p-rainbow', 'Rainbow row', 5, 'rainbow', (at) => at(0, () => volley(pk(), LOOK.rainbow)), pyroDraw('peony', ['rainbow']));
  M('pyro', 'p-team', 'Team colours', 11, 'teams', (at) => {
    at(0, () => volley(pk(), { type: 0, pal: pyroPal(team()[0]) }));
    at(3.4, () => volley(pk(), { type: 0, pal: pyroPal(team()[1]) }));
    at(6.8, () => volley(pk(), { type: 2, pal: pyroPal(team()[0]) }));
  }, pyroDraw('peony', team, 3.4));
  M('pyro', 'p-build', 'Build-up', 14, 'fireworks', (at) => [[0.25, LOOK.classic], [0.5, LOOK.rings], [0.75, LOOK.crackle], [1, LOOK.gold]].forEach(([f, lk], i) => at(i * 3.2, () => volley(pk() * f, lk))),
    (g, w, h, t) => { const st = Math.floor((t % 12.8) / 3.2); T.pyro(g, w, h, t, { style: ['peony', 'ring', 'crackle', 'peony'][st], cols: [['#ffb04a', '#3ce8ff', '#ff5cc8'], ['#c060ff', '#3ce8ff'], ['#e8ecff'], ['#ffd24a']][st], n: Math.max(1, Math.round((shellsN() * (st + 1)) / 4)), period: 3.2 }); });

  // FIREWORKS (the open-air venues): shells from the racks round the bowl. A plan is the shells,
  // { s (rack), type, cal (inches), c / c2 (colours), d (delay, s) }; the amount is how many racks
  const fwPlan = (id, name, secs, crowdKind, plan) => M('fireworks', id, name, secs, crowdKind,
    (at) => at(0, () => { for (const p of plan(spread(units('fireworks'), NF))) FW.fireShell(p.s, p.type, p.cal, p.c ?? null, p.c2 ?? null, p.d || 0); }),
    (g, w, h, t) => {
      const n = Math.max(2, Math.round((units('fireworks') / NF) * 8));
      T.sky(g, w, h, t, { period: secs, shells: plan(spread(n, 8)).map((p) => ({ x: 0.08 + 0.84 * (p.s / 7), at: p.d || 0, col: p.c ? FWHEX[p.c] : FWDEF[p.type] || '#ffc84a', style: FWSTYLE[p.type] || 'peony', big: (p.cal || 8) / 8 })) });
    });
  const FINALE = (R) => [
    ...R.map((s, j) => ({ s, type: j % 2 ? 'peony' : 'change', cal: 6, d: (j / R.length) * 0.9 })),
    ...R.map((s, j) => ({ s, type: j % 3 ? 'chrys' : 'ring', cal: 8, d: 1.2 + T.rnd(j) * 0.5 })),
    ...R.map((s, j) => ({ s, type: j % 2 ? 'dahlia' : 'strobe', cal: 10, d: 2.6 + T.rnd(j, 1) * 0.4 })),
    ...R.filter((_, j) => j % 4 === 0).map((s, j) => ({ s, type: 'willow', cal: 12, c: 'gold', c2: 'gold', d: 3.4 + T.rnd(j, 2) * 0.3 })),
    ...R.map((s, j) => ({ s, type: j % 2 ? 'salute' : 'kamuro', cal: j % 2 ? 8 : 10, d: 4.6 + T.rnd(j, 3) * 0.6 })),
  ];
  if (FW) {
    fwPlan('f-crown', 'Golden crown', 13, 'goldrush', (R) => R.map((s, j) => ({ s, type: 'kamuro', cal: 10, c: 'gold', d: T.rnd(j) * 0.15 })));
    fwPlan('f-chase', 'Ring chase', 13, 'comets', (R) => { const c = team().map(fwCol); return R.map((s, j) => ({ s, type: 'peony', cal: 8, c: c[j % 2], d: (j / R.length) * 4 })); });
    fwPlan('f-hearts', 'Hearts', 12, 'hearts', (R) => R.map((s, j) => ({ s, type: 'heart', cal: 8, c: j % 2 ? 'pink' : 'red', d: (j % 2) * 2.6 + T.rnd(j) * 0.3 })));
    fwPlan('f-willows', 'Willow rain', 16, 'goldrush', (R) => R.map((s, j) => ({ s, type: j % 3 === 2 ? 'horsetail' : 'willow', cal: j % 4 ? 10 : 12, c: j % 3 === 2 ? 'silver' : 'gold', d: (j / R.length) * 3 })));
    fwPlan('f-salvo', 'Salvo', 11, 'bigflash', (R) => [...R.map((s, j) => ({ s, type: j % 3 ? 'peony' : 'dahlia', cal: 10, d: T.rnd(j) * 0.1 })),
      ...R.filter((_, j) => j % 2).map((s, j) => ({ s, type: 'salute', cal: 8, d: 0.5 + T.rnd(j, 2) * 0.3 }))]);
    fwPlan('f-team', 'Team colours', 15, 'teams', (R) => { const [a, b] = team().map(fwCol); return [...R.map((s, j) => ({ s, type: 'peony', cal: 8, c: a, d: T.rnd(j) * 0.2 })),
      ...R.map((s, j) => ({ s, type: 'peony', cal: 8, c: b, d: 2.5 + T.rnd(j, 1) * 0.2 })), ...R.map((s, j) => ({ s, type: 'change', cal: 10, c: a, c2: b, d: 5 + T.rnd(j, 2) * 0.3 }))]; });
    fwPlan('f-finale', 'Sky finale', 16, 'fireworks', FINALE);
  }

  // FLAMES: the nozzles along the lip, one by one. A moment is its steps, [t, nozzles lit, colour?],
  // worked out from the nozzles the amount picks; the tile plays the same steps
  const flamePlan = (id, name, secs, crowdKind, mode, steps) => M('flames', id, name, secs, crowdKind,
    (at) => { flames.start(val(mode)); for (const [s, on, md] of steps(nozzles())) at(s, () => { if (md) pyroFX.setFlameMode(md); flames.show(on); }); at(secs - 0.4, flames.stop); },
    (g, w, h, t) => {
      const u = t % secs, st = steps(nozzles());
      let i = -1, md = val(mode);
      while (i + 1 < st.length && st[i + 1][0] <= u) { i++; if (st[i][2]) md = st[i][2]; }
      const on = i >= 0 && u < secs - 0.4 ? st[i][1] : [], prev = i > 0 ? st[i - 1][1] : [], since = i >= 0 ? u - st[i][0] : 0;
      T.flameRow(g, w, h, t, { n: NZ, rainbow: md === 'rainbow', col: FLAMEHEX[md] || FLAMEHEX.gold,
        lit: (n) => (on.includes(n) ? Math.min(1, 0.3 + since / 0.18) : prev.includes(n) && since < 0.35 ? 1 - since / 0.35 : 0) });
    });
  flamePlan('fl-blast', 'Flame blast', 4, 'inferno', 'gold', (sel) => [[0.05, sel], [1.5, []]]);
  flamePlan('fl-chase', 'Flame chase', 6, 'comets', 'red', (sel) => {
    const back = sel.slice().reverse(), run = [...sel, ...back.slice(1), ...sel.slice(1), ...back.slice(1)], dt = Math.min(0.5, 0.14 * Math.max(1, 4 / sel.length));
    return [...run.map((n, j) => [0.05 + j * dt, [n]]), [0.05 + run.length * dt, []]];
  });
  flamePlan('fl-heartbeat', 'Heartbeat', 8, 'heartbeat', 'red', (sel) => [0, 1.7, 3.4, 5.1].flatMap((b) => [[b + 0.05, sel], [b + 0.27, []], [b + 0.47, sel], [b + 0.69, []]]));
  flamePlan('fl-wings', 'Open the wings', 8, 'icecave', 'blue', (sel) => {
    const c = (NZ - 1) / 2, ring = (n) => Math.floor(Math.abs(n - c)), rings = [...new Set(sel.map(ring))].sort((a, b) => a - b);
    const cycle = (t0) => [...rings.map((r, q) => [t0 + q * 0.3, sel.filter((n) => ring(n) <= r)]),
      ...rings.map((r, q) => [t0 + 2 + q * 0.3, sel.filter((n) => ring(n) < rings[rings.length - 1 - q])])];
    return [...cycle(0.05), ...cycle(3.8)];
  });
  flamePlan('fl-alternate', 'Odd and even', 7, 'checker', 'green', (sel) => {
    const ev = sel.filter((_, j) => j % 2 === 0), od = sel.filter((_, j) => j % 2);
    return [...Array.from({ length: 10 }, (_, j) => [0.05 + j * 0.5, j % 2 ? od : ev]), [5.1, []]];
  });
  flamePlan('fl-rainbow', 'Rainbow wall', 6, 'rainbow', 'rainbow', (sel) => [[0.05, sel], [4.6, []]]);
  flamePlan('fl-team', 'Team flames', 8, 'teams', () => flameMode(team()[0]), (sel) => {
    const m = team().map(flameMode);
    return Array.from({ length: 6 }, (_, j) => [[0.05 + j * 1.1, sel, m[j % 2]], [0.6 + j * 1.1, []]]).flat();
  });

  // CONFETTI: the stage's big cannons, the floor cannons in the crowd, the poppers on the deck and
  // the streamers (amount: the paper's density)
  const paperN = () => Math.round(20 + k('confetti') * 90);
  const STAGE = [{ x: 0.1, y: 0.84, up: 0.5 }, { x: 0.9, y: 0.84, up: 0.5 }, { x: 0.37, y: 0.84, up: 0.45 }, { x: 0.63, y: 0.84, up: 0.45 }];
  const FLOOR = [0.22, 0.38, 0.5, 0.62, 0.78].map((x) => ({ x, y: 0.94, up: 0.75 }));
  M('confetti', 'c-cannons', 'Cannon blast', 8, 'confetti', (at) => at(0, cannons), (g, w, h, t) => T.confetti(g, w, h, t, { n: paperN() }));
  M('confetti', 'c-floor', 'Floor cannons', 8, 'confetti', (at) => at(0, floor), (g, w, h, t) => T.pops(g, w, h, t, { src: FLOOR, n: paperN() }));
  M('confetti', 'c-poppers', 'Stage poppers', 7, 'glitter', (at) => at(0, poppers), (g, w, h, t) => T.pops(g, w, h, t, { src: STAGE, n: paperN(), period: 3 }));
  M('confetti', 'c-streamers', 'Streamers', 9, 'ribbons', (at) => at(0, streamers), (g, w, h, t) => T.streamers(g, w, h, t));
  M('confetti', 'c-rolling', 'Rolling wave', 10, 'cascade', (at) => { at(0, poppers); at(0.7, floor); at(1.4, cannons); at(2.2, streamers); },
    (g, w, h, t) => T.pops(g, w, h, t, { period: 4.4, n: paperN() + 20, src: [...STAGE.slice(0, 2), ...FLOOR.map((s) => ({ ...s, d: 0.7 })), { x: 0.04, y: 0.6, up: 0.4, d: 1.4 }, { x: 0.96, y: 0.6, up: 0.4, d: 1.4 }] }));
  M('confetti', 'c-blizzard', 'Blizzard', 12, 'storm', (at) => { at(0, () => { cannons(); floor(); poppers(); }); at(0.3, streamers); },
    (g, w, h, t) => T.confetti(g, w, h, t, { from: 'drop', n: Math.round(paperN() * 1.6) }));
  M('confetti', 'c-ribbons', 'Ribbons, then pop', 9, 'ribbons', (at) => { at(0, streamers); at(1.4, poppers); },
    (g, w, h, t) => { T.streamers(g, w, h, t, { cols: ['#ffd24a', '#e8e8f0', '#ff2bd6'] }); T.pops(g, w, h, t, { src: STAGE.map((s) => ({ ...s, d: 1.4 })), n: paperN(), bg: false }); });

  // BALLOONS: the nets in the roof (amount: how many fall), and the balls that bob over the crowd
  const balloonsN = () => Math.round(6 + (units('balloons') / 420) * 34);
  const dropDraw = (cols, waves, period) => (g, w, h, t) => T.drop(g, w, h, t, { cols: val(cols), n: balloonsN(), waves, period });
  M('balloons', 'b-team', 'Team drop', 12, 'team', (at) => at(0, () => drop(units('balloons'), team())), dropDraw(team, [0], 8));
  M('balloons', 'b-gold', 'Gold and silver', 14, 'goldrush', (at) => at(0, () => { drop(units('balloons') / 2, GOLD, 0); drop(units('balloons') / 2, GOLD, 2.6); }), dropDraw(GOLD, [0, 2.6], 9));
  M('balloons', 'b-cascade', 'Rainbow cascade', 14, 'rainbow', (at) => at(0, () => [0, 1.6, 3.2].forEach((wv) => drop(units('balloons') / 3, PARTY, wv))), dropDraw(PARTY, [0, 1.6, 3.2], 9));
  M('balloons', 'b-trickle', 'Pastel trickle', 16, 'candy', (at) => at(0, () => { for (let i = 0; i < 8; i++) drop(units('balloons') / 8, PASTEL, i); }), dropDraw(PASTEL, [0, 1, 2, 3, 4, 5, 6, 7], 12));
  M('balloons', 'b-beach', 'Beach balls', 20, 'tropical', (at) => at(0, () => beachOn('classic')),
    (g, w, h, t) => T.balloons(g, w, h, t, { beach: true, n: Math.round(beachN() / 3), cols: ['#ff1430', '#ffe600', '#1e5aff', '#ffffff'] }));
  M('balloons', 'b-lanterns', 'Glow lanterns', 20, 'twinkle', (at) => at(0, () => beachOn('lantern')), (g, w, h, t) => T.lanterns(g, w, h, t, { n: Math.round(beachN() / 3) }));
  M('balloons', 'b-neon', 'Neon balls', 20, 'neon', (at) => at(0, () => beachOn('neon')), (g, w, h, t) => T.balloons(g, w, h, t, { beach: true, n: Math.round(beachN() / 3), cols: NEON }));

  // DRONES: a choreography is its formations in turn, [t, formation] then [t, 'land']; the tile
  // flies the same one, each formation morphing into the next (amount: how many drones fly)
  const dcol = (o) => {
    const pal = o.pal;
    if (o.colour === 'rainbow') return (i, t, u, v) => T.hsl((u + v) * 90 + t * 60);
    if (o.colour === 'solid') return () => pal[0];
    if (o.colour === 'sweep') return (i, t, u) => pal[Math.floor((((u + 1.2) * 1.5 + t * 1.5) % pal.length) + pal.length) % pal.length];
    if (o.colour === 'twinkle') return (i, t) => (Math.sin(i * 12.9898 + t * 6) > 0.92 ? '#ffffff' : pal[i % pal.length]);
    return (i) => pal[i % pal.length];
  };
  const pad = (j) => [((j % 20) / 19 - 0.5) * 1.7, -1.18, 0];
  const mix = (a, b, e) => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * e];
  const dronePlan = (tab, id, name, secs, crowdKind, seq) => M(tab, id, name, secs, crowdKind,
    (at) => { for (const [s, o] of seq) at(s, () => (o === 'land' ? land() : fly(o))); },
    (g, w, h, t) => {
      const n = Math.max(30, Math.min(150, Math.round(units('drones') / 2.4))), u = t % secs;
      const forms = seq.filter((s) => s[1] !== 'land'), landAt = seq.find((s) => s[1] === 'land')?.[0] ?? secs;
      let i = 0;
      while (i + 1 < forms.length && forms[i + 1][0] <= u) i++;
      const cur = R(forms[i][1]), pts = (o) => previewPoints(R(o), t, n);
      let P = pts(cur), col = dcol(cur);
      if (u >= landAt) { const e = ease(Math.min(1, (u - landAt) / 1.8)); P = P.map((p, j) => mix(p, pad(j), e)); if (e > 0.7) col = () => '#bfc3cc'; }
      else { const e = Math.min(1, (u - forms[i][0]) / 0.9); if (e < 1) { const B = i ? pts(forms[i - 1][1]) : P.map((_, j) => pad(j)); P = P.map((p, j) => mix(B[j], p, ease(e))); } }
      T.drones(g, w, h, t, { pts: P, col });
    });
  const D = (...a) => dronePlan('drones', ...a);
  D('d-takeoff', 'Take-off', 16, 'stars', [[0, { shape: 'grid', colour: 'solid', pal: WHITE }], [4, { shape: 'wave', colour: 'sweep' }], [9, { shape: 'ring', colour: 'split' }], [14, 'land']]);
  D('d-heart', 'Heart', 13, 'hearts', [[0, { shape: 'heart', colour: 'split', pal: LOVE }], [6, { word: 'LOVE', colour: 'split', pal: LOVE }], [11.5, 'land']]);
  D('d-name', 'The name', 13, 'message', [[0, { shape: 'sphere', colour: 'solid', pal: WHITE }], [3, { word: () => NAME().slice(0, 8) || 'PIXMOB', colour: 'sweep' }], [9, { shape: 'burst', colour: 'rainbow' }], [11.5, 'land']]);
  D('d-galaxy', 'Galaxy', 18, 'galaxy', [[0, { shape: 'galaxy', colour: 'rainbow' }], [6, { shape: 'spiral', colour: 'rainbow' }], [11, { shape: 'tornado', colour: 'rainbow' }], [16, 'land']]);
  D('d-planets', 'Planets', 15, 'stars', [[0, { shape: 'sphere', colour: 'twinkle', pal: ['#7ab8ff', '#ffffff'] }], [5, { shape: 'saturn', colour: 'split', pal: ['#ffd24a', '#8a2bff'] }], [13, 'land']]);
  D('d-bloom', 'Bloom', 15, 'candy', [[0, { shape: 'flower', colour: 'rainbow' }], [6, { shape: 'butterfly', colour: 'split', pal: ['#ff2bd6', '#00e5ff'] }], [13, 'land']]);
  D('d-crowd', 'Over the crowd', 18, 'twinkle', [[0, { shape: 'canopy', colour: 'twinkle' }], [6, { shape: 'flyover', colour: 'sweep' }], [11, { shape: 'comet', colour: 'split', pal: ['#ffffff', '#00e5ff'] }], [16, 'land']]);
  D('d-storm', 'Thunder', 13, 'storm', [[0, { shape: 'rain', colour: 'twinkle', pal: ['#00e5ff', '#ffffff'] }], [6, { shape: 'bolt', colour: 'solid', pal: ['#ffe600'] }], [11, 'land']]);
  D('d-geometry', 'Geometry', 19, 'matrix', [[0, { shape: 'cube', colour: 'split' }], [5, { shape: 'pyramid', colour: 'solid', pal: ['#ffd24a'] }], [10, { shape: 'torus', colour: 'split' }], [14, { shape: 'knot', colour: 'rainbow' }], [17, 'land']]);
  D('d-count', 'Countdown', 10, 'pulsering', [[0, { word: '3', colour: 'solid', pal: WHITE }], [1.3, { word: '2', colour: 'solid', pal: WHITE }], [2.6, { word: '1', colour: 'solid', pal: WHITE }], [3.9, { shape: 'burst', colour: 'rainbow' }], [8, 'land']]);
  D('d-team', 'Team colours', 14, 'teams', [[0, { shape: 'ring', colour: 'split' }], [4.5, { shape: 'star', colour: 'split' }], [9, { shape: 'crown', colour: 'sweep' }], [12, 'land']]);

  // BUBBLES & SMOKE: the bubble machines (the stage lip, the truss, the sides), smoke poured off the
  // truss, low fog, the CO2 cannons (amount: the rate, the fog's thickness, how many CO2 blasts)
  const ak = () => k('air');
  M('air', 'a-bubbles', 'Bubble wave', 11, 'softripple', (at) => at(0, () => bubbles(['stage'], 9, airRate(30, 300))), (g, w, h, t) => T.bubbles(g, w, h, t, { n: 6 + Math.round(ak() * 30) }));
  M('air', 'a-rain', 'Bubble rain', 13, 'rain', (at) => at(0, () => bubbles(['truss'], 11, airRate(20, 200), [0.14, 0.32])), (g, w, h, t) => T.bubbles(g, w, h, t, { from: 'truss', big: true, n: 4 + Math.round(ak() * 16) }));
  M('air', 'a-storm', 'Bubble storm', 10, 'ocean', (at) => at(0, () => bubbles(['stage', 'truss', 'sides'], 8, airRate(60, 500))), (g, w, h, t) => T.bubbles(g, w, h, t, { from: 'truss', n: 12 + Math.round(ak() * 40) }));
  M('air', 'a-curtain', 'Smoke curtain', 11, 'aurora', (at) => at(0, () => smoke('front', 6)), (g, w, h, t) => T.smoke(g, w, h, t));
  M('air', 'a-colour', 'Coloured smoke', 12, 'northern', (at) => at(0, () => smoke('cross', 7, team()[0])), (g, w, h, t) => T.smoke(g, w, h, t, { tint: team()[0] }));
  M('air', 'a-fog', 'Low fog', 16, 'deepsea', (at) => at(0, fogOn), (g, w, h, t) => T.smoke(g, w, h, t, { kind: 'fog' }));
  M('air', 'a-co2', 'CO2 blasts', 10, 'bigflash', (at) => { for (let i = 0; i <= Math.round(ak() * 3); i++) at(i * 2.4, () => smokeFX.fireJets()); }, (g, w, h, t) => T.smoke(g, w, h, t, { kind: 'jets' }));
  M('air', 'a-haunt', 'Haunted', 16, 'halloween', (at) => { at(0, fogOn); at(0.5, () => smoke('room', 8, '#9a6bff')); }, (g, w, h, t) => T.smoke(g, w, h, t, { kind: 'fog', tint: '#b48cff' }));

  // COMBOS: a few effects that belong together, the words on the screens, the lights and the
  // wristbands with them; each uses its effects' amounts, and the room goes quiet after
  const card = (label, { style = 'flash', fx = null } = {}) => (g, w, h, t) => {
    const [a, b] = team(), text = val(label);
    T.room(g, w, h, { truss: false });
    const x0 = w * 0.16, y0 = h * 0.08, sw = w * 0.68, sh = h * 0.42;
    g.fillStyle = style === 'flash' ? (Math.floor(t * 4) % 2 ? a : b) : '#05060c'; g.fillRect(x0, y0, sw, sh);
    if (style !== 'flash') { const gr = g.createRadialGradient(w / 2, y0 + sh / 2, 4, w / 2, y0 + sh / 2, sw * 0.6); gr.addColorStop(0, a); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.6; g.fillStyle = gr; g.fillRect(x0, y0, sw, sh); g.globalAlpha = 1; }
    let s = 30; g.font = `900 ${s}px Arial Black, Arial`; while (s > 9 && g.measureText(text).width > sw * 0.9) { s -= 2; g.font = `900 ${s}px Arial Black, Arial`; }
    const kk = style === 'pulse' ? 1 + 0.08 * Math.max(0, Math.sin(t * 8)) : 1;
    g.save(); g.translate(w / 2, y0 + sh / 2); g.scale(kk, kk); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = style === 'flash' ? (Math.floor(t * 4) % 2 ? b : a) : '#fff'; g.fillText(text, 0, 1); g.restore();
    g.strokeStyle = '#2a2c34'; g.lineWidth = 2; g.strokeRect(x0, y0, sw, sh);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 26; i++) {   // the crowd, in the team's colours
      const x = w * (0.06 + i * 0.034) + (r % 2) * 3, y = h * (0.6 + r * 0.07), on = Math.sin(t * 4 - i * 0.5 + r) > -0.2;
      g.fillStyle = on ? (i % 2 ? a : b) : '#1a1b22'; g.fillRect(x, y, 3, 3);
    }
    fx?.(g, w, h, t);
  };
  const conf = (g, w, h, t) => { for (let i = 0; i < 30; i++) { const ph = (t * 0.4 + T.rnd(i)) % 1; g.fillStyle = PARTY[i % 6]; g.fillRect(w * T.rnd(i, 1), ph * h * 0.9, 3, 2); } };
  const ball = (cols) => (g, w, h, t) => { for (let i = 0; i < 16; i++) { const ph = (t * 0.25 + T.rnd(i)) % 1; g.fillStyle = cols[i % cols.length]; g.beginPath(); g.ellipse(w * T.rnd(i, 2), ph * h * 0.85, 4, 5, 0, 0, T.TAU); g.fill(); } };
  const burst = (g, w, h, t) => { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { const a = (i / 18) * T.TAU, r = ((t * 0.8) % 1) * w * 0.12; g.fillStyle = T.hsl(i * 20 + t * 50); g.fillRect(w * 0.5 + Math.cos(a) * r, h * 0.3 + Math.sin(a) * r, 2, 2); } };
  const tongues = (g, w, h, t) => { g.globalCompositeOperation = 'lighter'; if (Math.floor(t * 1.5) % 2) return; for (let i = 0; i < 6; i++) { const x = w * (0.12 + i * 0.152), fh = h * (0.22 + 0.08 * Math.sin(t * 9 + i)); const gr = g.createLinearGradient(x, h * 0.84, x, h * 0.84 - fh); gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, '#ff8a1a'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 4, h * 0.84 - fh, 8, fh); } };
  const bub = (g, w, h, t) => { for (let i = 0; i < 12; i++) { const ph = (t * 0.15 + T.rnd(i)) % 1, x = w * 0.08 + ph * w * 0.86, y = h * (0.7 - 0.5 * T.rnd(i, 3)) + Math.sin(t * 1.5 + i) * 5; g.strokeStyle = T.hsl(t * 40 + i * 30, 70); g.lineWidth = 1; g.beginPath(); g.arc(x, y, 3 + T.rnd(i, 1) * 4, 0, T.TAU); g.stroke(); } };
  const C = (id, name, secs, run, draw) => M('combos', id, name, secs, null, run, draw);
  // flames running along the lip from one end and back, then all of them: an entrance
  const flameRun = (at, t0) => { const sel = nozzles(), run = [...sel, ...sel.slice().reverse().slice(1)]; at(t0 - 0.1, () => flames.start('gold')); run.forEach((n, j) => at(t0 + j * 0.12, () => flames.show([n]))); at(t0 + run.length * 0.12 + 0.2, () => flames.show(sel)); at(t0 + run.length * 0.12 + 1.4, flames.stop); };

  C('goal', 'Goal!', 10, (at) => {
    at(0, () => { look('drop'); crowd('strobe'); msg('GOAL!', nameOr('SCORES!'), 'flash', 7); });
    at(0.2, () => smokeFX.fireJets()); at(0.3, floor); at(0.6, cannons);
    at(1.6, () => crowd('message', 'GOAL!')); at(4, () => look('ballyhoo')); at(5, () => crowd('team'));
  }, card('GOAL!', { fx: conf }));
  C('birthday', 'Birthday', 14, (at) => {
    at(0, () => { look('ballad'); msg('HAPPY BIRTHDAY', NAME, 'hearts', 13); crowd('message', 'HAPPY BIRTHDAY'); });
    at(0.5, () => { drop(units('balloons') * 0.6, PASTEL, 0); drop(units('balloons') * 0.4, PASTEL, 2.5); });
    at(6, () => crowd('candy'));
  }, card('HAPPY BDAY', { style: 'hearts', fx: ball(PASTEL) }));
  C('newyear', 'New Year', 16, (at) => {
    at(0, () => { house('blackout'); look('blackout'); });
    [3, 2, 1].forEach((n, i) => at(i * 1.4, () => { msg(String(n), '', 'count', 1.4); crowd('message', String(n)); }));
    // the shells go up during the count (a four-second climb) so they break on the stroke of midnight
    if (FW) at(0, () => { for (const p of FINALE(spread(units('fireworks'), NF))) FW.fireShell(p.s, p.type, p.cal, p.c ?? null, p.c2 ?? null, p.d * 0.6); });
    else { at(4.2, () => volley(pk(), LOOK.gold)); at(7.6, () => volley(pk(), LOOK.rainbow)); at(11, () => volley(pk(), LOOK.crackle)); }
    at(4.2, () => { msg('HAPPY NEW YEAR', NAME, 'flash', 10); look('full'); house('game'); crowd('fireworks'); cannons(); floor(); });
    at(4.6, streamers);
  }, card('HAPPY NEW YEAR', { fx: conf }));
  C('proposal', 'Proposal', 16, (at) => {
    at(0, () => { house('blackout'); look('blackout'); spot('centre'); crowd('hearts'); });
    at(0.5, () => msg('WILL YOU MARRY ME?', NAME, 'hearts', 8.5));
    at(1, () => fly({ shape: 'heart', colour: 'split', pal: LOVE }));
    at(9, () => { msg('SHE SAID YES!', '', 'flash', 6); fly({ word: 'YES', colour: 'split', pal: LOVE }); look('anthem'); house('game'); crowd('valentine'); });
    at(14.5, land);
  }, card('MARRY ME?', { style: 'hearts' }));
  C('champions', 'Champions', 15, (at) => {
    at(0, () => { msg('CHAMPIONS', NAME, 'flash', 13); look('full'); crowd('goldrush'); });
    at(0.3, () => drop(units('balloons'), GOLD)); at(0.5, streamers);
    at(1, () => volley(pk(), LOOK.gold)); at(4.6, () => volley(pk(), LOOK.willow)); at(6, cannons);
  }, card('CHAMPIONS', { fx: ball(GOLD) }));
  C('intro', 'Player intro', 15, (at) => {
    at(0, () => { house('blackout'); look('blackout'); crowd('blackout'); });
    at(0.5, () => { msg('STARTING LINEUP', '', 'glow', 4); spot('centre'); smoke('front', 5); });
    at(2, () => crowd('wave'));
    at(4.5, () => { msg(nameOr('YOUR TEAM'), 'HERE THEY COME', 'pulse', 9); crowd('message'); });
    flameRun(at, 4.6);
    at(6.6, () => look('ballyhoo')); at(8, () => house('game')); at(10, () => crowd('team'));
  }, card('LINEUP', { style: 'glow', fx: tongues }));
  C('kisscam', 'Kiss cam', 12, (at) => {
    at(0, () => { msg('KISS CAM', '', 'hearts', 11); look('ballad'); crowd('hearts'); });
    at(0.5, () => bubbles(['stage', 'truss'], 10, airRate(30, 260)));
  }, card('KISS CAM', { style: 'hearts', fx: bub }));
  C('opener', 'Show opener', 15, (at) => {
    at(0, () => { house('blackout'); look('intro'); smoke('front', 6); });
    at(0.5, () => msg('WELCOME', NAME, 'glow', 6)); at(1, () => crowd('wave'));
    at(5.8, () => flames.start('gold')); at(6, () => flames.show(nozzles())); at(7.4, flames.stop);
    at(6.2, () => volley(pk(), LOOK.willow));
    at(6.4, () => { look('full'); house('game'); crowd('rainbow'); });
    at(9.6, () => volley(pk(), LOOK.gold));
  }, card('WELCOME', { style: 'glow', fx: burst }));

  // --- firing ---------------------------------------------------------------------------------------
  const BY = Object.fromEntries(list.map((m) => [m.id, m]));
  function fire(id) {
    const m = BY[id];
    if (!m) return false;
    if (m.tab === 'combos') stopAll(); else cut(m.tab);
    const l = layers[m.tab] || (layers[m.tab] = { timers: new Set(), until: 0 });
    const at = (s, fn) => { const t = setTimeout(() => { l.timers.delete(t); fn(); }, s * 1000); l.timers.add(t); };
    l.until = performance.now() + m.secs * 1000;
    if (m.crowd) crowd(m.crowd);
    m.run(at);
    at(m.secs, () => {
      l.until = 0;
      if (m.tab === 'combos') { rest(); return; }   // (its flames have gone out already)
      END[m.tab]?.();
      if (S.crowd && m.crowd && !busy()) wristOff();   // the wristbands rest once nothing else plays
    });
    // what was fired this visit: oldest first, each once (at its latest), the last 12
    S.fired = [...(Array.isArray(S.fired) ? S.fired : []).filter((x) => x !== id), id].slice(-12);
    S.last = id;
    onFire?.(id);
    return true;
  }
  const tabs = TABS.filter(([id]) => list.some((m) => m.tab === id)).map(([id, name]) => ({ id, name, amount: A[id] ? { min: A[id].min, max: A[id].max, step: A[id].step, label: A[id].label } : null }));
  return {
    tabs,   // [{ id, name, amount: { min, max, step, label(v) } | null }]
    list: list.map(({ id, name, tab, secs, draw }) => ({ id, name, tab, secs, draw })),
    fire, stopAll, rest,
    amount: units,   // a tab's amount, in its own units (drones, balloons, %...)
    setAmount(tab, v) { if (!A[tab]) return; S.amounts = { ...(S.amounts || {}), [tab]: Math.max(A[tab].min, Math.min(A[tab].max, Math.round(Number(v)))) }; },
    amountLabel: (tab) => A[tab]?.label(units(tab)) ?? '',
    capture: () => ({
      a: S.a, b: S.b, name: String(S.name ?? ''), crowd: !!S.crowd,
      amounts: Object.fromEntries(Object.keys(AMT).map((t) => [t, units(t)])),
      fired: (Array.isArray(S.fired) ? S.fired : []).filter((x) => typeof x === 'string').slice(-12), last: S.last ?? null,
    }),
  };
}

// =================================================================================================
// THE PHONE APP: the player's moments as a deck, the visit's state in sessionStorage
export function buildApp(eng) {
  const { orbFX } = eng;
  const S = defaultMomentsState();
  try {
    const o = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    Object.assign(S, o, { amounts: { ...S.amounts, ...(o.amounts || {}) }, fired: Array.isArray(o.fired) ? o.fired : [] });
  } catch (_) { /* private mode */ }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (_) { /* private mode */ } };
  const P = createMomentsPlayer(eng, S, { onFire: save });
  // the room starts quiet: nothing firing, the rig out, the screens black, the wristbands dark
  eng.setStageFollow?.(false);
  P.stopAll();

  const colour = (label, key) => ({ type: 'colors', label, list: TEAM, get value() { return S[key]; }, change: (v) => { S[key] = v; save(); } });
  const c1 = colour('Colour 1', 'a'), c2 = colour('Colour 2', 'b');
  const name = { type: 'text', label: 'Name', get value() { return S.name; }, input: (v) => { S.name = v; save(); } };
  const venue = { type: 'choice', label: 'Venue', options: [['concert', 'Concert'], ['hockey', 'Hockey'], ['basketball', 'Court']],
    get value() { return eng.mode; }, change: (m) => eng.builder?.setState({ mode: m }) };
  const amount = (tb) => ({ type: 'slider', get label() { return P.amountLabel(tb.id); }, min: tb.amount.min, max: tb.amount.max, step: tb.amount.step,
    get value() { return P.amount(tb.id); }, input: (v) => { P.setAmount(tb.id, v); save(); } });
  const extra = { pyro: [c1, c2], fireworks: [c1, c2], flames: [c1, c2], balloons: [c1, c2], drones: [c1, c2, name], air: [c1], combos: [c1, c2, name, venue] };

  return {
    title: 'Moments',
    button: 'MOMENTS',
    tabs: P.tabs.map((tb) => ({
      id: tb.id, name: tb.name,
      tiles: P.list.filter((m) => m.tab === tb.id).map((m) => ({ id: m.id, name: m.name, once: m.secs, draw: m.draw, play: () => P.fire(m.id) })),
      controls: [...(tb.amount ? [amount(tb)] : []), ...(extra[tb.id] || [])],
    })),
    controls: [{ type: 'button', label: 'Stop everything', click: P.stopAll }],
    crowdSync: {
      label: 'Wristbands', sub: 'The crowd joins in every moment',
      get on() { return S.crowd; },
      set(v) { S.crowd = !!v; save(); if (!S.crowd) orbFX.set({ mode: 'off' }); },
    },
    // the export: the night's colours, name and amounts, and the moments fired this visit
    concept: {
      capture: () => P.capture(),
      // its name in the lists: the moments fired, newest first (a few, then how many more)
      summary: () => { const f = [...(S.fired || [])].reverse().map((id) => P.list.find((m) => m.id === id)?.name).filter(Boolean); return f.length ? f.slice(0, 3).join(', ') + (f.length > 3 ? ` +${f.length - 3}` : '') : ''; },
    },
    // the amount slider's label follows it as it moves (the deck draws labels once)
    ready(deck) {
      deck.el.querySelector('.mdCtl')?.addEventListener('input', (e) => {
        if (e.target.type !== 'range') return;
        const tab = deck.el.querySelector('.mdTabs .sel')?.dataset.tab, span = e.target.closest('.mdSlider')?.querySelector('span');
        if (tab && span && P.tabs.some((x) => x.id === tab && x.amount)) span.textContent = P.amountLabel(tab);
      });
    },
  };
}

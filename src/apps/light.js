// CREATIVE STAGE LIGHT: your song as a full production show, and the crowd joining in.
// AUTO SHOW (the music button): drop in a song and the stage lights run themselves on the beat
// (the same listening as the Crowd app's: the kick changes the look and fires strobe hits on
// drops, the mids set the movers' speed, the highs make the lasers shimmer). The SHOW card's
// tabs are layers that stack, to build or tweak by hand: a LOOK (the whole rig), MOVERS,
// LASERS, STROBES (sequences that fire once, or latched on) and SCREENS. The colours: up to four
// (three or four give each truss its own) or the rainbow. The rig's layout is the Build app's.
// Settings → Crowd sync (on from the start): the wristbands follow the stage (its colours,
// motion and strobes; or the screens' picture when a screen feed was the last pick).
import * as T from './thumbs.js';
import { createNoiseScreens } from '../noisescreens.js';

const pickOf = (a) => a[(Math.random() * a.length) | 0];
const KEY = 'pm-light-state';
const COLOURS = ['#ff1430', '#ff7a00', '#ffe600', '#7dff1a', '#00ff6a', '#00e5ff', '#1e5aff', '#8a2bff', '#ff2bd6', '#ffffff'];
const GROUPS = ['lx1', 'lx2', 'lx3', 'floor'];

// the rig's own looks (rigfx.js cue): what each lights, for the tile's preview
const LOOKS = [
  ['blackout', 'Blackout', { dim: 0 }],
  ['preshow', 'Preshow', { dim: 0.15, beh: 'park', wash: 0.25, uv: true }],
  ['intro', 'Intro', { dim: 0.55, beh: 'slowfan' }],
  ['ballad', 'Ballad', { dim: 0.55, beh: 'slowfan', wash: 0.6 }],
  ['acoustic', 'Acoustic', { dim: 0.7, beh: 'park', warm: true }],
  ['anthem', 'Anthem', { dim: 0.85, beh: 'sweep', wash: 0.8 }],
  ['ballyhoo', 'Ballyhoo', { dim: 1, beh: 'ballyhoo', lasers: true }],
  ['beamfan', 'Beam fan', { dim: 1, beh: 'fan', lasers: true }],
  ['crossfire', 'Crossfire', { dim: 1, beh: 'crossbeams', lasers: true, strobe: true }],
  ['tilt', 'Tilt wave', { dim: 0.9, beh: 'tiltwave' }],
  ['strobefit', 'Strobe fit', { dim: 0.3, beh: 'park', strobe: true }],
  ['lasershow', 'Laser show', { dim: 0.1, beh: 'park', lasers: true }],
  ['rainbow', 'Rainbow', { dim: 0.9, beh: 'sweep', rainbow: true, lasers: true }],
  ['drop', 'The drop', { dim: 1, beh: 'crossbeams', lasers: true, strobe: true }],
  ['encore', 'Encore', { dim: 1, beh: 'ballyhoo', rainbow: true, lasers: true }],
  ['full', 'Full send', { dim: 1, beh: 'sweep', rainbow: true, lasers: true }],
];
// looks in their own colours (up to four, or the rainbow): a quick start, they set the colours too
const THEMED = [
  ['sunset', 'Sunset', 'anthem', ['#ff7a00', '#8a2bff', '#ff2bd6']], ['ice', 'Ice', 'ballad', ['#00e5ff', '#ffffff']],
  ['inferno', 'Inferno', 'ballyhoo', ['#ff1430', '#ff7a00', '#ffe600']], ['forest', 'Forest', 'intro', ['#00ff6a', '#7dff1a', '#00e5ff']],
  ['royal', 'Royal', 'anthem', ['#8a2bff', '#ffe600']], ['sirens', 'Sirens', 'crossfire', ['#ff1430', '#1e5aff']],
  ['neon', 'Neon', 'beamfan', ['#ff2bd6', '#00e5ff']], ['gold', 'Gold rush', 'tilt', ['#ffe600', '#ffffff']],
  ['ocean', 'Ocean', 'tilt', ['#1e5aff', '#00e5ff', '#ffffff']], ['candy', 'Candy', 'ballyhoo', ['#ff2bd6', '#00e5ff', '#ffe600', '#ffffff']],
  ['tropical', 'Tropical', 'anthem', ['#ff7a00', '#ff2bd6', '#00ff6a', '#ffe600']], ['cyber', 'Cyberpunk', 'crossfire', ['#ff2bd6', '#00e5ff', '#8a2bff']],
  ['vapor', 'Vaporwave', 'slowfanlook', ['#ff2bd6', '#8a2bff', '#00e5ff']], ['matrix', 'Matrix', 'lasershow', ['#00ff6a', '#ffffff']],
  ['fireice', 'Fire and ice', 'drop', ['#ff1430', '#ff7a00', '#00e5ff', '#ffffff']], ['galaxy', 'Galaxy', 'beamfan', ['#8a2bff', '#1e5aff', '#ff2bd6']],
  ['pride', 'Pride', 'rainbow', 'rainbow'], ['festival', 'Festival', 'full', 'rainbow'],
  ['white', 'Pure white', 'anthem', ['#ffffff']], ['bloodmoon', 'Blood moon', 'ballad', ['#ff1430', '#8a2bff']],
  ['aurora', 'Aurora', 'intro', ['#00ff6a', '#00e5ff', '#8a2bff']], ['electric', 'Electric', 'crossfire', ['#1e5aff', '#ffffff', '#ffe600']],
  ['lava', 'Lava', 'tilt', ['#ff1430', '#ff7a00', '#ffe600']], ['pastel', 'Pastel dream', 'ballad', ['#ff2bd6', '#00e5ff', '#8a2bff', '#ffffff']],
];
// moving heads: a motion, a gobo (0 open, 1 breakup, 2 bars, 3 dots, 4 star), split colours across the trusses
const MOVERS = [
  ['look', 'From the look', null], ['park', 'Park', 'park', 0], ['sweep', 'Sweep', 'sweep', 0], ['fan', 'Fan', 'fan', 0],
  ['slowfan', 'Slow fan', 'slowfan', 0], ['ballyhoo', 'Ballyhoo', 'ballyhoo', 0], ['crossbeams', 'Crossbeams', 'crossbeams', 0], ['tiltwave', 'Tilt wave', 'tiltwave', 0],
  ['starsweep', 'Star sweep', 'sweep', 4], ['starfan', 'Star fan', 'fan', 4], ['starcross', 'Star cross', 'crossbeams', 4], ['starpark', 'Star still', 'park', 4],
  ['dotsfan', 'Dots fan', 'fan', 3], ['dotsweep', 'Dots sweep', 'sweep', 3], ['dotspark', 'Dots still', 'park', 3],
  ['barsbally', 'Bars ballyhoo', 'ballyhoo', 2], ['barstilt', 'Bars tilt', 'tiltwave', 2], ['breakup', 'Breakup tilt', 'tiltwave', 1], ['breakupbally', 'Breakup ballyhoo', 'ballyhoo', 1],
  ['split', 'Split sweep', 'sweep', 0, true], ['splitfan', 'Split fan', 'fan', 0, true], ['splitcross', 'Split crossfire', 'crossbeams', 0, true],
  ['splittilt', 'Split tilt', 'tiltwave', 0, true], ['splitbally', 'Split ballyhoo', 'ballyhoo', 0, true],
];
// lasers (rigfx.js): a pattern, a colour mode (a: the first colour, ab: two, rainbow: a hue per head),
// blades per head (kept to six: ten heads of twelve was too much), a tilt; or a laser sheet
const L = (laserPattern, laserColorMode, laserPer, laserTilt = 0) => ({ laserPattern, laserColorMode, laserPer, laserTilt });
const LASERS = [
  ['look', 'From the look', null], ['off', 'Lasers off', { off: true }],
  ['fan', 'Fan', L('fan', 'a', 4)], ['fanab', 'Two-tone fan', L('fan', 'ab', 4)], ['rainbowfan', 'Rainbow fan', L('fan', 'rainbow', 5)],
  ['sweep', 'Sweep', L('sweep', 'a', 3)], ['sweepab', 'Two-tone sweep', L('sweep', 'ab', 4)], ['sweeprb', 'Rainbow sweep', L('sweep', 'rainbow', 4)],
  ['scan', 'Scanner', L('scan', 'a', 3)], ['twinscan', 'Twin scan', L('scan', 'ab', 2)],
  ['circle', 'Orbit', L('circle', 'a', 4)], ['circlerb', 'Rainbow orbit', L('circle', 'rainbow', 5)],
  ['wave', 'Two-tone wave', L('wave', 'ab', 5)], ['waverb', 'Rainbow wave', L('wave', 'rainbow', 5)],
  ['chase', 'Chase', L('chase', 'a', 6)], ['chaseab', 'Two-tone chase', L('chase', 'ab', 6)],
  ['still', 'Beams', L('still', 'a', 4)], ['stillrb', 'Rainbow beams', L('still', 'rainbow', 4)], ['single', 'Single beams', L('still', 'a', 1)],
  ['sky', 'Into the sky', L('sky', 'ab', 3)], ['skyrb', 'Rainbow sky', L('sky', 'rainbow', 4)],
  ['lowfan', 'Low fan', L('fan', 'a', 4, -0.6)], ['highsweep', 'High sweep', L('sweep', 'ab', 3, 0.6)],
  ['sheetfan', 'Sheet fan', { sheet: 'fan' }], ['sheetscan', 'Sheet scan', { sheet: 'scan' }], ['sheetcross', 'Sheet cross', { sheet: 'cross' }], ['sheetstrobe', 'Sheet strobe', { sheet: 'strobe' }],
];
// strobe sequences: steps of [strobe, blinders, seconds] looped; a latched one stays on
const STROBES = [
  ['off', 'Off', { latch: [0, 0] }], ['on', 'Strobe on', { latch: [1, 0] }], ['blind', 'Blinders on', { latch: [0, 1] }], ['both', 'Strobe + blinders', { latch: [1, 1] }],
  ['hits4', '4 hits', { steps: [[1, 0, 0.08], [0, 0, 0.17]], loops: 4 }],
  ['count8', '8 count', { steps: [[1, 0, 0.06], [0, 0, 0.19]], loops: 8 }],
  ['triplets', 'Triplets', { steps: [[1, 0, 0.05], [0, 0, 0.08], [1, 0, 0.05], [0, 0, 0.08], [1, 0, 0.05], [0, 0, 0.45]], loops: 4 }],
  ['swing', 'Swing', { steps: [[1, 0, 0.06], [0, 0, 0.3], [1, 0, 0.06], [0, 0, 0.14]], loops: 6 }],
  ['double', 'Double time', { steps: [[1, 0, 0.05], [0, 0, 0.075]], loops: 16 }],
  ['stutter', 'Stutter', { steps: [[1, 0, 0.03], [0, 0, 0.03], [1, 0, 0.03], [0, 0, 0.03], [1, 0, 0.03], [0, 0, 0.5]], loops: 4 }],
  ['slow4', 'Slow pulse', { steps: [[1, 1, 0.25], [0, 0, 0.75]], loops: 4 }],
  ['pulse8', 'Blast 8', { steps: [[1, 1, 0.05], [0, 0, 0.45]], loops: 8 }],
  ['pops', 'Blinder pops', { steps: [[0, 1, 0.12], [0, 0, 0.38]], loops: 4 }],
  ['blindrun', 'Blinder run', { steps: [[0, 1, 0.08], [0, 0, 0.12]], loops: 10 }],
  ['heart', 'Heartbeat', { steps: [[1, 1, 0.07], [0, 0, 0.12], [1, 1, 0.07], [0, 0, 0.55]], loops: 4 }],
  ['countdown', '3, 2, 1, hit', { steps: [[1, 0, 0.08], [0, 0, 0.6], [1, 0, 0.08], [0, 0, 0.6], [1, 0, 0.08], [0, 0, 0.6], [1, 1, 1], [0, 0, 0.1]], loops: 1 }],
  ['flashhold', 'Flash and hold', { steps: [[1, 1, 1.2], [0, 0, 0.2]], loops: 1 }],
  ['freeze', 'Freeze', { steps: [[1, 0, 2.2], [0, 0, 0.1]], loops: 1 }],
  ['gun', 'Machine gun', { steps: [[1, 0, 0.03], [0, 0, 0.04]], loops: 22 }],
  ['build', 'Build-up', { build: 4 }], ['build8', 'Long build', { build: 8 }],
  ['lightning', 'Lightning', { lightning: 3 }], ['storm', 'Thunderstorm', { lightning: 6 }],
  ['dropseq', 'Drop!', { drop: 1.4 }], ['dropbig', 'Big drop', { drop: 3 }],
];
const SCREENS = [
  ['film', 'Film'], ['noise', 'Colour noise'], ['noise0', 'Noise · ink', 0], ['noise1', 'Noise · cells', 1], ['noise2', 'Noise · bands', 2], ['noise3', 'Noise · kaleido', 3],
  ['show', 'Crowd show'], ['waves', 'Waves'], ['aurora', 'Aurora'], ['rings', 'Rings'], ['bars', 'Bars'], ['embers', 'Embers'], ['starfield', 'Starfield'], ['off', 'Screens off'],
];

export function buildApp(eng) {
  const { rigFX, arenaFX, orbFX, THREE } = eng;
  eng.setStageFollow?.(false);   // here the stage leads: it never follows the crowd
  // --- what's on (kept for the visit, so a reload comes back to it) -------------------------------
  const S = { look: 'preshow', cols: ['#ff2bd6', '#00e5ff'], rainbow: false, master: 1, rate: 1, mover: 'look', laser: 'look', strobe: 'off', screen: 'film', sync: true, syncSrc: 'lights', strobeGain: 1, laserSpeed: 1, laserPer: 0 };
  try { Object.assign(S, JSON.parse(sessionStorage.getItem(KEY) || '{}')); } catch (_) { /* private mode */ }
  if (!Array.isArray(S.cols) || !S.cols.length) S.cols = ['#ff2bd6', '#00e5ff'];
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (_) { /* private mode */ } };
  const colA = () => S.cols[0], colB = () => S.cols[1] || S.cols[0];

  // the colours onto the rig: the first two rig-wide; three or four, a truss each; the rainbow
  function paint(cols = S.cols, rainbow = S.rainbow) {
    rigFX.colorA.set(cols[0]); rigFX.colorB.set(cols[1] || cols[0]);
    if (cols.length >= 3) GROUPS.forEach((id, i) => rigFX.setGroup?.(id, { color: new THREE.Color(cols[i % cols.length]) }));
    if (rainbow) { rigFX.stripMode = 'rainbow'; if (rigFX.lasersOn) rigFX.laserColorMode = 'rainbow'; }
  }

  // --- the layers onto the rig -------------------------------------------------------------------
  function apply() {
    rigFX.cue(S.look);
    rigFX.master = S.master; rigFX.rate = S.rate;
    rigFX.gain.strobe = S.strobeGain;
    rigFX.setGroup?.('all', { gobo: 0, behaviour: null, color: null });
    const M = MOVERS.find((m) => m[0] === S.mover);
    if (M && M[2]) {
      rigFX.set({ behaviour: M[2] });
      rigFX.setGroup?.('all', { gobo: M[3] || 0, behaviour: null, color: null });
    }
    const Ls = LASERS.find((l) => l[0] === S.laser)?.[2];
    arenaFX.setSheet?.(!!Ls?.sheet);
    if (Ls?.sheet) { arenaFX.setSheetMode(Ls.sheet); arenaFX.setSheetColor(colA()); arenaFX.setSheetSpeed(S.laserSpeed); rigFX.lasersOn = false; }
    else if (Ls?.off) rigFX.lasersOn = false;
    else if (Ls) { Object.assign(rigFX, Ls); rigFX.laserSpread = 1.5; rigFX.lasersOn = true; rigFX.laserSweep = S.laserSpeed; if (S.laserPer) rigFX.laserPer = Math.min(6, S.laserPer); }
    else { rigFX.laserPer = Math.min(rigFX.laserPer, 4); rigFX.laserTilt = 0; }   // the look's own lasers, kept calm
    paint();
    if (M?.[4]) GROUPS.forEach((id, i) => rigFX.setGroup?.(id, { color: new THREE.Color(S.cols.length > 1 ? S.cols[i % S.cols.length] : i % 2 ? '#ffffff' : colA()) }));   // split: the colours across the trusses
    const St = STROBES.find((x) => x[0] === S.strobe)?.[2];
    if (St?.latch) { rigFX.strobeOn = !!St.latch[0]; rigFX.blindersOn = !!St.latch[1]; }
    save();
    sync();
  }

  // --- strobe sequences: they run once, on top of whatever is latched ----------------------------
  let seqT = [];
  const hit = (strobe, blind) => { rigFX.strobeOn = !!strobe; rigFX.blindersOn = !!blind; noise.kick = strobe || blind ? 1 : noise.kick; crowdHit(strobe || blind); };
  function runStrobe(def) {
    seqT.forEach(clearTimeout); seqT = [];
    let at = 0;
    const plan = [];
    if (def.steps) for (let l = 0; l < def.loops; l++) for (const [s, b, d] of def.steps) { plan.push([at, s, b]); at += d; }
    if (def.build) { let gap = 0.5; while (at < def.build) { plan.push([at, 1, 0], [at + 0.05, 0, 0]); at += gap; gap = Math.max(0.05, gap * (def.build > 5 ? 0.88 : 0.82)); } plan.push([at, 1, 1], [at + 0.6, 0, 0]); at += 0.6; }
    if (def.lightning) { while (at < def.lightning) { at += 0.15 + Math.random() * 0.6; plan.push([at, 1, Math.random() < 0.3 ? 1 : 0], [at + 0.05 + Math.random() * 0.08, 0, 0]); } }
    if (def.drop) {
      const keep = rigFX.master;
      seqT.push(setTimeout(() => { rigFX.master = 0; }, 0));
      seqT.push(setTimeout(() => { rigFX.master = Math.max(1, keep); hit(1, 1); }, 650));
      seqT.push(setTimeout(() => { hit(0, 0); rigFX.master = S.master; apply(); }, 650 + def.drop * 1000));
      return;
    }
    for (const [t, s, b] of plan) seqT.push(setTimeout(() => hit(s, b), t * 1000));
    seqT.push(setTimeout(() => { const St = STROBES.find((x) => x[0] === S.strobe)?.[2]; hit(St?.latch?.[0] || 0, St?.latch?.[1] || 0); }, at * 1000 + 30));
  }

  // --- the screens -------------------------------------------------------------------------------
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); black.needsUpdate = true;
  const NS = eng.renderer ? createNoiseScreens(eng.renderer) : null;
  const noise = { on: false, t: 0, kick: 0, mode: 0, fixed: null, seed: Math.random() * 10, at: 0, raf: 0, last: 0 };
  function noiseFrame(now) {
    noise.raf = noise.on ? requestAnimationFrame(noiseFrame) : 0;
    const dt = Math.min(0.1, (now - (noise.last || now)) / 1000); noise.last = now;
    noise.t += dt * 0.5 * (rigFX.rate ?? 1); noise.kick *= Math.exp(-dt * 5);
    if (noise.fixed !== null) noise.mode = noise.fixed;
    else if (now - noise.at > 16000) { noise.at = now; noise.mode = (noise.mode + 1 + Math.floor(Math.random() * 3)) % 4; noise.seed = Math.random() * 10; }   // a new pattern now and then
    if (Math.floor(now / 33) !== Math.floor((now - dt * 1000) / 33)) {
      NS.setPalette(S.rainbow ? ['#ff1430', '#00ff6a', '#1e5aff'] : S.cols, S.rainbow || /rainbow|full|encore/.test(rigFX.look));
      NS.render({ t: noise.t, kick: noise.kick, low: 0.35, high: 0.25 + (rigFX.strobeOn ? 0.6 : 0), glint: rigFX.strobeOn ? 0.6 : 0, seed: noise.seed, mode: noise.mode });
    }
  }
  function setScreen(id) {
    S.screen = id;
    const def = SCREENS.find((x) => x[0] === id);
    noise.on = /^noise/.test(id) && !!NS;
    noise.fixed = def && def[2] !== undefined ? def[2] : null;
    if (noise.on) { eng.setScreens({ wall: NS.wall, b: NS.b }); if (!noise.raf) noise.raf = requestAnimationFrame(noiseFrame); }
    else if (id === 'off') eng.setScreens({ wall: black, b: black });
    else { eng.setScreens(null); eng.setVideoPreset(id === 'film' ? 'off' : id); }
    save();
  }

  // --- crowd sync: the wristbands follow the stage ---------------------------------------------------
  const crowdMode = () => {
    const look = rigFX.look;
    if (look === 'blackout' || S.master < 0.02) return 'off';
    if (S.syncSrc === 'screens' && !/^noise|off/.test(S.screen)) return 'video';
    if (rigFX.strobeOn) return 'strobe';
    if (S.rainbow || /rainbow|full|encore/.test(look)) return 'rainwave';
    const beh = rigFX.behaviour || '';
    if (/sweep|fan/.test(beh)) return 'sweep';
    if (beh === 'tiltwave') return 'wave';
    if (/ballyhoo|crossbeams/.test(beh)) return 'pulse';
    return 'solid';
  };
  function sync() {
    if (!S.sync) return;
    orbFX.set({ mode: crowdMode(), colorA: rigFX.colorA.clone(), colorB: rigFX.colorB.clone(), speed: Math.max(0.3, S.rate), brightness: 2.1 * Math.min(1, S.master) });
  }
  function crowdHit(on) {
    if (!S.sync) return;
    orbFX.set(on ? { mode: 'solid', colorA: new THREE.Color(1, 1, 1), brightness: 2.6 } : { mode: crowdMode(), colorA: rigFX.colorA.clone(), brightness: 2.1 * Math.min(1, S.master) });
  }
  // the room's own show steps in when you walk in (a Blackout for the wristbands): sync takes them back
  setInterval(() => { if (S.sync && orbFX.mode === 'design') sync(); }, 1000);

  // --- the tiles -----------------------------------------------------------------------------------
  const drawLook = (p, cols, rainbow) => (g, w, h, t) => {
    const c = cols || S.cols, rb = rainbow ?? S.rainbow;
    T.room(g, w, h);
    if (!p.dim) return;
    if (p.wash) T.wash(g, w, h, { a: p.warm ? '#ffcf8a' : c[1] || c[0], level: p.wash * 0.8 });
    if (p.uv) T.wash(g, w, h, { a: '#6a2bff', level: 0.35 });
    T.beams(g, w, h, t, { a: p.warm ? '#fff3dc' : c[0], b: c[1] || c[0], beh: p.beh, dim: p.dim, rainbow: p.rainbow || rb, n: p.beh === 'park' ? 5 : 7 });
    if (p.lasers) T.lasers(g, w, h, t, { pattern: 'sweep', per: 3, a: c[0], b: c[1] || c[0], mode: p.rainbow || rb ? 'rainbow' : 'a' });
    if (p.strobe && Math.floor(t * 8) % 4 === 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, 0, w, h); }
  };
  const lookTiles = [
    ...LOOKS.map(([id, name, p]) => ({ id, name, draw: drawLook(p), play() { S.look = id; S.syncSrc = 'lights'; apply(); } })),
    ...THEMED.map(([id, name, cue0, cols]) => {
      const cue = cue0 === 'slowfanlook' ? 'intro' : cue0, p = LOOKS.find((l) => l[0] === cue)[2], rb = cols === 'rainbow';
      return { id, name, draw: drawLook(p, rb ? ['#ff1430', '#00e5ff'] : cols, rb), play() { S.look = cue; S.syncSrc = 'lights'; if (rb) S.rainbow = true; else { S.cols = [...cols]; S.rainbow = false; } apply(); deck?.refreshControls(); } };
    }),
  ];
  const moverTiles = MOVERS.map(([id, name, beh, gobo, split]) => ({
    id, name,
    draw: (g, w, h, t) => {
      T.room(g, w, h);
      T.beams(g, w, h, t, { a: colA(), b: split ? colB() : colA(), beh: beh || LOOKS.find((l) => l[0] === S.look)?.[2].beh || 'sweep', width: gobo ? 0.05 : 0.07, rainbow: S.rainbow });
      if (gobo) { g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(0,0,0,0.55)'; for (let i = 0; i < 7; i++) for (let k = 0; k < 3; k++) { const x = w * (0.12 + i * 0.125), y = h * (0.5 + k * 0.1); if (gobo === 2) g.fillRect(x - 6, y, 12, 2); else if (gobo === 3) { g.beginPath(); g.arc(x, y, 2.2, 0, T.TAU); g.fill(); } else if (gobo === 4) { g.save(); g.translate(x, y); g.rotate(t); g.fillRect(-4, -1, 8, 2); g.fillRect(-1, -4, 2, 8); g.restore(); } else g.fillRect(x - 2 + Math.sin(i * 7) * 3, y, 4, 3); } }
    },
    play() { S.mover = id; S.syncSrc = 'lights'; apply(); },
  }));
  const laserTiles = LASERS.map(([id, name, Lz]) => ({
    id, name,
    draw: (g, w, h, t) => {
      T.room(g, w, h, { truss: true });
      if (!Lz) { const p = LOOKS.find((l) => l[0] === S.look)?.[2]; if (p?.lasers) T.lasers(g, w, h, t, { pattern: 'sweep', per: 3, a: colA(), mode: S.rainbow || p.rainbow ? 'rainbow' : 'a' }); return; }
      if (Lz.off) return;
      if (Lz.sheet) { T.lasers(g, w, h, t, { sheet: Lz.sheet, a: colA(), speed: S.laserSpeed }); return; }
      T.lasers(g, w, h, t, { pattern: Lz.laserPattern, per: Lz.laserPer, mode: S.rainbow ? 'rainbow' : Lz.laserColorMode, a: colA(), b: colB(), speed: S.laserSpeed, tilt: Lz.laserTilt });
    },
    play() { S.laser = id; apply(); },
  }));
  const strobeTiles = STROBES.map(([id, name, def]) => {
    const steps = def.latch ? (def.latch[0] || def.latch[1] ? [[1, 0.05], [0, 0.07]] : [[0, 1]])
      : def.steps ? def.steps.map(([s, b, d]) => [s || b, d]) : def.build ? [[1, 0.05], [0, 0.4], [1, 0.05], [0, 0.25], [1, 0.05], [0, 0.12], [1, 0.05], [0, 0.06], [1, 0.4], [0, 0.6]]
      : def.lightning ? [[1, 0.05], [0, 0.5], [1, 0.08], [0, 0.2], [1, 0.04], [0, 0.9]] : [[0, 0.65], [1, def.drop || 1.4], [0, 0.4]];
    return {
      id, name, once: def.latch ? 0 : def.steps ? def.steps.reduce((s, x) => s + x[2], 0) * def.loops : def.build ? def.build + 1 : def.lightning || (def.drop + 0.8),
      draw: (g, w, h, t) => T.strobe(g, w, h, t, { steps, blinders: def.latch ? !!def.latch[1] : !!def.steps?.some((x) => x[1]) || !!def.drop }),
      play() { if (def.latch) { S.strobe = id; apply(); } else runStrobe(def); },
    };
  });
  const screenTiles = SCREENS.map(([id, name]) => ({ id, name, draw: (g, w, h, t) => T.screen(g, w, h, t, /^noise/.test(id) ? 'noise' : id), play() { S.syncSrc = 'screens'; setScreen(id); sync(); } }));

  // --- AUTO SHOW's driver: the music moves the stage lights (autoshow.js does the listening) --------------
  // styles bias the looks: Arena (everything), Beams (the movers, no lasers), Lasers, Club (tight,
  // strobing). Each effect: a look for the energy, a mover motion, maybe a laser pattern and a gobo.
  const POOLS = {
    arena: [['ballad', 'intro', 'acoustic'], ['anthem', 'tilt', 'ballad', 'beamfan'], ['ballyhoo', 'rainbow', 'beamfan', 'crossfire', 'anthem'], ['drop', 'encore', 'full', 'crossfire']],
    beams: [['intro', 'ballad'], ['anthem', 'tilt', 'intro'], ['ballyhoo', 'tilt', 'crossfire'], ['crossfire', 'drop', 'ballyhoo']],
    lasers: [['lasershow', 'intro'], ['lasershow', 'beamfan'], ['beamfan', 'crossfire', 'lasershow'], ['crossfire', 'drop', 'full']],
    club: [['preshow', 'intro'], ['tilt', 'beamfan'], ['crossfire', 'strobefit', 'ballyhoo'], ['strobefit', 'drop', 'crossfire']],
  };
  const MOVES = [['slowfan', 'park', 'sweep'], ['sweep', 'fan', 'tiltwave', 'slowfan'], ['ballyhoo', 'crossbeams', 'fan', 'tiltwave'], ['crossbeams', 'ballyhoo', 'fan']];
  const LPATS = ['fan', 'sweep', 'scan', 'circle', 'wave', 'chase', 'still', 'sky'];
  let laserBase = 1;
  const autoDriver = {
    key: 'pm-auto-light',
    styles: [['arena', 'Arena'], ['beams', 'Beams'], ['lasers', 'Lasers'], ['club', 'Club']],
    pick({ k, style, scheme, prev }) {
      const pool = POOLS[style] || POOLS.arena;
      const look = pickOf(pool[k].filter((x) => x !== prev?.look).concat(pool[k].length === 1 ? pool[k] : []));
      const lasers = style === 'lasers' || (style !== 'beams' && (k >= 2 ? Math.random() < 0.6 : k === 1 && Math.random() < 0.25));
      return {
        look, beh: pickOf(MOVES[k]), gobo: Math.random() < 0.4 ? 1 + ((Math.random() * 4) | 0) : 0,
        laser: lasers ? { laserPattern: pickOf(LPATS), laserColorMode: scheme.mode === 'rainbow' ? 'rainbow' : scheme.cols.length > 1 ? 'ab' : 'a', laserPer: [2, 3, 4, 5][k], laserTilt: 0, laserSpread: 1.5 } : null,
      };
    },
    apply(effect, { scheme }) {
      rigFX.cue(effect.look);
      rigFX.master = S.master;
      rigFX.set({ behaviour: effect.beh });
      rigFX.setGroup?.('all', { gobo: effect.gobo, behaviour: null, color: null });
      arenaFX.setSheet?.(false);
      if (effect.laser) { Object.assign(rigFX, effect.laser); rigFX.lasersOn = true; laserBase = S.laserSpeed; rigFX.laserSweep = laserBase; }
      else rigFX.lasersOn = false;
      paint(scheme.cols, scheme.mode === 'rainbow');
      sync();
    },
    colours(effect, { scheme }) { paint(scheme.cols, scheme.mode === 'rainbow'); sync(); },   // the highs: new colours, same look
    accent(h) { if (rigFX.lasersOn) rigFX.laserSweep = laserBase * (1 + 1.2 * h); },   // and the lasers shimmer
    kick(k) { if (k >= 3) { rigFX.strobeOn = true; setTimeout(() => { rigFX.strobeOn = false; }, 50); } noise.kick = 1; },
    drop(k) { if (k >= 1) { hit(1, 1); setTimeout(() => hit(0, 0), 900 + 300 * k); } },   // the drop: strobes and blinders
    glint() { hit(0, 1); setTimeout(() => hit(0, 0), 140); },                // a crash: the blinders
    pace(t) { rigFX.rate = t; },                                             // the mids: the movers' speed
    snapshot() { noise.on = false; return JSON.parse(JSON.stringify(S)); },
    restore(b) { if (b) Object.assign(S, b); apply(); setScreen(S.screen); },
    end(b) { if (b) Object.assign(S, b); S.look = 'blackout'; apply(); setScreen(S.screen); deck?.latch('looks', 'blackout'); },
  };

  // --- start: the layers as they were (or the preshow), the screens' feed ------------------------------
  let deck = null;
  apply();
  setScreen(S.screen);
  const palette = { type: 'palette', label: 'Colours', list: COLOURS, get value() { return S.cols; }, get rainbow() { return S.rainbow; }, change: (cols, rainbow) => { S.cols = cols; S.rainbow = rainbow; apply(); } };
  const looksControls = [
    palette,
    { type: 'slider', label: 'Intensity', min: 0, max: 1.4, step: 0.02, get value() { return S.master; }, input: (v) => { S.master = v; rigFX.master = v; save(); sync(); } },
    { type: 'slider', label: 'Speed', min: 0.2, max: 2.5, step: 0.05, get value() { return S.rate; }, input: (v) => { S.rate = v; rigFX.rate = v; save(); } },
  ];
  return {
    title: 'Lights',
    autoDriver,
    tabs: [
      { id: 'looks', name: 'Looks', tiles: lookTiles, controls: looksControls },
      { id: 'movers', name: 'Movers', tiles: moverTiles, controls: [palette, looksControls[2]] },
      { id: 'lasers', name: 'Lasers', tiles: laserTiles, controls: [
        palette,
        { type: 'slider', label: 'Speed', min: 0.2, max: 2.5, step: 0.05, get value() { return S.laserSpeed; }, input: (v) => { S.laserSpeed = v; rigFX.laserSweep = v; arenaFX.setSheetSpeed?.(v); save(); } },
        { type: 'slider', label: 'Beams', min: 1, max: 6, step: 1, get value() { return S.laserPer || 4; }, input: (v) => { S.laserPer = v; rigFX.laserPer = v; save(); } },
      ] },
      { id: 'strobes', name: 'Strobes', tiles: strobeTiles, controls: [{ type: 'slider', label: 'Strobe', min: 0.2, max: 1.6, step: 0.05, get value() { return S.strobeGain; }, input: (v) => { S.strobeGain = v; rigFX.gain.strobe = v; save(); } }] },
      { id: 'screens', name: 'Screens', tiles: screenTiles, controls: [palette] },
    ],
    crowdSync: {
      get on() { return S.sync; },
      set(v) { S.sync = !!v; save(); if (S.sync) sync(); else orbFX.set({ mode: 'off' }); },
    },
    ready(d) {
      deck = d;
      d.latch('looks', S.look); d.latch('movers', S.mover); d.latch('lasers', S.laser); d.latch('strobes', S.strobe); d.latch('screens', S.screen);
    },
  };
}

// CREATIVE STAGE MOMENTS: the moments of a game, a show or a celebration, each one tap.
// A moment is everything at once, timed: the house lights and the stage lights, the follow spot,
// the screens (big words on the LED wall, the B-stage and the jumbotron: GOAL!, HAPPY BIRTHDAY,
// a countdown), the effects (pyro, confetti and cannons, streamers, CO2, smoke drops, bubbles,
// balloon drops, drones: spectacle.js for the new ones) and the wristbands, part of every
// moment (Settings → Wristbands). Tabs: GAME (sports: a goal, the intros, the anthem, a win),
// CONCERT, CELEBRATE (a birthday, a proposal, New Year, an award), and the building blocks:
// EFFECTS and DRONES. The team's (or the night's) colours and name go into every moment.
import * as T from './thumbs.js';
import { createMessageScreen } from './message.js';
import { previewPoints } from '../droneshapes.js';

const TEAM = ['#ff1430', '#1e5aff', '#ffffff', '#ffd24a', '#00c853', '#ff7a00', '#8a2bff', '#00e5ff', '#ff2bd6'];
const PARTY = ['#ff1430', '#ffe600', '#1e5aff', '#00ff6a', '#ff2bd6', '#ff7a00'];
const GOLD = ['#ffd24a', '#f0f0f6', '#ffe08a', '#d9d9e3'];
const PASTEL = ['#ffb3de', '#b3f0ff', '#d6b3ff', '#fff3a8', '#b8ffcf'];
const LOVE = ['#ff1430', '#ff2bd6', '#ffffff'];
const KEY = 'pm-moments';

export function buildApp(eng) {
  const { rigFX, pyroFX, arenaFX, smokeFX, balloonFX, orbFX, showUI, THREE } = eng;
  const SP = () => eng.spectacle;
  eng.setStageFollow?.(false);
  rigFX.cue('preshow');
  const S = { a: '#ff1430', b: '#ffffff', name: 'PIXMOB', crowd: true };
  try { Object.assign(S, JSON.parse(sessionStorage.getItem(KEY) || '{}')); } catch (_) { /* private mode */ }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (_) { /* private mode */ } };
  const team = () => [S.a, S.b];
  const NAME = () => (S.name || '').trim().toUpperCase();
  const MS = createMessageScreen(THREE);

  // --- the cues ------------------------------------------------------------------------------------
  const timers = new Set();
  const at = (s, fn) => { const id = setTimeout(() => { timers.delete(id); fn(); }, s * 1000); timers.add(id); };
  let msgT = 0;
  const F = {
    // the screens: words up for a while (the wall, the B-stage, the jumbotron)
    msg: (main, sub = '', style = 'flash', secs = 4) => {
      MS.show({ main, sub, style, cols: team() });
      eng.setScreens({ wall: MS.tex, b: MS.tex }); eng.jumbo(MS.tex);
      clearTimeout(msgT);
      msgT = setTimeout(() => { MS.hide(); eng.setScreens(null); eng.jumbo(null); }, secs * 1000);
    },
    // the wristbands (if they're on): one of the crowd's shows, in the team's colours
    crowd: (kind, text) => {
      if (!S.crowd) return;
      showUI.setBrand?.({ a: S.a, b: S.b, rainbow: false });
      if (kind === 'message') { showUI.setText?.({ str: text || NAME() || 'GO!', a: '#ffffff' }); showUI.playDemo('message'); return; }
      showUI.playDemo(kind);   // team, teams, heartbeat, wave, strobe, hearts, phones, rainbow, confetti, fireworks, blackout, flow…
    },
    flash: (hex = '#ffffff', ms = 600) => {   // the whole crowd in one colour, for a moment
      if (!S.crowd) return;
      orbFX.set({ mode: 'solid', colorA: new THREE.Color(hex), brightness: 2.6 });
      at(ms / 1000, () => F.crowd('team'));
    },
    tempo: (v) => showUI.setTempo?.(v),
    house: (mode) => eng.setLighting(mode),   // 'blackout' (house down), 'game', 'house'
    spot: (where) => eng.followSpot(where ? ({ centre: [0, 0.2, 0], stage: [-23, 2.2, 0], bstage: [-3, 1.6, 0] })[where] || where : null),
    sweep: (secs = 4) => { for (let i = 0; i <= secs * 4; i++) at(i / 4, () => eng.followSpot([-24 + Math.sin(i * 0.4) * 4, 2.2, Math.sin(i * 0.25) * 9])); },
    look: (cue, secs) => { rigFX.cue(cue); rigFX.colorA.set(S.a); rigFX.colorB.set(S.b); if (secs) at(secs, () => rigFX.cue('preshow')); },
    confetti: () => rigFX.fireConfetti(),
    floor: () => arenaFX.firePoppers(),
    poppers: () => pyroFX.firePoppers(),
    streamers: () => pyroFX.fireStreamers(),
    pyro: (style = 'classic') => pyroFX.setPyroPreset(style),
    flames: (secs = 2, mode = 'gold') => { pyroFX.setFlameMode(mode); pyroFX.setFlames(true); at(secs, () => pyroFX.setFlames(false)); },
    jets: () => smokeFX.fireJets(),
    fog: (secs = 14) => { smokeFX.setFog(true); at(secs, () => smokeFX.setFog(false)); },
    drop: (pal) => SP().balloonDrop({ pal: pal || team(), count: 280 }),
    bubbles: (from = ['stage'], secs = 8, rate = 100) => SP().bubbleBurst({ from, seconds: secs, rate }),
    smoke: (where = 'front', secs = 6) => SP().smokeDrop({ where, seconds: secs }),
    drones: (opts) => SP().droneShow({ pal: team(), colour: 'split', ...opts }),
    land: () => SP().droneLand(),
    beach: (secs = 20) => { balloonFX.setOn(true); at(secs, () => balloonFX.setOn(false)); },
    sky: () => eng.fireworks?.fire('mixed'),
    rest: () => { F.crowd('blackout'); rigFX.cue('preshow'); eng.setLighting('game'); eng.followSpot(null); },
  };
  function stopAll() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
    pyroFX.setFlames(false); smokeFX.setFog(false); balloonFX.setOn(false);
    eng.fireworks?.setShow(false);
    SP().stop();
    MS.hide(); clearTimeout(msgT); eng.setScreens(null); eng.jumbo(null);
    F.rest();
  }
  // a countdown: the screens, the drones and the crowd say 3, 2, 1
  const count = (from = 0, n = 3) => Array.from({ length: n }, (_, i) => [
    [from + i * 1.4, 'msg', String(n - i), '', 'count', 1.4], [from + i * 1.4, 'drones', { word: String(n - i), colour: 'solid', pal: ['#ffffff'] }], [from + i * 1.4, 'crowd', 'message', String(n - i)],
  ]).flat();

  // --- the tiles: a moment's preview is its screen, its crowd, and what flies -------------------------------
  const card = (label, { style = 'flash', fx = null } = {}) => (g, w, h, t) => {
    const [a, b] = team(), text = typeof label === 'function' ? label() : label;
    T.room(g, w, h, { truss: false });
    const x0 = w * 0.16, y0 = h * 0.08, sw = w * 0.68, sh = h * 0.42;
    g.fillStyle = style === 'flash' ? (Math.floor(t * 4) % 2 ? a : b) : '#05060c'; g.fillRect(x0, y0, sw, sh);
    if (style !== 'flash') { const gr = g.createRadialGradient(w / 2, y0 + sh / 2, 4, w / 2, y0 + sh / 2, sw * 0.6); gr.addColorStop(0, a); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.6; g.fillStyle = gr; g.fillRect(x0, y0, sw, sh); g.globalAlpha = 1; }
    let s = 30; g.font = `900 ${s}px Arial Black, Arial`; while (s > 9 && g.measureText(text).width > sw * 0.9) { s -= 2; g.font = `900 ${s}px Arial Black, Arial`; }
    const k = style === 'pulse' ? 1 + 0.08 * Math.max(0, Math.sin(t * 8)) : 1;
    g.save(); g.translate(w / 2, y0 + sh / 2); g.scale(k, k); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = style === 'flash' ? (Math.floor(t * 4) % 2 ? b : a) : '#fff'; g.fillText(text, 0, 1); g.restore();
    g.strokeStyle = '#2a2c34'; g.lineWidth = 2; g.strokeRect(x0, y0, sw, sh);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 26; i++) {   // the crowd, in the team's colours
      const x = w * (0.06 + i * 0.034) + (r % 2) * 3, y = h * (0.6 + r * 0.07), on = Math.sin(t * 4 - i * 0.5 + r) > -0.2;
      g.fillStyle = on ? (i % 2 ? a : b) : '#1a1b22'; g.fillRect(x, y, 3, 3);
    }
    fx?.(g, w, h, t);
  };
  const conf = (g, w, h, t) => { for (let i = 0; i < 30; i++) { const ph = (t * 0.4 + T.rnd(i)) % 1; g.fillStyle = PARTY[i % 6]; g.fillRect(w * T.rnd(i, 1), ph * h * 0.9, 3, 2); } };
  const ball = (cols) => (g, w, h, t) => { for (let i = 0; i < 16; i++) { const ph = (t * 0.25 + T.rnd(i)) % 1; g.fillStyle = (cols || team())[i % (cols || team()).length]; g.beginPath(); g.ellipse(w * T.rnd(i, 2), ph * h * 0.85, 4, 5, 0, 0, T.TAU); g.fill(); } };
  const burst = (g, w, h, t) => { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { const a = (i / 18) * T.TAU, r = ((t * 0.8) % 1) * w * 0.12; g.fillStyle = T.hsl(i * 20 + t * 50); g.fillRect(w * 0.5 + Math.cos(a) * r, h * 0.3 + Math.sin(a) * r, 2, 2); } };
  // a step's text can be the name (read as the step fires, so a new name shows at once)
  const tile = (id, name, len, steps, draw) => ({ id, name, once: len, draw, play: () => { stopAll(); for (const [s, k, ...a] of steps) at(s, () => F[k](...a.map((v) => (typeof v === 'function' ? v() : v)))); } });

  const game = [
    tile('goal', 'Goal!', 10, [[0, 'look', 'drop', 4], [0, 'crowd', 'strobe'], [0, 'msg', 'GOAL!', NAMEOR('SCORES!'), 'flash', 7], [0.2, 'floor'], [0.3, 'jets'], [0.5, 'confetti'], [0.6, 'pyro', 'classic'],
      [1.6, 'crowd', 'message', 'GOAL!'], [5, 'crowd', 'team'], [9.5, 'rest']], card('GOAL!', { fx: conf })),
    tile('intro', 'Player intro', 15, [[0, 'house', 'blackout'], [0, 'crowd', 'blackout'], [0.5, 'msg', 'STARTING LINEUP', '', 'glow', 4], [0.5, 'spot', 'centre'], [1, 'smoke', 'front', 5], [2, 'crowd', 'wave'],
      [4.5, 'msg', NAMEOR('YOUR TEAM'), 'HERE THEY COME', 'pulse', 5], [4.5, 'crowd', 'message'], [4.5, 'flames', 1.5], [6, 'look', 'ballyhoo', 6], [8, 'pyro', 'willows'], [10, 'floor'], [10, 'crowd', 'team'], [14.5, 'rest']],
      card('LINEUP', { style: 'glow' })),
    tile('countdown', 'Countdown', 9, [...count(0), [4.2, 'msg', "LET'S GO!", '', 'flash', 4], [4.2, 'drones', { shape: 'burst', colour: 'rainbow' }], [4.2, 'floor'], [4.3, 'jets'], [4.3, 'crowd', 'strobe'], [5.5, 'crowd', 'team'], [8.5, 'land']],
      card('3 · 2 · 1', { style: 'pulse' })),
    tile('win', 'Win!', 16, [[0, 'msg', 'WE WIN!', NAME, 'flash', 9], [0, 'look', 'encore', 12], [0, 'crowd', 'rainbow'], [0.2, 'confetti'], [0.2, 'floor'], [0.5, 'streamers'], [1, 'drop'], [1.2, 'sky'], [1.5, 'drones', { shape: 'burst', colour: 'rainbow' }],
      [3, 'pyro', 'finale'], [4, 'crowd', 'team'], [8, 'drones', { word: 'WIN', colour: 'split' }], [15.5, 'land'], [15.8, 'rest']], card('WE WIN!', { fx: ball() })),
    tile('noise', 'Make some noise', 9, [[0, 'msg', 'MAKE SOME NOISE', '', 'pulse', 8], [0, 'look', 'ballyhoo', 8], [0, 'crowd', 'heartbeat'], [0, 'tempo', 1], [2, 'tempo', 1.5], [4, 'tempo', 2.1], [6, 'tempo', 2.8], [8, 'tempo', 1], [8.5, 'rest']],
      card('NOISE!', { style: 'pulse' })),
    tile('defense', 'Defense!', 9, [[0, 'msg', 'DE-FENSE!', '', 'pulse', 8], [0, 'crowd', 'teams'], [0, 'look', 'tilt', 8], [8.5, 'rest']], card('DE-FENSE!', { style: 'pulse' })),
    tile('kisscam', 'Kiss cam', 11, [[0, 'msg', 'KISS CAM', '', 'hearts', 10], [0, 'crowd', 'hearts'], [0.5, 'bubbles', ['stage'], 8, 70], [1, 'drones', { shape: 'heart', pal: LOVE }], [10.5, 'land'], [10.6, 'rest']], card('KISS CAM', { style: 'hearts' })),
    tile('timeout', 'Timeout party', 15, [[0, 'msg', 'TIMEOUT', 'DANCE!', 'pulse', 14], [0, 'crowd', 'rainbow'], [0, 'beach', 14], [1, 'bubbles', ['sides'], 10, 90], [0, 'look', 'rainbow', 14], [14.5, 'rest']], card('TIMEOUT', { style: 'pulse', fx: ball(PARTY) })),
    tile('anthem', 'Anthem', 15, [[0, 'house', 'blackout'], [0, 'crowd', 'phones'], [0.5, 'msg', 'PLEASE RISE', 'FOR THE ANTHEM', 'glow', 14], [0.5, 'spot', 'centre'], [0, 'look', 'acoustic'], [14.5, 'rest']], card('PLEASE RISE', { style: 'glow' })),
    tile('overtime', 'Overtime', 9, [[0, 'msg', 'OVERTIME', '', 'flash', 8], [0, 'crowd', 'heartbeat'], [0, 'look', 'crossfire', 8], [1, 'jets'], [8.5, 'rest']], card('OVERTIME')),
    tile('powerplay', 'Power play', 9, [[0, 'msg', 'POWER PLAY', '', 'pulse', 8], [0, 'crowd', 'crossfire'], [0, 'look', 'beamfan', 8], [0.2, 'jets'], [4, 'jets'], [8.5, 'rest']], card('POWER PLAY', { style: 'pulse' })),
    tile('buzzer', 'Buzzer beater', 10, [[0, 'house', 'blackout'], [0, 'crowd', 'blackout'], [0.4, 'flash', '#ffffff', 500], [0.4, 'house', 'game'], [0.5, 'msg', 'BUZZER BEATER!', NAME, 'flash', 8], [0.5, 'look', 'hit', 5], [0.6, 'floor'], [0.6, 'jets'], [0.8, 'pyro', 'crackle'], [1, 'crowd', 'supernova'], [5, 'crowd', 'team'], [9.5, 'rest']],
      card('BUZZER!', { fx: burst })),
    tile('three', 'Three pointer', 7, [[0, 'msg', '3!', NAMEOR('FROM DOWNTOWN'), 'flash', 6], [0, 'crowd', 'tiers'], [0, 'look', 'drop', 4], [0.2, 'jets'], [0.6, 'jets'], [1, 'jets'], [1.2, 'pyro', 'classic'], [6.5, 'rest']], card('3!', { style: 'pulse' })),
    tile('hattrick', 'Hat trick', 12, [[0, 'msg', 'HAT TRICK!', NAME, 'flash', 10], [0, 'crowd', 'confetti'], [0, 'look', 'encore', 9], [0.2, 'confetti'], [0.4, 'floor'], [1, 'pyro', 'rings'], [2, 'drones', { shape: 'crown', colour: 'split' }], [11.5, 'land'], [11.8, 'rest']], card('HAT TRICK', { fx: conf })),
    tile('fancam', 'Fan cam', 10, [[0, 'msg', 'FAN CAM', 'WAVE AT THE SCREEN!', 'pulse', 9], [0, 'crowd', 'twinkle'], [0, 'look', 'ballyhoo', 9], [0, 'spot', 'centre'], [9.5, 'rest']], card('FAN CAM', { style: 'pulse' })),
    tile('dancecam', 'Dance cam', 14, [[0, 'msg', 'DANCE CAM', '', 'pulse', 13], [0, 'crowd', 'disco'], [0, 'look', 'rainbow', 13], [0, 'tempo', 1.6], [1, 'bubbles', ['sides'], 10, 90], [13.5, 'tempo', 1], [13.6, 'rest']], card('DANCE CAM', { style: 'pulse', fx: burst })),
    tile('halftime', 'Halftime show', 16, [[0, 'house', 'blackout'], [0, 'look', 'intro'], [0.5, 'msg', 'HALFTIME', NAME, 'glow', 6], [1, 'smoke', 'front', 5], [2, 'drones', { shape: 'galaxy', colour: 'rainbow' }], [3, 'crowd', 'neon'],
      [6, 'look', 'beamfan', 8], [6, 'house', 'game'], [6.2, 'flames', 1.5], [8, 'pyro', 'willows'], [10, 'crowd', 'rainbowwave'], [12, 'streamers'], [15.5, 'land'], [15.8, 'rest']], card('HALFTIME', { style: 'glow' })),
    tile('lap', 'Victory lap', 14, [[0, 'msg', 'CHAMPIONS', NAME, 'flash', 13], [0, 'crowd', 'goldrush'], [0, 'look', 'full', 12], [0.3, 'drop', GOLD], [0.5, 'streamers'], [1, 'pyro', 'goldstorm'], [2, 'drones', { word: 'CHAMPS', colour: 'solid', pal: ['#ffd24a'] }], [6, 'confetti'], [13.5, 'land'], [13.8, 'rest']],
      card('CHAMPIONS', { fx: ball(GOLD) })),
  ];
  const concert = [
    tile('opening', 'Opening', 14, [[0, 'house', 'blackout'], [0, 'look', 'intro'], [0, 'smoke', 'front', 5], [0.5, 'msg', 'WELCOME', NAME, 'glow', 6], [1.5, 'drones', { shape: 'grid', colour: 'solid', pal: ['#00e5ff'] }], [3, 'crowd', 'wave'],
      [4, 'drones', { shape: 'wave', colour: 'sweep' }], [6, 'flames', 1.5], [6.2, 'pyro', 'willows'], [8, 'jets'], [8.2, 'look', 'anthem', 5], [8.2, 'house', 'game'], [13, 'land'], [13.5, 'rest']], card('WELCOME', { style: 'glow' })),
    tile('showtime', 'Showtime count', 9, [...count(0), [4.2, 'msg', 'SHOWTIME', '', 'flash', 4], [4.2, 'look', 'drop', 4], [4.2, 'pyro', 'classic'], [4.2, 'confetti'], [4.3, 'crowd', 'strobe'], [4.4, 'drones', { shape: 'burst', colour: 'rainbow' }], [6, 'crowd', 'team'], [8.5, 'land']],
      card('SHOWTIME', { style: 'pulse' })),
    tile('thedrop', 'The drop', 7, [[0, 'house', 'blackout'], [0, 'crowd', 'blackout'], [0, 'look', 'blackout'], [0.7, 'look', 'drop', 5], [0.7, 'house', 'game'], [0.7, 'crowd', 'strobe'], [0.7, 'jets'], [0.8, 'pyro', 'crackle'], [0.8, 'msg', 'DROP', '', 'flash', 4], [3, 'crowd', 'rainbow'], [6.5, 'rest']],
      card('DROP', { fx: burst })),
    tile('ballad', 'Ballad', 15, [[0, 'look', 'ballad'], [0, 'crowd', 'phones'], [0.5, 'spot', 'stage'], [1, 'bubbles', ['stage', 'truss'], 12, 80], [1, 'msg', NAME, '', 'glow', 13], [14.5, 'rest']], card('♪', { style: 'glow' })),
    tile('encore', 'Encore', 10, [[0, 'msg', 'ENCORE!', '', 'pulse', 8], [0, 'jets'], [0.8, 'jets'], [1.6, 'jets'], [2.2, 'look', 'encore', 6], [2.2, 'crowd', 'rainbow'], [2.4, 'pyro', 'crackle'], [4, 'pyro', 'rings'], [5, 'streamers'], [6, 'confetti'], [7, 'flames', 1.5], [9.5, 'rest']],
      card('ENCORE!', { style: 'pulse' })),
    tile('finale', 'Grand finale', 16, [[0, 'msg', 'THANK YOU', NAME, 'flash', 12], [0, 'look', 'full', 12], [0, 'crowd', 'rainbow'], [0, 'confetti'], [0, 'floor'], [0.4, 'streamers'], [1, 'pyro', 'finale'], [1.6, 'jets'], [2.5, 'drop', PARTY],
      [3.5, 'drones', { shape: 'heart', colour: 'rainbow' }], [6, 'pyro', 'goldstorm'], [9, 'flames', 2], [11, 'jets'], [15, 'land'], [15.5, 'rest']], card('THANK YOU', { fx: conf })),
    tile('lightsup', 'Lights up', 8, [[0, 'house', 'blackout'], [0, 'crowd', 'blackout'], [0, 'look', 'blackout'], [1.5, 'look', 'full', 5], [1.5, 'house', 'game'], [1.5, 'crowd', 'bigflash'], [1.6, 'jets'], [1.7, 'pyro', 'classic'], [7.5, 'rest']], card('LIGHTS UP', { fx: burst })),
    tile('solo', 'Guitar solo', 12, [[0, 'look', 'tilt', 11], [0, 'spot', 'bstage'], [0, 'crowd', 'inferno'], [0.2, 'flames', 1.2, 'gold'], [3, 'flames', 1.2], [6, 'flames', 1.2], [9, 'flames', 2], [9, 'pyro', 'crackle'], [11.5, 'rest']], card('SOLO', { style: 'glow' })),
    tile('singalong', 'Sing along', 14, [[0, 'look', 'ballad'], [0, 'house', 'game'], [0, 'crowd', 'twinkle'], [0.5, 'msg', 'SING IT!', '', 'glow', 13], [1, 'bubbles', ['truss'], 12, 60], [13.5, 'rest']], card('SING IT!', { style: 'glow' })),
    tile('rainfall', 'Rain dance', 12, [[0, 'look', 'lasershow', 11], [0, 'crowd', 'storm'], [0.3, 'smoke', 'front', 6], [1, 'flash', '#ffffff', 300], [4, 'flash', '#ffffff', 300], [7, 'flash', '#ffffff', 300], [11.5, 'rest']], card('⚡', { style: 'glow' })),
    tile('sunsetset', 'Sunset set', 14, [[0, 'look', 'anthem'], [0, 'crowd', 'sunset'], [0.5, 'drones', { shape: 'wave', colour: 'sweep', pal: ['#ff7a1a', '#ff2f6d'] }], [1, 'bubbles', ['stage'], 10, 60], [13.5, 'land'], [13.8, 'rest']], card('SUNSET', { style: 'glow', fx: ball(['#ff7a1a', '#ff2f6d', '#9b3dff']) })),
    tile('walkoff', 'Walk-off', 10, [[0, 'msg', 'GOODNIGHT', NAME, 'glow', 9], [0, 'look', 'ballad'], [0, 'crowd', 'phones'], [0.5, 'spot', 'stage'], [2, 'drones', { word: 'BYE', colour: 'solid', pal: ['#ffffff'] }], [8, 'house', 'house'], [9.5, 'land'], [9.8, 'rest']], card('GOODNIGHT', { style: 'glow' })),
    tile('galaxy', 'Galaxy', 14, [[0, 'look', 'lasershow'], [0, 'crowd', 'flow'], [0, 'drones', { shape: 'galaxy', colour: 'rainbow' }], [1, 'bubbles', ['stage', 'sides'], 10, 80], [2, 'smoke', 'sides', 6], [13.5, 'land'], [13.8, 'rest']],
      card('✦', { style: 'glow', fx: burst })),
  ];
  const celebrate = [
    tile('birthday', 'Birthday', 14, [[0, 'msg', 'HAPPY BIRTHDAY', NAME, 'hearts', 13], [0, 'crowd', 'message', 'HAPPY BIRTHDAY'], [0.3, 'drop', PASTEL], [0.8, 'drones', { shape: 'heart', pal: ['#ff2bd6', '#ffd24a'] }], [1, 'confetti'], [2, 'streamers'], [4, 'pyro', 'willows'], [7, 'floor'], [13.5, 'land'], [13.8, 'rest']],
      card('HAPPY BDAY', { style: 'hearts', fx: ball(PASTEL) })),
    tile('firstdance', 'First dance', 16, [[0, 'house', 'blackout'], [0, 'look', 'ballad'], [0, 'crowd', 'phones'], [0.5, 'spot', 'centre'], [0.5, 'fog', 15], [1, 'bubbles', ['truss', 'stage'], 13, 70], [1.5, 'msg', NAME, 'FIRST DANCE', 'glow', 14], [3, 'drones', { shape: 'heart', colour: 'solid', pal: ['#ffffff'] }], [15.5, 'land'], [15.8, 'rest']],
      card('FIRST DANCE', { style: 'glow' })),
    tile('proposal', 'Proposal', 15, [[0, 'house', 'blackout'], [0, 'spot', 'centre'], [0, 'crowd', 'hearts'], [0.5, 'msg', 'WILL YOU MARRY ME?', NAME, 'hearts', 8], [1, 'drones', { shape: 'heart', pal: LOVE }],
      [9, 'msg', 'SHE SAID YES!', '', 'flash', 6], [9, 'house', 'game'], [9, 'look', 'encore', 5], [9, 'confetti'], [9.2, 'drop', LOVE], [9.5, 'pyro', 'rings'], [14.5, 'land'], [14.8, 'rest']], card('MARRY ME?', { style: 'hearts' })),
    tile('newyear', 'New Year', 15, [...count(0), [4.2, 'msg', 'HAPPY NEW YEAR', '', 'flash', 9], [4.2, 'look', 'full', 8], [4.2, 'pyro', 'finale'], [4.2, 'sky'], [4.3, 'confetti'], [4.3, 'floor'], [4.5, 'drop', GOLD], [4.5, 'streamers'], [4.6, 'crowd', 'fireworks'],
      [4.8, 'drones', { shape: 'burst', colour: 'rainbow' }], [9, 'drones', { word: '2027', colour: 'sweep', pal: ['#ffd24a', '#ffffff'] }], [14.5, 'land'], [14.8, 'rest']], card('HAPPY NEW YEAR', { fx: conf })),
    tile('award', 'Award winner', 11, [[0, 'house', 'blackout'], [0, 'spot', 'stage'], [0.5, 'msg', 'AND THE WINNER IS…', '', 'glow', 3], [3, 'msg', NAMEOR('WINNER'), 'WINNER', 'flash', 7], [3, 'look', 'anthem', 7], [3, 'house', 'game'], [3, 'crowd', 'message', 'WINNER'], [3.2, 'pyro', 'willows'], [3.4, 'confetti'], [3.6, 'drop', GOLD], [10.5, 'rest']],
      card('WINNER', { fx: ball(GOLD) })),
    tile('reveal', 'Product reveal', 13, [[0, 'house', 'blackout'], [0, 'look', 'blackout'], [0, 'crowd', 'blackout'], [0.3, 'smoke', 'front', 5], [0.5, 'msg', 'INTRODUCING', '', 'glow', 4], [1, 'drones', { shape: 'sphere', colour: 'solid', pal: ['#ffffff'] }],
      [4.5, 'drones', { shape: 'burst', colour: 'rainbow' }], [4.5, 'msg', NAMEOR('THE NEW ONE'), '', 'flash', 7], [4.5, 'look', 'full', 6], [4.5, 'house', 'game'], [4.5, 'flash', '#ffffff', 900], [4.6, 'jets'], [5, 'pyro', 'crackle'], [12.5, 'land'], [12.8, 'rest']],
      card('REVEAL', { fx: burst })),
    tile('graduation', 'Graduation', 12, [[0, 'msg', 'CLASS OF 2026', NAME, 'flash', 10], [0, 'crowd', 'team'], [0.3, 'confetti'], [0.5, 'streamers'], [1, 'drop'], [2, 'pyro', 'classic'], [11.5, 'rest']], card('CLASS OF 26', { fx: conf })),
    tile('anniversary', 'Anniversary', 13, [[0, 'msg', 'HAPPY ANNIVERSARY', NAME, 'hearts', 12], [0, 'crowd', 'valentine'], [0, 'look', 'ballad'], [0.5, 'drones', { shape: 'infinity', pal: LOVE }], [1, 'bubbles', ['stage'], 10, 60], [5, 'drop', LOVE], [12.5, 'land'], [12.8, 'rest']], card('♥ YEARS', { style: 'hearts', fx: ball(LOVE) })),
    tile('babyreveal', 'Baby reveal', 12, [...count(0), [4.2, 'msg', NAMEOR("IT'S A…"), '', 'flash', 7], [4.2, 'flash', '#ffffff', 600], [4.3, 'drop', PASTEL], [4.4, 'confetti'], [4.6, 'crowd', 'candy'], [5, 'drones', { shape: 'heart', pal: ['#ffb3de', '#b3f0ff'] }], [11.5, 'land'], [11.8, 'rest']], card("IT'S A…", { fx: ball(PASTEL) })),
    tile('opening2', 'Grand opening', 12, [[0, 'msg', 'GRAND OPENING', NAME, 'flash', 11], [0, 'look', 'full', 10], [0, 'crowd', 'goldrush'], [0.3, 'streamers'], [0.5, 'confetti'], [1, 'pyro', 'goldstorm'], [2, 'drones', { shape: 'star', colour: 'solid', pal: ['#ffd24a'] }], [11.5, 'land'], [11.8, 'rest']], card('OPEN!', { fx: conf })),
    tile('retire', 'Retirement', 12, [[0, 'house', 'blackout'], [0, 'spot', 'centre'], [0, 'crowd', 'phones'], [0.5, 'msg', 'THANK YOU', NAME, 'glow', 11], [2, 'drones', { word: 'THANKS', colour: 'solid', pal: ['#ffffff'] }], [6, 'house', 'game'], [6, 'look', 'anthem', 5], [6.2, 'drop', GOLD], [11.5, 'land'], [11.8, 'rest']], card('THANK YOU', { style: 'glow' })),
    tile('spooky', 'Halloween', 12, [[0, 'house', 'blackout'], [0, 'crowd', 'halloween'], [0, 'look', 'strobefit', 11], [0.3, 'fog', 11], [0.5, 'msg', 'BOO!', '', 'flash', 6], [1, 'drones', { shape: 'eye', colour: 'solid', pal: ['#ff7a00'] }], [11.5, 'land'], [11.8, 'rest']], card('BOO!', { style: 'pulse' })),
    tile('holiday', 'Holiday cheer', 14, [[0, 'msg', 'HAPPY HOLIDAYS', NAME, 'glow', 13], [0, 'crowd', 'xmas'], [0, 'look', 'acoustic'], [0.5, 'drones', { shape: 'star', colour: 'solid', pal: ['#ffd24a'] }], [1, 'bubbles', ['truss', 'sides'], 12, 120], [6, 'drop', ['#ff1430', '#00c853', '#ffffff']], [13.5, 'land'], [13.8, 'rest']],
      card('HOLIDAYS', { style: 'glow', fx: ball(['#ff1430', '#00c853', '#ffffff']) })),
    tile('keynote', 'Keynote walk-on', 10, [[0, 'look', 'intro'], [0, 'sweep', 4], [0.5, 'msg', 'WELCOME', NAME, 'glow', 9], [0.5, 'crowd', 'wave'], [4, 'spot', 'stage'], [4, 'look', 'anthem'], [4.2, 'jets'], [9.5, 'rest']], card('WELCOME', { style: 'glow' })),
  ];
  const effects = [
    tile('e-confetti', 'Confetti burst', 6, [[0, 'confetti']], (g, w, h, t) => T.confetti(g, w, h, t)),
    tile('e-floor', 'Floor cannons', 8, [[0, 'floor']], (g, w, h, t) => T.confetti(g, w, h, t, { n: 90 })),
    tile('e-stage', 'Stage cannons', 6, [[0, 'poppers']], (g, w, h, t) => T.confetti(g, w, h, t, { cols: PARTY })),
    tile('e-streamers', 'Streamers', 7, [[0, 'streamers']], (g, w, h, t) => T.streamers(g, w, h, t)),
    tile('e-pyro', 'Pyro', 4, [[0, 'pyro', 'classic']], (g, w, h, t) => T.pyro(g, w, h, t)),
    tile('e-flames', 'Flames', 3, [[0, 'flames', 3]], (g, w, h, t) => T.flames(g, w, h, t)),
    tile('e-co2', 'CO2 blast', 3, [[0, 'jets']], (g, w, h, t) => T.smoke(g, w, h, t, { kind: 'jets' })),
    tile('e-smoke', 'Smoke drop', 9, [[0, 'smoke', 'front', 6]], (g, w, h, t) => T.smoke(g, w, h, t)),
    tile('e-fog', 'Low fog', 15, [[0, 'fog', 15]], (g, w, h, t) => T.smoke(g, w, h, t, { kind: 'fog' })),
    tile('e-bubbles', 'Bubbles', 10, [[0, 'bubbles', ['stage', 'truss'], 8, 120]], (g, w, h, t) => T.bubbles(g, w, h, t)),
    tile('e-drop', 'Balloon drop', 10, [[0, 'drop']], (g, w, h, t) => T.balloons(g, w, h, t, { cols: team() })),
    tile('e-beach', 'Beach balls', 20, [[0, 'beach', 20]], (g, w, h, t) => T.balloons(g, w, h, t, { beach: true })),
    tile('e-spot', 'Spotlight', 8, [[0, 'house', 'blackout'], [0, 'spot', 'centre'], [7.5, 'rest']], (g, w, h, t) => { T.room(g, w, h); T.beams(g, w, h, t, { n: 1, a: '#fff3dc', beh: 'park', width: 0.12 }); }),
    tile('e-crowdflash', 'Crowd flash', 2, [[0, 'flash', '#ffffff', 700]], card('', { style: 'glow' })),
    tile('e-wave', 'Crowd wave', 8, [[0, 'crowd', 'wave'], [7.5, 'crowd', 'blackout']], card('', { style: 'glow' })),
  ];
  // the drones: formations straight from the swarm's own shapes (droneshapes.js), so a tile shows
  // what flies. They hold the formation until another is chosen or they land.
  const rainbowCol = (i, t, u, v) => T.hsl((u + v) * 90 + t * 60);
  const teamCol = (i) => team()[i % 2];
  const FORMS = [
    ['ring', 'Ring', 'split'], ['heart', 'Heart', 'split', LOVE], ['star', 'Star', 'twinkle', ['#ffe600', '#ffffff']], ['sphere', 'Sphere', 'rainbow'],
    ['galaxy', 'Galaxy', 'rainbow'], ['helix', 'Helix', 'split'], ['wave', 'Wave', 'sweep'], ['tornado', 'Tornado', 'rainbow'],
    ['torus', 'Torus', 'split'], ['knot', 'Knot', 'rainbow'], ['cube', 'Cube', 'split'], ['pyramid', 'Pyramid', 'solid', ['#ffd24a']],
    ['saturn', 'Saturn', 'split', ['#ffd24a', '#8a2bff']], ['flower', 'Flower', 'rainbow'], ['infinity', 'Infinity', 'sweep'], ['butterfly', 'Butterfly', 'split', ['#ff2bd6', '#00e5ff']],
    ['jellyfish', 'Jellyfish', 'split', ['#00e5ff', '#8a2bff']], ['spiral', 'Spiral', 'rainbow'], ['eye', 'The eye', 'split', ['#ffffff', '#00e5ff']], ['smiley', 'Smiley', 'solid', ['#ffe600']],
    ['bolt', 'Lightning bolt', 'solid', ['#ffe600']], ['crown', 'Crown', 'solid', ['#ffd24a']], ['rain', 'Drone rain', 'twinkle', ['#00e5ff', '#ffffff']],
    ['burst', 'Burst at the crowd', 'rainbow'], ['tunnel', 'Tunnel', 'rainbow'], ['flyover', 'Fly-over', 'sweep'], ['canopy', 'Canopy over the crowd', 'twinkle'], ['comet', 'Comet', 'split', ['#ffffff', '#00e5ff']],
  ];
  const dtile = (id, name, colour, pal) => {
    const opts = { shape: id, colour, ...(pal ? { pal } : {}) };
    const col = colour === 'rainbow' ? rainbowCol : pal ? (i) => pal[i % pal.length] : teamCol;
    return { id, name, draw: (g, w, h, t) => T.drones(g, w, h, t, { pts: previewPoints(opts, t), col }), play: () => F.drones(opts) };
  };
  const wtile = (id, name, word, colour = 'sweep') => ({ id, name, draw: (g, w, h, t) => T.drones(g, w, h, t, { pts: previewPoints({ word: typeof word === 'function' ? word() : word }, t), col: teamCol }), play: () => F.drones({ word: typeof word === 'function' ? word() : word, colour }) });
  const drones = [
    ...FORMS.map(([id, name, colour, pal]) => dtile(id, name, colour, pal)),
    wtile('name', 'The name', () => NAME().slice(0, 8) || 'PIXMOB'), wtile('pixmob', 'PIXMOB', 'PIXMOB'), wtile('love', 'LOVE', 'LOVE', 'split'), wtile('wow', 'WOW', 'WOW'), wtile('go', 'GO!', 'GO!'),
    { id: 'land', name: 'Land the drones', draw: (g, w, h, t) => T.drones(g, w, h, t, { pts: Array.from({ length: 90 }, (_, i) => [((i % 15) / 14 - 0.5) * 1.8, 0.6 - Math.min(1, (t % 3) / 2.5) * 1.6, 0]), col: () => '#fff' }), play: () => F.land() },
  ];
  // the name, or a stand-in when there's none
  function NAMEOR(fallback) { return () => NAME() || fallback; }
  const colourControls = [
    { type: 'colors', label: 'Colour 1', list: TEAM, get value() { return S.a; }, change: (v) => { S.a = v; save(); } },
    { type: 'colors', label: 'Colour 2', list: TEAM, get value() { return S.b; }, change: (v) => { S.b = v; save(); } },
    { type: 'text', label: 'Name', get value() { return S.name; }, input: (v) => { S.name = v; save(); } },
  ];
  const venueChoice = { type: 'choice', label: 'Venue', options: [['concert', 'Concert'], ['hockey', 'Hockey'], ['basketball', 'Court']],
    get value() { return eng.mode; }, change: (m) => eng.builder?.setState({ mode: m }) };

  return {
    title: 'Moments',
    button: 'MOMENTS',
    tabs: [
      { id: 'game', name: 'Game', tiles: game, controls: [venueChoice, ...colourControls] },
      { id: 'concert', name: 'Concert', tiles: concert, controls: colourControls },
      { id: 'celebrate', name: 'Celebrate', tiles: celebrate, controls: colourControls },
      { id: 'effects', name: 'Effects', tiles: effects },
      { id: 'drones', name: 'Drones', tiles: drones },
    ],
    controls: [{ type: 'button', label: 'Stop everything', click: stopAll }],
    crowdSync: {
      label: 'Wristbands', sub: 'The crowd is part of every moment',
      get on() { return S.crowd; },
      set(v) { S.crowd = !!v; save(); if (!S.crowd) orbFX.set({ mode: 'off' }); },
    },
  };
}

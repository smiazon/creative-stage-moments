// AUTO SHOW: pick a song, press play, and the room runs itself (the Crowd app: the wristbands;
// the Light app: the stage lights, through its own driver).
// The song is listened to live (Web Audio) and split three ways:
//   LOWS   the kick drum: they're counted into beats and bars (a guess at the tempo), and
//          the effect changes on a downbeat every 8 to 16 bars, at once on a drop
//   MIDS   the feel: how fast the effect runs (the show's tempo follows them)
//   HIGHS  the colour and the shimmer: hi-hats move the colours on, a cymbal crash
//          throws a white sparkle across the crowd, the treble sprinkles glints on the screens
// One style at a time (Grid, Unifying, Grouping or MH), in the colours picked (up to four,
// or the rainbow), at an energy (Low, Medium, High, Extreme). Colours are only ever bright
// and saturated, one at a time or several together, now and then white.
// The screens get a visual of their own: random, saturated colour noise drawn on the graphics
// card (marbled ink, glowing cells, flowing bands, a kaleidoscope; a new one with each effect),
// that the kick punches (it breathes in, warps and blooms) and the treble makes shimmer. The song can play from the arena's PA
// (its speaker stacks and the room's acoustics, heard from where you stand), or straight.
import * as THREE from 'three';
import { MOTIONS } from './irheads.js';
import { createNoiseScreens } from './noisescreens.js';

// the colours to pick from: bright and saturated only, and white
export const AUTO_COLOURS = [
  ['#ff1430', 'Red'], ['#ff7a00', 'Orange'], ['#ffe600', 'Yellow'], ['#7dff1a', 'Lime'], ['#00ff6a', 'Green'],
  ['#00e5ff', 'Cyan'], ['#1e5aff', 'Blue'], ['#8a2bff', 'Purple'], ['#ff2bd6', 'Magenta'], ['#ffffff', 'White'],
];
export const AUTO_ENERGY = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['extreme', 'Extreme']];
export const AUTO_STYLES = [['grid', 'Grid'], ['wash', 'Unifying'], ['group', 'Grouping'], ['ir', 'MH']];

// what each energy means: how many bars an effect lasts (8 to 16 on average), the tempo range
// the mids move in, the shortest wait between colour changes (seconds), how much the highs
// shimmer, how often a crash may sparkle, how lively the screens are
const ENERGY = {
  low: { k: 0, bars: [16, 16], tempo: [0.3, 0.7], colour: 9, shimmer: 0.35, glint: 0, vis: 0.55 },
  medium: { k: 1, bars: [12, 16], tempo: [0.55, 1.15], colour: 4.5, shimmer: 0.6, glint: 20, vis: 1 },
  high: { k: 2, bars: [8, 12], tempo: [0.95, 1.8], colour: 2.2, shimmer: 0.85, glint: 10, vis: 1.45 },
  extreme: { k: 3, bars: [8, 8], tempo: [1.5, 2.7], colour: 1.1, shimmer: 1, glint: 5, vis: 2.1 },
};

// the effects of each style, calm to wild. GRID: the Show presets that wear the picked
// colours (none with words; the BLEND ones run one colour into another, so one colour only)
const GRID = [
  ['flow', 'northern', 'softripple', 'wave', 'ribbon1', 'sweep', 'tierblocks', 'glitter', 'ripple'],
  ['march', 'comets', 'ripple', 'zigzagall', 'ribbons', 'sweep', 'tiers', 'dotfloor', 'countercomets', 'stripes2', 'pulsering', 'team', 'rain', 'scanner'],
  ['equalizer', 'checker', 'teams', 'zigzag', 'scanner', 'tiers', 'heartbeat', 'bassfloor', 'pulsering', 'countercomets', 'halves', 'march'],
  ['strobe', 'equalizer', 'checker', 'teams', 'heartbeat', 'bassfloor', 'pulsering', 'zigzag'],
];
const BLEND = new Set(['flow', 'northern']);
const SPARKLY = new Set(['glitter', 'dotfloor', 'rain', 'comets', 'countercomets', 'team']);
const WASHES = [
  [['solid', 0.6], ['fade', 0.5], ['fade', 0.8]],
  [['fade', 1], ['pulse', 0.8], ['open', 0.9], ['close', 0.9]],
  [['pulse', 1.3], ['close', 1.4], ['open', 1.3], ['pulse', 1.7], ['strobe', 0.7]],
  [['strobe', 1], ['pulse', 2.2], ['close', 2.2], ['strobe', 1.4]],
];
const GROUPS = [
  { order: ['all', 'around', 'climb'], inner: ['together'], fx: ['solid', 'fade'], step: [0.5, 0.9], groups: [1, 2] },
  { order: ['around', 'pingpong', 'sides', 'climb', 'stage'], inner: ['together', 'chase'], fx: ['pulse', 'fade', 'open'], step: [0.22, 0.36], groups: [2, 3] },
  { order: ['snake', 'alternate', 'random', 'build', 'sides'], inner: ['chase', 'alternate'], fx: ['pulse', 'close', 'comets', 'sparkle'], step: [0.11, 0.18], groups: [3, 4] },
  { order: ['random', 'alternate', 'snake'], inner: ['random', 'alternate'], fx: ['strobe', 'pulse', 'close'], step: [0.05, 0.09], groups: [4, 4] },
];
const IRS = [
  ['sweep', 'wave', 'rise', 'focus'],
  ['circles', 'figure8', 'lighthouse', 'search', 'wave'],
  ['cross', 'snap', 'search', 'circles', 'figure8'],
  ['snap', 'cross', 'lighthouse'],
];
// the screens' pattern families (0 marbled ink, 1 glowing cells, 2 flowing bands, 3 kaleidoscope)
const PATTERNS = [[0, 3, 2], [0, 1, 2, 3], [1, 2, 3, 0], [1, 2, 3]];

const pickOf = (a) => a[(Math.random() * a.length) | 0];
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const hueHex = (h) => `#${new THREE.Color().setHSL(((h % 1) + 1) % 1, 1, 0.5).getHexString()}`;

// THE CROWD DRIVER: what the music moves in the Crowd app, the wristbands' show (showdesigner.js).
// A driver says which styles there are, picks an effect for an energy, puts it on, answers a
// crash, sets the pace, and keeps and gives back what was on before. The Light app has its own
// (apps/light.js: the music moves the stage lights instead).
export function makeCrowdDriver(designer) {
  let glintT = 0;
  return {
    key: 'pm-auto',
    styles: AUTO_STYLES,
    colourFactor: (style) => (style === 'grid' ? 1.6 : 1),   // a grid redraws its zones: not too often
    pick({ k, style: st, scheme, shimmer, prev }) {
      if (st === 'grid') {
        let pool = GRID[k].filter((id) => id !== prev?.id);
        if (scheme.mode !== 'mono') pool = pool.filter((id) => !BLEND.has(id));
        if (shimmer > 0.5) { const sp = pool.filter((id) => SPARKLY.has(id)); if (sp.length && Math.random() < 0.6) pool = sp; }
        return { style: st, id: pickOf(pool) };
      }
      if (st === 'wash') { const [fx, speed] = pickOf(WASHES[k]); return { style: st, id: `${fx}${speed}`, fx, speed }; }
      if (st === 'group') {
        const G = GROUPS[k];
        return {
          style: st, id: `g${Math.random()}`, order: pickOf(G.order), inner: pickOf(G.inner), step: lerp(G.step[0], G.step[1], Math.random()),
          groups: G.groups[0] + ((Math.random() * (G.groups[1] - G.groups[0] + 1)) | 0), fx: [0, 1, 2, 3].map(() => pickOf(G.fx)),
        };
      }
      return { style: 'ir', id: pickOf(IRS[k].filter((m) => m !== prev?.id)) };
    },
    // put the effect on the wristbands, with the colours as they are now
    apply(effect, { scheme, shimmer }) {
      const { mode, cols } = scheme, rainbow = mode === 'rainbow';
      const prob = Math.max(0.5, 1 - shimmer * 0.5);   // the highs turn a share of the bands into glints
      if (effect.style === 'grid') {
        designer.setBrand?.(rainbow ? { rainbow: true } : { a: cols[0], b: cols[1] || cols[0], extra: cols.slice(2), rainbow: false });
        if (designer.demo !== effect.id) designer.playDemo?.(effect.id);
      } else if (effect.style === 'wash') {
        designer.setWash?.({ fx: effect.fx, speed: effect.speed, prob, a: cols[0], pal: cols, cmode: rainbow ? pickOf(['rainbow', 'cycle']) : cols.length > 1 ? 'pal' : 'a' });
      } else if (effect.style === 'group') {
        designer.setGroup?.({
          order: effect.order, inner: effect.inner, step: effect.step, groups: effect.groups, gsplit: 'across', speed: 1,
          cmode: rainbow ? 'rainbow' : 'group', fx: effect.fx.map((fx, k) => ({ fx: shimmer > 0.6 && k === 3 ? 'twinkle' : fx, a: cols[k % cols.length] })),
          floor: { fx: effect.fx[0], cols: cols.slice(0, 4), mode: 'chase' },
        });
      } else {
        const m = MOTIONS.find((o) => o.id === effect.id) || MOTIONS[0];
        designer.setIR?.({ motion: m.id, fx: m.fx || 'solid', gobo: m.gobo || 'circle', size: m.size || 1, heads: 0, prob, a: cols[0], pal: cols, cmode: rainbow ? 'rainbow' : cols.length > 1 ? 'pal' : 'a' });
      }
    },
    // a cymbal crash: a white sparkle runs across the crowd for a moment, then the effect comes back
    glint(restore, { style: st }) {
      if (st === 'grid') designer.playDemo?.('phones');
      else if (st === 'wash') designer.setWash?.({ fx: 'solid', speed: 3, prob: 0.22, a: '#ffffff', cmode: 'a' });
      else if (st === 'group') designer.setGroup?.({ fx: [0, 1, 2, 3].map(() => ({ fx: 'twinkle', a: '#ffffff' })), cmode: 'group' });
      else designer.setIR?.({ fx: 'strobe', a: '#ffffff', cmode: 'a' });
      clearTimeout(glintT);
      glintT = setTimeout(restore, 650);
    },
    pace(t) { designer.setTempo?.(t); },   // the mids: how fast the effect runs
    snapshot: () => ({ show: designer.snapshot?.(), tempo: designer.tempo }),
    restore(b) { if (b?.show) designer.restore?.(b.show); if (b && Number.isFinite(b.tempo)) designer.setTempo?.(b.tempo); },
    end(b) { designer.playDemo?.('blackout'); if (b && Number.isFinite(b.tempo)) designer.setTempo?.(b.tempo); },
    cancel() { clearTimeout(glintT); },
  };
}

export function initAutoShow({ designer, setScreens, pa = null, renderer = null, driver = null }) {
  const D = driver || makeCrowdDriver(designer);
  const KEY = D.key || 'pm-auto';
  // --- what was picked (kept between visits) ---------------------------------------------------
  const cfg = { colours: ['#ff2bd6', '#00e5ff'], rainbow: false, energy: 'medium', style: D.styles[0][0], pa: true };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) {
      if (Array.isArray(s.colours)) cfg.colours = s.colours.filter((c) => AUTO_COLOURS.some(([h]) => h === c)).slice(0, 4);
      cfg.rainbow = !!s.rainbow;
      if (ENERGY[s.energy]) cfg.energy = s.energy;
      if (D.styles.some(([id]) => id === s.style)) cfg.style = s.style;
      if (typeof s.pa === 'boolean') cfg.pa = s.pa;
    }
  } catch (_) { /* private mode */ }
  if (!cfg.colours.length && !cfg.rainbow) cfg.colours = ['#ff2bd6'];
  const saveCfg = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (_) { /* private mode */ } };
  const EN = () => ENERGY[cfg.energy];

  // --- the song ---------------------------------------------------------------------------------
  const audio = new Audio();
  audio.preload = 'auto';
  audio.playsInline = true;
  let ctx = null, analyser = null, freq = null, url = null, name = '';
  let playing = false, paused = false, onChange = () => {};   // playing: a show is on (paused or not)
  const ensureAudio = () => {
    if (ctx) return;
    // the PA's own context, so the song can go through it (dry while the PA is off)
    ctx = pa?.context?.() || new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.35;   // quick enough to catch a kick; the screens smooth on their own
    src.connect(analyser);
    if (pa?.attach) pa.attach(analyser); else analyser.connect(ctx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
  };
  // the PA: on while a show plays if the switch says so; switched back off after, if we switched it on
  let paOurs = false;
  function routePA() {
    if (!pa) return;
    if (playing && cfg.pa && !pa.on) { pa.set(true); paOurs = true; }
    else if ((!playing || !cfg.pa) && pa.on && (paOurs || cfg.pa === false)) { pa.set(false); paOurs = false; }
  }
  audio.addEventListener('ended', () => stop({ end: true }));   // the song is over: the room goes to Blackout

  // --- listening: lows, mids, highs ----------------------------------------------------------------
  const A = {
    low: 0, mid: 0, high: 0, lowPrev: 0, lowAvg: 0.2, highPrev: 0,
    highFlux: 0.005, highDev: 0.005, highAvg: 0.05,
    midSm: 0, midPeak: 0.2, midFloor: 0.1, midN: 0.5, highSm: 0, highPeak: 0.1, highN: 0.3,
    eShort: 0, eLong: 0.2, peak: 0.25, songT: 0,
    lastKick: 0, kicks: 0, lastAccent: 0, lastGlint: 0, changedAt: 0, colourAt: 0, tempoAt: 0, tempoSent: -1,
    // the guess at the beat: the gaps between kicks, the beat's length, and where we are
    gaps: [], beat: 0.5, beats: 0, bars: 12,
  };
  // the beat's length from the last kicks: each gap folded into one beat (80 to 170 a minute), the middle one
  function guessBeat() {
    const f = A.gaps.map((g) => { while (g > 0.75) g /= 2; while (g < 0.35) g *= 2; return g; }).sort((a, b) => a - b);
    if (f.length >= 3) A.beat += (f[f.length >> 1] - A.beat) * 0.35;
  }
  const band = (lo, hi) => {   // the average of a frequency range, 0..1
    const ny = ctx.sampleRate / 2, n = freq.length;
    const a = Math.max(1, Math.floor((lo / ny) * n)), b = Math.min(n - 1, Math.ceil((hi / ny) * n));
    let s = 0;
    for (let i = a; i <= b; i++) s += freq[i];
    return s / ((b - a + 1) * 255);
  };

  // --- the screens' state (the colours live here too) ----------------------------------------------
  const V = { mode: 0, seed: Math.random() * 10, t: 0, tick: 0, kick: 0, low: 0, lowPeak: 0.2, glint: 0, flash: 0 };

  // --- the colours ----------------------------------------------------------------------------------
  // a scheme: one colour, a few together, or the whole rainbow; now and then a white accent
  let scheme = { mode: 'mono', cols: ['#ff2bd6'] }, pi = -1, hue = Math.random();
  function nextScheme() {
    const P = cfg.rainbow ? null : cfg.colours;
    if (!P) {
      if (Math.random() < 0.45) scheme = { mode: 'rainbow', cols: [0, 0.25, 0.5, 0.75].map((o) => hueHex(hue + o)) };
      else { hue = (hue + 0.22 + Math.random() * 0.25) % 1; scheme = { mode: 'mono', cols: [hueHex(hue)] }; }
    } else if (P.length === 1 || Math.random() < 0.55) {
      pi = (pi + 1) % P.length;
      scheme = { mode: 'mono', cols: [P[pi]] };
    } else {
      pi = (pi + 1) % P.length;
      scheme = { mode: 'multi', cols: [...P.slice(pi), ...P.slice(0, pi)] };
    }
    // sometimes white: a single colour gets a white partner
    if (scheme.mode === 'mono' && scheme.cols[0] !== '#ffffff' && Math.random() < 0.16) scheme = { mode: 'multi', cols: [scheme.cols[0], '#ffffff'] };
    paintScreens();
  }

  // --- the effect: one style, chosen by the energy, in the scheme's colours ---------------------------
  let effect = null;
  const shimmer = () => EN().shimmer * A.highN;   // the highs, as a share 0..1
  const pickEffect = () => D.pick({ k: EN().k, style: cfg.style, scheme, shimmer: shimmer(), prev: effect });
  function apply() { if (effect) D.apply(effect, { scheme, shimmer: shimmer(), style: cfg.style, energy: EN().k }); }
  function change(now, { colours = true } = {}) {
    if (colours) { nextScheme(); A.colourAt = now; }
    effect = pickEffect();
    apply();
    A.changedAt = now;
    A.kicks = 0;
    A.beats = 0;   // this is bar 1, beat 1
    const [b0, b1] = EN().bars;
    A.bars = b0 + Math.round(Math.random() * ((b1 - b0) / 4)) * 4;   // 8, 12 or 16: phrases come in fours
    V.mode = pickOf(PATTERNS[EN().k].filter((m) => m !== V.mode));   // the screens: a new pattern of their own
    V.seed = Math.random() * 10;
  }
  // a cymbal crash: the driver answers it (a white sparkle across the crowd; a blinder hit on the rig)
  function glint(now) {
    A.lastGlint = now;
    D.glint(() => { if (playing) apply(); }, { style: cfg.style });
  }

  // --- each frame: listen, decide, draw ---------------------------------------------------------------
  let raf = 0, last = 0, drawn = 0, lastAt = 0;
  function frame(now) {
    raf = playing ? requestAnimationFrame(frame) : 0;
    if (!playing || !analyser) return;   // stopped: a frame already queued does nothing (the room stays as stop left it)
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    // the counting runs on the song's own clock, so a slow frame never loses a beat
    const at = audio.currentTime, adt = Math.max(0, Math.min(0.5, at - lastAt)); lastAt = at;
    analyser.getByteFrequencyData(freq);
    if (paused) {   // paused: the show holds as it is, the screens settle; nothing is counted or changed
      V.t += dt * 0.04; V.kick *= Math.exp(-dt * 4); V.glint *= Math.exp(-dt * 4); V.flash *= Math.exp(-dt * 6);
      if (now - drawn > 33) { drawn = now; drawScreens(); }
      return;
    }
    const E = EN();
    A.low = band(35, 140); A.mid = band(300, 2000); A.high = band(5000, 14000);

    A.songT = at;
    const warm = A.songT > 6;   // the first seconds only learn what the song sounds like
    // LOWS: a kick is the bass rising well over its recent average
    const rising = A.low > A.lowPrev; A.lowPrev = A.low;
    const kick = rising && A.low > A.lowAvg * 1.28 && A.low > 0.16 && at - A.lastKick > Math.max(0.23, A.beat * 0.55);
    A.lowAvg += (A.low - A.lowAvg) * Math.min(1, dt * 1.6);
    // MIDS: how busy the middle is, between the song's own quietest and loudest
    A.midSm += (A.mid - A.midSm) * Math.min(1, dt * 1.5);
    A.midPeak = Math.max(A.midSm, A.midPeak * (1 - dt * 0.03));
    A.midFloor = Math.min(A.midSm, A.midFloor + dt * 0.004);
    A.midN = clamp01((A.midSm - A.midFloor) / Math.max(0.04, A.midPeak - A.midFloor));
    // HIGHS: the treble's level, and its sudden bursts (hats; a crash when it's big)
    const hf = Math.max(0, A.high - A.highPrev); A.highPrev = A.high;
    const accent = hf > A.highFlux + A.highDev * 3 && A.high > 0.06 && now - A.lastAccent > 120;
    A.highFlux += (hf - A.highFlux) * 0.06; A.highDev += (Math.abs(hf - A.highFlux) - A.highDev) * 0.06;
    A.highSm += (A.high - A.highSm) * Math.min(1, dt * 2);
    A.highPeak = Math.max(A.highSm, A.highPeak * (1 - dt * 0.03));
    A.highN = clamp01(A.highSm / Math.max(0.03, A.highPeak));
    const crash = warm && accent && A.high > A.highAvg * 2.2 && A.high > 0.2;
    A.highAvg += (A.high - A.highAvg) * Math.min(1, dt * 0.5);
    // the whole: a drop is loud straight after quiet
    const level = A.low * 0.5 + A.mid * 0.35 + A.high * 0.15;
    A.peak = Math.max(level, A.peak * (1 - dt * 0.02));
    const e = Math.min(1, level / Math.max(0.12, A.peak));
    A.eShort += (e - A.eShort) * Math.min(1, dt * 2.5);
    A.eLong += (e - A.eLong) * Math.min(1, dt * 0.25);
    // counting: the beat clock runs on its guess, and every kick pulls it back in line
    A.beats += adt / A.beat;
    if (kick) {
      const gap = at - A.lastKick;
      if (A.lastKick && gap < 2.5) { A.gaps.push(gap); if (A.gaps.length > 12) A.gaps.shift(); guessBeat(); }
      A.lastKick = at; A.kicks++;
      if (Math.abs(A.beats - Math.round(A.beats)) < 0.35) A.beats = Math.round(A.beats);   // on the beat: lock to it
      V.kick = 1;
      D.kick?.(E.k);
    }
    if (accent) { A.lastAccent = now; V.glint = Math.min(1, V.glint + 0.55); }

    // the lows change the effect: on the downbeat after 8 to 16 bars (a bar late if the drums
    // have stopped), and at once on a drop (loud straight after quiet, a kick on it)
    const due = A.bars * 4;
    const drop = warm && kick && A.beats >= 16 && A.eShort > A.eLong * 1.45 && A.eShort > 0.55;
    if (!effect || drop || (kick && A.beats >= due - 0.5) || A.beats >= due + 4) { change(now); if (drop) D.drop?.(E.k); }
    // the highs change the colour, on a hi-hat, not too often
    else if (accent && (now - A.colourAt) / 1000 > E.colour * (D.colourFactor?.(cfg.style) ?? 1) * (1.3 - A.highN * 0.5)) {
      nextScheme(); A.colourAt = now;
      if (D.colours) D.colours(effect, { scheme, shimmer: shimmer() }); else apply();
    }
    if (accent) D.accent?.(A.highN * E.shimmer);
    // a crash: a white sparkle, now and then
    if (crash && E.glint && (now - A.lastGlint) / 1000 > E.glint) { glint(now); V.flash = 1; }
    // the mids set the pace
    if (now - A.tempoAt > 180) {
      A.tempoAt = now;
      const t = lerp(E.tempo[0], E.tempo[1], A.midN ** 1.2);
      if (Math.abs(t - A.tempoSent) > 0.03) { A.tempoSent = t; D.pace(t, E.k); }
    }
    // the screens: the pattern moves at the mids' pace; the bass and the kick drive it, the treble glints
    V.t += dt * (0.22 + A.midN * 1.1) * E.vis;
    V.low += (A.low - V.low) * Math.min(1, dt * 8);
    V.lowPeak = Math.max(V.low, V.lowPeak * (1 - dt * 0.05));
    V.kick *= Math.exp(-dt * (4.5 + E.k * 1.5)); V.glint *= Math.exp(-dt * 5); V.flash *= Math.exp(-dt * 6);
    if (now - drawn > 33) { drawn = now; drawScreens(); }   // 30 a second is plenty for a screen
  }

  // --- the screens: random saturated colour noise, drawn on the graphics card (noisescreens.js) ---
  const NS = renderer ? createNoiseScreens(renderer) : null;
  // the colours: every colour picked (the wristbands take them one or a few at a time; the
  // screens show them all), the rainbow's whole wheel, or one colour with white
  function paintScreens() {
    const cols = cfg.rainbow ? scheme.cols : cfg.colours.length > 1 ? cfg.colours : [cfg.colours[0], '#ffffff'];
    NS?.setPalette(cols, cfg.rainbow);
  }
  function drawScreens() {
    NS?.render({
      t: V.t, kick: V.kick, low: clamp01(V.low / Math.max(0.1, V.lowPeak)), high: clamp01(A.highN * EN().shimmer),
      glint: V.glint, flash: V.flash, seed: V.seed, mode: V.mode, hueSpeed: 0.002 * (1 + A.highN),
    });
  }

  // --- play and stop -----------------------------------------------------------------------------------
  let before = null;   // the show that was on, back when it stops
  // counting from scratch: a new effect straight away, the beat learnt again
  function freshCount() {
    effect = null; A.changedAt = 0; A.kicks = 0; A.peak = 0.25; A.midPeak = 0.2; A.highPeak = 0.1; A.tempoSent = -1;
    A.songT = 0; A.gaps = []; A.beat = 0.5; A.beats = 0; A.lastKick = 0; A.eLong = 0.2; lastAt = audio.currentTime;
  }
  async function play() {
    if (!url) return false;
    ensureAudio();
    if (playing) {   // paused: carry on from where it was
      if (!paused) return true;
      try { await ctx.resume(); await audio.play(); } catch (_) { return false; }
      paused = false; lastAt = audio.currentTime;
      onChange();
      return true;
    }
    try { await ctx.resume(); await audio.play(); } catch (_) { return false; }
    playing = true; paused = false;
    routePA();
    before = D.snapshot();
    freshCount();
    if (NS) { paintScreens(); drawScreens(); setScreens?.({ wall: NS.wall, b: NS.b }); }
    if (!raf) raf = requestAnimationFrame(frame);
    onChange();
    return true;
  }
  // pause: the song holds and so does the show (the wristbands keep the effect they're on)
  function pause() {
    if (!playing || paused) return;
    audio.pause();
    paused = true;
    onChange();
  }
  // back to the top of the song, playing
  async function restart() {
    if (!url) return false;
    audio.currentTime = 0;
    if (!playing) return play();
    freshCount();
    if (paused) return play();
    onChange();
    return true;
  }
  // a new spot in the song (the playhead): the show carries on from there, and the bars are
  // counted again from the next kick
  function seek(t) {
    if (!url) return;
    const d = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = Math.max(0, Math.min(d ? d - 0.05 : t, t));
    A.beats = 0; A.lastKick = 0; A.kicks = 0; lastAt = audio.currentTime;
    onChange();
  }
  // stop: hands the room back (the show from before); at the song's end, the room blacks out
  function stop({ end = false } = {}) {
    if (!playing) return;
    playing = false; paused = false;
    D.cancel?.();
    audio.pause();
    routePA();
    setScreens?.(null);
    if (end) D.end(before); else D.restore(before);
    before = null;
    onChange();
  }
  return {
    load(file) {
      if (!file) return;
      const was = playing && !paused;
      stop();
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(file);
      audio.src = url;
      name = (file.name || 'Song').replace(/\.[^.]+$/, '');
      audio.currentTime = 0;
      onChange();
      if (was) play();   // a new song while one plays: straight on with it
    },
    play, pause, restart, stop, seek,
    get styles() { return D.styles; },   // what the Style row offers (the driver's)
    // inside a tap: wake the sound up now (a phone only lets it start from a touch)
    prime() { ensureAudio(); ctx.resume?.().catch?.(() => {}); },
    // the guess at the music, for the card: beats a minute, the bar it's on, the bars this effect lasts
    get count() { return playing && A.kicks + A.gaps.length > 2 ? { bpm: Math.round(60 / A.beat), bar: Math.floor(A.beats / 4) + 1, of: A.bars } : null; },
    // what was picked: colours (up to four) or the rainbow, the energy, the style. A change
    // while playing shows at once: new colours now, a new effect for a new energy or style
    get settings() { return { ...cfg, colours: [...cfg.colours] }; },
    set(patch) {
      Object.assign(cfg, patch);
      if (!cfg.colours.length && !cfg.rainbow) cfg.colours = ['#ff2bd6'];
      saveCfg();
      if ('pa' in patch) { routePA(); return; }
      if (!playing) return;
      const now = performance.now();
      if ('style' in patch || 'energy' in patch) change(now);
      else { pi = -1; nextScheme(); A.colourAt = now; apply(); }
    },
    get playing() { return playing && !paused; },   // the song is playing
    get active() { return playing; },               // a show is on (playing or paused)
    get paused() { return playing && paused; },
    get hasSong() { return !!url; },
    get name() { return name; },
    get time() { return audio.currentTime || 0; },
    get duration() { return Number.isFinite(audio.duration) ? audio.duration : 0; },
    set onChange(fn) { onChange = fn || (() => {}); },
  };
}

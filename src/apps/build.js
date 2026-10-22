// CREATIVE STAGE BUILD: design the production. CONCEPTS are whole stage designs, each consistent
// with itself (concepts.js): the stage, its decks (side catwalks, ramps, islands, wings, risers),
// trusses that follow the stage's shape with their lights, the PA where that stage needs it,
// barricades, effects. Each venue has its own list: the arena's, and the stadium's (sized for the
// stadium, its trusses out on the pitch standing on towers). SCREENS adds LED designs on top, as
// many as you like; RIG picks how much truss and which lights. Everything changes AT ONCE: a
// concept is hung in place (main.js rehangRig), no reload. STAGE, RUNWAY, VENUE and CROWD change
// the room through its own builder (builder.js); PRODUCTION is the rest of the build: front of
// house, the delay towers and their moving heads, the PA. Only another venue reloads the page.
// Every tile is a little 3D view of exactly what it builds (iso.js reads the same plan).
import * as T from './thumbs.js';
import { drawIso } from './iso.js';
import { RIG_STYLES, SCREEN_ADDONS, makePlan, conceptsFor } from './concepts.js';
import { SPEC } from '../venue.js';
import { createNoiseScreens } from '../noisescreens.js';

const ROOM_KEY = 'pm-build-room';
const HOUSE_CFG = { position: 'far', curtains: 'full', farSize: 'default', catwalk: 'standard', bstage: 'circle', screen: 'wall' };

export function buildApp(eng) {
  const B = eng.builder, st = () => B.state;
  const OPEN = eng.VENUE !== 'arena';   // the stadium, the cricket ground, the festival field: open air
  const CONCEPTS = conceptsFor(eng.VENUE);
  eng.setStageFollow?.(false);
  // work lights: the house lights up and a plain white look, to see the set as it is (not a show)
  let work = true;
  try { work = sessionStorage.getItem('pm-build-work') !== '0'; } catch (_) { /* private mode */ }
  const workLights = (on) => {
    work = on;
    try { sessionStorage.setItem('pm-build-work', on ? '1' : '0'); } catch (_) { /* private mode */ }
    eng.setLighting(on ? 'house' : 'game');
    eng.rigFX.cue(on ? 'acoustic' : 'blackout');
  };
  workLights(work);
  // the screens: a colour test card on every LED, so each design shows; off (the start), dark
  const NS = eng.renderer ? createNoiseScreens(eng.renderer) : null;
  NS?.setPalette(['#ff2bd6', '#00e5ff', '#d8ff3a', '#ff7a00'], true);
  const black = new eng.THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); black.needsUpdate = true;
  const leds = { on: false, raf: 0, t: 0, last: 0, mode: 0, at: 0 };
  function ledFrame(now) {
    leds.raf = leds.on ? requestAnimationFrame(ledFrame) : 0;
    const dt = Math.min(0.1, (now - (leds.last || now)) / 1000); leds.last = now; leds.t += dt * 0.4;
    if (now - leds.at > 12000) { leds.at = now; leds.mode = (leds.mode + 1) % 4; }
    NS.render({ t: leds.t, kick: 0, low: 0.35, high: 0.2, glint: 0, seed: 3.1, mode: leds.mode });
  }
  let screensOn = false;
  try { screensOn = sessionStorage.getItem('pm-build-leds') === '1'; } catch (_) { /* private mode */ }
  const setLeds = (on) => {
    screensOn = on;
    try { sessionStorage.setItem('pm-build-leds', on ? '1' : '0'); } catch (_) { /* private mode */ }
    leds.on = on && !!NS;
    if (leds.on) { eng.setScreens({ wall: NS.wall, b: NS.b }); if (!leds.raf) leds.raf = requestAnimationFrame(ledFrame); }
    else eng.setScreens({ wall: black, b: black });
  };
  setLeds(screensOn);
  const remember = () => { try { localStorage.setItem(ROOM_KEY, JSON.stringify({ venue: eng.VENUE, mode: st().mode, curtains: st().curtains, cfg: st().cfg, covers: st().covers, bfloor: st().bfloor })); } catch (_) { /* private mode */ } };
  const set = (c) => { setRoom(c); remember(); };
  const setRoom = (c) => B.setState({ mode: st().mode, curtains: st().curtains, covers: st().covers, bfloor: st().bfloor, ...c, cfg: { ...st().cfg, ...(c.cfg || {}) } });
  const concert = (c = {}) => set({ ...c, mode: 'concert' });

  // --- what's hung: read back from the plan's name ("Concept · style · addons") ----------------------------
  const pick = (() => {
    const p = eng.rigPlan?.();
    if (!p?.name || !p.name.includes(' · ')) return { concept: 'house', style: 'standard', addons: new Set() };
    const [cn, style, ad] = p.name.split(' · ');
    const c = CONCEPTS.find((x) => x[1] === cn);
    return { concept: c ? c[0] : 'house', style: style || 'standard', addons: new Set(ad && ad !== 'no add-ons' ? ad.split('+') : []) };
  })();
  // the room as it was left (the stage, the runway, the tarps), back with the rig it was built round
  try {
    const r = JSON.parse(localStorage.getItem(ROOM_KEY) || 'null');
    if (r && r.venue === eng.VENUE && r.cfg) setRoom(r);
  } catch (_) { /* nothing kept */ }
  const kindOf = (id) => CONCEPTS.find((c) => c[0] === id)?.[2] || 'end';
  const fits = (a) => { const A = SCREEN_ADDONS.find((x) => x[0] === a); return A && (A[2] === 'any' || A[2] === kindOf(pick.concept)); };
  let deck = null;
  const repaint = () => { deck?.refresh(); deck?.refreshControls(); relatch(); };
  // hang the pick now: the stage set-up it needs, then its rig, in place
  function hang() {
    let cfg, plan = null;
    if (pick.concept === 'house') cfg = HOUSE_CFG;
    else ({ cfg, plan } = makePlan(pick.concept, pick.style, [...pick.addons].filter(fits)));
    concert({ curtains: cfg.curtains || 'full', cfg });
    eng.rehang?.(plan);
    eng.rigFX.cue(work ? 'acoustic' : 'blackout');
    repaint();
  }

  // --- the previews --------------------------------------------------------------------------------------
  const imgs = {};
  const photo = (src) => (g, w, h) => {
    const im = imgs[src] || (imgs[src] = Object.assign(new Image(), { src }));
    g.fillStyle = '#0b0c12'; g.fillRect(0, 0, w, h);
    if (im.complete && im.naturalWidth) { const k = Math.max(w / im.naturalWidth, h / im.naturalHeight); g.drawImage(im, (w - im.naturalWidth * k) / 2, (h - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); }
  };
  // a preview is drawn in arena metres (the unit plan): the same design, whatever venue it fits
  const planCache = new Map();
  const planFor = (c, s, a) => {
    const k = `${c}|${s}|${a.join()}`;
    if (!planCache.has(k)) {
      const P = c === 'house' ? { cfg: { position: 'far', catwalk: 'standard', bstage: 'circle', screen: 'wall' }, plan: null } : makePlan(c, s, a);
      planCache.set(k, { cfg: P.cfg, plan: P.unit || P.plan });
    }
    return planCache.get(k);
  };
  const iso = (P, mark = null) => (g, w, h, t) => { g.fillStyle = '#07080c'; g.fillRect(0, 0, w, h); drawIso(g, w, h, { cfg: P.cfg, plan: P.plan, mark, t, open: OPEN }); };

  // --- CONCEPTS: this venue's designs, hung at once ---------------------------------------------------------
  const conceptTiles = [
    { id: 'house', name: 'House rig', draw: (g, w, h, t) => iso(planFor('house', '', []))(g, w, h, t), play: () => { pick.concept = 'house'; hang(); } },
    ...CONCEPTS.map(([id, name]) => ({ id, name, draw: (g, w, h, t) => iso(planFor(id, 'standard', []))(g, w, h, t), play: () => { pick.concept = id; hang(); } })),
  ];
  // --- SCREENS: the add-ons that fit the hung concept, any number at once ----------------------------------
  const screenTiles = SCREEN_ADDONS.map(([id, name, fit, make]) => ({
    id, name, fits: fit,
    draw: (g, w, h, t) => { const P = planFor(pick.concept === 'house' ? 'classic' : pick.concept, pick.style, [id]); iso(P, make())(g, w, h, t); },
    isOn: () => pick.addons.has(id),
    play: () => { pick.addons.has(id) ? pick.addons.delete(id) : pick.addons.add(id); if (pick.concept === 'house') pick.concept = 'classic'; hang(); },
  }));
  // --- RIG: how much truss, and which lights, for the hung concept -------------------------------------------
  const rigTiles = RIG_STYLES.map(([id, name]) => ({
    id, name, draw: (g, w, h, t) => iso(planFor(pick.concept === 'house' ? 'classic' : pick.concept, id, [...pick.addons]))(g, w, h, t),
    play: () => { pick.style = id; if (pick.concept === 'house') pick.concept = 'classic'; hang(); },
  }));

  // --- STAGE and RUNWAY: the builder's own, at once (only the shapes this venue can build) ---------------------
  const STAGES = [
    ['end', 'End stage', { curtains: 'full', cfg: { position: 'far', farSize: 'default' } }],
    ['endlarge', 'Large end stage', { curtains: 'full', cfg: { position: 'far', farSize: 'large' } }],
    ['endhuge', 'Huge end stage', { curtains: 'full', cfg: { position: 'far', farSize: 'huge' } }],
    ...(OPEN ? [] : [
      ['largeroom', 'Large room', { curtains: 'large', cfg: { position: 'far' } }],
      ['half', 'Half house', { curtains: 'medium', cfg: { position: 'far' } }],
      ['small', 'Small room', { curtains: 'small', cfg: { position: 'far' } }],
      ['theatre', 'Theatre', { curtains: 'theatre', cfg: { position: 'far' } }],
      ['hemi', 'Hemicycle', { curtains: 'hemicycle', cfg: { position: 'far' } }],
    ]),
    ['round', 'In the round', { curtains: 'full', cfg: { position: 'middle', middleShape: 'circle' } }],
    ['roundsq', 'Square in the round', { curtains: 'full', cfg: { position: 'middle', middleShape: 'square' } }],
    ...(SPEC.sphere ? [['sphere', 'The sphere', { curtains: 'full', cfg: { position: 'middle', middleShape: 'sphere' } }]] : []),
  ];
  const stageTiles = STAGES.map(([id, name, c]) => ({ id, name, draw: (g, w, h, t) => iso({ cfg: { ...st().cfg, ...c.cfg, curtains: c.curtains }, plan: null })(g, w, h, t), play: () => concert(c) }));
  const endStage = () => ({ curtains: ['full', 'large'].includes(st().curtains) ? st().curtains : 'full', cfg: { position: 'far' } });
  const RUNWAYS = [
    ['none', 'No runway', { catwalk: 'none', bstage: 'none' }], ['circle', 'Catwalk + circle', { catwalk: 'standard', bstage: 'circle' }],
    ['square', 'Catwalk + square', { catwalk: 'standard', bstage: 'square' }], ['x', 'Catwalk + X', { catwalk: 'standard', bstage: 'x' }],
    ['heart', 'Catwalk + heart', { catwalk: 'standard', bstage: 'heart' }], ['longcircle', 'Long catwalk', { catwalk: 'long', bstage: 'circle' }],
    ['longsquare', 'Long + square', { catwalk: 'long', bstage: 'square' }], ['longheart', 'Long + heart', { catwalk: 'long', bstage: 'heart' }],
    ['longx', 'Long + X', { catwalk: 'long', bstage: 'x' }], ['catonly', 'Catwalk only', { catwalk: 'standard', bstage: 'none' }],
    ['longonly', 'Long catwalk only', { catwalk: 'long', bstage: 'none' }], ['satellite', 'Satellite stage', { catwalk: 'none', bstage: 'circle' }],
    ['satsquare', 'Square satellite', { catwalk: 'none', bstage: 'square' }],
  ];
  const runwayTiles = RUNWAYS.map(([id, name, cfg]) => ({
    id, name, draw: (g, w, h, t) => iso({ cfg: { position: 'far', ...cfg }, plan: null })(g, w, h, t),
    play: () => { const e = endStage(); concert({ ...e, cfg: { ...e.cfg, ...cfg } }); },
  }));
  if (!OPEN) runwayTiles.push({ id: 'cstage', name: 'C-stage on / off', draw: (g, w, h, t) => iso({ cfg: { position: 'far', catwalk: 'standard', bstage: 'circle' }, plan: { stages: [{ x: 27, z: 0, w: 4, d: 10, h: 1.4, rot: 0 }] } })(g, w, h, t), play: () => concert({ ...endStage(), cfg: { position: 'far', cstage: !st().cfg.cstage } }) });

  // --- VENUE, CROWD ----------------------------------------------------------------------------------------------
  // another venue is another building: that one reloads (everything else above is at once)
  const VENUES = [['arena', 'Arena', './assets/venue-arena.jpg'], ['stadium', 'Stadium', './assets/venue-stadium.jpg'], ['cricket', 'Cricket ground', './assets/venue-cricket.svg'], ['festival', 'Festival field', './assets/venue-festival.jpg']];
  const venueTiles = [...VENUES.map(([id, name, src]) => ({
    id, name, draw: photo(src), isOn: () => eng.VENUE === id,
    play: () => { if (id !== eng.VENUE) B.reboot({ venue: id, open: false }); },
  })), ...[['creative', 'Empty', './assets/thumb-creative.jpg'], ['concert', 'Concert', './assets/thumb-concert.jpg'], ['hockey', 'Hockey', './assets/thumb-hockey.jpg'], ['basketball', 'Basketball', './assets/thumb-basketball.jpg'],
    ...(OPEN ? [['football', 'Football', './assets/venue-stadium.jpg']] : [])].map(([id, name, src]) => ({ id, name, draw: photo(src), isOn: () => st().mode === id, play: () => { set({ mode: id }); repaint(); } }))];
  const tiers = (SPEC.bowl?.tiers || []).map((t) => t.name);
  const floorPlan = (crowd, tarps) => (g, w, h, t) => { iso({ cfg: { position: 'far', catwalk: 'standard', bstage: 'circle' }, plan: null })(g, w, h, t); if (tarps) { g.fillStyle = 'rgba(120,120,135,0.45)'; g.fillRect(0, 0, w * tarps, h * 0.5); } if (crowd === 'ga') { g.fillStyle = '#c8102e'; for (let i = 0; i < 60; i++) g.fillRect(w * (0.45 + T.rnd(i) * 0.45), h * (0.45 + T.rnd(i, 1) * 0.4), 2, 2); } };
  const crowdTiles = [
    ['seat', 'Seated floor', { cfg: { floor: 'seat' } }, floorPlan('seat')], ['ga', 'Standing floor', { cfg: { floor: 'ga' } }, floorPlan('ga')], ['hybrid', 'Seated + standing', { cfg: { floor: 'hybrid' } }, floorPlan('ga')],
    ['behindnone', 'Seats behind: open', () => ({ covers: { behind: 'none', rings: st().covers.rings } }), floorPlan('seat')],
    ['behindsmall', 'Seats behind: a little covered', () => ({ covers: { behind: 'small', rings: st().covers.rings } }), floorPlan('seat', 0.15)],
    ['behindmed', 'Seats behind: covered', () => ({ covers: { behind: 'medium', rings: st().covers.rings } }), floorPlan('seat', 0.25)],
    ['behindfull', 'Seats behind: all covered', () => ({ covers: { behind: 'full', rings: st().covers.rings } }), floorPlan('seat', 0.4)],
    ...tiers.slice(1).map((n) => [`ring${n}`, `Cover the ${n}s`, n, floorPlan('seat', 0.15)]),
    ['uncover', 'Uncover all tiers', { covers: { behind: 'none', rings: [] } }, floorPlan('seat')],
  ].map(([id, name, c, draw]) => ({
    id, name, draw,
    play: () => {
      if (typeof c === 'string') { const r = new Set(st().covers.rings); r.has(c) ? r.delete(c) : r.add(c); set({ covers: { behind: st().covers.behind, rings: [...r].sort() } }); }
      else { const patch = typeof c === 'function' ? c() : c; if (patch.cfg) concert(patch); else set(patch); }
    },
  }));

  // --- PRODUCTION: front of house, the delay towers and their moving heads, the PA (production.js) -------------------
  const PR = () => eng.production || null;
  // kept with the room, per venue, so the production you set up is there next time
  const PROD_KEY = `pm-build-production-${eng.VENUE}`;
  const saveProd = () => { try { if (PR()?.state) localStorage.setItem(PROD_KEY, JSON.stringify(PR().state)); } catch (_) { /* private mode */ } };
  try { const p = JSON.parse(localStorage.getItem(PROD_KEY) || 'null'); if (p) PR()?.setState?.(p); } catch (_) { /* nothing kept */ }
  const prodPlan = (draw) => (g, w, h, t) => { iso({ cfg: { ...st().cfg }, plan: null })(g, w, h, t); draw(g, w, h, t); };
  const tower = (g, x, y, t, on = true) => {   // a delay tower in the preview: its truss, its heads' beams
    g.fillStyle = '#5a5c66'; g.fillRect(x - 2, y - 22, 4, 22);
    if (!on) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + Math.sin(t * 1.2 + k * 1.7) * 0.6; g.strokeStyle = `hsla(${(k * 70 + t * 40) % 360},100%,65%,0.7)`; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + Math.cos(a) * 40, y - 22 + Math.sin(a) * 40); g.stroke(); }
    g.restore();
  };
  const prodTiles = [];
  if (PR()?.setDelayTowers) {
    for (const [n, name] of [[0, 'No delay towers'], [2, 'Two delay towers'], [4, 'Four delay towers']]) {
      prodTiles.push({ id: `delay${n}`, name, isOn: () => (PR()?.delayTowers ?? 0) === n,
        draw: prodPlan((g, w, h, t) => { const xs = n === 4 ? [0.38, 0.5, 0.62, 0.74] : n === 2 ? [0.45, 0.65] : []; xs.forEach((x, i) => tower(g, w * x, h * (0.66 + (i % 2) * 0.06), t)); }),
        play: () => { PR().setDelayTowers(n); saveProd(); repaint(); } });
    }
  }
  if (PR()?.setFOHTent) prodTiles.push({ id: 'foh', name: 'FOH riser and tent', isOn: () => !!PR()?.fohTent, draw: prodPlan((g, w, h) => { g.fillStyle = '#3a3c44'; g.fillRect(w * 0.6, h * 0.62, w * 0.1, h * 0.06); g.fillStyle = '#5a5c66'; g.beginPath(); g.moveTo(w * 0.59, h * 0.62); g.lineTo(w * 0.65, h * 0.55); g.lineTo(w * 0.71, h * 0.62); g.fill(); }), play: () => { PR().setFOHTent(!PR().fohTent); saveProd(); repaint(); } });
  if (PR()?.setStageWings) prodTiles.push({ id: 'wings', name: 'Stage wings', isOn: () => !!PR()?.stageWings, draw: prodPlan((g, w, h) => { g.fillStyle = '#2a2c34'; g.fillRect(w * 0.06, h * 0.2, w * 0.1, h * 0.32); g.fillRect(w * 0.34, h * 0.2, w * 0.1, h * 0.32); }), play: () => { PR().setStageWings(!PR().stageWings); saveProd(); repaint(); } });
  if (PR()?.setBandRisers) prodTiles.push({ id: 'risers', name: 'Band risers', isOn: () => !!PR()?.bandRisers, draw: prodPlan((g, w, h) => { g.fillStyle = '#3a3c44'; g.fillRect(w * 0.16, h * 0.36, w * 0.08, h * 0.05); g.fillRect(w * 0.26, h * 0.34, w * 0.08, h * 0.07); }), play: () => { PR().setBandRisers(!PR().bandRisers); saveProd(); repaint(); } });
  if (PR()?.setPAStyle) for (const [id, name] of [['flown', 'PA: flown'], ['stacked', 'PA: ground stacked']]) prodTiles.push({ id: `pa${id}`, name, isOn: () => PR()?.paStyle === id, draw: prodPlan((g, w, h) => { g.fillStyle = '#3a3c44'; for (const x of [0.08, 0.4]) g.fillRect(w * x, id === 'flown' ? h * 0.18 : h * 0.4, w * 0.04, h * 0.16); }), play: () => { PR().setPAStyle(id); saveProd(); repaint(); } });
  // and the show's own front-of-house tools, at the desk
  prodTiles.push(
    { id: 'workon', name: 'Work lights', isOn: () => work, draw: (g, w, h) => { T.room(g, w, h); T.wash(g, w, h, { a: '#fff3dc', level: work ? 0.9 : 0.15 }); }, play: () => { workLights(!work); repaint(); } },
    { id: 'ledtest', name: 'LED test card', isOn: () => screensOn, draw: (g, w, h, t) => T.screen(g, w, h, t, 'noise'), play: () => { setLeds(!screensOn); repaint(); } },
  );

  // which tile each live tab shows as on: the builder's state as it is
  const stageId = () => {
    const s = st(); if (s.cfg.position === 'middle') return s.cfg.middleShape === 'square' ? 'roundsq' : s.cfg.middleShape === 'sphere' ? 'sphere' : 'round';
    if (s.curtains === 'full' || OPEN) return s.cfg.farSize === 'huge' ? 'endhuge' : s.cfg.farSize === 'large' ? 'endlarge' : 'end';
    return { large: 'largeroom', medium: 'half', small: 'small', theatre: 'theatre', hemicycle: 'hemi' }[s.curtains] || 'end';
  };
  function relatch() {
    if (!deck) return;
    deck.latch('concepts', pick.concept); deck.latch('rig', pick.style);
    deck.latch('stage', st().mode === 'concert' ? stageId() : null);
    deck.latch('runway', st().mode === 'concert' ? RUNWAYS.find(([, , c]) => c.catwalk === st().cfg.catwalk && c.bstage === st().cfg.bstage)?.[0] || null : null);
    deck.latch('crowd', st().cfg.floor);
  }
  setInterval(() => { relatch(); deck?.refresh(); }, 800);   // the Build panel can change things too: keep up with it
  const mainScreen = {
    type: 'choice', label: 'Main screen',
    get options() { return st().cfg.position === 'middle' ? [['cyl', 'Cylinder'], ['circle', 'Circle'], ['heart', 'Heart']] : [['wall', 'Wall'], ['circle', 'Circle'], ['heart', 'Heart']]; },
    get value() { return st().cfg.screen; }, change: (v) => concert({ cfg: { screen: v } }),
  };
  return {
    title: OPEN ? 'Build · open air' : 'Build · arena',
    button: 'BUILD',
    tabs: [
      { id: 'concepts', name: 'Concepts', tiles: conceptTiles },
      { id: 'screens', name: 'Screens', multi: true, get tiles() { const k = kindOf(pick.concept); return screenTiles.filter((x) => x.fits === 'any' || x.fits === k); }, controls: [mainScreen] },
      { id: 'rig', name: 'Rig', tiles: rigTiles },
      { id: 'stage', name: 'Stage', tiles: stageTiles },
      { id: 'runway', name: 'Runway', tiles: runwayTiles },
      { id: 'venue', name: 'Venue', multi: true, tiles: venueTiles },
      { id: 'crowd', name: 'Crowd', tiles: crowdTiles },
      { id: 'production', name: 'Production', multi: true, tiles: prodTiles },
    ],
    controls: [{ type: 'switch', label: 'Work lights', get value() { return work; }, change: (v) => workLights(v) },
      { type: 'switch', label: 'LED test card', get value() { return screensOn; }, change: (v) => setLeds(v) }],
    // what Export takes away (the hub brings it into Creative Stage): the room, the design, the production
    concept: {
      capture: () => ({
        venue: eng.VENUE, room: { mode: st().mode, curtains: st().curtains, cfg: { ...st().cfg }, covers: st().covers, bfloor: st().bfloor },
        concept: pick.concept, style: pick.style, addons: [...pick.addons], plan: eng.rigPlan?.() || null,
        production: eng.production?.state ? JSON.parse(JSON.stringify(eng.production.state)) : null,
      }),
      summary: () => `${pick.concept === 'house' ? 'House rig' : CONCEPTS.find((c) => c[0] === pick.concept)?.[1] || pick.concept} · ${eng.VENUE}`,
    },
    ready(d) { deck = d; relatch(); },
  };
}

// The hub (Creative Stage, the desktop) brings a Build concept in: the room and its rig, hung at
// once in this venue; a concept made for another venue asks to open that venue first.
export function applyBuildConcept(eng, s) {
  if (!s) return false;
  if (s.venue && s.venue !== eng.VENUE) return { needsVenue: s.venue };
  if (s.room) eng.builder.setState({ ...s.room, cfg: { ...eng.builder.state.cfg, ...(s.room.cfg || {}) } });
  eng.rehang?.(s.plan || null);
  if (s.production) eng.production?.setState?.(s.production);
  return true;
}

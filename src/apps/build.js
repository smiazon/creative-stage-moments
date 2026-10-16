// CREATIVE STAGE BUILD: design the production. CONCEPTS are whole stage designs, each consistent
// with itself (concepts.js): the stage, its decks (side catwalks, ramps, islands, wings, risers),
// trusses that follow the stage's shape with their lights, the PA where that stage needs it,
// barricades, effects. SCREENS adds LED designs on top, as many as you like; RIG picks how much
// truss and which lights. Those three wait for BUILD IT (the room is built round its rig, so it
// reloads once to hang them). STAGE, RUNWAY, VENUE, CROWD and the main screen's shape change the
// room at once (the room's own builder, builder.js); VIEWS jumps to any seat to check what it sees.
// Every tile is a little 3D view of exactly what it builds (iso.js reads the same plan).
import * as T from './thumbs.js';
import { drawIso } from './iso.js';
import { CONCEPTS, RIG_STYLES, SCREEN_ADDONS, makePlan } from './concepts.js';
import { RIG_KEY } from './rigplans.js';
import { SPEC } from '../venue.js';
import { createNoiseScreens } from '../noisescreens.js';

const BOOT_KEY = 'arena-boot-intent';

export function buildApp(eng) {
  const B = eng.builder, st = () => B.state;
  eng.setStageFollow?.(false);
  // work lights: the house lights up and a plain white look, to see the set as it is
  let work = true;
  try { work = sessionStorage.getItem('pm-build-work') !== '0'; } catch (_) { /* private mode */ }
  const workLights = (on) => {
    work = on;
    try { sessionStorage.setItem('pm-build-work', on ? '1' : '0'); } catch (_) { /* private mode */ }
    eng.setLighting(on ? 'house' : 'game');
    eng.rigFX.cue(on ? 'acoustic' : 'anthem');
  };
  workLights(work);
  // the screens: colour on every LED, so each design shows (off: the screens dark, as they hang)
  const NS = eng.renderer ? createNoiseScreens(eng.renderer) : null;
  NS?.setPalette(['#ff2bd6', '#00e5ff', '#d8ff3a', '#ff7a00'], true);   // every colour, slowly: a test card for the LED design
  const leds = { on: false, raf: 0, t: 0, last: 0, mode: 0, at: 0 };
  function ledFrame(now) {
    leds.raf = leds.on ? requestAnimationFrame(ledFrame) : 0;
    const dt = Math.min(0.1, (now - (leds.last || now)) / 1000); leds.last = now; leds.t += dt * 0.4;
    if (now - leds.at > 12000) { leds.at = now; leds.mode = (leds.mode + 1) % 4; }
    NS.render({ t: leds.t, kick: 0, low: 0.35, high: 0.2, glint: 0, seed: 3.1, mode: leds.mode });
  }
  let screensOn = true;
  try { screensOn = sessionStorage.getItem('pm-build-leds') !== '0'; } catch (_) { /* private mode */ }
  const setLeds = (on) => {
    screensOn = on;
    try { sessionStorage.setItem('pm-build-leds', on ? '1' : '0'); } catch (_) { /* private mode */ }
    leds.on = on && !!NS;
    if (leds.on) { eng.setScreens({ wall: NS.wall, b: NS.b }); if (!leds.raf) leds.raf = requestAnimationFrame(ledFrame); }
    else eng.setScreens(null);
  };
  setLeds(screensOn);
  const ROOM_KEY = 'pm-build-room';
  const remember = () => { try { localStorage.setItem(ROOM_KEY, JSON.stringify({ venue: eng.VENUE, mode: st().mode, curtains: st().curtains, cfg: st().cfg, covers: st().covers, bfloor: st().bfloor })); } catch (_) { /* private mode */ } };
  const set = (c) => { setRoom(c); remember(); };
  const setRoom = (c) => B.setState({ mode: st().mode, curtains: st().curtains, covers: st().covers, bfloor: st().bfloor, ...c, cfg: { ...st().cfg, ...(c.cfg || {}) } });
  const concert = (c = {}) => set({ ...c, mode: 'concert' });

  // --- what's built, and what's picked but not built yet -----------------------------------------------
  const built = (() => {   // read back from the hung plan's name: "Concept · style · addons"
    const p = eng.rigPlan?.();
    if (!p?.name || !p.name.includes(' · ')) return { concept: 'house', style: 'standard', addons: [] };
    const [cn, style, ad] = p.name.split(' · ');
    const c = CONCEPTS.find((x) => x[1] === cn);
    return { concept: c ? c[0] : 'house', style: style || 'standard', addons: ad && ad !== 'no add-ons' ? ad.split('+') : [] };
  })();
  // the room as it was left (the stage, the runway, the tarps), back with the rig it was built round
  try {
    const r = JSON.parse(localStorage.getItem(ROOM_KEY) || 'null');
    if (r && r.venue === eng.VENUE && r.cfg) setRoom(r);
  } catch (_) { /* nothing kept */ }
  const pick = { concept: built.concept, style: built.style, addons: new Set(built.addons) };
  const kindOf = (id) => CONCEPTS.find((c) => c[0] === id)?.[2] || 'end';
  const changes = () => (pick.concept !== built.concept) + (pick.style !== built.style) + (([...pick.addons].sort().join() !== [...built.addons].sort().join()) ? 1 : 0);
  let deck = null;
  const repaint = () => { deck?.refresh(); deck?.refreshControls(); };
  function buildIt() {
    if (!changes()) return;
    const bs = st();
    let cfg, plan = null;
    if (pick.concept === 'house') cfg = { position: 'far', curtains: 'full', farSize: 'default', catwalk: 'standard', bstage: 'circle', screen: 'wall' };
    else ({ cfg, plan } = makePlan(pick.concept, pick.style, [...pick.addons].filter((a) => { const A = SCREEN_ADDONS.find((x) => x[0] === a); return A && (A[2] === 'any' || A[2] === kindOf(pick.concept)); })));
    const room = { venue: eng.VENUE, mode: 'concert', curtains: cfg.curtains || 'full', cfg: { ...bs.cfg, ...cfg }, covers: bs.covers, bfloor: bs.bfloor };
    try {
      if (plan) localStorage.setItem(RIG_KEY, JSON.stringify(plan)); else localStorage.removeItem(RIG_KEY);
      localStorage.setItem(ROOM_KEY, JSON.stringify(room));
      // the stage set-up rides across the reload, and the room walks straight back in
      localStorage.setItem(BOOT_KEY, JSON.stringify({ creative: room, open: false }));
    } catch (_) { return; }
    location.reload();
  }

  // --- the previews --------------------------------------------------------------------------------------
  const imgs = {};
  const photo = (src) => (g, w, h) => {
    const im = imgs[src] || (imgs[src] = Object.assign(new Image(), { src }));
    g.fillStyle = '#0b0c12'; g.fillRect(0, 0, w, h);
    if (im.complete && im.naturalWidth) { const k = Math.max(w / im.naturalWidth, h / im.naturalHeight); g.drawImage(im, (w - im.naturalWidth * k) / 2, (h - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); }
  };
  const planCache = new Map();
  const planFor = (c, s, a) => { const k = `${c}|${s}|${a.join()}`; if (!planCache.has(k)) planCache.set(k, c === 'house' ? { cfg: { position: 'far', catwalk: 'standard', bstage: 'circle', screen: 'wall' }, plan: null } : makePlan(c, s, a)); return planCache.get(k); };
  const iso = (P, mark = null) => (g, w, h, t) => { g.fillStyle = '#07080c'; g.fillRect(0, 0, w, h); drawIso(g, w, h, { cfg: P.cfg, plan: P.plan, mark, t }); };

  // --- CONCEPTS ------------------------------------------------------------------------------------------
  const conceptTiles = [
    { id: 'house', name: 'House rig', draw: (g, w, h, t) => iso(planFor('house', '', []))(g, w, h, t), play: () => { pick.concept = 'house'; repaint(); } },
    ...CONCEPTS.map(([id, name]) => ({ id, name, draw: (g, w, h, t) => iso(planFor(id, 'standard', []))(g, w, h, t), play: () => { pick.concept = id; repaint(); } })),
  ];
  // --- SCREENS: the add-ons that fit the picked concept, any number at once ----------------------------------
  const screenTiles = SCREEN_ADDONS.map(([id, name, fits, make]) => ({
    id, name, fits,
    draw: (g, w, h, t) => { const P = planFor(pick.concept === 'house' ? 'classic' : pick.concept, pick.style, [id]); iso(P, make())(g, w, h, t); },
    isOn: () => pick.addons.has(id),
    play: () => { pick.addons.has(id) ? pick.addons.delete(id) : pick.addons.add(id); repaint(); },
  }));
  // --- RIG: how much truss, and which lights, for the picked concept -------------------------------------------
  const rigTiles = RIG_STYLES.map(([id, name]) => ({
    id, name, draw: (g, w, h, t) => iso(planFor(pick.concept === 'house' ? 'classic' : pick.concept, id, [...pick.addons]))(g, w, h, t),
    play: () => { pick.style = id; repaint(); },
  }));

  // --- STAGE and RUNWAY: the builder's own, at once -------------------------------------------------------------
  const STAGES = [
    ['end', 'End stage', { curtains: 'full', cfg: { position: 'far', farSize: 'default' } }],
    ['endlarge', 'Large end stage', { curtains: 'full', cfg: { position: 'far', farSize: 'large' } }],
    ['largeroom', 'Large room', { curtains: 'large', cfg: { position: 'far' } }],
    ['half', 'Half house', { curtains: 'medium', cfg: { position: 'far' } }],
    ['small', 'Small room', { curtains: 'small', cfg: { position: 'far' } }],
    ['theatre', 'Theatre', { curtains: 'theatre', cfg: { position: 'far' } }],
    ['hemi', 'Hemicycle', { curtains: 'hemicycle', cfg: { position: 'far' } }],
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
    ['longheart', 'Long + heart', { catwalk: 'long', bstage: 'heart' }], ['longx', 'Long + X', { catwalk: 'long', bstage: 'x' }], ['satellite', 'Satellite stage', { catwalk: 'none', bstage: 'circle' }],
  ];
  const runwayTiles = RUNWAYS.map(([id, name, cfg]) => ({
    id, name, draw: (g, w, h, t) => iso({ cfg: { position: 'far', ...cfg }, plan: null })(g, w, h, t),
    play: () => { const e = endStage(); concert({ ...e, cfg: { ...e.cfg, ...cfg } }); },
  }));
  if (!eng.IS_STADIUM) runwayTiles.push({ id: 'cstage', name: 'C-stage on / off', draw: (g, w, h, t) => iso({ cfg: { position: 'far', catwalk: 'standard', bstage: 'circle' }, plan: { stages: [{ x: 27, z: 0, w: 4, d: 10, h: 1.4, rot: 0 }] } })(g, w, h, t), play: () => concert({ ...endStage(), cfg: { position: 'far', cstage: !st().cfg.cstage } }) });

  // --- VENUE, CROWD, VIEWS ---------------------------------------------------------------------------------
  const venueTiles = [['arena', 'Arena', './assets/venue-arena.jpg'], ['stadium', 'Stadium', './assets/venue-stadium.jpg'],
    ['creative', 'Empty', './assets/thumb-creative.jpg'], ['concert', 'Concert', './assets/thumb-concert.jpg'], ['hockey', 'Hockey', './assets/thumb-hockey.jpg'], ['basketball', 'Basketball', './assets/thumb-basketball.jpg'],
    ...(eng.IS_STADIUM ? [['football', 'Football', './assets/venue-stadium.jpg']] : [])].map(([id, name, src]) => ({
    id, name, draw: photo(src),
    isOn: () => (id === 'arena' || id === 'stadium' ? eng.VENUE === id : st().mode === id),
    play: () => { if (id === 'arena' || id === 'stadium') { if (id !== eng.VENUE) B.reboot({ venue: id, open: false }); } else set({ mode: id }); repaint(); },
  }));
  const tiers = (SPEC.bowl?.tiers || []).map((t) => t.name);
  const floorPlan = (crowd, tarps) => (g, w, h, t) => { iso({ cfg: { position: 'far', catwalk: 'standard', bstage: 'circle' }, plan: null })(g, w, h, t); if (tarps) { g.fillStyle = 'rgba(120,120,135,0.45)'; g.fillRect(0, 0, w * tarps, h * 0.5); } if (crowd === 'ga') { g.fillStyle = '#c8102e'; for (let i = 0; i < 60; i++) g.fillRect(w * (0.45 + T.rnd(i) * 0.45), h * (0.45 + T.rnd(i, 1) * 0.4), 2, 2); } };
  const crowdTiles = [
    ['seat', 'Seated floor', { cfg: { floor: 'seat' } }, floorPlan('seat')], ['ga', 'Standing floor', { cfg: { floor: 'ga' } }, floorPlan('ga')], ['hybrid', 'Seated + standing', { cfg: { floor: 'hybrid' } }, floorPlan('ga')],
    ['behindnone', 'Seats behind: open', () => ({ covers: { behind: 'none', rings: st().covers.rings } }), floorPlan('seat')],
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
  const viewTiles = (eng.views?.() || []).map((v) => ({
    id: `v${v.i}`, name: v.name,
    draw: (g, w, h, t) => {
      const P = planFor(built.concept, built.style, built.addons);
      g.fillStyle = '#07080c'; g.fillRect(0, 0, w, h);
      const proj = drawIso(g, w, h, { cfg: st().cfg, plan: P.plan, t });
      const [u, vv] = proj(...(v.pos || [0, 0, 0]));
      g.fillStyle = '#d8ff3a'; g.beginPath(); g.arc(Math.max(6, Math.min(w - 6, u)), Math.max(6, Math.min(h - 6, vv)), 5, 0, T.TAU); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke();
    },
    play: () => eng.setAngle(v.i),
  }));

  // which tile each live tab shows as on: the builder's state as it is
  const stageId = () => {
    const s = st(); if (s.cfg.position === 'middle') return s.cfg.middleShape === 'square' ? 'roundsq' : s.cfg.middleShape === 'sphere' ? 'sphere' : 'round';
    return { full: s.cfg.farSize === 'large' ? 'endlarge' : 'end', large: 'largeroom', medium: 'half', small: 'small', theatre: 'theatre', hemicycle: 'hemi' }[s.curtains] || 'end';
  };
  const relatch = () => {
    if (!deck) return;
    deck.latch('concepts', pick.concept); deck.latch('rig', pick.style);
    deck.latch('stage', st().mode === 'concert' ? stageId() : null);
    deck.latch('runway', st().mode === 'concert' ? RUNWAYS.find(([, , c]) => c.catwalk === st().cfg.catwalk && c.bstage === st().cfg.bstage)?.[0] || null : null);
    deck.latch('crowd', st().cfg.floor);
  };
  setInterval(() => { relatch(); deck?.refresh(); }, 800);   // the Build panel can change things too: keep up with it
  const mainScreen = {
    type: 'choice', label: 'Main screen',
    get options() { return st().cfg.position === 'middle' ? [['cyl', 'Cylinder'], ['circle', 'Circle'], ['heart', 'Heart']] : [['wall', 'Wall'], ['circle', 'Circle'], ['heart', 'Heart']]; },
    get value() { return st().cfg.screen; }, change: (v) => concert({ cfg: { screen: v } }),
  };
  const buildButton = {
    type: 'button',
    get label() { const n = changes(); return n ? `Build it  ·  ${n} change${n > 1 ? 's' : ''}` : 'Built ✓'; },
    get primary() { return changes() > 0; },
    click: buildIt,
  };
  return {
    title: 'Build',
    button: 'BUILD',
    tabs: [
      { id: 'concepts', name: 'Concepts', tiles: conceptTiles, controls: [buildButton] },
      { id: 'screens', name: 'Screens', multi: true, get tiles() { const k = kindOf(pick.concept); return screenTiles.filter((x) => x.fits === 'any' || x.fits === k); }, controls: [buildButton, mainScreen] },
      { id: 'rig', name: 'Rig', tiles: rigTiles, controls: [buildButton] },
      { id: 'stage', name: 'Stage', tiles: stageTiles },
      { id: 'runway', name: 'Runway', tiles: runwayTiles },
      { id: 'venue', name: 'Venue', multi: true, tiles: venueTiles },
      { id: 'crowd', name: 'Crowd', tiles: crowdTiles },
      { id: 'views', name: 'Views', tiles: viewTiles },
    ],
    controls: [{ type: 'switch', label: 'Work lights', get value() { return work; }, change: (v) => workLights(v) },
      { type: 'switch', label: 'Screens on', get value() { return screensOn; }, change: (v) => setLeds(v) }],
    ready(d) { deck = d; relatch(); },
  };
}

// A little 3D view of a whole stage set-up for the Build app's tiles: the floor, the stage the
// builder makes (end or in the round, the catwalk and B-stage, the main screen), and a rig plan's
// own parts (decks, LED panels, trusses with their lights, PA hangs, barricades), seen from a
// high corner of the room (isometric). It reads the same plan the rig builds, with the same
// conventions (rig.js), so the tile is the room. Highlighted panels (a screen add-on) glow lime.
const PI = Math.PI, TAU = PI * 2;
// the view: from behind the crowd, a little off to one side, looking down at the stage
const YAW = 0.42, ELEV = 0.56;
const DX = Math.cos(YAW), DZ = Math.sin(YAW);          // toward the viewer, on the floor
const EX = DZ, EZ = -DX;                               // the screen's right, on the floor
const toward = (nx, nz) => nx * DX + nz * DZ;           // > 0: a face we can see
const depth = (x, z) => x * DX + z * DZ;                // bigger: nearer, drawn later

// open: an open-air venue (the plan is drawn in arena metres all the same): the pitch, no jumbotron
export function drawIso(g, w, h, { cfg = {}, plan = null, mark = null, t = 0, open = false } = {}) {
  // fit the part of the room that matters (the stage end, or the whole floor for a round) to the tile
  const middle = cfg.position === 'middle';
  const [x0, x1, z0, z1] = middle ? [-26, 26, -18, 18] : [-34, 14, -19, 19];
  const pu = (x, y, z) => x * EX + z * EZ, pv = (x, y, z) => depth(x, z) * ELEV - y * 0.92;
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [0, 17]) {
    u0 = Math.min(u0, pu(x, y, z)); u1 = Math.max(u1, pu(x, y, z)); v0 = Math.min(v0, pv(x, y, z)); v1 = Math.max(v1, pv(x, y, z));
  }
  const S = Math.min((w * 0.98) / (u1 - u0), (h * 0.98) / (v1 - v0));
  const ox = w / 2 - ((u0 + u1) / 2) * S, oy = h / 2 - ((v0 + v1) / 2) * S;
  const P = (x, y, z) => [ox + pu(x, y, z) * S, oy + pv(x, y, z) * S];
  const poly = (pts, fill, stroke, lw = 1) => {
    g.beginPath(); pts.forEach(([x, y, z], i) => { const [u, v] = P(x, y, z); i ? g.lineTo(u, v) : g.moveTo(u, v); }); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  };
  const line = (a, b, col, lw) => { const [u0, v0] = P(...a), [u1, v1] = P(...b); g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(u0, v0); g.lineTo(u1, v1); g.stroke(); };
  // a box (a deck, a stage): its top and the two sides that face us
  const box = (x, z, bw, bd, y0, y1, rot = 0, top = '#2a2c34', side = '#16171c', edge = null) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const cn = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + (a * bw / 2) * c - (b * bd / 2) * s, z + (a * bw / 2) * s + (b * bd / 2) * c]);
    for (let i = 0; i < 4; i++) {
      const A = cn[i], B = cn[(i + 1) % 4], nx = B[1] - A[1], nz = -(B[0] - A[0]);
      if (toward(nx, nz) > 0) poly([[A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]]], side);
    }
    poly(cn.map(([a, b]) => [a, y1, b]), top, edge, 1);
  };
  const disc = (x, z, r, y0, y1, top = '#2a2c34', side = '#16171c', n = 28) => {
    const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [x + Math.cos(a) * r, z + Math.sin(a) * r]; });
    for (let i = 0; i < n; i++) { const A = pts[i], B = pts[(i + 1) % n], a = ((i + 0.5) / n) * TAU; if (toward(Math.cos(a), Math.sin(a)) > 0) poly([[A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]]], side); }
    poly(pts.map(([a, b]) => [a, y1, b]), top);
  };
  // an LED panel: lit if it faces us, its back if not
  const panel = (sc, hot) => {
    const c = Math.cos(sc.rot), s = Math.sin(sc.rot), hw = sc.w / 2;
    const A = [sc.x - hw * c, sc.z - hw * s], B = [sc.x + hw * c, sc.z + hw * s];
    const pts = [[A[0], sc.y, A[1]], [B[0], sc.y, B[1]], [B[0], sc.y + sc.h, B[1]], [A[0], sc.y + sc.h, A[1]]];
    const nx = -s, nz = c, facing = toward(nx, nz) > -0.1;
    if (facing) {
      const [u0, v0] = P(...pts[0]), [u1, v1] = P(...pts[2]);
      const gr = g.createLinearGradient(u0, v0, u1, v1);
      gr.addColorStop(0, hot ? '#d8ff3a' : `hsl(${(t * 40 + sc.x * 3) % 360},90%,55%)`); gr.addColorStop(1, hot ? '#9be000' : `hsl(${(t * 40 + sc.x * 3 + 90) % 360},90%,50%)`);
      poly(pts, gr, hot ? '#f2ffb0' : '#000', hot ? 1.5 : 0.6);
    } else poly(pts, hot ? '#6b7d1d' : '#101116', hot ? '#d8ff3a' : '#2a2c34', hot ? 1.5 : 0.6);
  };

  // the floor: the bowl's first row round it
  if (open) {   // the pitch under its dark cover, its touchlines faintly, out past the tile's edge
    poly([[-36, 0, -21], [40, 0, -21], [40, 0, 21], [-36, 0, 21]], '#0c100e', '#1f3a26', 2.5);
    for (let x = -30; x <= 40; x += 5) line([x, 0, -20], [x, 0, 20], 'rgba(60,140,80,0.10)', 1);
  } else {
    const bowl = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU, cx = Math.cos(a), cz = Math.sin(a); bowl.push([Math.sign(cx) * Math.min(31.4, Math.abs(cx) * 40), 0, Math.sign(cz) * Math.min(13.9, Math.abs(cz) * 20)]); }
    poly(bowl, '#0d0e13', '#3a1820', 2.5);
    for (let x = -24; x <= 28; x += 4) line([x, 0, -13], [x, 0, 13], 'rgba(200,16,46,0.12)', 1);   // a hint of the floor seats
  }

  // the stage the builder makes
  const front = cfg.farSize === 'huge' ? -8 : cfg.farSize === 'large' ? -13.6 : cfg.curtains === 'medium' || cfg.curtains === 'small' || cfg.curtains === 'theatre' || cfg.curtains === 'hemicycle' ? -26 : -20;
  const items = [];   // [depth, draw]
  if (middle) items.push([0, () => (cfg.middleShape === 'square' ? box(0, 0, 15, 15, 0, 1.6) : disc(0, 0, 8.4, 0, 1.6))]);
  else {
    items.push([-60, () => box((-33 + front) / 2, 0, front + 33, 30, 0, 2)]);
    if (cfg.catwalk && cfg.catwalk !== 'none') {
      const len = cfg.catwalk === 'long' ? 22 : 14, bx = front + 2.6 + len;
      items.push([front, () => box(front + len / 2 + 1.3, 0, len + 2.6, 2.6, 0, 1.5)]);
      if (cfg.bstage && cfg.bstage !== 'none') items.push([bx, () => (cfg.bstage === 'square' ? box(bx, 0, 8, 8, 0, 1.5) : cfg.bstage === 'x' ? (box(bx, 0, 10, 2.6, 0, 1.5, PI / 4), box(bx, 0, 10, 2.6, 0, 1.5, -PI / 4)) : disc(bx, 0, 4.5, 0, 1.5))]);
    } else if (cfg.bstage && cfg.bstage !== 'none') items.push([front + 14, () => disc(front + 16.6, 0, 4.5, 0, 1.5)]);
  }
  // the plan's decks
  for (const d of plan?.stages || []) items.push([depth(d.x, d.z), () => box(d.x, d.z, d.w, d.d, 0, d.h, d.rot || 0, '#30323b', '#17181d')]);
  items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  // the barricades
  for (const b of plan?.barricades || []) {
    if (b.shape === 'ring') { const pts = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU; return [b.x + Math.cos(a) * b.r, 1.1, b.z + Math.sin(a) * b.r]; }); poly(pts, null, '#5a5c66', 1); continue; }
    const c = Math.cos(b.rot ?? 0), s = Math.sin(b.rot ?? 0);
    line([b.x - c * b.len / 2, 1.1, b.z - s * b.len / 2], [b.x + c * b.len / 2, 1.1, b.z + s * b.len / 2], '#5a5c66', 1.2);
  }
  // the main screen (the builder's shape)
  const scr = [];
  if (middle) scr.push(() => { const pts = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU; return [Math.cos(a) * 5.5, 9.5, Math.sin(a) * 5.5]; }); poly(pts.map(([x, , z]) => [x, 12.5, z]), null, '#8a2bff', 1.5); poly(pts, null, '#00e5ff', 1.5); });
  else if (cfg.screen === 'circle' || cfg.screen === 'heart') scr.push(() => { const pts = Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * TAU, r = cfg.screen === 'heart' ? 4.6 * (1 - Math.sin(a) * 0.35) : 5; return [-30.5, 8 + Math.sin(a) * r, Math.cos(a) * r]; }); const gr = g.createLinearGradient(...P(-30.5, 13, -5), ...P(-30.5, 3, 5)); gr.addColorStop(0, `hsl(${t * 40 % 360},90%,55%)`); gr.addColorStop(1, `hsl(${(t * 40 + 120) % 360},90%,50%)`); poly(pts, gr, '#000', 0.6); });
  else scr.push(() => panel({ x: -30.5, z: 0, w: 24, h: 9, y: 3.4, rot: -PI / 2 }, false));
  scr.forEach((f) => f());
  // the plan's panels, far ones first
  [...(plan?.screens || [])].sort((a, b) => depth(a.x, a.z) - depth(b.x, b.z)).forEach((sc) => panel(sc, mark && mark.some((m) => m.x === sc.x && m.z === sc.z && m.y === sc.y)));
  // the PA hangs
  for (const sp of plan?.speakers || []) if (sp.type === 'main') box(sp.x, sp.z, 0.9, 1.1, sp.y - 3, sp.y, sp.yaw ?? 0, '#3a3c44', '#1c1d22');
  // the trusses, with their lights
  const silver = '#b9bec8';
  for (const tr of plan?.trusses || []) {
    if (tr.shape === 'circle' || tr.shape === 'square' || tr.shape === 'arc') {
      const sweep = tr.shape === 'arc' ? PI * 0.75 : TAU, a0 = tr.shape === 'arc' ? tr.rot - sweep / 2 : tr.shape === 'square' ? (tr.rot || 0) + PI / 4 : 0;
      const n = tr.shape === 'square' ? 4 : tr.shape === 'arc' ? 8 : 28, pts = [];
      for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * sweep; pts.push([tr.x + Math.cos(a) * tr.r, tr.y, tr.z + Math.sin(a) * tr.r]); }
      for (let i = 0; i < n; i++) line(pts[i], pts[i + 1], silver, 2.2);
      continue;
    }
    const c = Math.cos(tr.rot), s = Math.sin(tr.rot);
    line([tr.x - c * tr.len / 2, tr.y, tr.z - s * tr.len / 2], [tr.x + c * tr.len / 2, tr.y, tr.z + s * tr.len / 2], silver, 2.4);
  }
  const FIX = { beam: '#ff2bd6', spot: '#ffffff', wash: '#4d8dff', laser: '#00ff6a', strobe: '#fff7c0' };
  // their beams, faintly, where the rig points them (a ring plan's out at the stands)
  g.save(); g.globalCompositeOperation = 'lighter';
  (plan?.fixtures || []).forEach((f, i) => {
    const a = Array.isArray(f.aim) ? f.aim : [f.x * 0.45, 1, f.z * 0.45];
    const sw = Math.sin(t * 0.9 + i * 0.7) * 3, k = 0.62;
    const end = [f.x + (a[0] + sw - f.x) * k, f.y + (a[1] - f.y) * k, f.z + (a[2] - sw - f.z) * k];
    const [u0b, v0b] = P(f.x, f.y - 0.4, f.z), [u1b, v1b] = P(...end);
    const gr = g.createLinearGradient(u0b, v0b, u1b, v1b);
    gr.addColorStop(0, (FIX[f.type] || '#fff') + '88'); gr.addColorStop(1, (FIX[f.type] || '#fff') + '00');
    g.strokeStyle = gr; g.lineWidth = f.type === 'wash' ? 2.2 : 1.1; g.beginPath(); g.moveTo(u0b, v0b); g.lineTo(u1b, v1b); g.stroke();
  });
  g.restore();
  for (const f of plan?.fixtures || []) { const [u, v] = P(f.x, f.y - 0.4, f.z); g.fillStyle = FIX[f.type] || '#fff'; g.fillRect(u - 1.3, v - 1.3, 2.6, 2.6); }
  // the jumbotron, for scale (the arena's centre-hung board; the open air has none)
  if (!open) box(0, 0, 14.4, 9.2, 13.3, 24, 0, 'rgba(60,64,80,0.25)', 'rgba(40,44,60,0.18)', 'rgba(120,130,160,0.35)');
  return P;   // the projection, to mark a point on it (a seat, a camera)
}

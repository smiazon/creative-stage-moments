// The preset tiles' little live previews (presetdeck.js draws them while the card is open),
// for the Light and FX apps. Each draws a whole frame for time t (seconds) into a 240x150 canvas.
const TAU = Math.PI * 2;
const hsl = (h, l = 55) => `hsl(${((h % 360) + 360) % 360},100%,${l}%)`;
const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

// a dark room: a soft floor glow, the stage deck along the bottom, the truss along the top
export function room(g, w, h, { truss = true, haze = '#0b0c14' } = {}) {
  g.globalCompositeOperation = 'source-over';
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#04050a'); bg.addColorStop(1, haze);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#15161c'; g.fillRect(0, h * 0.84, w, h * 0.16);
  g.fillStyle = '#23252e'; g.fillRect(0, h * 0.84, w, 2);
  if (truss) { g.fillStyle = '#2a2c34'; g.fillRect(w * 0.06, h * 0.1, w * 0.88, 4); }
}

// moving-head beams from the truss, moving the way a behaviour moves them
export function beams(g, w, h, t, { n = 7, a = '#ff2bd6', b = '#2f7bff', beh = 'sweep', dim = 1, rainbow = false, width = 0.07, from = 0.1 } = {}) {
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = w * (0.12 + (0.76 * i) / Math.max(1, n - 1)), y = h * from + 3, k = i / Math.max(1, n - 1) - 0.5;
    let ang, len = h * 0.95;   // radians from straight down
    switch (beh) {
      case 'park': ang = 0; break;
      case 'circles': ang = k * 0.4 + Math.cos(t * 2 + i) * 0.22; len = h * (0.8 + 0.15 * Math.sin(t * 2 + i)); break;
      case 'figure8': ang = Math.sin(t * 0.9 + i * 0.25) * 0.6; len = h * (0.75 + 0.2 * Math.sin(2 * (t * 0.9 + i * 0.25))); break;
      case 'converge': ang = Math.atan2(w * (0.5 + 0.18 * Math.sin(t * 0.6)) - x, h * 0.55); len = h * 0.62; break;
      case 'skyward': ang = Math.PI + k * 0.12 + Math.sin(t * 0.5 + i) * 0.05; len = h * 0.3; break;
      case 'snake': ang = Math.sin(t * 2.2 - i * 0.9) * 0.55; break;
      case 'stands': ang = Math.PI * 0.62 * Math.sign(k || 1) + Math.sin(t * 0.6 + i) * 0.25; len = h * 0.7; break;
      case 'flicker': ang = (rnd(Math.floor(t * 2.5 + i * 0.37), i) - 0.5) * 1.3; break;
      case 'fan': ang = k * (0.9 + 0.5 * Math.sin(t * 1.2)); break;
      case 'slowfan': ang = k * (0.6 + 0.3 * Math.sin(t * 0.5)); break;
      case 'ballyhoo': ang = Math.sin(t * 2.6 + i * 1.7) * 0.7; break;
      case 'crossbeams': ang = (i % 2 ? 1 : -1) * (0.35 + 0.3 * Math.sin(t * 1.8)); break;
      case 'tiltwave': ang = Math.sin(t * 2 - i * 0.7) * 0.5; break;
      case 'up': ang = Math.PI + k * 0.8 * Math.sin(t); break;
      default: ang = Math.sin(t * 1.1 + i * 0.4) * 0.55;   // sweep
    }
    const col = rainbow ? hsl(t * 80 + i * 40) : i % 2 ? b : a;
    const ex = x + Math.sin(ang) * len, ey = y + Math.cos(ang) * len;
    const gr = g.createLinearGradient(x, y, ex, ey);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.75 * dim;
    g.fillStyle = gr;
    const px = Math.cos(ang) * w * width, py = -Math.sin(ang) * w * width;
    g.beginPath(); g.moveTo(x, y); g.lineTo(ex + px, ey + py); g.lineTo(ex - px, ey - py); g.closePath(); g.fill();
    g.globalAlpha = dim; g.fillStyle = '#fff';
    g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

// a wash of colour over the stage (the wash fixtures)
export function wash(g, w, h, { a = '#ff2bd6', level = 0.6 } = {}) {
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(w / 2, h * 0.85, 2, w / 2, h * 0.85, w * 0.6);
  gr.addColorStop(0, a); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = level; g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
}

// lasers as the rig draws them (rigfx.js _writeLasers), seen from the floor: its ten heads, four
// on the deck and six under the third truss, each fanning `per` blades out to land on the bowl's
// fascia rings; the same pattern maths, the same colours (rainbow: one hue per head)
const LHEADS = [...[0, 1, 2, 3].map((i) => ({ z: -7.5 + i * 5, y: 0.8 })), ...[0, 1, 2, 3, 4, 5].map((i) => ({ z: -10 + i * 4, y: 0.22 }))];
export function lasers(g, w, h, t, { pattern = 'sweep', per = 5, a = '#00ff6a', b = '#ff2bd6', mode = 'a', speed = 1, spread = 1.5, tilt = 0, sheet = null } = {}) {
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  if (sheet) {   // a laser sheet: one plane of light fanned off the stage
    const y0 = h * 0.62, ph = t * speed;
    const ang = sheet === 'scan' ? Math.sin(ph * 1.2) * 0.5 : sheet === 'cross' ? 0 : Math.sin(ph * 0.6) * 0.2;
    if (sheet === 'strobe' && Math.floor(ph * 6) % 2) return;
    for (const s of sheet === 'cross' ? [-0.35, 0.35] : [ang]) {
      g.fillStyle = a; g.globalAlpha = 0.28;
      g.beginPath(); g.moveTo(w / 2, y0); g.lineTo(w * 1.1, y0 - h * 0.18 + s * h); g.lineTo(-w * 0.1, y0 - h * 0.18 - s * h); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
    return;
  }
  const spd = speed, n = Math.max(1, Math.min(12, Math.round(per)));
  // the rig folds a blade back before it would land behind the stage (an orbit swings to and fro)
  const fold = (x, m) => { const p = 4 * m, u = (((x + m) % p) + p) % p; return u < 2 * m ? u - m : 3 * m - u; };
  LHEADS.forEach((H, hi) => {
    let centre = 0, width = spread, lit = -1;
    switch (pattern) {
      case 'fan': width = spread * (0.72 + 0.28 * Math.sin(t * 0.3 * spd + hi * 0.4)); break;
      case 'scan': centre += Math.sin(t * 0.9 * spd + hi * 0.35) * (0.5 + spread * 0.35); width = 0.06; break;
      case 'circle': centre += t * 0.35 * spd * (hi % 2 ? 1 : -1); break;
      case 'chase': lit = Math.floor(t * 3 * spd + hi) % n; break;
      case 'still': case 'wave': case 'spiral': case 'flash': break;
      case 'sky': centre += Math.sin(t * 0.25 * spd + hi * 1.1) * 0.35; break;
      case 'cross': centre += (H.z < 0 ? 1 : -1) * (0.55 + 0.15 * Math.sin(t * 0.8 * spd)); width = spread * 0.5; break;
      case 'converge': centre = Math.sin(t * 0.4 * spd) * 0.9; width = 0.1; break;
      case 'zigzag': centre += Math.sin(t * 0.3 * spd + hi) * 0.3; break;
      case 'rain': centre += Math.sin(t * 0.2 * spd + hi * 0.9) * 0.4; break;
      case 'burst': width = spread * Math.pow((t * 0.7 * spd + hi * 0.07) % 1, 0.6); break;
      default: centre += Math.sin(t * 0.45 * spd + hi * 1.7) * 0.5;   // sweep
    }
    const ox = w / 2 + (H.z / 12) * w * 0.32, oy = H.y * h;
    for (let k = 0; k < n; k++) {
      let th = centre + (n === 1 ? 0 : k / (n - 1) - 0.5) * width, lift = 0, mul = 1;
      if (pattern === 'wave') th += Math.sin(t * 1.6 * spd + k * 0.7 + hi * 0.9) * 0.35;
      else if (pattern === 'zigzag') lift = k % 2 ? 0.14 : -0.1;
      else if (pattern === 'spiral') { th += Math.sin(t * 1.1 * spd + k * 0.6 + hi) * 0.5; lift = Math.sin(t * 1.4 * spd + k * 0.9 + hi * 0.5) * 0.18; }
      else if (pattern === 'rain') { lift = -0.5; mul = rnd(Math.floor(t * 6 * spd) + k * 3.1, hi) > 0.45 ? 1 : 0.05; }
      else if (pattern === 'burst') mul = 1.2 - ((t * 0.7 * spd + hi * 0.07) % 1) * 0.8;
      else if (pattern === 'flash') mul = Math.floor(t * 4 * spd) % 2 ? 1.1 : 0.05;
      th = fold(th, 1.45);
      const ex = w / 2 + Math.sin(th) * w * 0.75, ey = pattern === 'sky' ? -h * 0.3 : h * (0.32 - tilt * 0.2 - lift);
      const col = mode === 'rainbow' ? hsl(((hi * 0.19 + t * 0.04) % 1) * 360) : mode === 'ab' && (hi + k) % 2 ? b : a;
      const k01 = (lit < 0 ? 1 : k === lit ? 1.4 : 0.12) * mul;
      g.strokeStyle = col;
      g.globalAlpha = 0.22 * k01; g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.stroke();
      g.globalAlpha = 0.8 * k01; g.lineWidth = 1;
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.stroke();
    }
  });
  g.globalAlpha = 1;
}

// a strobe pattern: steps (seconds) of [on?, length]; loops; whites the room on the hits
export function strobe(g, w, h, t, { steps = [[1, 0.06], [0, 0.2]], blinders = false, col = '#ffffff' } = {}) {
  const total = steps.reduce((s, x) => s + x[1], 0);
  let u = t % total, on = false;
  for (const [o, d] of steps) { if (u < d) { on = !!o; break; } u -= d; }
  room(g, w, h);
  g.globalCompositeOperation = 'lighter';
  if (on) {
    g.fillStyle = col; g.globalAlpha = 0.85; g.fillRect(0, 0, w, h * 0.84);
    g.globalAlpha = 1;
  }
  // the fixtures along the truss
  for (let i = 0; i < 8; i++) {
    g.fillStyle = on ? '#fff' : '#3a3c46';
    g.fillRect(w * (0.12 + i * 0.105), h * 0.1 + 4, 12, 6);
    if (blinders) { g.fillStyle = on ? '#ffd27a' : '#4a3a20'; g.beginPath(); g.arc(w * (0.15 + i * 0.105), h * 0.88, 4, 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
}

// a screen feed: a frame of the stage with its LED wall showing a sketch of the feed
export function screen(g, w, h, t, id) {
  room(g, w, h, { truss: false });
  const x0 = w * 0.16, y0 = h * 0.14, sw = w * 0.68, sh = h * 0.6;
  g.save(); g.beginPath(); g.rect(x0, y0, sw, sh); g.clip();
  g.fillStyle = '#000'; g.fillRect(x0, y0, sw, sh);
  g.globalCompositeOperation = 'lighter';
  const P = (u, v) => [x0 + u * sw, y0 + v * sh];
  if (id === 'waves') for (let k = 0; k < 4; k++) { g.strokeStyle = hsl(190 + k * 30); g.lineWidth = 3; g.beginPath(); for (let u = 0; u <= 1.01; u += 0.05) { const [x, y] = P(u, 0.5 + Math.sin(u * 7 + t * 2 + k) * 0.25 * (0.4 + k * 0.2)); u ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  else if (id === 'aurora') for (let k = 0; k < 3; k++) { const gr = g.createLinearGradient(x0, y0, x0, y0 + sh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, hsl(140 + k * 50, 50)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.globalAlpha = 0.5; g.beginPath(); for (let u = 0; u <= 1.01; u += 0.05) { const [x, y] = P(u, 0.3 + Math.sin(u * 4 + t + k * 2) * 0.15); u ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineTo(x0 + sw, y0 + sh); g.lineTo(x0, y0 + sh); g.fill(); g.globalAlpha = 1; }
  else if (id === 'rings') for (let k = 0; k < 6; k++) { const r = ((t * 0.5 + k / 6) % 1) * sw * 0.6; g.strokeStyle = hsl(280 + k * 25); g.lineWidth = 3; g.beginPath(); g.arc(x0 + sw / 2, y0 + sh / 2, r, 0, TAU); g.stroke(); }
  else if (id === 'bars') for (let k = 0; k < 12; k++) { const v = 0.3 + 0.6 * Math.abs(Math.sin(t * 3 + k * 1.3)); g.fillStyle = hsl(k * 30); g.fillRect(x0 + (k / 12) * sw + 1, y0 + sh * (1 - v), sw / 12 - 2, sh * v); }
  else if (id === 'embers') for (let k = 0; k < 30; k++) { const u = rnd(k), v = 1 - ((t * 0.2 + rnd(k, 1)) % 1); g.fillStyle = hsl(20 + rnd(k, 2) * 30); g.beginPath(); g.arc(...P(u, v), 2, 0, TAU); g.fill(); }
  else if (id === 'starfield') for (let k = 0; k < 40; k++) { const z = (t * 0.4 + rnd(k)) % 1, a = rnd(k, 1) * TAU, r = z * sw * 0.7; g.fillStyle = '#fff'; g.globalAlpha = z; g.fillRect(x0 + sw / 2 + Math.cos(a) * r, y0 + sh / 2 + Math.sin(a) * r * 0.6, 2, 2); g.globalAlpha = 1; }
  else if (id === 'noise') { for (let k = 0; k < 7; k++) { const gr = g.createRadialGradient(...P(0.5 + Math.sin(t * 0.6 + k * 2) * 0.4, 0.5 + Math.cos(t * 0.5 + k) * 0.4), 0, ...P(0.5 + Math.sin(t * 0.6 + k * 2) * 0.4, 0.5 + Math.cos(t * 0.5 + k) * 0.4), sw * 0.3); gr.addColorStop(0, hsl(k * 51 + t * 20)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x0, y0, sw, sh); } }
  else if (id === 'show') for (let k = 0; k < 60; k++) { g.fillStyle = Math.sin(t * 3 + k * 0.7) > 0 ? '#ff2bd6' : '#00e5ff'; g.fillRect(x0 + (k % 12) / 12 * sw + 2, y0 + Math.floor(k / 12) / 5 * sh + 2, sw / 12 - 4, sh / 5 - 4); }
  else if (id === 'film') { const gr = g.createLinearGradient(x0, y0, x0 + sw, y0 + sh); gr.addColorStop(0, hsl(t * 30 + 200, 35)); gr.addColorStop(1, hsl(t * 30 + 320, 30)); g.fillStyle = gr; g.fillRect(x0, y0, sw, sh); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.moveTo(...P(0.42, 0.32)); g.lineTo(...P(0.62, 0.5)); g.lineTo(...P(0.42, 0.68)); g.fill(); }
  g.restore();
  g.strokeStyle = '#2a2c34'; g.lineWidth = 3; g.strokeRect(x0 - 1.5, y0 - 1.5, sw + 3, sh + 3);
  if (id === 'off') { g.fillStyle = '#5a5c66'; g.font = '700 16px -apple-system, sans-serif'; g.textAlign = 'center'; g.fillText('OFF', w / 2, h * 0.47); }
}

// a truss plan from above: the stage, the floor, and the trusses (rows, circles, arcs, squares)
export function trussPlan(g, w, h, plan) {
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#07080c'; g.fillRect(0, 0, w, h);
  const X = (x) => w * 0.08 + ((x + 34) / 70) * w * 0.84, Z = (z) => h / 2 + (z / 17) * h * 0.42, S = (m) => (m / 70) * w * 0.84;
  g.fillStyle = '#1b1c24'; g.fillRect(X(-33), Z(-15), X(-20) - X(-33), Z(15) - Z(-15));   // the stage
  g.strokeStyle = '#26282f'; g.lineWidth = 1; g.strokeRect(X(-20), Z(-14), X(33) - X(-20), Z(14) - Z(-14));   // the floor
  g.strokeStyle = '#d8ff3a'; g.lineWidth = 3; g.lineCap = 'round';
  for (const tr of plan?.trusses || []) {
    if (tr.shape === 'circle') { g.beginPath(); g.arc(X(tr.x), Z(tr.z), S(tr.r), 0, TAU); g.stroke(); continue; }
    if (tr.shape === 'square') { g.strokeRect(X(tr.x) - S(tr.r), Z(tr.z) - S(tr.r), S(tr.r) * 2, S(tr.r) * 2); continue; }
    if (tr.shape === 'arc') { g.beginPath(); g.arc(X(tr.x - tr.r), Z(tr.z), S(tr.r), -0.9, 0.9); g.stroke(); continue; }
    const dx = Math.cos(tr.rot ?? 0) * tr.len / 2, dz = Math.sin(tr.rot ?? 0) * tr.len / 2;
    g.beginPath(); g.moveTo(X(tr.x - dx), Z(tr.z - dz)); g.lineTo(X(tr.x + dx), Z(tr.z + dz)); g.stroke();
  }
  g.fillStyle = '#fff';
  for (const f of plan?.fixtures || []) { g.beginPath(); g.arc(X(f.x), Z(f.z), 1.6, 0, TAU); g.fill(); }
  if (!plan) {   // the house rig: three rows over the stage
    for (const x of [-27.8, -24.4, -20.8]) { g.beginPath(); g.moveTo(X(x), Z(-13)); g.lineTo(X(x), Z(13)); g.stroke(); }
  }
}

// --- FX ----------------------------------------------------------------------------------------
// a firework (indoor pyro) burst cycle: shells rising from the stage lip, breaking in a style
export function pyro(g, w, h, t, { style = 'peony', cols = ['#ffcf4a'], n = 5, period = 2.2 } = {}) {
  room(g, w, h, { truss: false });
  g.globalCompositeOperation = 'lighter';
  for (let s = 0; s < n; s++) {
    const ph = ((t + s * (period / n)) % period) / period, x = w * (0.15 + 0.7 * rnd(s, Math.floor((t + s * (period / n)) / period)));
    const col = cols[s % cols.length] === 'rainbow' ? hsl(s * 72 + t * 40) : cols[s % cols.length];
    if (ph < 0.3) { const y = h * 0.84 - (ph / 0.3) * h * 0.5; g.fillStyle = col; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); continue; }
    const k = (ph - 0.3) / 0.7, cy = h * 0.34, r = k * w * 0.16, fade = 1 - k;
    const rays = style === 'ring' ? 18 : 22;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU, dy = style === 'willow' ? k * k * h * 0.35 : 0;
      const rr = style === 'ring' ? r : r * (0.6 + 0.4 * rnd(i, s));
      g.fillStyle = col; g.globalAlpha = fade;
      if (style === 'crackle' && rnd(i, Math.floor(t * 10)) > 0.6) { g.fillStyle = '#fff'; }
      g.beginPath(); g.arc(x + Math.cos(a) * rr, cy + Math.sin(a) * rr * (style === 'ring' ? 0.4 : 1) + dy, 1.8, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
}

// flames off the stage lip
export function flames(g, w, h, t, { col = '#ff7a00', n = 6 } = {}) {
  room(g, w, h, { truss: false });
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = w * (0.12 + (0.76 * i) / (n - 1)), fh = h * (0.4 + 0.25 * Math.abs(Math.sin(t * 7 + i * 2)));
    const gr = g.createLinearGradient(x, h * 0.84, x, h * 0.84 - fh);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.2, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 7, h * 0.84); g.quadraticCurveTo(x + Math.sin(t * 9 + i) * 6, h * 0.84 - fh * 0.6, x, h * 0.84 - fh); g.quadraticCurveTo(x + 4, h * 0.84 - fh * 0.5, x + 7, h * 0.84); g.fill();
  }
}

// confetti: shot up from cannons (or falling through the light), tumbling flakes
export function confetti(g, w, h, t, { cols = ['#ff1430', '#ffe600', '#1e5aff', '#00ff6a', '#ff2bd6', '#ffffff'], from = 'cannons', n = 70, gold = false } = {}) {
  room(g, w, h, { truss: from === 'drop' });
  const period = 3;
  for (let i = 0; i < n; i++) {
    const ph = ((t + rnd(i) * period) % period) / period;
    let x, y;
    if (from === 'drop') { x = w * rnd(i, 1) + Math.sin(t * 2 + i) * 6; y = h * 0.12 + ph * h * 0.75; }
    else { const side = i % 2 ? 1 : -1, cx = w * (0.5 + side * 0.32); const up = Math.min(1, ph * 3); x = cx - side * up * w * 0.25 * rnd(i, 2) + Math.sin(t * 3 + i) * 4; y = h * 0.84 - up * h * 0.7 + Math.max(0, ph - 0.33) * h * 1.1; }
    if (y > h * 0.86) continue;
    g.save(); g.translate(x, y); g.rotate(t * 4 + i); g.scale(1, Math.abs(Math.sin(t * 6 + i)) + 0.2);
    g.fillStyle = gold ? (i % 2 ? '#ffd24a' : '#e8e8f0') : cols[i % cols.length];
    g.fillRect(-2.5, -1.5, 5, 3); g.restore();
  }
}

// streamers: long ribbons shot over the floor, curling as they fall
export function streamers(g, w, h, t, { cols = ['#ffd24a', '#e8e8f0', '#ff2bd6'], n = 9 } = {}) {
  room(g, w, h, { truss: false });
  const period = 3.4, ph = (t % period) / period;
  g.lineWidth = 2.4; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, x0 = w * (0.5 + side * 0.36), rise = Math.min(1, ph * 2.5), fall = Math.max(0, ph - 0.4);
    g.strokeStyle = cols[i % cols.length];
    g.beginPath();
    for (let k = 0; k <= 12; k++) {
      const u = k / 12, x = x0 - side * u * w * (0.25 + 0.3 * rnd(i)) * rise, y = h * 0.84 - (1 - u * 0.3) * h * 0.7 * rise + fall * h * (0.6 + u * 0.3) + Math.sin(u * 12 + t * 4 + i) * 5;
      k ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
}

// bubbles: rainbow-rimmed circles drifting
export function bubbles(g, w, h, t, { n = 26, from = 'stage', big = false } = {}) {
  room(g, w, h, { truss: from === 'truss' });
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.12 + rnd(i)) % 1, r = (big ? 8 : 3) + rnd(i, 1) * (big ? 9 : 6);
    let x, y;
    if (from === 'truss') { x = w * rnd(i, 2) + Math.sin(t + i) * 8; y = h * 0.12 + ph * h * 0.7; }
    else { x = w * 0.08 + ph * w * 0.9; y = h * (0.75 - 0.5 * rnd(i, 3)) + Math.sin(t * 1.5 + i) * 6; }
    const gr = g.createRadialGradient(x, y, r * 0.6, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.02)'); gr.addColorStop(0.85, hsl(t * 40 + i * 30, 70)); gr.addColorStop(1, 'rgba(255,255,255,0.1)');
    g.globalAlpha = 0.7; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.globalAlpha = 0.9; g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.15, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

// a balloon drop (or beach balls bobbing)
export function balloons(g, w, h, t, { cols = ['#ff1430', '#ffe600', '#1e5aff', '#00ff6a', '#ff2bd6'], n = 34, beach = false } = {}) {
  room(g, w, h, { truss: !beach });
  for (let i = 0; i < n; i++) {
    const ph = beach ? 0.75 : (t * 0.22 + rnd(i)) % 1, x = w * rnd(i, 1) + Math.sin(t * 1.3 + i) * 5;
    const y = beach ? h * (0.55 + 0.15 * Math.abs(Math.sin(t * 2 + i))) : h * 0.1 + ph * h * 0.72;
    const r = beach ? 9 : 5.5;
    if (beach && i > 12) continue;
    g.fillStyle = cols[i % cols.length];
    g.beginPath(); g.ellipse(x, y, r, r * (beach ? 1 : 1.2), 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.4, r * 0.25, 0, TAU); g.fill();
  }
}

// smoke: a curtain pouring off the truss, or fog rolling, or CO2 jets
export function smoke(g, w, h, t, { kind = 'drop', tint = '#d8deec' } = {}) {
  room(g, w, h, { truss: kind === 'drop' });
  g.globalCompositeOperation = 'source-over';
  const blob = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, tint); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
  if (kind === 'jets') for (let i = 0; i < 6; i++) { const ph = ((t * 0.8 + i * 0.13) % 1); if (ph > 0.5) continue; for (let k = 0; k < 6; k++) blob(w * (0.12 + i * 0.152), h * 0.84 - k * h * 0.11 * (ph * 2.4), 10 + k * 3, 0.35 * (1 - ph * 2)); }
  else if (kind === 'fog') for (let i = 0; i < 14; i++) blob(((i / 14) * w + t * 12 * (i % 2 ? 1 : -1) + w) % (w * 1.2) - w * 0.1, h * 0.78 + Math.sin(t + i) * 4, 26, 0.35);
  else for (let i = 0; i < 26; i++) { const ph = (t * 0.35 + rnd(i)) % 1; blob(w * (0.1 + 0.8 * rnd(i, 1)), h * 0.12 + ph * h * 0.72, 10 + ph * 18, 0.3 * (1 - ph * 0.5)); }
  g.globalAlpha = 1;
}

// drones in a formation, as the crowd sees them (droneshapes.js: [u across, v up, w toward
// the crowd]; nearer drones a little bigger and lower-placed by the perspective), glowing
export function drones(g, w, h, t, { pts = [], col = () => '#00e5ff' } = {}) {
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#03040a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#15161c'; g.fillRect(0, h * 0.9, w, h * 0.1);   // the stage deck, far below
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < pts.length; i++) {
    const [u, v, d = 0] = pts[i], k = 1 / Math.max(0.35, 1 - d * 0.18);
    const x = w / 2 + u * w * 0.34 * k, y = h * 0.46 - v * h * 0.36 * k, r = 3.2 * Math.min(2.2, k);
    if (x < -5 || x > w + 5 || y < -5 || y > h + 5) continue;
    const c = col(i, t, u, v);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
export { hsl, rnd, TAU };

// --- MOMENTS (apps/moments.js) -----------------------------------------------------------------
// flames off the stage lip nozzle by nozzle: lit(i, t) says how high each one burns (0: out)
export function flameRow(g, w, h, t, { n = 8, col = '#ff7a00', lit = () => 1, rainbow = false } = {}) {
  room(g, w, h, { truss: false });
  g.globalCompositeOperation = 'lighter';
  const base = h * 0.84;
  for (let i = 0; i < n; i++) {
    const x = w * (0.1 + (0.8 * i) / Math.max(1, n - 1)), k = Math.max(0, Math.min(1, lit(i, t)));
    g.globalAlpha = 1; g.fillStyle = '#3a3c46'; g.fillRect(x - 3, base - 2, 6, 3);   // the nozzle
    if (k < 0.03) continue;
    const c = rainbow ? hsl(t * 90 + i * 45) : typeof col === 'function' ? col(i, t) : col;
    const fh = h * (0.2 + 0.42 * k) * (0.85 + 0.15 * Math.abs(Math.sin(t * 9 + i * 2)));
    const gr = g.createLinearGradient(x, base, x, base - fh);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.22, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = Math.min(1, k * 1.5); g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 6, base); g.quadraticCurveTo(x + Math.sin(t * 9 + i) * 5, base - fh * 0.6, x, base - fh); g.quadraticCurveTo(x + 4, base - fh * 0.5, x + 6, base); g.fill();
  }
  g.globalAlpha = 1;
}

// outdoor fireworks over a stadium's rim: shells [{ x 0..1, at (s), col, style, big }] in a loop of
// `period` seconds; styles: peony, willow (gold that hangs), ring, heart, salute (a white crack)
export function sky(g, w, h, t, { shells = [], period = 6 } = {}) {
  g.globalCompositeOperation = 'source-over';
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#02030c'); bg.addColorStop(1, '#0c0e1e');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#16171f';   // the stands, round the bowl
  g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.8); g.quadraticCurveTo(w / 2, h * 0.68, w, h * 0.8); g.lineTo(w, h); g.fill();
  g.globalCompositeOperation = 'lighter';
  const u = t % period;
  shells.forEach((S, s) => {
    const age = u - (S.at || 0), x = w * S.x, y0 = h * 0.76, by = h * (0.16 + 0.16 * rnd(s, 3)), rise = 0.7;
    if (age < 0) return;
    if (age < rise) { g.globalAlpha = 1; g.fillStyle = '#ffe2a8'; g.fillRect(x - 1, y0 - (age / rise) * (y0 - by), 2, 4); return; }
    const st = S.style || 'peony', slow = st === 'willow', k = (age - rise) / (slow ? 2.6 : 1.5);
    if (k > 1) return;
    if (st === 'salute') {
      if (k > 0.25) return;
      const r = w * 0.08, gr = g.createRadialGradient(x, by, 0, x, by, r);
      gr.addColorStop(0, `rgba(255,255,255,${1 - k * 4})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(x - r, by - r, r * 2, r * 2);
      return;
    }
    const R = w * 0.12 * (S.big || 1) * Math.sqrt(k), rays = 22;
    g.globalAlpha = 1 - k;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU;
      let dx = Math.cos(a), dy = Math.sin(a);
      if (st === 'heart') { dx = Math.sin(a) ** 3; dy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16; }
      else if (st === 'ring') dy *= 0.35;
      const px = x + dx * R, py = by + dy * R + k * k * h * (slow ? 0.32 : 0.06);
      g.fillStyle = S.col === 'rainbow' ? hsl(i * 16 + t * 40) : S.col || '#ffc84a';
      if (slow) g.fillRect(px - 0.6, py - 8 * k, 1.2, 8 * k);   // the trails hang
      g.beginPath(); g.arc(px, py, 1.5, 0, TAU); g.fill();
    }
  });
  g.globalAlpha = 1;
}

// confetti popped up from points (the floor cannons in the crowd, the stage's poppers, the big
// cannons): src [{ x, y (0..1), d (delay, s), up (how high) }], in a loop of `period`
export function pops(g, w, h, t, { src = [{ x: 0.5, y: 0.84 }], n = 70, period = 3.4, bg = true, cols = ['#ff1430', '#ffe600', '#1e5aff', '#00ff6a', '#ff2bd6', '#ffffff'] } = {}) {
  if (bg) room(g, w, h, { truss: false });
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < n; i++) {
    const S = src[i % src.length], tau = (((t - (S.d || 0)) % period) + period) % period;
    if (tau > period * 0.94) continue;
    const e = 1 - Math.exp(-3.2 * tau), vx = (rnd(i, 1) - 0.5) * w * 0.3, vy = h * (S.up ?? 0.6) * (0.6 + 0.6 * rnd(i, 2));
    const x = w * S.x + vx * e + Math.sin(t * 3 + i) * 3 * e, y = h * S.y - vy * e + tau * tau * h * 0.05;
    if (y > h * 0.92) continue;
    g.save(); g.translate(x, y); g.rotate(t * 4 + i); g.scale(1, Math.abs(Math.sin(t * 6 + i)) + 0.2);
    g.fillStyle = cols[i % cols.length]; g.fillRect(-2.5, -1.5, 5, 3); g.restore();
  }
}

// a balloon drop from the nets in the roof, released in waves (seconds), bobbing on the crowd's hands
export function drop(g, w, h, t, { cols = ['#ff1430', '#ffe600', '#1e5aff', '#00ff6a', '#ff2bd6'], n = 30, waves = [0], period = 8 } = {}) {
  room(g, w, h);
  const u = t % period, land = h * 0.74, fade = Math.max(0, Math.min(1, (period - u) / 0.8));
  g.strokeStyle = '#3a3c46'; g.lineWidth = 1; g.beginPath(); g.moveTo(w * 0.06, h * 0.15); g.lineTo(w * 0.94, h * 0.15); g.stroke();   // the net
  for (let i = 0; i < n; i++) {
    const age = u - waves[i % waves.length] - rnd(i, 4) * 0.6, x = w * (0.06 + 0.88 * rnd(i, 1)) + (age > 0 ? Math.sin(t * 1.3 + i) * 4 : 0);
    let y = h * 0.11 + Math.max(0, age) * h * 0.3;
    if (y > land) y = land - Math.abs(Math.sin(age * 3 + i)) * h * 0.1 * Math.exp(-(y - land) / h);
    g.globalAlpha = age > 0 ? fade : 1;
    g.fillStyle = cols[i % cols.length];
    g.beginPath(); g.ellipse(x, y, 5, 6, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x - 1.8, y - 2.4, 1.3, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

// glowing balls bobbing over the crowd (the lanterns), lit from inside
export function lanterns(g, w, h, t, { cols = ['#ffd27a', '#7ae8ff', '#ff8ad8', '#b9ff7a'], n = 10 } = {}) {
  room(g, w, h, { truss: false });
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = w * (0.08 + 0.84 * rnd(i, 1)) + Math.sin(t * 0.4 + i) * 10, y = h * (0.5 + 0.14 * rnd(i, 2)) - Math.abs(Math.sin(t * 1.4 + i * 1.7)) * h * 0.18, r = 7 + rnd(i, 3) * 3;
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, cols[i % cols.length]); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  }
}

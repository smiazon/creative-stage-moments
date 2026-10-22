// SPECTACLE: the FX app's new effects, the ones the room didn't have yet.
//   DRONES   a swarm of glowing drones that takes off from the stage, flies into formations
//            (a ring, a heart, a star, a sphere, a galaxy, a helix, a wave, words and numbers),
//            moves between them like a real swarm (each at its own pace) and lands again
//   BUBBLES  soap bubbles from machines on the stage lip and up on the truss, drifting and
//            wobbling over the crowd, each with a thin-film rainbow sheen, popping as they go
//   BALLOONS a balloon drop: hundreds released from the nets up in the roof, falling, swaying,
//            batted back up by the crowd a few times, then settling and fading
//   SMOKE    a smoke drop: dry-ice smoke pouring off the truss in a curtain and rolling out
// Everything is pooled (instanced meshes and points, nothing built per shot) and drawn only
// while it has something to show. update(dt, camera) runs every frame (main.js).
import * as THREE from 'three';
import { SPEC, VENUE } from './venue.js';
import { shapeOf, SHAPES } from './droneshapes.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

export function initSpectacle(scene) {
  // where things happen: in front of the stage, over the floor, under the roof
  const front = SPEC.downstageX ?? -20;              // the stage's front edge (x)
  const roof = Math.min(SPEC.roofY ?? 38.5, 40);     // the house steel
  const floor = { x0: front + 1, x1: front + 52, z: 14 };
  const deckY = 2.0;

  // --- DRONES ------------------------------------------------------------------------------
  const DN = 360;
  const drones = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), DN);
  drones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  drones.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DN * 3), 3);
  drones.instanceColor.setUsage(THREE.DynamicDrawUsage);
  drones.frustumCulled = false;
  drones.visible = false;
  drones.name = 'drones';
  scene.add(drones);
  const dPos = Array.from({ length: DN }, () => new THREE.Vector3());
  const dPad = Array.from({ length: DN }, (_, i) => new THREE.Vector3(front - 3 - (i % 12) * 0.6, deckY + 0.15, -10 + Math.floor(i / 12) * (20 / (DN / 12))));
  const dLag = Float32Array.from({ length: DN }, () => rand(0.6, 1.4));   // each drone's own pace
  // the show flies just in front of the stage (every view of the stage sees it; the centre-hung
  // jumbotron would hide it from half the room further out)
  const JUMBO = VENUE === 'arena' ? { x0: -8.4, x1: 8.4, y0: 12.4, y1: 28.5, z: 5.8 } : null;   // the centre-hung board's box
  const D = { on: false, shape: null, colour: null, t: 0, landing: false, count: DN, centre: new THREE.Vector3(front + 3, Math.min(20, roof - 16), 0), size: 7.5 };
  const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color(), tmpV = new THREE.Vector3();
  // the formations (droneshapes.js, shared with the tiles): drone i's spot as [u, v, w], u across
  // as the crowd sees it, v up, w out toward the crowd
  // colour patterns: a palette (hex list) worked round the swarm
  const COLOURS = {
    solid: (pal) => () => pal[0],
    split: (pal) => (i) => pal[i % pal.length],
    sweep: (pal) => (i, t, p) => pal[Math.floor(((p[0] + 1.2) * 1.5 + t * 1.5) % pal.length + pal.length) % pal.length],
    rainbow: () => (i, t, p) => `hsl(${Math.round(((p[0] + p[1]) * 90 + t * 60) % 360)},100%,55%)`,
    twinkle: (pal) => (i, t) => (Math.sin(i * 12.9898 + t * 6) > 0.92 ? '#ffffff' : pal[i % pal.length]),
  };
  // count: how many fly (1..360; all of them when not given). The rest stay on their pads, out of
  // sight, and the formation is worked out for the ones that fly, so the shape stays whole
  function droneShow({ shape = 'ring', word = null, colour = 'split', pal = ['#ff2bd6', '#00e5ff'], count = DN } = {}) {
    if (!D.on) { D.on = true; drones.visible = true; for (let i = 0; i < DN; i++) dPos[i].copy(dPad[i]); }
    D.landing = false;
    D.count = Math.max(1, Math.min(DN, Math.round(count) || DN));
    D.shape = shapeOf({ shape, word });
    D.colour = (COLOURS[colour] || COLOURS.split)(pal);
  }
  function droneLand() { if (D.on) D.landing = true; }
  function updateDrones(dt) {
    if (!D.on) return;
    D.t += dt;
    let parked = 0;
    const n = D.count;
    for (let i = 0; i < DN; i++) {
      let target, p;
      const flies = !D.landing && i < n;   // past the count: back to its pad, then out of sight
      if (!flies) target = dPad[i];
      else {
        p = D.shape(i, n, D.t);
        if (!(Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2]))) p = D.shape(i, Math.max(n, 25), D.t);   // a grid or wave of very few
        // u runs right as the crowd sees it (-z: they face the stage), w out toward them (+x)
        target = tmpV.set(D.centre.x + p[2] * D.size, D.centre.y + p[1] * D.size, D.centre.z - p[0] * D.size);
        // never through the jumbotron (the arena's, over the centre): under it instead
        if (JUMBO && target.x > JUMBO.x0 && target.x < JUMBO.x1 && target.y > JUMBO.y0 && target.y < JUMBO.y1 && Math.abs(target.z) < JUMBO.z) target.y = JUMBO.y0 - 0.6;
      }
      const pos = dPos[i], gap = target.distanceTo(pos), step = Math.min(gap, dt * 7 * dLag[i] + gap * Math.min(1, dt * 1.6 * dLag[i]));
      if (gap > 1e-4) pos.lerp(target, step / gap);
      if (D.landing && gap < 0.05) parked++;
      if (i >= n && gap < 0.05) tmpM.makeScale(0, 0, 0);   // a spare, on its pad: not drawn
      else tmpM.makeTranslation(pos.x, pos.y + (flies ? Math.sin(D.t * 2 + i) * 0.04 : 0), pos.z);
      drones.setMatrixAt(i, tmpM);
      tmpC.set(flies ? D.colour(i, D.t, p || [0, 0, 0]) : '#ffffff');
      tmpC.multiplyScalar(flies ? 2.2 : 0.6);   // bright: the bloom makes them glow
      drones.setColorAt(i, tmpC);
    }
    drones.instanceMatrix.needsUpdate = true;
    drones.instanceColor.needsUpdate = true;
    if (D.landing && parked === DN) { D.on = false; D.landing = false; drones.visible = false; }
  }

  // --- BUBBLES -----------------------------------------------------------------------------
  const BN = 1400;
  const bubbleMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aLife;
      varying vec3 vN; varying vec3 vV; varying float vLife; varying float vSeed;
      void main() {
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vLife = aLife; vSeed = instanceMatrix[3][0] * 0.37 + instanceMatrix[3][2] * 0.71;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform float uT;
      varying vec3 vN; varying vec3 vV; varying float vLife; varying float vSeed;
      vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));     // the rim: where the film shows
        vec3 film = hue(f * 1.6 + vSeed + uT * 0.12) * 0.9 + 0.1;    // thin-film rainbow
        float a = (pow(f, 2.2) * 0.9 + 0.05) * vLife;
        gl_FragColor = vec4(film * a * 1.6, a);
      }`,
  });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), bubbleMat, BN);
  const bLife = new THREE.InstancedBufferAttribute(new Float32Array(BN), 1);
  bLife.setUsage(THREE.DynamicDrawUsage);
  bubbles.geometry.setAttribute('aLife', bLife);
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bubbles.frustumCulled = false;
  bubbles.count = 0;
  bubbles.name = 'bubbles';
  scene.add(bubbles);
  const B = [];   // live bubbles: { p, v, r, age, life, pop, ph }
  const emitters = [];   // { at: fn() -> start, v: fn() -> velocity, rate, until, size }
  const MACHINES = {
    stage: () => ({ p: new THREE.Vector3(front + 0.4, deckY + 1.2, rand(-13, 13)), v: new THREE.Vector3(rand(1.2, 3.2), rand(0.4, 1.4), rand(-0.6, 0.6)) }),
    truss: () => ({ p: new THREE.Vector3(rand(floor.x0, floor.x0 + 26), Math.min(17, roof - 18), rand(-12, 12)), v: new THREE.Vector3(rand(-0.3, 0.3), rand(-0.6, -0.1), rand(-0.3, 0.3)) }),
    sides: () => { const s = Math.random() < 0.5 ? -1 : 1; return { p: new THREE.Vector3(rand(floor.x0, floor.x0 + 30), 4, s * 15), v: new THREE.Vector3(rand(-0.4, 0.4), rand(0.3, 1), -s * rand(0.8, 2)) }; },
  };
  function bubbleBurst({ from = ['stage'], seconds = 8, rate = 120, size = [0.07, 0.2] } = {}) {
    emitters.push({ from, until: D.t + 0, left: seconds, rate, size });
  }
  function updateBubbles(dt, t) {
    for (let k = emitters.length - 1; k >= 0; k--) {
      const e = emitters[k];
      e.left -= dt;
      let n = e.rate * dt;
      while (n > 0 && B.length < BN) {
        if (n < 1 && Math.random() > n) break;
        const m = MACHINES[e.from[(Math.random() * e.from.length) | 0]]();
        B.push({ p: m.p, v: m.v, r: rand(e.size[0], e.size[1]), age: 0, life: rand(7, 16), pop: 0, ph: Math.random() * TAU });
        n -= 1;
      }
      if (e.left <= 0) emitters.splice(k, 1);
    }
    let n = 0;
    for (let k = B.length - 1; k >= 0; k--) {
      const b = B[k];
      b.age += dt;
      b.v.y += (-0.12 - b.v.y) * Math.min(1, dt * 0.6);            // they settle to a slow sink
      b.v.x += Math.sin(t * 0.7 + b.ph) * 0.15 * dt; b.v.z += Math.cos(t * 0.9 + b.ph) * 0.15 * dt;   // the air moves them
      b.v.multiplyScalar(1 - dt * 0.35);
      b.p.addScaledVector(b.v, dt);
      if (b.age > b.life || b.p.y < 1.9) b.pop += dt * 6;             // the end, or a hand: pop
      if (b.pop >= 1) { B.splice(k, 1); continue; }
    }
    for (const b of B) {
      const s = b.r * (1 + b.pop * 0.6) * (1 + Math.sin(t * 5 + b.ph) * 0.03);
      tmpM.makeScale(s, s * (1 + Math.sin(t * 4 + b.ph) * 0.04), s).setPosition(b.p);
      bubbles.setMatrixAt(n, tmpM);
      bLife.array[n] = Math.min(1, b.age * 2) * (1 - b.pop);
      n++;
    }
    bubbles.count = n;
    if (n) { bubbles.instanceMatrix.needsUpdate = true; bLife.needsUpdate = true; }
    bubbleMat.uniforms.uT.value = t;
  }

  // --- BALLOONS ----------------------------------------------------------------------------
  const LN = 420;
  const bGeo = new THREE.SphereGeometry(0.34, 14, 10);
  bGeo.scale(1, 1.18, 1);
  const balloons = new THREE.InstancedMesh(bGeo, new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.15 }), LN);
  balloons.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  balloons.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(LN * 3), 3);
  balloons.frustumCulled = false;
  balloons.count = 0;
  balloons.name = 'balloonDrop';
  scene.add(balloons);
  const L = [];
  const netY = Math.min(roof - 8, 30);
  function balloonDrop({ count = 300, pal = ['#ff1430', '#ffe600', '#1e5aff', '#00ff6a', '#ff2bd6'], wave = 0 } = {}) {
    for (let i = 0; i < count && L.length < LN; i++) {
      L.push({
        p: new THREE.Vector3(rand(floor.x0 + 1, floor.x1 - 6), netY + rand(0, 2.5), rand(-floor.z + 1, floor.z - 1)),
        v: new THREE.Vector3(0, 0, 0), wait: wave + rand(0, 1.4), age: 0, life: rand(16, 24), bounces: 0, ph: Math.random() * TAU,
        c: new THREE.Color(pal[(Math.random() * pal.length) | 0]),
      });
    }
  }
  function updateBalloons(dt, t) {
    let n = 0;
    for (let k = L.length - 1; k >= 0; k--) {
      const b = L[k];
      if (b.wait > 0) { b.wait -= dt; continue; }
      b.age += dt;
      b.v.y += (-1.3 - b.v.y) * Math.min(1, dt * 1.2);                // light: they fall slowly
      b.v.x += Math.sin(t * 1.3 + b.ph) * 0.6 * dt; b.v.z += Math.cos(t * 1.1 + b.ph) * 0.6 * dt;
      b.p.addScaledVector(b.v, dt);
      if (b.p.y < 2.6 && b.v.y < 0) {                                  // the crowd's hands: back up, a few times
        if (b.bounces < 3 && Math.random() < 0.75) { b.v.y = rand(2.2, 4.5); b.v.x += rand(-1, 1); b.v.z += rand(-1, 1); b.bounces++; }
        else { b.p.y = 2.6; b.v.set(b.v.x * 0.9, 0, b.v.z * 0.9); }
      }
      if (b.age > b.life) { L.splice(k, 1); continue; }
    }
    for (const b of L) {
      if (b.wait > 0) continue;
      const fade = Math.min(1, (b.life - b.age) / 1.5);
      tmpM.makeRotationZ(Math.sin(t * 1.7 + b.ph) * 0.25).scale(tmpV.setScalar(Math.max(0.01, fade))).setPosition(b.p);
      balloons.setMatrixAt(n, tmpM);
      balloons.setColorAt(n, b.c);
      n++;
    }
    balloons.count = n;
    if (n) { balloons.instanceMatrix.needsUpdate = true; balloons.instanceColor.needsUpdate = true; }
  }

  // --- SMOKE DROP --------------------------------------------------------------------------
  const SN = 900;
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  { const g = sc.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const sGeo = new THREE.BufferGeometry();
  const sP = new Float32Array(SN * 3), sA = new Float32Array(SN), sS = new Float32Array(SN);
  sGeo.setAttribute('position', new THREE.BufferAttribute(sP, 3).setUsage(THREE.DynamicDrawUsage));
  sGeo.setAttribute('aA', new THREE.BufferAttribute(sA, 1).setUsage(THREE.DynamicDrawUsage));
  sGeo.setAttribute('aS', new THREE.BufferAttribute(sS, 1).setUsage(THREE.DynamicDrawUsage));
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uMap: { value: new THREE.CanvasTexture(sc) }, uTint: { value: new THREE.Color(0.85, 0.88, 0.95) }, uScale: { value: 300 } },
    vertexShader: /* glsl */`
      attribute float aA; attribute float aS; varying float vA;
      uniform float uScale;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aS * uScale / -mv.z; vA = aA; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uTint; varying float vA;
      void main() { float m = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(uTint, m * vA * 0.32); }`,
  });
  const smoke = new THREE.Points(sGeo, smokeMat);
  smoke.frustumCulled = false;
  smoke.visible = false;
  smoke.name = 'smokeDrop';
  scene.add(smoke);
  const S = [];
  const smokeLines = [];   // where it pours from: { x0, x1, z0, z1, y, left, rate }
  function smokeDrop({ where = 'front', seconds = 6, rate = 140, tint = null } = {}) {
    if (tint) smokeMat.uniforms.uTint.value.set(tint);
    const y = Math.min(17, roof - 18);
    const lines = {
      front: [{ x0: front + 1, x1: front + 1.5, z0: -14, z1: 14, y }],
      sides: [{ x0: front + 4, x1: front + 30, z0: -13, z1: -12.5, y }, { x0: front + 4, x1: front + 30, z0: 12.5, z1: 13, y }],
      cross: [{ x0: front + 1, x1: front + 1.5, z0: -14, z1: 14, y }, { x0: front + 4, x1: front + 30, z0: -0.3, z1: 0.3, y }],
      room: [{ x0: front + 4, x1: front + 34, z0: -13, z1: 13, y }],
    }[where] || [];
    for (const l of lines) smokeLines.push({ ...l, left: seconds, rate: rate / lines.length });
  }
  function updateSmoke(dt) {
    for (let k = smokeLines.length - 1; k >= 0; k--) {
      const l = smokeLines[k];
      l.left -= dt;
      let n = l.rate * dt;
      while (n > 0 && S.length < SN) {
        if (n < 1 && Math.random() > n) break;
        S.push({ p: new THREE.Vector3(rand(l.x0, l.x1), l.y + rand(-0.3, 0.3), rand(l.z0, l.z1)), vy: rand(-2.6, -1.6), age: 0, life: rand(6, 9), s: rand(1.2, 2.2), drift: new THREE.Vector2(rand(-0.4, 0.4), rand(-0.4, 0.4)) });
        n -= 1;
      }
      if (l.left <= 0) smokeLines.splice(k, 1);
    }
    let n = 0;
    for (let k = S.length - 1; k >= 0; k--) {
      const q = S[k];
      q.age += dt;
      if (q.p.y > 0.8) q.p.y += q.vy * dt;                               // pouring down
      else { q.p.x += q.drift.x * 2 * dt; q.p.z += q.drift.y * 2 * dt; } // then rolling out over the floor
      q.p.x += q.drift.x * dt; q.p.z += q.drift.y * dt;
      q.s += dt * (q.p.y > 0.8 ? 0.5 : 1.4);
      if (q.age > q.life) { S.splice(k, 1); continue; }
    }
    for (const q of S) {
      sP[n * 3] = q.p.x; sP[n * 3 + 1] = q.p.y; sP[n * 3 + 2] = q.p.z;
      sA[n] = Math.min(1, q.age * 1.5) * Math.min(1, (q.life - q.age) / 2);
      sS[n] = q.s;
      n++;
    }
    sGeo.setDrawRange(0, n);
    smoke.visible = n > 0;
    if (n) { sGeo.attributes.position.needsUpdate = true; sGeo.attributes.aA.needsUpdate = true; sGeo.attributes.aS.needsUpdate = true; }
  }

  let clock = 0;
  return {
    droneShow, droneLand, get dronesUp() { return D.on && !D.landing; },
    bubbleBurst, balloonDrop, smokeDrop,
    // everything off: the drones land, the rest fades out on its own
    stop() { droneLand(); emitters.length = 0; smokeLines.length = 0; },
    shapes: Object.keys(SHAPES),
    update(dt) {
      clock += dt;
      updateDrones(dt);
      if (B.length || emitters.length) updateBubbles(dt, clock);
      else bubbles.count = 0;
      if (L.length) updateBalloons(dt, clock); else balloons.count = 0;
      if (S.length || smokeLines.length) updateSmoke(dt); else smoke.visible = false;
    },
  };
}

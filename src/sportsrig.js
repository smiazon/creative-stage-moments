// THE GAME RIG: hockey and basketball nights get a lighting rig too. An oval truss hung over the
// ice or the court, round the centre-hung jumbotron, with a ring of moving heads under it: beams
// through the haze and pools of light on the surface. It plays whatever the stage rig is told
// (rigFX: the look's level, the colours, the motion, the strobes, the rainbow), or, in the Crowd
// app, the wristbands' colours. Beams are drawn, not lit (no scene lights: nothing to recompile),
// and only shown in the sports modes (main.js).
import * as THREE from 'three';

const TAU = Math.PI * 2;
// how much of the rig each stage look lights (rigfx.js cues), for the beams here
const LEVEL = { blackout: 0, preshow: 0.12, intro: 0.55, ballad: 0.55, acoustic: 0.6, anthem: 0.9, ballyhoo: 1, beamfan: 1, crossfire: 1, tilt: 0.9, strobefit: 0.35, lasershow: 0.15, rainbow: 0.9, drop: 1, hit: 1, encore: 1, full: 1 };

export function initSportsRig(scene, { y = 26, a = 19, b = 10.5, roofY = 38.5, heads = 28 } = {}) {
  const group = new THREE.Group();
  group.name = 'sportsRig';
  group.visible = false;
  scene.add(group);

  // the truss: a box truss round an oval (four chords and rungs), hung on chains from the roof
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.35 });
  const oval = (r, yy) => new THREE.CatmullRomCurve3(Array.from({ length: 64 }, (_, i) => { const t = (i / 64) * TAU; return new THREE.Vector3(Math.cos(t) * (a + r), yy, Math.sin(t) * (b + r)); }), true);
  for (const [r, yy] of [[-0.25, y + 0.25], [0.25, y + 0.25], [-0.25, y - 0.25], [0.25, y - 0.25]]) {
    group.add(new THREE.Mesh(new THREE.TubeGeometry(oval(r, yy), 256, 0.035, 6, true), steel));
  }
  const RUNGS = 160;
  const rung = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 5), steel, RUNGS * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < RUNGS; i++) {
    const t = (i / RUNGS) * TAU, x = Math.cos(t), z = Math.sin(t);
    m.compose(v.set(x * (a - 0.25), y, z * (b - 0.25)), q.identity(), s1); rung.setMatrixAt(i * 2, m);
    m.compose(v.set(x * (a + 0.25), y, z * (b + 0.25)), q.identity(), s1); rung.setMatrixAt(i * 2 + 1, m);
  }
  group.add(rung);
  for (const t of [0.4, Math.PI - 0.4, Math.PI + 0.4, -0.4, Math.PI / 2, -Math.PI / 2]) {   // the chains up to the steel
    const len = roofY - y;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 4), steel);
    c.position.set(Math.cos(t) * a, y + len / 2, Math.sin(t) * b);
    group.add(c);
  }

  // the heads: a body under the truss, a lens, a beam (an additive cone, bright at the lens and
  // fading out) and a pool where it lands
  const P = Array.from({ length: heads }, (_, i) => { const t = (i / heads) * TAU; return new THREE.Vector3(Math.cos(t) * a, y - 0.55, Math.sin(t) * b); });
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.5, 0.42), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6 }), heads);
  P.forEach((p, i) => { m.compose(p, q.identity(), s1); bodies.setMatrixAt(i, m); });
  group.add(bodies);
  const fade = (geo, k) => {   // vertex colours: bright where k(y) says, dark at the far end
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const c = k(pos, i); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = c; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  };
  const coneGeo = fade(new THREE.CylinderGeometry(0.06, 1, 1, 18, 1, true).translate(0, -0.5, 0), (p, i) => (p.getY(i) > -0.5 ? 0.9 : 0.0));
  const beamMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, opacity: 0.32 });
  const beams = new THREE.InstancedMesh(coneGeo, beamMat, heads);
  beams.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(heads * 3), 3);
  beams.frustumCulled = false;
  group.add(beams);
  const poolGeo = fade(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), (p, i) => Math.max(0, 1 - Math.hypot(p.getX(i), p.getZ(i))) ** 1.5);
  const pools = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.55 }), heads);
  pools.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(heads * 3), 3);
  pools.frustumCulled = false;
  group.add(pools);
  const lens = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), heads);
  lens.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(heads * 3), 3);
  P.forEach((p, i) => { m.compose(v.copy(p).setY(p.y - 0.28), q.identity(), s1); lens.setMatrixAt(i, m); });
  group.add(lens);

  // where each head points: a spot on the surface (or up in the stands), by the motion
  const tgt = new THREE.Vector3(), dir = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0), col = new THREE.Color(), tmp = new THREE.Color();
  function aim(i, beh, t, out) {
    const p = P[i], k = i / heads, ang = k * TAU;
    switch (beh) {
      case 'park': return out.set(p.x * 0.55, 0, p.z * 0.55);
      case 'fan': { const r = 0.5 + 0.45 * Math.sin(t * 0.8); return out.set(Math.cos(ang) * a * 1.5 * r, 0, Math.sin(ang) * b * 1.5 * r); }
      case 'slowfan': { const r = 0.5 + 0.3 * Math.sin(t * 0.35); return out.set(Math.cos(ang) * a * 1.3 * r, 0, Math.sin(ang) * b * 1.3 * r); }
      case 'ballyhoo': return out.set(Math.sin(t * 1.7 + i * 1.3) * 26, 0, Math.sin(t * 2.3 + i * 0.7) * 12);
      case 'crossbeams': return out.set(-p.x * 0.7 + Math.sin(t + i) * 3, 0, -p.z * 0.7 + Math.cos(t * 0.8 + i) * 2);
      case 'tiltwave': { const r = 0.3 + 1.25 * (0.5 + 0.5 * Math.sin(t * 1.4 - k * TAU * 2)); return out.set(Math.cos(ang) * a * r, r > 1.15 ? (r - 1.15) * 30 : 0, Math.sin(ang) * b * r); }
      default: return out.set(Math.sin(t * 0.6 + i * 0.3) * 22, 0, Math.cos(t * 0.45 + i * 0.5) * 10);   // sweep
    }
  }
  let clock = 0, frame = 0;
  return {
    group,
    // state: { a, b (THREE.Color), level 0..1, beh, rate, strobe, blind, rainbow }
    update(dt, S) {
      if (!group.visible) return;
      clock += dt * (S.rate ?? 1);
      frame++;
      const flash = S.strobe && frame % 7 < 3, blind = S.blind && frame % 10 < 2;
      for (let i = 0; i < heads; i++) {
        aim(i, S.beh, clock, tgt);
        const p = P[i];
        dir.subVectors(tgt, p);
        const len = dir.length();
        dir.multiplyScalar(1 / len);
        q.setFromUnitVectors(DOWN, dir);
        const r = len * 0.075;
        m.compose(p, q, v.set(r, len, r));
        beams.setMatrixAt(i, m);
        if (S.rainbow) col.setHSL((i / heads + clock * 0.05) % 1, 1, 0.55); else col.copy(i % 2 ? S.b : S.a);
        let k = S.level ?? 1;
        if (S.strobe) k = flash ? 1.6 : 0.05;
        if (blind) col.setRGB(1, 0.95, 0.85), k = 2;
        tmp.copy(col).multiplyScalar(k);
        beams.setColorAt(i, tmp);
        lens.setColorAt(i, tmp.copy(col).multiplyScalar(k > 0.02 ? 2 + k : 0.05));
        // the pool where it lands (on the surface only)
        const onFloor = tgt.y < 0.5;
        m.compose(v.set(tgt.x, 0.06, tgt.z), q.identity(), s1.clone().multiplyScalar(onFloor ? r * 1.25 : 0.001));
        pools.setMatrixAt(i, m);
        pools.setColorAt(i, tmp.copy(col).multiplyScalar(k * 0.9));
      }
      beams.instanceMatrix.needsUpdate = true; beams.instanceColor.needsUpdate = true;
      pools.instanceMatrix.needsUpdate = true; pools.instanceColor.needsUpdate = true;
      lens.instanceColor.needsUpdate = true;
    },
    levelOf: (look) => LEVEL[look] ?? 0.8,
  };
}

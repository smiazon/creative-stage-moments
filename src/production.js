// PRODUCTION: the touring kit round an open-air end stage that is not the
// stage itself or the lighting rig — what makes a stadium show read as one.
//
//   * the stage dressing: scaffold wings either side of the roof, black scrim,
//     an IMAG screen on each wing, the PA (flown from the wings or stacked on
//     the deck), a sub line in the pit with front fills on it, band risers
//     with a kit and keys, wedges along the lip, stairs off the sides. The
//     roof itself is stadium.js's; both are laid out from the same deck
//     (stage.js stageDressLayout) and refit whenever the stage is rebuilt.
//   * the FOH position: a scaffold riser in the existing pen with the desks
//     lifted onto it, black skirting, rails, a stair and a pitched tent roof.
//   * delay towers out in the crowd: lattice masts with a top deck, a flown
//     delay hang facing the back of the house, a barrier round the base, and
//     six moving heads each that play whatever the stage rig is playing (its
//     colours, level, motion, strobe) — read live from rigFX, never driven on
//     their own, so they are dark whenever the rig is dark, which it is at boot.
//
// Beams are drawn, not lit (additive cones, no scene lights: nothing to
// recompile), like the game rig's (sportsrig.js). Hardware is Lambert.
//
// initProduction(scene, opts) returns the API the Build app's Production tab
// drives. In the arena (indoors: no roof to bring, no towers to stand) it
// returns the same object with nothing available and every setter a no-op.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { boxTruss } from './truss.js';
import { SPEC, IS_STADIUM } from './venue.js';
import { makeSpeakerGrille } from './textures.js';
import {
  MAIN_H, FOH_CX, FOH_RISER, STAGE_DRESS, DELAY_TOWERS, DELAY_TOWER_CLEAR,
  delayTowerSpots, stageDressLayout, onStageBuilt, currentStageCfg,
} from './stage.js';
import { makeScrimTexture, scrimPanel } from './stadium.js';

const TAU = Math.PI * 2;
const HEADS_PER_TOWER = 6;
const MAX_TOWERS = 4;
const PA_STYLES = ['flown', 'stacked', 'none'];

// what this room can take
const OPEN_STAGE = !!SPEC.stageDress;            // stadium, cricket ground, festival field
const TOWERS_OK = !!SPEC.delayTowers;            // the festival's towers are its own (grounds.js)
const FOH_OK = IS_STADIUM;                       // open air: the mix position gets a roof

// --- small geometry helpers (merged, never meshes) -------------------------------
const tube = (ax, ay, az, bx, by, bz, r, seg = 5) => {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(ax, ay, az);
  return g;
};
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const merged = (geos, mat, name) => {
  const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(geos), mat);
  if (name) m.name = name;
  return m;
};
const disposeGroup = (g) => {
  for (const c of [...g.children]) {
    g.remove(c);
    c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
};
const rnd01 = (k) => { const v = Math.sin(k * 12.9898) * 43758.5453; return v - Math.floor(v); };

// --- loudspeakers -------------------------------------------------------------------
// The same cabinet/J-array machinery as the rig's PA (rig.js): a dark shell with
// a grille face just proud of it; each box in a hang hinges off the bottom
// front edge of the one above at a cumulative splay. yaw turns the whole hang
// (forward = (cos yaw, -sin yaw) in x/z).
function speakerKit() {
  const shells = [], faces = [], steel = [];
  const GAP = 0.02;
  const cabinet = (cx, cy, cz, w, h, d, tilt, yaw, rear = false) => {
    const shell = new THREE.BoxGeometry(d, h, w);
    shell.rotateZ(-tilt); shell.rotateY(yaw); shell.translate(cx, cy, cz);
    shells.push(shell);
    const face = new THREE.PlaneGeometry(w - 0.1, h - 0.05);
    face.rotateY(rear ? -Math.PI / 2 : Math.PI / 2);
    face.translate((rear ? -1 : 1) * (d / 2 + 0.012), 0, 0);
    face.rotateZ(-tilt); face.rotateY(yaw); face.translate(cx, cy, cz);
    faces.push(face);
  };
  // flown: bumper on top, two drops up to pickY, boxes chained down the hinge
  const hang = (x, z, topY, boxes, w, h, d, splays, yaw, pickY) => {
    const fx = Math.cos(yaw), fz = -Math.sin(yaw);
    const bh = 0.2, by = topY + GAP + bh / 2;
    steel.push(new THREE.BoxGeometry(d + 0.3, bh, w + 0.3).rotateY(yaw).translate(x, by, z));
    for (const q of [-1, 1]) {
      const lx = x - fz * q * (w / 2 - 0.1), lz = z + fx * q * (w / 2 - 0.1);
      steel.push(tube(lx, by + bh / 2, lz, lx, pickY, lz, 0.025));
    }
    let px = x + fx * (d / 2), py = topY, pz = z + fz * (d / 2);
    for (let i = 0; i < boxes; i++) {
      const t = (splays[Math.min(i, splays.length - 1)] * Math.PI) / 180;
      const ct = Math.cos(t), st = Math.sin(t);
      const f = [fx * ct, -st, fz * ct], u = [fx * st, ct, fz * st];
      cabinet(px - f[0] * d / 2 - u[0] * h / 2, py - f[1] * d / 2 - u[1] * h / 2, pz - f[2] * d / 2 - u[2] * h / 2, w, h, d, t, yaw);
      px -= u[0] * (h + GAP); py -= u[1] * (h + GAP); pz -= u[2] * (h + GAP);
    }
  };
  // ground stack: boxes upward from baseY, each nosed UP by ups[i] degrees
  const stack = (x, z, baseY, boxes, w, h, d, ups, yaw) => {
    for (let i = 0; i < boxes; i++) {
      const t = -(ups[Math.min(i, ups.length - 1)] * Math.PI) / 180;
      cabinet(x, baseY + h / 2 + i * (h + GAP), z, w, h, d, t, yaw);
    }
  };
  // cardioid sub stack: middle box reversed
  const subs = (x, z, baseY, high, yaw = 0) => {
    for (let i = 0; i < high; i++) cabinet(x, baseY + 0.28 + i * (0.56 + GAP), z, 0.95, 0.56, 0.78, 0, yaw, high > 2 && i === 1);
  };
  return { shells, faces, steel, cabinet, hang, stack, subs };
}

// ---------------------------------------------------------------------------------
export function initProduction(scene, opts = {}) {
  const root = new THREE.Group();
  root.name = 'production';
  root.visible = false;
  scene.add(root);

  const available = { towers: TOWERS_OK, fohTent: FOH_OK, wings: OPEN_STAGE, pa: OPEN_STAGE, risers: OPEN_STAGE };
  const st = {
    visible: false,
    towers: TOWERS_OK ? DELAY_TOWERS.count : 0,
    fohTent: FOH_OK,
    wings: OPEN_STAGE,
    pa: OPEN_STAGE ? 'flown' : 'none',
    risers: OPEN_STAGE,
  };

  // --- shared materials ---------------------------------------------------------
  const steelMat = new THREE.MeshLambertMaterial({ color: 0x2e3136, emissive: 0x0c0d10 });
  const scaffMat = new THREE.MeshLambertMaterial({ color: 0x8c9198, emissive: 0x111317 });   // galvanised scaffold
  const blackMat = new THREE.MeshLambertMaterial({ color: 0x0f1013 });
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x24262b });
  const ballastMat = new THREE.MeshLambertMaterial({ color: 0x6f6c66 });
  const canvasMat = new THREE.MeshLambertMaterial({ color: 0x2a2c31, side: THREE.DoubleSide });
  const scrimMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: makeScrimTexture(), side: THREE.DoubleSide });
  const cabMat = new THREE.MeshLambertMaterial({ color: 0x0e0e11 });
  const grilleMat = new THREE.MeshLambertMaterial({ map: makeSpeakerGrille(), color: 0xffffff });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0xb9bec6, emissive: 0x15171b });
  const screenMat = opts.screenMat || new THREE.MeshBasicMaterial({ color: 0x050506 });
  const workLight = new THREE.MeshBasicMaterial({ toneMapped: false });
  workLight.color.setRGB(1.1, 0.92, 0.7);   // warm, under the bloom gate

  const fohGroup = new THREE.Group(); fohGroup.name = 'fohRiser';
  const towersGroup = new THREE.Group(); towersGroup.name = 'delayTowers';
  const wingsGroup = new THREE.Group(); wingsGroup.name = 'stageWings';
  const paGroup = new THREE.Group(); paGroup.name = 'stagePA';
  const risersGroup = new THREE.Group(); risersGroup.name = 'bandRisers';
  root.add(fohGroup, towersGroup, wingsGroup, paGroup, risersGroup);

  // ===============================================================================
  // FOH: a scaffold riser in the pen, desks up on it, skirted, railed, roofed
  // ===============================================================================
  if (FOH_OK) {
    const R = FOH_RISER, h = R.h;
    const w = R.x1 - R.x0, dz = R.z1 - R.z0, cx = (R.x0 + R.x1) / 2;
    const steel = [], black = [], deck = [], canvas = [];
    deck.push(box(w, 0.1, dz, cx, h - 0.05, 0));
    // black skirting round the riser, the stair opening left in the back
    black.push(box(w, h - 0.1, 0.03, cx, (h - 0.1) / 2, R.z0));
    black.push(box(w, h - 0.1, 0.03, cx, (h - 0.1) / 2, R.z1));
    black.push(box(0.03, h - 0.1, dz, R.x0, (h - 0.1) / 2, 0));
    for (const sd of [-1, 1]) {
      const a = R.stairHW, b = R.z1;
      black.push(box(0.03, h - 0.1, b - a, R.x1, (h - 0.1) / 2, sd * (a + b) / 2));
    }
    // the stair off the back: three treads down to the floor
    const steps = 3, run = R.stairX1 - R.x1;
    for (let i = 0; i < steps; i++) {
      const top = (h * (steps - i)) / (steps + 1);
      deck.push(box(run / steps + 0.02, top, R.stairHW * 2, R.x1 + (i + 0.5) * (run / steps), top / 2, 0));
    }
    // rails down both sides and across the back (the stage side stays open over the desks)
    const railY = h + 1.0;
    const post = (x, z) => steel.push(tube(x, h, z, x, railY, z, 0.025));
    for (const z of [R.z0, R.z1]) {
      for (let x = R.x0; x <= R.x1 + 0.01; x += w / 3) post(x, z);
      steel.push(tube(R.x0, railY, z, R.x1, railY, z, 0.028), tube(R.x0, h + 0.5, z, R.x1, h + 0.5, z, 0.02));
    }
    for (const sd of [-1, 1]) {
      post(R.x1, sd * R.stairHW);
      steel.push(tube(R.x1, railY, sd * R.stairHW, R.x1, railY, sd * R.z1, 0.028));
      // stair handrails
      steel.push(tube(R.x1, railY, sd * R.stairHW, R.stairX1, 1.0, sd * R.stairHW, 0.025));
      steel.push(tube(R.stairX1, 0, sd * R.stairHW, R.stairX1, 1.0, sd * R.stairHW, 0.025));
    }
    // the tent: six scaffold uprights to the eaves, a pitched roof, the back
    // and sides closed above the rails, the stage side open
    const ex0 = R.x0 - 0.35, ex1 = R.x1 + 0.35, ez = R.z1 + 0.35;
    const eave = h + 3.1, ridge = eave + 0.95;
    for (const x of [R.x0 + 0.05, cx, R.x1 - 0.05]) {
      for (const z of [R.z0 + 0.05, R.z1 - 0.05]) steel.push(tube(x, h, z, x, eave, z, 0.04, 6));
    }
    for (const z of [-ez + 0.3, ez - 0.3]) steel.push(tube(ex0, eave, z, ex1, eave, z, 0.035));
    for (const x of [R.x0 + 0.05, cx, R.x1 - 0.05]) {
      steel.push(tube(x, eave, -ez + 0.3, x, ridge - 0.05, 0, 0.03), tube(x, eave, ez - 0.3, x, ridge - 0.05, 0, 0.03));
    }
    const slope = Math.hypot(ez, ridge - eave);
    for (const sd of [-1, 1]) {
      const g = new THREE.PlaneGeometry(ex1 - ex0, slope);
      g.rotateX(-Math.PI / 2);
      g.rotateX(sd * Math.atan2(ridge - eave, ez));
      g.translate((ex0 + ex1) / 2, (eave + ridge) / 2, sd * ez / 2);
      canvas.push(g);
    }
    // valance round the eaves
    canvas.push(box(ex1 - ex0, 0.45, 0.02, (ex0 + ex1) / 2, eave - 0.2, ez), box(ex1 - ex0, 0.45, 0.02, (ex0 + ex1) / 2, eave - 0.2, -ez));
    canvas.push(box(0.02, 0.45, 2 * ez, ex0, eave - 0.2, 0), box(0.02, 0.45, 2 * ez, ex1, eave - 0.2, 0));
    // gable ends
    for (const x of [ex0, ex1]) {
      const tri = new THREE.BufferGeometry();
      tri.setAttribute('position', new THREE.Float32BufferAttribute([x, eave, -ez, x, eave, ez, x, ridge, 0], 3));
      tri.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
      tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
      tri.setIndex([0, 1, 2]);                 // mergeGeometries wants all indexed or none
      canvas.push(tri);
    }
    fohGroup.add(merged(steel, scaffMat), merged(black, blackMat), merged(deck, deckMat), merged(canvas, canvasMat));
    // side and back walls above the rails: black scrim, the back split for the stair
    const wallH = eave - (h + 1.05), wy = h + 1.05 + wallH / 2;
    for (const sd of [-1, 1]) fohGroup.add(scrimPanel(scrimMat, w, wallH, cx, wy, sd * (R.z1 + 0.02), 0));
    fohGroup.add(scrimPanel(scrimMat, dz, wallH, R.x1 + 0.02, wy, 0, Math.PI / 2));
    // a warm work light strip under the front eave
    fohGroup.add(merged([box(0.05, 0.04, dz - 0.6, R.x0 - 0.1, eave - 0.48, 0)], workLight));
  }

  // ===============================================================================
  // DELAY TOWERS + their moving heads
  // ===============================================================================
  const nMaxHeads = MAX_TOWERS * HEADS_PER_TOWER;
  const headParts = (() => {
    if (!TOWERS_OK) return null;
    const baseGeo = box(0.52, 0.16, 0.42, 0, 0.08, 0);
    const yokeGeo = BufferGeometryUtils.mergeGeometries([
      box(0.56, 0.08, 0.16, 0, 0.2, 0), box(0.07, 0.5, 0.14, -0.25, 0.43, 0), box(0.07, 0.5, 0.14, 0.25, 0.43, 0),
    ]);
    const headGeo = BufferGeometryUtils.mergeGeometries([
      box(0.34, 0.4, 0.34, 0, -0.02, 0),
      new THREE.CylinderGeometry(0.16, 0.17, 0.08, 14).translate(0, 0.21, 0),
    ]);
    const lensGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.02, 16).translate(0, 0.26, 0);
    // the beam: a cone with its apex at the origin running down local -y,
    // bright at the lens and fading to nothing (vertex colour), additive
    const coneGeo = new THREE.CylinderGeometry(0.05, 1, 1, 18, 1, true).translate(0, -0.5, 0);
    {
      const pos = coneGeo.attributes.position, col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) { const c = pos.getY(i) > -0.5 ? 0.9 : 0; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = c; }
      coneGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    const headMat = new THREE.MeshLambertMaterial({ color: 0x17181c });
    const mk = (geo, mat) => {
      const m = new THREE.InstancedMesh(geo, mat, nMaxHeads);
      m.count = 0;
      m.frustumCulled = false;
      return m;
    };
    const bases = mk(baseGeo, headMat), yokes = mk(yokeGeo, headMat), heads = mk(headGeo, headMat);
    const lens = mk(lensGeo, new THREE.MeshBasicMaterial({ toneMapped: false }));
    lens.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nMaxHeads * 3), 3);
    const beams = mk(coneGeo, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false,
    }));
    beams.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nMaxHeads * 3), 3);
    beams.renderOrder = 2;
    return { bases, yokes, heads, lens, beams };
  })();
  if (headParts) towersGroup.add(headParts.bases, headParts.yokes, headParts.heads, headParts.lens, headParts.beams);
  const towerHW = new THREE.Group();            // the steel, rebuilt when the towers move
  towersGroup.add(towerHW);
  // per head: where it stands, its tower, its place in the row, where it points now
  let heads = [];
  let towerSpots = [];
  let towersKey = '';

  function buildTowers(spots) {
    disposeGroup(towerHW);
    towerSpots = spots.map((t) => ({ x: t.x, z: t.z, top: t.h + 0.25, pair: t.pair, side: t.side }));
    heads = [];
    if (!spots.length) { if (headParts) for (const k in headParts) headParts[k].count = 0; return; }
    const steel = [], scaff = [], dark = [], ballast = [];
    const kit = speakerKit();
    const D = 3.6;                               // top deck, square
    for (const t of spots) {
      const { x, z, h } = t;
      // ballast and base frame, then the mast: 1.6 m heavy lattice
      ballast.push(box(3.0, 0.5, 3.0, x, 0.25, z));
      steel.push(box(2.3, 0.22, 2.3, x, 0.61, z));
      const mast = boxTruss(h - 0.72, 1.6, 1.6, 1.5);
      mast.rotateZ(Math.PI / 2);
      mast.translate(x, 0.72 + (h - 0.72) / 2, z);
      steel.push(mast);
      // the top deck, toe boards and a rail round it
      steel.push(box(D, 0.18, D, x, h + 0.09, z));
      for (const sd of [-1, 1]) {
        dark.push(box(D, 0.15, 0.03, x, h + 0.25, z + sd * D / 2), box(0.03, 0.15, D, x + sd * D / 2, h + 0.25, z));
      }
      const ry = h + 1.15;
      for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
        scaff.push(tube(x + ax * D / 2, ry, z + az * D / 2, x + bx * D / 2, ry, z + bz * D / 2, 0.03));
        scaff.push(tube(x + ax * D / 2, h + 0.6, z + az * D / 2, x + bx * D / 2, h + 0.6, z + bz * D / 2, 0.022));
        scaff.push(tube(x + ax * D / 2, h + 0.18, z + az * D / 2, x + ax * D / 2, ry, z + az * D / 2, 0.03));
      }
      // knee braces from the mast out to the deck corners
      for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        steel.push(tube(x + ax * 0.8, h - 2.4, z + az * 0.8, x + ax * (D / 2 - 0.2), h, z + az * (D / 2 - 0.2), 0.04));
      }
      // a ladder up the stage-side face
      const lx = x - 0.86;
      for (const lz of [z - 0.25, z + 0.25]) scaff.push(tube(lx, 0.7, lz, lx, h + 0.1, lz, 0.022));
      for (let y = 1.0; y < h; y += 0.3) scaff.push(tube(lx, y, z - 0.25, lx, y, z + 0.25, 0.016, 4));
      // the delay hang on an outrigger off the back face, facing away from the
      // stage at the crowd behind: a gentle J of eight
      const ox0 = x + 0.8, ox1 = x + 2.7;
      const arm = boxTruss(ox1 - ox0, 0.4, 0.6, 0.9);
      arm.translate((ox0 + ox1) / 2, h - 0.3, z);
      steel.push(arm);
      kit.hang(x + 2.25, z, h - 1.15, 8, 1.0, 0.34, 0.62, [2, 3, 4, 5.5, 7, 9, 11.5, 14], 0, h - 0.5);
      // crowd barrier round the base: posts, rails and a footing each side
      const bh = DELAY_TOWER_CLEAR - 0.6;
      for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
        const x0 = x + ax * bh, z0 = z + az * bh, x1 = x + bx * bh, z1 = z + bz * bh;
        steel.push(tube(x0, 1.1, z0, x1, 1.1, z1, 0.03), tube(x0, 0.56, z0, x1, 0.56, z1, 0.02), tube(x0, 0.06, z0, x1, 0.06, z1, 0.03));
        for (let k = 0; k <= 4; k++) {
          const px = x0 + ((x1 - x0) * k) / 5, pz = z0 + ((z1 - z0) * k) / 5;
          steel.push(tube(px, 0, pz, px, 1.1, pz, 0.025));
        }
      }
      // six heads standing on the deck: two rows of three, the front row
      // (away from the stage) right at the rail
      for (let k = 0; k < HEADS_PER_TOWER; k++) {
        const row = Math.floor(k / 3), col = k % 3;
        heads.push({
          px: x + (row ? 1.15 : -0.95), py: h + 0.18, pz: z + (col - 1) * 1.15,
          tower: t, side: t.side, pair: t.pair, k, spread: (col - 1) + (row ? 0.5 : -0.5) * 0.4,
          dir: new THREE.Vector3(1, 1, 0).normalize(),
        });
      }
    }
    towerHW.add(merged(steel, steelMat), merged(scaff, scaffMat), merged(dark, blackMat), merged(ballast, ballastMat));
    if (kit.shells.length) towerHW.add(merged(kit.shells, cabMat), merged(kit.faces, grilleMat));
    if (kit.steel.length) towerHW.add(merged(kit.steel, steelMat));
    // the heads' fixed bases
    if (headParts) {
      const m = new THREE.Matrix4();
      heads.forEach((hd, i) => { m.makeTranslation(hd.px, hd.py, hd.pz); headParts.bases.setMatrixAt(i, m); });
      for (const k in headParts) headParts[k].count = heads.length;
      headParts.bases.instanceMatrix.needsUpdate = true;
      // dark until the rig says otherwise
      headParts.beams.count = 0;
      aimHeads(0, null, true);
    }
  }

  // --- what the heads play: the stage rig's state, read live -----------------------
  const getFX = () => {
    try { return opts.getRigFX ? opts.getRigFX() : (opts.rigFX || null); } catch (_) { return null; }   // (rigFX is built after us)
  };
  // the level the rig's own moving heads are at: its beams, and its spots at half
  function rigLevel(fx) {
    const P = fx && fx.patch;
    if (!P || !P.length) return 0;
    const groups = fx.fixGroups || {}, gain = fx.gain || {};
    let beam = 0, spot = 0;
    for (let i = 0; i < P.length; i++) {
      const f = P[i];
      const gl = groups[f.grp] ? groups[f.grp].level : 1;
      if (f.kind === 'beam') beam = Math.max(beam, (f.dim || 0) * gl);
      else if (f.kind === 'spot') spot = Math.max(spot, (f.dim || 0) * gl);
    }
    const lv = Math.max(beam * (gain.beam ?? 1), 0.5 * spot * (gain.spot ?? 1));
    return lv * (fx.master ?? 1) * (fx.grand ?? 1);
  }
  // Where a head points for the rig's behaviour: an azimuth from +x (out over
  // the crowd, away from the stage; positive towards +z) and an elevation.
  // Azimuth is clamped to +-75 degrees, so no beam ever turns back at the stage.
  const tmpDir = new THREE.Vector3();
  function aimDir(hd, beh, T, i, n, out) {
    const sd = hd.side, sp = hd.spread, ph = (i / Math.max(1, n)) * TAU;
    let az, el;
    switch (beh) {
      case 'park': az = sd * 0.35 + sp * 0.16; el = 0.95; break;
      case 'fan': az = sp * 0.85 + sd * 0.25; el = 0.6 + 0.06 * Math.sin(T * 0.8); break;
      case 'slowfan': az = sp * 0.7 + sd * 0.25 + 0.1 * Math.sin(T * 0.25); el = 0.72 + 0.12 * Math.sin(T * 0.2); break;
      case 'ballyhoo': az = sd * 0.3 + 0.6 * Math.sin(T * 1.3 + i * 1.7); el = 0.8 + 0.38 * Math.cos(T * 1.3 * (i % 2 ? 1 : -1) + i * 1.7); break;
      case 'crossbeams': az = -sd * (0.55 + 0.22 * Math.sin(T * 1.1)) + sp * 0.08; el = 0.45 + 0.1 * Math.sin(T * 0.9 + i); break;
      case 'tiltwave': az = sd * 0.25 + sp * 0.35; el = 0.25 + 1.0 * (0.5 + 0.5 * Math.sin(T * 1.6 - (hd.k / HEADS_PER_TOWER + hd.pair * 0.5) * TAU)); break;
      case 'circles': az = sd * 0.25 + sp * 0.3 + 0.18 * Math.cos(T * 1.6 + ph); el = 0.8 + 0.18 * Math.sin(T * 1.6 + ph); break;
      case 'figure8': az = sd * 0.2 + 0.5 * Math.sin(T * 0.8 + ph * 0.3); el = 0.75 + 0.2 * Math.sin(2 * (T * 0.8 + ph * 0.3)); break;
      case 'converge': {
        // every head on every tower meets at one point in the air over the crowd
        const cx = hd.tower.x + 26 + 6 * Math.sin(T * 0.6), cy = 42, cz = 10 * Math.sin(T * 0.45);
        out.set(cx - hd.px, cy - hd.py, cz - hd.pz).normalize();
        return out;
      }
      case 'skyward': az = sd * 0.08 + sp * 0.05 + 0.03 * Math.sin(T * 0.5 + ph); el = 1.45; break;
      case 'snake': az = sd * 0.15 + 0.55 * Math.sin(T * 1.2 - (i / n) * 8); el = 0.7 + 0.2 * Math.cos(T * 0.6 - (i / n) * 4); break;
      case 'stands': az = sd * (0.62 + 0.38 * Math.sin(T * 0.3 + ph)); el = 0.24 + 0.06 * Math.sin(T * 0.4 + ph); break;
      case 'flicker': {
        const k = Math.floor(T * 2.5 + i * 0.37);
        az = (rnd01(k * 7.1 + i) - 0.5) * 1.6 + sd * 0.2; el = 0.35 + rnd01(k * 3.3 + i * 1.7) * 0.9;
        break;
      }
      case 'sweep':
      default: az = sd * 0.3 + 0.55 * Math.sin(T * 0.5 + i * 0.35); el = 0.75 + 0.25 * Math.sin(T * 0.35 + i * 0.6); break;
    }
    az = Math.max(-1.31, Math.min(1.31, az));
    el = Math.max(0.12, Math.min(1.5, el));
    const ce = Math.cos(el);
    return out.set(ce * Math.cos(az), Math.sin(el), ce * Math.sin(az));
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qy = new THREE.Quaternion();
  const v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const colA = new THREE.Color(), colB = new THREE.Color(), col = new THREE.Color(), tmp = new THREE.Color();
  let clock = 0, frame = 0;
  const BEAM_LEN = 72, BEAM_R = 0.034;

  function aimHeads(dt, fx, snap = false) {
    if (!headParts || !heads.length) return;
    const n = heads.length;
    const beh = (fx && fx.behaviour) || 'park';
    const level = fx ? rigLevel(fx) : 0;
    const strobe = !!(fx && fx.strobeOn);
    const rainbow = !!(fx && (fx.look === 'full' || fx.stripMode === 'rainbow'));
    const haze = fx ? Math.max(0.3, Math.min(1.6, (fx.haze ?? 1) * (fx.roomHaze ?? 1))) : 1;
    if (fx && fx.colorA) colA.copy(fx.colorA); else colA.setRGB(1, 1, 1);
    if (fx && fx.colorB) colB.copy(fx.colorB); else colB.copy(colA);
    const flash = frame % 7 < 3;
    const follow = snap ? 1 : 1 - Math.exp(-dt * (beh === 'flicker' ? 16 : 5));
    let lit = level > 0.01;
    let k = level;
    if (strobe && lit) k = flash ? 1.6 : 0.03;
    const { yokes, heads: hm, lens, beams } = headParts;
    for (let i = 0; i < n; i++) {
      const hd = heads[i];
      aimDir(hd, beh, clock, i, n, tmpDir);
      hd.dir.lerp(tmpDir, follow).normalize();
      const d = hd.dir;
      // yoke pans about y; the head tilts inside it along the aim
      qy.setFromAxisAngle(UP, Math.atan2(d.x, d.z));
      m4.compose(v3.set(hd.px, hd.py, hd.pz), qy, one);
      yokes.setMatrixAt(i, m4);
      q.setFromUnitVectors(UP, d);
      v3.set(hd.px, hd.py + 0.45, hd.pz);
      m4.compose(v3, q, one);
      hm.setMatrixAt(i, m4);
      lens.setMatrixAt(i, m4);
      if (rainbow) col.setHSL((i / n + clock * 0.12) % 1, 1, 0.55); else col.copy(i % 2 ? colB : colA);
      lens.setColorAt(i, tmp.copy(col).multiplyScalar(lit ? 2 + k : 0.03));
      // the beam leaves the lens along the aim
      q.setFromUnitVectors(DOWN, d);
      v3.set(hd.px + d.x * 0.27, hd.py + 0.45 + d.y * 0.27, hd.pz + d.z * 0.27);
      const r = BEAM_LEN * BEAM_R;
      m4.compose(v3, q, s3.set(r, BEAM_LEN, r));
      beams.setMatrixAt(i, m4);
      beams.setColorAt(i, tmp.copy(col).multiplyScalar(lit ? k * (0.55 + 0.45 * haze) : 0));
    }
    beams.count = lit ? n : 0;                 // dark rig: not even a draw call
    yokes.instanceMatrix.needsUpdate = true;
    hm.instanceMatrix.needsUpdate = true;
    lens.instanceMatrix.needsUpdate = true;
    lens.instanceColor.needsUpdate = true;
    beams.instanceMatrix.needsUpdate = true;
    beams.instanceColor.needsUpdate = true;
  }

  // ===============================================================================
  // STAGE DRESSING: wings, IMAG, PA, subs, risers, wedges, stairs
  // ===============================================================================
  let layout = null;
  let dressKey = '';
  let paKey = '';

  function buildWings(L) {
    disposeGroup(wingsGroup);
    const W = L.wing, scaff = [], black = [], steel = [], deck = [];
    const y0 = MAIN_H, y1 = W.h;
    for (const sd of [-1, 1]) {
      const za = sd * W.z0, zb = sd * W.z1;
      const zs = [], xs = [];
      const nz = Math.max(2, Math.round((W.z1 - W.z0) / 2.6)), nx = Math.max(2, Math.round((W.x1 - W.x0) / 2.5));
      for (let i = 0; i <= nz; i++) zs.push(za + ((zb - za) * i) / nz);
      for (let i = 0; i <= nx; i++) xs.push(W.x0 + ((W.x1 - W.x0) * i) / nx);
      // standards round the perimeter, ledgers every 2 m, a brace up each face
      const perim = [];
      for (const z of zs) perim.push([W.x0, z], [W.x1, z]);
      for (const x of xs.slice(1, -1)) perim.push([x, za], [x, zb]);
      for (const [x, z] of perim) scaff.push(tube(x, y0, z, x, y1, z, 0.03, 5));
      for (let y = y0 + 2; y <= y1 + 0.01; y += 2) {
        for (const x of [W.x0, W.x1]) scaff.push(tube(x, y, za, x, y, zb, 0.026, 4));
        for (const z of [za, zb]) scaff.push(tube(W.x0, y, z, W.x1, y, z, 0.026, 4));
      }
      for (let y = y0; y < y1 - 2; y += 4) {
        for (const x of [W.x0, W.x1]) scaff.push(tube(x, y, za, x, y + 4, zb, 0.022, 4));
        for (const z of [za, zb]) scaff.push(tube(W.x0, y + 4, z, W.x1, y, z, 0.022, 4));
      }
      // working decks inside every 8 m, and a cap truss along the top front and inner edges
      for (let y = y0 + 8; y < y1 - 1; y += 8) deck.push(box(W.x1 - W.x0, 0.06, W.z1 - W.z0, (W.x0 + W.x1) / 2, y, (za + zb) / 2));
      const capF = boxTruss(W.z1 - W.z0, 0.6, 1.0); capF.rotateY(Math.PI / 2); capF.translate(W.x1, y1 + 0.3, (za + zb) / 2); steel.push(capF);
      const capI = boxTruss(W.x1 - W.x0, 0.6, 1.0); capI.translate((W.x0 + W.x1) / 2, y1 + 0.3, za); steel.push(capI);
      // black scrim: the audience face, the outer side, and the inner side
      // running all the way back to the upstage scrim, so the stage is a
      // black box and the wings' insides never show
      const fh = y1 - y0;
      wingsGroup.add(scrimPanel(scrimMat, W.z1 - W.z0, fh, W.x1 + 0.1, (y0 + y1) / 2, (za + zb) / 2, Math.PI / 2));
      wingsGroup.add(scrimPanel(scrimMat, W.x1 - W.x0, fh, (W.x0 + W.x1) / 2, (y0 + y1) / 2, zb + sd * 0.1, 0));
      const mx0 = L.scrimX;
      wingsGroup.add(scrimPanel(scrimMat, W.x1 - mx0, fh, (W.x1 + mx0) / 2, (y0 + y1) / 2, za - sd * 0.1, 0));
      // the IMAG screen on the wing's face, 16:9, in a black frame, top in line
      // with the main screen's top edge give or take
      const sw = W.z1 - W.z0 - 1.2, sh = sw * 9 / 16;
      const sy = Math.min(y1 - sh / 2 - 2.5, 9.4 + sh / 2);
      black.push(box(0.3, sh + 0.5, sw + 0.5, W.x1 + 0.25, sy, (za + zb) / 2));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), screenMat);
      face.position.set(W.x1 + 0.42, sy, (za + zb) / 2);
      face.rotation.y = Math.PI / 2;
      face.name = 'imag';
      wingsGroup.add(face);
    }
    // stairs off each side: treads, stringers, handrails
    for (const s of L.stairs) {
      const n = 11, run = s.z1 - s.z0, td = run / n;
      for (let i = 0; i < n; i++) {
        const top = (MAIN_H * (n - i)) / (n + 1);
        deck.push(box(s.x1 - s.x0, 0.06, td + 0.02, (s.x0 + s.x1) / 2, top - 0.03, s.s * (s.z0 + (i + 0.5) * td)));
      }
      for (const x of [s.x0, s.x1]) {
        steel.push(tube(x, MAIN_H, s.s * s.z0, x, 0, s.s * s.z1, 0.05));
        steel.push(tube(x, MAIN_H + 1.0, s.s * s.z0, x, 1.0, s.s * s.z1, 0.025));
        steel.push(tube(x, 0, s.s * s.z1, x, 1.0, s.s * s.z1, 0.025));
      }
    }
    if (scaff.length) wingsGroup.add(merged(scaff, scaffMat));
    if (steel.length) wingsGroup.add(merged(steel, steelMat));
    if (black.length) wingsGroup.add(merged(black, blackMat));
    if (deck.length) wingsGroup.add(merged(deck, deckMat));
  }

  function buildPA(L, style) {
    disposeGroup(paGroup);
    if (style === 'none') return;
    const kit = speakerKit();
    const W = L.wing, F = L.F;
    const MAIN_J = [0, 0.5, 1, 1.5, 2, 3, 4, 5.5, 7, 9, 11, 13.5, 16, 19, 22, 26];
    const SIDE_J = [3, 4, 5.5, 7, 9, 11, 14, 17, 20, 24, 28, 32];
    const steel = [];
    for (const sd of [-1, 1]) {
      const zm = sd * (W.z0 + 1.1), zo = sd * (W.z1 - 1.0), xh = W.x1 + 0.95;
      if (style === 'flown') {
        // outriggers off the wing top, the mains just outboard of the roof
        // towers, the side hangs at the wings' outer edge splayed outward
        const top = W.h - 1.6, pick = W.h + 0.3;
        for (const z of [zm, zo]) {
          const arm = boxTruss(1.9, 0.4, 0.6, 0.9);
          arm.translate(W.x1 + 0.85, pick, z);
          steel.push(arm);
        }
        kit.hang(xh, zm, top, 16, 1.12, 0.36, 0.7, MAIN_J, 0, pick);
        kit.hang(xh, zo, top - 1.0, 12, 0.9, 0.3, 0.55, SIDE_J, -sd * 0.42, pick);
      } else {
        // ground-stacked on the deck in front of each wing: subs, then the array
        kit.subs(W.x1 + 0.6, zm, MAIN_H, 3);
        kit.stack(W.x1 + 0.6, zm, MAIN_H + 3 * 0.58 + 0.05, 8, 1.12, 0.36, 0.7, [0, 1, 2, 3.5, 5, 7, 9, 12], 0);
        kit.subs(W.x1 + 0.6, zo, MAIN_H, 2);
        kit.stack(W.x1 + 0.6, zo, MAIN_H + 2 * 0.58 + 0.05, 6, 0.9, 0.3, 0.55, [2, 3, 5, 7, 9, 12], -sd * 0.42);
      }
    }
    // the sub line in the pit under the lip, cardioid pairs, with front fills
    // on every other stack nosed up at the first rows
    const zs = [4.6, 8.6, 12.6, 16.6, 20.6].filter((z) => z < L.roofHW);
    zs.forEach((z, i) => {
      for (const sd of [-1, 1]) {
        kit.subs(F + 0.48, sd * z, 0, 2);
        if (i % 2 === 0) kit.stack(F + 0.42, sd * z, 1.16, 1, 0.5, 0.26, 0.36, [12], 0);
      }
    });
    paGroup.add(merged(kit.shells, cabMat), merged(kit.faces, grilleMat));
    if (kit.steel.length || steel.length) paGroup.add(merged([...kit.steel, ...steel], steelMat));
  }

  function buildRisers(L) {
    disposeGroup(risersGroup);
    const deck = [], black = [], hw = [], chrome = [], kit = speakerKit();
    for (const r of L.risers) {
      deck.push(box(r.w, 0.06, r.d, r.x, MAIN_H + r.h - 0.03, r.z));
      black.push(box(r.w - 0.02, r.h - 0.06, r.d - 0.02, r.x, MAIN_H + (r.h - 0.06) / 2, r.z));
    }
    // a kit on the stage-left riser, keys on the other, all facing the crowd
    const [dr, kr] = L.risers[0].z < 0 ? L.risers : [L.risers[1], L.risers[0]];
    const y = MAIN_H + dr.h;
    {
      const x = dr.x, z = dr.z;
      hw.push(new THREE.CylinderGeometry(0.29, 0.29, 0.42, 18).rotateX(Math.PI / 2).rotateY(Math.PI / 2).translate(x + 0.55, y + 0.29, z));   // kick
      for (const [dx, dz, r, hgt, yy] of [[0.35, -0.32, 0.17, 0.2, 0.62], [0.35, 0.28, 0.19, 0.22, 0.64], [0.0, 0.5, 0.22, 0.4, 0.42], [0.25, -0.62, 0.18, 0.14, 0.6]]) {
        hw.push(new THREE.CylinderGeometry(r, r, hgt, 16).translate(x + dx, y + yy, z + dz));
      }
      for (const [dx, dz, hgt] of [[0.55, -0.85, 1.25], [0.6, 0.75, 1.4], [0.05, -0.95, 0.9], [-0.15, 0.95, 1.15]]) {
        chrome.push(tube(x + dx, y, z + dz, x + dx, y + hgt, z + dz, 0.015, 5));
        chrome.push(new THREE.CylinderGeometry(0.22, 0.24, 0.012, 18).translate(x + dx, y + hgt, z + dz));
      }
      hw.push(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12).translate(x - 0.45, y + 0.5, z));   // throne
      chrome.push(tube(x - 0.45, y, z, x - 0.45, y + 0.48, z, 0.02, 5));
    }
    {
      const x = kr.x, z = kr.z;
      for (const [dz, yy] of [[-0.35, 0.82], [0.35, 1.02]]) {
        hw.push(box(0.36, 0.08, 1.25, x + 0.1, y + yy, z + dz));
        for (const s of [-1, 1]) chrome.push(tube(x + 0.1 + s * 0.22, y, z + dz - 0.45, x + 0.1 - s * 0.22, y + yy - 0.04, z + dz - 0.45, 0.015, 4));
      }
    }
    // wedges along the lip either side of the runway: faces turned back at
    // the band (yaw 180) and tipped up 35 degrees
    for (const z of [-8.6, -4.6, 4.6, 8.6]) {
      kit.cabinet(L.F - 0.75, MAIN_H + 0.22, z, 0.62, 0.36, 0.5, -0.6, Math.PI, false);
    }
    risersGroup.add(merged(deck, deckMat), merged(black, blackMat), merged(hw, cabMat), merged(chrome, chromeMat));
    risersGroup.add(merged(kit.shells, cabMat), merged(kit.faces, grilleMat));
  }

  // --- refit to the stage just built ------------------------------------------------
  function applyVis() {
    const far = !!layout;
    root.visible = st.visible;
    fohGroup.visible = FOH_OK && st.fohTent && far;
    towersGroup.visible = TOWERS_OK && st.towers > 0 && towerSpots.length > 0;
    wingsGroup.visible = OPEN_STAGE && st.wings && far;
    paGroup.visible = OPEN_STAGE && st.pa !== 'none' && far;
    risersGroup.visible = OPEN_STAGE && st.risers && far;
    // what the walker can climb is what is standing
    const on = st.visible && far;
    FOH_RISER.on = on && fohGroup.visible;
    STAGE_DRESS.wings = on && wingsGroup.visible;
    STAGE_DRESS.risers = on && risersGroup.visible;
    // the riser follows the pen when it steps back (stage.js fohCenterX)
    fohGroup.position.x = FOH_RISER.dx;
    syncDesks();
  }
  // the desks: against the pen's stage-side barrier, up on the riser when it is
  // standing. main.js places them once at boot; this keeps them with the pen.
  function syncDesks() {
    const fg = FOH_OK && opts.foh && opts.foh.group;   // indoors the desks stay where main.js put them
    if (!fg) return;
    const x = FOH_CX - 1.7 + FOH_RISER.dx, y = FOH_RISER.on ? FOH_RISER.h : 0;
    if (fg.position.x !== x || fg.position.y !== y) { fg.position.x = x; fg.position.y = y; }
  }
  function refit(cfg) {
    if (!OPEN_STAGE && !FOH_OK) return;
    layout = stageDressLayout(cfg);
    if (layout) {
      const k = `${layout.F.toFixed(2)}|${layout.deckHW}|${layout.roofHW}`;
      if (k !== dressKey) {
        dressKey = k;
        buildWings(layout);
        buildRisers(layout);
        paKey = '';
      }
      const pk = `${dressKey}|${st.pa}`;
      if (pk !== paKey) { paKey = pk; buildPA(layout, st.pa); }
    }
    if (TOWERS_OK) {
      const spots = delayTowerSpots(cfg, st.towers);
      const tk = spots.map((t) => `${t.x.toFixed(2)},${t.z}`).join(';');
      if (tk !== towersKey) { towersKey = tk; buildTowers(spots); }
    }
    applyVis();
  }
  refit(currentStageCfg());
  onStageBuilt((cfg) => refit(cfg));

  // the concert floor keeps clear of the towers: it has to be re-laid when they change
  const relay = () => { try { opts.rebuildFloor?.(); } catch (e) { console.warn('production: floor rebuild failed', e); } };

  const api = {
    group: root,
    available,
    // per frame: the tower heads follow the rig
    update(dt = 1 / 60) {
      if (FOH_OK) syncDesks();
      if (!root.visible || !towersGroup.visible || !heads.length) return;
      const fx = getFX();
      clock += dt * (fx?.rate ?? 1);
      frame++;
      aimHeads(dt, fx);
    },
    // concert mode: shown; anything else hidden. A middle stage hides it too
    // (the stage hook knows the deck), so callers only pass the mode.
    setVisible(on) { st.visible = !!on; applyVis(); },
    get visible() { return root.visible; },
    setDelayTowers(n) {
      if (!TOWERS_OK) return;
      const want = n >= 4 ? 4 : n >= 1 ? 2 : 0;
      if (want === st.towers) return;
      st.towers = want;
      DELAY_TOWERS.count = want;
      towersKey = '';
      refit(currentStageCfg());
      relay();
    },
    get delayTowers() { return st.towers; },
    setFOHTent(on) { if (!FOH_OK) return; st.fohTent = !!on; applyVis(); },
    get fohTent() { return FOH_OK && st.fohTent; },
    setStageWings(on) { if (!OPEN_STAGE) return; st.wings = !!on; applyVis(); },
    get stageWings() { return OPEN_STAGE && st.wings; },
    setPAStyle(s) {
      if (!OPEN_STAGE || !PA_STYLES.includes(s) || s === st.pa) return;
      st.pa = s;
      paKey = '';
      refit(currentStageCfg());
    },
    get paStyle() { return st.pa; },
    paStyles: OPEN_STAGE ? [...PA_STYLES] : ['none'],
    setBandRisers(on) { if (!OPEN_STAGE) return; st.risers = !!on; applyVis(); },
    get bandRisers() { return OPEN_STAGE && st.risers; },
    // where the towers stand now (tops are where their heads are)
    get towers() { return towerSpots.map((t) => ({ ...t })); },
    // everything a saved show or the Production tab needs, in one go
    get state() { return { delayTowers: st.towers, fohTent: api.fohTent, stageWings: api.stageWings, paStyle: st.pa, bandRisers: api.bandRisers }; },
    setState(s = {}) {
      if (s.fohTent != null) api.setFOHTent(s.fohTent);
      if (s.stageWings != null) api.setStageWings(s.stageWings);
      if (s.bandRisers != null) api.setBandRisers(s.bandRisers);
      if (s.paStyle != null) api.setPAStyle(s.paStyle);
      if (s.delayTowers != null) api.setDelayTowers(s.delayTowers);
    },
  };
  return api;
}

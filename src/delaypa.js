// The arena's delay PA: in a concert the room has a second pair of hangs halfway down the
// floor (audiofx.js plays the song from them too, delayed, for the back of the house). Two
// modest J-arrays flown from the house steel, facing the back, right where that sound comes
// from (SPEC.audio rearX / rearY / rearZ). The stadium and festival have delay towers of their own.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { makeSpeakerGrille } from './textures.js';
import { SPEC, VENUE } from './venue.js';

export function buildDelayPA(scene) {
  const group = new THREE.Group();
  group.name = 'delayPA';
  group.visible = false;   // concerts only (main.js)
  scene.add(group);
  if (VENUE !== 'arena') return { group };
  const { rearX, rearY, rearZ } = SPEC.audio;
  const roofY = SPEC.roofY;
  const shells = [], faces = [], steel = [];
  const W = 1.0, H = 0.34, D = 0.62, GAP = 0.02, BOXES = 9;
  // flown high, so the whole hang points down at the back of the room: it starts nosed down
  // and curls further into a J, the bottom boxes covering the seats nearest under it
  const SPLAY = [9, 11, 13.5, 16.5, 20, 24, 28.5, 33.5, 39];
  const steelBetween = (ax, ay, az, bx, by, bz, r) => {
    const dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
    const g = new THREE.CylinderGeometry(r, r, len, 5);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
    g.translate(ax, ay, az);
    return g;
  };
  for (const side of [-1, 1]) {
    const x = rearX, z = side * rearZ;
    const top = rearY + (BOXES * (H + GAP)) / 2;   // the hang centred on where its sound comes from
    // the bumper on top, two picks with steel up to the house grid, and a pullback that tilts it
    const bh = 0.2, by = top + GAP + bh / 2;
    const frame = new THREE.BoxGeometry(D + 0.3, bh, W + 0.3);
    frame.translate(x, by, z);
    steel.push(frame);
    for (const q of [-1, 1]) {
      const lz = z + q * (W / 2 - 0.1);
      const lug = new THREE.BoxGeometry(0.09, 0.22, 0.09);
      lug.translate(x, by + bh / 2 + 0.11, lz);
      steel.push(lug, steelBetween(x, by + bh / 2 + 0.2, lz, x, roofY, lz, 0.022));
    }
    steel.push(steelBetween(x - D / 2 - 0.15, by, z, x - 4.5, roofY, z, 0.015));
    // the boxes, each hinged off the bottom-front edge of the one above, curving into a J
    let px = x + D / 2, py = top;
    for (let i = 0; i < BOXES; i++) {
      const t = (SPLAY[i] * Math.PI) / 180, ct = Math.cos(t), st = Math.sin(t);
      const cx = px - ct * D / 2 - st * H / 2, cy = py + st * D / 2 - ct * H / 2;
      const shell = new THREE.BoxGeometry(D, H, W);
      shell.rotateZ(-t); shell.translate(cx, cy, z);
      shells.push(shell);
      const face = new THREE.PlaneGeometry(W - 0.1, H - 0.05);
      face.rotateY(Math.PI / 2); face.translate(D / 2 + 0.012, 0, 0);
      face.rotateZ(-t); face.translate(cx, cy, z);
      faces.push(face);
      px -= st * (H + GAP); py -= ct * (H + GAP);
    }
  }
  const cab = new THREE.MeshStandardMaterial({ color: 0x2a2c32, roughness: 0.55, metalness: 0.35 });   // graphite: the light catches its edges
  const grille = new THREE.MeshLambertMaterial({ map: makeSpeakerGrille(), color: 0xffffff });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.55, metalness: 0.7 });
  group.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(shells), cab));
  group.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(faces), grille));
  group.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(steel), black));
  return { group };
}

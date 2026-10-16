// THE ROOF'S LIGHTS: the arena's real house lights are rows of LED high-bays in the roof steel,
// a grid over the floor and rings over the bowl, all the same neutral white. These are those
// fixtures, glowing up there (the room's actual light comes from the house rig in main.js; these
// are what you see when you look up). set(surface, bowl): how bright each part is, 0..1.
// House lights up: both; a game: the surface bright, the bowl low; a show or a blackout: off.
import * as THREE from 'three';

export function initHouseFixtures(scene, { roofY = 38.5 } = {}) {
  const y = roofY - 1.1;
  const spots = [];   // [x, z, zone] (0 the surface, 1 the bowl)
  for (let x = -30; x <= 30.01; x += 5) for (let z = -12; z <= 12.01; z += 6) {
    if (Math.abs(x) < 9.5 && Math.abs(z) < 7) continue;   // the jumbotron hangs there
    spots.push([x, z, 0]);
  }
  for (const [ra, rb, n] of [[44, 26, 44], [53, 34, 52], [61, 41, 60]]) {
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; spots.push([Math.cos(t) * ra, Math.sin(t) * rb, 1]); }
  }
  const N = spots.length;
  const group = new THREE.Group();
  group.name = 'houseFixtures';
  scene.add(group);
  const housing = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.42, 0.42, 12), new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.6, roughness: 0.45 }), N);
  const lens = new THREE.InstancedMesh(new THREE.CircleGeometry(0.34, 18).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
  lens.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const m = new THREE.Matrix4();
  spots.forEach(([x, z], i) => {
    housing.setMatrixAt(i, m.makeTranslation(x, y, z));
    lens.setMatrixAt(i, m.makeTranslation(x, y - 0.22, z));
  });
  group.add(housing, lens);
  const WHITE = new THREE.Color(1, 0.95, 0.88), c = new THREE.Color();
  return {
    group,
    set(surface, bowl) {
      spots.forEach(([, , zone], i) => {
        const k = zone ? bowl : surface;
        lens.setColorAt(i, c.copy(WHITE).multiplyScalar(k > 0.01 ? 0.25 + 2.6 * k : 0.06));   // off: a dull grey disc
      });
      lens.instanceColor.needsUpdate = true;
    },
  };
}

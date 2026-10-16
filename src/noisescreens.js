// NOISE SCREENS: random, saturated colour noise drawn on the graphics card, for the stage wall
// (768x432) and the round B-stage (384x384). Four pattern families (0 marbled ink, 1 glowing
// cells, 2 flowing bands, 3 kaleidoscope), each with a random seed; a palette of up to four
// colours (crisp at the joins, deep troughs, white peaks) or the rainbow. What drives it:
//   t      the pattern's own time        kick   0..1, the field breathes in, warps and blooms
//   low    0..1, keeps the warp moving    high   0..1, a fine shimmer (grain and glints)
//   glint  0..1, glints flaring          flash  0..1, a white flash
// Auto Show drives it from the music; the Light app's "Colour noise" feed from the stage lights.
import * as THREE from 'three';

export function createNoiseScreens(renderer) {
  const rtWall = new THREE.WebGLRenderTarget(768, 432, { depthBuffer: false });
  const rtRing = new THREE.WebGLRenderTarget(384, 384, { depthBuffer: false });
  const U = {
    uT: { value: 0 }, uTick: { value: 0 }, uKick: { value: 0 }, uLow: { value: 0 }, uHigh: { value: 0 }, uGlint: { value: 0 }, uFlash: { value: 0 },
    uSeed: { value: 0 }, uMode: { value: 0 }, uRound: { value: 0 }, uRes: { value: new THREE.Vector2(768, 432) },
    uPal: { value: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()] }, uPalN: { value: 1 }, uRainbow: { value: 0 }, uHueT: { value: 0 },
  };
  const noiseMat = new THREE.ShaderMaterial({
    uniforms: U, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uT, uTick, uKick, uLow, uHigh, uGlint, uFlash, uSeed, uRound, uPalN, uRainbow, uHueT;
      uniform int uMode;
      uniform vec2 uRes;
      uniform vec3 uPal[4];
      varying vec2 vUv;
      float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
        return v;
      }
      vec3 hueRGB(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      // 0..1 to the picked colours, crisp at the joins; the rainbow: the whole wheel
      vec3 pal(float x) {
        if (uRainbow > 0.5) return pow(hueRGB(x + uHueT), vec3(2.2));
        float s = fract(x) * uPalN, i = floor(s), f = fract(s);
        int a = int(mod(i, uPalN)), b = int(mod(i + 1.0, uPalN));
        vec3 ca = uPal[0], cb = uPal[0];
        for (int k = 0; k < 4; k++) { if (k == a) ca = uPal[k]; if (k == b) cb = uPal[k]; }
        return mix(ca, cb, smoothstep(0.8, 1.0, f));
      }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
        float r = length(p);
        p *= (1.0 - 0.2 * uKick) * (1.5 + 0.5 * sin(uSeed * 1.7));   // the kick: the field breathes in
        vec2 o = vec2(uSeed * 13.1, uSeed * 7.7);
        float t = uT, warp = 2.6 + 2.4 * uLow + 3.0 * uKick;
        float v, sel;
        if (uMode == 0) {   // marbled ink: noise warped by noise warped by noise
          vec2 q = vec2(fbm(p + o + t * 0.15), fbm(p + o + vec2(5.2, 1.3) - t * 0.12));
          vec2 w = vec2(fbm(p + warp * q + vec2(1.7, 9.2) + t * 0.2), fbm(p + warp * q + vec2(8.3, 2.8) - t * 0.17));
          float f = fbm(p + warp * w);
          sel = f * 1.8 + q.x * 0.7 + uSeed;
          v = smoothstep(0.2, 0.85, f + 0.15 * w.y);
        } else if (uMode == 1) {   // glowing cells: each its own colour, seams that flare on the kick
          vec2 g = p * 3.2 + o + vec2(fbm(p * 2.0 + t * 0.2), fbm(p * 2.0 - t * 0.2)) * (0.5 + uLow);
          vec2 ip = floor(g), fp = fract(g), id = ip;
          float d1 = 9.0, d2 = 9.0;
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            vec2 b = vec2(float(x), float(y));
            vec2 pt = 0.5 + 0.45 * sin(t * 0.7 + 6.2831 * vec2(hash(ip + b), hash(ip + b + 17.0)));
            float d = length(b + pt - fp);
            if (d < d1) { d2 = d1; d1 = d; id = ip + b; } else if (d < d2) d2 = d;
          }
          sel = hash(id + floor(uSeed * 10.0));
          float e = d2 - d1;
          v = smoothstep(0.0, 0.3, e) * (0.45 + 0.55 * fbm(g * 0.8 + t * 0.3)) + (1.0 - smoothstep(0.0, 0.05 + 0.08 * uKick, e)) * (0.35 + 1.3 * uKick);
        } else if (uMode == 2) {   // flowing bands: stripes bent by noise, each band its own colour
          float f = fbm(p * 1.3 + o + t * 0.1);
          float s = dot(p, vec2(0.8, 0.5)) * (2.5 + 1.5 * sin(uSeed * 3.0)) + f * warp * 1.4 + t * 0.6;
          sel = floor(s) * 0.37 + uSeed;
          float fs = fract(s);
          v = smoothstep(0.0, 0.1, fs) * smoothstep(1.0, 0.65, fs) * (0.55 + 0.45 * f);
        } else {   // kaleidoscope: noise folded round the middle
          float a = atan(p.y, p.x), seg = 6.2831 / (5.0 + floor(mod(uSeed * 7.0, 5.0)));
          a = abs(mod(a + t * 0.05, seg) - seg * 0.5);
          vec2 kp = vec2(cos(a), sin(a)) * length(p) * 2.0;
          float f = fbm(kp + o + vec2(t * 0.2, -t * 0.15) + fbm(kp * 1.5 - t * 0.1) * warp * 0.6);
          sel = f * 2.0 + length(p) * 0.6 - t * 0.05 + uSeed;
          v = smoothstep(0.18, 0.8, f);
        }
        v = pow(clamp(v, 0.0, 1.2), 1.5);
        vec3 col = pal(sel) * (0.02 + 1.25 * v);                         // deep troughs, full colour
        col = mix(col, vec3(1.0), smoothstep(0.85, 1.1, v) * 0.5);         // white-hot peaks, now and then
        col *= 1.0 + uKick * max(0.0, 1.1 - r * 0.9);                     // the kick: a bloom from the middle
        // the highs: shimmer. A fine grain that twinkles, and glints, thicker with the treble
        vec2 cell = floor(vUv * uRes / 2.0);
        float n1 = hash(cell + vec2(uTick * 0.37, uTick * 0.11));
        col *= 1.0 + (n1 - 0.5) * (0.05 + 0.6 * uHigh);
        float gl = step(1.0 - (0.002 + 0.03 * uHigh * uHigh + 0.06 * uGlint), hash(cell * 1.31 + uTick));
        col += gl * mix(vec3(1.0), pal(hash(cell + 3.1)), step(0.5, hash(cell + 7.7))) * (1.2 + uGlint);
        col = mix(col, vec3(1.0), uFlash * 0.45);                         // a crash
        if (uRound > 0.5) col *= smoothstep(0.52, 0.47, r);               // the B-stage: round
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), noiseMat);
  quad.frustumCulled = false;
  const qScene = new THREE.Scene();
  qScene.add(quad);
  const qCam = new THREE.Camera();
  let hueT = 0, tick = 0;
  return {
    wall: rtWall.texture, b: rtRing.texture,
    // the colours: up to four hex colours, or the rainbow (its hue drifting)
    setPalette(cols, rainbow = false) {
      const n = Math.max(1, Math.min(4, cols.length));
      for (let k = 0; k < 4; k++) U.uPal.value[k].set(cols[k % n]);
      U.uPalN.value = n;
      U.uRainbow.value = rainbow ? 1 : 0;
    },
    render({ t = 0, kick = 0, low = 0, high = 0, glint = 0, flash = 0, seed = 0, mode = 0, hueSpeed = 0.002 } = {}) {
      U.uT.value = t; tick = (tick + 1) % 997; U.uTick.value = tick;
      U.uKick.value = kick; U.uLow.value = low; U.uHigh.value = high; U.uGlint.value = glint; U.uFlash.value = flash;
      U.uSeed.value = seed; U.uMode.value = mode;
      if (U.uRainbow.value) { hueT = (hueT + hueSpeed) % 1; U.uHueT.value = hueT; }
      const prev = renderer.getRenderTarget();
      U.uRound.value = 0; U.uRes.value.set(rtWall.width, rtWall.height);
      renderer.setRenderTarget(rtWall); renderer.render(qScene, qCam);
      U.uRound.value = 1; U.uRes.value.set(rtRing.width, rtRing.height);
      renderer.setRenderTarget(rtRing); renderer.render(qScene, qCam);
      renderer.setRenderTarget(prev);
    },
  };
}

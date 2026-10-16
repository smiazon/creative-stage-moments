// THE MESSAGE SCREEN (the Moments app): big words on the LED wall, the B-stage and the jumbotron.
// GOAL!, HAPPY BIRTHDAY, a countdown: a line of headline (auto-fitted), a smaller line under it,
// in the moment's colours, with a style of its own:
//   flash  the background flashing between the two colours (a goal, a win)
//   pulse  the words beating (make some noise, defense)
//   glow   still and soft, a light sweeping across (an anthem, a first dance, a welcome)
//   count  one huge number, punched in (a countdown)
//   hearts hearts drifting up behind the words (kiss cam, love)
// One canvas, redrawn 30 times a second while shown; nothing runs while it's hidden.
export function createMessageScreen(THREE) {
  const W = 1024, H = 576;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let M = null, t0 = 0, raf = 0, last = 0;
  const FONT = '900 {s}px "Arial Black", "Helvetica Neue", Arial, sans-serif';
  function fit(text, max, maxW) {   // the biggest size that still fits the width
    let s = max;
    g.font = FONT.replace('{s}', s);
    while (s > 20 && g.measureText(text).width > maxW) { s -= 4; g.font = FONT.replace('{s}', s); }
    return s;
  }
  function draw(now) {
    raf = M ? requestAnimationFrame(draw) : 0;
    if (!M || now - last < 33) return;
    last = now;
    const t = (now - t0) / 1000, [a, b] = M.cols;
    // the background
    let bg = '#05060c';
    if (M.style === 'flash') bg = Math.floor(t * 6) % 2 ? a : b;
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (M.style !== 'flash') {
      const gr = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
      gr.addColorStop(0, a); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = M.style === 'glow' ? 0.35 : 0.5; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    }
    if (M.style === 'glow') {   // a soft light sweeping across
      const x = ((t * 0.25) % 1.4 - 0.2) * W, gr = g.createLinearGradient(x - 200, 0, x + 200, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    if (M.style === 'hearts') {
      for (let i = 0; i < 18; i++) {
        const u = ((i * 0.618) % 1), v = 1 - ((t * 0.12 + i * 0.37) % 1.2), x = u * W, y = v * H, s = 16 + (i % 4) * 8;
        g.fillStyle = i % 2 ? a : b; g.globalAlpha = 0.6;
        g.beginPath(); g.moveTo(x, y + s * 0.3); g.bezierCurveTo(x - s, y - s * 0.5, x - s * 0.5, y - s * 1.2, x, y - s * 0.5);
        g.bezierCurveTo(x + s * 0.5, y - s * 1.2, x + s, y - s * 0.5, x, y + s * 0.3); g.fill(); g.globalAlpha = 1;
      }
    }
    // the words
    const main = M.main, sub = M.sub || '';
    const beat = M.style === 'pulse' ? 1 + 0.08 * Math.max(0, Math.sin(t * 9)) : M.style === 'count' ? 1 + 0.6 * Math.exp(-((t % 1) * 7)) : 1;
    const size = fit(main, M.style === 'count' ? 360 : 190, W * 0.88);
    g.save();
    g.translate(W / 2, H * (sub ? 0.46 : 0.52));
    g.scale(beat, beat);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = FONT.replace('{s}', size);
    g.shadowColor = M.style === 'flash' ? 'rgba(0,0,0,0.6)' : a; g.shadowBlur = 40;
    g.fillStyle = M.style === 'flash' ? (bg === a ? b : a) : '#ffffff';
    g.fillText(main, 0, 0);
    g.restore();
    if (sub) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = FONT.replace('{s}', fit(sub, 72, W * 0.8));
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 16;
      g.fillStyle = M.style === 'flash' ? '#ffffff' : b === '#ffffff' ? a : b;
      g.fillText(sub, W / 2, H * 0.8);
      g.shadowBlur = 0;
    }
    tex.needsUpdate = true;
  }
  return {
    tex,
    // up: { main, sub, cols: [a, b], style }
    show(m) { M = { cols: ['#ff1430', '#ffffff'], style: 'flash', ...m }; t0 = performance.now(); last = 0; if (!raf) raf = requestAnimationFrame(draw); },
    hide() { M = null; },
    get up() { return !!M; },
  };
}

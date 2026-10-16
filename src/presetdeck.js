// THE PRESET DECK: the SHOW card of the Light and FX apps (the Crowd app's is the show panel).
// A card docked to the right like the others: the red close and the title, the categories as
// tabs, a few live controls, and the presets as big tiles, each with a small live preview drawn
// on its canvas. Each tab is a layer of its own: a latched preset (a look, a laser pattern, a
// screen feed) stays lit until another of that tab takes over, while the other tabs keep theirs;
// a sequence runs once, its ring filling as it plays, and can be fired again at any time.
//
// initDeck({ title, tabs, controls }) -> { el, open(on), isOpen, refresh(), playing(tabId) }
//   tabs:     [{ id, name, multi?, tiles: [{ id, name, draw(g, w, h, t, tile), play(), stop?(), once?: seconds, isOn?() }] }]
//             (multi: any number of tiles on at once, each toggled by its own play(), shown by isOn())
//   controls: per tab or for all: [{ type: 'slider', label, min, max, step, value, input(v) } |
//             { type: 'switch', label, value, change(on) } | { type: 'button', label, click() } |
//             { type: 'colors', label, list, value, change(hex) } | { type: 'text', label, value, input(text) } |
//             { type: 'choice', label, options: [[value, name]], value, change(value) }]
//             (a tab's own controls: tab.controls)

export function initDeck({ title, tabs, controls = [] }) {
  const el = document.createElement('div');
  el.id = 'mDeck';
  el.innerHTML = `<div class="mCardHead"><button class="mCardClose" aria-label="Close"></button><span></span></div>
    <div class="mdTabs"></div><div class="mdBody"><div class="mdCtl"></div><div class="mdGrid"></div></div>`;
  el.querySelector('.mCardHead span').textContent = title;
  document.body.appendChild(el);
  const tabsEl = el.querySelector('.mdTabs'), ctlEl = el.querySelector('.mdCtl'), grid = el.querySelector('.mdGrid');
  tabsEl.innerHTML = tabs.map((t) => `<button data-tab="${t.id}">${t.name}</button>`).join('');
  tabsEl.style.setProperty('--n', String(Math.min(4, Math.ceil(tabs.length / 2))));
  let tab = tabs[0].id;
  const latched = {};          // tab id -> the tile playing in it
  const runs = new Map();      // a sequence's tile id -> { t0, dur }
  let raf = 0, open = false;
  const close = el.querySelector('.mCardClose');
  close.addEventListener('click', (e) => { e.stopPropagation(); setOpen(false); });

  function controlHTML(c, i) {
    if (c.type === 'slider') return `<label class="mdSlider" data-c="${i}"><span>${c.label}</span><input type="range" min="${c.min}" max="${c.max}" step="${c.step ?? 0.01}" value="${c.value}"></label>`;
    if (c.type === 'switch') return `<button class="mdSwitch${c.value ? ' on' : ''}" data-c="${i}" role="switch" aria-checked="${!!c.value}"><span>${c.label}</span><i></i></button>`;
    if (c.type === 'colors') return `<div class="mdColorsRow" data-c="${i}"><span>${c.label || ''}</span><div class="mdColors">${c.list.map((h) => `<button data-col="${h}" style="--c:${h}" class="${h === c.value ? 'sel' : ''}"></button>`).join('')}</div></div>`;
    if (c.type === 'palette') return `<div class="mdPalette" data-c="${i}"><span>${c.label || 'Colours'} <small>up to 4</small></span><div class="mdColors">${c.list.map((h) => `<button data-col="${h}" style="--c:${h}" class="${!c.rainbow && c.value.includes(h) ? 'sel' : ''}"></button>`).join('')}</div><button class="mdRainbow${c.rainbow ? ' sel' : ''}" data-rainbow><i></i>Rainbow</button></div>`;
    if (c.type === 'text') return `<label class="mdText" data-c="${i}"><span>${c.label}</span><input type="text" maxlength="${c.max || 22}" value="${String(c.value ?? '').replace(/"/g, '&quot;')}" autocomplete="off" spellcheck="false"></label>`;
    if (c.type === 'choice') return `<div class="mdChoice" data-c="${i}"><span>${c.label}</span><div>${c.options.map(([v, n]) => `<button data-v="${v}" class="${v === c.value ? 'sel' : ''}">${n}</button>`).join('')}</div></div>`;
    return `<button class="mdButton${c.primary ? ' primary' : ''}" data-c="${i}">${c.label}</button>`;
  }
  let shownControls = [];
  // the controls read their values live (getters), so a preset that changes them shows it
  function renderControls() {
    const T = tabs.find((t) => t.id === tab);
    shownControls = [...(T.controls || []), ...controls];
    ctlEl.innerHTML = shownControls.map(controlHTML).join('');
    ctlEl.hidden = !shownControls.length;
  }
  function render() {
    const T = tabs.find((t) => t.id === tab);
    for (const b of tabsEl.children) b.classList.toggle('sel', b.dataset.tab === tab);
    renderControls();
    grid.innerHTML = T.tiles.map((x) => `<button class="mdTile" data-t="${x.id}"><canvas width="240" height="150"></canvas><span>${x.name}</span><i class="mdRing"></i></button>`).join('');
    grid.classList.toggle('multi', !!T.multi);
    grid.scrollTop = 0;
    refresh();
  }
  function refresh() {
    const T = tabs.find((t) => t.id === tab);
    for (const b of grid.children) {
      const x = T.tiles.find((o) => o.id === b.dataset.t);
      if (!x) continue;
      b.classList.toggle('sel', x.isOn ? !!x.isOn() : latched[tab] === x.id && !x.once);
      b.classList.toggle('run', runs.has(x.id));
    }
  }
  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    e.stopPropagation();
    tab = b.dataset.tab;
    render();
  });
  ctlEl.addEventListener('input', (e) => {
    const w = e.target.closest('[data-c]');
    if (w && e.target.type === 'range') shownControls[w.dataset.c].input?.(Number(e.target.value));
    if (w && e.target.type === 'text') shownControls[w.dataset.c].input?.(e.target.value);
  });
  // typing a name: the room's keys (walk, fly) stay out of it
  ctlEl.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur?.(); });
  ctlEl.addEventListener('keyup', (e) => e.stopPropagation());
  ctlEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const w = e.target.closest('[data-c]');
    if (!w) return;
    const c = shownControls[w.dataset.c];
    if (c.type === 'switch') { const v = !c.value; c.change?.(v); w.classList.toggle('on', v); w.setAttribute('aria-checked', String(v)); }
    else if (c.type === 'colors') {
      const b = e.target.closest('[data-col]');
      if (!b) return;
      c.change?.(b.dataset.col);
      for (const x of w.querySelectorAll('[data-col]')) x.classList.toggle('sel', x === b);
    } else if (c.type === 'palette') {
      // up to four colours (a fifth takes the oldest one's place; never none), or the rainbow
      if (e.target.closest('[data-rainbow]')) c.change?.(c.value, !c.rainbow);
      else {
        const b = e.target.closest('[data-col]');
        if (!b) return;
        let list = c.rainbow ? [] : [...c.value];
        const h = b.dataset.col;
        if (list.includes(h)) { if (list.length > 1) list = list.filter((x) => x !== h); } else { list.push(h); if (list.length > 4) list.shift(); }
        c.change?.(list, false);
      }
      for (const x of w.querySelectorAll('[data-col]')) x.classList.toggle('sel', !c.rainbow && c.value.includes(x.dataset.col));
      w.querySelector('[data-rainbow]').classList.toggle('sel', !!c.rainbow);
      w.classList.toggle('rainbowOn', !!c.rainbow);
    } else if (c.type === 'choice') {
      const b = e.target.closest('[data-v]');
      if (!b) return;
      c.change?.(b.dataset.v);
      for (const x of w.querySelectorAll('[data-v]')) x.classList.toggle('sel', x === b);
    } else if (c.type === 'button') c.click?.();
  });
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    e.stopPropagation();
    const T = tabs.find((t) => t.id === tab), x = T.tiles.find((o) => o.id === b.dataset.t);
    if (!x) return;
    if (T.multi || x.isOn) x.play();   // a tile that knows if it's on: toggles itself, any number at once
    else if (x.once) {   // a sequence: fire it (again, if it's running: from the top)
      x.play();
      runs.set(x.id, { t0: performance.now(), dur: x.once * 1000 });
    } else {
      if (latched[tab] && latched[tab] !== x.id) T.tiles.find((o) => o.id === latched[tab])?.stop?.();
      latched[tab] = x.id;
      x.play();
    }
    refresh();
  });

  // the previews: drawn only while the card is open, 30 a second
  let last = 0;
  function frame(now) {
    raf = open ? requestAnimationFrame(frame) : 0;
    if (now - last < 33) return;
    last = now;
    const T = tabs.find((t) => t.id === tab), t = now / 1000;
    for (const b of grid.children) {
      const x = T.tiles.find((o) => o.id === b.dataset.t);
      if (!x) continue;
      const cv = b.firstElementChild, g = cv.getContext('2d');
      const r = b.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;   // scrolled out of sight: skip
      x.draw?.(g, cv.width, cv.height, t, x);
      const run = runs.get(x.id);
      if (run) {
        const k = (now - run.t0) / run.dur;
        if (k >= 1) { runs.delete(x.id); b.classList.remove('run'); b.style.removeProperty('--k'); }
        else b.style.setProperty('--k', String(k));
      }
    }
    for (const [id, run] of runs) if (now - run.t0 > run.dur) runs.delete(id);   // finished on another tab
  }
  function setOpen(on) {
    open = !!on;
    el.classList.toggle('open', open);
    if (open) { render(); if (!raf) raf = requestAnimationFrame(frame); }
  }
  render();
  return {
    el,
    open: setOpen,
    get isOpen() { return open; },
    refresh,
    refreshControls: () => { if (open) renderControls(); },
    rerender: () => { if (open) render(); },   // a tab's tile list changed
    playing: (tabId) => latched[tabId] || null,
    // set what a tab has latched from outside (a preset applied by something else), or clear it
    latch(tabId, tileId) { if (tileId) latched[tabId] = tileId; else delete latched[tabId]; if (open) refresh(); },
  };
}

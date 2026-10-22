// CREATIVE STAGE, the hub. The desktop app is the original Creative Stage software (the rig, the
// festival field, the timeline, every window), and from its main menu the way into the four apps,
// each an easy way to build one part of a show:
//   LIGHT    your song as a light show: feelings, looks, movers, lasers, strobes, screens
//   MOMENTS  one-tap moments, one effect each: pyro, fireworks, flames, confetti, balloons, drones
//   BUILD    the stage: concepts made for this venue, screens, rig, runway, crowd, production
//   CROWD    the wristbands' shows
// Each app EXPORTS what you made as a concept (apps/conceptfile.js): a file, and a copy on this
// device. CONCEPTS (the top bar) brings them back here: one at a time, or one of each combined
// into one show: the Build's stage and rig, the Light's look, the Crowd's show, and the Moments as
// buttons on a dock to fire whenever you like. A concept made for another venue opens it first.
import { tray, forget, remember, readConcept, ago, APP_NAMES, EXT } from './apps/conceptfile.js';

const PENDING = 'cs-pending-concepts';   // concepts waiting for the venue they need to load
const ICONS = {
  light: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  moments: '<path d="M12 2l2.4 6.6L21 9l-5 4.3L17.5 21 12 17.3 6.5 21 8 13.3 3 9l6.6-.4z"/>',
  build: '<path d="M3 20h18M5 20V9l7-5 7 5v11"/><path d="M9 20v-6h6v6"/>',
  crowd: '<circle cx="6" cy="9" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="18" cy="9" r="2"/><path d="M3 18c.5-3 2-4.5 3-4.5s2.5 1.5 3 4.5M9 18c.5-3.5 2-5.5 3-5.5s2.5 2 3 5.5M15 18c.5-3 2-4.5 3-4.5s2.5 1.5 3 4.5"/>',
};
const APPS = [
  ['light', 'Light', 'Your song as a light show: feelings, looks, movers, lasers, strobes'],
  ['moments', 'Moments', 'One-tap moments: pyro, fireworks, flames, confetti, balloons, drones'],
  ['build', 'Build', 'Design the stage for this venue: concepts, screens, rig, production'],
  ['crowd', 'Crowd', "The wristbands' shows, the lights and screens following them"],
];
const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initHub({ eng, overlay, showUI, hint = () => {} }) {
  injectStyle();
  // --- the portal: the apps, under ENTER on the main menu ------------------------------------------
  const land = overlay.querySelector('.mScreen[data-ms=landing]');
  const logo = land?.querySelector('.mTitle .pmLogo');
  if (logo) logo.outerHTML = '<b class="csWord">CREATIVE</b>';   // CREATIVE STAGE, as the apps say it
  if (land) {
    const portal = document.createElement('div');
    portal.className = 'hubPortal';
    portal.innerHTML = `<p class="hubLead">Build a show fast in the apps, then bring it all here</p>
      <div class="hubApps">${APPS.map(([id, name, what]) => `<button class="hubApp" data-app="${id}"><i>${svg(ICONS[id])}</i><b>${name}</b><small>${what}</small></button>`).join('')}</div>
      <button class="hubConceptsBtn">Concepts <span class="hubCount"></span></button>`;
    land.appendChild(portal);
    portal.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = e.target.closest('.hubApp[data-app]');   // (the page's <html> wears a data-app of its own)
      if (a) openApp(a.dataset.app);
      else if (e.target.closest('.hubConceptsBtn')) { pendingOpen = true; document.getElementById('mEnter')?.click(); }
    });
  }
  // --- the dock: CONCEPTS, with BUILD, SHOW and VIDEO -------------------------------------------------
  const btn = document.createElement('button');
  btn.id = 'conceptsBtn';
  btn.title = 'Bring in what you made in the Light, Moments, Build and Crowd apps';
  btn.innerHTML = '<i class="hdLight"></i><span class="bfLabel">CONCEPTS</span><span class="bfMode hubCount"></span>';
  const fabDock = document.getElementById('fabDock');
  if (fabDock) fabDock.appendChild(btn); else document.getElementById('topRight')?.prepend(btn);
  btn.addEventListener('click', (e) => { e.stopPropagation(); open(!win.classList.contains('open')); });
  // BUILD A RIG: the original rig designer (designer.js, the 2D plan of trusses, lights, PA, decks
  // and screens), with the Show Studio's tools; USE THIS RIG hangs it at once (no reload)
  const rigBtn = document.createElement('button');
  rigBtn.id = 'rigBtn';
  rigBtn.title = 'Build a rig: draw the trusses, lights, PA, decks and screens, then hang it';
  rigBtn.innerHTML = '&#9638; BUILD A RIG';
  document.getElementById('topRight')?.prepend(rigBtn);
  let designer = null;
  rigBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!designer) {
      const D = await import('./designer.js');
      designer = D.initDesigner({
        onUse: (plan) => {
          const s = eng.builder.state;
          if (s.mode !== 'concert') eng.builder.setState({ ...s, mode: 'concert', cfg: { ...s.cfg } });
          eng.rehang(plan);
          designer.close?.();
          hint('Your rig is hung');
        },
      });
    }
    designer.open(eng.rigPlan?.() || undefined);
  });
  let pendingOpen = false;   // Concepts was asked for on the main menu: open once in the room
  setInterval(() => { if (pendingOpen && !document.body.classList.contains('menu')) { pendingOpen = false; open(true); } }, 400);

  // --- the Concepts window ---------------------------------------------------------------------------
  const win = document.createElement('div');
  win.id = 'hubConcepts';
  win.innerHTML = `<div class="hcHead"><b>Concepts</b><span>from the apps</span><button class="hcClose" aria-label="Close">✕</button></div>
    <p class="hcLead">Export from <b>Light</b>, <b>Moments</b>, <b>Build</b> or <b>Crowd</b> and it shows up here. Bring one in, or one of each to combine them into one show.</p>
    <div class="hcNow"></div>
    <div class="hcBar"><button class="hcImport">Import file…</button><button class="hcCombine">Combine the latest of each</button><input type="file" accept="${EXT},.json,application/json" multiple hidden></div>
    <div class="hcList"></div>`;
  document.body.appendChild(win);
  const list = win.querySelector('.hcList'), nowEl = win.querySelector('.hcNow'), file = win.querySelector('input[type=file]');
  win.addEventListener('click', (e) => e.stopPropagation());
  win.querySelector('.hcClose').addEventListener('click', () => open(false));
  win.querySelector('.hcImport').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => { for (const f of file.files) await importFile(f); file.value = ''; });
  win.querySelector('.hcCombine').addEventListener('click', () => combine());
  list.addEventListener('click', (e) => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const c = tray().find((x) => x.id === row.dataset.id);
    if (e.target.closest('.hcIn')) bringIn(c);
    else if (e.target.closest('.hcDel')) { forget(row.dataset.id); render(); }
  });
  for (const ev of ['keydown', 'keyup']) win.addEventListener(ev, (e) => e.stopPropagation());
  function open(on) { win.classList.toggle('open', on); btn.classList.toggle('active', on); if (on) render(); }

  // what's in the show now, per app
  const inShow = {};
  function render() {
    const all = tray();
    const count = all.length;
    document.querySelectorAll('.hubCount').forEach((el) => { el.textContent = count ? String(count) : ''; });
    nowEl.innerHTML = `<span>In the show</span>${APPS.map(([id, name]) => `<em class="${inShow[id] ? 'on' : ''}" data-k="${id}">${name}<small>${esc(inShow[id]?.name || '—')}</small></em>`).join('')}`;
    if (!count) { list.innerHTML = '<p class="hcEmpty">Nothing yet. Open an app from the main menu, make something, and tap its Export button.</p>'; return; }
    list.innerHTML = APPS.map(([id, name]) => {
      const mine = all.filter((c) => c.app === id);
      if (!mine.length) return '';
      return `<div class="hcGroup"><h4><i>${svg(ICONS[id])}</i>${name}</h4>${mine.map((c) => `<div class="hcRow${inShow[id]?.id === c.id ? ' on' : ''}" data-id="${esc(c.id)}">
        <div class="hcTxt"><b>${esc(c.name)}</b><small>${esc([c.summary, c.venue && c.venue !== eng.VENUE ? `made in the ${c.venue}` : '', ago(c.created)].filter(Boolean).join(' · '))}</small></div>
        <button class="hcIn">${inShow[id]?.id === c.id ? 'In the show' : 'Bring in'}</button><button class="hcDel" aria-label="Remove">✕</button></div>`).join('')}</div>`;
    }).join('');
  }

  // --- bringing a concept in ---------------------------------------------------------------------------
  let lightPlayer = null, momentsPlayer = null;
  async function bringIn(c, { quiet = false } = {}) {
    if (!c) return false;
    try {
      if (c.app === 'build') {
        const B = await import('./apps/build.js');
        const r = B.applyBuildConcept(eng, c.state);
        if (r?.needsVenue) {
          // another venue: it loads first, then this concept (and any others asked for) come back in
          try { localStorage.setItem(PENDING, JSON.stringify([c.id, ...pendingIds()])); } catch (_) { /* private mode */ }
          hint(`Opening the ${r.needsVenue} for “${c.name}”…`);
          eng.builder.reboot({ venue: r.needsVenue, open: false });
          return false;
        }
      } else if (c.app === 'light') {
        const L = await import('./apps/light.js');
        eng.setStageFollow?.(false);   // the stage plays the Light concept, not the crowd's show
        if (!lightPlayer) lightPlayer = L.createLightPlayer(eng, { ...c.state });
        else Object.assign(lightPlayer.S, c.state);
        lightPlayer.applyAll();
      } else if (c.app === 'crowd') {
        if (c.state?.show) showUI.restore(c.state.show, { live: true });
      } else if (c.app === 'moments') {
        const M = await import('./apps/moments.js');
        if (!M.createMomentsPlayer) throw new Error('This version cannot play Moments concepts');
        momentsPlayer?.stopAll?.();
        momentsPlayer = M.createMomentsPlayer(eng, JSON.parse(JSON.stringify(c.state || {})));
        dock(c);
      }
      inShow[c.app] = c;
      remember(c);   // a file brought in joins the device's list
      if (!quiet) hint(`Brought in: ${c.name}`);
      render();
      return true;
    } catch (err) {
      hint(String(err?.message || err || 'That concept could not be brought in'));
      return false;
    }
  }
  // one of each, the newest: the stage first (it may need its venue), then the lights, the crowd, the moments
  async function combine() {
    const all = tray(), order = ['build', 'light', 'crowd', 'moments'];
    const picks = order.map((app) => all.find((c) => c.app === app)).filter(Boolean);
    if (!picks.length) { hint('Nothing to combine yet: export something from the apps first'); return; }
    const b = picks.find((c) => c.app === 'build');
    if (b && b.state?.venue && b.state.venue !== eng.VENUE) {
      try { localStorage.setItem(PENDING, JSON.stringify(picks.map((c) => c.id))); } catch (_) { /* private mode */ }
      hint(`Opening the ${b.state.venue} for the combined show…`);
      eng.builder.reboot({ venue: b.state.venue, open: false });
      return;
    }
    for (const c of picks) await bringIn(c, { quiet: true });
    hint(`Combined: ${picks.map((c) => APP_NAMES[c.app]).join(' + ')}`);
  }
  async function importFile(f) {
    try { const c = await readConcept(f); remember(c); render(); await bringIn(c); }
    catch (err) { hint(String(err?.message || err)); }
  }
  function pendingIds() { try { const p = JSON.parse(localStorage.getItem(PENDING) || '[]'); return Array.isArray(p) ? p : []; } catch (_) { return []; } }
  // back from a venue change: the concepts that were waiting, in once the room is entered
  const waiting = pendingIds();
  if (waiting.length) {
    try { localStorage.removeItem(PENDING); } catch (_) { /* private mode */ }
    const go = setInterval(async () => {
      if (document.body.classList.contains('menu')) return;
      clearInterval(go);
      const all = tray();
      for (const id of waiting) await bringIn(all.find((c) => c.id === id), { quiet: true });
      hint('The concepts are in the show');
      open(true);
    }, 500);
  }

  // --- the Moments dock: the imported moments, fired whenever you like ----------------------------------
  const dk = document.createElement('div');
  dk.id = 'hubMoments';
  document.body.appendChild(dk);
  dk.addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('[data-m]');
    if (b) {
      const m = momentsPlayer?.list?.find((x) => x.id === b.dataset.m);
      momentsPlayer?.fire(b.dataset.m);
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      // a combo ends at rest (dark): the show you brought in comes back after it
      if (m?.tab === 'combos') { clearTimeout(backT); backT = setTimeout(restoreShow, ((m.secs || 10) + 0.6) * 1000); }
    } else if (e.target.closest('.hmStop')) { momentsPlayer?.stopAll(); restoreShow(); }
    else if (e.target.closest('.hmClose')) { momentsPlayer?.stopAll(); restoreShow(); dk.classList.remove('open'); delete inShow.moments; render(); }
  });
  let backT = 0;
  function restoreShow() {
    if (inShow.light && lightPlayer) lightPlayer.applyAll();
    if (inShow.crowd?.state?.show) showUI.restore(inShow.crowd.state.show, { live: true });
  }
  function dock(c) {
    const all = momentsPlayer.list || [];
    const ids = (c.state?.fired?.length ? c.state.fired : c.state?.last ? [c.state.last] : all.slice(0, 8).map((m) => m.id)).filter((id) => all.some((m) => m.id === id));
    dk.innerHTML = `<span class="hmTitle">MOMENTS<small>${esc(c.name)}</small></span>${ids.map((id) => `<button data-m="${esc(id)}">${esc(all.find((m) => m.id === id)?.name || id)}</button>`).join('')}<button class="hmStop">Stop</button><button class="hmClose" aria-label="Close">✕</button>`;
    dk.classList.add('open');
  }

  // --- drop a concept file anywhere on the window ------------------------------------------------------
  window.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.items || [])].some((i) => i.kind === 'file')) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    const files = [...(e.dataTransfer?.files || [])].filter((f) => f.name.endsWith(EXT) || f.type === 'application/json' || f.name.endsWith('.json'));
    if (!files.length) return;   // a song or a show file: the director's own drop handles those
    e.preventDefault();
    files.forEach(importFile);
  });
  render();
  return { open, bringIn, combine, render };
}

// one of the apps: the same engine, made for fingers, opened from here (no code screen) with the
// way back to Creative Stage on its main menu
function openApp(id) {
  try { sessionStorage.setItem('pm-mobile-ok', '1'); sessionStorage.setItem('cs-from-hub', '1'); } catch (_) { /* private mode */ }
  location.href = `./?mobile&app=${id}&hub=1`;
}

function injectStyle() {
  const css = `
  .mTitle .csWord { font-weight: 300; margin-right: 0.38em; color: #fff; }
  .hubPortal { position: absolute; left: 50%; bottom: max(28px, 5vh); transform: translateX(-50%); z-index: 3; width: min(980px, 92vw); display: flex; flex-direction: column; align-items: center; gap: 12px;
    opacity: 0; transition: opacity 0.6s ease 0.4s; font: 500 13px/1.3 Inter, -apple-system, BlinkMacSystemFont, sans-serif; }
  .mScreen.ready .hubPortal { opacity: 1; }
  .hubLead { margin: 0; color: #a3a4b3; letter-spacing: 0.04em; }
  .hubApps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; width: 100%; }
  .hubApp { display: grid; grid-template-columns: 34px 1fr; grid-template-rows: auto auto; column-gap: 10px; align-items: center; text-align: left; padding: 12px 14px; border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12); background: rgba(14,15,19,0.72); color: #e9e9ef; cursor: pointer; backdrop-filter: blur(8px); transition: border-color 0.2s, transform 0.2s, background 0.2s; }
  .hubApp i { grid-row: 1 / 3; width: 34px; height: 34px; color: #d8ff3a; }
  .hubApp i svg { width: 100%; height: 100%; }
  .hubApp b { font: 700 14px/1.2 'Chakra Petch', Inter, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
  .hubApp small { color: #9a9ca8; font-size: 11.5px; }
  .hubApp:hover { border-color: rgba(216,255,58,0.6); background: rgba(24,26,20,0.82); transform: translateY(-2px); }
  .hubConceptsBtn { padding: 8px 18px; border-radius: 999px; border: 1px solid rgba(216,255,58,0.45); background: rgba(14,15,19,0.6); color: #d8ff3a; font: 700 12px/1 Inter, sans-serif; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; }
  .hubConceptsBtn .hubCount:not(:empty) { margin-left: 6px; padding: 2px 7px; border-radius: 999px; background: #d8ff3a; color: #111; }
  @media (max-width: 760px) { .hubApps { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  html.mobile .hubPortal, html.mobile #conceptsBtn, html.mobile #hubConcepts, html.mobile #hubMoments { display: none !important; }
  body.mode-quick #rigBtn { display: none !important; }
  #conceptsBtn { order: 5; display: none; align-items: center; gap: 9px; padding: 11px 16px; border-radius: 999px; cursor: pointer; background: rgba(16,16,20,0.82);
    border: 1px solid rgba(216,255,58,0.4); color: #e6f2b8; font: 700 12px/1 -apple-system, system-ui, Arial; letter-spacing: 0.14em; transition: border-color 0.15s, box-shadow 0.2s, transform 0.15s; }
  body.builderOn #conceptsBtn { display: flex; }
  #conceptsBtn:hover { border-color: #d8ff3a; box-shadow: 0 0 18px rgba(216,255,58,0.25); transform: translateY(-1px); }
  #conceptsBtn.active { background: #d8ff3a; color: #141a00; border-color: #d8ff3a; }
  #conceptsBtn .hdLight { width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: 0.5; }
  #conceptsBtn .hubCount { padding-left: 9px; border-left: 1px solid color-mix(in srgb, currentColor 35%, transparent); font-weight: 600; opacity: 0.85; }
  #conceptsBtn .hubCount:empty { display: none; }
  #hubConcepts { position: fixed; z-index: 120; bottom: 84px; left: 16px; width: min(420px, calc(100vw - 32px)); max-height: calc(100vh - 160px); display: none; flex-direction: column;
    border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); background: rgba(16,17,21,0.96); box-shadow: 0 24px 60px rgba(0,0,0,0.6); color: #e9e9ef; font: 13px/1.4 Inter, -apple-system, sans-serif; overflow: hidden; }
  #hubConcepts.open { display: flex; }
  #hubConcepts .hcHead { display: flex; align-items: baseline; gap: 8px; padding: 14px 16px 6px; }
  #hubConcepts .hcHead b { font: 700 15px/1 'Chakra Petch', Inter, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #d8ff3a; }
  #hubConcepts .hcHead span { color: #8d8f9b; flex: 1; }
  #hubConcepts .hcClose { border: 0; background: none; color: #8d8f9b; font-size: 15px; cursor: pointer; }
  #hubConcepts .hcLead { margin: 0 16px 10px; color: #a3a4b3; font-size: 12.5px; }
  #hubConcepts .hcNow { display: grid; grid-template-columns: auto repeat(4, minmax(0, 1fr)); gap: 6px; align-items: stretch; margin: 0 16px 10px; }
  #hubConcepts .hcNow > span { align-self: center; color: #8d8f9b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
  #hubConcepts .hcNow em { font-style: normal; padding: 6px 8px; border-radius: 8px; background: #1d1e23; color: #8d8f9b; font-weight: 700; font-size: 11.5px; overflow: hidden; }
  #hubConcepts .hcNow em small { display: block; font-weight: 500; color: #6d6f7a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #hubConcepts .hcNow em.on { background: rgba(216,255,58,0.12); color: #d8ff3a; box-shadow: inset 0 0 0 1px rgba(216,255,58,0.35); }
  #hubConcepts .hcNow em.on small { color: #cfd6b0; }
  #hubConcepts .hcBar { display: flex; gap: 8px; padding: 0 16px 12px; }
  #hubConcepts .hcBar button { flex: 1; height: 34px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.12); background: #22232a; color: #e9e9ef; font: 600 12.5px/1 Inter, sans-serif; cursor: pointer; }
  #hubConcepts .hcBar .hcCombine { background: #d8ff3a; color: #141a00; border-color: #d8ff3a; }
  #hubConcepts .hcList { overflow-y: auto; padding: 0 16px 16px; display: flex; flex-direction: column; gap: 12px; }
  #hubConcepts .hcEmpty { margin: 6px 0; color: #8d8f9b; }
  #hubConcepts .hcGroup h4 { display: flex; align-items: center; gap: 8px; margin: 4px 0 6px; font: 700 12px/1 Inter, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #c9cbd2; }
  #hubConcepts .hcGroup h4 i { width: 16px; height: 16px; color: #d8ff3a; }
  #hubConcepts .hcRow { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; background: #1b1c21; margin-bottom: 6px; }
  #hubConcepts .hcRow.on { box-shadow: inset 0 0 0 1px rgba(216,255,58,0.45); }
  #hubConcepts .hcTxt { flex: 1; min-width: 0; }
  #hubConcepts .hcTxt b { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #hubConcepts .hcTxt small { color: #8d8f9b; }
  #hubConcepts .hcIn { height: 30px; padding: 0 12px; border-radius: 8px; border: 0; background: #d8ff3a; color: #141a00; font: 700 12px/1 Inter, sans-serif; cursor: pointer; white-space: nowrap; }
  #hubConcepts .hcRow.on .hcIn { background: #2b2d34; color: #d8ff3a; }
  #hubConcepts .hcDel { border: 0; background: none; color: #6d6f7a; cursor: pointer; font-size: 13px; }
  #hubMoments { position: fixed; z-index: 110; right: 18px; bottom: 74px; display: none; align-items: center; gap: 6px; padding: 8px; max-width: calc(100vw - 32px); overflow-x: auto;
    border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: rgba(16,17,21,0.92); box-shadow: 0 16px 40px rgba(0,0,0,0.55); font: 600 12.5px/1 Inter, sans-serif; color: #e9e9ef; }
  #hubMoments.open { display: flex; }
  #hubMoments .hmTitle { padding: 0 8px; color: #d8ff3a; font: 700 12px/1.1 'Chakra Petch', Inter, sans-serif; letter-spacing: 0.14em; white-space: nowrap; }
  #hubMoments .hmTitle small { display: block; color: #8d8f9b; letter-spacing: 0; font: 500 11px/1.2 Inter, sans-serif; max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
  #hubMoments button { height: 36px; padding: 0 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.12); background: #22232a; color: #fff; font: 700 12.5px/1 Inter, sans-serif; cursor: pointer; white-space: nowrap; }
  #hubMoments button[data-m]:hover { border-color: #d8ff3a; }
  #hubMoments button.pop { animation: hmPop 0.4s ease; }
  #hubMoments .hmStop { background: #3a1820; border-color: #6b2030; }
  #hubMoments .hmClose { padding: 0 10px; background: none; border: 0; color: #8d8f9b; }
  @keyframes hmPop { 0% { transform: scale(1); background: #d8ff3a; color: #111; } 100% { transform: scale(1); } }
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
}

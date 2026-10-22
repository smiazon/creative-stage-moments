// A CONCEPT: what one of the four apps made, taken away to Creative Stage (the hub, desktop).
// Light exports its layers (a feeling, the look, movers, lasers, strobes, screens, colours),
// Moments its moments and their amounts, Build the room and the hung rig plan, Crowd the
// wristbands' show. One small JSON file (.csconcept), and a copy kept on this device (local
// storage, shared by every app on the same site), so the hub can list it without a file at all.
//
//   { kind: 'creative-stage-concept', version: 1, id, app, name, summary, venue, created, state }
export const KIND = 'creative-stage-concept';
export const EXT = '.csconcept';
const TRAY = 'cs-concepts', MAX = 30;

export const APP_NAMES = { light: 'Light', moments: 'Moments', build: 'Build', crowd: 'Crowd' };

export function makeConcept(app, state, { name = '', summary = '', venue = null } = {}) {
  const created = new Date().toISOString();
  return {
    kind: KIND, version: 1, id: `${app}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    app, name: (name || `${APP_NAMES[app] || app} concept`).slice(0, 60), summary: String(summary || '').slice(0, 120), venue, created,
    state: JSON.parse(JSON.stringify(state ?? null)),
  };
}

// the file: <name>.csconcept, downloaded (the Mac app puts it in Downloads)
export function downloadConcept(c) {
  const blob = new Blob([JSON.stringify(c, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${c.name.replace(/[^\w\- .·]+/g, '').replace(/\s+/g, ' ').trim() || 'concept'}${EXT}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

// the device's tray: newest first
export function tray() {
  try { const list = JSON.parse(localStorage.getItem(TRAY) || '[]'); return Array.isArray(list) ? list.filter(isConcept) : []; } catch (_) { return []; }
}
export function remember(c) {
  if (!isConcept(c)) return false;
  const list = [c, ...tray().filter((x) => x.id !== c.id)].slice(0, MAX);
  try { localStorage.setItem(TRAY, JSON.stringify(list)); return true; } catch (_) { return false; }   // full or private: the file still has it
}
export function forget(id) {
  try { localStorage.setItem(TRAY, JSON.stringify(tray().filter((x) => x.id !== id))); } catch (_) { /* private mode */ }
}

export function isConcept(c) { return !!c && c.kind === KIND && typeof c.app === 'string' && APP_NAMES[c.app] && 'state' in c; }

// a file someone dropped or picked: the concept in it, or an error that says why not
export async function readConcept(file) {
  let c;
  try { c = JSON.parse(await file.text()); } catch (_) { throw new Error('Not a Creative Stage concept file'); }
  if (!isConcept(c)) throw new Error('Not a Creative Stage concept file');
  if (!c.id) c.id = `${c.app}-${Date.now().toString(36)}`;
  return c;
}

// "2 min ago", "yesterday": when it was made, for the lists
export function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(s)) return '';
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 172800) return 'yesterday';
  return new Date(iso).toLocaleDateString();
}

import { generateAll, generateFloor, makeEmptyPalette, makeFloorPalette } from './generator.js';
import { t } from './i18n.js';

export function defaultState() {
  return {
    masterHarmony: 'auto',
    activeHarmony: 'analogous',
    anchorHue: 0,
    background: makeEmptyPalette(t('palette.background'), 'background'),
    floor: makeFloorPalette(t('palette.floor')),
    characters: [makeEmptyPalette(t('palette.character', { n: 1 }), 'character')],
  };
}

export function freshState() {
  const state = defaultState();
  generateAll(state);
  return state;
}

// Compact serialized form sent over the wire / encoded into the URL.
function toWire(state) {
  return {
    h: state.masterHarmony,
    a: state.activeHarmony,
    n: state.anchorHue,
    b: paletteToWire(state.background),
    f: state.floor ? paletteToWire(state.floor) : undefined,
    c: state.characters.map(paletteToWire),
  };
}

function paletteToWire(p) {
  const w = {
    n: p.name,
    r: p.role,
    o: p.hueOffsetFromAnchor ?? 0,
    s: p.swatches.map((sw) => [sw.h, sw.s, sw.l, sw.locked ? 1 : 0]),
  };
  if (p.mode) w.m = p.mode;
  return w;
}

function paletteFromWire(w) {
  const p = {
    name: w.n,
    role: w.r,
    hueOffsetFromAnchor: w.o ?? 0,
    swatches: (w.s || []).map(([h, s, l, lk]) => ({
      h, s, l, locked: !!lk,
    })),
  };
  if (w.m) p.mode = w.m;
  return p;
}

function fromWire(w) {
  const state = {
    masterHarmony: w.h,
    activeHarmony: w.a,
    anchorHue: w.n,
    background: paletteFromWire(w.b),
    floor: null,
    characters: (w.c || []).map(paletteFromWire),
  };
  if (w.f) {
    state.floor = paletteFromWire(w.f);
  } else {
    // Backwards-compat: state predates the floor palette. Synthesize one.
    state.floor = makeFloorPalette(t('palette.floor'));
    generateFloor(state.floor, state.anchorHue);
  }
  return state;
}

function b64urlEncode(str) {
  const utf8 = new TextEncoder().encode(str);
  let bin = '';
  for (const b of utf8) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeStateToHash(state) {
  return b64urlEncode(JSON.stringify(toWire(state)));
}

export function decodeStateFromHash(hash) {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!raw) return null;
    return fromWire(JSON.parse(b64urlDecode(raw)));
  } catch {
    return null;
  }
}

export function stateForApi(state) {
  return toWire(state);
}

export function stateFromApi(json) {
  return fromWire(json);
}

export async function postShare(state) {
  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(stateForApi(state)),
  });
  if (!res.ok) throw new Error('Share failed: ' + res.status);
  const { code } = await res.json();
  return code;
}

export async function fetchShare(code) {
  const res = await fetch('/api/share/' + encodeURIComponent(code));
  if (!res.ok) return null;
  return stateFromApi(await res.json());
}

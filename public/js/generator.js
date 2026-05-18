import { clamp, normHue } from './color.js';
import { characterHueOffsets, pickAutoHarmony } from './harmony.js';

const CHARACTER_SIZE = 5;
export const BG_MIN = 1;
export const BG_MAX = 5;
export const BG_DEFAULT = 1;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function jitter(amount) {
  return (Math.random() * 2 - 1) * amount;
}

// 5 semantic character slots, in display order. Values are i18n keys (under "role.").
export const CHARACTER_ROLES = ['skin', 'hair', 'main', 'secondary', 'accent'];
export const CHARACTER_MAIN_SLOT = 2;

const STYLIZED_SKIN_CHANCE = 0.15;

const STYLIZED_SKIN_BUCKETS = [
  [90, 160],   // greens
  [180, 220],  // blues
  [260, 295],  // lavender
];

function isWarmHue(h) {
  h = normHue(h);
  return h < 60 || h > 300;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSkinSwatch(anchorHue) {
  const stylized = Math.random() < STYLIZED_SKIN_CHANCE;
  let h, s, l;
  if (stylized) {
    const [lo, hi] = pick(STYLIZED_SKIN_BUCKETS);
    h = rand(lo, hi);
    s = rand(22, 50);
    l = rand(42, 72);
  } else {
    h = rand(12, 38);            // realistic skin hue band
    s = rand(24, 58);
    l = rand(30, 78);
    // Nudge in opposite temperature direction from BG.
    const shift = rand(2, 7);
    h = clamp(isWarmHue(anchorHue) ? h - shift : h + shift, 6, 46);
  }
  return makeSwatch(h, s, l);
}

function generateHairSwatch(mainHue) {
  const r = Math.random();
  if (r < 0.30) {
    // brown/black
    return makeSwatch(rand(18, 38), rand(20, 50), rand(8, 28));
  }
  if (r < 0.50) {
    // blonde
    return makeSwatch(rand(34, 50), rand(45, 75), rand(58, 82));
  }
  if (r < 0.62) {
    // auburn/red
    return makeSwatch(rand(8, 22), rand(45, 75), rand(24, 44));
  }
  if (r < 0.72) {
    // grey/silver/white
    return makeSwatch(rand(180, 240), rand(0, 12), rand(38, 82));
  }
  // stylized, harmonizing with the character's main hue
  return makeSwatch(
    normHue(mainHue + jitter(50)),
    rand(45, 82),
    rand(16, 52),
  );
}

function generateMainSwatch(mainHue) {
  return makeSwatch(
    normHue(mainHue + jitter(4)),
    rand(60, 82),
    rand(40, 58),
  );
}

function generateSecondarySwatch(mainHue) {
  if (Math.random() < 0.65) {
    // analogous shift
    const sign = Math.random() < 0.5 ? -1 : 1;
    return makeSwatch(
      normHue(mainHue + sign * rand(22, 48)),
      rand(46, 72),
      rand(34, 66),
    );
  }
  // shade or tint of main
  const dark = Math.random() < 0.5;
  return makeSwatch(
    normHue(mainHue + jitter(8)),
    rand(50, 75),
    dark ? rand(18, 34) : rand(68, 82),
  );
}

function generateAccentSwatch(mainHue) {
  // Complement of main, punchy.
  return makeSwatch(
    normHue(mainHue + 180 + jitter(12)),
    rand(68, 92),
    rand(42, 66),
  );
}

const CHARACTER_GENERATORS = [
  generateSkinSwatch,
  generateHairSwatch,
  generateMainSwatch,
  generateSecondarySwatch,
  generateAccentSwatch,
];

export const FLOOR_MODES = ['shade', 'earth', 'complement'];
export const FLOOR_DEFAULT_MODE = 'shade';

function generateFloorShade(anchorHue) {
  return makeSwatch(
    normHue(anchorHue + jitter(6)),
    rand(10, 25),
    rand(18, 32),
  );
}

function generateFloorEarth(anchorHue) {
  const families = [
    { hue: [22, 42], sat: [28, 48], lit: [24, 42] },  // warm brown
    { hue: [200, 235], sat: [4, 14], lit: [30, 50] }, // cool stone / grey
    { hue: [78, 112], sat: [18, 38], lit: [22, 38] }, // mossy green
  ];
  const fam = pick(families);
  let h = rand(...fam.hue);
  // Nudge toward the anchor hue for harmony.
  const delta = ((normHue(anchorHue) - h + 540) % 360) - 180;
  h = normHue(h + Math.sign(delta) * Math.min(Math.abs(delta) * 0.18, 14));
  return makeSwatch(h, rand(...fam.sat), rand(...fam.lit));
}

function generateFloorComplement(anchorHue) {
  return makeSwatch(
    normHue(anchorHue + 180 + jitter(10)),
    rand(22, 44),
    rand(20, 36),
  );
}

const FLOOR_GENERATORS = {
  shade: generateFloorShade,
  earth: generateFloorEarth,
  complement: generateFloorComplement,
};

export function generateFloor(palette, anchorHue) {
  if (!Array.isArray(palette.swatches) || palette.swatches.length !== 1) {
    palette.swatches = [makeSwatch(0, 0, 50)];
  }
  if (!palette.swatches[0].locked) {
    const mode = FLOOR_MODES.includes(palette.mode) ? palette.mode : FLOOR_DEFAULT_MODE;
    palette.swatches[0] = FLOOR_GENERATORS[mode](anchorHue);
  }
  palette.role = 'floor';
}

export function makeFloorPalette(name) {
  return {
    name,
    role: 'floor',
    mode: FLOOR_DEFAULT_MODE,
    hueOffsetFromAnchor: 0,
    swatches: [makeSwatch(0, 0, 50)],
  };
}

// Background lightness ramps keyed by swatch count.
const BACKGROUND_RAMPS = {
  1: [50],
  2: [32, 72],
  3: [22, 50, 80],
  4: [16, 38, 62, 86],
  5: [12, 30, 50, 70, 88],
};

export function makeSwatch(h, s, l, locked = false) {
  return {
    h: normHue(h),
    s: clamp(Math.round(s), 0, 100),
    l: clamp(Math.round(l), 0, 100),
    locked,
  };
}

function ensureCharacterArray(palette) {
  if (!Array.isArray(palette.swatches) || palette.swatches.length !== CHARACTER_SIZE) {
    palette.swatches = new Array(CHARACTER_SIZE).fill(null).map(() => makeSwatch(0, 0, 50));
  }
}

function ensureBackgroundArray(palette) {
  if (!Array.isArray(palette.swatches) || palette.swatches.length === 0) {
    palette.swatches = [makeSwatch(0, 0, 50)];
  }
  if (palette.swatches.length > BG_MAX) {
    palette.swatches.length = BG_MAX;
  }
}

export function generateBackground(palette, anchorHue) {
  ensureBackgroundArray(palette);
  const n = palette.swatches.length;
  const ramp = BACKGROUND_RAMPS[n] ?? BACKGROUND_RAMPS[BG_MAX];
  const baseSat = rand(12, 28);
  for (let i = 0; i < n; i++) {
    const sw = palette.swatches[i];
    if (sw.locked) continue;
    const h = normHue(anchorHue + jitter(8));
    const s = clamp(baseSat + jitter(6), 6, 36);
    const l = clamp(ramp[i] + jitter(4), 4, 96);
    palette.swatches[i] = makeSwatch(h, s, l, false);
  }
  palette.hueOffsetFromAnchor = 0;
  palette.role = 'background';
}

export function generateCharacter(palette, anchorHue) {
  ensureCharacterArray(palette);
  const mainHue = normHue(anchorHue + (palette.hueOffsetFromAnchor ?? 0));
  for (let i = 0; i < CHARACTER_SIZE; i++) {
    if (palette.swatches[i].locked) continue;
    const gen = CHARACTER_GENERATORS[i];
    palette.swatches[i] = i === 0 ? gen(anchorHue) : gen(mainHue);
  }
  palette.role = 'character';
}

export function addBackgroundSwatch(state) {
  const bg = state.background;
  if (bg.swatches.length >= BG_MAX) return false;
  bg.swatches.push(makeSwatch(state.anchorHue, 20, 50));
  generateBackground(bg, state.anchorHue);
  return true;
}

export function removeBackgroundSwatch(state) {
  const bg = state.background;
  if (bg.swatches.length <= BG_MIN) return false;
  bg.swatches.pop();
  generateBackground(bg, state.anchorHue);
  return true;
}

function lockedHueFor(palette) {
  if (palette.role === 'character') {
    const main = palette.swatches?.[CHARACTER_MAIN_SLOT];
    return main && main.locked ? main.h : null;
  }
  const locked = palette.swatches?.find((s) => s.locked);
  return locked ? locked.h : null;
}

export function generateAll(state) {
  // Pick harmony.
  state.activeHarmony =
    state.masterHarmony === 'auto' ? pickAutoHarmony() : state.masterHarmony;

  // Pick anchor hue. If background has any locked swatch, it constrains the anchor.
  const bgLockedHue = lockedHueFor(state.background);
  if (bgLockedHue !== null) {
    state.anchorHue = normHue(bgLockedHue);
  } else {
    state.anchorHue = Math.floor(Math.random() * 360);
  }

  // Compute per-character hue offsets.
  const offsets = characterHueOffsets(state.activeHarmony, state.characters.length);
  state.characters.forEach((c, i) => {
    // If this character has a locked swatch, derive its offset from that swatch's hue
    // so the locked color stays "on theme".
    const lockedHue = lockedHueFor(c);
    if (lockedHue !== null) {
      c.hueOffsetFromAnchor = normHue(lockedHue - state.anchorHue);
    } else {
      c.hueOffsetFromAnchor = offsets[i];
    }
  });

  generateBackground(state.background, state.anchorHue);
  if (state.floor) generateFloor(state.floor, state.anchorHue);
  state.characters.forEach((c) => generateCharacter(c, state.anchorHue));
}

export function regeneratePalette(state, palette) {
  if (palette.role === 'background') {
    generateBackground(palette, state.anchorHue);
  } else if (palette.role === 'floor') {
    generateFloor(palette, state.anchorHue);
  } else {
    const lockedHue = lockedHueFor(palette);
    if (lockedHue !== null) {
      palette.hueOffsetFromAnchor = normHue(lockedHue - state.anchorHue);
    }
    generateCharacter(palette, state.anchorHue);
  }
}

export function makeEmptyPalette(name, role) {
  const size = role === 'background' ? BG_DEFAULT : CHARACTER_SIZE;
  return {
    name,
    role,
    hueOffsetFromAnchor: 0,
    swatches: new Array(size).fill(null).map(() => makeSwatch(0, 0, 50)),
  };
}

export function nextCharacterOffset(state) {
  const offsets = characterHueOffsets(
    state.activeHarmony || state.masterHarmony,
    state.characters.length + 1,
  );
  return offsets[state.characters.length];
}

export function addCharacter(state, name) {
  const palette = makeEmptyPalette(name, 'character');
  palette.hueOffsetFromAnchor = nextCharacterOffset(state);
  state.characters.push(palette);
  generateCharacter(palette, state.anchorHue);
  return palette;
}

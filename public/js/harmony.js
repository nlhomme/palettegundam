import { normHue } from './color.js';

export const HARMONIES = [
  'monochromatic',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'square',
];

export const HARMONY_LABELS = {
  auto: 'Auto',
  monochromatic: 'Monochromatic',
  analogous: 'Analogous',
  complementary: 'Complementary',
  'split-complementary': 'Split-complementary',
  triadic: 'Triadic',
  tetradic: 'Tetradic',
  square: 'Square',
};

const AUTO_WEIGHTS = [
  ['split-complementary', 3],
  ['analogous', 3],
  ['triadic', 2],
  ['complementary', 2],
  ['tetradic', 1],
  ['square', 1],
  ['monochromatic', 1],
];

export function pickAutoHarmony(rng = Math.random) {
  const total = AUTO_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [name, w] of AUTO_WEIGHTS) {
    r -= w;
    if (r <= 0) return name;
  }
  return AUTO_WEIGHTS[0][0];
}

// Base spokes (hue offsets) for each harmony. The first spoke is always 0
// (the anchor). Character palettes use spokes 1..N, looping with analogous
// drift when there are more characters than spokes.
const BASE_SPOKES = {
  monochromatic: [0],
  analogous: [0, 30, -30, 60, -60, 90],
  complementary: [0, 180],
  'split-complementary': [0, 150, 210],
  triadic: [0, 120, 240],
  tetradic: [0, 60, 180, 240],
  square: [0, 90, 180, 270],
};

export function characterHueOffsets(harmony, count) {
  const spokes = BASE_SPOKES[harmony] ?? BASE_SPOKES.analogous;
  // Skip spoke[0] (= the anchor; reserved for the background).
  const charSpokes = spokes.slice(1);
  if (charSpokes.length === 0) {
    // monochromatic — all characters share the anchor hue, generator varies S/L
    return new Array(count).fill(0);
  }
  const offsets = [];
  for (let i = 0; i < count; i++) {
    const base = charSpokes[i % charSpokes.length];
    const lap = Math.floor(i / charSpokes.length);
    // Each extra lap nudges by ±20° to avoid identical palettes.
    const drift = lap === 0 ? 0 : (lap % 2 === 1 ? 20 : -20) * Math.ceil(lap / 2);
    offsets.push(normHue(base + drift));
  }
  return offsets;
}

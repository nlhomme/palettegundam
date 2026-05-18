// Rasterize the brand color-wheel SVG into the PNG sizes needed for
// iOS apple-touch-icon and Android web-app manifest icons.
// Run: npm run build:icons

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(here, '..', 'public');
const BG = '#0e0e10';

const WHEEL_PATHS = [
  ['M16,16 L16,0 A16,16 0 0,1 31.22,11.06 Z', '#ff6b3d'],
  ['M16,16 L31.22,11.06 A16,16 0 0,1 25.41,28.94 Z', '#ffd166'],
  ['M16,16 L25.41,28.94 A16,16 0 0,1 6.59,28.94 Z', '#06d6a0'],
  ['M16,16 L6.59,28.94 A16,16 0 0,1 0.78,11.06 Z', '#118ab2'],
  ['M16,16 L0.78,11.06 A16,16 0 0,1 16,0 Z', '#ef476f'],
];

function buildSvg({ size, paddingPct = 0, bg = BG }) {
  const padding = Math.round((size * paddingPct) / 100);
  const wheel = size - padding * 2;
  const scale = wheel / 32;
  const paths = WHEEL_PATHS
    .map(([d, fill]) => `<path d="${d}" fill="${fill}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <g transform="translate(${padding},${padding}) scale(${scale})">${paths}</g>
</svg>`;
}

async function rasterize(svg, size, outName) {
  const out = path.join(pub, outName);
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log('wrote', outName);
}

await rasterize(buildSvg({ size: 180 }), 180, 'apple-touch-icon.png');
await rasterize(buildSvg({ size: 192 }), 192, 'icon-192.png');
await rasterize(buildSvg({ size: 512 }), 512, 'icon-512.png');
// Maskable: Android may crop up to ~20% from any edge. Keep the wheel inside
// the central 80% safe zone with the brand background filling the corners.
await rasterize(buildSvg({ size: 512, paddingPct: 15 }), 512, 'icon-512-maskable.png');

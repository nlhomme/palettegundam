import { hslToHex, hslToHsv, hslToRgb } from './color.js';
import { buildZip } from './zip.js';

function safeName(name) {
  return name.replace(/[^\w\- ]+/g, '').trim() || 'Palette';
}

function paletteSwatchesJson(palette) {
  return {
    name: safeName(palette.name),
    swatches: palette.swatches.map((sw) => {
      const [h, s, v] = hslToHsv(sw.h, sw.s, sw.l);
      return {
        hue: h / 360,
        saturation: s / 100,
        brightness: v / 100,
        alpha: 1,
        colorSpace: 0,
      };
    }),
  };
}

export function procreateSwatchesBlob(palette) {
  const json = JSON.stringify(paletteSwatchesJson(palette));
  const zip = buildZip([{ name: 'Swatches.json', data: json }]);
  return new Blob([zip], { type: 'application/octet-stream' });
}

export function procreateBundleBlob(state) {
  const all = [state.background, ...state.characters];
  const files = all.map((p) => {
    const innerZip = buildZip([{ name: 'Swatches.json', data: JSON.stringify(paletteSwatchesJson(p)) }]);
    return { name: `${safeName(p.name)}.swatches`, data: innerZip };
  });
  const outer = buildZip(files);
  return new Blob([outer], { type: 'application/zip' });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function paletteToCss(state) {
  const lines = ['/* Palette Gundam */', ':root {'];
  const emit = (palette, prefix) => {
    palette.swatches.forEach((sw, i) => {
      lines.push(`  --${prefix}-${i + 1}: ${hslToHex(sw.h, sw.s, sw.l)};`);
    });
  };
  emit(state.background, 'bg');
  state.characters.forEach((c, i) => emit(c, `char${i + 1}`));
  lines.push('}');
  return lines.join('\n') + '\n';
}

export function paletteToJson(state) {
  const dump = {
    harmony: state.activeHarmony,
    anchorHue: state.anchorHue,
    background: paletteDump(state.background),
    characters: state.characters.map(paletteDump),
  };
  return JSON.stringify(dump, null, 2) + '\n';
}

function paletteDump(p) {
  return {
    name: p.name,
    colors: p.swatches.map((sw) => ({
      hex: hslToHex(sw.h, sw.s, sw.l),
      hsl: [Math.round(sw.h), Math.round(sw.s), Math.round(sw.l)],
    })),
  };
}

export function paletteToPngBlob(state) {
  const palettes = [state.background, ...state.characters];
  const swatchW = 160, swatchH = 160, headerH = 44, padding = 24;
  const rowCells = 5; // characters set the row width
  const width = padding * 2 + rowCells * swatchW;
  const rows = palettes.length;
  const height = padding * 2 + rows * (headerH + swatchH);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0e0e10';
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = 'middle';

  palettes.forEach((p, rowIdx) => {
    const y0 = padding + rowIdx * (headerH + swatchH);
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillStyle = '#f3f3f5';
    ctx.fillText(`${p.name}`, padding, y0 + headerH / 2);

    const cellW = (rowCells * swatchW) / p.swatches.length;
    p.swatches.forEach((sw, colIdx) => {
      const [r, g, b] = hslToRgb(sw.h, sw.s, sw.l);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(padding + colIdx * cellW, y0 + headerH, cellW, swatchH);
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      ctx.fillStyle = luma > 140 ? '#111' : '#fafafa';
      ctx.font = '500 14px ui-monospace, monospace';
      ctx.fillText(hslToHex(sw.h, sw.s, sw.l), padding + colIdx * cellW + 12, y0 + headerH + swatchH - 18);
    });
  });

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

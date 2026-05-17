import { HARMONIES } from './harmony.js';
import { hexToHsl, hslToHex, hslToRgb, readableTextHex, relativeLuminance } from './color.js';
import {
  addBackgroundSwatch,
  addCharacter,
  BG_MAX,
  BG_MIN,
  CHARACTER_ROLES,
  generateAll,
  regeneratePalette,
  removeBackgroundSwatch,
} from './generator.js';
import {
  paletteToCss,
  paletteToJson,
  paletteToPngBlob,
  procreateBundleBlob,
  procreateSwatchesBlob,
  downloadBlob,
} from './exporters.js';
import { postShare } from './state.js';
import { otherLanguage, setLanguage, t } from './i18n.js';

export function mountUI(state, hooks = {}) {
  const root = document.getElementById('palettes');
  const harmonySelect = document.getElementById('harmony-select');
  const regenAllBtn = document.getElementById('regen-all');
  const fabBtn = document.getElementById('fab-regen');
  const addCharBtn = document.getElementById('add-character');
  const exportBtn = document.getElementById('export-btn');
  const exportMenu = document.getElementById('export-menu');
  const shareBtn = document.getElementById('share-btn');
  const toast = document.getElementById('toast');
  const hexDialog = document.getElementById('hex-dialog');
  const hexInput = document.getElementById('hex-input');
  const hexForm = document.getElementById('hex-form');
  const hexCancel = document.getElementById('hex-cancel');
  const langToggleBtn = document.getElementById('lang-toggle');
  const langToggleLabel = document.getElementById('lang-toggle-label');

  let pendingHexEdit = null;

  function changed() {
    render();
    hooks.onStateChanged?.();
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 1600);
  }

  // -------- Harmony dropdown --------
  function populateHarmonyOptions() {
    const all = ['auto', ...HARMONIES];
    harmonySelect.innerHTML = all
      .map((k) => `<option value="${k}">${t('harmony.' + k)}</option>`)
      .join('');
    harmonySelect.value = state.masterHarmony;
  }

  function updateLangToggle() {
    langToggleLabel.textContent = otherLanguage().toUpperCase();
  }

  // -------- Render --------
  function render() {
    harmonySelect.value = state.masterHarmony;
    root.innerHTML = '';
    root.appendChild(renderPalette(state.background, { isBackground: true }));
    state.characters.forEach((p, idx) => {
      root.appendChild(renderPalette(p, { isBackground: false, charIdx: idx }));
    });
  }

  function renderPalette(palette, opts) {
    const el = document.createElement('section');
    el.className = 'palette';
    el.dataset.role = palette.role;

    const header = document.createElement('div');
    header.className = 'palette-header';

    const nameInput = document.createElement('input');
    nameInput.className = 'palette-name';
    nameInput.value = palette.name;
    nameInput.spellcheck = false;
    nameInput.addEventListener('change', () => {
      palette.name = nameInput.value.trim() || palette.name;
      changed();
    });
    header.appendChild(nameInput);

    if (opts.isBackground) {
      const minusBtn = iconButton('−', t('title.removeBgColor'), () => {
        if (removeBackgroundSwatch(state)) changed();
        else showToast(t('toast.bgMin', { n: BG_MIN }));
      });
      minusBtn.disabled = palette.swatches.length <= BG_MIN;
      if (minusBtn.disabled) minusBtn.style.opacity = '0.35';
      header.appendChild(minusBtn);

      const plusBtn = iconButton('+', t('title.addBgColor'), () => {
        if (addBackgroundSwatch(state)) changed();
        else showToast(t('toast.bgMax', { n: BG_MAX }));
      });
      plusBtn.disabled = palette.swatches.length >= BG_MAX;
      if (plusBtn.disabled) plusBtn.style.opacity = '0.35';
      header.appendChild(plusBtn);
    }

    const regenBtn = iconButton('↻', t('title.regenThis'), () => {
      regeneratePalette(state, palette);
      changed();
    });
    header.appendChild(regenBtn);

    const exportOne = iconButton('⤓', t('title.exportOne'), () => {
      const blob = procreateSwatchesBlob(palette);
      downloadBlob(blob, `${safeFile(palette.name)}.swatches`);
    });
    header.appendChild(exportOne);

    if (!opts.isBackground) {
      const removeBtn = iconButton('✕', t('title.removeChar'), () => {
        if (state.characters.length <= 1) {
          showToast(t('toast.charMin'));
          return;
        }
        const i = state.characters.indexOf(palette);
        if (i >= 0) state.characters.splice(i, 1);
        changed();
      });
      header.appendChild(removeBtn);
    }

    el.appendChild(header);

    const swatchesEl = document.createElement('div');
    swatchesEl.className = 'swatches';
    palette.swatches.forEach((sw, swIdx) => {
      swatchesEl.appendChild(renderSwatch(palette, sw, swIdx));
    });
    el.appendChild(swatchesEl);

    return el;
  }

  function renderSwatch(palette, swatch, idx) {
    const el = document.createElement('div');
    el.className = 'swatch';
    if (swatch.locked) el.classList.add('locked');
    el.tabIndex = 0;
    el.draggable = true;
    el.dataset.idx = String(idx);

    const [r, g, b] = hslToRgb(swatch.h, swatch.s, swatch.l);
    const bg = hslToHex(swatch.h, swatch.s, swatch.l);
    const fg = readableTextHex(r, g, b);
    el.style.setProperty('--sw-bg', bg);
    el.style.setProperty('--sw-fg', fg);
    if (relativeLuminance(r, g, b) < 0.5) el.classList.add('dark');

    const hex = document.createElement('div');
    hex.className = 'swatch-hex';
    hex.textContent = bg.toUpperCase();
    el.appendChild(hex);

    const meta = document.createElement('div');
    meta.className = 'swatch-meta';
    if (palette.role === 'character' && CHARACTER_ROLES[idx]) {
      meta.textContent = t('role.' + CHARACTER_ROLES[idx]);
    } else {
      meta.textContent = `H ${Math.round(swatch.h)}° · S ${Math.round(swatch.s)}% · L ${Math.round(swatch.l)}%`;
    }
    el.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'swatch-actions';

    const lockBtn = document.createElement('button');
    lockBtn.className = 'swatch-action';
    lockBtn.title = swatch.locked ? t('title.unlock') : t('title.lock');
    lockBtn.textContent = swatch.locked ? '🔒' : '🔓';
    lockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      swatch.locked = !swatch.locked;
      changed();
    });
    actions.appendChild(lockBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'swatch-action';
    editBtn.title = t('title.editHex');
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openHexEditor(palette, idx);
    });
    actions.appendChild(editBtn);

    el.appendChild(actions);

    // Click body: copy hex.
    el.addEventListener('click', (e) => {
      if (e.target.closest('.swatch-action')) return;
      copyToClipboard(bg.toUpperCase()).then(() => showToast(t('toast.copied', { hex: bg.toUpperCase() })));
    });

    // Keyboard: L lock, C copy.
    el.addEventListener('keydown', (e) => {
      if (e.key === 'l' || e.key === 'L') {
        swatch.locked = !swatch.locked;
        changed();
      } else if (e.key === 'c' || e.key === 'C') {
        copyToClipboard(bg.toUpperCase()).then(() => showToast(t('toast.copied', { hex: bg.toUpperCase() })));
      }
    });

    // Drag-and-drop within palette.
    el.addEventListener('dragstart', (e) => {
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `${paletteIdent(palette)}|${idx}`);
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', (e) => {
      const data = e.dataTransfer.types.includes('text/plain');
      if (!data) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drop-target');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drop-target');
      const payload = e.dataTransfer.getData('text/plain');
      if (!payload) return;
      const [srcIdent, srcIdxStr] = payload.split('|');
      if (srcIdent !== paletteIdent(palette)) return; // same-palette only
      const srcIdx = Number(srcIdxStr);
      if (srcIdx === idx || Number.isNaN(srcIdx)) return;
      const [moved] = palette.swatches.splice(srcIdx, 1);
      palette.swatches.splice(idx, 0, moved);
      changed();
    });

    return el;
  }

  function paletteIdent(palette) {
    return palette === state.background ? 'bg' : 'c' + state.characters.indexOf(palette);
  }

  function iconButton(label, title, onClick) {
    const b = document.createElement('button');
    b.className = 'icon-btn';
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', onClick);
    return b;
  }

  // -------- Hex editor --------
  function openHexEditor(palette, idx) {
    pendingHexEdit = { palette, idx };
    const sw = palette.swatches[idx];
    hexInput.value = hslToHex(sw.h, sw.s, sw.l).toUpperCase();
    hexDialog.showModal();
    hexInput.select();
  }

  hexForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pendingHexEdit) { hexDialog.close(); return; }
    const hsl = hexToHsl(hexInput.value);
    if (!hsl) { showToast(t('toast.invalidHex')); return; }
    const sw = pendingHexEdit.palette.swatches[pendingHexEdit.idx];
    [sw.h, sw.s, sw.l] = hsl;
    pendingHexEdit = null;
    hexDialog.close();
    changed();
  });
  hexCancel.addEventListener('click', () => {
    pendingHexEdit = null;
    hexDialog.close();
  });

  // -------- Top bar wiring --------
  populateHarmonyOptions();

  harmonySelect.addEventListener('change', () => {
    state.masterHarmony = harmonySelect.value;
    generateAll(state);
    changed();
  });

  function regenAll() {
    generateAll(state);
    changed();
  }
  regenAllBtn.addEventListener('click', regenAll);
  fabBtn.addEventListener('click', regenAll);

  addCharBtn.addEventListener('click', () => {
    addCharacter(state, t('palette.character', { n: state.characters.length + 1 }));
    changed();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.target instanceof HTMLSelectElement) return;
    if (hexDialog.open) return;
    if (e.code === 'Space') {
      e.preventDefault();
      regenAll();
    }
  });

  // -------- Export menu --------
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.hidden = !exportMenu.hidden;
  });
  document.addEventListener('click', (e) => {
    if (!exportMenu.contains(e.target) && e.target !== exportBtn) exportMenu.hidden = true;
  });
  exportMenu.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-export]');
    if (!btn) return;
    exportMenu.hidden = true;
    const kind = btn.dataset.export;
    try {
      if (kind === 'procreate-all') {
        downloadBlob(procreateBundleBlob(state), 'palette-gundam.zip');
      } else if (kind === 'procreate-each') {
        [state.background, ...state.characters].forEach((p) => {
          downloadBlob(procreateSwatchesBlob(p), `${safeFile(p.name)}.swatches`);
        });
      } else if (kind === 'png') {
        const blob = await paletteToPngBlob(state);
        downloadBlob(blob, 'palette-gundam.png');
      } else if (kind === 'css') {
        downloadBlob(new Blob([paletteToCss(state)], { type: 'text/css' }), 'palette.css');
      } else if (kind === 'json') {
        downloadBlob(new Blob([paletteToJson(state)], { type: 'application/json' }), 'palette.json');
      }
    } catch (err) {
      console.error(err);
      showToast(t('toast.exportFailed'));
    }
  });

  // -------- Share --------
  shareBtn.addEventListener('click', async () => {
    try {
      const code = await postShare(state);
      const url = new URL(window.location.href);
      url.search = '?s=' + code;
      url.hash = '';
      history.replaceState(null, '', url.toString());
      await copyToClipboard(url.toString());
      showToast(t('toast.shareCopied'));
    } catch (err) {
      console.error(err);
      showToast(t('toast.shareFailed'));
    }
  });

  // -------- Language toggle --------
  updateLangToggle();
  langToggleBtn.addEventListener('click', () => {
    setLanguage(otherLanguage());
    populateHarmonyOptions();
    updateLangToggle();
    render();
  });

  // Initial render
  render();

  return { render, showToast };
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
    resolve();
  });
}

function safeFile(name) {
  return (name || 'palette').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'palette';
}

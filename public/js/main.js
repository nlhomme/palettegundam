import { decodeStateFromHash, encodeStateToHash, fetchShare, freshState } from './state.js';
import { mountUI } from './ui.js';
import { initI18n, t } from './i18n.js';

async function bootstrap() {
  initI18n();
  let state = null;

  // 1. Short share code in query string?
  const params = new URLSearchParams(window.location.search);
  const code = params.get('s');
  if (code) {
    try {
      const fromKv = await fetchShare(code);
      if (fromKv) state = fromKv;
    } catch (e) {
      console.warn('Share fetch failed', e);
    }
    // Strip ?s= and put state into hash so reload works without the API.
    if (state) {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = encodeStateToHash(state);
      history.replaceState(null, '', url.toString());
    }
  }

  // 2. State in URL hash?
  if (!state && window.location.hash) {
    const fromHash = decodeStateFromHash(window.location.hash);
    if (fromHash) state = fromHash;
  }

  // 3. Default: fresh random palette.
  if (!state) state = freshState();

  const ui = mountUI(state, {
    onStateChanged: () => {
      const hash = '#' + encodeStateToHash(state);
      // replaceState to avoid spamming history.
      history.replaceState(null, '', window.location.pathname + hash);
    },
  });

  // Trigger initial URL sync.
  history.replaceState(null, '', window.location.pathname + '#' + encodeStateToHash(state));
}

bootstrap().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre style="color:#f99;padding:12px">${t('boot.error', { msg: err?.message || err })}</pre>`,
  );
});

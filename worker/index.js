const SHARE_TTL_SECONDS = 60 * 60 * 24 * 90;
const CODE_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const CODE_LENGTH = 7;
const MAX_BODY_BYTES = 16 * 1024;

function randomCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/api/share' && req.method === 'POST') {
      const raw = await req.text();
      if (raw.length > MAX_BODY_BYTES) return new Response('Payload too large', { status: 413 });
      let state;
      try { state = JSON.parse(raw); } catch { return new Response('Invalid JSON', { status: 400 }); }
      if (!state || typeof state !== 'object') return new Response('Invalid state', { status: 400 });
      const code = randomCode();
      await env.PALETTES.put(code, JSON.stringify(state), { expirationTtl: SHARE_TTL_SECONDS });
      return jsonResponse({ code });
    }

    if (url.pathname.startsWith('/api/share/') && req.method === 'GET') {
      const code = url.pathname.slice('/api/share/'.length);
      if (!/^[a-z0-9]{1,16}$/.test(code)) return new Response('Bad code', { status: 400 });
      const data = await env.PALETTES.get(code);
      if (!data) return new Response('Not found', { status: 404 });
      return new Response(data, { headers: { 'content-type': 'application/json' } });
    }

    return env.ASSETS.fetch(req);
  },
};

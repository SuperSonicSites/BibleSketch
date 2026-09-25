// Runs before every page and endpoint the Worker renders (static files in dist/client never reach it).
import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { useEmulator } from './lib/firestore.ts';
import { allowUnsignedTokens } from './lib/id-token.ts';

// Rollback switch. On biblesketch.app the Worker is bound to route patterns (ROADMAP 1). LIVE_PREFIXES (a
// wrangler var, comma-separated) lists the paths it may answer; any other request on those routes goes to the
// origin (Firebase Hosting) untouched. Unset = everything live (workers.dev, local dev). Rolling back a page is
// a deploy with its prefix removed, not a dashboard edit.
const live = (pathname: string) => {
  const list = (env as { LIVE_PREFIXES?: string }).LIVE_PREFIXES;
  if (!list) return true;
  return list.split(',').some((p) => (p = p.trim()) && (pathname === p || pathname.startsWith(`${p}/`)));
};

// Local end-to-end tests only: FIRESTORE_EMULATOR (in .dev.vars, e.g. "localhost:8080") sends server-side
// Firestore reads to the emulator and accepts the Auth emulator's unsigned tokens. Honoured only when the
// request itself is for localhost, so a stray variable in production can never switch it on.
let emulated = false;
const emulator = (env as { FIRESTORE_EMULATOR?: string }).FIRESTORE_EMULATOR;

export const onRequest = defineMiddleware((ctx, next) => {
  const { pathname, search, host, hostname } = ctx.url;
  if (emulator && hostname === 'localhost' && !emulated) {
    useEmulator(emulator);
    allowUnsignedTokens();
    emulated = true;
  }
  if (host === 'biblesketch.app' && !live(pathname)) return fetch(ctx.request);
  // Same canonical form as the Firebase render functions: no trailing or doubled slashes.
  const clean = `/${pathname.split('/').filter(Boolean).join('/')}`;
  if (clean !== pathname) {
    return new Response(null, { status: 301, headers: { Location: clean + search, 'Cache-Control': 'public, max-age=300' } });
  }
  if (pathname.startsWith('/checkout/')) return withCheckoutPolicy(ctx.url.origin, next());
  return next();
});

// The payment pages (/checkout/*) carry a strict Content-Security-Policy. Scripts may only come from our build
// (/_astro/), from Google sign-in, or be the inline scripts this response really contains (hashed here); frames may
// only be Zoho's payment form and our own auth frame. So anything added to the page after it leaves us, such as the
// Zaraz trackers Cloudflare injects, is refused: payment pages carry no third-party scripts.
const toBase64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function withCheckoutPolicy(origin: string, pending: Promise<Response>) {
  const res = await pending;
  if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res;
  const html = await res.text();
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const hashes = await Promise.all(inline.map(async (body) =>
    `'sha256-${toBase64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)))}'`));
  // Local previews talk to the emulators (functions, auth and its sign-in frame, Firestore).
  const local = origin.startsWith('http://localhost') ? ' http://localhost:5001 http://localhost:9099 http://localhost:8080' : '';
  const policy = [
    "default-src 'self'",
    `script-src ${origin}/_astro/ https://apis.google.com ${[...new Set(hashes)].join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src 'self' https://*.googleapis.com https://us-central1-biblesketch-5104c.cloudfunctions.net${local}`,
    `frame-src 'self' https://*.zohosecure.ca${local ? ' http://localhost:9099' : ''}`,
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
  ].join('; ');
  const headers = new Headers(res.headers);
  headers.set('Content-Security-Policy', policy);
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
}

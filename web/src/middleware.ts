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
  return next();
});

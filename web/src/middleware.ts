// Runs before every page and endpoint the Worker renders (static files in dist/client never reach it).
import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';

// Rollback switch. On biblesketch.app the Worker is bound to route patterns (ROADMAP 1). LIVE_PREFIXES (a
// wrangler var, comma-separated) lists the paths it may answer; any other request on those routes goes to the
// origin (Firebase Hosting) untouched. Unset = everything live (workers.dev, local dev). Rolling back a page is
// a deploy with its prefix removed, not a dashboard edit.
const live = (pathname: string) => {
  const list = (env as { LIVE_PREFIXES?: string }).LIVE_PREFIXES;
  if (!list) return true;
  return list.split(',').some((p) => (p = p.trim()) && (pathname === p || pathname.startsWith(`${p}/`)));
};

export const onRequest = defineMiddleware((ctx, next) => {
  const { pathname, search, host } = ctx.url;
  if (host === 'biblesketch.app' && !live(pathname)) return fetch(ctx.request);
  // Same canonical form as the Firebase render functions: no trailing or doubled slashes.
  const clean = `/${pathname.split('/').filter(Boolean).join('/')}`;
  if (clean !== pathname) {
    return new Response(null, { status: 301, headers: { Location: clean + search, 'Cache-Control': 'public, max-age=300' } });
  }
  return next();
});

// POST /api/purge  { ids: string[], lists?: string[] }  header x-purge-secret: <PURGE_SECRET>
// Called by the onSketchWritten Cloud Function when a sketch is published, made private, deleted or retagged.
// Drops, globally, every cached response tagged sketch:<id> (the page, its slug redirects, its 404) and
// related:<id> (other pages that list the sketch in their related grid). `lists` adds the listing pages a newly
// published sketch should appear on right away: gallery, home, verse, tag:<id>, profile:<uid>, img.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const MAX_IDS = 40; // 2 tags per id + up to 20 lists; a purge call takes up to 100 tags
// img: every /img/ response (after changing image headers, docs/seo-plan.md stage 2); pages: static pages such as
// /pricing, /about, /terms; blog: every blog post (after copy changes, stage 5); stories: /coloring-pages and
// story and verse collections (stage 9).
const LIST = /^(gallery|home|verse|img|pages|blog|stories|tag:[a-z-]{1,30}|profile:[A-Za-z0-9]{1,128})$/;

// Constant-time compare so the secret can't be guessed byte by byte from response timing.
async function secretMatches(given: string, expected: string) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all(
    [given, expected].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))),
  );
  return crypto.subtle.timingSafeEqual(a, b);
}

export const POST: APIRoute = async ({ request, cache }) => {
  cache.set(false);
  const expected = (env as { PURGE_SECRET?: string }).PURGE_SECRET;
  if (!expected) return new Response('purge not configured', { status: 503 });
  if (!(await secretMatches(request.headers.get('x-purge-secret') ?? '', expected))) {
    return new Response('unauthorized', { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { ids?: unknown; lists?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];
  if (ids.length === 0 || ids.length > MAX_IDS) return new Response(`ids: 1-${MAX_IDS} strings`, { status: 400 });
  const lists = (Array.isArray(body?.lists) ? body.lists : []).filter((x): x is string => typeof x === 'string' && LIST.test(x)).slice(0, 20);
  try {
    await cache.invalidate({ tags: [...ids.flatMap((id) => [`sketch:${id}`, `related:${id}`]), ...lists] });
  } catch (e) {
    // Local workerd has no Workers Cache (cache.purge is undefined); in production this is a real failure the
    // caller must log.
    console.error('[purge]', ids, e);
    return new Response(`purge failed: ${(e as Error).message}`, { status: 502 });
  }
  return Response.json({ purged: ids.length });
};

export const ALL: APIRoute = () => new Response('method not allowed', { status: 405, headers: { allow: 'POST' } });

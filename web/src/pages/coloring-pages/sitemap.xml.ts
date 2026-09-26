// /coloring-pages/sitemap.xml (docs/seo-plan.md stage 9): the indexable story and verse collections, listed from the
// same rules the pages use (stories with STORY_MIN+ owner pages, verses with VERSE_MIN+). The Firebase sitemap index
// (functions/index.js section 1) points here, because only the Worker knows the story ranges.
import type { APIRoute } from 'astro';
import { ORIGIN, type Sketch, slugOf } from '../../lib/sketch.ts';
import { STORIES, STORY_MIN, VERSE_MIN, allOwnerPages, pagesOfStory } from '../../lib/stories.ts';

const newest = (pages: Sketch[]) => pages.map((s) => s.createdAt ?? '').sort().pop() || undefined;

export const GET: APIRoute = async ({ cache }) => {
  let all: Sketch[];
  try {
    all = await allOwnerPages();
  } catch (e) {
    console.error('[collections sitemap]', e);
    cache.set(false);
    return new Response('temporarily unavailable', { status: 503, headers: { 'Retry-After': '120' } });
  }
  const urls: { loc: string; lastmod?: string }[] = [{ loc: `${ORIGIN}/coloring-pages`, lastmod: newest(all) }];
  for (const st of STORIES) {
    const pages = pagesOfStory(st, all);
    if (pages.length >= STORY_MIN) urls.push({ loc: `${ORIGIN}/coloring-pages/${st.id}`, lastmod: newest(pages) });
  }
  const verses = new Map<string, Sketch[]>();
  for (const s of all) verses.set(slugOf(s), [...(verses.get(slugOf(s)) ?? []), s]);
  for (const [slug, pages] of verses) {
    if (pages.length >= VERSE_MIN) urls.push({ loc: `${ORIGIN}/coloring-page/${slug}`, lastmod: newest(pages) });
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + urls.map((u) => `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('')
    + '</urlset>';
  cache.set({ maxAge: 3600, tags: ['stories'] });
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};

// GET /pins/<board>.xml: the RSS 2.0 feed Pinterest auto-publishes to one board (src/lib/pins.ts).
// Pinterest: <title> → Pin title, <description> → description, image from <enclosure>/<media:content>,
// <link> must be on the claimed domain.
import type { APIRoute } from 'astro';
import { BOARDS, dueEntries, masterSketch, pageUrl, pinFile } from '../../lib/pins.ts';
import { ORIGIN } from '../../lib/sketch.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ params, cache }) => {
  const board = params.board ?? '';
  if (!(BOARDS as readonly string[]).includes(board)) return new Response('not found', { status: 404 });

  let items: string[];
  try {
    const due = dueEntries(board);
    const live = await Promise.all(due.map((e) => masterSketch(e.sketchId)));
    items = due.filter((_, i) => live[i]).map((e) => {
      const img = `${ORIGIN}/pin-img/${pinFile(e)}.png`;
      const link = `${pageUrl(e)}?utm_source=pinterest&amp;utm_medium=social&amp;utm_campaign=rss-${board}`;
      return `<item>
<title>${esc(e.title)}</title>
<link>${link}</link>
<description>${esc(e.description)}</description>
<guid isPermaLink="false">${esc(e.sketchId)}</guid>
<pubDate>${new Date(`${e.release}T12:00:00Z`).toUTCString()}</pubDate>
<enclosure url="${img}" length="0" type="image/png"/>
<media:content url="${img}" medium="image" type="image/png"${e.template === 'plain' ? '' : ' width="1000" height="1500"'}/>
</item>`;
    });
  } catch (e) {
    // Firestore down: 503, so Pinterest retries later instead of reading an empty feed.
    console.error('[pins] feed', board, e);
    cache.set(false);
    return new Response('unavailable', { status: 503, headers: { 'Retry-After': '3600' } });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Bible Sketch: ${board.replace('-', ' ')} coloring pages</title>
<link>${ORIGIN}/</link>
<description>Printable Bible coloring pages from Bible Sketch.</description>
<language>en-us</language>
<atom:link href="${ORIGIN}/pins/${board}.xml" rel="self" type="application/rss+xml"/>
${items.join('\n')}
</channel>
</rss>
`;
  cache.set({ maxAge: 3600 });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};

// GET /pin-img/<pinFile>.png: the 1000x1500 Pin image for one calendar entry (src/lib/pins.ts), composed with
// the Images binding: white base, the sketch (3:4) at the top as 1000x1333, a 1000x167 banner at the bottom.
// Only calendar entries of public master sketches resolve, so this is not an open image proxy.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { entries, masterSketch, pinFile } from '../../lib/pins.ts';
import { storageUrl } from '../../lib/sketch.ts';

export const GET: APIRoute = async ({ params, request, cache }) => {
  const name = (params.file ?? '').replace(/\.png$/, '');
  const entry = entries.find((e) => e.approved && pinFile(e) === name);
  const sketch = entry && (await masterSketch(entry.sketchId));
  if (!entry || !sketch) {
    cache.set(false);
    return new Response('not found', { status: 404 });
  }
  const { ASSETS, IMAGES } = env as { ASSETS: Fetcher; IMAGES: ImagesBinding };
  const [art, base, banner] = await Promise.all([
    fetch(storageUrl(sketch.storagePath!)),
    ASSETS.fetch(new URL('/pin-base.png', request.url)),
    ASSETS.fetch(new URL(`/pin-banners/${entry.template}.png`, request.url)),
  ]);
  if (!art.ok || !art.body || !base.body || !banner.body) {
    cache.set(false);
    return new Response('unavailable', { status: 502 });
  }
  const out = await IMAGES.input(base.body)
    .draw(IMAGES.input(art.body).transform({ width: 1000, height: 1333, fit: 'scale-down' }), { top: 0, left: 0 })
    .draw(banner.body, { bottom: 0, left: 0 })
    .output({ format: 'image/png' });
  // The file name changes with the entry's template, and a sketch's image never changes in place (Add Ref makes a
  // new file), so the Pin image is cached for a year.
  cache.set({ maxAge: 31536000 });
  return new Response(out.response().body, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};

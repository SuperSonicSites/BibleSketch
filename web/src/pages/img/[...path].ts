// First-party images, converted by the Cloudflare Images binding and cached at the edge (ROADMAP S4):
//   /img/user_uploads/<uid>/sketches/<name>_400x533.<ext>  sketch thumbnail from Storage, as WebP
//     (saves the extra connection to firebasestorage.googleapis.com and ~60% of the bytes on the LCP image)
//   /img/w<width>/blog-images/<name>.webp                  a blog cover resized to one of WIDTHS
//   /img/w800/user_uploads/<MASTER_UID>/sketches/<name>.<ext>  the 800px preview of an owner page (search, og, share)
// Anything else is a 404, so this is not an open proxy (previews only for the owner's pages: never a larger
// copy of a community page, which may be private).
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { storageUrl } from '../../lib/sketch.ts';
import { MASTER_UID } from '../../lib/config.ts';

const THUMB = /^user_uploads\/[^/]+\/sketches\/[^/]+_400x533\.(png|jpe?g|webp)$/;
const COVER = /^w(\d+)\/(blog-images\/[\w.-]+\.webp)$/;
const COVER_WIDTHS = [480, 800];
const PREVIEW = new RegExp(`^w800\\/(user_uploads\\/${MASTER_UID}\\/sketches\\/[^/]+\\.(png|jpe?g|webp))$`);

const IMMUTABLE = 'public, max-age=31536000, immutable';

export const GET: APIRoute = async ({ params, request, cache }) => {
  const path = params.path ?? '';
  const cover = path.match(COVER);
  const preview = path.match(PREVIEW);
  let source: Response;
  let width: number | undefined;
  let immutable = false;
  if (THUMB.test(path)) {
    source = await fetch(storageUrl(path));
  } else if (preview) {
    source = await fetch(storageUrl(preview[1]));
    width = 800;
    immutable = true; // a new page gets a new path, like thumbnails
  } else if (cover && COVER_WIDTHS.includes(Number(cover[1]))) {
    width = Number(cover[1]);
    const env_ = env as { ASSETS: Fetcher };
    source = await env_.ASSETS.fetch(new URL(`/${cover[2]}`, request.url));
  } else {
    return new Response('not found', { status: 404 });
  }
  if (!source.ok || !source.body) {
    cache.set(false);
    return new Response('not found', { status: source.status === 404 ? 404 : 502 });
  }
  const images = (env as { IMAGES: ImagesBinding }).IMAGES;
  let img = images.input(source.body);
  if (width) img = img.transform({ width, fit: 'scale-down' });
  const out = (await img.output({ format: 'image/webp', quality: 85 })).response();
  // Thumbnails never change in place (a new sketch gets a new path). Covers could be replaced in place, so
  // browsers re-check them daily; purge the 'img' tag after replacing one.
  cache.set({ maxAge: 31536000, tags: ['img'] });
  const headers: Record<string, string> = {
    'Content-Type': 'image/webp', 'Cache-Control': width && !immutable ? 'public, max-age=86400' : IMMUTABLE,
  };
  // Community images stay out of Google Images wherever they appear (docs/seo-plan.md stage 2).
  if (path.startsWith('user_uploads/') && !path.startsWith(`user_uploads/${MASTER_UID}/`)) headers['X-Robots-Tag'] = 'noindex';
  return new Response(out.body, { headers });
};

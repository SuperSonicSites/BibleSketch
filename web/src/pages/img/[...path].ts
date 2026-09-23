// GET /img/<storage path of a _400x533 sketch thumbnail>  ->  the same image as WebP, first-party and cached.
// Saves the extra connection to firebasestorage.googleapis.com and ~60% of the bytes on the LCP image
// (ROADMAP S4). Only sketch thumbnails are proxied, so this is not an open proxy.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { storageUrl } from '../../lib/sketch.ts';

const THUMB = /^user_uploads\/[^/]+\/sketches\/[^/]+_400x533\.(png|jpe?g|webp)$/;

export const GET: APIRoute = async ({ params, cache }) => {
  const path = params.path ?? '';
  if (!THUMB.test(path)) return new Response('not found', { status: 404 });
  const upstream = await fetch(storageUrl(path));
  if (!upstream.ok || !upstream.body) {
    cache.set(false);
    return new Response('not found', { status: upstream.status === 404 ? 404 : 502 });
  }
  const images = (env as { IMAGES: ImagesBinding }).IMAGES;
  const out = await images.input(upstream.body).output({ format: 'image/webp', quality: 85 });
  // Thumbnails never change in place (a new sketch gets a new path).
  cache.set({ maxAge: 31536000, tags: ['img'] });
  const res = out.response();
  return new Response(res.body, {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};

// GET /api/free/<id>?t=<exp>.<sig>[&paper=a4]  ->  the Sunday Prep email's free page (plan §6.6, §12.4): the same
// PDF as the Print button, with no sign-in and no print spent, for a public sketch and an unexpired signed link.
// A forwarded link works for the friend too; that's word of mouth, and the PDF footer says biblesketch.app.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDoc } from '../../../lib/firestore.ts';
import { validFreeLink } from '../../../lib/free-link.ts';
import { printPdf } from '../../../lib/pdf.ts';
import { type Sketch, isDocId, reference, storageUrl } from '../../../lib/sketch.ts';

const page = (status: number, title: string, text: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
      `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1f2937">` +
      `<h1 style="font-size:1.5rem">${title}</h1><p>${text}</p><p><a href="/gallery" style="color:#7c3aed">See the gallery</a></p>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

export const GET: APIRoute = async ({ params, url, cache }) => {
  cache.set(false);
  const id = params.id ?? '';
  const secret = (env as { PURGE_SECRET?: string }).PURGE_SECRET;
  if (!isDocId(id) || !(await validFreeLink(secret, id, url.searchParams.get('t')))) {
    return page(410, 'This free page has expired', 'The free page from the Sunday Prep email is available for a few weeks. This week’s page is in the latest email.');
  }
  const sketch = (await getDoc('sketches', id)) as Sketch | null;
  if (!sketch?.isPublic) return page(404, 'Not found', 'This coloring page is no longer available.');
  const image = await fetch(sketch.storagePath ? storageUrl(sketch.storagePath) : sketch.imageUrl!);
  if (!image.ok) return page(502, 'Image unavailable', 'We could not load this image. Please try again in a minute.');
  const label = sketch.promptData ? reference(sketch.promptData) : 'Bible coloring page';
  return printPdf(image, label, url.searchParams.get('paper') === 'a4' ? 'a4' : 'letter', id);
};

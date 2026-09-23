// POST /api/download/<id>  (form: idToken)  ->  the full-size image as an attachment named bible-sketch-<id>.<ext>.
// Server-side so the file name and the download prompt work (the bucket has no CORS for the browser).
import type { APIRoute } from 'astro';
import { grantDownload } from '../../../lib/downloads.ts';

export const POST: APIRoute = async ({ params, request, cache }) => {
  cache.set(false);
  const id = params.id ?? '';
  const granted = await grantDownload(request, id);
  if (granted instanceof Response) return granted;
  const type = granted.image.headers.get('content-type') ?? 'image/png';
  const ext = type.includes('jpeg') ? 'jpg' : type.includes('webp') ? 'webp' : 'png';
  return new Response(granted.image.body, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `attachment; filename="bible-sketch-${id.replace(/[^\w-]/g, '')}.${ext}"`,
      'Cache-Control': 'no-store',
    },
  });
};

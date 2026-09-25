// POST /api/print/<id>  (form: idToken, paper=letter|a4)  ->  a one-page PDF, shown inline in a new tab, where
// the browser's own Print / Save as PDF scales it correctly (ROADMAP 1.2). The drawing is in lib/pdf.ts.
import type { APIRoute } from 'astro';
import { grantDownload } from '../../../lib/downloads.ts';
import { printPdf } from '../../../lib/pdf.ts';

export const POST: APIRoute = async ({ params, request, cache }) => {
  cache.set(false);
  const id = params.id ?? '';
  const paper = (await request.clone().formData().catch(() => null))?.get('paper') === 'a4' ? 'a4' : 'letter';
  const granted = await grantDownload(request, id);
  if (granted instanceof Response) return granted;
  return printPdf(granted.image, granted.label, paper, id);
};

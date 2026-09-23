// POST /api/print/<id>  (form: idToken, paper=letter|a4)  ->  a one-page PDF, shown inline in a new tab, where
// the browser's own Print / Save as PDF scales it correctly (ROADMAP 1.2). The image is fitted inside safe
// margins, with the verse reference and the site name in small type underneath.
import type { APIRoute } from 'astro';
import { grantDownload } from '../../../lib/downloads.ts';

const PAPER = { letter: [612, 792], a4: [595.28, 841.89] } as const; // points
const MARGIN = 28.8; // 0.4 in
const FOOTER = 22;

export const POST: APIRoute = async ({ params, request, cache }) => {
  cache.set(false);
  const id = params.id ?? '';
  const paper = (await request.clone().formData().catch(() => null))?.get('paper') === 'a4' ? 'a4' : 'letter';
  const granted = await grantDownload(request, id);
  if (granted instanceof Response) return granted;

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${granted.label} Coloring Page - Bible Sketch`);
  pdf.setCreator('biblesketch.app');
  const bytes = new Uint8Array(await granted.image.arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const img = isJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);

  const [w, h] = PAPER[paper];
  const pageDoc = pdf.addPage([w, h]);
  const boxW = w - 2 * MARGIN;
  const boxH = h - 2 * MARGIN - FOOTER;
  const scale = Math.min(boxW / img.width, boxH / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  pageDoc.drawImage(img, { x: (w - iw) / 2, y: MARGIN + FOOTER + (boxH - ih) / 2, width: iw, height: ih });

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const text = `${granted.label}  ·  biblesketch.app`;
  const size = 9;
  // The standard fonts are WinAnsi only: drop anything they can't encode rather than failing the whole print.
  const safe = [...text].filter((c) => { try { font.encodeText(c); return true; } catch { return false; } }).join('');
  pageDoc.drawText(safe, { x: (w - font.widthOfTextAtSize(safe, size)) / 2, y: MARGIN, size, font, color: rgb(0.42, 0.45, 0.5) });

  return new Response(await pdf.save(), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="bible-sketch-${id.replace(/[^\w-]/g, '')}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
};

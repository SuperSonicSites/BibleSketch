// Shared by POST /api/print/<id> and POST /api/download/<id>: who is asking, may they have this sketch, and
// spend one download from their quota (ROADMAP 1.2). The Worker acts with the visitor's own ID token, so
// Firestore's rules still decide what they can read and that the quota only goes down.
import { getDoc, setIntIfUnchanged, type Doc } from './firestore.ts';
import { TokenError, verifyIdToken } from './id-token.ts';
import { type Sketch, isDocId, reference, storageUrl } from './sketch.ts';
import { type Profile, unlimitedPrints } from './store.ts';

export interface Granted {
  sketch: Sketch;
  label: string; // "Genesis 1:3-5"
  image: Response; // the full-size original, already fetched
}

const page = (status: number, title: string, text: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>${title}</title>` +
      `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1f2937">` +
      `<h1 style="font-size:1.5rem">${title}</h1><p>${text}</p><p><a href="/" style="color:#7c3aed">Back to Bible Sketch</a></p>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

// Returns the sketch and its image, or an error page to send back as is.
export async function grantDownload(request: Request, id: string): Promise<Granted | Response> {
  if (!isDocId(id)) return page(404, 'Not found', 'This coloring page does not exist.');
  const form = await request.formData().catch(() => null);
  const token = form?.get('idToken');
  let uid: string;
  try {
    uid = await verifyIdToken(typeof token === 'string' ? token : null);
  } catch (e) {
    if (!(e instanceof TokenError)) throw e;
    return page(401, 'Please sign in again', 'Your session has expired. Sign in on Bible Sketch and try again.');
  }
  const t = token as string;

  // Read as the visitor: public sketches, or their own private one. A bookmark resolves to its original.
  let sketch = (await getDoc('sketches', id, t)) as Sketch | null;
  if (sketch?.isBookmark && (sketch as Doc).originalSketchId) {
    sketch = (await getDoc('sketches', (sketch as Doc).originalSketchId, t)) as Sketch | null;
  }
  if (!sketch || (!sketch.isPublic && sketch.userId !== uid)) {
    return page(404, 'Not found', 'This coloring page does not exist or is private.');
  }

  // Fetch first: a failed image must not cost a download (the rules don't allow giving one back).
  const image = await fetch(sketch.storagePath ? storageUrl(sketch.storagePath) : sketch.imageUrl!);
  if (!image.ok) return page(502, 'Image unavailable', 'We could not load this image. Please try again in a minute.');

  // Owners never spend a download on their own sketch; premium and dated passes are unlimited (2026-09-23/24).
  if (sketch.userId !== uid) {
    for (let attempt = 0; ; attempt++) {
      const user = await getDoc('users', uid, t);
      if (!user) return page(403, 'Account not found', 'Please sign in again and retry.');
      if (unlimitedPrints(user as Profile)) break;
      const left = Number(user.downloadsRemaining ?? 0);
      if (left < 1) {
        return page(402, 'No downloads left', 'You have used all your free downloads and prints. <a href="/pricing" style="color:#7c3aed">See Premium options</a>.');
      }
      if (await setIntIfUnchanged(user, 'users', 'downloadsRemaining', left - 1, t)) break;
      if (attempt >= 2) return page(409, 'Please try again', 'Your account was busy. Please try again.');
    }
  }
  return { sketch, label: sketch.promptData ? reference(sketch.promptData) : 'Bible coloring page', image };
}

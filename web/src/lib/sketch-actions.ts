// Signed-in actions on a sketch, ported from the live bundle. Browser-only; writes follow firestore.rules
// (bless = blessCount +1 and arrayUnion into the user's blessedSketchIds; bookmark = a private sketch doc
// bookmark_<uid>_<sketchId>).
import { getAuthClient, getDbClient, getStorageClient } from './firebase-client.ts';
import type { Sketch } from './sketch.ts';

// Letter where it's the norm (US, Canada, Mexico, Philippines and a few others), A4 everywhere else.
const LETTER = /-(US|CA|MX|PH|CL|CO|VE|GT|CR|PA|DO|SV|NI|HN|PR)$/i;
export const defaultPaper = () => (LETTER.test(navigator.language) ? 'letter' : 'a4');

// POST a hidden form carrying the visitor's ID token (never in a URL) to the Worker.
async function post(action: string, target: string, fields: Record<string, string>) {
  const { auth } = await getAuthClient();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in');
  const form = document.createElement('form');
  Object.assign(form, { method: 'POST', action, target });
  form.hidden = true;
  for (const [name, value] of Object.entries({ idToken: token, ...fields })) {
    const input = document.createElement('input');
    Object.assign(input, { type: 'hidden', name, value });
    form.append(input);
  }
  document.body.append(form);
  form.submit();
  form.remove();
}

// Print: the PDF opens in a new tab. The tab is opened synchronously inside the click (so popup blockers
// allow it), then the form is posted into it once the token is ready. Falls back to the current tab.
export function printSketch(sketchId: string) {
  const name = `print-${sketchId}`;
  const tab = window.open('about:blank', name);
  return post(`/api/print/${encodeURIComponent(sketchId)}`, tab ? name : '_self', { paper: defaultPaper() });
}

// Download: posted into a hidden iframe; the attachment response saves the file without leaving the page.
export function downloadSketch(sketchId: string) {
  let frame = document.querySelector<HTMLIFrameElement>('iframe[name="bs-download"]');
  if (!frame) {
    frame = Object.assign(document.createElement('iframe'), { name: 'bs-download', hidden: true });
    document.body.append(frame);
  }
  return post(`/api/download/${encodeURIComponent(sketchId)}`, 'bs-download', {});
}

// Owner actions (rules: the owner may change isPublic and tags, and delete).
export async function setVisibility(sketchId: string, isPublic: boolean) {
  const { db, fs } = await getDbClient();
  await fs.updateDoc(fs.doc(db, 'sketches', sketchId), { isPublic });
}

export async function setTags(sketchId: string, tags: string[]) {
  const { db, fs } = await getDbClient();
  await fs.updateDoc(fs.doc(db, 'sketches', sketchId), { tags });
}

// `FP`: delete the doc, then (for a real sketch, not a bookmark) its Storage files: the original, the stored
// thumbnail and both resize-extension variants. Missing files are fine.
export async function deleteSketch(s: Sketch) {
  const [{ db, fs }, { storage, st }] = await Promise.all([getDbClient(), getStorageClient()]);
  await fs.deleteDoc(fs.doc(db, 'sketches', s.id));
  if (s.isBookmark || !s.storagePath) return;
  const base = s.storagePath.replace(/\.[^./]+$/, '');
  const ext = s.storagePath.slice(base.length + 1) || 'png';
  const paths = new Set([s.storagePath, s.thumbnailPath, `${base}_400x533.${ext}`, `${base}_400x533.webp`].filter(Boolean) as string[]);
  await Promise.all([...paths].map((p) => st.deleteObject(st.ref(storage, p)).catch(() => {})));
}

// `Ip`. Resolves false when the user had already blessed it (the count must not move).
export async function blessSketch(uid: string, sketchId: string): Promise<boolean> {
  const { db, fs } = await getDbClient();
  const sketchRef = fs.doc(db, 'sketches', sketchId);
  const userRef = fs.doc(db, 'users', uid);
  return fs.runTransaction(db, async (tx) => {
    const user = await tx.get(userRef);
    if (user.exists() && (user.get('blessedSketchIds') ?? []).includes(sketchId)) return false;
    tx.update(sketchRef, { blessCount: fs.increment(1) });
    if (user.exists()) tx.update(userRef, { blessedSketchIds: fs.arrayUnion(sketchId) });
    return true;
  });
}

const bookmarkId = (uid: string, sketchId: string) => `bookmark_${uid}_${sketchId}`;

// `hS`
export async function isBookmarked(uid: string, sketchId: string): Promise<boolean> {
  const { db, fs } = await getDbClient();
  try {
    return (await fs.getDoc(fs.doc(db, 'sketches', bookmarkId(uid, sketchId)))).exists();
  } catch {
    return false;
  }
}

// `pS`: add or remove the bookmark copy. Returns the new state.
export async function toggleBookmark(uid: string, s: Sketch & { originalSketchId?: string; originalOwnerId?: string }): Promise<boolean> {
  const { db, fs } = await getDbClient();
  const original = s.originalSketchId || s.id;
  const ref = fs.doc(db, 'sketches', bookmarkId(uid, original));
  if ((await fs.getDoc(ref)).exists()) {
    await fs.deleteDoc(ref);
    return false;
  }
  const copy: Record<string, unknown> = {
    userId: uid,
    isBookmark: true,
    isPublic: false,
    createdAt: fs.serverTimestamp(),
    blessCount: 0,
    originalSketchId: original,
    originalOwnerId: s.originalOwnerId || s.userId,
    promptData: s.promptData,
    imageUrl: s.imageUrl,
    storagePath: s.storagePath,
    thumbnailPath: s.thumbnailPath,
  };
  // Firestore rejects undefined fields (e.g. sketches without a thumbnailPath).
  for (const k of Object.keys(copy)) if (copy[k] === undefined) delete copy[k];
  await fs.setDoc(ref, copy);
  return true;
}

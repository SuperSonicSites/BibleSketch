// Signed-in actions on a sketch, ported from the live bundle. Browser-only; writes follow firestore.rules
// (bless = blessCount +1 and arrayUnion into the user's blessedSketchIds; bookmark = a private sketch doc
// bookmark_<uid>_<sketchId>).
import { getDbClient } from './firebase-client.ts';
import type { Sketch } from './sketch.ts';

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

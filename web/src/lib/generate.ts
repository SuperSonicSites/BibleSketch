// Browser client for the generation callables (functions/index.js §15, createSketch / editSketch): one credit per
// generation, charged and refunded by the server. Called on the function's own URL, never through the
// biblesketch.app proxy (Cloudflare cuts requests at 100 s; a generation takes 30-120 s).
// The request id is kept in localStorage until an answer arrives, so a phone that drops the connection
// mid-generation picks up the same (already paid) result on its next visit instead of paying again.
import { FIREBASE } from './config.ts';
import { getAuthClient, getDbClient } from './firebase-client.ts';
import { openModal } from './store.ts';
import type { Sketch } from './sketch.ts';

export type GenResult =
  | { status: 'done'; sketchId: string; imageUrl: string }
  | { status: 'refunded'; error: 'INVALID_REFERENCE' | 'VERSE_TOO_LONG' | 'BLOCKED' | 'FAILED' | 'TIMEOUT' }
  | { status: 'running' };

export class CallError extends Error {
  constructor(public status: string, message: string) { super(message); }
}

const fnUrl = (name: string) => location.hostname === 'localhost'
  ? `http://localhost:5001/${FIREBASE.projectId}/us-central1/${name}`
  : `https://us-central1-${FIREBASE.projectId}.cloudfunctions.net/${name}`;

// Firebase callable protocol: POST {data}, answer {result} or {error: {status, message}}.
export async function callFunction<T>(name: string, data: unknown): Promise<T> {
  const { auth } = await getAuthClient();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new CallError('UNAUTHENTICATED', 'Please sign in.');
  const res = await fetch(fnUrl(name), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ data }),
  });
  const body = await res.json().catch(() => ({}));
  if (body.error) throw new CallError(body.error.status || 'INTERNAL', body.error.message || 'Something went wrong.');
  if (!res.ok) throw new CallError('INTERNAL', `HTTP ${res.status}`);
  return body.result as T;
}

const PENDING = 'bs_pending_generation';
type Pending = { fn: 'createSketch' | 'editSketch'; data: Record<string, unknown>; at: number };
const readPending = (): Pending | null => {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING) || 'null') as Pending | null;
    return p && Date.now() - p.at < 15 * 60 * 1000 ? p : null;
  } catch {
    return null;
  }
};
const writePending = (p: Pending | null) => {
  try {
    if (p) localStorage.setItem(PENDING, JSON.stringify(p));
    else localStorage.removeItem(PENDING);
  } catch { /* private mode: no resume, nothing else changes */ }
};

// Runs (or resumes) one paid generation until it is done or refunded. A second call with the same requestId
// only reads the server's ledger, so polling never charges again.
async function run(p: Pending): Promise<GenResult> {
  writePending(p);
  try {
    for (;;) {
      const r = await callFunction<GenResult>(p.fn, p.data);
      if (r.status !== 'running') {
        writePending(null);
        return r;
      }
      await new Promise((ok) => setTimeout(ok, 10000));
    }
  } catch (e) {
    // Rejected before any charge (no credits, bad input, limits): nothing to resume.
    if (e instanceof CallError) writePending(null);
    throw e;
  }
}

export const newRequestId = () => crypto.randomUUID();

export const createSketch = (data: Record<string, unknown>) =>
  run({ fn: 'createSketch', data: { requestId: newRequestId(), ...data }, at: Date.now() });

export const editSketch = (sketchId: string, op: 'refine' | 'removeColor' | 'addRef', instruction?: string) =>
  op === 'addRef'
    ? callFunction<GenResult>('editSketch', { sketchId, op })
    : run({ fn: 'editSketch', data: { requestId: newRequestId(), sketchId, op, instruction }, at: Date.now() });

// A generation this browser started but never heard back from (closed tab, lost connection).
export const pendingGeneration = () => readPending();
export const resumeGeneration = () => {
  const p = readPending();
  return p ? run(p) : null;
};

// A sketch the signed-in owner can read (private included), in the shape the page components use.
export async function loadSketch(id: string): Promise<Sketch | null> {
  const { db, fs } = await getDbClient();
  const snap = await fs.getDoc(fs.doc(db, 'sketches', id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { ...d, id: snap.id, createdAt: d.createdAt?.toDate?.().toISOString() } as Sketch;
}

export const showOutOfCredits = (what: string) => openModal({
  name: 'error', title: 'Out of Credits',
  message: `You need at least 1 credit to ${what}. Please purchase a pack to continue.`,
  link: { href: '/pricing', label: 'Get More Credits' },
});

// One place that turns a failed or refunded generation into a message.
export function showGenerationError(e: unknown, what: string) {
  if (e instanceof CallError) {
    if (/INSUFFICIENT_CREDITS/.test(e.message)) return showOutOfCredits(what);
    const title = e.status === 'RESOURCE_EXHAUSTED' || e.status === 'UNAVAILABLE' ? 'Please Try Tomorrow' : 'Creation Failed';
    const message = /NO_PROFILE/.test(e.message) ? 'Your account is still being set up. Please try again in a few seconds.' : e.message;
    return openModal({ name: 'error', title, message });
  }
  console.error('[generation]', e);
  openModal({ name: 'error', title: 'Connection Lost', message: 'We lost the connection while your page was being drawn. Reopen this page in a minute: a page you paid for is picked up automatically, or refunded if it failed.' });
}
export const showRefund = (error: string) =>
  openModal({ name: 'error', title: error === 'INVALID_REFERENCE' ? 'Scripture Not Found' : 'Creation Failed', message: ERROR_TEXT[error] ?? ERROR_TEXT.FAILED });

export const ERROR_TEXT: Record<string, string> = {
  INVALID_REFERENCE: "We couldn't find that passage. Please check the book, chapter and verse. Your credit was refunded.",
  VERSE_TOO_LONG: 'That verse is too long for verse art (30 words or more). Please choose a shorter verse. Your credit was refunded.',
  BLOCKED: 'This request was blocked by the safety filter. Please try a different passage or wording. Your credit was refunded.',
  FAILED: 'Something went wrong while drawing your page. Your credit was refunded, please try again.',
  TIMEOUT: 'This took too long and was stopped. Your credit was refunded, please try again.',
};

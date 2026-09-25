// The Sunday Prep email's free page (docs/email-marketing-plan.md §6.6, §12.4): /free/<sketchId>?t=<exp>.<sig> opens
// the print PDF with no sign-in and no print spent. emailTick (functions/email.js freeUrl) signs the link with the
// purge secret (WORKER_PURGE_SECRET there, PURGE_SECRET here), so there's no new secret. `exp` is Unix seconds.
// No Worker-only imports: scripts/email-check.mjs checks that both sides agree.

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

// True when `t` is an unexpired link for this sketch. The signatures are compared as HMACs of themselves, so the
// comparison's timing says nothing about the right signature.
export async function validFreeLink(secret: string | undefined, id: string, t: string | null, now = Date.now()) {
  const m = /^(\d{9,11})\.([\w-]{43})$/.exec(t ?? '');
  if (!secret || !m || Number(m[1]) * 1000 < now) return false;
  const want = await hmac(secret, `free:${id}:${m[1]}`);
  return (await hmac(secret, `cmp:${want}`)) === (await hmac(secret, `cmp:${m[2]}`));
}

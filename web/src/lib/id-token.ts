// Verify a Firebase Auth ID token (RS256, Google's securetoken keys) and return the signed-in uid.
// Same checks as the Admin SDK's verifyIdToken, plus the app's own rule: an email/password account must have a
// verified email (the client keeps unverified accounts signed out).
import { FIREBASE } from './config.ts';

const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let keys: { at: number; ttl: number; byKid: Map<string, CryptoKey> } | undefined;
let unsignedAllowed = false;
// The Auth emulator issues unsigned tokens; only local end-to-end tests turn this on (middleware).
export const allowUnsignedTokens = () => {
  unsignedAllowed = true;
};

export class TokenError extends Error {}

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64url(s)));

async function publicKey(kid: string): Promise<CryptoKey | undefined> {
  if (!keys || Date.now() - keys.at > keys.ttl) {
    const res = await fetch(JWKS);
    if (!res.ok) throw new Error(`securetoken keys: ${res.status}`);
    const maxAge = Number(res.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] ?? 3600);
    const { keys: jwks } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
    const byKid = new Map<string, CryptoKey>();
    for (const k of jwks) {
      byKid.set(k.kid, await crypto.subtle.importKey('jwk', k, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
    }
    keys = { at: Date.now(), ttl: maxAge * 1000, byKid };
  }
  return keys.byKid.get(kid);
}

export async function verifyIdToken(token: string | null | undefined): Promise<string> {
  const parts = (token ?? '').split('.');
  if (parts.length !== 3) throw new TokenError('malformed token');
  const [h, p, sig] = parts;
  const header = json(h);
  const payload = json(p);
  if (header.alg === 'none' && unsignedAllowed) {
    // emulator token: no signature to check
  } else {
    if (header.alg !== 'RS256') throw new TokenError('unexpected algorithm');
    const key = await publicKey(header.kid);
    if (!key) throw new TokenError('unknown key');
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(sig), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) throw new TokenError('bad signature');
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE.projectId) throw new TokenError('wrong audience');
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE.projectId}`) throw new TokenError('wrong issuer');
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new TokenError('expired');
  if (typeof payload.iat !== 'number' || payload.iat > now + 300) throw new TokenError('issued in the future');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new TokenError('no subject');
  if (payload.firebase?.sign_in_provider === 'anonymous') throw new TokenError('anonymous');
  if (payload.email_verified !== true) throw new TokenError('email not verified');
  return payload.sub;
}

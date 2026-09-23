// Pinterest API for our own account only (developer app "Bible Sketch Pin Publisher", id 1615048; privacy §3.4).
// OAuth 2 authorization code → tokens AES-GCM encrypted (key PINTEREST_TOKEN_KEY) in the KV namespace PINTEREST.
// PINTEREST_ENV: 'sandbox' while the app has Trial access (API Pins are visible only to us), 'production' after
// Standard access. Secrets: PINTEREST_APP_SECRET, PINTEREST_TOKEN_KEY (wrangler secret put).
import { env } from 'cloudflare:workers';
import { ORIGIN } from './sketch.ts';
import { altText, pageUrl, pinFile, type PinEntry } from './pins.ts';

type PinterestEnv = {
  PINTEREST: KVNamespace;
  PINTEREST_APP_ID?: string;
  PINTEREST_APP_SECRET?: string;
  PINTEREST_TOKEN_KEY?: string;
  PINTEREST_ENV?: string;
};
const E = env as unknown as PinterestEnv;

export const ACCOUNT = 'biblesketch'; // the callback refuses any other Pinterest account
export const REDIRECT_URI = `${ORIGIN}/api/pinterest/callback`;
export const SCOPES = 'user_accounts:read,boards:read,boards:write,pins:read,pins:write';
export const sandbox = () => E.PINTEREST_ENV !== 'production';
const API = () => (sandbox() ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5');
const BOARD_NAMES: Record<PinEntry['board'], string> = {
  'sunday-school': 'Sunday School Activities & Bible Coloring Lessons',
  christmas: 'Christmas Coloring Pages & Nativity Printables',
  scripture: 'Scripture Coloring Sheets | Bible Verse Coloring',
  easter: 'Easter Coloring Pages & Sunday School Crafts',
  adult: 'Christian Adult Coloring Pages: Biblical Scenes',
};

export const authorizeUrl = (state: string) =>
  `https://www.pinterest.com/oauth/?${new URLSearchParams({
    client_id: E.PINTEREST_APP_ID ?? '', redirect_uri: REDIRECT_URI, response_type: 'code', scope: SCOPES, state,
  })}`;

// ---------------------------------------------------------------- secrets at rest
const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rawKey = () => {
  if (!E.PINTEREST_TOKEN_KEY) throw new Error('PINTEREST_TOKEN_KEY is not set');
  return crypto.subtle.digest('SHA-256', enc.encode(E.PINTEREST_TOKEN_KEY));
};
const aesKey = async () => crypto.subtle.importKey('raw', await rawKey(), 'AES-GCM', false, ['encrypt', 'decrypt']);

async function seal(value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), enc.encode(JSON.stringify(value)));
  return `${b64(iv)}.${b64(new Uint8Array(ct))}`;
}
async function unseal<T>(s: string): Promise<T> {
  const [iv, ct] = s.split('.');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(), unb64(ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

// Owner session after a verified connect: "<expiry ms>.<HMAC>", 1 hour, HttpOnly SameSite=Lax cookie.
const hmac = async (msg: string) => {
  const k = await crypto.subtle.importKey('raw', await rawKey(), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(`owner:${msg}`))));
};
export const OWNER_COOKIE = 'pin_owner';
export const ownerCookie = async () => {
  const exp = String(Date.now() + 3600_000);
  return `${exp}.${await hmac(exp)}`;
};
export async function isOwner(cookie: string | undefined) {
  const [exp, sig] = (cookie ?? '').split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const [a, b] = await Promise.all([sig, await hmac(exp)].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))));
  return crypto.subtle.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------- tokens
interface Tokens { access: string; refresh: string; expiresAt: number; scope: string }
const tokenKey = () => `tokens:${sandbox() ? 'sandbox' : 'production'}`;

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  if (!E.PINTEREST_APP_SECRET) throw new Error('PINTEREST_APP_SECRET is not set');
  const res = await fetch(`${API()}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${E.PINTEREST_APP_ID}:${E.PINTEREST_APP_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(`oauth/token ${res.status}: ${j.message ?? ''}`);
  return { access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + j.expires_in * 1000, scope: j.scope };
}

export const exchangeCode = (code: string) =>
  tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI });
export const saveTokens = async (t: Tokens) => E.PINTEREST.put(tokenKey(), await seal(t));
export const connected = async () => (await E.PINTEREST.get(tokenKey())) !== null;

// Access tokens last 30 days; the continuous refresh token 60 days, renewed on every refresh.
async function accessToken() {
  const stored = await E.PINTEREST.get(tokenKey());
  if (!stored) throw new Error('Pinterest is not connected');
  let t = await unseal<Tokens>(stored);
  if (t.expiresAt - Date.now() < 7 * 86400_000) {
    const fresh = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh });
    t = { ...fresh, refresh: fresh.refresh || t.refresh };
    await saveTokens(t);
  }
  return t.access;
}

export async function api(path: string, init: { method?: string; body?: unknown } = {}, token?: string) {
  const res = await fetch(`${API()}${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${token ?? (await accessToken())}`, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} ${res.status}: ${j.message ?? ''}`);
  return j;
}

// ---------------------------------------------------------------- publishing
// Our board by name; in Sandbox the production boards are invisible, so a Sandbox copy is created once.
async function boardId(board: PinEntry['board']) {
  const name = BOARD_NAMES[board];
  let bookmark: string | undefined;
  for (let page = 0; page < 20; page++) {
    const j = await api(`/boards?page_size=250${bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : ''}`);
    const hit = (j.items as { id: string; name: string }[] | undefined)?.find((b) => b.name === name);
    if (hit) return hit.id;
    bookmark = j.bookmark;
    if (!bookmark) break;
  }
  if (!sandbox()) throw new Error(`board not found: ${name}`);
  return (await api('/boards', { method: 'POST', body: { name, description: 'Sandbox copy for API tests' } })).id as string;
}

const publishedKey = (e: PinEntry) => `published:${sandbox() ? 'sandbox' : 'production'}:${e.sketchId}`;
export const publishedPin = (e: PinEntry) => E.PINTEREST.get(publishedKey(e));

// One calendar entry → one Pin, with the alt text RSS can't carry. Refuses to publish an entry twice.
export async function publish(e: PinEntry): Promise<string> {
  if (await publishedPin(e)) throw new Error('already published');
  const pin = await api('/pins', {
    method: 'POST',
    body: {
      board_id: await boardId(e.board),
      title: e.title,
      description: e.description,
      link: `${pageUrl(e)}?utm_source=pinterest&utm_medium=social&utm_campaign=api-${e.board}`,
      alt_text: altText(e),
      media_source: { source_type: 'image_url', url: `${ORIGIN}/pin-img/${pinFile(e)}.png` },
    },
  });
  await E.PINTEREST.put(publishedKey(e), pin.id);
  return pin.id as string;
}

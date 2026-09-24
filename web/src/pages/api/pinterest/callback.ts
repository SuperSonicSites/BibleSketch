// GET /api/pinterest/callback?code&state: Pinterest OAuth redirect. Checks the state, exchanges the code, and keeps
// the tokens only if they belong to our own account (@biblesketch); then opens a 1-hour owner session.
import type { APIRoute } from 'astro';
import { ACCOUNT, OWNER_COOKIE, api, exchangeCode, ownerCookie, saveTokens } from '../../../lib/pinterest.ts';

const fail = (status: number, msg: string) =>
  new Response(`Pinterest connection failed: ${msg}`, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

export const GET: APIRoute = async ({ url, cache, cookies, redirect }) => {
  cache.set(false);
  const [state, env] = (cookies.get('pin_state')?.value ?? '').split('.');
  cookies.delete('pin_state', { path: '/api/pinterest' });
  const code = url.searchParams.get('code');
  if (!code || !state || url.searchParams.get('state') !== state) return fail(400, 'invalid or expired request, start again');
  if (env !== 'sandbox' && env !== 'production') return fail(400, 'invalid request, start again');
  try {
    const tokens = await exchangeCode(code, env);
    const me = await api('/user_account', {}, tokens.access, env);
    if (me.username !== ACCOUNT) return fail(403, `this app only connects @${ACCOUNT}`);
    await saveTokens(tokens, env);
  } catch (e) {
    console.error('[pinterest] callback', e);
    return fail(502, (e as Error).message);
  }
  cookies.set(OWNER_COOKIE, await ownerCookie(), { path: '/api/pinterest', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600 });
  return redirect('/api/pinterest', 302);
};

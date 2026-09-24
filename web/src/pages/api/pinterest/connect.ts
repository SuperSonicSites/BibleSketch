// GET /api/pinterest/connect[?env=production]: start Pinterest OAuth (src/lib/pinterest.ts). The state cookie guards
// the callback and carries which environment the token is for (production = stats while we have Trial access).
import type { APIRoute } from 'astro';
import { authorizeUrl, current } from '../../../lib/pinterest.ts';

export const GET: APIRoute = async ({ url, cache, cookies, redirect }) => {
  cache.set(false);
  const env = url.searchParams.get('env') === 'production' ? 'production' : current();
  const state = crypto.randomUUID();
  cookies.set('pin_state', `${state}.${env}`, { path: '/api/pinterest', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 });
  return redirect(authorizeUrl(state), 302);
};

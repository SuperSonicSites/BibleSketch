// GET /api/pinterest/connect: start Pinterest OAuth (src/lib/pinterest.ts). The state cookie guards the callback.
import type { APIRoute } from 'astro';
import { authorizeUrl } from '../../../lib/pinterest.ts';

export const GET: APIRoute = async ({ cache, cookies, redirect }) => {
  cache.set(false);
  const state = crypto.randomUUID();
  cookies.set('pin_state', state, { path: '/api/pinterest', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 });
  return redirect(authorizeUrl(state), 302);
};

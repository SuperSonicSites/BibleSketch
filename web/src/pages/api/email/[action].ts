// GET|POST /api/email/unsubscribe|offer?u=<uid>&t=<token>: the links in our emails (docs/email-marketing-plan.md
// §6.6). The emailAction function holds the tokens and the admin rights; this keeps the links on biblesketch.app.
import type { APIRoute } from 'astro';

const FN = 'https://us-central1-biblesketch-5104c.cloudfunctions.net/emailAction';

export const ALL: APIRoute = async ({ params, request, url, cache }) => {
  cache.set(false);
  const action = params.action ?? '';
  if (!['unsubscribe', 'offer'].includes(action) || !['GET', 'POST'].includes(request.method)) {
    return new Response('Not found', { status: 404 });
  }
  const target = new URL(FN);
  target.searchParams.set('a', action);
  for (const k of ['u', 't']) target.searchParams.set(k, url.searchParams.get(k) ?? '');
  if (url.searchParams.get('p') === 'yearly') target.searchParams.set('p', 'yearly');
  // A mail app's one-click unsubscribe is a POST (RFC 8058); the body doesn't matter, the method does.
  const res = await fetch(target, { method: request.method, redirect: 'manual', ...(request.method === 'POST' && { body: '' }) });
  const headers = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': res.headers.get('content-type') ?? 'text/html; charset=utf-8' });
  const location = res.headers.get('location');
  if (location) headers.set('Location', location);
  return new Response(res.body, { status: res.status, headers });
};

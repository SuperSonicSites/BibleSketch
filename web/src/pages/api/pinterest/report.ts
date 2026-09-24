// GET /api/pinterest/report: our Pinterest stats as JSON (report() in src/lib/pinterest.ts). Owner session only.
import type { APIRoute } from 'astro';
import { OWNER_COOKIE, isOwner, report } from '../../../lib/pinterest.ts';

const text = (status: number, msg: string) =>
  new Response(msg, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ cache, cookies }) => {
  cache.set(false);
  if (!(await isOwner(cookies.get(OWNER_COOKIE)?.value))) return text(401, 'Session expired: connect again at /api/pinterest');
  try {
    return new Response(JSON.stringify(await report()), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[pinterest] report', e);
    return text(502, `Report failed: ${(e as Error).message}`);
  }
};

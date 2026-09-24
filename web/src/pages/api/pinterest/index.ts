// GET  /api/pinterest: the owner's page for the Pinterest app: connect our account, then publish a calendar Pin.
// POST /api/pinterest (form: sketchId): publish that entry through the API (owner session only; SameSite=Lax
// keeps cross-site form posts out). Used for the Standard-access demo and until the daily publisher exists.
import type { APIRoute } from 'astro';
import { entries, pinFile } from '../../../lib/pins.ts';
import { ACCOUNT, OWNER_COOKIE, connected, isOwner, publish, publishedPin, sandbox } from '../../../lib/pinterest.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const page = (body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Bible Sketch Pin Publisher</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;color:#1f2937}
h1{font-size:1.5rem}.btn{display:inline-block;background:#e60023;color:#fff;border:0;border-radius:999px;
padding:10px 20px;font-weight:600;text-decoration:none;cursor:pointer}select{width:100%;padding:8px;margin:8px 0 16px}
.muted{color:#6b7280;font-size:.9rem}.ok{background:#ecfdf5;border:1px solid #a7f3d0;padding:12px;border-radius:8px}
.err{background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:8px}img{max-width:240px;border:1px solid #e5e7eb}</style>
</head><body><h1>Bible Sketch Pin Publisher</h1>
<p class="muted">Publishes Bible Sketch's own coloring pages to our own Pinterest account (@${ACCOUNT}) through the
Pinterest API. Environment: <b>${sandbox() ? 'Sandbox (Trial access: Pins visible only to us)' : 'Production'}</b>.</p>
${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

const connectBlock = `<p>Connect the Bible Sketch Pinterest account. You'll sign in on Pinterest and approve access;
only @${ACCOUNT} can be connected.</p><p><a class="btn" href="/api/pinterest/connect">Connect Pinterest</a></p>`;

export const GET: APIRoute = async ({ url, cache, cookies }) => {
  cache.set(false);
  if (url.searchParams.has('signout')) cookies.delete(OWNER_COOKIE, { path: '/api/pinterest' });
  if (url.searchParams.has('signout') || !(await isOwner(cookies.get(OWNER_COOKIE)?.value))) {
    return page(`${(await connected()) ? '<p class="muted">An account is connected. Connect again to open a session.</p>' : ''}${connectBlock}`);
  }
  const today = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  const upcoming = entries.filter((e) => e.approved && e.release >= today).sort((a, b) => a.release.localeCompare(b.release)).slice(0, 25);
  const options = await Promise.all(
    upcoming.map(async (e) => {
      const done = await publishedPin(e);
      return `<option value="${esc(e.sketchId)}"${done ? ' disabled' : ''}>${esc(`${e.release} · ${e.board} · ${e.title}${done ? ' (published)' : ''}`)}</option>`;
    }),
  );
  return page(`<p class="ok">Connected as <b>@${ACCOUNT}</b>. <a href="/api/pinterest?signout">Sign out</a></p>
<form method="post"><label for="sketchId"><b>Pin to publish</b> (from the reviewed calendar)</label>
<select id="sketchId" name="sketchId">${options.join('')}</select>
<button class="btn" type="submit">Publish to Pinterest</button></form>
<p class="muted">Each Pin gets its title, description, link to its page on biblesketch.app, and alt text.</p>
<h2>Stats</h2>${(await connected('production'))
    ? `<p><a class="btn" href="/api/pinterest/report">Account and Pin stats (JSON)</a></p>
<form method="post" action="/api/pinterest/report"><button class="btn" type="submit">Email the monthly report now</button></form>
<p class="muted">The report also goes out by itself on the 24th of each month.</p>`
    : `<p>Stats read the live account, which needs its own connection.</p>
<p><a class="btn" href="/api/pinterest/connect?env=production">Connect for stats</a></p>`}`);
};

export const POST: APIRoute = async ({ request, cache, cookies }) => {
  cache.set(false);
  if (!(await isOwner(cookies.get(OWNER_COOKIE)?.value))) return page(`<p class="err">Session expired.</p>${connectBlock}`, 401);
  const sketchId = String((await request.formData()).get('sketchId') ?? '');
  const entry = entries.find((e) => e.approved && e.sketchId === sketchId);
  if (!entry) return page('<p class="err">Unknown calendar entry.</p><p><a href="/api/pinterest">Back</a></p>', 400);
  try {
    const id = await publish(entry);
    return page(`<p class="ok">Published <b>${esc(entry.title)}</b> to the ${esc(entry.board)} board.<br>
Pin id ${esc(id)}: <a href="https://www.pinterest.com/pin/${esc(id)}/" target="_blank" rel="noopener">open on Pinterest</a></p>
<p><img src="/pin-img/${esc(pinFile(entry))}.png" alt=""></p><p><a href="/api/pinterest">Back</a></p>`);
  } catch (e) {
    console.error('[pinterest] publish', entry.sketchId, e);
    return page(`<p class="err">Publishing failed: ${esc((e as Error).message)}</p><p><a href="/api/pinterest">Back</a></p>`, 502);
  }
};

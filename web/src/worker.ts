// Worker entry (wrangler.jsonc "main"): Astro handles every request; the cron trigger emails the monthly
// Pinterest report (src/lib/pinterest-email.ts); Email Routing hands hello@biblesketch.app to email().
import { handle } from '@astrojs/cloudflare/handler';
import PostalMime from 'postal-mime';
import { emailReport } from './lib/pinterest-email.ts';
import { newText, parseReply } from './lib/email-reply.ts';

const OWNER_INBOX = 'renaud@supersonicsites.com'; // a verified Email Routing destination
const REPLY_HOOK = 'https://us-central1-biblesketch-5104c.cloudfunctions.net/emailReply';

// An easy answer (an unsubscribe, the sorting question) goes to the emailReply function, which applies it.
async function readReply(raw: ArrayBuffer, secret?: string) {
  if (!secret) return;
  const m = await PostalMime.parse(raw);
  const from = m.from?.address;
  const parsed = from ? parseReply(m.subject ?? '', m.text ?? '') : null;
  if (!parsed) return;
  const res = await fetch(REPLY_HOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-purge-secret': secret },
    body: JSON.stringify({ from, subject: m.subject, text: newText(m.text ?? '').slice(0, 2000), ...parsed }),
  });
  if (!res.ok) console.error('[email] reply hook', res.status);
}

export default {
  fetch: handle,
  scheduled(_controller, _env, ctx) {
    ctx.waitUntil(emailReport());
  },
  // Every message reaches the owner first, exactly as the old forward rule did; reading it can't lose it.
  async email(message, env, ctx) {
    const raw = await new Response(message.raw).arrayBuffer();
    await message.forward(OWNER_INBOX);
    ctx.waitUntil(readReply(raw, (env as { PURGE_SECRET?: string }).PURGE_SECRET).catch((e) => console.error('[email] read', e)));
  },
} satisfies ExportedHandler<Env>;

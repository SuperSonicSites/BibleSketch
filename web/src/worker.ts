// Worker entry (wrangler.jsonc "main"): Astro handles every request; the cron trigger emails the monthly
// Pinterest report (src/lib/pinterest-email.ts).
import { handle } from '@astrojs/cloudflare/handler';
import { emailReport } from './lib/pinterest-email.ts';

export default {
  fetch: handle,
  scheduled(_controller, _env, ctx) {
    ctx.waitUntil(emailReport());
  },
} satisfies ExportedHandler<Env>;

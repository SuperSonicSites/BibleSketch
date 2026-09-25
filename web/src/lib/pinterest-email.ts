// Monthly Pinterest TLDR emailed to the owner (cron in wrangler.jsonc → src/worker.ts; send one now with
// POST /api/pinterest/report, preview with GET ?tldr). Owner decisions 2026-09-24: a quick summary, not an analytics
// dashboard; bullet points, board names in bold followed by ":", top Pins as numbered lists linking to Pinterest.
// Bare HTML (lists, bold, links; no styling) plus a plain-text copy.
// Board numbers "since last report" = lifetime totals now minus the totals saved in KV at the previous report.
import { env } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { entries } from './pins.ts';
import { BOARD_NAMES, api, report, saveLearnInput } from './pinterest.ts';

const E = env as unknown as { PINTEREST: KVNamespace; REPORT_EMAIL: { send(m: EmailMessage): Promise<void> }; PURGE_SECRET?: string };
const EMAIL_STATS = 'https://us-central1-biblesketch-5104c.cloudfunctions.net/emailStats';

const FROM = 'reports@biblesketch.app';
// Every recipient must be a verified Email Routing destination address and listed in the binding's
// allowed_destination_addresses (wrangler.jsonc).
const TO = 'renaud@supersonicsites.com';
const CC = ['brent@supersonicsites.com']; // owner request 2026-09-24

// Email Routing (no Email Sending onboarding) only takes raw MIME messages, one envelope recipient each: the same
// message goes to TO and to each CC. A CC that fails (e.g. not verified yet) is logged and doesn't fail the report.
async function send(subject: string, text: string, html?: string) {
  const part = (type: string, body: string) => [`Content-Type: ${type}; charset=utf-8`, 'Content-Transfer-Encoding: 8bit', '', body];
  const boundary = `b-${crypto.randomUUID()}`;
  const body = html
    ? [`Content-Type: multipart/alternative; boundary="${boundary}"`, '', `--${boundary}`, ...part('text/plain', text),
      `--${boundary}`, ...part('text/html', html), `--${boundary}--`]
    : part('text/plain', text);
  const raw = [
    `From: Bible Sketch <${FROM}>`, `To: ${TO}`, `Cc: ${CC.join(', ')}`, `Subject: ${subject}`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@biblesketch.app>`, 'MIME-Version: 1.0', ...body,
  ].join('\r\n').replace(/\r?\n/g, '\r\n');
  await E.REPORT_EMAIL.send(new EmailMessage(FROM, TO, raw));
  for (const cc of CC) await E.REPORT_EMAIL.send(new EmailMessage(FROM, cc, raw)).catch((e) => console.error('[pinterest] report cc', cc, e));
}

const SNAPSHOT = 'report:last'; // { date, boards: { [boardId]: { impression, outbound_click } } }
type Totals = { impression: number; outbound_click: number };
const LABELS: Record<string, string> = {
  'sunday-school': 'Sunday School', christmas: 'Christmas', scripture: 'Scripture', easter: 'Easter', adult: 'Adult',
};
const label = (name: string) =>
  LABELS[Object.entries(BOARD_NAMES).find(([, n]) => n === name)?.[0] ?? ''] ?? name.split(/[:&|]/)[0].trim();

const day = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
const date = (iso?: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '?');
const num = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toLocaleString('en-US'));
const pct = (now: number, before: number) => (before ? ` (${now >= before ? '+' : ''}${Math.round((100 * (now - before)) / before)}%)` : '');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Items are small HTML strings; the text copy unwraps them: bold dropped, links become "title (url)".
const plain = (h: string) =>
  h.replace(/<a href="([^"]+)">([^<]*)<\/a>/g, '$2 ($1)').replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// "Sunday School Crafts: Adam & Eve Hiding | Genesis 3:8" → "Adam & Eve Hiding"
const short = (title = '') => {
  const head = title.split(' | ')[0].split(' - ')[0];
  return (head.split(': ').slice(1).join(': ') || head).slice(0, 50).trim() || '(untitled)';
};

export async function buildReport() {
  const r = await report();
  // The same numbers feed the learning loop (pins-learn.mjs), refreshed at least monthly this way.
  await saveLearnInput(r).catch((e) => console.error('[pinterest] learn input', e));
  const boards = r.boards.filter((b) => b.privacy === 'PUBLIC' && !b.name.startsWith('Sandbox'));
  const pins = r.pins.filter((p) => boards.some((b) => b.id === p.board));
  const sections: { title: string; items: string[]; ordered?: boolean }[] = [];

  // Account, last 30 days vs the 30 before (includes repins by others and the archived boards).
  const days = (r.account.daily_metrics ?? []).filter((d: any) => d.data_status === 'READY');
  const sum = (ds: any[], k: string) => ds.reduce((a, d) => a + (d.metrics[k] ?? 0), 0);
  const [now, before] = [days.slice(-30), days.slice(-60, -30)];
  const stat = (k: string, what: string) => `${num(sum(now, k))} ${what}${pct(sum(now, k), sum(before, k))}`;
  const intro = `Pinterest, ${date(days.at(-30)?.date)} to ${date(days.at(-1)?.date)}. Changes are vs the 30 days before.`;
  sections.push({
    title: 'Last 30 days',
    items: [stat('IMPRESSION', 'impressions'), stat('SAVE', 'saves'), stat('OUTBOUND_CLICK', 'clicks to the site')],
  });

  // Boards: since the last report when there is one, else the last 90 days.
  const prev = await E.PINTEREST.get<{ date: string; boards: Record<string, Totals> }>(SNAPSHOT, 'json');
  const snapshot: Record<string, Totals> = {};
  const rows = boards.map((b) => {
    const t = { life: { impression: 0, outbound_click: 0 }, d90: { impression: 0, outbound_click: 0 } };
    for (const p of pins.filter((p) => p.board === b.id)) {
      for (const k of ['impression', 'outbound_click'] as const) {
        t.life[k] += p.metrics?.lifetime_metrics?.[k] ?? 0;
        t.d90[k] += p.metrics?.['90d']?.[k] ?? 0;
      }
    }
    snapshot[b.id] = t.life;
    const was = prev?.boards[b.id];
    const shown = was ? { impression: t.life.impression - was.impression, outbound_click: t.life.outbound_click - was.outbound_click } : t.d90;
    return { name: label(b.name), ...shown };
  }).sort((a, b) => b.outbound_click - a.outbound_click);
  sections.push({
    title: prev ? `Boards since last report (${date(prev.date)})` : 'Boards, last 90 days',
    items: rows.map((b) => `<b>${esc(b.name)}:</b> ${num(b.outbound_click)} clicks, ${num(b.impression)} impressions`),
  });

  // Top 3 Pins by clicks to the site (our goal) for each window, linked to the Pin.
  const titles = new Map(pins.map((p) => [p.id, p.title]));
  for (const n of [30, 60, 90]) {
    const top = await api(`/user_account/analytics/top_pins?start_date=${day(n - 1)}&end_date=${day(0)}&sort_by=OUTBOUND_CLICK&num_of_pins=3`,
      {}, undefined, 'production');
    const items = await Promise.all(((top.pins ?? []) as { pin_id: string; metrics: Record<string, number> }[]).map(async (t) => {
      const title = titles.get(t.pin_id) ?? (await api(`/pins/${t.pin_id}`, {}, undefined, 'production').catch(() => ({}))).title;
      const clicks = t.metrics.OUTBOUND_CLICK ?? t.metrics.outbound_click ?? 0;
      return `<a href="https://www.pinterest.com/pin/${esc(t.pin_id)}/">${esc(short(title))}</a> (${clicks} clicks)`;
    }));
    sections.push({ title: `Top Pins, last ${n} days (clicks to the site)`, items: items.length ? items : ['none'], ordered: true });
  }

  // What's new, what's next, what to fix.
  const fresh = pins.filter((p) => p.created >= day(30));
  const freshImp = fresh.reduce((a, p) => a + (p.metrics?.lifetime_metrics?.impression ?? 0), 0);
  const ahead = entries.filter((e) => e.approved && e.release > day(0) && e.release <= day(-30)).length;
  sections.push({
    title: 'New and next',
    items: [`${fresh.length} Pins published in the last 30 days (${num(freshImp)} impressions so far)`, `${ahead} Pins scheduled for the next 30 days`],
  });
  const lastDay = new Map<string, string>();
  for (const e of entries) if (e.approved && e.release > (lastDay.get(e.board) ?? '')) lastDay.set(e.board, e.release);
  const noAlt = pins.filter((p) => !p.alt).length;
  const todo = [
    ...[...lastDay].filter(([, d]) => d > day(0) && d <= day(-30)).map(([k, d]) => `<b>${LABELS[k] ?? k}:</b> calendar ends ${date(d)}`),
    ...(noAlt ? [`${noAlt} Pins without alt text`] : []),
  ];
  if (todo.length) sections.push({ title: 'To do', items: todo });
  sections.push({ title: 'Email, last 30 days', items: await emailItems() });
  const footer = 'Details: <a href="https://biblesketch.app/api/pinterest">biblesketch.app/api/pinterest</a>';

  const html = ['<!doctype html><html><body>', `<p>${esc(intro)}</p>`,
    ...sections.map((s) => {
      const tag = s.ordered ? 'ol' : 'ul';
      return `<p><b>${esc(s.title)}</b></p>\n<${tag}>\n${s.items.map((i) => `<li>${i}</li>`).join('\n')}\n</${tag}>`;
    }),
    `<p>${footer}</p>`, '</body></html>'].join('\n');
  const text = [intro,
    ...sections.map((s) => `${s.title}\n${s.items.map((i, n) => `${s.ordered ? `${n + 1}.` : '-'} ${plain(i)}`).join('\n')}`),
    plain(footer)].join('\n\n');
  return { text, html, snapshot };
}

// The email numbers (docs/email-marketing-plan.md §8, targets in brackets) from the emailStats function. A failure
// shows as one line instead of stopping the Pinterest report.
async function emailItems(): Promise<string[]> {
  try {
    const r = await fetch(EMAIL_STATS, { headers: { 'x-purge-secret': E.PURGE_SECRET ?? '' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const s = await r.json() as any;
    const rate = (n: number, of: number) => (of ? `${Math.round((100 * n) / of)}%` : 'n/a');
    const each = Object.entries(s.byEmail as Record<string, { sent: number; clicked: number }>)
      .sort(([, a], [, b]) => b.sent - a.sent).map(([k, b]) => `${k} ${b.sent}/${b.clicked}`).join(', ');
    return [
      `<b>List:</b> ${s.list} people get emails. ${s.signups} new sign-ups, ${s.optedIn} opted in (${rate(s.optedIn, s.signups)}; target 50%+)`,
      `<b>Sent:</b> ${s.sent} emails, ${s.clicked} clicked (${rate(s.clicked, s.sent)}; flagship target 8%+)${each ? `. Sent/clicked: ${esc(each)}` : ''}`,
      `<b>Activation:</b> ${s.activation.active} of ${s.activation.of} sign-ups made a first page within 7 days (${rate(s.activation.active, s.activation.of)}; target 50%+)`,
      `<b>Sorting question:</b> ${s.w1.sorted} answers to ${s.w1.sent} sent (${rate(s.w1.sorted, s.w1.sent)}; target 15%+)`,
      `<b>Sales:</b> ${s.assisted} purchases by ${s.assistedBuyers} people within 7 days of clicking an email. ${s.paid} of the ${s.signups} new sign-ups bought (${rate(s.paid, s.signups)}; target 5%+)`,
      `<b>Health:</b> ${s.unsubs} unsubscribes (${rate(s.unsubs, s.sent)}; under 0.5%), ${s.complained} spam complaints (${rate(s.complained, s.sent)}; under 0.1%), ${s.bounced} bounces`,
    ];
  } catch (e) {
    console.error('[pinterest] email stats', e);
    return [`Email numbers unavailable: ${esc((e as Error).message)}`];
  }
}

// Sends the report; on failure sends the error instead, so a broken connection never goes unnoticed.
export async function emailReport() {
  const subject = `Bible Sketch Pinterest TLDR, ${day(0)}`;
  try {
    const { text, html, snapshot } = await buildReport();
    await send(subject, text, html);
    await E.PINTEREST.put(SNAPSHOT, JSON.stringify({ date: day(0), boards: snapshot }));
  } catch (e) {
    console.error('[pinterest] report email', e);
    await send(`${subject}: FAILED`, `The monthly Pinterest report failed: ${(e as Error).message}\n\n` +
      'If Pinterest is disconnected, open https://biblesketch.app/api/pinterest/connect?env=production and approve.').catch(() => {});
    throw e;
  }
}

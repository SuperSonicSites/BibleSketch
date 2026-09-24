// Monthly Pinterest TLDR, plain text, emailed to the owner (cron in wrangler.jsonc → src/worker.ts; send one now
// with POST /api/pinterest/report). Owner decision 2026-09-24: a quick summary, not an analytics dashboard.
// Board numbers "since last report" = lifetime totals now minus the totals saved in KV at the previous report.
import { env } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { entries } from './pins.ts';
import { BOARD_NAMES, api, report } from './pinterest.ts';

const E = env as unknown as { PINTEREST: KVNamespace; REPORT_EMAIL: { send(m: EmailMessage): Promise<void> } };

const FROM = 'reports@biblesketch.app';
const TO = 'renaud@supersonicsites.com'; // also the binding's destination_address (wrangler.jsonc)

// Email Routing (no Email Sending onboarding) only takes raw MIME messages; the structured send() is refused.
const send = (subject: string, text: string) =>
  E.REPORT_EMAIL.send(new EmailMessage(FROM, TO, [
    `From: Bible Sketch <${FROM}>`, `To: ${TO}`, `Subject: ${subject}`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@biblesketch.app>`, 'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 8bit', '', text,
  ].join('\r\n').replace(/\r?\n/g, '\r\n')));

const SNAPSHOT = 'report:last'; // { date, boards: { [boardId]: { impression, outbound_click } } }
type Totals = { impression: number; outbound_click: number };
const LABELS: Record<string, string> = {
  'sunday-school': 'Sunday School', christmas: 'Christmas', scripture: 'Scripture', easter: 'Easter', adult: 'Adult',
};
const label = (name: string) =>
  LABELS[Object.entries(BOARD_NAMES).find(([, n]) => n === name)?.[0] ?? ''] ?? name.split(/[:&|]/)[0].trim();

const day = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
const num = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toLocaleString('en-US'));
const pct = (now: number, before: number) => (before ? ` (${now >= before ? '+' : ''}${Math.round((100 * (now - before)) / before)}%)` : '');
// "Sunday School Crafts: Adam & Eve Hiding | Genesis 3:8" → "Adam & Eve Hiding"
const short = (title = '') => {
  const head = title.split(' | ')[0].split(' - ')[0];
  return (head.split(': ').slice(1).join(': ') || head).slice(0, 50).trim() || '(untitled)';
};

export async function buildReport() {
  const r = await report();
  const boards = r.boards.filter((b) => b.privacy === 'PUBLIC' && !b.name.startsWith('Sandbox'));
  const pins = r.pins.filter((p) => boards.some((b) => b.id === p.board));
  const out: string[] = [];
  const say = (s = '') => out.push(s);

  // Account, last 30 days vs the 30 before (includes repins by others and the archived boards).
  const days = (r.account.daily_metrics ?? []).filter((d: any) => d.data_status === 'READY');
  const sum = (ds: any[], k: string) => ds.reduce((a, d) => a + (d.metrics[k] ?? 0), 0);
  const [now, before] = [days.slice(-30), days.slice(-60, -30)];
  const stat = (k: string, what: string) => `${num(sum(now, k))} ${what}${pct(sum(now, k), sum(before, k))}`;
  say(`Pinterest, ${days.at(-30)?.date} to ${days.at(-1)?.date}`);
  say();
  say(`Last 30 days: ${stat('IMPRESSION', 'impressions')}, ${stat('SAVE', 'saves')}, ${stat('OUTBOUND_CLICK', 'clicks to the site')}.`);

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
  say();
  say(prev ? `Boards since last report (${prev.date}):` : 'Boards, last 90 days:');
  for (const b of rows) say(`  ${b.name.padEnd(15)}${`${num(b.outbound_click)} clicks`.padEnd(12)}${num(b.impression)} impressions`);

  // Top 3 Pins by clicks to the site (our goal), one line per window.
  const titles = new Map(pins.map((p) => [p.id, p.title]));
  say();
  say('Top Pins by clicks to the site:');
  for (const n of [30, 60, 90]) {
    const top = await api(`/user_account/analytics/top_pins?start_date=${day(n - 1)}&end_date=${day(0)}&sort_by=OUTBOUND_CLICK&num_of_pins=3`,
      {}, undefined, 'production');
    const names = await Promise.all(((top.pins ?? []) as { pin_id: string; metrics: Record<string, number> }[]).map(async (t) => {
      const title = titles.get(t.pin_id) ?? (await api(`/pins/${t.pin_id}`, {}, undefined, 'production').catch(() => ({}))).title;
      return `${short(title)} (${t.metrics.OUTBOUND_CLICK ?? t.metrics.outbound_click ?? 0})`;
    }));
    say(`  ${`${n} days:`.padEnd(9)}${names.join(', ') || 'none'}`);
  }

  // What's new, what's next, what to fix.
  const fresh = pins.filter((p) => p.created >= day(30));
  const freshImp = fresh.reduce((a, p) => a + (p.metrics?.lifetime_metrics?.impression ?? 0), 0);
  const ahead = entries.filter((e) => e.approved && e.release > day(0) && e.release <= day(-30)).length;
  say();
  say(`New: ${fresh.length} Pins published in 30 days (${num(freshImp)} impressions so far); ${ahead} scheduled for the next 30.`);
  const lastDay = new Map<string, string>();
  for (const e of entries) if (e.approved && e.release > (lastDay.get(e.board) ?? '')) lastDay.set(e.board, e.release);
  const runsOut = [...lastDay].filter(([, d]) => d > day(0) && d <= day(-30)).map(([k, d]) => `${LABELS[k] ?? k} ends ${d}`);
  const noAlt = pins.filter((p) => !p.alt).length;
  const todo = [...runsOut.map((s) => `calendar: ${s}`), ...(noAlt ? [`${noAlt} Pins without alt text`] : [])];
  if (todo.length) say(`To do: ${todo.join('; ')}.`);
  say();
  say('Details: https://biblesketch.app/api/pinterest');

  return { text: out.join('\n'), snapshot };
}

// Sends the report; on failure sends the error instead, so a broken connection never goes unnoticed.
export async function emailReport() {
  const subject = `Bible Sketch Pinterest TLDR, ${day(0)}`;
  try {
    const { text, snapshot } = await buildReport();
    await send(subject, text);
    await E.PINTEREST.put(SNAPSHOT, JSON.stringify({ date: day(0), boards: snapshot }));
  } catch (e) {
    console.error('[pinterest] report email', e);
    await send(`${subject}: FAILED`, `The monthly Pinterest report failed: ${(e as Error).message}\n\n` +
      'If Pinterest is disconnected, open https://biblesketch.app/api/pinterest/connect?env=production and approve.').catch(() => {});
    throw e;
  }
}

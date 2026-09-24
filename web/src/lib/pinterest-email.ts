// Monthly Pinterest insight report, plain text, emailed to the owner (cron in wrangler.jsonc → src/worker.ts; send
// one now with POST /api/pinterest/report). Numbers come from the production API (report() and top_pins).
// "Since last report" per board = lifetime totals now minus the totals saved in KV at the previous report.
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
const SNAPSHOT = 'report:last'; // { date, boards: { [boardId]: Totals } }
const K = ['impression', 'save', 'pin_click', 'outbound_click'] as const;
type Totals = Record<(typeof K)[number], number>;

const day = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (now: number, before: number) => (before ? `${now >= before ? '+' : ''}${Math.round((100 * (now - before)) / before)}%` : 'n/a');
const line = (t: Totals) => `${fmt(t.impression)} impressions, ${fmt(t.save)} saves, ${fmt(t.outbound_click)} clicks to the site`;
const zero = (): Totals => ({ impression: 0, save: 0, pin_click: 0, outbound_click: 0 });
const add = (a: Totals, m: Record<string, number | null> | undefined) => K.forEach((k) => (a[k] += m?.[k] ?? 0));

export async function buildReport() {
  const r = await report();
  const boards = r.boards.filter((b) => b.privacy === 'PUBLIC' && !b.name.startsWith('Sandbox'));
  const boardName = new Map(r.boards.map((b) => [b.id, b.name]));
  const pins = r.pins.filter((p) => boards.some((b) => b.id === p.board));
  const byId = new Map(pins.map((p) => [p.id, p]));
  const out: string[] = [];
  const say = (s = '') => out.push(s);

  // Account (includes repins by others and the archived boards).
  const days = (r.account.daily_metrics ?? []).filter((d: any) => d.data_status === 'READY');
  const sum = (ds: any[]) => Object.fromEntries(K.map((k) => [k, ds.reduce((a, d) => a + (d.metrics[k.toUpperCase()] ?? 0), 0)])) as Totals;
  const last30 = sum(days.slice(-30)), prev30 = sum(days.slice(-60, -30));
  say(`Covers ${days.at(-30)?.date} to ${days.at(-1)?.date} (Pinterest data lags a day or two).`);
  say();
  say('ACCOUNT, LAST 30 DAYS (change vs the 30 days before)');
  for (const [label, k] of [['Impressions', 'impression'], ['Saves', 'save'], ['Pin clicks', 'pin_click'], ['Clicks to the site', 'outbound_click']] as const) {
    say(`  ${label.padEnd(20)}${fmt(last30[k]).padStart(9)}  (${pct(last30[k], prev30[k])})`);
  }
  say(`  Last 60 days: ${line(sum(days.slice(-60)))}.`);
  say(`  Last 90 days: ${line(sum(days))}.`);

  // Boards.
  const prev = await E.PINTEREST.get<{ date: string; boards: Record<string, Totals> }>(SNAPSHOT, 'json');
  const snapshot: Record<string, Totals> = {};
  say();
  say(`BOARDS${prev ? ` (since last report = ${prev.date} to today)` : ''}`);
  const rows = boards.map((b) => {
    const ps = pins.filter((p) => p.board === b.id);
    const d90 = zero(), life = zero();
    ps.forEach((p) => { add(d90, p.metrics?.['90d']); add(life, p.metrics?.lifetime_metrics); });
    snapshot[b.id] = life;
    return { b, ps, d90, life };
  }).sort((a, b) => b.d90.impression - a.d90.impression);
  for (const { b, ps, d90, life } of rows) {
    const fresh = ps.filter((p) => p.created >= day(30)).length;
    say(b.name);
    say(`  ${ps.length} Pins (${fresh} new in the last 30 days), ${fmt(b.followers)} followers`);
    const was = prev?.boards[b.id];
    if (was) {
      const since = Object.fromEntries(K.map((k) => [k, life[k] - was[k]])) as Totals;
      say(`  Since last report: ${line(since)}`);
    }
    say(`  Last 90 days: ${line(d90)} (${(d90.outbound_click / Math.max(ps.length, 1)).toFixed(1)} clicks per Pin)`);
  }
  if (!prev) say('(Per-board "since last report" numbers start with the next report.)');

  // Top Pins per window, by impressions and by clicks to the site.
  const pinLabel = async (id: string) => {
    let p: { title?: string; board?: string } | undefined = byId.get(id);
    if (!p) p = await api(`/pins/${id}`, {}, undefined, 'production').then((j) => ({ title: j.title, board: j.board_id })).catch(() => undefined);
    const board = (p?.board && boardName.get(p.board)) || 'archived board';
    return `${(p?.title || '(untitled)').slice(0, 90)} [${board.split(/[:&|]/)[0].trim()}]`;
  };
  for (const [heading, sortBy] of [['TOP 3 PINS BY IMPRESSIONS', 'IMPRESSION'], ['TOP 3 PINS BY CLICKS TO THE SITE', 'OUTBOUND_CLICK']] as const) {
    say();
    say(heading);
    for (const n of [30, 60, 90]) {
      const top = await api(
        `/user_account/analytics/top_pins?start_date=${day(n - 1)}&end_date=${day(0)}&sort_by=${sortBy}&num_of_pins=3`, {}, undefined, 'production',
      );
      say(`  Last ${n} days`);
      for (const [i, t] of ((top.pins ?? []) as { pin_id: string; metrics: Record<string, number> }[]).entries()) {
        const v = (k: string) => fmt(t.metrics[k] ?? t.metrics[k.toLowerCase()] ?? 0);
        say(`    ${i + 1}. ${await pinLabel(t.pin_id)}`);
        say(`       ${v('IMPRESSION')} impressions, ${v('SAVE')} saves, ${v('OUTBOUND_CLICK')} clicks · https://www.pinterest.com/pin/${t.pin_id}/`);
      }
    }
  }

  // New Pins and what's coming.
  const fresh = pins.filter((p) => p.created >= day(30));
  const freshTotals = zero();
  fresh.forEach((p) => add(freshTotals, p.metrics?.lifetime_metrics));
  say();
  say('NEW PINS (published in the last 30 days)');
  say(`  ${fresh.length} Pins: ${line(freshTotals)} so far.`);
  const nameOf = (key: string) => BOARD_NAMES[key as keyof typeof BOARD_NAMES].split(/[:&|]/)[0].trim();
  const ahead = entries.filter((e) => e.approved && e.release > day(0) && e.release <= day(-30));
  const count = (list: typeof entries) => Object.entries(Object.groupBy(list, (e) => e.board)).map(([k, v]) => `${nameOf(k)} ${v!.length}`).join(', ');
  say();
  say('CALENDAR');
  say(`  Next 30 days: ${ahead.length} Pins scheduled (${count(ahead) || 'none'}).`);
  const lastDates = Object.entries(Object.groupBy(entries.filter((e) => e.approved), (e) => e.board))
    .map(([k, v]) => `${nameOf(k)} ${v!.map((e) => e.release).sort().at(-1)}`);
  say(`  Last scheduled day per board: ${lastDates.join(', ')}.`);
  const noAlt = pins.filter((p) => !p.alt).length;
  if (noAlt) say(`  ${noAlt} Pins have no alt text (runbook: "Weekly: alt text").`);
  say();
  say('Full data: https://biblesketch.app/api/pinterest (connect, then Stats). How to act on it: docs/pinterest-runbook.md.');

  return { text: out.join('\n'), snapshot };
}

// Sends the report; on failure sends the error instead, so a broken connection never goes unnoticed.
export async function emailReport() {
  const subject = `Bible Sketch Pinterest report, ${day(0)}`;
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

// Checks functions/email.js (docs/email-marketing-plan.md §6.11): the rules for which email is due, and that every
// email renders with its fallbacks. No network, no Firebase.
//   node scripts/email-check.mjs                   the rule checks
//   node scripts/email-check.mjs --render=<email>  also writes every email, filled with sample data, to
//                                                 email-samples.json in the current folder (for owner test sends)
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const { EMAILS, render, due, firstName, offerEnd, OUTAGE, DAY, HOUR } = createRequire(import.meta.url)('../functions/email.js');

// A Tuesday, 11 a.m. Eastern.
const NOW = Date.parse('2026-10-13T15:00:00Z');
const base = { verified: true, email: 'a@example.com', optIn: true, optInSource: 'signup', createdAt: NOW, credits: 5, printsLeft: 10, fired: {} };
const at = (patch, now = NOW) => due({ ...base, ...patch, fired: { ...patch.fired } }, now);

// The welcome and the banner note go out at once, whatever the hour.
assert.equal(at({}), 'w0');
assert.equal(at({}, Date.parse('2026-10-13T07:00:00Z')), 'w0'); // 3 a.m. Eastern
assert.equal(at({ optInSource: 'banner', createdAt: NOW - 200 * DAY }), 'joined');
assert.equal(at({ verified: false }), null);
assert.equal(at({ unsubscribedAt: NOW }), null);
assert.equal(at({ optIn: false }), null);
assert.equal(at({ createdAt: NOW - 15 * DAY }), null, 'no welcome after 14 days');
// The sort the next day, unless the sign-up already answered it; never within 20 hours of another email.
const w0 = NOW - 25 * HOUR;
assert.equal(at({ createdAt: w0, fired: { w0 } }), 'w1');
assert.equal(at({ createdAt: w0, persona: 'teacher', fired: { w0 } }), null);
assert.equal(at({ createdAt: NOW - 10 * HOUR, fired: { w0: NOW - 10 * HOUR } }), null);
assert.equal(at({ createdAt: w0, fired: { w0 } }, Date.parse('2026-10-14T03:00:00Z')), null, 'quiet hours');
// Activation: A1 on day 2 without a page, A2 a day after the first page, A3 on day 7; they stop at a page.
const c = NOW - 2 * DAY - HOUR;
assert.equal(at({ createdAt: c, fired: { w0: c, w1: c + DAY } }), 'a1');
assert.equal(at({ createdAt: c, pagesMade: 1, firstPageAt: c + HOUR, fired: { w0: c, w1: c + DAY } }), 'a2');
const d7 = NOW - 7 * DAY - HOUR;
assert.equal(at({ createdAt: d7, fired: { w0: d7, w1: d7 + DAY, a1: d7 + 2 * DAY } }), 'a3');
assert.equal(at({ createdAt: d7, pagesMade: 2, firstPageAt: d7 + 3 * DAY, fired: { w0: d7, w1: d7 + DAY, a2: d7 + 4 * DAY } }), null);
// Three emails a week at most.
assert.equal(at({ createdAt: d7 + 2 * HOUR, credits: 0, fired: { w0: NOW - 6 * DAY, w1: NOW - 5 * DAY, a1: NOW - 4 * DAY } }), null);
// Offers: never to buyers or Premium; one a week; the print offers never while printing is unlimited.
const old = { createdAt: NOW - 60 * DAY, fired: { w0: NOW - 60 * DAY } };
assert.equal(at({ ...old, credits: 1, pagesMade: 4 }), 'c1');
assert.equal(at({ ...old, credits: 1 }), null, 'C1 needs a page made');
assert.equal(at({ ...old, credits: 0, pagesMade: 5 }), 'c2');
assert.equal(at({ ...old, credits: 0, pagesMade: 5, bought: true }), null);
assert.equal(at({ ...old, credits: 0, pagesMade: 5, isPremium: true }), null);
assert.equal(at({ ...old, printsLeft: 1 }), 'c6');
assert.equal(at({ ...old, printsLeft: 1, unlimitedUntil: NOW + DAY }), null);
assert.equal(at({ ...old, printsLeft: 0, fired: { ...old.fired, c6: NOW - 3 * DAY } }), null, 'one offer a week');
assert.equal(at({ ...old, printsLeft: 0, fired: { ...old.fired, c6: NOW - 8 * DAY } }), 'c7');
// The 7-day offer: a reminder on day 5, the last-day note on day 7, then nothing for 90 days.
const c7 = NOW - 5 * DAY - HOUR;
const offer = { offers: { c7: { expiresAt: offerEnd(c7) } }, printsLeft: 0 };
assert.equal(at({ ...old, ...offer, fired: { ...old.fired, c7 } }), 'c7b');
const lastDay = offerEnd(c7) - 10 * HOUR;
assert.equal(at({ ...old, ...offer, fired: { ...old.fired, c7, c7b: c7 + 5 * DAY } }, lastDay), 'c7c');
assert.equal(at({ ...old, ...offer, fired: { ...old.fired, c7, c7b: c7 + 5 * DAY, c7c: lastDay } }, offerEnd(c7) + 30 * DAY), null);
assert.equal(at({ ...old, printsLeft: 0, offers: { c7: { expiresAt: offerEnd(NOW - 91 * DAY) } }, fired: { ...old.fired, c7: NOW - 91 * DAY } }), 'c7');
// The outage cohort: only inside their 6 months (or opted in), never after a purchase, on the fixed dates.
const cohort = { optIn: false, optInSource: undefined, createdAt: Date.parse('2026-06-01T00:00:00Z'), outage: true, unlimitedUntil: OUTAGE.until, printsLeft: 5 };
assert.equal(at(cohort, OUTAGE.checkIn + HOUR), 'o23');
assert.equal(at(cohort, OUTAGE.ends + HOUR), 'o27');
assert.equal(at(cohort, OUTAGE.lastDay + HOUR), 'o30');
assert.equal(at({ ...cohort, bought: true }, OUTAGE.ends + HOUR), null);
assert.equal(at({ ...cohort, createdAt: Date.parse('2026-04-01T00:00:00Z') }, OUTAGE.ends + HOUR), null, '6 months are up');
assert.equal(at({ ...cohort, createdAt: Date.parse('2026-04-01T00:00:00Z'), optIn: true, optInSource: 'banner', fired: { joined: NOW - 9 * DAY } }, OUTAGE.ends + HOUR), 'o27');
assert.equal(at({ ...cohort, unlimitedUntil: OUTAGE.until + 30 * DAY }, OUTAGE.ends + HOUR), null, 'already on a Prints plan');
// No print offer within 14 days of the outage offer.
assert.equal(at({ ...old, printsLeft: 0, outage: true, fired: { ...old.fired, o30: NOW - 3 * DAY } }), null);
// Names.
for (const [n, want] of [['Sarah Jones', 'Sarah'], ['TEACHER', null], ['LyndaSpector', 'Lynda'], ['LaToya', 'LaToya'], ['', null]]) {
  assert.equal(firstName(n), want, n);
}

// Every email renders, with and without the optional fields, and keeps the CASL footer.
const sample = {
  uid: 'test', email: 'a@example.com', first: 'Renaud', optInAt: NOW, timezone: 'America/Vancouver',
  unsubUrl: 'https://biblesketch.app/api/email/unsubscribe?u=test&t=test', landingBook: 'Luke', printsLeft: 10,
  firstPageRef: 'Mark 4:39', offerStart: NOW, offerEnds: offerEnd(NOW), offerUrl: 'https://biblesketch.app/api/email/offer?u=test&t=test',
  outageSubject: 'Renaud',
  picks: [
    { label: 'Luke 2:15-16', path: '/coloring-page/luke-2-15-16/We00Ov9kuCvTi2Za34d3' },
    { label: 'Mark 4:39', path: '/coloring-page/mark-4-39/k8SwvZ2J8jALuFiS3UPW' },
    { label: 'Joshua 1:9', path: '/coloring-page/joshua-1-9/WrFh8ilVdsYQzrxmChsO' },
  ],
};
const bare = { uid: 'test', email: 'a@example.com', unsubUrl: sample.unsubUrl, optInAt: NOW, printsLeft: 10, offerStart: NOW, offerEnds: offerEnd(NOW), offerUrl: sample.offerUrl, picks: sample.picks };
for (const id of Object.keys(EMAILS)) {
  for (const p of [sample, bare]) {
    const e = render(id, p, NOW);
    for (const part of [e.text, e.html, e.subject]) assert.ok(!/undefined|null|NaN|Invalid Date/.test(part), `${id}: ${part}`);
    assert.ok(e.text.includes('Supersonic Sites Inc.') && e.html.includes('Unsubscribe'), id);
    const words = e.text.split('\n\n--')[0].split(/\s+/).length;
    assert.ok(words <= (id === 'w0' ? 190 : 110), `${id}: ${words} words`);
  }
}
// Replies to hello@ (web/src/lib/email-reply.ts): only clear answers are acted on.
const { parseReply } = await import('../web/src/lib/email-reply.ts');
const W1 = 're: Your Bible Sketch account (5 free pages)';
const quoted = '\n\nOn Tue, Oct 13, 2026 at 9:00 AM Renaud from Bible Sketch <renaud@e.biblesketch.app> wrote:\n> are these pages for a class, or for your kids at home?';
for (const [subject, text, want] of [
  ['Unsubscribe', '', 'unsubscribe'],
  ['re: quick question', 'Please remove me from this list', 'unsubscribe'],
  [W1, 'For my Sunday school class!' + quoted, 'teacher'],
  [W1, 'My kids at home, we homeschool', 'family'],
  ['Re: your 5 extra prints', 'Just for me, I color in the evenings', 'adult'],
  [W1, 'Both! I teach a class and use them with my kids at home', null],
  [W1, 'Thanks' + quoted, null],
  ['re: quick question', 'For my class', null],
]) assert.equal(parseReply(subject, text)?.value ?? parseReply(subject, text)?.kind ?? null, want, text);

console.log(`email-check: all rules pass (${Object.keys(EMAILS).length} emails render, replies parse)`);

const to = process.argv.find((a) => a.startsWith('--render='))?.slice(9);
if (to) {
  const now = Date.now();
  const out = Object.keys(EMAILS).map((id) => ({ id, ...render(id, { ...sample, email: to, optInAt: now, offerStart: now, offerEnds: offerEnd(now) }, now) }));
  writeFileSync('email-samples.json', JSON.stringify(out, null, 2));
  console.log(`wrote ${out.length} emails to email-samples.json`);
}

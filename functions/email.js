// Lifecycle email (docs/email-marketing-plan.md §5, §6.11, §12.1, §12.20): the words of every email, and which one a
// person is due next. Pure functions, no Firebase: scripts/email-check.mjs tests the rules and renders test sends.
'use strict';

const SITE = 'https://biblesketch.app';
const FROM = 'Renaud from Bible Sketch <renaud@e.biblesketch.app>';
const REPLY_TO = 'hello@biblesketch.app';
const ADDRESS = 'Bible Sketch · Supersonic Sites Inc. · 109b - 1917 Peninsula Rd, Ucluelet, BC V0R 3A0, Canada · hello@biblesketch.app';
const HOUR = 36e5;
const DAY = 24 * HOUR;
const PRINTS_PLAN_URL = 'https://billing.zohosecure.ca/subscribe/16bb18d1e24b94dc61c8488c1a133d491f563cd205dd5841ec6a82f3d2da95da/bible-sketch-prints-monthly';

// The outage win-back (§12.1): emailed 2026-09-29 15:00 UTC, unlimited prints until Oct 29 15:00 UTC.
const OUTAGE = {
  checkIn: Date.parse('2026-10-22T15:00:00Z'), ends: Date.parse('2026-10-26T15:00:00Z'),
  lastDay: Date.parse('2026-10-28T15:00:00Z'), until: Date.parse('2026-10-29T15:00:00Z'),
  offerUntil: Date.parse('2026-11-06T04:59:00Z'), // end of Nov 5, Eastern
};
const IMPLIED_CONSENT_MS = 183 * DAY; // CASL: 6 months after the sign-up, for people who never opted in
const OFFER_DAYS = 7;
const FIRST_PACK_BONUS = 10;

// First word of the display name, only if it looks like a first name (same rules as scripts/outage-winback.mjs).
const NOT_NAMES = new Set(['teacher', 'profe', 'nursery', 'city', 'church', 'real', 'admin', 'info', 'office', 'kids',
  'children', 'ministry', 'school', 'sunday', 'pastor', 'youth', 'team', 'the', 'mom', 'mama', 'test']);
function firstName(display) {
  let w = String(display || '').trim().split(/\s+/)[0] || '';
  const merged = w.match(/^(\p{Lu}\p{Ll}{2,})(\p{Lu}\p{Ll}{4,})$/u);
  if (merged) w = merged[1];
  if (!/^\p{L}[\p{L}'’-]{1,19}$/u.test(w) || (w.length > 2 && w === w.toUpperCase()) || NOT_NAMES.has(w.toLowerCase())) return null;
  return w[0].toUpperCase() + w.slice(1);
}

const link = (path, campaign, params = {}) => {
  const u = new URL(path, SITE);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  u.searchParams.set('utm_source', 'email');
  u.searchParams.set('utm_medium', 'email');
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
};
const dateIn = (ms, tz, opts) => new Date(ms).toLocaleDateString('en-US', { timeZone: tz || 'America/New_York', ...opts });
const longDate = (ms, tz) => dateIn(ms, tz, { weekday: 'long', month: 'long', day: 'numeric' });
const shortDate = (ms, tz) => dateIn(ms, tz, { month: 'long', day: 'numeric' });

// The generator, filled in but not started (a click never spends a credit; web Generator.tsx reads these).
const AGE_STYLE = { Toddler: 'Sunday School', 'Young Child': 'Sunday School', Teen: 'Classic', Adult: 'Classic' };
const ageOf = (p) => p.ageGroup || (p.persona === 'adult' ? 'Adult' : 'Young Child');
const maker = (p, campaign, [book, chapter, verse, to]) =>
  link('/', campaign, { book, chapter, verse, to, age: ageOf(p), style: AGE_STYLE[ageOf(p)] });

// Stories for A1, and the season's story and gallery for the super-signature.
const STORIES = [['Noah’s ark', ['Genesis', 7, 7, 9]], ['David and Goliath', ['1 Samuel', 17, 48, 50]],
  ['Jonah and the big fish', ['Jonah', 1, 17]]];
function season(now) {
  const m = new Date(now).getUTCMonth() + 1;
  if (m >= 10) return { story: ['The first Christmas', ['Luke', 2, 8, 11]], tag: 'christmas', line: 'Christmas is coming: the nativity pages are ready to print.' };
  if (m <= 4) return { story: ['The empty tomb', ['Matthew', 28, 5, 6]], tag: 'easter', line: 'Easter is coming: the Easter pages are ready to print.' };
  return { story: ['Jesus calms the storm', ['Mark', 4, 37, 39]], tag: 'miracles', line: 'Back to Sunday school: the miracle pages are ready to print.' };
}

// Zoho charges in CAD, plus sales tax (§12.20): the copy never says a bare "$1.99".
const PREMIUM = 'about US$5 a month (CAD 7.00, plus tax)';
const PRINTS = 'about US$2 a month (CAD 2.79, plus tax)';

// Each email: subject, paragraphs ([label](url) marks a link), and optional super-signature lines.
// `p` is the person (built by emailTick in index.js); every field used here has a fallback (§12.14).
const EMAILS = {
  w0: (p, now) => {
    const s = season(now);
    return {
      subject: 'Your Bible Sketch account (5 free pages)',
      body: [
        'Welcome to Bible Sketch! This is the automatic welcome, so here’s everything in one place.',
        `You have 5 free pages to make and 10 free prints, 5 of them for joining these emails. ${p.landingBook
          ? `Here are more pages from ${p.landingBook}, like the one you found, ready to print: [${p.landingBook} coloring pages](${link('/gallery', 'w0', { book: p.landingBook })})`
          : `Here are the newest pages, ready to print: [the gallery](${link('/gallery', 'w0')})`}`,
        'I built Bible Sketch for my own Sunday school class and my four kids, and I read every reply.',
      ],
      sig: [
        [`Make your own page from any Bible passage, for any age, in about 30 seconds.`, link('/', 'w0-sig')],
        [s.line, link('/gallery', 'w0-sig', { tag: s.tag })],
        ['Teaching a group? The Beacon is 200 pages at 15¢ each, and pages never expire.', link('/pricing', 'w0-sig')],
      ],
      threadId: 'w0',
    };
  },
  w1: () => ({
    subject: 're: Your Bible Sketch account (5 free pages)',
    body: ['Quick question: are these pages for a class, or for your kids at home?'],
    replyTo: 'w0',
  }),
  joined: (p, now) => ({
    subject: 'your 5 extra prints',
    body: [
      p.unlimitedUntil > now
        ? `Thanks for joining. Printing is unlimited for you until ${shortDate(p.unlimitedUntil, p.timezone)}, and your 5 extra prints will be waiting after that.`
        : `Thanks for joining. Your 5 extra prints are in your account, so you have ${p.printsLeft} prints to use now.`,
      'Quick question, so I send you the right pages: are they for a class, or for your kids at home?',
    ],
  }),
  a1: (p, now) => ({
    subject: p.first ? `${p.first}, want a head start?` : 'want a head start?',
    body: [
      'Want a head start on your first page? Pick a story and it’s ready in about 30 seconds:',
      [...STORIES, season(now).story].map(([name, ref]) => `[${name}](${maker(p, 'a1', ref)})`).join(' · '),
      'It uses one of your free pages, and you can change the passage or the age before you start.',
    ],
  }),
  a2: (p) => ({
    subject: 'how did it turn out?',
    body: [`How did your ${p.firstPageRef || 'first'} page turn out? If anything looked off, hit reply and tell me. I read every reply, and it helps me make the pages better.`],
  }),
  a3: (p) => ({
    subject: '3 pages ready to print',
    body: [
      'If you haven’t had time to make your own page yet, here are 3 finished ones, ready to print:',
      (p.picks || []).map((x) => `[${x.label}](${link(x.path, 'a3')})`).join(' · '),
    ],
  }),
  c1: () => ({
    subject: 'one page left',
    body: [`You have one free page left. If you’d like to keep going, the Torch pack is 80 pages for $14.99, and pages never expire. [See the packs](${link('/pricing', 'c1')})`],
  }),
  c2: (p) => ({
    subject: 'out of pages?',
    body: [`You’ve used your free pages. If you’d like to keep going, get any pack by ${longDate(p.offerEnds, p.timezone)} and I’ll add ${FIRST_PACK_BONUS} extra pages to it. [See the packs](${link('/pricing', 'c2')})`],
  }),
  c6: () => ({
    subject: 'one print left',
    body: [`You have one free print left. Premium is unlimited prints plus 10 new pages a month, for ${PREMIUM}. Cancel anytime. [Get Premium](${link('/pricing', 'c6')})`],
  }),
  c7: (p) => ({
    subject: 'out of prints?',
    body: [
      `You’ve used all your free prints. Just for you, until ${longDate(p.offerEnds, p.timezone)}: unlimited prints for ${PRINTS}. Cancel anytime. [Keep printing](${p.offerUrl})`,
      `Want to make new pages too? Premium is ${PREMIUM}.`,
    ],
    threadId: `c7-${p.offerStart}`,
  }),
  c7b: (p) => ({
    subject: 're: out of prints?',
    body: [`A quick reminder: unlimited prints for ${PRINTS} are yours until ${longDate(p.offerEnds, p.timezone)}. [Keep printing](${p.offerUrl})`],
    replyTo: `c7-${p.offerStart}`,
  }),
  c7c: (p) => ({
    subject: 'last day',
    body: [`Today is the last day of your offer: unlimited prints for ${PRINTS}. After tonight the link stops working. [Keep printing](${p.offerUrl})`],
  }),
  o23: (p) => ({
    subject: `re: ${p.outageSubject || 'quick question'}`,
    body: [`What have you printed so far? Printing is still unlimited for you until ${shortDate(OUTAGE.until)}, and I’d love to hear what you’re using the pages for.`],
    outage: true,
  }),
  o27: (p) => ({
    subject: `unlimited ends ${dateIn(OUTAGE.until, null, { month: 'short', day: 'numeric' })}`,
    body: [
      `A heads-up: your unlimited printing ends on ${longDate(OUTAGE.until)}. If you’d like to keep it, unlimited prints are ${PRINTS}, and you can cancel anytime. [Keep printing](${p.offerUrl})`,
      `Want to make new pages too? Premium is ${PREMIUM}.`,
    ],
    outage: true,
  }),
  o30: (p) => ({
    subject: 'ends tomorrow',
    body: [`Your unlimited printing ends tomorrow, ${shortDate(OUTAGE.until)}. If you’d like to keep printing without limits, it’s ${PRINTS}. [Keep printing](${p.offerUrl}) The link works until ${shortDate(OUTAGE.offerUntil)}.`],
    outage: true,
  }),
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;
const asText = (s) => s.replace(LINK, '$1: $2');
const asHtml = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}" style="color:#6d28d9">${t}</a>`);
const threadHeader = (key, uid) => `<${key}.${uid}@e.biblesketch.app>`;

// One ready-to-send Resend email for person `p` (needs uid, email, first, unsubUrl, and optInAt unless outage).
function render(id, p, now = Date.now()) {
  const e = EMAILS[id](p, now);
  const hi = p.first ? `Hi ${p.first},` : 'Hi,';
  const why = e.outage || !p.optInAt
    ? 'You’re getting this because you created a Bible Sketch account.'
    : `You’re getting this because you asked for Bible Sketch emails on ${dateIn(p.optInAt, p.timezone, { month: 'long', day: 'numeric', year: 'numeric' })}.`;
  const sig = e.sig ? ['3 ways we can help this week:', ...e.sig.map(([t, u]) => `- ${t} ${u}`)].join('\n') : null;
  const text = [hi, ...e.body.map(asText), 'Renaud\nBible Sketch', sig, '--', `${why} ${ADDRESS}`, `Unsubscribe: ${p.unsubUrl}`]
    .filter(Boolean).join('\n\n');
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:560px">'
    + [hi, ...e.body].map((x) => `<p>${asHtml(x)}</p>`).join('')
    + '<p>Renaud<br>Bible Sketch</p>'
    + (e.sig ? `<p style="margin-top:22px;font-size:14px;color:#444"><strong>3 ways we can help this week:</strong></p><ul style="font-size:14px;color:#444;padding-left:20px">${e.sig.map(([t, u]) => `<li style="margin-bottom:6px">${esc(t)} <a href="${esc(u)}" style="color:#6d28d9">Go</a></li>`).join('')}</ul>` : '')
    + `<p style="margin-top:28px;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#888">${esc(why)} ${esc(ADDRESS)} · <a href="${esc(p.unsubUrl)}" style="color:#888">Unsubscribe</a></p></div>`;
  const headers = {
    'List-Unsubscribe': `<${p.unsubUrl}>, <mailto:${REPLY_TO}?subject=Unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
  // "re:" emails thread under the email they answer (§12.10).
  if (e.threadId) headers['Message-ID'] = threadHeader(e.threadId, p.uid);
  if (e.replyTo) headers['In-Reply-To'] = headers.References = threadHeader(e.replyTo, p.uid);
  return {
    from: FROM, to: p.email, reply_to: REPLY_TO, subject: e.subject, text, html, headers,
    tags: [{ name: 'campaign', value: id }],
  };
}

const CONVERSION = ['c1', 'c2', 'c6', 'c7'];
const QUIET_OK = new Set(['w0', 'joined']); // answers to something they just did: sent at any hour

// Which email person `s` is due now, or null. `s.fired` holds when each email went out (c7* are per round).
// Order when several are due (§6.11): welcome, activation, the outage and 7-day-offer follow-ups, then offers.
function due(s, now = Date.now()) {
  if (!s.verified || !s.email || s.unsubscribedAt || s.suppressedAt) return null;
  const f = s.fired || {};
  const ago = (t) => (t ? now - t : Infinity);
  const unlimited = Boolean(s.isPremium) || (s.unlimitedUntil || 0) > now;
  const young = ago(s.createdAt) < 14 * DAY;
  const pick = (id) => (QUIET_OK.has(id) || quietHoursOver(now, s.timezone) ? id : null);

  if (s.optIn && s.optInSource === 'signup' && young && !f.w0) return 'w0';
  if (s.optIn && s.optInSource !== 'signup' && !f.joined && !f.w0) return 'joined';

  const times = Object.values(f).filter(Boolean);
  if (times.some((t) => ago(t) < 20 * HOUR)) return null; // one email a day at most
  if (times.filter((t) => ago(t) < 7 * DAY).length >= 3) return null; // three a week at most

  if (s.optIn && f.w0) {
    if (!f.w1 && !s.persona && ago(f.w0) >= DAY && ago(f.w0) < 7 * DAY) return pick('w1');
    if (!f.a1 && !s.pagesMade && ago(s.createdAt) >= 2 * DAY && ago(s.createdAt) < 7 * DAY) return pick('a1');
    if (!f.a2 && s.pagesMade && ago(s.firstPageAt) >= DAY && ago(s.firstPageAt) < 7 * DAY && ago(s.createdAt) < 30 * DAY) return pick('a2');
    if (!f.a3 && !s.pagesMade && ago(s.createdAt) >= 7 * DAY && ago(s.createdAt) < 10 * DAY) return pick('a3');
  }

  // The outage cohort: express consent, or still inside the 6 months after their sign-up.
  if (s.outage && (s.optIn || ago(s.createdAt) < IMPLIED_CONSENT_MS) && !s.bought && !s.isPremium) {
    const pass = (s.unlimitedUntil || 0) <= OUTAGE.until + DAY; // a Prints plan would run past the gift
    if (!f.o23 && now >= OUTAGE.checkIn && now < OUTAGE.ends) return pick('o23');
    if (pass && !f.o27 && now >= OUTAGE.ends && now < OUTAGE.lastDay) return pick('o27');
    if (pass && !f.o30 && now >= OUTAGE.lastDay && now < OUTAGE.until) return pick('o30');
  }

  if (!s.optIn || s.bought || s.isPremium) return null;
  const offer = s.offers?.c7;
  if (offer && f.c7 && now < offer.expiresAt) {
    if ((f.c7b || 0) < f.c7 && ago(f.c7) >= 5 * DAY) return pick('c7b');
    if ((f.c7c || 0) < f.c7 && now >= offer.expiresAt - 16 * HOUR) return pick('c7c');
    return null;
  }
  if (CONVERSION.some((k) => ago(f[k]) < 7 * DAY)) return null; // one offer a week
  if (!f.c1 && s.credits === 1 && s.pagesMade) return pick('c1');
  if (!f.c2 && s.credits === 0) return pick('c2');
  if (!unlimited && !f.c6 && s.printsLeft === 1) return pick('c6');
  const afterOutage = [f.o27, f.o30].some((t) => ago(t) < 14 * DAY);
  if (!unlimited && s.printsLeft === 0 && ago(f.c7) >= 90 * DAY && !afterOutage) return pick('c7');
  return null;
}

// 8 a.m. to 8 p.m. where they are (Eastern when we don't know or can't read their time zone).
const hourIn = (now, timeZone) => Number(new Date(now).toLocaleString('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }));
function quietHoursOver(now, tz) {
  let h;
  try { h = hourIn(now, tz || 'America/New_York'); } catch { h = hourIn(now, 'America/New_York'); }
  return h >= 8 && h < 20;
}

// An offer made now runs to the end of the day, Eastern, OFFER_DAYS days later ("until Friday, October 9").
const offerEnd = (now) => Date.parse(`${new Date(now + OFFER_DAYS * DAY).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })}T23:59:00-05:00`);

module.exports = { EMAILS, render, due, firstName, offerEnd, OUTAGE, OFFER_DAYS, FIRST_PACK_BONUS, PRINTS_PLAN_URL, SITE, DAY, HOUR };

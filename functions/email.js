// Lifecycle email (docs/email-marketing-plan.md §5, §6.11, §12.1, §12.20): the words of every email, and which one a
// person is due next. Pure functions, no Firebase: scripts/email-check.mjs tests the rules and renders test sends.
'use strict';

const crypto = require('crypto');
const SITE = 'https://biblesketch.app';
const FROM = 'Renaud from Bible Sketch <renaud@e.biblesketch.app>';
const REPLY_TO = 'hello@biblesketch.app';
const ADDRESS = 'Bible Sketch · Supersonic Sites Inc. · 109b - 1917 Peninsula Rd, Ucluelet, BC V0R 3A0, Canada · hello@biblesketch.app';
const HOUR = 36e5;
const DAY = 24 * HOUR;
const PRINTS_PLANS = { // the Zoho hosted checkouts, off the pricing page (§12.20)
  monthly: 'https://billing.zohosecure.ca/subscribe/16bb18d1e24b94dc61c8488c1a133d491f563cd205dd5841ec6a82f3d2da95da/bible-sketch-prints-monthly',
  yearly: 'https://billing.zohosecure.ca/subscribe/16bb18d1e24b94dc61c8488c1a133d491f563cd205dd5841ec6a82f3d2da95da/bible-sketch-prints-yearly',
};

// The outage win-back (§12.1): emailed 2026-09-29 15:00 UTC, unlimited prints until Oct 29 15:00 UTC.
const OUTAGE = {
  checkIn: Date.parse('2026-10-22T15:00:00Z'), ends: Date.parse('2026-10-26T15:00:00Z'),
  lastDay: Date.parse('2026-10-28T15:00:00Z'), until: Date.parse('2026-10-29T15:00:00Z'),
  offerUntil: Date.parse('2026-11-06T04:59:00Z'), // end of Nov 5, Eastern
};
// The Advent offer (owner, 2026-09-25): unlimited prints ($1.99 a month / $19.99 a year) for every subscriber who
// isn't already unlimited, from the first Sunday of Advent to the end of Dec 27 where they are. 8 a.m. Eastern marks.
// ponytail: 2026 dates by hand; next season, compute them (pins-plan.mjs has the computus).
const ADVENT = {
  start: Date.parse('2026-11-29T13:00:00Z'), reminder: Date.parse('2026-12-15T13:00:00Z'),
  lastDay: Date.parse('2026-12-27T13:00:00Z'), lastDate: '2026-12-27',
};
const IMPLIED_CONSENT_MS = 183 * DAY; // CASL: 6 months after the sign-up, for people who never opted in
const OFFER_DAYS = 7;
const FIRST_PACK_BONUS = 10;
const STUCK_MS = 3 * 864e5; // an offer about a balance waits until the balance has stayed put this long

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

// Prices are in USD, as on the pricing page; no other currency is shown (owner, 2026-09-25: we're international).
// The yearly Prints plan is 16% off 12 months and shown as a monthly figure (owner-approved, §12.20).
const PREMIUM = '$4.99 a month';
const PRINTS = '$1.99 a month';
const PRINTS_YEAR = '$19.99 for a whole year (that’s $1.67 a month)';
// The site's own words (pricing page, Account): a credit makes a new page of your own; a print prints or downloads any
// page. "Pages" alone means finished coloring pages.
const PREMIUM_LINE = 'Want to make pages of your own too? Premium is $4.99 a month and includes 10 credits.';
const yearly = (url) => `${url}&p=yearly`;
// $19.99 against 12 x $1.99 = $23.88: 16% off.
const PRINTS_YEAR_DEAL = '$19.99 for a whole year (save 16%: that’s $1.67 a month)';
const ADVENT_LINKS = (p) => `[Monthly](${p.offerUrl}) · [Yearly, save 16%](${yearly(p.offerUrl)})`;

// The Sunday Prep free page (§6.6): a signed, expiring link to the print PDF, checked by the Worker
// (web/src/lib/free-link.ts) with the same secret. `expSec` is Unix seconds.
const freeUrl = (sketchId, expSec, secret) =>
  `${SITE}/api/free/${encodeURIComponent(sketchId)}?t=${expSec}.${crypto.createHmac('sha256', secret).update(`free:${sketchId}:${expSec}`).digest('base64url')}`;
const FREE_LINK_DAYS = 28;

// Each email: subject, paragraphs ([label](url) marks a link), and optional super-signature lines.
// `p` is the person (built by emailTick in index.js); every field used here has a fallback (§12.14).
const EMAILS = {
  w0: (p, now) => {
    const s = season(now);
    return {
      subject: 'Your Bible Sketch account (10 free prints)',
      body: [
        'Welcome to Bible Sketch! This is the automatic welcome, so here’s everything in one place.',
        `Your account comes with 10 free prints (5 of them for joining these emails) and 5 free credits: each credit makes a new coloring page of your own, from any Bible passage. ${p.landingBook
          ? `Here are more pages from ${p.landingBook}, like the one you found, ready to print: [${p.landingBook} coloring pages](${link('/gallery', 'w0', { book: p.landingBook })})`
          : `Here are the newest pages, ready to print: [the gallery](${link('/gallery', 'w0')})`}`,
        'I built Bible Sketch for my own Sunday school class and my four kids, and I read every reply.',
      ],
      sig: [
        ['Make your own page from any Bible passage, for any age, in about 30 seconds.', link('/', 'w0-sig')],
        [s.line, link('/gallery', 'w0-sig', { tag: s.tag })],
        ['Teaching a group? The Beacon is 200 credits and 200 prints for $29.99, and credits never expire.', link('/pricing', 'w0-sig')],
      ],
    };
  },
  w1: () => ({
    subject: 're: Your Bible Sketch account (10 free prints)',
    body: ['Quick question: are these pages for a class, or for your kids at home?'],
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
      'Want a head start on your first page of your own? Pick a story and it’s ready in about 30 seconds:',
      [...STORIES, season(now).story].map(([name, ref]) => `[${name}](${maker(p, 'a1', ref)})`).join(' · '),
      'It uses one of your free credits, and you can change the passage or the age before you start.',
    ],
  }),
  a2: (p) => ({
    subject: 'how did it turn out?',
    body: [`How did the ${p.firstPageRef ? `${p.firstPageRef} ` : ''}page you made turn out? If anything looked off, hit reply and tell me. I read every reply, and it helps me make the pages better.`],
  }),
  a3: (p) => ({
    subject: '3 pages ready to print',
    body: [
      'If you haven’t had time to make a page of your own yet, here are 3 finished ones, ready to print:',
      (p.picks || []).map((x) => `[${x.label}](${link(x.path, 'a3')})`).join(' · '),
    ],
  }),
  c1: () => ({
    subject: 'one credit left',
    body: [`You have one free credit left, so one more page of your own. If you’d like to keep going, the Torch pack is 80 credits and 80 prints for $14.99, and credits never expire. [See the packs](${link('/pricing', 'c1')})`],
  }),
  c2: (p) => ({
    subject: 'out of credits?',
    body: [`You’ve used your free credits. If you’d like to make more pages of your own, get any pack by ${longDate(p.offerEnds, p.timezone)} and I’ll add ${FIRST_PACK_BONUS} extra credits to it. [See the packs](${link('/pricing', 'c2')})`],
  }),
  c6: () => ({
    subject: 'one print left',
    body: [`You have one free print left. Premium is ${PREMIUM} for unlimited prints plus 10 credits. Cancel anytime. [Get Premium](${link('/pricing', 'c6')})`],
  }),
  c7: (p) => ({
    subject: 'out of prints?',
    body: [
      `You’ve used all your free prints. Just for you, until ${longDate(p.offerEnds, p.timezone)}: unlimited prints for ${PRINTS}. Cancel anytime. [Keep printing](${p.offerUrl})`,
      `Printing every week? It’s ${PRINTS_YEAR}: [the yearly plan](${yearly(p.offerUrl)})`,
      PREMIUM_LINE,
    ],
  }),
  c7b: (p) => ({
    subject: 're: out of prints?',
    body: [`A quick reminder: unlimited prints for ${PRINTS}, or ${PRINTS_YEAR}, are yours until ${longDate(p.offerEnds, p.timezone)}. [Monthly](${p.offerUrl}) · [Yearly](${yearly(p.offerUrl)})`],
  }),
  c7c: (p) => ({
    subject: 'last day',
    body: [`Today is the last day of your offer: unlimited prints for ${PRINTS}, or ${PRINTS_YEAR}. After tonight the links stop working. [Monthly](${p.offerUrl}) · [Yearly](${yearly(p.offerUrl)})`],
  }),
  // The weekly flagship (§5.4). `p.issue` is this week's sundayPrep/<Thursday> doc, written by
  // scripts/sunday-prep.mjs and approved by the owner: subject, story, text (1-2 sentences), ref, freeUrl.
  sp: (p, now) => {
    const i = p.issue;
    const c = `sp-${i.date}`;
    return {
      subject: i.subject,
      body: [
        i.text,
        // One link: A4 outside the Americas (by time zone), Letter otherwise.
        `Here’s the page, free to print from this email (no sign-in, and it doesn’t use a print): [${i.story}, ready to print](${i.freeUrl}${p.timezone && !p.timezone.startsWith('America/') ? '&paper=a4' : ''})`,
        `Need it simpler, or for older kids? [Make your own version](${maker(p, c, i.ref)})`,
      ],
      sig: [
        [season(now).line, link('/gallery', `${c}-sig`, { tag: season(now).tag })],
        ['Make your own page from any Bible passage, for any age, in about 30 seconds.', link('/', `${c}-sig`)],
        p.bought || p.isPremium
          ? ['Teaching a group? The Beacon is 200 credits and 200 prints for $29.99, and credits never expire.', link('/pricing', `${c}-sig`)]
          : [`Printing every week? Premium is ${PREMIUM} for unlimited prints, plus 10 credits.`, link('/pricing', `${c}-sig`)],
      ],
    };
  },
  // One offer only, no credits (owner, 2026-09-25): unlimited prints of any page, with the yearly saving spelled out.
  adv: (p) => ({
    subject: 'unlimited prints for Advent',
    body: [
      `It’s Advent! Until ${longDate(p.offerEnds, p.timezone)}, you can get unlimited prints: print any page on Bible Sketch, from the gallery, from these emails or pages you made yourself, as often as you like.`,
      `It’s ${PRINTS}, or ${PRINTS_YEAR_DEAL}. Cancel anytime. ${ADVENT_LINKS(p)}`,
    ],
  }),
  adv2: (p) => ({
    subject: 're: unlimited prints for Advent',
    body: [`A quick reminder: unlimited prints of any page, Christmas pages included, for ${PRINTS} or ${PRINTS_YEAR_DEAL}, until ${longDate(p.offerEnds, p.timezone)}. ${ADVENT_LINKS(p)}`],
  }),
  adv3: (p) => ({
    subject: 'last day',
    body: [`Today is the last day of the Advent offer: unlimited prints of any page for ${PRINTS}, or ${PRINTS_YEAR_DEAL}. After tonight the links stop working. ${ADVENT_LINKS(p)}`],
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
      `Printing every week? It’s ${PRINTS_YEAR}: [the yearly plan](${yearly(p.offerUrl)})`,
      PREMIUM_LINE,
    ],
    outage: true,
  }),
  o30: (p) => ({
    subject: 'ends tomorrow',
    body: [`Your unlimited printing ends tomorrow, ${shortDate(OUTAGE.until)}. To keep printing without limits, it’s ${PRINTS}, or ${PRINTS_YEAR}. [Monthly](${p.offerUrl}) · [Yearly](${yearly(p.offerUrl)}) The links work until ${shortDate(OUTAGE.offerUntil)}.`],
    outage: true,
  }),
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;
const asText = (s) => s.replace(LINK, '$1: $2');
const asHtml = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}" style="color:#6d28d9">${t}</a>`);

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
  // "re:" emails thread under the email they answer (§12.10), by that email's real Message-ID: Resend sends
  // through Amazon SES, which replaces any Message-ID we set, so emailTick looks it up (`p.inReplyTo`).
  if (p.inReplyTo) headers['In-Reply-To'] = headers.References = p.inReplyTo;
  return {
    from: FROM, to: p.email, reply_to: REPLY_TO, subject: e.subject, text, html, headers,
    tags: [{ name: 'campaign', value: id }],
  };
}

const CONVERSION = ['c1', 'c2', 'c6', 'c7'];
// The "re:" emails, and the email each one answers.
const REPLIES = { w1: 'w0', c7b: 'c7', adv2: 'adv' };
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

  // Sunday Prep: this week's approved issue, from its send time (Thu 8 a.m. ET, then 8 a.m. local) for 2 days;
  // not in someone's first 7 days, while the activation emails run.
  const i = s.issue;
  if (s.optIn && i && now >= i.sendAt && now < i.sendAt + 2 * DAY && (f.sp || 0) < i.sendAt && ago(s.createdAt) >= 7 * DAY) return pick('sp');

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

  // Advent (pack buyers included; not Premium or anyone already unlimited). The offer goes out after the welcome
  // and sort, and not within a week of another offer; the reminder and the last-day note follow it.
  const advent = now >= ADVENT.start && now < s.offers?.advent?.expiresAt;
  if (s.optIn && !s.isPremium && !unlimited && now >= ADVENT.start && now < ADVENT.lastDay + DAY) {
    if (!f.adv && now < ADVENT.lastDay - 3 * DAY && ago(s.createdAt) >= 2 * DAY && CONVERSION.every((k) => ago(f[k]) >= 7 * DAY)) return pick('adv');
    if (advent && !f.adv2 && now >= ADVENT.reminder && ago(f.adv) >= 3 * DAY) return pick('adv2');
    if (advent && !f.adv3 && now >= ADVENT.lastDay) return pick('adv3');
    if (f.adv) return null; // no other offer while this one runs
  }

  if (!s.optIn || s.bought || s.isPremium) return null;
  const offer = s.offers?.c7;
  if (offer && f.c7 && now < offer.expiresAt) {
    if ((f.c7b || 0) < f.c7 && ago(f.c7) >= 5 * DAY) return pick('c7b');
    if ((f.c7c || 0) < f.c7 && now >= offer.expiresAt - 16 * HOUR) return pick('c7c');
    return null;
  }
  if (CONVERSION.some((k) => ago(f[k]) < 7 * DAY)) return null; // one offer a week
  const stuck = (since) => ago(since || now) >= STUCK_MS; // since = when emailTick first saw today's balance
  if (!f.c1 && s.credits === 1 && s.pagesMade && stuck(s.creditsSince)) return pick('c1');
  if (!f.c2 && s.credits === 0 && stuck(s.creditsSince)) return pick('c2');
  if (!unlimited && !f.c6 && s.printsLeft === 1 && stuck(s.printsSince)) return pick('c6');
  const afterOutage = [f.o27, f.o30].some((t) => ago(t) < 14 * DAY);
  if (!unlimited && s.printsLeft === 0 && stuck(s.printsSince) && ago(f.c7) >= 90 * DAY && !afterOutage) return pick('c7');
  return null;
}

// 8 a.m. to 8 p.m. where they are (Eastern when we don't know or can't read their time zone).
const hourIn = (now, timeZone) => Number(new Date(now).toLocaleString('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }));
function quietHoursOver(now, tz) {
  let h;
  try { h = hourIn(now, tz || 'America/New_York'); } catch { h = hourIn(now, 'America/New_York'); }
  return h >= 8 && h < 20;
}

// An offer made now runs to 11:59 p.m. in the reader's time zone (Eastern when unknown), OFFER_DAYS days later,
// so "until Friday, October 9" is true where they are.
const zoneOf = (tz) => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz || 'America/New_York'; } catch { return 'America/New_York'; } };
function offerEnd(now, tz) {
  const zone = zoneOf(tz);
  return endOf(new Date(now + OFFER_DAYS * DAY).toLocaleDateString('en-CA', { timeZone: zone }), zone);
}
const adventEnd = (tz) => endOf(ADVENT.lastDate, zoneOf(tz));
// 11:59 p.m. on date `ymd` (YYYY-MM-DD) in `zone`.
function endOf(ymd, zone) {
  const day = new Date(`${ymd}T12:00:00Z`);
  const [, sign = '+', h = '0', m = '0'] = /GMT([+-])?(\d+)?(?::(\d+))?/.exec(day.toLocaleString('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })) || [];
  return Date.parse(`${ymd}T23:59:00${sign}${h.padStart(2, '0')}:${m.padStart(2, '0')}`);
}


// Purchase receipts (transactional: every buyer gets one, whatever their email choice; no offers in them).
// `t` is the purchase transaction written by handleZohoWebhook; `p` has uid, email, first, timezone.
const PACKS = { spark: ['The Spark', 20], torch: ['The Torch', 80], beacon: ['The Beacon', 200] };
const PORTAL = 'https://billing.zohosecure.ca/portal/biblesketch';
function receipt(t, p) {
  const start = `[Start making pages](${link('/', 'receipt')}) or [find pages to print](${link('/gallery', 'receipt')}).`;
  if (t.type === 'credit_purchase' && PACKS[t.pack]) {
    const [name, n] = PACKS[t.pack];
    return {
      subject: `Your ${name.replace('The ', '')} pack is ready`,
      body: [`Thank you! ${name} is in your account: ${n} credits (each one makes a new coloring page of your own, and they never expire) and ${n} prints.`, start],
    };
  }
  if (t.type === 'subscription') {
    const renewal = /renewal/i.test(t.description || '');
    return {
      subject: renewal ? 'Your 10 new credits are here' : 'Welcome to Premium',
      body: [
        renewal
          ? 'Your Premium membership renewed: 10 new credits are in your account, and printing stays unlimited.'
          : 'Thank you! Premium is on: unlimited prints and downloads, 10 credits every month to make pages of your own, and high-resolution PDFs with no watermark.',
        start,
        `To update your card or cancel, use [your billing page](${PORTAL}).`,
      ],
    };
  }
  if (t.type === 'prints_subscription') {
    const until = t.termEndsAt ? ` Your current period runs to ${longDate(Date.parse(t.termEndsAt), p.timezone)}, and it renews automatically.` : '';
    return {
      subject: 'Unlimited printing is on',
      body: [`Thank you! You can now print or download any page, as often as you like.${until}`, `[Find pages to print](${link('/gallery', 'receipt')}). To update your card or cancel, use [your billing page](${PORTAL}).`],
    };
  }
  return null;
}
function renderReceipt(t, p) {
  const r = receipt(t, p);
  if (!r) return null;
  const hi = p.first ? `Hi ${p.first},` : 'Hi,';
  const foot = `This is the receipt for your purchase on biblesketch.app. Questions? Just reply. ${ADDRESS}`;
  return {
    from: FROM, to: p.email, reply_to: REPLY_TO, subject: r.subject,
    text: [hi, ...r.body.map(asText), 'Renaud\nBible Sketch', '--', foot].join('\n\n'),
    html: '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:560px">'
      + [hi, ...r.body].map((x) => `<p>${asHtml(x)}</p>`).join('') + '<p>Renaud<br>Bible Sketch</p>'
      + `<p style="margin-top:28px;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#888">${esc(foot)}</p></div>`,
    tags: [{ name: 'campaign', value: `receipt-${t.type}` }],
  };
}

module.exports = { EMAILS, REPLIES, render, renderReceipt, due, firstName, offerEnd, adventEnd, ADVENT, freeUrl, FREE_LINK_DAYS, OUTAGE, OFFER_DAYS, FIRST_PACK_BONUS, PRINTS_PLANS, STUCK_MS, SITE, DAY, HOUR };

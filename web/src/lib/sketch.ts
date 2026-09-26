// Sketch helpers ported from the live bundle (hosting-public/assets/index-DHKtGwi1.js) and functions/index.js.
// Names in comments are the bundle's minified identifiers, so the port can be checked against the source.
// No Worker-only imports: scripts/check-sketch.mjs runs this file under plain Node.

import { FIREBASE, MASTER_UID } from './config.ts';
import { query } from './firestore.ts';

export const ORIGIN = 'https://biblesketch.app';
const BUCKET = FIREBASE.storageBucket;

export interface PromptData {
  book?: string;
  chapter?: number;
  start_verse?: number;
  end_verse?: number;
  age_group?: string;
  art_style?: string;
  font_style?: string;
}

export interface Sketch {
  id: string;
  userId?: string;
  imageUrl?: string;
  storagePath?: string;
  thumbnailPath?: string;
  type?: string;
  promptData?: PromptData;
  isPublic?: boolean;
  isBookmark?: boolean;
  blessCount?: number;
  createdAt?: string;
  tags?: string[];
  refAdded?: boolean; // "Add Ref" already drew the reference (editSketch)
}

// Same list as the bundle's `Yo` and constants.ts LITURGICAL_TAGS.
export const TAG_LABELS: Record<string, string> = {
  advent: 'Advent', christmas: 'Christmas', epiphany: 'Epiphany', lent: 'Lent', 'holy-week': 'Holy Week',
  easter: 'Easter', pentecost: 'Pentecost', 'ordinary-time': 'Ordinary Time', creation: 'Creation',
  'the-fall': 'The Fall', exile: 'Exile', prophets: 'Prophets', miracles: 'Miracles', parables: 'Parables',
  resurrection: 'Resurrection',
};

// `ep` / generateSketchSlug
export function slugOf(s: Sketch): string {
  if (!s.promptData) return 'bible-sketch';
  const { book, chapter, start_verse, end_verse } = s.promptData;
  let slug = `${book}-${chapter}-${start_verse}`;
  if (end_verse && start_verse !== undefined && end_verse > start_verse) slug += `-${end_verse}`;
  return slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export const canonicalPath = (s: Sketch) => `/coloring-page/${slugOf(s)}/${encodeURIComponent(s.id)}`;

// isDocId (functions/index.js): IDs Firestore accepts.
export const isDocId = (id: string) =>
  Boolean(id) && id !== '.' && id !== '..' && !/^__.*__$/.test(id) && new TextEncoder().encode(id).length <= 1500;

// thumbPathOf: <original>_400x533.<ext>, made by the Resize Images extension.
export const thumbPathOf = (s: Sketch) =>
  s.thumbnailPath || (s.storagePath && s.storagePath.replace(/(\.[^./]+)$/, '_400x533$1'));

// Tokenless download URL: storage.rules allow public get on sketch objects.
export const storageUrl = (path: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;

// First-party WebP thumbnail (src/pages/img/[...path].ts); the full-size original when there's no path.
export function thumbUrl(s: Sketch): string | undefined {
  const p = thumbPathOf(s);
  return p ? `/img/${p}` : s.imageUrl;
}

// Storage path of the original: storagePath, else the object name inside imageUrl (".../o/<path>?alt=media").
const originalPathOf = (s: Sketch) => {
  if (s.storagePath) return s.storagePath;
  const m = s.imageUrl?.match(/\/o\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
};

// The one public image of a page (og:image, JSON-LD, share buttons, image sitemap): never the full-size
// original. The owner's pages get an 800px preview; community pages the 400x533 thumbnail.
export function previewUrl(s: Sketch): string | undefined {
  const original = originalPathOf(s);
  if (original && s.userId === MASTER_UID && original.startsWith(`user_uploads/${MASTER_UID}/sketches/`)) {
    return `${ORIGIN}/img/w800/${original}`;
  }
  const thumb = thumbPathOf(s) || original?.replace(/(\.[^./]+)$/, '_400x533$1');
  return thumb ? `${ORIGIN}/img/${thumb}` : undefined;
}

// `Mc`: singular book name in the H1.
export const bookDisplay = (book: string) => (book === 'Psalms' ? 'Psalm' : book === 'Proverbs' ? 'Proverb' : book);

// Pre-Teen is shown as Teen on the page (`Rn`).
export const ageDisplay = (age?: string) => (age === 'Pre-Teen' ? 'Teen' : age);

// `XP`: "Genesis 1:3-5"
export function reference(p: PromptData): string {
  let v = '';
  if (p.start_verse) {
    v = `:${p.start_verse}`;
    if (p.end_verse && p.end_verse > p.start_verse) v += `-${p.end_verse}`;
  }
  return `${p.book} ${p.chapter}${v}`;
}

// The H1 text: bundle `_O` builds it with `Mc` and no ":" guard.
export function heading(p: PromptData): string {
  const range = p.end_verse && p.start_verse !== undefined && p.end_verse > p.start_verse ? `-${p.end_verse}` : '';
  return `${bookDisplay(p.book || '')} ${p.chapter}:${p.start_verse}${range} Coloring Page`;
}

// `eq` / `ZP`
const AUDIENCE: Record<string, string> = {
  Toddler: 'Toddlers', 'Young Child': 'Young Children', 'Pre-Teen': 'Pre-Teens', Teen: 'Teens', Adult: 'Adults',
  'All Ages': 'All Ages',
};
export const audience = (age?: string) => (age ? AUDIENCE[age] || age : 'All Ages');

const DESCRIPTIONS = [
  '{Book} {Verse} Coloring Page – Printable {Style} design. This scripture coloring sheet features text from the Book of {Book} and is perfect for {Audience}. Download this and other books of the bible coloring pages for free at {Brand}. \n\n{aidisclaimer}',
  'Need a meaningful activity for {Audience}? 🖍️ This {Book} {Verse} coloring page is a perfect lesson supplement for Sunday School or home Bible study. A beautiful {Style} way to help them memorize scripture. Get this printable for free from {Brand}. \n\n{aidisclaimer}',
  "Relax and meditate on God's word with this {Style} {Book} {Verse} coloring sheet. 🌿 Designed specifically for {Audience}, this printable art helps you focus on scripture while you color. Instant download available at {Brand}. \n\n{aidisclaimer}",
];

// `tq`
export function description(s: Sketch): string {
  const p = s.promptData!;
  const ref = reference(p);
  const book = p.book || '';
  const aud = audience(p.age_group);
  const style = p.art_style || 'Coloring Page';
  const tagHashes = s.tags ? s.tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ') : '';
  const fixed = '#biblecoloringpages #scripturecoloring #sundayschool #christiancoloring #biblecoloring #BibleSketch #aigenerated';
  const bookHashes = `#${book.replace(/\s+/g, '')} #${aud.replace(/\s+/g, '')}BibleStudy`;
  const hashes = `${tagHashes} ${fixed} ${bookHashes}`.trim();
  const verse = ref.replace(`${book} `, '') || ref;
  const text = DESCRIPTIONS[s.id.charCodeAt(0) % DESCRIPTIONS.length]
    .replace(/\{Book\}/g, book)
    .replace(/\{Verse\}/g, verse)
    .replace(/\{Style\}/g, style)
    .replace(/\{Audience\}/g, aud)
    .replace(/\{Brand\}/g, 'BibleSketch')
    .replace(/\{aidisclaimer\}/g, 'Disclaimer: This design was created with the help of AI tools.');
  return `${text}\n\n${hashes}`;
}

// `Gr`: title, description and the Pinterest description.
export function seo(s: Sketch) {
  if (!s.promptData) {
    return {
      title: 'Bible Coloring Page | Bible Sketch',
      description:
        'Free printable Bible coloring page. Perfect for Sunday School, VBS, homeschool, and family devotionals.',
      pinDescription: '',
    };
  }
  const title = `${reference(s.promptData)} Coloring Page | Printable Scripture for ${audience(s.promptData.age_group)}`;
  const desc = description(s);
  return { title, description: desc, pinDescription: `${title}\n\n${desc}` };
}

// Extra words for an owner page, from src/data/page-text.json (docs/seo-plan.md stage 3): the verse (WEB, filled
// by scripts/page-text-verses.mjs) and, later, a reviewed scene name and description.
export interface PageText { verse?: string; scene?: string; description?: string }

const clip = (t: string, n: number) => (t.length <= n ? t : `${t.slice(0, t.lastIndexOf(' ', n - 1)).replace(/[,;:]$/, '')}…`);

// Search snippet: about 150 characters, no hashtags or disclaimer. seo().description stays the Pinterest text.
export function metaDescription(s: Sketch, text?: PageText): string {
  const p = s.promptData;
  if (text?.description) return clip(text.description, 155);
  if (!p) return 'A Bible coloring page to print for Sunday school, VBS, homeschool and family devotions.';
  const ref = reference(p);
  return clip(s.type === 'verse'
    ? `${ref} Bible verse coloring page in ${p.font_style || 'Elegant Script'} lettering. Print it for Sunday school, Bible journaling or quiet time at home.`
    : `${ref} coloring page for ${audience(p.age_group).toLowerCase()}, drawn in ${p.art_style || 'Classic'} style. A Bible scene to print for Sunday school, homeschool or family devotions.`, 155);
}

// The line under the H1.
export function subtitleOf(s: Sketch): string {
  const p = s.promptData ?? {};
  return s.type === 'verse' ? `${p.font_style || 'Elegant Script'} verse art coloring page` : `Bible coloring page for ${audience(p.age_group)}`;
}

// Related sketches, same queries as sketchRender and the bundle's `B8` (indexes in firestore.indexes.json).
export function relatedQuery(s: Sketch): { filters: [string, string | boolean][]; heading: string } | null {
  const p = s.promptData || {};
  if (s.type === 'verse') {
    const filters: [string, string | boolean][] = [['isPublic', true], ['type', 'verse']];
    if (p.font_style) filters.push(['promptData.font_style', p.font_style]);
    return { filters, heading: 'More Bible Verse Art' };
  }
  if (!p.age_group || !p.art_style) return null;
  return {
    filters: [['isPublic', true], ['promptData.age_group', p.age_group], ['promptData.art_style', p.art_style]],
    heading: `More Bible Coloring Pages For ${ageDisplay(p.age_group)}`,
  };
}

// 8 related sketches: 9 fetched so dropping the current one still leaves 8. Bookmarks are never public,
// the filter is a belt-and-braces copy of sketchRender's.
export async function loadRelated(s: Sketch) {
  const q = relatedQuery(s);
  if (!q) return null;
  const docs = (await query('sketches', q.filters, 9)) as Sketch[];
  const items = docs.filter((d) => d.id !== s.id && !d.isBookmark).slice(0, 8);
  return items.length ? { heading: q.heading, items } : null;
}

// Display names for the authors of a listing: one users/<uid> read per distinct author, in parallel.
export async function loadAuthors(sketches: Sketch[]): Promise<Map<string, string>> {
  const uids = [...new Set(sketches.map((s) => s.userId).filter(Boolean) as string[])];
  const { getDoc } = await import('./firestore.ts');
  const names = await Promise.all(uids.map((uid) => getDoc('users', uid).then((u) => u?.displayName as string | undefined).catch(() => undefined)));
  return new Map(uids.flatMap((uid, i) => (names[i] ? [[uid, names[i]!] as [string, string]] : [])));
}

// JSON for <script type="application/ld+json">: `<` escaped so user text can't close the tag (jsonLd()).
export const jsonLd = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');

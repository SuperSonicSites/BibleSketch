// Story and verse collections (docs/seo-plan.md stage 9): /coloring-pages, /coloring-pages/<story> and
// /coloring-page/<verse-slug>. Only the owner's public pages are listed (stage 2: community pages can go private).
import data from '../data/stories.json';
import { query } from './firestore.ts';
import { MASTER_UID } from './config.ts';
import { BIBLE_BOOKS } from './listing.ts';
import { type Sketch, slugOf } from './sketch.ts';

export interface Story { id: string; name: string; wikidata?: string; adult?: string; ranges: [string, number, number, number, number][] }
export const STORIES = data.stories as Story[];

// Thresholds for search engines: fewer pages than this and the collection is noindexed (thin page).
export const STORY_MIN = 10;
export const VERSE_MIN = 3;

// A verse slug is what every coloring page URL already starts with: "luke-2-6-7", "1-kings-17-6". Firestore ids
// have no hyphen, so /coloring-page/<id> links keep working.
export const VERSE_SLUG = /^(?:\d-)?[a-z]+(?:-[a-z]+)*-\d+-\d+(?:-\d+)?$/;
const bookSlug = (b: string) => b.toLowerCase().replace(/\s+/g, '-');
export const bookOfSlug = (slug: string) =>
  BIBLE_BOOKS.filter((b) => slug.startsWith(`${bookSlug(b)}-`)).sort((a, b) => b.length - a.length)[0];

// Bible order: book, chapter, verse.
export const orderKey = (s: Sketch) => {
  const p = s.promptData ?? {};
  return BIBLE_BOOKS.indexOf(p.book ?? '') * 1e6 + (p.chapter ?? 0) * 1e3 + (p.start_verse ?? 0);
};
export const byBibleOrder = (a: Sketch, b: Sketch) => orderKey(a) - orderKey(b);

const inRange = (s: Sketch, [book, c1, v1, c2, v2]: Story['ranges'][number]) => {
  const p = s.promptData;
  if (!p || p.book !== book || p.chapter === undefined) return false;
  const at = p.chapter * 1000 + (p.start_verse ?? 1);
  return at >= c1 * 1000 + v1 && at <= c2 * 1000 + v2;
};
export const storyOf = (s: Sketch) => STORIES.find((st) => st.ranges.some((r) => inRange(s, r)));
export const storyById = (id: string) => STORIES.find((st) => st.id === id);

// The owner's public pages of some books (one equality-only query per book: no composite index needed).
export async function ownerPages(books: string[]): Promise<Sketch[]> {
  const lists = await Promise.all([...new Set(books)].map((book) =>
    query('sketches', [['userId', MASTER_UID], ['isPublic', true], ['promptData.book', book]], 500, { ordered: false })));
  return (lists.flat() as Sketch[]).filter((s) => !s.isBookmark && s.promptData?.book);
}
export const allOwnerPages = async () =>
  ((await query('sketches', [['userId', MASTER_UID], ['isPublic', true]], 2000, { ordered: false })) as Sketch[])
    .filter((s) => !s.isBookmark && s.promptData?.book);

export const pagesOfStory = (story: Story, pages: Sketch[]) =>
  pages.filter((s) => storyOf(s)?.id === story.id).sort(byBibleOrder);
export const pagesOfVerse = (slug: string, pages: Sketch[]) => pages.filter((s) => slugOf(s) === slug);

// "Luke 2:1-40, Matthew 1:18-25" for a story's ranges.
export const rangeText = (st: Story) =>
  st.ranges.map(([b, c1, v1, c2, v2]) => (c1 === c2 ? `${b} ${c1}:${v1}${v2 !== v1 ? `-${v2}` : ''}` : `${b} ${c1}-${c2}`)).join(', ');

// Generator link filled in with a passage (Generator.tsx reads ?book=&chapter=&verse=&to=).
export const makeYourOwn = (s: Sketch) => {
  const p = s.promptData ?? {};
  const q = new URLSearchParams({ book: p.book ?? '', chapter: String(p.chapter ?? 1), verse: String(p.start_verse ?? 1) });
  if (p.end_verse && p.start_verse !== undefined && p.end_verse > p.start_verse) q.set('to', String(p.end_verse));
  return `/?${q}`;
};

// Filtering, sorting and paging for sketch listings (tag and profile pages; the gallery later). Pure functions,
// no Worker imports. Filter values are normalised like the bundle's parsers (`wq/xq/Sq/vq`): unknown values
// become "All" (dropped), and legacy "Pre-Teen" data counts as Teen.
import type { Sketch } from './sketch.ts';

export const BIBLE_BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
export const AGE_GROUPS = ['Toddler', 'Young Child', 'Teen', 'Adult'];
export const ART_STYLES = ['Sunday School', 'Stained Glass', 'Iconography', 'Comic Book', 'Classic', 'Doodles'];
export const SEASONS = new Set(['advent', 'christmas', 'epiphany', 'lent', 'holy-week', 'easter', 'pentecost', 'ordinary-time']);
export const PAGE_SIZE = 24;

export interface Filters {
  book?: string;
  age?: string;
  style?: string;
  tag?: string;
  sort: 'popular' | 'newest';
  page: number;
}

export function parseFilters(params: URLSearchParams, defaults: { sort: 'popular' | 'newest'; tags?: string[] }): Filters {
  const pick = (v: string | null, list: string[]) => (v && list.includes(v) ? v : undefined);
  const age = params.get('age') === 'Pre-Teen' ? 'Teen' : params.get('age');
  const sort = params.get('sort');
  const page = Number(params.get('page'));
  return {
    book: pick(params.get('book'), BIBLE_BOOKS),
    age: pick(age, AGE_GROUPS),
    style: pick(params.get('style'), ART_STYLES),
    tag: defaults.tags ? pick(params.get('tag'), defaults.tags) : undefined,
    sort: sort === 'popular' || sort === 'newest' ? sort : defaults.sort,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

// The query string for a filter state, writing only non-default values (like the bundle's tag page).
export function filterQuery(f: Filters, defaultSort: string, page = f.page): string {
  const q = new URLSearchParams();
  if (f.book) q.set('book', f.book);
  if (f.age) q.set('age', f.age);
  if (f.style) q.set('style', f.style);
  if (f.tag) q.set('tag', f.tag);
  if (f.sort !== defaultSort) q.set('sort', f.sort);
  if (page > 1) q.set('page', String(page));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const isFiltered = (f: Filters) => Boolean(f.book || f.age || f.style || f.tag);

const ageOf = (s: Sketch) => (s.promptData?.age_group === 'Pre-Teen' ? 'Teen' : s.promptData?.age_group);

export function applyFilters(items: Sketch[], f: Filters): Sketch[] {
  const out = items.filter((s) =>
    !s.isBookmark
    && (!f.book || s.promptData?.book === f.book)
    && (!f.age || ageOf(s) === f.age)
    && (!f.style || s.promptData?.art_style === f.style)
    && (!f.tag || (s.tags ?? []).includes(f.tag)));
  const time = (s: Sketch) => (s.createdAt ? Date.parse(s.createdAt) : 0);
  return out.sort((a, b) =>
    f.sort === 'popular' ? (b.blessCount ?? 0) - (a.blessCount ?? 0) || time(b) - time(a) : time(b) - time(a));
}

export function paginate<T>(items: T[], page: number) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  return { items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), page: current, pages };
}

// Card second line (bundle gallery card): "Elegant Script" for Verse Art, else "Sunday School • Toddler".
export function cardSubtitle(s: Sketch): string {
  if (s.type === 'verse') return s.promptData?.font_style || 'Verse Art';
  return [s.promptData?.art_style, ageOf(s)].filter(Boolean).join(' • ');
}

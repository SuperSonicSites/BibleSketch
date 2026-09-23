// Blog posts come from functions/blog-posts.json, the file the sitemap function already reads, so there is one
// copy of the content (the live bundle had a second one). Each body is split at its shortcodes; the markdown
// between them is rendered at build time, sketch embeds are rendered per request (they read live data).
import { readFileSync } from 'node:fs';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const SOURCE = new URL('../../functions/blog-posts.json', import.meta.url);
const PUBLIC = new URL('../public/', import.meta.url);
const SHORTCODE = /<<sketch="([^"]+)">>|<<CTA>>/g;

// Real cover dimensions from the WebP header (the live head claimed 1200x630 for every cover).
function webpSize(path: string): { width: number; height: number } {
  const b = readFileSync(new URL(`.${path}`, PUBLIC));
  const i = b.indexOf('VP8');
  const kind = b.toString('latin1', i, i + 4);
  if (kind === 'VP8X') return { width: 1 + b.readUIntLE(i + 12, 3), height: 1 + b.readUIntLE(i + 15, 3) };
  if (kind === 'VP8 ') return { width: b.readUInt16LE(i + 14) & 0x3fff, height: b.readUInt16LE(i + 16) & 0x3fff };
  const bits = b.readUInt32LE(i + 9);
  return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
}

// Links leaving biblesketch.app open in a new tab (the bundle did this for internal absolute links too).
const externalLinks = (html: string) =>
  html.replace(/<a href="(https?:\/\/(?!biblesketch\.app)[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');

const segment = z.discriminatedUnion('type', [
  z.object({ type: z.literal('html'), html: z.string() }),
  z.object({ type: z.literal('sketch'), id: z.string() }),
  z.object({ type: z.literal('cta') }),
]);

const blog = defineCollection({
  loader: {
    name: 'blog-posts-json',
    load: async ({ store, parseData, renderMarkdown, generateDigest }) => {
      const posts = JSON.parse(readFileSync(SOURCE, 'utf8')) as Record<string, string>[];
      store.clear();
      for (const p of posts) {
        const body = p.body.replace(/\r\n/g, '\n');
        const segments: z.infer<typeof segment>[] = [];
        let last = 0;
        const addMarkdown = async (md: string) => {
          if (md.trim()) segments.push({ type: 'html', html: externalLinks((await renderMarkdown(md)).html) });
        };
        for (const m of body.matchAll(SHORTCODE)) {
          await addMarkdown(body.slice(last, m.index));
          segments.push(m[1] ? { type: 'sketch', id: m[1] } : { type: 'cta' });
          last = m.index + m[0].length;
        }
        await addMarkdown(body.slice(last));
        const data = await parseData({
          id: p.slug,
          data: {
            title: p.title,
            excerpt: p.excerpt,
            author: p.author || 'Bible Sketch Team',
            date: p.date,
            lastmod: p.lastmod,
            cover: { src: p.coverImage, ...webpSize(p.coverImage) },
            // The bundle's reading time (`TW`): whitespace-split words of the raw body, 200 per minute.
            minutes: Math.max(1, Math.ceil(p.body.trim().split(/\s+/).length / 200)),
            sketchIds: segments.flatMap((s) => (s.type === 'sketch' ? [s.id] : [])),
            segments,
          },
        });
        store.set({ id: p.slug, data, digest: generateDigest(p) });
      }
    },
  },
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    author: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lastmod: z.string(),
    cover: z.object({ src: z.string(), width: z.number(), height: z.number() }),
    minutes: z.number(),
    sketchIds: z.array(z.string()),
    segments: z.array(segment),
  }),
});

export const collections = { blog };

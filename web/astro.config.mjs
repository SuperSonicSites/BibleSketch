import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { cacheCloudflare } from '@astrojs/cloudflare/cache';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://biblesketch.app',
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
  // Astro 7's default ('jsx') drops the whitespace at line breaks between inline elements, so wrapped prose
  // like "<strong>…instantly.</strong>\nUnlike…" loses its space. Classic collapsing keeps one space.
  compressHTML: true,
  // The one Tailwind stylesheet (~10 KB gzipped, most of it Typography) goes inline: one render-blocking
  // request less on every page. Pages are edge-cached and compressed, so the repeat cost is small.
  build: { inlineStylesheets: 'always' },
  // No KV-backed sessions: auth lives in Firebase on the client.
  session: false,
  // Workers Cache: global cache in front of the Worker, purged by tag (see src/pages/api/purge.ts).
  cache: { provider: cacheCloudflare() },
});

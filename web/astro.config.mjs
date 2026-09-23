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
  // No KV-backed sessions: auth lives in Firebase on the client.
  session: false,
  // Workers Cache: global cache in front of the Worker, purged by tag (see src/pages/api/purge.ts).
  cache: { provider: cacheCloudflare() },
});

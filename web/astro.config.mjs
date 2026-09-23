import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { cacheCloudflare } from '@astrojs/cloudflare/cache';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://biblesketch.app',
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
  // No KV-backed sessions: auth lives in Firebase on the client.
  session: false,
  // Workers Cache: global cache in front of the Worker, purged by tag (see src/pages/api/purge.ts).
  cache: { provider: cacheCloudflare() },
});

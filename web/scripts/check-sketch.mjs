// Port check: the Worker's sketch helpers must produce what the live bundle renders today.
// Fixture = the live pages captured in headless Chrome on 2026-09-22 (title, meta description, canonical, H1,
// subtitle, related heading and links). Reads production Firestore unauthenticated (read-only).
// Run: node scripts/check-sketch.mjs   (Node >= 22.18 strips the .ts types)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDoc } from '../src/lib/firestore.ts';
import { ORIGIN, canonicalPath, seo, heading, ageDisplay, loadRelated, isDocId, slugOf } from '../src/lib/sketch.ts';

const live = JSON.parse(readFileSync(new URL('./fixtures/live-seo.json', import.meta.url), 'utf8'));

for (const [id, want] of Object.entries(live)) {
  const s = await getDoc('sketches', id);
  assert.ok(s, `${id} is readable (public)`);
  const got = seo(s);
  assert.equal(got.title, want.title, `${id} title`);
  assert.equal(got.description, want.description, `${id} description`);
  assert.equal(ORIGIN + canonicalPath(s), want.canonical, `${id} canonical`);
  assert.equal(heading(s.promptData), want.h1, `${id} h1`);
  const p = s.promptData;
  const subtitle = s.type === 'verse'
    ? `${p.font_style || 'Elegant Script'} verse art coloring page`
    : `Free printable Bible coloring sheet for ${ageDisplay(p.age_group)}s`;
  assert.equal(subtitle, want.subtitle, `${id} subtitle`);
  const related = await loadRelated(s);
  assert.equal(related?.heading, want.related, `${id} related heading`);
  // Newer public sketches can shift the list; the first link is the stable signal.
  assert.equal(canonicalPath(related.items[0]), want.relatedHrefs[0], `${id} first related link`);
  console.log('ok', id, got.title);
}

// Private or missing sketches read as null (rules deny both).
assert.equal(await getDoc('sketches', 'this-id-does-not-exist'), null);
assert.equal(isDocId('__x__'), false);
assert.equal(isDocId('..'), false);
assert.equal(slugOf({ id: 'x', promptData: { book: '1 John', chapter: 4, start_verse: 8, end_verse: 8 } }), '1-john-4-8');
assert.equal(heading({ book: 'Psalms', chapter: 23, start_verse: 1 }), 'Psalm 23:1 Coloring Page');
console.log('all checks passed');

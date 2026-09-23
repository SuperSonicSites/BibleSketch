// Pinterest's RSS import can't set alt text, so it is set after the Pins publish (CHECKLIST, weekly).
//   node scripts/pins-alt.mjs > alt.js
// prints a snippet for the signed-in Pinterest tab (DevTools console, or Claude's browser tool): it reads the four
// active boards and sets `alt_text` (pins.ts altText) on every Pin whose link is a released calendar entry. Idempotent.
import { entries, altText } from '../src/lib/pins.ts';

const today = new Date().toISOString().slice(0, 10);
const ALT = Object.fromEntries(entries.filter((e) => e.release <= today).map((e) => [e.sketchId, altText(e)]));
const BOARDS = [
  ['1078049298242451117', '/biblesketch/sunday-school-activities-bible-coloring-lessons/'],
  ['1078049298242452129', '/biblesketch/christmas-coloring-pages-nativity-printables/'],
  ['1078049298242458864', '/biblesketch/scripture-coloring-sheets-bible-verse-coloring/'],
  ['1078049298242461940', '/biblesketch/easter-coloring-pages-sunday-school-crafts/'],
];

console.log(`(async () => {
const ALT = ${JSON.stringify(ALT)};
const BOARDS = ${JSON.stringify(BOARDS)};
const csrf = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
const get = { headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json', 'X-Pinterest-PWS-Handler': 'www/[username]/[slug].js' } };
const done = [];
for (const [id, url] of BOARDS) {
  let bookmark = null;
  do {
    const options = { board_id: id, board_url: url, field_set_key: 'react_grid_pin', page_size: 25, filter_section_pins: true, layout: 'default', ...(bookmark ? { bookmarks: [bookmark] } : {}) };
    const r = await fetch('/resource/BoardFeedResource/get/?source_url=' + encodeURIComponent(url) + '&data=' + encodeURIComponent(JSON.stringify({ options, context: {} })), get).then((r) => r.json());
    for (const p of r.resource_response.data || []) {
      const m = (p.link || '').match(/\\/coloring-page\\/[^/]+\\/([^/?#]+)/);
      const alt = m && ALT[decodeURIComponent(m[1])];
      if (!alt) continue;
      const body = new URLSearchParams({ source_url: '/pin/' + p.id + '/', data: JSON.stringify({ options: { id: p.id, alt_text: alt }, context: {} }) });
      const u = await fetch('/resource/PinResource/update/', { method: 'POST', headers: { 'X-CSRFToken': csrf, 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body }).then((r) => r.json());
      done.push(p.id + ' ' + u.resource_response?.status);
    }
    bookmark = r.resource_response.bookmark;
  } while (bookmark && bookmark !== '-end-');
}
return done;
})()`);

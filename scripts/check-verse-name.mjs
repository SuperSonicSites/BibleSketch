// Checks withLord() in functions/generation/pipeline.js: WEB verse text with "the LORD" instead of "Yahweh".
//   node scripts/check-verse-name.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const { withLord } = createRequire(import.meta.url)('../functions/generation/pipeline.js');

// WEB text as bible-api returns it (whitespace collapsed) → what the page should print.
const cases = [
  ['Yahweh is my shepherd: I shall lack nothing.', 'The LORD is my shepherd: I shall lack nothing.'],
  ['Don’t be dismayed, for Yahweh your God is with you wherever you go.”', 'Don’t be dismayed, for the LORD your God is with you wherever you go.”'],
  ['For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace', 'For I know the thoughts that I think toward you,” says the LORD, “thoughts of peace'],
  ['Yahweh, your God, is among you, a mighty one who will save.', 'The LORD, your God, is among you, a mighty one who will save.'],
  ['It is because of Yahweh’s loving kindnesses that we are not consumed', 'It is because of the LORD’s loving kindnesses that we are not consumed'],
  ['Give thanks to Yahweh, for he is good', 'Give thanks to the LORD, for he is good'],
  ['This is the day that Yahweh has made. We will rejoice and be glad in it!', 'This is the day that the LORD has made. We will rejoice and be glad in it!'],
  ['‘Yahweh bless you, and keep you.', '‘The LORD bless you, and keep you.'],
  ['Yahweh, our Lord, how majestic is your name in all the earth', 'LORD, our Lord, how majestic is your name in all the earth'],
  ['Let everything that has breath praise Yah! Praise Yah!', 'Let everything that has breath praise the LORD! Praise the LORD!'],
  ['The Lord Yahweh’s Spirit is on me; because Yahweh has anointed me', 'The Lord GOD’s Spirit is on me; because the LORD has anointed me'],
  ['Give ear to my words, Yahweh. Consider my meditation.', 'Give ear to my words, LORD. Consider my meditation.'],
  ['Hear my prayer, O Yahweh!', 'Hear my prayer, O LORD!'],
  ['Yahweh is my strength and my shield.', 'The LORD is my strength and my shield.'],
  ['I can do all things through Christ, who strengthens me.', 'I can do all things through Christ, who strengthens me.'],
];
for (const [web, want] of cases) assert.equal(withLord(web), want);
console.log(`withLord: ${cases.length} cases ok`);

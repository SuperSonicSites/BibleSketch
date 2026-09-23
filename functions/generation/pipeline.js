// Server-side generation pipelines. One call here = one credit, whatever the number of Gemini calls inside.
// Errors carry a `code` the client maps to a message: INVALID_REFERENCE, VERSE_TOO_LONG, BLOCKED, FAILED.
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const P = require('./prompts');
const img = require('./image');
const { measure } = require('./qa');

const fail = (code, message) => Object.assign(new Error(message || code), { code });

// Emulator-only fake Gemini (FAKE_GEMINI in functions/.env.local), so tests never pay for real calls.
// Chapter 150 (or an edit instruction containing FAIL) makes the artist fail after the charge (refund path).
const FAKE = process.env.FUNCTIONS_EMULATOR === 'true' ? process.env.FAKE_GEMINI : undefined;
let fakePng;
const fakeResponse = async (model, parts) => {
  const text = parts.map((p) => p.text || '').join(' ');
  if (model !== P.MODELS.ARTIST) {
    if (/Quality Assurance/.test(text)) return { text: JSON.stringify({ passed: true, failure_reason: null }) };
    const positive = / 150:/.test(text) ? 'FAIL' : 'fake scene';
    return { text: JSON.stringify({ positive_prompt: positive, negative_prompt: '', validation_criteria: ['a', 'b', 'c'], reasoning: 'fake' }) };
  }
  if (/FAIL| 150:/.test(text)) throw new Error('fake artist failure');
  const { Jimp } = require('jimp');
  fakePng ??= await new Jimp({ width: 300, height: 400, color: 0x000000ff })
    .composite(new Jimp({ width: 280, height: 380, color: 0xffffffff }), 10, 10).getBuffer('image/png');
  return { image: fakePng };
};

const RETRYABLE = /overloaded|exhausted|quota|unavailable|429|500|503|deadline/i;

// Returns { text } or { image: Buffer }. Retries overload errors (3 tries, 3 s then 6 s) within the deadline.
const makeGemini = (apiKey, deadline) => {
  const genai = FAKE ? null : new GoogleGenAI({ apiKey });
  return async (model, parts, config) => {
    if (FAKE) return fakeResponse(model, parts);
    for (let attempt = 1, delay = 3000; ; attempt++, delay *= 2) {
      const left = deadline - Date.now();
      if (left < 5000) throw fail('FAILED', 'Generation took too long.');
      try {
        const res = await genai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: { ...config, abortSignal: AbortSignal.timeout(left) },
        });
        const cand = res.candidates?.[0];
        const out = cand?.content?.parts || [];
        const image = out.find((p) => p.inlineData?.data)?.inlineData;
        if (image) return { image: Buffer.from(image.data, 'base64') };
        const text = out.map((p) => p.text || '').join('');
        if (text) return { text };
        const reason = cand?.finishReason || res.promptFeedback?.blockReason || 'EMPTY';
        throw fail(/SAFETY|PROHIBITED|BLOCK|IMAGE_OTHER|RECITATION/i.test(reason) ? 'BLOCKED' : 'FAILED', `No output (${reason})`);
      } catch (e) {
        if (e.code === 'BLOCKED' || attempt >= 3 || !RETRYABLE.test(`${e.status} ${e.message}`)) throw e;
        await new Promise((r) => setTimeout(r, Math.min(delay, Math.max(0, deadline - Date.now() - 5000))));
      }
    }
  };
};

const REF_DIR = path.join(__dirname, '..', 'references');
const refParts = (files) => (files || []).map((f) => ({
  inlineData: { mimeType: 'image/jpeg', data: fs.readFileSync(path.join(REF_DIR, f)).toString('base64') },
}));
const imagePart = (buf) => ({ inlineData: { mimeType: 'image/png', data: buf.toString('base64') } });
const parseJson = (text) => {
  try { return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { throw fail('FAILED', 'Bad brief JSON'); }
};

// Whole chapter from bible-api.com (WEB), cut to the passage and 5 verses either side. Empty on any failure:
// the Architect then recalls the passage itself.
const fetchPassage = async (r) => {
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(`${r.book} ${r.chapter}`)}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { text: '', context: '' };
    const verses = (await res.json()).verses ?? [];
    const end = Math.max(r.endVerse ?? r.startVerse, r.startVerse);
    const clean = (s) => s.replace(/\s+/g, ' ').trim();
    return {
      text: verses.filter((v) => v.verse >= r.startVerse && v.verse <= end).map((v) => clean(v.text)).join(' '),
      context: verses.filter((v) => v.verse >= r.startVerse - 5 && v.verse <= end + 5).map((v) => `[${v.verse}] ${clean(v.text)}`).join(' '),
    };
  } catch {
    return { text: '', context: '' };
  }
};

// Scene Art: Architect (brief) → Artist (with style references) → 85% + threshold. No critic (as live and the lab).
const runScene = async (gemini, { reference, age, style }) => {
  const passage = FAKE ? { text: '', context: '' } : await fetchPassage(reference);
  const briefRes = await gemini(P.MODELS.ARCHITECT, [{ text: P.buildBriefPrompt(reference, age, style, passage) }], { responseMimeType: 'application/json' });
  const brief = parseJson(briefRes.text || '');
  if (brief.error === 'INVALID_REFERENCE') throw fail('INVALID_REFERENCE');
  if (!brief.positive_prompt) throw fail('FAILED', 'Empty brief');
  const refs = refParts(P.REFERENCE_MAP[`${age}_${style}`]);
  const art = await gemini(P.MODELS.ARTIST, [...refs, { text: P.buildArtistPrompt(brief, age, style, refs.length > 0) }], P.ARTIST_CONFIG);
  if (!art.image) throw fail('FAILED', 'Artist returned no image');
  return img.postProcess(art.image);
};

// Verse Art: bible-api (WEB, start verse) → word count/layout → brief → up to 2 × (artist → 85% + threshold → critic).
const runVerse = async (gemini, { reference, font }) => {
  let verseText = 'Fake verse text for tests';
  if (!FAKE) {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(`${reference.book}+${reference.chapter}:${reference.startVerse}`)}?translation=web`, { signal: AbortSignal.timeout(10000) })
      .catch(() => { throw fail('FAILED', 'Verse lookup failed'); });
    if (res.status === 404) throw fail('INVALID_REFERENCE');
    if (!res.ok) throw fail('FAILED', `Verse lookup ${res.status}`);
    verseText = ((await res.json()).text || '').trim();
    if (!verseText) throw fail('INVALID_REFERENCE');
  }
  const words = verseText.split(/\s+/).filter(Boolean).length;
  if (words >= P.VERSE_LAYOUT_RULES.MAX_WORDS) throw fail('VERSE_TOO_LONG', `${words} words`);
  const layout = P.layoutFor(words);
  const referenceString = `${P.displayBook(reference.book)} ${reference.chapter}:${reference.startVerse}`;
  const briefRes = await gemini(P.MODELS.FLASH, [{ text: P.buildVerseBriefPrompt(verseText, referenceString, words, layout, font) }], { responseMimeType: 'application/json' });
  const b = parseJson(briefRes.text || '');
  const brief = {
    verse_text: verseText, reference_string: referenceString, layout_type: layout,
    positive_prompt: b.positive_prompt || '', negative_prompt: b.negative_prompt || '', validation_criteria: b.validation_criteria || [],
  };
  const refs = refParts(P.VERSE_REFERENCE_MAP[font]);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const art = await gemini(P.MODELS.ARTIST, [...refs, { text: P.buildVerseArtistPrompt(brief) }], P.ARTIST_CONFIG);
    if (!art.image) throw fail('FAILED', 'Artist returned no image');
    const page = await img.postProcess(art.image);
    let verdict = { passed: true };
    try {
      const c = await gemini(P.MODELS.FLASH, [{ text: P.buildVerseCriticPrompt(brief.validation_criteria) }, imagePart(await img.toPng(page))], { responseMimeType: 'application/json' });
      verdict = parseJson(c.text || '{}');
    } catch (e) {
      console.warn('[verse critic] error, assuming pass:', e.message); // fails open, as live
    }
    if (verdict.passed !== false || attempt === 2) return { page, verseText };
    brief.positive_prompt += ` (CRITICAL FIX: ${verdict.failure_reason}. Ensure all letters are HOLLOW/OUTLINE with white interior.)`;
  }
};

// Refine / Remove Color on an existing page (PNG buffer): threshold only, no second margin.
const runEdit = async (gemini, source, instruction) => {
  const art = await gemini(P.MODELS.ARTIST, [{ text: P.buildEditPrompt(instruction) }, imagePart(source)], P.ARTIST_CONFIG);
  if (!art.image) throw fail('FAILED', 'Edit returned no image');
  return img.thresholdOnly(art.image);
};

module.exports = { makeGemini, runScene, runVerse, runEdit, measure, fail, FAKE };

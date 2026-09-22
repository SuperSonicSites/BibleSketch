// Pure prompt builders, shared by the app (services/gemini.ts) and the prompt lab (lab/generate.ts).
import { HarmBlockThreshold, HarmCategory, Modality } from "@google/genai";
import {
  AGE_LOGIC,
  CHRISTIAN_GUIDELINES,
  COLORING_PAGE_RULES,
  REFERENCE_INSTRUCTION,
  STYLE_LOGIC
} from "../constants";
import { AgeGroup, ArtStyle, BibleReference } from "../types";
import type { ArchitectBrief } from "./gemini";

export const formatReference = (r: BibleReference) =>
  `${r.book} ${r.chapter}:${r.startVerse}${r.endVerse && r.endVerse > r.startVerse ? '-' + r.endVerse : ''}`;

export type Passage = { text: string; context: string };

// Same source the Verse tool uses (WEB translation). Fetches the whole chapter (a verse range past the
// chapter's end is "not found") and cuts out the passage plus 5 verses either side, so the Architect knows
// who speaks to whom and where. Empty on any failure: the Architect then recalls the passage itself.
export const fetchPassage = async (r: BibleReference): Promise<Passage> => {
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(`${r.book} ${r.chapter}`)}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { text: "", context: "" };
    const verses: { verse: number; text: string }[] = (await res.json()).verses ?? [];
    const end = Math.max(r.endVerse ?? r.startVerse, r.startVerse);
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();
    return {
      text: verses.filter(v => v.verse >= r.startVerse && v.verse <= end).map(v => clean(v.text)).join(" "),
      context: verses.filter(v => v.verse >= r.startVerse - 5 && v.verse <= end + 5).map(v => `[${v.verse}] ${clean(v.text)}`).join(" "),
    };
  } catch {
    return { text: "", context: "" };
  }
};

export const buildBriefPrompt = (reference: BibleReference, ageGroup: AgeGroup, artStyle: ArtStyle, passage: Passage = { text: "", context: "" }) => `
ROLE: Biblical art director for a coloring book.
TASK: Write a JSON brief that an image generator will turn into a black-and-white line-art coloring page.
PASSAGE: "${formatReference(reference)}"
${passage.text ? `TEXT (WEB): "${passage.text}"\n` : ''}${passage.context ? `CONTEXT (surrounding verses, only to understand who speaks to whom, where and when; depict the PASSAGE): "${passage.context}"\n` : ''}
AUDIENCE (${ageGroup}): ${AGE_LOGIC[ageGroup].subjectFocus}
ART STYLE (${artStyle}): ${STYLE_LOGIC[artStyle]}

RULES:
1. ${CHRISTIAN_GUIDELINES}
2. FAITHFUL TO THE TEXT: depict what the passage describes, understood in its context. Include every concrete visual detail it states (who is present, what they hold, what happens, e.g. John 19:34: blood and water flow from Jesus' side) and nothing it contradicts. Do not add named or prominent characters the text does not mention (no extra angels or companions); background figures only where the text or context implies them (a census crowd, a multitude).
   SPEECH PASSAGES: when the passage is mainly words (a prophecy, curse, promise, blessing, teaching, prayer), draw the moment they are spoken: the speaker, the listeners and their reactions, in the place the context gives. Then make the words' meaning visible through who is addressed and one clear symbolic element, never as if the future were already happening (e.g. Genesis 3:15: God's light falls on Eve, her hand on her womb for the promised offspring, while the serpent recoils in the dust at her heel).
   SETTING FROM THE STORY: use the place the text and context give (Bethlehem's hill country, Eden's gate, the palace court). Never invent landmarks such as cliffs, mountains or cities the story doesn't have.
3. GAZE AND ACTION: characters face and look at what they react to, speak to or act on (e.g. Moses looks at the burning bush), unless the text says otherwise. Actions make contact: the hand grips, the spear touches the side, the crown rests on the head.
4. DISTINCT, LIVING CHARACTERS: every person has their own face, age, hair, beard and clothing (never clones or twins), and their own pose or gesture showing how they react. Give the scene movement and emotion. People look their biblical age, role and period (Noah and Abraham as aged patriarchs in plain ancient robes; kings and priests in their garments only when the text calls for it).
5. positive_prompt describes only what is DRAWN, written as a composition map in 3-6 plain sentences: the characters (how many, clothing, pose, expression), key objects and the setting; where each element sits (left or right, foreground, middle ground or background); which way each figure faces and moves relative to the viewer (e.g. Adam and Eve walk toward the viewer, away from the guarded gate behind them); and what the eye lands on first. The story's key setting or object is always visible and whole, not cropped (the ark in any Noah passage, the stable roof, the tomb). Do not restate the art style rules.
6. This is line art. Never mention color, light, lighting, shadows, glow, darkness, fog, smoke, mist or texture. Draw light sources as outlined shapes (a sun disc with ray lines, outlined flames, star shapes, heavenly light as radiating ray lines through parted clouds). Show night as an outlined moon and stars on a white sky.
7. negative_prompt lists only scene content to leave out (wrong objects, anachronisms, extra characters). Genesis 1-2 (before the fall) must include "thorns, dead plants, snakes, apples".
8. If the passage does not exist in the standard Protestant Bible, return only {"error": "INVALID_REFERENCE"}.

OUTPUT JSON:
{
  "positive_prompt": "...",
  "negative_prompt": "...",
  "validation_criteria": ["3 specific checks a reviewer can verify in the image"],
  "reasoning": "One sentence"
}
`;

export const buildArtistPrompt = (brief: ArchitectBrief, ageGroup: AgeGroup, artStyle: ArtStyle, hasReferences: boolean) => `
Create the artwork for a premium coloring book page (${ageGroup} level): clean black outlines on white, with large, well-defined shapes that are a joy to color. Output only the flat artwork filling the whole image, not a photo of a page.
SCENE: ${brief.positive_prompt}

ART STYLE: ${STYLE_LOGIC[artStyle]}
LINE WORK: ${AGE_LOGIC[ageGroup].keywords}
${hasReferences ? REFERENCE_INSTRUCTION : ''}
COLORING PAGE RULES (all mandatory):
${COLORING_PAGE_RULES}
${brief.negative_prompt ? `Leave out: ${brief.negative_prompt}` : ''}
`;

export const ARTIST_CONFIG = {
  responseModalities: [Modality.IMAGE],
  imageConfig: {
    imageSize: "2K",
    aspectRatio: "3:4"
  },
  safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }]
};

// Pinterest auto-publish (RSS). src/data/pins.json is the hand-approved calendar; the feeds and Pin images are
// built from it at request time. Pinterest reads each feed about once a day and publishes new items oldest first.
// Pacing lives in the calendar: a daily ramp from 1 to 5 releases for the whole account, boards taking turns
// (scripts/pins-check.mjs enforces it). A feed lists what was released in the last WINDOW_DAYS days: long enough
// that a connected feed is never empty between two releases (Pinterest flags an empty feed as broken), short enough
// that a late feed connection publishes at most that many days at once. Connect a feed before its first release.
import calendar from '../data/pins.json' with { type: 'json' };
import { getDoc } from './firestore.ts';
import { ORIGIN, type Sketch } from './sketch.ts';

// Only the master account's sketches: a user can delete a sketch or make it private, which would leave a dead Pin.
export const MASTER_UID = 'TiAEiMqWxpWqxCLtoI5OgHAvtf33';
export const BOARDS = ['sunday-school', 'christmas', 'adult', 'easter', 'scripture'] as const;
export const TEMPLATES = ['purple', 'black', 'paper', 'plain'] as const; // plain: no banner, trimmed (verse art)
export const WINDOW_DAYS = 14;

// Posting ramp (ROADMAP 1.5): 1 Pin a day in the week from RAMP_START, 2 a day the next week, and so on up to 5.
// The ceiling for every release day (pins-check enforces it, pins-plan fills under it).
export const RAMP_START = '2026-09-24';
export const dailyCap = (d: string) =>
  d < RAMP_START ? 1 : Math.min(5, 1 + Math.floor((Date.parse(d) - Date.parse(RAMP_START)) / 6048e5));

export interface PinEntry {
  sketchId: string;
  ref: string; // coloring-page slug, e.g. luke-2-15-16
  board: (typeof BOARDS)[number];
  template: (typeof TEMPLATES)[number];
  release: string; // YYYY-MM-DD (UTC)
  title: string;
  description: string;
  approved: boolean;
  plan?: string; // "<pin-year.json item id>" or "<item id>:<variant index>" (yearly calendar, scripts/pins-plan.mjs)
  tags?: string[]; // composition tags from the review, vocabulary in pin-year.json (the learning loop)
}

export const entries = calendar as PinEntry[];

const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "<ref>-<story moment>-coloring-page-<8 chars of id>-<template>": the story moment is the title between
// the opener and the reference ("Sunday School Crafts: Three Wise Men Follow the Star | Matthew 2:1-2" →
// three-wise-men-follow-the-star). The template is in the name because the image is cached for a year.
export function pinFile(e: PinEntry): string {
  const moment = e.title.split('|')[0].split(': ').slice(1).join(': ') || e.title; // ': ' so a leading "Psalm 23:1" stays whole
  return `${e.ref}-${slug(moment).replace(/-coloring-page$/, '')}-coloring-page-${e.sketchId.slice(0, 8)}-${e.template}`;
}

// Alt text for the Pin (RSS can't carry it, so it is set on Pinterest after publishing: scripts/pins-alt.mjs):
// the description's "what is drawn" sentence, the one ending with the reference in parentheses.
export function altText(e: PinEntry): string {
  const drawn = e.description.split(/(?<=[.!?])\s/).find((s) => /\([^)]*\d+:\d+[^)]*\)\.$/.test(s));
  return `Coloring page: ${drawn ?? e.title}`.slice(0, 500);
}

export const pageUrl =(e: PinEntry) => `${ORIGIN}/coloring-page/${e.ref}/${encodeURIComponent(e.sketchId)}`;

// The sketch as a signed-out visitor sees it: null unless it is public and the master account's.
export async function masterSketch(id: string): Promise<Sketch | null> {
  const s = (await getDoc('sketches', id)) as Sketch | null;
  return s && s.isPublic === true && s.userId === MASTER_UID && s.storagePath ? s : null;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

// Approved entries of `board` released today or in the previous WINDOW_DAYS - 1 days, oldest first. An item that
// stays in the feed is created once (guid = sketchId); an item that leaves and comes back is created again, which
// duplicated three Pins on 2026-09-25 (a 2-day window with a "repeat the last Pin" fallback). So: a long window,
// no fallback, and nothing ever re-enters.
export function dueEntries(board: string, now = new Date()): PinEntry[] {
  const from = day(new Date(now.getTime() - (WINDOW_DAYS - 1) * 86400000));
  const to = day(now);
  return entries
    .filter((e) => e.board === board && e.approved && e.release >= from && e.release <= to)
    .sort((a, b) => a.release.localeCompare(b.release));
}

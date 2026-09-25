// Replies to hello@ (docs/email-marketing-plan.md §6.8): the easy answers the Email Worker (src/worker.ts) can act
// on after it has forwarded the message to the owner. Anything unclear returns null and is left to the owner.
// No Worker-only imports: scripts/email-check.mjs tests these under Node.

export type Parsed = { kind: 'unsubscribe' } | { kind: 'persona'; value: 'teacher' | 'family' | 'adult' };

// The new text of a reply, without the quoted email under it.
export function newText(text: string): string {
  const lines: string[] = [];
  for (const l of text.split(/\r?\n/)) {
    if (/^\s*>/.test(l) || /^On .+wrote:\s*$/i.test(l) || /^-{2,}\s*Original Message/i.test(l) || /^(From|Sent|De): /i.test(l)) break;
    lines.push(l);
  }
  return lines.join('\n').trim();
}

export function parseReply(subject: string, text: string): Parsed | null {
  const t = newText(text).toLowerCase();
  if (/unsubscribe/i.test(subject) || /\b(unsubscribe|remove me|stop (emailing|sending))\b/.test(t.slice(0, 300))) {
    return { kind: 'unsubscribe' };
  }
  // The sorting question (W1, and the banner's "your 5 extra prints" note), answered in a few words.
  if (!/^re: *(your bible sketch account|your 5 extra prints)/i.test(subject) || t.length > 400) return null;
  const teacher = /\b(class|classes|classroom|church|sunday ?school|vbs|students|ministry|teach|teaching)\b/.test(t);
  const family = /\b(home|homeschool\w*|my kids|my children|grandkids|grandchildren|my son|my daughter|my boys|my girls)\b/.test(t);
  if (teacher !== family) return { kind: 'persona', value: teacher ? 'teacher' : 'family' };
  if (!teacher && /\b(myself|for me|just me|adult|my own)\b/.test(t)) return { kind: 'persona', value: 'adult' };
  return null; // both, or neither: the owner reads it
}

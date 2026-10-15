/**
 * Lists in a task's notes keep themselves going, the way Notes does: Return
 * after "1. Buy milk" starts the next line with "2. ", Return after "- Milk"
 * starts "- ", and Return on an empty item ends the list instead.
 *
 * Only for a Return typed at the end of the text, where the cursor already
 * lands after the change; in the middle, the text is left as typed.
 */

const NUMBERED = /^(\s*)(\d{1,3})([.)])\s+(.*)$/;
const BULLETED = /^(\s*)([-•*])\s+(.*)$/;

/** `before` and `after` are the text either side of one edit; returns the text to keep. */
export function continueList(before: string, after: string): string {
  if (after.length !== before.length + 1 || !after.endsWith('\n') || !after.startsWith(before)) return after;
  const lineStart = before.lastIndexOf('\n') + 1;
  const line = before.slice(lineStart);

  const numbered = line.match(NUMBERED);
  if (numbered) {
    const [, indent, n, mark, rest] = numbered;
    if (rest.trim() === '') return before.slice(0, lineStart);
    return `${after}${indent}${Number(n) + 1}${mark} `;
  }
  const bulleted = line.match(BULLETED);
  if (bulleted) {
    const [, indent, mark, rest] = bulleted;
    if (rest.trim() === '') return before.slice(0, lineStart);
    return `${after}${indent}${mark} `;
  }
  return after;
}

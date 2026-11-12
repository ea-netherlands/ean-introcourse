/**
 * exercise-parser.ts
 *
 * Splits a lesson's HTML into exercise sections, each headed by
 * "Exercise N: …" so we can interleave an answer textarea after
 * each section's instructions.
 *
 * Expected heading pattern in scraped HTML:
 *   <strong>Exercise 1: Do something (15 mins)</strong>
 */

export interface ExerciseSection {
  /** Full heading text, e.g. "Exercise 1: Assess someone else's reasoning (15 mins)" */
  heading: string;
  /** The HTML body of this section (including the heading paragraph) */
  bodyHtml: string;
  /** 0-based index used as the answer key */
  index: number;
}

/**
 * Splits exercise lesson HTML at each "Exercise N:" heading.
 * Returns an empty array if no headings are found (caller falls back
 * to a single free-text field).
 */
export function parseExerciseHtml(html: string): ExerciseSection[] {
  // The scraped HTML is wrapped in a single outer Tiptap/ProseMirror
  // editor <div>...</div>. Splitting below drops the opening tag as part
  // of the discarded preamble, which would otherwise leave a dangling,
  // unmatched closing </div> at the end of the last section's bodyHtml
  // (invalid HTML → React hydration mismatch). Strip the wrapper first so
  // every section's fragment is self-contained and balanced.
  const wrapperMatch = html.match(/^\s*<div[^>]*class="[^"]*tiptap[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/i);
  const inner = wrapperMatch ? wrapperMatch[1] : html;

  // Split on every <p> that contains <strong>Exercise \d+
  // Use a lookahead so the heading stays at the start of each chunk.
  const parts = inner.split(/(?=<p[^>]*>(?:<[^>]+>)*Exercise\s+\d+)/i);

  // The first part before any Exercise heading is preamble — skip if empty
  const sections: ExerciseSection[] = [];
  let sectionIndex = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Extract just the heading text (first <strong> content)
    const headingMatch = trimmed.match(/<strong>([^<]+)<\/strong>/i);
    const heading = headingMatch
      ? headingMatch[1].trim()
      : `Exercise ${sectionIndex + 1}`;

    // Only include if there is a real Exercise heading in the HTML
    // (filters out the spurious tiptap wrapper div that appears before Lesson 1)
    if (headingMatch && /Exercise\s+\d+/i.test(heading)) {
      sections.push({ heading, bodyHtml: trimmed, index: sectionIndex });
      sectionIndex++;
    }
  }

  return sections;
}

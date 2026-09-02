/**
 * quiz-parser.ts
 *
 * Parses Circle's quiz HTML (scraped from community.effectiefaltruisme.nl)
 * into a clean data structure so we can render interactive radio buttons
 * instead of the non-functional Circle form.
 *
 * Circle renders questions as:
 *   <span class="text-md font-semibold ...">QUESTION TEXT</span>
 * and options as:
 *   <label data-testid="item-label" ...><span>OPTION TEXT</span></label>
 *
 * We group options by finding which option nodes fall between consecutive
 * question nodes in the HTML source order (by string index).
 */

export interface QuizOption {
  text: string;
  /** Index within the question (0-based) */
  index: number;
}

export interface QuizQuestion {
  text: string;
  options: QuizOption[];
  /** Sequential question number (1-based) */
  number: number;
}

const Q_PATTERN = /<span[^>]*class="[^"]*text-md[^"]*font-semibold[^"]*"[^>]*>([\s\S]*?)<\/span>/g;
const O_PATTERN = /data-testid="item-label"[\s\S]*?<span>([\s\S]*?)<\/span>/g;

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseQuizHtml(html: string): QuizQuestion[] {
  // Collect question positions + text
  const qMatches: { pos: number; text: string }[] = [];
  const qre = new RegExp(Q_PATTERN.source, "g");
  let m;
  while ((m = qre.exec(html)) !== null) {
    const text = stripHtml(m[1]);
    if (text.length > 10) {           // filter out noise (short spans)
      qMatches.push({ pos: m.index, text });
    }
  }

  if (qMatches.length === 0) return [];

  // Collect option positions + text
  const oMatches: { pos: number; text: string }[] = [];
  const ore = new RegExp(O_PATTERN.source, "g");
  while ((m = ore.exec(html)) !== null) {
    const text = stripHtml(m[1]);
    if (text.length > 0) {
      oMatches.push({ pos: m.index, text });
    }
  }

  // Group options between consecutive question positions
  return qMatches.map((q, i) => {
    const nextQPos = qMatches[i + 1]?.pos ?? Infinity;
    const options = oMatches
      .filter((o) => o.pos > q.pos && o.pos < nextQPos)
      .map((o, idx) => ({ text: o.text, index: idx }));

    return {
      text: q.text,
      options,
      number: i + 1,
    };
  });
}

/** Returns true if a lesson's HTML looks like a Circle quiz. */
export function hasQuizHtml(html: string): boolean {
  return html.includes("quiz-") && html.includes("item-label");
}

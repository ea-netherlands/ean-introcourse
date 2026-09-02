/**
 * Lesson data layer.
 *
 * Reads scraped lesson JSON files from content/lessons/ and exposes
 * a week-based structure for the materials pages.
 *
 * Week ordering is hard-coded from the Circle section/lesson counters.
 * Lesson IDs within each week are listed in "Lesson N of 54" order.
 */
import fs from "fs";
import path from "path";

const LESSONS_DIR = path.join(process.cwd(), "content", "lessons");

// ── Week definitions ──────────────────────────────────────────────────────────

export const WEEK_DEFS = [
  {
    slug: "week-1",
    title: "Week 1: Reasoning Transparency & EA Foundations",
    shortTitle: "Week 1",
    sectionId: "960136",
    lessonIds: [
      "3639406", // Lesson 1  — Welcome & course overview
      "3639473", // Lesson 2  — This week's learning objectives
      "3639516", // Lesson 3  — What is effective altruism?  [PDF]
      "3639530", // Lesson 4  — Reasoning transparency
      "3644621", // Lesson 5  — Quiz
      "3639534", // Lesson 6  — Exercises
      "3639622", // Lesson 7  — Wrapping up
    ],
  },
  {
    slug: "week-2",
    title: "Week 2: Evidence-Based Giving & Cost-Effectiveness",
    shortTitle: "Week 2",
    sectionId: "960216",
    lessonIds: [
      "3644684", // Lesson 8  — This week's learning objectives
      "3644685", // Lesson 9  — How much does it cost to save a life?
      "3644688", // Lesson 10 — Useful concepts
      "3644691", // Lesson 11 — Inside the cost-effectiveness model
      "3644694", // Lesson 12 — Moral weights
      "3737867", // Lesson 13 — Who decides what's good?
      "3644695", // Lesson 14 — Quiz
      "3644696", // Lesson 15 — Exercises
      "3757511", // Lesson 16 — Wrapping up
    ],
  },
  {
    slug: "week-3",
    title: "Week 3: Reasoning Under Uncertainty & BOTECs",
    shortTitle: "Week 3",
    sectionId: "994238",
    lessonIds: [
      "3771791", // Lesson 17 — This week's learning objectives
      "3779927", // Lesson 18 — Lesson 1: When precision fails — hits-based giving
      "3779929", // Lesson 19 — Quiz on hits-based giving
      "3779930", // Lesson 20 — Lesson 2: BOTECs — the tool
      "3779931", // Lesson 21 — Quiz on BOTECs
      "3779933", // Lesson 22 — Lesson 3: Producing the value and the probability
      "3779934", // Lesson 23 — Quiz on forecasting
      "3779969", // Lesson 24 — Quiz on calibration
      "3779936", // Lesson 25 — Lesson 4: Adjustments — from gross value to counterfactual impact
      "3780125", // Lesson 26 — Quiz on BOTEC adjustments
      "3779938", // Lesson 27 — Lesson 5: Build your own BOTEC (Exercises)
      "3779940", // Lesson 28 — Wrapping up
      "3779941", // Lesson 29 — Appendix: Example answer
    ],
  },
  {
    slug: "week-4",
    title: "Week 4: Cause Prioritisation & the ITN Framework",
    shortTitle: "Week 4",
    sectionId: "1010483",
    lessonIds: [
      "3835004", // Lesson 30 — This week's learning objectives
      "3834912", // Lesson 31 — Lesson 1: The problem of comparison
      "3834974", // Lesson 32 — Quiz on comparison
      "3834913", // Lesson 33 — Lesson 2: The ITN framework
      "3834977", // Lesson 34 — Quiz on the ITN framework
      "3834914", // Lesson 35 — Lesson 3: Moral uncertainty  [PDF]
      "3834979", // Lesson 36 — Quiz on moral uncertainty
      "3834915", // Lesson 37 — Lesson 4: A tour of cause areas
      "3834923", // Lesson 38 — Quiz on different cause areas
      "3834916", // Lesson 39 — Lesson 5: The limits of ITN
      "3834996", // Lesson 40 — Quiz on the limits of ITN
      "3834918", // Lesson 41 — Lesson 6: Forming your own view
      "3834999", // Lesson 42 — Final quiz before the exercises
      "3835000", // Lesson 43 — Lesson 7: Exercises  [PDF]
      "3835003", // Lesson 44 — Lesson 8: Wrapping up
    ],
  },
  {
    slug: "week-5",
    title: "Week 5: Your Impact Plan",
    shortTitle: "Week 5",
    sectionId: "1046062",
    lessonIds: [
      "3976096", // Lesson 45 — This week's learning objectives
      "3976097", // Lesson 46 — Lesson 1: Your theory of change
      "3976185", // Lesson 47 — Quiz: your theory of change
      "3976262", // Lesson 48 — Lesson 2: Four pathways to impact
      "3976302", // Lesson 49 — Quiz: career stages and comparative advantage
      "3976324", // Lesson 50 — Lesson 3: Giving, advocacy, and being a multiplier
      "3976337", // Lesson 51 — Quiz: giving, advocacy and the multiplier pathway
      "3976359", // Lesson 52 — Lesson 4: Making it concrete
      "3976427", // Lesson 53 — Lesson 5: Present your plan
      "3976435", // Lesson 54 — Lesson 6: Wrapping up
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type LessonType =
  | "objectives"  // learning objectives intro
  | "reading"     // main reading content
  | "quiz"        // multiple-choice quiz questions
  | "exercise"    // open-ended exercises / workbook
  | "wrap"        // wrapping-up / summary
  | "appendix";   // appendix / example answers

export interface LessonFile {
  url: string;
  label: string;
  localPath: string;
}

export interface LessonData {
  id: string;
  title: string;
  counter: string;       // e.g. "Lesson 3 of 54"
  lessonNumber: number;  // parsed from counter
  type: LessonType;
  html: string;
  files: LessonFile[];
  sourceUrl: string;
}

export interface WeekListItem {
  slug: string;
  title: string;
  shortTitle: string;
  weekNumber: number;
}

export interface WeekData extends WeekListItem {
  lessons: LessonData[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectType(title: string): LessonType {
  const t = title.toLowerCase();
  if (t.includes("learning objectives")) return "objectives";
  if (t.includes("quiz")) return "quiz";
  if (t.startsWith("exercises") || t === "exercises" || /^lesson \d+: exercises/.test(t) || t.includes("build your own")) return "exercise";
  if (t.includes("wrapping up")) return "wrap";
  if (t.includes("appendix")) return "appendix";
  return "reading";
}

function parseCounter(counter: string): number {
  const m = counter.match(/Lesson\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

function readLessonFile(lessonId: string): LessonData | null {
  const fp = path.join(LESSONS_DIR, `${lessonId}.json`);
  if (!fs.existsSync(fp)) return null;

  const raw = JSON.parse(fs.readFileSync(fp, "utf-8")) as {
    title?: string;
    counter?: string;
    html?: string;
    files?: Array<{ url?: string; label?: string; localPath?: string }>;
    url?: string;
  };

  const files: LessonFile[] = (raw.files ?? [])
    .filter((f) => f.localPath)
    .map((f) => ({
      url: f.url ?? "",
      label: f.label ?? f.url ?? "",
      localPath: f.localPath!,
    }));

  return {
    id: lessonId,
    title: raw.title ?? `Lesson ${lessonId}`,
    counter: raw.counter ?? "",
    lessonNumber: parseCounter(raw.counter ?? ""),
    type: detectType(raw.title ?? ""),
    html: raw.html ?? "",
    files,
    sourceUrl: raw.url ?? "",
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns the sidebar list of all 5 weeks. */
export function getWeekList(): WeekListItem[] {
  return WEEK_DEFS.map((w, i) => ({
    slug: w.slug,
    title: w.title,
    shortTitle: w.shortTitle,
    weekNumber: i + 1,
  }));
}

/** Loads a full week including all its lessons. Returns null if slug not found. */
export function getWeek(slug: string): WeekData | null {
  const idx = WEEK_DEFS.findIndex((w) => w.slug === slug);
  if (idx === -1) return null;
  const def = WEEK_DEFS[idx];

  const lessons = def.lessonIds
    .map(readLessonFile)
    .filter((l): l is LessonData => l !== null);

  return {
    slug: def.slug,
    title: def.title,
    shortTitle: def.shortTitle,
    weekNumber: idx + 1,
    lessons,
  };
}

/** Finds which week a lesson belongs to, returns {weekSlug, weekNumber}. */
export function getWeekByLessonId(lessonId: string): { slug: string; weekNumber: number } | null {
  const idx = WEEK_DEFS.findIndex((w) => w.lessonIds.includes(lessonId));
  if (idx === -1) return null;
  return { slug: WEEK_DEFS[idx].slug, weekNumber: idx + 1 };
}

/** Reads a single lesson by ID. Returns null if not found. */
export function getLessonById(lessonId: string): LessonData | null {
  return readLessonFile(lessonId);
}

/** Returns adjacent lesson IDs (for prev/next navigation). */
export function getAdjacentLessons(lessonId: string): {
  prev: { id: string; title: string; weekSlug: string } | null;
  next: { id: string; title: string; weekSlug: string } | null;
} {
  // Build flat list of all lesson IDs in order
  const allIds = WEEK_DEFS.flatMap((w) => w.lessonIds.map((id) => ({ id, weekSlug: w.slug })));
  const pos = allIds.findIndex((x) => x.id === lessonId);
  if (pos === -1) return { prev: null, next: null };

  const prevEntry = pos > 0 ? allIds[pos - 1] : null;
  const nextEntry = pos < allIds.length - 1 ? allIds[pos + 1] : null;

  const prevLesson = prevEntry ? readLessonFile(prevEntry.id) : null;
  const nextLesson = nextEntry ? readLessonFile(nextEntry.id) : null;

  return {
    prev: prevEntry && prevLesson ? { id: prevEntry.id, title: prevLesson.title, weekSlug: prevEntry.weekSlug } : null,
    next: nextEntry && nextLesson ? { id: nextEntry.id, title: nextLesson.title, weekSlug: nextEntry.weekSlug } : null,
  };
}

/** Lightweight sidebar data — all weeks with lesson titles (no HTML). */
export interface SidebarLesson {
  id: string;
  title: string;
  lessonNumber: number;
  type: LessonType;
}

export interface SidebarWeek {
  slug: string;
  shortTitle: string;
  title: string;
  weekNumber: number;
  lessons: SidebarLesson[];
}

export function getAllWeeksWithLessons(): SidebarWeek[] {
  return WEEK_DEFS.map((def, i) => {
    const lessons = def.lessonIds
      .map(readLessonFile)
      .filter((l): l is LessonData => l !== null)
      .map((l) => ({
        id: l.id,
        title: l.title,
        lessonNumber: l.lessonNumber,
        type: l.type,
      }));

    return {
      slug: def.slug,
      shortTitle: def.shortTitle,
      title: def.title,
      weekNumber: i + 1,
      lessons,
    };
  });
}

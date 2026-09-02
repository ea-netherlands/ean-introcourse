import { notFound } from "next/navigation";
import {
  getLessonById,
  getWeekByLessonId,
  getAdjacentLessons,
  getWeek,
  WEEK_DEFS,
  type LessonData,
  type LessonType,
} from "@/lib/lessons";
import { parseQuizHtml, hasQuizHtml } from "@/lib/quiz-parser";
import { parseExerciseHtml } from "@/lib/exercise-parser";
import { LessonProgressTracker } from "@/components/lesson-progress-tracker";
import { QuizForm } from "@/components/quiz-form";
import { InterleaveExerciseForm } from "@/components/interleave-exercise-form";

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return WEEK_DEFS.flatMap((w) =>
    w.lessonIds.map((id) => ({ slug: w.slug, lessonId: id }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = getLessonById(lessonId);
  if (!lesson) return { title: "Not found" };
  return { title: `${lesson.title} — EA Fellowship` };
}

// ── Type badge ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<LessonType, string> = {
  objectives: "Learning objectives",
  quiz: "Quiz",
  exercise: "Exercise",
  reading: "Reading",
  wrap: "Wrap-up",
  appendix: "Appendix",
};

const TYPE_COLORS: Record<LessonType, { bg: string; text: string }> = {
  objectives: { bg: "rgba(59,130,246,0.1)",  text: "#3b82f6" },
  quiz:        { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
  exercise:    { bg: "rgba(245,158,11,0.1)", text: "#d97706" },
  reading:     { bg: "var(--bg-card)",       text: "var(--text-muted)" },
  wrap:        { bg: "rgba(34,197,94,0.1)",  text: "#16a34a" },
  appendix:    { bg: "var(--bg-card)",       text: "var(--text-muted)" },
};

// ── File download card ────────────────────────────────────────────────────────

function FileCard({ file }: { file: LessonData["files"][number] }) {
  const filename = file.localPath.split("/").pop() ?? "";
  const displayLabel =
    file.label &&
    file.label.toLowerCase() !== "read this chapter" &&
    file.label !== file.url
      ? file.label
      : filename
          .replace(/^aHR0cH-/, "")
          .replace(/[+_]/g, " ")
          .replace(/\.pdf$/i, "");

  return (
    <a
      href={file.localPath}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors group"
      style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
    >
      <span className="text-2xl shrink-0">📄</span>
      <div className="min-w-0">
        <p
          className="text-sm font-medium truncate transition-colors group-hover:text-ea-teal"
          style={{ color: "var(--text-primary)" }}
        >
          {displayLabel}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          PDF — click to open
        </p>
      </div>
      <span
        className="ml-auto text-sm shrink-0 transition-colors group-hover:text-ea-teal"
        style={{ color: "var(--text-muted)" }}
      >
        ↓
      </span>
    </a>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;

  const lesson = getLessonById(lessonId);
  const weekInfo = getWeekByLessonId(lessonId);

  if (!lesson || !weekInfo || weekInfo.slug !== slug) notFound();

  const week = getWeek(slug);
  const { prev, next } = getAdjacentLessons(lessonId);

  // ── Parse quiz / exercise content ─────────────────────────────────────────
  const isQuiz = lesson.type === "quiz" && hasQuizHtml(lesson.html);
  const quizQuestions = isQuiz ? parseQuizHtml(lesson.html) : [];

  const isExercise = lesson.type === "exercise";
  const exerciseSections = isExercise ? parseExerciseHtml(lesson.html) : [];
  // Interleave when we have multiple named sections; fall back to single textarea
  const useInterleave = exerciseSections.length > 0;

  const badge = TYPE_COLORS[lesson.type];

  return (
    <main className="flex-1 min-w-0" style={{ background: "var(--bg-page)" }}>
      {/* Fixed top progress bar */}
      <LessonProgressTracker lessonId={lessonId} />

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div
          className="flex items-center gap-2 text-xs mb-6"
          style={{ color: "var(--text-muted)" }}
        >
          <a
            href={`/materials/${slug}`}
            className="hover:text-ea-teal transition-colors"
          >
            {week?.shortTitle ?? `Week ${weekInfo.weekNumber}`}
          </a>
          <span>›</span>
          <span style={{ color: "var(--text-secondary)" }}>
            {lesson.counter || `Lesson ${lesson.lessonNumber}`}
          </span>
        </div>

        {/* Lesson heading */}
        <div className="mb-8">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-3"
            style={{ background: badge.bg, color: badge.text }}
          >
            {TYPE_LABELS[lesson.type]}
          </span>

          <h1
            className="text-2xl font-bold leading-tight mb-5"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}
          >
            {lesson.title}
          </h1>

          {/* Inline reading progress bar */}
          <LessonProgressTracker lessonId={lessonId} inlineOnly />
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}

        {/* Quiz: parsed radio-button form */}
        {isQuiz && quizQuestions.length > 0 ? (
          <QuizForm lessonId={lessonId} questions={quizQuestions} />
        ) : isExercise && useInterleave ? (
          /* Exercise: interleaved content + answer boxes */
          <InterleaveExerciseForm
            lessonId={lessonId}
            sections={exerciseSections}
          />
        ) : (
          /* Reading / wrap / objectives / appendix: raw HTML */
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: lesson.html }}
          />
        )}

        {/* PDF downloads (shown for all lesson types) */}
        {lesson.files.length > 0 && (
          <div className="mt-8">
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              Downloads
            </p>
            <div className="space-y-2">
              {lesson.files.map((file) => (
                <FileCard key={file.localPath} file={file} />
              ))}
            </div>
          </div>
        )}

        {/* Prev / Next navigation */}
        <div
          className="mt-14 pt-8 flex gap-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {prev ? (
            <a
              href={`/materials/${prev.weekSlug}/${prev.id}`}
              className="flex-1 group rounded-xl p-4 transition-colors"
              style={{ border: "1px solid var(--border)", background: "var(--bg-page)" }}
            >
              <p
                className="text-xs mb-1 group-hover:text-ea-teal transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                ← Previous
              </p>
              <p
                className="text-sm font-medium line-clamp-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {prev.title}
              </p>
            </a>
          ) : (
            <div className="flex-1" />
          )}

          {next ? (
            <a
              href={`/materials/${next.weekSlug}/${next.id}`}
              className="flex-1 group rounded-xl p-4 transition-colors text-right"
              style={{ border: "1px solid var(--border)", background: "var(--bg-page)" }}
            >
              <p
                className="text-xs mb-1 group-hover:text-ea-teal transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Next →
              </p>
              <p
                className="text-sm font-medium line-clamp-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {next.title}
              </p>
            </a>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>
    </main>
  );
}

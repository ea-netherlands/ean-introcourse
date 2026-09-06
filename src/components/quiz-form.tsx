"use client";

import { useState, FormEvent } from "react";
import type { QuizQuestion } from "@/lib/quiz-parser";
import { QUIZ_ANSWERS, QUIZ_EXPLANATIONS } from "@/lib/quiz-answers";

interface Props {
  lessonId: string;
  questions: QuizQuestion[];
}

export function QuizForm({ lessonId, questions }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (questions.length === 0) return null;

  const correctAnswers = QUIZ_ANSWERS[lessonId] ?? [];
  const explanations = QUIZ_EXPLANATIONS[lessonId] ?? [];
  const submitted = status === "saved";

  const select = (qIndex: number, oIndex: number) => {
    if (submitted) return; // lock after submission
    setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (Object.keys(answers).length === 0) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/exercises/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          answers: Object.fromEntries(
            Object.entries(answers).map(([q, o]) => [
              q,
              questions[Number(q)]?.options[o]?.text ?? "",
            ])
          ),
        }),
      });
      if (!res.ok) throw new Error("Server error");
      // Also mark complete in localStorage for the sidebar
      try { localStorage.setItem(`lesson_progress_${lessonId}`, "100"); } catch {}
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  // Score summary shown after submission
  const score = submitted
    ? questions.reduce((n, q, i) => {
        const chose = answers[i];
        const correct = correctAnswers[i];
        return n + (chose !== undefined && correct !== undefined && chose === correct ? 1 : 0);
      }, 0)
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Score banner — shown after submission */}
      {submitted && (
        <div
          className="rounded-xl px-5 py-4 flex items-center gap-4"
          style={{
            background: score === questions.length
              ? "rgba(22,163,74,0.1)"
              : "rgba(22,135,156,0.08)",
            border: `1px solid ${score === questions.length ? "rgba(22,163,74,0.25)" : "var(--border)"}`,
          }}
        >
          <span className="text-2xl">{score === questions.length ? "🎉" : "📝"}</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {score} / {questions.length} correct
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {score === questions.length
                ? "Perfect score! Great understanding."
                : "See the explanations below to review."}
            </p>
          </div>
        </div>
      )}

      {questions.map((q, qIdx) => {
        const chosen = answers[qIdx];
        const correctIdx = correctAnswers[qIdx];
        const isCorrect = submitted && chosen !== undefined && correctIdx !== undefined && chosen === correctIdx;
        const isWrong = submitted && chosen !== undefined && correctIdx !== undefined && chosen !== correctIdx;
        const explanation = explanations[qIdx];

        return (
          <div key={q.number}>
            {/* Question text */}
            <div className="flex items-start gap-2 mb-4">
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5"
                style={{
                  background: submitted
                    ? isCorrect
                      ? "rgba(22,163,74,0.15)"
                      : isWrong
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(22,135,156,0.12)"
                    : "rgba(22,135,156,0.12)",
                  color: submitted
                    ? isCorrect
                      ? "#16a34a"
                      : isWrong
                      ? "#dc2626"
                      : "var(--color-ea-teal)"
                    : "var(--color-ea-teal)",
                }}
              >
                {submitted ? (isCorrect ? "✓" : isWrong ? "✗" : q.number) : q.number}
              </span>
              <p
                className="text-sm font-semibold leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {q.text}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2 pl-8">
              {q.options.map((opt) => {
                const isSelected = answers[qIdx] === opt.index;
                const isCorrectOpt = submitted && correctIdx !== undefined && opt.index === correctIdx;
                const isWrongOpt = submitted && isSelected && !isCorrectOpt;

                let borderColor = "var(--border)";
                let bgColor = "var(--bg-page)";
                let dotColor = "var(--text-muted)";

                if (!submitted && isSelected) {
                  borderColor = "var(--color-ea-teal)";
                  bgColor = "rgba(22,135,156,0.07)";
                  dotColor = "var(--color-ea-teal)";
                } else if (submitted && isCorrectOpt) {
                  borderColor = "#16a34a";
                  bgColor = "rgba(22,163,74,0.08)";
                  dotColor = "#16a34a";
                } else if (submitted && isWrongOpt) {
                  borderColor = "#dc2626";
                  bgColor = "rgba(239,68,68,0.07)";
                  dotColor = "#dc2626";
                }

                return (
                  <label
                    key={opt.index}
                    className="flex items-start gap-3 rounded-lg px-4 py-3 transition-colors"
                    style={{
                      border: `1.5px solid ${borderColor}`,
                      background: bgColor,
                      cursor: submitted ? "default" : "pointer",
                    }}
                  >
                    {/* Custom radio circle */}
                    <span
                      className="mt-0.5 shrink-0 flex items-center justify-center rounded-full"
                      style={{
                        width: "18px",
                        height: "18px",
                        border: `2px solid ${isSelected || isCorrectOpt ? dotColor : "var(--text-muted)"}`,
                        background: isSelected || isCorrectOpt ? dotColor : "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      {(isSelected || isCorrectOpt) && (
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#fff",
                            display: "block",
                          }}
                        />
                      )}
                    </span>

                    <input
                      type="radio"
                      name={`q-${q.number}`}
                      value={opt.index}
                      checked={isSelected}
                      onChange={() => select(qIdx, opt.index)}
                      className="sr-only"
                      disabled={submitted}
                    />

                    <span
                      className="text-sm leading-snug flex-1"
                      style={{
                        color: submitted
                          ? isCorrectOpt
                            ? "#15803d"
                            : isWrongOpt
                            ? "#dc2626"
                            : "var(--text-muted)"
                          : isSelected
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {opt.text}
                    </span>

                    {submitted && isCorrectOpt && (
                      <span className="text-xs font-semibold shrink-0" style={{ color: "#16a34a" }}>✓ correct</span>
                    )}
                    {submitted && isWrongOpt && (
                      <span className="text-xs font-semibold shrink-0" style={{ color: "#dc2626" }}>✗ your answer</span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Explanation — shown after submission */}
            {submitted && explanation && (
              <div
                className="mt-3 ml-8 rounded-lg px-4 py-3 text-sm leading-relaxed"
                style={{
                  background: isCorrect ? "rgba(22,163,74,0.06)" : "rgba(22,135,156,0.06)",
                  border: `1px solid ${isCorrect ? "rgba(22,163,74,0.2)" : "var(--border)"}`,
                  color: "var(--text-secondary)",
                }}
              >
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Explanation: </span>
                {explanation}
              </div>
            )}
          </div>
        );
      })}

      {/* Submit button */}
      {!submitted && (
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={status === "saving" || Object.keys(answers).length === 0}
            className="rounded-lg bg-ea-teal px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {status === "saving" ? "Submitting…" : "Submit answers"}
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {Object.keys(answers).length}/{questions.length} answered
          </span>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm" style={{ color: "#ef4444" }}>
          Could not submit. Please try again.
        </p>
      )}
    </form>
  );
}

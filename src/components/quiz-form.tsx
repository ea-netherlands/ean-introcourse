"use client";

import { useState, FormEvent } from "react";
import type { QuizQuestion } from "@/lib/quiz-parser";

interface Props {
  lessonId: string;
  questions: QuizQuestion[];
}

export function QuizForm({ lessonId, questions }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (questions.length === 0) return null;

  const select = (qIndex: number, oIndex: number) =>
    setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
      // Mark lesson complete in localStorage so the sidebar updates
      try { localStorage.setItem(`lesson_progress_${lessonId}`, "100"); } catch {}
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {questions.map((q) => (
        <div key={q.number}>
          {/* Question text */}
          <p
            className="text-sm font-semibold mb-4 leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-2 shrink-0"
              style={{
                background: "rgba(22,135,156,0.12)",
                color: "var(--color-ea-teal)",
                verticalAlign: "middle",
              }}
            >
              {q.number}
            </span>
            {q.text}
          </p>

          {/* Options — left-aligned radio buttons */}
          <div className="space-y-2 pl-7">
            {q.options.map((opt) => {
              const isSelected = answers[q.number - 1] === opt.index;
              return (
                <label
                  key={opt.index}
                  className="flex items-start gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    border: `1.5px solid ${isSelected ? "var(--color-ea-teal)" : "var(--border)"}`,
                    background: isSelected ? "rgba(22,135,156,0.07)" : "var(--bg-page)",
                  }}
                >
                  {/* Custom radio circle */}
                  <span
                    className="mt-0.5 shrink-0 flex items-center justify-center rounded-full"
                    style={{
                      width: "18px",
                      height: "18px",
                      border: `2px solid ${isSelected ? "var(--color-ea-teal)" : "var(--text-muted)"}`,
                      background: isSelected ? "var(--color-ea-teal)" : "transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    {isSelected && (
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
                    onChange={() => select(q.number - 1, opt.index)}
                    className="sr-only"
                  />

                  <span
                    className="text-sm leading-snug"
                    style={{ color: isSelected ? "var(--text-primary)" : "var(--text-secondary)" }}
                  >
                    {opt.text}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={status === "saving" || Object.keys(answers).length === 0}
          className="rounded-lg bg-ea-teal px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {status === "saving" ? "Submitting…" : "Submit answers"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium" style={{ color: "#22c55e" }}>
            Submitted ✓
          </span>
        )}
        {status === "error" && (
          <span className="text-sm" style={{ color: "#ef4444" }}>
            Could not submit. Please try again.
          </span>
        )}
      </div>
    </form>
  );
}

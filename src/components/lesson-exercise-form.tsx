"use client";

import { useState, FormEvent } from "react";

interface ExerciseQuestion {
  questionHtml: string;
  index: number;
}

interface Props {
  lessonId: string;
  questions: ExerciseQuestion[];
}

export function LessonExerciseForm({ lessonId, questions }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (questions.length === 0) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch("/api/exercises/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, answers }),
      });
      if (!res.ok) throw new Error("Server error");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {questions.map((q) => (
        <div
          key={q.index}
          className="rounded-xl p-5"
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <div
            className="prose-content mb-3 text-sm font-medium"
            dangerouslySetInnerHTML={{ __html: q.questionHtml }}
          />
          <textarea
            value={answers[q.index] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [q.index]: e.target.value }))
            }
            rows={4}
            placeholder="Your answer…"
            className="w-full rounded-lg px-3 py-2 text-sm resize-y focus:outline-none transition"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg-page)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-lg bg-ea-teal px-5 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {status === "saving" ? "Saving…" : "Save answers"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium" style={{ color: "#22c55e" }}>
            Saved ✓
          </span>
        )}
        {status === "error" && (
          <span className="text-sm" style={{ color: "#ef4444" }}>
            Could not save. Please try again.
          </span>
        )}
      </div>
    </form>
  );
}

"use client";

/**
 * InterleaveExerciseForm
 *
 * Renders each exercise section's HTML immediately followed by a textarea,
 * so the answer box appears right after the exercise instructions —
 * not all at the bottom of the page.
 */

import { useEffect, useState, FormEvent } from "react";
import type { ExerciseSection } from "@/lib/exercise-parser";

interface Props {
  lessonId: string;
  sections: ExerciseSection[];
}

export function InterleaveExerciseForm({ lessonId, sections }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Signed-out readers can still write answers; they are kept in this browser only.
  const [localOnly, setLocalOnly] = useState(false);
  const storageKey = `exercise_answers_${lessonId}`;

  // Restore answers written earlier in this browser (signed out, or not yet saved).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setAnswers((prev) => ({ ...JSON.parse(saved), ...prev }));
    } catch {}
  }, [storageKey]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch("/api/exercises/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, answers }),
      });
      try { localStorage.setItem(storageKey, JSON.stringify(answers)); } catch {}
      if (res.status === 401) setLocalOnly(true);
      else if (!res.ok) throw new Error();
      // Mark lesson complete in localStorage so the sidebar updates
      try { localStorage.setItem(`lesson_progress_${lessonId}`, "100"); } catch {}
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {sections.map((section) => (
        <div key={section.index}>
          {/* Exercise instructions */}
          <div
            className="prose-content mb-4"
            dangerouslySetInnerHTML={{ __html: section.bodyHtml }}
          />

          {/* Answer textarea — right after the instructions */}
          <div
            className="rounded-xl p-4"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Your answer — {section.heading.split(":")[0]}
            </p>
            <textarea
              value={answers[section.index] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [section.index]: e.target.value }))
              }
              rows={5}
              placeholder="Write your answer here…"
              className="w-full rounded-lg px-3 py-2 text-sm resize-y focus:outline-none transition"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-page)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>
      ))}

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status === "saving"}
          className="btn-pill btn-pill-primary rounded-lg bg-ea-teal px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {status === "saving" ? "Saving…" : "Save all answers"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium" style={{ color: "#22c55e" }}>
            {localOnly ? "Saved in this browser ✓" : "Saved ✓"}
          </span>
        )}
        {status === "error" && (
          <span className="text-sm" style={{ color: "#ef4444" }}>
            Could not save. Please try again.
          </span>
        )}
      </div>
      {localOnly && (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--callout-bg)", border: "1px dashed var(--rule)", color: "var(--text-secondary)" }}>
          You&apos;re not signed in, so they are only kept in this browser.{" "}
          <a href="/auth/login" className="font-medium text-ea-teal underline underline-offset-2">Sign in</a> to save your progress
          and share your answers with your facilitator.
        </p>
      )}
    </form>
  );
}

"use client";

import { useState } from "react";
import type { ModuleFrontmatter } from "@/lib/modules";

interface Props {
  slug: string;
  exercises: NonNullable<ModuleFrontmatter["exercises"]>;
}

/** Exercise form rendered below MDX content. POSTs answers to /api/exercises/submit. */
export function ExerciseForm({ slug, exercises }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch("/api/exercises/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, responses: values }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {exercises.map((ex) => (
        <div key={ex.key} className="space-y-2">
          <label className="block text-sm font-medium text-slate-800">
            {ex.question}
            {ex.required && <span className="text-teal-600 ml-1">*</span>}
          </label>

          {ex.type === "textarea" && (
            <textarea
              name={ex.key}
              rows={4}
              required={ex.required}
              value={values[ex.key] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [ex.key]: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-200 resize-y"
              placeholder="Je antwoord…"
            />
          )}

          {ex.type === "text" && (
            <input
              type="text"
              name={ex.key}
              required={ex.required}
              value={values[ex.key] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [ex.key]: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
              placeholder="Je antwoord…"
            />
          )}

          {ex.type === "radio" && ex.options && (
            <div className="space-y-1.5">
              {ex.options.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={ex.key}
                    value={opt}
                    required={ex.required}
                    checked={values[ex.key] === opt}
                    onChange={() =>
                      setValues((v) => ({ ...v, [ex.key]: opt }))
                    }
                    className="shrink-0"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {ex.type === "checkbox" && ex.options && (
            <div className="space-y-1.5">
              {ex.options.map((opt) => {
                const current = values[ex.key]
                  ? (JSON.parse(values[ex.key]) as string[])
                  : [];
                const checked = current.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name={ex.key}
                      value={opt}
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? current.filter((x) => x !== opt)
                          : [...current, opt];
                        setValues((v) => ({
                          ...v,
                          [ex.key]: JSON.stringify(next),
                        }));
                      }}
                      className="shrink-0"
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status === "saving" || status === "saved"}
          className="btn-key bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {status === "saving"
            ? "Opslaan…"
            : status === "saved"
              ? "Opgeslagen ✓"
              : "Antwoorden opslaan"}
        </button>
        {status === "error" && (
          <span className="text-sm text-red-600">
            Er is iets misgegaan. Probeer het opnieuw.
          </span>
        )}
      </div>
    </form>
  );
}

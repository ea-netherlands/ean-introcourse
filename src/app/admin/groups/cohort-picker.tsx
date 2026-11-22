"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { NO_COHORT } from "./cohort";

/** Choose which cohort the Groups page shows, or start a new one. */
export function CohortPicker({ cohorts, current, tab }: { cohorts: string[]; current: string; tab: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const go = (cohort: string) =>
    router.push(`/admin/groups?cohort=${encodeURIComponent(cohort || NO_COHORT)}&tab=${tab}`);

  const options = cohorts.includes(current) ? cohorts : [current, ...cohorts];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="cohort" className="text-sm text-slate-500">Cohort</label>
      <select
        id="cohort"
        value={current}
        onChange={(e) => go(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
      >
        {options.map((c) => (
          <option key={c || NO_COHORT} value={c}>{c || "No cohort"}</option>
        ))}
      </select>
      {adding ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (n && n !== NO_COHORT) { setAdding(false); go(n); setName(""); } }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spring 2027"
            className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <button type="submit" disabled={!name.trim()} className="btn-pill btn-pill-primary h-8 px-3 text-sm disabled:opacity-50">Start</button>
          <button type="button" onClick={() => setAdding(false)} className="text-sm text-slate-500">Cancel</button>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-teal-700 hover:underline">
          + New cohort
        </button>
      )}
    </div>
  );
}

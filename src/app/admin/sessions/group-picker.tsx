"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/** "Sessions for: [group ▾]" on /admin/sessions. Empty value = all groups. */
export function SessionGroupPicker({
  groups,
  current,
}: {
  groups: { id: string; label: string }[];
  current: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
      <label htmlFor="session-group" className="text-sm text-slate-500">Sessions for</label>
      <select
        id="session-group"
        value={current}
        onChange={(e) => start(() => router.push(e.target.value ? `/admin/sessions?group=${encodeURIComponent(e.target.value)}` : "/admin/sessions"))}
        className="min-w-0 max-w-full flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 sm:flex-none"
      >
        <option value="">All groups</option>
        {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>
      {pending && <span aria-label="Loading" className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />}
    </div>
  );
}

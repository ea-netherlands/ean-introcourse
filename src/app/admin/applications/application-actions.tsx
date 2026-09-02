"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplicationActions({
  applicationId, name, email,
}: { applicationId: string; name: string; email: string }) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();

  async function act(action: "accept" | "reject") {
    setLoading(action);
    const res = await fetch(`/api/admin/applications/${applicationId}/${action}`, {
      method: "POST",
    });
    setLoading(null);
    if (res.ok) {
      setDone(action);
      router.refresh();
    }
  }

  if (done) {
    return (
      <span className={`text-sm font-medium ${done === "accept" ? "text-green-600" : "text-slate-400"}`}>
        {done === "accept" ? "Accepted ✓ — invite sent" : "Rejected"}
      </span>
    );
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={() => act("accept")}
        disabled={!!loading}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition"
      >
        {loading === "accept" ? "…" : "Accept"}
      </button>
      <button
        onClick={() => act("reject")}
        disabled={!!loading}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition"
      >
        {loading === "reject" ? "…" : "Reject"}
      </button>
    </div>
  );
}

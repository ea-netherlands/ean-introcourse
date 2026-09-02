"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function doDelete() {
    setDeleting(true);
    await fetch(`/api/admin/sessions/${sessionId}`, { method: "DELETE" });
    router.push("/admin/sessions");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Delete this session?</span>
        <button
          onClick={doDelete}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-red-700 transition"
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-500 hover:bg-red-50 transition"
    >
      Delete session
    </button>
  );
}

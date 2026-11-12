"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteParticipantButton({
  participantId,
  name,
}: {
  participantId: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/participants/${participantId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to delete");
      }
      router.push("/admin/participants");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Delete {name} permanently?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setConfirming(true)}
        className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
      >
        Delete participant
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

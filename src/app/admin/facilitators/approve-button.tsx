"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** One-click approval of a pending facilitator (status → active). Shows an error if it didn't save. */
export function ApproveButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function approve() {
    setState("saving");
    setError("");
    try {
      const res = await fetch(`/api/admin/participants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Admin session expired: reload the page and sign in again." : "Could not approve.");
        setState("error");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  }

  return (
    <span className="flex items-center gap-2">
      {state === "error" && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={approve}
        disabled={state === "saving"}
        className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition"
      >
        {state === "saving" ? "Approving…" : "Approve"}
      </button>
    </span>
  );
}

"use client";

import { useState } from "react";

interface Props {
  participantId: string;
  email: string;
  /** Pending participants get a new registration link instead of a sign-in link. */
  pending?: boolean;
}

export function SendLinkButton({ participantId, email, pending = false }: Props) {
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleClick() {
    setStatus("sending");
    try {
      const res = await fetch("/api/admin/participants/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? (res.status === 401 ? "Admin session expired: reload and sign in again." : "Failed — try again"));
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={status === "sending" || status === "sent"}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition"
      >
        {status === "sending"
          ? "Sending…"
          : status === "sent"
          ? "Link sent ✓"
          : pending
          ? "Send new registration link"
          : "Send magic link"}
      </button>
      {status === "sent" && (
        <span className="text-xs text-slate-400">Sent to {email}</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-500">{error || "Failed — try again"}</span>
      )}
    </div>
  );
}

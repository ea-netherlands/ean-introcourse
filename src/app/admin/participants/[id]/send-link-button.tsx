"use client";

import { useState } from "react";

interface Props {
  participantId: string;
  email: string;
}

export function SendLinkButton({ participantId, email }: Props) {
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
          : "Send magic link"}
      </button>
      {status === "sent" && (
        <span className="text-xs text-slate-400">Sent to {email}</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-500">Failed — try again</span>
      )}
    </div>
  );
}

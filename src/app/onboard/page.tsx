"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GROUP_TIMESLOTS } from "@/lib/availability";

// Same slots (and values) as the application form and group timing.
const TIMESLOTS = GROUP_TIMESLOTS.map((t) => ({ id: t.value, label: t.label }));

function OnboardForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [slots, setSlots] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  function toggleSlot(id: string) {
    setSlots((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (slots.length === 0) { setError("Please select at least one time slot."); return; }
    setStatus("sending");
    setError("");
    const res = await fetch("/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, availability: slots }),
    });
    if (res.ok) {
      setStatus("done");
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Something went wrong.");
      setStatus("error");
    }
  }

  if (!token) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "var(--text-muted)" }}>Invalid link — no token found.</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-page)" }}>
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
            You're all set!
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Your account is ready. You can now sign in to access the fellowship materials.
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--color-ea-teal)" }}
          >
            Sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <span className="text-ea-teal text-2xl font-bold">◆</span>
          <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
            Complete your registration
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Choose your time slots and set a password.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {/* Time slots */}
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Which time slots work for you? <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>(select all that apply)</span>
            </p>
            <div className="space-y-2">
              {TIMESLOTS.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    border: `1px solid ${slots.includes(s.id) ? "var(--color-ea-teal)" : "var(--border)"}`,
                    background: slots.includes(s.id) ? "rgba(22,135,156,0.08)" : "var(--bg-hover)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={slots.includes(s.id)}
                    onChange={() => toggleSlot(s.id)}
                    className="accent-teal-600"
                  />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                Choose a password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat password"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition"
            style={{ background: "var(--color-ea-teal)" }}
          >
            {status === "sending" ? "Saving…" : "Complete registration"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return <Suspense><OnboardForm /></Suspense>;
}

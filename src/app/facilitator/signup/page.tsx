"use client";

import { useState } from "react";
import Link from "next/link";

export default function FacilitatorSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setStatus("sending");
    setError("");
    const res = await fetch("/api/facilitator/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
    });
    if (res.ok) {
      setStatus("done");
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-page)" }}>
        <div className="max-w-sm text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Account created</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Your facilitator account is pending approval by the admin.
          </p>
          <Link href="/auth/login" className="inline-block text-ea-teal text-sm underline">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-sm w-full">
        <div className="mb-6 text-center">
          <Link href="/"><span className="text-ea-teal text-2xl font-bold">◆</span></Link>
          <h1 className="text-xl font-bold mt-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
            Facilitator sign-up
          </h1>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {[
            { label: "Full name", value: name, onChange: setName, type: "text", placeholder: "Your name" },
            { label: "Email", value: email, onChange: setEmail, type: "email", placeholder: "you@example.com" },
            { label: "Password", value: password, onChange: setPassword, type: "password", placeholder: "Min. 8 characters" },
          ].map(({ label, value, onChange, type, placeholder }) => (
            <div key={label}>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
                placeholder={placeholder}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--color-ea-teal)" }}
          >
            {status === "sending" ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/auth/login" className="text-ea-teal">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

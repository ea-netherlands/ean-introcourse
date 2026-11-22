"use client";

/** /auth/reset-password?token=… — choose a new password from the link in the reset email. */
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

const inputStyle = { border: "1.5px solid var(--border)", background: "var(--bg-page)", color: "var(--text-primary)" };

function ResetPasswordContent() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) {
      setToken(t);
      // Keep the token out of the address bar and browser history once it's read.
      window.history.replaceState(null, "", "/auth/reset-password");
    } else {
      // A second run (React dev mode) finds the URL already cleaned: keep the token we have.
      setToken((cur) => cur || "");
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); setStatus("error"); return; }
    if (password !== confirm) { setError("The two passwords are not the same."); setStatus("error"); return; }
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      window.location.href = data.redirect ?? "/materials";
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-14 md:py-20">
      <div className="w-full max-w-sm">
        <span className="badge-ean mb-4">EA Netherlands Intro Course</span>
        <h1 className="mb-6 font-serif text-4xl leading-tight" style={{ color: "var(--text-primary)" }}>
          New password
        </h1>

        {token === "" ? (
          <div className="card-ean p-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            This link is incomplete. Please use the button in the reset email, or{" "}
            <Link href="/auth/forgot-password" className="font-medium text-ea-teal underline">request a new link</Link>.
          </div>
        ) : (
          <div className="card-ean p-6">
            <form onSubmit={submit} method="post" className="space-y-4">
              {/* Hidden username field helps password managers save the new password for the right account. */}
              <input type="text" name="username" autoComplete="username" className="hidden" readOnly tabIndex={-1} aria-hidden="true" />
              {[
                { id: "new-password", label: "New password", value: password, set: setPassword, placeholder: "At least 8 characters" },
                { id: "confirm-password", label: "Repeat new password", value: confirm, set: setConfirm, placeholder: "Same password again" },
              ].map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    name={f.id}
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none"
                    style={inputStyle}
                  />
                </div>
              ))}
              {status === "error" && (
                <p className="text-sm" style={{ color: "#ef4444" }}>
                  {error}{" "}
                  {error.includes("expired") && (
                    <Link href="/auth/forgot-password" className="underline">Request a new link</Link>
                  )}
                </p>
              )}
              <button type="submit" disabled={status === "saving" || token === null}
                className="btn-pill btn-pill-primary w-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                {status === "saving" ? "Saving…" : "Save new password and sign in"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <PublicShell>
      <ResetPasswordContent />
    </PublicShell>
  );
}

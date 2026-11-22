"use client";

/** /auth/forgot-password — ask for a password-reset email (participants and facilitators). */
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

const CONTACT_EMAIL = "programmes@effectiefaltruisme.nl";
const inputStyle = { border: "1.5px solid var(--border)", background: "var(--bg-page)", color: "var(--text-primary)" };

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "unknown" | "pending" | "rate_limited" | "error">("idle");
  const [error, setError] = useState("");

  // Start with the address last used on the sign-in page, if any.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ean_last_login") ?? "{}") as { email?: string };
      if (saved.email) setEmail((cur) => cur || saved.email!);
    } catch {}
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setStatus("error");
      } else {
        setStatus(data.status ?? "sent");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  const notice =
    status === "unknown" ? (
      <>We don&apos;t have an account for this email address. Use the address from your application, or{" "}
        <Link href="/apply" className="font-medium underline" style={{ color: "var(--color-ea-teal)" }}>apply for the Intro Course</Link>.</>
    ) : status === "pending" ? (
      <>Your account isn&apos;t active yet. Participants: use the &ldquo;Complete registration&rdquo; link in your
        acceptance email. Facilitators: your account still needs approval. Questions? Email {CONTACT_EMAIL}.</>
    ) : status === "rate_limited" ? (
      <>We&apos;ve already sent several reset emails in the last 15 minutes. Check your inbox and spam folder, or try again later.</>
    ) : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-14 md:py-20">
      <div className="w-full max-w-sm">
        <span className="badge-ean mb-4">EA Netherlands Intro Course</span>
        <h1 className="mb-6 font-serif text-4xl leading-tight" style={{ color: "var(--text-primary)" }}>
          Forgot password
        </h1>

        {status === "sent" ? (
          <div className="card-ean p-6 text-center">
            <div className="mb-3 text-3xl">📬</div>
            <h2 className="mb-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Check your email</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              We sent a link to choose a new password to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
              It expires in 30 minutes. Not there after a few minutes? Check your spam folder.
            </p>
          </div>
        ) : (
          <div className="card-ean p-6">
            <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
              Enter the email address of your account and we&apos;ll send you a link to choose a new password.
            </p>
            <form onSubmit={submit} method="post" className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status !== "sending") setStatus("idle"); }}
                  placeholder="you@example.com"
                  className="w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none"
                  style={inputStyle}
                />
              </div>
              {notice && (
                <div role="status" className="rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.45)", color: "var(--text-primary)" }}>
                  {notice}
                </div>
              )}
              {status === "error" && <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}
              <button type="submit" disabled={status === "sending"}
                className="btn-pill btn-pill-primary w-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                {status === "sending" ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          <Link href="/auth/login" className="font-medium text-ea-teal underline underline-offset-2">← Back to sign in</Link>
        </p>
        <p className="mt-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          You can also sign in without a password using a magic link.
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <PublicShell>
      <ForgotPasswordContent />
    </PublicShell>
  );
}

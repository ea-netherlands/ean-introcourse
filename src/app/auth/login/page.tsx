"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

type Tab = "magic" | "password";

const CONTACT_EMAIL = "programmes@effectiefaltruisme.nl";

/** Why no sign-in email was sent (from /api/auth/send-link or /auth/verify). */
type Notice = "unknown" | "pending" | "rate_limited" | "invalid_link" | null;

function NoticeBox({ notice }: { notice: Exclude<Notice, null> }) {
  const mail = (
    <a href={`mailto:${CONTACT_EMAIL}`} className="underline" style={{ color: "var(--color-ea-teal)" }}>
      {CONTACT_EMAIL}
    </a>
  );
  const body = {
    unknown: (
      <>
        Your email address is not yet known to us. Please use the same email address as in your
        application, or{" "}
        <Link href="/apply" className="underline font-medium" style={{ color: "var(--color-ea-teal)" }}>
          apply here
        </Link>
        .
      </>
    ),
    pending: (
      <>
        Your registration isn&apos;t complete yet. Use the &ldquo;Complete registration&rdquo; link in your
        acceptance email. Facilitators: your account still needs approval. Questions? Email {mail}.
      </>
    ),
    rate_limited: (
      <>
        We&apos;ve already sent you several sign-in links in the last 15 minutes. Please check your inbox
        and spam folder, or try again later.
      </>
    ),
    invalid_link: (
      <>This sign-in link has expired or was already used. Enter your email to get a new one.</>
    ),
  }[notice];
  return (
    <div
      role="status"
      className="rounded-lg px-3 py-2.5 text-sm"
      style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.45)", color: "var(--text-primary)" }}
    >
      {body}
    </div>
  );
}

function LoginPageContent() {
  const [tab, setTab] = useState<Tab>("magic");

  // --- Magic link state ---
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  // /auth/verify redirects here with ?error=… when a link can't be used.
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err === "pending") setNotice("pending");
    else if (err === "invalid" || err === "missing") setNotice("invalid_link");
  }, []);

  // --- Password state ---
  const [pwEmail, setPwEmail] = useState("");
  const [pwPassword, setPwPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "sending" | "error">("idle");
  const [pwError, setPwError] = useState("");

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    setNotice(null);
    try {
      const res = await fetch("/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setStatus("error");
      } else if (data.status === "unknown" || data.status === "pending" || data.status === "rate_limited") {
        setNotice(data.status);
        setStatus("idle");
      } else {
        setStatus("sent");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setPwStatus("sending");
    setPwError("");
    try {
      const res = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pwEmail.trim().toLowerCase(), password: pwPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwError(data.error ?? "Invalid email or password.");
        setPwStatus("error");
      } else {
        // Cookie is set on this response; navigate to the redirect target
        window.location.href = data.redirect ?? "/";
      }
    } catch {
      setPwError("Network error. Please try again.");
      setPwStatus("error");
    }
  }

  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-4 py-14 md:py-20"
    >
      <div className="w-full max-w-sm">
        <span className="badge-ean mb-4">EA Netherlands Intro Course</span>
        <h1 className="mb-6 font-serif text-4xl leading-tight" style={{ color: "var(--text-primary)" }}>
          Sign in
        </h1>

        {/* Tabs */}
        <div
          className="flex rounded-xl overflow-hidden mb-4"
          style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
        >
          {(["magic", "password"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: tab === t ? "var(--color-ea-teal)" : "transparent",
                color: tab === t ? "#fff" : "var(--text-secondary)",
              }}
            >
              {t === "magic" ? "Magic link" : "Password"}
            </button>
          ))}
        </div>

        {/* --- Magic link panel --- */}
        {tab === "magic" && (
          <>
            {status === "sent" ? (
              <div
                className="card-ean p-6 text-center"
              >
                <div className="text-3xl mb-3">📬</div>
                <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  Check your email
                </h1>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  We sent a sign-in link to{" "}
                  <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
                  The link expires in 30 minutes. Not there after a few minutes? Check your spam folder.
                </p>
                <button
                  onClick={() => { setStatus("idle"); setEmail(""); }}
                  className="mt-4 text-xs underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <div
                className="card-ean p-6"
              >
                <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Sign in
                </h1>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                  Enter your email and we'll send you a sign-in link.
                </p>

                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setNotice(null); }}
                      placeholder="you@example.com"
                      className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition"
                      style={{
                        border: "1.5px solid var(--border)",
                        background: "var(--bg-page)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-ea-teal)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                  </div>

                  {notice && <NoticeBox notice={notice} />}

                  {status === "error" && (
                    <p className="text-sm" style={{ color: "#ef4444" }}>{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="btn-pill btn-pill-primary w-full rounded-lg bg-ea-teal px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {status === "sending" ? "Sending…" : "Send sign-in link"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* --- Password login panel --- */}
        {tab === "password" && (
          <div
            className="card-ean p-6"
          >
            <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Sign in with password
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              For participants who set a password during onboarding, or facilitators.
            </p>

            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {[
                { label: "Email address", id: "pw-email", type: "email", value: pwEmail, onChange: setPwEmail, placeholder: "you@example.com" },
                { label: "Password", id: "pw-password", type: "password", value: pwPassword, onChange: setPwPassword, placeholder: "Your password" },
              ].map(({ label, id, type, value, onChange, placeholder }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {label}
                  </label>
                  <input
                    id={id}
                    type={type}
                    required
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition"
                    style={{
                      border: "1.5px solid var(--border)",
                      background: "var(--bg-page)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-ea-teal)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
              ))}

              {pwStatus === "error" && (
                <p className="text-sm" style={{ color: "#ef4444" }}>{pwError}</p>
              )}

              <button
                type="submit"
                disabled={pwStatus === "sending"}
                className="btn-pill btn-pill-primary w-full rounded-lg bg-ea-teal px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {pwStatus === "sending" ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
              Facilitator?{" "}
              <Link href="/facilitator/signup" className="text-ea-teal underline">
                Create a facilitator account
              </Link>
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Questions?{" "}
          <a
            href="mailto:programmes@effectiefaltruisme.nl"
            className="underline hover:opacity-70 transition"
          >
            programmes@effectiefaltruisme.nl
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PublicShell>
      <LoginPageContent />
    </PublicShell>
  );
}

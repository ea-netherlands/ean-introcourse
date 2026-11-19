"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      const next = params.get("next") ?? "";
      // Only ever a page on this site, never another address.
      const target = /^\/(?!\/)[^\\]*$/.test(next) ? next : "/admin";
      // A full page load, not router.push: the router may already hold a
      // prefetched answer for the admin pages from before the cookie existed
      // (a redirect back here), and would follow that instead of asking again.
      window.location.assign(target);
    } else {
      setError("Incorrect password.");
    }
  }

  async function handleForgot() {
    setForgotLoading(true);
    try {
      await fetch("/api/admin/forgot-password", { method: "POST" });
    } finally {
      setForgotLoading(false);
      setForgotSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fafaf9" }}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 shadow-sm p-8" style={{ background: "#ffffff" }}>
        <div className="mb-8 space-y-4">
          <img src="/images/logos/ean-logo.svg" alt="Effectief Altruïsme Nederland" className="h-10 w-auto" />
          <h1 className="font-serif text-2xl text-slate-900">Admin access</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{ color: "#0f172a", background: "#ffffff" }}
              placeholder="Admin password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-pill btn-pill-primary w-full rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {loading ? "Checking…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center">
          {forgotSent ? (
            <p className="text-sm text-slate-500">
              A notification has been sent to <span className="font-medium">programmes@effectiefaltruisme.nl</span>.
            </p>
          ) : (
            <button
              onClick={handleForgot}
              disabled={forgotLoading}
              className="text-sm text-teal-600 hover:underline disabled:opacity-50"
            >
              {forgotLoading ? "Sending…" : "Forgot password?"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const router = useRouter();
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
      router.push(params.get("next") ?? "/admin");
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8fafc" }}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 shadow-sm p-8" style={{ background: "#ffffff" }}>
        <div className="flex items-center gap-2 mb-8">
          <Image src="/ean-logo-mark.svg" alt="EAN" width={28} height={28} />
          <span className="font-serif text-slate-700">Admin access</span>
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
            className="w-full rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition"
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

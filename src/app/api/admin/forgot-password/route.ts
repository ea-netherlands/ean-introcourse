/**
 * POST /api/admin/forgot-password
 *
 * Sends a password-reset reminder to programmes@effectiefaltruisme.nl.
 * Anyone who can reach the admin login page can trigger this, so we keep
 * the email informational only (no reset link) — the password is an env var.
 * Always returns 200 so no info is leaked.
 */

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/url";

const ADMIN_EMAIL = "programmes@effectiefaltruisme.nl";

export async function POST() {
  const siteUrl = appUrl("/admin/login");

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: "Admin password reset request — EA Fellowship platform",
    kind: "admin_forgot_password",
    html: `
      <h2>Admin password reset requested</h2>
      <p>Someone on the EA Fellowship platform clicked "Forgot password?" on the admin login page.</p>
      <p>The admin password is stored as the <strong>ADMIN_PASSWORD</strong> environment variable.</p>
      <ul>
        <li><strong>Local dev:</strong> open your <code>.env.local</code> file and update the value.</li>
        <li><strong>Production (Vercel):</strong> go to your project's Settings → Environment Variables and update <code>ADMIN_PASSWORD</code>, then redeploy.</li>
      </ul>
      <p>Once updated, sign in at:</p>
      <p><a href="${siteUrl}">${siteUrl}</a></p>
      <p style="color:#888;font-size:13px;">If you did not request this, someone else reached your admin login page. No action needed — no access was granted.</p>
    `,
    replyTo: ADMIN_EMAIL,
  }).catch((err) => {
    console.error("[forgot-password] email send failed:", err);
  });

  // Always return 200 — don't reveal whether the email went out
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db, ensureMigrated, applications, participants, onboardingTokens } from "@/db";
import { eq } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { randomBytes, createHash } from "crypto";
import { sendEmail, btn } from "@/lib/email";
import { appUrl } from "@/lib/url";

const TOKEN_DAYS = 7;

interface Ctx { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  await ensureMigrated();
  const { id } = await params;

  const [app] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.status !== "pending") return NextResponse.json({ error: "Already handled" }, { status: 409 });

  // Create participant (status pending until onboarding complete)
  const participantId = newId("p");
  await db.insert(participants).values({
    id: participantId,
    name: app.name,
    email: app.email,
    role: "participant",
    status: "pending",
  });

  // Mark application as accepted
  await db.update(applications).set({ status: "accepted" }).where(eq(applications.id, id));

  // Create onboarding token (7-day expiry)
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(onboardingTokens).values({
    id: newId("ot"),
    participantId,
    tokenHash,
    expiresAt,
  });

  const onboardUrl = appUrl(`/onboard?token=${raw}`);

  await sendEmail({
    to: app.email,
    subject: "You're accepted! Complete your EA Fellowship registration",
    kind: "onboarding",
    html: `
      <h2>Welcome, ${app.name}!</h2>
      <p>Your application for the EA Netherlands Intro Fellowship has been accepted. 🎉</p>
      <p>Please complete your registration by choosing your availability and setting a password:</p>
      ${btn(onboardUrl, "Complete registration")}
      <p style="color:#888;font-size:13px;">This link expires in ${TOKEN_DAYS} days.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}

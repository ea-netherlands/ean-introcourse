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
    subject: "Congratulations! You've been accepted to the EA Netherlands Introductory Course",
    kind: "onboarding",
    replyTo: "programmes@effectiefaltruisme.nl",
    html: `
      <p>Hi ${app.name},</p>
      <p><strong>Congratulations!</strong> You've been accepted to join the Effective Altruism introductory course!</p>
      <p>Please complete your registration to confirm your participation and set up your account:</p>
      ${btn(onboardUrl, "Complete registration →")}
      <p><strong>What you can expect:</strong></p>
      <ul>
        <li>We'll create groups of ~8 like-minded people and connect you with a facilitator and the 5-week course materials.</li>
        <li>For each weekly session, the course contains 1–2 hours of reading materials.</li>
        <li>Every week has a different theme! The facilitator will prepare and host the sessions with thought-provoking discussions.</li>
        <li>If you join at least 4 out of 5 sessions, you'll receive an impact book for free (4 options to choose from)!</li>
      </ul>
      <p>We're excited to welcome you to our community and look forward to exploring important ideas together.</p>
      <p>If you have any questions, reach us at
         <a href="mailto:programmes@effectiefaltruisme.nl">programmes@effectiefaltruisme.nl</a>.</p>
      <p>Warm regards,<br>
         <strong>Effectief Altruïsme Nederland (EAN)</strong><br>
         <a href="https://www.effectiefaltruisme.nl">www.effectiefaltruisme.nl</a>
      </p>
      <p style="color:#888;font-size:13px;">This registration link expires in ${TOKEN_DAYS} days.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}

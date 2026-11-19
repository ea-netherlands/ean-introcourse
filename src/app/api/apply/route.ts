import { NextRequest, NextResponse } from "next/server";
import { db, applications, participants, ensureMigrated } from "@/db";
import { eq } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { sendEmail, btn, escapeHtml } from "@/lib/email";
import { appUrl } from "@/lib/url";
import { claimPlace, describeSlot, getSlot, inTransaction, listSlots } from "@/lib/slots";

const CONTACT_EMAIL = "programmes@effectiefaltruisme.nl";

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json().catch(() => ({}));

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  // Optional / new fields
  const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  const linkedinUrl = typeof body.linkedinUrl === "string" ? body.linkedinUrl.trim() || null : null;
  const city = typeof body.city === "string" ? body.city.trim() || null : null;
  const mainReason = Array.isArray(body.mainReason) ? body.mainReason : null;
  const promptedBy = typeof body.promptedBy === "string" ? body.promptedBy.trim() || null : null;
  const motivation = typeof body.motivation === "string" ? body.motivation.trim() || null : null;
  const educationLevel = typeof body.educationLevel === "string" ? body.educationLevel.trim() || null : null;
  const careerStage = typeof body.careerStage === "string" ? body.careerStage.trim() || null : null;
  const occupation = typeof body.occupation === "string" ? body.occupation.trim() || null : null;
  const workArea = typeof body.workArea === "string" ? body.workArea.trim() || null : null;
  const studyField = typeof body.studyField === "string" ? body.studyField.trim() || null : null;
  const language = typeof body.language === "string" ? body.language || null : null;
  const availability = Array.isArray(body.availability) ? body.availability : null;
  const onlinePreference = typeof body.onlinePreference === "string" ? body.onlinePreference || null : null;
  const heardAbout = typeof body.heardAbout === "string" ? body.heardAbout.trim() || null : null;
  const privacyConsent = typeof body.privacyConsent === "boolean" ? body.privacyConsent : false;

  if (!privacyConsent) {
    return NextResponse.json({ error: "Privacy consent is required." }, { status: 400 });
  }

  // Check for duplicate application or existing participant
  const [existingApp] = await db.select({ id: applications.id })
    .from(applications).where(eq(applications.email, email)).limit(1);
  if (existingApp) {
    return NextResponse.json({ error: "An application with this email already exists." }, { status: 409 });
  }
  const [existingP] = await db.select({ id: participants.id })
    .from(participants).where(eq(participants.email, email)).limit(1);
  if (existingP) {
    return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
  }

  // Slot choices: [first, second?, third?]. The first choice books a place now.
  const rawChoices: unknown[] = Array.isArray(body.slotChoices) ? body.slotChoices : [];
  const choices = [...new Set(rawChoices.filter((c): c is string => typeof c === "string" && c.length > 0))].slice(0, 3);
  if (choices.length > 0) {
    const open = new Set((await listSlots({ bookableOnly: true })).map((s) => s.id));
    if (!choices.every((c) => open.has(c))) {
      return NextResponse.json(
        { error: "One of the times you picked is no longer available. Please choose again.", code: "slot_unavailable" },
        { status: 409 }
      );
    }
  }

  const values = {
    id: newId("app"),
    name,
    email,
    phone,
    linkedinUrl,
    city,
    mainReason,
    promptedBy,
    motivation,
    educationLevel,
    careerStage,
    occupation,
    workArea,
    studyField,
    language,
    availability,
    onlinePreference,
    heardAbout,
    privacyConsent,
    status: "pending" as const,
    slotId: choices[0] ?? null,
    slotChoice2: choices[1] ?? null,
    slotChoice3: choices[2] ?? null,
  };

  if (values.slotId) {
    // Lock the slot and insert in one transaction, so the last place can only go once.
    const result = await inTransaction(async (tx) => {
      const claim = await claimPlace(tx, values.slotId!);
      if (claim !== "ok") return claim;
      await tx.insert(applications).values(values);
      return "ok" as const;
    });
    if (result === "full") {
      return NextResponse.json(
        { error: "Sorry, your first choice just filled up. Please pick another time.", code: "slot_full" },
        { status: 409 }
      );
    }
    if (result === "unavailable") {
      return NextResponse.json(
        { error: "Your first choice is no longer available. Please pick another time.", code: "slot_unavailable" },
        { status: 409 }
      );
    }
  } else {
    await db.insert(applications).values(values);
  }
  const bookedSlot = await getSlot(values.slotId);

  // Confirmation to the applicant (+ heads-up to the coordinator). Email
  // problems must never make a stored application look like it failed.
  try {
    await sendEmail({
      to: email,
      subject: "We received your application for the EA Netherlands Intro Fellowship",
      kind: "application_received",
      replyTo: CONTACT_EMAIL,
      html: `
        <p>Hi ${escapeHtml(name)},</p>
        <p>Thanks for applying to the EA Netherlands Intro Fellowship! We've received your application.</p>
        ${bookedSlot ? `<p>We've reserved a place for you in your first choice: <strong>${escapeHtml(describeSlot(bookedSlot))}</strong>. If you're accepted, this is the group you'll join.</p>` : ""}
        <p>We review applications before each cohort starts and will email you whether you've been placed in a group.
           The fellowship runs for 5 weeks, with a weekly 75-minute online discussion and about 3.5 hours of preparation per week.</p>
        <p>Questions? Reach us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
        <p>Warm regards,<br><strong>Effectief Altruïsme Nederland (EAN)</strong></p>
      `,
    });
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `New fellowship application: ${name}`,
        kind: "application_admin_notice",
        html: `
          <p>${escapeHtml(name)} (${escapeHtml(email)}) just applied.</p>
          ${btn(appUrl("/admin/applications"), "Review applications →")}
        `,
      });
    }
  } catch (err) {
    console.error("[apply] confirmation email failed:", err);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

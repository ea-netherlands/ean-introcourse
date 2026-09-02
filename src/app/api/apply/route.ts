import { NextRequest, NextResponse } from "next/server";
import { db, applications, participants, ensureMigrated } from "@/db";
import { eq } from "drizzle-orm";
import { newId } from "@/lib/ids";

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

  await db.insert(applications).values({
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
    language,
    availability,
    onlinePreference,
    heardAbout,
    privacyConsent,
    status: "pending",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

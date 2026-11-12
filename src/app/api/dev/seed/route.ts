/**
 * GET /api/dev/seed
 * Development-only: seeds 30 realistic test participants.
 * NEVER expose this in production.
 */

import { NextResponse } from "next/server";
import { db, ensureMigrated, applications, participants, groups, lessonProgress, lessonResponses } from "@/db";
import { newId } from "@/lib/ids";
import { eq } from "drizzle-orm";
import { WEEK_DEFS } from "@/lib/lessons";
import { QUIZ_ANSWERS } from "@/lib/quiz-answers";

export const dynamic = "force-dynamic";

// Note: the production guard lives inside GET. A top-level throw here breaks
// `next build`, which loads every route module while collecting page data.

// ── Realistic Dutch test data ────────────────────────────────────────────────

const FIRST_NAMES = [
  "Lotte","Sanne","Emma","Fleur","Iris","Nora","Vera","Sofie","Anna","Lisa",
  "Bas","Joris","Thomas","Lars","Daan","Pieter","Ruben","Koen","Tim","Jan",
  "Marleen","Hanna","Roos","Julie","Nina","Simon","Niels","Bram","Max","Finn",
];
const LAST_NAMES = [
  "de Vries","Bakker","Janssen","van den Berg","Visser","de Boer","Meijer",
  "van Dijk","Smit","Peters","Mulder","de Groot","van Leeuwen","Leeuw","Hendriks",
];
const CITIES = ["Amsterdam","Rotterdam","Utrecht","Den Haag","Eindhoven","Groningen","Haarlem","Leiden","Delft","Nijmegen"];
const CAREER_STAGES = ["Student","2 - 10 years of work experience","11 - 20 years of work experience","< 2 years of work experience"];
const OCCUPATIONS = [
  "Employed in the private sector (business, corporate, startup, etc.)",
  "Employed in non-profit / NGO / philanthropic work",
  "Government & public sector",
  "PhD student / researcher",
  "Bachelor's or Master's student",
];
const EDUCATION = ["Master's degree","Bachelor's degree","PhD / Doctorate","WO (research university degree; comparable to a Bachelor's degree in many countries)"];
const WORK_AREAS = ["Data / technology / engineering","People & project management / operations","Comms strategy / marketing / digital outreach","Research / policy / advocacy","Finance / accounting"];
const MAIN_REASONS = [
  ["Learn how to best use my career to help others"],
  ["Meet like-minded people","Learn how to best use my career to help others"],
  ["Learn how to best use my free time to help others"],
  ["Improve my understanding of global issues"],
  ["Meet like-minded people"],
];
const MOTIVATIONS = [
  "I have been interested in effective altruism for a while and want to deepen my understanding through structured discussion.",
  "I want to use my career to have a positive impact and am looking for frameworks to help me think about this.",
  "A colleague mentioned the programme and I find the combination of evidence-based thinking and ethics compelling.",
  "I've read some EA material online and want to discuss it with others who are thinking seriously about these questions.",
  "I care deeply about doing good and want to make sure my efforts are as effective as possible.",
];

// Quiz lesson IDs with known correct answers
const QUIZ_LESSON_IDS = Object.keys(QUIZ_ANSWERS);

// All lesson IDs per week
const WEEK_LESSON_IDS = WEEK_DEFS.map((w) => w.lessonIds);

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Seeder ───────────────────────────────────────────────────────────────────

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await ensureMigrated();

  // Clear existing test data (emails ending in @test.ean)
  const existing = await db.select({ id: participants.id, email: participants.email })
    .from(participants);
  const testEmails = existing.filter((p) => p.email.endsWith("@test.ean")).map((p) => p.email);
  if (testEmails.length > 0) {
    // Delete participants (cascades to lesson_progress, lesson_responses)
    for (const p of existing.filter((x) => x.email.endsWith("@test.ean"))) {
      await db.delete(participants).where(eq(participants.id, p.id));
    }
  }
  // Delete test applications
  const existingApps = await db.select({ id: applications.id, email: applications.email }).from(applications);
  for (const a of existingApps.filter((x) => x.email.endsWith("@test.ean"))) {
    await db.delete(applications).where(eq(applications.id, a.id));
  }

  // Ensure two groups exist
  const groupDefs = [
    { id: "g_seed_groep_a", name: "Groep A 2026", cohort: "Herfst 2026" },
    { id: "g_seed_groep_b", name: "Groep B 2026", cohort: "Herfst 2026" },
  ];
  for (const g of groupDefs) {
    const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, g.id));
    if (!existing) {
      await db.insert(groups).values(g);
    }
  }

  const created = { applications: 0, participants: 0, progressRows: 0, responseRows: 0 };

  // Generate 30 participants
  for (let i = 0; i < 30; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g,"")}${i}@test.ean`;
    const city = pick(CITIES);
    const language = pick(["en","nl","both"]);

    // Application status spread:
    // i 0-9:  pending (just applied)
    // i 10-29: accepted (participants)
    const appStatus = i < 10 ? "pending" : "accepted";

    const appId = newId("app");
    await db.insert(applications).values({
      id: appId,
      email,
      name,
      phone: `06${String(10000000 + i * 7777).slice(0,8)}`,
      city,
      mainReason: pick(MAIN_REASONS),
      motivation: pick(MOTIVATIONS),
      educationLevel: pick(EDUCATION),
      careerStage: pick(CAREER_STAGES),
      occupation: pick(OCCUPATIONS),
      workArea: pick(WORK_AREAS),
      language,
      heardAbout: pick(["Friend","Social media","EA Forum","University"]),
      privacyConsent: true,
      status: appStatus,
      submittedAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
    });
    created.applications++;

    if (appStatus !== "accepted") continue;

    // Progress tier for accepted participants (i 10-29 → tier 0-3)
    // Tier 0 (i 10-14): registered, no progress
    // Tier 1 (i 15-19): completed Week 1 (some quiz answers)
    // Tier 2 (i 20-24): completed Weeks 1-2
    // Tier 3 (i 25-29): completed Weeks 1-3 with more answers
    const tier = Math.floor((i - 10) / 5); // 0,1,2,3

    const groupId = i < 20 ? groupDefs[0].id : groupDefs[1].id;
    const pid = newId("p");
    await db.insert(participants).values({
      id: pid,
      email,
      name,
      role: "participant",
      status: "active",
      groupId,
      availability: pickN(["monday_early","monday_late","tuesday_early","tuesday_late","wednesday_early","wednesday_late","thursday_early","thursday_late"], 3),
      createdAt: new Date(Date.now() - (25 - i) * 24 * 60 * 60 * 1000),
    });
    created.participants++;

    if (tier === 0) continue; // no progress

    // Determine which weeks to mark complete based on tier
    const weeksToComplete = tier === 1 ? 1 : tier === 2 ? 2 : 3;

    for (let w = 0; w < weeksToComplete; w++) {
      const lessonIds = WEEK_LESSON_IDS[w];
      for (const lid of lessonIds) {
        await db.insert(lessonProgress).values({
          id: newId("lp"),
          participantId: pid,
          lessonId: lid,
          progressPct: 100,
          completedAt: new Date(Date.now() - (weeksToComplete - w) * 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        }).onConflictDoNothing();
        created.progressRows++;

        // Add quiz answers for quiz lessons in completed weeks
        if (QUIZ_ANSWERS[lid]) {
          const correct = QUIZ_ANSWERS[lid];
          for (let q = 0; q < correct.length; q++) {
            // 80% chance correct, 20% chance wrong (pick a random wrong option)
            const isCorrect = Math.random() > 0.2;
            // We store the option text — for simplicity store a placeholder text
            const response = isCorrect
              ? `[correct answer for q${q}]`
              : `[wrong answer for q${q}]`;
            await db.insert(lessonResponses).values({
              id: newId("lr"),
              participantId: pid,
              lessonId: lid,
              questionKey: `q${q}`,
              response,
              submittedAt: new Date(Date.now() - (weeksToComplete - w) * 7 * 24 * 60 * 60 * 1000 + q * 60000),
            }).onConflictDoNothing();
            created.responseRows++;
          }
        }

        // Add an open-text exercise answer for exercise lessons
        if (lid === "3639534" || lid === "3644696" || lid === "3779938") {
          await db.insert(lessonResponses).values({
            id: newId("lr"),
            participantId: pid,
            lessonId: lid,
            questionKey: "q0",
            response: `I think that the key insight here is about prioritisation and being willing to update based on evidence. My current thinking is that focusing on global health makes sense as a starting point because the evidence base is strong.`,
            submittedAt: new Date(Date.now() - (weeksToComplete - w) * 7 * 24 * 60 * 60 * 1000),
          }).onConflictDoNothing();
          created.responseRows++;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Seeded ${created.applications} applications, ${created.participants} participants, ${created.progressRows} progress rows, ${created.responseRows} response rows.`,
    groups: groupDefs.map((g) => g.name),
    ...created,
  });
}

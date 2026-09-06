/**
 * POST /api/exercises/submit
 *
 * Saves quiz or exercise answers for the current session participant.
 *
 * Body (quiz):
 *   { lessonId: string; answers: Record<string, string> }
 *   answers keys are "0","1",… (question index), values are the chosen option text.
 *
 * Body (exercise):
 *   { lessonId: string; answers: Record<number, string> }
 *   answers keys are section indices, values are free-text responses.
 *
 * Upserts one row per (participantId, lessonId, questionKey).
 * Also marks the lesson 100% complete in lesson_progress.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, ensureMigrated, lessonResponses, lessonProgress } from "@/db";
import { getCurrentParticipant } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    await ensureMigrated();

    const me = await getCurrentParticipant().catch(() => null);
    if (!me) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json() as {
      lessonId?: string;
      answers?: Record<string, string>;
    };

    const { lessonId, answers } = body;
    if (!lessonId || !answers || typeof answers !== "object") {
      return NextResponse.json({ error: "lessonId and answers required" }, { status: 400 });
    }

    const entries = Object.entries(answers).filter(([, v]) => v != null && String(v).trim() !== "");
    if (entries.length === 0) {
      return NextResponse.json({ ok: true, saved: 0 });
    }

    // Upsert each answer individually (PGlite doesn't support multi-row ON CONFLICT)
    let saved = 0;
    for (const [key, value] of entries) {
      const questionKey = `q${key}`;
      const response = String(value).trim().slice(0, 10000);

      // Check for existing row
      const [existing] = await db
        .select({ id: lessonResponses.id })
        .from(lessonResponses)
        .where(
          and(
            eq(lessonResponses.participantId, me.id),
            eq(lessonResponses.lessonId, lessonId),
            eq(lessonResponses.questionKey, questionKey)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(lessonResponses)
          .set({ response, submittedAt: new Date() })
          .where(eq(lessonResponses.id, existing.id));
      } else {
        await db.insert(lessonResponses).values({
          id: newId("lr"),
          participantId: me.id,
          lessonId,
          questionKey,
          response,
        });
      }
      saved++;
    }

    // Mark lesson complete in lesson_progress
    const [existingProgress] = await db
      .select({ id: lessonProgress.id })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.participantId, me.id),
          eq(lessonProgress.lessonId, lessonId)
        )
      )
      .limit(1);

    if (existingProgress) {
      await db
        .update(lessonProgress)
        .set({ progressPct: 100, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(lessonProgress.id, existingProgress.id));
    } else {
      await db.insert(lessonProgress).values({
        id: newId("lp"),
        participantId: me.id,
        lessonId,
        progressPct: 100,
        completedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    console.error("[exercises/submit]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

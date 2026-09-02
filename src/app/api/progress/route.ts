/**
 * POST /api/progress
 *
 * Records a participant's reading progress on a lesson.
 * When the request carries a valid session cookie the progress is
 * persisted to the lesson_progress table so facilitators can track it.
 * Anonymous requests are accepted (200) but not stored.
 *
 * Body: { lessonId: string, pct: number, completed: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, lessonProgress, ensureMigrated } from "@/db";
import { getCurrentParticipant } from "@/lib/auth";
import { newId } from "@/lib/ids";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      lessonId?: string;
      pct?: number;
      completed?: boolean;
    };
    const { lessonId, pct, completed } = body;

    if (!lessonId || typeof pct !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await ensureMigrated();
    const participant = await getCurrentParticipant().catch(() => null);

    if (participant) {
      await db
        .insert(lessonProgress)
        .values({
          id: newId("lp"),
          participantId: participant.id,
          lessonId,
          progressPct: Math.round(pct),
          completedAt: completed ? new Date() : null,
        })
        .onConflictDoUpdate({
          target: [lessonProgress.participantId, lessonProgress.lessonId],
          set: {
            progressPct: Math.round(pct),
            // Only set completedAt once — never clear it once set
            completedAt: completed
              ? new Date()
              : sql`lesson_progress.completed_at`,
            updatedAt: new Date(),
          },
        });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[progress] error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

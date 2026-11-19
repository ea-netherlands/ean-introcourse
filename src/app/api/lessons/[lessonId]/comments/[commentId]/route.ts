/**
 * DELETE /api/lessons/[lessonId]/comments/[commentId]
 * Allowed for the author, a facilitator in the same cohort, or role admin.
 * Replies to a deleted comment are removed with it (ON DELETE CASCADE).
 */
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureMigrated, lessonComments } from "@/db";
import { getCurrentParticipant } from "@/lib/auth";
import { canModerate, cohortFor } from "@/lib/comments";

interface Ctx { params: Promise<{ lessonId: string; commentId: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { lessonId, commentId } = await params;
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureMigrated();
  const [c] = await db
    .select({ id: lessonComments.id, authorId: lessonComments.authorId, cohort: lessonComments.cohort })
    .from(lessonComments)
    .where(and(eq(lessonComments.id, commentId), eq(lessonComments.lessonId, lessonId)))
    .limit(1);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myCohort = await cohortFor(me);
  if (!canModerate(me, c.authorId, myCohort === c.cohort)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(lessonComments).where(eq(lessonComments.id, c.id));
  return NextResponse.json({ ok: true });
}

/**
 * GET  /api/lessons/[lessonId]/comments — this lesson's comments for your cohort
 * POST /api/lessons/[lessonId]/comments — { content, parentId? } add a comment or reply
 *
 * Comments are shared by everyone in the same cohort (see src/lib/comments.ts).
 * Signed-out users and people without a group get { comments: [], reason }.
 */
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureMigrated, lessonComments } from "@/db";
import { getCurrentParticipant } from "@/lib/auth";
import { getLessonById } from "@/lib/lessons";
import { newId } from "@/lib/ids";
import { MAX_COMMENT_LENGTH, cohortFor, cohortLabel, listLessonComments } from "@/lib/comments";

interface Ctx { params: Promise<{ lessonId: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { lessonId } = await params;
  if (!getLessonById(lessonId)) return NextResponse.json({ error: "Unknown lesson" }, { status: 404 });

  const me = await getCurrentParticipant().catch(() => null);
  if (!me) return NextResponse.json({ comments: [], reason: "signed_out" });
  if (me.status === "pending") return NextResponse.json({ comments: [], reason: "pending" });
  const cohort = await cohortFor(me);
  if (!cohort) return NextResponse.json({ comments: [], reason: "no_group" });

  const comments = await listLessonComments(lessonId, cohort, me);
  return NextResponse.json({ comments, cohort: await cohortLabel(cohort), me: { id: me.id } });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { lessonId } = await params;
  if (!getLessonById(lessonId)) return NextResponse.json({ error: "Unknown lesson" }, { status: 404 });

  const me = await getCurrentParticipant().catch(() => null);
  if (!me) return NextResponse.json({ error: "Please sign in to comment." }, { status: 401 });
  if (me.status === "pending") return NextResponse.json({ error: "Finish your registration first." }, { status: 403 });
  const cohort = await cohortFor(me);
  if (!cohort) return NextResponse.json({ error: "You can comment once you're placed in a group." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { content?: unknown; parentId?: unknown };
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Write something first." }, { status: 400 });
  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: `Comments can be at most ${MAX_COMMENT_LENGTH} characters.` }, { status: 400 });
  }

  let parentId: string | null = null;
  if (typeof body.parentId === "string" && body.parentId) {
    await ensureMigrated();
    // Replies must be to a comment on the same lesson in the same cohort.
    const [parent] = await db
      .select({ id: lessonComments.id, parentId: lessonComments.parentId })
      .from(lessonComments)
      .where(and(eq(lessonComments.id, body.parentId), eq(lessonComments.lessonId, lessonId), eq(lessonComments.cohort, cohort)))
      .limit(1);
    if (!parent) return NextResponse.json({ error: "That comment no longer exists." }, { status: 404 });
    parentId = parent.parentId ?? parent.id; // one level of replies: reply to the thread's top comment
  }

  await ensureMigrated();
  const id = newId("lc");
  await db.insert(lessonComments).values({ id, lessonId, cohort, authorId: me.id, parentId, content });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

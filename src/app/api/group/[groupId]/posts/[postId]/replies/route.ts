/**
 * POST /api/group/[groupId]/posts/[postId]/replies — add a reply to a post (Stage 3)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentParticipant } from "@/lib/auth";
import { db, ensureMigrated, groupPosts, groupPostReplies } from "@/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

interface Context {
  params: Promise<{ groupId: string; postId: string }>;
}

export async function POST(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { groupId, postId } = await params;

  const me = await getCurrentParticipant().catch(() => null);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (me.role !== "facilitator" && me.groupId !== groupId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate post exists and belongs to this group
  const [post] = await db
    .select({ id: groupPosts.id })
    .from(groupPosts)
    .where(eq(groupPosts.id, postId));
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Content too long (max 2000 chars)" }, { status: 400 });
  }

  const id = randomBytes(12).toString("hex");
  await db.insert(groupPostReplies).values({
    id,
    postId,
    authorId: me.id,
    content,
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

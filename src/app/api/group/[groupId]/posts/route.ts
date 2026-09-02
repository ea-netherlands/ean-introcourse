/**
 * POST /api/group/[groupId]/posts — create a new group post (Stage 3)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentParticipant } from "@/lib/auth";
import { db, ensureMigrated, groupPosts, groups } from "@/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

interface Context {
  params: Promise<{ groupId: string }>;
}

export async function POST(req: NextRequest, { params }: Context) {
  await ensureMigrated();
  const { groupId } = await params;

  const me = await getCurrentParticipant().catch(() => null);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Access check: must be in this group OR a facilitator
  if (me.role !== "facilitator" && me.groupId !== groupId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate group exists
  const [group] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId));
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "Content too long (max 5000 chars)" }, { status: 400 });
  }

  const id = randomBytes(12).toString("hex");
  await db.insert(groupPosts).values({
    id,
    groupId,
    authorId: me.id,
    content,
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

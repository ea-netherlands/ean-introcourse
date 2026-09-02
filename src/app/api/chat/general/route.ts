import { NextRequest, NextResponse } from "next/server";
import { getCurrentParticipant } from "@/lib/auth";
import { db, ensureMigrated, groupPosts, participants } from "@/db";
import { isNull, eq } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function GET() {
  await ensureMigrated();
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await db
    .select({
      id: groupPosts.id, content: groupPosts.content,
      createdAt: groupPosts.createdAt, authorId: groupPosts.authorId,
      authorName: participants.name,
    })
    .from(groupPosts)
    .leftJoin(participants, eq(participants.id, groupPosts.authorId))
    .where(isNull(groupPosts.groupId))
    .orderBy(groupPosts.createdAt)
    .limit(100);

  return NextResponse.json({
    posts: posts.map((p) => ({
      ...p,
      authorName: p.authorName ?? "Unknown",
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ error: "Too long" }, { status: 400 });

  const id = randomBytes(12).toString("hex");
  await db.insert(groupPosts).values({ id, groupId: null, authorId: me.id, content });

  return NextResponse.json({
    ok: true,
    post: { id, content, createdAt: new Date().toISOString(), authorId: me.id, authorName: me.name },
  }, { status: 201 });
}

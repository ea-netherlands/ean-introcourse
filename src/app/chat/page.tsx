/**
 * /chat — group discussion board with General + My Group tabs (Stage 3)
 */

import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { db, ensureMigrated, groups, participants, groupPosts, groupPostReplies } from "@/db";
import { eq, isNull, desc } from "drizzle-orm";
import Link from "next/link";
import ChatClient from "./chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  await ensureMigrated();
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) redirect("/auth/login?next=/chat");

  const { channel } = await searchParams;
  const activeChannel = channel === "group" && me.groupId ? "group" : "general";

  // My group info
  let myGroup: { id: string; name: string } | null = null;
  if (me.groupId) {
    const [g] = await db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(eq(groups.id, me.groupId));
    myGroup = g ?? null;
  }

  // Fetch posts for the active channel
  const postsQuery = activeChannel === "general"
    ? db.select({
        id: groupPosts.id, content: groupPosts.content,
        createdAt: groupPosts.createdAt, authorId: groupPosts.authorId,
        authorName: participants.name,
      })
      .from(groupPosts)
      .leftJoin(participants, eq(participants.id, groupPosts.authorId))
      .where(isNull(groupPosts.groupId))
      .orderBy(groupPosts.createdAt)
      .limit(100)
    : db.select({
        id: groupPosts.id, content: groupPosts.content,
        createdAt: groupPosts.createdAt, authorId: groupPosts.authorId,
        authorName: participants.name,
      })
      .from(groupPosts)
      .leftJoin(participants, eq(participants.id, groupPosts.authorId))
      .where(eq(groupPosts.groupId, me.groupId!))
      .orderBy(groupPosts.createdAt)
      .limit(100);

  const posts = await postsQuery;

  return (
    <div className="min-h-screen flex flex-col graph-paper">
      <SiteHeader user={{ name: me.name, role: me.role, groupId: me.groupId }} />

      <div className="page-column flex w-full flex-1 flex-col">
      <div className="flex flex-1 overflow-hidden max-w-3xl mx-auto w-full px-4 py-6 gap-6">
        {/* Channel sidebar */}
        <aside className="w-44 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Channels</p>
          <div className="space-y-0.5">
            <Link
              href="/chat?channel=general"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                background: activeChannel === "general" ? "rgba(22,135,156,0.1)" : "transparent",
                color: activeChannel === "general" ? "var(--color-ea-teal)" : "var(--text-secondary)",
                fontWeight: activeChannel === "general" ? 500 : 400,
              }}
            >
              🌍 General
            </Link>
            {myGroup && (
              <Link
                href="/chat?channel=group"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  background: activeChannel === "group" ? "rgba(22,135,156,0.1)" : "transparent",
                  color: activeChannel === "group" ? "var(--color-ea-teal)" : "var(--text-secondary)",
                  fontWeight: activeChannel === "group" ? 500 : 400,
                }}
              >
                👥 {myGroup.name}
              </Link>
            )}
          </div>
        </aside>

        {/* Chat area (client component handles posting + auto-refresh) */}
        <ChatClient
          initialPosts={posts.map((p) => ({
            id: p.id,
            content: p.content,
            createdAt: p.createdAt.toISOString(),
            authorId: p.authorId,
            authorName: p.authorName ?? "Unknown",
          }))}
          channel={activeChannel}
          groupId={activeChannel === "group" ? me.groupId! : null}
          myId={me.id}
          myName={me.name}
        />
      </div>
      </div>
    </div>
  );
}

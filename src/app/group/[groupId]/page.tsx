/**
 * /group/[groupId] — group discussion board (Stage 3)
 *
 * Shows group members and an async discussion thread.
 * Participants in the group + facilitators can read and post.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentParticipant, canAccessGroup } from "@/lib/auth";
import { db, ensureMigrated, groups, participants, groupPosts, groupPostReplies } from "@/db";
import { eq, desc, inArray } from "drizzle-orm";
import { ThemeToggle } from "@/components/theme-toggle";
import NewPostForm from "./new-post-form";
import { ReplyForm } from "./reply-form";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: Props) {
  await ensureMigrated();
  const { groupId } = await params;

  const me = await getCurrentParticipant().catch(() => null);
  if (!me) redirect(`/auth/login?next=/group/${groupId}`);

  // Fetch group
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) notFound();

  // Access check: must be in this group OR a facilitator
  if (!canAccessGroup(me, groupId)) {
    redirect("/materials");
  }

  // Group members
  const members = await db
    .select({ id: participants.id, name: participants.name, role: participants.role })
    .from(participants)
    .where(eq(participants.groupId, groupId));

  // Posts with author name
  const posts = await db
    .select({
      id: groupPosts.id,
      content: groupPosts.content,
      createdAt: groupPosts.createdAt,
      authorId: groupPosts.authorId,
      authorName: participants.name,
    })
    .from(groupPosts)
    .leftJoin(participants, eq(participants.id, groupPosts.authorId))
    .where(eq(groupPosts.groupId, groupId))
    .orderBy(desc(groupPosts.createdAt));

  // Replies for all posts
  const postIds = posts.map((p) => p.id);
  const replies =
    postIds.length > 0
      ? await db
          .select({
            id: groupPostReplies.id,
            postId: groupPostReplies.postId,
            content: groupPostReplies.content,
            createdAt: groupPostReplies.createdAt,
            authorId: groupPostReplies.authorId,
            authorName: participants.name,
          })
          .from(groupPostReplies)
          .leftJoin(participants, eq(participants.id, groupPostReplies.authorId))
          .where(inArray(groupPostReplies.postId, postIds))
          .orderBy(groupPostReplies.createdAt)
      : [];

  const repliesByPostId = new Map<string, typeof replies>();
  for (const r of replies) {
    const list = repliesByPostId.get(r.postId) ?? [];
    list.push(r);
    repliesByPostId.set(r.postId, list);
  }

  const initials = (name: string | null) =>
    (name ?? "?")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-NL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      {/* Top bar */}
      <header
        className="flex h-14 items-center px-6 gap-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-sidebar)" }}
      >
        <Link href="/materials" className="flex items-center gap-2">
          <span className="text-ea-teal font-bold">◆</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Fellowship
          </span>
        </Link>
        <nav className="flex items-center gap-1 ml-4">
          <Link
            href="/materials"
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Materials
          </Link>
          <Link
            href="/account"
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            My account
          </Link>
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "rgba(22,135,156,0.1)", color: "var(--color-ea-teal)" }}
          >
            {group.name}
          </span>
          {(me.role === "facilitator" || me.role === "admin") && (
            <Link
              href="/sessions"
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Sessions
            </Link>
          )}
          {(me.role === "facilitator" || me.role === "admin") && (
            <Link
              href={`/group/${groupId}/overview`}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Overview
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Group header */}
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {group.name}
          </h1>
          {group.cohort && (
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {group.cohort}
            </p>
          )}
        </div>

        {/* Members */}
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
            MEMBERS · {members.length}
          </h2>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: "var(--color-ea-teal)" }}
                >
                  {initials(m.name)}
                </span>
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {m.name}
                </span>
                {m.role === "facilitator" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(22,135,156,0.12)", color: "var(--color-ea-teal)" }}>
                    facilitator
                  </span>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No members yet.</p>
            )}
          </div>
        </section>

        {/* New post form */}
        <NewPostForm groupId={groupId} myName={me.name} />

        {/* Posts */}
        <section>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-muted)" }}>
            DISCUSSION · {posts.length} posts
          </h2>

          {posts.length === 0 ? (
            <div
              className="text-center py-12 rounded-2xl"
              style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}
            >
              <p className="text-sm">No posts yet — start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const postReplies = repliesByPostId.get(post.id) ?? [];
                return (
                  <div
                    key={post.id}
                    className="rounded-2xl p-5"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    {/* Post header */}
                    <div className="flex items-start gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: post.authorId === me.id ? "var(--color-ea-teal)" : "#64748b" }}
                      >
                        {initials(post.authorName ?? null)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {post.authorName ?? "Unknown"}
                            {post.authorId === me.id && (
                              <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-muted)" }}>(you)</span>
                            )}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                          {post.content}
                        </p>
                      </div>
                    </div>

                    {/* Replies */}
                    {postReplies.length > 0 && (
                      <div
                        className="mt-4 ml-11 space-y-3 pt-3"
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        {postReplies.map((r) => (
                          <div key={r.id} className="flex items-start gap-2.5">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={{ background: r.authorId === me.id ? "var(--color-ea-teal)" : "#94a3b8" }}
                            >
                              {initials(r.authorName ?? null)}
                            </span>
                            <div>
                              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                                {r.authorName ?? "Unknown"}
                              </span>
                              <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                                {formatDate(r.createdAt)}
                              </span>
                              <p className="text-sm mt-0.5 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                                {r.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply form */}
                    <ReplyForm postId={post.id} groupId={groupId} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


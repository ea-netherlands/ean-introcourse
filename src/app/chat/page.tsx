/**
 * /chat — the one chat for participants and facilitators: a General channel for everyone
 * plus a channel per group you belong to (facilitators can lead several groups).
 *   ?g=<groupId>  open that group's channel (?channel=group = your first group)
 * /group/[groupId] forwards here.
 */

import { redirect } from "next/navigation";
import { getCurrentParticipant, myGroups } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { db, ensureMigrated, participants, groupPosts } from "@/db";
import { eq, isNull } from "drizzle-orm";
import ChatClient from "./chat-client";
import { ChannelList } from "./channel-list";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; g?: string }>;
}) {
  await ensureMigrated();
  const me = await getCurrentParticipant().catch(() => null);
  if (!me) redirect("/auth/login?next=/chat");

  const { channel, g } = await searchParams;
  const groupsOfMine = await myGroups(me);
  const activeGroup =
    (g && groupsOfMine.find((x) => x.id === g)) ||
    (channel === "group" && groupsOfMine[0]) ||
    null;
  const activeChannel: "general" | "group" = activeGroup ? "group" : "general";

  const select = {
    id: groupPosts.id, content: groupPosts.content,
    createdAt: groupPosts.createdAt, authorId: groupPosts.authorId,
    authorName: participants.name,
  };
  const postsQuery = db
    .select(select)
    .from(groupPosts)
    .leftJoin(participants, eq(participants.id, groupPosts.authorId))
    .where(activeGroup ? eq(groupPosts.groupId, activeGroup.id) : isNull(groupPosts.groupId))
    .orderBy(groupPosts.createdAt)
    .limit(100);

  const posts = await postsQuery;

  return (
    <div className="min-h-screen flex flex-col graph-paper">
      <SiteHeader user={{ name: me.name, role: me.role, groupId: me.groupId }} />

      <div className="page-column flex w-full flex-1 flex-col">
      <div className="flex flex-1 flex-col sm:flex-row overflow-hidden max-w-3xl mx-auto w-full px-4 py-6 gap-4 sm:gap-6">
        {/* Channel sidebar */}
        <aside className="sm:w-44 sm:shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Channels</p>
          <ChannelList
            active={activeGroup ? activeGroup.id : "general"}
            channels={[
              { key: "general", label: "General", href: "/chat?channel=general" },
              ...groupsOfMine.map((x) => ({ key: x.id, label: x.name, href: `/chat?g=${x.id}` })),
            ]}
          />
        </aside>

        {/* Chat area (client component handles posting + auto-refresh) */}
        <ChatClient
          key={activeGroup?.id ?? "general"}
          groupName={activeGroup?.name ?? null}
          initialPosts={posts.map((p) => ({
            id: p.id,
            content: p.content,
            createdAt: p.createdAt.toISOString(),
            authorId: p.authorId,
            authorName: p.authorName ?? "Unknown",
          }))}
          channel={activeChannel}
          groupId={activeGroup?.id ?? null}
          myId={me.id}
          myName={me.name}
        />
      </div>
      </div>
    </div>
  );
}

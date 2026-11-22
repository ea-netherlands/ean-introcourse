/**
 * /group/[groupId] — the group chat now lives in /chat (one chat for participants and
 * facilitators, with a channel per group). This address forwards there.
 */
import { redirect } from "next/navigation";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  redirect(`/chat?g=${encodeURIComponent(groupId)}`);
}

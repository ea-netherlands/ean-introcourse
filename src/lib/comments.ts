/**
 * Lesson comments are shared by a whole cohort: everyone whose group has the
 * same groups.cohort sees the same discussion under a lesson. A group without a
 * cohort label forms its own "cohort" (keyed by the group id), so its members
 * still get a discussion.
 *
 * Who may delete: the author, a facilitator in the same cohort, or role admin.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, ensureMigrated, groups, lessonComments, participants } from "@/db";
import type { CurrentParticipant } from "@/lib/auth";

export const MAX_COMMENT_LENGTH = 4000;

export interface CommentView {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null; role: string };
  canDelete: boolean;
}

/** The cohort key for a signed-in participant, or null when they have no group. */
export async function cohortFor(me: Pick<CurrentParticipant, "groupId">): Promise<string | null> {
  if (!me.groupId) return null;
  await ensureMigrated();
  const [g] = await db.select({ id: groups.id, cohort: groups.cohort }).from(groups).where(eq(groups.id, me.groupId)).limit(1);
  if (!g) return null;
  return g.cohort?.trim() || `group:${g.id}`;
}

/** Human label for a cohort key ("group:<id>" keys show the group's name). */
export async function cohortLabel(cohort: string): Promise<string> {
  if (!cohort.startsWith("group:")) return cohort;
  const [g] = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, cohort.slice(6))).limit(1);
  return g?.name ?? "your group";
}

export function canModerate(me: Pick<CurrentParticipant, "id" | "role">, authorId: string, sameCohort: boolean): boolean {
  if (me.role === "admin") return true;
  if (me.id === authorId) return true;
  return me.role === "facilitator" && sameCohort;
}

/** All comments on a lesson for one cohort, oldest first (replies are nested by the UI). */
export async function listLessonComments(
  lessonId: string,
  cohort: string,
  me: Pick<CurrentParticipant, "id" | "role">
): Promise<CommentView[]> {
  await ensureMigrated();
  const rows = await db
    .select({
      id: lessonComments.id,
      parentId: lessonComments.parentId,
      content: lessonComments.content,
      createdAt: lessonComments.createdAt,
      authorId: participants.id,
      name: participants.name,
      avatarUrl: participants.avatarUrl,
      role: participants.role,
    })
    .from(lessonComments)
    .innerJoin(participants, eq(participants.id, lessonComments.authorId))
    .where(and(eq(lessonComments.lessonId, lessonId), eq(lessonComments.cohort, cohort)))
    .orderBy(lessonComments.createdAt);
  return rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    author: { id: r.authorId, name: r.name, avatarUrl: r.avatarUrl, role: r.role },
    canDelete: canModerate(me, r.authorId, true),
  }));
}

/** Latest comments across all lessons for the given cohorts (facilitator overview). */
export async function recentCohortComments(cohorts: string[], limit = 30) {
  if (cohorts.length === 0) return [];
  await ensureMigrated();
  const rows = await db
    .select({
      id: lessonComments.id,
      lessonId: lessonComments.lessonId,
      parentId: lessonComments.parentId,
      content: lessonComments.content,
      createdAt: lessonComments.createdAt,
      name: participants.name,
      role: participants.role,
    })
    .from(lessonComments)
    .innerJoin(participants, eq(participants.id, lessonComments.authorId))
    .where(inArray(lessonComments.cohort, cohorts))
    .orderBy(desc(lessonComments.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

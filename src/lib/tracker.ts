/**
 * Facilitator tracker (replaces the "Checklists & trackers" spreadsheet):
 * - a checklist of facilitator tasks per moment of the course, ticked off per group;
 * - attendance per participant per course week (present / partly / absent).
 *
 * Facilitators fill it in on /group/[groupId]/overview; admins see every group of a cohort on
 * /admin/tracker. Checklist tasks link to the matching section of the facilitator guide.
 * Attendance: present = 1, partly = 0.5, absent = 0, over the weeks marked so far;
 * Strong ≥ 80 %, Moderate ≥ 60 %, Weak below (owner's choice, Nov 2026).
 */
import { and, eq, inArray } from "drizzle-orm";
import { db, ensureMigrated, groupAttendance, groupChecklist, groups, participants } from "@/db";
import { facilitatorGuideSectionUrl } from "@/lib/facilitator-guide";

// ── Checklist ────────────────────────────────────────────────────────────────

export const CHECKLIST_PHASES = [
  { key: "start", label: "Before the start", week: 1 },
  { key: "s2", label: "Before session 2", week: 2 },
  { key: "s3", label: "Before session 3", week: 3 },
  { key: "s4", label: "Before session 4", week: 4 },
  { key: "s5", label: "Before session 5", week: 5 },
  { key: "after", label: "After the course", week: null },
] as const;
export type PhaseKey = (typeof CHECKLIST_PHASES)[number]["key"];

/** Facilitator guide headings (Google Docs ids) per course week. */
export const GUIDE_WEEK_HEADINGS: Record<number, string> = {
  1: "h.ng96u4knbru0",
  2: "h.k2vjjuouxx6t",
  3: "h.dliqoucdi8pl",
  4: "h.mse9mwbig5u",
  5: "h.bxatyxknclgi",
};

export interface ChecklistTask {
  key: string;
  label: string;
  hint?: string;
  optional?: boolean;
  phases: PhaseKey[];
  /** Guide section: a fixed heading, or "week" = the guide for that phase's week. */
  guide?: string | "week";
}

export const CHECKLIST_TASKS: ChecklistTask[] = [
  {
    key: "invite",
    label: "Send an invite email",
    hint: "Introduce yourself and remind everyone to sign in to the Intro Course site and start the Week 1 materials.",
    phases: ["start"],
  },
  { key: "meet", label: "Create and send the Google Meet link", hint: "Plan your sessions on the Sessions page; participants get the link and a reminder.", phases: ["start"] },
  {
    key: "chat",
    label: "Set up a group chat",
    hint: "Use the group chat on this site, or WhatsApp/Signal if your group prefers (the guide suggests asking at the end of week 1).",
    phases: ["start"],
    guide: GUIDE_WEEK_HEADINGS[1],
  },
  {
    key: "prepare",
    label: "Prepare the session",
    hint: "Read the week's materials and the guide for that week; think of questions or exercises.",
    phases: ["start", "s2", "s3", "s4", "s5"],
    guide: "week",
  },
  {
    key: "agenda",
    label: "Send an agenda before the session",
    hint: "So participants know what to expect.",
    optional: true,
    phases: ["start", "s2", "s3", "s4", "s5"],
  },
  { key: "inbox", label: "Check your inbox and reply to messages", phases: ["start", "s2", "s3", "s4", "s5", "after"] },
  { key: "feedback", label: "Send out the feedback form", hint: "Finished participants also see the follow-up form on the site.", phases: ["after"] },
  { key: "share", label: "Share your experience with the EAN team", hint: "What worked, what didn't, what you changed. Email programmes@effectiefaltruisme.nl or tell James.", phases: ["after"] },
];

export const itemKey = (task: string, phase: PhaseKey) => `${task}@${phase}`;

/** Every (task, phase) cell of the checklist, in display order. */
export function checklistItems() {
  return CHECKLIST_PHASES.flatMap((p) =>
    CHECKLIST_TASKS.filter((t) => t.phases.includes(p.key)).map((t) => ({
      key: itemKey(t.key, p.key),
      task: t,
      phase: p,
      guideHeading: t.guide === "week" ? (p.week ? GUIDE_WEEK_HEADINGS[p.week] : undefined) : t.guide,
    }))
  );
}
/** Serializable checklist items for the GroupTracker component (guide links resolved here). */
export function trackerItems() {
  return checklistItems().map((i) => ({
    key: i.key,
    label: i.task.label,
    hint: i.task.hint,
    optional: i.task.optional,
    phaseKey: i.phase.key,
    phaseLabel: i.phase.label,
    guideUrl: i.guideHeading ? facilitatorGuideSectionUrl(i.guideHeading) : undefined,
  }));
}
export const ALL_ITEM_KEYS = new Set(checklistItems().map((i) => i.key));
/** Required (non-optional) items, for progress counts. */
export const REQUIRED_ITEM_KEYS = new Set(checklistItems().filter((i) => !i.task.optional).map((i) => i.key));

// ── Attendance ───────────────────────────────────────────────────────────────

export const WEEKS = [1, 2, 3, 4, 5] as const;
export type AttendanceStatus = "present" | "partly" | "absent";
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "partly", "absent"];
const SCORE: Record<AttendanceStatus, number> = { present: 1, partly: 0.5, absent: 0 };

export type AttendanceLevel = "Strong" | "Moderate" | "Weak" | "—";

/** Percentage over the weeks marked so far (null when nothing is marked). */
export function attendancePct(marks: Partial<Record<number, AttendanceStatus>>): number | null {
  const vals = Object.values(marks).filter((v): v is AttendanceStatus => !!v);
  if (!vals.length) return null;
  return Math.round((vals.reduce((n, v) => n + SCORE[v], 0) / vals.length) * 100);
}
export function attendanceLevel(pct: number | null): AttendanceLevel {
  if (pct == null) return "—";
  return pct >= 80 ? "Strong" : pct >= 60 ? "Moderate" : "Weak";
}

// ── Data ─────────────────────────────────────────────────────────────────────

export interface GroupTrackerData {
  groupId: string;
  groupName: string;
  facilitatorName: string | null;
  members: { id: string; name: string }[];
  /** attendance[participantId][week] */
  attendance: Record<string, Partial<Record<number, AttendanceStatus>>>;
  doneItems: string[];
}

export async function getGroupTrackers(groupIds: string[]): Promise<GroupTrackerData[]> {
  if (!groupIds.length) return [];
  await ensureMigrated();
  const [gs, members, att, done] = await Promise.all([
    db.select({ id: groups.id, name: groups.name, facilitatorId: groups.facilitatorId }).from(groups).where(inArray(groups.id, groupIds)),
    db
      .select({ id: participants.id, name: participants.name, role: participants.role, groupId: participants.groupId })
      .from(participants)
      .where(inArray(participants.groupId, groupIds))
      .orderBy(participants.name),
    db.select().from(groupAttendance).where(inArray(groupAttendance.groupId, groupIds)),
    db.select({ groupId: groupChecklist.groupId, itemKey: groupChecklist.itemKey }).from(groupChecklist).where(inArray(groupChecklist.groupId, groupIds)),
  ]);
  const facIds = [...new Set(gs.map((g) => g.facilitatorId).filter((x): x is string => !!x))];
  const facs = facIds.length
    ? await db.select({ id: participants.id, name: participants.name }).from(participants).where(inArray(participants.id, facIds))
    : [];
  const facName = new Map(facs.map((f) => [f.id, f.name]));

  return groupIds
    .map((gid) => gs.find((g) => g.id === gid))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => {
      const attendance: GroupTrackerData["attendance"] = {};
      for (const a of att.filter((x) => x.groupId === g.id)) {
        (attendance[a.participantId] ??= {})[a.week] = a.status as AttendanceStatus;
      }
      const facilitatorInGroup = members.find((m) => m.groupId === g.id && m.role === "facilitator");
      return {
        groupId: g.id,
        groupName: g.name,
        facilitatorName: (g.facilitatorId && facName.get(g.facilitatorId)) || facilitatorInGroup?.name || null,
        members: members.filter((m) => m.groupId === g.id && m.role === "participant").map((m) => ({ id: m.id, name: m.name })),
        attendance,
        doneItems: done.filter((d) => d.groupId === g.id).map((d) => d.itemKey),
      };
    });
}

export async function setAttendance(groupId: string, participantId: string, week: number, status: AttendanceStatus | null, by: string) {
  await ensureMigrated();
  const where = and(eq(groupAttendance.groupId, groupId), eq(groupAttendance.participantId, participantId), eq(groupAttendance.week, week));
  if (!status) {
    await db.delete(groupAttendance).where(where);
    return;
  }
  const [existing] = await db.select({ week: groupAttendance.week }).from(groupAttendance).where(where).limit(1);
  if (existing) await db.update(groupAttendance).set({ status, updatedBy: by, updatedAt: new Date() }).where(where);
  else await db.insert(groupAttendance).values({ groupId, participantId, week, status, updatedBy: by });
}

export async function setChecklistItem(groupId: string, key: string, done: boolean, by: string) {
  await ensureMigrated();
  const where = and(eq(groupChecklist.groupId, groupId), eq(groupChecklist.itemKey, key));
  if (!done) {
    await db.delete(groupChecklist).where(where);
    return;
  }
  const [existing] = await db.select({ k: groupChecklist.itemKey }).from(groupChecklist).where(where).limit(1);
  if (!existing) await db.insert(groupChecklist).values({ groupId, itemKey: key, doneBy: by });
}

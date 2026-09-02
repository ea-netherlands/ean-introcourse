/**
 * /admin/sessions/[id] — session detail + attendance tracking
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  db,
  ensureMigrated,
  fellowshipSessions,
  groups,
  participants,
  sessionAttendance,
} from "@/db";
import { Badge } from "@/components/ui";
import { AttendanceToggle } from "./attendance-toggle";
import { DeleteSessionButton } from "./delete-button";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params;
  await ensureMigrated();

  const [session] = await db
    .select({
      id: fellowshipSessions.id,
      title: fellowshipSessions.title,
      scheduledAt: fellowshipSessions.scheduledAt,
      meetLink: fellowshipSessions.meetLink,
      agenda: fellowshipSessions.agenda,
      groupId: fellowshipSessions.groupId,
      groupName: groups.name,
      facilitatorId: fellowshipSessions.facilitatorId,
    })
    .from(fellowshipSessions)
    .leftJoin(groups, eq(groups.id, fellowshipSessions.groupId))
    .where(eq(fellowshipSessions.id, id))
    .limit(1);

  if (!session) notFound();

  // Facilitator name
  let facilitatorName: string | null = null;
  if (session.facilitatorId) {
    const [fac] = await db
      .select({ name: participants.name })
      .from(participants)
      .where(eq(participants.id, session.facilitatorId));
    facilitatorName = fac?.name ?? null;
  }

  // Attendance rows
  const attendanceRows = await db
    .select({
      participantId: sessionAttendance.participantId,
      attended: sessionAttendance.attended,
      inviteSentAt: sessionAttendance.inviteSentAt,
      name: participants.name,
      email: participants.email,
    })
    .from(sessionAttendance)
    .leftJoin(participants, eq(participants.id, sessionAttendance.participantId))
    .where(eq(sessionAttendance.sessionId, id));

  const isPast = session.scheduledAt < new Date();

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const attended = attendanceRows.filter((r) => r.attended === true).length;
  const total = attendanceRows.length;

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/admin/sessions"
        className="text-sm text-slate-400 hover:text-teal-600 transition inline-block"
      >
        ← Sessions
      </Link>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{session.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{fmt(session.scheduledAt)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {session.groupName && <Badge variant="default">{session.groupName}</Badge>}
            {isPast ? (
              <Badge variant="success">completed</Badge>
            ) : (
              <Badge variant="teal">upcoming</Badge>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm text-slate-600">
          {facilitatorName && (
            <p><span className="font-medium">Facilitator:</span> {facilitatorName}</p>
          )}
          {session.meetLink && (
            <p>
              <span className="font-medium">Meet link:</span>{" "}
              <a
                href={session.meetLink}
                target="_blank"
                rel="noreferrer"
                className="text-teal-600 underline hover:opacity-75"
              >
                {session.meetLink}
              </a>
            </p>
          )}
          {session.agenda && (
            <div>
              <p className="font-medium mb-1">Agenda</p>
              <p className="whitespace-pre-wrap text-slate-500 text-sm">{session.agenda}</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
          <DeleteSessionButton sessionId={id} />
        </div>
      </div>

      {/* Attendance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Attendance
          </h2>
          {isPast && total > 0 && (
            <span className="text-sm text-slate-500">
              {attended}/{total} attended
            </span>
          )}
        </div>

        {attendanceRows.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
            No participants linked to this session yet.
            {session.groupId && " (Assign participants to the group first.)"}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-50">
            {attendanceRows.map((row) => (
              <div
                key={row.participantId}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{row.name}</p>
                  <p className="text-xs text-slate-400">{row.email}</p>
                </div>
                {isPast ? (
                  <AttendanceToggle
                    sessionId={id}
                    participantId={row.participantId}
                    attended={row.attended}
                  />
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Attendance tracked after session
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

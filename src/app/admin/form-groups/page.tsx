import { db, participants, groups, ensureMigrated } from "@/db";
import { eq, isNull, or } from "drizzle-orm";
import FormGroupsClient from "./form-groups-client";

export const dynamic = "force-dynamic";

const SLOT_LABELS: Record<string, string> = {
  early_monday: "Mon early",
  late_monday: "Mon late",
  early_thursday: "Thu early",
  late_thursday: "Thu late",
};

export default async function FormGroupsPage() {
  await ensureMigrated();

  const allParticipants = await db
    .select({
      id: participants.id, name: participants.name, email: participants.email,
      role: participants.role, groupId: participants.groupId,
      availability: participants.availability, status: participants.status,
    })
    .from(participants);

  const allGroups = await db.select().from(groups).orderBy(groups.name);

  const facilitators = allParticipants.filter((p) => p.role === "facilitator");
  const ungrouped = allParticipants.filter(
    (p) => p.role === "participant" && p.status === "active"
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Form Groups</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Assign participants to groups based on their availability.
        </p>
      </div>

      <FormGroupsClient
        participants={ungrouped.map((p) => ({
          id: p.id, name: p.name, email: p.email,
          groupId: p.groupId ?? null,
          availability: (p.availability as string[] | null) ?? [],
        }))}
        facilitators={facilitators.map((f) => ({
          id: f.id, name: f.name, email: f.email,
          groupId: f.groupId ?? null,
          availability: (f.availability as string[] | null) ?? [],
        }))}
        groups={allGroups.map((g) => ({ id: g.id, name: g.name, cohort: g.cohort ?? "" }))}
        slotLabels={SLOT_LABELS}
      />
    </div>
  );
}

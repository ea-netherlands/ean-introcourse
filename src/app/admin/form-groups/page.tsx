import { db, participants, groups, applications, ensureMigrated } from "@/db";
import { eq } from "drizzle-orm";
import FormGroupsClient from "./form-groups-client";

export const dynamic = "force-dynamic";

export default async function FormGroupsPage() {
  await ensureMigrated();

  // Join participants with their application to get language, city, etc.
  const allParticipants = await db
    .select({
      id: participants.id,
      name: participants.name,
      email: participants.email,
      role: participants.role,
      groupId: participants.groupId,
      availability: participants.availability,
      status: participants.status,
      // From application (null for manually created participants):
      language: applications.language,
      onlinePreference: applications.onlinePreference,
      careerStage: applications.careerStage,
      city: applications.city,
    })
    .from(participants)
    .leftJoin(applications, eq(participants.email, applications.email));

  const allGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      cohort: groups.cohort,
      timing: groups.timing,
      active: groups.active,
    })
    .from(groups)
    .orderBy(groups.name);

  const facilitators = allParticipants.filter((p) => p.role === "facilitator");
  const activeParticipants = allParticipants.filter(
    (p) => p.role === "participant" && (p.status === "active" || p.status === "pending")
  );

  return (
    <div>
      <FormGroupsClient
        participants={activeParticipants.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          groupId: p.groupId ?? null,
          availability: (p.availability as string[] | null) ?? [],
          language: p.language ?? null,
          onlinePreference: p.onlinePreference ?? null,
          careerStage: p.careerStage ?? null,
          city: p.city ?? null,
        }))}
        facilitators={facilitators.map((f) => ({
          id: f.id,
          name: f.name,
          email: f.email,
          groupId: f.groupId ?? null,
          availability: (f.availability as string[] | null) ?? [],
          language: f.language ?? null,
          onlinePreference: f.onlinePreference ?? null,
          careerStage: f.careerStage ?? null,
          city: f.city ?? null,
        }))}
        groups={allGroups.map((g) => ({
          id: g.id,
          name: g.name,
          cohort: g.cohort ?? "",
          timing: g.timing ?? null,
          active: g.active,
        }))}
      />
    </div>
  );
}

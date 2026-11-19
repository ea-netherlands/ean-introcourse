import { db, applications, ensureMigrated } from "@/db";
import { desc } from "drizzle-orm";
import ApplicationsClient from "./applications-client";
import { listSlots, describeSlot } from "@/lib/slots";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  await ensureMigrated();

  const apps = await db
    .select()
    .from(applications)
    .orderBy(desc(applications.submittedAt));

  // Serialize dates for client component
  const serialized = apps.map((a) => ({
    ...a,
    submittedAt: a.submittedAt.toISOString(),
  }));

  // Slot id → short description, to show booked slot and back-up choices.
  const slotLabels = Object.fromEntries(
    (await listSlots({ bookableOnly: false })).map((s) => [s.id, `${s.name} · ${describeSlot(s)}`])
  );

  return <ApplicationsClient apps={serialized} slotLabels={slotLabels} />;
}

import { db, applications, ensureMigrated } from "@/db";
import { desc } from "drizzle-orm";
import ApplicationsClient from "./applications-client";

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

  return <ApplicationsClient apps={serialized} />;
}

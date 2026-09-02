/**
 * GET /api/admin/export/participants
 * Returns a CSV download of all participants with their group name and status.
 */
import { NextResponse } from "next/server";
import { db, ensureMigrated, participants, groups } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  await ensureMigrated();

  const rows = await db
    .select({
      name: participants.name,
      email: participants.email,
      status: participants.status,
      role: participants.role,
      groupName: groups.name,
      createdAt: participants.createdAt,
    })
    .from(participants)
    .leftJoin(groups, eq(groups.id, participants.groupId))
    .orderBy(participants.createdAt);

  const header = ["Name", "Email", "Status", "Role", "Group", "Joined"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        escapeCsv(r.name),
        escapeCsv(r.email),
        escapeCsv(r.status),
        escapeCsv(r.role),
        escapeCsv(r.groupName),
        escapeCsv(r.createdAt?.toISOString().slice(0, 10) ?? ""),
      ].join(",")
    ),
  ];

  const csv = lines.join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="participants-${date}.csv"`,
    },
  });
}

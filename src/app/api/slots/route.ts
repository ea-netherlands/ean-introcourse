/**
 * GET /api/slots — public list of bookable slots for the application form,
 * with places left. Only what an applicant needs to choose is returned.
 */
import { NextResponse } from "next/server";
import { listSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

export async function GET() {
  const slots = await listSlots({ bookableOnly: true });
  return NextResponse.json(
    slots.map((s) => ({
      id: s.id,
      timing: s.timing,
      timingLabel: s.timingLabel,
      dates: s.dates,
      language: s.language,
      format: s.format,
      location: s.location,
      remaining: s.remaining,
      full: s.remaining === 0,
      facilitator: s.facilitator ? { name: s.facilitator.name, avatarUrl: s.facilitator.avatarUrl } : null,
    }))
  );
}

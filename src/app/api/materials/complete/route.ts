import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/materials/complete
 * Stage 1: accepts the request but doesn't write to the DB yet (no auth).
 * Stage 2: will validate the participant's session cookie and write to `progress`.
 *
 * Body: { slug: string; completed: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug } = body as { slug?: string };
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }
    // TODO (Stage 2): validate session, upsert into `progress` table.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

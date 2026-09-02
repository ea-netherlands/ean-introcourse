import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/exercises/submit
 * Stage 1: accepts the request and returns OK (no DB write yet).
 * Stage 2: will validate session and insert into `exercise_responses`.
 *
 * Body: { slug: string; responses: Record<string, string> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, responses } = body as {
      slug?: string;
      responses?: Record<string, string>;
    };
    if (!slug || !responses) {
      return NextResponse.json(
        { error: "slug and responses are required" },
        { status: 400 }
      );
    }
    // TODO (Stage 2): validate session, upsert into `exercise_responses` table.
    console.log(`[exercises] slug=${slug} responses=${JSON.stringify(responses)}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

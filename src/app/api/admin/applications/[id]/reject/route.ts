import { NextRequest, NextResponse } from "next/server";
import { db, ensureMigrated, applications } from "@/db";
import { eq } from "drizzle-orm";
import { sendEmail, escapeHtml } from "@/lib/email";

interface Ctx { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  await ensureMigrated();
  const { id } = await params;

  const [app] = await db
    .select({ id: applications.id, status: applications.status, name: applications.name, email: applications.email })
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.status !== "pending") return NextResponse.json({ error: "Already handled" }, { status: 409 });

  await db.update(applications).set({ status: "rejected" }).where(eq(applications.id, id));

  // Send rejection email with the standard EAN template
  await sendEmail({
    to: app.email,
    subject: "Your Application to the EA Netherlands Introductory Course",
    kind: "rejection",
    replyTo: "programmes@effectiefaltruisme.nl",
    html: `
      <p>Dear ${escapeHtml(app.name)},</p>
      <p>Thank you for your interest in the Effective Altruism Netherlands Introductory Course.
         We appreciate the time you took to sign up and your enthusiasm for learning more about effective altruism.</p>
      <p>After careful consideration of all applications, we regret to inform you that we are unable to offer
         you a place in the upcoming cohort. This decision was based on one or more of the following factors:</p>
      <ul>
        <li>We prioritise applicants based in the Netherlands, as we have limited capacity and there are
            international programmes specifically designed for participants from other countries.</li>
        <li>Due to our limited number of facilitators, we need to prioritise applicants whose backgrounds
            and motivations suggest they would benefit most from our specific programme.</li>
      </ul>
      <p>We want to emphasise that this decision is not a judgement of your capabilities or potential
         to contribute to effective altruism. There are many pathways to engage with EA ideas and community.</p>
      <p><strong>Alternative options you might consider:</strong></p>
      <ul>
        <li><strong>The EA Virtual Introductory Programme</strong> — This 8-week international programme starts
            monthly and covers similar content to our course:
            <a href="https://www.effectivealtruism.org/virtual-programs/introductory-program">effectivealtruism.org/virtual-programs/introductory-program</a></li>
        <li><strong>Self-study with the EA Handbook</strong> — If you prefer to learn at your own pace:
            <a href="https://forum.effectivealtruism.org/handbook">forum.effectivealtruism.org/handbook</a></li>
      </ul>
      <p>We encourage you to stay connected with the EA community through the
         <a href="https://forum.effectivealtruism.org">EA Forum</a> and local or virtual EA events.</p>
      <p>If you have any questions or would like feedback on your application, please don't hesitate to reach out.</p>
      <p>Vriendelijke groet / Warm regards,<br>
         <strong>Effectief Altruïsme Nederland (EAN)</strong><br>
         <a href="mailto:programmes@effectiefaltruisme.nl">programmes@effectiefaltruisme.nl</a><br>
         <a href="https://www.effectiefaltruisme.nl">www.effectiefaltruisme.nl</a>
      </p>
    `,
  }).catch((err) => {
    console.error("[reject] email send failed:", err);
  });

  return NextResponse.json({ ok: true });
}

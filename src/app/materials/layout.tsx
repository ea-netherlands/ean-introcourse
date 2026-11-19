import { redirect } from "next/navigation";
import { getAllWeeksWithLessons } from "@/lib/lessons";
import { Sidebar, MobileBar } from "@/components/sidebar";
import { AuthBanner } from "@/components/auth-banner";
import { SiteHeader } from "@/components/site-header";
import { getCurrentParticipant } from "@/lib/auth";

/**
 * Lesson pages, laid out like the EAN quick course on effectiefaltruisme.nl:
 * graph paper outside, a white 64rem column with dashed edges, a menu card on
 * the left (lg and up) and the lesson next to it.
 */
export default async function MaterialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const weeks = getAllWeeksWithLessons();
  const participant = await getCurrentParticipant().catch(() => null);

  // Graduated participants land on the graduation page instead of materials
  if (participant?.status === "completed") {
    redirect("/graduated");
  }

  return (
    <div className="min-h-screen graph-paper">
      <SiteHeader
        user={participant ? { name: participant.name, role: participant.role, groupId: participant.groupId } : null}
      />
      <div className="page-column">
        <div className="px-4 py-6 md:px-6 md:py-10 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:py-12">
          <Sidebar
            weeks={weeks}
            participant={participant ? { name: participant.name, groupId: participant.groupId, role: participant.role } : null}
          />

          <div className="flex min-w-0 flex-col gap-4">
            <MobileBar weeks={weeks} />
            <AuthBanner hidden={!!participant} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

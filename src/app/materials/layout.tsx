import { redirect } from "next/navigation";
import { getAllWeeksWithLessons } from "@/lib/lessons";
import { Sidebar, MobileBar } from "@/components/sidebar";
import { AuthBanner } from "@/components/auth-banner";
import { SiteHeader } from "@/components/site-header";
import { getCurrentParticipant } from "@/lib/auth";

/**
 * Lesson pages: graph paper over the whole page, the lesson menu as a card on
 * the left (lg and up) and the lesson text in its own card next to it.
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
        fullWidth
        user={participant ? { name: participant.name, role: participant.role, groupId: participant.groupId } : null}
      />
      <div className="flex gap-6 px-3 py-4 sm:px-4 md:py-6 lg:px-6 lg:py-8">
        <Sidebar weeks={weeks} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <MobileBar weeks={weeks} />
          <AuthBanner hidden={!!participant} />
          {children}
        </div>
      </div>
    </div>
  );
}

import { getAllWeeksWithLessons } from "@/lib/lessons";
import { Sidebar, MobileBar } from "@/components/sidebar";
import { AuthBanner } from "@/components/auth-banner";
import { getCurrentParticipant } from "@/lib/auth";

export default async function MaterialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const weeks = getAllWeeksWithLessons();
  const participant = await getCurrentParticipant().catch(() => null);

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--bg-page)" }}
    >
      <Sidebar
        weeks={weeks}
        participant={participant ? { name: participant.name, groupId: participant.groupId, role: participant.role } : null}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <MobileBar weeks={weeks} />
        <AuthBanner hidden={!!participant} />
        {children}
      </div>
    </div>
  );
}

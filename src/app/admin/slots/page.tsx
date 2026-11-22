import { redirect } from "next/navigation";

/** Slots now live in the "Set up groups" tab of /admin/groups. */
export default function SlotsPage() {
  redirect("/admin/groups?tab=setup");
}

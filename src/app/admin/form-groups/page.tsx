import { redirect } from "next/navigation";

/** Form Groups is now the "Assign people" tab of /admin/groups. */
export default function FormGroupsPage() {
  redirect("/admin/groups?tab=assign");
}

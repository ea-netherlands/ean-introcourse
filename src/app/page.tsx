import { redirect } from "next/navigation";

// Root redirect: everyone lands on /materials, the "Start here" page.
export default function Home() {
  redirect("/materials");
}

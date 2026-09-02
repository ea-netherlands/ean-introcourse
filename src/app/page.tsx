import { redirect } from "next/navigation";

// Root redirect — participants land on /materials, which shows the first module.
export default function Home() {
  redirect("/materials");
}

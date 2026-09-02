import { redirect, notFound } from "next/navigation";
import { getWeek } from "@/lib/lessons";

export default async function WeekPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const week = getWeek(slug);
  if (!week || week.lessons.length === 0) notFound();
  redirect(`/materials/${slug}/${week.lessons[0].id}`);
}

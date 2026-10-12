import { notFound } from "next/navigation";
import VoteClient from "../VoteClient";
export default async function VoteNumberPage({ params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  if (slot !== "2" && slot !== "3") notFound();
  return <VoteClient slot={slot === "2" ? 2 : 3} />;
}

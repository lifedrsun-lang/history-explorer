import { notFound } from "next/navigation";
import { OPINION_SLOTS, opinionSlot } from "@/lib/opinions";
import OpinionStudentClient from "../OpinionStudentClient";
export default async function NumberedOpinionPage({params}: {params: Promise<{slot: string}>}) {
  const {slot} = await params;
  if(!OPINION_SLOTS.some(number => number > 1 && String(number) === slot)) notFound();
  return <OpinionStudentClient slot={opinionSlot(slot)}/>;
}

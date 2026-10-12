import { notFound } from "next/navigation";
import OpinionStudentClient from "../OpinionStudentClient";
export default async function NumberedOpinionPage({params}: {params: Promise<{slot: string}>}) {
  const {slot} = await params;
  if(slot !== "2" && slot !== "3") notFound();
  return <OpinionStudentClient slot={slot==="2"?2:3}/>;
}

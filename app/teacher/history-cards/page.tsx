import HistoryCardClient from "./HistoryCardClient";
import { AFTER_SCHOOL_SCHOOLS } from "@/lib/afterSchool";

export default async function HistoryCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string | string[] }>;
}) {
  const query = await searchParams;
  const requested = Array.isArray(query.school) ? query.school[0] : query.school;
  const initialSchool = AFTER_SCHOOL_SCHOOLS.some((item) => item.slug === requested)
    ? requested!
    : "haneulbit";

  return <HistoryCardClient key={initialSchool} initialSchool={initialSchool} />;
}

import { notFound } from "next/navigation";

import { getAfterSchoolSchool } from "@/lib/afterSchool";

import AfterSchoolCoinAwardPanel from "./AfterSchoolCoinAwardPanel";

export default async function AfterSchoolCoinAwardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolSlug } = await params;
  const school = getAfterSchoolSchool(schoolSlug);

  if (!school) notFound();

  return <AfterSchoolCoinAwardPanel key={school.slug} school={school} />;
}

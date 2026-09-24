import MoralMachineActivity from "./MoralMachineActivity";

export const metadata = {
  title: "모럴머신 결과 연구소 | SUN LAB",
  description: "모럴머신 실험 결과를 등록하고 우리 반과 학년 결과를 비교합니다.",
};

export default async function MoralMachinePage({
  searchParams,
}: {
  searchParams: Promise<{ classroomToken?: string }>;
}) {
  const { classroomToken = "" } = await searchParams;
  return <MoralMachineActivity classroomToken={classroomToken} />;
}

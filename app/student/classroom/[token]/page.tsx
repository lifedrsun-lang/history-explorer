import ClassroomBoard from "../../components/ClassroomBoard";
import ManagedSchoolClassroomEntry from "../../components/ManagedSchoolClassroomEntry";
import { getContractClassroomByToken } from "@/lib/contractSchoolsServer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ClassroomDirectPage({ params }: Props) {
  const { token } = await params;
  const classroom = await getContractClassroomByToken(token);

  if (classroom) {
    return <ClassroomBoard classroom={classroom} directAccess />;
  }

  return <ManagedSchoolClassroomEntry schoolSlug={token} />;
}

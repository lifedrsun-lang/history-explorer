import { notFound } from "next/navigation";

import ClassroomBoard from "../../components/ClassroomBoard";
import {
  ALL_CLASSROOMS,
  getClassroomByToken,
} from "../../data/classroomData";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_CLASSROOMS.map((classroom) => ({
    token: classroom.directToken,
  }));
}

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ClassroomDirectPage({ params }: Props) {
  const { token } = await params;
  const classroom = getClassroomByToken(token);

  if (!classroom) {
    notFound();
  }

  return <ClassroomBoard classroom={classroom} directAccess />;
}

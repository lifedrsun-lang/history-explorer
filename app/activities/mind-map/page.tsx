import MindMapStudent from "./MindMapStudent";
export const metadata = { title: "마인드맵 활동 · Sun Lab" };
export default async function Page({ searchParams }: { searchParams: Promise<{ classroomToken?: string; activityId?: string }> }) {
  const query = await searchParams;
  return <MindMapStudent classroomToken={query.classroomToken || ""} activityId={query.activityId || ""} />;
}

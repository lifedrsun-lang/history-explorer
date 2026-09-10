import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getSunLabStudentSession,
  SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";
import PdfBookReaderV2 from "../../PdfBookReaderV2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const normalize = (value: unknown) => String(value || "").trim();

export default async function StudentLibraryReaderPage({
  params,
}: {
  params: Promise<{ readerId: string }>;
}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SUNLAB_STUDENT_SESSION_COOKIE)?.value || "";
  const session = await getSunLabStudentSession(sessionId);

  if (!session || !session.permissions.includes("library")) {
    redirect("/student/book");
  }

  const { readerId } = await params;
  const normalizedReaderId = normalize(readerId);

  if (!normalizedReaderId) notFound();

  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection("sunlab_library_books")
    .where("readerId", "==", normalizedReaderId)
    .limit(1)
    .get();

  if (snapshot.empty) notFound();

  const book = snapshot.docs[0].data();
  if (book?.isActive === false) notFound();

  const title = normalize(book?.title) || "제목 없는 책";

  return (
    <PdfBookReaderV2
      readerId={normalizedReaderId}
      title={title}
      studentName={session.name}
    />
  );
}

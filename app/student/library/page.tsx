import { randomBytes } from "crypto";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getSunLabStudentSession,
  SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type StudentLibraryBook = {
  readerId: string;
  title: string;
  originalName: string;
  size: number;
  createdAt: string | null;
};

const normalize = (value: unknown) => String(value || "").trim();

const serializeDate = (value: unknown): string | null => {
  if (!value) return null;

  const timestamp = value as { toDate?: () => Date; seconds?: number };

  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof timestamp.seconds === "number") {
    return new Date(timestamp.seconds * 1000).toISOString();
  }

  return null;
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const loadBooks = async (): Promise<StudentLibraryBook[] | null> => {
  try {
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection("sunlab_library_books")
      .orderBy("createdAt", "desc")
      .limit(300)
      .get();

    const books: StudentLibraryBook[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data?.isActive === false) continue;

      let readerId = normalize(data?.readerId);
      if (!readerId) {
        readerId = randomBytes(18).toString("hex");
        await doc.ref.set({ readerId }, { merge: true });
      }

      books.push({
        readerId,
        title: normalize(data?.title) || "제목 없는 책",
        originalName: normalize(data?.originalName),
        size: Number(data?.size || 0),
        createdAt: serializeDate(data?.createdAt),
      });
    }

    return books;
  } catch (error) {
    console.error("Failed to load Sun Lab student library", error);
    return null;
  }
};

export default async function StudentLibraryPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SUNLAB_STUDENT_SESSION_COOKIE)?.value || "";
  const session = await getSunLabStudentSession(sessionId);

  if (!session || !session.permissions.includes("library")) {
    redirect("/student/book");
  }

  const books = await loadBooks();

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-4 py-6 text-slate-800 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[30px] border border-white/80 bg-white/95 p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-emerald-600">📚 SUN LAB LIBRARY</div>
              <h1 className="mt-1 text-2xl font-black text-slate-800 sm:text-3xl">선랩 도서관</h1>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                {session.name}님이 읽을 수 있는 SUN LAB 책이에요.
              </p>
            </div>
            <Link
              href="/student/book"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              ← SUN LAB
            </Link>
          </div>
        </header>

        {books === null ? (
          <section className="mt-4 rounded-[28px] border border-rose-100 bg-white/95 p-7 text-center shadow-sm">
            <div className="text-4xl">🛠️</div>
            <div className="mt-3 text-lg font-black text-slate-800">
              도서관 정보를 불러오지 못했어요.
            </div>
            <div className="mt-1 text-sm font-bold text-slate-500">
              잠시 후 다시 들어와 주세요.
            </div>
          </section>
        ) : books.length === 0 ? (
          <section className="mt-4 rounded-[28px] border border-amber-100 bg-white/95 p-8 text-center shadow-sm">
            <div className="text-5xl">📖</div>
            <div className="mt-3 text-lg font-black text-slate-800">
              아직 등록된 책이 없어요.
            </div>
            <div className="mt-1 text-sm font-bold text-slate-500">
              선생님이 책을 등록하면 이곳에 나타나요.
            </div>
          </section>
        ) : (
          <section className="mt-4 grid grid-cols-2 gap-3 rounded-[32px] border border-white/80 bg-white/75 p-3 shadow-sm sm:grid-cols-3 sm:p-4 lg:grid-cols-4">
            {books.map((book) => (
              <article
                key={book.readerId}
                className="flex min-h-[210px] flex-col rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm"
              >
                <div className="flex h-20 items-center justify-center rounded-2xl bg-emerald-50 text-5xl">
                  📕
                </div>
                <h2 className="mt-3 line-clamp-2 text-sm font-black leading-5 text-slate-800 sm:text-base">
                  {book.title}
                </h2>
                {book.originalName && book.originalName !== `${book.title}.pdf` && (
                  <div className="mt-1 line-clamp-1 text-[10px] font-bold text-slate-400">
                    {book.originalName}
                  </div>
                )}
                <div className="mt-auto pt-3">
                  {book.size > 0 && (
                    <div className="mb-2 text-[10px] font-bold text-slate-400">
                      {formatBytes(book.size)}
                    </div>
                  )}
                  <Link
                    href={`/student/library/read/${book.readerId}`}
                    className="block rounded-xl bg-emerald-500 px-3 py-2.5 text-center text-xs font-black text-white shadow-sm transition hover:bg-emerald-600"
                  >
                    📖 읽기
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-center text-xs font-bold leading-5 text-emerald-700">
          책은 선랩 안에서 열리고 Google Drive 원본 링크는 표시하지 않습니다.
        </div>
      </div>
    </main>
  );
}

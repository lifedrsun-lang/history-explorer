"use client";

import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import ClassroomBoard from "@/app/student/components/ClassroomBoard";
import type { SchoolClassroom } from "@/app/student/data/classroomData";
import { auth } from "@/lib/firebase";

type Props = {
  params: Promise<{ token: string }>;
};

export default function ContractClassroomPreviewPage({ params }: Props) {
  const { token } = use(params);
  const [classroom, setClassroom] = useState<SchoolClassroom | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setClassroom(null);
        setErrorMessage("교사 로그인이 필요해요.");
        return;
      }

      void (async () => {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch(
            `/api/teacher/contract-schools/classrooms/${encodeURIComponent(token)}`,
            {
              cache: "no-store",
              headers: { Authorization: `Bearer ${idToken}` },
            }
          );
          const body = (await response.json().catch(() => ({}))) as {
            classroom?: SchoolClassroom;
            error?: string;
          };
          if (!response.ok || !body.classroom) {
            throw new Error(body.error || "preview_failed");
          }
          setClassroom(body.classroom);
          setErrorMessage("");
        } catch {
          setClassroom(null);
          setErrorMessage("학생 화면을 불러오지 못했어요.");
        }
      })();
    });

    return unsubscribe;
  }, [token]);

  if (classroom) {
    return (
      <div>
        <div className="sticky top-0 z-50 bg-slate-900 px-4 py-2 text-center text-xs font-black text-white">
          관리자 미리보기 · 학생에게 보이는 화면입니다
        </div>
        <ClassroomBoard
          classroom={classroom}
          directAccess
          studentPreview
        />
      </div>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-100 p-4">
      <div className="rounded-3xl bg-white p-7 text-center shadow-xl">
        <div className="text-sm font-black text-slate-600">
          {errorMessage || "학생 화면을 불러오는 중이에요."}
        </div>
        {errorMessage && (
          <Link
            href="/teacher/contract-schools"
            className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
          >
            건별 관리로 돌아가기
          </Link>
        )}
      </div>
    </main>
  );
}

"use client";

import { db } from "@/lib/firebase";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import { useEffect, useState } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import StudentProfile from "@/app/student/components/StudentProfile";
import { getStageInfo } from "@/app/student/data/stageData";

export default function TeacherStudentPreviewPage() {
  const router = useRouter();
  const params = useParams();

  const rawStudentId = params?.studentId;
  const studentId = Array.isArray(rawStudentId)
    ? rawStudentId[0]
    : rawStudentId;

  const [authorized, setAuthorized] =
    useState(false);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const isTeacherAuthorized = () => {
    const savedAuth =
      localStorage.getItem("teacherAuth");
    const loginTime =
      localStorage.getItem("teacherLoginTime");

    if (savedAuth !== "true" || !loginTime) {
      return false;
    }

    const diff = Date.now() - Number(loginTime);

    return diff < 1000 * 60 * 2;
  };

  const fetchStudent = async () => {
    if (!studentId) {
      setErrorText("학생 정보를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    try {
      const snapshot = await getDoc(
        doc(db, "students", studentId)
      );

      if (!snapshot.exists()) {
        setErrorText("학생 정보를 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      setStudent({
        id: snapshot.id,
        ...snapshot.data(),
      });
    } catch (error) {
      console.error(
        "학생 미리보기 불러오기 실패:",
        error
      );
      setErrorText(
        "학생 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isTeacherAuthorized()) {
      router.replace("/teacher");
      return;
    }

    setAuthorized(true);
    fetchStudent();
  }, [studentId]);

  const changeCharacter = async (
    studentIdValue: string,
    type: string
  ) => {
    await updateDoc(
      doc(db, "students", studentIdValue),
      {
        character: type,
      }
    );

    setStudent((prev: any) => ({
      ...prev,
      character: type,
    }));
  };

  if (!authorized || loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 flex items-center justify-center px-4 text-slate-700">
        <div className="rounded-[28px] bg-white/90 border border-white p-6 text-center font-bold shadow-sm">
          학생화면을 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (errorText || !student) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-3 py-4 text-slate-800">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-sm">
            <button
              onClick={() => router.push("/teacher")}
              className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700"
            >
              ← 교사용으로 돌아가기
            </button>

            <div className="mt-4 text-lg font-bold">
              {errorText}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stageInfo = getStageInfo(student?.stage);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-3 py-4 text-slate-800">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-sky-700">
                교사용 학생화면 미리보기입니다.
              </div>
              <div className="mt-1 text-xs text-slate-500">
                학생에게 공유하는 공개 링크가 아닙니다.
              </div>
            </div>

            <button
              onClick={() => router.push("/teacher")}
              className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700"
            >
              ← 교사용으로 돌아가기
            </button>
          </div>
        </div>

        <StudentProfile
          student={student}
          currentStage={
            stageInfo?.current?.bookNumber || 1
          }
          stageInfo={stageInfo}
          achievements={[]}
          changeCharacter={changeCharacter}
        />
      </div>
    </div>
  );
}

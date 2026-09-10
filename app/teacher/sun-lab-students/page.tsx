"use client";

import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { auth, db } from "@/lib/firebase";
import { getEnrollmentStatus } from "@/lib/studentEnrollment";
import StudentEditModal from "../components/StudentEditModal";

type StatusFilter = "active" | "paused" | "all";

const isSunLabStudent = (student: any) =>
  student?.sunLabMember === true || String(student?.program || "") === "sun_lab";

export default function SunLabStudentsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudent, setEditingStudent] = useState<any>(null);

  const loadStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const snapshot = await getDocs(collection(db, "students"));
      setStudents(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter(isSunLabStudent)
      );
    } catch {
      setError("SUN LAB 수강생 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const signedIn = Boolean(user);
      setAuthorized(signedIn);
      setAuthChecking(false);
      if (signedIn) void loadStudents();
      else setStudents([]);
    });
  }, []);

  const counts = useMemo(() => {
    const active = students.filter(
      (student) => getEnrollmentStatus(student) === "active"
    ).length;
    return {
      all: students.length,
      active,
      paused: students.length - active,
    };
  }, [students]);

  const visibleStudents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return students
      .filter((student) => {
        const studentStatus =
          getEnrollmentStatus(student) === "active" ? "active" : "paused";
        if (status !== "all" && studentStatus !== status) return false;
        if (keyword && !String(student?.name || "").toLowerCase().includes(keyword)) {
          return false;
        }
        return true;
      })
      .sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""), "ko-KR")
      );
  }, [searchTerm, status, students]);

  if (authChecking) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">
        교사 로그인을 확인하고 있습니다.
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 text-center shadow-lg">
          <div className="text-xl font-black text-slate-800">교사 로그인이 필요합니다.</div>
          <Link href="/teacher" className="mt-4 inline-block rounded-xl bg-blue-500 px-4 py-2 font-bold text-white">
            교사 로그인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[28px] bg-white p-5 shadow-xl sm:rounded-[32px] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-emerald-600">SUN LAB STUDENTS</div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">👧 선랩 수강생 관리</h1>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
                방과후 수강생과 섞이지 않고 SUN LAB 회원만 확인합니다. 계정·생년월일·권한·헬로메이플 정보는 학생 수정에서 관리할 수 있어요.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/teacher/manage/sun-lab" className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                ← SUN LAB 관리
              </Link>
              <Link href="/teacher" className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                교사용 홈
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow-md sm:p-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {([
              ["active", "수강중", counts.active],
              ["paused", "쉬는중", counts.paused],
              ["all", "전체", counts.all],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-2xl px-3 py-3 text-center font-black transition ${
                  status === value
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-emerald-50 text-emerald-800"
                }`}
              >
                <div className="text-xs sm:text-sm">{label}</div>
                <div className="mt-1 text-xl sm:text-2xl">{count}명</div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="선랩 수강생 이름 검색"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={() => void loadStudents()}
              disabled={loading}
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
            >
              {loading ? "불러오는 중" : "↻ 새로고침"}
            </button>
            <Link
              href="/teacher/students?status=active"
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white"
            >
              + 신규 수강생
            </Link>
          </div>

          {error && (
            <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleStudents.map((student) => {
            const studentStatus =
              getEnrollmentStatus(student) === "active" ? "수강중" : "쉬는중";
            const permissions = Array.isArray(student?.sunLabPermissions)
              ? student.sunLabPermissions.length
              : 0;

            return (
              <article key={student.id} className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-black text-slate-900">{student?.name || "이름없음"}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {student?.school || "SUN LAB"}
                      {student?.grade ? ` · ${student.grade}` : ""}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${studentStatus === "수강중" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {studentStatus}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">권한 {student?.sunLabAllAccess ? "전체" : `${permissions}개`}</div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">헬로메이플 {student?.helloMapleId ? "연결됨" : "미등록"}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingStudent(student)}
                  className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
                >
                  학생 정보 수정
                </button>
              </article>
            );
          })}
        </section>

        {!loading && visibleStudents.length === 0 && (
          <div className="mt-4 rounded-3xl bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
            조건에 맞는 SUN LAB 수강생이 없습니다.
          </div>
        )}
      </div>

      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          refreshStudents={loadStudents}
        />
      )}
    </main>
  );
}

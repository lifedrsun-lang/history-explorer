"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";
import type { SunLabPermission } from "@/lib/sunLabMember";
import SunLabMemberEditModal from "../components/SunLabMemberEditModal";

type StatusFilter = "active" | "paused" | "ended" | "all";
type MemberProfile = {
  birthDate: string;
  allAccess: boolean;
  permissions: SunLabPermission[];
  helloMapleId: string;
  helloMaplePassword: string;
};
type Member = {
  studentId: string;
  name: string;
  school: string;
  grade: string;
  enrollmentStatus: "active" | "paused" | "ended";
  profile: MemberProfile;
  profileLinked: boolean;
  legacyProfileAvailable: boolean;
};

export default function SunLabStudentsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthChecking(false);
      }),
    []
  );

  const requestJson = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!user) throw new Error("교사 로그인이 필요합니다.");
      const token = await user.getIdToken();
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "요청 처리에 실패했습니다.");
      }
      return data;
    },
    [user]
  );

  const loadMembers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await requestJson("/api/teacher/sun-lab-members");
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "SUN LAB 회원정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [requestJson, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMembers(), 0);
    return () => window.clearTimeout(timer);
  }, [loadMembers]);

  const counts = useMemo(
    () => ({
      all: members.length,
      active: members.filter((member) => member.enrollmentStatus === "active")
        .length,
      paused: members.filter((member) => member.enrollmentStatus === "paused")
        .length,
      ended: members.filter((member) => member.enrollmentStatus === "ended")
        .length,
    }),
    [members]
  );

  const visibleMembers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return members.filter((member) => {
      if (status !== "all" && member.enrollmentStatus !== status) return false;
      return !keyword || member.name.toLowerCase().includes(keyword);
    });
  }, [members, searchTerm, status]);

  const saveMember = async (profile: MemberProfile) => {
    if (!editingMember) return;
    await requestJson("/api/teacher/sun-lab-members", {
      method: "PATCH",
      body: JSON.stringify({
        studentId: editingMember.studentId,
        ...profile,
      }),
    });
    setNotice(`${editingMember.name} 회원정보를 저장했습니다.`);
    await loadMembers();
  };

  if (authChecking) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">
        교사 로그인을 확인하고 있습니다.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 text-center shadow-lg">
          <div className="text-xl font-black text-slate-800">
            교사 로그인이 필요합니다.
          </div>
          <Link
            href="/teacher"
            className="mt-4 inline-block rounded-xl bg-blue-500 px-4 py-2 font-bold text-white"
          >
            교사 로그인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[28px] bg-white p-5 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-emerald-600">
                SUN LAB MEMBERS
              </div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">
                🌞 SUN LAB 회원관리
              </h1>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
                수강생 관리에서 회원으로 체크된 학생의 로그인·권한·헬로메이플 계정만 관리합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/teacher/students"
                className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700"
              >
                수강생 정보 관리
              </Link>
              <Link
                href="/teacher"
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
              >
                교사용 홈
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow-md sm:p-5">
          <div className="grid grid-cols-4 gap-2">
            {([
              ["active", "수강중", counts.active],
              ["paused", "쉬는중", counts.paused],
              ["ended", "종료", counts.ended],
              ["all", "전체", counts.all],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-2xl px-2 py-3 text-center font-black ${
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
              placeholder="회원 이름 검색"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold"
            />
            <button
              type="button"
              onClick={() => void loadMembers()}
              disabled={loading}
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
            >
              {loading ? "불러오는 중" : "↻ 새로고침"}
            </button>
          </div>
          {error && (
            <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {notice}
            </div>
          )}
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleMembers.map((member) => {
            const permissionCount = member.profile.permissions.length;
            return (
              <article
                key={member.studentId}
                className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-black text-slate-900">
                      {member.name || "이름없음"}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {member.school || "학교 미지정"}
                      {member.grade ? ` · ${member.grade}` : ""}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      member.profileLinked
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {member.profileLinked ? "연결완료" : "설정필요"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    권한 {member.profile.allAccess ? "전체" : `${permissionCount}개`}
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    헬로메이플 {member.profile.helloMapleId ? "연결됨" : "미등록"}
                  </div>
                </div>
                {member.legacyProfileAvailable && (
                  <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700">
                    기존 회원정보를 불러왔습니다. 저장하면 별도 회원 데이터로 연결됩니다.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setEditingMember(member)}
                  className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
                >
                  {member.profileLinked ? "회원정보 수정" : "회원정보 연결"}
                </button>
              </article>
            );
          })}
        </section>

        {!loading && visibleMembers.length === 0 && (
          <div className="mt-4 rounded-3xl bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
            조건에 맞는 SUN LAB 회원이 없습니다.
          </div>
        )}
      </div>

      {editingMember && (
        <SunLabMemberEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={saveMember}
        />
      )}
    </main>
  );
}

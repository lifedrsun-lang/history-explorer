"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";
import type {
  HelloMapleMissionStudent,
  HelloMapleMissionSummary,
  HelloMapleMissionTargetType,
} from "@/lib/helloMapleMissions";

type MissionPayload = {
  title: string;
  url: string;
  targetType: HelloMapleMissionTargetType;
  targetStudentIds: string[];
  sortOrder: number;
  isPublished: boolean;
};

export default function HelloMapleMissionsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [missions, setMissions] = useState<HelloMapleMissionSummary[]>([]);
  const [students, setStudents] = useState<HelloMapleMissionStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const [editingMissionId, setEditingMissionId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [targetType, setTargetType] =
    useState<HelloMapleMissionTargetType>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("0");
  const [isPublished, setIsPublished] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/teacher");
        return;
      }

      setUser(currentUser);
      setAuthChecking(false);
    });
  }, [router]);

  const requestJson = useCallback(
    async (requestUrl: string, init?: RequestInit) => {
      if (!user) {
        throw new Error("교사 로그인이 필요합니다.");
      }

      const token = await user.getIdToken();
      const response = await fetch(requestUrl, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "요청 처리에 실패했습니다.");
      }

      return data;
    },
    [user]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await requestJson("/api/teacher/hello-maple-missions");
      setMissions(data.missions || []);
      setStudents(data.students || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "미션 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [requestJson]);

  useEffect(() => {
    if (!user) return;

    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData, user]);

  const resetForm = () => {
    setEditingMissionId("");
    setTitle("");
    setUrl("");
    setTargetType("all");
    setSelectedStudentIds([]);
    setSortOrder("0");
    setIsPublished(true);
    setStudentSearch("");
  };

  const selectMission = (mission: HelloMapleMissionSummary) => {
    setEditingMissionId(mission.id);
    setTitle(mission.title);
    setUrl(mission.url);
    setTargetType(mission.targetType);
    setSelectedStudentIds(mission.targetStudentIds);
    setSortOrder(String(mission.sortOrder));
    setIsPublished(mission.isPublished);
    setNotice("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  };

  const visibleStudents = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();

    if (!keyword) return students;

    return students.filter((student) =>
      [student.name, student.school, student.grade, student.studentClass]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [studentSearch, students]);

  const saveMission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    setErrorMessage("");

    const payload: MissionPayload = {
      title: title.trim(),
      url: url.trim(),
      targetType,
      targetStudentIds: targetType === "selected" ? selectedStudentIds : [],
      sortOrder: Number(sortOrder) || 0,
      isPublished,
    };

    if (!payload.title) {
      setErrorMessage("미션명을 입력해 주세요.");
      return;
    }

    if (!payload.url) {
      setErrorMessage("헬로메이플 미션 링크를 입력해 주세요.");
      return;
    }

    if (payload.targetType === "selected" && payload.targetStudentIds.length === 0) {
      setErrorMessage("대상 학생을 한 명 이상 선택해 주세요.");
      return;
    }

    setSaving(true);

    try {
      if (editingMissionId) {
        await requestJson(
          `/api/teacher/hello-maple-missions/${editingMissionId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        setNotice("미션을 수정했습니다.");
      } else {
        await requestJson("/api/teacher/hello-maple-missions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("미션을 추가했습니다.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "미션 저장에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (mission: HelloMapleMissionSummary) => {
    setNotice("");
    setErrorMessage("");

    try {
      await requestJson(`/api/teacher/hello-maple-missions/${mission.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !mission.isPublished }),
      });
      setNotice(mission.isPublished ? "미션을 숨겼습니다." : "미션을 공개했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "공개 상태 변경에 실패했습니다."
      );
    }
  };

  const deleteMission = async (mission: HelloMapleMissionSummary) => {
    if (!window.confirm(`'${mission.title}' 미션을 삭제할까요?`)) {
      return;
    }

    setNotice("");
    setErrorMessage("");

    try {
      await requestJson(`/api/teacher/hello-maple-missions/${mission.id}`, {
        method: "DELETE",
      });

      if (editingMissionId === mission.id) {
        resetForm();
      }

      setNotice("미션을 삭제했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "미션 삭제에 실패했습니다."
      );
    }
  };

  if (authChecking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 text-sm font-bold text-slate-500">
        교사 로그인 상태를 확인하고 있어요.
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-50 via-white to-amber-50 px-4 py-6 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[28px] border border-white bg-white/95 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-emerald-600">🍁 SUN LAB 교사모드</div>
              <h1 className="mt-1 text-2xl font-black">헬로메이플 미션 관리</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                링크를 등록하면 재배포 없이 학생 SUN LAB 카드에 바로 반영됩니다.
              </p>
            </div>
            <Link
              href="/teacher"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600"
            >
              ← 교사 관리소
            </Link>
          </div>
        </header>

        {(notice || errorMessage) && (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${
              errorMessage
                ? "border border-rose-100 bg-rose-50 text-rose-600"
                : "border border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {errorMessage || notice}
          </div>
        )}

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black">
                {editingMissionId ? "미션 수정" : "새 미션 추가"}
              </div>
              <div className="mt-1 text-xs font-bold text-slate-400">
                hellomaple.org의 HTTPS 링크만 등록됩니다.
              </div>
            </div>
            {editingMissionId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
              >
                새 미션으로
              </button>
            )}
          </div>

          <form onSubmit={saveMission} className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_130px]">
              <label>
                <span className="mb-1.5 block text-sm font-black text-slate-600">미션명</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={100}
                  placeholder="예: 표창 피하기"
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 font-bold outline-none focus:border-sky-300"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-black text-slate-600">표시 순서</span>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center font-black outline-none focus:border-sky-300"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-black text-slate-600">헬로메이플 링크</span>
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://www.hellomaple.org/ko/web-play?play=..."
                className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 font-bold outline-none focus:border-emerald-300"
              />
            </label>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-700">대상</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={`rounded-xl px-4 py-2 text-sm font-black ${
                    targetType === "all"
                      ? "bg-sky-500 text-white"
                      : "bg-white text-slate-600"
                  }`}
                >
                  전체 학생
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("selected")}
                  className={`rounded-xl px-4 py-2 text-sm font-black ${
                    targetType === "selected"
                      ? "bg-sky-500 text-white"
                      : "bg-white text-slate-600"
                  }`}
                >
                  학생 선택
                </button>
              </div>

              {targetType === "selected" && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      placeholder="이름·학교 검색"
                      className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-sky-300"
                    />
                    <div className="text-xs font-black text-sky-600">
                      {selectedStudentIds.length}명 선택
                    </div>
                  </div>
                  <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                    {visibleStudents.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {visibleStudents.map((student) => {
                          const selected = selectedStudentIds.includes(student.id);
                          return (
                            <label
                              key={student.id}
                              className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 ${
                                selected
                                  ? "border-sky-300 bg-sky-50"
                                  : "border-slate-100 bg-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleStudent(student.id)}
                                className="mt-1 h-4 w-4"
                              />
                              <span className="min-w-0">
                                <span className="block font-black text-slate-700">{student.name}</span>
                                <span className="block truncate text-[11px] font-bold text-slate-400">
                                  {[student.school, student.grade, student.studentClass]
                                    .filter(Boolean)
                                    .join(" · ") || "SUN LAB 회원"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-3 py-6 text-center text-sm font-bold text-slate-400">
                        선택 가능한 학생이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <span>
                <span className="block text-sm font-black text-amber-800">학생에게 공개</span>
                <span className="mt-0.5 block text-xs font-bold text-amber-600">
                  끄면 저장은 유지되고 학생 화면에서만 숨겨집니다.
                </span>
              </span>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(event) => setIsPublished(event.target.checked)}
                className="h-5 w-5"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-emerald-500 py-3.5 text-base font-black text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving
                ? "저장 중..."
                : editingMissionId
                  ? "미션 수정 저장"
                  : "+ 미션 추가"}
            </button>
          </form>
        </section>

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-black">등록된 미션</div>
            <div className="text-xs font-black text-slate-400">{missions.length}개</div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm font-bold text-slate-400">불러오는 중...</div>
          ) : missions.length === 0 ? (
            <div className="py-10 text-center text-sm font-bold text-slate-400">
              아직 등록된 헬로메이플 미션이 없습니다.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {missions.map((mission, index) => (
                <article
                  key={mission.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500">
                          {mission.sortOrder || index + 1}번
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            mission.isPublished
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {mission.isPublished ? "공개" : "숨김"}
                        </span>
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-black text-sky-700">
                          {mission.targetType === "all"
                            ? "전체 학생"
                            : `선택 ${mission.targetStudentIds.length}명`}
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-black text-slate-800">{mission.title}</div>
                      <div className="mt-1 break-all text-xs font-bold text-slate-400">{mission.url}</div>
                    </div>
                    <a
                      href={mission.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white"
                    >
                      열기 ↗
                    </a>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={() => selectMission(mission)}
                      className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePublished(mission)}
                      className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-white"
                    >
                      {mission.isPublished ? "숨기기" : "공개하기"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteMission(mission)}
                      className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-black text-white"
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

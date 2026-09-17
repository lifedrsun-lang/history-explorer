"use client";

import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";
import TeacherClassAccountFinder from "@/app/student/components/TeacherClassAccountFinder";
import type {
  ContractSchoolClassroom,
  ContractSchoolConfig,
  ContractSchoolLesson,
} from "@/lib/contractSchools";
import { toSchoolClassroom } from "@/lib/contractSchools";
import {
  getMonsterById,
  type ClassroomLink,
} from "@/app/student/data/classroomData";

type ApiPayload = {
  school?: ContractSchoolConfig;
  schools?: ContractSchoolConfig[];
  error?: string;
};

type NewSchoolDraft = {
  schoolName: string;
  displayName: string;
  slug: string;
  location: string;
  schoolPassword: string;
};

type ActivityMap = Record<string, boolean>;
type ActivityStates = Record<string, ActivityMap>;

const EMPTY_NEW_SCHOOL: NewSchoolDraft = {
  schoolName: "",
  displayName: "",
  slug: "",
  location: "",
  schoolPassword: "",
};

const makeClientId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getErrorMessage = (code?: string) => {
  const messages: Record<string, string> = {
    teacher_auth_required: "교사 로그인이 필요해요.",
    school_slug_exists: "이미 사용 중인 학교 주소예요.",
    invalid_slug: "학교 주소는 영문 소문자·숫자·하이픈으로 입력해 주세요.",
    invalid_school_name: "학교명을 확인해 주세요.",
    invalid_display_name: "학생 화면 표시명을 확인해 주세요.",
    invalid_link_url: "링크 주소는 http:// 또는 https://로 시작해야 해요.",
    duplicate_classroom: "같은 학년·반을 두 번 등록할 수 없어요.",
    duplicate_lesson: "같은 차시 번호를 두 번 등록할 수 없어요.",
    school_setup_incomplete: "학생페이지에 노출하려면 반과 차시를 먼저 등록해 주세요.",
  };
  return messages[code || ""] || "저장하지 못했어요. 입력 내용을 확인해 주세요.";
};

const classLabel = (classroom: ContractSchoolClassroom) =>
  `${classroom.grade}-${classroom.classNumber}`;

export default function ContractSchoolsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [schools, setSchools] = useState<ContractSchoolConfig[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<ContractSchoolConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showNewSchool, setShowNewSchool] = useState(false);
  const [newSchool, setNewSchool] = useState<NewSchoolDraft>(EMPTY_NEW_SCHOOL);
  const [newGrade, setNewGrade] = useState("1");
  const [newClassNumber, setNewClassNumber] = useState("1");
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [passwordInput, setPasswordInput] = useState("");
  const [clearSchoolPassword, setClearSchoolPassword] = useState(false);
  const [expandedClassAccounts, setExpandedClassAccounts] = useState<Set<string>>(
    new Set()
  );
  const [activityStates, setActivityStates] = useState<ActivityStates>({});
  const [pendingLinkState, setPendingLinkState] = useState("");

  const getTeacherToken = useCallback(async () => {
    if (!user) throw new Error("teacher_auth_required");
    return user.getIdToken();
  }, [user]);

  const loadActivityStates = useCallback(
    async (school: ContractSchoolConfig) => {
      if (!user) return;
      const token = await user.getIdToken();
      const entries = await Promise.all(
        school.classrooms.map(async (classroom) => {
          if (!classroom.directToken) return [classroom.id, {}] as const;
          const response = await fetch(
            `/api/classroom/${encodeURIComponent(classroom.directToken)}/activity-state`,
            {
              cache: "no-store",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!response.ok) return [classroom.id, {}] as const;
          const payload = (await response.json().catch(() => ({}))) as {
            activities?: ActivityMap;
          };
          return [classroom.id, payload.activities || {}] as const;
        })
      );
      setActivityStates(Object.fromEntries(entries));
    },
    [user]
  );

  const loadSchools = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/contract-schools", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok) throw new Error(payload.error || "load_failed");
      const nextSchools = Array.isArray(payload.schools) ? payload.schools : [];
      setSchools(nextSchools);

      if (selectedSlug) {
        const refreshed = nextSchools.find((school) => school.slug === selectedSlug);
        if (refreshed) setSelectedSchool(refreshed);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
  }, [selectedSlug, user]);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const timeout = window.setTimeout(() => void loadSchools(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSchools, user]);

  const selectSchool = (school: ContractSchoolConfig) => {
    setSelectedSlug(school.slug);
    setSelectedSchool(JSON.parse(JSON.stringify(school)) as ContractSchoolConfig);
    setExpandedLessons(new Set());
    setMessage("");
    setErrorMessage("");
    setPasswordInput("");
    setClearSchoolPassword(false);
    setExpandedClassAccounts(new Set());
    void loadActivityStates(school);
  };

  const replaceSchool = (school: ContractSchoolConfig) => {
    setSchools((current) =>
      current.map((item) => (item.slug === school.slug ? school : item))
    );
    setSelectedSchool(school);
    void loadActivityStates(school);
  };

  const saveSchool = async (
    school: ContractSchoolConfig,
    successMessage = "학교 설정을 저장했어요."
  ) => {
    if (saving) return null;
    setSaving(true);
    setMessage("");
    setErrorMessage("");
    setSelectedSchool(school);

    try {
      const token = await getTeacherToken();
      const response = await fetch(
        `/api/teacher/contract-schools/${encodeURIComponent(school.slug)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...school,
            ...(passwordInput ? { schoolPassword: passwordInput } : {}),
            clearSchoolPassword,
          }),
        }
      );
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || !payload.school) {
        throw new Error(payload.error || "save_failed");
      }

      replaceSchool(payload.school);
      setPasswordInput("");
      setClearSchoolPassword(false);
      setMessage(successMessage);
      return payload.school;
    } catch (error) {
      setErrorMessage(getErrorMessage(error instanceof Error ? error.message : ""));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const createSchool = async () => {
    if (saving) return;
    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      const token = await getTeacherToken();
      const response = await fetch("/api/teacher/contract-schools", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSchool),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || !payload.school) {
        throw new Error(payload.error || "create_failed");
      }

      setSchools((current) => [...current, payload.school!]);
      selectSchool(payload.school);
      setNewSchool(EMPTY_NEW_SCHOOL);
      setShowNewSchool(false);
      setMessage("신규 학교 카드를 만들었어요. 학생페이지에는 아직 보이지 않아요.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const addClassroom = async () => {
    if (!selectedSchool) return;
    const grade = Number(newGrade);
    const classNumber = Number(newClassNumber);
    if (!Number.isInteger(grade) || !Number.isInteger(classNumber)) return;
    const id = `${grade}-${classNumber}`;
    if (selectedSchool.classrooms.some((classroom) => classroom.id === id)) {
      setErrorMessage("이미 등록된 학년·반이에요.");
      return;
    }

    const classroom: ContractSchoolClassroom = {
      id,
      grade,
      classNumber,
      label: `${grade}학년 ${classNumber}반`,
      monsterId: "",
      directToken: "",
      active: true,
    };
    const nextSchool: ContractSchoolConfig = {
      ...selectedSchool,
      classrooms: [...selectedSchool.classrooms, classroom].sort(
        (a, b) => a.grade - b.grade || a.classNumber - b.classNumber
      ),
      lessonVisibility: {
        ...selectedSchool.lessonVisibility,
        [id]: Object.fromEntries(
          selectedSchool.lessons.map((lesson) => [lesson.id, false])
        ),
      },
    };
    setErrorMessage("");
    await saveSchool(
      nextSchool,
      `${grade}-${classNumber} 반을 만들고 접속 몬스터를 자동 배정했어요.`
    );
  };

  const toggleClassroomActive = async (classroomId: string) => {
    if (!selectedSchool) return;
    const classroom = selectedSchool.classrooms.find(
      (item) => item.id === classroomId
    );
    if (!classroom) return;
    const nextSchool: ContractSchoolConfig = {
      ...selectedSchool,
      classrooms: selectedSchool.classrooms.map((item) =>
        item.id === classroomId ? { ...item, active: !item.active } : item
      ),
    };
    await saveSchool(
      nextSchool,
      `${classLabel(classroom)} 반을 ${classroom.active ? "비활성화" : "활성화"}했어요.`
    );
  };

  const addLesson = () => {
    if (!selectedSchool) return;
    const nextNumber =
      Math.max(0, ...selectedSchool.lessons.map((lesson) => lesson.lesson)) + 1;
    const lesson: ContractSchoolLesson = {
      id: makeClientId("lesson"),
      lesson: nextNumber,
      title: `${nextNumber}차시 수업 안내`,
      message: "수업 안내는 수업 전에 업데이트됩니다.",
      links: [],
    };
    setSelectedSchool({
      ...selectedSchool,
      lessons: [...selectedSchool.lessons, lesson],
      lessonVisibility: Object.fromEntries(
        Object.entries(selectedSchool.lessonVisibility).map(([classroomId, visibility]) => [
          classroomId,
          { ...visibility, [lesson.id]: false },
        ])
      ),
    });
    setExpandedLessons((current) => new Set(current).add(lesson.id));
  };

  const removeLesson = (lessonId: string) => {
    if (!selectedSchool) return;
    setSelectedSchool({
      ...selectedSchool,
      lessons: selectedSchool.lessons.filter((lesson) => lesson.id !== lessonId),
      lessonVisibility: Object.fromEntries(
        Object.entries(selectedSchool.lessonVisibility).map(([classroomId, visibility]) => {
          const next = { ...visibility };
          delete next[lessonId];
          return [classroomId, next];
        })
      ),
    });
  };

  const updateLesson = (
    lessonId: string,
    updater: (lesson: ContractSchoolLesson) => ContractSchoolLesson
  ) => {
    if (!selectedSchool) return;
    setSelectedSchool({
      ...selectedSchool,
      lessons: selectedSchool.lessons.map((lesson) =>
        lesson.id === lessonId ? updater(lesson) : lesson
      ),
    });
  };

  const updateLessonLinks = (
    lessonId: string,
    updater: (links: ClassroomLink[]) => ClassroomLink[]
  ) => {
    updateLesson(lessonId, (lesson) => ({
      ...lesson,
      links: updater(lesson.links),
      clearLegacyClassLinks: true,
    }));
  };

  const toggleLessonVisibility = async (lessonId: string, classroomId: string) => {
    if (!selectedSchool || saving) return;
    const currentValue = selectedSchool.lessonVisibility[classroomId]?.[lessonId] === true;
    const nextSchool: ContractSchoolConfig = {
      ...selectedSchool,
      lessonVisibility: {
        ...selectedSchool.lessonVisibility,
        [classroomId]: {
          ...selectedSchool.lessonVisibility[classroomId],
          [lessonId]: !currentValue,
        },
      },
    };
    await saveSchool(nextSchool, `${classroomId} 차시 상태를 변경했어요.`);
  };

  const isLinkUnlocked = (
    classroomId: string,
    link: ClassroomLink
  ) => {
    const value = activityStates[classroomId]?.[link.id];
    return typeof value === "boolean" ? value : link.defaultUnlocked ?? true;
  };

  const toggleLinkVisibility = async (
    classroom: ContractSchoolClassroom,
    link: ClassroomLink
  ) => {
    if (!selectedSchool || !user || pendingLinkState || !classroom.directToken) return;
    const savedSchool = schools.find((school) => school.slug === selectedSchool.slug);
    const savedLinkExists = savedSchool?.lessons.some((lesson) =>
      lesson.links.some((item) => item.id === link.id)
    );
    if (!savedLinkExists) {
      setErrorMessage("새 링크를 먼저 저장한 뒤 반별 공개 상태를 설정해 주세요.");
      return;
    }

    const key = `${classroom.id}:${link.id}`;
    const currentUnlocked = isLinkUnlocked(classroom.id, link);
    setPendingLinkState(key);
    setErrorMessage("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/classroom/${encodeURIComponent(classroom.directToken)}/activity-state`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activityId: link.id,
            unlocked: !currentUnlocked,
          }),
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        activities?: ActivityMap;
        error?: string;
      };
      if (!response.ok || !payload.activities) {
        throw new Error(payload.error || "activity_state_update_failed");
      }
      setActivityStates((current) => ({
        ...current,
        [classroom.id]: payload.activities!,
      }));
      setMessage(
        `${classLabel(classroom)} · ${link.label}을 ${currentUnlocked ? "잠갔어요." : "공개했어요."}`
      );
    } catch {
      setErrorMessage("링크 공개 상태를 저장하지 못했어요.");
    } finally {
      setPendingLinkState("");
    }
  };

  const orderedSchools = useMemo(
    () => [...schools].sort((a, b) => a.displayName.localeCompare(b.displayName, "ko-KR")),
    [schools]
  );

  if (authChecking) {
    return <main className="min-h-[100dvh] bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">교사 로그인을 확인하는 중이에요.</main>;
  }

  if (!user) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-4">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-slate-900">교사 로그인이 필요해요.</h1>
          <Link href="/teacher" className="mt-5 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white">교사용 로그인</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[28px] bg-white p-5 shadow-xl sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black tracking-[0.16em] text-sky-500">CONTRACT CLASS</div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">🏫 건별 수업 관리</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">학교별 차시 내용과 반별 공개 상태를 한 화면에서 관리합니다.</p>
            </div>
            <Link href="/teacher/manage/teaching" className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">← 출강 관리</Link>
          </div>
        </header>

        {(message || errorMessage) && (
          <div className={`mt-3 rounded-2xl px-4 py-3 text-sm font-black ${errorMessage ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {errorMessage || message}
          </div>
        )}

        {!selectedSchool ? (
          <>
            <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {orderedSchools.map((school) => (
                <button key={school.slug} type="button" onClick={() => selectSchool(school)} className="rounded-[24px] border border-sky-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-2xl">🏫</div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${school.published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{school.published ? "학생페이지 노출" : "준비 중 · 미노출"}</span>
                  </div>
                  <div className="mt-3 text-lg font-black text-slate-900">{school.displayName}</div>
                  <div className="mt-1 text-xs font-bold text-slate-400">/{school.slug} · {school.classrooms.filter((classroom) => classroom.active !== false).length}개 반 · {school.lessons.length}차시</div>
                  <div className="mt-4 text-xs font-black text-sky-600">관리하기 →</div>
                </button>
              ))}
              <button type="button" onClick={() => setShowNewSchool(true)} className="min-h-44 rounded-[24px] border-2 border-dashed border-sky-200 bg-sky-50 p-5 text-center text-sky-700 transition hover:border-sky-400">
                <div className="text-3xl">＋</div>
                <div className="mt-2 text-base font-black">신규 학교 등록</div>
                <div className="mt-1 text-xs font-bold text-sky-500">관리자 카드부터 생성</div>
              </button>
            </section>

            {loading && <div className="mt-4 text-center text-sm font-bold text-slate-400">학교 목록을 불러오는 중이에요.</div>}

            {showNewSchool && (
              <section className="mt-4 rounded-[28px] border border-sky-100 bg-white p-5 shadow-lg sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">신규 학교 카드 만들기</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">생성 직후에는 학생페이지에 노출되지 않습니다.</p>
                  </div>
                  <button type="button" onClick={() => setShowNewSchool(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">닫기</button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-black text-slate-700">학교명<input value={newSchool.schoolName} onChange={(event) => setNewSchool((current) => ({ ...current, schoolName: event.target.value }))} placeholder="예: 서울 ○○초등학교" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-sky-400" /></label>
                  <label className="text-sm font-black text-slate-700">학생 화면 표시명<input value={newSchool.displayName} onChange={(event) => setNewSchool((current) => ({ ...current, displayName: event.target.value }))} placeholder="예: 서울 ○○초" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-sky-400" /></label>
                  <label className="text-sm font-black text-slate-700">학교 주소 식별값<input value={newSchool.slug} onChange={(event) => setNewSchool((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="예: seoul-sample" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-sky-400" /><span className="mt-1 block text-[11px] font-bold text-slate-400">/student/classroom/식별값 · 영문 소문자, 숫자, 하이픈</span></label>
                  <label className="text-sm font-black text-slate-700">수업 장소<input value={newSchool.location} onChange={(event) => setNewSchool((current) => ({ ...current, location: event.target.value }))} placeholder="예: 컴퓨터실" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-sky-400" /></label>
                  <label className="text-sm font-black text-slate-700 sm:col-span-2">학교 비밀번호 <span className="text-xs text-slate-400">(선택)</span><input type="password" value={newSchool.schoolPassword} onChange={(event) => setNewSchool((current) => ({ ...current, schoolPassword: event.target.value }))} placeholder="필요한 학교만 입력" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-sky-400" /></label>
                </div>
                <button type="button" onClick={() => void createSchool()} disabled={saving || !newSchool.schoolName.trim() || !newSchool.slug.trim()} className="mt-5 w-full rounded-2xl bg-sky-500 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "생성 중" : "관리자용 학교 카드 생성"}</button>
              </section>
            )}
          </>
        ) : (
          <section className="mt-4 space-y-4">
            <div className="rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <button type="button" onClick={() => { setSelectedSchool(null); setSelectedSlug(""); }} className="text-xs font-black text-sky-600">← 학교 카드 목록</button>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{selectedSchool.displayName}</h2>
                  <div className="mt-1 text-xs font-bold text-slate-400">학생 주소 /student/classroom/{selectedSchool.slug}</div>
                </div>
                <button type="button" disabled={saving} onClick={() => void saveSchool({ ...selectedSchool, published: !selectedSchool.published }, selectedSchool.published ? "학생페이지에서 숨겼어요." : "학생페이지에 학교를 노출했어요.")} className={`rounded-2xl px-4 py-3 text-sm font-black ${selectedSchool.published ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {selectedSchool.published ? "✓ 학생페이지 노출 중" : "○ 학생페이지 미노출"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-black text-slate-600">학교명<input value={selectedSchool.schoolName} onChange={(event) => setSelectedSchool({ ...selectedSchool, schoolName: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-bold" /></label>
                <label className="text-xs font-black text-slate-600">학생 표시명<input value={selectedSchool.displayName} onChange={(event) => setSelectedSchool({ ...selectedSchool, displayName: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-bold" /></label>
                <label className="text-xs font-black text-slate-600">수업 장소<input value={selectedSchool.location} onChange={(event) => setSelectedSchool({ ...selectedSchool, location: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-bold" /></label>
              </div>
              <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50 p-3">
                <div className="text-xs font-black text-violet-800">학교 비밀번호 · 학생페이지 노출 상태와 별도</div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input type="password" value={passwordInput} onChange={(event) => { setPasswordInput(event.target.value); setClearSchoolPassword(false); }} placeholder={selectedSchool.hasSchoolPassword ? "새 비밀번호 입력 시 변경" : "선택 입력"} className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-bold" />
                  {selectedSchool.hasSchoolPassword && <button type="button" onClick={() => { setClearSchoolPassword((current) => !current); setPasswordInput(""); }} className={`rounded-xl px-3 py-2 text-xs font-black ${clearSchoolPassword ? "bg-rose-500 text-white" : "bg-white text-violet-700"}`}>{clearSchoolPassword ? "비밀번호 제거 예정" : "비밀번호 제거"}</button>}
                </div>
              </div>
              <button type="button" disabled={saving} onClick={() => void saveSchool(selectedSchool)} className="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중" : "학교 기본 설정 저장"}</button>
            </div>

            <div className="rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><div className="text-xs font-black text-sky-500">1단계</div><h3 className="mt-1 text-xl font-black text-slate-900">학년·반 등록</h3></div>
                <div className="flex items-end gap-2">
                  <label className="text-[11px] font-black text-slate-500">학년<input type="number" min="1" max="12" value={newGrade} onChange={(event) => setNewGrade(event.target.value)} className="mt-1 w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm font-black" /></label>
                  <label className="text-[11px] font-black text-slate-500">반<input type="number" min="1" max="30" value={newClassNumber} onChange={(event) => setNewClassNumber(event.target.value)} className="mt-1 w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm font-black" /></label>
                  <button type="button" disabled={saving} onClick={() => void addClassroom()} className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-black text-white disabled:opacity-50">+ 반 추가</button>
                </div>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-500">새 반은 저장과 동시에 운영 중인 6종 가운데 접속 몬스터가 최초 1회 자동 배정됩니다.</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {selectedSchool.classrooms.map((classroom) => {
                  const monster = getMonsterById(classroom.monsterId);
                  const accountExpanded = expandedClassAccounts.has(classroom.id);
                  return (
                    <article key={classroom.id} className={`rounded-[22px] border p-4 ${classroom.active ? "border-sky-100 bg-sky-50/50" : "border-slate-200 bg-slate-100 opacity-75"}`}>
                      <div className="flex items-start gap-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
                          {monster ? <Image src={monster.imageSrc} alt={monster.name} fill sizes="64px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-2xl">🎲</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-lg font-black text-slate-900">{classLabel(classroom)}</div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${classroom.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{classroom.active ? "운영 중" : "비활성"}</span>
                          </div>
                          <div className="mt-1 text-xs font-black text-slate-600">접속 몬스터: {monster?.name || "저장 후 자동 배정"}</div>
                          <div className="mt-0.5 text-[10px] font-bold text-slate-400">접속 몬스터는 변경할 수 없습니다.</div>
                        </div>
                      </div>
                      <label className="mt-3 block text-[11px] font-black text-slate-500">반 표시명<input value={classroom.label} onChange={(event) => setSelectedSchool({ ...selectedSchool, classrooms: selectedSchool.classrooms.map((item) => item.id === classroom.id ? { ...item, label: event.target.value } : item) })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" /></label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setExpandedClassAccounts((current) => { const next = new Set(current); if (next.has(classroom.id)) next.delete(classroom.id); else next.add(classroom.id); return next; })} className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-black text-rose-700">학생 계정 관리</button>
                        <a href="#lesson-management" className="rounded-xl bg-orange-100 px-3 py-2 text-center text-xs font-black text-orange-700">차시·링크 관리</a>
                        {classroom.active && classroom.directToken ? <Link href={`/teacher/contract-schools/preview/${encodeURIComponent(classroom.directToken)}`} target="_blank" className="rounded-xl bg-emerald-100 px-3 py-2 text-center text-xs font-black text-emerald-700">학생 화면 보기 ↗</Link> : <span className="rounded-xl bg-slate-200 px-3 py-2 text-center text-xs font-black text-slate-500">학생 화면 미사용</span>}
                        <button type="button" disabled={saving} onClick={() => void toggleClassroomActive(classroom.id)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50">{classroom.active ? "반 비활성화" : "반 다시 활성화"}</button>
                      </div>
                      {accountExpanded && classroom.directToken && <div className="mt-4"><TeacherClassAccountFinder classroom={toSchoolClassroom(selectedSchool, classroom)} /></div>}
                    </article>
                  );
                })}
                {selectedSchool.classrooms.length === 0 && <div className="text-sm font-bold text-slate-400">등록된 반이 없어요.</div>}
              </div>
              <button type="button" disabled={saving} onClick={() => void saveSchool(selectedSchool, "반 이름과 구성을 저장했어요.")} className="mt-4 rounded-2xl bg-sky-100 px-4 py-2.5 text-sm font-black text-sky-700 disabled:opacity-50">반 이름·구성 저장</button>
            </div>

            <div id="lesson-management" className="scroll-mt-4 rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-xs font-black text-orange-500">2~4단계</div><h3 className="mt-1 text-xl font-black text-slate-900">차시·링크·반별 공개</h3></div>
                <button type="button" onClick={addLesson} className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-black text-white">+ 차시 추가</button>
              </div>
              <div className="mt-4 space-y-3">
                {selectedSchool.lessons.map((lesson) => {
                  const expanded = expandedLessons.has(lesson.id);
                  return <article key={lesson.id} className="overflow-hidden rounded-[22px] border border-slate-200">
                    <div className="bg-slate-50 p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => setExpandedLessons((current) => { const next = new Set(current); if (next.has(lesson.id)) next.delete(lesson.id); else next.add(lesson.id); return next; })} className="min-w-0 text-left">
                          <div className="text-xs font-black text-orange-500">{lesson.lesson}차시</div>
                          <div className="mt-1 truncate text-base font-black text-slate-900">{lesson.title}</div>
                          <div className="mt-1 text-[11px] font-bold text-slate-400">링크 {lesson.links.length}개 · {expanded ? "접기" : "내용 수정"}</div>
                        </button>
                        <button type="button" onClick={() => removeLesson(lesson.id)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600">차시 삭제</button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedSchool.classrooms.filter((classroom) => classroom.active !== false).map((classroom) => {
                          const visible = selectedSchool.lessonVisibility[classroom.id]?.[lesson.id] === true;
                          return <button key={classroom.id} type="button" disabled={saving} onClick={() => void toggleLessonVisibility(lesson.id, classroom.id)} className={`rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-60 ${visible ? "border border-emerald-300 bg-emerald-100 text-emerald-700" : "border border-slate-200 bg-slate-200 text-slate-600"}`}>{classLabel(classroom)} {visible ? "✓ 공개" : "🔒 잠금"}</button>;
                        })}
                      </div>
                    </div>
                    {expanded && <div className="space-y-4 border-t border-slate-100 p-4">
                      {lesson.legacyClassLinks && Object.keys(lesson.legacyClassLinks).length > 0 && !lesson.clearLegacyClassLinks && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">기존 반별 전용 링크를 보존 중입니다. 아래 공통 링크를 수정하면 이 차시를 공통 링크 구조로 전환합니다.</div>}
                      <div className="grid gap-3 sm:grid-cols-[90px_1fr]">
                        <label className="text-xs font-black text-slate-600">차시 번호<input type="number" min="1" max="100" value={lesson.lesson} onChange={(event) => updateLesson(lesson.id, (current) => ({ ...current, lesson: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" /></label>
                        <label className="text-xs font-black text-slate-600">차시 제목<input value={lesson.title} onChange={(event) => updateLesson(lesson.id, (current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" /></label>
                      </div>
                      <label className="block text-xs font-black text-slate-600">설명<textarea value={lesson.message} onChange={(event) => updateLesson(lesson.id, (current) => ({ ...current, message: event.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" /></label>
                      <div>
                        <div className="flex items-center justify-between"><div className="text-sm font-black text-slate-800">링크 목록</div><button type="button" onClick={() => updateLessonLinks(lesson.id, (links) => [...links, { id: makeClientId("link"), label: "새 링크", href: "https://", kind: "activity", defaultUnlocked: false }])} className="rounded-xl bg-sky-100 px-3 py-2 text-xs font-black text-sky-700">+ 링크 추가</button></div>
                        <div className="mt-2 space-y-2">
                          {lesson.links.map((link, linkIndex) => <div key={link.id} className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
                            <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                              <input aria-label="링크 제목" value={link.label} onChange={(event) => updateLessonLinks(lesson.id, (links) => links.map((item) => item.id === link.id ? { ...item, label: event.target.value } : item))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" />
                              <input aria-label="링크 주소" value={link.href} onChange={(event) => updateLessonLinks(lesson.id, (links) => links.map((item) => item.id === link.id ? { ...item, href: event.target.value } : item))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" />
                              <div className="flex gap-1">
                                <button type="button" disabled={linkIndex === 0} onClick={() => updateLessonLinks(lesson.id, (links) => { const next = [...links]; [next[linkIndex - 1], next[linkIndex]] = [next[linkIndex], next[linkIndex - 1]]; return next; })} className="rounded-lg bg-white px-2 text-xs font-black text-slate-600 disabled:opacity-30">↑</button>
                                <button type="button" disabled={linkIndex === lesson.links.length - 1} onClick={() => updateLessonLinks(lesson.id, (links) => { const next = [...links]; [next[linkIndex], next[linkIndex + 1]] = [next[linkIndex + 1], next[linkIndex]]; return next; })} className="rounded-lg bg-white px-2 text-xs font-black text-slate-600 disabled:opacity-30">↓</button>
                                <button type="button" onClick={() => updateLessonLinks(lesson.id, (links) => links.filter((item) => item.id !== link.id))} className="rounded-lg bg-rose-50 px-2 text-xs font-black text-rose-600">삭제</button>
                              </div>
                            </div>
                            <div className="mt-3 border-t border-sky-100 pt-3">
                              <div className="mb-2 text-[11px] font-black text-slate-500">반별 링크 공개</div>
                              <div className="flex flex-wrap gap-2">
                                {selectedSchool.classrooms.filter((classroom) => classroom.active !== false).map((classroom) => {
                                  const unlocked = isLinkUnlocked(classroom.id, link);
                                  const pending = pendingLinkState === `${classroom.id}:${link.id}`;
                                  return <button key={classroom.id} type="button" disabled={Boolean(pendingLinkState) || !classroom.directToken} onClick={() => void toggleLinkVisibility(classroom, link)} className={`rounded-xl px-3 py-2 text-[11px] font-black transition disabled:opacity-50 ${unlocked ? "border border-emerald-300 bg-emerald-100 text-emerald-700" : "border border-slate-200 bg-slate-200 text-slate-600"}`}>{classLabel(classroom)} {pending ? "저장 중" : unlocked ? "✓ 공개" : "🔒 잠금"}</button>;
                                })}
                              </div>
                            </div>
                          </div>)}
                          {lesson.links.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm font-bold text-slate-400">등록된 링크가 없어요.</div>}
                        </div>
                      </div>
                    </div>}
                  </article>;
                })}
                {selectedSchool.lessons.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-7 text-center text-sm font-bold text-slate-400">차시를 추가해 주세요.</div>}
              </div>
              <button type="button" disabled={saving} onClick={() => void saveSchool(selectedSchool, "차시와 링크를 저장했어요.")} className="mt-5 w-full rounded-2xl bg-orange-500 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중" : "차시·링크 저장"}</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

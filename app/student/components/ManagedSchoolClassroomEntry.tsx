"use client";

import { useCallback, useEffect, useState } from "react";

import type { ContractSchoolSummary } from "@/lib/contractSchools";
import type { SchoolClassroom } from "../data/classroomData";
import SchoolMonsterClassPortal from "./SchoolMonsterClassPortal";

type SchoolPayload = {
  school?: ContractSchoolSummary;
  classrooms?: SchoolClassroom[];
  requiresPassword?: boolean;
  error?: string;
};

type Props = {
  schoolSlug: string;
  fallbackDisplayName?: string;
  fallbackClassrooms?: SchoolClassroom[];
};

const REFRESH_MS = 10_000;

export default function ManagedSchoolClassroomEntry({
  schoolSlug,
  fallbackDisplayName,
  fallbackClassrooms,
}: Props) {
  const [school, setSchool] = useState<ContractSchoolSummary | null>(null);
  const [classrooms, setClassrooms] = useState<SchoolClassroom[]>([]);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const applyPayload = useCallback((payload: SchoolPayload) => {
    if (payload.school) setSchool(payload.school);
    if (Array.isArray(payload.classrooms)) setClassrooms(payload.classrooms);
    setRequiresPassword(payload.requiresPassword === true);
  }, []);

  const loadSchool = useCallback(
    async (silent = false) => {
      try {
        const endpoint = `/api/classroom/schools/${encodeURIComponent(schoolSlug)}`;
        const response = accessPassword
          ? await fetch(`${endpoint}/access`, {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: accessPassword }),
            })
          : await fetch(endpoint, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as SchoolPayload;

        if (!response.ok) throw new Error(payload.error || "school_load_failed");
        applyPayload(payload);
        setErrorMessage("");
      } catch {
        if (!silent && fallbackClassrooms?.length) {
          setClassrooms(fallbackClassrooms);
          setSchool({
            slug: schoolSlug,
            schoolName: fallbackClassrooms[0].schoolName,
            displayName:
              fallbackDisplayName ||
              fallbackClassrooms[0].schoolDisplayName ||
              fallbackClassrooms[0].schoolName,
            location: "",
            published: true,
            hasSchoolPassword: false,
          });
          setRequiresPassword(false);
        } else if (!silent) {
          setErrorMessage("학교 수업방을 불러오지 못했어요.");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    }, [accessPassword, applyPayload, fallbackClassrooms, fallbackDisplayName, schoolSlug]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSchool(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSchool]);

  useEffect(() => {
    if (loading || requiresPassword || classrooms.length === 0) return;

    const interval = window.setInterval(() => void loadSchool(true), REFRESH_MS);
    const handleFocus = () => void loadSchool(true);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [classrooms.length, loadSchool, loading, requiresPassword]);

  const unlockSchool = async () => {
    if (!password.trim() || submitting) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/classroom/schools/${encodeURIComponent(schoolSlug)}/access`,
        {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );
      const payload = (await response.json().catch(() => ({}))) as SchoolPayload;

      if (!response.ok) {
        throw new Error(payload.error || "invalid_school_password");
      }

      setAccessPassword(password);
      applyPayload({ ...payload, requiresPassword: false });
      setPassword("");
    } catch {
      setErrorMessage("학교 비밀번호가 맞지 않아요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-amber-50 px-4">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-black text-slate-600 shadow-lg">
          학교 수업방을 불러오는 중이에요.
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-4">
        <div className="w-full max-w-md rounded-[32px] border border-sky-100 bg-white/95 p-7 shadow-xl">
          <div className="text-center text-3xl font-black text-slate-800">
            🔐 {school?.displayName || fallbackDisplayName || "학교"} 입장
          </div>
          <p className="mt-2 text-center text-sm font-bold text-slate-500">
            학교 비밀번호를 입력한 뒤 반을 선택할 수 있어요.
          </p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void unlockSchool();
            }}
            placeholder="학교 비밀번호"
            className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-lg text-slate-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
          {errorMessage && (
            <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-center text-sm font-black text-rose-600">
              {errorMessage}
            </div>
          )}
          <button
            type="button"
            onClick={() => void unlockSchool()}
            disabled={submitting || !password.trim()}
            className="mt-4 w-full rounded-2xl bg-sky-500 py-4 text-lg font-black text-white shadow-sm disabled:opacity-50"
          >
            {submitting ? "확인 중" : "입장하기"}
          </button>
          <a
            href="/student/history"
            className="mt-3 block w-full rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-black text-slate-600"
          >
            학교 목록으로
          </a>
        </div>
      </div>
    );
  }

  if (!school || classrooms.length === 0) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-lg">
          <div className="text-4xl">🏫</div>
          <h1 className="mt-3 text-xl font-black text-slate-800">
            {errorMessage || "아직 준비 중인 학교예요."}
          </h1>
          <a
            href="/student/history"
            className="mt-5 inline-block rounded-2xl bg-slate-800 px-5 py-3 text-sm font-black text-white"
          >
            학교 목록으로
          </a>
        </div>
      </div>
    );
  }

  return (
    <SchoolMonsterClassPortal
      schoolSlug={school.slug}
      schoolDisplayName={school.displayName}
      classrooms={classrooms}
      onChangeSchool={() => {
        window.location.href = "/student/history";
      }}
    />
  );
}

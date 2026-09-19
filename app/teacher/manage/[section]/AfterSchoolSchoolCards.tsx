"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  AFTER_SCHOOL_SCHOOLS,
  AFTER_SCHOOL_STATUS_OPTIONS,
  type AfterSchoolStatus,
  type AfterSchoolStatusMap,
} from "@/lib/afterSchool";

const SCHOOL_CARD_STYLES = [
  "border-sky-200 bg-sky-50 text-sky-950",
  "border-indigo-200 bg-indigo-50 text-indigo-950",
  "border-cyan-200 bg-cyan-50 text-cyan-950",
];

const STATUS_BUTTON_STYLES: Record<AfterSchoolStatus, string> = {
  active: "border-emerald-300 bg-emerald-100 text-emerald-800",
  paused: "border-amber-300 bg-amber-100 text-amber-800",
  completed: "border-slate-300 bg-slate-200 text-slate-700",
};

const DEFAULT_STATUSES: AfterSchoolStatusMap = Object.fromEntries(
  AFTER_SCHOOL_SCHOOLS.map((school) => [school.slug, school.status])
);

const getStatusLabel = (status: AfterSchoolStatus) =>
  AFTER_SCHOOL_STATUS_OPTIONS.find((option) => option.value === status)?.label ||
  "진행중";

export default function AfterSchoolSchoolCards() {
  const [user, setUser] = useState<User | null>(null);
  const [statuses, setStatuses] =
    useState<AfterSchoolStatusMap>(DEFAULT_STATUSES);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadStatuses = useCallback(async (currentUser: User) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/teacher/after-school-status", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        statuses?: AfterSchoolStatusMap;
        error?: string;
      };

      if (!response.ok || !payload.statuses) {
        throw new Error(payload.error || "load_failed");
      }

      setStatuses({ ...DEFAULT_STATUSES, ...payload.statuses });
    } catch {
      setErrorMessage("방과후 상태를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        void loadStatuses(currentUser);
      } else {
        setLoading(false);
      }
    });
  }, [loadStatuses]);

  const updateStatus = async (slug: string, status: AfterSchoolStatus) => {
    if (!user || savingKey || statuses[slug] === status) return;

    setSavingKey(`${slug}:${status}`);
    setMessage("");
    setErrorMessage("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/after-school-status", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug, status }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        slug?: string;
        status?: AfterSchoolStatus;
        error?: string;
      };

      if (!response.ok || !payload.slug || !payload.status) {
        throw new Error(payload.error || "save_failed");
      }

      setStatuses((current) => ({
        ...current,
        [payload.slug!]: payload.status!,
      }));
      const school = AFTER_SCHOOL_SCHOOLS.find((item) => item.slug === slug);
      setMessage(
        `${school?.shortName || "학교"}을 ${getStatusLabel(status)} 상태로 변경했어요.`
      );
    } catch {
      setErrorMessage("상태를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {AFTER_SCHOOL_SCHOOLS.map((school, index) => {
          const currentStatus = statuses[school.slug] || school.status;

          return (
            <article
              key={school.slug}
              className={`overflow-hidden rounded-[26px] border shadow-sm ${SCHOOL_CARD_STYLES[index]}`}
            >
              <Link
                href={`/teacher/after-school/${school.slug}`}
                className="block p-5 transition hover:bg-white/30 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-3xl">🏫</div>
                  <span className="rounded-full border border-current/20 bg-white/70 px-2.5 py-1 text-[11px] font-black">
                    {getStatusLabel(currentStatus)}
                  </span>
                </div>
                <div className="mt-3 text-xl font-black">{school.shortName}</div>
                <div className="mt-1 text-xs font-bold opacity-65">
                  {school.location}
                </div>
                <div className="mt-5 text-sm font-black">학교 관리 열기 →</div>
              </Link>

              <div className="border-t border-current/10 bg-white/45 p-3">
                <div className="mb-2 text-[11px] font-black opacity-65">
                  수업 상태 변경
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {AFTER_SCHOOL_STATUS_OPTIONS.map((option) => {
                    const selected = currentStatus === option.value;
                    const isSaving =
                      savingKey === `${school.slug}:${option.value}`;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        disabled={loading || Boolean(savingKey) || !user}
                        onClick={() => void updateStatus(school.slug, option.value)}
                        className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          selected
                            ? STATUS_BUTTON_STYLES[option.value]
                            : "border-white/80 bg-white/75 text-slate-600 hover:bg-white"
                        }`}
                      >
                        {isSaving ? "저장중" : option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {(message || errorMessage) && (
        <div
          role="status"
          className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
            errorMessage
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {errorMessage || message}
        </div>
      )}
    </>
  );
}

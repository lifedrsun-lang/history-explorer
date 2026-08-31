"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import type {
  ClassroomLesson,
  GaebongClassroom,
} from "../data/classroomData";

type Props = {
  classroom: GaebongClassroom;
  lesson: ClassroomLesson;
};

type ActivityMap = Record<string, boolean>;

const REFRESH_MS = 10000;

const activityStateUrl = (token: string) =>
  `/api/classroom/${encodeURIComponent(token)}/activity-state`;

export default function ClassroomActivityLinks({ classroom, lesson }: Props) {
  const [teacherUser, setTeacherUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<ActivityMap>({});
  const [pendingActivityId, setPendingActivityId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch(activityStateUrl(classroom.directToken), {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as { activities?: ActivityMap };
      setActivities(
        body.activities && typeof body.activities === "object"
          ? body.activities
          : {}
      );
    } catch {
      // 서버 상태 조회 실패 시 수업 데이터의 기본 잠금 상태를 그대로 사용한다.
    }
  }, [classroom.directToken]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setTeacherUser(currentUser);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    void refreshState();

    const interval = window.setInterval(() => {
      void refreshState();
    }, REFRESH_MS);

    const handleFocus = () => {
      void refreshState();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshState]);

  const isUnlocked = (activityId: string, defaultUnlocked?: boolean) => {
    if (typeof activities[activityId] === "boolean") {
      return activities[activityId];
    }

    return defaultUnlocked ?? true;
  };

  const toggleActivity = async (
    activityId: string,
    currentUnlocked: boolean
  ) => {
    if (!teacherUser || pendingActivityId) {
      return;
    }

    const nextUnlocked = !currentUnlocked;
    setPendingActivityId(activityId);
    setErrorMessage("");

    setActivities((current) => ({
      ...current,
      [activityId]: nextUnlocked,
    }));

    try {
      const token = await teacherUser.getIdToken();
      const response = await fetch(activityStateUrl(classroom.directToken), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityId,
          unlocked: nextUnlocked,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        activities?: ActivityMap;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || "activity_state_update_failed");
      }

      if (body.activities && typeof body.activities === "object") {
        setActivities(body.activities);
      }
    } catch {
      setActivities((current) => ({
        ...current,
        [activityId]: currentUnlocked,
      }));
      setErrorMessage("활동 상태를 저장하지 못했어요. 다시 눌러 주세요.");
    } finally {
      setPendingActivityId(null);
    }
  };

  return (
    <div className="mt-4 grid gap-2">
      {teacherUser && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-black text-amber-800">
          🔐 교사 모드 · 오른쪽 상태 버튼을 눌러 활동을 열거나 잠글 수 있어요.
        </div>
      )}

      {lesson.links.map((link) => {
        const unlocked = isUnlocked(link.id, link.defaultUnlocked);
        const pending = pendingActivityId === link.id;
        const activeClass =
          link.kind === "review"
            ? "bg-emerald-500 hover:bg-emerald-600"
            : "bg-sky-500 hover:bg-sky-600";

        return (
          <div
            key={`${lesson.lesson}-${link.id}`}
            className="flex items-stretch gap-2"
          >
            {unlocked ? (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className={`min-w-0 flex-1 rounded-2xl px-4 py-3 text-center text-sm font-black text-white shadow-sm transition active:scale-[0.99] ${activeClass}`}
              >
                {link.kind === "review" ? "🏠" : "🚀"} {link.label}
              </a>
            ) : (
              <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-center">
                <div className="text-sm font-black text-slate-500">
                  🔒 {link.label}
                </div>
                <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                  선생님이 아직 열지 않았어요
                </div>
              </div>
            )}

            {teacherUser && (
              <button
                type="button"
                onClick={() => toggleActivity(link.id, unlocked)}
                disabled={pendingActivityId !== null}
                aria-label={`${link.label} ${unlocked ? "잠그기" : "활성화하기"}`}
                title={unlocked ? "누르면 잠금" : "누르면 활성화"}
                className={`w-[72px] shrink-0 rounded-2xl px-2 text-[11px] font-black shadow-sm transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${
                  unlocked
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-slate-200 bg-slate-200 text-slate-600"
                }`}
              >
                {pending ? "저장중" : unlocked ? "활성화" : "잠금"}
              </button>
            )}
          </div>
        );
      })}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-center text-[11px] font-black text-rose-600">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

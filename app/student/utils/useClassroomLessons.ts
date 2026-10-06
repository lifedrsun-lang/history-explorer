"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClassroomLesson, SchoolClassroom } from "../data/classroomData";

type Snapshot = { token: string; lessons: ClassroomLesson[] };

export function useClassroomLessons(
  classroom: SchoolClassroom,
  studentPreview: boolean
) {
  const token = classroom.directToken;
  const sourceRevision = JSON.stringify(classroom.lessons);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  const refreshLessons = useCallback(async () => {
    if (studentPreview) return;
    // A slower, earlier response must never replace a newer public state.
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    setRefreshing(true);

    try {
      const response = await fetch(
        `/api/classroom/${encodeURIComponent(token)}/lessons`,
        { cache: "no-store", signal: controller.signal }
      );

      if (response.status === 404) {
        if (activeRequest.current === controller) {
          setSnapshot({ token, lessons: [] });
          setErrorMessage("현재 열려 있는 수업방이 아니에요. 선생님께 확인해 주세요.");
        }
        return;
      }

      if (!response.ok) throw new Error("lesson_load_failed");
      const payload = (await response.json()) as Snapshot;
      if (payload.token !== token || !Array.isArray(payload.lessons)) {
        throw new Error("invalid_lesson_payload");
      }

      if (!controller.signal.aborted && activeRequest.current === controller) {
        setSnapshot({ token, lessons: payload.lessons });
        setErrorMessage("");
      }
    } catch {
      if (activeRequest.current === controller) {
        setErrorMessage("최신 차시를 확인하지 못했어요. 연결을 확인하고 차시 다시 확인을 눌러 주세요.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setRefreshing(false);
      }
    }
  }, [studentPreview, token]);

  useEffect(() => {
    if (studentPreview) return;
    // Coalesce focus/visibility/pageshow fired together on the same activation.
    let scheduled: number | undefined;
    const scheduleRefresh = () => {
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(scheduled);
      scheduled = window.setTimeout(() => void refreshLessons(), 100);
    };

    scheduled = window.setTimeout(() => void refreshLessons(), 0);
    window.addEventListener("focus", scheduleRefresh);
    window.addEventListener("pageshow", scheduleRefresh);
    window.addEventListener("online", scheduleRefresh);
    document.addEventListener("visibilitychange", scheduleRefresh);

    return () => {
      window.clearTimeout(scheduled);
      window.removeEventListener("focus", scheduleRefresh);
      window.removeEventListener("pageshow", scheduleRefresh);
      window.removeEventListener("online", scheduleRefresh);
      document.removeEventListener("visibilitychange", scheduleRefresh);
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
    // Parent school-list refreshes can also deliver a changed lesson definition.
  }, [refreshLessons, sourceRevision, studentPreview]);

  return {
    lessons: studentPreview
      ? classroom.lessons
      : snapshot?.token === token
        ? snapshot.lessons
        : [],
    ready: studentPreview || snapshot?.token === token,
    refreshing,
    errorMessage,
    refreshLessons,
  };
}

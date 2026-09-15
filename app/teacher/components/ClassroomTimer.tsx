"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./ClassroomTimer.module.css";

const SECOND_MS = 1_000;

const LESSON_SEGMENTS = [
  {
    label: "1구간",
    durationSeconds: 20 * 60,
    accentText: "text-sky-300",
    badge: "border-sky-300/30 bg-sky-300/15 text-sky-100",
    activeCard: "border-sky-400 bg-sky-50 text-sky-950",
    progress: "bg-sky-400",
  },
  {
    label: "2구간",
    durationSeconds: 10 * 60,
    accentText: "text-amber-300",
    badge: "border-amber-300/30 bg-amber-300/15 text-amber-100",
    activeCard: "border-amber-400 bg-amber-50 text-amber-950",
    progress: "bg-amber-400",
  },
  {
    label: "3구간",
    durationSeconds: 10 * 60,
    accentText: "text-rose-300",
    badge: "border-rose-300/30 bg-rose-300/15 text-rose-100",
    activeCard: "border-rose-400 bg-rose-50 text-rose-950",
    progress: "bg-rose-400",
  },
] as const;

const TOTAL_SECONDS = LESSON_SEGMENTS.reduce(
  (total, segment) => total + segment.durationSeconds,
  0
);
const TOTAL_MS = TOTAL_SECONDS * SECOND_MS;

type TimerStatus = "idle" | "running" | "paused" | "completed";

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatClock(timestamp: number | null) {
  if (timestamp === null) return "--:--:--";

  const date = new Date(timestamp);

  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function getPhase(remainingSeconds: number) {
  const elapsedSeconds = TOTAL_SECONDS - remainingSeconds;
  let elapsedBeforePhase = 0;

  for (let index = 0; index < LESSON_SEGMENTS.length; index += 1) {
    const segment = LESSON_SEGMENTS[index];
    const phaseEnd = elapsedBeforePhase + segment.durationSeconds;
    const isCurrent =
      elapsedSeconds < phaseEnd || index === LESSON_SEGMENTS.length - 1;

    if (isCurrent) {
      return {
        index,
        remainingSeconds: Math.max(0, phaseEnd - elapsedSeconds),
      };
    }

    elapsedBeforePhase = phaseEnd;
  }

  return { index: LESSON_SEGMENTS.length - 1, remainingSeconds: 0 };
}

export default function ClassroomTimer({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [remainingMs, setRemainingMs] = useState(TOTAL_MS);
  const [endsAtMs, setEndsAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [highlightedPhase, setHighlightedPhase] = useState<number | null>(null);
  const announcedPhaseRef = useRef(0);
  const highlightTimerRef = useRef<number | null>(null);

  const remainingSeconds = Math.ceil(remainingMs / SECOND_MS);
  const phase = getPhase(remainingSeconds);
  const currentSegment = LESSON_SEGMENTS[phase.index];
  const progressPercent = Math.min(
    100,
    Math.max(0, ((TOTAL_MS - remainingMs) / TOTAL_MS) * 100)
  );
  const projectedEndMs =
    status === "running"
      ? endsAtMs
      : nowMs === null || status === "completed"
        ? null
        : nowMs + remainingMs;

  useEffect(() => {
    const tick = () => {
      const nextNow = Date.now();
      setNowMs(nextNow);

      if (status !== "running" || endsAtMs === null) return;

      const nextRemainingMs = Math.max(0, endsAtMs - nextNow);
      const nextPhase = getPhase(Math.ceil(nextRemainingMs / SECOND_MS));
      setRemainingMs(nextRemainingMs);

      if (nextPhase.index !== announcedPhaseRef.current) {
        announcedPhaseRef.current = nextPhase.index;
        setHighlightedPhase(nextPhase.index);

        if (highlightTimerRef.current) {
          window.clearTimeout(highlightTimerRef.current);
        }

        highlightTimerRef.current = window.setTimeout(() => {
          setHighlightedPhase(null);
          highlightTimerRef.current = null;
        }, 2_400);
      }

      if (nextRemainingMs === 0) {
        setStatus("completed");
        setEndsAtMs(null);
      }
    };

    const firstTick = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 100);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(interval);
    };
  }, [endsAtMs, status]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const handleStart = () => {
    if (nowMs === null) return;

    const nextNow = nowMs;
    const nextRemainingMs = status === "idle" ? TOTAL_MS : remainingMs;

    announcedPhaseRef.current = phase.index;
    setNowMs(nextNow);
    setRemainingMs(nextRemainingMs);
    setEndsAtMs(nextNow + nextRemainingMs);
    setStatus("running");
  };

  const handlePause = () => {
    if (endsAtMs === null || nowMs === null) return;

    const nextNow = nowMs;
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedPhase(null);
    setNowMs(nextNow);
    setRemainingMs(Math.max(0, endsAtMs - nextNow));
    setEndsAtMs(null);
    setStatus("paused");
  };

  const handleReset = () => {
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    announcedPhaseRef.current = 0;
    setHighlightedPhase(null);
    setRemainingMs(TOTAL_MS);
    setEndsAtMs(null);
    setStatus("idle");
  };

  const isPhaseHighlighted = highlightedPhase === phase.index;

  const statusLabel =
    status === "idle"
      ? "시작 전"
      : status === "running"
        ? "진행 중"
        : status === "paused"
          ? "일시정지"
          : "수업 종료";

  return (
    <section className={`relative ${className}`} aria-label="40분 수업 타이머">
      {isPhaseHighlighted && (
        <div
          key={`banner-${phase.index}`}
          className={`${styles.phaseBanner} absolute left-1/2 top-4 z-20 rounded-full bg-white px-5 py-3 text-lg font-black text-slate-900 shadow-2xl sm:top-6 sm:text-2xl`}
          role="status"
          aria-live="assertive"
        >
          {currentSegment.label} 시작!
        </div>
      )}

      <div
        key={`timer-${phase.index}`}
        className={`overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-2xl sm:rounded-[36px] ${
          isPhaseHighlighted ? styles.phaseGlow : ""
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-slate-400 sm:text-sm">
              40 MINUTE CLASS
            </p>
            <h2 className="mt-1 text-xl font-black sm:text-3xl">수업 타이머</h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-black sm:text-sm ${currentSegment.badge}`}
            >
              {currentSegment.label} · {statusLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm font-black tabular-nums text-slate-200 sm:text-base">
              {formatClock(nowMs)}
            </span>
          </div>
        </div>

        <div className="px-3 pb-4 pt-6 text-center sm:px-8 sm:pb-8 sm:pt-9">
          <p className="text-sm font-black text-slate-400 sm:text-base">전체 남은 시간</p>
          <div
            className={`mt-1 font-mono text-[clamp(4.6rem,23vw,11rem)] font-black leading-[0.95] tracking-[-0.08em] tabular-nums ${
              status === "completed" ? "text-emerald-300" : currentSegment.accentText
            }`}
            role="timer"
            aria-live="off"
            aria-label={`전체 남은 시간 ${formatDuration(remainingSeconds)}`}
          >
            {formatDuration(remainingSeconds)}
          </div>

          <div className="mx-auto mt-6 h-3 max-w-4xl overflow-hidden rounded-full bg-white/10 sm:h-4">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${currentSegment.progress}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mx-auto mt-5 grid max-w-4xl grid-cols-2 gap-2 sm:mt-7 sm:gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 sm:rounded-3xl sm:px-5 sm:py-5">
              <p className="text-xs font-black text-slate-400 sm:text-sm">현재 구간 남은 시간</p>
              <p className="mt-1 font-mono text-3xl font-black tabular-nums text-white sm:text-5xl">
                {formatDuration(phase.remainingSeconds)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 sm:rounded-3xl sm:px-5 sm:py-5">
              <p className="text-xs font-black text-slate-400 sm:text-sm">
                {status === "paused" ? "지금 재개 시 종료" : "종료 예정 시각"}
              </p>
              <p className="mt-1 font-mono text-3xl font-black tabular-nums text-white sm:text-5xl">
                {formatClock(projectedEndMs)}
              </p>
            </div>
          </div>

          {status === "completed" && (
            <div className="mx-auto mt-5 max-w-4xl rounded-2xl border border-emerald-300/30 bg-emerald-300/15 px-4 py-3 text-base font-black text-emerald-100 sm:text-xl">
              40분 수업이 끝났습니다.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
        {LESSON_SEGMENTS.map((segment, index) => {
          const isCurrent = phase.index === index && status !== "completed";
          const isComplete = phase.index > index || status === "completed";
          const segmentStatus = isComplete
            ? "완료"
            : !isCurrent
              ? "대기"
              : status === "idle"
                ? "시작"
                : status === "paused"
                  ? "멈춤"
                  : "진행";

          return (
            <div
              key={segment.label}
              className={`rounded-2xl border-2 px-2 py-3 text-center transition sm:rounded-3xl sm:px-4 sm:py-5 ${
                isCurrent
                  ? `${segment.activeCard} shadow-lg`
                  : isComplete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <div className="text-xs font-black sm:text-sm">
                {segmentStatus} · {segment.label}
              </div>
              <div className="mt-1 text-xl font-black sm:text-3xl">
                {segment.durationSeconds / 60}분
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mx-auto sm:max-w-2xl sm:gap-3">
        {status === "running" ? (
          <button
            type="button"
            onClick={handlePause}
            className="min-h-14 rounded-2xl bg-amber-400 px-5 py-3 text-lg font-black text-amber-950 shadow-lg transition hover:bg-amber-300 active:scale-[0.98] sm:min-h-16 sm:text-xl"
          >
            일시정지
          </button>
        ) : status === "completed" ? (
          <div className="flex min-h-14 items-center justify-center rounded-2xl bg-emerald-100 px-5 py-3 text-lg font-black text-emerald-800 sm:min-h-16 sm:text-xl">
            수업 종료
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={nowMs === null}
            className="min-h-14 rounded-2xl bg-sky-500 px-5 py-3 text-lg font-black text-white shadow-lg transition hover:bg-sky-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:min-h-16 sm:text-xl"
          >
            {status === "paused" ? "재개" : "시작"}
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          disabled={status === "idle" && remainingMs === TOTAL_MS}
          className="min-h-14 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-lg font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-16 sm:text-xl"
        >
          처음부터
        </button>
      </div>
    </section>
  );
}

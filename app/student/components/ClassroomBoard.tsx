"use client";

import { useMemo, useState } from "react";

import type { GaebongClassroom } from "../data/classroomData";

const formatLessonDate = (date?: string) => {
  if (!date) {
    return "일정 추후 안내";
  }

  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
};

const getInitialLesson = (classroom: GaebongClassroom) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextLesson = classroom.lessons.find((lesson) => {
    if (!lesson.date) {
      return false;
    }

    const lessonDate = new Date(`${lesson.date}T00:00:00`);
    return lessonDate.getTime() >= today.getTime();
  });

  return nextLesson?.lesson ?? classroom.lessons.at(-1)?.lesson ?? 1;
};

type Props = {
  classroom: GaebongClassroom;
  directAccess?: boolean;
  onBack?: () => void;
};

export default function ClassroomBoard({
  classroom,
  directAccess = false,
  onBack,
}: Props) {
  const initialLesson = useMemo(
    () => getInitialLesson(classroom),
    [classroom]
  );
  const [openLessons, setOpenLessons] = useState<number[]>([initialLesson]);

  const toggleLesson = (lesson: number) => {
    setOpenLessons((current) =>
      current.includes(lesson)
        ? current.filter((item) => item !== lesson)
        : [...current, lesson]
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-3 py-4 text-slate-800">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-sky-600">🏫 서울 개봉초</div>
              <h1 className="mt-1 text-2xl font-black text-slate-800">
                {classroom.label} 수업방
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                수업 공지 · 활동 링크 · 집에서 다시 보기
              </p>
            </div>
            {directAccess && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                QR 바로입장
              </span>
            )}
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-black text-sky-700"
            >
              ← 다른 반 선택
            </button>
          )}
        </header>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-xl font-black text-slate-800">📚 차시별 수업 안내</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              지난 수업도 다시 펼쳐서 확인할 수 있어요.
            </p>
          </div>

          <div className="space-y-2">
            {classroom.lessons.map((lesson) => {
              const isOpen = openLessons.includes(lesson.lesson);

              return (
                <article
                  key={lesson.lesson}
                  className="overflow-hidden rounded-[22px] border border-sky-100 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleLesson(lesson.lesson)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-700">
                          {lesson.lesson}차시
                        </span>
                        <span className="text-xs font-black text-slate-400">
                          {formatLessonDate(lesson.date)}
                        </span>
                      </div>
                      <div className="mt-2 truncate text-base font-black text-slate-800">
                        {lesson.title}
                      </div>
                    </div>
                    <span className="shrink-0 text-xl text-sky-500" aria-hidden="true">
                      {isOpen ? "⌃" : "⌄"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-sky-50 bg-sky-50/40 px-4 py-4">
                      <p className="text-sm font-bold leading-6 text-slate-600">
                        {lesson.message}
                      </p>

                      {lesson.links.length > 0 && (
                        <div className="mt-4 grid gap-2">
                          {lesson.links.map((link) => (
                            <a
                              key={`${lesson.lesson}-${link.href}`}
                              href={link.href}
                              target="_blank"
                              rel="noreferrer"
                              className={`rounded-2xl px-4 py-3 text-center text-sm font-black text-white shadow-sm transition active:scale-[0.99] ${
                                link.kind === "review"
                                  ? "bg-emerald-500 hover:bg-emerald-600"
                                  : "bg-sky-500 hover:bg-sky-600"
                              }`}
                            >
                              {link.kind === "review" ? "🏠" : "🚀"} {link.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {directAccess && (
          <a
            href="/student/history"
            className="block rounded-[22px] border border-white/80 bg-white/80 px-4 py-3 text-center text-xs font-black text-slate-500 shadow-sm"
          >
            SUN LAB 학교 목록으로
          </a>
        )}
      </div>
    </div>
  );
}

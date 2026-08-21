"use client";

import { useState } from "react";

import {
  HANEULBIT_SCHEDULE,
  getClassProgressStatus,
  getSchedulePreview,
  isClassInCurrentWeek,
  type ClassProgressStatus,
  type HaneulbitClass,
} from "../data/haneulbitSchedule";

const STATUS_INFO: Record<ClassProgressStatus, { icon: string; label: string; className: string }> = {
  upcoming: { icon: "📅", label: "진행예정", className: "bg-slate-100 text-slate-600" },
  "in-progress": { icon: "🟡", label: "진행중", className: "bg-yellow-100 text-yellow-800" },
  completed: { icon: "✅", label: "완료", className: "bg-emerald-100 text-emerald-700" },
};

const formatClassDate = (date: string) => {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
};

function ScheduleRow({ item, today }: { item: HaneulbitClass; today: Date }) {
  const status = getClassProgressStatus(item.date, today);
  const statusInfo = STATUS_INFO[status];
  const isCurrentWeek = isClassInCurrentWeek(item.date, today);

  return (
    <li
      className={`rounded-[20px] border px-3 py-3 transition ${
        isCurrentWeek
          ? "border-sky-300 bg-sky-50 shadow-sm ring-2 ring-sky-100"
          : "border-slate-100 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-sm font-black text-amber-700">
          {item.week}주
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-1 text-[11px] font-black ${statusInfo.className}`}>
              {statusInfo.icon} {statusInfo.label}
            </span>
            <span className="text-xs font-black text-slate-400">{formatClassDate(item.date)}</span>
            {isCurrentWeek && (
              <span className="rounded-full bg-sky-500 px-2 py-1 text-[11px] font-black text-white">
                이번 주
              </span>
            )}
          </div>
          <div className="mt-1.5 text-xs font-black text-sky-700">
            {item.book}호 {item.lesson}차시
          </div>
          <div className="mt-1 text-sm font-black leading-5 text-slate-800">{item.title}</div>
        </div>
      </div>
    </li>
  );
}

export default function ClassProgressBoard() {
  const [showAll, setShowAll] = useState(false);
  const today = new Date();
  const displayedSchedule = showAll ? HANEULBIT_SCHEDULE : getSchedulePreview(today);

  return (
    <section className="rounded-[28px] border border-sky-100 bg-white/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">📚 우리 반은 지금 여기!</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">하늘빛초 3분기 · 매주 수요일 · 12주</p>
        </div>
        <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700">
          8/19 개강
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {displayedSchedule.map((item) => (
          <ScheduleRow key={item.week} item={item} today={today} />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setShowAll((current) => !current)}
        aria-expanded={showAll}
        className="mt-3 w-full rounded-2xl border border-sky-100 bg-sky-50 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-100"
      >
        {showAll ? "간단히 보기" : "전체 수업 일정 보기"}
      </button>
    </section>
  );
}

"use client";

import { useState } from "react";
import type { SchoolNoticeInfo } from "../data/schoolInfo";
import CoinExchangeRequest from "./CoinExchangeRequest";
import StudentAssignments from "./StudentAssignments";
import StudentReviewLaunchers from "./StudentReviewLaunchers";

interface Props {
  student: any;
  currentStage: number;
  stageInfo: any;
  schoolNotice?: SchoolNoticeInfo | null;
  noticeClassLabel?: string;
  achievements: any[];
  changeCharacter: (
    studentId: string,
    type: string
  ) => void;
}

type StudentPopup = "assignments" | "exchange" | "history" | null;

export default function StudentProfile({
  student,
  stageInfo,
  schoolNotice,
  noticeClassLabel = "",
}: Props) {
  const [studentPopup, setStudentPopup] = useState<StudentPopup>(null);

  const current = stageInfo?.current;
  const stageDescription =
    current?.description || "이번 권의 역사 이야기를 탐험하고 있어요.";

  const currentBronze = Number(student?.bronze || 0);
  const currentSilver = Number(student?.silver || 0);
  const totalCoinValue = currentBronze + currentSilver * 10;

  const coinHistory = Array.isArray(student?.coinHistory)
    ? [...student.coinHistory]
    : [];

  const getDateValue = (item: any) => {
    if (item?.createdAt?.seconds) {
      return item.createdAt.seconds * 1000;
    }

    if (item?.date) {
      return new Date(item.date).getTime();
    }

    return 0;
  };

  const sortedClassHistory = coinHistory
    .map((item) => ({
      ...item,
      historyKind: "coin",
    }))
    .sort((a: any, b: any) => getDateValue(b) - getDateValue(a));

  const recentHistory = sortedClassHistory.slice(0, 3);

  const formatDate = (value: any) => {
    if (!value) return "";

    if (value?.seconds) {
      const date = new Date(value.seconds * 1000);
      return date.toISOString().slice(2, 10);
    }

    const text = String(value);
    return text.includes("-") ? text.slice(2, 10) : text;
  };

  const getCurrencyLabel = (currency: string) => {
    if (currency === "bronze") return "동엽전";
    if (currency === "silver") return "은엽전";
    return "코인";
  };

  const getHistoryIcon = (item: any) => {
    if (item?.type === "earn") {
      if (item?.source === "quiz") return "🧠";
      if (item?.source === "review") return "📝";
      if (item?.source === "homework") return "📘";
      if (item?.source === "making") return "🎨";
      if (item?.source === "bonus") return "🎁";
      return "🪙";
    }

    if (item?.type === "exchange") return "🔄";
    if (item?.type === "use") return "🎁";
    if (item?.type === "adjust") return "↩️";
    return "📝";
  };

  const getHistoryTitle = (item: any) => {
    if (item?.type === "earn") {
      const currency = getCurrencyLabel(item?.currency);
      const amount = Number(item?.amount || 0);

      if (item?.source === "quiz") return `문제 풀고 ${currency} ${amount}개 획득`;
      if (item?.source === "review") return `복습문제 풀고 ${currency} ${amount}개 획득`;
      if (item?.source === "homework") return `과제 내고 ${currency} ${amount}개 획득`;
      if (item?.source === "making") return `만들기 완성하고 ${currency} ${amount}개 획득`;
      if (item?.source === "bonus") return `선생님 보너스 · ${currency} ${amount}개 획득`;
      if (item?.text) return String(item.text);
      return `${currency} ${amount}개 획득`;
    }

    if (item?.type === "exchange") {
      if (item?.text) return String(item.text);
      return `${getCurrencyLabel(item?.fromCurrency)} ${item?.fromAmount || 0}개 → ${getCurrencyLabel(item?.toCurrency)} ${item?.toAmount || 0}개`;
    }

    if (item?.type === "use") {
      if (item?.text) return String(item.text);
      return `${getCurrencyLabel(item?.currency)} ${item?.amount || 0}개 사용`;
    }

    if (item?.type === "adjust") {
      if (item?.text) return String(item.text);
      return `${getCurrencyLabel(item?.currency)} ${item?.amount || 0}개 조정`;
    }

    return item?.text ? String(item.text) : "활동 기록";
  };

  const noticeClassTimes = schoolNotice?.classTimes || [];
  const selectedNoticeClassTime = noticeClassTimes.find(
    (classTime) => classTime.label === noticeClassLabel
  );
  const displayedNoticeClassTimes = selectedNoticeClassTime
    ? [selectedNoticeClassTime]
    : noticeClassTimes;

  const popupTitle =
    studentPopup === "assignments"
      ? "📘 나의 과제"
      : studentPopup === "history"
        ? "✨ 나의 활동 기록"
        : "🎁 은엽전 교환신청";

  const popupDescription =
    studentPopup === "assignments"
      ? "현재 공개된 과제를 확인하고 사진을 제출할 수 있어요."
      : studentPopup === "history"
        ? `지금까지의 코인·과제·복습 활동 ${sortedClassHistory.length}개를 모아봤어요.`
        : "은엽전 1개는 1,000원 상품권으로 교환할 수 있어요.";

  const renderHistoryRows = (items: any[]) => (
    <div className="space-y-2">
      {items.map((item: any, index: number) => (
        <div
          key={`${item?.id || item?.date || "history"}-${index}`}
          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-lg">
            {getHistoryIcon(item)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-slate-800">
              {getHistoryTitle(item)}
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-slate-400">
              {formatDate(item?.date || item?.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="rounded-[28px] border border-white/80 bg-white/95 p-3 shadow-sm">
        <div>
          <div className="truncate text-3xl font-black leading-none text-slate-800">
            {student?.name}
          </div>
          <div className="mt-2 truncate text-sm font-bold text-slate-500">
            🏫 {student?.school} · {student?.grade}학년 {student?.class}반
          </div>
        </div>

        {schoolNotice && (
          <div className="mt-3 rounded-[20px] border border-yellow-100 bg-yellow-50/90 p-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-black text-slate-700">
              <span>📌 {schoolNotice.title}</span>
              <span>📍 {schoolNotice.location}</span>
              {schoolNotice.period && <span>📅 {schoolNotice.period}</span>}
            </div>

            {schoolNotice.message && (
              <div className="mt-2 rounded-xl bg-white/80 px-2.5 py-2 text-[11px] font-bold leading-4 text-amber-800">
                📣 {schoolNotice.message}
              </div>
            )}

            {displayedNoticeClassTimes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {displayedNoticeClassTimes.map((classTime) => (
                  <div
                    key={classTime.label}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-sky-700 shadow-sm"
                  >
                    ⏰ {classTime.label} {classTime.semester}
                    {classTime.vacation ? ` · 방학 ${classTime.vacation}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 rounded-[20px] border border-amber-100 bg-amber-50/80 p-3">
          <div className="text-xs font-black text-amber-700">📚 지금 배우는 책</div>
          <div className="mt-2 text-sm font-black text-sky-700">
            {current?.short || "별꼼역사 1권"}
          </div>
          <div className="mt-1 text-2xl font-black leading-tight text-slate-800">
            {current?.title || "역사 탐험 준비"}
          </div>
          <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {stageDescription}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-[18px] border border-yellow-200 bg-yellow-50 px-2 py-2.5 text-center">
            <div className="whitespace-nowrap text-xs font-black text-yellow-700">🥇 동엽전</div>
            <div className="mt-1 text-3xl font-black text-slate-800">{currentBronze}</div>
          </div>
          <div className="min-w-0 rounded-[18px] border border-sky-200 bg-sky-50 px-2 py-2.5 text-center">
            <div className="whitespace-nowrap text-xs font-black text-sky-700">🥈 은엽전</div>
            <div className="mt-1 text-3xl font-black text-slate-800">{currentSilver}</div>
          </div>
          <div className="min-w-0 rounded-[18px] border border-emerald-200 bg-emerald-50 px-2 py-2.5 text-center">
            <div className="whitespace-nowrap text-xs font-black text-emerald-700">📊 누적</div>
            <div className="mt-1 text-3xl font-black text-slate-800">{totalCoinValue}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setStudentPopup("assignments")}
            className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-2 py-3 text-center font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          >
            <span className="block text-xl">📘</span>
            <span className="mt-1 block text-xs">과제 확인</span>
          </button>

          <StudentReviewLaunchers student={student} />

          <button
            type="button"
            onClick={() => setStudentPopup("exchange")}
            className="rounded-[18px] border border-violet-200 bg-violet-50 px-2 py-3 text-center font-black text-violet-700 shadow-sm transition hover:bg-violet-100"
          >
            <span className="block text-xl">🎁</span>
            <span className="mt-1 block text-xs">은엽전 교환</span>
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-base font-black text-slate-800">✨ 최근 활동</div>
            <div className="text-[11px] font-bold text-slate-400">
              총 {sortedClassHistory.length}개
            </div>
          </div>

          {recentHistory.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-500">
              아직 활동 기록이 없어요.
            </div>
          ) : (
            renderHistoryRows(recentHistory)
          )}

          {sortedClassHistory.length > 3 && (
            <button
              type="button"
              onClick={() => setStudentPopup("history")}
              className="mt-2 w-full rounded-2xl border border-sky-100 bg-sky-50 py-2.5 text-xs font-black text-sky-700"
            >
              전체 활동 기록 보기 ({sortedClassHistory.length}개)
            </button>
          )}
        </div>

        {studentPopup && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/55 p-3"
            onClick={() => setStudentPopup(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={popupTitle}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
                <div className="min-w-0">
                  <div className="text-lg font-black text-slate-800">{popupTitle}</div>
                  <div className="mt-0.5 text-[11px] font-bold text-slate-500">
                    {popupDescription}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStudentPopup(null)}
                  aria-label="팝업 닫기"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-600"
                >
                  ×
                </button>
              </div>

              <div className="max-h-[78dvh] overflow-y-auto px-3 pb-4">
                {studentPopup === "assignments" ? (
                  <StudentAssignments student={student} />
                ) : studentPopup === "history" ? (
                  <div className="py-3">{renderHistoryRows(sortedClassHistory)}</div>
                ) : (
                  <CoinExchangeRequest student={student} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

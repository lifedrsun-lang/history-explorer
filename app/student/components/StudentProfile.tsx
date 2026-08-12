"use client";

import { useState } from "react";
import type { SchoolNoticeInfo } from "../data/schoolInfo";
import CoinExchangeRequest from "./CoinExchangeRequest";
import StudentAssignments from "./StudentAssignments";

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

type StudentPopup = "assignments" | "exchange" | null;

export default function StudentProfile({
  student,
  currentStage,
  stageInfo,
  schoolNotice,
  noticeClassLabel = "",
}: Props) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [studentPopup, setStudentPopup] = useState<StudentPopup>(null);

  const TOTAL_PROGRESS = 23;
  const displayedProgressStage = Math.min(
    TOTAL_PROGRESS,
    Math.max(1, Number(currentStage || 1))
  );

  const progressPercent = Math.min(
    100,
    Math.max(0, (displayedProgressStage / TOTAL_PROGRESS) * 100)
  );

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

  const displayedClassHistory = showAllHistory
    ? sortedClassHistory
    : sortedClassHistory.slice(0, 5);

  const hasMoreHistory = sortedClassHistory.length > 5;

  const formatDate = (value: any) => {
    if (!value) {
      return "";
    }

    if (value?.seconds) {
      const date = new Date(value.seconds * 1000);
      return date.toISOString().slice(2, 10);
    }

    const text = String(value);

    if (text.includes("-")) {
      return text.slice(2, 10);
    }

    return text;
  };

  const getCurrencyLabel = (currency: string) => {
    if (currency === "bronze") {
      return "동엽전";
    }

    if (currency === "silver") {
      return "은엽전";
    }

    return "코인";
  };

  const getSourceLabel = (source: string) => {
    if (source === "quiz") {
      return "퀴즈";
    }

    if (source === "homework") {
      return "과제";
    }

    if (source === "making") {
      return "만들기 완성";
    }

    if (source === "bonus") {
      return "선생님 보너스";
    }

    return "";
  };

  const getHistoryIcon = (item: any) => {
    if (item?.type === "earn") {
      if (item?.source === "quiz") {
        return "🧠";
      }

      if (item?.source === "homework") {
        return "📘";
      }

      if (item?.source === "making") {
        return "🎨";
      }

      if (item?.source === "bonus") {
        return "🎁";
      }

      return "🪙";
    }

    if (item?.type === "exchange") {
      return "🔄";
    }

    if (item?.type === "use") {
      return "🎁";
    }

    if (item?.type === "adjust") {
      return "↩️";
    }

    return "📝";
  };

  const getHistoryTitle = (item: any) => {
    if (item?.text) {
      if (item?.type === "earn" && item?.source === "bonus") {
        const text = String(item.text);
        return text.startsWith("🎁") ? text : `🎁 ${text}`;
      }

      return item.text;
    }

    if (item?.type === "earn") {
      const currency = getCurrencyLabel(item?.currency);
      const amount = Number(item?.amount || 0);
      const source = getSourceLabel(item?.source);
      const title = `${currency} ${amount}개 획득${
        source ? ` (${source})` : ""
      }`;

      return item?.source === "bonus" ? `🎁 ${title}` : title;
    }

    if (item?.type === "exchange") {
      const fromCurrency = getCurrencyLabel(item?.fromCurrency);
      const toCurrency = getCurrencyLabel(item?.toCurrency);

      return `${fromCurrency} ${item?.fromAmount || 0}개를 ${toCurrency} ${
        item?.toAmount || 0
      }개로 교환`;
    }

    if (item?.type === "use") {
      const currency = getCurrencyLabel(item?.currency);
      return `${currency} ${item?.amount || 0}개 사용`;
    }

    if (item?.type === "adjust") {
      const currency = getCurrencyLabel(item?.currency);
      return `${currency} ${item?.amount || 0}개 회수`;
    }

    return "수업 기록";
  };

  const getHistorySubText = (item: any) => {
    if (item?.type === "earn") {
      if (item?.source === "quiz") {
        return "수업 퀴즈 참여로 획득했어요.";
      }

      if (item?.source === "homework") {
        return "과제 수행으로 획득했어요.";
      }

      if (item?.source === "making") {
        return "만들기 활동을 완성해서 획득했어요.";
      }

      if (item?.source === "bonus") {
        return "선생님 보너스로 받은 특별 동엽전이에요.";
      }

      return "코인을 획득했어요.";
    }

    if (item?.type === "exchange") {
      return "동엽전이 은엽전으로 자동 교환되었어요.";
    }

    if (item?.type === "use") {
      return "보상 또는 환전으로 사용했어요.";
    }

    if (item?.type === "adjust") {
      return "선생님이 코인 수량을 조정했어요.";
    }

    return "";
  };

  const noticeClassTimes = schoolNotice?.classTimes || [];
  const selectedNoticeClassTime = noticeClassTimes.find(
    (classTime) => classTime.label === noticeClassLabel
  );
  const displayedNoticeClassTimes = selectedNoticeClassTime
    ? [selectedNoticeClassTime]
    : noticeClassTimes;

  return (
    <div className="space-y-4">
      <div className="rounded-[32px] border border-white/80 bg-white/95 p-4 shadow-sm">
        {/* 상단 프로필 */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.95fr)] md:items-start">
          <div className="min-w-0 flex-1">
            <div className="truncate text-4xl font-black leading-none text-slate-800">
              {student?.name}
            </div>

            <div className="mt-3 truncate text-lg text-slate-500">
              🏫 {student?.school}
            </div>

            <div className="mt-1 text-lg font-bold text-slate-700">
              {student?.grade}학년 {student?.class}반
            </div>
          </div>

          {schoolNotice && (
            <div className="rounded-[22px] border border-yellow-100 bg-yellow-50/90 p-3">
              <div className="text-base font-black text-slate-800">
                📌 {schoolNotice.title}
              </div>

              <div className="mt-2 space-y-1.5 text-sm font-bold text-slate-700">
                <div>📍 {schoolNotice.location}</div>

                {schoolNotice.period && <div>📅 {schoolNotice.period}</div>}

                {schoolNotice.message && (
                  <div className="rounded-2xl border border-amber-100 bg-white/90 px-3 py-2 leading-relaxed text-amber-800">
                    📣 {schoolNotice.message}
                  </div>
                )}

                {displayedNoticeClassTimes.length > 0 ? (
                  displayedNoticeClassTimes.map((classTime) => (
                    <div
                      key={classTime.label}
                      className="rounded-2xl bg-white/80 px-3 py-2 leading-relaxed text-sky-800 shadow-sm"
                    >
                      <div>
                        ⏰ {classTime.label} 학기중 {classTime.semester}
                      </div>
                      {classTime.vacation && (
                        <div>🌞 방학중 {classTime.vacation}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white/70 px-3 py-2 text-slate-600">
                    문화센터 수업 일정은 수업별 안내를 확인해 주세요.
                  </div>
                )}

                {schoolNotice.noBreakNotice && (
                  <div>✅ {schoolNotice.noBreakNotice}</div>
                )}

                {schoolNotice.breakNotice && (
                  <div>🚫 {schoolNotice.breakNotice}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 지금 배우는 책 */}
        <div className="mt-5 rounded-[24px] border border-amber-100 bg-amber-50/80 p-4">
          <div className="text-sm font-bold text-amber-700">📚 지금 배우는 책</div>

          <div className="mt-4">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-black text-sky-700">
              {current?.short || "별꼼역사 1권"}
            </div>

            <div className="mt-2 text-[clamp(20px,6vw,36px)] font-black leading-tight text-slate-800">
              {current?.title || "역사 탐험 준비"}
            </div>

            <div className="mt-3 text-sm leading-relaxed text-slate-600">
              {stageDescription}
            </div>
          </div>
        </div>

        {/* 엽전 현황 */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-[22px] border border-yellow-200 bg-yellow-50 p-3 text-center">
            <div className="whitespace-nowrap text-sm font-bold text-yellow-700">
              🥇 동엽전
            </div>
            <div className="mt-2 whitespace-nowrap text-4xl font-black text-slate-800">
              {currentBronze}
            </div>
          </div>

          <div className="min-w-0 rounded-[22px] border border-sky-200 bg-sky-50 p-3 text-center">
            <div className="whitespace-nowrap text-sm font-bold text-sky-700">
              🥈 은엽전
            </div>
            <div className="mt-2 whitespace-nowrap text-4xl font-black text-slate-800">
              {currentSilver}
            </div>
          </div>

          <div className="min-w-0 rounded-[22px] border border-emerald-200 bg-emerald-50 p-3 text-center">
            <div className="whitespace-nowrap text-sm font-bold text-emerald-700">
              📊 누적
            </div>
            <div className="mt-2 whitespace-nowrap text-4xl font-black text-slate-800">
              {totalCoinValue}
            </div>
          </div>
        </div>

        {/* 학생 빠른 메뉴 */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setStudentPopup("assignments")}
            className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-3 py-4 text-center font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          >
            <span className="block text-2xl">📘</span>
            <span className="mt-1 block text-sm">과제 확인</span>
          </button>

          <button
            type="button"
            onClick={() => setStudentPopup("exchange")}
            className="rounded-[22px] border border-violet-200 bg-violet-50 px-3 py-4 text-center font-black text-violet-700 shadow-sm transition hover:bg-violet-100"
          >
            <span className="block text-2xl">🎁</span>
            <span className="mt-1 block text-sm">은엽전 교환</span>
          </button>
        </div>

        {studentPopup && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/55 p-3"
            onClick={() => setStudentPopup(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={
                studentPopup === "assignments"
                  ? "나의 과제"
                  : "은엽전 교환신청"
              }
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-[30px] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
                <div>
                  <div className="text-xl font-black text-slate-800">
                    {studentPopup === "assignments"
                      ? "📘 나의 과제"
                      : "🎁 은엽전 교환신청"}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    {studentPopup === "assignments"
                      ? "현재 공개된 과제를 확인하고 사진을 제출할 수 있어요."
                      : "은엽전 1개는 1,000원 상품권으로 교환할 수 있어요."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStudentPopup(null)}
                  aria-label="팝업 닫기"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-600"
                >
                  ×
                </button>
              </div>

              <div className="max-h-[78dvh] overflow-y-auto px-3 pb-4">
                {studentPopup === "assignments" ? (
                  <StudentAssignments student={student} />
                ) : (
                  <CoinExchangeRequest student={student} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* 진행률 */}
        <div className="mt-4 rounded-[24px] border border-sky-100 bg-sky-50/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-2xl font-black text-slate-800">🗺 진행률</div>
            <div className="text-2xl font-black text-sky-700">
              {displayedProgressStage} / {TOTAL_PROGRESS}
            </div>
          </div>

          <div className="h-4 w-full overflow-hidden rounded-full border border-sky-100 bg-white">
            <div
              className="h-full bg-gradient-to-r from-sky-300 to-emerald-300 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 수업 기록 - 학생 화면에는 코인/보상 기록만 공개 */}
        <div className="mt-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-2xl font-black text-slate-800">📒 수업 기록</div>
            <div className="text-sm text-slate-500">
              총 {sortedClassHistory.length}개
            </div>
          </div>

          {sortedClassHistory.length === 0 ? (
            <div className="rounded-[24px] border border-amber-100 bg-amber-50/80 p-5 text-center">
              <div className="mb-3 text-4xl">📭</div>
              <div className="text-lg font-bold text-slate-700">
                아직 수업 기록이 없습니다.
              </div>
              <div className="mt-2 text-sm text-slate-500">
                퀴즈, 과제, 만들기와 코인 보상 기록이 여기에 모여요.
              </div>
            </div>
          ) : (
            <>
              <div
                className={
                  showAllHistory
                    ? "max-h-[420px] space-y-3 overflow-y-auto pr-1"
                    : "space-y-3"
                }
              >
                {displayedClassHistory.map((item: any, index: number) => (
                  <div
                    key={`${item?.id || item?.date || "history"}-${index}`}
                    className="rounded-[24px] border border-amber-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-2xl">
                        {getHistoryIcon(item)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-sm text-slate-500">
                          {formatDate(item?.date || item?.createdAt)}
                        </div>
                        <div className="text-lg font-black leading-snug text-slate-800">
                          {getHistoryTitle(item)}
                        </div>
                        {getHistorySubText(item) && (
                          <div className="mt-1 text-sm text-slate-500">
                            {getHistorySubText(item)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMoreHistory && (
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="mt-3 w-full rounded-[20px] border border-sky-200 bg-sky-50 py-3 text-sm font-bold text-sky-700"
                >
                  {showAllHistory
                    ? "최근 기록 5개만 보기"
                    : `전체 수업 기록 보기 (${sortedClassHistory.length}개)`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

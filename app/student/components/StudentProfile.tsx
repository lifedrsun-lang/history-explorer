"use client";

import { useState } from "react";
import type { SchoolNoticeInfo } from "../data/schoolInfo";

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

export default function StudentProfile({
  student,
  currentStage,
  stageInfo,
  schoolNotice,
  noticeClassLabel = "",
}: Props) {
  const [showAllHistory, setShowAllHistory] =
    useState(false);

  const TOTAL_PROGRESS = 23;
  const displayedProgressStage = Math.min(
    TOTAL_PROGRESS,
    Math.max(1, Number(currentStage || 1))
  );

  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      (displayedProgressStage / TOTAL_PROGRESS) *
        100
    )
  );

  const current = stageInfo?.current;
  const stageDescription =
    current?.description ||
    "이번 권의 역사 이야기를 탐험하고 있어요.";

  const currentBronze = Number(
    student?.bronze || 0
  );

  const currentSilver = Number(
    student?.silver || 0
  );

  const totalCoinValue =
    currentBronze + currentSilver * 10;

  const coinHistory = Array.isArray(
    student?.coinHistory
  )
    ? [...student.coinHistory]
    : [];
  const attendanceHistory = Array.isArray(
    student?.attendanceHistory
  )
    ? [...student.attendanceHistory]
    : [];
  const materialHistory = Array.isArray(
    student?.materialHistory
  )
    ? [...student.materialHistory]
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

  const classHistory = [
    ...coinHistory.map((item) => ({
      ...item,
      historyKind: "coin",
    })),
    ...attendanceHistory.map((item) => ({
      ...item,
      historyKind: "attendance",
    })),
    ...materialHistory.map((item) => ({
      ...item,
      historyKind: "material",
    })),
  ];

  const sortedClassHistory = classHistory.sort(
    (a: any, b: any) =>
      getDateValue(b) - getDateValue(a)
  );

  const displayedClassHistory =
    showAllHistory
      ? sortedClassHistory
      : sortedClassHistory.slice(0, 5);

  const hasMoreHistory =
    sortedClassHistory.length > 5;

  const formatDate = (value: any) => {
    if (!value) {
      return "";
    }

    if (value?.seconds) {
      const date = new Date(
        value.seconds * 1000
      );

      return date
        .toISOString()
        .slice(2, 10);
    }

    const text = String(value);

    if (text.includes("-")) {
      return text.slice(2, 10);
    }

    return text;
  };

  const getCurrencyLabel = (
    currency: string
  ) => {
    if (currency === "bronze") {
      return "동엽전";
    }

    if (currency === "silver") {
      return "은엽전";
    }

    return "코인";
  };

  const getSourceLabel = (
    source: string
  ) => {
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
    if (
      item?.historyKind === "attendance" ||
      item?.type === "attendance"
    ) {
      if (item?.status === "출석") {
        return "✅";
      }

      if (item?.status === "결석(병가)") {
        return "🚫";
      }

      if (item?.status === "결석(체험학습)") {
        return "🏕";
      }

      if (item?.status === "지각") {
        return "⏰";
      }

      return "✅";
    }

    if (
      item?.historyKind === "material" ||
      item?.type === "material"
    ) {
      return "📦";
    }

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
    if (
      item?.historyKind === "attendance" ||
      item?.type === "attendance"
    ) {
      return item?.status || item?.text || "출결 기록";
    }

    if (
      item?.historyKind === "material" ||
      item?.type === "material"
    ) {
      return (
        item?.text ||
        `${item?.materialName || "교재"} 지급`
      );
    }

    if (item?.text) {
      if (
        item?.type === "earn" &&
        item?.source === "bonus"
      ) {
        const text = String(item.text);

        return text.startsWith("🎁")
          ? text
          : `🎁 ${text}`;
      }

      return item.text;
    }

    if (item?.type === "earn") {
      const currency = getCurrencyLabel(
        item?.currency
      );

      const amount = Number(
        item?.amount || 0
      );

      const source = getSourceLabel(
        item?.source
      );

      const title = `${currency} ${amount}개 획득${
        source ? ` (${source})` : ""
      }`;

      if (item?.source === "bonus") {
        return `🎁 ${title}`;
      }

      return title;
    }

    if (item?.type === "exchange") {
      const fromCurrency =
        getCurrencyLabel(
          item?.fromCurrency
        );

      const toCurrency =
        getCurrencyLabel(
          item?.toCurrency
        );

      return `${fromCurrency} ${
        item?.fromAmount || 0
      }개를 ${toCurrency} ${
        item?.toAmount || 0
      }개로 교환`;
    }

    if (item?.type === "use") {
      const currency = getCurrencyLabel(
        item?.currency
      );

      return `${currency} ${
        item?.amount || 0
      }개 사용`;
    }

    if (item?.type === "adjust") {
      const currency = getCurrencyLabel(
        item?.currency
      );

      return `${currency} ${
        item?.amount || 0
      }개 회수`;
    }

    return "수업 기록";
  };

  const getHistorySubText = (item: any) => {
    if (
      item?.historyKind === "attendance" ||
      item?.type === "attendance"
    ) {
      return "수업 출결 기록입니다.";
    }

    if (
      item?.historyKind === "material" ||
      item?.type === "material"
    ) {
      return (
        item?.stageTitle ||
        "교재 지급 기록입니다."
      );
    }

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

  const getHistoryStyle = (item: any) => {
    const isAttendance =
      item?.historyKind === "attendance" ||
      item?.type === "attendance";
    const isMaterial =
      item?.historyKind === "material" ||
      item?.type === "material";

    if (isAttendance) {
      if (item?.status === "출석") {
        return {
          card: "border-emerald-100 bg-emerald-50/80",
          icon: "border-emerald-200 bg-emerald-100",
        };
      }

      if (item?.status === "결석(병가)") {
        return {
          card: "border-rose-100 bg-rose-50/80",
          icon: "border-rose-200 bg-rose-100",
        };
      }

      if (item?.status === "결석(체험학습)") {
        return {
          card: "border-sky-100 bg-sky-50/80",
          icon: "border-sky-200 bg-sky-100",
        };
      }

      return {
        card: "border-orange-100 bg-orange-50/80",
        icon: "border-orange-200 bg-orange-100",
      };
    }

    if (isMaterial) {
      return {
        card: "border-indigo-100 bg-indigo-50/80",
        icon: "border-indigo-200 bg-indigo-100",
      };
    }

    return {
      card: "border-amber-100 bg-white",
      icon: "border-amber-100 bg-amber-50",
    };
  };

  const noticeClassTimes =
    schoolNotice?.classTimes || [];
  const selectedNoticeClassTime =
    noticeClassTimes.find(
      (classTime) =>
        classTime.label === noticeClassLabel
    );
  const displayedNoticeClassTimes =
    selectedNoticeClassTime
      ? [selectedNoticeClassTime]
      : noticeClassTimes;

  return (
    <div className="space-y-4">
      <div className="rounded-[32px] border border-white/80 bg-white/95 p-4 shadow-sm">
        {/* 상단 프로필 */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.95fr)] md:items-start">
          <div className="flex-1 min-w-0">
            <div className="text-4xl font-black leading-none truncate text-slate-800">
              {student?.name}
            </div>

            <div className="mt-3 text-lg text-slate-500 truncate">
              🏫 {student?.school}
            </div>

            <div className="text-lg text-slate-700 mt-1 font-bold">
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

                {schoolNotice.period && (
                  <div>📅 {schoolNotice.period}</div>
                )}

                {displayedNoticeClassTimes.length > 0 ? (
                  displayedNoticeClassTimes.map((classTime) => (
                    <div
                      key={classTime.label}
                      className="rounded-2xl bg-white/80 px-3 py-2 leading-relaxed text-sky-800 shadow-sm"
                    >
                      <div>
                        ⏰ {classTime.label} 학기중{" "}
                        {classTime.semester}
                      </div>
                      <div>
                        🌞 방학중 {classTime.vacation}
                      </div>
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
          <div className="text-sm text-amber-700 font-bold">
            📚 지금 배우는 책
          </div>

          <div className="mt-4">
            <div className="text-base font-black text-sky-700 whitespace-nowrap overflow-hidden text-ellipsis">
              {current?.short || "별꼼역사 1권"}
            </div>

            <div className="mt-2 text-[clamp(20px,6vw,36px)] leading-tight font-black text-slate-800">
              {current?.title || "역사 탐험 준비"}
            </div>

            <div className="mt-3 text-sm leading-relaxed text-slate-600">
              {stageDescription}
            </div>
          </div>
        </div>

        {/* 엽전 현황 */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="min-w-0 rounded-[22px] border border-yellow-200 bg-yellow-50 p-3 text-center">
            <div className="text-sm text-yellow-700 font-bold whitespace-nowrap">
              🥇 동엽전
            </div>

            <div className="text-4xl font-black mt-2 whitespace-nowrap text-slate-800">
              {currentBronze}
            </div>
          </div>

          <div className="min-w-0 rounded-[22px] border border-sky-200 bg-sky-50 p-3 text-center">
            <div className="text-sm text-sky-700 font-bold whitespace-nowrap">
              🥈 은엽전
            </div>

            <div className="text-4xl font-black mt-2 whitespace-nowrap text-slate-800">
              {currentSilver}
            </div>
          </div>

          <div className="min-w-0 rounded-[22px] border border-emerald-200 bg-emerald-50 p-3 text-center">
            <div className="text-sm text-emerald-700 font-bold whitespace-nowrap">
              📊 누적
            </div>

            <div className="text-4xl font-black mt-2 text-slate-800 whitespace-nowrap">
              {totalCoinValue}
            </div>
          </div>
        </div>

        {/* 진행률 */}
        <div className="mt-4 rounded-[24px] border border-sky-100 bg-sky-50/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-2xl font-black text-slate-800">
              🗺 진행률
            </div>

            <div className="text-2xl font-black text-sky-700">
              {displayedProgressStage} / {TOTAL_PROGRESS}
            </div>
          </div>

          <div className="w-full h-4 rounded-full bg-white overflow-hidden border border-sky-100">
            <div
              className="h-full bg-gradient-to-r from-sky-300 to-emerald-300 transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>

        {/* 수업 기록 */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl font-black text-slate-800">
              📒 수업 기록
            </div>

            <div className="text-sm text-slate-500">
              총 {sortedClassHistory.length}개
            </div>
          </div>

          {sortedClassHistory.length === 0 ? (
            <div className="rounded-[24px] border border-amber-100 bg-amber-50/80 p-5 text-center">
              <div className="text-4xl mb-3">
                📭
              </div>

              <div className="text-lg font-bold text-slate-700">
                아직 수업 기록이 없습니다.
              </div>

              <div className="text-sm text-slate-500 mt-2">
                코인, 출결, 교재 지급 기록이 여기에 모여요.
              </div>
            </div>
          ) : (
            <>
              <div
                className={
                  showAllHistory
                    ? "space-y-3 max-h-[420px] overflow-y-auto pr-1"
                    : "space-y-3"
                }
              >
                {displayedClassHistory.map(
                  (item: any, index: number) => {
                    const historyStyle = getHistoryStyle(item);

                    return (
                    <div
                      key={`${item?.id || item?.date || "history"}-${index}`}
                      className={`rounded-[24px] border p-4 shadow-sm ${historyStyle.card}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl shrink-0 ${historyStyle.icon}`}>
                          {getHistoryIcon(item)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-500 mb-1">
                            {formatDate(
                              item?.date ||
                                item?.createdAt
                            )}
                          </div>

                          <div className="text-lg font-black text-slate-800 leading-snug">
                            {getHistoryTitle(item)}
                          </div>

                          {getHistorySubText(item) && (
                            <div className="text-sm text-slate-500 mt-1">
                              {getHistorySubText(item)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  }
                )}
              </div>

              {hasMoreHistory && (
                <button
                  onClick={() =>
                    setShowAllHistory(
                      !showAllHistory
                    )
                  }
                  className="w-full mt-3 rounded-[20px] border border-sky-200 bg-sky-50 py-3 text-sm font-bold text-sky-700"
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

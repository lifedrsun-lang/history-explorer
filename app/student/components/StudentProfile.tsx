"use client";

import { useState } from "react";

interface Props {
  student: any;
  currentStage: number;
  stageInfo: any;
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
  changeCharacter,
}: Props) {
  const [showAllHistory, setShowAllHistory] =
    useState(false);

  const TOTAL_PROGRESS = 92;

  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      (currentStage / TOTAL_PROGRESS) * 100
    )
  );

  const current = stageInfo?.current;

  const currentBronze = Number(
    student?.bronze || 0
  );

  const currentSilver = Number(
    student?.silver || 0
  );

  const currentCoinValue =
    currentBronze + currentSilver * 10;

  const savedTotalBronze = Number(
    student?.totalBronze || 0
  );

  const totalCoinValue =
    savedTotalBronze > 0
      ? savedTotalBronze
      : currentCoinValue;

  const coinHistory = Array.isArray(
    student?.coinHistory
  )
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

  const sortedCoinHistory = coinHistory.sort(
    (a: any, b: any) =>
      getDateValue(b) - getDateValue(a)
  );

  const displayedCoinHistory =
    showAllHistory
      ? sortedCoinHistory
      : sortedCoinHistory.slice(0, 3);

  const hasMoreHistory =
    sortedCoinHistory.length > 3;

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

    return "코인 기록";
  };

  const getHistorySubText = (item: any) => {
    if (item?.type === "earn") {
      if (item?.source === "quiz") {
        return "수업 퀴즈 참여로 획득했어요.";
      }

      if (item?.source === "homework") {
        return "과제 수행으로 획득했어요.";
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

  return (
    <div className="space-y-4">
      <div className="rounded-[32px] border border-[#333] bg-black p-4">
        {/* 상단 프로필 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-4xl font-black leading-none truncate">
              {student?.name}
            </div>

            <div className="mt-3 text-lg text-gray-300 truncate">
              🏫 {student?.school}
            </div>

            <div className="text-lg text-white mt-1">
              {student?.grade}학년 {student?.class}반
            </div>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="w-[110px] h-[110px] rounded-full border-[4px] border-[#444] overflow-hidden bg-[#111]">
              <img
                src={
                  student?.character === "girl"
                    ? "/characters/girl.png"
                    : "/characters/boy.png"
                }
                alt="character"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() =>
                  changeCharacter(
                    student.id,
                    "boy"
                  )
                }
                className="bg-[#3478f6] rounded-2xl px-4 py-2 text-xl"
              >
                👦
              </button>

              <button
                onClick={() =>
                  changeCharacter(
                    student.id,
                    "girl"
                  )
                }
                className="bg-pink-500 rounded-2xl px-4 py-2 text-xl"
              >
                👧
              </button>
            </div>
          </div>
        </div>

        {/* 현재 시대 */}
        <div className="mt-5 rounded-[24px] border border-[#333] bg-[#080808] p-4">
          <div className="text-sm text-gray-400">
            🏛 현재 시대
          </div>

          <div className="mt-4">
            <div className="text-[clamp(20px,6vw,40px)] leading-tight font-black whitespace-nowrap overflow-hidden text-ellipsis">
              {current?.title} {current?.era}
            </div>
          </div>
        </div>

        {/* 엽전 현황 */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-[24px] border border-[#333] bg-[#080808] p-4">
            <div className="text-sm text-gray-300">
              🥇 현재 동엽전
            </div>

            <div className="text-5xl font-black mt-2">
              {currentBronze}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#333] bg-[#080808] p-4">
            <div className="text-sm text-gray-300">
              🥈 현재 은엽전
            </div>

            <div className="text-5xl font-black mt-2">
              {currentSilver}
            </div>
          </div>

          <div className="col-span-2 rounded-[24px] border border-[#333] bg-[#050505] p-5">
            <div className="text-sm text-gray-300">
              📊 누적 엽전
            </div>

            <div className="text-6xl font-black mt-3 text-yellow-200">
              {totalCoinValue}
              <span className="text-2xl ml-1 text-gray-300">
                개
              </span>
            </div>

            <div className="text-sm text-gray-500 mt-3">
              은엽전 1개는 동엽전 10개로 계산돼요.
            </div>
          </div>
        </div>

        {/* 진행률 */}
        <div className="mt-4 rounded-[24px] border border-[#333] bg-[#080808] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-2xl font-black">
              🗺 진행률
            </div>

            <div className="text-2xl font-black">
              {currentStage} / {TOTAL_PROGRESS}
            </div>
          </div>

          <div className="w-full h-4 rounded-full bg-[#111] overflow-hidden">
            <div
              className="h-full bg-gray-300 transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>

        {/* 코인 기록 */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl font-black">
              🪙 코인 기록
            </div>

            <div className="text-sm text-gray-500">
              총 {sortedCoinHistory.length}개
            </div>
          </div>

          {sortedCoinHistory.length === 0 ? (
            <div className="rounded-[24px] border border-[#333] bg-[#050505] p-5 text-center">
              <div className="text-4xl mb-3">
                📭
              </div>

              <div className="text-lg font-bold text-gray-300">
                아직 코인 기록이 없습니다.
              </div>

              <div className="text-sm text-gray-500 mt-2">
                퀴즈, 과제, 보너스로 코인을 받으면 여기에 기록돼요.
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
                {displayedCoinHistory.map(
                  (item: any, index: number) => (
                    <div
                      key={`${item?.id || item?.date || "history"}-${index}`}
                      className="rounded-[24px] border border-[#333] bg-[#050505] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#333] flex items-center justify-center text-2xl shrink-0">
                          {getHistoryIcon(item)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-500 mb-1">
                            {formatDate(
                              item?.date ||
                                item?.createdAt
                            )}
                          </div>

                          <div className="text-lg font-black text-white leading-snug">
                            {getHistoryTitle(item)}
                          </div>

                          {getHistorySubText(item) && (
                            <div className="text-sm text-gray-500 mt-1">
                              {getHistorySubText(item)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>

              {hasMoreHistory && (
                <button
                  onClick={() =>
                    setShowAllHistory(
                      !showAllHistory
                    )
                  }
                  className="w-full mt-3 rounded-[20px] border border-[#333] bg-[#111] py-3 text-sm font-bold text-gray-200"
                >
                  {showAllHistory
                    ? "최근 기록 3개만 보기"
                    : `전체 코인 기록 보기 (${sortedCoinHistory.length}개)`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
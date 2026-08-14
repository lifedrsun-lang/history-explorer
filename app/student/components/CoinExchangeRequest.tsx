"use client";

import { useCallback, useEffect, useState } from "react";

import {
  StudentCollection,
  isAllowedStudentCollection,
} from "@/lib/assignments";
import {
  CoinExchangeRequestSummary,
  CoinExchangeVendor,
  SILVER_COIN_WON_VALUE,
  formatCoinExchangeWon,
} from "@/lib/coinExchange";
import type { CoinExchangeWindowStatus } from "@/lib/coinExchangeWindow";

type Props = {
  student: StudentLike;
};

type StudentLike = {
  id?: unknown;
  collectionName?: unknown;
  password?: unknown;
  silver?: unknown;
};

type RewardKind = "daiso" | "convenience";

const getStudentCollection = (student: StudentLike): StudentCollection => {
  const collectionName = String(student?.collectionName || "students");

  return isAllowedStudentCollection(collectionName) ? collectionName : "students";
};

export default function CoinExchangeRequest({ student }: Props) {
  const [request, setRequest] = useState<CoinExchangeRequestSummary | null>(null);
  const [exchangeWindow, setExchangeWindow] = useState<CoinExchangeWindowStatus | null>(null);
  const [amountSilver, setAmountSilver] = useState("1");
  const [rewardKind, setRewardKind] = useState<RewardKind>("daiso");
  const [convenienceVendor, setConvenienceVendor] =
    useState<Extract<CoinExchangeVendor, "cu" | "gs25">>("cu");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const studentId = String(student?.id || "");
  const studentCollection = getStudentCollection(student);
  const studentPassword = String(student?.password || "");
  const currentSilver = Math.max(0, Number(student?.silver || 0));

  const getStudentAuthBody = useCallback(() => {
    return {
      studentId,
      studentCollection,
      studentPassword,
    };
  }, [studentCollection, studentId, studentPassword]);

  const loadStatus = useCallback(async () => {
    if (!studentId || !studentPassword) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/student/coin-exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "status",
          ...getStudentAuthBody(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "교환 신청 상태를 불러오지 못했습니다."
        );
      }

      setRequest(data?.request || null);
      setExchangeWindow(data?.exchangeWindow || null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "교환 신청 상태를 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, [getStudentAuthBody, studentId, studentPassword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadStatus]);

  const submitExchangeRequest = async () => {
    if (isSubmitting || request || !exchangeWindow?.isOpen) {
      return;
    }

    const amount = Number(amountSilver);

    if (!Number.isInteger(amount) || amount <= 0) {
      setErrorMessage("교환할 은엽전 개수를 입력해 주세요.");
      return;
    }

    if (amount > currentSilver) {
      setErrorMessage("보유한 은엽전보다 많이 신청할 수 없습니다.");
      return;
    }

    const vendor: CoinExchangeVendor =
      rewardKind === "daiso" ? "daiso" : convenienceVendor;

    setIsSubmitting(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/student/coin-exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          ...getStudentAuthBody(),
          amountSilver: amount,
          vendor,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "교환 신청에 실패했습니다.");
      }

      setRequest(data?.request || null);
      setExchangeWindow(data?.exchangeWindow || exchangeWindow);
      setMessage("교환 신청을 보냈습니다. 선생님 확인을 기다려 주세요.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "교환 신청에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountNumber = Math.max(0, Number(amountSilver || 0));
  const amountWon = amountNumber * SILVER_COIN_WON_VALUE;

  return (
    <div className="mt-4 rounded-[24px] border border-violet-100 bg-violet-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-black text-slate-800">
            🎁 은엽전 교환신청
          </div>
          <div className="mt-1 text-sm font-bold text-violet-700">
            은엽전 1개 = 1,000원
          </div>
        </div>

        <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
          보유 {currentSilver}개
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-500">
          교환 신청 상태를 확인하는 중...
        </div>
      )}

      {!isLoading && exchangeWindow && !exchangeWindow.isOpen && !request && (
        <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="text-3xl">🔒</div>
          <div className="mt-2 font-black text-slate-700">지금은 교환 신청 기간이 아니에요.</div>
          <div className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
            {exchangeWindow.message}
          </div>
        </div>
      )}

      {!isLoading && request && (
        <div className="mt-4 rounded-[22px] border border-violet-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="font-black text-slate-800">신청 대기중</div>
            <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
              선생님 확인 전
            </div>
          </div>

          <div className="mt-3 space-y-1 text-sm font-bold text-slate-600">
            <div>🎫 {request.vendorLabel}</div>
            <div>
              🥈 은엽전 {request.amountSilver}개 → {formatCoinExchangeWon(request.amountWon)}
            </div>
          </div>

          <div className="mt-3 text-xs font-bold leading-relaxed text-slate-500">
            신청 단계에서는 은엽전이 차감되지 않습니다. 선생님이 교환 완료 처리하면 차감됩니다.
          </div>
        </div>
      )}

      {!isLoading && !request && exchangeWindow?.isOpen && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            ✅ {exchangeWindow.message}
          </div>

          {currentSilver <= 0 ? (
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-500">
              은엽전을 모으면 상품권 교환을 신청할 수 있어요.
            </div>
          ) : (
            <>
              <label className="block text-sm font-black text-slate-700">
                교환할 은엽전
                <input
                  type="number"
                  min="1"
                  max={currentSilver}
                  value={amountSilver}
                  onChange={(event) => setAmountSilver(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 text-base font-black outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <div className="rounded-2xl bg-white p-4">
                <div className="text-sm font-black text-slate-700">
                  은엽전을 무엇으로 교환하겠습니까?
                </div>

                <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 px-3 py-3">
                  <input
                    type="radio"
                    name="coin-exchange-kind"
                    checked={rewardKind === "daiso"}
                    onChange={() => setRewardKind("daiso")}
                    className="h-4 w-4"
                  />
                  <span className="font-bold text-slate-700">다이소 상품권</span>
                </label>

                <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 px-3 py-3">
                  <input
                    type="radio"
                    name="coin-exchange-kind"
                    checked={rewardKind === "convenience"}
                    onChange={() => setRewardKind("convenience")}
                    className="h-4 w-4"
                  />
                  <span className="font-bold text-slate-700">편의점 상품권</span>
                </label>

                {rewardKind === "convenience" && (
                  <div className="ml-7 mt-2 grid grid-cols-2 gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                      <input
                        type="radio"
                        name="coin-exchange-store"
                        checked={convenienceVendor === "cu"}
                        onChange={() => setConvenienceVendor("cu")}
                      />
                      CU
                    </label>

                    <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                      <input
                        type="radio"
                        name="coin-exchange-store"
                        checked={convenienceVendor === "gs25"}
                        onChange={() => setConvenienceVendor("gs25")}
                      />
                      GS25
                    </label>
                  </div>
                )}

                <div className="mt-2 rounded-2xl border border-dashed border-slate-200 px-3 py-3 text-sm font-bold text-slate-400">
                  추가 상품 · 협의중
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-center">
                <div className="text-xs font-bold text-slate-500">신청 금액</div>
                <div className="mt-1 text-2xl font-black text-violet-700">
                  은엽전 {amountNumber}개 · {formatCoinExchangeWon(amountWon)}
                </div>
              </div>

              <button
                type="button"
                onClick={submitExchangeRequest}
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "신청하는 중..." : "교환 신청하기"}
              </button>
            </>
          )}
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

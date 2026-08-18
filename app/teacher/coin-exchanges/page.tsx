"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import {
  CoinExchangeRequestSummary,
  formatCoinExchangeWon,
} from "@/lib/coinExchange";

type Filter = "pending" | "all";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (request: CoinExchangeRequestSummary) => {
  if (request.status === "completed") {
    return "교환 완료";
  }

  if (request.status === "cancelled") {
    return "신청 취소";
  }

  return "신청 대기";
};

const getStatusClassName = (request: CoinExchangeRequestSummary) => {
  if (request.status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (request.status === "cancelled") {
    return "bg-slate-100 text-slate-500";
  }

  return "bg-amber-100 text-amber-700";
};

export default function TeacherCoinExchangesPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<CoinExchangeRequestSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const getToken = useCallback(async () => {
    if (!user) {
      throw new Error("not_signed_in");
    }

    return user.getIdToken();
  }, [user]);

  const requestJson = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await getToken();
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "요청 처리에 실패했습니다.");
      }

      return data;
    },
    [getToken]
  );

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await requestJson("/api/teacher/coin-exchanges");
      setRequests(data?.requests || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "교환 신청을 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, [requestJson]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setAuthChecking(false);
        router.replace("/teacher");
        return;
      }

      setUser(currentUser);
      setAuthChecking(false);
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const timer = setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadRequests, user]);

  const visibleRequests = useMemo(() => {
    if (filter === "pending") {
      return requests.filter((item) => item.status === "pending");
    }

    return requests;
  }, [filter, requests]);

  const pendingCount = requests.filter(
    (item) => item.status === "pending"
  ).length;

  const processRequest = async (
    exchangeRequest: CoinExchangeRequestSummary,
    action: "complete" | "cancel"
  ) => {
    if (processingId || exchangeRequest.status !== "pending") {
      return;
    }

    if (action === "complete") {
      const phoneLine = exchangeRequest.recipientPhone
        ? `\n쿠폰 수신번호: ${exchangeRequest.recipientPhone}`
        : "";
      const confirmed = window.confirm(
        `${exchangeRequest.studentSnapshot.name} 학생의 은엽전 ${exchangeRequest.amountSilver}개를 ${exchangeRequest.vendorLabel} ${formatCoinExchangeWon(exchangeRequest.amountWon)}으로 교환 완료 처리할까요?${phoneLine}\n\n완료하면 은엽전이 차감되고 학생 기록에 남습니다.`
      );

      if (!confirmed) {
        return;
      }
    }

    if (action === "cancel") {
      const confirmed = window.confirm(
        `${exchangeRequest.studentSnapshot.name} 학생의 교환 신청을 취소할까요?\n은엽전은 차감되지 않습니다.`
      );

      if (!confirmed) {
        return;
      }
    }

    setProcessingId(exchangeRequest.id);
    setNotice("");
    setErrorMessage("");

    try {
      await requestJson("/api/teacher/coin-exchanges", {
        method: "POST",
        body: JSON.stringify({
          action,
          requestId: exchangeRequest.id,
        }),
      });

      setNotice(
        action === "complete"
          ? "교환 완료 처리했습니다. 은엽전이 차감되고 학생 기록에 반영되었습니다."
          : "교환 신청을 취소했습니다."
      );
      await loadRequests();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "교환 신청 처리에 실패했습니다."
      );
    } finally {
      setProcessingId("");
    }
  };

  if (authChecking) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
        <div className="mx-auto flex min-h-[calc(100dvh-24px)] max-w-5xl items-center justify-center">
          <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
            Checking teacher sign-in...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">
              🎁 은엽전 교환신청 관리
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              은엽전 1개 = 1,000원 · 교환 완료 시 학생 은엽전이 차감됩니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/teacher/assignments"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"
            >
              과제 관리
            </Link>
            <Link
              href="/teacher"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700"
            >
              교사 관리화면으로
            </Link>
          </div>
        </div>

        {notice && (
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
            {notice}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
            {errorMessage}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-center">
            <div className="text-sm font-bold text-amber-700">처리 대기</div>
            <div className="mt-1 text-3xl font-black text-slate-800">
              {pendingCount}건
            </div>
          </div>
          <div className="rounded-3xl border border-violet-100 bg-violet-50 p-4 text-center">
            <div className="text-sm font-bold text-violet-700">전체 신청</div>
            <div className="mt-1 text-3xl font-black text-slate-800">
              {requests.length}건
            </div>
          </div>
        </div>

        <div className="mb-4 flex gap-2 rounded-3xl bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black ${
              filter === "pending"
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            처리 대기 ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black ${
              filter === "all"
                ? "bg-violet-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            전체 내역
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-3xl bg-white p-6 text-center text-sm font-bold text-slate-500 shadow-md">
            교환 신청을 불러오는 중...
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-md">
            <div className="text-4xl">📭</div>
            <div className="mt-3 text-lg font-black text-slate-700">
              {filter === "pending"
                ? "처리할 교환 신청이 없습니다."
                : "아직 교환 신청 내역이 없습니다."}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRequests.map((exchangeRequest) => {
              const student = exchangeRequest.studentSnapshot;
              const isProcessing = processingId === exchangeRequest.id;

              return (
                <article
                  key={exchangeRequest.id}
                  className="rounded-3xl bg-white p-5 shadow-md"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xl font-black text-slate-800">
                          {student.name || "이름 없음"}
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClassName(
                            exchangeRequest
                          )}`}
                        >
                          {getStatusLabel(exchangeRequest)}
                        </div>
                      </div>

                      <div className="mt-2 text-sm font-bold text-slate-500">
                        {student.school} · {student.grade}학년 {student.class}반
                        {student.studentNumber
                          ? ` · ${student.studentNumber}번`
                          : ""}
                      </div>

                      <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
                        <div className="text-base font-black text-violet-800">
                          🎫 {exchangeRequest.vendorLabel}
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-700">
                          은엽전 {exchangeRequest.amountSilver}개 → {formatCoinExchangeWon(exchangeRequest.amountWon)}
                        </div>
                        <div className="mt-2 text-sm font-black text-slate-800">
                          📱 쿠폰 수신번호 {exchangeRequest.recipientPhone || "기존 신청 · 번호 없음"}
                        </div>
                      </div>

                      <div className="mt-3 text-xs font-bold text-slate-400">
                        신청 {formatDateTime(exchangeRequest.createdAt)}
                        {exchangeRequest.completedAt
                          ? ` · 완료 ${formatDateTime(exchangeRequest.completedAt)}`
                          : ""}
                        {exchangeRequest.cancelledAt
                          ? ` · 취소 ${formatDateTime(exchangeRequest.cancelledAt)}`
                          : ""}
                      </div>
                    </div>

                    {exchangeRequest.status === "pending" && (
                      <div className="flex shrink-0 gap-2 md:flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            void processRequest(exchangeRequest, "complete")
                          }
                          disabled={Boolean(processingId)}
                          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                        >
                          {isProcessing ? "처리 중..." : "✅ 교환 완료"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void processRequest(exchangeRequest, "cancel")
                          }
                          disabled={Boolean(processingId)}
                          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 disabled:opacity-50"
                        >
                          ❌ 신청 취소
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

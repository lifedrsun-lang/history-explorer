"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

type ServiceKey = "calendar" | "drive" | "gmail";
type ConnectionStatus = {
  configured: boolean;
  connected: boolean;
};
type ServiceDefinition = {
  key: ServiceKey;
  title: string;
  icon: string;
  description: string;
  statusUrl: string;
  connectUrl: string;
};

const SERVICES: readonly ServiceDefinition[] = [
  {
    key: "calendar",
    title: "Google 캘린더",
    icon: "📅",
    description: "교사용 일정 연동 권한",
    statusUrl: "/api/teacher/google-calendar/status",
    connectUrl: "/api/teacher/google-calendar/connect",
  },
  {
    key: "drive",
    title: "Google 드라이브",
    icon: "📁",
    description: "SUN LAB 도서관 PDF 선택 권한",
    statusUrl: "/api/teacher/google-drive/status",
    connectUrl: "/api/teacher/google-drive/connect",
  },
  {
    key: "gmail",
    title: "Google 메일",
    icon: "✉️",
    description: "참여확인서 발송용 Gmail 권한",
    statusUrl: "/api/teacher/atc-confirmations/gmail-status",
    connectUrl: "/api/teacher/atc-confirmations/gmail-connect",
  },
];

const emptyStatuses = (): Record<ServiceKey, ConnectionStatus | null> => ({
  calendar: null,
  drive: null,
  gmail: null,
});

export default function GoogleConnectionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [statuses, setStatuses] = useState(emptyStatuses);
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState<ServiceKey | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const service = url.searchParams.get("service");
    const result = url.searchParams.get("result");

    if (service && result) {
      const serviceName = SERVICES.find((item) => item.key === service)?.title;
      if (serviceName) {
        if (result === "connected") {
          setNotice(serviceName + " 권한을 다시 승인했습니다.");
        } else if (result === "calendar-missing") {
          setNotice("캘린더 인증은 완료했지만 지정된 캘린더는 찾지 못했습니다.");
        } else if (result === "cancelled") {
          setErrorMessage(serviceName + " 연결이 취소되었습니다.");
        } else if (result === "wrong-account") {
          setErrorMessage("메일 발송에 지정된 Google 계정을 선택해 주세요.");
        } else {
          setErrorMessage(serviceName + " 연결에 실패했습니다. 다시 시도해 주세요.");
        }
      }
      url.searchParams.delete("service");
      url.searchParams.delete("result");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }, []);

  const requestJson = useCallback(async (url: string, init?: RequestInit) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("교사 로그인이 필요합니다.");
    const idToken = await currentUser.getIdToken();
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + idToken,
        ...(init?.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "요청을 처리하지 못했습니다.");
    return data;
  }, []);

  const refreshStatuses = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    try {
      const results = await Promise.allSettled(
        SERVICES.map((service) => requestJson(service.statusUrl))
      );
      const next = emptyStatuses();
      const failed: string[] = [];
      results.forEach((result, index) => {
        const service = SERVICES[index];
        if (result.status === "fulfilled") {
          const value = result.value;
          next[service.key] = {
            configured: value?.configured === true,
            connected: value?.connected === true,
          };
        } else {
          failed.push(service.title);
        }
      });
      setStatuses(next);
      if (failed.length > 0) {
        setErrorMessage(failed.join(", ") + " 연결 상태를 확인하지 못했습니다.");
      }
    } finally {
      setChecking(false);
    }
  }, [user, requestJson]);

  useEffect(() => {
    void refreshStatuses();
  }, [refreshStatuses]);

  const reconnect = async (service: ServiceDefinition) => {
    if (connecting) return;
    setConnecting(service.key);
    setErrorMessage("");
    setNotice("");
    try {
      const data = await requestJson(service.connectUrl, {
        method: "POST",
        body: JSON.stringify({ returnToConnections: true }),
      });
      const authorizationUrl = String(data?.authorizationUrl || "").trim();
      if (!authorizationUrl || !authorizationUrl.startsWith("https://accounts.google.com/")) {
        throw new Error("Google 인증 주소를 받지 못했습니다.");
      }
      window.location.assign(authorizationUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Google 연결을 시작하지 못했습니다."
      );
      setConnecting(null);
    }
  };

  if (authChecking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
        교사 로그인 상태를 확인 중입니다.
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[100dvh] bg-slate-50 p-6">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-black">Google 연결 관리</h1>
          <p className="mt-2 text-sm text-slate-500">교사 로그인 후 이용할 수 있습니다.</p>
          <Link className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold text-white" href="/teacher">
            교사관리실로 이동
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-widest text-sky-700">SUN LAB TEACHER</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">🔗 Google 연결 관리</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                캘린더·드라이브·메일의 Google 접근 권한을 한 곳에서 관리합니다.
              </p>
            </div>
            <Link href="/teacher" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
              ← 교사관리실
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          매월 1일에 이 화면에서 필요한 서비스를 각각 재연결할 수 있습니다.
          재연결은 Google 계정 승인 절차이며, 등록된 일정·PDF·발송 기록을 삭제하지 않습니다.
        </section>

        {(notice || errorMessage) && (
          <div role="status" className={"rounded-2xl border p-4 text-sm font-bold " +
            (errorMessage ? "border-rose-200 bg-rose-50 text-rose-800" :
              "border-emerald-200 bg-emerald-50 text-emerald-800")}>
            {errorMessage || notice}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setErrorMessage(""); void refreshStatuses(); }}
            disabled={checking || connecting !== null}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            {checking ? "상태 확인 중..." : "↻ 연결 상태 새로고침"}
          </button>
        </div>

        <div className="grid gap-3">
          {SERVICES.map((service) => {
            const status = statuses[service.key];
            const busy = connecting === service.key;
            const statusLabel = !status ? "확인 중 또는 오류" : !status.configured
              ? "서버 설정 필요" : status.connected ? "연결 정보 저장됨" : "연결 필요";

            return (
              <section key={service.key} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                      {service.icon}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">{service.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{service.description}</p>
                    </div>
                  </div>
                  <span className={"rounded-full px-3 py-1 text-xs font-bold " +
                    (status?.connected ? "bg-emerald-100 text-emerald-800" :
                      "bg-slate-100 text-slate-600")}>
                    {statusLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void reconnect(service)}
                  disabled={connecting !== null || !status?.configured}
                  className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50 sm:w-auto"
                >
                  {busy ? "Google 인증 화면으로 이동 중..." :
                    service.title + (status?.connected ? " 재연결" : " 연결")}
                </button>
              </section>
            );
          })}
        </div>

        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600">
          연결 상태 표시는 서버에 저장된 인증 정보 기준입니다. 토큰이 실제로 만료·철회되었는지는
          사용 시 확인될 수 있습니다. Google이 권한을 철회한 경우 다시 계정 승인이 필요하며,
          매월 강제 재연결해야 하는 것은 아닙니다.
        </p>
      </div>
    </main>
  );
}

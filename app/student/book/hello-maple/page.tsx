"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const HELLO_MAPLE_URL = "https://www.hellomaple.org/ko";

type Account = {
  name: string;
  id: string;
  password: string;
};

export default function HelloMapleAccountPage() {
  const [name, setName] = useState("");
  const [birthMd, setBirthMd] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const resetResult = () => {
    setAccount(null);
    setError("");
    setCopyState("idle");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetResult();

    const cleanName = name.trim();
    const cleanBirthMd = birthMd.replace(/\D/g, "").slice(0, 4);

    if (!cleanName || cleanBirthMd.length !== 4) {
      setError("이름과 생월일 4자리를 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/student/hello-maple-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, birthMd: cleanBirthMd }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        account?: Account;
        error?: string;
      };

      if (!response.ok || !data.account) {
        setError(data.error || "계정을 찾지 못했습니다.");
        return;
      }

      setAccount(data.account);
    } catch {
      setError("계정을 찾지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const copyId = async () => {
    if (!account?.id) return;

    try {
      await navigator.clipboard.writeText(account.id);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-md">
        <div className="rounded-[32px] border border-white/80 bg-white/95 p-6 shadow-xl sm:p-7">
          <div className="text-center">
            <div className="text-5xl">🍁</div>
            <h1 className="mt-3 text-3xl font-black text-slate-800">헬로메이플</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              수강생 이름과 생월일 4자리를 입력하면<br />내 계정을 확인할 수 있어요.
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-black text-slate-600">이름</span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  resetResult();
                }}
                autoComplete="off"
                placeholder="수강생 이름"
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3.5 text-base font-bold text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-black text-slate-600">생월일 4자리</span>
              <input
                value={birthMd}
                onChange={(event) => {
                  setBirthMd(event.target.value.replace(/\D/g, "").slice(0, 4));
                  resetResult();
                }}
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="예: 0713"
                className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-center text-xl font-black tracking-[0.25em] text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-sky-500 py-4 text-lg font-black text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "찾는 중..." : "내 계정 찾기"}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-black leading-5 text-rose-600">
              {error}
            </div>
          )}

          {account && (
            <div className="mt-5 rounded-[26px] border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="text-center">
                <div className="text-sm font-black text-emerald-600">✅ {account.name} 계정</div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <div className="text-xs font-black text-slate-400">헬로메이플 아이디</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="min-w-0 flex-1 break-all text-lg font-black text-slate-800">{account.id}</div>
                    <button
                      type="button"
                      onClick={copyId}
                      className="shrink-0 rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white transition hover:bg-sky-600"
                    >
                      {copyState === "copied" ? "복사됨 ✓" : "복사"}
                    </button>
                  </div>
                  {copyState === "failed" && (
                    <div className="mt-2 text-xs font-bold text-rose-500">복사하지 못했어요. 아이디를 길게 눌러 복사해 주세요.</div>
                  )}
                </div>

                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <div className="text-xs font-black text-slate-400">헬로메이플 비밀번호</div>
                  <div className="mt-1 break-all text-lg font-black text-slate-800">{account.password}</div>
                </div>
              </div>

              <a
                href={HELLO_MAPLE_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-full rounded-2xl bg-emerald-500 py-3.5 text-center text-base font-black text-white shadow-sm transition hover:bg-emerald-600"
              >
                🍁 헬로메이플 시작하기
              </a>
            </div>
          )}

          <div className="mt-5 flex justify-center">
            <Link
              href="/student/book"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
            >
              ← 선랩카드로
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

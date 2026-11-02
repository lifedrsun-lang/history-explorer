"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

type Account = {
  name: string;
  id: string;
  password: string;
};

export default function MinecraftEducationTeacherPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState("");

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthChecking(false);
      }),
    []
  );

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const loadAccounts = async () => {
      setLoading(true);
      setError("");
      try {
        const token = await user.getIdToken();
        const response = await fetch(
          "/api/teacher/minecraft-education-account",
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = (await response.json().catch(() => ({}))) as {
          accounts?: Account[];
          error?: string;
        };

        if (!response.ok || !Array.isArray(data.accounts)) {
          throw new Error(data.error || "계정을 불러오지 못했습니다.");
        }
        if (!cancelled) setAccounts(data.accounts);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "계정을 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setError("복사하지 못했습니다. 값을 표시한 뒤 길게 눌러 복사해 주세요.");
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">
        교사 로그인을 확인하고 있습니다.
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-6">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 text-center shadow-lg">
          <div className="text-xl font-black text-slate-800">교사 로그인이 필요합니다.</div>
          <Link href="/teacher" className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
            교사 로그인으로 이동
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[28px] bg-white p-5 shadow-xl sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-emerald-600">SUN LAB</div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">⛏️ 마인크래프트 에듀케이션</h1>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
                민서·민채의 수업용 계정을 교사 권한으로 확인합니다.
              </p>
            </div>
            <Link href="/teacher/manage/sun-lab" className="shrink-0 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              ← Sun Lab
            </Link>
          </div>
        </section>

        {loading && (
          <div className="mt-4 rounded-3xl bg-white p-6 text-center font-bold text-slate-500 shadow-sm">계정을 불러오고 있습니다.</div>
        )}
        {error && (
          <div className="mt-4 rounded-3xl bg-rose-50 p-5 text-sm font-black text-rose-700">{error}</div>
        )}

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {accounts.map((account) => {
            const passwordVisible = visiblePasswords[account.id] === true;
            return (
              <article key={account.id} className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="text-xl font-black text-slate-900">{account.name}</div>
                <div className="mt-4 rounded-2xl bg-sky-50 p-3">
                  <div className="text-xs font-black text-slate-400">아이디</div>
                  <div className="mt-1 break-all text-sm font-black text-slate-800">{account.id}</div>
                  <button type="button" onClick={() => void copyValue(`${account.id}-id`, account.id)} className="mt-2 rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white">
                    {copied === `${account.id}-id` ? "복사됨 ✓" : "아이디 복사"}
                  </button>
                </div>
                <div className="mt-3 rounded-2xl bg-emerald-50 p-3">
                  <div className="text-xs font-black text-slate-400">비밀번호</div>
                  <div className="mt-1 break-all text-lg font-black text-slate-800">
                    {passwordVisible ? account.password : "••••••••••"}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => setVisiblePasswords((current) => ({ ...current, [account.id]: !passwordVisible }))} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700">
                      {passwordVisible ? "숨기기" : "표시"}
                    </button>
                    <button type="button" onClick={() => void copyValue(`${account.id}-password`, account.password)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">
                      {copied === `${account.id}-password` ? "복사됨 ✓" : "비밀번호 복사"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

      </div>
    </main>
  );
}

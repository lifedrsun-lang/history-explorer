"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { FormEvent, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import type { SunLabPermission } from "@/lib/sunLabMember";

const HELLO_MAPLE_URL = "https://www.hellomaple.org/ko";

type HelloMapleMission = {
  id: string;
  title: string;
  url: string;
  sortOrder: number;
};

type Member = {
  name: string;
  permissions: SunLabPermission[];
  helloMaple: {
    id: string;
    password: string;
  } | null;
  helloMapleMissions?: HelloMapleMission[];
};

type ResourceCard = {
  permission: SunLabPermission;
  emoji: string;
  title: string;
  description: string;
  href?: string;
  external?: boolean;
  preparing?: boolean;
};

const RESOURCE_CARDS: ResourceCard[] = [
  {
    permission: "library",
    emoji: "📖",
    title: "도서관",
    description: "선생님이 등록한 SUN LAB 책을 확인해요.",
    href: "/student/library",
  },
  {
    permission: "hello_maple",
    emoji: "🍁",
    title: "헬로메이플",
    description: "내 계정을 확인하고 바로 시작해요.",
  },
  {
    permission: "byeolkkum_history",
    emoji: "📚",
    title: "별꼼역사",
    description: "역사 수업방으로 이동해요.",
    href: "/student/history",
  },
  {
    permission: "history_explorer",
    emoji: "🏺",
    title: "역사탐험대",
    description: "역사탐험대 수업방으로 이동해요.",
    href: "/student/history-explorer",
  },
  {
    permission: "boardgame",
    emoji: "🎲",
    title: "보드게임",
    description: "보드게임 수업방으로 이동해요.",
    href: "/student/boardgame",
  },
  {
    permission: "coding",
    emoji: "💻",
    title: "코딩",
    description: "코딩 공간은 준비 중이에요.",
    preparing: true,
  },
];

export default function SunLabBookPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setIsTeacher(Boolean(user));
      setAuthChecking(false);

      if (user) {
        // Reuse the teacher dashboard and its existing session-expiry boundary.
        router.replace("/teacher");
      }
    });
  }, [router]);

  if (authChecking || isTeacher) {
    return (
      <div role="status" className="flex min-h-[100dvh] items-center justify-center bg-sky-50 px-6 text-center text-sm font-bold text-slate-500">
        {isTeacher ? "SUN LAB 교사모드로 이동하고 있어요." : "로그인 상태를 확인하고 있어요."}
      </div>
    );
  }

  return <SunLabStudentPage />;
}

function SunLabStudentPage() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHelloMaple, setShowHelloMaple] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  const resetMember = () => {
    setMember(null);
    setName("");
    setBirthDate("");
    setError("");
    setShowHelloMaple(false);
    setCopyState("idle");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMember(null);
    setShowHelloMaple(false);
    setCopyState("idle");

    const cleanName = name.trim();
    const cleanBirthDate = birthDate.replace(/\D/g, "").slice(0, 8);

    if (!cleanName || cleanBirthDate.length !== 8) {
      setError("이름과 생년월일 8자리를 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/student/sun-lab-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          birthDate: cleanBirthDate,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        member?: Member;
        error?: string;
      };

      if (!response.ok || !data.member) {
        setError(data.error || "회원 정보를 확인하지 못했습니다.");
        return;
      }

      setMember(data.member);
    } catch {
      setError("회원 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const copyHelloMapleId = async () => {
    if (!member?.helloMaple?.id) return;

    try {
      await navigator.clipboard.writeText(member.helloMaple.id);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
    }
  };

  if (!member) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-4 py-8 text-slate-800">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md items-center justify-center">
          <div className="w-full rounded-[32px] border border-white/80 bg-white/95 p-7 shadow-xl">
            <div className="text-center">
              <div className="text-5xl">🌞</div>
              <h1 className="mt-3 text-3xl font-black text-slate-800">SUN LAB</h1>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                SUN LAB 회원만 입장할 수 있어요.<br />
                이름과 생년월일을 입력해 주세요.
              </p>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-slate-600">
                  이름
                </span>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                  autoComplete="off"
                  placeholder="수강생 이름"
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3.5 text-base font-bold text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-slate-600">
                  생년월일 8자리
                </span>
                <input
                  value={birthDate}
                  onChange={(event) => {
                    setBirthDate(
                      event.target.value.replace(/\D/g, "").slice(0, 8)
                    );
                    setError("");
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={8}
                  placeholder="예: 20180713"
                  className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-center text-xl font-black tracking-[0.18em] text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-sky-500 py-4 text-lg font-black text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "확인 중..." : "SUN LAB 입장하기"}
              </button>
            </form>

            {error && (
              <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-black leading-5 text-rose-600">
                {error}
              </div>
            )}

            <div className="mt-5 text-center">
              <Link
                href="/teacher"
                className="mb-3 flex w-full items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-100"
              >
                교사모드
              </Link>
              <Link
                href="/student/history"
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                ← 학교/수업 장소 선택
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const visibleCards = RESOURCE_CARDS.filter((card) =>
    member.permissions.includes(card.permission)
  );
  const helloMapleMissions = member.helloMapleMissions || [];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-xl">
        <header className="rounded-[30px] border border-white/80 bg-white/95 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-sky-600">🌞 SUN LAB</div>
              <h1 className="mt-1 text-2xl font-black text-slate-800">
                {member.name}님의 SUN LAB
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                이용할 수 있는 공간만 보여드려요.
              </p>
            </div>
            <button
              type="button"
              onClick={resetMember}
              className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600"
            >
              다른 회원
            </button>
          </div>
        </header>

        {visibleCards.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-[32px] border border-white/80 bg-white/80 p-3 shadow-sm sm:p-4">
            {visibleCards.map((card) => {
              const cardBody = (
                <div>
                  <div className="text-4xl">{card.emoji}</div>
                  <div className="mt-3 text-lg font-black text-slate-800 sm:text-xl">
                    {card.title}
                  </div>
                  <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500 sm:text-xs">
                    {card.description}
                  </div>
                  {card.preparing && (
                    <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                      준비중
                    </div>
                  )}
                </div>
              );

              const cardClassName =
                "flex min-h-[150px] items-center justify-center rounded-3xl border border-sky-100 bg-white p-4 text-center shadow-sm transition";

              if (card.permission === "hello_maple") {
                return (
                  <button
                    key={card.permission}
                    type="button"
                    onClick={() => setShowHelloMaple((current) => !current)}
                    className={`${cardClassName} hover:bg-sky-50`}
                  >
                    {cardBody}
                  </button>
                );
              }

              if (card.preparing || !card.href) {
                return (
                  <div
                    key={card.permission}
                    className={`${cardClassName} cursor-default opacity-75`}
                  >
                    {cardBody}
                  </div>
                );
              }

              if (card.external) {
                return (
                  <a
                    key={card.permission}
                    href={card.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`${cardClassName} hover:bg-sky-50`}
                  >
                    {cardBody}
                  </a>
                );
              }

              return (
                <Link
                  key={card.permission}
                  href={card.href}
                  className={`${cardClassName} hover:bg-sky-50`}
                >
                  {cardBody}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-[28px] border border-amber-100 bg-white/95 p-6 text-center shadow-sm">
            <div className="text-3xl">🌱</div>
            <div className="mt-2 text-lg font-black text-slate-800">
              현재 이용 가능한 SUN LAB 메뉴가 없어요.
            </div>
            <div className="mt-1 text-sm font-bold text-slate-500">
              이용 권한은 선생님께 문의해 주세요.
            </div>
          </div>
        )}

        {showHelloMaple && member.permissions.includes("hello_maple") && (
          <section className="mt-4 rounded-[28px] border border-emerald-100 bg-white/95 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-emerald-600">
                  🍁 헬로메이플 계정
                </div>
                <div className="mt-1 text-lg font-black text-slate-800">
                  {member.name}님의 계정
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelloMaple(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
              >
                닫기
              </button>
            </div>

            {member.helloMaple ? (
              <>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-sky-50 p-3">
                    <div className="text-xs font-black text-slate-400">
                      헬로메이플 아이디
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="min-w-0 flex-1 break-all text-lg font-black text-slate-800">
                        {member.helloMaple.id}
                      </div>
                      <button
                        type="button"
                        onClick={copyHelloMapleId}
                        className="shrink-0 rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white"
                      >
                        {copyState === "copied" ? "복사됨 ✓" : "복사"}
                      </button>
                    </div>
                    {copyState === "failed" && (
                      <div className="mt-2 text-xs font-bold text-rose-500">
                        복사하지 못했어요. 아이디를 길게 눌러 복사해 주세요.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-amber-50 p-3">
                    <div className="text-xs font-black text-slate-400">
                      헬로메이플 비밀번호
                    </div>
                    <div className="mt-1 break-all text-lg font-black text-slate-800">
                      {member.helloMaple.password}
                    </div>
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
              </>
            ) : (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-700">
                헬로메이플 계정이 아직 등록되지 않았어요. 선생님께 문의해 주세요.
              </div>
            )}

            <div className="mt-5 border-t border-emerald-100 pt-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-orange-600">
                    🎯 오늘의 헬로메이플 미션
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-400">
                    선생님이 배정한 미션만 보여요.
                  </div>
                </div>
                {helloMapleMissions.length > 0 && (
                  <div className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
                    {helloMapleMissions.length}개
                  </div>
                )}
              </div>

              {helloMapleMissions.length > 0 ? (
                <div className="mt-3 space-y-2.5">
                  {helloMapleMissions.map((mission, index) => (
                    <div
                      key={mission.id}
                      className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-orange-600 shadow-sm">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1 font-black text-slate-800">
                        {mission.title}
                      </div>
                      <a
                        href={mission.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-orange-600"
                      >
                        미션 시작 ↗
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-center text-sm font-bold text-slate-400">
                  오늘 배정된 미션이 없어요.
                </div>
              )}
            </div>
          </section>
        )}

        <div className="mt-6 flex justify-center">
          <Link
            href="/student/history"
            className="rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-white"
          >
            ← 학교/수업 장소 선택
          </Link>
        </div>
      </div>
    </div>
  );
}

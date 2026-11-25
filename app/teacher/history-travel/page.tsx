"use client";

import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import TravelCards, { timelineCards } from "@/app/history/travel/TravelCards";

export default function TeacherHistoryTravelPage() {
  const [access, setAccess] = useState<"loading" | "allowed" | "denied">("loading");
  useEffect(() => {
    let active = true;
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      const current = ++generation;
      if (!user) { if (active) setAccess("denied"); return; }
      setAccess("loading");
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/teacher/dashboard-summary", { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
        if (active && generation === current) setAccess(response.ok ? "allowed" : "denied");
      } catch { if (active && generation === current) setAccess("denied"); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  const cards = timelineCards.map((card, index) => ({ ...card, href: ["/history/timeline/byeolkkum", "/history/timeline", "/teacher/history-timeline", "/teacher/history-timeline/materials"][index] }));
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
    <Link href="/teacher" className="text-sm font-bold text-emerald-800">← 교사 홈</Link>
    <h1 className="mt-4 text-3xl font-black text-slate-900">한국사 시간여행</h1>
    <p className="mb-6 mt-2 text-sm font-medium text-slate-600">연표 학습 및 공개 권한 관리</p>
    {access === "loading" ? <p>교사 권한 확인 중…</p> : access === "denied" ? <p>교사 로그인이 필요합니다.</p> : <TravelCards cards={cards} />}
  </main>;
}

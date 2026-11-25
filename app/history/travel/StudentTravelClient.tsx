"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TravelCards, { timelineCards } from "./TravelCards";

export default function StudentTravelClient({ member = false }: { member?: boolean }) {
  const [access, setAccess] = useState<{ byeolkkum: boolean; integrated: boolean } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/history/travel/access" + (member ? "?view=sunlab" : ""), { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 401 ? "학생 로그인이 필요합니다." : "연표 권한을 확인하지 못했습니다.");
        return response.json();
      }).then(data => { if (active) setAccess({ byeolkkum: data.byeolkkum === true, integrated: data.integrated === true }); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "열람 권한 확인 실패"); });
    return () => { active = false; controller.abort(); };
  }, [member]);
  const suffix = member ? "?view=sunlab" : "?view=student";
  const cards = [
    ...(access?.byeolkkum ? [{ ...timelineCards[0], href: "/history/timeline/byeolkkum" + suffix }] : []),
    ...(access?.integrated ? [{ ...timelineCards[1], href: "/history/timeline" + suffix }] : []),
  ];
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
    <Link href={member ? "/student/book" : "/student/history"} className="text-sm font-bold text-emerald-800">← 학생 홈</Link>
    <h1 className="mt-4 text-3xl font-black text-slate-900">한국사 시간여행</h1>
    <p className="mb-6 mt-2 text-sm font-medium text-slate-600">열람 가능한 연표를 선택하세요.</p>
    {error ? <p>{error}</p> : !access ? <p>열람 권한 확인 중…</p> : cards.length ? <TravelCards cards={cards} /> : <p>아직 공개된 연표가 없습니다. 선생님께 문의해 주세요.</p>}
  </main>;
}

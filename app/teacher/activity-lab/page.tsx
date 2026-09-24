"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MORAL_MACHINE_ACTIVITY_ID, MORAL_MACHINE_CHARACTERS } from "@/lib/classActivities";
import { auth } from "@/lib/firebase";
import styles from "./ActivityLab.module.css";

type Row = {
  schoolSlug: string;
  schoolName: string;
  grade: number;
  classNumber: number;
  participants: number;
  rosterTotal: number;
  resultsVisible: boolean;
};

type Aggregate = {
  participants: number;
  rosterTotal: number;
  mostSaved: Record<string, number>;
  mostSacrificed: Record<string, number>;
  savingMoreLives: number[];
  protectingPassengers: number[];
};

const apiUrl = `/api/teacher/activities/${MORAL_MACHINE_ACTIVITY_ID}`;

const TeacherVotes = ({ title, counts }: { title: string; counts: Record<string, number> }) => {
  const rows = MORAL_MACHINE_CHARACTERS.map((character) => ({
    character,
    count: counts[character.id] || 0,
  })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((item) => item.count));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-black text-slate-900">{title}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map(({ character, count }) => (
          <div key={character.id} className="grid grid-cols-[72px_1fr] items-center gap-3 rounded-xl bg-slate-50 p-2">
            <div className={styles.sprite} style={{ backgroundPosition: `${(character.spriteColumn / 4) * 100}% ${(character.spriteRow / 3) * 100}%` }} role="img" aria-label={character.label} />
            <div><div className="text-sm font-black">{character.label} · {count}명</div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-500" style={{ width: `${(count / max) * 100}%` }} /></div></div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm font-bold text-slate-500">아직 제출 결과가 없습니다.</p>}
      </div>
    </section>
  );
};

export default function ActivityLabPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [scope, setScope] = useState<"class" | "grade">("class");
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const authorizedFetch = useCallback(async (url: string, init?: RequestInit) => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    const token = await user.getIdToken();
    return fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true); setMessage("");
    try {
      const response = await authorizedFetch(apiUrl);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "현황을 불러오지 못했습니다.");
      setRows(body.rows || []);
      if (body.rows?.length) {
        const first = body.rows[0] as Row;
        setSelectedKey((current) => current || `${first.schoolSlug}:${first.grade}:${first.classNumber}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "현황을 불러오지 못했습니다.");
    } finally { setLoading(false); }
  }, [authorizedFetch, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const selected = useMemo(() => {
    const [schoolSlug, grade, classNumber] = selectedKey.split(":");
    return rows.find((row) => row.schoolSlug === schoolSlug && row.grade === Number(grade) && row.classNumber === Number(classNumber)) || null;
  }, [rows, selectedKey]);

  const loadAggregate = useCallback(async () => {
    if (!selected || !user) return;
    setBusy(true); setMessage("");
    try {
      const query = new URLSearchParams({ schoolSlug: selected.schoolSlug, grade: String(selected.grade) });
      if (scope === "class") query.set("classNumber", String(selected.classNumber));
      const response = await authorizedFetch(`${apiUrl}?${query}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "결과를 불러오지 못했습니다.");
      setAggregate(body.aggregate);
    } catch (error) {
      setAggregate(null);
      setMessage(error instanceof Error ? error.message : "결과를 불러오지 못했습니다.");
    } finally { setBusy(false); }
  }, [authorizedFetch, scope, selected, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAggregate(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAggregate]);

  const changeVisibility = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await authorizedFetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolSlug: selected.schoolSlug, grade: selected.grade, resultsVisible: !selected.resultsVisible }),
      });
      if (!response.ok) throw new Error("공개 상태를 바꾸지 못했습니다.");
      setRows((current) => current.map((row) => row.schoolSlug === selected.schoolSlug && row.grade === selected.grade ? { ...row, resultsVisible: !selected.resultsVisible } : row));
    } catch (error) { setMessage(error instanceof Error ? error.message : "변경하지 못했습니다."); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (!selected) return;
    const target = scope === "class" ? `${selected.grade}학년 ${selected.classNumber}반` : `${selected.grade}학년 전체`;
    if (!window.confirm(`${selected.schoolName} ${target}의 모럴머신 결과를 초기화할까요? 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    try {
      const response = await authorizedFetch(apiUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolSlug: selected.schoolSlug, grade: selected.grade, classNumber: scope === "class" ? selected.classNumber : null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "초기화하지 못했습니다.");
      setMessage(`${body.removed || 0}개의 제출 결과를 초기화했습니다.`);
      await refresh(); await loadAggregate();
    } catch (error) { setMessage(error instanceof Error ? error.message : "초기화하지 못했습니다."); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-gradient-to-r from-sky-700 to-violet-700 p-6 text-white shadow-lg">
          <div className="text-sm font-black tracking-widest text-cyan-100">SUN LAB ACTIVITY</div>
          <h1 className="mt-2 text-3xl font-black">🤖 활동 결과 연구소</h1>
          <p className="mt-2 font-bold text-sky-100">학교·학년·반별 참여 현황과 익명 집계를 관리합니다.</p>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-64 flex-1 text-sm font-black text-slate-700">조회할 반
              <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-bold">
                {rows.map((row) => <option key={`${row.schoolSlug}:${row.grade}:${row.classNumber}`} value={`${row.schoolSlug}:${row.grade}:${row.classNumber}`}>{row.schoolName} · {row.grade}학년 {row.classNumber}반 · {row.participants}/{row.rosterTotal}명</option>)}
              </select>
            </label>
            {selected && <button type="button" disabled={busy} onClick={() => void changeVisibility()} className={`rounded-xl px-5 py-3 font-black text-white ${selected.resultsVisible ? "bg-emerald-600" : "bg-slate-500"}`}>결과 공개 {selected.resultsVisible ? "ON" : "OFF"}</button>}
          </div>
          {loading && <p className="mt-4 font-bold text-slate-500">현황을 불러오는 중…</p>}
        </section>

        {selected && <>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-200 p-2">
            <button type="button" onClick={() => setScope("class")} className={`rounded-xl p-3 font-black ${scope === "class" ? "bg-white text-violet-700 shadow" : "text-slate-600"}`}>{selected.grade}학년 {selected.classNumber}반</button>
            <button type="button" onClick={() => setScope("grade")} className={`rounded-xl p-3 font-black ${scope === "grade" ? "bg-white text-violet-700 shadow" : "text-slate-600"}`}>{selected.grade}학년 전체</button>
          </div>
          {aggregate && <div className="mt-5 grid gap-4"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xl font-black text-emerald-900">현재 {aggregate.participants} / {aggregate.rosterTotal}명 참여</div><div className="grid gap-4 lg:grid-cols-2"><TeacherVotes title="가장 많이 살린 캐릭터" counts={aggregate.mostSaved} /><TeacherVotes title="가장 많이 희생된 캐릭터" counts={aggregate.mostSacrificed} /></div><section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-black">5단계 결과</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-cyan-50 p-3 font-bold">희생자 수의 중요도: {aggregate.savingMoreLives.join(" · ")}</div><div className="rounded-xl bg-violet-50 p-3 font-bold">승객 보호 선호도: {aggregate.protectingPassengers.join(" · ")}</div></div></section></div>}
          <div className="mt-5 flex justify-end"><button type="button" disabled={busy} onClick={() => void reset()} className="rounded-xl border-2 border-rose-200 bg-rose-50 px-5 py-3 font-black text-rose-700 disabled:opacity-50">선택 범위 결과 초기화</button></div>
        </>}
        {message && <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-black text-amber-900">{message}</div>}
      </div>
    </main>
  );
}

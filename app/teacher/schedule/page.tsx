"use client";

import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type ScheduleItem = {
  id: string;
  schoolName: string;
  title: string;
  dueDate?: string;
  completed?: boolean;
};

export default function TeacherSchedulePage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [schoolNames, setSchoolNames] = useState<string[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
  }, []);

  const requestJson = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!user) throw new Error("교사 로그인이 필요합니다.");
      const token = await user.getIdToken();
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "요청 처리에 실패했습니다.");
      return data;
    },
    [user]
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await requestJson("/api/teacher/schedule");
      setItems(Array.isArray(data?.items) ? data.items : []);
      setSchoolNames(Array.isArray(data?.schoolNames) ? data.schoolNames : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "교사일정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [requestJson, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const addItem = async () => {
    if (!schoolName.trim() || !title.trim()) {
      setError("학교와 일정 내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await requestJson("/api/teacher/schedule", {
        method: "POST",
        body: JSON.stringify({ schoolName, title, dueDate }),
      });
      setTitle("");
      setDueDate("");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "일정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCompleted = async (item: ScheduleItem) => {
    const nextValue = !item.completed;
    setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, completed: nextValue } : currentItem));
    try {
      await requestJson("/api/teacher/schedule", {
        method: "PATCH",
        body: JSON.stringify({ id: item.id, completed: nextValue }),
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "완료 상태를 저장하지 못했습니다.");
      await loadData();
    }
  };

  const deleteItem = async (item: ScheduleItem) => {
    if (!confirm(`${item.schoolName} · ${item.title}\n일정을 삭제할까요?`)) return;
    try {
      await requestJson(`/api/teacher/schedule?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "일정을 삭제하지 못했습니다.");
    }
  };

  const visibleItems = useMemo(
    () => items.filter((item) => showCompleted || !item.completed),
    [items, showCompleted]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    visibleItems.forEach((item) => {
      const school = item.schoolName || "미지정";
      const list = map.get(school) || [];
      list.push(item);
      map.set(school, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "ko-KR"));
  }, [visibleItems]);

  const pendingCount = items.filter((item) => !item.completed).length;

  if (authChecking) {
    return <div className="min-h-screen bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">교사 로그인 확인 중...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-6 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <div className="font-black text-slate-800">교사 로그인이 필요합니다.</div>
          <Link href="/teacher" className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white">교사홈으로</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black text-slate-900">📅 교사일정</div>
              <div className="mt-1 text-sm font-bold text-slate-500">수강중인 학교의 행정·안내·제출 일정을 학교별로 관리합니다.</div>
            </div>
            <Link href="/teacher" className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">← 교사홈</Link>
          </div>
          <div className="mt-4 inline-flex rounded-2xl bg-rose-50 px-3 py-2 text-sm font-black text-rose-700">미완료 {pendingCount}건</div>
        </div>

        <section className="mt-3 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="text-lg font-black text-slate-900">새 일정 추가</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_1fr]">
            <label className="text-xs font-black text-slate-600">학교
              <input list="teacher-schedule-schools" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="예: 하늘빛초" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none" />
              <datalist id="teacher-schedule-schools">{schoolNames.map((school) => <option key={school} value={school} />)}</datalist>
            </label>
            <label className="text-xs font-black text-slate-600">할 일
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 결과지 송부" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none" />
            </label>
            <label className="text-xs font-black text-slate-600">기한
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none" />
            </label>
          </div>
          <button type="button" onClick={addItem} disabled={saving} className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중..." : "+ 일정 추가"}</button>
          {error && <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        </section>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-sm font-black text-slate-700">학교별 타임라인</div>
          <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
            <input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} className="h-4 w-4 accent-slate-700" /> 완료된 일정 보기
          </label>
        </div>

        {loading && items.length === 0 ? (
          <div className="mt-3 rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-500">일정을 불러오는 중...</div>
        ) : grouped.length === 0 ? (
          <div className="mt-3 rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-500">표시할 일정이 없습니다.</div>
        ) : (
          <section className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {grouped.map(([school, schoolItems]) => (
              <div key={school} className="rounded-[28px] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xl font-black text-slate-900">{school}</div>
                  <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">{schoolItems.filter((item) => !item.completed).length}건</div>
                </div>
                <div className="mt-4 space-y-2">
                  {schoolItems.map((item) => (
                    <div key={item.id} className={`rounded-2xl border p-3 ${item.completed ? "border-slate-200 bg-slate-50 opacity-60" : "border-blue-100 bg-blue-50"}`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={Boolean(item.completed)} onChange={() => toggleCompleted(item)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-600" />
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-black ${item.completed ? "text-slate-500 line-through" : "text-slate-900"}`}>{item.title}</div>
                          {item.dueDate && <div className="mt-1 text-xs font-bold text-slate-500">📌 {item.dueDate}</div>}
                        </div>
                        <button type="button" onClick={() => deleteItem(item)} className="text-xs font-black text-slate-400">삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

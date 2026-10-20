"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { auth } from "@/lib/firebase";

type SavingsItem = {
  id: string;
  date: string;
  source: string;
  receivedAmount: number | null;
  savedAmount: number;
  memo: string;
};

type SavingsForm = {
  date: string;
  source: string;
  receivedAmount: string;
  savedAmount: string;
  memo: string;
};

type ApiResult = { items?: SavingsItem[]; item?: SavingsItem; ok?: boolean; error?: string };

const todayInSeoul = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const newForm = (): SavingsForm => ({
  date: todayInSeoul(),
  source: "",
  receivedAmount: "",
  savedAmount: "",
  memo: "",
});

const won = (value: number) => value.toLocaleString("ko-KR") + "원";
const INPUT = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100";
const LABEL = "block text-sm font-bold text-slate-700";
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");

export default function HopeSavingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<SavingsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<SavingsForm>(newForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const api = useCallback(async (method: "GET" | "POST" | "PATCH" | "DELETE", payload?: Record<string, unknown>): Promise<ApiResult> => {
    const current = auth.currentUser;
    if (!current) throw new Error("교사 로그인이 필요합니다.");
    const token = await current.getIdToken();
    const response = await fetch("/api/teacher/hope-savings", {
      method,
      cache: "no-store",
      headers: {
        Authorization: "Bearer " + token,
        ...(payload ? { "Content-Type": "application/json" } : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    const data = await response.json() as ApiResult;
    if (!response.ok) throw new Error(data.error || "처리 중 오류가 발생했습니다.");
    return data;
  }, []);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    setError("");
    try {
      const data = await api("GET");
      if (auth.currentUser?.uid === uid) setItems(Array.isArray(data.items) ? data.items : []);
    } catch (cause) {
      if (auth.currentUser?.uid === uid) setError(cause instanceof Error ? cause.message : "저축 기록을 불러오지 못했습니다.");
    } finally {
      if (auth.currentUser?.uid === uid) setLoading(false);
    }
  }, [api]);

  useEffect(() => onAuthStateChanged(auth, current => {
    setUser(current);
    setAuthChecked(true);
    setItems([]);
    setEditingId(null);
    setForm(newForm());
    setError("");
    setMessage("");
    if (current) void load();
    else setLoading(false);
  }), [load]);

  const allTimeTotal = useMemo(() => items.reduce((sum, item) => sum + item.savedAmount, 0), [items]);
  const currentYear = todayInSeoul().slice(0, 4);
  const currentMonth = todayInSeoul().slice(0, 7);
  const yearTotal = useMemo(() => items.filter(item => item.date.startsWith(currentYear))
    .reduce((sum, item) => sum + item.savedAmount, 0), [items, currentYear]);
  const monthTotal = useMemo(() => items.filter(item => item.date.startsWith(currentMonth))
    .reduce((sum, item) => sum + item.savedAmount, 0), [items, currentMonth]);

  const years = useMemo(() =>
    Array.from(new Set([currentYear, ...items.map(item => item.date.slice(0, 4))]))
      .sort((a, b) => b.localeCompare(a)), [items, currentYear]);

  const visible = useMemo(() => items.filter(item =>
    (yearFilter === "all" || item.date.startsWith(yearFilter + "-")) &&
    (monthFilter === "all" || item.date.slice(5, 7) === monthFilter)
  ), [items, yearFilter, monthFilter]);
  const visibleTotal = useMemo(() => visible.reduce((sum, item) => sum + item.savedAmount, 0), [visible]);

  const monthlyTotals = useMemo(() => {
    const sums = new Map<string, number>();
    items.forEach(item => {
      if (yearFilter !== "all" && !item.date.startsWith(yearFilter + "-")) return;
      const key = item.date.slice(0, 7);
      sums.set(key, (sums.get(key) || 0) + item.savedAmount);
    });
    return Array.from(sums.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [items, yearFilter]);

  const updateForm = (key: keyof SavingsForm, value: string) =>
    setForm(previous => ({ ...previous, [key]: value }));

  const startEdit = (item: SavingsItem) => {
    if (busy) return;
    setEditingId(item.id);
    setForm({
      date: item.date,
      source: item.source,
      receivedAmount: item.receivedAmount === null ? "" : String(item.receivedAmount),
      savedAmount: String(item.savedAmount),
      memo: item.memo,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    if (busy) return;
    setEditingId(null);
    setForm(newForm());
    setError("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || loading || !user) return;
    const savedAmount = Number(form.savedAmount);
    if (!Number.isSafeInteger(savedAmount) || savedAmount <= 0) {
      setError("엄마에게 드린 금액을 1원 이상 입력해 주세요.");
      return;
    }
    if (form.receivedAmount !== "" && !Number.isSafeInteger(Number(form.receivedAmount))) {
      setError("수당 금액을 원 단위로 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        date: form.date,
        source: form.source,
        receivedAmount: form.receivedAmount === "" ? null : Number(form.receivedAmount),
        savedAmount,
        memo: form.memo,
      };
      await api(editingId ? "PATCH" : "POST", payload);
      setMessage(editingId ? "기록을 수정했습니다." : "엄마에게 드린 금액을 기록했습니다.");
      setEditingId(null);
      setForm(newForm());
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "기록을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: SavingsItem) => {
    if (busy || loading || !window.confirm(item.date + " · " + won(item.savedAmount) + " 기록을 삭제할까요?")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("DELETE", { id: item.id });
      if (editingId === item.id) {
        setEditingId(null);
        setForm(newForm());
      }
      setMessage("기록을 삭제했습니다. 누적액도 다시 계산되었습니다.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "기록을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#f7f5f7] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.15em] text-rose-500">HOPE SAVINGS</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">💗 희망소망저축</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">수당을 받은 뒤 엄마에게 드린 금액을 차곡차곡 기록합니다.</p>
            </div>
            <Link href="/teacher/manage/operations" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">← 일정 · 운영</Link>
          </div>
        </header>

        {!authChecked && <p className="rounded-2xl bg-white p-5 text-sm text-slate-600">로그인을 확인하고 있습니다.</p>}
        {authChecked && !user && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">
            교사용 로그인이 필요합니다. <Link href="/teacher" className="underline">로그인 페이지로 이동</Link>
          </section>
        )}
        {authChecked && user && (
          <>
            {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</p>}
            {message && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p>}
            {loading && <p className="text-sm font-semibold text-slate-500">저장된 기록을 불러오고 있습니다.</p>}

            <section aria-label="누적 현황" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 rounded-3xl border border-rose-200 bg-rose-50 p-5 sm:col-span-1">
                <p className="text-sm font-bold text-rose-700">전체 누적액</p>
                <p className="mt-2 break-all text-2xl font-black tabular-nums text-rose-900 sm:text-3xl">{won(allTimeTotal)}</p>
                <p className="mt-2 text-xs font-medium text-rose-700">{items.length}건의 기록</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-500">{currentYear}년 누적</p>
                <p className="mt-2 break-all text-xl font-black tabular-nums text-slate-900 sm:text-2xl">{won(yearTotal)}</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-500">이번 달 누적</p>
                <p className="mt-2 break-all text-xl font-black tabular-nums text-slate-900 sm:text-2xl">{won(monthTotal)}</p>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-black text-slate-900">{editingId ? "기록 수정" : "새 금액 기록"}</h2>
                  {editingId && <button type="button" onClick={cancelEdit} disabled={busy} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">수정 취소</button>}
                </div>
                <form onSubmit={save} className="mt-5 space-y-4">
                  <label className={LABEL}>엄마에게 드린 날짜 *
                    <input type="date" required className={INPUT} value={form.date} onChange={e => updateForm("date", e.target.value)} />
                  </label>
                  <label className={LABEL}>수당 출처 (선택)
                    <input maxLength={120} className={INPUT} value={form.source} onChange={e => updateForm("source", e.target.value)} placeholder="예: 원종초 · 방과후 수당" />
                  </label>
                  <label className={LABEL}>받은 수당 (선택 · 원)
                    <input type="text" inputMode="numeric" className={INPUT} value={form.receivedAmount} onChange={e => updateForm("receivedAmount", onlyDigits(e.target.value))} placeholder="예: 200000" />
                  </label>
                  <label className={LABEL}>엄마에게 드린 금액 (원) *
                    <input type="text" inputMode="numeric" required className={INPUT} value={form.savedAmount} onChange={e => updateForm("savedAmount", onlyDigits(e.target.value))} placeholder="예: 30000" />
                  </label>
                  <label className={LABEL}>메모 (선택)
                    <textarea rows={3} maxLength={500} className={INPUT} value={form.memo} onChange={e => updateForm("memo", e.target.value)} placeholder="기록하고 싶은 내용을 적어 주세요." />
                  </label>
                  <p className="text-xs leading-relaxed text-slate-500">입력한 ‘엄마에게 드린 금액’만 누적됩니다. 실제 송금이나 수당·세금 자동 연동은 하지 않습니다.</p>
                  <button type="submit" disabled={busy || loading || !form.date || !form.savedAmount} className="w-full rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
                    {busy ? "저장 중..." : editingId ? "수정 내용 저장" : "+ 저축 기록 저장"}
                  </button>
                </form>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black text-slate-900">누적 기록 내역</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className={LABEL}>연도
                    <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className={INPUT}>
                      <option value="all">전체 연도</option>
                      {years.map(year => <option key={year} value={year}>{year}년</option>)}
                    </select>
                  </label>
                  <label className={LABEL}>월
                    <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className={INPUT}>
                      <option value="all">전체 월</option>
                      {Array.from({ length: 12 }, (_, index) => <option key={index} value={String(index + 1).padStart(2, "0")}>{index + 1}월</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold text-slate-700">선택한 기간 <span className="text-rose-700">{visible.length}건</span></p>
                  <p className="text-base font-black tabular-nums text-slate-900">{won(visibleTotal)}</p>
                </div>
                <div className="mt-4 space-y-3">
                  {!loading && visible.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">이 기간에는 아직 기록이 없습니다.</p>}
                  {visible.map(item => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">{item.date}</p>
                          <p className="mt-1 text-base font-black text-slate-900">{item.source || "수당 출처 미입력"}</p>
                        </div>
                        <p className="text-lg font-black tabular-nums text-rose-700">{won(item.savedAmount)}</p>
                      </div>
                      {item.receivedAmount !== null && <p className="mt-2 text-xs text-slate-600">받은 수당: {won(item.receivedAmount)}</p>}
                      {item.memo && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{item.memo}</p>}
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => startEdit(item)} disabled={busy} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-40">수정</button>
                        <button type="button" onClick={() => void remove(item)} disabled={busy} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-40">삭제</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            {monthlyTotals.length > 0 && (
              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black text-slate-900">월별 누적 내역</h2>
                <p className="mt-1 text-xs text-slate-500">연도 필터에 따라 월별 합계가 표시됩니다.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {monthlyTotals.map(([month, total]) => (
                    <div key={month} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <span className="text-sm font-bold text-slate-600">{month}</span>
                      <span className="text-sm font-black tabular-nums text-slate-900">{won(total)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { auth } from "@/lib/firebase";

type TransactionKind = "deposit" | "withdrawal";
type SavingsItem = {
  id: string;
  date: string;
  kind: TransactionKind;
  savedAmount: number;
  memo: string;
  source?: string; // 이전 버전에서 기록한 출처는 읽기 전용으로 보존
  createdAt?: string;
};
type SavingsForm = {
  date: string;
  kind: TransactionKind;
  amount: string;
  memo: string;
};
type MonthlyTotal = { month: string; deposit: number; withdrawal: number };
type LedgerEntry = SavingsItem & { balanceAfter: number };
type ApiResult = { items?: SavingsItem[]; item?: SavingsItem; ok?: boolean; error?: string };

const todayInSeoul = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const newForm = (): SavingsForm => ({ date: todayInSeoul(), kind: "deposit", amount: "", memo: "" });
const won = (value: number) => value.toLocaleString("ko-KR") + "원";
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");
const INPUT = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100";
const LABEL = "block text-sm font-bold text-slate-700";
const kindLabel = (kind: TransactionKind) => kind === "deposit" ? "엄마에게 준 돈" : "다시 받아온 돈";

const calculateLedger = (items: SavingsItem[]): LedgerEntry[] => {
  let balance = 0;
  return [...items]
    .sort((a, b) => a.date.localeCompare(b.date) ||
      (a.createdAt || "").localeCompare(b.createdAt || "") || a.id.localeCompare(b.id))
    .map(item => {
      balance += item.kind === "withdrawal" ? -item.savedAmount : item.savedAmount;
      return { ...item, balanceAfter: balance };
    }).reverse();
};

export default function HopeSavingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<SavingsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<SavingsForm>(newForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const api = useCallback(async (
    method: "GET" | "POST" | "PATCH" | "DELETE",
    payload?: Record<string, unknown>
  ): Promise<ApiResult> => {
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
    if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
    return data;
  }, []);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    setError("");
    try {
      const data = await api("GET");
      if (auth.currentUser?.uid === uid) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setLoaded(true);
      }
    } catch (cause) {
      if (auth.currentUser?.uid === uid) {
        setError(cause instanceof Error ? cause.message : "저축 기록을 불러오지 못했습니다.");
      }
    } finally {
      if (auth.currentUser?.uid === uid) setLoading(false);
    }
  }, [api]);

  useEffect(() => onAuthStateChanged(auth, current => {
    setUser(current);
    setAuthChecked(true);
    setItems([]);
    setLoaded(false);
    setEditingId(null);
    setForm(newForm());
    setError("");
    setMessage("");
    if (current) void load();
    else setLoading(false);
  }), [load]);

  const ledger = useMemo(() => calculateLedger(items), [items]);
  const deposits = useMemo(() => items.filter(item => item.kind !== "withdrawal")
    .reduce((sum, item) => sum + item.savedAmount, 0), [items]);
  const withdrawals = useMemo(() => items.filter(item => item.kind === "withdrawal")
    .reduce((sum, item) => sum + item.savedAmount, 0), [items]);
  const balance = deposits - withdrawals;

  const currentYear = todayInSeoul().slice(0, 4);
  const years = useMemo(() =>
    Array.from(new Set([currentYear, ...items.map(item => item.date.slice(0, 4))]))
      .sort((a, b) => b.localeCompare(a)), [items, currentYear]);

  const visible = useMemo(() => ledger.filter(item =>
    (yearFilter === "all" || item.date.startsWith(yearFilter + "-")) &&
    (monthFilter === "all" || item.date.slice(5, 7) === monthFilter)
  ), [ledger, yearFilter, monthFilter]);

  const visibleDeposits = useMemo(() => visible.filter(item => item.kind !== "withdrawal")
    .reduce((sum, item) => sum + item.savedAmount, 0), [visible]);
  const visibleWithdrawals = useMemo(() => visible.filter(item => item.kind === "withdrawal")
    .reduce((sum, item) => sum + item.savedAmount, 0), [visible]);

  const monthlyTotals = useMemo(() => {
    const sums = new Map<string, MonthlyTotal>();
    for (const item of items) {
      if (yearFilter !== "all" && !item.date.startsWith(yearFilter + "-")) continue;
      const month = item.date.slice(0, 7);
      const previous = sums.get(month) || { month, deposit: 0, withdrawal: 0 };
      if (item.kind === "withdrawal") previous.withdrawal += item.savedAmount;
      else previous.deposit += item.savedAmount;
      sums.set(month, previous);
    }
    return Array.from(sums.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [items, yearFilter]);

  const updateForm = (key: keyof SavingsForm, value: string) =>
    setForm(previous => ({ ...previous, [key]: value }));

  const startEdit = (item: SavingsItem) => {
    if (busy) return;
    setEditingId(item.id);
    setForm({ date: item.date, kind: item.kind, amount: String(item.savedAmount), memo: item.memo });
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
    if (busy || loading || !loaded || !user) return;
    const amount = Number(form.amount);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000_000_000) {
      setError("거래 금액을 1원 이상, 1조 원 이하로 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(editingId ? "PATCH" : "POST", {
        ...(editingId ? { id: editingId } : {}),
        date: form.date,
        kind: form.kind,
        savedAmount: amount,
        memo: form.memo,
      });
      setMessage(editingId ? "거래 기록을 수정했습니다." : kindLabel(form.kind) + "을(를) 기록했습니다.");
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
    if (busy || loading || !window.confirm(item.date + " · " + kindLabel(item.kind) + " " + won(item.savedAmount) + " 기록을 삭제할까요?")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("DELETE", { id: item.id });
      if (editingId === item.id) {
        setEditingId(null);
        setForm(newForm());
      }
      setMessage("거래 기록을 삭제했습니다. 잔액을 다시 계산했습니다.");
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
              <p className="text-xs font-black tracking-[0.15em] text-rose-500">HOPE SAVINGS PASSBOOK</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">💗 희망소망저축</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">엄마에게 맡겼다가 필요할 때 돌려받는 돈을 기록하는 나만의 가상 통장입니다.</p>
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
            {loading && <p role="status" className="text-sm font-semibold text-slate-500">저장된 통장 내역을 불러오고 있습니다.</p>}

            {loaded && <>
              <section aria-label="통장 잔액 현황" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 rounded-3xl border border-rose-200 bg-rose-50 p-5 sm:col-span-1">
                  <p className="text-sm font-bold text-rose-700">현재 맡겨둔 잔액</p>
                  <p className="mt-2 break-all text-2xl font-black tabular-nums text-rose-900 sm:text-3xl">{won(balance)}</p>
                  <p className="mt-2 text-xs font-medium text-rose-700">준 돈 − 다시 받아온 돈</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">엄마에게 준 돈 · 누계</p>
                  <p className="mt-2 break-all text-xl font-black tabular-nums text-rose-700 sm:text-2xl">+ {won(deposits)}</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">다시 받아온 돈 · 누계</p>
                  <p className="mt-2 break-all text-xl font-black tabular-nums text-blue-700 sm:text-2xl">− {won(withdrawals)}</p>
                </div>
              </section>

              {balance < 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                기록된 출금액이 입금액보다 많습니다. 이전에 맡긴 금액 중 누락된 기록이 있는지 확인해 주세요.
              </p>}

              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
                <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-black text-slate-900">{editingId ? "거래 수정" : "입출금 기록"}</h2>
                    {editingId && <button type="button" onClick={cancelEdit} disabled={busy} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">수정 취소</button>}
                  </div>
                  <form onSubmit={save} className="mt-5 space-y-4">
                    <fieldset>
                      <legend className={LABEL}>거래 종류 *</legend>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className={form.kind === "deposit"
                          ? "cursor-pointer rounded-xl border-2 border-rose-500 bg-rose-50 px-3 py-4 text-center text-sm font-black text-rose-800"
                          : "cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-bold text-slate-600"}>
                          <input type="radio" name="kind" value="deposit" checked={form.kind === "deposit"} onChange={() => updateForm("kind", "deposit")} className="sr-only" />
                          + 엄마에게 준 돈
                        </label>
                        <label className={form.kind === "withdrawal"
                          ? "cursor-pointer rounded-xl border-2 border-blue-500 bg-blue-50 px-3 py-4 text-center text-sm font-black text-blue-800"
                          : "cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-bold text-slate-600"}>
                          <input type="radio" name="kind" value="withdrawal" checked={form.kind === "withdrawal"} onChange={() => updateForm("kind", "withdrawal")} className="sr-only" />
                          − 다시 받아온 돈
                        </label>
                      </div>
                    </fieldset>
                    <label className={LABEL}>거래 날짜 *
                      <input type="date" required className={INPUT} value={form.date} onChange={e => updateForm("date", e.target.value)} />
                    </label>
                    <label className={LABEL}>{kindLabel(form.kind)} (원) *
                      <input type="text" inputMode="numeric" required className={INPUT} value={form.amount} onChange={e => updateForm("amount", onlyDigits(e.target.value))} placeholder="예: 30000" />
                    </label>
                    <label className={LABEL}>메모 (선택)
                      <textarea rows={3} maxLength={500} className={INPUT} value={form.memo} onChange={e => updateForm("memo", e.target.value)} placeholder="예: 생활비가 필요해서 돌려받음" />
                    </label>
                    <p className="text-xs leading-relaxed text-slate-500">가상 통장 기록용이며 실제 계좌에서 돈이 이체되지는 않습니다. 받은 수당은 따로 입력하지 않습니다.</p>
                    <button type="submit" disabled={busy || loading || !form.date || !form.amount} className="w-full rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
                      {busy ? "저장 중..." : editingId ? "거래 수정 저장" : "+ 거래 기록 저장"}
                    </button>
                  </form>
                </section>

                <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-black text-slate-900">통장 거래 내역</h2>
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
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-600">선택 기간 · {visible.length}건</p>
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm font-black">
                      <span className="text-rose-700">입금 +{won(visibleDeposits)}</span>
                      <span className="text-blue-700">출금 −{won(visibleWithdrawals)}</span>
                    </div>
                    <p className="mt-2 border-t border-slate-200 pt-2 text-right text-sm font-bold text-slate-700">기간 순변동: {won(visibleDeposits - visibleWithdrawals)}</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {visible.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                      {items.length ? "선택한 기간에 거래 기록이 없습니다." : "아직 기록이 없습니다. 엄마에게 준 돈부터 등록해 주세요."}
                    </p>}
                    {visible.map(item => (
                      <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-500">{item.date}</p>
                            <p className="mt-1 text-sm font-black text-slate-900">{kindLabel(item.kind)}</p>
                          </div>
                          <p className={"text-lg font-black tabular-nums " + (item.kind === "deposit" ? "text-rose-700" : "text-blue-700")}>
                            {item.kind === "deposit" ? "+" : "−"} {won(item.savedAmount)}
                          </p>
                        </div>
                        {item.source && <p className="mt-2 text-xs text-slate-500">이전 기록: {item.source}</p>}
                        {item.memo && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{item.memo}</p>}
                        <p className="mt-3 border-t border-slate-100 pt-2 text-right text-xs font-bold text-slate-600">거래 후 잔액 <span className="text-sm font-black text-slate-900">{won(item.balanceAfter)}</span></p>
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
                  <h2 className="text-lg font-black text-slate-900">월별 입출금</h2>
                  <p className="mt-1 text-xs text-slate-500">연도를 선택하면 해당 연도의 월별 합계가 나옵니다.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {monthlyTotals.map(item => (
                      <div key={item.month} className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-900">{item.month}</p>
                        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs font-bold">
                          <span className="text-rose-700">입금 +{won(item.deposit)}</span>
                          <span className="text-blue-700">출금 −{won(item.withdrawal)}</span>
                        </div>
                        <p className="mt-2 text-right text-sm font-black text-slate-700">순변동 {won(item.deposit - item.withdrawal)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>}
          </>
        )}
      </div>
    </main>
  );
}

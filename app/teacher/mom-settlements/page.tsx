"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { auth } from "@/lib/firebase";

type Source = "activity-support" | "mom-part-time" | "custom";
type MomItem = {
  id: string;
  source: Source;
  allowanceName: string;
  receivedDate: string;
  receivedAmount: number;
  paidAmount: number;
  paidDate: string;
  memo: string;
  createdAt?: string;
};
type FormState = {
  source: Source;
  allowanceName: string;
  receivedDate: string;
  receivedAmount: string;
  paidAmount: string;
  paidDate: string;
  memo: string;
};
type ApiResult = { items?: MomItem[]; item?: MomItem; ok?: boolean; error?: string };

const SOURCE_OPTIONS: { id: Source; name: string }[] = [
  { id: "activity-support", name: "활동보조" },
  { id: "mom-part-time", name: "엄마알바비" },
  { id: "custom", name: "직접입력" },
];

const todaySeoul = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const initialForm = (): FormState => ({
  source: "activity-support",
  allowanceName: "활동보조",
  receivedDate: todaySeoul(),
  receivedAmount: "",
  paidAmount: "",
  paidDate: "",
  memo: "",
});

const won = (amount: number) => amount.toLocaleString("ko-KR") + "원";
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");
const INPUT = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const LABEL = "block text-sm font-bold text-slate-700";
const sourceName = (source: Source) => SOURCE_OPTIONS.find(option => option.id === source)?.name || "직접입력";

export default function MomSettlementsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<MomItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const request = useCallback(async (
    method: "GET" | "POST" | "PATCH" | "DELETE",
    payload?: Record<string, unknown>,
  ): Promise<ApiResult> => {
    const current = auth.currentUser;
    if (!current) throw new Error("교사 로그인이 필요합니다.");
    const token = await current.getIdToken();
    const response = await fetch("/api/teacher/mom-settlements", {
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
      const data = await request("GET");
      if (auth.currentUser?.uid === uid) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setLoaded(true);
      }
    } catch (cause) {
      if (auth.currentUser?.uid === uid) {
        setError(cause instanceof Error ? cause.message : "정산 내역을 불러오지 못했습니다.");
      }
    } finally {
      if (auth.currentUser?.uid === uid) setLoading(false);
    }
  }, [request]);

  useEffect(() => onAuthStateChanged(auth, current => {
    setUser(current);
    setAuthChecked(true);
    setItems([]);
    setLoaded(false);
    setEditingId(null);
    setForm(initialForm());
    setError("");
    setMessage("");
    if (current) void load();
    else setLoading(false);
  }), [load]);

  const summary = useMemo(() => items.reduce((total, item) => ({
    received: total.received + item.receivedAmount,
    paid: total.paid + item.paidAmount,
  }), { received: 0, paid: 0 }), [items]);

  const years = useMemo(() =>
    Array.from(new Set([todaySeoul().slice(0, 4), ...items.map(item => item.receivedDate.slice(0, 4))]))
      .sort((a, b) => b.localeCompare(a)), [items]);

  const visible = useMemo(() => [...items]
    .filter(item => (yearFilter === "all" || item.receivedDate.startsWith(yearFilter + "-")) &&
      (monthFilter === "all" || item.receivedDate.slice(5, 7) === monthFilter) &&
      (sourceFilter === "all" || item.source === sourceFilter))
    .sort((a, b) => b.receivedDate.localeCompare(a.receivedDate) ||
      (b.createdAt || "").localeCompare(a.createdAt || "") || b.id.localeCompare(a.id)),
  [items, yearFilter, monthFilter, sourceFilter]);

  const visibleSummary = useMemo(() => visible.reduce((total, item) => ({
    received: total.received + item.receivedAmount,
    paid: total.paid + item.paidAmount,
  }), { received: 0, paid: 0 }), [visible]);

  const setField = (key: keyof FormState, value: string) =>
    setForm(previous => ({ ...previous, [key]: value }));

  const chooseSource = (source: Source) => {
    setForm(previous => ({
      ...previous,
      source,
      allowanceName: source === "custom" ? "" : sourceName(source),
    }));
  };

  const changePaidAmount = (value: string) => {
    const digits = onlyDigits(value);
    setForm(previous => ({
      ...previous,
      paidAmount: digits,
      paidDate: Number(digits) > 0 ? (previous.paidDate || todaySeoul()) : "",
    }));
  };

  const startEdit = (item: MomItem) => {
    if (busy) return;
    setEditingId(item.id);
    setForm({
      source: item.source,
      allowanceName: item.allowanceName,
      receivedDate: item.receivedDate,
      receivedAmount: String(item.receivedAmount),
      paidAmount: item.paidAmount ? String(item.paidAmount) : "",
      paidDate: item.paidDate,
      memo: item.memo,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetEdit = () => {
    if (busy) return;
    setEditingId(null);
    setForm(initialForm());
    setError("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || loading || !loaded || !user) return;
    const receivedAmount = Number(form.receivedAmount);
    const paidAmount = Number(form.paidAmount || "0");
    if (!Number.isSafeInteger(receivedAmount) || receivedAmount < 1 || receivedAmount > 1_000_000_000_000) {
      setError("수당 입금금액을 1원 이상으로 입력해 주세요.");
      return;
    }
    if (!Number.isSafeInteger(paidAmount) || paidAmount < 0 || paidAmount > receivedAmount) {
      setError("지급금액은 0원 이상이고 해당 수당의 입금액을 넘을 수 없습니다.");
      return;
    }
    if (!form.allowanceName.trim()) {
      setError("수당 이름을 입력해 주세요.");
      return;
    }
    if (paidAmount > 0 && !form.paidDate) {
      setError("엄마에게 지급한 날짜를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(editingId ? "PATCH" : "POST", {
        ...(editingId ? { id: editingId } : {}),
        source: form.source,
        allowanceName: form.allowanceName.trim(),
        receivedDate: form.receivedDate,
        receivedAmount,
        paidAmount,
        paidDate: paidAmount > 0 ? form.paidDate : "",
        memo: form.memo,
      });
      setMessage(editingId ? "정산 내역을 수정했습니다." : "엄마 수당 정산을 저장했습니다.");
      setEditingId(null);
      setForm(initialForm());
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "정산 내역을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: MomItem) => {
    if (busy || loading || !window.confirm(item.allowanceName + " · " + won(item.receivedAmount) + " 정산을 삭제할까요?")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request("DELETE", { id: item.id });
      if (editingId === item.id) {
        setEditingId(null);
        setForm(initialForm());
      }
      setMessage("정산 기록을 삭제했습니다.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "정산 기록을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remaining = Number(form.receivedAmount || "0") - Number(form.paidAmount || "0");

  return (
    <main className="min-h-[100dvh] bg-[#f6f7fb] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-indigo-500">MOM SETTLEMENT</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">💜 Mom 정산</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                내 계좌로 들어온 엄마의 수당과 실제 엄마에게 전달한 돈을 별도로 기록합니다.
              </p>
            </div>
            <Link href="/teacher/manage/operations" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">← 일정 · 운영</Link>
          </div>
        </header>

        {!authChecked && <p className="rounded-2xl bg-white p-5 text-sm text-slate-600">로그인을 확인하는 중입니다.</p>}
        {authChecked && !user && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">
            교사용 로그인이 필요합니다. <Link href="/teacher" className="underline">로그인 화면으로 이동</Link>
          </section>
        )}
        {authChecked && user && (
          <>
            {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</p>}
            {message && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p>}
            {loading && <p role="status" className="text-sm text-slate-500">저장된 정산 내역을 불러오는 중입니다.</p>}

            {loaded && (
              <>
                <section aria-label="Mom 정산 누계" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="col-span-2 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 sm:col-span-1">
                    <p className="text-sm font-bold text-indigo-800">아직 엄마에게 전달할 돈</p>
                    <p className="mt-2 break-all text-2xl font-black tabular-nums text-indigo-900 sm:text-3xl">{won(summary.received - summary.paid)}</p>
                    <p className="mt-2 text-xs font-medium text-indigo-700">전체 입금액 − 전체 지급액</p>
                  </div>
                  <div className="rounded-3xl bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-slate-500">수당 입금액 · 누계</p>
                    <p className="mt-2 break-all text-xl font-black tabular-nums text-slate-900 sm:text-2xl">{won(summary.received)}</p>
                  </div>
                  <div className="rounded-3xl bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-slate-500">엄마에게 지급 · 누계</p>
                    <p className="mt-2 break-all text-xl font-black tabular-nums text-teal-700 sm:text-2xl">{won(summary.paid)}</p>
                  </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-black text-slate-900">{editingId ? "수당 정산 수정" : "수당 정산 등록"}</h2>
                      {editingId && <button type="button" onClick={resetEdit} disabled={busy} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">수정 취소</button>}
                    </div>
                    <form onSubmit={save} className="mt-5 space-y-4">
                      <fieldset>
                        <legend className={LABEL}>수당 출처 *</legend>
                        <p className="mt-1 text-xs text-slate-500">하나를 체크하면 수당 이름에 자동으로 반영됩니다.</p>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {SOURCE_OPTIONS.map(option => (
                            <label key={option.id} className={"flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold sm:text-sm " +
                              (form.source === option.id ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-slate-50 text-slate-600")}>
                              <input
                                type="checkbox"
                                checked={form.source === option.id}
                                onChange={() => chooseSource(option.id)}
                                className="h-4 w-4 accent-indigo-600"
                              />
                              {option.name}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <label className={LABEL}>수당 이름 *
                        <input
                          type="text"
                          required
                          maxLength={100}
                          readOnly={form.source !== "custom"}
                          value={form.allowanceName}
                          onChange={event => setField("allowanceName", event.target.value)}
                          placeholder={form.source === "custom" ? "예: 10월 행사 수당" : ""}
                          className={INPUT + (form.source !== "custom" ? " bg-slate-100" : "")}
                        />
                      </label>
                      <label className={LABEL}>수당 입금일 *
                        <input type="date" required value={form.receivedDate} onChange={event => setField("receivedDate", event.target.value)} className={INPUT} />
                      </label>
                      <label className={LABEL}>수당 입금금액 (원) *
                        <input type="text" inputMode="numeric" required value={form.receivedAmount} onChange={event => setField("receivedAmount", onlyDigits(event.target.value))} placeholder="예: 800000" className={INPUT} />
                      </label>
                      <label className={LABEL}>수당 지급금액 · 엄마에게 준 돈 (원)
                        <input type="text" inputMode="numeric" value={form.paidAmount} onChange={event => changePaidAmount(event.target.value)} placeholder="아직 안 드렸으면 0원" className={INPUT} />
                      </label>
                      {Number(form.paidAmount || "0") > 0 && (
                        <label className={LABEL}>엄마에게 지급한 날짜 *
                          <input type="date" required value={form.paidDate} onChange={event => setField("paidDate", event.target.value)} className={INPUT} />
                        </label>
                      )}
                      <div className="rounded-2xl bg-indigo-50 px-4 py-3">
                        <p className="text-xs font-bold text-indigo-700">이번 수당에서 아직 전달하지 않은 금액</p>
                        <p className={"mt-1 text-xl font-black tabular-nums " + (remaining < 0 ? "text-red-700" : "text-indigo-900")}>{won(remaining)}</p>
                        {remaining < 0 && <p className="mt-1 text-xs font-bold text-red-700">지급금액이 입금액을 초과했습니다.</p>}
                      </div>
                      <label className={LABEL}>메모 (선택)
                        <textarea rows={2} maxLength={500} value={form.memo} onChange={event => setField("memo", event.target.value)} placeholder="예: 이번 달은 절반만 전달" className={INPUT} />
                      </label>
                      <p className="text-xs leading-relaxed text-slate-500">
                        미지급액이 남았다면 나중에 해당 기록의 ‘수정’에서 지급금액을 누적해서 변경할 수 있습니다.
                        이 카드는 기록용이며 실제 계좌이체나 희망소망저축 장부에 자동 반영되지 않습니다.
                      </p>
                      <button type="submit" disabled={busy || loading || !form.receivedAmount || !form.allowanceName.trim() || remaining < 0} className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
                        {busy ? "저장 중..." : editingId ? "정산 변경사항 저장" : "+ Mom 정산 저장"}
                      </button>
                    </form>
                  </section>

                  <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-lg font-black text-slate-900">수당별 정산 내역</h2>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <label className={LABEL}>연도
                        <select value={yearFilter} onChange={event => setYearFilter(event.target.value)} className={INPUT}>
                          <option value="all">전체</option>
                          {years.map(year => <option key={year} value={year}>{year}년</option>)}
                        </select>
                      </label>
                      <label className={LABEL}>월
                        <select value={monthFilter} onChange={event => setMonthFilter(event.target.value)} className={INPUT}>
                          <option value="all">전체</option>
                          {Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{i + 1}월</option>)}
                        </select>
                      </label>
                      <label className={LABEL}>출처
                        <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)} className={INPUT}>
                          <option value="all">전체</option>
                          {SOURCE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-500">선택 기간 · {visible.length}건 (입금일 기준)</p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm font-black text-slate-800">
                        <span>입금 {won(visibleSummary.received)}</span>
                        <span>지급 {won(visibleSummary.paid)}</span>
                      </div>
                      <p className="mt-2 border-t border-slate-200 pt-2 text-sm font-black text-indigo-800">미지급 {won(visibleSummary.received - visibleSummary.paid)}</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {visible.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                          {items.length ? "해당 조건의 정산 기록이 없습니다." : "아직 기록이 없습니다. 첫 엄마 수당을 등록해 주세요."}
                        </p>
                      )}
                      {visible.map(item => {
                        const pending = item.receivedAmount - item.paidAmount;
                        return (
                          <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-slate-500">{item.receivedDate} · {sourceName(item.source)}</p>
                                <p className="mt-1 text-base font-black text-slate-900">{item.allowanceName}</p>
                              </div>
                              <span className={"rounded-full px-3 py-1 text-xs font-black " + (pending === 0 ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800")}>
                                {pending === 0 ? "지급완료" : "미지급 있음"}
                              </span>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                              <div><dt className="text-xs font-bold text-slate-500">수당 입금</dt><dd className="mt-1 font-black tabular-nums text-slate-900">{won(item.receivedAmount)}</dd></div>
                              <div><dt className="text-xs font-bold text-slate-500">엄마에게 지급</dt><dd className="mt-1 font-black tabular-nums text-teal-700">{won(item.paidAmount)}</dd></div>
                              <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
                                <dt className="text-xs font-bold text-slate-500">남은 지급액</dt>
                                <dd className="font-black tabular-nums text-indigo-800">{won(pending)}</dd>
                              </div>
                            </dl>
                            {item.paidAmount > 0 && <p className="mt-2 text-xs text-slate-500">지급일: {item.paidDate}</p>}
                            {item.memo && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{item.memo}</p>}
                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={() => startEdit(item)} disabled={busy} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800">수정 · 추가 지급 기록</button>
                              <button type="button" onClick={() => void remove(item)} disabled={busy} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">삭제</button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

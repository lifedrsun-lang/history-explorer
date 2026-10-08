"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  calculateIndustryIncome,
  calculateTaxEstimate,
  getSimpleExpenseEligibility,
  PERSONAL_SERVICE_BASIC_BAND,
} from "@/lib/incomeTax";

type PaymentRecord = {
  id: string;
  contractId: string;
  settlementKey: string;
  contractLabel: string;
  payerName: string;
  industryCode: string;
  taxYear: number;
  receivedDate: string;
  grossAmount: number;
  incomeTax: number;
  localTax: number;
  employmentInsurance: number;
  industrialInsurance: number;
  taxWasEstimated: boolean;
  metadataConfirmed: boolean;
};

type ContractProfile = {
  id: string;
  label: string;
  payerName: string;
  industryCode: string;
  profileSaved: boolean;
};

type Adjustments = {
  previousYearRevenue: number | null;
  otherIncome: number;
  incomeDeduction: number;
  taxCredit: number;
  localTaxCredit: number;
  additionalPrepaidIncomeTax: number;
  additionalPrepaidLocalTax: number;
};

const EMPTY_ADJUSTMENTS: Adjustments = {
  previousYearRevenue: null,
  otherIncome: 0,
  incomeDeduction: 0,
  taxCredit: 0,
  localTaxCredit: 0,
  additionalPrepaidIncomeTax: 0,
  additionalPrepaidLocalTax: 0,
};

const INDUSTRIES = [
  { code: "940925", label: "방과후강사 (940925)" },
  { code: "940908", label: "웅진씽크빅·방문판매원 (940908)" },
] as const;

const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const signedWon = (value: number) =>
  value > 0 ? `${won(value)} 납부 예상` : value < 0 ? `${won(Math.abs(value))} 환급 예상` : "0원";
const inputNumber = (value: string) => {
  const number = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

export default function IncomeTaxPage() {
  const currentYear = new Date().getFullYear();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [year, setYear] = useState(currentYear);
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [contracts, setContracts] = useState<ContractProfile[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustments>(EMPTY_ADJUSTMENTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setAuthChecked(true);
  }), []);

  const requestJson = useCallback(async (url: string, init?: RequestInit) => {
    if (!auth.currentUser) throw new Error("교사 로그인이 필요합니다.");
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "요청을 처리하지 못했습니다.");
    return data;
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await requestJson(`/api/teacher/income-tax?year=${year}`);
      setRecords(Array.isArray(data.records) ? data.records : []);
      setContracts(Array.isArray(data.contracts) ? data.contracts : []);
      setAdjustments({ ...EMPTY_ADJUSTMENTS, ...(data.adjustments || {}) });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "자료를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [requestJson, user, year]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const industryCalculations = useMemo(
    () => calculateIndustryIncome(year, records),
    [records, year]
  );
  const totals = useMemo(() => {
    const totalGross = records.reduce((sum, record) => sum + record.grossAmount, 0);
    const classifiedGross = industryCalculations.reduce(
      (sum, item) => sum + item.grossAmount,
      0
    );
    const businessIncome = industryCalculations.reduce(
      (sum, item) => sum + item.businessIncome,
      0
    );
    const prepaidIncomeTax =
      records.reduce((sum, record) => sum + record.incomeTax, 0) +
      adjustments.additionalPrepaidIncomeTax;
    const prepaidLocalTax =
      records.reduce((sum, record) => sum + record.localTax, 0) +
      adjustments.additionalPrepaidLocalTax;
    const employmentInsurance = records.reduce(
      (sum, record) => sum + record.employmentInsurance,
      0
    );
    const industrialInsurance = records.reduce(
      (sum, record) => sum + record.industrialInsurance,
      0
    );
    return {
      totalGross,
      unclassifiedGross: totalGross - classifiedGross,
      businessIncome,
      prepaidIncomeTax,
      prepaidLocalTax,
      employmentInsurance,
      industrialInsurance,
    };
  }, [adjustments, industryCalculations, records]);
  const estimate = useMemo(
    () => calculateTaxEstimate({
      businessIncome: totals.businessIncome,
      otherIncome: adjustments.otherIncome,
      incomeDeduction: adjustments.incomeDeduction,
      taxCredit: adjustments.taxCredit,
      localTaxCredit: adjustments.localTaxCredit,
      prepaidIncomeTax: totals.prepaidIncomeTax,
      prepaidLocalTax: totals.prepaidLocalTax,
    }),
    [adjustments, totals]
  );
  const eligibility = getSimpleExpenseEligibility(
    totals.totalGross,
    adjustments.previousYearRevenue
  );

  const setAdjustment = (key: keyof Adjustments, value: number | null) => {
    setAdjustments((current) => ({ ...current, [key]: value }));
  };

  const saveAdjustments = async () => {
    setSaving("adjustments");
    setError("");
    try {
      await requestJson("/api/teacher/income-tax", {
        method: "PATCH",
        body: JSON.stringify({ action: "saveAdjustments", year, adjustments }),
      });
      setMessage("공제·세액 입력값을 저장했습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장하지 못했습니다.");
    } finally {
      setSaving("");
    }
  };

  const updateContract = (id: string, patch: Partial<ContractProfile>) => {
    setContracts((current) =>
      current.map((contract) => contract.id === id ? { ...contract, ...patch } : contract)
    );
  };

  const saveProfile = async (contract: ContractProfile, applyToExisting: boolean) => {
    if (
      applyToExisting &&
      !window.confirm("이 업체의 기존 지급 기록에도 업종코드와 귀속연도를 일괄 저장할까요?")
    ) return;

    setSaving(`profile:${contract.id}`);
    setError("");
    try {
      await requestJson("/api/teacher/income-tax", {
        method: "PATCH",
        body: JSON.stringify({
          action: "saveProfile",
          contractId: contract.id,
          profile: {
            payerName: contract.payerName,
            industryCode: contract.industryCode,
          },
          applyToExisting,
        }),
      });
      setMessage(applyToExisting ? "업체 설정과 기존 기록을 반영했습니다." : "업체 설정을 저장했습니다.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "업체 설정을 저장하지 못했습니다.");
    } finally {
      setSaving("");
    }
  };

  const updateRecord = (id: string, patch: Partial<PaymentRecord>) => {
    setRecords((current) =>
      current.map((record) => record.id === id ? { ...record, ...patch } : record)
    );
  };

  const saveRecord = async (record: PaymentRecord) => {
    setSaving(`record:${record.id}`);
    setError("");
    try {
      await requestJson("/api/teacher/income-tax", {
        method: "PATCH",
        body: JSON.stringify({
          action: "saveRecordMetadata",
          contractId: record.contractId,
          settlementKey: record.settlementKey,
          payerName: record.payerName,
          industryCode: record.industryCode,
          taxYear: record.taxYear,
        }),
      });
      setMessage("지급 기록의 귀속연도와 업종코드를 저장했습니다.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "지급 기록을 저장하지 못했습니다.");
    } finally {
      setSaving("");
    }
  };

  if (authChecked && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="text-4xl">🔐</div>
          <h1 className="mt-4 text-xl font-black text-slate-900">교사 로그인이 필요합니다</h1>
          <Link href="/teacher" className="mt-5 inline-block rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white">교사 로그인으로 이동</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[28px] bg-gradient-to-br from-emerald-700 to-teal-600 p-5 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/teacher" className="text-sm font-black text-emerald-100">← 교사용 홈</Link>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">💰 종합소득세 예상 계산</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-emerald-50">
                입금관리의 세전 수당과 원천징수액을 자동 집계하고, 업종별 단순경비율과 직접 입력한 공제액으로 예상 세액을 계산합니다.
              </p>
            </div>
            <label className="rounded-2xl bg-white/15 p-3 text-sm font-black">
              귀속연도
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="ml-2 rounded-xl bg-white px-3 py-2 text-slate-900"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((item) => (
                  <option key={item} value={item}>{item}년</option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {year > 2025 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-bold leading-relaxed text-amber-900">
            ⚠️ {year}년 귀속 단순경비율은 아직 확정 공표 전입니다. 최신 확정치인 2025년 귀속률을 잠정 참고값으로 사용하며, 확정 신고 전 반드시 국세청 자료를 다시 확인하세요.
          </div>
        )}
        {message && (
          <button type="button" onClick={() => setMessage("")} className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-left text-sm font-black text-emerald-800">
            ✓ {message}
          </button>
        )}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700">{error}</div>}

        {loading ? (
          <div className="rounded-3xl bg-white p-10 text-center font-black text-slate-400 shadow-sm">입금 기록을 집계하는 중입니다…</div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["세전 총수입", won(totals.totalGross), `${records.length}건`],
                ["단순경비율 후 사업소득", won(totals.businessIncome), "보험료 중복 공제 없음"],
                ["기납부 원천세", won(totals.prepaidIncomeTax + totals.prepaidLocalTax), "소득세 + 지방소득세"],
                ["보험료 별도 합계", won(totals.employmentInsurance + totals.industrialInsurance), `고용 ${won(totals.employmentInsurance)} · 산재 ${won(totals.industrialInsurance)}`],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black text-slate-500">{label}</div>
                  <div className="mt-2 text-xl font-black text-slate-900">{value}</div>
                  <div className="mt-2 text-xs font-bold text-slate-400">{detail}</div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">단순경비율 검증</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">업종코드별 총수입에 4,000만원 기본·초과 구간을 각각 적용합니다.</p>
                </div>
                <span className={`rounded-full px-4 py-2 text-xs font-black ${eligibility.eligible === true ? "bg-emerald-100 text-emerald-800" : eligibility.eligible === false ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                  {eligibility.eligible === true ? "적용 가능 범위" : eligibility.eligible === false ? "적용요건 재확인 필요" : "직전연도 입력 필요"}
                </span>
              </div>
              <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{eligibility.reason}</p>
              {totals.unclassifiedGross > 0 && (
                <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                  업종 미확정 수입 {won(totals.unclassifiedGross)}은 사업소득 계산에서 제외했습니다. 아래 지급 기록에서 업종코드를 확인해 주세요.
                </p>
              )}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {industryCalculations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-bold text-slate-500">확정된 업종코드의 수입 기록이 없습니다.</div>
                ) : industryCalculations.map((item) => (
                  <div key={item.code} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                    <div className="font-black text-emerald-950">{item.label} · {item.code}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold text-slate-600">
                      <span>총수입 {won(item.grossAmount)}</span>
                      <span>필요경비 {won(item.expenseAmount)}</span>
                      <span>기본 {won(item.basicBandAmount)} × {item.generalRate}%</span>
                      <span>초과 {won(item.excessBandAmount)} × {item.excessRate}%</span>
                    </div>
                    <div className="mt-3 border-t border-emerald-200 pt-3 text-right font-black text-emerald-900">사업소득 {won(item.businessIncome)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs font-bold leading-relaxed text-slate-500">
                기준: 국세청 2024·2025년 귀속 경비율 고시. 서로 다른 업종은 코드별 수입과 경비율을 분리 계산하고, 단순경비율 적용요건의 수입 기준은 합산해 확인합니다. 기본구간은 코드별 {won(PERSONAL_SERVICE_BASIC_BAND)}입니다.
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-black">공제·추가소득 직접 입력</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">증빙과 실제 신고 조건에 맞는 금액만 입력하세요.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    ["previousYearRevenue", "직전연도 인적용역 수입", adjustments.previousYearRevenue],
                    ["otherIncome", "기타 소득금액", adjustments.otherIncome],
                    ["incomeDeduction", "소득공제 합계", adjustments.incomeDeduction],
                    ["taxCredit", "소득세 세액공제", adjustments.taxCredit],
                    ["localTaxCredit", "지방소득세 세액공제", adjustments.localTaxCredit],
                    ["additionalPrepaidIncomeTax", "추가 기납부 소득세", adjustments.additionalPrepaidIncomeTax],
                    ["additionalPrepaidLocalTax", "추가 기납부 지방소득세", adjustments.additionalPrepaidLocalTax],
                  ].map(([key, label, value]) => (
                    <label key={String(key)} className="text-sm font-black text-slate-700">
                      {label}
                      <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-500">
                        <input
                          inputMode="numeric"
                          value={value === null ? "" : Number(value).toLocaleString("ko-KR")}
                          placeholder={key === "previousYearRevenue" ? "확인 후 입력" : "0"}
                          onChange={(event) => setAdjustment(key as keyof Adjustments, event.target.value ? inputNumber(event.target.value) : key === "previousYearRevenue" ? null : 0)}
                          className="min-w-0 flex-1 bg-transparent py-3 text-right font-black outline-none"
                        />
                        <span className="ml-2 text-slate-400">원</span>
                      </div>
                    </label>
                  ))}
                </div>
                <button type="button" disabled={saving === "adjustments"} onClick={() => void saveAdjustments()} className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-3 font-black text-white disabled:opacity-50">
                  {saving === "adjustments" ? "저장 중…" : "입력값 저장"}
                </button>
              </div>

              <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:p-7">
                <h2 className="text-xl font-black">예상 납부·환급</h2>
                <div className="mt-5 space-y-3 text-sm font-bold">
                  <div className="flex justify-between"><span className="text-slate-400">과세표준</span><span>{won(estimate.taxBase)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">산출 소득세</span><span>{won(estimate.calculatedIncomeTax)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">결정 소득세</span><span>{won(estimate.determinedIncomeTax)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">결정 지방소득세</span><span>{won(estimate.determinedLocalTax)}</span></div>
                </div>
                <div className="mt-6 space-y-3 border-t border-slate-700 pt-5">
                  <div className={`rounded-2xl p-4 ${estimate.incomeTaxBalance > 0 ? "bg-amber-400 text-slate-950" : "bg-emerald-500"}`}>
                    <div className="text-xs font-black opacity-75">국세</div>
                    <div className="mt-1 text-xl font-black">{signedWon(estimate.incomeTaxBalance)}</div>
                  </div>
                  <div className={`rounded-2xl p-4 ${estimate.localTaxBalance > 0 ? "bg-amber-400 text-slate-950" : "bg-emerald-500"}`}>
                    <div className="text-xs font-black opacity-75">지방소득세</div>
                    <div className="mt-1 text-xl font-black">{signedWon(estimate.localTaxBalance)}</div>
                  </div>
                </div>
                <p className="mt-5 text-xs font-bold leading-relaxed text-slate-400">이 결과는 단순 추정치이며 신고서가 아닙니다. 인적공제, 연금·보험·기부금, 타 소득, 중간예납 등 실제 신고 항목에 따라 달라집니다.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-black">업체별 업종 설정</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">설정 저장 후 새 입금 기록에는 자동 연결됩니다. 기존 기록 반영은 별도 버튼으로 확인 후 실행합니다.</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {contracts.map((contract) => (
                  <div key={contract.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-black text-slate-800">{contract.label || "이름 없는 업체"}</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.2fr]">
                      <input value={contract.payerName} onChange={(event) => updateContract(contract.id, { payerName: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" aria-label={`${contract.label} 지급처명`} />
                      <select value={contract.industryCode} onChange={(event) => updateContract(contract.id, { industryCode: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
                        <option value="">업종 미확정</option>
                        {INDUSTRIES.map((industry) => <option key={industry.code} value={industry.code}>{industry.label}</option>)}
                      </select>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={!contract.industryCode || saving === `profile:${contract.id}`} onClick={() => void saveProfile(contract, false)} className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">앞으로 적용</button>
                      <button type="button" disabled={!contract.industryCode || saving === `profile:${contract.id}`} onClick={() => void saveProfile(contract, true)} className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">기존 기록도 반영</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-black">입금관리 연동 내역</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">세전 수당·원천징수·보험료는 입금관리 값을 사용합니다. 귀속연도와 업종만 여기서 확인·보정합니다.</p>
              <div className="mt-4 space-y-3">
                {records.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500">{year}년 수령 처리된 입금 기록이 없습니다.</div>
                ) : records.map((record) => (
                  <div key={record.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-black">{record.contractLabel || record.payerName}</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">{record.receivedDate || "입금일 미입력"} · 세전 {won(record.grossAmount)} · 소득세 {won(record.incomeTax)} · 지방세 {won(record.localTax)}</div>
                        <div className="mt-1 text-xs font-bold text-slate-400">고용보험 {won(record.employmentInsurance)} · 산재보험 {won(record.industrialInsurance)}</div>
                      </div>
                      <div className="flex gap-2 text-[11px] font-black">
                        {record.taxWasEstimated && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">원천세 추정</span>}
                        {!record.metadataConfirmed && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">업종 자동분류</span>}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_1.4fr_auto]">
                      <input value={record.payerName} onChange={(event) => updateRecord(record.id, { payerName: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" aria-label="지급처명" />
                      <input type="number" value={record.taxYear} min={2020} max={2100} onChange={(event) => updateRecord(record.id, { taxYear: Number(event.target.value) })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" aria-label="귀속연도" />
                      <select value={record.industryCode} onChange={(event) => updateRecord(record.id, { industryCode: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
                        <option value="">업종 미확정</option>
                        {INDUSTRIES.map((industry) => <option key={industry.code} value={industry.code}>{industry.label}</option>)}
                      </select>
                      <button type="button" disabled={!record.industryCode || saving === `record:${record.id}`} onClick={() => void saveRecord(record)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-40">확인 저장</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs font-bold leading-relaxed text-slate-500 shadow-sm">
              <div className="font-black text-slate-700">확인 자료</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                <a className="text-emerald-700 underline" href="https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=2207&nttSn=1350751" target="_blank" rel="noreferrer">국세청 2025년 귀속 경비율</a>
                <a className="text-emerald-700 underline" href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7667&mi=2201" target="_blank" rel="noreferrer">종합소득세 세율</a>
                <a className="text-emerald-700 underline" href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7664&mi=2231" target="_blank" rel="noreferrer">소득금액 계산 안내</a>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

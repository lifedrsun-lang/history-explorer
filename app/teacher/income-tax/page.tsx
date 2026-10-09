"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  calculateEarnedIncome,
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
  businessNumber: string;
  taxYear: number;
  paymentMonth: number | null;
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
  businessNumber: string;
  profileSaved: boolean;
};

type MonthlyIncomeSourceKey =
  | "woongjinThinkbig"
  | "globalFinancialSales"
  | "chamdasomEducation"
  | "araCooperative"
  | "chromaEducation";

type Adjustments = {
  previousYearRevenue: number | null;
  otherIncome: number;
  incomeDeduction: number;
  dependentDeductionCount: number;
  disabledDeductionCount: number;
  womanDeduction: boolean;
  electronicFilingTaxCredit: boolean;
  taxCredit: number;
  localTaxCredit: number;
  additionalPrepaidIncomeTax: number;
  additionalPrepaidLocalTax: number;
  monthlyGrossOverrides: Record<MonthlyIncomeSourceKey, Array<number | null>>;
  employmentGrossAmounts: number[];
  employmentWithheldIncomeTax: number;
  employmentWithheldLocalTax: number;
  employmentResignationDate: string;
};

type NumericAdjustmentKey = Exclude<
  keyof Adjustments,
  "monthlyGrossOverrides" | "employmentGrossAmounts" | "employmentResignationDate" | "womanDeduction" | "electronicFilingTaxCredit"
>;

const EMPTY_ADJUSTMENTS: Adjustments = {
  previousYearRevenue: null,
  otherIncome: 0,
  incomeDeduction: 0,
  dependentDeductionCount: 1,
  disabledDeductionCount: 1,
  womanDeduction: false,
  electronicFilingTaxCredit: true,
  taxCredit: 0,
  localTaxCredit: 0,
  additionalPrepaidIncomeTax: 0,
  additionalPrepaidLocalTax: 0,
  monthlyGrossOverrides: {
    woongjinThinkbig: Array(12).fill(null),
    globalFinancialSales: Array(12).fill(null),
    chamdasomEducation: Array(12).fill(null),
    araCooperative: Array(12).fill(null),
    chromaEducation: Array(12).fill(null),
  },
  employmentGrossAmounts: Array(12).fill(0),
  employmentWithheldIncomeTax: 0,
  employmentWithheldLocalTax: 0,
  employmentResignationDate: "2026-05-22",
};

const INDUSTRIES = [
  { code: "940925", label: "방과후강사 (940925)" },
  { code: "940908", label: "웅진씽크빅·방문판매원 (940908)" },
  { code: "940906", label: "(주)글로벌금융판매·보험설계사 (940906)" },
] as const;

const MONTHLY_INCOME_SOURCES = [
  {
    key: "woongjinThinkbig" as const,
    payerName: "웅진씽크빅",
    industryCode: "940908",
    businessNumber: "141-81-09131",
    tone: "border-blue-200 bg-blue-50/60",
  },
  {
    key: "globalFinancialSales" as const,
    payerName: "(주)글로벌금융판매",
    industryCode: "940906",
    businessNumber: "131-86-16703",
    tone: "border-violet-200 bg-violet-50/60",
  },
  {
    key: "chamdasomEducation" as const,
    payerName: "참다솜교육 사회적협동조합",
    industryCode: "940925",
    businessNumber: "506-82-20645",
    tone: "border-emerald-200 bg-emerald-50/60",
  },
  {
    key: "araCooperative" as const,
    payerName: "아라 사회적협동조합",
    industryCode: "940925",
    businessNumber: "345-82-00175",
    tone: "border-amber-200 bg-amber-50/60",
  },
  {
    key: "chromaEducation" as const,
    payerName: "주식회사 크로마에듀케이션",
    industryCode: "940925",
    businessNumber: "451-88-02863",
    tone: "border-rose-200 bg-rose-50/60",
  },
] as const;

const EMPLOYMENT_SOURCE = {
  payerName: "(주)케어링 방문요양센터 서울 양천점",
  businessNumber: "846-85-02702",
} as const;

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);

const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const signedWon = (value: number) =>
  value > 0 ? `${won(value)} 납부 예상` : value < 0 ? `${won(Math.abs(value))} 환급 예상` : "0원";
const inputNumber = (value: string) => {
  const number = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const normalizePayerName = (value: string) =>
  value
    .replace(/\(주\)|㈜|주식회사/g, "")
    .replace(/[\s·._-]/g, "")
    .trim();

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

  const monthlyAutoTotals = useMemo(() => {
    const result = Object.fromEntries(
      MONTHLY_INCOME_SOURCES.map((source) => [
        source.key,
        Array.from({ length: 12 }, () => ({
          grossAmount: 0,
          incomeTax: 0,
          localTax: 0,
          recordCount: 0,
        })),
      ])
    ) as Record<MonthlyIncomeSourceKey, Array<{
      grossAmount: number;
      incomeTax: number;
      localTax: number;
      recordCount: number;
    }>>;

    records.forEach((record) => {
      if (!record.paymentMonth || record.paymentMonth < 1 || record.paymentMonth > 12) return;
      const source = MONTHLY_INCOME_SOURCES.find((item) =>
        item.industryCode === record.industryCode &&
        normalizePayerName(item.payerName) === normalizePayerName(record.payerName)
      );
      if (!source) return;
      const month = result[source.key][record.paymentMonth - 1];
      month.grossAmount += record.grossAmount;
      month.incomeTax += record.incomeTax;
      month.localTax += record.localTax;
      month.recordCount += 1;
    });
    return result;
  }, [records]);

  const ungroupedRecords = useMemo(() => records.filter((record) => {
    if (!record.paymentMonth || record.paymentMonth < 1 || record.paymentMonth > 12) return true;
    return !MONTHLY_INCOME_SOURCES.some((source) =>
      source.industryCode === record.industryCode &&
      normalizePayerName(source.payerName) === normalizePayerName(record.payerName)
    );
  }), [records]);

  const effectiveMonthlyRecords = useMemo(
    () => MONTHLY_INCOME_SOURCES.flatMap((source) =>
      adjustments.monthlyGrossOverrides[source.key].map((override, monthIndex) => ({
        id: `monthly:${source.key}:${monthIndex + 1}`,
        industryCode: source.industryCode,
        grossAmount: override ?? monthlyAutoTotals[source.key][monthIndex].grossAmount,
      }))
    ),
    [adjustments.monthlyGrossOverrides, monthlyAutoTotals]
  );

  const industryCalculations = useMemo(
    () => calculateIndustryIncome(year, [...ungroupedRecords, ...effectiveMonthlyRecords]),
    [effectiveMonthlyRecords, ungroupedRecords, year]
  );
  const employmentCalculation = useMemo(
    () => calculateEarnedIncome(
      adjustments.employmentGrossAmounts.reduce((sum, amount) => sum + amount, 0)
    ),
    [adjustments.employmentGrossAmounts]
  );
  const totals = useMemo(() => {
    let monthlyGross = 0;
    let monthlyIncomeTax = 0;
    let monthlyLocalTax = 0;
    let automaticMonthCount = 0;
    let overrideMonthCount = 0;
    MONTHLY_INCOME_SOURCES.forEach((source) => {
      adjustments.monthlyGrossOverrides[source.key].forEach((override, monthIndex) => {
        const automatic = monthlyAutoTotals[source.key][monthIndex];
        const effectiveGross = override ?? automatic.grossAmount;
        monthlyGross += effectiveGross;
        if (override === null) {
          monthlyIncomeTax += automatic.incomeTax;
          monthlyLocalTax += automatic.localTax;
          if (automatic.grossAmount > 0) automaticMonthCount += 1;
        } else {
          monthlyIncomeTax += Math.round(effectiveGross * 0.03);
          monthlyLocalTax += Math.round(effectiveGross * 0.003);
          overrideMonthCount += 1;
        }
      });
    });
    const ungroupedGross = ungroupedRecords.reduce((sum, record) => sum + record.grossAmount, 0);
    const totalGross = ungroupedGross + monthlyGross;
    const classifiedGross = industryCalculations.reduce(
      (sum, item) => sum + item.grossAmount,
      0
    );
    const businessIncome = industryCalculations.reduce(
      (sum, item) => sum + item.businessIncome,
      0
    );
    const prepaidIncomeTax =
      ungroupedRecords.reduce((sum, record) => sum + record.incomeTax, 0) +
      monthlyIncomeTax +
      adjustments.employmentWithheldIncomeTax +
      adjustments.additionalPrepaidIncomeTax;
    const prepaidLocalTax =
      ungroupedRecords.reduce((sum, record) => sum + record.localTax, 0) +
      monthlyLocalTax +
      adjustments.employmentWithheldLocalTax +
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
      automaticMonthCount,
      overrideMonthCount,
    };
  }, [adjustments, industryCalculations, monthlyAutoTotals, records, ungroupedRecords]);
  const personalIncomeDeduction =
    1_500_000 +
    adjustments.dependentDeductionCount * 1_500_000 +
    adjustments.disabledDeductionCount * 2_000_000 +
    (adjustments.womanDeduction ? 500_000 : 0);
  const automaticTaxCredit = adjustments.electronicFilingTaxCredit ? 10_000 : 0;
  const estimate = useMemo(
    () => calculateTaxEstimate({
      businessIncome: totals.businessIncome,
      earnedIncome: employmentCalculation.earnedIncome,
      otherIncome: adjustments.otherIncome,
      incomeDeduction: adjustments.incomeDeduction + personalIncomeDeduction,
      taxCredit: adjustments.taxCredit + automaticTaxCredit,
      localTaxCredit: adjustments.localTaxCredit,
      prepaidIncomeTax: totals.prepaidIncomeTax,
      prepaidLocalTax: totals.prepaidLocalTax,
    }),
    [adjustments, automaticTaxCredit, employmentCalculation.earnedIncome, personalIncomeDeduction, totals]
  );
  const eligibility = getSimpleExpenseEligibility(
    totals.totalGross,
    adjustments.previousYearRevenue
  );

  const setAdjustment = (key: NumericAdjustmentKey, value: number | null) => {
    setAdjustments((current) => ({ ...current, [key]: value }));
  };

  const setMonthlyGrossOverride = (
    sourceKey: MonthlyIncomeSourceKey,
    monthIndex: number,
    value: number | null
  ) => {
    setAdjustments((current) => ({
      ...current,
      monthlyGrossOverrides: {
        ...current.monthlyGrossOverrides,
        [sourceKey]: current.monthlyGrossOverrides[sourceKey].map((amount, index) =>
          index === monthIndex ? value : amount
        ),
      },
    }));
  };

  const setEmploymentGross = (monthIndex: number, value: number) => {
    setAdjustments((current) => ({
      ...current,
      employmentGrossAmounts: current.employmentGrossAmounts.map((amount, index) =>
        index === monthIndex ? value : amount
      ),
    }));
  };

  const saveAdjustments = async () => {
    setSaving("adjustments");
    setError("");
    try {
      await requestJson("/api/teacher/income-tax", {
        method: "PATCH",
        body: JSON.stringify({ action: "saveAdjustments", year, adjustments }),
      });
      setMessage("종합소득세 입력값을 저장했습니다.");
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
            businessNumber: contract.businessNumber,
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
          businessNumber: record.businessNumber,
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
                입금관리와 월별 사업·근로소득, 원천징수액을 합산하고 업종별 단순경비율과 직접 입력한 공제로 예상 세액을 계산합니다.
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
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["사업 세전 총수입", won(totals.totalGross), `입금관리 자동 ${totals.automaticMonthCount}개월 · 직접수정 ${totals.overrideMonthCount}개월`],
                ["단순경비율 후 사업소득", won(totals.businessIncome), "보험료 중복 공제 없음"],
                ["근로소득금액", won(employmentCalculation.earnedIncome), `총급여 ${won(employmentCalculation.grossSalary)} · 공제 ${won(employmentCalculation.earnedIncomeDeduction)}`],
                ["기납부 원천세", won(totals.prepaidIncomeTax + totals.prepaidLocalTax), "사업 3.3% 추정 + 급여 원천징수 입력"],
                ["보험료 별도 합계", won(totals.employmentInsurance + totals.industrialInsurance), `고용 ${won(totals.employmentInsurance)} · 산재 ${won(totals.industrialInsurance)}`],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black text-slate-500">{label}</div>
                  <div className="mt-2 text-xl font-black text-slate-900">{value}</div>
                  <div className="mt-2 text-xs font-bold text-slate-400">{detail}</div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-sky-200 bg-sky-50/50 p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-sky-700">근로소득 · 중도퇴사</div>
                  <h2 className="mt-1 text-xl font-black text-slate-900">{EMPLOYMENT_SOURCE.payerName}</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">사업자번호 {EMPLOYMENT_SOURCE.businessNumber}</p>
                </div>
                <label className="text-xs font-black text-slate-600">
                  퇴사일
                  <input
                    type="date"
                    value={adjustments.employmentResignationDate}
                    onChange={(event) => setAdjustments((current) => ({ ...current, employmentResignationDate: event.target.value }))}
                    className="ml-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-black text-slate-800"
                  />
                </label>
              </div>
              <div className="mt-4 rounded-2xl border border-sky-200 bg-white/80 px-4 py-3 text-xs font-bold leading-relaxed text-slate-600">
                1~5월 원천징수영수증의 과세대상 총급여를 월별로 입력하세요. 퇴직금은 퇴직소득이므로 아래 급여와 종합소득에 합산하지 않습니다.
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {MONTH_LABELS.slice(0, 5).map((label, monthIndex) => (
                  <label key={label} className="text-xs font-black text-slate-600">
                    {label} 총급여
                    <div className="mt-1 flex items-center rounded-xl border border-white bg-white px-2 shadow-sm focus-within:border-sky-500">
                      <input
                        inputMode="numeric"
                        value={adjustments.employmentGrossAmounts[monthIndex] ? adjustments.employmentGrossAmounts[monthIndex].toLocaleString("ko-KR") : ""}
                        placeholder="0"
                        onChange={(event) => setEmploymentGross(monthIndex, inputNumber(event.target.value))}
                        className="min-w-0 flex-1 bg-transparent py-2 text-right text-sm font-black outline-none"
                        aria-label={`${EMPLOYMENT_SOURCE.payerName} ${label} 총급여`}
                      />
                      <span className="ml-1 text-[11px] text-slate-400">원</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-black text-slate-500">총급여 → 근로소득금액</div>
                  <div className="mt-2 font-black text-slate-900">{won(employmentCalculation.grossSalary)} → {won(employmentCalculation.earnedIncome)}</div>
                  <div className="mt-1 text-xs font-bold text-slate-400">근로소득공제 {won(employmentCalculation.earnedIncomeDeduction)}</div>
                </div>
                <label className="rounded-2xl bg-white p-4 text-xs font-black text-slate-600">
                  급여에서 낸 소득세
                  <div className="mt-2 flex items-center rounded-xl border border-slate-200 px-2">
                    <input
                      inputMode="numeric"
                      value={adjustments.employmentWithheldIncomeTax ? adjustments.employmentWithheldIncomeTax.toLocaleString("ko-KR") : ""}
                      placeholder="원천징수영수증 확인"
                      onChange={(event) => setAdjustment("employmentWithheldIncomeTax", inputNumber(event.target.value))}
                      className="min-w-0 flex-1 py-2 text-right text-sm font-black outline-none"
                    />
                    <span className="ml-1 text-slate-400">원</span>
                  </div>
                </label>
                <label className="rounded-2xl bg-white p-4 text-xs font-black text-slate-600">
                  급여에서 낸 지방소득세
                  <div className="mt-2 flex items-center rounded-xl border border-slate-200 px-2">
                    <input
                      inputMode="numeric"
                      value={adjustments.employmentWithheldLocalTax ? adjustments.employmentWithheldLocalTax.toLocaleString("ko-KR") : ""}
                      placeholder="원천징수영수증 확인"
                      onChange={(event) => setAdjustment("employmentWithheldLocalTax", inputNumber(event.target.value))}
                      className="min-w-0 flex-1 py-2 text-right text-sm font-black outline-none"
                    />
                    <span className="ml-1 text-slate-400">원</span>
                  </div>
                </label>
              </div>
              <p className="mt-4 text-xs font-bold leading-relaxed text-slate-500">
                근로소득 세액공제·보험료·신용카드·의료비 등은 원천징수영수증과 공제자료를 확인해 아래 ‘소득공제 합계’와 ‘소득세 세액공제’에 반영하세요.
              </p>
              <button type="button" disabled={saving === "adjustments"} onClick={() => void saveAdjustments()} className="mt-4 w-full rounded-2xl bg-sky-700 px-5 py-3 font-black text-white disabled:opacity-50">
                {saving === "adjustments" ? "저장 중…" : "근로소득 저장"}
              </button>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">1월~12월 업체별 세전 금액</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">입금관리에서 업체·월별 세전 금액을 자동으로 불러옵니다. 필요한 달만 직접 고칠 수 있습니다.</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800">자동값 우선 · 직접수정 가능</span>
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold leading-relaxed text-emerald-900">
                ‘자동’은 기존 입금관리 합계입니다. 금액을 바꾸면 그 달만 ‘직접수정’으로 계산되며, ‘자동값으로’ 버튼을 누르면 언제든 입금관리 금액으로 되돌아갑니다. 중복 합산하지 않습니다.
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {MONTHLY_INCOME_SOURCES.map((source) => {
                  const overrides = adjustments.monthlyGrossOverrides[source.key];
                  const automaticMonths = monthlyAutoTotals[source.key];
                  const sourceTotal = overrides.reduce<number>(
                    (sum, override, monthIndex) =>
                      sum + (override ?? automaticMonths[monthIndex].grossAmount),
                    0
                  );
                  return (
                    <div key={source.key} className={`rounded-2xl border p-4 ${source.tone}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-black text-slate-900">{source.payerName}</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">
                            {source.industryCode === "940925" ? "방과후교사" : source.industryCode === "940908" ? "방문판매원" : "보험설계사"} ({source.industryCode})
                          </div>
                          <div className="mt-1 text-[11px] font-bold text-slate-400">사업자번호 {source.businessNumber}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-black text-slate-500">연간 합계</div>
                          <div className="font-black text-slate-900">{won(sourceTotal)}</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {MONTH_LABELS.map((label, monthIndex) => {
                          const override = overrides[monthIndex];
                          const automatic = automaticMonths[monthIndex];
                          const effectiveGross = override ?? automatic.grossAmount;
                          return (
                          <label key={label} className="text-xs font-black text-slate-600">
                            <span className="flex items-center justify-between gap-1">
                              <span>{label}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${override === null ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {override === null ? (automatic.recordCount > 0 ? `자동 ${automatic.recordCount}건` : "자동") : "직접수정"}
                              </span>
                            </span>
                            <div className="mt-1 flex items-center rounded-xl border border-white bg-white px-2 shadow-sm focus-within:border-emerald-500">
                              <input
                                inputMode="numeric"
                                value={effectiveGross ? effectiveGross.toLocaleString("ko-KR") : ""}
                                placeholder="0"
                                onChange={(event) => setMonthlyGrossOverride(source.key, monthIndex, inputNumber(event.target.value))}
                                className="min-w-0 flex-1 bg-transparent py-2 text-right text-sm font-black outline-none"
                                aria-label={`${source.payerName} ${label} 세전 금액`}
                              />
                              <span className="ml-1 text-[11px] text-slate-400">원</span>
                            </div>
                            {override !== null && (
                              <button
                                type="button"
                                onClick={() => setMonthlyGrossOverride(source.key, monthIndex, null)}
                                className="mt-1 w-full text-[10px] font-black text-emerald-700 underline"
                              >
                                자동값으로 ({won(automatic.grossAmount)})
                              </button>
                            )}
                          </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" disabled={saving === "adjustments"} onClick={() => void saveAdjustments()} className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white disabled:opacity-50">
                {saving === "adjustments" ? "저장 중…" : "월별 금액 저장"}
              </button>
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
              <div className={`mt-4 rounded-2xl border p-4 ${adjustments.previousYearRevenue === null ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50/60"}`}>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="text-sm font-black text-slate-700">
                    {year - 1}년 인적용역 세전 총수입
                    <div className="mt-2 flex items-center rounded-xl border border-white bg-white px-3 shadow-sm focus-within:border-emerald-500">
                      <input
                        inputMode="numeric"
                        value={adjustments.previousYearRevenue === null ? "" : adjustments.previousYearRevenue.toLocaleString("ko-KR")}
                        placeholder={`${year - 1}년 총수입 입력`}
                        onChange={(event) => setAdjustment("previousYearRevenue", event.target.value ? inputNumber(event.target.value) : null)}
                        className="min-w-0 flex-1 bg-transparent py-3 text-right font-black outline-none"
                        aria-label={`${year - 1}년 인적용역 세전 총수입`}
                      />
                      <span className="ml-2 text-slate-400">원</span>
                    </div>
                  </label>
                  <button
                    type="button"
                    disabled={saving === "adjustments" || adjustments.previousYearRevenue === null}
                    onClick={() => void saveAdjustments()}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
                  >
                    {saving === "adjustments" ? "저장 중…" : "직전연도 수입 저장"}
                  </button>
                </div>
                <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
                  방과후교사·웅진씽크빅·글로벌금융판매 등 {year - 1}년 사업소득의 경비 차감 전 금액을 합산해 입력하세요. 근로소득은 제외합니다.
                </p>
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
                <h2 className="text-xl font-black">공제 설정</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">지난해 신고 내역을 기본값으로 넣었습니다. 올해 달라진 인원만 바꾸세요.</p>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div>
                      <div className="font-black text-slate-900">본인 기본공제</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">자동 적용</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-800">1명</div>
                      <div className="text-xs font-bold text-emerald-700">1,500,000원</div>
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <span>
                      <span className="block font-black text-slate-900">부양가족 기본공제</span>
                      <span className="mt-1 block text-xs font-bold text-slate-500">1명당 150만원 · 지난해 1명</span>
                    </span>
                    <select
                      value={adjustments.dependentDeductionCount}
                      onChange={(event) => setAdjustments((current) => ({ ...current, dependentDeductionCount: Number(event.target.value) }))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-emerald-500"
                    >
                      {Array.from({ length: 11 }, (_, count) => <option key={count} value={count}>{count}명</option>)}
                    </select>
                  </label>

                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <span>
                      <span className="block font-black text-slate-900">장애인 추가공제</span>
                      <span className="mt-1 block text-xs font-bold text-slate-500">1명당 200만원 · 지난해 1명</span>
                    </span>
                    <select
                      value={adjustments.disabledDeductionCount}
                      onChange={(event) => setAdjustments((current) => ({ ...current, disabledDeductionCount: Number(event.target.value) }))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-emerald-500"
                    >
                      {[0, 1, 2].map((count) => <option key={count} value={count}>{count}명</option>)}
                    </select>
                  </label>

                  <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${adjustments.womanDeduction ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <input
                      type="checkbox"
                      checked={adjustments.womanDeduction}
                      onChange={(event) => setAdjustments((current) => ({ ...current, womanDeduction: event.target.checked }))}
                      className="mt-1 h-5 w-5 accent-emerald-600"
                    />
                    <span>
                      <span className="block font-black text-slate-900">부녀자공제 50만원</span>
                      <span className="mt-1 block text-xs font-bold leading-relaxed text-slate-500">지난해 0원 · 조건에 해당할 때만 선택</span>
                    </span>
                  </label>

                  <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${adjustments.electronicFilingTaxCredit ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                    <input
                      type="checkbox"
                      checked={adjustments.electronicFilingTaxCredit}
                      onChange={(event) => setAdjustments((current) => ({ ...current, electronicFilingTaxCredit: event.target.checked }))}
                      className="mt-1 h-5 w-5 accent-blue-600"
                    />
                    <span>
                      <span className="block font-black text-slate-900">전자신고 세액공제 1만원</span>
                      <span className="mt-1 block text-xs font-bold leading-relaxed text-slate-500">지난해 신고서와 같이 기본 적용</span>
                    </span>
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-xs font-black text-slate-500">인적공제 합계</div>
                    <div className="mt-1 font-black text-slate-900">{won(personalIncomeDeduction)}</div>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <div className="text-xs font-black text-blue-600">세액공제 합계</div>
                    <div className="mt-1 font-black text-blue-950">{won(adjustments.taxCredit + automaticTaxCredit)}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs font-bold leading-relaxed text-slate-500">장애인이 기본공제 대상 부양가족이면 부양가족 기본공제와 장애인 추가공제를 함께 반영합니다.</p>
                <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-black text-slate-600">
                    다른 공제·소득이 있을 때만 펼치기
                  </summary>
                  <div className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2">
                    {[
                    ["incomeDeduction", "기타 소득공제 합계", adjustments.incomeDeduction],
                    ["otherIncome", "기타 소득금액", adjustments.otherIncome],
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
                          placeholder="0"
                          onChange={(event) => setAdjustment(key as NumericAdjustmentKey, event.target.value ? inputNumber(event.target.value) : 0)}
                          className="min-w-0 flex-1 bg-transparent py-3 text-right font-black outline-none"
                        />
                        <span className="ml-2 text-slate-400">원</span>
                      </div>
                    </label>
                  ))}
                  </div>
                </details>
                <button type="button" disabled={saving === "adjustments"} onClick={() => void saveAdjustments()} className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-3 font-black text-white disabled:opacity-50">
                  {saving === "adjustments" ? "저장 중…" : "공제 설정 저장"}
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
              <p className="mt-1 text-sm font-bold text-slate-500">업체/직종을 선택하면 월별 금액과 연결됩니다. 하늘빛초·새솔초는 참다솜교육, 사우초는 아라로 자동 제안합니다.</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {contracts.map((contract) => {
                  const selectedPreset = MONTHLY_INCOME_SOURCES.find((source) =>
                    source.industryCode === contract.industryCode &&
                    normalizePayerName(source.payerName) === normalizePayerName(contract.payerName)
                  );
                  return (
                  <div key={contract.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-black text-slate-800">{contract.label || "이름 없는 업체"}</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.5fr]">
                      <input value={contract.payerName} onChange={(event) => updateContract(contract.id, { payerName: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" aria-label={`${contract.label} 지급처명`} />
                      <select
                        value={selectedPreset?.key || ""}
                        onChange={(event) => {
                          const preset = MONTHLY_INCOME_SOURCES.find((source) => source.key === event.target.value);
                          updateContract(contract.id, preset ? {
                            payerName: preset.payerName,
                            industryCode: preset.industryCode,
                            businessNumber: preset.businessNumber,
                          } : {
                            industryCode: "",
                            businessNumber: "",
                          });
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                        aria-label={`${contract.label} 업체·업종 선택`}
                      >
                        <option value="">업체·업종 미확정</option>
                        {MONTHLY_INCOME_SOURCES.map((source) => (
                          <option key={source.key} value={source.key}>
                            {source.payerName} · {source.industryCode === "940925" ? "방과후교사" : source.industryCode === "940908" ? "방문판매원" : "보험설계사"} ({source.industryCode})
                          </option>
                        ))}
                      </select>
                    </div>
                    {contract.businessNumber && (
                      <div className="mt-2 text-xs font-bold text-slate-400">사업자번호 {contract.businessNumber}</div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={!contract.industryCode || saving === `profile:${contract.id}`} onClick={() => void saveProfile(contract, false)} className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">앞으로 적용</button>
                      <button type="button" disabled={!contract.industryCode || saving === `profile:${contract.id}`} onClick={() => void saveProfile(contract, true)} className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">기존 기록도 반영</button>
                    </div>
                  </div>
                  );
                })}
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
                <a className="text-emerald-700 underline" href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7871&mi=6594" target="_blank" rel="noreferrer">근로소득공제 안내</a>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export const PERSONAL_SERVICE_BASIC_BAND = 40_000_000;
export const PERSONAL_SERVICE_PREVIOUS_YEAR_LIMIT = 36_000_000;
export const PERSONAL_SERVICE_CURRENT_YEAR_LIMIT = 75_000_000;

export type SupportedIndustryCode = "940925" | "940908" | "940906" | "940921" | "940903";

export type IndustryRate = {
  code: SupportedIndustryCode;
  label: string;
  generalRate: number;
  excessRate: number;
  sourceYear: 2024 | 2025;
  provisional: boolean;
};

export type IncomeTaxRecord = {
  id: string;
  industryCode: string;
  grossAmount: number;
};

export type IndustryCalculation = IndustryRate & {
  grossAmount: number;
  basicBandAmount: number;
  excessBandAmount: number;
  expenseAmount: number;
  businessIncome: number;
};

const RATE_TABLE: Record<2024 | 2025, Record<SupportedIndustryCode, Omit<IndustryRate, "code" | "sourceYear" | "provisional">>> = {
  2024: {
    "940903": { label: "학원강사", generalRate: 61.7, excessRate: 46.4 },
    "940921": { label: "교육교구방문강사", generalRate: 75.6, excessRate: 65.8 },
    "940925": { label: "방과후강사", generalRate: 69.3, excessRate: 57.0 },
    "940908": { label: "방문판매원 · 웅진씽크빅", generalRate: 75.0, excessRate: 65.0 },
    "940906": { label: "보험설계사 · (주)글로벌금융판매", generalRate: 77.6, excessRate: 68.6 },
  },
  2025: {
    "940903": { label: "학원강사", generalRate: 61.7, excessRate: 46.4 },
    "940921": { label: "교육교구방문강사", generalRate: 75.6, excessRate: 65.8 },
    "940925": { label: "방과후강사", generalRate: 69.3, excessRate: 57.0 },
    "940908": { label: "방문판매원 · 웅진씽크빅", generalRate: 75.0, excessRate: 65.0 },
    "940906": { label: "보험설계사 · (주)글로벌금융판매", generalRate: 77.6, excessRate: 68.6 },
  },
};

export const isSupportedIndustryCode = (value: unknown): value is SupportedIndustryCode =>
  value === "940925" || value === "940908" || value === "940906" || value === "940921" || value === "940903";

// Apply the corrected code to these payers, including their earlier saved defaults.
export const resolveTeachingPayerIndustryCode = (
  industryCode: string,
  payerName: string,
  businessNumber: string
) => {
  const normalizedName = payerName.replace(/\s/g, "");
  const normalizedNumber = businessNumber.replace(/\D/g, "");
  const isTeachingPayer =
    normalizedNumber === "3708102906" || normalizedNumber === "1058222590" ||
    /클래스포에듀|컴퓨팅교사협회|\bATC\b/i.test(normalizedName);
  return isTeachingPayer && (!industryCode || industryCode === "940925" || industryCode === "940921")
    ? "940903"
    : industryCode;
};

export const getIndustryRate = (year: number, code: SupportedIndustryCode): IndustryRate => {
  const sourceYear: 2024 | 2025 = year <= 2024 ? 2024 : 2025;
  return {
    code,
    ...RATE_TABLE[sourceYear][code],
    sourceYear,
    provisional: year > 2025,
  };
};

export function calculateIndustryIncome(
  year: number,
  records: IncomeTaxRecord[]
): IndustryCalculation[] {
  const totals = new Map<SupportedIndustryCode, number>();

  records.forEach((record) => {
    if (!isSupportedIndustryCode(record.industryCode)) return;
    const grossAmount = Math.max(0, Math.round(Number(record.grossAmount) || 0));
    totals.set(record.industryCode, (totals.get(record.industryCode) || 0) + grossAmount);
  });

  return Array.from(totals.entries()).map(([code, grossAmount]) => {
    const rate = getIndustryRate(year, code);
    // 국세청 단순경비율표는 코드별 총수입금액에 4천만원 구간을 적용한다.
    const basicBandAmount = Math.min(grossAmount, PERSONAL_SERVICE_BASIC_BAND);
    const excessBandAmount = Math.max(0, grossAmount - PERSONAL_SERVICE_BASIC_BAND);
    const expenseAmount = Math.round(
      basicBandAmount * (rate.generalRate / 100) +
        excessBandAmount * (rate.excessRate / 100)
    );

    return {
      ...rate,
      grossAmount,
      basicBandAmount,
      excessBandAmount,
      expenseAmount,
      businessIncome: Math.max(0, grossAmount - expenseAmount),
    };
  });
}

const INCOME_TAX_BRACKETS = [
  { upper: 14_000_000, rate: 0.06, deduction: 0 },
  { upper: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { upper: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { upper: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { upper: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { upper: 500_000_000, rate: 0.4, deduction: 25_940_000 },
  { upper: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { upper: Number.POSITIVE_INFINITY, rate: 0.45, deduction: 65_940_000 },
] as const;

export const calculateProgressiveIncomeTax = (taxBase: number) => {
  const roundedBase = Math.floor(Math.max(0, Number(taxBase) || 0) / 10) * 10;
  const bracket = INCOME_TAX_BRACKETS.find((item) => roundedBase <= item.upper)!;
  return Math.max(0, Math.floor((roundedBase * bracket.rate - bracket.deduction) / 10) * 10);
};

export const calculateEarnedIncome = (grossSalary: number) => {
  const gross = Math.max(0, Math.round(Number(grossSalary) || 0));
  let deduction = 0;

  if (gross <= 5_000_000) deduction = gross * 0.7;
  else if (gross <= 15_000_000) deduction = 3_500_000 + (gross - 5_000_000) * 0.4;
  else if (gross <= 45_000_000) deduction = 7_500_000 + (gross - 15_000_000) * 0.15;
  else if (gross <= 100_000_000) deduction = 12_000_000 + (gross - 45_000_000) * 0.05;
  else deduction = 14_750_000 + (gross - 100_000_000) * 0.02;

  const earnedIncomeDeduction = Math.min(20_000_000, Math.round(deduction));
  return {
    grossSalary: gross,
    earnedIncomeDeduction,
    earnedIncome: Math.max(0, gross - earnedIncomeDeduction),
  };
};

export type TaxEstimateInput = {
  businessIncome: number;
  earnedIncome?: number;
  otherIncome: number;
  incomeDeduction: number;
  taxCredit: number;
  localTaxCredit: number;
  prepaidIncomeTax: number;
  prepaidLocalTax: number;
};

export const calculateTaxEstimate = (input: TaxEstimateInput) => {
  const taxBase = Math.max(
    0,
    Math.floor((input.businessIncome + (input.earnedIncome || 0) + input.otherIncome - input.incomeDeduction) / 10) * 10
  );
  const calculatedIncomeTax = calculateProgressiveIncomeTax(taxBase);
  const determinedIncomeTax = Math.max(0, calculatedIncomeTax - input.taxCredit);
  const determinedLocalTax = Math.max(
    0,
    Math.floor(determinedIncomeTax * 0.1) - input.localTaxCredit
  );

  return {
    taxBase,
    calculatedIncomeTax,
    determinedIncomeTax,
    determinedLocalTax,
    incomeTaxBalance: determinedIncomeTax - input.prepaidIncomeTax,
    localTaxBalance: determinedLocalTax - input.prepaidLocalTax,
  };
};

export const getSimpleExpenseEligibility = (
  currentYearRevenue: number,
  previousYearRevenue: number | null
) => {
  if (previousYearRevenue === null) {
    return {
      eligible: null,
      reason: "직전연도 수입금액을 입력하면 단순경비율 적용 가능성을 확인할 수 있습니다.",
    } as const;
  }

  if (previousYearRevenue >= PERSONAL_SERVICE_PREVIOUS_YEAR_LIMIT) {
    return {
      eligible: false,
      reason: "직전연도 인적용역 수입이 3,600만원 이상이라 단순경비율 대상이 아닐 수 있습니다.",
    } as const;
  }

  if (currentYearRevenue >= PERSONAL_SERVICE_CURRENT_YEAR_LIMIT) {
    return {
      eligible: false,
      reason: "해당연도 인적용역 수입이 복식부기의무 기준 7,500만원 이상입니다.",
    } as const;
  }

  return {
    eligible: true,
    reason: "입력된 수입 기준으로 단순경비율 적용 가능 범위입니다.",
  } as const;
};

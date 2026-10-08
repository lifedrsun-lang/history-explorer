export const settlementManualFields = [
  "grossAmount", "incomeTax", "residentTax", "employmentInsurance", "industrialInsurance",
] as const;

export type SettlementManualField = (typeof settlementManualFields)[number];
export type SettlementInputField = SettlementManualField | "receivedAmount" | "receivedDate";

export type FeeSettlement = {
  receivedAmount?: number;
  grossAmount?: number;
  incomeTax?: number;
  residentTax?: number;
  employmentInsurance?: number;
  industrialInsurance?: number;
  insuranceFee?: number;
  taxAmount?: number;
  receivedDate?: string;
  calculationVersion?: 1;
  manualFields?: SettlementManualField[];
  taxYear?: number;
  industryCode?: string;
  payerName?: string;
  taxMetaConfirmed?: boolean;
};

const amount = (value: unknown) => {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? Math.round(result) : 0;
};

const preserveTaxMetadata = (target: FeeSettlement, source: Record<string, unknown> | FeeSettlement) => {
  const taxYear = Number(source.taxYear);
  const industryCode = String(source.industryCode || "").trim();
  const payerName = String(source.payerName || "").trim();
  if (taxYear) target.taxYear = taxYear;
  if (industryCode) target.industryCode = industryCode;
  if (payerName) target.payerName = payerName;
  if (source.taxMetaConfirmed === true) target.taxMetaConfirmed = true;
  return target;
};

export const hasReceivedAmount = (entry: FeeSettlement) =>
  entry.receivedAmount !== undefined &&
  (entry.calculationVersion === 1 || Number(entry.receivedAmount) > 0);

// A legacy payslip's gross amount remains an explicit amount until automatic reset.
export const getSettlementManualFields = (entry: FeeSettlement): SettlementManualField[] =>
  entry.calculationVersion === 1
    ? settlementManualFields.filter((field) => entry.manualFields?.includes(field))
    : Number(entry.grossAmount || 0) > 0 ? ["grossAmount"] : [];

export function calculateFeeSettlement(entry: FeeSettlement, expectedAmount: number): FeeSettlement {
  const manualFields = getSettlementManualFields(entry);
  const manual = (field: SettlementManualField) => manualFields.includes(field);
  const grossAmount = manual("grossAmount") ? amount(entry.grossAmount) : amount(expectedAmount);
  const incomeTax = manual("incomeTax") ? amount(entry.incomeTax) : Math.round(grossAmount * 3 / 100);
  const residentTax = manual("residentTax") ? amount(entry.residentTax) : Math.round(grossAmount * 3 / 1000);
  const industrialInsurance = manual("industrialInsurance") ? amount(entry.industrialInsurance) : 0;
  const employmentInsurance = manual("employmentInsurance")
    ? amount(entry.employmentInsurance)
    : hasReceivedAmount(entry)
      ? Math.max(0, grossAmount - amount(entry.receivedAmount) - incomeTax - residentTax - industrialInsurance)
      : 0;

  const result: FeeSettlement = {
    calculationVersion: 1,
    manualFields,
    grossAmount,
    incomeTax,
    residentTax,
    employmentInsurance,
    industrialInsurance,
    taxAmount: incomeTax + residentTax,
    insuranceFee: employmentInsurance + industrialInsurance,
    receivedDate: entry.receivedDate || "",
  };
  preserveTaxMetadata(result, entry);
  if (hasReceivedAmount(entry)) result.receivedAmount = amount(entry.receivedAmount);
  return result;
}

export function changeFeeSettlement(
  entry: FeeSettlement,
  expectedAmount: number,
  field: SettlementInputField,
  value: string | number
): FeeSettlement {
  const next = calculateFeeSettlement(entry, expectedAmount);
  if (field === "receivedDate") next.receivedDate = String(value || "");
  else if (field === "receivedAmount") {
    if (value === "") delete next.receivedAmount;
    else next.receivedAmount = amount(value);
  } else {
    next[field] = amount(value);
    next.manualFields = Array.from(new Set([...(next.manualFields || []), field]));
  }
  return calculateFeeSettlement(next, expectedAmount);
}

export function resetFeeSettlement(entry: FeeSettlement, expectedAmount: number): FeeSettlement {
  return calculateFeeSettlement({
    ...entry, calculationVersion: 1, manualFields: [],
  }, expectedAmount);
}

// Preserve historical aggregate records. Only explicitly edited records adopt the new schema.
export function sanitizeFeeSettlement(data: Record<string, unknown>): FeeSettlement {
  if (data.calculationVersion !== 1) {
    const legacyAmount = (value: unknown) => {
      const result = Number(value || 0);
      return Number.isFinite(result) && result >= 0 ? result : 0;
    };
    return preserveTaxMetadata({
      receivedAmount: legacyAmount(data.receivedAmount),
      grossAmount: legacyAmount(data.grossAmount),
      insuranceFee: legacyAmount(data.insuranceFee),
      taxAmount: legacyAmount(data.taxAmount),
      receivedDate: String(data.receivedDate || ""),
    }, data);
  }
  const entry: FeeSettlement = {
    calculationVersion: 1,
    manualFields: settlementManualFields.filter((field) =>
      Array.isArray(data.manualFields) && data.manualFields.includes(field)),
    grossAmount: amount(data.grossAmount),
    incomeTax: amount(data.incomeTax),
    residentTax: amount(data.residentTax),
    employmentInsurance: amount(data.employmentInsurance),
    industrialInsurance: amount(data.industrialInsurance),
    receivedDate: String(data.receivedDate || ""),
  };
  preserveTaxMetadata(entry, data);
  if (data.receivedAmount !== undefined && data.receivedAmount !== null && data.receivedAmount !== "") {
    entry.receivedAmount = amount(data.receivedAmount);
  }
  return calculateFeeSettlement(entry, amount(data.grossAmount));
}

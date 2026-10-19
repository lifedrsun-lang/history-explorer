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
  installments?: FeeInstallment[];
  calculationVersion?: 1;
  manualFields?: SettlementManualField[];
  taxYear?: number;
  industryCode?: string;
  payerName?: string;
  businessNumber?: string;
  taxMetaConfirmed?: boolean;
};

export type FeeInstallment = Omit<FeeSettlement, "installments"> & { id: string };

const amount = (value: unknown) => {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? Math.round(result) : 0;
};

const preserveTaxMetadata = (target: FeeSettlement, source: Record<string, unknown> | FeeSettlement) => {
  const taxYear = Number(source.taxYear);
  const industryCode = String(source.industryCode || "").trim();
  const payerName = String(source.payerName || "").trim();
  const businessNumber = String(source.businessNumber || "").trim();
  if (taxYear) target.taxYear = taxYear;
  if (industryCode) target.industryCode = industryCode;
  if (payerName) target.payerName = payerName;
  if (businessNumber) target.businessNumber = businessNumber;
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
  if (Array.isArray(entry.installments)) result.installments = entry.installments;
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

// Split payments are authoritative once enabled; the original settlement fields remain
// untouched for rollback and historical compatibility, not as another payment.
export function getFeePaymentEntries(entry: FeeSettlement, expectedAmount: number): FeeSettlement[] {
  if (Array.isArray(entry.installments)) {
    return entry.installments.map((item) =>
      item.calculationVersion === 1
        ? calculateFeeSettlement(item, amount(item.grossAmount))
        : item
    );
  }
  return [entry.calculationVersion === 1 ? calculateFeeSettlement(entry, expectedAmount) : entry];
}

export const isPaidFeeInstallment = (entry: FeeSettlement) =>
  hasReceivedAmount(entry) || Boolean(entry.receivedDate);

// Recover missing legacy taxes only when the saved gross/net amounts reconcile exactly
// with the existing automatic calculation. Keep other historical deductions unchanged.
const reconcileLegacyFeeSettlement = (entry: FeeSettlement): FeeSettlement => {
  if (
    !hasReceivedAmount(entry) || amount(entry.grossAmount) === 0 ||
    Number(entry.taxAmount || 0) !== 0 || Number(entry.insuranceFee || 0) !== 0
  ) {
    return entry;
  }
  const calculated = calculateFeeSettlement(entry, amount(entry.grossAmount));
  const difference = Number(entry.grossAmount) - Number(entry.receivedAmount);
  if (Number(calculated.taxAmount) <= 0 || difference !== calculated.taxAmount) return entry;
  return calculated;
};

// Preserve historical aggregate records unless missing taxes reconcile with the saved payment.
export function sanitizeFeeSettlement(data: Record<string, unknown>): FeeSettlement {
  if (data.calculationVersion !== 1) {
    const legacyAmount = (value: unknown) => {
      const result = Number(value || 0);
      return Number.isFinite(result) && result >= 0 ? result : 0;
    };
    const result = reconcileLegacyFeeSettlement(preserveTaxMetadata({
      receivedAmount: legacyAmount(data.receivedAmount),
      grossAmount: legacyAmount(data.grossAmount),
      insuranceFee: legacyAmount(data.insuranceFee),
      taxAmount: legacyAmount(data.taxAmount),
      receivedDate: String(data.receivedDate || ""),
    }, data));
    attachInstallments(result, data.installments);
    return result;
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
  const result = calculateFeeSettlement(entry, amount(data.grossAmount));
  attachInstallments(result, data.installments);
  return result;
}

const attachInstallments = (target: FeeSettlement, raw: unknown) => {
  if (!Array.isArray(raw)) return;
  // Preserve a deliberately empty split list without recreating the old single record.
  const ids = new Set<string>();
  target.installments = raw.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const input = value as Record<string, unknown>;
    const id = String(input.id || "").trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id)) return [];
    ids.add(id);
    // Drop nested arrays to prevent recursive payloads and accidental duplicate records.
    const { installments: _nested, ...fields } = input;
    void _nested;
    return [{ ...sanitizeFeeSettlement(fields), id }];
  });
};

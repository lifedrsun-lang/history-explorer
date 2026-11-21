import { COMPUTING_TEACHERS_ASSOCIATION } from "@/lib/incomeTax";

/** 출강료는 2026년 현재 계약 기준으로 원종초를 제외하고 ATC에서 월별 합산 지급한다. */
export const isWonjongSchool = (schoolName: unknown): boolean => {
  const normalized = String(schoolName || "")
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초");
  return /(?:부천)?원종초/.test(normalized);
};

export const isAtcPayer = (payer: { payerName?: string; businessNumber?: string }): boolean => {
  const number = String(payer.businessNumber || "").replace(/\D/g, "");
  const name = String(payer.payerName || "").replace(/\s/g, "");
  return number === "1058222590" ||
    (!number && /^(?:사단법인|\(사\))?컴퓨팅교사협회(?:\(ATC\))?$|^ATC$/i.test(name));
};

export type BatchPayer = { payerName: string; businessNumber: string; industryCode: string };

/**
 * Bank receipt grouping rule only; never rewrite historical fee or tax records.
 * The payer for 원종초 is unknown unless explicitly configured.
 */
export const resolveBatchPayer = (
  contract: { type?: string; schoolName?: string; incomeTaxProfile?: { payerName?: string; businessNumber?: string; industryCode?: string } },
  inferred: BatchPayer | undefined,
): BatchPayer => {
  if (contract.type !== "contract") {
    return inferred || {
      payerName: contract.incomeTaxProfile?.payerName || "",
      businessNumber: contract.incomeTaxProfile?.businessNumber || "",
      industryCode: contract.incomeTaxProfile?.industryCode || "",
    };
  }
  if (!isWonjongSchool(contract.schoolName)) return COMPUTING_TEACHERS_ASSOCIATION;
  // 원종초 is deliberately never auto-assigned to ATC.
  const explicit = contract.incomeTaxProfile;
  if (explicit?.payerName && !isAtcPayer(explicit)) {
    return {
      payerName: explicit.payerName,
      businessNumber: explicit.businessNumber || "",
      industryCode: explicit.industryCode || "",
    };
  }
  return { payerName: "", businessNumber: "", industryCode: "" };
};

/** Move YYYY-MM by whole calendar months, including year boundaries. */
export const shiftFeeMonth = (monthKey: string, offset: number): string => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) || !Number.isSafeInteger(offset)) return monthKey;
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const expectedAtcWorkMonth = (depositDate: string): string => {
  const paymentMonth = /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(depositDate)
    ? depositDate.slice(0, 7) : "";
  return paymentMonth ? shiftFeeMonth(paymentMonth, -1) : "";
};

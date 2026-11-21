import { COMPUTING_TEACHERS_ASSOCIATION } from "@/lib/incomeTax";

export type BatchPayer = {
  payerName: string;
  businessNumber: string;
  industryCode: string;
};

const CHAMDASOM: BatchPayer = {
  payerName: "참다솜교육 사회적협동조합",
  businessNumber: "506-82-20645",
  industryCode: "940925",
};

const ARA_COOPERATIVE: BatchPayer = {
  payerName: "아라 사회적협동조합",
  businessNumber: "345-82-00175",
  industryCode: "940925",
};

const CLASS_FOR_EDU: BatchPayer = {
  payerName: "클래스포에듀",
  businessNumber: "370-81-02906",
  industryCode: "940903",
};

// 사용자 확인 업체명. 사업자번호·업종코드는 미확인 상태이므로 비워 둔다.
const CLOVER_EDU: BatchPayer = {
  payerName: "크로바에듀",
  businessNumber: "",
  industryCode: "",
};

export const normalizeFeeSchool = (value: unknown): string =>
  String(value || "").replace(/\s/g, "").replace(/초등학교/g, "초").replace(/초등/g, "초");

export const getFeeSchoolPayer = (schoolName: unknown): BatchPayer => {
  const school = normalizeFeeSchool(schoolName);
  if (/원종초/.test(school)) return CLASS_FOR_EDU;
  if (/사우초/.test(school)) return ARA_COOPERATIVE;
  if (/새솔초|하늘빛초/.test(school)) return CHAMDASOM;
  if (/등현초/.test(school)) return CLOVER_EDU;
  return COMPUTING_TEACHERS_ASSOCIATION;
};

export const isWonjongSchool = (schoolName: unknown): boolean =>
  /원종초/.test(normalizeFeeSchool(schoolName));

export const isAtcPayer = (payer: { payerName?: string; businessNumber?: string }): boolean => {
  const number = String(payer.businessNumber || "").replace(/\D/g, "");
  const name = String(payer.payerName || "").replace(/\s/g, "");
  return number === "1058222590" ||
    (!number && /^(?:사단법인|\(사\))?컴퓨팅교사협회(?:\(ATC\))?$|^ATC$/i.test(name));
};

export const sameFeePayer = (
  left: { payerName?: string; businessNumber?: string },
  right: { payerName?: string; businessNumber?: string },
): boolean => {
  const nameA = String(left.payerName || "").replace(/\s/g, "");
  const nameB = String(right.payerName || "").replace(/\s/g, "");
  const idA = String(left.businessNumber || "").replace(/\D/g, "");
  const idB = String(right.businessNumber || "").replace(/\D/g, "");
  if (idA && idB) return idA === idB && (nameA === nameB || isAtcPayer(left) && isAtcPayer(right));
  if (idA || idB) return nameA === nameB;
  return Boolean(nameA) && nameA === nameB;
};

/**
 * Bank receipt grouping only. Never rewrite or delete existing individual
 * receipts or saved tax records. Matching is school-name based for new batches.
 */
export const resolveBatchPayer = (
  contract: { type?: string; schoolName?: string; incomeTaxProfile?: { payerName?: string; businessNumber?: string; industryCode?: string } },
  _inferred?: BatchPayer,
): BatchPayer => getFeeSchoolPayer(contract.schoolName);

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

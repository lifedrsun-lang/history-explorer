import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { sanitizeFeeSettlement, type FeeSettlement } from "@/lib/feeSettlement";
import { isSupportedIndustryCode } from "@/lib/incomeTax";
import { AFTER_SCHOOL_ACADEMIC_YEAR } from "@/lib/studentRoster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEE_COLLECTION = "teacher_fee_contracts";
const SETTINGS_COLLECTION = "teacher_income_tax_estimates";
const normalize = (value: unknown) => String(value || "").trim();
const amount = (value: unknown) => {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
};
const validYear = (value: unknown) => {
  const year = Math.floor(Number(value));
  return year >= 2020 && year <= 2100 ? year : new Date().getFullYear();
};

type TaxProfile = {
  payerName: string;
  industryCode: string;
  businessNumber: string;
};

const sanitizeProfile = (value: unknown): TaxProfile | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const payerName = normalize(data.payerName);
  const industryCode = normalize(data.industryCode);
  if (!payerName || !isSupportedIndustryCode(industryCode)) return null;
  return {
    payerName,
    industryCode,
    businessNumber: normalize(data.businessNumber),
  };
};

const inferProfile = (contract: Record<string, unknown>): TaxProfile => {
  const saved = sanitizeProfile(contract.incomeTaxProfile);
  if (saved?.businessNumber) return saved;
  const payerName =
    normalize(contract.schoolName) || normalize(contract.title) || "업체 미지정";
  const searchable = `${payerName} ${normalize(contract.title)}`;
  if (/하늘빛|새솔/.test(searchable)) {
    return {
      payerName: "참다솜교육 사회적협동조합",
      industryCode: "940925",
      businessNumber: "506-82-20645",
    };
  }
  if (/사우/.test(searchable)) {
    return {
      payerName: "아라 사회적협동조합",
      industryCode: "940925",
      businessNumber: "345-82-00175",
    };
  }
  if (saved) return saved;
  if (/웅진|씽크빅/.test(searchable)) {
    return {
      payerName: "웅진씽크빅",
      industryCode: "940908",
      businessNumber: "141-81-09131",
    };
  }
  if (/글로벌금융판매/.test(searchable)) {
    return {
      payerName: "(주)글로벌금융판매",
      industryCode: "940906",
      businessNumber: "131-86-16703",
    };
  }
  if (contract.type === "afterschool") {
    return { payerName, industryCode: "940925", businessNumber: "" };
  }
  return { payerName, industryCode: "", businessNumber: "" };
};

const inferYear = (entry: FeeSettlement, key: string) => {
  if (entry.taxYear) return validYear(entry.taxYear);
  if (/^\d{4}-\d{2}-\d{2}$/.test(entry.receivedDate || "")) {
    return Number(entry.receivedDate!.slice(0, 4));
  }
  if (/^\d{4}-\d{2}$/.test(key)) return Number(key.slice(0, 4));
  return AFTER_SCHOOL_ACADEMIC_YEAR;
};

const inferMonth = (entry: FeeSettlement, key: string) => {
  if (/^\d{4}-\d{2}$/.test(key)) return Number(key.slice(5, 7));
  const quarterMatch = key.match(/^Q([1-4])-T([1-3])/i);
  if (quarterMatch) {
    const quarterMonths: Record<string, number[]> = {
      "1": [3, 4, 5],
      "2": [6, 7, 8],
      "3": [9, 10, 11],
      "4": [12, 1, 2],
    };
    return quarterMonths[quarterMatch[1]]?.[Number(quarterMatch[2]) - 1] || null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(entry.receivedDate || "")) {
    return Number(entry.receivedDate!.slice(5, 7));
  }
  return null;
};

const hasPayment = (entry: FeeSettlement) =>
  Boolean(entry.receivedDate) ||
  entry.receivedAmount !== undefined ||
  (entry.calculationVersion !== 1 &&
    (amount(entry.grossAmount) > 0 || amount(entry.taxAmount) > 0));

const createRecord = (
  contractId: string,
  contract: Record<string, unknown>,
  key: string,
  rawEntry: Record<string, unknown>,
  profile: TaxProfile,
  fallbackGross = 0
) => {
  const entry = sanitizeFeeSettlement(rawEntry);
  if (!hasPayment(entry)) return null;

  const grossAmount = amount(entry.grossAmount) || amount(fallbackGross);
  const storedIncomeTax = amount(entry.incomeTax);
  const storedLocalTax = amount(entry.residentTax);
  const legacyTax = amount(entry.taxAmount);
  const taxWasEstimated =
    entry.calculationVersion !== 1 && storedIncomeTax === 0 && storedLocalTax === 0;
  const incomeTax = storedIncomeTax ||
    (legacyTax ? Math.round(legacyTax / 1.1) : Math.round(grossAmount * 0.03));
  const localTax = storedLocalTax ||
    (legacyTax ? Math.max(0, legacyTax - incomeTax) : Math.round(grossAmount * 0.003));
  const contractSearchable = `${normalize(contract.schoolName)} ${normalize(contract.title)}`;
  const usesFixedSchoolMapping = /하늘빛|새솔|사우/.test(contractSearchable);

  return {
    id: `${contractId}:${key}`,
    contractId,
    settlementKey: key,
    contractLabel: [normalize(contract.schoolName), normalize(contract.title)]
      .filter(Boolean)
      .join(" · "),
    payerName: usesFixedSchoolMapping
      ? profile.payerName
      : normalize(entry.payerName) || profile.payerName,
    industryCode: usesFixedSchoolMapping
      ? profile.industryCode
      : normalize(entry.industryCode) || profile.industryCode,
    businessNumber: profile.businessNumber,
    taxYear: inferYear(entry, key),
    paymentMonth: inferMonth(entry, key),
    receivedDate: normalize(entry.receivedDate),
    grossAmount,
    incomeTax,
    localTax,
    employmentInsurance:
      amount(entry.employmentInsurance) || amount(entry.insuranceFee),
    industrialInsurance: amount(entry.industrialInsurance),
    taxWasEstimated,
    metadataConfirmed: entry.taxMetaConfirmed === true,
  };
};

const sanitizeAdjustments = (value: unknown) => {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const previousYearRaw = data.previousYearRevenue;
  const hasOverrides =
    data.monthlyGrossOverrides && typeof data.monthlyGrossOverrides === "object";
  const monthlySource = hasOverrides
    ? data.monthlyGrossOverrides as Record<string, unknown>
    : data.monthlyGrossAmounts && typeof data.monthlyGrossAmounts === "object"
      ? data.monthlyGrossAmounts as Record<string, unknown>
      : {};
  const sanitizeMonths = (months: unknown) =>
    Array.from({ length: 12 }, (_, index) =>
      amount(Array.isArray(months) ? months[index] : 0)
    );
  const sanitizeOverrides = (months: unknown) =>
    Array.from({ length: 12 }, (_, index) => {
      const value = Array.isArray(months) ? months[index] : null;
      if (hasOverrides) {
        return value === null || value === undefined || value === "" ? null : amount(value);
      }
      const legacyAmount = amount(value);
      return legacyAmount > 0 ? legacyAmount : null;
    });
  const resignationDate = normalize(data.employmentResignationDate);
  const hasSavedValue = (key: string) => Object.prototype.hasOwnProperty.call(data, key);
  return {
    previousYearRevenue:
      previousYearRaw === null || previousYearRaw === "" || previousYearRaw === undefined
        ? null
        : amount(previousYearRaw),
    otherIncome: amount(data.otherIncome),
    incomeDeduction: amount(data.incomeDeduction),
    dependentDeductionCount: hasSavedValue("dependentDeductionCount")
      ? Math.min(10, Math.max(0, Math.floor(amount(data.dependentDeductionCount))))
      : 1,
    disabledDeductionCount: hasSavedValue("disabledDeductionCount")
      ? Math.min(2, Math.max(0, Math.floor(amount(data.disabledDeductionCount))))
      : 1,
    womanDeduction: data.womanDeduction === true,
    electronicFilingTaxCredit: hasSavedValue("electronicFilingTaxCredit")
      ? data.electronicFilingTaxCredit === true
      : true,
    taxCredit: amount(data.taxCredit),
    localTaxCredit: amount(data.localTaxCredit),
    additionalPrepaidIncomeTax: amount(data.additionalPrepaidIncomeTax),
    additionalPrepaidLocalTax: amount(data.additionalPrepaidLocalTax),
    monthlyGrossOverrides: {
      woongjinThinkbig: sanitizeOverrides(monthlySource.woongjinThinkbig),
      globalFinancialSales: sanitizeOverrides(monthlySource.globalFinancialSales),
      chamdasomEducation: sanitizeOverrides(monthlySource.chamdasomEducation),
      araCooperative: sanitizeOverrides(monthlySource.araCooperative),
      chromaEducation: sanitizeOverrides(monthlySource.chromaEducation),
    },
    employmentGrossAmounts: sanitizeMonths(data.employmentGrossAmounts),
    employmentWithheldIncomeTax: amount(data.employmentWithheldIncomeTax),
    employmentWithheldLocalTax: amount(data.employmentWithheldLocalTax),
    employmentResignationDate:
      /^\d{4}-\d{2}-\d{2}$/.test(resignationDate) ? resignationDate : "2026-05-22",
  };
};

export async function GET(request: Request) {
  try {
    const decoded = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const year = validYear(new URL(request.url).searchParams.get("year"));
    const [contractSnapshot, settingsSnapshot] = await Promise.all([
      db.collection(FEE_COLLECTION).get(),
      db.collection(SETTINGS_COLLECTION).doc(`${decoded.uid}_${year}`).get(),
    ]);

    const records: ReturnType<typeof createRecord>[] = [];
    const contracts = contractSnapshot.docs.map((docItem) => {
      const contract = docItem.data() as Record<string, unknown>;
      const inferredProfile = inferProfile(contract);
      const savedProfile = sanitizeProfile(contract.incomeTaxProfile);
      const settlements =
        contract.settlements && typeof contract.settlements === "object"
          ? contract.settlements as Record<string, Record<string, unknown>>
          : {};

      Object.entries(settlements).forEach(([key, entry]) => {
        const record = createRecord(
          docItem.id,
          contract,
          key,
          entry,
          inferredProfile,
          amount(contract.allowanceAmount)
        );
        if (record) records.push(record);
      });

      if (
        Object.keys(settlements).length === 0 &&
        (amount(contract.allowanceAmount) > 0 || normalize(contract.receivedDate))
      ) {
        const record = createRecord(
          docItem.id,
          contract,
          "legacy",
          {
            grossAmount: contract.allowanceAmount,
            taxAmount: contract.taxAmount,
            insuranceFee: contract.insuranceFee,
            receivedDate: contract.receivedDate,
            taxYear: contract.incomeTaxLegacyYear,
            taxMetaConfirmed: contract.incomeTaxLegacyConfirmed,
          },
          inferredProfile
        );
        if (record) records.push(record);
      }

      return {
        id: docItem.id,
        label: [normalize(contract.schoolName), normalize(contract.title)]
          .filter(Boolean)
          .join(" · "),
        payerName: inferredProfile.payerName,
        industryCode: inferredProfile.industryCode,
        businessNumber: inferredProfile.businessNumber,
        profileSaved: Boolean(savedProfile),
      };
    });

    return Response.json({
      year,
      records: records.filter((record) => record && record.taxYear === year),
      contracts,
      adjustments: sanitizeAdjustments(settingsSnapshot.data()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const decoded = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const body = await request.json();
    const action = normalize(body.action);

    if (action === "saveAdjustments") {
      const year = validYear(body.year);
      const adjustments = sanitizeAdjustments(body.adjustments);
      await db.collection(SETTINGS_COLLECTION).doc(`${decoded.uid}_${year}`).set(
        {
          ...adjustments,
          ownerUid: decoded.uid,
          year,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return Response.json({ adjustments });
    }

    const contractId = normalize(body.contractId);
    if (!contractId) {
      return jsonError("업체 정보를 찾을 수 없습니다.", 400, "missing_contract_id");
    }
    const docRef = db.collection(FEE_COLLECTION).doc(contractId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return jsonError("업체 정보를 찾을 수 없습니다.", 404, "contract_not_found");
    }
    const contract = snapshot.data() as Record<string, unknown>;

    if (action === "saveProfile") {
      const profile = sanitizeProfile(body.profile);
      if (!profile) {
        return jsonError("업체명과 업종코드를 확인해 주세요.", 400, "invalid_profile");
      }
      const applyToExisting = body.applyToExisting === true;
      const updates: Record<string, unknown> = {
        incomeTaxProfile: profile,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (applyToExisting) {
        const rawSettlements =
          contract.settlements && typeof contract.settlements === "object"
            ? contract.settlements as Record<string, Record<string, unknown>>
            : {};
        const settlements: Record<string, FeeSettlement> = {};
        Object.entries(rawSettlements).forEach(([key, rawEntry]) => {
          const entry = sanitizeFeeSettlement(rawEntry);
          settlements[key] = {
            ...entry,
            payerName: profile.payerName,
            industryCode: profile.industryCode,
            taxYear: inferYear(entry, key),
            taxMetaConfirmed: true,
          };
        });
        updates.settlements = settlements;
      }
      await docRef.update(updates);
      return Response.json({ ok: true });
    }

    if (action === "saveRecordMetadata") {
      const settlementKey = normalize(body.settlementKey);
      const profile = sanitizeProfile({
        payerName: body.payerName,
        industryCode: body.industryCode,
        businessNumber: body.businessNumber,
      });
      const taxYear = validYear(body.taxYear);
      if (!profile || !settlementKey) {
        return jsonError("지급 기록의 업체·업종 정보를 확인해 주세요.", 400, "invalid_record_metadata");
      }
      if (settlementKey === "legacy") {
        await docRef.update({
          incomeTaxProfile: profile,
          incomeTaxLegacyYear: taxYear,
          incomeTaxLegacyConfirmed: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const rawSettlements =
          contract.settlements && typeof contract.settlements === "object"
            ? contract.settlements as Record<string, Record<string, unknown>>
            : {};
        const rawEntry = rawSettlements[settlementKey];
        if (!rawEntry) {
          return jsonError("지급 기록을 찾을 수 없습니다.", 404, "settlement_not_found");
        }
        const entry = sanitizeFeeSettlement(rawEntry);
        await docRef.update({
          [`settlements.${settlementKey}`]: {
            ...entry,
            payerName: profile.payerName,
            industryCode: profile.industryCode,
            taxYear,
            taxMetaConfirmed: true,
          },
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      return Response.json({ ok: true });
    }

    return jsonError("지원하지 않는 수정입니다.", 400, "invalid_action");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

import { FieldValue } from "firebase-admin/firestore";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { sanitizeFeeSettlement, isPaidFeeInstallment, getFeePaymentEntries } from "@/lib/feeSettlement";
import { type DepositAllocation, type FeeBatchDeposit, depositAllocationKey } from "@/lib/feeBatchDeposits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_fee_batch_deposits";
const FEES = "teacher_fee_contracts";
const trim = (value: unknown, limit = 120) => String(value ?? "").trim().slice(0, limit);
const money = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 100000000000;
const dateValid = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const serialize = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) => {
  const item = doc.data() || {};
  return {
    id: doc.id,
    payerName: item.payerName || "",
    businessNumber: item.businessNumber || "",
    industryCode: item.industryCode || "",
    receivedDate: item.receivedDate || "",
    receivedAmount: item.receivedAmount || 0,
    status: item.status || "review",
    note: item.note || "",
    allocations: Array.isArray(item.allocations) ? item.allocations : [],
    createdAt: item.createdAt?.toDate?.()?.toISOString?.() || "",
  } satisfies FeeBatchDeposit;
};
const invalid = (message: string) => jsonError(message, 400, "invalid_batch_deposit");

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(COLLECTION).where("ownerUid", "==", teacher.uid).get();
    const deposits = snapshot.docs.map(serialize).sort((a, b) =>
      b.receivedDate.localeCompare(a.receivedDate) || b.createdAt!.localeCompare(a.createdAt!) || b.id.localeCompare(a.id));
    return Response.json({ deposits });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const payerName = trim(body?.payerName);
    const businessNumber = trim(body?.businessNumber, 30);
    const industryCode = trim(body?.industryCode, 20);
    const receivedDate = trim(body?.receivedDate, 10);
    const receivedAmount = Number(body?.receivedAmount);
    const note = trim(body?.note, 500);
    const reviewId = trim(body?.reviewId, 140);
    if (reviewId.includes("/")) return invalid("미배분 입금번호가 올바르지 않습니다.");

    if (!payerName || !dateValid(receivedDate) || !money(receivedAmount) || receivedAmount === 0) {
      return invalid("업체, 실제 입금일, 실수령액을 확인해 주세요.");
    }
    if (reviewId && (!Array.isArray(body?.allocations) || body.allocations.length === 0)) return invalid("배분할 수업을 선택해 주세요.");
    if (!Array.isArray(body?.allocations) || body.allocations.length > 100) {
      return invalid("입금에 연결된 수업 목록을 확인해 주세요.");
    }

    const allocations: DepositAllocation[] = [];
    for (const raw of body.allocations as Record<string, unknown>[]) {
      if (!raw || typeof raw !== "object") return invalid("수업 연결정보를 확인해 주세요.");
      const item: DepositAllocation = {
        contractId: trim(raw.contractId, 120),
        unitKey: trim(raw.unitKey, 40),
        classKey: raw.classKey === "A" || raw.classKey === "B" ? raw.classKey : "",
        schoolName: trim(raw.schoolName),
        label: trim(raw.label, 160),
        serviceMonth: trim(raw.serviceMonth, 7),
        expectedAmount: Number(raw.expectedAmount),
        grossAmount: Number(raw.grossAmount),
        receivedAmount: Number(raw.receivedAmount),
        incomeTax: Number(raw.incomeTax),
        residentTax: Number(raw.residentTax),
        employmentInsurance: Number(raw.employmentInsurance),
        industrialInsurance: Number(raw.industrialInsurance),
      };
      if (!item.contractId || !item.unitKey || !item.schoolName || !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.serviceMonth) ||
        ![item.expectedAmount, item.grossAmount, item.receivedAmount, item.incomeTax, item.residentTax, item.employmentInsurance, item.industrialInsurance].every(money) ||
        item.expectedAmount <= 0 || item.grossAmount <= 0 || item.grossAmount > item.expectedAmount ||
        item.receivedAmount + item.incomeTax + item.residentTax + item.employmentInsurance + item.industrialInsurance !== item.grossAmount) {
        return invalid("수업별 수당·공제·실수령액을 확인해 주세요.");
      }
      allocations.push(item);
    }

    const uniqueKeys = new Set(allocations.map(depositAllocationKey));
    if (uniqueKeys.size !== allocations.length) return invalid("같은 수업·반을 중복 선택했습니다.");
    if (allocations.length && allocations.reduce((sum, a) => sum + a.receivedAmount, 0) !== receivedAmount) {
      return invalid("수업별 실수령액의 합계가 실제 입금액과 다릅니다.");
    }
    const { db } = getFirebaseAdmin();
    const depositRef = reviewId ? db.collection(COLLECTION).doc(reviewId) : db.collection(COLLECTION).doc();

    const result = await db.runTransaction(async (tx) => {
      const contractIds = [...new Set(allocations.map((a) => a.contractId))];
      // Firestore transactions read all records before creating the new receipt.
      const contractSnapshots = await Promise.all(contractIds.map((id) => tx.get(db.collection(FEES).doc(id))));
      const reviewDoc = reviewId ? await tx.get(depositRef) : null;
      const depositSnapshot = await tx.get(db.collection(COLLECTION).where("ownerUid", "==", teacher.uid));
      const contracts = new Map(contractSnapshots.filter((s) => s.exists).map((s) => [s.id, s.data() || {}]));
      if (contracts.size !== contractIds.length) throw new Error("정산 대상 수업이 변경되었습니다. 목록을 새로고침해 주세요.");
      if (reviewId) {
        const old = reviewDoc?.data();
        if (!old || old.ownerUid !== teacher.uid || old.status !== "review" ||
          old.payerName !== payerName || old.businessNumber !== businessNumber ||
          old.receivedDate !== receivedDate || old.receivedAmount !== receivedAmount) {
          throw new Error("미배분 입금 기록이 변경되었습니다. 목록을 다시 확인해 주세요.");
        }
      }
      const previous = depositSnapshot.docs.filter((doc) => doc.id !== reviewId).map(serialize);
      // Equal amounts on the same day are legitimate when A and B arrive
      // separately. Only a pending unallocated transfer is held for review.
      if (previous.some((d) => d.payerName === payerName && d.businessNumber === businessNumber &&
        d.receivedDate === receivedDate && d.receivedAmount === receivedAmount && d.note === note &&
        (d.status === "review" || allocations.length === 0))) {
        throw new Error("같은 입금 정보의 기록이 이미 있습니다. 중복 여부 또는 미배분 내역을 확인해 주세요.");
      }
      const used = new Map<string, number>();
      for (const old of previous.filter((item) => item.status === "matched")) {
        for (const a of old.allocations) {
          const key = depositAllocationKey(a);
          used.set(key, (used.get(key) || 0) + Number(a.grossAmount || 0));
        }
      }
      for (const item of allocations) {
        const contract = contracts.get(item.contractId)!;
        if (trim(contract.schoolName) !== item.schoolName) {
          throw new Error("학교 정보가 달라졌습니다. 목록을 다시 확인해 주세요.");
        }
        const isAfterschool = contract.type === "afterschool";
        if (isAfterschool ? !/^Q[1-4]-T[1-3](-[AB])?$/.test(item.unitKey) :
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.unitKey)) {
          throw new Error("수업 정산 단위가 올바르지 않습니다.");
        }
        if (isAfterschool && !["A", "B"].includes(item.classKey)) {
          throw new Error("방과후 A반/B반 구분을 확인해 주세요.");
        }
        if (!isAfterschool && item.classKey) {
          throw new Error("건별계약은 반 구분 없이 연결해 주세요.");
        }
        const saved = (contract.settlements || {}) as Record<string, unknown>;
        const legacy = sanitizeFeeSettlement((saved[item.unitKey] || {}) as Record<string, unknown>);
        const alreadyPaid = getFeePaymentEntries(legacy, item.expectedAmount).some(isPaidFeeInstallment);
        if (alreadyPaid || (!Object.keys(saved).length && contract.receivedDate)) {
          throw new Error(`${item.schoolName} 수업에 기존 입금 기록이 있습니다. 중복 정산을 막기 위해 등록하지 않았습니다.`);
        }
        // A/B rows share a legacy unit at some schools, while other schools use -A/-B keys.
        const key = depositAllocationKey(item);
        const amountAlready = used.get(key) || 0;
        if (amountAlready + item.grossAmount > item.expectedAmount) {
          throw new Error(`${item.schoolName} ${item.label}의 남은 수당보다 큰 금액입니다.`);
        }
        used.set(key, amountAlready + item.grossAmount);
      }
      const payload = {
        ownerUid: teacher.uid,
        payerName, businessNumber, industryCode, receivedDate, receivedAmount,
        status: allocations.length ? "matched" : "review",
        allocations, note, updatedAt: FieldValue.serverTimestamp(),
      };
      if (reviewId) tx.update(depositRef, payload);
      else tx.create(depositRef, { ...payload, createdAt: FieldValue.serverTimestamp() });
      return { id: depositRef.id, status: allocations.length ? "matched" : "review" };
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("중복") || error.message.includes("수업") ||
      error.message.includes("학교") || error.message.includes("남은") || error.message.includes("입금"))) {
      return invalid(error.message);
    }
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id || id.includes("/")) return invalid("삭제할 입금내역을 선택해 주세요.");
    const { db } = getFirebaseAdmin();
    const ref = db.collection(COLLECTION).doc(id);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists || doc.data()?.ownerUid !== teacher.uid) {
        throw new Error("삭제할 입금내역이 없거나 권한이 없습니다.");
      }
      tx.delete(ref);
    });
    return Response.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

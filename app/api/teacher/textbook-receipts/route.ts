import { FieldValue } from "firebase-admin/firestore";

import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getEnrollmentStatus } from "@/lib/studentEnrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECORDS = "teacher_textbook_receipts";
const FEES = "teacher_fee_contracts";
const MAX_SNAPSHOT_STUDENTS = 500;

type StudentSnapshot = {
  id: string;
  name: string;
  school: string;
  grade: string;
  schoolClass: string;
  enrollmentStatus: string;
  phone: string;
};

const SAESOL_Q2_ROSTER = [
  { name: "황현서", grade: "2학년", schoolClass: "8반" },
  { name: "권유하", grade: "1학년", schoolClass: "10반" },
  { name: "최유나", grade: "2학년", schoolClass: "1반" },
  { name: "오채은", grade: "1학년", schoolClass: "7반" },
  { name: "김민결", grade: "2학년", schoolClass: "2반" },
  { name: "문지혁", grade: "2학년", schoolClass: "5반" },
  { name: "정예주", grade: "1학년", schoolClass: "2반" },
  { name: "임주원", grade: "3학년", schoolClass: "5반" },
  { name: "오하윤", grade: "4학년", schoolClass: "11반" },
  { name: "홍성빈", grade: "6학년", schoolClass: "2반" },
  { name: "홍성현", grade: "3학년", schoolClass: "3반" },
  { name: "이상윤", grade: "4학년", schoolClass: "6반" },
  { name: "허다은", grade: "3학년", schoolClass: "1반" },
  { name: "최라엘", grade: "3학년", schoolClass: "1반" },
  { name: "홍무화", grade: "3학년", schoolClass: "4반" },
  { name: "한성연", grade: "3학년", schoolClass: "5반" },
  { name: "김재윤", grade: "3학년", schoolClass: "7반" },
  { name: "최재용", grade: "3학년", schoolClass: "1반" },
  { name: "김도윤", grade: "3학년", schoolClass: "8반" },
  { name: "권제나", grade: "3학년", schoolClass: "9반" },
  { name: "한정우", grade: "3학년", schoolClass: "6반" },
  { name: "경세아", grade: "6학년", schoolClass: "1반" },
  { name: "최하늘", grade: "3학년", schoolClass: "2반" },
] as const;

const normalize = (value: unknown) => String(value || "").trim();

const normalizeSchoolName = (value: unknown) =>
  normalize(value).replace(/\s/g, "").replace(/초등학교/g, "초").replace(/초등/g, "초");

const isSameSchool = (a: unknown, b: unknown) => {
  const left = normalizeSchoolName(a);
  const right = normalizeSchoolName(b);
  return Boolean(left && right && (left === right || left.endsWith(right) || right.endsWith(left)));
};

const normalizeChecks = (value: unknown) => {
  const source = Array.isArray(value) ? value : [];
  return [Boolean(source[0]), Boolean(source[1]), Boolean(source[2])];
};

const normalizePhone = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim().slice(0, 40);
};

const getStudentPhone = (data: FirebaseFirestore.DocumentData) => {
  const directCandidates = [
    data.phone,
    data.phoneNumber,
    data.studentPhone,
    data.parentPhone,
    data.parentPhoneNumber,
    data.guardianPhone,
    data.guardianPhoneNumber,
    data.contactPhone,
    data.contactNumber,
    data.mobile,
    data.mobileNumber,
    data.tel,
    data.telephone,
    data["전화번호"],
    data["연락처"],
    data["학부모연락처"],
    data["보호자연락처"],
  ];
  const nestedCandidates = [
    data.parent?.phone,
    data.parent?.phoneNumber,
    data.guardian?.phone,
    data.guardian?.phoneNumber,
    data.contact?.phone,
    data.contact?.phoneNumber,
  ];

  for (const value of [...directCandidates, ...nestedCandidates]) {
    const phone = normalizePhone(value);
    if (phone) return phone;
  }

  for (const [key, value] of Object.entries(data)) {
    if (!/(phone|mobile|telephone|tel|연락처|전화번호)/i.test(key)) continue;
    const phone = normalizePhone(value);
    if (phone) return phone;
  }

  return "";
};

const getRule = (schoolName: string) => {
  const key = normalizeSchoolName(schoolName);
  if (key.includes("새솔초")) return "all_after_enrollment";
  if (key.includes("하늘빛초")) return "started_terms_only";
  return "follow_fee_checks";
};

const toStudentSnapshot = (
  id: string,
  data: FirebaseFirestore.DocumentData,
  fallbackSchool = ""
): StudentSnapshot => ({
  id,
  name: normalize(data.name),
  school: normalize(data.school) || normalize(fallbackSchool),
  grade: normalize(data.grade),
  schoolClass: normalize(data.schoolClass || data.className || data.class),
  enrollmentStatus: getEnrollmentStatus(data),
  phone: getStudentPhone(data),
});

const sanitizeStudentSnapshots = (value: unknown, fallbackSchool: string) => {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_SNAPSHOT_STUDENTS)
    .map((item) => {
      const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: normalize(source.id).slice(0, 200),
        name: normalize(source.name).slice(0, 100),
        school: (normalize(source.school) || fallbackSchool).slice(0, 100),
        grade: normalize(source.grade).slice(0, 40),
        schoolClass: normalize(source.schoolClass).slice(0, 40),
        enrollmentStatus: normalize(source.enrollmentStatus).slice(0, 40),
        phone: normalizePhone(source.phone),
      } satisfies StudentSnapshot;
    })
    .filter((student) => student.id && student.name);
};

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const requestedSchool = new URL(request.url).searchParams.get("school") || "";
    const { db } = getFirebaseAdmin();
    const [feeSnapshot, studentSnapshot, recordSnapshot] = await Promise.all([
      db.collection(FEES).where("type", "==", "afterschool").get(),
      db.collection("students").get(),
      db.collection(RECORDS).where("teacherUid", "==", teacher.uid).get(),
    ]);

    const contracts = feeSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((contract) => !requestedSchool || isSameSchool(contract.schoolName, requestedSchool));
    const contractIds = new Set(contracts.map((contract) => contract.id));
    const studentById = new Map(studentSnapshot.docs.map((doc) => [doc.id, doc.data()]));
    const students = studentSnapshot.docs
      .map((doc) => toStudentSnapshot(doc.id, doc.data()))
      .filter((student) => student.name && student.school);

    const records = recordSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((record) => !requestedSchool || contractIds.has(normalize(record.contractId)));

    return Response.json({
      schools: contracts.map((contract) => ({
        contractId: contract.id,
        schoolName: normalize(contract.schoolName),
        title: normalize(contract.title),
        rule: getRule(contract.schoolName),
        quarterParticipation: contract.quarterParticipation || {},
        quarterStudentSnapshots: (() => {
          if (!normalizeSchoolName(contract.schoolName).includes("새솔초")) return {};
          const current = students.filter((student) => isSameSchool(student.school, contract.schoolName));
          const q2 = SAESOL_Q2_ROSTER.map((rosterStudent) => {
            const existing = current.find((student) => student.name === rosterStudent.name);
            return {
              id: existing?.id || `history_saesol_q2_${rosterStudent.name}`,
              name: rosterStudent.name,
              school: normalize(contract.schoolName),
              grade: rosterStudent.grade,
              schoolClass: rosterStudent.schoolClass,
              enrollmentStatus: existing?.enrollmentStatus || "ended",
              phone: existing?.phone || "",
            } satisfies StudentSnapshot;
          });
          return { Q2: q2 };
        })(),
        students: (() => {
          const current = students.filter((student) => isSameSchool(student.school, contract.schoolName));
          const historicalIds = new Set<string>();
          Object.values(contract.quarterParticipation || {}).forEach((quarterValue: any) => {
            Object.entries(quarterValue || {}).forEach(([studentId, checks]: any) => {
              if (Array.isArray(checks) && checks.slice(0, 3).some(Boolean)) historicalIds.add(studentId);
            });
          });
          const byId = new Map(current.map((student) => [student.id, student]));
          historicalIds.forEach((studentId) => {
            if (byId.has(studentId)) return;
            const data = studentById.get(studentId);
            if (!data) return;
            byId.set(studentId, toStudentSnapshot(studentId, data, contract.schoolName));
          });
          return Array.from(byId.values()).filter((student) => student.name);
        })(),
      })),
      records,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401, message);
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const contractId = normalize(body?.contractId);
    const quarter = normalize(body?.quarter);
    if (!contractId || !/^Q[1-4]$/.test(quarter)) {
      return jsonError("학교와 분기를 확인해 주세요.", 400, "invalid_textbook_receipt");
    }

    const { db } = getFirebaseAdmin();
    const contractSnapshot = await db.collection(FEES).doc(contractId).get();
    const contract = contractSnapshot.data();
    if (!contractSnapshot.exists || normalize(contract?.type) !== "afterschool") {
      return jsonError("학교 정보를 찾을 수 없습니다.", 404, "fee_contract_not_found");
    }

    const schoolName = normalize(contract?.schoolName);
    if (!schoolName || (body?.schoolName && !isSameSchool(body.schoolName, schoolName))) {
      return jsonError("학교 정보가 일치하지 않습니다.", 400, "school_scope_mismatch");
    }

    const receipts: Record<string, boolean[]> = {};
    if (body?.receipts && typeof body.receipts === "object") {
      Object.entries(body.receipts as Record<string, unknown>).forEach(([studentId, checks]) => {
        receipts[studentId] = normalizeChecks(checks);
      });
    }
    const studentSnapshots = sanitizeStudentSnapshots(body?.studentSnapshots, schoolName);

    const id = `${teacher.uid}__${contractId}__${quarter}`;
    await db.collection(RECORDS).doc(id).set(
      {
        teacherUid: teacher.uid,
        contractId,
        schoolName,
        quarter,
        receipts,
        studentSnapshots,
        rule: getRule(schoolName),
        confirmedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return Response.json({ ok: true, id, studentCount: studentSnapshots.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401, message);
    return handleRouteError(error);
  }
}

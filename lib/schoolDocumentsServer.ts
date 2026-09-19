import "server-only";

import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getAllContractSchools,
  getContractSchool,
} from "@/lib/contractSchoolsServer";
import {
  SCHOOL_DOCUMENT_DEFINITIONS,
  SCHOOL_DOCUMENT_RECORD_COLLECTION,
  isApplicationDocumentKind,
  isSameSchoolDocument,
  normalizeSchoolDocumentKey,
  type SchoolDocumentKind,
  type SchoolDocumentListItem,
  type SchoolDocumentStatus,
} from "@/lib/schoolDocuments";

const ATC_CONFIRMATION_COLLECTION = "teacher_atc_confirmations";

type ApplicationDocumentRecordDraft = {
  schoolSlug?: unknown;
  documentDate?: unknown;
  documentKinds?: unknown;
};

const normalize = (value: unknown, maxLength = 240) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const normalizeDate = (value: unknown) => {
  const date = normalize(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
};

const toIso = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === "function") {
      const date = candidate.toDate();
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }
  return "";
};

const formatYearMonth = (value: unknown) => {
  const yearMonth = normalize(value, 7);
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return "";
  return `${yearMonth.slice(0, 4)}년 ${Number(yearMonth.slice(5))}월`;
};

const formatDocumentDate = (value: unknown) => {
  const date = normalizeDate(value);
  return date ? `${date.replaceAll("-", ".")} 작성` : "";
};

const getAtcStatus = (data: FirebaseFirestore.DocumentData) => {
  if (data.submittedAt || data.status === "submitted") {
    return { status: "submitted", statusLabel: "제출완료" } as const;
  }
  if (data.schoolSignatureDataUrl || data.status === "signed") {
    return { status: "generated", statusLabel: "생성완료" } as const;
  }
  return { status: "draft", statusLabel: "작성중" } as const;
};

const getApplicationStatus = (value: unknown): {
  status: SchoolDocumentStatus;
  statusLabel: string;
} => {
  if (value === "submitted") {
    return { status: "submitted", statusLabel: "제출완료" };
  }
  return { status: "generated", statusLabel: "생성완료" };
};

export const resolveContractSchoolSlugForName = async (schoolName: string) => {
  const schoolKey = normalizeSchoolDocumentKey(schoolName);
  if (!schoolKey) return "";

  const schools = await getAllContractSchools();
  const match = schools.find(
    (school) =>
      isSameSchoolDocument(school.schoolName, schoolKey) ||
      isSameSchoolDocument(school.displayName, schoolKey)
  );
  return match?.slug || "";
};

export const getSchoolDocuments = async (
  teacherUid: string,
  schoolSlug: string
) => {
  const school = await getContractSchool(schoolSlug, {
    includeUnpublished: true,
  });
  if (!school) throw new Error("school_not_found");

  const { db } = getFirebaseAdmin();
  const [atcSnapshot, recordSnapshot] = await Promise.all([
    db
      .collection(ATC_CONFIRMATION_COLLECTION)
      .where("teacherUid", "==", teacherUid)
      .get(),
    db
      .collection(SCHOOL_DOCUMENT_RECORD_COLLECTION)
      .where("teacherUid", "==", teacherUid)
      .get(),
  ]);
  const atcDocuments = atcSnapshot.docs.flatMap((document) => {
    const data = document.data();
    const savedSlug = normalize(data.schoolSlug, 40);
    const matchesSchool = savedSlug
      ? savedSlug === school.slug
      : isSameSchoolDocument(data.schoolName, school.schoolName) ||
        isSameSchoolDocument(data.schoolName, school.displayName);
    if (!matchesSchool) return [];

    const definition = SCHOOL_DOCUMENT_DEFINITIONS["atc-confirmation"];
    const yearMonth = normalize(data.yearMonth, 7);
    const status = getAtcStatus(data);
    const createdAt = toIso(data.createdAt);
    const updatedAt = toIso(data.updatedAt) || createdAt;
    const params = new URLSearchParams({
      yearMonth,
      school: normalize(data.schoolName, 160) || school.schoolName,
      schoolSlug: school.slug,
    });

    return [
      {
        id: `atc:${document.id}`,
        schoolSlug: school.slug,
        schoolName: normalize(data.schoolName, 160) || school.schoolName,
        title: definition.title,
        kind: "atc-confirmation",
        kindLabel: definition.kindLabel,
        periodLabel: formatYearMonth(yearMonth),
        ...status,
        createdAt,
        updatedAt,
        previewUrl: `/teacher/atc-confirmations?${params.toString()}`,
        fileAvailability: "browser-print",
        fileAvailabilityLabel: "문서 기록 · 파일 미보관",
      } satisfies SchoolDocumentListItem,
    ];
  });

  const applicationDocuments = recordSnapshot.docs.flatMap((document) => {
    const data = document.data();
    if (normalize(data.schoolSlug, 40) !== school.slug) return [];
    const kind = normalize(data.documentKind, 60);
    if (!isApplicationDocumentKind(kind)) return [];

    const definition = SCHOOL_DOCUMENT_DEFINITIONS[kind];
    const documentDate = normalizeDate(data.documentDate);
    const status = getApplicationStatus(data.status);
    const createdAt = toIso(data.createdAt);
    const updatedAt = toIso(data.updatedAt) || createdAt;
    const params = new URLSearchParams({
      schoolSlug: school.slug,
      documentDate,
      documentTypes: kind,
    });

    return [
      {
        id: `application:${document.id}`,
        schoolSlug: school.slug,
        schoolName: normalize(data.schoolNameSnapshot, 160) || school.schoolName,
        title: definition.title,
        kind,
        kindLabel: definition.kindLabel,
        periodLabel: formatDocumentDate(documentDate),
        ...status,
        createdAt,
        updatedAt,
        previewUrl: `/teacher/application-documents?${params.toString()}`,
        fileAvailability: "browser-print",
        fileAvailabilityLabel: "문서 기록 · 파일 미보관",
      } satisfies SchoolDocumentListItem,
    ];
  });

  const documents = [...atcDocuments, ...applicationDocuments].sort((a, b) =>
    (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)
  );

  return { school, documents };
};

export const recordApplicationDocuments = async (
  teacherUid: string,
  draft: ApplicationDocumentRecordDraft
) => {
  const schoolSlug = normalize(draft.schoolSlug, 40);
  const documentDate = normalizeDate(draft.documentDate);
  const rawKinds = Array.isArray(draft.documentKinds) ? draft.documentKinds : [];
  const documentKinds = Array.from(
    new Set(rawKinds.filter(isApplicationDocumentKind))
  );

  if (!schoolSlug || !documentDate || documentKinds.length === 0) {
    throw new Error("invalid_document_record");
  }

  const school = await getContractSchool(schoolSlug, {
    includeUnpublished: true,
  });
  if (!school) throw new Error("school_not_found");

  const { db } = getFirebaseAdmin();
  const batch = db.batch();
  const generationBatchId = randomUUID();

  documentKinds.forEach((documentKind: SchoolDocumentKind) => {
    const ref = db.collection(SCHOOL_DOCUMENT_RECORD_COLLECTION).doc();
    batch.set(ref, {
      teacherUid,
      schoolSlug: school.slug,
      schoolNameSnapshot: school.schoolName,
      documentKind,
      documentDate,
      status: "generated",
      source: "application-documents",
      fileAvailability: "browser-print",
      generationBatchId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { count: documentKinds.length, schoolSlug: school.slug };
};

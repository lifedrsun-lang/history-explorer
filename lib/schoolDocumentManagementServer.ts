import "server-only";

import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getAllContractSchools,
  getContractSchool,
} from "@/lib/contractSchoolsServer";
import {
  SCHOOL_DOCUMENT_SETTINGS_COLLECTION,
  SCHOOL_DOCUMENT_SUBMISSION_CHANNELS,
  SCHOOL_DOCUMENT_SUBMISSION_COLLECTION,
  getSchoolDocumentProcessingMethod,
  type SchoolDocumentManagementStatus,
  type SchoolDocumentSettings,
  type SchoolDocumentSubmissionChannel,
  type SchoolDocumentSubmissionHistoryItem,
} from "@/lib/schoolDocumentManagement";

type StoredSettings = {
  teacherUid?: unknown;
  schoolSlug?: unknown;
  schoolName?: unknown;
  displayName?: unknown;
  contactName?: unknown;
  contactPhone?: unknown;
  contactEmail?: unknown;
  submissionChannel?: unknown;
  facilityId?: unknown;
  verificationCode?: unknown;
  facilityManagerName?: unknown;
  additionalRequiredDocuments?: unknown;
  latestStatus?: unknown;
  latestProcessedAt?: unknown;
  updatedAt?: unknown;
};

const text = (value: unknown, max = 240) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

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

const settingsId = (teacherUid: string, schoolSlug: string) =>
  `${teacherUid}__${schoolSlug}`;

const settingsRef = (teacherUid: string, schoolSlug: string) => {
  const { db } = getFirebaseAdmin();
  return db
    .collection(SCHOOL_DOCUMENT_SETTINGS_COLLECTION)
    .doc(settingsId(teacherUid, schoolSlug));
};

const validStatus = (value: unknown): SchoolDocumentManagementStatus =>
  value === "generated" || value === "submitted" ? value : "unprocessed";

const validChannel = (value: unknown): SchoolDocumentSubmissionChannel | "" =>
  SCHOOL_DOCUMENT_SUBMISSION_CHANNELS.includes(
    value as SchoolDocumentSubmissionChannel
  )
    ? (value as SchoolDocumentSubmissionChannel)
    : "";

const normalizeAdditionalDocuments = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(
        new Set(value.map((item) => text(item, 120)).filter(Boolean))
      ).slice(0, 30)
    : [];

const serializeSettings = (
  school: { slug: string; schoolName: string; displayName: string },
  stored: StoredSettings | undefined
): SchoolDocumentSettings => {
  const facilityId = text(stored?.facilityId, 80);
  const verificationCode = text(stored?.verificationCode, 80);
  return {
    schoolSlug: school.slug,
    schoolName: school.schoolName,
    displayName: school.displayName,
    contactName: text(stored?.contactName, 120),
    contactPhone: text(stored?.contactPhone, 40),
    contactEmail: text(stored?.contactEmail, 254),
    processingMethod: getSchoolDocumentProcessingMethod(
      facilityId,
      verificationCode
    ),
    submissionChannel: validChannel(stored?.submissionChannel),
    facilityId,
    verificationCode,
    facilityManagerName: text(stored?.facilityManagerName, 120),
    additionalRequiredDocuments: normalizeAdditionalDocuments(
      stored?.additionalRequiredDocuments
    ),
    latestStatus: validStatus(stored?.latestStatus),
    latestProcessedAt: toIso(stored?.latestProcessedAt),
    updatedAt: toIso(stored?.updatedAt),
  };
};

export async function getAllSchoolDocumentSettings(teacherUid: string) {
  const schools = await getAllContractSchools();
  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(SCHOOL_DOCUMENT_SETTINGS_COLLECTION)
    .where("teacherUid", "==", teacherUid)
    .get();
  const storedBySlug = new Map(
    snapshot.docs.map((document) => [
      text(document.data().schoolSlug, 40),
      document.data() as StoredSettings,
    ])
  );
  return schools.map((school) =>
    serializeSettings(school, storedBySlug.get(school.slug))
  );
}

export async function getSchoolDocumentSettings(
  teacherUid: string,
  schoolSlug: string
) {
  const school = await getContractSchool(schoolSlug, {
    includeUnpublished: true,
  });
  if (!school) throw new Error("school_not_found");
  const snapshot = await settingsRef(teacherUid, school.slug).get();
  return serializeSettings(
    school,
    snapshot.exists ? (snapshot.data() as StoredSettings) : undefined
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateSchoolDocumentSettings(
  teacherUid: string,
  schoolSlug: string,
  draft: Record<string, unknown>
) {
  const school = await getContractSchool(schoolSlug, {
    includeUnpublished: true,
  });
  if (!school) throw new Error("school_not_found");

  const contactName = text(draft.contactName, 120);
  const contactPhone = text(draft.contactPhone, 40);
  const contactEmail = text(draft.contactEmail, 254).toLowerCase();
  const submissionChannel = validChannel(draft.submissionChannel);
  const facilityId = text(draft.facilityId, 80);
  const verificationCode = text(draft.verificationCode, 80);
  const facilityManagerName = text(draft.facilityManagerName, 120);
  const additionalRequiredDocuments = normalizeAdditionalDocuments(
    draft.additionalRequiredDocuments
  );

  if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
    throw new Error("invalid_contact_email");
  }
  if (Boolean(facilityId) !== Boolean(verificationCode)) {
    throw new Error("incomplete_facility_codes");
  }
  if (submissionChannel === "email" && !contactEmail) {
    throw new Error("email_channel_requires_recipient");
  }

  const ref = settingsRef(teacherUid, school.slug);
  const existing = await ref.get();
  await ref.set(
    {
      teacherUid,
      schoolSlug: school.slug,
      schoolName: school.schoolName,
      displayName: school.displayName,
      contactName,
      contactPhone,
      contactEmail,
      submissionChannel,
      facilityId,
      verificationCode,
      facilityManagerName,
      additionalRequiredDocuments,
      latestStatus: validStatus(existing.data()?.latestStatus),
      latestProcessedAt: existing.data()?.latestProcessedAt || null,
      createdAt: existing.data()?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false }
  );
  return getSchoolDocumentSettings(teacherUid, school.slug);
}

export async function markSchoolDocumentsGenerated(
  teacherUid: string,
  schoolSlug: string,
  processedAt = new Date().toISOString()
) {
  const settings = await getSchoolDocumentSettings(teacherUid, schoolSlug);
  await settingsRef(teacherUid, settings.schoolSlug).set(
    {
      teacherUid,
      schoolSlug: settings.schoolSlug,
      schoolName: settings.schoolName,
      displayName: settings.displayName,
      latestStatus: "generated",
      latestProcessedAt: processedAt,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function appendSchoolDocumentSubmission(
  teacherUid: string,
  input: {
    schoolSlug: string;
    documentTitles: string[];
    submissionChannel?: SchoolDocumentSubmissionChannel;
    recipientEmail?: string;
    gmailMessageId?: string;
    submittedAt?: string;
  }
) {
  const settings = await getSchoolDocumentSettings(teacherUid, input.schoolSlug);
  const channel = input.submissionChannel || settings.submissionChannel;
  if (!channel) throw new Error("submission_channel_required");
  const documentTitles = Array.from(
    new Set(input.documentTitles.map((item) => text(item, 160)).filter(Boolean))
  ).slice(0, 40);
  if (documentTitles.length === 0) throw new Error("documents_required");
  const submittedAt = input.submittedAt || new Date().toISOString();
  const recipientEmail =
    channel === "email"
      ? text(input.recipientEmail || settings.contactEmail, 254).toLowerCase()
      : "";
  if (channel === "email" && !EMAIL_PATTERN.test(recipientEmail)) {
    throw new Error("recipient_email_required");
  }

  const { db } = getFirebaseAdmin();
  const historyRef = db
    .collection(SCHOOL_DOCUMENT_SUBMISSION_COLLECTION)
    .doc(randomUUID());
  const currentSettingsRef = settingsRef(teacherUid, settings.schoolSlug);
  const batch = db.batch();
  batch.create(historyRef, {
    teacherUid,
    schoolSlug: settings.schoolSlug,
    schoolName: settings.schoolName,
    contactName: settings.contactName,
    contactPhone: settings.contactPhone,
    recipientEmail,
    submissionChannel: channel,
    documentTitles,
    submittedAt,
    gmailMessageId: text(input.gmailMessageId, 240),
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    currentSettingsRef,
    {
      teacherUid,
      schoolSlug: settings.schoolSlug,
      schoolName: settings.schoolName,
      displayName: settings.displayName,
      latestStatus: "submitted",
      latestProcessedAt: submittedAt,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
  return { id: historyRef.id, submittedAt };
}

export async function getSchoolDocumentSubmissionHistory(
  teacherUid: string,
  schoolSlug: string
): Promise<SchoolDocumentSubmissionHistoryItem[]> {
  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(SCHOOL_DOCUMENT_SUBMISSION_COLLECTION)
    .where("teacherUid", "==", teacherUid)
    .get();
  return snapshot.docs
    .flatMap((document) => {
      const data = document.data();
      if (text(data.schoolSlug, 40) !== schoolSlug) return [];
      const channel = validChannel(data.submissionChannel);
      if (!channel) return [];
      return [
        {
          id: document.id,
          schoolSlug,
          schoolName: text(data.schoolName, 160),
          contactName: text(data.contactName, 120),
          recipientEmail: text(data.recipientEmail, 254),
          submissionChannel: channel,
          documentTitles: normalizeAdditionalDocuments(data.documentTitles),
          submittedAt: toIso(data.submittedAt),
          gmailMessageId: text(data.gmailMessageId, 240),
        },
      ];
    })
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

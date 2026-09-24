import "server-only";

import { createHash, createHmac, randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getAllContractSchools,
  getContractSchoolAndClassroomByToken,
} from "@/lib/contractSchoolsServer";
import {
  getClassroomAccount,
  getClassroomAccountRoster,
} from "@/lib/classroomAccountRosterServer";
import { getSupportedClassroomSchoolName, normalizeSchoolName } from "@/lib/gaebongClassroom";
import {
  getClassActivityDefinition,
  isMoralMachineAnswers,
  type MoralMachineAnswers,
} from "@/lib/classActivities";

const ROOT_COLLECTION = "class_activities";
const SESSION_COLLECTION = "class_activity_sessions";
const SESSION_COOKIE = "class_activity_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type ClassActivityContext = {
  activityId: string;
  schoolSlug: string;
  schoolName: string;
  schoolDisplayName: string;
  grade: number;
  classNumber: number;
  classroomToken: string;
  rosterSchool: string;
};

export type ActivitySubmission = {
  participantHash: string;
  activityId: string;
  activityType: string;
  schoolSlug: string;
  schoolName: string;
  grade: number;
  classNumber: number;
  answers: MoralMachineAnswers;
  submittedAt?: unknown;
  updatedAt?: unknown;
  version: number;
};

export type ActivityAggregate = {
  participants: number;
  rosterTotal: number;
  mostSaved: Record<string, number>;
  mostSacrificed: Record<string, number>;
  savingMoreLives: number[];
  protectingPassengers: number[];
};

const safeKey = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 40);

const rootRef = (activityId: string) => {
  const { db } = getFirebaseAdmin();
  return db.collection(ROOT_COLLECTION).doc(activityId);
};

const submissionsRef = (activityId: string) =>
  rootRef(activityId).collection("submissions");

const settingsRef = (activityId: string, schoolSlug: string, grade: number) =>
  rootRef(activityId)
    .collection("settings")
    .doc(safeKey(`${schoolSlug}:${grade}`));

const getCookie = (request: Request, name: string) => {
  const cookie = request.headers.get("cookie") || "";
  for (const pair of cookie.split(";")) {
    const [key, ...parts] = pair.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
};

const sessionCookieValue = (token: string) => {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
};

const participantSecret = () =>
  process.env.ACTIVITY_PARTICIPANT_SECRET ||
  process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
  "local-development-only";

const participantHash = (context: ClassActivityContext, accountId: string) =>
  createHmac("sha256", participantSecret())
    .update(
      [
        context.activityId,
        context.schoolSlug,
        context.grade,
        context.classNumber,
        accountId,
      ].join(":"),
      "utf8"
    )
    .digest("hex");

export const resolveClassActivityContext = async (
  activityIdValue: unknown,
  classroomTokenValue: unknown,
  options: { includeUnpublished?: boolean } = {}
): Promise<ClassActivityContext | null> => {
  const activityId = String(activityIdValue || "").trim();
  const classroomToken = String(classroomTokenValue || "").trim();
  if (!getClassActivityDefinition(activityId) || !classroomToken) return null;

  const resolved = await getContractSchoolAndClassroomByToken(
    classroomToken,
    options
  );
  if (!resolved) return null;
  const classroom = resolved.classroom;

  const rosterSchool =
    getSupportedClassroomSchoolName({
      school: resolved.school.schoolName,
      grade: classroom.grade,
      classNumber: classroom.classNumber,
    }) ||
    normalizeSchoolName(resolved.school.schoolName);

  return {
    activityId,
    schoolSlug: resolved.school.slug,
    schoolName: resolved.school.schoolName,
    schoolDisplayName: resolved.school.displayName,
    grade: classroom.grade,
    classNumber: classroom.classNumber,
    classroomToken,
    rosterSchool,
  };
};

export const getActivityRosterNumbers = async (context: ClassActivityContext) => {
  const roster = await getClassroomAccountRoster({
    school: context.rosterSchool,
    grade: context.grade,
    classNumber: context.classNumber,
  });
  return roster.map((account) => account.classNumber);
};

export const createParticipantSession = async (
  context: ClassActivityContext,
  studentNumberValue: unknown
) => {
  const studentNumber = Number(studentNumberValue);
  if (!Number.isInteger(studentNumber) || studentNumber < 1 || studentNumber > 99) {
    throw new Error("invalid_student_number");
  }

  const account = await getClassroomAccount(
    {
      school: context.rosterSchool,
      grade: context.grade,
      classNumber: context.classNumber,
    },
    studentNumber
  );
  if (!account) throw new Error("student_not_found");

  const token = randomBytes(32).toString("base64url");
  const hash = participantHash(context, account.accountId);
  const { db } = getFirebaseAdmin();
  await db.collection(SESSION_COLLECTION).doc(safeKey(token)).set({
    activityId: context.activityId,
    participantHash: hash,
    schoolSlug: context.schoolSlug,
    schoolName: context.schoolName,
    grade: context.grade,
    classNumber: context.classNumber,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  return { token, cookie: sessionCookieValue(token), participantHash: hash };
};

export const getParticipantSession = async (
  request: Request,
  activityIdValue: unknown
) => {
  const activityId = String(activityIdValue || "").trim();
  const token = getCookie(request, SESSION_COOKIE);
  if (!token || !getClassActivityDefinition(activityId)) return null;

  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection(SESSION_COLLECTION).doc(safeKey(token)).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const expiresAt = data.expiresAt?.toDate?.() as Date | undefined;
  if (
    data.activityId !== activityId ||
    !expiresAt ||
    expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  return {
    activityId,
    participantHash: String(data.participantHash || ""),
    schoolSlug: String(data.schoolSlug || ""),
    schoolName: String(data.schoolName || ""),
    grade: Number(data.grade),
    classNumber: Number(data.classNumber),
  };
};

export const getSubmission = async (activityId: string, hash: string) => {
  const snapshot = await submissionsRef(activityId).doc(hash).get();
  return snapshot.exists
    ? ({ ...snapshot.data(), participantHash: snapshot.id } as ActivitySubmission)
    : null;
};

export const submitActivityAnswers = async (
  session: NonNullable<Awaited<ReturnType<typeof getParticipantSession>>>,
  answersValue: unknown
) => {
  const definition = getClassActivityDefinition(session.activityId);
  if (!definition || !isMoralMachineAnswers(answersValue)) {
    throw new Error("invalid_answers");
  }

  const { db } = getFirebaseAdmin();
  const reference = submissionsRef(session.activityId).doc(session.participantHash);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(reference);
    if (existing.exists) throw new Error("duplicate_submission");
    transaction.create(reference, {
      activityId: session.activityId,
      activityType: definition.type,
      schoolSlug: session.schoolSlug,
      schoolName: session.schoolName,
      grade: session.grade,
      classNumber: session.classNumber,
      answers: answersValue,
      version: 1,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

export const getResultsVisibility = async (
  activityId: string,
  schoolSlug: string,
  grade: number
) => {
  const snapshot = await settingsRef(activityId, schoolSlug, grade).get();
  return snapshot.exists ? snapshot.data()?.resultsVisible !== false : true;
};

export const setResultsVisibility = async (
  activityId: string,
  schoolSlug: string,
  grade: number,
  resultsVisible: boolean,
  updatedBy: string
) => {
  await settingsRef(activityId, schoolSlug, grade).set(
    {
      schoolSlug,
      grade,
      resultsVisible,
      updatedBy,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

const emptyAggregate = (rosterTotal = 0): ActivityAggregate => ({
  participants: 0,
  rosterTotal,
  mostSaved: {},
  mostSacrificed: {},
  savingMoreLives: [0, 0, 0, 0, 0],
  protectingPassengers: [0, 0, 0, 0, 0],
});

export const aggregateActivitySubmissions = (
  submissions: ActivitySubmission[],
  rosterTotal: number
) => {
  const result = emptyAggregate(rosterTotal);
  for (const submission of submissions) {
    if (!isMoralMachineAnswers(submission.answers)) continue;
    result.participants += 1;
    result.mostSaved[submission.answers.mostSaved] =
      (result.mostSaved[submission.answers.mostSaved] || 0) + 1;
    result.mostSacrificed[submission.answers.mostSacrificed] =
      (result.mostSacrificed[submission.answers.mostSacrificed] || 0) + 1;
    result.savingMoreLives[submission.answers.savingMoreLives - 1] += 1;
    result.protectingPassengers[submission.answers.protectingPassengers - 1] += 1;
  }
  return result;
};

export const getActivityResults = async (
  activityId: string,
  schoolSlug: string,
  grade: number,
  classNumber?: number
) => {
  const [school, snapshot] = await Promise.all([
    getAllContractSchools().then((schools) =>
      schools.find((item) => item.slug === schoolSlug)
    ),
    submissionsRef(activityId).get(),
  ]);
  if (!school) throw new Error("school_not_found");

  const classNumbers = school.classrooms
    .filter(
      (item) =>
        item.active !== false &&
        item.grade === grade &&
        (classNumber === undefined || item.classNumber === classNumber)
    )
    .map((item) => item.classNumber);

  const rosters = await Promise.all(
    classNumbers.map((item) =>
      getClassroomAccountRoster({
        school:
          getSupportedClassroomSchoolName({
            school: school.schoolName,
            grade,
            classNumber: item,
          }) || normalizeSchoolName(school.schoolName),
        grade,
        classNumber: item,
      })
    )
  );
  const submissions = snapshot.docs
    .map(
      (document) =>
        ({
          ...document.data(),
          participantHash: document.id,
        }) as ActivitySubmission
    )
    .filter(
      (item) =>
        item.schoolSlug === schoolSlug &&
        Number(item.grade) === grade &&
        (classNumber === undefined || Number(item.classNumber) === classNumber)
    );

  return aggregateActivitySubmissions(
    submissions,
    rosters.reduce((total, roster) => total + roster.length, 0)
  );
};

export const getActivityAdminDashboard = async (activityId: string) => {
  const [schools, submissionSnapshot, settingsSnapshot] = await Promise.all([
    getAllContractSchools(),
    submissionsRef(activityId).get(),
    rootRef(activityId).collection("settings").get(),
  ]);
  const submissions = submissionSnapshot.docs.map((document) => ({
    ...document.data(),
    participantHash: document.id,
  })) as ActivitySubmission[];
  const visibility = new Map(
    settingsSnapshot.docs.map((document) => {
      const data = document.data();
      return [`${data.schoolSlug}:${data.grade}`, data.resultsVisible !== false];
    })
  );

  const rows = [];
  for (const school of schools) {
    const grades = [...new Set(school.classrooms.filter((c) => c.active !== false).map((c) => c.grade))];
    for (const grade of grades) {
      for (const classroom of school.classrooms.filter((c) => c.active !== false && c.grade === grade)) {
        const rosterSchool =
          getSupportedClassroomSchoolName({
            school: school.schoolName,
            grade,
            classNumber: classroom.classNumber,
          }) || normalizeSchoolName(school.schoolName);
        const roster = await getClassroomAccountRoster({
          school: rosterSchool,
          grade,
          classNumber: classroom.classNumber,
        });
        rows.push({
          schoolSlug: school.slug,
          schoolName: school.displayName,
          grade,
          classNumber: classroom.classNumber,
          participants: submissions.filter(
            (item) =>
              item.schoolSlug === school.slug &&
              item.grade === grade &&
              item.classNumber === classroom.classNumber
          ).length,
          rosterTotal: roster.length,
          resultsVisible: visibility.get(`${school.slug}:${grade}`) ?? true,
        });
      }
    }
  }
  return rows;
};

export const resetActivityResults = async (
  activityId: string,
  schoolSlug: string,
  grade: number,
  classNumber?: number
) => {
  const snapshot = await submissionsRef(activityId).get();
  const matching = snapshot.docs.filter((document) => {
    const data = document.data();
    return (
      data.schoolSlug === schoolSlug &&
      Number(data.grade) === grade &&
      (classNumber === undefined || Number(data.classNumber) === classNumber)
    );
  });
  if (matching.length === 0) return 0;

  const { db } = getFirebaseAdmin();
  const batches: FirebaseFirestore.WriteBatch[] = [];
  for (let index = 0; index < matching.length; index += 400) {
    const batch = db.batch();
    matching.slice(index, index + 400).forEach((document) => batch.delete(document.ref));
    batches.push(batch);
  }
  await Promise.all(batches.map((batch) => batch.commit()));
  return matching.length;
};

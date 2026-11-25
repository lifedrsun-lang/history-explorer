import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  AFTER_SCHOOL_SCHOOLS,
  getAfterSchoolSchool,
  matchesAfterSchoolSchool,
} from "@/lib/afterSchool";
import { getEnrollmentStatus, getEnrollmentTerms } from "@/lib/studentEnrollment";
import { getStudentTeachingClass } from "@/lib/studentRoster";
import {
  ASSIGNMENTS_COLLECTION,
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
} from "@/lib/assignments";
import { getSubmissionDocId, verifyTeacherRequest } from "@/lib/assignmentServer";
import { validateGuardianNotice } from "@/lib/guardianNotice";
import { guardianLessonCountMatches, guardianTermPaused } from "@/lib/guardianTermPolicy";

export const guardianCollections = {
  schools: "guardian_school_configs",
  access: "guardian_student_access",
  sessions: "guardian_sessions",
  notices: "guardian_absence_notices",
  limits: "guardian_login_limits",
} as const;

type Lesson = {
  lesson: number;
  date: string;
  cancelled: boolean;
  eventId: string;
};

type ProposedClasses = Record<string, {
  lessons: Lesson[];
  supplies: string;
  extra: string;
}>;

type ScheduleImpactRow = {
  noticeId: string;
  studentId: string;
  teachingClass: string;
  kind: string;
  fromLesson: number;
  fromDate: string;
  toLesson?: number;
  toDate?: string;
  eventId: string;
};

const str = (value: unknown) => typeof value === "string" ? value.trim() : "";
const id = (value: unknown) => {
  const valueText = str(value);
  if (!valueText || valueText.length > 160 || valueText.includes("/") || valueText === "." || valueText === "..") {
    throw new Error("invalid_input");
  }
  return valueText;
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = () => randomBytes(24).toString("base64url");
const digest = (value: string, salt: string) => scryptSync(value, salt, 32).toString("hex");
const matches = (value: string, salt: unknown, expected: unknown) => {
  if (value.length > 128 || typeof salt !== "string" || typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(digest(value, salt), "hex"), Buffer.from(expected, "hex"));
};
const today = () => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export const guardianJson = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });

export function guardianError(error: unknown) {
  const message = error instanceof Error ? error.message : "server_error";
  const status: Record<string, number> = {
    disabled: 503,
    invalid_input: 400,
    invalid_login: 401,
    forbidden: 403,
    not_found: 404,
    rate_limited: 429,
    lesson_unavailable: 409,
    lesson_count_mismatch: 409,
    schedule_change_confirmation_required: 409,
  };
  return guardianJson({ error: status[message] ? message : "server_error" }, status[message] || 500);
}

function database() {
  if (process.env.GUARDIAN_CLASSROOM_ENABLED !== "true") throw new Error("disabled");
  return getFirebaseAdmin().db;
}

export async function guardianTeacher(request: Request) {
  database();
  const allowlist = (process.env.GUARDIAN_TEACHER_UIDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const teacher = await verifyTeacherRequest(request).catch(() => {
    throw new Error("forbidden");
  });
  if (!allowlist.includes(teacher.uid)) throw new Error("forbidden");
  return teacher;
}

export const isGuardianTermPaused = guardianTermPaused;

function school(value: unknown) {
  const selected = getAfterSchoolSchool(id(value));
  if (!selected) throw new Error("not_found");
  return selected;
}

export function schoolSlugForName(value: unknown) {
  for (const item of AFTER_SCHOOL_SCHOOLS) {
    if (matchesAfterSchoolSchool(value, item)) return item.slug;
  }
  return "";
}

async function readStudent(studentId: string, slug: string) {
  const db = database();
  const snap = await db.collection("students").doc(studentId).get();
  const data = snap.data();
  const selectedSchool = school(slug);
  if (!data || !matchesAfterSchoolSchool(data.school, selectedSchool) || getEnrollmentStatus(data) !== "active") {
    throw new Error("invalid_login");
  }
  const teachingClass = getStudentTeachingClass(data);
  if (!teachingClass) throw new Error("invalid_login");
  return { data, teachingClass };
}

function parseLessons(value: unknown): Lesson[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) throw new Error("invalid_input");
  const rows = value.map((item, index) => {
    const date = str(item?.date);
    const eventId = str(item?.eventId);
    if (!validDate(date) || Number(item?.lesson) !== index + 1 || eventId.length > 256) {
      throw new Error("invalid_input");
    }
    return { lesson: index + 1, date, cancelled: item?.cancelled === true, eventId };
  });
  const eventIds = rows.map((row) => row.eventId).filter(Boolean);
  if (
    new Set(rows.map((row) => row.date)).size !== rows.length
    || new Set(eventIds).size !== eventIds.length
    || rows.some((row, index) => index > 0 && row.date <= rows[index - 1].date)
  ) {
    throw new Error("invalid_input");
  }
  return rows;
}

function proposedClasses(body: any, slug: string, term: string): ProposedClasses {
  const classes: ProposedClasses = {};
  for (const className of ["A��", "B��"]) {
    if (!body.classes?.[className]) continue;
    const source = body.classes[className];
    const lessons = parseLessons(source.lessons);
    if (!isGuardianTermPaused(slug, term) && !guardianLessonCountMatches(slug, term, lessons.length)) {
      throw new Error("lesson_count_mismatch");
    }
    classes[className] = {
      lessons,
      supplies: str(source.supplies).slice(0, 500),
      extra: str(source.extra).slice(0, 500),
    };
  }
  if (!Object.keys(classes).length && body.enabled === true) throw new Error("invalid_input");
  return classes;
}

async function scheduleImpact(
  slug: string,
  term: string,
  classes: ProposedClasses,
  existing: FirebaseFirestore.DocumentData | undefined,
) {
  const result: { changes: ScheduleImpactRow[]; blocked: ScheduleImpactRow[] } = {
    changes: [],
    blocked: [],
  };
  if (!existing || existing.term !== term) return result;

  const db = database();
  const notices = await db.collection(guardianCollections.notices).where("slug", "==", slug).get();
  const studentClassCache = new Map<string, string>();
  const allNext = Object.entries(classes).flatMap(([teachingClass, plan]) =>
    plan.lessons.map((lesson) => ({ ...lesson, teachingClass }))
  );

  for (const noticeDoc of notices.docs) {
    const notice = noticeDoc.data();
    if (notice.cancelled || notice.term !== term) continue;

    let teachingClass = str(notice.teachingClass);
    if (!teachingClass) {
      const studentId = str(notice.studentId);
      if (!studentClassCache.has(studentId)) {
        const student = (await db.collection("students").doc(studentId).get()).data();
        studentClassCache.set(studentId, student ? getStudentTeachingClass(student) : "");
      }
      teachingClass = studentClassCache.get(studentId) || "";
    }

    const oldLesson = Array.isArray(existing.classes?.[teachingClass]?.lessons)
      ? existing.classes[teachingClass].lessons[Number(notice.lesson) - 1]
      : null;
    const eventId = str(notice.eventId) || str(oldLesson?.eventId);
    const next = eventId
      ? allNext.find((row) => row.eventId === eventId)
      : allNext.find((row) =>
        row.teachingClass === teachingClass
        && row.lesson === Number(notice.lesson)
        && row.date === notice.date
      );
    const base: ScheduleImpactRow = {
      noticeId: noticeDoc.id,
      studentId: str(notice.studentId),
      teachingClass,
      kind: str(notice.kind),
      fromLesson: Number(notice.lesson),
      fromDate: str(notice.date),
      eventId,
    };

    if (!next || next.cancelled) {
      result.blocked.push(base);
      continue;
    }
    if (next.lesson !== Number(notice.lesson) || next.date !== notice.date || next.teachingClass !== teachingClass) {
      result.changes.push({
        ...base,
        teachingClass: next.teachingClass,
        toLesson: next.lesson,
        toDate: next.date,
      });
    }
  }
  return result;
}

export async function previewGuardianScheduleImpact(body: any) {
  const db = database();
  const selectedSchool = school(body.slug);
  const term = str(body.term);
  if (!/^\d{4}-Q[1-4]$/.test(term)) throw new Error("invalid_input");
  const classes = proposedClasses(body, selectedSchool.slug, term);
  const existing = (await db.collection(guardianCollections.schools).doc(selectedSchool.slug).get()).data();
  return scheduleImpact(selectedSchool.slug, term, classes, existing);
}

export async function configureGuardianSchool(body: any) {
  const db = database();
  const selectedSchool = school(body.slug);
  const ref = db.collection(guardianCollections.schools).doc(selectedSchool.slug);
  const term = str(body.term);
  if (!/^\d{4}-Q[1-4]$/.test(term)) throw new Error("invalid_input");
  if (body.enabled === true && isGuardianTermPaused(selectedSchool.slug, term)) throw new Error("forbidden");

  const classes = proposedClasses(body, selectedSchool.slug, term);
  const existing = (await ref.get()).data();
  const impact = await scheduleImpact(selectedSchool.slug, term, classes, existing);
  if (impact.blocked.length) throw new Error("lesson_unavailable");
  if (impact.changes.length && body.confirmScheduleImpact !== true) {
    throw new Error("schedule_change_confirmation_required");
  }

  const rotate = body.rotateCode === true || !existing?.codeHash;
  const code = rotate ? secret() : null;
  const salt = code ? randomBytes(16).toString("hex") : null;
  const fields = {
    enabled: body.enabled === true,
    term,
    classes,
    updatedAt: Date.now(),
    version: secret(),
    ...(code && salt ? { codeSalt: salt, codeHash: digest(code, salt) } : {}),
  };

  const batch = db.batch();
  batch.set(ref, fields, { mergeFields: Object.keys(fields) });
  for (const change of impact.changes) {
    batch.update(db.collection(guardianCollections.notices).doc(change.noticeId), {
      teachingClass: change.teachingClass,
      lesson: change.toLesson,
      date: change.toDate,
      eventId: change.eventId,
      confirmed: false,
      confirmedAt: null,
      scheduleChangedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
  return { slug: selectedSchool.slug, code, scheduleChanges: impact.changes.length };
}

export async function issueGuardianAccess(body: any) {
  const db = database();
  const selectedSchool = school(body.slug);
  const studentId = id(body.studentId);
  const { data } = await readStudent(studentId, selectedSchool.slug);
  const config = (await db.collection(guardianCollections.schools).doc(selectedSchool.slug).get()).data();
  if (!config?.enabled || isGuardianTermPaused(selectedSchool.slug, config.term) || !getEnrollmentTerms(data).includes(config.term)) {
    throw new Error("forbidden");
  }
  const ref = db.collection(guardianCollections.access).doc(hash(`${selectedSchool.slug}:${studentId}`));
  if (body.revoke === true) {
    await ref.set({ enabled: false, version: secret() }, { merge: true });
    return { code: null };
  }
  const code = secret();
  const salt = randomBytes(16).toString("hex");
  await ref.set({
    slug: selectedSchool.slug,
    studentId,
    enabled: true,
    salt,
    codeHash: digest(code, salt),
    version: secret(),
    updatedAt: Date.now(),
  });
  return { code };
}

async function limitLogin(slug: string, request: Request) {
  const db = database();
  const ip = (request.headers.get("x-vercel-forwarded-for") || "unknown").split(",")[0].trim();
  const key = hash(`${slug}:${ip}`);
  const ref = db.collection(guardianCollections.limits).doc(key);
  const now = Date.now();
  await db.runTransaction(async (transaction) => {
    const old = (await transaction.get(ref)).data();
    const start = Number(old?.start || 0);
    const count = now - start < 15 * 60_000 ? Number(old?.count || 0) : 0;
    if (count >= 12) throw new Error("rate_limited");
    transaction.set(ref, {
      start: count ? start : now,
      count: count + 1,
      expiresAt: new Date(now + 15 * 60_000),
    });
  });
}

export async function checkGuardianSchool(request: Request, body: any) {
  const db = database();
  const slug = schoolSlugForName(body.school);
  if (!slug) return { guardian: false };
  await limitLogin(slug, request);
  const config = (await db.collection(guardianCollections.schools).doc(slug).get()).data();
  return {
    guardian: Boolean(
      config?.enabled
      && !isGuardianTermPaused(slug, config.term)
      && matches(str(body.schoolCode), config.codeSalt, config.codeHash)
    ),
    slug,
  };
}

export async function loginGuardian(request: Request, body: any) {
  const db = database();
  const selectedSchool = school(body.slug);
  await limitLogin(selectedSchool.slug, request);
  const schoolCode = str(body.schoolCode);
  const childCode = str(body.childCode);
  const studentId = id(body.studentId);
  const config = (await db.collection(guardianCollections.schools).doc(selectedSchool.slug).get()).data();
  const access = (await db.collection(guardianCollections.access).doc(hash(`${selectedSchool.slug}:${studentId}`)).get()).data();
  if (
    !config?.enabled
    || isGuardianTermPaused(selectedSchool.slug, config.term)
    || !access?.enabled
    || !matches(schoolCode, config.codeSalt, config.codeHash)
    || !matches(childCode, access.salt, access.codeHash)
  ) {
    throw new Error("invalid_login");
  }
  const { data } = await readStudent(studentId, selectedSchool.slug);
  if (!getEnrollmentTerms(data).includes(config.term)) throw new Error("invalid_login");
  const token = secret();
  await db.collection(guardianCollections.sessions).doc(hash(token)).set({
    slug: selectedSchool.slug,
    studentId,
    schoolVersion: config.version,
    accessVersion: access.version,
    expiresAt: new Date(Date.now() + 8 * 60 * 60_000),
  });
  return token;
}

async function session(request: Request) {
  const db = database();
  const token = (request.headers.get("cookie") || "")
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("sunlab_guardian="))
    ?.slice("sunlab_guardian=".length) || "";
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) throw new Error("invalid_login");
  const sessionRef = db.collection(guardianCollections.sessions).doc(hash(token));
  const sessionData = (await sessionRef.get()).data();
  if (!sessionData || Number(sessionData.expiresAt?.toMillis?.() || 0) <= Date.now()) {
    throw new Error("invalid_login");
  }
  const config = (await db.collection(guardianCollections.schools).doc(sessionData.slug).get()).data();
  const access = (await db.collection(guardianCollections.access).doc(hash(`${sessionData.slug}:${sessionData.studentId}`)).get()).data();
  if (
    !config?.enabled
    || isGuardianTermPaused(sessionData.slug, config.term)
    || !access?.enabled
    || sessionData.schoolVersion !== config.version
    || sessionData.accessVersion !== access.version
  ) {
    throw new Error("invalid_login");
  }
  const { data, teachingClass } = await readStudent(sessionData.studentId, sessionData.slug);
  if (!getEnrollmentTerms(data).includes(config.term)) throw new Error("invalid_login");
  const plan = config.classes?.[teachingClass];
  if (!plan || !Array.isArray(plan.lessons) || !guardianLessonCountMatches(sessionData.slug, config.term, plan.lessons.length)) {
    throw new Error("forbidden");
  }
  return { db, sessionData, config, plan, data, teachingClass, sessionRef };
}

const noticeId = (slug: string, term: string, studentId: string, lesson: Lesson) =>
  hash([slug, term, studentId, lesson.eventId || `lesson-${lesson.lesson}-${lesson.date}`].join(":"));
const noticeOutput = (data: any) => ({
  lesson: data.lesson,
  date: data.date,
  eventId: str(data.eventId),
  kind: data.kind,
  reason: data.reason,
  detail: data.detail,
  confirmed: data.confirmed === true,
  updatedAt: data.updatedAt,
});

function attendanceForDate(history: unknown, date: string) {
  if (!Array.isArray(history)) return "";
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (str(item?.date) !== date || str(item?.type) !== "attendance") continue;
    return str(item?.status).slice(0, 40);
  }
  return "";
}

export async function guardianDashboard(request: Request) {
  const { db, sessionData, config, plan, data, teachingClass } = await session(request);
  const studentKey = `students:${sessionData.studentId}`;
  const assignments = await db.collection(ASSIGNMENTS_COLLECTION)
    .where("targetStudentKeys", "array-contains", studentKey)
    .get();
  const activeAssignments = assignments.docs.filter((assignment) => assignment.data().isActive !== false);
  const submitted = await Promise.all(activeAssignments.map((assignment) =>
    db.collection(ASSIGNMENT_SUBMISSIONS_COLLECTION)
      .doc(getSubmissionDocId(assignment.id, studentKey))
      .get()
  ));
  const hasHomework = submitted.some((submission) =>
    !submission.exists || submission.data()?.status === "revision"
  );
  const parsedLessons = parseLessons(plan.lessons);
  const currentEventIds = new Set(parsedLessons.map((lesson) => lesson.eventId).filter(Boolean));
  const notices = await db.collection(guardianCollections.notices)
    .where("studentId", "==", sessionData.studentId)
    .get();
  const visibleNotices = notices.docs
    .map((notice) => notice.data())
    .filter((notice) => {
      if (notice.slug !== sessionData.slug || notice.term !== config.term || notice.cancelled) return false;
      const eventId = str(notice.eventId);
      if (eventId) return currentEventIds.has(eventId);
      return parsedLessons.some((lesson) => lesson.lesson === Number(notice.lesson) && lesson.date === notice.date);
    })
    .map(noticeOutput);

  return {
    school: school(sessionData.slug).displayName,
    name: str(data.name),
    teachingClass,
    term: config.term,
    supplies: plan.supplies,
    extra: plan.extra,
    bronze: Math.max(0, Number(data.bronze) || 0),
    silver: Math.max(0, Number(data.silver) || 0),
    hasHomework,
    lessons: parsedLessons.map((lesson) => {
      const attendance = attendanceForDate(data.attendanceHistory, lesson.date);
      return {
        ...lesson,
        status: lesson.cancelled ? "�ް�" : attendance || (lesson.date < today() ? "��Ȯ��" : "����"),
      };
    }),
    notices: visibleNotices,
  };
}

async function existingNoticeForLesson(
  db: FirebaseFirestore.Firestore,
  slug: string,
  term: string,
  studentId: string,
  lesson: Lesson,
) {
  const snap = await db.collection(guardianCollections.notices).where("studentId", "==", studentId).get();
  return snap.docs.find((noticeDoc) => {
    const notice = noticeDoc.data();
    if (notice.slug !== slug || notice.term !== term) return false;
    const eventId = str(notice.eventId);
    return lesson.eventId
      ? eventId === lesson.eventId
      : !eventId && Number(notice.lesson) === lesson.lesson && notice.date === lesson.date;
  }) || null;
}

export async function saveGuardianNotice(request: Request, body: any) {
  const { db, sessionData, config, plan, teachingClass } = await session(request);
  const lessonNumber = Number(body.lesson);
  const rows = parseLessons(plan.lessons);
  const row = rows.find((lesson) => lesson.lesson === lessonNumber);
  if (!row || row.cancelled || row.date < today()) throw new Error("lesson_unavailable");

  const existing = await existingNoticeForLesson(
    db,
    sessionData.slug,
    config.term,
    sessionData.studentId,
    row,
  );
  const ref = existing?.ref || db.collection(guardianCollections.notices)
    .doc(noticeId(sessionData.slug, config.term, sessionData.studentId, row));

  if (body.cancel === true) {
    if (existing) {
      await ref.update({ cancelled: true, updatedAt: Date.now(), confirmed: false, confirmedAt: null });
    }
    return;
  }

  const notice = validateGuardianNotice(
    {
      lesson: lessonNumber,
      kind: str(body.kind),
      reason: str(body.reason),
      detail: str(body.detail),
    },
    rows.filter((lesson) => !lesson.cancelled && lesson.date >= today()).map((lesson) => lesson.lesson),
  );
  if (!notice) throw new Error("invalid_input");
  const old = existing?.data();
  await ref.set({
    ...notice,
    slug: sessionData.slug,
    studentId: sessionData.studentId,
    teachingClass,
    term: config.term,
    eventId: row.eventId,
    date: row.date,
    cancelled: false,
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now(),
    confirmedAt: null,
  });
}

export async function logoutGuardian(request: Request) {
  try {
    const { sessionRef } = await session(request);
    await sessionRef.delete();
  } catch {}
}

export async function getTeacherGuardianNotices(studentId: string) {
  const db = database();
  const safeStudentId = id(studentId);
  const snap = await db.collection(guardianCollections.notices).where("studentId", "==", safeStudentId).get();
  return snap.docs
    .filter((notice) => !notice.data().cancelled && notice.data().date >= today())
    .map((notice) => ({ id: notice.id, ...noticeOutput(notice.data()) }));
}

export async function confirmGuardianNotice(body: any) {
  const db = database();
  const ref = db.collection(guardianCollections.notices).doc(id(body.id));
  await db.runTransaction(async (transaction) => {
    const old = (await transaction.get(ref)).data();
    if (!old || old.cancelled || old.date < today()) throw new Error("not_found");
    if (old.updatedAt !== body.updatedAt) throw new Error("lesson_unavailable");
    transaction.update(ref, { confirmed: true, confirmedAt: Date.now() });
  });
}

export async function getGuardianNoticeSummary() {
  const db = database();
  const snap = await db.collection(guardianCollections.notices).where("date", ">=", today()).get();
  const result: Record<string, { pending: number; total: number }> = {};
  for (const notice of snap.docs) {
    const data = notice.data();
    if (data.cancelled || typeof data.studentId !== "string") continue;
    const row = result[data.studentId] || (result[data.studentId] = { pending: 0, total: 0 });
    row.total += 1;
    if (!data.confirmed) row.pending += 1;
  }
  return result;
}

export async function guardianTeacherSettings(slug: unknown) {
  const db = database();
  const selectedSchool = school(slug);
  const config = (await db.collection(guardianCollections.schools).doc(selectedSchool.slug).get()).data();
  const students = await db.collection("students").get();
  const roster = students.docs
    .filter((student) =>
      matchesAfterSchoolSchool(student.data().school, selectedSchool)
      && getEnrollmentStatus(student.data()) === "active"
    )
    .map((student) => ({
      id: student.id,
      name: str(student.data().name),
      teachingClass: getStudentTeachingClass(student.data()),
      terms: getEnrollmentTerms(student.data()),
    }));
  return {
    config: config ? {
      enabled: config.enabled === true && !isGuardianTermPaused(selectedSchool.slug, config.term),
      term: config.term,
      classes: config.classes,
      hasCode: Boolean(config.codeHash),
    } : null,
    roster,
  };
}


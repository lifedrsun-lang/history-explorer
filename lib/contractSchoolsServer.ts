import "server-only";

import {
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  CLASSROOM_MONSTERS,
  type ClassroomLink,
  type SchoolClassroom,
} from "@/app/student/data/classroomData";
import {
  CONTRACT_SCHOOL_COLLECTION,
  CONTRACT_SCHOOL_SCHEMA_VERSION,
  DEFAULT_CONTRACT_SCHOOLS,
  getDefaultContractSchool,
  makeClassroomId,
  toSchoolClassroom,
  upgradeLegacyLessonLinks,
  type ContractSchoolClassroom,
  type ContractSchoolConfig,
  type ContractSchoolLesson,
} from "@/lib/contractSchools";
import { getSchoolPassword, normalizeSchoolText } from "@/app/student/data/schoolInfo";

type StoredContractSchool = Omit<
  ContractSchoolConfig,
  "source" | "createdAt" | "updatedAt" | "hasSchoolPassword"
> & {
  passwordSalt?: string | null;
  passwordHash?: string | null;
  classroomTokens?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

type SchoolDraft = {
  schoolName?: unknown;
  displayName?: unknown;
  location?: unknown;
  published?: unknown;
  completed?: unknown;
  classrooms?: unknown;
  lessons?: unknown;
  lessonVisibility?: unknown;
  schoolPassword?: unknown;
  clearSchoolPassword?: unknown;
};

const MAX_SCHOOL_NAME = 100;
const MAX_DISPLAY_NAME = 60;
const MAX_LOCATION = 100;
const MAX_PASSWORD = 64;
const MAX_CLASSROOMS = 30;
const MAX_LESSONS = 50;
const MAX_LINKS_PER_LESSON = 20;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizeLimitedText = (
  value: unknown,
  field: string,
  maxLength: number,
  required = true
) => {
  const text = normalizeText(value);

  if ((required && !text) || text.length > maxLength) {
    throw new Error(`invalid_${field}`);
  }

  return text;
};

const normalizeInteger = (
  value: unknown,
  field: string,
  minimum: number,
  maximum: number
) => {
  const number = Number(value);

  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`invalid_${field}`);
  }

  return number;
};

const serializeDate = (value: unknown) => {
  if (!value) return null;
  const timestamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof timestamp.seconds === "number") {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  return null;
};

const cloneSchool = (school: ContractSchoolConfig): ContractSchoolConfig =>
  JSON.parse(JSON.stringify(school)) as ContractSchoolConfig;

const migrateGaebongMindmapLinks = (
  slug: string,
  lessons: ContractSchoolLesson[]
) => {
  if (slug !== "gaebong") return lessons;

  const seedMindmapLinks =
    getDefaultContractSchool(slug)?.lessons
      .find((lesson) => lesson.lesson === 3)
      ?.links.filter(
        (link) =>
          link.targetType === "class" &&
          (link.id === "helpful-ai-mindmap" ||
            link.id.startsWith("helpful-ai-mindmap-class-"))
      ) || [];
  const seedHrefs = new Set(seedMindmapLinks.map((link) => link.href));

  if (seedMindmapLinks.length === 0) return lessons;

  return lessons.map((lesson) => {
    if (lesson.lesson !== 3) return lesson;
    const commonLinkIndex = lesson.links.findIndex(
      (link) =>
        link.id === "helpful-ai-mindmap" &&
        link.targetType !== "class" &&
        seedHrefs.has(link.href)
    );
    if (commonLinkIndex < 0) return lesson;

    const commonLink = lesson.links[commonLinkIndex];
    return {
      ...lesson,
      links: lesson.links.flatMap((link, index) =>
        index === commonLinkIndex
          ? seedMindmapLinks.map((seedLink) => ({
              ...seedLink,
              label: commonLink.label,
              kind: commonLink.kind,
              defaultUnlocked: commonLink.defaultUnlocked,
            }))
          : [link]
      ),
    };
  });
};

const migrateGaebongMoralMachineLink = (
  slug: string,
  lessons: ContractSchoolLesson[]
) => {
  if (slug !== "gaebong") return lessons;
  const seedLink = getDefaultContractSchool(slug)?.lessons
    .find((lesson) => lesson.lesson === 3)
    ?.links.find((link) => link.id === "moral-machine-results-lab");
  if (!seedLink) return lessons;

  return lessons.map((lesson) =>
    lesson.lesson === 3 &&
    !lesson.links.some((link) => link.id === seedLink.id)
      ? { ...lesson, links: [...lesson.links, seedLink] }
      : lesson
  );
};

const fromStoredSchool = (
  slug: string,
  data: StoredContractSchool
): ContractSchoolConfig => {
  const storedSchemaVersion = Number(data.schemaVersion || 0);
  const classrooms = Array.isArray(data.classrooms)
    ? data.classrooms.map((classroom) => ({
        ...classroom,
        active: classroom.active !== false,
      }))
    : [];
  const classroomIds = classrooms.map((classroom) => classroom.id);
  const upgradedLessons = (Array.isArray(data.lessons) ? data.lessons : []).map(
    (lesson) => upgradeLegacyLessonLinks(lesson, classroomIds)
  );
  const migratedLessons =
    storedSchemaVersion < CONTRACT_SCHOOL_SCHEMA_VERSION
      ? migrateGaebongMindmapLinks(slug, upgradedLessons)
      : upgradedLessons;
  const lessons =
    storedSchemaVersion < CONTRACT_SCHOOL_SCHEMA_VERSION
      ? migrateGaebongMoralMachineLink(slug, migratedLessons)
      : migratedLessons;

  return {
    schemaVersion: CONTRACT_SCHOOL_SCHEMA_VERSION,
    slug,
    schoolName: normalizeText(data.schoolName),
    displayName: normalizeText(data.displayName),
    location: normalizeText(data.location),
    published: data.published === true,
    completed:
      typeof data.completed === "boolean"
        ? data.completed
        : getDefaultContractSchool(slug)?.completed === true,
    hasSchoolPassword: Boolean(data.passwordHash && data.passwordSalt),
    classrooms,
    lessons,
    lessonVisibility:
      data.lessonVisibility && typeof data.lessonVisibility === "object"
        ? data.lessonVisibility
        : {},
    source: "managed",
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
  };
};

const fromStoredSchoolSnapshot = async (snapshot: DocumentSnapshot) => {
  const data = snapshot.data() as StoredContractSchool;
  const school = fromStoredSchool(snapshot.id, data);

  if (Number(data.schemaVersion || 0) < CONTRACT_SCHOOL_SCHEMA_VERSION) {
    await snapshot.ref.set(
      {
        schemaVersion: CONTRACT_SCHOOL_SCHEMA_VERSION,
        lessons: school.lessons,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return school;
};

const getStoredSchoolSnapshot = async (slug: string) => {
  const { db } = getFirebaseAdmin();
  return db.collection(CONTRACT_SCHOOL_COLLECTION).doc(slug).get();
};

export const normalizeContractSchoolSlug = (value: unknown) => {
  const slug = normalizeText(value).toLowerCase();

  if (slug.length < 2 || slug.length > 40 || !SLUG_PATTERN.test(slug)) {
    throw new Error("invalid_slug");
  }

  return slug;
};

export const getAllContractSchools = async (): Promise<ContractSchoolConfig[]> => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection(CONTRACT_SCHOOL_COLLECTION).get();
  const bySlug = new Map(
    DEFAULT_CONTRACT_SCHOOLS.map((school) => [school.slug, cloneSchool(school)])
  );

  const storedSchools = await Promise.all(
    snapshot.docs.map((document) => fromStoredSchoolSnapshot(document))
  );
  storedSchools.forEach((school) => bySlug.set(school.slug, school));

  return Array.from(bySlug.values()).sort((a, b) => {
    if (a.source !== b.source) return a.source === "default" ? -1 : 1;
    return a.displayName.localeCompare(b.displayName, "ko-KR");
  });
};

export const getContractSchool = async (
  slug: string,
  options: { includeUnpublished?: boolean } = {}
) => {
  const normalizedSlug = normalizeContractSchoolSlug(slug);
  const snapshot = await getStoredSchoolSnapshot(normalizedSlug);
  const school = snapshot.exists
    ? await fromStoredSchoolSnapshot(snapshot)
    : getDefaultContractSchool(normalizedSlug)
      ? cloneSchool(getDefaultContractSchool(normalizedSlug)!)
      : null;

  if (!school || (!options.includeUnpublished && !school.published)) {
    return null;
  }

  return school;
};

const makeDirectToken = (slug: string, grade: number, classNumber: number) =>
  `${slug.slice(0, 8)}-${grade}c${classNumber}-${randomBytes(5).toString("hex")}`;

const makeRandomMonsterId = () =>
  CLASSROOM_MONSTERS[randomInt(CLASSROOM_MONSTERS.length)].id;

const normalizeClassrooms = (
  value: unknown,
  baseSchool: ContractSchoolConfig,
  slug: string
) => {
  if (!Array.isArray(value) || value.length > MAX_CLASSROOMS) {
    throw new Error("invalid_classrooms");
  }

  const existingById = new Map(
    baseSchool.classrooms.map((classroom) => [classroom.id, classroom])
  );
  const seen = new Set<string>();

  return value.map((item) => {
    const source = item as Partial<ContractSchoolClassroom>;
    const grade = normalizeInteger(source.grade, "grade", 1, 12);
    const classNumber = normalizeInteger(
      source.classNumber,
      "class_number",
      1,
      30
    );
    const id = makeClassroomId(grade, classNumber);

    if (seen.has(id)) throw new Error("duplicate_classroom");
    seen.add(id);

    const existing = existingById.get(id);
    const monsterId = existing?.monsterId || makeRandomMonsterId();
    const requestedLabel = normalizeText(source.label);

    return {
      id,
      grade,
      classNumber,
      label:
        requestedLabel && requestedLabel.length <= 60
          ? requestedLabel
          : existing?.label || `${grade}학년 ${classNumber}반`,
      monsterId,
      directToken:
        existing?.directToken || makeDirectToken(slug, grade, classNumber),
      active: source.active !== false,
    } satisfies ContractSchoolClassroom;
  });
};

const normalizeLink = (
  value: unknown,
  existingLinks: Map<string, ClassroomLink>,
  classroomIds: Set<string>
): ClassroomLink => {
  const source = value as Partial<ClassroomLink>;
  const providedId = normalizeText(source.id);
  const id = providedId || `link-${randomUUID()}`;
  const label = normalizeLimitedText(source.label, "link_label", 120);
  const href = normalizeLimitedText(source.href, "link_url", 2_000);

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    throw new Error("invalid_link_url");
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("invalid_link_url");
  }

  const existing = existingLinks.get(id);
  const targetType = source.targetType === "class" ? "class" : "all";
  const targetClassroomIds =
    targetType === "class" && Array.isArray(source.targetClassroomIds)
      ? Array.from(
          new Set(source.targetClassroomIds.map((classroomId) => normalizeText(classroomId)))
        )
      : [];

  if (
    (source.targetType !== undefined &&
      source.targetType !== "all" &&
      source.targetType !== "class") ||
    (targetType === "class" &&
      (targetClassroomIds.length === 0 ||
        targetClassroomIds.some((classroomId) => !classroomIds.has(classroomId))))
  ) {
    throw new Error("invalid_link_targets");
  }

  return {
    id,
    label,
    href: url.toString(),
    kind: source.kind === "review" ? "review" : "activity",
    defaultUnlocked:
      typeof source.defaultUnlocked === "boolean"
        ? source.defaultUnlocked
        : existing?.defaultUnlocked ?? true,
    targetType,
    ...(targetType === "class" ? { targetClassroomIds } : {}),
  };
};

const normalizeLessons = (
  value: unknown,
  baseSchool: ContractSchoolConfig,
  classrooms: ContractSchoolClassroom[]
) => {
  if (!Array.isArray(value) || value.length > MAX_LESSONS) {
    throw new Error("invalid_lessons");
  }

  const existingById = new Map(
    baseSchool.lessons.map((lesson) => [lesson.id, lesson])
  );
  const seenIds = new Set<string>();
  const seenNumbers = new Set<number>();
  const classroomIds = new Set(classrooms.map((classroom) => classroom.id));

  return value
    .map((item) => {
      const source = item as Partial<ContractSchoolLesson>;
      const lessonNumber = normalizeInteger(source.lesson, "lesson", 1, 100);
      const id = normalizeText(source.id) || `lesson-${randomUUID()}`;

      if (seenIds.has(id) || seenNumbers.has(lessonNumber)) {
        throw new Error("duplicate_lesson");
      }
      seenIds.add(id);
      seenNumbers.add(lessonNumber);

      if (!Array.isArray(source.links) || source.links.length > MAX_LINKS_PER_LESSON) {
        throw new Error("invalid_links");
      }

      const existingLesson = existingById.get(id);
      const existingLinks = new Map(
        (existingLesson?.links || []).map((link) => [link.id, link])
      );
      const linkIds = new Set<string>();
      const links = source.links.map((link) => {
        const normalized = normalizeLink(link, existingLinks, classroomIds);
        if (linkIds.has(normalized.id)) throw new Error("duplicate_link");
        linkIds.add(normalized.id);
        return normalized;
      });
      const date = normalizeText(source.date);

      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error("invalid_lesson_date");
      }

      return {
        id,
        lesson: lessonNumber,
        ...(date ? { date } : {}),
        title: normalizeLimitedText(source.title, "lesson_title", 120),
        message: normalizeLimitedText(
          source.message,
          "lesson_message",
          1_000,
          false
        ),
        links,
        ...(existingLesson?.legacyClassLinks && source.clearLegacyClassLinks !== true
          ? { legacyClassLinks: existingLesson.legacyClassLinks }
          : {}),
      } satisfies ContractSchoolLesson;
    })
    .sort((a, b) => a.lesson - b.lesson);
};

const normalizeLessonVisibility = (
  value: unknown,
  classrooms: ContractSchoolClassroom[],
  lessons: ContractSchoolLesson[],
  baseSchool: ContractSchoolConfig
): Record<string, Record<string, boolean>> => {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    classrooms.map((classroom) => {
      const classSource =
        source[classroom.id] &&
        typeof source[classroom.id] === "object" &&
        !Array.isArray(source[classroom.id])
          ? (source[classroom.id] as Record<string, unknown>)
          : {};

      return [
        classroom.id,
        Object.fromEntries(
          lessons.map((lesson) => [
            lesson.id,
            typeof classSource[lesson.id] === "boolean"
              ? classSource[lesson.id] === true
              : baseSchool.lessonVisibility[classroom.id]?.[lesson.id] === true,
          ])
        ),
      ];
    })
  );
};

const makePasswordFields = (password: string) => {
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, passwordSalt, 32).toString("hex");
  return { passwordSalt, passwordHash };
};

export const createContractSchool = async (
  slugValue: unknown,
  draft: SchoolDraft,
  teacherUid: string
) => {
  const slug = normalizeContractSchoolSlug(slugValue);

  if (getDefaultContractSchool(slug)) {
    throw new Error("school_slug_exists");
  }

  const { db } = getFirebaseAdmin();
  const ref = db.collection(CONTRACT_SCHOOL_COLLECTION).doc(slug);
  const existing = await ref.get();
  if (existing.exists) throw new Error("school_slug_exists");

  const schoolName = normalizeLimitedText(
    draft.schoolName,
    "school_name",
    MAX_SCHOOL_NAME
  );
  const displayName = normalizeLimitedText(
    draft.displayName || schoolName,
    "display_name",
    MAX_DISPLAY_NAME
  );
  const location = normalizeLimitedText(
    draft.location,
    "location",
    MAX_LOCATION,
    false
  );
  const password = normalizeText(draft.schoolPassword);
  if (password.length > MAX_PASSWORD) throw new Error("invalid_school_password");

  const passwordFields = password
    ? makePasswordFields(password)
    : { passwordSalt: null, passwordHash: null };
  const stored: StoredContractSchool = {
    schemaVersion: CONTRACT_SCHOOL_SCHEMA_VERSION,
    slug,
    schoolName,
    displayName,
    location,
    published: false,
    completed: false,
    classrooms: [],
    lessons: [],
    lessonVisibility: {},
    classroomTokens: [],
    ...passwordFields,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.create({ ...stored, createdBy: teacherUid, updatedBy: teacherUid });
  const created = await ref.get();
  return fromStoredSchool(slug, created.data() as StoredContractSchool);
};

export const updateContractSchool = async (
  slugValue: unknown,
  draft: SchoolDraft,
  teacherUid: string
) => {
  const slug = normalizeContractSchoolSlug(slugValue);
  const snapshot = await getStoredSchoolSnapshot(slug);
  const defaultSchool = getDefaultContractSchool(slug);

  if (!snapshot.exists && !defaultSchool) throw new Error("school_not_found");

  const storedData = snapshot.exists
    ? (snapshot.data() as StoredContractSchool)
    : null;
  const baseSchool = storedData
    ? fromStoredSchool(slug, storedData)
    : cloneSchool(defaultSchool!);
  const classrooms = normalizeClassrooms(draft.classrooms, baseSchool, slug);
  const lessons = normalizeLessons(draft.lessons, baseSchool, classrooms);
  const lessonVisibility = normalizeLessonVisibility(
    draft.lessonVisibility,
    classrooms,
    lessons,
    baseSchool
  );
  const published = draft.published === true;

  if (
    published &&
    !baseSchool.published &&
    (classrooms.length === 0 || lessons.length === 0)
  ) {
    throw new Error("school_setup_incomplete");
  }

  const password = normalizeText(draft.schoolPassword);
  if (password.length > MAX_PASSWORD) throw new Error("invalid_school_password");

  const legacyPassword = !storedData && baseSchool.hasSchoolPassword
    ? getSchoolPassword(baseSchool.schoolName) || ""
    : "";
  let passwordFields = legacyPassword
    ? makePasswordFields(legacyPassword)
    : {
        passwordSalt: storedData?.passwordSalt || null,
        passwordHash: storedData?.passwordHash || null,
      };

  if (draft.clearSchoolPassword === true) {
    passwordFields = { passwordSalt: null, passwordHash: null };
  } else if (password) {
    passwordFields = makePasswordFields(password);
  }

  const payload: StoredContractSchool = {
    schemaVersion: CONTRACT_SCHOOL_SCHEMA_VERSION,
    slug,
    schoolName: normalizeLimitedText(
      draft.schoolName,
      "school_name",
      MAX_SCHOOL_NAME
    ),
    displayName: normalizeLimitedText(
      draft.displayName,
      "display_name",
      MAX_DISPLAY_NAME
    ),
    location: normalizeLimitedText(
      draft.location,
      "location",
      MAX_LOCATION,
      false
    ),
    published,
    completed: draft.completed === true,
    classrooms,
    lessons,
    lessonVisibility,
    classroomTokens: classrooms.map((classroom) => classroom.directToken),
    ...passwordFields,
    createdAt: storedData?.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const { db } = getFirebaseAdmin();
  const ref = db.collection(CONTRACT_SCHOOL_COLLECTION).doc(slug);
  await ref.set(
    {
      ...payload,
      createdBy: snapshot.exists ? snapshot.data()?.createdBy || teacherUid : teacherUid,
      updatedBy: teacherUid,
    },
    { merge: false }
  );

  const updated = await ref.get();
  return fromStoredSchool(slug, updated.data() as StoredContractSchool);
};

export const verifyContractSchoolPassword = async (
  slugValue: unknown,
  passwordValue: unknown
) => {
  const slug = normalizeContractSchoolSlug(slugValue);
  const snapshot = await getStoredSchoolSnapshot(slug);
  const password = normalizeText(passwordValue);
  if (!password) return false;

  if (!snapshot.exists) {
    const defaultSchool = getDefaultContractSchool(slug);
    const legacyPassword = defaultSchool?.hasSchoolPassword
      ? getSchoolPassword(defaultSchool.schoolName)
      : undefined;

    if (!legacyPassword) return false;
    const actual = Buffer.from(password);
    const expected = Buffer.from(legacyPassword);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  const data = snapshot.data() as StoredContractSchool;
  if (!data.passwordHash || !data.passwordSalt) return false;

  const actual = scryptSync(password, data.passwordSalt, 32);
  const expected = Buffer.from(data.passwordHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const getContractSchoolForClassroom = async (
  schoolValue: unknown,
  gradeValue: unknown,
  classNumberValue: unknown,
  options: { includeUnpublished?: boolean; includeInactive?: boolean } = {}
) => {
  const schoolName = normalizeSchoolText(schoolValue);
  const grade = Number(gradeValue);
  const classNumber = Number(classNumberValue);

  if (!schoolName || !Number.isInteger(grade) || !Number.isInteger(classNumber)) {
    return null;
  }

  const schools = await getAllContractSchools();
  for (const school of schools) {
    if (!options.includeUnpublished && !school.published) continue;
    if (
      normalizeSchoolText(school.schoolName) !== schoolName &&
      normalizeSchoolText(school.displayName) !== schoolName
    ) {
      continue;
    }

    const classroom = school.classrooms.find(
      (item) =>
        (options.includeInactive || item.active !== false) &&
        item.grade === grade &&
        item.classNumber === classNumber
    );
    if (classroom) return { school, classroom };
  }

  return null;
};

export const getContractSchoolAndClassroomByToken = async (
  tokenValue: unknown,
  options: { includeUnpublished?: boolean } = {}
) => {
  const token = normalizeText(tokenValue);
  if (!token) return null;

  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(CONTRACT_SCHOOL_COLLECTION)
    .where("classroomTokens", "array-contains", token)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const document = snapshot.docs[0];
    const school = await fromStoredSchoolSnapshot(document);
    const classroom = school.classrooms.find(
      (item) => item.directToken === token && item.active !== false
    );
    if (
      classroom &&
      (options.includeUnpublished === true || school.published)
    ) {
      return { school, classroom };
    }
    return null;
  }

  for (const school of DEFAULT_CONTRACT_SCHOOLS) {
    if (!options.includeUnpublished && !school.published) continue;
    const classroom = school.classrooms.find(
      (item) => item.directToken === token && item.active !== false
    );
    if (classroom) {
      const storedOverride = await getStoredSchoolSnapshot(school.slug);
      if (!storedOverride.exists) return { school, classroom };
    }
  }

  return null;
};

export const getContractClassroomByToken = async (
  tokenValue: unknown,
  options: { includeUnpublished?: boolean } = {}
) => {
  const resolved = await getContractSchoolAndClassroomByToken(tokenValue, options);
  return resolved ? toSchoolClassroom(resolved.school, resolved.classroom) : null;
};

export const getManagedContractClassroomByToken = async (tokenValue: unknown) => {
  return getContractClassroomByToken(tokenValue);
};

export const removeLegacyLessonLinkOverrides = (
  school: ContractSchoolConfig,
  lessonIds: string[]
) => {
  const ids = new Set(lessonIds);
  return {
    ...school,
    lessons: school.lessons.map((lesson) =>
      ids.has(lesson.id)
        ? { ...lesson, legacyClassLinks: undefined }
        : lesson
    ),
  };
};

export const getAllowedActivityIdsForClassroom = (classroom: SchoolClassroom) =>
  new Set(classroom.lessons.flatMap((lesson) => lesson.links.map((link) => link.id)));

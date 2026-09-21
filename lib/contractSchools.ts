import {
  GAEBONG_CLASSROOMS,
  GAEBONG_SCHOOL_DISPLAY_NAME,
  GWANGIL_CLASSROOMS,
  GWANGIL_SCHOOL_DISPLAY_NAME,
  WOLMUN_CLASSROOMS,
  WOLMUN_SCHOOL_DISPLAY_NAME,
  WONJONG_CLASSROOMS,
  WONJONG_SCHOOL_DISPLAY_NAME,
  type ClassroomLesson,
  type ClassroomLink,
  type SchoolClassroom,
} from "@/app/student/data/classroomData";

export const CONTRACT_SCHOOL_COLLECTION = "contract_school_configs";
export const CONTRACT_SCHOOL_SCHEMA_VERSION = 4;

export type ContractSchoolClassroom = {
  id: string;
  grade: number;
  classNumber: number;
  label: string;
  monsterId: string;
  directToken: string;
  active: boolean;
};

export type ContractSchoolLesson = {
  id: string;
  lesson: number;
  date?: string;
  title: string;
  message: string;
  links: ClassroomLink[];
  legacyClassLinks?: Record<string, ClassroomLink[]>;
  clearLegacyClassLinks?: boolean;
};

export type ContractSchoolConfig = {
  schemaVersion: number;
  slug: string;
  schoolName: string;
  displayName: string;
  location: string;
  published: boolean;
  completed: boolean;
  hasSchoolPassword: boolean;
  classrooms: ContractSchoolClassroom[];
  lessons: ContractSchoolLesson[];
  lessonVisibility: Record<string, Record<string, boolean>>;
  source: "default" | "managed";
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ContractSchoolSummary = Pick<
  ContractSchoolConfig,
  | "slug"
  | "schoolName"
  | "displayName"
  | "location"
  | "published"
  | "completed"
  | "hasSchoolPassword"
>;

export const makeClassroomId = (grade: number, classNumber: number) =>
  `${grade}-${classNumber}`;

const lessonLinksSignature = (links: ClassroomLink[]) =>
  JSON.stringify(
    links.map((link) => ({
      id: link.id,
      label: link.label,
      href: link.href,
      kind: link.kind || "activity",
      defaultUnlocked: link.defaultUnlocked ?? true,
    }))
  );

const classroomLinkSignature = (link: ClassroomLink) =>
  JSON.stringify({
    id: link.id,
    label: link.label,
    href: link.href,
    kind: link.kind || "activity",
    defaultUnlocked: link.defaultUnlocked ?? true,
  });

const makeUniqueLinkId = (preferredId: string, usedIds: Set<string>) => {
  if (!usedIds.has(preferredId)) {
    usedIds.add(preferredId);
    return preferredId;
  }

  let suffix = 2;
  while (usedIds.has(`${preferredId}-class-${suffix}`)) suffix += 1;
  const id = `${preferredId}-class-${suffix}`;
  usedIds.add(id);
  return id;
};

export const upgradeLegacyLessonLinks = (
  lesson: ContractSchoolLesson,
  classroomIds: string[]
): ContractSchoolLesson => {
  if (!lesson.legacyClassLinks || classroomIds.length === 0) {
    return lesson;
  }

  const grouped = new Map<
    string,
    {
      link: ClassroomLink;
      classroomIds: string[];
      linkIndex: number;
      classroomIndex: number;
    }
  >();

  classroomIds.forEach((classroomId, classroomIndex) => {
    const classroomLinks = lesson.legacyClassLinks?.[classroomId] || lesson.links;
    classroomLinks.forEach((link, linkIndex) => {
      const signature = classroomLinkSignature(link);
      const existing = grouped.get(signature);
      if (existing) {
        existing.classroomIds.push(classroomId);
        return;
      }
      grouped.set(signature, {
        link,
        classroomIds: [classroomId],
        linkIndex,
        classroomIndex,
      });
    });
  });

  const usedIds = new Set<string>();
  const links = Array.from(grouped.values())
    .sort(
      (a, b) =>
        a.linkIndex - b.linkIndex || a.classroomIndex - b.classroomIndex
    )
    .map(({ link, classroomIds: targetClassroomIds }) => {
      const id = makeUniqueLinkId(link.id, usedIds);
      if (targetClassroomIds.length === classroomIds.length) {
        const commonLink: ClassroomLink = { ...link, id, targetType: "all" };
        delete commonLink.targetClassroomIds;
        return commonLink;
      }
      return { ...link, id, targetType: "class" as const, targetClassroomIds };
    });

  const upgradedLesson = { ...lesson, links };
  delete upgradedLesson.legacyClassLinks;
  delete upgradedLesson.clearLegacyClassLinks;
  return upgradedLesson;
};

export const isLinkVisibleToClassroom = (
  link: ClassroomLink,
  classroomId: string
) =>
  link.targetType !== "class" ||
  (Array.isArray(link.targetClassroomIds) &&
    link.targetClassroomIds.includes(classroomId));

const toSeedSchool = ({
  slug,
  schoolDisplayName,
  location,
  classrooms,
  hasSchoolPassword = false,
  completed = false,
}: {
  slug: string;
  schoolDisplayName: string;
  location: string;
  classrooms: SchoolClassroom[];
  hasSchoolPassword?: boolean;
  completed?: boolean;
}): ContractSchoolConfig => {
  const firstClassroom = classrooms[0];
  const lessonNumbers = Array.from(
    new Set(classrooms.flatMap((classroom) => classroom.lessons.map((lesson) => lesson.lesson)))
  ).sort((a, b) => a - b);

  const lessonsWithLegacyLinks = lessonNumbers.map((lessonNumber) => {
    const commonLesson =
      firstClassroom.lessons.find((lesson) => lesson.lesson === lessonNumber) ||
      classrooms
        .flatMap((classroom) => classroom.lessons)
        .find((lesson) => lesson.lesson === lessonNumber);

    if (!commonLesson) {
      throw new Error(`Missing seed lesson ${slug}:${lessonNumber}`);
    }

    const commonSignature = lessonLinksSignature(commonLesson.links);
    const legacyClassLinks: Record<string, ClassroomLink[]> = {};

    for (const classroom of classrooms) {
      const classroomLesson = classroom.lessons.find(
        (lesson) => lesson.lesson === lessonNumber
      );

      if (
        classroomLesson &&
        lessonLinksSignature(classroomLesson.links) !== commonSignature
      ) {
        legacyClassLinks[makeClassroomId(classroom.grade, classroom.classNumber)] =
          classroomLesson.links;
      }
    }

    return {
      id: `lesson-${lessonNumber}`,
      lesson: lessonNumber,
      ...(commonLesson.date ? { date: commonLesson.date } : {}),
      title: commonLesson.title,
      message: commonLesson.message,
      links: commonLesson.links,
      ...(Object.keys(legacyClassLinks).length > 0 ? { legacyClassLinks } : {}),
    } satisfies ContractSchoolLesson;
  });

  const schoolClassrooms = classrooms.map((classroom) => ({
    id: makeClassroomId(classroom.grade, classroom.classNumber),
    grade: classroom.grade,
    classNumber: classroom.classNumber,
    label: classroom.label,
    monsterId: classroom.monsterId,
    directToken: classroom.directToken,
    active: true,
  }));
  const classroomIds = schoolClassrooms.map((classroom) => classroom.id);
  const lessons = lessonsWithLegacyLinks.map((lesson) =>
    upgradeLegacyLessonLinks(lesson, classroomIds)
  );

  const lessonVisibility = Object.fromEntries(
    classrooms.map((classroom) => [
      makeClassroomId(classroom.grade, classroom.classNumber),
      Object.fromEntries(
        lessons.map((lesson) => {
          const classroomLesson = classroom.lessons.find(
            (item) => item.lesson === lesson.lesson
          );
          return [lesson.id, Boolean(classroomLesson && !classroomLesson.expandLocked)];
        })
      ),
    ])
  );

  return {
    schemaVersion: CONTRACT_SCHOOL_SCHEMA_VERSION,
    slug,
    schoolName: firstClassroom.schoolName,
    displayName: schoolDisplayName,
    location,
    published: true,
    completed,
    hasSchoolPassword,
    classrooms: schoolClassrooms,
    lessons,
    lessonVisibility,
    source: "default",
  };
};

const SHINSANGDO_CLASSROOMS: SchoolClassroom[] = [
  {
    schoolName: "서울 신상도초등학교",
    schoolDisplayName: "서울 신상도초",
    grade: 6,
    classNumber: 5,
    label: "6학년 5반",
    monsterId: "slime",
    directToken: "ss6c5-f8a2d7k4qn",
    lessons: [],
  },
  {
    schoolName: "서울 신상도초등학교",
    schoolDisplayName: "서울 신상도초",
    grade: 6,
    classNumber: 8,
    label: "6학년 8반",
    monsterId: "guardian-angel-slime",
    directToken: "ss6c8-m3v9p2r6tx",
    lessons: [],
  },
  {
    schoolName: "서울 신상도초등학교",
    schoolDisplayName: "서울 신상도초",
    grade: 6,
    classNumber: 9,
    label: "6학년 9반",
    monsterId: "blue-mushroom",
    directToken: "ss6c9-b7w4h8z2kc",
    lessons: [],
  },
  {
    schoolName: "서울 신상도초등학교",
    schoolDisplayName: "서울 신상도초",
    grade: 6,
    classNumber: 3,
    label: "6학년 3반",
    monsterId: "orange-mushroom",
    directToken: "ss6c3-j5n8q4y7du",
    lessons: [],
  },
];

export const DEFAULT_CONTRACT_SCHOOLS: ContractSchoolConfig[] = [
  toSeedSchool({
    slug: "wonjong",
    schoolDisplayName: WONJONG_SCHOOL_DISPLAY_NAME,
    location: "컴퓨터실",
    classrooms: WONJONG_CLASSROOMS,
    completed: true,
  }),
  toSeedSchool({
    slug: "wolmun",
    schoolDisplayName: WOLMUN_SCHOOL_DISPLAY_NAME,
    location: "컴퓨터실",
    classrooms: WOLMUN_CLASSROOMS,
  }),
  toSeedSchool({
    slug: "gwangil",
    schoolDisplayName: GWANGIL_SCHOOL_DISPLAY_NAME,
    location: "컴퓨터실",
    classrooms: GWANGIL_CLASSROOMS,
  }),
  toSeedSchool({
    slug: "gaebong",
    schoolDisplayName: GAEBONG_SCHOOL_DISPLAY_NAME,
    location: "각 학년 교실",
    classrooms: GAEBONG_CLASSROOMS,
  }),
  toSeedSchool({
    slug: "shinsangdo",
    schoolDisplayName: "서울 신상도초",
    location: "컴퓨터실",
    classrooms: SHINSANGDO_CLASSROOMS,
    hasSchoolPassword: true,
  }),
];

export const getDefaultContractSchool = (slug: string) =>
  DEFAULT_CONTRACT_SCHOOLS.find((school) => school.slug === slug);

export const getDefaultContractClassroomByToken = (token: string) => {
  for (const school of DEFAULT_CONTRACT_SCHOOLS) {
    const classroom = school.classrooms.find((item) => item.directToken === token);

    if (classroom) {
      return toSchoolClassroom(school, classroom);
    }
  }

  return undefined;
};

export const toSchoolClassroom = (
  school: ContractSchoolConfig,
  classroom: ContractSchoolClassroom
): SchoolClassroom => ({
  schoolName: school.schoolName,
  schoolDisplayName: school.displayName,
  grade: classroom.grade,
  classNumber: classroom.classNumber,
  label: classroom.label,
  monsterId: classroom.monsterId,
  directToken: classroom.directToken,
  lessons: school.lessons.map((lesson) => ({
    lesson: lesson.lesson,
    ...(lesson.date ? { date: lesson.date } : {}),
    title: lesson.title,
    message: lesson.message,
    links: (lesson.legacyClassLinks?.[classroom.id] || lesson.links)
      .filter((link) => isLinkVisibleToClassroom(link, classroom.id))
      .map((link) => ({
        id: link.id,
        label: link.label,
        href: link.href,
        ...(link.kind ? { kind: link.kind } : {}),
        ...(typeof link.defaultUnlocked === "boolean"
          ? { defaultUnlocked: link.defaultUnlocked }
          : {}),
      })),
    expandLocked: school.lessonVisibility[classroom.id]?.[lesson.id] !== true,
  })) satisfies ClassroomLesson[],
});

export const toSchoolClassrooms = (school: ContractSchoolConfig) =>
  school.classrooms
    .filter((classroom) => classroom.active !== false)
    .map((classroom) => toSchoolClassroom(school, classroom));

export const toContractSchoolSummary = (
  school: ContractSchoolConfig
): ContractSchoolSummary => ({
  slug: school.slug,
  schoolName: school.schoolName,
  displayName: school.displayName,
  location: school.location,
  published: school.published,
  completed: school.completed,
  hasSchoolPassword: school.hasSchoolPassword,
});

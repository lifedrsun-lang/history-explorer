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
export const CONTRACT_SCHOOL_SCHEMA_VERSION = 1;

export type ContractSchoolClassroom = {
  id: string;
  grade: number;
  classNumber: number;
  label: string;
  monsterId: string;
  directToken: string;
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

const toSeedSchool = ({
  slug,
  schoolDisplayName,
  location,
  classrooms,
}: {
  slug: string;
  schoolDisplayName: string;
  location: string;
  classrooms: SchoolClassroom[];
}): ContractSchoolConfig => {
  const firstClassroom = classrooms[0];
  const lessonNumbers = Array.from(
    new Set(classrooms.flatMap((classroom) => classroom.lessons.map((lesson) => lesson.lesson)))
  ).sort((a, b) => a - b);

  const lessons = lessonNumbers.map((lessonNumber) => {
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
  }));

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
    hasSchoolPassword: false,
    classrooms: schoolClassrooms,
    lessons,
    lessonVisibility,
    source: "default",
  };
};

export const DEFAULT_CONTRACT_SCHOOLS: ContractSchoolConfig[] = [
  toSeedSchool({
    slug: "wonjong",
    schoolDisplayName: WONJONG_SCHOOL_DISPLAY_NAME,
    location: "컴퓨터실",
    classrooms: WONJONG_CLASSROOMS,
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
    links: lesson.legacyClassLinks?.[classroom.id] || lesson.links,
    expandLocked: school.lessonVisibility[classroom.id]?.[lesson.id] !== true,
  })) satisfies ClassroomLesson[],
});

export const toSchoolClassrooms = (school: ContractSchoolConfig) =>
  school.classrooms.map((classroom) => toSchoolClassroom(school, classroom));

export const toContractSchoolSummary = (
  school: ContractSchoolConfig
): ContractSchoolSummary => ({
  slug: school.slug,
  schoolName: school.schoolName,
  displayName: school.displayName,
  location: school.location,
  published: school.published,
  hasSchoolPassword: school.hasSchoolPassword,
});

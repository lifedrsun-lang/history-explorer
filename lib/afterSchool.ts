import { normalizeSchoolText } from "@/app/student/data/schoolInfo";

export type AfterSchoolClass = "A반" | "B반";
export type AfterSchoolStatus = "active" | "paused" | "completed";
export type AfterSchoolStatusMap = Record<string, AfterSchoolStatus>;

export const AFTER_SCHOOL_STATUS_COLLECTION = "after_school_school_statuses";

export const AFTER_SCHOOL_STATUS_OPTIONS: Array<{
  value: AfterSchoolStatus;
  label: string;
}> = [
  { value: "active", label: "진행중" },
  { value: "paused", label: "휴강" },
  { value: "completed", label: "종강" },
];

export type AfterSchoolSchool = {
  slug: string;
  name: string;
  displayName: string;
  shortName: string;
  location: string;
  status: AfterSchoolStatus;
  aliases: string[];
};

export const AFTER_SCHOOL_SCHOOLS: AfterSchoolSchool[] = [
  {
    slug: "sau",
    name: "김포 사우초등학교",
    displayName: "김포 사우초",
    shortName: "김포 사우초",
    location: "4F 특기적성2실",
    status: "paused",
    aliases: ["김포 사우초등학교", "김포 사우초", "사우초등학교", "사우초"],
  },
  {
    slug: "haneulbit",
    name: "김포 하늘빛초등학교",
    displayName: "김포 하늘빛초",
    shortName: "김포 하늘빛초",
    location: "2F 맞춤3교실",
    status: "active",
    aliases: [
      "김포 하늘빛초등학교",
      "김포 하늘빛초",
      "하늘빛초등학교",
      "하늘빛초",
    ],
  },
  {
    slug: "saesol",
    name: "화성 새솔초등학교",
    displayName: "화성 새솔초",
    shortName: "화성 새솔초",
    location: "5F 음악실",
    status: "active",
    aliases: ["화성 새솔초등학교", "화성 새솔초", "새솔초등학교", "새솔초"],
  },
];

export const getAfterSchoolSchool = (slug: string) =>
  AFTER_SCHOOL_SCHOOLS.find((school) => school.slug === slug) || null;

export const isAfterSchoolStatus = (
  value: unknown
): value is AfterSchoolStatus =>
  value === "active" || value === "paused" || value === "completed";

export const matchesAfterSchoolSchool = (
  value: unknown,
  school: AfterSchoolSchool
) => {
  const target = normalizeSchoolText(value);

  return [school.name, school.displayName, school.shortName, ...school.aliases]
    .some((candidate) => normalizeSchoolText(candidate) === target);
};

export const getAfterSchoolClass = (student: { grade?: unknown }): AfterSchoolClass | null => {
  const match = String(student?.grade || "").match(/\d+/);
  const grade = match ? Number(match[0]) : 0;

  if (grade >= 1 && grade <= 2) return "A반";
  if (grade >= 3 && grade <= 6) return "B반";
  return null;
};

import { AFTER_SCHOOL_SCHOOLS } from "@/lib/afterSchool";

export type SchoolDocumentSchool = {
  slug: string;
  schoolName: string;
  displayName: string;
};

export const AFTER_SCHOOL_DOCUMENT_SCHOOLS: SchoolDocumentSchool[] =
  AFTER_SCHOOL_SCHOOLS.map((school) => ({
    slug: school.slug,
    schoolName: school.name,
    displayName: school.displayName,
  }));

export const getAfterSchoolDocumentSchool = (slug: string) =>
  AFTER_SCHOOL_DOCUMENT_SCHOOLS.find((school) => school.slug === slug) || null;

export const isAfterSchoolDocumentSchool = (slug: string) =>
  Boolean(getAfterSchoolDocumentSchool(slug));

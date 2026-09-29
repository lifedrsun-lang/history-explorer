import "server-only";

import {
  getAllContractSchools,
  getContractSchool,
} from "@/lib/contractSchoolsServer";
import {
  AFTER_SCHOOL_DOCUMENT_SCHOOLS,
  getAfterSchoolDocumentSchool,
  isAfterSchoolDocumentSchool,
  type SchoolDocumentSchool,
} from "@/lib/schoolDocumentSchools";

const toSchoolDocumentSchool = (school: {
  slug: string;
  schoolName: string;
  displayName: string;
}): SchoolDocumentSchool => ({
  slug: school.slug,
  schoolName: school.schoolName,
  displayName: school.displayName,
});

export async function getAllSchoolDocumentSchools() {
  const contractSchools = await getAllContractSchools();
  return [
    ...contractSchools
      .filter((school) => !isAfterSchoolDocumentSchool(school.slug))
      .map(toSchoolDocumentSchool),
    ...AFTER_SCHOOL_DOCUMENT_SCHOOLS,
  ];
}

export async function getSchoolDocumentSchool(schoolSlug: string) {
  const afterSchool = getAfterSchoolDocumentSchool(schoolSlug);
  if (afterSchool) return afterSchool;

  const contractSchool = await getContractSchool(schoolSlug, {
    includeUnpublished: true,
  });
  return contractSchool ? toSchoolDocumentSchool(contractSchool) : null;
}

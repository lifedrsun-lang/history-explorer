// Teacher-confirmed non-enrollment on 2026-10-07. Historical fee/textbook
// checks must not turn these records into inferred quarter applications.
// These exceptions affect audits only: an explicit future enrollment remains
// controlled by students.enrollmentTerms and is never hidden by this file.
const confirmedNonEnrollmentTerms: Record<string, readonly string[]> = {
  ZLhg6wxCMP7U3AzvYC30: ["2026-Q3"],
  ivSNBzV8ESpXKrVl5UIV: ["2026-Q3"],
  zRCKFbR28MyCNKB3T9Po: ["2026-Q3"],
  aqbcm3XrF7L2WVFCQCkF: ["2026-Q3"],
};

// This student has no confirmed quarter application; an empty history is valid.
const confirmedEmptyEnrollmentHistory = new Set([
  "aqbcm3XrF7L2WVFCQCkF",
]);

export const isConfirmedNonEnrollment = (studentId: string, term: string) =>
  confirmedNonEnrollmentTerms[studentId]?.includes(term) === true;

export const hasConfirmedEmptyEnrollmentHistory = (studentId: string) =>
  confirmedEmptyEnrollmentHistory.has(studentId);

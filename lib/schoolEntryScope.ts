export const INITIAL_GUARDIAN_SCHOOLS = ["saesol", "haneulbit", "deunghyeon", "sau"] as const;
export function isInitialGuardianSchool(slug: string) {
  return (INITIAL_GUARDIAN_SCHOOLS as readonly string[]).includes(slug);
}

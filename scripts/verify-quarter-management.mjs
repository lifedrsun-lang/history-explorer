import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { isQuarterManagedProgram } from "../lib/programs.ts";

const students = [
  { name: "이민채", program: "sun_lab", enrollmentTerms: [] },
  { name: "이민서", program: "sun_lab", enrollmentTerms: [] },
  { name: "김유주", program: "byeolkkum_history", enrollmentTerms: [] },
  { name: "신채민", program: "byeolkkum_history", enrollmentTerms: [] },
  { name: "김주원", program: "byeolkkum_history", enrollmentTerms: [] },
  { name: "송민채", program: "byeolkkum_history", enrollmentTerms: [] },
];

const missingQuarterStudents = students.filter(
  (student) =>
    isQuarterManagedProgram(student.program) &&
    student.enrollmentTerms.length === 0
);

assert.equal(isQuarterManagedProgram("sun_lab"), false);
assert.equal(isQuarterManagedProgram("byeolkkum_history"), true);
assert.deepEqual(
  missingQuarterStudents.map((student) => student.name),
  ["김유주", "신채민", "김주원", "송민채"]
);

const [studentsPage, editModal, auditRoute] = await Promise.all([
  readFile(new URL("../app/teacher/students/page.tsx", import.meta.url), "utf8"),
  readFile(
    new URL("../app/teacher/components/StudentEditModal.tsx", import.meta.url),
    "utf8"
  ),
  readFile(
    new URL("../app/api/teacher/student-data-integrity/route.ts", import.meta.url),
    "utf8"
  ),
]);

assert.match(studentsPage, /isQuarterManagedProgram\(student\?\.program\)/);
assert.match(studentsPage, /isQuarterManagedProgram\(newProgram\)/);
assert.match(editModal, /isQuarterManagedProgram\(program\)/);
assert.match(auditRoute, /isQuarterManagedProgram\(student\.data\.program\)/);

console.log(
  JSON.stringify(
    {
      passed: true,
      quarterManaged: missingQuarterStudents.map((student) => student.name),
      excludedMonthlyStudents: ["이민채", "이민서"],
    },
    null,
    2
  )
);

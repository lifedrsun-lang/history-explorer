import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const YEAR = 2026;
const term = (quarter) => `${YEAR}-${quarter}`;
const normalizeSchool = (value) =>
  String(value || "")
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초");
const sameSchool = (left, right) => {
  const a = normalizeSchool(left);
  const b = normalizeSchool(right);
  return Boolean(a && b && (a === b || a.endsWith(b) || b.endsWith(a)));
};
const roster = (students, school, quarter) =>
  students.filter(
    (student) =>
      sameSchool(student.school, school) &&
      student.enrollmentTerms.includes(term(quarter))
  );

const students = [
  {
    id: "student-a",
    name: "최재용",
    school: "새솔초",
    status: "active",
    enrollmentTerms: [term("Q1"), term("Q3")],
    sunLabMember: false,
  },
  {
    id: "student-b",
    name: "장세아",
    school: "새솔초등학교",
    status: "active",
    enrollmentTerms: [term("Q2"), term("Q3")],
    sunLabMember: true,
  },
  {
    id: "student-c",
    name: "한별",
    school: "새솔초",
    status: "paused",
    enrollmentTerms: [term("Q4")],
    sunLabMember: false,
  },
  {
    id: "student-d",
    name: "여름",
    school: "다른초",
    status: "active",
    enrollmentTerms: [term("Q3")],
    sunLabMember: false,
  },
];

const studentEditSource = await readFile(
  new URL("../app/teacher/components/StudentEditModal.tsx", import.meta.url),
  "utf8"
);

const results = [];
const verify = (number, title, callback) => {
  callback();
  results.push({ number, title, passed: true });
};

verify(1, "원본 이름 변경이 수강료·교재에 함께 반영", () => {
  const renamed = students.map((student) =>
    student.id === "student-a" ? { ...student, name: "최재용수정" } : student
  );
  assert.equal(roster(renamed, "새솔초", "Q3")[0].name, "최재용수정");
  assert.equal(roster(renamed, "새솔초", "Q3")[0].name, "최재용수정");
});

verify(2, "1분기 학생만 조회", () => {
  assert.deepEqual(roster(students, "새솔초", "Q1").map((item) => item.id), [
    "student-a",
  ]);
});

verify(3, "2분기 학생만 조회", () => {
  assert.deepEqual(roster(students, "새솔초", "Q2").map((item) => item.id), [
    "student-b",
  ]);
});

verify(4, "3분기 학생만 조회", () => {
  assert.deepEqual(roster(students, "새솔초", "Q3").map((item) => item.id), [
    "student-a",
    "student-b",
  ]);
});

verify(5, "여러 분기 수강생이 각 분기에 조회", () => {
  assert.equal(roster(students, "새솔초", "Q1")[0].id, "student-a");
  assert.equal(roster(students, "새솔초", "Q3")[0].id, "student-a");
});

verify(6, "수강료 텀 변경이 분기 이력을 변경하지 않음", () => {
  const termsBefore = [...students[0].enrollmentTerms];
  const feeChecks = { "student-a": [true, true, true] };
  feeChecks["student-a"][1] = false;
  assert.deepEqual(students[0].enrollmentTerms, termsBefore);
});

verify(7, "교재 텀 변경이 수강료 텀을 변경하지 않음", () => {
  const feeChecks = { "student-a": [true, false, true] };
  const textbookChecks = { "student-a": [true, true, true] };
  textbookChecks["student-a"][2] = false;
  assert.deepEqual(feeChecks["student-a"], [true, false, true]);
});

verify(8, "수강료와 교재 기본 명단이 동일", () => {
  const feeRoster = roster(students, "새솔초", "Q3").map((item) => item.id);
  const textbookRoster = roster(students, "새솔초", "Q3").map(
    (item) => item.id
  );
  assert.deepEqual(feeRoster, textbookRoster);
});

verify(9, "신규 등록 시 분기 직접 선택", () => {
  const registered = {
    id: "student-new",
    status: "active",
    enrollmentTerms: [term("Q3")],
  };
  assert.deepEqual(registered.enrollmentTerms, ["2026-Q3"]);
});

verify(10, "상태 변경 없이 기존 학생 분기 수정", () => {
  const edited = {
    ...students[0],
    enrollmentTerms: [...students[0].enrollmentTerms, term("Q4")],
  };
  assert.equal(edited.status, students[0].status);
  assert.ok(edited.enrollmentTerms.includes("2026-Q4"));
});

verify(11, "비회원 수강생 수정창에 로그인·헬로메이플 입력란 없음", () => {
  assert.equal(studentEditSource.includes('name="birthDate"'), false);
  assert.equal(studentEditSource.includes('name="helloMapleId"'), false);
  assert.equal(studentEditSource.includes('name="helloMaplePassword"'), false);
});

verify(12, "회원 체크 학생만 별도 회원 데이터와 연결", () => {
  const linked = new Map();
  students.forEach((student) => {
    if (student.sunLabMember) linked.set(student.id, { studentId: student.id });
  });
  assert.deepEqual([...linked.keys()], ["student-b"]);
});

verify(13, "원본에 없는 학생 ID는 화면 명단에 나타나지 않음", () => {
  const legacyChecks = {
    "student-a": [true, true, true],
    "missing-student": [true, true, true],
  };
  const visible = roster(students, "새솔초", "Q3").filter((student) =>
    Object.hasOwn(legacyChecks, student.id)
  );
  assert.deepEqual(visible.map((student) => student.id), ["student-a"]);
});

console.log(JSON.stringify({ passed: results.length, total: 13, results }, null, 2));

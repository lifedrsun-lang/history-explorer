"use client";

import { doc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  STUDENT_PROGRAM_OPTIONS,
  getStudentProgramValue,
} from "@/lib/programs";

type Props = {
  student: any;
  onClose: () => void;
  refreshStudents: () => void;
};

const normalizeBirthMd = (value: FormDataEntryValue | null) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 4);

const isValidBirthMd = (value: string) => {
  if (!value) return true;

  const match = value.match(/^(\d{2})(\d{2})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const day = Number(match[2]);

  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= new Date(2000, month, 0).getDate();
};

export default function StudentEditModal({
  student,
  onClose,
  refreshStudents,
}: Props) {
  const saveEdit = async (formData: FormData) => {
    const school = formData.get("school");
    const grade = formData.get("grade");
    const studentClass = formData.get("class");
    const studentNumber = formData.get("studentNumber");
    const name = formData.get("name");
    const program = formData.get("program");
    const helloMapleBirthMd = normalizeBirthMd(formData.get("helloMapleBirthMd"));
    const helloMapleId = String(formData.get("helloMapleId") || "").trim();
    const helloMaplePassword = String(
      formData.get("helloMaplePassword") || ""
    ).trim();

    if (!isValidBirthMd(helloMapleBirthMd)) {
      alert("생월일은 4자리로 입력해주세요. 예: 7월 13일 → 0713");
      return;
    }

    if (
      (helloMapleId || helloMaplePassword || helloMapleBirthMd) &&
      (!helloMapleId || !helloMaplePassword || !helloMapleBirthMd)
    ) {
      alert("헬로메이플 계정은 생월일 4자리, 아이디, 비밀번호를 모두 입력해주세요.");
      return;
    }

    // 번호 기반 SUN LAB 학생 비밀번호
    const password = String(studentNumber || "").padStart(2, "0");

    await updateDoc(doc(db, "students", student.id), {
      school,
      grade,
      class: studentClass,
      studentNumber,
      password,
      name,
      program: getStudentProgramValue(program),
      helloMapleBirthMd,
      helloMapleId,
      helloMaplePassword,
    });

    alert("수정 완료!");
    await refreshStudents();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5">
        <div className="mb-4 text-2xl font-bold">✏️ 학생 수정</div>

        <form action={saveEdit} className="space-y-3">
          <input
            name="school"
            defaultValue={student.school}
            placeholder="학교"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="grade"
            defaultValue={student.grade}
            placeholder="학년"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="class"
            defaultValue={student.class}
            placeholder="반"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="studentNumber"
            defaultValue={student.studentNumber}
            placeholder="번호"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="name"
            defaultValue={student.name}
            placeholder="이름"
            className="w-full rounded-xl border px-4 py-3"
          />

          <select
            name="program"
            defaultValue={getStudentProgramValue(student?.program)}
            className="w-full rounded-xl border px-4 py-3"
          >
            {STUDENT_PROGRAM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="rounded-xl bg-blue-50 p-3 text-sm">
            번호 변경 시 SUN LAB 학생 비밀번호도 자동 변경됩니다.
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="font-black text-emerald-700">🍁 헬로메이플 계정</div>
            <div className="mt-1 text-xs font-bold leading-5 text-slate-500">
              생월일 4자리는 계정 찾기 인증번호로 사용됩니다. 예: 7월 13일 → 0713
            </div>

            <div className="mt-3 space-y-2">
              <input
                name="helloMapleBirthMd"
                defaultValue={student.helloMapleBirthMd || ""}
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                placeholder="생월일 4자리 (예: 0713)"
                className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3"
              />

              <input
                name="helloMapleId"
                defaultValue={student.helloMapleId || ""}
                autoComplete="off"
                placeholder="헬로메이플 아이디"
                className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3"
              />

              <input
                name="helloMaplePassword"
                defaultValue={student.helloMaplePassword || ""}
                autoComplete="off"
                placeholder="헬로메이플 비밀번호"
                className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blue-500 py-3 font-bold text-white"
            >
              저장
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-300 py-3 font-bold"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

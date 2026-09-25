"use client";

import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";

import { db } from "@/lib/firebase";
import {
  STUDENT_PROGRAM_OPTIONS,
  getStudentProgramValue,
} from "@/lib/programs";
import {
  ENROLLMENT_STATUS_OPTIONS,
  getEnrollmentStatus,
  getEnrollmentTerms,
  makeEnrollmentTerm,
  type EnrollmentStatus,
} from "@/lib/studentEnrollment";
import { AFTER_SCHOOL_ACADEMIC_YEAR } from "@/lib/studentRoster";

type Props = {
  student: any;
  onClose: () => void;
  refreshStudents: () => void;
};

export default function StudentEditModal({
  student,
  onClose,
  refreshStudents,
}: Props) {
  const [status, setStatus] = useState<EnrollmentStatus>(() =>
    getEnrollmentStatus(student)
  );
  const [enrollmentTerms, setEnrollmentTerms] = useState<string[]>(() =>
    getEnrollmentTerms(student)
  );
  const [sunLabMember, setSunLabMember] = useState(
    student?.sunLabMember === true
  );
  const [saving, setSaving] = useState(false);

  const toggleQuarter = (quarter: number) => {
    const term = makeEnrollmentTerm(AFTER_SCHOOL_ACADEMIC_YEAR, quarter);
    setEnrollmentTerms((current) =>
      current.includes(term)
        ? current.filter((item) => item !== term)
        : [...current, term].sort((a, b) => a.localeCompare(b))
    );
  };

  const saveEdit = async (formData: FormData) => {
    setSaving(true);
    try {
      const studentNumber = String(formData.get("studentNumber") || "").trim();
      await updateDoc(doc(db, "students", student.id), {
        school: String(formData.get("school") || "").trim(),
        grade: String(formData.get("grade") || "").trim(),
        class: String(formData.get("class") || "").trim(),
        studentNumber,
        password: studentNumber.padStart(2, "0"),
        name: String(formData.get("name") || "").trim(),
        program: getStudentProgramValue(formData.get("program")),
        enrollmentStatus: status,
        isActive: status === "active",
        enrollmentTerms,
        sunLabMember,
      });

      alert(
        !student?.sunLabMember && sunLabMember
          ? "수강생 정보를 저장했습니다. SUN LAB 회원관리에서 로그인·계정 정보를 연결해 주세요."
          : "수강생 정보를 저장했습니다."
      );
      await refreshStudents();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5">
        <div className="mb-1 text-2xl font-bold">✏️ 수강생 수정</div>
        <div className="mb-4 text-xs font-bold text-slate-400">
          학생 고유 ID · {student.id}
        </div>

        <form action={saveEdit} className="space-y-3">
          <input
            name="school"
            defaultValue={student.school}
            placeholder="학교"
            className="w-full rounded-xl border px-4 py-3"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              name="grade"
              defaultValue={student.grade}
              placeholder="학년"
              className="min-w-0 rounded-xl border px-3 py-3"
            />
            <input
              name="class"
              defaultValue={student.class}
              placeholder="반"
              className="min-w-0 rounded-xl border px-3 py-3"
            />
            <input
              name="studentNumber"
              defaultValue={student.studentNumber}
              placeholder="번호"
              className="min-w-0 rounded-xl border px-3 py-3"
            />
          </div>
          <input
            name="name"
            defaultValue={student.name}
            placeholder="이름"
            className="w-full rounded-xl border px-4 py-3"
          />
          <label className="grid gap-1.5 text-xs font-black text-slate-600">
            수강 프로그램
            <select
              name="program"
              defaultValue={getStudentProgramValue(student?.program)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            >
              {STUDENT_PROGRAM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs font-black text-slate-600">현재 상태</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {ENROLLMENT_STATUS_OPTIONS.filter(
                (option) => option.value !== "all"
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value as EnrollmentStatus)}
                  className={`rounded-xl px-2 py-2 text-xs font-black ${
                    status === option.value
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="text-xs font-black text-blue-800">
              {String(AFTER_SCHOOL_ACADEMIC_YEAR).slice(2)}년 수강 분기
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((quarter) => {
                const term = makeEnrollmentTerm(
                  AFTER_SCHOOL_ACADEMIC_YEAR,
                  quarter
                );
                const checked = enrollmentTerms.includes(term);
                return (
                  <label
                    key={quarter}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-black ${
                      checked
                        ? "border-blue-400 bg-blue-100 text-blue-800"
                        : "border-blue-100 bg-white text-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleQuarter(quarter)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    {quarter}분기
                  </label>
                );
              })}
            </div>
            <div className="mt-2 text-[11px] font-bold text-blue-600">
              상태를 바꾸지 않아도 분기 이력을 수정할 수 있습니다.
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <input
              type="checkbox"
              checked={sunLabMember}
              onChange={(event) => setSunLabMember(event.target.checked)}
              className="mt-0.5 h-5 w-5 accent-emerald-600"
            />
            <span>
              <span className="block text-sm font-black text-emerald-800">
                SUN LAB 회원
              </span>
              <span className="mt-1 block text-[11px] font-bold leading-5 text-slate-500">
                로그인·생년월일·헬로메이플 계정은 SUN LAB 회원관리에서만 수정합니다.
              </span>
            </span>
          </label>

          <div className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
            번호를 변경하면 기존 학생 비밀번호도 같은 번호로 변경됩니다.
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-500 py-3 font-bold text-white disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
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

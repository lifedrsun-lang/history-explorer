"use client";

import { doc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  STUDENT_PROGRAM_OPTIONS,
  getStudentProgramValue,
} from "@/lib/programs";
import {
  SUN_LAB_PERMISSION_OPTIONS,
  getExplicitSunLabPermissions,
  isValidBirthDate,
  normalizeBirthDate,
  type SunLabPermission,
} from "@/lib/sunLabMember";

type Props = {
  student: any;
  onClose: () => void;
  refreshStudents: () => void;
};

const normalizePermissionValues = (
  values: FormDataEntryValue[]
): SunLabPermission[] => {
  const allowed = new Set(
    SUN_LAB_PERMISSION_OPTIONS.map((option) => option.value)
  );

  return values
    .map((value) => String(value || "").trim())
    .filter((value): value is SunLabPermission =>
      allowed.has(value as SunLabPermission)
    )
    .filter((value, index, list) => list.indexOf(value) === index);
};

export default function StudentEditModal({
  student,
  onClose,
  refreshStudents,
}: Props) {
  const explicitPermissions = getExplicitSunLabPermissions(
    student as Record<string, unknown>
  );

  const saveEdit = async (formData: FormData) => {
    const school = formData.get("school");
    const grade = formData.get("grade");
    const studentClass = formData.get("class");
    const studentNumber = formData.get("studentNumber");
    const name = formData.get("name");
    const program = formData.get("program");

    const sunLabMember = formData.get("sunLabMember") === "on";
    const sunLabAllAccess =
      sunLabMember && formData.get("sunLabAllAccess") === "on";
    const birthDate = normalizeBirthDate(formData.get("birthDate"));
    const sunLabPermissions = sunLabMember
      ? normalizePermissionValues(formData.getAll("sunLabPermissions"))
      : [];

    const helloMapleId = String(formData.get("helloMapleId") || "").trim();
    const helloMaplePassword = String(
      formData.get("helloMaplePassword") || ""
    ).trim();

    if (sunLabMember && !isValidBirthDate(birthDate)) {
      alert("SUN LAB 회원은 생년월일 8자리를 입력해주세요. 예: 20180713");
      return;
    }

    if (birthDate && !isValidBirthDate(birthDate)) {
      alert("생년월일은 8자리로 입력해주세요. 예: 20180713");
      return;
    }

    if (
      (helloMapleId && !helloMaplePassword) ||
      (!helloMapleId && helloMaplePassword)
    ) {
      alert("헬로메이플 아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    const existingHelloMapleBirthMd = String(
      student?.helloMapleBirthMd || ""
    )
      .replace(/\D/g, "")
      .slice(0, 4);
    const helloMapleBirthMd = birthDate
      ? birthDate.slice(4)
      : existingHelloMapleBirthMd;

    // 번호 기반 기존 SUN LAB 학생 비밀번호는 다른 화면 호환을 위해 유지합니다.
    const password = String(studentNumber || "").padStart(2, "0");

    await updateDoc(doc(db, "students", student.id), {
      school,
      grade,
      class: studentClass,
      studentNumber,
      password,
      name,
      program: getStudentProgramValue(program),
      sunLabMember,
      sunLabAllAccess,
      sunLabPermissions,
      birthDate,
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
            번호 변경 시 기존 학생 비밀번호도 자동 변경됩니다.
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-black text-sky-800">
                  🌞 SUN LAB 공부방 회원
                </div>
                <div className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  SUN LAB 카드에서 로그인할 공부방 회원만 체크합니다.
                </div>
              </div>
              <label className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-sky-700 shadow-sm">
                <input
                  type="checkbox"
                  name="sunLabMember"
                  defaultChecked={student?.sunLabMember === true}
                  className="h-4 w-4"
                />
                회원
              </label>
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-black text-slate-600">
                생년월일 8자리
              </label>
              <input
                name="birthDate"
                defaultValue={student?.birthDate || ""}
                inputMode="numeric"
                maxLength={8}
                autoComplete="off"
                placeholder="예: 20180713"
                className="w-full rounded-xl border border-sky-100 bg-white px-4 py-3"
              />
              <div className="mt-1 text-[11px] font-bold leading-5 text-slate-400">
                회원 로그인 확인용입니다. 공부방 회원이 아니면 비워둘 수 있어요.
              </div>
            </div>

            <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-black text-amber-800">
              <input
                type="checkbox"
                name="sunLabAllAccess"
                defaultChecked={student?.sunLabAllAccess === true}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                전체권한
                <span className="mt-0.5 block text-[11px] font-bold text-amber-600">
                  모든 SUN LAB 메뉴를 표시합니다.
                </span>
              </span>
            </label>

            <div className="mt-3">
              <div className="text-xs font-black text-slate-600">
                개별 이용권한
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {SUN_LAB_PERMISSION_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-black text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="sunLabPermissions"
                      value={option.value}
                      defaultChecked={explicitPermissions.includes(option.value)}
                      className="h-4 w-4"
                    />
                    <span>
                      {option.emoji} {option.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-2 text-[11px] font-bold leading-5 text-slate-400">
                현재 수강 프로그램과 등록된 헬로메이플 계정은 자동으로도 표시됩니다. 여러 과목은 여기서 추가 체크할 수 있어요.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="font-black text-emerald-700">🍁 헬로메이플 계정</div>
            <div className="mt-1 text-xs font-bold leading-5 text-slate-500">
              SUN LAB 회원은 위 생년월일로 인증한 뒤 이 계정을 바로 확인할 수 있습니다.
            </div>

            <div className="mt-3 space-y-2">
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

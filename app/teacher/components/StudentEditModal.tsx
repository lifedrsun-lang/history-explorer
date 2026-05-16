"use client";

import {
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

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

  const saveEdit = async (
    formData: FormData
  ) => {

    const school =
      formData.get("school");

    const grade =
      formData.get("grade");

    const studentClass =
      formData.get("class");

    const studentNumber =
      formData.get(
        "studentNumber"
      );

    const name =
      formData.get("name");

    // 번호 기반 자동 비밀번호
    const password = String(
      studentNumber || ""
    ).padStart(2, "0");

    await updateDoc(
      doc(
        db,
        "students",
        student.id
      ),
      {
        school,
        grade,
        class: studentClass,
        studentNumber,
        password,
        name,
      }
    );

    alert("수정 완료!");

    refreshStudents();

    onClose();

  };

  return (

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

      <div className="bg-white rounded-3xl p-5 w-full max-w-md">

        <div className="text-2xl font-bold mb-4">

          ✏️ 학생 수정

        </div>

        <form
          action={saveEdit}
          className="space-y-3"
        >

          <input
            name="school"
            defaultValue={
              student.school
            }
            placeholder="학교"
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            name="grade"
            defaultValue={
              student.grade
            }
            placeholder="학년"
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            name="class"
            defaultValue={
              student.class
            }
            placeholder="반"
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            name="studentNumber"
            defaultValue={
              student.studentNumber
            }
            placeholder="번호"
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            name="name"
            defaultValue={
              student.name
            }
            placeholder="이름"
            className="w-full border rounded-xl px-4 py-3"
          />

          <div className="bg-blue-50 rounded-xl p-3 text-sm">

            번호 변경 시
            비밀번호도 자동 변경됩니다.

          </div>

          <div className="flex gap-2 pt-2">

            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white rounded-xl py-3 font-bold"
            >
              저장
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 rounded-xl py-3 font-bold"
            >
              취소
            </button>

          </div>

        </form>

      </div>

    </div>

  );

}
"use client";

import {
  getStageInfo,
} from "@/app/student/data/stageData";

type Props = {
  student: any;

  addBronze: (
    student: any
  ) => void;

  useSilver: (
    student: any
  ) => void;

  changeStage: (
    student: any,
    direction: number
  ) => void;

  toggleStudentVisible: (
    student: any
  ) => void;

  deleteStudent: (
    student: any
  ) => void;

  openEditModal: (
    student: any
  ) => void;
};

export default function StudentCard({
  student,
  addBronze,
  useSilver,
  changeStage,
  toggleStudentVisible,
  deleteStudent,
  openEditModal,
}: Props) {

  return (

    <div className="bg-white rounded-3xl p-3 shadow-md">

      <div className="text-2xl font-bold mb-1">
        {student.name}
      </div>

      <div className="text-sm text-gray-500 mb-2">

        {student.school || "미지정"}

        <br />

        {student.grade}학년
        {" "}
        {student.class}반

        {student.studentNumber && (
          <>
            {" "}
            / {student.studentNumber}번
          </>
        )}

      </div>

      {/* 비밀번호 */}
      <div className="bg-blue-50 rounded-xl p-2 mb-3 text-sm">

        🔑 비밀번호 :
        {" "}

        <span className="font-bold text-blue-600">

          {student.password || "없음"}

        </span>

      </div>

      {/* 진도 */}
      <div className="bg-[#f5f7fb] rounded-2xl p-4 mb-3">

        <div className="text-sm text-gray-400 mb-1">

          현재 진도

        </div>

        <div className="text-sm text-gray-500 mb-1">

          {
            getStageInfo(
              student.stage
            ).current.short
          }

        </div>

        <div className="text-lg font-bold text-yellow-600 leading-snug break-keep">

          {
            getStageInfo(
              student.stage
            ).title
          }

        </div>

        <div className="text-gray-400 mt-1 mb-3">

          {
            getStageInfo(
              student.stage
            ).current.era
          }

        </div>

      </div>

      {/* 버튼 */}
      <div className="grid grid-cols-2 gap-2">

        <button
          onClick={() =>
            addBronze(student)
          }
          className="bg-yellow-500 text-white rounded-xl py-2 text-xs font-bold"
        >
          +동엽전
        </button>

        <button
          onClick={() =>
            useSilver(student)
          }
          className="bg-purple-500 text-white rounded-xl py-2 text-xs font-bold"
        >
          은사용
        </button>

        <button
          onClick={() =>
            openEditModal(student)
          }
          className="bg-blue-500 text-white rounded-xl py-2 text-xs font-bold"
        >
          수정
        </button>

        <button
          onClick={() =>
            toggleStudentVisible(
              student
            )
          }
          className="bg-gray-500 text-white rounded-xl py-2 text-xs font-bold"
        >
          숨기기
        </button>

        <button
          onClick={() =>
            deleteStudent(student)
          }
          className="bg-red-500 text-white rounded-xl py-2 text-xs font-bold col-span-2"
        >
          삭제
        </button>

      </div>

    </div>

  );

}
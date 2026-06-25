"use client";

import { getStageInfo } from "@/app/student/data/stageData";
import { getStudentProgramLabel } from "@/lib/programs";
import { useRouter } from "next/navigation";

export default function StudentCard({
  student,
  addQuizBronze,
  addHomeworkBronze,
  addMakingBronze,
  addBonusBronze,
  removeBronze,
  useSilver,
  changeStage,
  toggleStudentVisible,
  deleteStudent,
  openEditModal,
}: any) {
  const router = useRouter();

  const stage = getStageInfo(student?.stage).current;

  const coinHistoryCount = Array.isArray(student?.coinHistory)
    ? student.coinHistory.length
    : 0;

  const programLabel = getStudentProgramLabel(
    student?.program
  );

  return (
    <div className="w-full min-w-0 bg-white rounded-[24px] p-3 sm:rounded-[30px] sm:p-4 shadow-md">
      {/* 이름 */}
      <div className="text-xl sm:text-3xl font-bold truncate">
        {student.name}
      </div>

      <div className="mt-1 mb-2 inline-flex max-w-full rounded-full bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">
        <span className="truncate">
          프로그램: {programLabel}
        </span>
      </div>

      {/* 학교 */}
      <div className="text-sm text-gray-500 truncate">
        {student.school}
      </div>

      {/* 학년 / 반 / 번호 */}
      <div className="text-sm text-gray-500 mb-2 truncate">
        {student.grade}학년 {student.class}반 / {student.studentNumber}번
      </div>

      {/* 비밀번호 */}
      <div className="bg-blue-50 rounded-2xl p-2 sm:p-3 mb-2 text-sm truncate">
        🔑 비밀번호:
        <span className="font-bold text-blue-600">
          {" "}
          {student.password}
        </span>
      </div>

      {/* 코인 현황 */}
      <div className="bg-yellow-50 rounded-2xl p-2 sm:p-3 mb-2 text-xs sm:text-sm">
        <div className="font-bold text-yellow-700 truncate">
          🟡 동엽전: {student.bronze ?? 0}개
        </div>

        <div className="font-bold text-purple-700 mt-1 truncate">
          ⚪ 은엽전: {student.silver ?? 0}개
        </div>

        <div className="font-bold text-green-700 mt-1 truncate">
          📈 누적 동엽전: {student.totalBronze ?? 0}개
        </div>

        <div className="text-[11px] sm:text-xs font-bold text-indigo-700 mt-1 truncate">
          🪙 코인 기록: {coinHistoryCount}개
        </div>
      </div>

      {/* 진도 */}
      <div className="bg-gray-100 rounded-2xl p-2 sm:p-3 mb-2">
        <div className="text-xs text-gray-400">
          현재 진도
        </div>

        <div className="text-xs text-gray-500 truncate">
          {stage?.short || "별꼼역사 1권"}
        </div>

        <div className="text-yellow-600 font-bold text-base sm:text-2xl truncate">
          {stage?.title || "진도 없음"}
        </div>
      </div>

      {/* 진도 버튼 */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2">
        <button
          onClick={() => changeStage(student, -1)}
          className="bg-indigo-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
        >
          ◀ 이전
        </button>

        <button
          onClick={() => changeStage(student, 1)}
          className="bg-green-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
        >
          다음 ▶
        </button>
      </div>

      {/* 코인 지급 / 사용 */}
      <div className="bg-orange-50 rounded-2xl p-2 sm:p-3 mb-2">
        <div className="font-bold text-orange-700 mb-2 text-sm">
          🪙 코인 지급 / 사용
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            onClick={() => addQuizBronze(student)}
            className="bg-yellow-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
          >
            퀴즈 +동
          </button>

          <button
            onClick={() => addHomeworkBronze(student)}
            className="bg-amber-600 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
          >
            과제 +동
          </button>

          <button
            onClick={() => addMakingBronze(student)}
            className="bg-sky-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
          >
            만들기 +동
          </button>

          <button
            onClick={() => addBonusBronze(student)}
            className="bg-emerald-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
          >
            보너스 +동
          </button>

          <button
            onClick={() => removeBronze(student)}
            className="bg-orange-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
          >
            동회수
          </button>

          <button
            onClick={() => useSilver(student)}
            className="bg-pink-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
          >
            은사용
          </button>
        </div>

        <div className="text-[11px] text-gray-500 mt-2 leading-snug">
          동엽전이 10개가 되면 은엽전 1개로 자동 교환됩니다.
        </div>
      </div>

      {/* 관리 버튼 */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        <button
          onClick={() => toggleStudentVisible(student)}
          className="bg-gray-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
        >
          숨기기
        </button>

        <button
          onClick={() =>
            router.push(
              `/teacher/student-preview/${student.id}`
            )
          }
          className="bg-sky-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
        >
          👀 학생화면
        </button>

        <button
          onClick={() => openEditModal(student)}
          className="bg-blue-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
        >
          수정
        </button>

        <button
          onClick={() => deleteStudent(student)}
          className="bg-red-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

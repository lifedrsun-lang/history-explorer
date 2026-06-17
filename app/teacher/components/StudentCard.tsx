"use client";

import { STAGE_DATA } from "@/app/student/data/stageData";

export default function StudentCard({
  student,
  addQuizBronze,
  addHomeworkBronze,
  addBonusBronze,
  useSilver,
  changeStage,
  toggleStudentVisible,
  deleteStudent,
  openEditModal,
}: any) {
  const stage = STAGE_DATA.find(
    (item) => item.id === Number(student.stage)
  );

  const coinHistoryCount = Array.isArray(student?.coinHistory)
    ? student.coinHistory.length
    : 0;

  return (
    <div className="bg-white rounded-[30px] p-4 shadow-md">
      {/* 이름 */}
      <div className="text-3xl font-bold">
        {student.name}
      </div>

      {/* 학교 */}
      <div className="text-gray-500">
        {student.school}
      </div>

      {/* 학년 / 반 / 번호 */}
      <div className="text-gray-500 mb-3">
        {student.grade}학년 {student.class}반 / {student.studentNumber}번
      </div>

      {/* 비밀번호 */}
      <div className="bg-blue-50 rounded-2xl p-3 mb-3">
        🔑 비밀번호:
        <span className="font-bold text-blue-600">
          {" "}
          {student.password}
        </span>
      </div>

      {/* 코인 현황 */}
      <div className="bg-yellow-50 rounded-2xl p-3 mb-3">
        <div className="font-bold text-yellow-700">
          🟡 동엽전: {student.bronze ?? 0}개
        </div>

        <div className="font-bold text-purple-700 mt-1">
          ⚪ 은엽전: {student.silver ?? 0}개
        </div>

        <div className="font-bold text-green-700 mt-1">
          📈 누적 동엽전: {student.totalBronze ?? 0}개
        </div>

        <div className="font-bold text-indigo-700 mt-1">
          🪙 코인 기록: {coinHistoryCount}개
        </div>
      </div>

      {/* 진도 */}
      <div className="bg-gray-100 rounded-2xl p-4 mb-3">
        <div className="text-gray-400">
          현재 진도
        </div>

        <div className="text-gray-500">
          {stage?.short || "-"}
        </div>

        <div className="text-yellow-600 font-bold text-2xl">
          {stage?.title || "진도 없음"}
        </div>
      </div>

      {/* 진도 버튼 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => changeStage(student, -1)}
          className="bg-indigo-500 text-white rounded-xl py-2 text-sm font-bold"
        >
          ◀ 이전
        </button>

        <button
          onClick={() => changeStage(student, 1)}
          className="bg-green-500 text-white rounded-xl py-2 text-sm font-bold"
        >
          다음 ▶
        </button>
      </div>

      {/* 코인 지급 / 사용 */}
      <div className="bg-orange-50 rounded-2xl p-3 mb-3">
        <div className="font-bold text-orange-700 mb-2">
          🪙 코인 지급 / 사용
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => addQuizBronze(student)}
            className="bg-yellow-500 text-white rounded-xl py-2 font-bold"
          >
            퀴즈 +동
          </button>

          <button
            onClick={() => addHomeworkBronze(student)}
            className="bg-amber-600 text-white rounded-xl py-2 font-bold"
          >
            과제 +동
          </button>

          <button
            onClick={() => addBonusBronze(student)}
            className="bg-emerald-500 text-white rounded-xl py-2 font-bold"
          >
            보너스 +동
          </button>

          <button
            onClick={() => useSilver(student)}
            className="bg-pink-500 text-white rounded-xl py-2 font-bold"
          >
            은사용
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-2 leading-relaxed">
          동엽전이 10개가 되면 은엽전 1개로 자동 교환됩니다.
        </div>
      </div>

      {/* 관리 버튼 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => toggleStudentVisible(student)}
          className="bg-gray-500 text-white rounded-xl py-2 font-bold"
        >
          숨기기
        </button>

        <button
          onClick={() => openEditModal(student)}
          className="bg-blue-500 text-white rounded-xl py-2 font-bold"
        >
          수정
        </button>

        <button
          onClick={() => deleteStudent(student)}
          className="col-span-2 bg-red-500 text-white rounded-xl py-2 font-bold"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
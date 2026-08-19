"use client";

import { getStageInfo } from "@/app/student/data/stageData";
import { db } from "@/lib/firebase";
import { getStudentProgramLabel } from "@/lib/programs";
import { formatEnrollmentTerm, getEnrollmentTerms } from "@/lib/studentEnrollment";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentActivityBadges from "./StudentActivityBadges";
import TeacherTopRankBadge from "./TeacherTopRankBadge";

export default function StudentCard({
  student,
  addQuizBronze,
  addHomeworkBronze,
  addMakingBronze,
  addBonusBronze,
  removeBronze,
  useSilver,
  addMaterialRecord,
  toggleStudentVisible,
  deleteStudent,
  openEditModal,
}: any) {
  const router = useRouter();
  const stage = getStageInfo(student?.stage).current;
  const enrollmentTerms = getEnrollmentTerms(student);
  const [materialHistory, setMaterialHistory] = useState<any[]>(
    Array.isArray(student?.materialHistory) ? student.materialHistory : []
  );

  useEffect(() => {
    setMaterialHistory(
      Array.isArray(student?.materialHistory) ? student.materialHistory : []
    );
  }, [student?.materialHistory]);

  const hasCurrentMaterial = materialHistory.some(
    (item: any) => String(item?.stageId || "") === String(student?.stage || "")
  );
  const programLabel = getStudentProgramLabel(student?.program);
  const hasPendingCoinExchange = Boolean(
    String(student?.pendingCoinExchangeRequestId || "").trim()
  );

  const undoCurrentMaterial = async () => {
    const currentStageId = String(student?.stage || "");
    let targetIndex = -1;

    for (let index = materialHistory.length - 1; index >= 0; index -= 1) {
      if (String(materialHistory[index]?.stageId || "") === currentStageId) {
        targetIndex = index;
        break;
      }
    }

    if (targetIndex < 0) {
      return;
    }

    const shouldUndo = window.confirm("현재 교재 지급을 취소할까요?");

    if (!shouldUndo) {
      return;
    }

    const nextHistory = materialHistory.filter((_, index) => index !== targetIndex);

    await updateDoc(doc(db, "students", student.id), {
      materialHistory: nextHistory,
    });

    setMaterialHistory(nextHistory);
  };

  const handleMaterialClick = async () => {
    if (hasCurrentMaterial) {
      await undoCurrentMaterial();
      return;
    }

    await addMaterialRecord(student);
  };

  return (
    <div
      data-teacher-student-card="true"
      data-student-id={String(student?.id || "")}
      data-student-name={String(student?.name || "")}
      data-coin-rank="999"
      className="w-full min-w-0 bg-white rounded-[24px] p-3 sm:rounded-[30px] sm:p-4 shadow-md"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="min-w-0 truncate text-xl font-bold sm:text-3xl">{student.name}</div>
        <TeacherTopRankBadge student={student} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleMaterialClick}
          title={hasCurrentMaterial ? "현재 교재 지급 취소하기" : "현재 교재 지급하기"}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black transition ${
            hasCurrentMaterial
              ? "bg-indigo-100 text-indigo-700 hover:bg-rose-50 hover:text-rose-600"
              : "bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500"
          }`}
        >
          <span className={hasCurrentMaterial ? "opacity-100" : "opacity-30"}>📘</span>
          <span>{hasCurrentMaterial ? "교재 지급완료" : "교재 미지급"}</span>
        </button>

        <StudentActivityBadges student={student} />

        <button
          type="button"
          disabled={!hasPendingCoinExchange}
          onClick={() => router.push("/teacher/coin-exchanges")}
          title={
            hasPendingCoinExchange
              ? "이 학생의 코인교환 신청 확인"
              : "대기 중인 코인교환 신청이 없습니다."
          }
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black transition ${
            hasPendingCoinExchange
              ? "cursor-pointer bg-fuchsia-100 text-fuchsia-700 ring-2 ring-fuchsia-200 hover:scale-[1.03]"
              : "cursor-default bg-slate-100 text-slate-400"
          }`}
        >
          <span className={hasPendingCoinExchange ? "opacity-100" : "opacity-30"}>🎁</span>
          <span>{hasPendingCoinExchange ? "코인교환 1" : "코인교환 없음"}</span>
        </button>

        {enrollmentTerms.map((term) => (
          <span
            key={term}
            className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700"
          >
            {formatEnrollmentTerm(term)}
          </span>
        ))}
      </div>

      <div className="mt-2 mb-2 inline-flex max-w-full rounded-full bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">
        <span className="truncate">프로그램: {programLabel}</span>
      </div>

      <div className="text-sm text-gray-500 truncate">{student.school}</div>
      <div className="text-sm text-gray-500 mb-2 truncate">
        {student.grade}학년 {student.class}반 / {student.studentNumber}번
      </div>

      <div className="bg-blue-50 rounded-2xl p-2 sm:p-3 mb-2 text-sm truncate">
        🔑 비밀번호: <span className="font-bold text-blue-600">{student.password}</span>
      </div>

      <div className="bg-yellow-50 rounded-2xl p-2 sm:p-3 mb-2 text-xs sm:text-sm">
        <div className="font-bold text-yellow-700 truncate">🟡 동엽전: {student.bronze ?? 0}개</div>
        <div className="font-bold text-purple-700 mt-1 truncate">⚪ 은엽전: {student.silver ?? 0}개</div>
        <div className="font-bold text-green-700 mt-1 truncate">📈 누적 동엽전: {student.totalBronze ?? 0}개</div>
      </div>

      <div className="bg-gray-100 rounded-2xl p-2 sm:p-3 mb-2">
        <div className="text-xs text-gray-400">현재 진도</div>
        <div className="text-xs text-gray-500 truncate">{stage?.short || "별꼼역사 1권"}</div>
        <div className="text-yellow-600 font-bold text-base sm:text-2xl truncate">{stage?.title || "진도 없음"}</div>
      </div>

      <div className="bg-orange-50 rounded-2xl p-2 sm:p-3 mb-2">
        <div className="font-bold text-orange-700 mb-2 text-sm">🪙 코인 지급 / 사용</div>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button onClick={() => addQuizBronze(student)} className="bg-yellow-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">퀴즈 +동</button>
          <button onClick={() => addHomeworkBronze(student)} className="bg-amber-600 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">과제 +동</button>
          <button onClick={() => addMakingBronze(student)} className="bg-sky-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">만들기 +동</button>
          <button onClick={() => addBonusBronze(student)} className="bg-emerald-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">보너스 +동</button>
          <button onClick={() => removeBronze(student)} className="bg-orange-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">동회수</button>
          <button onClick={() => useSilver(student)} className="bg-pink-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">은사용</button>
        </div>
        <div className="text-[11px] text-gray-500 mt-2 leading-snug">동엽전이 10개가 되면 은엽전 1개로 자동 교환됩니다.</div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        <button onClick={() => toggleStudentVisible(student)} className="bg-amber-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">쉬는중</button>
        <button onClick={() => router.push(`/teacher/student-preview/${student.id}`)} className="bg-sky-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">👀 학생화면</button>
        <button onClick={() => openEditModal(student)} className="bg-blue-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">수정</button>
        <button onClick={() => deleteStudent(student)} className="bg-red-500 text-white rounded-xl py-2 px-1 text-[11px] sm:text-sm font-bold whitespace-nowrap">삭제</button>
      </div>
    </div>
  );
}

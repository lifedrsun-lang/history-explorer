"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import { getStudentProgramValue } from "@/lib/programs";
import {
  FEE_CLASS_FILTER_OPTIONS,
  FeeClassFilter,
  formatWon,
  getTeacherFeeContract,
  TeacherFeeContract,
  TeachingClass,
} from "@/lib/teacherFees";

type FeeRow = TeacherFeeContract & {
  studentCount: number;
  subtotal: number;
};

const getGradeNumber = (value: unknown) => {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const getTeachingClass = (student: any): TeachingClass | null => {
  const grade = getGradeNumber(student?.grade);

  if (grade >= 1 && grade <= 2) {
    return "A반";
  }

  if (grade >= 3 && grade <= 6) {
    return "B반";
  }

  return null;
};

export default function TeacherFeePanel() {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("전체학교");
  const [selectedClass, setSelectedClass] =
    useState<FeeClassFilter>("전체반");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthorized(Boolean(user));

      if (!user) {
        setIsOpen(false);
        setStudents([]);
      }
    });

    return unsubscribe;
  }, []);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const snapshot = await getDocs(collection(db, "students"));
      setStudents(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );
    } catch {
      setLoadError("학생 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openPanel = async () => {
    setIsOpen(true);
    await loadStudents();
  };

  const allFeeRows = useMemo(() => {
    const rowMap = new Map<string, FeeRow>();

    for (const student of students) {
      if (student?.isActive === false) {
        continue;
      }

      if (getStudentProgramValue(student?.program) === "boardgame") {
        continue;
      }

      const teachingClass = getTeachingClass(student);

      if (!teachingClass) {
        continue;
      }

      const contract = getTeacherFeeContract(
        student?.school,
        teachingClass
      );

      if (!contract) {
        continue;
      }

      const key = `${contract.schoolName}::${contract.teachingClass}`;
      const current = rowMap.get(key);
      const nextStudentCount = (current?.studentCount || 0) + 1;

      rowMap.set(key, {
        ...contract,
        studentCount: nextStudentCount,
        subtotal: nextStudentCount * contract.ratePerStudent,
      });
    }

    return Array.from(rowMap.values()).sort((a, b) => {
      if (a.schoolName !== b.schoolName) {
        return a.schoolName.localeCompare(b.schoolName, "ko-KR");
      }

      return a.teachingClass.localeCompare(b.teachingClass, "ko-KR");
    });
  }, [students]);

  const schoolOptions = useMemo(
    () => [
      "전체학교",
      ...Array.from(
        new Set(allFeeRows.map((row) => row.schoolName))
      ),
    ],
    [allFeeRows]
  );

  useEffect(() => {
    if (
      selectedSchool !== "전체학교" &&
      !schoolOptions.includes(selectedSchool)
    ) {
      setSelectedSchool("전체학교");
    }
  }, [schoolOptions, selectedSchool]);

  const visibleRows = useMemo(
    () =>
      allFeeRows.filter((row) => {
        if (
          selectedSchool !== "전체학교" &&
          row.schoolName !== selectedSchool
        ) {
          return false;
        }

        if (
          selectedClass !== "전체반" &&
          row.teachingClass !== selectedClass
        ) {
          return false;
        }

        return true;
      }),
    [allFeeRows, selectedClass, selectedSchool]
  );

  const totalStudentCount = visibleRows.reduce(
    (sum, row) => sum + row.studentCount,
    0
  );
  const totalFee = visibleRows.reduce(
    (sum, row) => sum + row.subtotal,
    0
  );

  if (pathname !== "/teacher" || !authorized) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-5 right-5 z-[75] rounded-full border border-emerald-200 bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-2xl transition hover:bg-emerald-700"
      >
        💰 예상 강사료
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-3">
          <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-[#f5f7fb] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm">
              <div>
                <div className="text-2xl font-black text-slate-900">
                  💰 월 예상 강사료
                </div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  정규 방과후 · 학생 1인당 계약단가 기준 · 공제 전
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600"
              >
                닫기
              </button>
            </div>

            <div className="mt-3 rounded-3xl bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-600">
                  학교
                  <select
                    value={selectedSchool}
                    onChange={(event) =>
                      setSelectedSchool(event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                  >
                    {schoolOptions.map((schoolName) => (
                      <option key={schoolName} value={schoolName}>
                        {schoolName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-black text-slate-600">
                  반
                  <select
                    value={selectedClass}
                    onChange={(event) =>
                      setSelectedClass(
                        event.target.value as FeeClassFilter
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                  >
                    {FEE_CLASS_FILTER_OPTIONS.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-3xl bg-emerald-50 p-5 text-center">
                <div className="text-xs font-black text-emerald-700">
                  {selectedSchool === "전체학교"
                    ? "전체 학교"
                    : selectedSchool}
                  {" · "}
                  {selectedClass}
                </div>
                <div className="mt-1 text-4xl font-black tracking-tight text-emerald-700">
                  {formatWon(totalFee)}
                </div>
                <div className="mt-2 text-sm font-bold text-slate-600">
                  계산 대상 {totalStudentCount}명
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold leading-relaxed text-slate-500">
                  활성 학생만 집계하며, 숨김 학생·보드게임·단가 미등록 학교는 제외합니다.
                </div>

                <button
                  type="button"
                  onClick={loadStudents}
                  disabled={isLoading}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50"
                >
                  {isLoading ? "불러오는 중..." : "↻ 새로고침"}
                </button>
              </div>

              {loadError && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  {loadError}
                </div>
              )}
            </div>

            <div className="mt-3 rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-black text-slate-800">
                학교·반별 계산 내역
              </div>

              {isLoading && students.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
                  학생 정보를 불러오는 중입니다.
                </div>
              ) : visibleRows.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
                  선택한 조건에서 계산할 방과후 강사료가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleRows.map((row) => (
                    <div
                      key={`${row.schoolName}-${row.teachingClass}`}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-slate-800">
                            {row.schoolName} · {row.teachingClass}
                          </div>
                          <div className="mt-0.5 text-xs font-bold text-slate-500">
                            {row.classLabel}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-black text-slate-900">
                            {formatWon(row.subtotal)}
                          </div>
                          <div className="text-xs font-bold text-slate-500">
                            {row.studentCount}명 × {formatWon(row.ratePerStudent)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-800">
              현재 등록 단가: 하늘빛초 A반 18,000원 · B반 22,411원 / 새솔초 21,520원 / 사우초 22,000원. 세금·산재보험·고용보험 등 공제액과 월별 수업횟수 조정은 아직 자동 계산하지 않습니다.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

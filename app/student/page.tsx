"use client";

import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import { useEffect, useState } from "react";

import SchoolSelect from "./components/SchoolSelect";
import StudentProfile from "./components/StudentProfile";
import RankingCard from "./components/RankingCard";
import SearchDropdown from "./components/SearchDropdown";
import LoadingSpinner from "./components/LoadingSpinner";

import { getStageInfo } from "./data/stageData";

export default function StudentExplorerPage() {

  const [students, setStudents] = useState<any[]>([]);
  const [allSchools, setAllSchools] = useState<string[]>([]);
  const [searchName, setSearchName] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [loading, setLoading] = useState(false);

  // 선택 학생
  const [selectedStudent, setSelectedStudent] =
    useState<any>(null);

  // 숨김 여부 체크
  const isHiddenStudent = (data: any) => {

    const hiddenValue =
      String(data.hidden)
        .trim()
        .toLowerCase();

    return (
      hiddenValue === "true" ||
      hiddenValue === "1" ||
      hiddenValue === "yes" ||
      hiddenValue === "hidden" ||
      hiddenValue === "숨김"
    );

  };

  // 학교 목록
  const fetchSchools = async () => {

    const snapshot = await getDocs(
      collection(db, "students")
    );

    const schoolSet = new Set<string>();

    snapshot.forEach((docItem) => {

      const data = docItem.data();

      if (isHiddenStudent(data)) {
        return;
      }

      if (data.school) {
        schoolSet.add(data.school);
      }

    });

    setAllSchools(Array.from(schoolSet));
  };

  // 학생 불러오기
  const fetchStudentsBySchool = async (
    school: string
  ) => {

    setLoading(true);

    const q = query(
      collection(db, "students"),
      where("school", "==", school)
    );

    const snapshot = await getDocs(q);

    const list: any[] = [];

    snapshot.forEach((docItem) => {

      const data = docItem.data();

      // 숨김 학생 제외
      if (isHiddenStudent(data)) {
        return;
      }

      list.push({
        id: docItem.id,
        ...data,
      });

    });

    setStudents(list);

    setLoading(false);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {

    if (selectedSchool) {

      fetchStudentsBySchool(selectedSchool);

    } else {

      setStudents([]);
      setSearchName("");
      setSelectedStudent(null);

    }

  }, [selectedSchool]);

  // 캐릭터 변경
  const changeCharacter = async (
    studentId: string,
    type: string
  ) => {

    const ref = doc(db, "students", studentId);

    await updateDoc(ref, {
      character: type,
    });

    fetchStudentsBySchool(selectedSchool);
  };

  // 점수 계산
  const getScore = (s: any) =>
    (s.silver || 0) * 10 + (s.bronze || 0);

  // 업적
  const getAchievements = (s: any) => {

    const arr = [];

    if ((s.stage || 0) >= 4)
      arr.push("🌾 고조선 탐험가");

    if ((s.stage || 0) >= 8)
      arr.push("👑 고조선 개척자");

    if ((s.stage || 0) >= 12)
      arr.push("⚔️ 고구려 탐험가");

    return arr;
  };

  // 검색 결과
  const filteredStudents =
    searchName.trim() === ""
      ? []
      : students.filter((s) => {

          if (isHiddenStudent(s)) {
            return false;
          }

          return s.name?.includes(
            searchName.trim()
          );

        });

  // 랭킹
  const moonRanking = students
    .filter((s) => !isHiddenStudent(s))
    .filter((s) => Number(s.grade) <= 2)
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 3);

  const starRanking = students
    .filter((s) => !isHiddenStudent(s))
    .filter((s) => Number(s.grade) >= 3)
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 3);

  // 학교 선택 전
  if (!selectedSchool) {

    return (
      <SchoolSelect
        schools={allSchools}
        onSelect={setSelectedSchool}
      />
    );
  }

  // 로딩
  if (loading) {
    return <LoadingSpinner />;
  }

  return (

    <div className="min-h-screen bg-black text-white px-3 py-4">

      <div className="max-w-xl mx-auto space-y-4">

        {/* 헤더 */}
        <div className="rounded-[28px] border border-[#333] bg-[#050505] px-4 py-4">

          <div className="flex items-center justify-between gap-3">

            <div className="min-w-0">

              <div className="flex items-center gap-2">

                <div className="text-3xl">
                  🧭
                </div>

                <div className="text-2xl font-bold truncate">

                  역사 탐험가

                </div>

              </div>

              <div className="text-sm text-gray-400 mt-1 truncate">

                {selectedSchool}

              </div>

            </div>

            <button
              onClick={() =>
                setSelectedSchool("")
              }
              className="bg-[#111] border border-[#333] px-3 py-2 rounded-2xl text-xs shrink-0 active:scale-95 transition"
            >
              학교 변경
            </button>

          </div>

        </div>

        {/* 검색 전 */}
        {!selectedStudent && (

          <>

            {/* 검색 */}
            <div className="bg-[#050505] border border-[#333] p-4 rounded-[28px]">

              <div className="text-xl font-bold mb-3">

                🔍 학생 검색

              </div>

              <SearchDropdown
                students={filteredStudents}
                searchName={searchName}
                setSearchName={setSearchName}
                setSelectedStudent={
                  setSelectedStudent
                }
              />

              {/* 결과 없음 */}
              {searchName.trim() !== "" &&
                filteredStudents.length === 0 && (

                  <div className="mt-3 text-sm text-gray-500">

                    🔍 탐험가를 찾을 수 없습니다

                  </div>

                )}

            </div>

            {/* 랭킹 */}
            <RankingCard
              title="달 탐험대"
              icon="🌙"
              students={moonRanking}
              getScore={getScore}
              bgColor="bg-[#15154b]"
              borderColor="border-[#444]"
            />

            <RankingCard
              title="별 탐험대"
              icon="⭐"
              students={starRanking}
              getScore={getScore}
              bgColor="bg-[#3a2800]"
              borderColor="border-[#5a3d00]"
            />

          </>

        )}

        {/* 프로필 */}
        {selectedStudent && (

          <>

            <StudentProfile
              student={selectedStudent}

              {/* 🔥 전체 stage 번호 그대로 전달 */}
              currentStage={
                selectedStudent.stage || 1
              }

              stageInfo={
                getStageInfo(
                  selectedStudent.stage || 1
                )
              }

              achievements={
                getAchievements(selectedStudent)
              }

              changeCharacter={changeCharacter}
            />

            {/* 다시 검색 */}
            <button
              onClick={() => {

                setSearchName("");
                setSelectedStudent(null);

              }}
              className="w-full bg-[#111] border border-[#333] rounded-[24px] p-4 text-sm active:scale-95 transition"
            >
              🔍 다른 탐험가 찾기
            </button>

          </>

        )}

      </div>

    </div>

  );
}
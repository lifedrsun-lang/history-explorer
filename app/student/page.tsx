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
import AdminPanel from "./components/AdminPanel";

import { getStageInfo } from "./data/stageData";

export default function StudentExplorerPage() {

  const [students, setStudents] = useState<any[]>([]);
  const [allSchools, setAllSchools] = useState<string[]>([]);
  const [searchName, setSearchName] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 학교 목록 불러오기
  const fetchSchools = async () => {

    const snapshot = await getDocs(collection(db, "students"));

    const schoolSet = new Set<string>();

    snapshot.forEach((docItem) => {
      const data = docItem.data();
      if (data.school) schoolSet.add(data.school);
    });

    setAllSchools(Array.from(schoolSet));
  };

  // 학교별 학생 불러오기
  const fetchStudentsBySchool = async (school: string) => {

    setLoading(true);

    const q = query(
      collection(db, "students"),
      where("school", "==", school)
    );

    const snapshot = await getDocs(q);

    const list: any[] = [];

    snapshot.forEach((docItem) => {
      list.push({
        id: docItem.id,
        ...docItem.data(),
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
      setStudents([]); // 🔥 핵심: 학교 없으면 무조건 초기화
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

  const getScore = (s: any) =>
    (s.silver || 0) * 10 + (s.bronze || 0);

  const getAchievements = (s: any) => {

    const arr = [];

    if ((s.stage || 0) >= 4) arr.push("🌾 고조선 탐험가");
    if ((s.stage || 0) >= 8) arr.push("👑 고조선 개척자");
    if ((s.stage || 0) >= 12) arr.push("⚔️ 고구려 탐험가");

    return arr;
  };

  // 학교 선택 전 → 무조건 차단
  if (!selectedSchool) {

    return (
      <SchoolSelect
        schools={allSchools}
        onSelect={setSelectedSchool}
      />
    );
  }

  // 로딩 화면
  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredStudents =
    searchName.trim() === ""
      ? students.slice(0, 1)
      : students.filter((s) =>
          s.name?.trim().includes(searchName.trim())
        );

  const moonRanking = students
    .filter((s) => Number(s.grade) <= 2)
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 3);

  const starRanking = students
    .filter((s) => Number(s.grade) >= 3)
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 3);

  return (

    <div className="min-h-screen bg-black text-white p-4">

      <div className="max-w-[1800px] mx-auto space-y-5">

        {/* 상단 */}
        <div className="rounded-[30px] border border-[#333] bg-[#050505] p-6">

          <div className="flex justify-between items-center">

            <div>
              <div className="text-4xl font-bold">
                🧭 역사 탐험가
              </div>
              <div className="text-gray-400">
                {selectedSchool}
              </div>
            </div>

            <button
              onClick={() => setSelectedSchool("")}
              className="bg-[#111] px-4 py-2 rounded-xl"
            >
              학교 변경
            </button>

          </div>

        </div>

        {/* 검색 + 랭킹 */}
        <div className="grid lg:grid-cols-[1.3fr_1fr_1fr] gap-5">

          <div className="bg-[#050505] border border-[#333] p-5 rounded-2xl">

            <div className="text-xl font-bold mb-3">
              🔍 학생 검색
            </div>

            <SearchDropdown
              students={students}
              searchName={searchName}
              setSearchName={setSearchName}
            />

          </div>

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

        </div>

        {/* 🔥 핵심: 학생 목록 완전 차단 */}
        {selectedSchool &&
          filteredStudents.length > 0 &&
          filteredStudents.map((student) => {

            const stageInfo = getStageInfo(student.stage || 0);

            const currentStage =
              ((student.stage || 0) - 1) % 4 + 1;

            const achievements =
              getAchievements(student);

            return (
              <StudentProfile
                key={student.id}
                student={student}
                currentStage={currentStage}
                stageInfo={stageInfo}
                achievements={achievements}
                changeCharacter={changeCharacter}
              />
            );
          })}

      </div>

      {/* 관리자 패널 */}
      {isAdmin && selectedStudent && (
        <AdminPanel
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          refresh={() =>
            fetchStudentsBySchool(selectedSchool)
          }
        />
      )}

    </div>
  );
}
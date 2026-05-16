"use client";

import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

import { useEffect, useState } from "react";

import SchoolSelect from "./components/SchoolSelect";
import StudentProfile from "./components/StudentProfile";

export default function StudentExplorerPage() {

  const [students, setStudents] =
    useState<any[]>([]);

  const [searchName, setSearchName] =
    useState("");

  const [selectedSchool, setSelectedSchool] =
    useState("");

  // 학생 불러오기

  const fetchStudents = async () => {

    const querySnapshot =
      await getDocs(
        collection(db, "students")
      );

    const studentList: any[] = [];

    querySnapshot.forEach((docItem) => {

      studentList.push({
        id: docItem.id,
        ...docItem.data(),
      });

    });

    setStudents(studentList);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // 캐릭터 변경

  const changeCharacter = async (
    studentId: string,
    characterType: string
  ) => {

    const studentRef = doc(
      db,
      "students",
      studentId
    );

    await updateDoc(studentRef, {
      character: characterType,
    });

    fetchStudents();
  };

  // 점수 계산

  const getScore = (student: any) => {

    return (
      (student.silver || 0) * 10 +
      (student.bronze || 0)
    );
  };

  // 업적

  const getAchievements = (
    student: any
  ) => {

    const achievements = [];

    if ((student.stage || 0) >= 4) {
      achievements.push(
        "🌾 고조선 탐험가"
      );
    }

    if ((student.stage || 0) >= 8) {
      achievements.push(
        "👑 고조선 개척자"
      );
    }

    if ((student.stage || 0) >= 12) {
      achievements.push(
        "⚔️ 고구려 탐험가"
      );
    }

    return achievements;
  };

  // 탐험 단계

  const getStageInfo = (
    stage: number
  ) => {

    if (stage <= 4) {

      return {

        title: "고조선 2 탐험",

        stages: [

          {
            emoji: "🌱",
            name: "고조선2-1",
          },

          {
            emoji: "⚔️",
            name: "고조선2-2",
          },

          {
            emoji: "📜",
            name: "고조선2-3",
          },

          {
            emoji: "👑",
            name: "고조선2-4",
          },

        ],

      };
    }

    return {

      title: "고구려 1 탐험",

      stages: [

        {
          emoji: "🐎",
          name: "고구려1-1",
        },

        {
          emoji: "🏹",
          name: "고구려1-2",
        },

        {
          emoji: "🛡️",
          name: "고구려1-3",
        },

        {
          emoji: "👑",
          name: "고구려1-4",
        },

      ],

    };
  };

  // 학교 목록

  const schoolList = [
    ...new Set(
      students
        .map((student) => student.school)
        .filter(Boolean)
    ),
  ];

  // 검색

  const filteredStudents =
    searchName === ""
      ? students
          .filter(
            (student) =>
              student.school ===
                selectedSchool &&
              student.isActive !== false
          )
          .slice(0, 1)
      : students.filter(
          (student) =>
            student.isActive !== false &&
            student.school ===
              selectedSchool &&
            student.name
              ?.trim()
              .includes(
                searchName.trim()
              )
        );

  // 학교 학생

  const schoolStudents =
    students.filter(
      (student) =>
        student.school ===
          selectedSchool &&
        student.isActive !== false
    );

  // 달 탐험대

  const moonRanking =
    schoolStudents
      .filter(
        (student) =>
          Number(student.grade) <= 2
      )
      .sort(
        (a, b) =>
          getScore(b) - getScore(a)
      )
      .slice(0, 3);

  // 별 탐험대

  const starRanking =
    schoolStudents
      .filter(
        (student) =>
          Number(student.grade) >= 3
      )
      .sort(
        (a, b) =>
          getScore(b) - getScore(a)
      )
      .slice(0, 3);

  // 학교 선택 화면

  if (!selectedSchool) {

    return (

      <SchoolSelect
        schools={schoolList}
        onSelect={setSelectedSchool}
      />

    );
  }

  return (

    <div className="min-h-screen bg-black text-white p-4">

      <div className="max-w-[1800px] mx-auto space-y-5">

        {/* 상단 */}

        <div className="rounded-[30px] border border-[#333] bg-[#050505] p-6 shadow-xl">

          <div className="flex items-center justify-between gap-6 flex-wrap">

            <div className="flex items-center gap-5">

              <div className="text-6xl">
                🧭
              </div>

              <div>

                <h1 className="text-4xl lg:text-5xl font-bold mb-2">

                  역사 탐험가

                </h1>

                <p className="text-lg text-gray-300">

                  {selectedSchool}

                </p>

              </div>

            </div>

            <button
              onClick={() =>
                setSelectedSchool("")
              }
              className="bg-[#111] hover:bg-[#1a1a1a] border border-[#333] rounded-2xl px-5 py-3 text-lg transition"
            >

              🏫 학교 변경

            </button>

          </div>

        </div>

        {/* 검색 + 랭킹 */}

        <div className="grid lg:grid-cols-[1.3fr_1fr_1fr] gap-5">

          {/* 검색 */}

          <div className="rounded-[30px] border border-[#333] bg-[#050505] p-5">

            <div className="text-2xl font-bold mb-6">

              🔎 탐험가 찾기

            </div>

            <div className="flex gap-4">

              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={searchName}
                onChange={(e) =>
                  setSearchName(
                    e.target.value
                  )
                }
                className="flex-1 bg-[#0d0d0d] border border-[#444] rounded-2xl px-5 py-3 text-xl text-white outline-none"
              />

            </div>

          </div>

          {/* 달 랭킹 */}

          <div className="rounded-[30px] border border-[#444] bg-[#15154b] p-5">

            <div className="text-2xl font-bold mb-5">

              🌙 달 탐험대 TOP3

            </div>

            <div className="space-y-4">

              {moonRanking.map(
                (student, index) => (

                  <div
                    key={student.id}
                    className="flex justify-between text-lg"
                  >

                    <div>

                      {index === 0 &&
                        "🥇 "}

                      {index === 1 &&
                        "🥈 "}

                      {index === 2 &&
                        "🥉 "}

                      {student.name}

                    </div>

                    <div>

                      {getScore(student)}점

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

          {/* 별 랭킹 */}

          <div className="rounded-[30px] border border-[#5a3d00] bg-[#3a2800] p-5">

            <div className="text-2xl font-bold mb-5">

              ⭐ 별 탐험대 TOP3

            </div>

            <div className="space-y-4">

              {starRanking.map(
                (student, index) => (

                  <div
                    key={student.id}
                    className="flex justify-between text-lg"
                  >

                    <div>

                      {index === 0 &&
                        "🥇 "}

                      {index === 1 &&
                        "🥈 "}

                      {index === 2 &&
                        "🥉 "}

                      {student.name}

                    </div>

                    <div>

                      {getScore(student)}점

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        </div>

        {/* 학생 */}

        {filteredStudents.map(
          (student) => {

            const stageInfo =
              getStageInfo(
                student.stage || 0
              );

            const currentStage =
              ((student.stage || 0) -
                1) %
                4 +
              1;

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
          }
        )}

      </div>

    </div>

  );
}
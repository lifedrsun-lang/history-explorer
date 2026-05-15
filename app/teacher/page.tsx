"use client";

import { db } from "@/lib/firebase";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { useEffect, useState } from "react";

import {
  STAGE_DATA,
  getStageInfo,
} from "@/app/student/data/stageData";


export default function TeacherPage() {

  const [students, setStudents] =
    useState<any[]>([]);

  const [school, setSchool] =
    useState("");

  const [grade, setGrade] =
    useState("");

  const [studentClass, setStudentClass] =
    useState("");

  const [name, setName] =
    useState("");

  // 시작 진도 선택
  const [selectedStage, setSelectedStage] =
    useState(1);

  const [selectedSchool, setSelectedSchool] =
    useState("전체학교");

  const [selectedTab, setSelectedTab] =
    useState("A반");

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

  // 학생 등록
  const saveStudent = async () => {

    if (
      !grade ||
      !studentClass ||
      !name
    ) {

      alert(
        "학년 / 반 / 이름을 입력해주세요!"
      );

      return;
    }

    await addDoc(
      collection(db, "students"),
      {

        school:
          school || "미지정",

        grade,
        class: studentClass,
        name,

        bronze: 0,
        silver: 0,

        totalBronze: 0,
        totalSilver: 0,

        // 시작 진도
        stage: selectedStage,

        isActive: true,

      }
    );

    setSchool("");
    setGrade("");
    setStudentClass("");
    setName("");

    setSelectedStage(1);

    fetchStudents();

  };

  // 동엽전 추가
  const addBronze = async (
    student: any
  ) => {

    let newBronze =
      (student.bronze || 0) + 1;

    let newSilver =
      student.silver || 0;

    let totalBronze =
      (student.totalBronze || 0) + 1;

    let totalSilver =
      student.totalSilver || 0;

    // 자동 환전
    if (newBronze >= 10) {

      newBronze = 0;

      newSilver += 1;

      totalSilver += 1;

    }

    await updateDoc(
      doc(
        db,
        "students",
        student.id
      ),
      {

        bronze: newBronze,
        silver: newSilver,

        totalBronze,
        totalSilver,

      }
    );

    fetchStudents();

  };

  // 반 전체 동엽전 지급
  const giveBronzeToClass =
    async () => {

      const filtered =
        activeStudents;

      for (const student of filtered) {

        let newBronze =
          (student.bronze || 0) + 1;

        let newSilver =
          student.silver || 0;

        let totalBronze =
          (student.totalBronze || 0) + 1;

        let totalSilver =
          student.totalSilver || 0;

        // 자동 환전
        if (newBronze >= 10) {

          newBronze = 0;

          newSilver += 1;

          totalSilver += 1;

        }

        await updateDoc(
          doc(
            db,
            "students",
            student.id
          ),
          {

            bronze: newBronze,
            silver: newSilver,

            totalBronze,
            totalSilver,

          }
        );

      }

      fetchStudents();

    };

  // 은엽전 사용
  const useSilver = async (
    student: any
  ) => {

    if (
      (student.silver || 0) <= 0
    ) {

      alert(
        "은엽전이 부족합니다!"
      );

      return;
    }

    await updateDoc(
      doc(
        db,
        "students",
        student.id
      ),
      {

        silver:
          (student.silver || 0) - 1,

      }
    );

    fetchStudents();

  };

  // 진도 변경
  const changeStage = async (
    student: any,
    direction: number
  ) => {

    let newStage =
      (student.stage || 1) +
      direction;

    // 최소 제한
    if (newStage < 1) {
      newStage = 1;
    }

    // 최대 제한
    if (
      newStage >
      STAGE_DATA.length
    ) {

      newStage =
      STAGE_DATA.length;

    }

    await updateDoc(
      doc(
        db,
        "students",
        student.id
      ),
      {

        stage: newStage,

      }
    );

    fetchStudents();

  };

  // 반 전체 진도 이동
  const moveClassStage =
    async (
      direction: number
    ) => {

      const filtered =
        activeStudents;

      for (const student of filtered) {

        let newStage =
          (student.stage || 1) +
          direction;

        // 최소 제한
        if (newStage < 1) {
          newStage = 1;
        }

        // 최대 제한
        if (
          newStage >
          STAGE_DATA.length
        ) {

          newStage =
          STAGE_DATA.length;

        }

        await updateDoc(
          doc(
            db,
            "students",
            student.id
          ),
          {

            stage: newStage,

          }
        );

      }

      fetchStudents();

    };

  // 숨기기 / 복구
  const toggleStudentVisible =
    async (student: any) => {

      await updateDoc(
        doc(
          db,
          "students",
          student.id
        ),
        {

          isActive:
            !student.isActive,

        }
      );

      fetchStudents();

    };

  // 학생 삭제
  const deleteStudent = async (
    student: any
  ) => {

    const check = confirm(
      `${student.name} 학생을 삭제할까요?`
    );

    if (!check) return;

    await deleteDoc(
      doc(
        db,
        "students",
        student.id
      )
    );

    fetchStudents();

  };

  // 학교 목록
  const schoolList = [

    "전체학교",

    ...Array.from(
      new Set(
        students.map(
          (student) =>
            student.school ||
            "미지정"
        )
      )
    ),

  ];

  // 활성 학생
  const activeStudents =
    students.filter((student) => {

      if (
        student.isActive === false
      ) {

        return false;

      }

      const studentSchool =
        student.school ||
        "미지정";

      // 학교 필터
      if (
        selectedSchool !==
          "전체학교" &&
        studentSchool !==
          selectedSchool
      ) {

        return false;

      }

      const gradeNum = Number(
        student.grade
      );

      // A반
      if (selectedTab === "A반") {

        return gradeNum <= 2;

      }

      // B반
      return gradeNum >= 3;

    });

  // 숨김 학생
  const hiddenStudents =
    students.filter(
      (student) =>
        student.isActive === false
    );

  return (

    <div className="min-h-screen bg-black text-white p-3">

      <div className="max-w-7xl mx-auto">

        {/* 제목 */}
        <div className="bg-[#111] border border-yellow-700 rounded-3xl p-4 mb-4">

          <h1 className="text-3xl font-bold">

            🏫 역사 탐험 관리소

          </h1>

          <p className="text-gray-400 mt-1 text-sm">

            학생 탐험 현황 관리

          </p>

        </div>

        {/* 학생 등록 */}
        <div className="bg-[#111] border border-yellow-700 rounded-3xl p-4 mb-4">

          <div className="text-xl font-bold mb-3">

            ✏️ 학생 등록

          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">

            <input
              type="text"
              placeholder="학교"
              value={school}
              onChange={(e) =>
                setSchool(
                  e.target.value
                )
              }
              className="bg-[#181818] border border-yellow-700 rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="학년"
              value={grade}
              onChange={(e) =>
                setGrade(
                  e.target.value
                )
              }
              className="bg-[#181818] border border-yellow-700 rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="반"
              value={studentClass}
              onChange={(e) =>
                setStudentClass(
                  e.target.value
                )
              }
              className="bg-[#181818] border border-yellow-700 rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              className="bg-[#181818] border border-yellow-700 rounded-xl px-3 py-2 text-sm"
            />

            {/* 시작 진도 */}
            <select
              value={selectedStage}
              onChange={(e) =>
                setSelectedStage(
                  Number(
                    e.target.value
                  )
                )
              }
              className="bg-[#181818] border border-yellow-700 rounded-xl px-3 py-2 text-sm"
            >

              {STAGE_DATA.map(
                (stage) => (

                  <option
                    key={stage.id}
                    value={stage.id}
                  >

                   {stage.title} ({stage.short})

                  </option>

                )
              )}

            </select>

          </div>

          <button
            onClick={saveStudent}
            className="bg-yellow-600 hover:bg-yellow-500 rounded-xl px-4 py-2 text-sm font-bold"
          >

            🎉 학생 등록

          </button>

        </div>

        {/* 필터 */}
        <div className="bg-[#111] border border-yellow-700 rounded-3xl p-4 mb-4">

          <div className="flex flex-col gap-3">

            <div className="flex flex-col md:flex-row gap-3">

              {/* 학교 선택 */}
              <select
                value={selectedSchool}
                onChange={(e) =>
                  setSelectedSchool(
                    e.target.value
                  )
                }
                className="bg-[#181818] border border-yellow-700 rounded-xl px-4 py-2"
              >

                {schoolList.map(
                  (
                    schoolName,
                    index
                  ) => (

                    <option
                      key={`${schoolName}-${index}`}
                      value={schoolName}
                    >

                      {schoolName}

                    </option>

                  )
                )}

              </select>

              {/* 반 선택 */}
              <div className="flex gap-2">

                <button
                  onClick={() =>
                    setSelectedTab("A반")
                  }
                  className={`px-4 py-2 rounded-xl font-bold ${
                    selectedTab === "A반"
                      ? "bg-yellow-600"
                      : "bg-gray-700"
                  }`}
                >

                  A반 (1~2학년)

                </button>

                <button
                  onClick={() =>
                    setSelectedTab("B반")
                  }
                  className={`px-4 py-2 rounded-xl font-bold ${
                    selectedTab === "B반"
                      ? "bg-yellow-600"
                      : "bg-gray-700"
                  }`}
                >

                  B반 (3~6학년)

                </button>

              </div>

            </div>

            {/* 전체 기능 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">

              <button
                onClick={() =>
                  moveClassStage(1)
                }
                className="bg-yellow-700 rounded-xl py-3 text-sm font-bold"
              >

                📚 전체 다음 차시

              </button>

              <button
                onClick={() =>
                  moveClassStage(-1)
                }
                className="bg-gray-700 rounded-xl py-3 text-sm font-bold"
              >

                ◀ 전체 이전 차시

              </button>

              <button
                onClick={
                  giveBronzeToClass
                }
                className="bg-green-700 rounded-xl py-3 text-sm font-bold"
              >

                🥇 전체 동엽전 지급

              </button>

            </div>

          </div>

        </div>

        {/* 활성 학생 */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">

          {activeStudents.map(
            (student) => (

              <div
                key={student.id}
                className="bg-[#111] border border-yellow-700 rounded-3xl p-3"
              >

                {/* 이름 */}
                <div className="text-2xl font-bold mb-1">

                  {student.name}

                </div>

                {/* 학교 */}
                <div className="text-sm text-gray-400 mb-3">

                  {student.school ||
                    "미지정"}

                  <br />

                  {student.grade}학년{" "}
                  {student.class}반

                </div>
{/* 현재 진도 */}
<div className="bg-[#181818] rounded-2xl p-4 mb-3">

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

  <div className="text-3xl font-bold text-yellow-400">

    {
      getStageInfo(
        student.stage
      ).title
    }

  </div>

  <div className="text-gray-400 mt-1">

    {
      getStageInfo(
        student.stage
      ).current.era
    }

  </div>

</div>

                {/* 진도 이동 */}
                <div className="grid grid-cols-2 gap-2 mb-3">

                  <button
                    onClick={() =>
                      changeStage(
                        student,
                        -1
                      )
                    }
                    className="bg-gray-700 rounded-xl py-2 text-xs font-bold"
                  >

                    ◀ 이전 차시

                  </button>

                  <button
                    onClick={() =>
                      changeStage(
                        student,
                        1
                      )
                    }
                    className="bg-yellow-700 rounded-xl py-2 text-xs font-bold"
                  >

                    다음 차시 ▶

                  </button>

                </div>

                {/* 엽전 */}
                <div className="grid grid-cols-2 gap-2 mb-3">

                  <div className="bg-[#181818] rounded-xl p-2">

                    <div className="text-xs text-gray-400">

                      🥇 동

                    </div>

                    <div className="text-2xl font-bold">

                      {student.bronze}

                    </div>

                  </div>

                  <div className="bg-[#181818] rounded-xl p-2">

                    <div className="text-xs text-gray-400">

                      🥈 은

                    </div>

                    <div className="text-2xl font-bold">

                      {student.silver}

                    </div>

                  </div>

                </div>

                {/* 누적 */}
                <div className="bg-[#181818] rounded-xl p-2 mb-3 text-xs">

                  📊 총 동:
                  {" "}
                  {student.totalBronze || 0}

                  <br />

                  📊 총 은:
                  {" "}
                  {student.totalSilver || 0}

                </div>

                {/* 버튼 */}
                <div className="grid grid-cols-2 gap-2">

                  <button
                    onClick={() =>
                      addBronze(
                        student
                      )
                    }
                    className="bg-yellow-600 rounded-xl py-2 text-xs font-bold"
                  >

                    +동엽전

                  </button>

                  <button
                    onClick={() =>
                      useSilver(
                        student
                      )
                    }
                    className="bg-purple-600 rounded-xl py-2 text-xs font-bold"
                  >

                    은사용

                  </button>

                  <button
                    onClick={() =>
                      toggleStudentVisible(
                        student
                      )
                    }
                    className="bg-gray-600 rounded-xl py-2 text-xs font-bold"
                  >

                    숨기기

                  </button>

                  {/* 삭제 */}
                  <button
                    onClick={() =>
                      deleteStudent(
                        student
                      )
                    }
                    className="bg-red-600 rounded-xl py-2 text-xs font-bold"
                  >

                    삭제

                  </button>

                </div>

              </div>

            )
          )}

        </div>

        {/* 숨김 학생 */}
        {hiddenStudents.length >
          0 && (

          <div className="bg-[#111] border border-gray-700 rounded-3xl p-4">

            <div className="text-xl font-bold mb-4">

              🙈 숨김 학생

            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">

              {hiddenStudents.map(
                (student) => (

                  <div
                    key={student.id}
                    className="bg-[#181818] border border-gray-600 rounded-2xl p-3"
                  >

                    <div className="text-lg font-bold mb-1">

                      {student.name}

                    </div>

                    <div className="text-sm text-gray-400 mb-3">

                      {student.school ||
                        "미지정"}

                    </div>

                    <button
                      onClick={() =>
                        toggleStudentVisible(
                          student
                        )
                      }
                      className="bg-green-600 rounded-xl px-3 py-2 text-sm font-bold w-full"
                    >

                      👀 다시 표시

                    </button>

                  </div>

                )
              )}

            </div>

          </div>

        )}

      </div>

    </div>

  );
}
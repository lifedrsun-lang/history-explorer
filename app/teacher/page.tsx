# app/teacher/page.tsx 전체 교체본

```tsx
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

const SCHOOL_PASSWORDS = {
  "화성 새솔초": "0309",
  "김포 하늘빛초": "0304",
};

export default function TeacherPage() {

  const [authorized, setAuthorized] =
    useState(false);

  const [passwordInput, setPasswordInput] =
    useState("");

  const [selectedLoginSchool, setSelectedLoginSchool] =
    useState("");

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

      if (selectedTab === "A반") {
        return gradeNum <= 2;
      }

      return gradeNum >= 3;

    });

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

    if (newStage < 1) {
      newStage = 1;
    }

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

        if (newStage < 1) {
          newStage = 1;
        }

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

  // 숨김 학생
  const hiddenStudents =
    students.filter(
      (student) =>
        student.isActive === false
    );

  // 로그인 화면
  if (!authorized) {

    return (

      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">

        <div className="bg-[#111] border border-orange-500 rounded-3xl p-6 w-full max-w-sm">

          <div className="text-2xl font-bold mb-4 text-center">

            🔒 교사용 입장

          </div>

          <select
            value={selectedLoginSchool}
            onChange={(e) =>
              setSelectedLoginSchool(
                e.target.value
              )
            }
            className="w-full bg-[#222] border border-[#444] rounded-2xl px-4 py-3 mb-4 outline-none"
          >

            <option value="">
              학교 선택
            </option>

            {Object.keys(
              SCHOOL_PASSWORDS
            ).map((school) => (

              <option
                key={school}
                value={school}
              >
                {school}
              </option>

            ))}

          </select>

          <input
            type="password"
            placeholder="비밀번호 입력"
            value={passwordInput}
            onChange={(e) =>
              setPasswordInput(
                e.target.value
              )
            }
            className="w-full bg-[#222] border border-[#444] rounded-2xl px-4 py-3 mb-4 outline-none"
          />

          <button
            onClick={() => {

              const correctPassword =
                SCHOOL_PASSWORDS[
                  selectedLoginSchool
                ];

              if (
                passwordInput ===
                correctPassword
              ) {

                setAuthorized(true);

                setSelectedSchool(
                  selectedLoginSchool
                );

              } else {

                alert(
                  "비밀번호가 틀렸습니다"
                );

              }

            }}
            className="w-full bg-orange-500 rounded-2xl py-3 font-bold"
          >
            입장하기
          </button>

        </div>

      </div>

    );

  }

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

      </div>

    </div>

  );
}
```

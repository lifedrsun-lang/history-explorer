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

  const [selectedSchool, setSelectedSchool] =
    useState("전체보기");

  // 불러오기

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
      !school ||
      !grade ||
      !studentClass ||
      !name
    ) {

      alert(
        "모든 정보를 입력해주세요!"
      );

      return;
    }

    await addDoc(
      collection(db, "students"),
      {

        school,
        grade,
        class: studentClass,
        name,

        bronze: 0,
        silver: 0,

        totalBronze: 0,
        totalSilver: 0,

        stage: 0,

        character: "boy",

        isActive: true,

      }
    );

    setSchool("");
    setGrade("");
    setStudentClass("");
    setName("");

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

      alert(
        "🥈 은엽전으로 환전되었습니다!"
      );
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

  // 단계 추가

  const addStage = async (
    student: any
  ) => {

    await updateDoc(
      doc(
        db,
        "students",
        student.id
      ),
      {

        stage:
          (student.stage || 0) + 1,

      }
    );

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

    alert(
      "🎁 상품권 교환 완료!"
    );

    fetchStudents();
  };

  // 학생 숨기기

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

  // 삭제

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

  // 수정

  const editStudent = async (
    student: any
  ) => {

    const newSchool = prompt(
      "학교",
      student.school
    );

    if (newSchool === null)
      return;

    const newGrade = prompt(
      "학년",
      student.grade
    );

    if (newGrade === null)
      return;

    const newClass = prompt(
      "반",
      student.class
    );

    if (newClass === null)
      return;

    const newName = prompt(
      "이름",
      student.name
    );

    if (newName === null)
      return;

    await updateDoc(
      doc(
        db,
        "students",
        student.id
      ),
      {

        school: newSchool,
        grade: newGrade,
        class: newClass,
        name: newName,

      }
    );

    fetchStudents();
  };

  // 학교 목록

  const schoolList = [

    "전체보기",

    ...new Set(
      students.map(
        (student) =>
          student.school ||
          "미지정"
      )
    ),

  ];

  // 필터

  const filteredStudents =
    selectedSchool === "전체보기"
      ? students
      : students.filter(
          (student) =>
            student.school ===
            selectedSchool
        );

  // 활성 학생

  const activeStudents =
    filteredStudents.filter(
      (student) =>
        student.isActive !== false
    );

  // 숨김 학생

  const hiddenStudents =
    filteredStudents.filter(
      (student) =>
        student.isActive === false
    );

  return (

    <div className="min-h-screen bg-black text-white p-4">

      <div className="max-w-7xl mx-auto space-y-6">

        {/* 제목 */}

        <div className="rounded-[30px] border border-yellow-600 bg-[#111] p-6 shadow-[0_0_30px_rgba(255,180,0,0.15)]">

          <div className="flex items-center gap-5">

            <div className="text-6xl">
              🏫
            </div>

            <div>

              <h1 className="text-5xl font-bold mb-2">

                역사 탐험 관리소

              </h1>

              <p className="text-xl text-gray-300">

                학생 탐험 진행 현황을
                관리하세요.

              </p>

            </div>

          </div>

        </div>

        {/* 학생 등록 */}

        <div className="rounded-[30px] border border-yellow-700 bg-[#111] p-6">

          <div className="text-3xl font-bold mb-6">

            ✏️ 학생 등록

          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-5">

            <input
              type="text"
              placeholder="학교"
              value={school}
              onChange={(e) =>
                setSchool(
                  e.target.value
                )
              }
              className="bg-[#181818] border border-yellow-700 rounded-2xl px-4 py-4 text-xl outline-none"
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
              className="bg-[#181818] border border-yellow-700 rounded-2xl px-4 py-4 text-xl outline-none"
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
              className="bg-[#181818] border border-yellow-700 rounded-2xl px-4 py-4 text-xl outline-none"
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
              className="bg-[#181818] border border-yellow-700 rounded-2xl px-4 py-4 text-xl outline-none"
            />

          </div>

          <button
            onClick={saveStudent}
            className="bg-yellow-600 hover:bg-yellow-500 rounded-2xl px-6 py-4 text-xl font-bold"
          >

            🎉 학생 등록

          </button>

        </div>

        {/* 학교 필터 */}

        <div className="rounded-[30px] border border-yellow-700 bg-[#111] p-6">

          <div className="text-3xl font-bold mb-5">

            🏫 학교 선택

          </div>

          <select
            value={selectedSchool}
            onChange={(e) =>
              setSelectedSchool(
                e.target.value
              )
            }
            className="bg-[#181818] border border-yellow-700 rounded-2xl px-5 py-4 text-xl"
          >

            {schoolList.map(
              (schoolName) => (

                <option
                  key={schoolName}
                  value={schoolName}
                >

                  {schoolName}

                </option>

              )
            )}

          </select>

        </div>

        {/* 활성 학생 */}

        <div className="space-y-5">

          {activeStudents.map(
            (student) => (

              <div
                key={student.id}
                className="rounded-[30px] border border-yellow-700 bg-[#111] p-6 shadow-lg"
              >

                <div className="grid lg:grid-cols-2 gap-8 items-center">

                  {/* 정보 */}

                  <div>

                    <div className="text-5xl font-bold mb-5">

                      {student.name}

                    </div>

                    <div className="text-2xl mb-2">

                      🏫{" "}
                      {student.school}

                    </div>

                    <div className="text-2xl mb-5">

                      {student.grade}
                      학년{" "}
                      {
                        student.class
                      }
                      반

                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-5">

                      <div className="bg-[#181818] border border-yellow-700 rounded-2xl p-4">

                        <div className="text-xl mb-3">

                          🥇 동엽전

                        </div>

                        <div className="text-5xl font-bold">

                          {
                            student.bronze
                          }

                        </div>

                      </div>

                      <div className="bg-[#181818] border border-gray-500 rounded-2xl p-4">

                        <div className="text-xl mb-3">

                          🥈 은엽전

                        </div>

                        <div className="text-5xl font-bold">

                          {
                            student.silver
                          }

                        </div>

                      </div>

                    </div>

                    {/* 누적 */}

                    <div className="bg-[#181818] border border-yellow-800 rounded-2xl p-5">

                      <div className="text-2xl font-bold mb-4">

                        📊 누적 기록

                      </div>

                      <div className="text-xl mb-2">

                        🥇 총 동엽전:
                        {" "}
                        {
                          student.totalBronze ||
                          0
                        }

                      </div>

                      <div className="text-xl">

                        🥈 총 은엽전:
                        {" "}
                        {
                          student.totalSilver ||
                          0
                        }

                      </div>

                    </div>

                  </div>

                  {/* 버튼 */}

                  <div className="grid grid-cols-2 gap-4">

                    <button
                      onClick={() =>
                        addBronze(
                          student
                        )
                      }
                      className="bg-yellow-600 hover:bg-yellow-500 rounded-2xl py-5 text-2xl font-bold"
                    >

                      🥇 +1 동엽전

                    </button>

                    <button
                      onClick={() =>
                        addStage(
                          student
                        )
                      }
                      className="bg-green-600 hover:bg-green-500 rounded-2xl py-5 text-2xl font-bold"
                    >

                      🚀 수업 완료

                    </button>

                    <button
                      onClick={() =>
                        useSilver(
                          student
                        )
                      }
                      className="bg-purple-600 hover:bg-purple-500 rounded-2xl py-5 text-2xl font-bold"
                    >

                      🎁 은엽전 사용

                    </button>

                    <button
                      onClick={() =>
                        editStudent(
                          student
                        )
                      }
                      className="bg-blue-600 hover:bg-blue-500 rounded-2xl py-5 text-2xl font-bold"
                    >

                      ✏️ 정보 수정

                    </button>

                    <button
                      onClick={() =>
                        toggleStudentVisible(
                          student
                        )
                      }
                      className="bg-gray-600 hover:bg-gray-500 rounded-2xl py-5 text-2xl font-bold"
                    >

                      🙈 숨기기

                    </button>

                    <button
                      onClick={() =>
                        deleteStudent(
                          student
                        )
                      }
                      className="bg-red-600 hover:bg-red-500 rounded-2xl py-5 text-2xl font-bold"
                    >

                      🗑️ 삭제

                    </button>

                  </div>

                </div>

              </div>

            )
          )}

        </div>

        {/* 숨김 학생 */}

        {hiddenStudents.length >
          0 && (

          <div className="rounded-[30px] border border-gray-700 bg-[#111] p-6">

            <div className="text-3xl font-bold mb-5">

              🙈 숨김 학생

            </div>

            <div className="space-y-4">

              {hiddenStudents.map(
                (student) => (

                  <div
                    key={student.id}
                    className="bg-[#181818] border border-gray-600 rounded-2xl p-5 flex justify-between items-center"
                  >

                    <div>

                      <div className="text-3xl font-bold mb-2">

                        {
                          student.name
                        }

                      </div>

                      <div className="text-xl">

                        {
                          student.grade
                        }
                        학년{" "}
                        {
                          student.class
                        }
                        반

                      </div>

                    </div>

                    <button
                      onClick={() =>
                        toggleStudentVisible(
                          student
                        )
                      }
                      className="bg-green-600 hover:bg-green-500 rounded-2xl px-6 py-4 text-xl font-bold"
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
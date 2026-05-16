"use client";

import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type Student = {
  id: string;
  name: string;
  school: string;
  grade: string;
  classNum: string;
  studentNumber: string;
  password: string;
};

export default function TeacherPage() {
  const [students, setStudents] = useState<Student[]>([]);

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [studentNumber, setStudentNumber] = useState("");

  const fetchStudents = async () => {
    const querySnapshot = await getDocs(collection(db, "students"));

    const list: Student[] = querySnapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as Omit<Student, "id">),
    }));

    setStudents(list);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudent = async () => {
    if (
      !name ||
      !school ||
      !grade ||
      !classNum ||
      !studentNumber
    ) {
      alert("모든 항목을 입력해주세요.");
      return;
    }

    // 자동 비밀번호 생성
    const password = String(studentNumber).padStart(2, "0");

    await addDoc(collection(db, "students"), {
      name,
      school,
      grade,
      classNum,
      studentNumber,
      password,
      createdAt: new Date(),
    });

    alert(`학생 등록 완료!\n비밀번호: ${password}`);

    setName("");
    setSchool("");
    setGrade("");
    setClassNum("");
    setStudentNumber("");

    fetchStudents();
  };

  const handleDelete = async (id: string) => {
    const ok = confirm("삭제할까요?");

    if (!ok) return;

    await deleteDoc(doc(db, "students", id));

    fetchStudents();
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          학생 관리
        </h1>

        {/* 등록 카드 */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
          <h2 className="text-xl font-bold mb-4">
            학생 등록
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded-xl p-3"
              placeholder="학교"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />

            <input
              className="border rounded-xl p-3"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="border rounded-xl p-3"
              placeholder="학년"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />

            <input
              className="border rounded-xl p-3"
              placeholder="반"
              value={classNum}
              onChange={(e) => setClassNum(e.target.value)}
            />

            <input
              className="border rounded-xl p-3"
              placeholder="번호"
              value={studentNumber}
              onChange={(e) =>
                setStudentNumber(e.target.value)
              }
            />
          </div>

          {/* 자동 비밀번호 표시 */}
          {studentNumber && (
            <p className="mt-3 text-sm text-gray-500">
              자동 비밀번호 :{" "}
              {String(studentNumber).padStart(2, "0")}
            </p>
          )}

          <button
            onClick={handleAddStudent}
            className="mt-5 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl"
          >
            학생 등록
          </button>
        </div>

        {/* 학생 목록 */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h2 className="text-xl font-bold mb-4">
            등록된 학생
          </h2>

          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="border rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold">
                    {student.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {student.school} / {student.grade}학년{" "}
                    {student.classNum}반 /{" "}
                    {student.studentNumber}번
                  </p>

                  <p className="text-sm text-blue-500 mt-1">
                    비밀번호 : {student.password}
                  </p>
                </div>

                <button
                  onClick={() =>
                    handleDelete(student.id)
                  }
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
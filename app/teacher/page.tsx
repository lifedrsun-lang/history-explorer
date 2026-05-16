"use client";

import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type Student = {
  id: string;
  name: string;
  school: string;
  grade: string;
  classNum: string;
  studentNumber: string;
  password?: string;
};

export default function TeacherPage() {
  const [students, setStudents] = useState<Student[]>([]);

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [studentNumber, setStudentNumber] = useState("");

  // 검색
  const [searchTerm, setSearchTerm] = useState("");

  // 학생 불러오기
  const fetchStudents = async () => {
    const snapshot = await getDocs(collection(db, "students"));

    const list: Student[] = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as Omit<Student, "id">),
    }));

    // 이름순 정렬
    list.sort((a, b) => a.name.localeCompare(b.name));

    setStudents(list);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // 학생 등록
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

    try {
      await addDoc(collection(db, "students"), {
        name,
        school,
        grade,
        classNum,
        studentNumber,
        password,
        createdAt: new Date(),
      });

      alert(
        `학생 등록 완료!\n\n자동 비밀번호 : ${password}`
      );

      setName("");
      setSchool("");
      setGrade("");
      setClassNum("");
      setStudentNumber("");

      fetchStudents();
    } catch (error) {
      console.error(error);
      alert("학생 등록 실패");
    }
  };

  // 학생 삭제
  const handleDelete = async (id: string) => {
    const ok = confirm("학생을 삭제할까요?");

    if (!ok) return;

    try {
      await deleteDoc(doc(db, "students", id));

      fetchStudents();
    } catch (error) {
      console.error(error);
      alert("삭제 실패");
    }
  };

  // 기존 학생 비밀번호 자동 생성
  const handleUpdatePasswords = async () => {
    try {
      const snapshot = await getDocs(
        collection(db, "students")
      );

      for (const studentDoc of snapshot.docs) {
        const data = studentDoc.data();

        const password = String(
          data.studentNumber || ""
        ).padStart(2, "0");

        await updateDoc(
          doc(db, "students", studentDoc.id),
          {
            password,
          }
        );
      }

      alert("기존 학생 비밀번호 생성 완료!");

      fetchStudents();
    } catch (error) {
      console.error(error);
      alert("업데이트 실패");
    }
  };

  // 검색 필터
  const filteredStudents = students.filter((student) => {
    const keyword = searchTerm.toLowerCase();

    return (
      student.name?.toLowerCase().includes(keyword) ||
      student.school?.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4">
      <div className="max-w-4xl mx-auto">
        {/* 제목 */}
        <h1 className="text-3xl font-bold mb-6">
          학생 관리
        </h1>

        {/* 학생 등록 */}
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
            <p className="mt-3 text-sm text-blue-500 font-medium">
              자동 비밀번호 :{" "}
              {String(studentNumber).padStart(2, "0")}
            </p>
          )}

          {/* 등록 버튼 */}
          <button
            onClick={handleAddStudent}
            className="mt-5 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl"
          >
            학생 등록
          </button>

          {/* 기존 학생 비밀번호 생성 */}
          <button
            onClick={handleUpdatePasswords}
            className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl"
          >
            기존 학생 비밀번호 자동 생성
          </button>
        </div>

        {/* 학생 목록 */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold">
              등록된 학생
            </h2>

            {/* 검색 */}
            <input
              type="text"
              placeholder="학생 이름 검색"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="border rounded-xl px-4 py-2 w-full md:w-72"
            />
          </div>

          {/* 학생 수 */}
          <p className="text-sm text-gray-500 mb-4">
            총 학생 수 : {filteredStudents.length}명
          </p>

          {/* 학생 리스트 */}
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="border rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-lg">
                    {student.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {student.school} /{" "}
                    {student.grade}학년{" "}
                    {student.classNum}반 /{" "}
                    {student.studentNumber}번
                  </p>

                  <p className="text-sm text-blue-500 mt-1">
                    비밀번호 :{" "}
                    {student.password || "없음"}
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

            {filteredStudents.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
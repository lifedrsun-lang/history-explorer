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

import {
  useEffect,
  useState,
} from "react";

import { useRouter }
from "next/navigation";

import {
  STAGE_DATA,
} from "@/app/student/data/stageData";

import TeacherLogin from "./components/TeacherLogin";
import StudentCard from "./components/StudentCard";
import StudentEditModal from "./components/StudentEditModal";

export default function TeacherPage() {

  const router = useRouter();

  const [authorized, setAuthorized] =
    useState(false);

  const [passwordInput, setPasswordInput] =
    useState("");

  const [students, setStudents] =
    useState<any[]>([]);

  const [school, setSchool] =
    useState("");

  const [grade, setGrade] =
    useState("");

  const [studentClass, setStudentClass] =
    useState("");

  const [studentNumber, setStudentNumber] =
    useState("");

  const [name, setName] =
    useState("");

  const [selectedStage, setSelectedStage] =
    useState(1);

  const [selectedSchool, setSelectedSchool] =
    useState("전체학교");

  const [selectedTab, setSelectedTab] =
    useState("A반");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [editingStudent, setEditingStudent] =
    useState<any>(null);

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

    // 로그인 유지
    const savedAuth =
      localStorage.getItem(
        "teacherAuth"
      );

    const loginTime =
      localStorage.getItem(
        "teacherLoginTime"
      );

    if (
      savedAuth === "true" &&
      loginTime
    ) {

      const now = Date.now();

      const diff =
        now -
        Number(loginTime);

      // 2분 유지
      if (
        diff <
        1000 * 60 * 2
      ) {

        setAuthorized(true);

      } else {

        localStorage.removeItem(
          "teacherAuth"
        );

        localStorage.removeItem(
          "teacherLoginTime"
        );

      }

    }

  }, []);

  // 로그인
  const handleLogin = () => {

    if (
      passwordInput.trim() ===
      "0713"
    ) {

      setAuthorized(true);

      localStorage.setItem(
        "teacherAuth",
        "true"
      );

      localStorage.setItem(
        "teacherLoginTime",
        Date.now().toString()
      );

    } else {

      alert(
        "비밀번호가 틀렸습니다"
      );

    }

  };

  // 학생 등록
  const saveStudent = async () => {

    if (
      !grade ||
      !studentClass ||
      !studentNumber ||
      !name
    ) {

      alert(
        "학년 / 반 / 번호 / 이름을 입력해주세요!"
      );

      return;

    }

    // 자동 비밀번호 생성
    const password = String(
      studentNumber
    ).padStart(2, "0");

    await addDoc(
      collection(db, "students"),
      {
        school:
          school || "미지정",

        grade,
        class: studentClass,
        studentNumber,
        password,
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
    setStudentNumber("");
    setName("");

    setSelectedStage(1);

    alert(
      `학생 등록 완료!\n비밀번호 : ${password}`
    );

    fetchStudents();

  };

  // 기존 학생 비밀번호 생성
  const updateAllPasswords =
    async () => {

      const querySnapshot =
        await getDocs(
          collection(db, "students")
        );

      for (const studentDoc of querySnapshot.docs) {

        const data =
          studentDoc.data();

        const password = String(
          data.studentNumber || ""
        ).padStart(2, "0");

        await updateDoc(
          doc(
            db,
            "students",
            studentDoc.id
          ),
          {
            password,
          }
        );

      }

      alert(
        "기존 학생 비밀번호 생성 완료!"
      );

      fetchStudents();

    };

  // 수정 모달 열기
  const openEditModal = (
    student: any
  ) => {

    setEditingStudent(student);

  };

  // 수정 모달 닫기
  const closeEditModal = () => {

    setEditingStudent(null);

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

  // 숨기기
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

  const activeStudents =
  students
    .filter((student) => {

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

      const keyword =
        searchTerm.toLowerCase();

      if (
        searchTerm &&
        !student.name
          ?.toLowerCase()
          .includes(keyword)
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

    })

    // 출석부 순 정렬
    .sort((a, b) => {

      const gradeA =
        Number(a.grade) || 0;

      const gradeB =
        Number(b.grade) || 0;

      if (gradeA !== gradeB) {

        return gradeA - gradeB;

      }

      const classA =
        Number(a.class) || 0;

      const classB =
        Number(b.class) || 0;

      if (classA !== classB) {

        return classA - classB;

      }

      const numberA =
        Number(
          a.studentNumber
        ) || 0;

      const numberB =
        Number(
          b.studentNumber
        ) || 0;

      return numberA - numberB;

    });

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

  // 로그인 화면
  if (!authorized) {

    return (

      <TeacherLogin
        passwordInput={
          passwordInput
        }
        setPasswordInput={
          setPasswordInput
        }
        onLogin={handleLogin}
      />

    );

  }

  return (

    <div className="min-h-screen bg-[#f5f7fb] p-3">

      <div className="max-w-7xl mx-auto">

        {/* 제목 */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-md">

          <h1 className="text-3xl font-bold">
            🏫 역사 탐험 관리소
          </h1>

          <p className="text-gray-500 mt-1 text-sm">
            학생 탐험 현황 관리
          </p>

          <div className="flex justify-end mt-3">

            <button
              onClick={() => {

                const previousMap =
                  localStorage.getItem(
                    "previousMap"
                  );

                if (previousMap) {

                  router.push(
                    previousMap
                  );

                } else {

                  router.push("/");

                }

              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold"
            >
              🏝 맵으로 돌아가기
            </button>

          </div>

        </div>

        {/* 학생 등록 */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-md">

          <div className="text-xl font-bold mb-3">
            ✏️ 학생 등록
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">

            <input
              type="text"
              placeholder="학교"
              value={school}
              onChange={(e) =>
                setSchool(e.target.value)
              }
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="학년"
              value={grade}
              onChange={(e) =>
                setGrade(e.target.value)
              }
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="반"
              value={studentClass}
              onChange={(e) =>
                setStudentClass(e.target.value)
              }
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="번호"
              value={studentNumber}
              onChange={(e) =>
                setStudentNumber(
                  e.target.value
                )
              }
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="border rounded-xl px-3 py-2 text-sm"
            />

            <select
              value={selectedStage}
              onChange={(e) =>
                setSelectedStage(
                  Number(e.target.value)
                )
              }
              className="border rounded-xl px-3 py-2 text-sm"
            >

              {STAGE_DATA.map(
                (stage) => (

                  <option
                    key={stage.id}
                    value={stage.id}
                  >
                    {stage.title}
                  </option>

                )
              )}

            </select>

          </div>

          {studentNumber && (

            <div className="text-sm text-blue-500 font-bold mb-3">

              자동 비밀번호 :
              {" "}
              {String(
                studentNumber
              ).padStart(2, "0")}

            </div>

          )}

          <div className="flex flex-col md:flex-row gap-2">

            <button
              onClick={saveStudent}
              className="bg-yellow-500 text-white rounded-xl px-4 py-2 font-bold"
            >
              🎉 학생 등록
            </button>

            <button
              onClick={
                updateAllPasswords
              }
              className="bg-green-500 text-white rounded-xl px-4 py-2 font-bold"
            >
              🔑 기존 학생 비밀번호 생성
            </button>

          </div>

        </div>

        {/* 학생 수 */}
<div className="bg-white rounded-3xl p-4 mb-4 shadow-md">

<div className="grid grid-cols-3 gap-3 text-center">

  {/* A반 */}
  <div className="bg-blue-50 rounded-2xl p-3">

    <div className="text-sm text-gray-500 mb-1">
      A반
    </div>

    <div className="text-2xl font-bold text-blue-600">

      {
        students.filter(
          (student) =>
            Number(
              student.grade
            ) <= 2 &&
            student.isActive !==
              false
        ).length
      }

      명

    </div>

  </div>

  {/* B반 */}
  <div className="bg-pink-50 rounded-2xl p-3">

    <div className="text-sm text-gray-500 mb-1">
      B반
    </div>

    <div className="text-2xl font-bold text-pink-600">

      {
        students.filter(
          (student) =>
            Number(
              student.grade
            ) >= 3 &&
            student.isActive !==
              false
        ).length
      }

      명

    </div>

  </div>

  {/* 전체 */}
  <div className="bg-yellow-50 rounded-2xl p-3">

    <div className="text-sm text-gray-500 mb-1">
      전체
    </div>

    <div className="text-2xl font-bold text-yellow-600">

      {
        students.filter(
          (student) =>
            student.isActive !==
            false
        ).length
      }

      명

    </div>

  </div>

</div>

</div>

        {/* 필터 */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-md">

          <div className="flex flex-col md:flex-row gap-3">

            <select
              value={selectedSchool}
              onChange={(e) =>
                setSelectedSchool(
                  e.target.value
                )
              }
              className="border rounded-xl px-4 py-2"
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

            <input
              type="text"
              placeholder="학생 이름 검색"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
              className="border rounded-xl px-4 py-2"
            />

          </div>

        </div>

        {/* 학생 목록 */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">

          {activeStudents.map(
            (student) => (

              <StudentCard
                key={student.id}
                student={student}
                addBronze={addBronze}
                useSilver={useSilver}
                changeStage={changeStage}
                toggleStudentVisible={
                  toggleStudentVisible
                }
                deleteStudent={
                  deleteStudent
                }
                openEditModal={
                  openEditModal
                }
              />

            )
          )}

        </div>

      </div>

      {/* 수정 모달 */}
      {editingStudent && (

        <StudentEditModal
          student={editingStudent}
          onClose={
            closeEditModal
          }
          refreshStudents={
            fetchStudents
          }
        />

      )}

    </div>

  );

}
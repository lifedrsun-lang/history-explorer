"use client";

import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import SearchDropdown from "./components/SearchDropdown";
import StudentProfile from "./components/StudentProfile";
import LoadingSpinner from "./components/LoadingSpinner";

export default function StudentPage() {

  const [students, setStudents] =
    useState<any[]>([]);

  const [selectedStudent, setSelectedStudent] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  // 학생 불러오기
  const fetchStudents = async () => {

    try {

      const querySnapshot =
        await getDocs(
          collection(db, "students")
        );

      const studentList: any[] = [];

      querySnapshot.forEach((docItem) => {

        const data = docItem.data();

        // 숨김 학생 제외
        if (data.isActive === false) {
          return;
        }

        studentList.push({
          id: docItem.id,
          ...data,
        });

      });

      setStudents(studentList);

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    fetchStudents();

  }, []);

  if (loading) {

    return <LoadingSpinner />;

  }

  return (

    <div className="min-h-screen bg-black flex items-center justify-center p-4">

      <div className="w-full max-w-xl">

        {/* 검색창 */}
        <SearchDropdown
          students={students}
          onSelectStudent={
            setSelectedStudent
          }
        />

        {/* 학생 정보 */}
        {selectedStudent && (

          <div className="mt-6">

            <StudentProfile
              student={selectedStudent}
              currentStage={1}
              stageInfo={{}}
              achievements={[]}
              changeCharacter={() => {}}
            />

          </div>

        )}

      </div>

    </div>

  );

}
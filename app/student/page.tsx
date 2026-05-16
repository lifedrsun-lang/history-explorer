"use client";

import { useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type Student = {
  id: string;
  name: string;
  school?: string;
  grade?: string;
  class?: string;
  bronze?: number;
  silver?: number;
  stage?: number;
  hidden?: boolean;
  character?: string;
};

export default function StudentPage() {

  const [students, setStudents] =
    useState<Student[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const fetchStudents = async () => {

    try {

      const querySnapshot =
        await getDocs(
          collection(db, "students")
        );

      const studentList: Student[] = [];

      querySnapshot.forEach((docItem) => {

        const data = docItem.data();

        studentList.push({
          id: docItem.id,
          ...data,
        } as Student);

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

  const filteredStudents = useMemo(() => {

    if (search.trim() === "") {
      return [];
    }

    return students.filter((student) => {

      if (student.hidden === true) {
        return false;
      }

      return student.name
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        );

    });

  }, [students, search]);

  const getLevelTitle = (
    level: number
  ) => {

    if (level >= 10) {
      return "👑 역사의 전설";
    }

    if (level >= 7) {
      return "⚔️ 고구려 장군";
    }

    if (level >= 5) {
      return "🛡️ 역사 수호자";
    }

    if (level >= 3) {
      return "🔥 탐험 전문가";
    }

    return "🌱 새내기 탐험가";
  };

  const getStageTitle = (
    stage: number
  ) => {

    if (stage <= 4) {
      return "🔥 고조선 탐험";
    }

    if (stage <= 8) {
      return "🏹 고조선 2 탐험";
    }

    if (stage <= 12) {
      return "⚔️ 고구려 탐험";
    }

    return "👑 삼국시대 탐험";
  };

  if (loading) {

    return (

      <div className="min-h-screen bg-[#dbe7b5] flex items-center justify-center">

        <div className="text-3xl font-bold text-[#4b3725]">
          탐험 지도를 불러오는 중...
        </div>

      </div>

    );
  }

  return (

    <div className="min-h-screen bg-[#dbe7b5] py-6 px-4">

      <div className="max-w-6xl mx-auto">

        {/* 제목 */}

        <div className="bg-[#f8f1df] border-4 border-[#8a5b2b] rounded-[35px] shadow-2xl p-6 mb-6">

          <h1 className="text-3xl md:text-5xl font-bold text-[#4b3725] mb-3 text-center">

            🧭 역사논술탐험

          </h1>

          <p className="text-base md:text-xl text-[#5c4631] text-center">

            나의 탐험 기록과 엽전을 확인해보세요!

          </p>

        </div>

        {/* 검색 */}

        <div className="bg-[#fff8ea] border-4 border-[#8a5b2b] rounded-[30px] p-5 mb-6 shadow-xl">

          <h2 className="text-2xl md:text-3xl font-bold text-[#4b3725] mb-4">

            🔍 탐험가 찾기

          </h2>

          <input
            type="text"
            placeholder="이름 입력"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full border-2 border-[#b08b57] rounded-2xl px-5 py-4 text-lg md:text-xl bg-white outline-none"
          />

        </div>

        {search.trim() === "" ? (

          <div className="bg-[#fff8ea] border-4 border-[#8a5b2b] rounded-[35px] p-10 text-center shadow-xl">

            <div className="text-6xl md:text-7xl mb-5">
              🗺️
            </div>

            <div className="text-2xl md:text-4xl font-bold text-[#4b3725] mb-3">

              탐험가 이름을 입력하세요!

            </div>

            <div className="text-lg text-[#5c4631]">

              나만의 역사 탐험 기록을 확인할 수 있어요.

            </div>

          </div>

        ) : filteredStudents.length === 0 ? (

          <div className="bg-[#fff8ea] border-4 border-[#8a5b2b] rounded-[35px] p-10 text-center shadow-xl">

            <div className="text-5xl mb-4">
              😢
            </div>

            <div className="text-2xl font-bold text-[#4b3725]">

              탐험가를 찾을 수 없어요

            </div>

          </div>

        ) : (

          <div className="space-y-6">

            {filteredStudents.map((student) => {

              const bronze =
                student.bronze || 0;

              const silver =
                student.silver || 0;

              const stage =
                student.stage || 0;

              const level =
                Math.floor(bronze / 10) + 1;

              return (

                <div
                  key={student.id}
                  className="bg-[#fff8ea] border-4 border-[#8a5b2b] rounded-[35px] shadow-2xl overflow-hidden"
                >

                  <div className="p-6">

                    <div className="flex flex-col md:flex-row items-center gap-6">

                      {/* 캐릭터 */}

                      <div className="flex flex-col items-center min-w-[160px]">

                        <img
                          src={
                            student.character ===
                            "girl"
                              ? "/characters/girl.png"
                              : "/characters/boy.png"
                          }
                          alt="탐험가"
                          className="w-32 h-32 md:w-40 md:h-40 object-contain"
                        />

                        <div className="text-lg md:text-xl font-bold text-[#4b3725] mt-3 text-center">

                          {getLevelTitle(level)}

                        </div>

                      </div>

                      {/* 정보 */}

                      <div className="flex-1 w-full">

                        <div className="mb-5">

                          <div className="text-sm md:text-base font-bold text-[#7a5a35] mb-2">

                            {student.school || "미지정"}

                          </div>

                          <h2 className="text-3xl md:text-5xl font-bold text-[#4b3725] mb-2">

                            {student.name}

                          </h2>

                          <p className="text-lg md:text-2xl text-[#5c4631]">

                            {student.grade}학년{" "}
                            {student.class}반

                          </p>

                        </div>

                        {/* 엽전 */}

                        <div className="bg-[#efe1c7] rounded-3xl p-5 mb-4 border-2 border-[#b08b57]">

                          <div className="text-xl md:text-2xl font-bold text-[#4b3725] mb-3">

                            🪙 탐험 자원

                          </div>

                          <div className="flex gap-6 flex-wrap">

                            <div className="text-lg md:text-xl font-bold">

                              🟤 동엽전 :
                              {" "}
                              {bronze}

                            </div>

                            <div className="text-lg md:text-xl font-bold">

                              ⚪ 은엽전 :
                              {" "}
                              {silver}

                            </div>

                          </div>

                        </div>

                        {/* 스테이지 */}

                        <div className="bg-[#dbe7b5] rounded-3xl p-5 border-2 border-[#8a5b2b]">

                          <div className="text-xl md:text-2xl font-bold text-[#4b3725] mb-2">

                            🗺️ 현재 탐험 지역

                          </div>

                          <div className="text-lg md:text-2xl font-bold text-[#5c4631]">

                            {getStageTitle(stage)}

                          </div>

                          <div className="mt-3 text-base md:text-lg">

                            현재 스테이지 :
                            {" "}
                            {stage}

                          </div>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              );
            })}

          </div>

        )}

      </div>

    </div>

  );
}
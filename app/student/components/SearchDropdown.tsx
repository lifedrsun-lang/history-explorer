"use client";

import { useMemo } from "react";

type Props = {
  students: any[];
  searchName: string;
  setSearchName: (value: string) => void;
  setSelectedStudent: (student: any) => void;
};

export default function SearchDropdown({
  students,
  searchName,
  setSearchName,
  setSelectedStudent,
}: Props) {

  // 검색 결과
  const filteredStudents = useMemo(() => {

    if (searchName.trim() === "") {
      return [];
    }

    return students.filter((s) =>
      s.name?.includes(searchName.trim())
    );

  }, [students, searchName]);

  return (

    <div className="relative">

      {/* 입력창 */}
      <input
        value={searchName}
        onChange={(e) =>
          setSearchName(e.target.value)
        }
        placeholder="이름을 입력하세요"
        autoComplete="off"
        className="w-full bg-[#111] border border-[#333] rounded-2xl px-4 py-4 text-lg outline-none focus:border-gray-500 transition"
      />

      {/* 자동완성 */}
      {searchName.trim() !== "" &&
        filteredStudents.length > 0 && (

          <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-[#333] rounded-2xl overflow-hidden z-50 max-h-[260px] overflow-y-auto shadow-2xl">

            {filteredStudents.map((student) => (

              <button
                key={student.id}
                onClick={() => {

                  // 이름 입력
                  setSearchName(student.name);

                  // 학생 선택
                  setSelectedStudent(student);

                }}
                className="w-full text-left px-4 py-4 active:bg-[#222] hover:bg-[#1a1a1a] transition border-b border-[#222] last:border-b-0"
              >

                <div className="flex items-center justify-between gap-3">

                  {/* 왼쪽 */}
                  <div className="min-w-0">

                    <div className="font-bold text-base truncate">

                      {student.name}

                    </div>

                    <div className="text-xs text-gray-400 mt-1">

                      {student.grade}학년
                      {" "}
                      {student.class}반

                    </div>

                  </div>

                  {/* 화살표 */}
                  <div className="text-gray-500 text-sm shrink-0">

                    ▶

                  </div>

                </div>

              </button>

            ))}

          </div>

        )}

    </div>

  );
}
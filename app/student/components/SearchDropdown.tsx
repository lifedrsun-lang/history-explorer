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
        className="w-full bg-[#111] border border-[#333] rounded-2xl px-4 py-4 text-lg outline-none"
      />

      {/* 검색 목록 */}
      {searchName.trim() !== "" &&
        filteredStudents.length > 0 && (

          <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-[#333] rounded-2xl overflow-hidden z-50">

            {filteredStudents.map((student) => (

              <button
                key={student.id}
                onClick={() => {

                  setSearchName(student.name);

                  // 🔥 클릭시에만 선택
                  setSelectedStudent(student);

                }}
                className="w-full text-left px-4 py-3 hover:bg-[#1a1a1a] border-b border-[#222] last:border-b-0"
              >

                <div className="font-bold">
                  {student.name}
                </div>

                <div className="text-xs text-gray-400">

                  {student.grade}학년 {student.class}반

                </div>

              </button>

            ))}

          </div>

        )}

    </div>

  );
}
"use client";

import { useState } from "react";

type Props = {
  students: any[];
  onSelectStudent: (student: any) => void;
};

export default function SearchDropdown({
  students,
  onSelectStudent,
}: Props) {

  const [search, setSearch] =
    useState("");

  const filteredStudents =
    students.filter((student) => {

      const keyword =
        search.toLowerCase();

      return (

        student.name
          ?.toLowerCase()
          .includes(keyword) ||

        student.school
          ?.toLowerCase()
          .includes(keyword)

      );

    });

  return (

    <div className="w-full">

      {/* 검색창 */}
      <input
        type="text"
        placeholder="이름 검색"
        value={search}
        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }
        className="w-full bg-[#111] border border-yellow-700 rounded-2xl px-4 py-4 text-white outline-none text-lg"
      />

      {/* 검색 결과 */}
      {search.length > 0 && (

        <div className="mt-3 bg-[#111] border border-yellow-700 rounded-2xl overflow-hidden">

          {filteredStudents.length >
          0 ? (

            filteredStudents.map(
              (student) => (

                <button
                  key={student.id}
                  onClick={() => {

                    onSelectStudent(
                      student
                    );

                    setSearch("");

                  }}
                  className="w-full text-left px-4 py-4 border-b border-[#222] hover:bg-[#1b1b1b] transition"
                >

                  <div className="font-bold text-white">

                    {student.name}

                  </div>

                  <div className="text-sm text-gray-400">

                    {student.school}
                    {" "}
                    ·
                    {" "}
                    {student.grade}학년
                    {" "}
                    {student.class}반

                  </div>

                </button>

              )
            )

          ) : (

            <div className="px-4 py-4 text-gray-500">

              검색 결과 없음

            </div>

          )}

        </div>

      )}

    </div>

  );

}
"use client";

interface Props {
  students: any[];
  searchName: string;
  setSearchName: (
    value: string
  ) => void;
  setSelectedStudent: (
    student: any
  ) => void;
}

export default function SearchDropdown({
  students,
  searchName,
  setSearchName,
  setSelectedStudent,
}: Props) {

  if (!searchName?.trim()) {
    return null;
  }

  return (

    <div className="overflow-hidden rounded-[24px] border border-[#333] bg-[#0b0b0f]">

      {students.map((student) => (

        <button
          key={student.id}
          onClick={() => {

            setSelectedStudent(student);
            setSearchName(student.name);

          }}
          className="flex w-full items-center justify-between border-b border-[#222] px-5 py-4 text-left transition hover:bg-white/5 last:border-none"
        >

          <div>

            <div className="text-lg font-bold text-white">
              {student.name}
            </div>

            <div className="mt-1 text-sm text-[#9fb0ff]">
              {student.grade}학년 {student.class}반
            </div>

          </div>

          <div className="text-gray-400">
            ▶
          </div>

        </button>

      ))}

    </div>

  );

}
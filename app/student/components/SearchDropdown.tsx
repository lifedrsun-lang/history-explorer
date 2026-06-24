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

    <div className="overflow-hidden rounded-[24px] border border-sky-100 bg-white shadow-sm">

      {students.map((student) => (

        <button
          key={student.id}
          onClick={() => {

            setSelectedStudent(student);
            setSearchName(student.name);

          }}
          className="flex w-full items-center justify-between border-b border-sky-50 px-5 py-4 text-left transition hover:bg-sky-50 last:border-none"
        >

          <div>

            <div className="text-lg font-bold text-slate-800">
              {student.name}
            </div>

            <div className="mt-1 text-sm text-sky-700">
              {student.grade}학년 {student.class}반
            </div>

          </div>

          <div className="text-sky-400">
            ▶
          </div>

        </button>

      ))}

    </div>

  );

}

"use client";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Props = {
  student: any;
  onClose: () => void;
  refresh: () => void;
};

export default function AdminPanel({
  student,
  onClose,
  refresh,
}: Props) {

  if (!student) return null;

  // 학년 진급
  const levelUp = async () => {

    const ref = doc(db, "students", student.id);

    await updateDoc(ref, {
      grade: Number(student.grade || 1) + 1,
    });

    refresh();
  };

  // 반 변경
  const changeClass = async (newClass: number) => {

    const ref = doc(db, "students", student.id);

    await updateDoc(ref, {
      class: newClass,
    });

    refresh();
  };

  // 엽전 추가
  const addSilver = async () => {

    const ref = doc(db, "students", student.id);

    await updateDoc(ref, {
      silver: (student.silver || 0) + 1,
    });

    refresh();
  };

  const addBronze = async () => {

    const ref = doc(db, "students", student.id);

    await updateDoc(ref, {
      bronze: (student.bronze || 0) + 1,
    });

    refresh();
  };

  return (

    <div className="fixed top-0 right-0 w-[380px] h-full bg-[#0b0b0b] border-l border-[#333] p-5 z-50 shadow-2xl">

      {/* 헤더 */}

      <div className="flex justify-between items-center mb-6">

        <div className="text-xl font-bold">

          ⚙️ 학생 관리

        </div>

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >

          ✕

        </button>

      </div>

      {/* 학생 정보 */}

      <div className="mb-6">

        <div className="text-2xl font-bold mb-2">

          {student.name}

        </div>

        <div className="text-gray-400">

          {student.grade}학년 {student.class}반

        </div>

      </div>

      {/* 버튼 영역 */}

      <div className="space-y-4">

        {/* 진급 */}

        <button
          onClick={levelUp}
          className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-xl text-white font-bold"
        >

          ⬆️ 학년 진급

        </button>

        {/* 반 변경 */}

        <div className="bg-[#111] p-3 rounded-xl">

          <div className="text-sm text-gray-400 mb-2">
            반 변경
          </div>

          <div className="grid grid-cols-3 gap-2">

            {[1, 2, 3, 4, 5, 6].map((c) => (

              <button
                key={c}
                onClick={() =>
                  changeClass(c)
                }
                className={`py-2 rounded-lg ${
                  student.class === c
                    ? "bg-blue-600 text-white"
                    : "bg-[#222] text-gray-300 hover:bg-[#333]"
                }`}
              >

                {c}반

              </button>

            ))}

          </div>

        </div>

        {/* 엽전 */}

        <button
          onClick={addSilver}
          className="w-full bg-yellow-600 hover:bg-yellow-500 py-3 rounded-xl font-bold"
        >

          🥈 은엽전 +1
        </button>

        <button
          onClick={addBronze}
          className="w-full bg-orange-600 hover:bg-orange-500 py-3 rounded-xl font-bold"
        >

          🥇 동엽전 +1
        </button>

      </div>

    </div>

  );
}
"use client";

import { useSearchParams } from "next/navigation";

export default function StudentSearchPage() {

  const searchParams = useSearchParams();

  const school = searchParams.get("school");

  return (
    <main
      className="
        w-screen
        h-screen

        bg-sky-100

        flex
        flex-col
        items-center
        justify-center

        px-6
      "
    >

      {/* 제목 */}
      <h1
        className="
          text-4xl
          font-bold
          mb-8
        "
      >
        학생 검색
      </h1>

      {/* 학교명 */}
      <p
        className="
          text-2xl
          mb-10
        "
      >
        선택한 학교 :
        {" "}

        {school === "saesol" && "화성 새솔초"}

        {school === "haneul" && "김포 하늘빛초"}
      </p>

      {/* 검색창 */}
      <input
        type="text"
        placeholder="학생 이름 입력"

        className="
          w-full
          max-w-[400px]

          h-[70px]

          rounded-2xl

          px-6

          text-2xl

          border-2
          border-sky-300
        "
      />

    </main>
  );
}
"use client";

export default function StudentPage() {
  return (
    <main
      className="
        w-screen
        h-screen
        bg-black

        flex
        items-center
        justify-center

        px-6
      "
    >

      {/* 가운데 박스 */}
      <div className="w-full max-w-[500px]">

        {/* 제목 */}
        <h1
          className="
            text-white
            text-5xl
            font-bold
            text-center
            mb-10
          "
        >
          🏫 학교 선택
        </h1>

        {/* 학교 버튼 영역 */}
        <div className="flex flex-col gap-6">

          {/* 화성 새솔초 */}
          <button
            className="
              w-full
              h-[120px]

              rounded-[30px]

              bg-[#111]

              text-white
              text-3xl

              border
              border-gray-700

              active:scale-95
              transition-all
            "
          >
            화성 새솔초
          </button>

          {/* 김포 하늘빛초 */}
          <button
            className="
              w-full
              h-[120px]

              rounded-[30px]

              bg-[#111]

              text-white
              text-3xl

              border
              border-gray-700

              active:scale-95
              transition-all
            "
          >
            김포 하늘빛초
          </button>

        </div>

      </div>
    </main>
  );
}
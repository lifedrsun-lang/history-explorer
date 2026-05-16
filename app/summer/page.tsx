"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SummerPage() {

  const router = useRouter();

  useEffect(() => {

    localStorage.setItem(
      "previousMap",
      "/summer"
    );

  }, []);

  return (

    <main
      className="
        w-screen
        h-screen

        bg-black/50

        flex
        items-center
        justify-center

        p-6
      "
    >

      {/* 팝업 카드 */}
      <div
        className="
          bg-[#fffaf2]

          w-full
          max-w-[420px]

          rounded-[40px]

          shadow-[0_20px_80px_rgba(0,0,0,0.35)]

          border-[8px]
          border-[#ffd6e7]

          px-8
          py-10

          text-center

          relative
        "
      >

        {/* 로고 */}
        <div className="flex justify-center mb-6">

          <div
            className="
              w-[140px]
              h-[140px]

              rounded-full

              overflow-hidden

              border-4
              border-pink-200

              bg-white
            "
          >

            <Image
              src="/images/logo.png"
              alt="로고"
              width={300}
              height={300}
              className="w-full h-full object-cover"
            />

          </div>

        </div>

        {/* 제목 */}
        <h1
          className="
            text-[42px]
            font-bold
            text-[#5b4636]

            mb-4
          "
        >
          탐험 준비중
        </h1>

        {/* 설명 */}
        <p
          className="
            text-xl
            text-[#7b6855]

            leading-relaxed

            mb-10
          "
        >
          새로운 역사 탐험이
          <br />
          곧 열립니다!
        </p>

        {/* 확인 버튼 */}
        <button
          onClick={() => router.push("/")}
          className="
            w-full

            py-4

            rounded-2xl

            bg-pink-300

            text-2xl
            font-bold

            text-[#4a2e2e]

            shadow-lg

            transition-all

            active:scale-95
          "
        >
          확인
        </button>

      </div>

    </main>

  );
}
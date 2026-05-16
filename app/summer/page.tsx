"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SummerPage() {
  const router = useRouter();

  return (
    <main
      className="
        w-screen
        h-screen
        bg-black/40
        flex
        items-center
        justify-center
        p-4
      "
    >

      {/* 포스트잇 */}
      <div className="relative w-full max-w-[500px]">

        <Image
          src="/images/logo.png"
          alt="탐험 준비중"
          width={1000}
          height={1000}
          className="w-full h-auto"
        />

        {/* 확인 버튼 */}
        <button
          onClick={() => router.push("/")}
          className="
            absolute
            bottom-[8%]
            left-1/2
            -translate-x-1/2

            px-8
            py-3

            bg-pink-300
            text-black
            text-xl
            font-bold

            rounded-2xl

            active:scale-95
          "
        >
          확인
        </button>

      </div>
    </main>
  );
}
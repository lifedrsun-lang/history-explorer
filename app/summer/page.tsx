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
        min-h-[100dvh]
        relative
        overflow-hidden
      "
    >

      {/* 여름 배경 */}
      <Image
        src="/images/summer-map.png"
        alt="여름맵"
        fill
        priority
        className="object-cover"
      />

      {/* 교사 버튼 */}
      <button
        onClick={() =>
          router.push("/teacher")
        }
        className="
          absolute
          bottom-6
          right-6
          bg-blue-500
          text-white
          px-5
          py-3
          rounded-2xl
          font-bold
          z-50
        "
      >
        🏫 관리
      </button>

    </main>

  );

}
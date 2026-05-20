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

    // 중요: 기존 학교 선택 초기화
    localStorage.removeItem(
      "selectedSchool"
    );

  }, []);

  return (

    <main
      className="
        w-screen
        h-[100dvh]
        overflow-hidden
        flex
        items-center
        justify-center
      "
    >

      <div className="relative min-h-[100dvh] w-full">

        {/* 배경 */}
        <Image
          src="/images/summer-map.png"
          alt="여름맵"
          fill
          priority
          className="object-contain"
        />

        {/* 설정 */}
        <button
          onClick={() =>
            router.push("/teacher")
          }
          className="
            absolute
            top-[1%]
            right-[1%]
            w-[14%]
            h-[8%]
            z-30
          "
        />

        {/* 역사탐험대 */}
        <button
          onClick={() =>
            router.push("/student")
          }
          className="
            absolute
            top-[18%]
            left-[0%]
            w-[48%]
            h-[32%]
            z-20

            transition-all
            duration-150

            active:scale-110
            active:brightness-125
          "
        />

      </div>

    </main>

  );

}
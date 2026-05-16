"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SpringPage() {

  const router = useRouter();

  return (
    <main
      className="
        w-screen
        h-screen
        bg-sky-300
        overflow-hidden

        flex
        items-center
        justify-center
      "
    >

      {/* 봄맵 */}
      <div className="relative h-screen aspect-[9/16]">

        {/* 배경 */}
        <Image
          src="/images/spring-map.png"
          alt="봄맵"
          fill
          priority
          className="object-contain"
        />

        {/* 설정 버튼 */}
        <button
          onClick={() => router.push("/teacher")}
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
          onClick={() => router.push("/student")}
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
            active:shadow-[0_0_40px_rgba(255,255,255,0.9)]
          "
        />

        {/* 세계탐험대 */}
        <button
          onClick={() => router.push("/summer")}
          className="
            absolute
            top-[18%]
            right-[0%]

            w-[48%]
            h-[32%]

            z-20

            transition-all
            duration-150

            active:scale-110
            active:brightness-125
            active:shadow-[0_0_40px_rgba(255,255,255,0.9)]
          "
        />

        {/* 위인탐험대 */}
        <button
          onClick={() => router.push("/summer")}
          className="
            absolute
            top-[52%]
            left-[0%]

            w-[48%]
            h-[32%]

            z-20

            transition-all
            duration-150

            active:scale-110
            active:brightness-125
            active:shadow-[0_0_40px_rgba(255,255,255,0.9)]
          "
        />

        {/* 문화탐험대 */}
        <button
          onClick={() => router.push("/summer")}
          className="
            absolute
            top-[52%]
            right-[0%]

            w-[48%]
            h-[32%]

            z-20

            transition-all
            duration-150

            active:scale-110
            active:brightness-125
            active:shadow-[0_0_40px_rgba(255,255,255,0.9)]
          "
        />

      </div>

    </main>
  );
}
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HomePage() {
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

      {/* 메인맵 */}
      <div className="relative h-screen aspect-[9/16]">

        {/* 메인 이미지 */}
        <Image
          src="/images/main-seasons.png"
          alt="메인"
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

        {/* 봄 */}
        <button
          onClick={() => router.push("/spring")}
          className="
            absolute
            top-[20%]
            left-[0%]
            w-[48%]
            h-[30%]
            z-20

            transition-all
            duration-150

            active:scale-110
            active:brightness-125
            active:shadow-[0_0_40px_rgba(255,255,255,0.9)]
          "
        />

        {/* 여름 */}
        <button
          onClick={() => router.push("/summer")}
          className="
            absolute
            top-[20%]
            right-[0%]
            w-[48%]
            h-[30%]
            z-20

            transition-all
            duration-150

            active:scale-110
            active:brightness-125
            active:shadow-[0_0_40px_rgba(255,255,255,0.9)]
          "
        />

        {/* 가을 */}
        <button
          onClick={() => router.push("/autumn")}
          className="
            absolute
            top-[50%]
            left-[0%]
            w-[48%]
            h-[30%]
            z-20

            transition-all
            duration-150

            active:scale-110
            active:brightness-125
            active:shadow-[0_0_40px_rgba(255,255,255,0.9)]
          "
        />

        {/* 겨울 */}
        <button
          onClick={() => router.push("/winter")}
          className="
            absolute
            top-[50%]
            right-[0%]
            w-[48%]
            h-[30%]
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
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="w-full min-h-screen bg-sky-300 flex justify-center overflow-hidden">

      <div className="relative w-full max-w-[700px]">

        {/* 메인 이미지 */}
        <Image
          src="/images/main-seasons.png"
          alt="메인"
          width={1080}
          height={1920}
          priority
          className="w-full h-auto block"
        />

        {/* 설정 버튼 */}
        <button
          onClick={() => router.push("/teacher")}
          className="
            absolute
            top-[0%]
            right-[0%]
            w-[16%]
            h-[10%]
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
            z-10

            rounded-full

            transition-all
            duration-300

            hover:bg-white/10
            active:scale-95

            hover:shadow-[0_0_50px_rgba(255,255,255,0.9)]
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
            z-10

            rounded-full

            transition-all
            duration-300

            hover:bg-white/10
            active:scale-95

            hover:shadow-[0_0_50px_rgba(255,255,255,0.9)]
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
            z-10

            rounded-full

            transition-all
            duration-300

            hover:bg-white/10
            active:scale-95

            hover:shadow-[0_0_50px_rgba(255,255,255,0.9)]
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
            z-10

            rounded-full

            transition-all
            duration-300

            hover:bg-white/10
            active:scale-95

            hover:shadow-[0_0_50px_rgba(255,255,255,0.9)]
          "
        />

      </div>
    </main>
  );
}
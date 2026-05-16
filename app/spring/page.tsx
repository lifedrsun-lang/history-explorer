"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SpringPage() {
  const router = useRouter();

  return (
    <main className="w-full min-h-screen bg-sky-300 overflow-hidden">

      <div className="relative w-full max-w-[1000px] mx-auto">

        {/* 봄맵 */}
        <Image
          src="/images/spring-map.png"
          alt="봄맵"
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
            z-10

            active:scale-95
            transition-transform
            duration-150
          "
        />

        {/* 세계탐험대 */}
        <button
          onClick={() => router.push("/world")}
          className="
            absolute
            top-[18%]
            right-[0%]
            w-[48%]
            h-[32%]
            z-10

            active:scale-95
            transition-transform
            duration-150
          "
        />

        {/* 위인탐험대 */}
        <button
          onClick={() => router.push("/hero")}
          className="
            absolute
            top-[52%]
            left-[0%]
            w-[48%]
            h-[32%]
            z-10

            active:scale-95
            transition-transform
            duration-150
          "
        />

        {/* 문화탐험대 */}
        <button
          onClick={() => router.push("/culture")}
          className="
            absolute
            top-[52%]
            right-[0%]
            w-[48%]
            h-[32%]
            z-10

            active:scale-95
            transition-transform
            duration-150
          "
        />

      </div>
    </main>
  );
}
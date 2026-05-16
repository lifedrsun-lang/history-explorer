"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="w-full min-h-screen bg-sky-300 flex justify-center overflow-hidden">

      {/* 전체 컨테이너 */}
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

        {/* 봄 섬 */}
        <button
          onClick={() => router.push("/spring")}
          className="absolute top-[28%] left-[2%] w-[46%] h-[24%]"
        />

        {/* 여름 섬 */}
        <button
          onClick={() => alert("준비중")}
          className="absolute top-[28%] right-[2%] w-[46%] h-[24%]"
        />

        {/* 가을 섬 */}
        <button
          onClick={() => alert("준비중")}
          className="absolute top-[54%] left-[2%] w-[46%] h-[24%]"
        />

        {/* 겨울 섬 */}
        <button
          onClick={() => alert("준비중")}
          className="absolute top-[54%] right-[2%] w-[46%] h-[24%]"
        />

      </div>
    </main>
  );
}
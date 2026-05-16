"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="w-full min-h-screen bg-sky-300 flex justify-center">

      <div className="relative w-full max-w-[500px]">

        {/* 메인 이미지 */}
        <Image
          src="/images/main-seasons.png"
          alt="메인"
          width={1536}
          height={1024}
          priority
          className="w-full h-auto"
        />

        {/* 봄 */}
        <button
          onClick={() => router.push("/spring")}
          className="absolute top-[48%] left-[8%] w-[35%] h-[18%]"
        />

        {/* 여름 */}
        <button
          onClick={() => alert("준비중")}
          className="absolute top-[48%] right-[8%] w-[35%] h-[18%]"
        />

        {/* 가을 */}
        <button
          onClick={() => alert("준비중")}
          className="absolute bottom-[7%] left-[8%] w-[35%] h-[18%]"
        />

        {/* 겨울 */}
        <button
          onClick={() => alert("준비중")}
          className="absolute bottom-[7%] right-[8%] w-[35%] h-[18%]"
        />

      </div>
    </main>
  );
}
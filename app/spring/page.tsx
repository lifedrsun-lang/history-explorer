"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SpringPage() {
  const router = useRouter();

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">

      {/* 봄 배경 */}
      <Image
        src="/images/spring-map.png"
        alt="봄맵"
        fill
        priority
        className="object-cover"
      />

      {/* 역사탐험대 */}
      <button
        onClick={() => router.push("/student")}
        className="absolute top-[48%] left-[18%] w-[22%] h-[22%]"
      />

      {/* 세계탐험대 */}
      <button
        onClick={() => alert("준비중")}
        className="absolute top-[48%] left-[58%] w-[22%] h-[22%]"
      />

      {/* 위인탐험대 */}
      <button
        onClick={() => alert("준비중")}
        className="absolute top-[74%] left-[18%] w-[22%] h-[22%]"
      />

      {/* 문화탐험대 */}
      <button
        onClick={() => alert("준비중")}
        className="absolute top-[74%] left-[58%] w-[22%] h-[22%]"
      />

    </main>
  );
}
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SpringPage() {
  const router = useRouter();

  return (
    <main className="w-full min-h-screen bg-sky-300 flex justify-center overflow-hidden">

      <div className="relative w-full max-w-[700px]">

        {/* 봄맵 */}
        <Image
          src="/images/spring-map.png"
          alt="봄맵"
          width={1080}
          height={1920}
          priority
          className="w-full h-auto block"
        />

        {/* 역사탐험대 */}
        <button
          onClick={() => router.push("/student")}
          className="absolute top-[22%] left-[2%] w-[46%] h-[28%]"
        />

        {/* 세계탐험대 */}
        <button
          onClick={() => router.push("/world")}
          className="absolute top-[22%] right-[2%] w-[46%] h-[28%]"
        />

        {/* 위인탐험대 */}
        <button
          onClick={() => router.push("/hero")}
          className="absolute top-[56%] left-[2%] w-[46%] h-[28%]"
        />

        {/* 문화탐험대 */}
        <button
          onClick={() => router.push("/culture")}
          className="absolute top-[56%] right-[2%] w-[46%] h-[28%]"
        />

      </div>
    </main>
  );
}
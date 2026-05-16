"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SpringPage() {
  const router = useRouter();

  return (
    <main className="w-full min-h-screen bg-sky-300 flex justify-center">

      <div className="relative w-full max-w-[500px]">

        {/* 봄맵 */}
        <Image
          src="/images/spring-map.png"
          alt="봄맵"
          width={1536}
          height={1024}
          priority
          className="w-full h-auto"
        />

        {/* 역사탐험대 */}
        <button
          onClick={() => router.push("/student")}
          className="absolute top-[38%] left-[6%] w-[40%] h-[22%]"
        />

        {/* 세계탐험대 */}
        <button
          onClick={() => router.push("/world")}
          className="absolute top-[38%] right-[6%] w-[40%] h-[22%]"
        />

        {/* 위인탐험대 */}
        <button
          onClick={() => router.push("/hero")}
          className="absolute bottom-[5%] left-[6%] w-[40%] h-[22%]"
        />

        {/* 문화탐험대 */}
        <button
          onClick={() => router.push("/culture")}
          className="absolute bottom-[5%] right-[6%] w-[40%] h-[22%]"
        />

      </div>
    </main>
  );
}
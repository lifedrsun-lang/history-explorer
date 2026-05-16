"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      
      {/* 배경 이미지 */}
      <Image
        src="/images/main-seasons.png"
        alt="메인"
        fill
        priority
        className="object-cover"
      />

      {/* 클릭 영역 */}
      
      {/* 봄 */}
      <button
        onClick={() => router.push("/spring")}
        className="absolute top-[52%] left-[18%] w-[18%] h-[18%]"
      />

      {/* 여름 */}
      <button
        onClick={() => router.push("/summer")}
        className="absolute top-[52%] left-[63%] w-[18%] h-[18%]"
      />

      {/* 가을 */}
      <button
        onClick={() => router.push("/autumn")}
        className="absolute top-[77%] left-[18%] w-[18%] h-[18%]"
      />

      {/* 겨울 */}
      <button
        onClick={() => router.push("/winter")}
        className="absolute top-[77%] left-[63%] w-[18%] h-[18%]"
      />
    </main>
  );
}
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SpringPage() {

  const router = useRouter();

  const [showPopup, setShowPopup] =
    useState(false);

  useEffect(() => {

    localStorage.setItem(
      "previousMap",
      "/spring"
    );

  }, []);

  return (

    <main
      className="
        w-screen
        h-[100dvh]
        bg-sky-300
        overflow-hidden

        flex
        items-center
        justify-center
      "
    >

      {/* 봄맵 */}
      <div className="relative min-h-[100dvh] w-full">

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
          onClick={() => setShowPopup(true)}
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
          onClick={() => setShowPopup(true)}
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
          onClick={() => setShowPopup(true)}
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
          onClick={() => setShowPopup(true)}
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

        {/* 1분기 수업 종료 팝업 */}
        {showPopup && (

          <div
            onClick={() =>
              setShowPopup(false)
            }
            className="
              absolute
              inset-0
              bg-black/50
              z-50

              flex
              items-center
              justify-center
            "
          >

            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              className="
                bg-white
                rounded-[32px]
                p-8
                w-[85%]
                max-w-[400px]
                text-center
                shadow-2xl
              "
            >

              <div className="text-6xl mb-4">
                🌸
              </div>

              <h2
                className="
                  text-3xl
                  font-bold
                  text-black
                  mb-3
                "
              >
                1분기 수업 종료
              </h2>

              <p
                className="
                  text-gray-600
                  mb-6
                "
              >
                봄 탐험은 종료되었습니다.
                <br />
                다음 분기를 기다려 주세요.
              </p>

              <button
                onClick={() =>
                  setShowPopup(false)
                }
                className="
                  w-full
                  py-3
                  rounded-2xl

                  bg-red-500
                  text-white
                  font-bold
                "
              >
                확인
              </button>

            </div>

          </div>

        )}

      </div>

    </main>

  );

}
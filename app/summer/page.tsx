"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SummerPage() {
  const router = useRouter();

  const [showSchoolList, setShowSchoolList] =
    useState(false);

  useEffect(() => {
    localStorage.setItem(
      "previousMap",
      "/summer"
    );
  }, []);

  const schools = [
    "김포 하늘빛초",
    "김포 사우초",
    "화성 새솔초",
    "홈플러스 문화센터",
    "이마트 문화센터",
  ];

  return (
    <main
      className="
        w-screen
        h-[100dvh]
        overflow-hidden
        flex
        items-center
        justify-center
      "
    >
      {/* 여름맵 */}
      <div className="relative min-h-[100dvh] w-full">

        {/* 배경 */}
        <Image
          src="/images/summer-map.png"
          alt="여름맵"
          fill
          priority
          className="object-contain"
        />

        {/* 설정 버튼 */}
        <button
          onClick={() =>
            router.push("/teacher")
          }
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
          onClick={() =>
            setShowSchoolList(true)
          }
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
          onClick={() =>
            router.push("/summer")
          }
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
          onClick={() =>
            router.push("/summer")
          }
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
          onClick={() =>
            router.push("/summer")
          }
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

        {/* 학교 목록 팝업 */}
        {showSchoolList && (
          <div
            onClick={() =>
              setShowSchoolList(false)
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
                rounded-3xl
                p-6
                w-[85%]
                max-w-[400px]
              "
            >
              <h2 className="text-xl font-bold text-center mb-5">
                🏫 학교 목록
              </h2>

              <div className="space-y-3">
                {schools.map(
                  (school) => (
                    <button
                      key={school}
                      onClick={() => {
                        localStorage.setItem(
                          "selectedSchool",
                          school
                        );

                        router.push(
                          "/student"
                        );
                      }}
                      className="
                        w-full
                        py-3
                        rounded-xl
                        bg-gray-100
                      "
                    >
                      {school}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() =>
                  setShowSchoolList(false)
                }
                className="
                  mt-5
                  w-full
                  py-3
                  rounded-xl
                  bg-red-500
                  text-white
                  font-bold
                "
              >
                닫기
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
"use client";

export default function LoadingSpinner() {

  return (

    <div className="min-h-[300px] flex flex-col items-center justify-center text-white">

      {/* 스피너 */}

      <div className="relative w-20 h-20 mb-6">

        <div className="absolute inset-0 border-4 border-[#333] rounded-full"></div>

        <div className="absolute inset-0 border-4 border-t-yellow-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>

      </div>

      {/* 텍스트 */}

      <div className="text-2xl font-bold text-gray-300">

        탐험 데이터를 불러오는 중...

      </div>

      <div className="text-sm text-gray-500 mt-2">

        잠시만 기다려 주세요

      </div>

    </div>

  );
}
"use client";

export default function LoadingSpinner() {

  return (

    <div
      className="
        w-screen
        h-screen

        bg-black

        flex
        items-center
        justify-center
      "
    >

      <div
        className="
          text-white
          text-3xl
          font-bold

          animate-pulse
        "
      >
        불러오는 중...
      </div>

    </div>

  );

}
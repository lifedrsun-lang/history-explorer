"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const menus = [
    {
      title: "역사탐험대",
      icon: "🏺",
      path: "/student",
    },
    {
      title: "세계탐험대",
      icon: "🌍",
      path: "/world",
    },
    {
      title: "위인탐험대",
      icon: "👑",
      path: "/hero",
    },
    {
      title: "문화탐험대",
      icon: "🎭",
      path: "/culture",
    },
  ];

  return (
    <main
      className="
        min-h-screen
        bg-cover
        bg-center
        bg-no-repeat
        flex
        items-start
        justify-center
        px-5
        pt-52
        pb-10
      "
      style={{
        backgroundImage: "url('/map-bg.png')",
      }}
    >
      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* 탐험대 버튼 */}
        {menus.map((menu) => (
          <button
            key={menu.title}
            onClick={() => router.push(menu.path)}
            className="
              bg-[#f5ecd6]/88
              backdrop-blur-sm
              border-2
              border-[#9b7a4c]
              rounded-[32px]
              px-5
              py-4
              text-left
              shadow-lg
              active:scale-95
              transition
            "
          >
            <div className="flex items-center gap-3">

              <div className="text-3xl">
                {menu.icon}
              </div>

              <h2
                className="
                  text-2xl
                  font-extrabold
                  text-[#3d2b1f]
                  tracking-tight
                "
              >
                {menu.title}
              </h2>
            </div>
          </button>
        ))}

        {/* 교사용 */}
        <button
          onClick={() => router.push("/teacher")}
          className="
            mt-2
            bg-black/65
            backdrop-blur-sm
            border-2
            border-[#d0d0d0]
            rounded-[32px]
            px-5
            py-4
            text-left
            shadow-lg
            active:scale-95
            transition
          "
        >
          <div className="flex items-center gap-3">

            <div className="text-3xl">
              🛡
            </div>

            <h2
              className="
                text-2xl
                font-extrabold
                text-white
                tracking-tight
              "
            >
              교사용 관리
            </h2>
          </div>
        </button>
      </div>
    </main>
  );
}
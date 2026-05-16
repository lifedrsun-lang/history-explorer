"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const menus = [
    {
      title: "역사탐험대",
      icon: "🏺",
      path: "/history",
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
        items-center
        justify-center
        px-6
        py-10
      "
      style={{
        backgroundImage: "url('/map-bg.png')",
      }}
    >
      <div className="w-full max-w-md flex flex-col gap-5">
        {menus.map((menu) => (
          <button
            key={menu.title}
            onClick={() => router.push(menu.path)}
            className="
              bg-[#f5e8c7]/90
              border-2
              border-[#8b6b3f]
              rounded-3xl
              p-5
              text-left
              shadow-xl
              active:scale-95
              transition
            "
          >
            <div className="text-4xl mb-2">
              {menu.icon}
            </div>

            <h2 className="text-3xl font-bold text-[#3a2a17]">
              {menu.title}
            </h2>
          </button>
        ))}

        {/* 교사용 */}
        <button
          onClick={() => router.push("/teacher")}
          className="
            bg-[#2e2e2e]/90
            border-2
            border-[#b8b8b8]
            rounded-3xl
            p-5
            text-left
            shadow-xl
            active:scale-95
            transition
          "
        >
          <div className="text-4xl mb-2">🛡</div>

          <h2 className="text-3xl font-bold text-white">
            교사용 관리
          </h2>
        </button>
      </div>
    </main>
  );
}
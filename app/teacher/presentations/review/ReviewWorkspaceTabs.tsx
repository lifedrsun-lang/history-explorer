"use client";

import { useEffect, useState } from "react";

type ReviewWorkspaceMode = "create" | "distribute" | "results";

const MODES: Array<{
  value: ReviewWorkspaceMode;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    value: "create",
    icon: "✏️",
    title: "문제 만들기",
    description: "새 문제 등록·기존 문제 수정",
  },
  {
    value: "distribute",
    icon: "📨",
    title: "문제 배포하기",
    description: "문제 선택 후 학생에게 배포",
  },
  {
    value: "results",
    icon: "📊",
    title: "결과",
    description: "학생별 점수·오답 분석",
  },
];

export default function ReviewWorkspaceTabs() {
  const [mode, setMode] = useState<ReviewWorkspaceMode>("create");

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button || String(button.textContent || "").trim() !== "수정") return;

      const editor = document.getElementById("review-question-editor");
      const bankSection = editor?.nextElementSibling?.querySelector("section:first-child");
      if (bankSection?.contains(button)) {
        setMode("create");
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return (
    <div
      id="review-workspace-tabs"
      data-mode={mode}
      className="bg-[#f5f7fb] px-3 pt-3 md:px-5 md:pt-5"
    >
      <div className="mx-auto max-w-7xl rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm md:p-4">
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((item) => {
            const active = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={`rounded-2xl border px-2 py-3 text-center transition md:px-4 md:py-4 ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white shadow-md"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="text-xl md:text-2xl">{item.icon}</div>
                <div className="mt-1 text-xs font-black md:text-base">{item.title}</div>
                <div className={`mt-1 hidden text-xs font-bold md:block ${active ? "text-blue-100" : "text-slate-400"}`}>
                  {item.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

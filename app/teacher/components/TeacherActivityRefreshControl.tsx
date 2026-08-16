"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { STUDENT_ACTIVITY_REFRESH_EVENT } from "./StudentActivityBadges";

export default function TeacherActivityRefreshControl() {
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  if (pathname !== "/teacher/students") {
    return null;
  }

  const refresh = () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    window.dispatchEvent(new Event(STUDENT_ACTIVITY_REFRESH_EVENT));

    window.setTimeout(() => {
      setRefreshing(false);
    }, 900);
  };

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={refreshing}
      className="fixed bottom-4 right-4 z-[70] rounded-2xl border border-sky-200 bg-white px-4 py-3 text-xs font-black text-sky-700 shadow-xl disabled:opacity-60 sm:text-sm"
      title="과제와 복습 완료 현황을 다시 불러옵니다."
    >
      {refreshing ? "↻ 확인 중..." : "↻ 과제·복습 새로고침"}
    </button>
  );
}

"use client";

import { useState } from "react";

type Props = { schoolSlug: string; classroomId: string; getTeacherToken: () => Promise<string> };

export default function ClassroomLockoutResetButton({ schoolSlug, classroomId, getTeacherToken }: Props) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function reset() {
    if (pending) return;
    setPending(true);
    setMessage("");
    setFailed(false);
    try {
      const token = await getTeacherToken();
      const response = await fetch(`/api/classroom/schools/${encodeURIComponent(schoolSlug)}/lockout-reset/${encodeURIComponent(classroomId)}`, {
        method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || data.reset !== true) throw new Error(data.error || "잠금 해제를 처리하지 못했어요.");
      setMessage("해제했어요. 학생 화면에서 몬스터 비밀번호를 다시 선택해 주세요.");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "잠금 해제를 처리하지 못했어요.");
    } finally { setPending(false); }
  }
  return <div className="mt-3 rounded-xl border border-sky-100 bg-white p-3">
    <button type="button" disabled={pending} onClick={() => void reset()} className="rounded-xl bg-sky-100 px-3 py-2 text-xs font-black text-sky-800 disabled:opacity-50">
      {pending ? "해제 중…" : "🔓 10분 잠금 해제"}
    </button>
    <p className="mt-2 text-[11px] font-bold text-slate-500">이 반에서 몬스터 비밀번호를 틀려 잠긴 모든 기기의 대기시간을 초기화합니다.</p>
    <p className="mt-1 text-[11px] font-bold text-slate-500">학생 화면은 자동으로 반영되며, ‘선생님 잠금 해제 확인’을 눌러 바로 확인할 수도 있어요.</p>
    {message && <p role="status" className={`mt-2 text-xs font-bold ${failed ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>}
  </div>;
}

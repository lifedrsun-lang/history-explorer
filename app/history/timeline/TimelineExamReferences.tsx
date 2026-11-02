"use client";

export type ExamReference = {
  examRound: string;
  examLevel: "basic" | "advanced";
  examQuestionNumber: string;
  relation: "answer" | "context";
};

export default function TimelineExamReferences({ refs }: { refs: ExamReference[] }) {
  if (!refs.length) return null;
  const answer = refs.filter(ref => ref.relation === "answer");
  const context = refs.filter(ref => ref.relation === "context");
  return (
    <details className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-slate-800">
      <summary className="cursor-pointer text-xs font-black leading-6 text-emerald-900">
        ♣ 한능검 정답 {answer.length}문항 · 관련 {context.length}문항 ▾
      </summary>
      <div className="mt-2 space-y-1 border-t border-emerald-200 pt-2">
        {refs.map(ref => (
          <p className="text-xs font-bold leading-5" key={`${ref.examLevel}:${ref.examRound}:${ref.examQuestionNumber}`}>
            {ref.relation === "answer" ? "⭐ 정답 출제" : "📖 지문·선택지 관련"}
            {" · "}제{ref.examRound}회{" · "}
            {ref.examLevel === "advanced" ? "심화" : "기본"}
            {" · "}{ref.examQuestionNumber}번
          </p>
        ))}
        <p className="pt-1 text-[11px] text-slate-600">
          문제은행에 저장된 분류 기준이며, 기출 원문은 문제은행에서 확인합니다.
        </p>
      </div>
    </details>
  );
}

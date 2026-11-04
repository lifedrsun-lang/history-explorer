"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { auth } from "@/lib/firebase";

export type ExamReference = {
  questionId: string;
  examRound: string;
  examLevel: "basic" | "advanced";
  examQuestionNumber: string;
  relation: "answer" | "context";
};

type QuestionPreview = {
  examRound: string;
  examLevel: "basic" | "advanced";
  examQuestionNumber: string;
  imageUrl: string;
  hasStoredImage: boolean;
  prompt: string;
  options: string[];
};

const label = (ref: ExamReference) =>
  `${ref.examLevel === "advanced" ? "심화" : "기본"} ${ref.examRound}회 ${ref.examQuestionNumber}번`;

export default function TimelineExamReferences({ refs, eventId }: {
  refs: ExamReference[];
  eventId: string;
}) {
  const [selected, setSelected] = useState<ExamReference | null>(null);
  const [question, setQuestion] = useState<QuestionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  if (!refs.length) return null;
  const answer = refs.filter(ref => ref.relation === "answer");
  const context = refs.filter(ref => ref.relation === "context");

  const openQuestion = async (ref: ExamReference) => {
    setSelected(ref);
    setQuestion(null);
    setError("");
    setLoading(true);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const params = new URLSearchParams({ id: ref.questionId, eventId });
      const response = await fetch(`/api/history/timeline/question?${params}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "원본 문제를 불러오지 못했습니다.");
      setQuestion(data as QuestionPreview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "원본 문제를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <details className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-slate-800">
        <summary className="cursor-pointer text-xs font-black leading-6 text-emerald-900">
          ♣ 한능검 정답 {answer.length}문항 · 관련 {context.length}문항 ▾
        </summary>
        <div className="mt-2 space-y-2 border-t border-emerald-200 pt-2">
          {refs.map(ref => (
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold leading-5"
              key={`${ref.examLevel}:${ref.examRound}:${ref.examQuestionNumber}`}>
              <span className="text-slate-600">
                {ref.relation === "answer" ? "⭐ 정답 출제" : "📖 관련 출제"}
              </span>
              <button type="button" onClick={() => void openQuestion(ref)}
                className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-black text-emerald-800 underline underline-offset-2 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                aria-label={`${label(ref)} 원본 문제 팝업 열기`}>
                {label(ref)} ↗
              </button>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-slate-600">
            회차·문항을 누르면 문제은행에 보관된 원본 문제가 팝업으로 열립니다.
          </p>
        </div>
      </details>

      {selected && typeof document !== "undefined" && createPortal(
        <div role="presentation"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/65 p-3 sm:p-6"
          onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-label={`${label(selected)} 원본 문제`}
            className="flex max-h-[93vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{label(selected)}</h3>
                <p className="text-xs font-bold text-emerald-700">
                  {selected.relation === "answer" ? "⭐ 정답 직접 출제" : "📖 지문·선택지 관련 출제"} · 문제은행 원본
                </p>
              </div>
              <button type="button" autoFocus onClick={() => setSelected(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-black text-slate-700"
                aria-label="문제 팝업 닫기">✕ 닫기</button>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              {loading && <p role="status" className="py-10 text-center text-sm font-bold">원본 문제를 불러오고 있습니다.</p>}
              {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
              {question && (
                <div className="space-y-4">
                  {question.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={question.imageUrl} alt={`${label(selected)} 기출문제 원본 이미지`}
                      className="mx-auto h-auto w-full max-w-full rounded-lg border border-slate-200 object-contain" />
                  ) : (
                    <>
                      {question.prompt && <p className="whitespace-pre-wrap text-base font-bold leading-7 text-slate-900">{question.prompt}</p>}
                      {question.options.filter(Boolean).length > 0 && (
                        <ol className="space-y-3">
                          {question.options.map((option, index) =>
                            <li key={index} className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6">
                              {["①", "②", "③", "④", "⑤"][index]} {option}
                            </li>)}
                        </ol>
                      )}
                      {!question.prompt && !question.options.some(Boolean) && (
                        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                          문제은행에 표시 가능한 원본 이미지 또는 텍스트가 없습니다.
                        </p>
                      )}
                      {question.hasStoredImage && (
                        <p className="text-xs text-amber-800">
                          등록된 원본 이미지의 열람 주소를 생성하지 못했습니다. 교사 화면에서 이미지를 확인해 주세요.
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-xs text-slate-500">
                    문제는 원본 문제은행에서 불러오며, 여기서 학생의 풀이·정답 기록은 변경되지 않습니다.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>, document.body
      )}
    </>
  );
}

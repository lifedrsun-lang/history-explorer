"use client";

import { useState, type FormEvent } from "react";
import type { ContractSchoolConfig } from "@/lib/contractSchools";

type Props = {
  school: ContractSchoolConfig;
  saving: boolean;
  operatingPlanUrl: string;
  onSave: (categories: string[], operatingPlanUrl: string) => Promise<boolean>;
};

const parseCategories = (input: string) =>
  Array.from(
    new Set(
      input
        .split(/[,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

export default function SchoolCategoryEditor({ school, saving, operatingPlanUrl, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [planUrlInput, setPlanUrlInput] = useState("");
  const [error, setError] = useState("");

  const categories = parseCategories(input);

  const openEditor = () => {
    setInput((school.categories || []).join("\n"));
    setPlanUrlInput(operatingPlanUrl);
    setError("");
    setOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (categories.length > 20 || categories.some((item) => item.length > 40)) {
      setError("카테고리는 최대 20개, 각 40자 이내로 입력해 주세요.");
      return;
    }
    const normalizedPlanUrl = planUrlInput.trim();
    if (normalizedPlanUrl) {
      try {
        const url = new URL(normalizedPlanUrl);
        if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
          throw new Error("invalid_operating_plan_url");
        }
      } catch {
        setError("운영계획서 링크는 https://로 시작하는 올바른 주소를 입력해 주세요.");
        return;
      }
    }
    setError("");
    if (await onSave(categories, normalizedPlanUrl)) setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        disabled={saving}
        aria-label={`${school.displayName} 수업 카테고리 및 운영계획서 수정`}
        className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
      >
        ✏️ 수정
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-label={`${school.displayName} 수업 정보 수정`}
            onSubmit={(event) => void handleSave(event)}
            className="w-full max-w-md rounded-3xl bg-white p-5 text-left shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900">수업 정보 수정</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">{school.displayName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                aria-label="닫기"
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            <label htmlFor={`school-categories-${school.slug}`} className="mt-5 block text-sm font-black text-slate-700">
              수업 분야
            </label>
            <textarea
              id={`school-categories-${school.slug}`}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setError("");
              }}
              rows={5}
              maxLength={820}
              placeholder={"관계개선\n에너지교육"}
              className="mt-2 w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
            />
            <p className="mt-1 text-xs text-slate-500">한 줄에 하나씩 또는 쉼표로 구분해 주세요. 차시별 내용은 적지 않아도 됩니다.</p>
            {categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {categories.map((category) => (
                  <span key={category} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{category}</span>
                ))}
              </div>
            )}
            <label htmlFor={`school-plan-url-${school.slug}`} className="mt-5 block text-sm font-black text-slate-700">
              운영계획서 링크
            </label>
            <input
              id={`school-plan-url-${school.slug}`}
              type="url"
              value={planUrlInput}
              onChange={(event) => {
                setPlanUrlInput(event.target.value);
                setError("");
              }}
              maxLength={2048}
              placeholder="https://docs.google.com/document/d/..."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
            />
            <p className="mt-1 text-xs text-slate-500">학교별로 저장됩니다. 링크를 비우고 저장하면 이 학교의 운영계획서 버튼을 숨깁니다.</p>
            {error && <p role="alert" className="mt-3 text-xs font-bold text-rose-600">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={saving} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50">취소</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

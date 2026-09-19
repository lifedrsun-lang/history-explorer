"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { ContractSchoolConfig } from "@/lib/contractSchools";
import type { SchoolDocumentListItem } from "@/lib/schoolDocuments";

type SchoolDocumentsPanelProps = {
  school: ContractSchoolConfig;
  user: User;
};

const formatDateTime = (value: string) => {
  if (!value) return "기록 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const statusClass = (status: SchoolDocumentListItem["status"]) => {
  if (status === "submitted") return "bg-emerald-100 text-emerald-700";
  if (status === "generated") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
};

export default function SchoolDocumentsPanel({
  school,
  user,
}: SchoolDocumentsPanelProps) {
  const [documents, setDocuments] = useState<SchoolDocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/teacher/school-documents?schoolSlug=${encodeURIComponent(school.slug)}`,
        {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        documents?: SchoolDocumentListItem[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "load_failed");
      setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
    } catch {
      setErrorMessage("제출서류 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [school.slug, user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDocuments(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDocuments]);

  useEffect(() => {
    const refreshOnFocus = () => void loadDocuments();
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [loadDocuments]);

  const applicationDocumentsUrl = `/teacher/application-documents?schoolSlug=${encodeURIComponent(school.slug)}`;
  const atcDocumentsUrl = `/teacher/atc-confirmations?school=${encodeURIComponent(school.schoolName)}&schoolSlug=${encodeURIComponent(school.slug)}`;

  return (
    <section className="rounded-[28px] border border-indigo-100 bg-white p-5 shadow-lg sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-black text-indigo-500">제출서류</div>
          <h3 className="mt-1 text-xl font-black text-slate-900">
            학교별 서류함 <span className="text-indigo-500">{documents.length}</span>
          </h3>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
            다른 메뉴에서 만든 문서 기록을 이 학교카드에 모아 보여줍니다. 현재 PDF 원본은 서버에 저장하지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={atcDocumentsUrl}
            target="_blank"
            className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700"
          >
            + ATC 참여확인서
          </Link>
          <Link
            href={applicationDocumentsUrl}
            target="_blank"
            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white"
          >
            + 필수 동의서
          </Link>
          <button
            type="button"
            onClick={() => void loadDocuments()}
            disabled={loading}
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50"
          >
            {loading ? "불러오는 중" : "새로고침"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
          {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && documents.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 px-5 py-8 text-center">
          <div className="text-sm font-black text-slate-700">아직 연결된 제출서류가 없어요.</div>
          <div className="mt-1 text-xs font-bold text-slate-500">
            위 버튼으로 문서를 만들거나 기존 ATC 참여확인서를 저장하면 여기에 표시됩니다.
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-5 space-y-3">
          {documents.map((document) => (
            <article
              key={document.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                      {document.kindLabel}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(document.status)}`}>
                      {document.statusLabel}
                    </span>
                    {document.periodLabel && (
                      <span className="text-xs font-black text-slate-500">{document.periodLabel}</span>
                    )}
                  </div>
                  <h4 className="mt-2 truncate text-sm font-black text-slate-900 sm:text-base">
                    {document.title}
                  </h4>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400">
                    <span>생성 {formatDateTime(document.createdAt)}</span>
                    <span>수정 {formatDateTime(document.updatedAt)}</span>
                    <span>{document.fileAvailabilityLabel}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={document.previewUrl}
                    target="_blank"
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200"
                  >
                    보기 · 미리보기
                  </Link>
                  {document.fileAvailability === "browser-print" && (
                    <Link
                      href={document.previewUrl}
                      target="_blank"
                      title="문서 화면을 연 뒤 인쇄 창에서 PDF로 저장합니다."
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                    >
                      PDF 저장 화면
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SchoolDocumentListItem } from "@/lib/schoolDocuments";
import type { SchoolDocumentSchool } from "@/lib/schoolDocumentSchools";
import {
  SCHOOL_DOCUMENT_STATUS_LABELS,
  SCHOOL_DOCUMENT_CHANNEL_LABELS,
  type SchoolDocumentSettings,
  type SchoolDocumentSubmissionHistoryItem,
} from "@/lib/schoolDocumentManagement";

type SchoolDocumentsPanelProps = {
  school: SchoolDocumentSchool;
  user: User;
  onSettingsChange?: (settings: SchoolDocumentSettings) => void;
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

const baseDocumentTitles = [
  "성범죄 경력 및 아동학대관련범죄 전력 조회 동의서",
  "행정정보 공동이용 사전동의서",
];

export default function SchoolDocumentsPanel({
  school,
  user,
  onSettingsChange,
}: SchoolDocumentsPanelProps) {
  const [documents, setDocuments] = useState<SchoolDocumentListItem[]>([]);
  const [settings, setSettings] = useState<SchoolDocumentSettings | null>(null);
  const [draft, setDraft] = useState<SchoolDocumentSettings | null>(null);
  const [history, setHistory] = useState<SchoolDocumentSubmissionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const requestJson = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await user.getIdToken();
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "요청을 처리하지 못했습니다.");
      return payload;
    },
    [user]
  );

  const loadDocuments = useCallback(async (preserveDraft = false) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const slug = encodeURIComponent(school.slug);
      const [documentPayload, managementPayload] = await Promise.all([
        requestJson(`/api/teacher/school-documents?schoolSlug=${slug}`),
        requestJson(`/api/teacher/school-document-submissions?schoolSlug=${slug}`),
      ]);
      const nextSettings = managementPayload.settings as SchoolDocumentSettings;
      setDocuments(
        Array.isArray(documentPayload.documents) ? documentPayload.documents : []
      );
      setSettings(nextSettings);
      setDraft((current) => preserveDraft ? current || nextSettings : nextSettings);
      setHistory(
        Array.isArray(managementPayload.history) ? managementPayload.history : []
      );
      onSettingsChange?.(nextSettings);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "제출서류 정보를 불러오지 못했어요."
      );
    } finally {
      setLoading(false);
    }
  }, [onSettingsChange, requestJson, school.slug]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDocuments(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDocuments]);

  useEffect(() => {
    const refreshOnFocus = () => void loadDocuments(true);
    const refreshOnSubmission = (event: StorageEvent) => {
      if (event.key !== "sunlab-school-documents:v1" || !event.newValue) return;
      try { if (JSON.parse(event.newValue).schoolSlug === school.slug) void loadDocuments(true); } catch { /* Ignore unrelated or invalid storage values. */ }
    };
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("storage", refreshOnSubmission);
    return () => { window.removeEventListener("focus", refreshOnFocus); window.removeEventListener("storage", refreshOnSubmission); };
  }, [loadDocuments, school.slug]);

  const saveSettings = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setNotice("");
    setErrorMessage("");
    try {
      const payload = await requestJson("/api/teacher/school-document-settings", {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      const nextSettings = payload.settings as SchoolDocumentSettings;
      setSettings(nextSettings);
      setDraft(nextSettings);
      onSettingsChange?.(nextSettings);
      setNotice("담당자와 제출 정보를 저장했어요.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  const markGenerated = async () => {
    if (saving) return;
    setSaving(true);
    setNotice("");
    setErrorMessage("");
    try {
      const payload = await requestJson("/api/teacher/school-document-submissions", {
        method: "POST",
        body: JSON.stringify({ action: "generated", schoolSlug: school.slug }),
      });
      const nextSettings = payload.settings as SchoolDocumentSettings;
      setSettings(nextSettings);
      setDraft(nextSettings);
      onSettingsChange?.(nextSettings);
      setNotice("작성/발급 완료 상태로 표시했어요.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "상태를 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  const configuredDocumentTitles = useMemo(
    () =>
      settings
        ? Array.from(
            new Set([
              ...(settings.processingMethod === "direct"
                ? ["성범죄경력 및 아동학대 범죄전력 조회 회신서"]
                : baseDocumentTitles),
              ...settings.additionalRequiredDocuments,
            ])
          )
        : baseDocumentTitles,
    [settings]
  );

  const markSubmitted = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setNotice("");
    setErrorMessage("");
    try {
      await requestJson("/api/teacher/school-document-submissions", {
        method: "POST",
        body: JSON.stringify({
          action: "submitted",
          schoolSlug: school.slug,
          submissionChannel: settings.submissionChannel,
          recipientEmail: settings.contactEmail,
          documentTitles: configuredDocumentTitles,
        }),
      });
      setNotice("제출 완료일과 제출 당시 담당자 정보를 이력에 추가했어요.");
      await loadDocuments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "제출 이력을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label}를 복사했어요.`);
    } catch {
      setErrorMessage(`${label}를 복사하지 못했어요.`);
    }
  };

  const applicationDocumentsUrl = `/teacher/application-documents?schoolSlug=${encodeURIComponent(school.slug)}`;
  const atcDocumentsUrl = `/teacher/atc-confirmations?school=${encodeURIComponent(school.schoolName)}&schoolSlug=${encodeURIComponent(school.slug)}`;

  return (
    <section className="rounded-[28px] border border-indigo-100 bg-white p-5 shadow-lg sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-black text-indigo-500">제출서류</div>
          <h3 className="mt-1 text-xl font-black text-slate-900">학교별 필수서류 관리</h3>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">담당자 정보는 학교 기본정보로, 제출 당시 정보는 별도 이력으로 보존합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {school.slug === "haneulbit" && <Link href="/teacher/after-school/haneulbit/reports" target="_blank" className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800">+ 결과통지서</Link>}
          <Link href={atcDocumentsUrl} target="_blank" className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">+ ATC 참여확인서</Link>
          <Link href={applicationDocumentsUrl} target="_blank" className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white">+ 필수 동의서</Link>
          <button type="button" onClick={() => void loadDocuments()} disabled={loading} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50">{loading ? "불러오는 중" : "새로고침"}</button>
        </div>
      </div>

      {(errorMessage || notice) && <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${errorMessage ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{errorMessage || notice}</div>}

      {settings && draft && (
        <>
          <div className="mt-5 grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 sm:grid-cols-2">
            <label className="text-xs font-black text-slate-600">담당자명<input value={draft.contactName} onChange={(event) => setDraft({ ...draft, contactName: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" /></label>
            <label className="text-xs font-black text-slate-600">연락처<input value={draft.contactPhone} onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" /></label>
            <label className="text-xs font-black text-slate-600">이메일 · 없어도 저장 가능<input type="email" value={draft.contactEmail} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" /></label>
            <label className="text-xs font-black text-slate-600">제출채널<select value={draft.submissionChannel} onChange={(event) => setDraft({ ...draft, submissionChannel: event.target.value as SchoolDocumentSettings["submissionChannel"] })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"><option value="">선택 안 함</option><option value="email">📧 이메일</option><option value="kakao">💬 카카오톡</option></select></label>
            <label className="text-xs font-black text-slate-600">시설기관 아이디<input value={draft.facilityId} onChange={(event) => setDraft({ ...draft, facilityId: event.target.value.toUpperCase() })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" /></label>
            <label className="text-xs font-black text-slate-600">검증번호<input value={draft.verificationCode} onChange={(event) => setDraft({ ...draft, verificationCode: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" /></label>
            <label className="text-xs font-black text-slate-600 sm:col-span-2">시설기관장명 · 선택<input value={draft.facilityManagerName} onChange={(event) => setDraft({ ...draft, facilityManagerName: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" /></label>
            <label className="text-xs font-black text-slate-600 sm:col-span-2">추가 필수서류 · 한 줄에 하나<textarea value={draft.additionalRequiredDocuments.join("\n")} onChange={(event) => setDraft({ ...draft, additionalRequiredDocuments: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" /></label>
            <button type="button" onClick={() => void saveSettings()} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50 sm:col-span-2">{saving ? "저장 중" : "담당자 · 제출 정보 저장"}</button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black">
              <span className={`rounded-full px-3 py-1.5 ${settings.processingMethod === "direct" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>{settings.processingMethod === "direct" ? "🔑 직접 발급" : "🏫 학교 처리"}</span>
              {settings.submissionChannel && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">{settings.submissionChannel === "email" ? "📧 이메일 제출" : "💬 카카오톡 제출"}</span>}
              <span className={`rounded-full px-3 py-1.5 ${settings.latestStatus === "submitted" ? "bg-emerald-100 text-emerald-700" : settings.latestStatus === "generated" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{settings.latestStatus === "submitted" ? "✅ " : ""}{SCHOOL_DOCUMENT_STATUS_LABELS[settings.latestStatus]}</span>
              {settings.latestProcessedAt && <span className="text-slate-400">최근 처리 {formatDateTime(settings.latestProcessedAt)}</span>}
            </div>

            {settings.processingMethod === "direct" && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold"><span>시설기관 ID · {settings.facilityId}</span><button type="button" onClick={() => void copyValue("시설기관 아이디", settings.facilityId)} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-violet-700">복사</button></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold"><span>검증번호 · {settings.verificationCode}</span><button type="button" onClick={() => void copyValue("검증번호", settings.verificationCode)} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-violet-700">복사</button></div>
                {settings.facilityManagerName && <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold sm:col-span-2">시설기관장 · {settings.facilityManagerName}</div>}
                <a href="https://crims.police.go.kr/" target="_blank" rel="noreferrer" className="rounded-xl bg-violet-600 px-4 py-2.5 text-center text-sm font-black text-white sm:col-span-2">범죄경력회보서 발급 ↗</a>
              </div>
            )}

            {settings.additionalRequiredDocuments.length > 0 && <div className="mt-4 rounded-xl bg-amber-50 p-3"><div className="text-xs font-black text-amber-800">추가 필수서류</div><ul className="mt-2 space-y-1 text-xs font-bold text-amber-900">{settings.additionalRequiredDocuments.map((title) => <li key={title}>• {title}</li>)}</ul></div>}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void markGenerated()} disabled={saving} className="rounded-xl bg-blue-100 px-4 py-2.5 text-sm font-black text-blue-700 disabled:opacity-50">작성/발급 완료로 표시</button>
              <button type="button" onClick={() => void markSubmitted()} disabled={saving || !settings.submissionChannel} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">제출 완료로 표시</button>
            </div>
          </div>
        </>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5">
        <h4 className="text-sm font-black text-slate-900">생성된 서류 <span className="text-indigo-500">{documents.length}</span></h4>
        {!loading && documents.length === 0 && <div className="mt-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 px-5 py-7 text-center text-sm font-bold text-slate-500">아직 연결된 제출서류가 없어요.</div>}
        {documents.length > 0 && <div className="mt-3 space-y-3">{documents.map((document) => (
          <article key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">{document.kindLabel}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(document.status)}`}>{document.statusLabel}</span>{document.periodLabel && <span className="text-xs font-black text-slate-500">{document.periodLabel}</span>}</div><h4 className="mt-2 truncate text-sm font-black text-slate-900 sm:text-base">{document.title}</h4><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400"><span>생성 {formatDateTime(document.createdAt)}</span><span>수정 {formatDateTime(document.updatedAt)}</span><span>{document.fileAvailabilityLabel}</span></div></div>
              <div className="flex shrink-0 flex-wrap gap-2"><Link href={document.previewUrl} target="_blank" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">보기 · 미리보기</Link>{document.fileAvailability === "browser-print" && <Link href={document.previewUrl} target="_blank" className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">PDF 저장 화면</Link>}</div>
            </div>
          </article>
        ))}</div>}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <h4 className="text-sm font-black text-slate-900">제출 이력 <span className="text-indigo-500">{history.length}</span></h4>
        {history.length === 0 ? <div className="mt-3 text-xs font-bold text-slate-400">아직 제출 완료 이력이 없습니다.</div> : <div className="mt-3 space-y-2">{history.map((item) => (
          <article key={item.id} className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600"><div className="flex flex-wrap gap-2"><span className="font-black text-slate-900">{formatDateTime(item.submittedAt)}</span><span>{SCHOOL_DOCUMENT_CHANNEL_LABELS[item.submissionChannel]}</span><span>✅ 제출완료</span></div><div className="mt-1">담당자: {item.contactName || "기록 없음"}{item.recipientEmail ? ` · 수신자: ${item.recipientEmail}` : ""}</div><div className="mt-1 text-slate-500">{item.documentTitles.join(" · ")}</div></article>
        ))}</div>}
      </div>
    </section>
  );
}

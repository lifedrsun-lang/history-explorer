"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { auth } from "@/lib/firebase";
import { emptyResume, RESUME_SECTIONS, type ResumeData, type ResumeEntry, type ResumeSection } from "@/lib/resumes";

type History = {
  id: string; target: string; recipient: string; method: string; status: string;
  submittedAt: string; selectedCount: number; attachmentNames: string[];
};
type SchoolSetting = { schoolSlug: string; schoolName: string; contactEmail: string };
type Selected = Partial<Record<ResumeSection, string[]>>;
const fieldClass = "mt-1 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500";
const sectionNames: Record<ResumeSection, string> = {
  education: "학력사항", experience: "경력사항", training: "교육·연수", certificates: "자격사항",
};
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const allSelected = (resume: ResumeData): Selected => Object.fromEntries(
  RESUME_SECTIONS.map(section => [section.key, resume[section.key].map(row => row.id)])
) as Selected;

function SectionEditor({
  section, entries, selected, onChange, onToggle,
}: {
  section: ResumeSection;
  entries: ResumeEntry[];
  selected: string[];
  onChange: (entries: ResumeEntry[]) => void;
  onToggle: (ids: string[]) => void;
}) {
  const definition = RESUME_SECTIONS.find(item => item.key === section)!;
  const edit = (id: string, field: keyof ResumeEntry, value: string) => {
    onChange(entries.map(row => row.id === id ? { ...row, [field]: value } : row));
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-black text-slate-900">{sectionNames[section]}</h3>
          <p className="text-xs text-slate-500">체크한 항목만 이번 이력서에 포함됩니다.</p>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button type="button" onClick={() => onToggle(selected.length === entries.length ? [] : entries.map(e => e.id))}
              className="rounded-lg border px-3 py-2 text-xs font-bold">
              {selected.length === entries.length ? "전체 해제" : "전체 선택"}
            </button>
          )}
          <button type="button" onClick={() => {
            const id = crypto.randomUUID();
            onChange([...entries, { id, period: "", title: "", detail: "" }]);
            onToggle([...selected, id]);
          }} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">+ 항목 추가</button>
        </div>
      </div>
      {!entries.length && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">등록된 항목이 없습니다. 항목 추가를 눌러 주세요.</p>}
      <div className="mt-3 space-y-3">
        {entries.map((entry, i) => (
          <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-indigo-700">
                <input type="checkbox" checked={selected.includes(entry.id)}
                  onChange={event => onToggle(event.target.checked ? [...selected, entry.id] : selected.filter(id => id !== entry.id))} />
                제출에 포함 · {i + 1}번
              </label>
              <button type="button" onClick={() => {
                if (!window.confirm("이 항목을 삭제할까요?")) return;
                onChange(entries.filter(row => row.id !== entry.id));
                onToggle(selected.filter(id => id !== entry.id));
              }} className="text-xs font-bold text-rose-600">삭제</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[125px_1fr_1fr]">
              <label className="text-xs font-bold text-slate-600">기간·취득일
                <input className={fieldClass} placeholder="2025.03~현재" value={entry.period} onChange={e => edit(entry.id, "period", e.target.value)} />
              </label>
              <label className="text-xs font-bold text-slate-600">{definition.first}
                <textarea rows={2} className={fieldClass} placeholder={definition.first} value={entry.title} onChange={e => edit(entry.id, "title", e.target.value)} />
              </label>
              <label className="text-xs font-bold text-slate-600">{definition.second}
                <textarea rows={2} className={fieldClass} placeholder={definition.second} value={entry.detail} onChange={e => edit(entry.id, "detail", e.target.value)} />
              </label>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" disabled={i === 0} onClick={() => {
                const list = [...entries]; [list[i - 1], list[i]] = [list[i], list[i - 1]]; onChange(list);
              }} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-30">↑ 위로</button>
              <button type="button" disabled={i === entries.length - 1} onClick={() => {
                const list = [...entries]; [list[i + 1], list[i]] = [list[i], list[i + 1]]; onChange(list);
              }} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-30">↓ 아래로</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function preparePhoto(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("JPG·PNG·WebP 사진만 등록할 수 있습니다.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
      image.src = url;
    });
    const scale = Math.min(1, 520 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("사진 변환을 시작하지 못했습니다.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.72);
    if (data.length > 280_000) throw new Error("사진 용량이 큽니다. 더 작은 사진을 사용해 주세요.");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const readDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error("첨부파일을 읽지 못했습니다."));
  reader.readAsDataURL(file);
});

export default function TeacherResumesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resume, setResume] = useState<ResumeData>(emptyResume);
  const [selected, setSelected] = useState<Selected>({});
  const [schools, setSchools] = useState<SchoolSetting[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [target, setTarget] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [manualMethod, setManualMethod] = useState("email-external");
  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => onAuthStateChanged(auth, account => {
    setUser(account);
    setChecking(false);
    if (!account) setLoading(false);
  }), []);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    const token = await user.getIdToken();
    const response = await fetch(path, {
      ...init, cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
    return result;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [resumesResult, schoolsResult, gmailResult] = await Promise.all([
          request("/api/teacher/resumes"),
          request("/api/teacher/school-document-settings").catch(() => ({ settings: [] })),
          request("/api/teacher/atc-confirmations/gmail-status").catch(() => ({ connected: false })),
        ]);
        if (cancelled) return;
        const nextResume = resumesResult.resume as ResumeData;
        setResume(nextResume);
        setSelected(allSelected(nextResume));
        setHistory(resumesResult.submissions || []);
        setSchools(Array.isArray(schoolsResult.settings) ? schoolsResult.settings : []);
        setGmailConnected(Boolean(gmailResult.connected && gmailResult.configured));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "이력서를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user, request]);

  const update = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) =>
    setResume(current => ({ ...current, [key]: value }));

  const save = async () => {
    await request("/api/teacher/resumes", { method: "PUT", body: JSON.stringify({ resume }) });
    setMessage("마스터 이력서가 저장되었습니다.");
  };

  const run = async (name: string, action: () => Promise<void>) => {
    if (busy) return;
    setBusy(name); setError(""); setMessage("");
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : "작업에 실패했습니다."); }
    finally { setBusy(""); }
  };

  const download = async (submissionId?: string) => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    const token = await user.getIdToken();
    const response = await fetch("/api/teacher/resumes/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(submissionId ? { submissionId } : { resume, selected, target, date: today() }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "PDF 생성에 실패했습니다.");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
    const filename = encoded ? decodeURIComponent(encoded) : "이력서.pdf";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`${filename} 파일을 생성했습니다.`);
  };

  const loadHistory = async () => {
    const data = await request("/api/teacher/resumes");
    setHistory(data.submissions || []);
  };

  const submitEmail = async () => {
    if (!resume.name.trim() || !recipient.trim() || !target.trim()) throw new Error("이름, 제출처, 이메일을 입력해 주세요.");
    if (!gmailConnected) throw new Error("기존 ATC 참여확인서 메뉴에서 Gmail 계정을 연결해 주세요.");
    if (attachments.length > 5 || attachments.some(file => file.size > 1_600_000) ||
        attachments.reduce((sum, file) => sum + file.size, 0) > 2_600_000) {
      throw new Error("추가 파일은 PDF/JPG/PNG 최대 5개, 각각 1.6MB·합계 2.6MB까지 가능합니다.");
    }
    const outgoingSubject = subject.trim() || `${target} 강사 이력서 제출_${resume.name}`;
    const outgoingBody = body.trim() || `안녕하세요.\n\n${target} 강사 지원자 ${resume.name}입니다.\n이력서 및 선택한 증빙자료를 첨부하여 제출합니다.\n\n확인 부탁드립니다. 감사합니다.`;
    if (!window.confirm(`${recipient} 주소로 이력서와 첨부파일 ${attachments.length}개를 실제 발송하시겠습니까?\n제목: ${outgoingSubject}`)) return;
    await save();
    const files = await Promise.all(attachments.map(async file => ({
      filename: file.name, contentType: file.type, dataUrl: await readDataUrl(file),
    })));
    const data = await request("/api/teacher/resumes/send", {
      method: "POST",
      body: JSON.stringify({
        requestId: crypto.randomUUID(), resume, selected, target, recipient,
        subject: outgoingSubject, body: outgoingBody, attachments: files,
      }),
    });
    setMessage(`Gmail 발송 확인: ${data.recipient} · ${data.submittedAt}`);
    setAttachments([]);
    await loadHistory();
  };

  const manualRecord = async () => {
    if (!target.trim()) throw new Error("제출처를 입력해 주세요.");
    if (!window.confirm("이 기능은 발송하지 않고 직접 제출했다고 기록합니다. 계속할까요?")) return;
    await save();
    await request("/api/teacher/resumes", {
      method: "POST", body: JSON.stringify({ target, recipient, method: manualMethod, selected }),
    });
    await loadHistory();
    setMessage("외부 제출 기록을 저장했습니다. 실제 발송 여부는 별도로 확인해 주세요.");
  };

  if (checking || loading) return <main className="min-h-screen bg-slate-50 p-8 text-center font-bold">이력서 관리 정보를 불러오는 중입니다.</main>;
  if (!user) return <main className="min-h-screen bg-slate-50 p-8 text-center">
    <h1 className="text-2xl font-black">교사 로그인이 필요합니다.</h1>
    <Link href="/teacher" className="mt-5 inline-block rounded-xl bg-slate-900 px-5 py-3 text-white">교사용 홈으로</Link>
  </main>;

  return (
    <main className="min-h-screen bg-[#f1f5f9] p-3 pb-20 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-xs font-bold tracking-widest text-indigo-500">TEACHER RESUME MANAGER</div>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">📄 이력서 작성 · 제출 관리</h1>
              <p className="mt-2 text-sm text-slate-500">마스터 이력서를 저장하고 제출처별 항목을 선택해 PDF로 만들거나 Gmail로 발송합니다.</p>
            </div>
            <Link href="/teacher/manage/operations" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">← 일정 · 운영</Link>
          </div>
        </header>
        {(error || message) && <div role="status" className={`rounded-xl p-4 text-sm font-bold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{error || message}</div>}
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black">1. 기본정보 · 증명사진</h2>
            <span className="text-xs text-slate-500">로그인한 교사에게만 표시됩니다.</span>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_160px]">
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["headline", "이력서 제목", "초등 한국사·세계문화 강사 이력서"],
                ["name", "성명", "이름"],
                ["birthDate", "생년월일", "YYYY.MM.DD"],
                ["phone", "연락처", "010-0000-0000"],
                ["email", "이메일", "메일주소"],
                ["address", "주소", "시·구·동"],
              ] as const).map(([key, label, placeholder]) => <label key={key} className="text-sm font-bold text-slate-700">{label}
                <input className={fieldClass} value={resume[key]} placeholder={placeholder} onChange={e => update(key, e.target.value)} />
              </label>)}
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-44 w-32 items-center justify-center overflow-hidden rounded-xl border bg-slate-50 text-xs text-slate-400">
                {resume.photoDataUrl ? <img alt="이력서 증명사진" src={resume.photoDataUrl} className="h-full w-full object-cover" /> : "증명사진 미등록"}
              </div>
              <label className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold">사진 등록
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  try { update("photoDataUrl", await preparePhoto(file)); setMessage("사진을 불러왔습니다. 저장 버튼으로 반영해 주세요."); setError(""); }
                  catch (err) { setError(err instanceof Error ? err.message : "사진을 불러오지 못했습니다."); }
                  e.target.value = "";
                }} />
              </label>
              {resume.photoDataUrl && <button type="button" onClick={() => update("photoDataUrl", "")} className="text-xs text-rose-600">사진 삭제</button>}
            </div>
          </div>
        </section>
        <div className="space-y-4">
          {RESUME_SECTIONS.map(section => <SectionEditor key={section.key} section={section.key}
            entries={resume[section.key]} selected={selected[section.key] || []}
            onChange={entries => update(section.key, entries)}
            onToggle={ids => setSelected(current => ({ ...current, [section.key]: ids }))}
          />)}
        </div>
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">2. 주요 활동 및 자기소개 (선택)</h2>
          <textarea className={fieldClass} rows={4} value={resume.introduction}
            placeholder="지원 분야와 관련된 주요 교육활동을 입력해 주세요."
            onChange={e => update("introduction", e.target.value)} />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} onClick={() => run("save", save)}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy === "save" ? "저장 중..." : "마스터 이력서 저장"}</button>
            <button type="button" disabled={!!busy} onClick={() => run("pdf", () => download())}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-900 disabled:opacity-50">{busy === "pdf" ? "생성 중..." : "선택 항목으로 PDF 다운로드"}</button>
          </div>
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">3. 제출처 · 이메일 · 첨부서류</h2>
          <p className="mt-1 text-sm text-slate-500">학교를 선택하면 기존 담당자 메일을 불러옵니다. 목록에 없는 업체도 직접 입력할 수 있습니다.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold">기존 학교카드
              <select className={fieldClass} defaultValue="" onChange={e => {
                const item = schools.find(s => s.schoolSlug === e.target.value);
                if (item) { setTarget(item.schoolName); setRecipient(item.contactEmail || ""); }
              }}><option value="">직접 입력 / 학교 선택</option>
                {schools.map(s => <option key={s.schoolSlug} value={s.schoolSlug}>{s.schoolName}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold">제출 학교·업체명
              <input className={fieldClass} value={target} onChange={e => setTarget(e.target.value)} placeholder="예: 등현초등학교" />
            </label>
            <label className="text-sm font-bold">받는 사람 이메일
              <input type="email" className={fieldClass} value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="담당자 이메일" />
            </label>
            <label className="text-sm font-bold">이메일 제목
              <input className={fieldClass} value={subject} onChange={e => setSubject(e.target.value)}
                placeholder={`${target || "학교"} 강사 이력서 제출_${resume.name || "성명"}`} />
            </label>
          </div>
          <label className="mt-3 block text-sm font-bold">이메일 본문
            <textarea className={fieldClass} rows={4} value={body} onChange={e => setBody(e.target.value)}
              placeholder="기본 제출 인사말이 자동 적용됩니다. 원하는 경우 수정해 주세요." />
          </label>
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4">
            <div className="font-black">자격증·경력증명서 등 추가 첨부</div>
            <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG 최대 5개 / 파일당 1.6MB / 총 2.6MB. 발송 시에만 첨부되며 파일 원본은 서버에 보관되지 않습니다.</p>
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="mt-3 block max-w-full text-sm"
              onChange={e => setAttachments(Array.from(e.target.files || []))} />
            {attachments.length > 0 && <div className="mt-2 text-xs text-indigo-700">{attachments.map(file => file.name).join(" / ")}</div>}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" disabled={!!busy} onClick={() => run("send", submitEmail)}
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
              {busy === "send" ? "발송 처리 중..." : "✉️ 확인 후 Gmail 제출"}
            </button>
            <select aria-label="외부 제출 방식" value={manualMethod} onChange={e => setManualMethod(e.target.value)} className="rounded-xl border px-3 py-3 text-sm font-bold">
              <option value="email-external">외부 이메일</option>
              <option value="kakao">카카오톡</option>
              <option value="visit">직접 제출</option>
              <option value="other">기타</option>
            </select>
            <button type="button" disabled={!!busy} onClick={() => run("manual", manualRecord)}
              className="rounded-xl border px-5 py-3 text-sm font-black disabled:opacity-50">외부 제출 기록</button>
            {gmailConnected
              ? <span className="text-xs text-emerald-700">Gmail 연결 확인</span>
              : <Link href="/teacher/atc-confirmations" className="text-xs font-bold text-indigo-700 underline">Gmail 연결하기 · ATC 참여확인서</Link>}
          </div>
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">4. 이력서 제출 이력</h2>
          <p className="mt-1 text-xs text-slate-500">전송 당시 이력서 내용으로 PDF를 다시 생성할 수 있습니다. 보관된 첨부파일 원본은 없습니다.</p>
          {!history.length && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">아직 제출 이력이 없습니다.</p>}
          <div className="mt-3 space-y-2">
            {history.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
              <div>
                <div className="font-bold text-slate-900">{row.target}
                  <span className="ml-2 text-xs font-medium text-slate-500">{row.status === "sent" ? "Gmail 발송 확인" : row.status === "self-reported" ? "직접 제출 기록" : row.status === "unknown" ? "발송 확인 필요" : row.status === "pending" ? "처리 중" : "발송 실패"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{row.submittedAt ? new Date(row.submittedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "일시 미확인"} · {row.recipient || "수신처 수동 제출"} · 선택 항목 {row.selectedCount}건
                  {row.attachmentNames?.length > 0 ? ` · 파일 ${row.attachmentNames.join(", ")}` : ""}
                </p>
              </div>
              <button type="button" disabled={!!busy} onClick={() => run(`pdf-${row.id}`, () => download(row.id))}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold disabled:opacity-50">당시 이력서 PDF</button>
            </div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

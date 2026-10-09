"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type ResumeItem = {
  id: string;
  selected: boolean;
  fields: Record<string, string>;
};

type ResumeData = {
  profile: {
    name: string;
    birthDate: string;
    phone: string;
    email: string;
    address: string;
    headline: string;
  };
  sections: {
    education: ResumeItem[];
    programExperience: ResumeItem[];
    otherExperience: ResumeItem[];
    training: ResumeItem[];
    certification: ResumeItem[];
  };
};

type SectionKey = keyof ResumeData["sections"];
type PresetKey = "history" | "boardgame" | "coding" | "all";
type SelectionState = Record<SectionKey, Record<string, boolean>>;

type DocumentProfile = {
  signatureDataUrl?: string | null;
};

const EMPTY_RESUME: ResumeData = {
  profile: { name: "", birthDate: "", phone: "", email: "", address: "", headline: "" },
  sections: { education: [], programExperience: [], otherExperience: [], training: [], certification: [] },
};

const PRESETS: Array<{ key: PresetKey; label: string; title: string; hint: string }> = [
  { key: "history", label: "한국사 · 세계문화", title: "초등 한국사·세계문화 강사 이력서", hint: "역사수업·아동지도·안전 연수 중심" },
  { key: "boardgame", label: "보드게임 · 인성", title: "인성교육·보드게임 강사 이력서", hint: "사회정서·아동지도·교육경력 중심" },
  { key: "coding", label: "코딩 · AI", title: "코딩·AI 강사 이력서", hint: "AI·로봇코딩·교육경력 중심" },
  { key: "all", label: "전체", title: "강사 이력서", hint: "마스터 이력 전체 선택" },
];

const SECTION_LABELS: Record<SectionKey, string> = {
  education: "학력 사항",
  programExperience: "프로그램 운영 경력",
  otherExperience: "기타 주요 경력",
  training: "교육 이수 및 연수 사항",
  certification: "자격 사항",
};

const normalizeDate = (value: string) => value ? value.replace(/-/g, ".") : "";
const itemText = (item: ResumeItem) => Object.values(item.fields).join(" ").toLowerCase();
const containsAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword.toLowerCase()));

const ALL_COMMON_TRAINING = ["아동", "생활지도", "응급", "cpr", "아동학대", "늘봄", "느린학습", "아이돌봄"];
const HISTORY_KEYWORDS = ["한국사", "역사", "세계문화", "역사논술"];
const BOARDGAME_KEYWORDS = ["보드게임", "사회정서", "인성", "놀이", "느린", "아동"];
const CODING_KEYWORDS = ["코딩", "ai", "인공지능", "로봇", "디지털", "컴퓨터", "헬로메이플"];

const buildPresetSelection = (resume: ResumeData, preset: PresetKey): SelectionState => {
  const state = {} as SelectionState;

  (Object.keys(resume.sections) as SectionKey[]).forEach((sectionKey) => {
    state[sectionKey] = {};
    resume.sections[sectionKey].forEach((item) => {
      const text = itemText(item);
      let selected = false;

      if (preset === "all") selected = true;
      else if (sectionKey === "education") selected = true;
      else if (sectionKey === "programExperience") {
        // 직접 수업한 경력은 분야가 달라도 강사 경력으로 활용 가치가 높아 기본 포함합니다.
        selected = true;
      } else if (sectionKey === "otherExperience") {
        selected = containsAny(text, ["교육", "코칭", "학습", "강사"]);
      } else if (sectionKey === "training") {
        const common = containsAny(text, ALL_COMMON_TRAINING);
        const specific = preset === "history"
          ? containsAny(text, HISTORY_KEYWORDS)
          : preset === "boardgame"
            ? containsAny(text, BOARDGAME_KEYWORDS)
            : containsAny(text, CODING_KEYWORDS);
        selected = common || specific;
      } else if (sectionKey === "certification") {
        const safetyOrChild = containsAny(text, ["느린", "아이돌봄", "활동지원", "요양보호"]);
        const specific = preset === "history"
          ? containsAny(text, HISTORY_KEYWORDS)
          : preset === "boardgame"
            ? containsAny(text, BOARDGAME_KEYWORDS)
            : containsAny(text, CODING_KEYWORDS);
        selected = safetyOrChild || specific;
      }

      state[sectionKey][item.id] = selected;
    });
  });

  return state;
};

const summarizeItem = (sectionKey: SectionKey, item: ResumeItem) => {
  const f = item.fields;
  if (sectionKey === "education") return `${f.period || ""} · ${f.school || ""} · ${f.major || ""} ${f.status || ""}`.trim();
  if (sectionKey === "programExperience") return `${f.program || ""} · ${f.organization || ""} · ${f.period || ""}`.trim();
  if (sectionKey === "otherExperience") return `${f.role || ""} · ${f.organization || ""} · ${f.period || ""}`.trim();
  if (sectionKey === "training") return `${f.name || ""} · ${f.institution || ""} · ${f.period || ""}`.trim();
  return `${f.name || ""} · ${f.issuer || ""} · ${f.date || ""}`.trim();
};

export default function TeacherResumeBuilderPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<ResumeData>(EMPTY_RESUME);
  const [selection, setSelection] = useState<SelectionState>({ education: {}, programExperience: {}, otherExperience: {}, training: {}, certification: {} });
  const [preset, setPreset] = useState<PresetKey>("history");
  const [documentTitle, setDocumentTitle] = useState(PRESETS[0].title);
  const [schoolName, setSchoolName] = useState("");
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [useSignature, setUseSignature] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setAuthChecking(false);
  }), []);

  const requestJson = useCallback(async (url: string) => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    const token = await user.getIdToken();
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "정보를 불러오지 못했습니다.");
    return data;
  }, [user]);

  useEffect(() => {
    if (!user) {
      if (!authChecking) setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const [resumeData, documentProfile] = await Promise.all([
          requestJson("/api/teacher/resume-master"),
          requestJson("/api/teacher/application-documents/profile").catch(() => ({ profile: {} })),
        ]);
        if (cancelled) return;
        const nextResume = (resumeData?.resume || EMPTY_RESUME) as ResumeData;
        setResume(nextResume);
        setSelection(buildPresetSelection(nextResume, "history"));
        const profile = (documentProfile?.profile || {}) as DocumentProfile;
        setSignatureDataUrl(profile.signatureDataUrl || null);
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "이력을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [authChecking, requestJson, user]);

  const applyPreset = (nextPreset: PresetKey) => {
    setPreset(nextPreset);
    setSelection(buildPresetSelection(resume, nextPreset));
    const config = PRESETS.find((item) => item.key === nextPreset);
    if (config) setDocumentTitle(config.title);
  };

  const toggleItem = (sectionKey: SectionKey, itemId: string) => {
    setSelection((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        [itemId]: !current[sectionKey]?.[itemId],
      },
    }));
  };

  const selectedItems = useMemo(() => {
    const result = {} as Record<SectionKey, ResumeItem[]>;
    (Object.keys(resume.sections) as SectionKey[]).forEach((sectionKey) => {
      result[sectionKey] = resume.sections[sectionKey].filter((item) => selection[sectionKey]?.[item.id]);
    });
    return result;
  }, [resume.sections, selection]);

  const totalSelected = useMemo(
    () => (Object.keys(selectedItems) as SectionKey[]).reduce((sum, key) => sum + selectedItems[key].length, 0),
    [selectedItems]
  );

  const printResume = () => {
    if (!resume.profile.name) {
      setErrorMessage("마스터 이력의 기본정보를 먼저 저장해 주세요.");
      return;
    }
    if (totalSelected === 0) {
      setErrorMessage("이력서에 포함할 항목을 하나 이상 선택해 주세요.");
      return;
    }
    setErrorMessage("");
    window.print();
  };

  const dateParts = documentDate.split("-");

  if (authChecking) {
    return <main className="min-h-[100dvh] bg-[#f5f7fb] p-5"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center font-bold text-slate-500 shadow-lg">로그인 상태를 확인하고 있습니다.</div></main>;
  }

  if (!user) {
    return <main className="min-h-[100dvh] bg-[#f5f7fb] p-5"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-lg"><h1 className="text-2xl font-black">교사 로그인이 필요합니다.</h1><Link href="/teacher" className="mt-5 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white">교사용 홈</Link></div></main>;
  }

  if (loading) {
    return <main className="min-h-[100dvh] bg-[#f5f7fb] p-5"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center font-bold text-slate-500 shadow-lg">저장된 마스터 이력을 불러오는 중입니다.</div></main>;
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <style jsx global>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .resume-print-wrap { margin: 0 !important; max-width: none !important; }
          .resume-sheet { width: 190mm !important; min-height: 277mm !important; margin: 0 auto !important; padding: 5mm !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .resume-row { break-inside: avoid; page-break-inside: avoid; }
          .resume-section { break-inside: auto; }
        }
      `}</style>

      <div className="no-print mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-white p-5 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-slate-400">RESUME BUILDER</div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">📄 지원용 이력서 만들기</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-slate-500">저장된 마스터 이력은 그대로 두고, 이번 지원서에 넣을 항목만 골라 A4 이력서를 만듭니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/teacher/resume-master" className="rounded-2xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">마스터 이력 수정</Link>
              <Link href="/teacher/manage/operations" className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">← 일정 · 운영</Link>
            </div>
          </div>
        </section>

        {errorMessage && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">{errorMessage}</div>}

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
          <h2 className="text-xl font-black text-slate-900">1. 지원 분야 프리셋</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRESETS.map((item) => (
              <button key={item.key} type="button" onClick={() => applyPreset(item.key)} className={`rounded-2xl border p-4 text-left transition ${preset === item.key ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-white"}`}>
                <div className="text-sm font-black text-slate-900">{item.label}</div>
                <div className="mt-1 text-xs font-bold leading-relaxed text-slate-500">{item.hint}</div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500">프리셋은 추천 선택입니다. 아래에서 항목을 자유롭게 추가·제외할 수 있고 마스터 이력에는 영향을 주지 않습니다.</p>
        </section>

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
          <h2 className="text-xl font-black text-slate-900">2. 이번 지원서 정보</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-black text-slate-700">이력서 제목<input value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
            <label className="text-sm font-black text-slate-700">지원 학교 · 기관명 <span className="font-bold text-slate-400">(선택)</span><input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="예: ○○초등학교" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
            <label className="text-sm font-black text-slate-700">작성일<input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700"><input type="checkbox" checked={useSignature} disabled={!signatureDataUrl} onChange={(e) => setUseSignature(e.target.checked)} className="h-5 w-5" />등록 서명 적용 {signatureDataUrl ? "" : "(등록된 서명 없음)"}</label>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-black text-slate-900">3. 포함할 이력 선택</h2><p className="mt-1 text-xs font-bold text-slate-500">현재 {totalSelected}개 선택</p></div>
            <button type="button" onClick={printResume} className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg">PDF로 저장 · 인쇄</button>
          </div>

          <div className="mt-5 space-y-5">
            {(Object.keys(resume.sections) as SectionKey[]).map((sectionKey) => (
              <div key={sectionKey}>
                <div className="mb-2 flex items-center justify-between"><h3 className="font-black text-slate-900">{SECTION_LABELS[sectionKey]}</h3><span className="text-xs font-black text-indigo-600">{selectedItems[sectionKey].length} / {resume.sections[sectionKey].length}</span></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {resume.sections[sectionKey].map((item) => (
                    <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${selection[sectionKey]?.[item.id] ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
                      <input type="checkbox" checked={Boolean(selection[sectionKey]?.[item.id])} onChange={() => toggleItem(sectionKey, item.id)} className="mt-0.5 h-5 w-5 shrink-0" />
                      <span className="text-sm font-bold leading-relaxed text-slate-700">{summarizeItem(sectionKey, item)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="mt-5 text-center text-xs font-bold text-slate-400">아래는 실제 A4 출력 미리보기입니다.</div>
      </div>

      <div className="resume-print-wrap mx-auto mt-4 max-w-[210mm]">
        <article className="resume-sheet rounded-lg border border-slate-300 bg-white p-5 text-[11px] text-black shadow-lg sm:p-8">
          <h1 className="text-center text-[21px] font-bold tracking-tight">{documentTitle || "강사 이력서"}</h1>
          {schoolName && <div className="mt-1 text-center text-[10px] text-slate-600">지원기관: {schoolName}</div>}

          <table className="mt-6 w-full border-collapse text-[11px]">
            <tbody>
              <tr className="resume-row"><th className="w-[14%] border border-black bg-slate-100 px-2 py-2">성명</th><td className="w-[36%] border border-black px-2 py-2">{resume.profile.name}</td><th className="w-[14%] border border-black bg-slate-100 px-2 py-2">생년월일</th><td className="border border-black px-2 py-2">{normalizeDate(resume.profile.birthDate)}</td></tr>
              <tr className="resume-row"><th className="border border-black bg-slate-100 px-2 py-2">연락처</th><td className="border border-black px-2 py-2">{resume.profile.phone}</td><th className="border border-black bg-slate-100 px-2 py-2">E-mail</th><td className="border border-black px-2 py-2">{resume.profile.email}</td></tr>
              <tr className="resume-row"><th className="border border-black bg-slate-100 px-2 py-2">주소</th><td colSpan={3} className="border border-black px-2 py-2">{resume.profile.address}</td></tr>
            </tbody>
          </table>

          {selectedItems.education.length > 0 && <section className="resume-section mt-5">
            <h2 className="mb-1 text-[13px] font-bold">학력 사항</h2>
            <table className="w-full border-collapse text-[10px]"><thead><tr><th className="w-[22%] border border-black bg-slate-100 px-2 py-1.5">기간</th><th className="w-[36%] border border-black bg-slate-100 px-2 py-1.5">학교명 및 과정</th><th className="border border-black bg-slate-100 px-2 py-1.5">전공분야</th></tr></thead><tbody>
              {selectedItems.education.map((item) => <tr className="resume-row" key={item.id}><td className="border border-black px-2 py-1.5">{item.fields.period}</td><td className="border border-black px-2 py-1.5">{item.fields.school}</td><td className="border border-black px-2 py-1.5">{[item.fields.major, item.fields.status].filter(Boolean).join(" · ")}</td></tr>)}
            </tbody></table>
          </section>}

          {selectedItems.programExperience.length > 0 && <section className="resume-section mt-5">
            <h2 className="mb-1 text-[13px] font-bold">프로그램 운영 경력</h2>
            <table className="w-full border-collapse text-[10px]"><thead><tr><th className="w-[27%] border border-black bg-slate-100 px-2 py-1.5">프로그램명</th><th className="border border-black bg-slate-100 px-2 py-1.5">프로그램 제공기관</th><th className="w-[24%] border border-black bg-slate-100 px-2 py-1.5">운영기간</th></tr></thead><tbody>
              {selectedItems.programExperience.map((item) => <tr className="resume-row" key={item.id}><td className="border border-black px-2 py-1.5">{item.fields.program}</td><td className="border border-black px-2 py-1.5">{item.fields.organization}{item.fields.detail ? <div className="mt-0.5 text-[9px] text-slate-700">{item.fields.detail}</div> : null}</td><td className="border border-black px-2 py-1.5">{item.fields.period}</td></tr>)}
            </tbody></table>
          </section>}

          {selectedItems.otherExperience.length > 0 && <section className="resume-section mt-5">
            <h2 className="mb-1 text-[13px] font-bold">기타 주요 경력</h2>
            <table className="w-full border-collapse text-[10px]"><thead><tr><th className="border border-black bg-slate-100 px-2 py-1.5">업무 내용</th><th className="w-[30%] border border-black bg-slate-100 px-2 py-1.5">소속</th><th className="w-[24%] border border-black bg-slate-100 px-2 py-1.5">기간</th></tr></thead><tbody>
              {selectedItems.otherExperience.map((item) => <tr className="resume-row" key={item.id}><td className="border border-black px-2 py-1.5">{item.fields.role}{item.fields.detail ? <div className="mt-0.5 text-[9px] text-slate-700">{item.fields.detail}</div> : null}</td><td className="border border-black px-2 py-1.5">{item.fields.organization}</td><td className="border border-black px-2 py-1.5">{item.fields.period}</td></tr>)}
            </tbody></table>
          </section>}

          {selectedItems.training.length > 0 && <section className="resume-section mt-5">
            <h2 className="mb-1 text-[13px] font-bold">교육 이수 및 연수 사항</h2>
            <table className="w-full border-collapse text-[10px]"><thead><tr><th className="border border-black bg-slate-100 px-2 py-1.5">연수명</th><th className="w-[30%] border border-black bg-slate-100 px-2 py-1.5">실시기관</th><th className="w-[25%] border border-black bg-slate-100 px-2 py-1.5">연수기간</th></tr></thead><tbody>
              {selectedItems.training.map((item) => <tr className="resume-row" key={item.id}><td className="border border-black px-2 py-1.5">{item.fields.name}{item.fields.note ? <div className="mt-0.5 text-[9px] text-slate-700">{item.fields.note}</div> : null}</td><td className="border border-black px-2 py-1.5">{item.fields.institution}</td><td className="border border-black px-2 py-1.5">{item.fields.period}</td></tr>)}
            </tbody></table>
          </section>}

          {selectedItems.certification.length > 0 && <section className="resume-section mt-5">
            <h2 className="mb-1 text-[13px] font-bold">자격 사항</h2>
            <table className="w-full border-collapse text-[10px]"><thead><tr><th className="w-[19%] border border-black bg-slate-100 px-2 py-1.5">취득일</th><th className="border border-black bg-slate-100 px-2 py-1.5">자격명</th><th className="w-[31%] border border-black bg-slate-100 px-2 py-1.5">자격기관</th></tr></thead><tbody>
              {selectedItems.certification.map((item) => <tr className="resume-row" key={item.id}><td className="border border-black px-2 py-1.5">{item.fields.date}</td><td className="border border-black px-2 py-1.5">{item.fields.name}{item.fields.category ? <span className="ml-1 text-[8px] text-slate-600">({item.fields.category})</span> : null}</td><td className="border border-black px-2 py-1.5">{item.fields.issuer}{item.fields.registrationNumber && item.fields.registrationNumber !== "-" ? <div className="text-[8px] text-slate-600">등록번호 {item.fields.registrationNumber}</div> : null}</td></tr>)}
            </tbody></table>
          </section>}

          <div className="resume-row mt-8 text-center text-[11px] leading-7">
            <div>위와 같이 제출함에 있어 허위사실이 없음을 확인합니다.</div>
            <div className="mt-2">{dateParts[0] || ""}년 {Number(dateParts[1] || 0) || ""}월 {Number(dateParts[2] || 0) || ""}일</div>
            <div className="mt-3 flex items-center justify-center gap-3"><strong>{resume.profile.name}</strong>{useSignature && signatureDataUrl ? <img src={signatureDataUrl} alt="등록 서명" className="h-10 max-w-28 object-contain" /> : <span>(인)</span>}</div>
          </div>
        </article>
      </div>
    </main>
  );
}

"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

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

type FieldSpec = {
  key: string;
  label: string;
  placeholder?: string;
  wide?: boolean;
};

type SectionSpec = {
  key: SectionKey;
  title: string;
  description: string;
  icon: string;
  fields: FieldSpec[];
};

const EMPTY_RESUME: ResumeData = {
  profile: {
    name: "",
    birthDate: "",
    phone: "",
    email: "",
    address: "",
    headline: "",
  },
  sections: {
    education: [],
    programExperience: [],
    otherExperience: [],
    training: [],
    certification: [],
  },
};

const SECTION_SPECS: SectionSpec[] = [
  {
    key: "education",
    title: "학력",
    description: "학위·학점은행제 등 학교 지원서에 사용할 학력을 관리합니다.",
    icon: "🎓",
    fields: [
      { key: "period", label: "기간", placeholder: "예: 2025.03 ~ 현재" },
      { key: "school", label: "학교·과정", placeholder: "학교명 또는 과정명", wide: true },
      { key: "major", label: "전공·분야", placeholder: "전공 또는 학위" },
      { key: "status", label: "상태", placeholder: "졸업 / 이수 중" },
    ],
  },
  {
    key: "programExperience",
    title: "프로그램 운영 경력",
    description: "학교·기관에서 직접 수업한 경력을 중심으로 관리합니다.",
    icon: "🏫",
    fields: [
      { key: "period", label: "기간", placeholder: "예: 2026.03 ~ 현재" },
      { key: "program", label: "프로그램명", placeholder: "예: 초등 한국사" },
      { key: "organization", label: "기관·학교", placeholder: "학교명 / 운영기관", wide: true },
      { key: "detail", label: "업무·설명", placeholder: "수업 기획 및 운영 등", wide: true },
    ],
  },
  {
    key: "otherExperience",
    title: "기타 주요 경력",
    description: "교육 외 경력 중 지원 분야에 도움이 되는 경력을 관리합니다.",
    icon: "💼",
    fields: [
      { key: "period", label: "기간", placeholder: "예: 2022.01 ~ 2025.10" },
      { key: "role", label: "업무 내용", placeholder: "코칭 및 교육 프로그램 운영", wide: true },
      { key: "organization", label: "소속", placeholder: "기관명" },
      { key: "detail", label: "상세", placeholder: "필요 시 추가 설명", wide: true },
    ],
  },
  {
    key: "training",
    title: "교육 이수 · 연수",
    description: "강사 양성과정, 아동 안전·생활지도, 코딩·보드게임 연수 등을 관리합니다.",
    icon: "📚",
    fields: [
      { key: "period", label: "기간", placeholder: "예: 2026.04.24 ~ 2026.06.05" },
      { key: "name", label: "교육·연수명", placeholder: "과정명", wide: true },
      { key: "institution", label: "실시기관", placeholder: "기관명" },
      { key: "note", label: "비고", placeholder: "시간 / 유효기간 등", wide: true },
    ],
  },
  {
    key: "certification",
    title: "자격",
    description: "자격명·발급기관·등록번호를 관리하고 지원서별로 필요한 것만 선택합니다.",
    icon: "🏅",
    fields: [
      { key: "date", label: "취득일", placeholder: "예: 2026.06.24" },
      { key: "name", label: "자격명", placeholder: "자격면허명", wide: true },
      { key: "issuer", label: "발급기관", placeholder: "자격관리기관" },
      { key: "registrationNumber", label: "등록번호", placeholder: "없으면 -" },
      { key: "category", label: "구분", placeholder: "국가자격 / 민간자격 등" },
    ],
  },
];

const cloneEmpty = (): ResumeData => JSON.parse(JSON.stringify(EMPTY_RESUME));

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `resume-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const sanitizeImportedResume = (value: unknown): ResumeData => {
  const source = value && typeof value === "object" ? (value as Partial<ResumeData>) : {};
  const profileSource = source.profile && typeof source.profile === "object" ? source.profile : {};
  const next = cloneEmpty();

  next.profile = {
    name: String(profileSource.name || ""),
    birthDate: String(profileSource.birthDate || ""),
    phone: String(profileSource.phone || ""),
    email: String(profileSource.email || ""),
    address: String(profileSource.address || ""),
    headline: String(profileSource.headline || ""),
  };

  for (const spec of SECTION_SPECS) {
    const list = source.sections?.[spec.key];
    next.sections[spec.key] = Array.isArray(list)
      ? list.slice(0, 80).map((item) => ({
          id: typeof item?.id === "string" && item.id ? item.id : makeId(),
          selected: item?.selected !== false,
          fields: item?.fields && typeof item.fields === "object"
            ? Object.fromEntries(
                Object.entries(item.fields).map(([key, fieldValue]) => [key, String(fieldValue ?? "")])
              )
            : {},
        }))
      : [];
  }

  return next;
};

export default function TeacherResumeMasterPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [resume, setResume] = useState<ResumeData>(cloneEmpty());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    education: true,
    programExperience: true,
    otherExperience: false,
    training: true,
    certification: true,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
  }, []);

  const getToken = useCallback(async () => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    return user.getIdToken();
  }, [user]);

  const requestJson = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await getToken();
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "요청 처리에 실패했습니다.");
      return data;
    },
    [getToken]
  );

  const loadResume = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await requestJson("/api/teacher/resume-master");
      setResume(sanitizeImportedResume(data?.resume));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "마스터 이력을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [requestJson, user]);

  useEffect(() => {
    void loadResume();
  }, [loadResume]);

  const setProfileField = (key: keyof ResumeData["profile"], value: string) => {
    setResume((current) => ({
      ...current,
      profile: { ...current.profile, [key]: value },
    }));
  };

  const addItem = (sectionKey: SectionKey) => {
    const spec = SECTION_SPECS.find((item) => item.key === sectionKey);
    if (!spec) return;
    const fields = Object.fromEntries(spec.fields.map((field) => [field.key, ""]));
    setResume((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionKey]: [
          ...current.sections[sectionKey],
          { id: makeId(), selected: true, fields },
        ],
      },
    }));
    setOpenSections((current) => ({ ...current, [sectionKey]: true }));
  };

  const updateItem = (
    sectionKey: SectionKey,
    itemId: string,
    updater: (item: ResumeItem) => ResumeItem
  ) => {
    setResume((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionKey]: current.sections[sectionKey].map((item) =>
          item.id === itemId ? updater(item) : item
        ),
      },
    }));
  };

  const removeItem = (sectionKey: SectionKey, itemId: string) => {
    setResume((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionKey]: current.sections[sectionKey].filter((item) => item.id !== itemId),
      },
    }));
  };

  const moveItem = (sectionKey: SectionKey, index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    setResume((current) => {
      const list = [...current.sections[sectionKey]];
      if (nextIndex < 0 || nextIndex >= list.length) return current;
      [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
      return {
        ...current,
        sections: { ...current.sections, [sectionKey]: list },
      };
    });
  };

  const saveResume = async () => {
    setSaving(true);
    setNotice("");
    setErrorMessage("");
    try {
      const data = await requestJson("/api/teacher/resume-master", {
        method: "PUT",
        body: JSON.stringify(resume),
      });
      setResume(sanitizeImportedResume(data?.resume));
      setNotice("마스터 이력을 저장했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sunlab-resume-master-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setErrorMessage("");
    setNotice("");
    try {
      const parsed = JSON.parse(await file.text());
      setResume(sanitizeImportedResume(parsed));
      setNotice("이력 파일을 불러왔습니다. 내용 확인 후 ‘마스터 이력 저장’을 눌러 주세요.");
    } catch {
      setErrorMessage("올바른 Sun Lab 마스터 이력 JSON 파일이 아닙니다.");
    }
  };

  const selectedCounts = useMemo(() => {
    return Object.fromEntries(
      SECTION_SPECS.map((spec) => [
        spec.key,
        resume.sections[spec.key].filter((item) => item.selected).length,
      ])
    ) as Record<SectionKey, number>;
  }, [resume.sections]);

  const totalSelected = useMemo(
    () => Object.values(selectedCounts).reduce((sum, value) => sum + value, 0),
    [selectedCounts]
  );

  if (authChecking || loading) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-5">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center font-bold text-slate-500 shadow-lg">
          마스터 이력을 불러오는 중입니다.
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-5">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-black text-slate-900">교사 로그인이 필요합니다.</h1>
          <Link href="/teacher" className="mt-5 inline-block rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white">
            ← 교사용 홈
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-white p-5 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-slate-400">MASTER RESUME</div>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">🗂️ 마스터 이력 관리</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-slate-500">
                모든 경력·자격·연수를 한 번만 저장해 두고, 지원할 때 체크된 항목만 골라 이력서에 사용할 수 있도록 관리합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/teacher/application-documents" className="rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                제출서류 →
              </Link>
              <Link href="/teacher/manage/operations" className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                ← 일정 · 운영
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black text-slate-400">현재 선택 항목</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{totalSelected}개</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 sm:col-span-2">
              <div className="text-xs font-black text-emerald-600">저장 원칙</div>
              <div className="mt-1 text-sm font-bold leading-relaxed text-emerald-900">
                이력 데이터는 로그인 계정별 Firestore에 저장합니다. 공개 GitHub 코드에는 개인 이력이 들어가지 않습니다.
              </div>
            </div>
          </div>
        </section>

        {(notice || errorMessage) && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${errorMessage ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {errorMessage || notice}
          </div>
        )}

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-lg sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">기본정보</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">기존 제출서류에 저장한 이름·전화번호·생년월일은 자동으로 불러옵니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importJson} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700">JSON 가져오기</button>
              <button type="button" onClick={exportJson} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700">JSON 백업</button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-black text-slate-700">성명<input value={resume.profile.name} onChange={(e) => setProfileField("name", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
            <label className="text-sm font-black text-slate-700">생년월일<input type="date" value={resume.profile.birthDate} onChange={(e) => setProfileField("birthDate", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
            <label className="text-sm font-black text-slate-700">연락처<input value={resume.profile.phone} onChange={(e) => setProfileField("phone", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
            <label className="text-sm font-black text-slate-700">E-mail<input type="email" value={resume.profile.email} onChange={(e) => setProfileField("email", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
            <label className="text-sm font-black text-slate-700 sm:col-span-2">주소<input value={resume.profile.address} onChange={(e) => setProfileField("address", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
            <label className="text-sm font-black text-slate-700 sm:col-span-2 lg:col-span-3">이력서 제목·한줄소개<input value={resume.profile.headline} onChange={(e) => setProfileField("headline", e.target.value)} placeholder="예: 초등 한국사·세계문화 강사" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold" /></label>
          </div>
        </section>

        <div className="mt-4 space-y-4">
          {SECTION_SPECS.map((spec) => {
            const list = resume.sections[spec.key];
            const isOpen = openSections[spec.key];
            return (
              <section key={spec.key} className="rounded-[28px] bg-white shadow-lg">
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                  <button type="button" onClick={() => setOpenSections((current) => ({ ...current, [spec.key]: !current[spec.key] }))} className="text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{spec.icon}</span>
                      <div>
                        <h2 className="text-xl font-black text-slate-900">{spec.title}</h2>
                        <p className="mt-1 text-xs font-bold text-slate-500">{spec.description}</p>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">{selectedCounts[spec.key]} / {list.length} 선택</span>
                    <button type="button" onClick={() => addItem(spec.key)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white">+ 항목 추가</button>
                    <button type="button" onClick={() => setOpenSections((current) => ({ ...current, [spec.key]: !current[spec.key] }))} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{isOpen ? "접기" : "펼치기"}</button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-7 sm:pb-7">
                    {list.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400">
                        아직 등록된 항목이 없습니다. ‘+ 항목 추가’로 입력해 주세요.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {list.map((item, index) => (
                          <div key={item.id} className={`rounded-2xl border p-4 ${item.selected ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-slate-50 opacity-70"}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="flex items-center gap-2 text-sm font-black text-slate-800">
                                <input type="checkbox" checked={item.selected} onChange={(e) => updateItem(spec.key, item.id, (current) => ({ ...current, selected: e.target.checked }))} className="h-5 w-5" />
                                지원서에 사용
                              </label>
                              <div className="flex gap-1">
                                <button type="button" disabled={index === 0} onClick={() => moveItem(spec.key, index, -1)} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-slate-600 shadow-sm disabled:opacity-30">↑</button>
                                <button type="button" disabled={index === list.length - 1} onClick={() => moveItem(spec.key, index, 1)} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-slate-600 shadow-sm disabled:opacity-30">↓</button>
                                <button type="button" onClick={() => removeItem(spec.key, item.id)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-600">삭제</button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              {spec.fields.map((field) => (
                                <label key={field.key} className={`text-xs font-black text-slate-600 ${field.wide ? "sm:col-span-2" : ""}`}>
                                  {field.label}
                                  <input
                                    value={item.fields[field.key] || ""}
                                    onChange={(e) => updateItem(spec.key, item.id, (current) => ({
                                      ...current,
                                      fields: { ...current.fields, [field.key]: e.target.value },
                                    }))}
                                    placeholder={field.placeholder}
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-400"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="sticky bottom-3 mt-5 rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:flex sm:items-center sm:justify-between sm:px-5">
          <div className="mb-2 text-xs font-bold text-slate-500 sm:mb-0">
            체크 해제한 항목은 삭제되지 않고, 다음 지원서에서 다시 선택할 수 있습니다.
          </div>
          <button type="button" disabled={saving} onClick={saveResume} className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50 sm:w-auto">
            {saving ? "저장 중..." : "마스터 이력 저장"}
          </button>
        </div>
      </div>
    </main>
  );
}

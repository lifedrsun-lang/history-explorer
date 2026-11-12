export type ResumeSection = "education" | "experience" | "training" | "certificates";

export type ResumeEntry = {
  id: string;
  period: string;
  title: string;
  detail: string;
};

export type ResumeData = {
  headline: string;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  photoDataUrl: string;
  introduction: string;
  education: ResumeEntry[];
  experience: ResumeEntry[];
  training: ResumeEntry[];
  certificates: ResumeEntry[];
};

export const RESUME_SECTIONS: { key: ResumeSection; label: string; first: string; second: string }[] = [
  { key: "education", label: "학력사항", first: "학교·과정", second: "전공·내용" },
  { key: "experience", label: "경력사항", first: "담당 업무·활동", second: "소속 기관" },
  { key: "training", label: "교육 이수 및 연수", first: "교육·연수명", second: "교육 기관" },
  { key: "certificates", label: "자격사항", first: "자격증명", second: "발급 기관" },
];

export const emptyResume = (): ResumeData => ({
  headline: "초등 한국사·세계문화 강사 이력서",
  name: "",
  birthDate: "",
  phone: "",
  email: "",
  address: "",
  photoDataUrl: "",
  introduction: "",
  education: [],
  experience: [],
  training: [],
  certificates: [],
});

const safeText = (value: unknown, limit = 200) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

const safeEntries = (value: unknown): ResumeEntry[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.slice(0, 70).map((raw, index) => {
    const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    let id = safeText(item.id, 80).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!id || ids.has(id)) id = `entry_${index}_${Math.random().toString(36).slice(2, 10)}`;
    ids.add(id);
    return {
      id,
      period: safeText(item.period, 70),
      title: safeText(item.title, 700),
      detail: safeText(item.detail, 300),
    };
  }).filter(item => item.period || item.title || item.detail);
};

export function normalizeResume(value: unknown): ResumeData {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const photoDataUrl = safeText(source.photoDataUrl, 300_000);
  if (photoDataUrl && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photoDataUrl)) {
    throw new Error("invalid_resume_photo");
  }
  const data: ResumeData = {
    headline: safeText(source.headline, 100) || "초등 한국사·세계문화 강사 이력서",
    name: safeText(source.name, 100),
    birthDate: safeText(source.birthDate, 20),
    phone: safeText(source.phone, 50),
    email: safeText(source.email, 254),
    address: safeText(source.address, 250),
    photoDataUrl,
    introduction: safeText(source.introduction, 3000),
    education: safeEntries(source.education),
    experience: safeEntries(source.experience),
    training: safeEntries(source.training),
    certificates: safeEntries(source.certificates),
  };
  if (new TextEncoder().encode(JSON.stringify(data)).length > 800_000) {
    throw new Error("resume_too_large");
  }
  return data;
}

export function selectResumeEntries(
  resume: ResumeData,
  selected: Partial<Record<ResumeSection, string[]>> | undefined
): ResumeData {
  if (!selected) return resume;
  const next = { ...resume };
  for (const { key } of RESUME_SECTIONS) {
    const ids = selected[key];
    if (Array.isArray(ids)) {
      const set = new Set(ids.filter(id => typeof id === "string"));
      next[key] = resume[key].filter(entry => set.has(entry.id));
    }
  }
  return next;
}

"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type ColorKey =
  | "blue"
  | "violet"
  | "emerald"
  | "orange"
  | "rose"
  | "cyan"
  | "amber"
  | "fuchsia"
  | "lime"
  | "indigo";

type SchoolColorMap = Record<string, ColorKey>;

type PaletteItem = {
  key: ColorKey;
  label: string;
  soft: string;
  strong: string;
  text: string;
};

const PALETTE: PaletteItem[] = [
  { key: "blue", label: "파랑", soft: "#DBEAFE", strong: "#2563EB", text: "#1E3A8A" },
  { key: "violet", label: "보라", soft: "#EDE9FE", strong: "#7C3AED", text: "#5B21B6" },
  { key: "emerald", label: "초록", soft: "#D1FAE5", strong: "#059669", text: "#065F46" },
  { key: "orange", label: "주황", soft: "#FFEDD5", strong: "#EA580C", text: "#9A3412" },
  { key: "rose", label: "분홍", soft: "#FFE4E6", strong: "#E11D48", text: "#9F1239" },
  { key: "cyan", label: "하늘", soft: "#CFFAFE", strong: "#0891B2", text: "#155E75" },
  { key: "amber", label: "노랑", soft: "#FEF3C7", strong: "#D97706", text: "#92400E" },
  { key: "fuchsia", label: "자주", soft: "#FAE8FF", strong: "#C026D3", text: "#86198F" },
  { key: "lime", label: "연두", soft: "#ECFCCB", strong: "#65A30D", text: "#3F6212" },
  { key: "indigo", label: "남색", soft: "#E0E7FF", strong: "#4F46E5", text: "#3730A3" },
];

const PALETTE_BY_KEY = new Map(PALETTE.map((item) => [item.key, item]));
const EVENT_BUTTON_REQUIRED_CLASSES = ["block", "w-full", "rounded-xl", "text-left", "font-black"];

const normalizeButtonText = (value: string) => value.replace(/\s+/g, " ").trim();

const getEventSummaryFromButton = (button: HTMLButtonElement) => {
  const text = normalizeButtonText(button.textContent || "");
  return text.replace(/^(?:종일|시간 미정|\d{1,2}:\d{2})\s*/, "").trim();
};

const getSchoolNameFromSummary = (summary: string) => {
  const withoutOwnerPrefix = summary.replace(/^[^)]{1,30}\)\s*/, "").trim();
  const firstSegment = withoutOwnerPrefix.split("/")[0]?.trim() || "";
  if (!firstSegment) return "기타";

  const schoolMatch = firstSegment.match(/^(.+?(?:초등학교|중학교|고등학교|초|중|고))(?:\s|$)/);
  if (schoolMatch?.[1]) {
    return schoolMatch[1].trim();
  }

  if (withoutOwnerPrefix.includes("/")) {
    return firstSegment;
  }

  return "기타";
};

const getAutoColorKey = (schoolName: string): ColorKey => {
  let hash = 0;
  for (let index = 0; index < schoolName.length; index += 1) {
    hash = (hash * 31 + schoolName.charCodeAt(index)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length].key;
};

const isTeachingEventButton = (element: Element): element is HTMLButtonElement => {
  return (
    element instanceof HTMLButtonElement &&
    EVENT_BUTTON_REQUIRED_CLASSES.every((className) => element.classList.contains(className))
  );
};

const getTeachingEventButtons = () => {
  return Array.from(document.querySelectorAll("button")).filter(isTeachingEventButton);
};

const applySchoolColor = (
  button: HTMLButtonElement,
  schoolName: string,
  schoolColors: SchoolColorMap
) => {
  const colorKey = schoolColors[schoolName] || getAutoColorKey(schoolName);
  const palette = PALETTE_BY_KEY.get(colorKey) || PALETTE[0];
  const selected = button.classList.contains("bg-blue-600");

  button.dataset.teacherSchoolName = schoolName;
  button.style.backgroundColor = selected ? palette.strong : palette.soft;
  button.style.color = selected ? "#FFFFFF" : palette.text;
  button.style.boxShadow = selected ? `0 0 0 2px ${palette.strong}55` : "none";
};

export default function SchoolCalendarColorEnhancer() {
  const [user, setUser] = useState<User | null>(null);
  const [schoolColors, setSchoolColors] = useState<SchoolColorMap>({});
  const [schoolNames, setSchoolNames] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingSchool, setSavingSchool] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
  }, []);

  const requestJson = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!user) throw new Error("교사 로그인이 필요합니다.");
      const token = await user.getIdToken();
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
      if (!response.ok) throw new Error(data?.error || "학교 색상 설정을 처리하지 못했습니다.");
      return data;
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadPreferences = async () => {
      setLoading(true);
      try {
        const data = await requestJson("/api/teacher/google-calendar/preferences");
        if (!active) return;
        setSchoolColors((data?.schoolColors || {}) as SchoolColorMap);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "학교 색상 설정을 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPreferences();
    return () => {
      active = false;
    };
  }, [requestJson, user]);

  const repaint = useCallback(() => {
    const buttons = getTeachingEventButtons();
    const names = new Set<string>();

    buttons.forEach((button) => {
      const summary = getEventSummaryFromButton(button);
      if (!summary) return;
      const schoolName = getSchoolNameFromSummary(summary);
      names.add(schoolName);
      applySchoolColor(button, schoolName, schoolColors);
    });

    const nextNames = Array.from(names).sort((a, b) => a.localeCompare(b, "ko-KR"));
    setSchoolNames((current) => {
      if (current.length === nextNames.length && current.every((name, index) => name === nextNames[index])) {
        return current;
      }
      return nextNames;
    });
  }, [schoolColors]);

  useEffect(() => {
    repaint();
    const observer = new MutationObserver(() => repaint());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [repaint]);

  const saveSchoolColor = async (schoolName: string, colorKey: ColorKey | "") => {
    const previous = schoolColors;
    const next = { ...schoolColors };
    if (colorKey) next[schoolName] = colorKey;
    else delete next[schoolName];

    setSchoolColors(next);
    setSavingSchool(schoolName);
    setError("");

    try {
      const data = await requestJson("/api/teacher/google-calendar/preferences", {
        method: "PATCH",
        body: JSON.stringify({ schoolName, colorKey }),
      });
      setSchoolColors((data?.schoolColors || {}) as SchoolColorMap);
    } catch (saveError) {
      setSchoolColors(previous);
      setError(saveError instanceof Error ? saveError.message : "학교 색상을 저장하지 못했습니다.");
    } finally {
      setSavingSchool("");
    }
  };

  const schoolLegend = useMemo(
    () =>
      schoolNames.map((schoolName) => {
        const colorKey = schoolColors[schoolName] || getAutoColorKey(schoolName);
        const palette = PALETTE_BY_KEY.get(colorKey) || PALETTE[0];
        return { schoolName, palette };
      }),
    [schoolColors, schoolNames]
  );

  if (schoolNames.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-2">
        <div className="hidden max-w-sm flex-wrap justify-end gap-1.5 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-slate-200 backdrop-blur sm:flex">
          {schoolLegend.slice(0, 6).map(({ schoolName, palette }) => (
            <span
              key={schoolName}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black"
              style={{ backgroundColor: palette.soft, color: palette.text }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.strong }} />
              {schoolName}
            </span>
          ))}
          {schoolLegend.length > 6 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
              +{schoolLegend.length - 6}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:bg-slate-800"
        >
          🎨 학교 색상 설정
        </button>
      </div>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="학교 색상 설정"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-900">🎨 학교별 색상</div>
                <div className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  현재 달력에서 발견한 학교입니다. 지정하지 않은 학교는 이름을 기준으로 자동색이 적용됩니다.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
              >
                닫기
              </button>
            </div>

            {loading && (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                저장된 색상을 불러오는 중...
              </div>
            )}

            <div className="mt-5 space-y-3">
              {schoolNames.map((schoolName) => {
                const selectedKey = schoolColors[schoolName] || "";
                const autoKey = getAutoColorKey(schoolName);
                const activePalette = PALETTE_BY_KEY.get(selectedKey || autoKey) || PALETTE[0];
                const saving = savingSchool === schoolName;

                return (
                  <div key={schoolName} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: activePalette.strong }} />
                        <span className="text-sm font-black text-slate-900">{schoolName}</span>
                        {!selectedKey && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                            자동
                          </span>
                        )}
                      </div>
                      {saving && <span className="text-[11px] font-bold text-slate-400">저장 중...</span>}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveSchoolColor(schoolName, "")}
                        className={`rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-50 ${
                          !selectedKey
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        자동
                      </button>
                      {PALETTE.map((palette) => {
                        const selected = selectedKey === palette.key;
                        return (
                          <button
                            key={palette.key}
                            type="button"
                            title={palette.label}
                            aria-label={`${schoolName} ${palette.label}`}
                            disabled={saving}
                            onClick={() => void saveSchoolColor(schoolName, palette.key)}
                            className="h-9 w-9 rounded-xl border-2 transition disabled:opacity-50"
                            style={{
                              backgroundColor: palette.strong,
                              borderColor: selected ? "#0F172A" : "transparent",
                              boxShadow: selected ? "0 0 0 2px #FFFFFF inset" : "none",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-800">
              이 색상은 Sun Lab 달력 표시용입니다. Google Calendar의 원본 일정 색상은 변경하지 않습니다.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

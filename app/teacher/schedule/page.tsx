"use client";

import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type ScheduleItem = {
  id: string;
  schoolName: string;
  title: string;
  dueDate?: string;
  completed?: boolean;
};

type ScheduleTab = "tasks" | "teaching";
type CalendarView = "all" | "afterSchool" | "contract";
type CalendarKind = "afterSchool" | "contract";
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

type CalendarSourceStatus = {
  found: boolean;
  name: string;
};

type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  calendarFound: boolean;
  calendars: {
    afterSchool: CalendarSourceStatus;
    contract: CalendarSourceStatus;
  };
  targetCalendarNames?: {
    afterSchool: string;
    contract: string;
  };
};

type GoogleCalendarEvent = {
  id: string;
  calendarType: CalendarKind;
  calendarName: string;
  summary: string;
  description: string;
  location: string;
  htmlLink: string;
  status: string;
  start: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  updated: string;
};

type CalendarDay = {
  key: string;
  day: number;
  inCurrentMonth: boolean;
};

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
const DEFAULT_TARGET_NAMES = {
  afterSchool: "출강일정/방과후",
  contract: "출강일정/건별계약",
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const getMonthRange = (cursor: Date) => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  return {
    timeMin: `${year}-${pad2(month + 1)}-01T00:00:00+09:00`,
    timeMax: `${nextYear}-${pad2(nextMonth + 1)}-01T00:00:00+09:00`,
  };
};

const getCalendarDays = (cursor: Date): CalendarDay[] => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const visibleCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  return Array.from({ length: visibleCount }, (_, index) => {
    const date = new Date(Date.UTC(year, month, 1 - firstWeekday + index));
    const cellYear = date.getUTCFullYear();
    const cellMonth = date.getUTCMonth();
    const cellDay = date.getUTCDate();
    return {
      key: `${cellYear}-${pad2(cellMonth + 1)}-${pad2(cellDay)}`,
      day: cellDay,
      inCurrentMonth: cellMonth === month,
    };
  });
};

const getSeoulDateKey = (dateTime: string) => {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getEventDateKey = (event: GoogleCalendarEvent) => {
  if (event.start.date) return event.start.date;
  if (event.start.dateTime) return getSeoulDateKey(event.start.dateTime);
  return "";
};

const getEventTimeLabel = (event: GoogleCalendarEvent) => {
  if (event.start.date) return "종일";
  if (!event.start.dateTime) return "시간 미정";
  const start = new Date(event.start.dateTime);
  if (Number.isNaN(start.getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(start);
};

const getEventDetailTime = (event: GoogleCalendarEvent) => {
  if (event.start.date) return `${event.start.date} · 종일`;
  if (!event.start.dateTime) return "시간 미정";
  const start = new Date(event.start.dateTime);
  const end = event.end.dateTime ? new Date(event.end.dateTime) : null;
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (Number.isNaN(start.getTime())) return "시간 미정";
  if (!end || Number.isNaN(end.getTime())) return formatter.format(start);
  return `${formatter.format(start)} ~ ${timeFormatter.format(end)}`;
};

const getSchoolNameFromSummary = (summary: string) => {
  const withoutOwnerPrefix = summary.replace(/^[^)]{1,30}\)\s*/, "").trim();
  const firstSegment = withoutOwnerPrefix.split("/")[0]?.trim() || "";
  if (!firstSegment) return "기타";
  const schoolMatch = firstSegment.match(/^(.+?(?:초등학교|중학교|고등학교|초|중|고))(?:\s|$)/);
  if (schoolMatch?.[1]) return schoolMatch[1].trim();
  if (withoutOwnerPrefix.includes("/")) return firstSegment;
  return "기타";
};

const getAutoColorKey = (schoolName: string): ColorKey => {
  let hash = 0;
  for (let index = 0; index < schoolName.length; index += 1) {
    hash = (hash * 31 + schoolName.charCodeAt(index)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length].key;
};

const calendarKindLabel = (kind: CalendarKind) =>
  kind === "afterSchool" ? "방과후" : "건별계약";

export default function TeacherSchedulePage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ScheduleTab>("tasks");

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [schoolNames, setSchoolNames] = useState<string[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskError, setTaskError] = useState("");

  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendarView, setCalendarView] = useState<CalendarView>("all");
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [calendarNotice, setCalendarNotice] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | null>(null);

  const [schoolColors, setSchoolColors] = useState<Record<string, ColorKey>>({});
  const [colorSettingsOpen, setColorSettingsOpen] = useState(false);
  const [colorSettingsLoading, setColorSettingsLoading] = useState(false);
  const [savingSchool, setSavingSchool] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "teaching") setActiveTab("teaching");

    const googleCalendarResult = params.get("googleCalendar");
    if (googleCalendarResult === "connected") {
      setCalendarNotice("Google Calendar 연결이 완료되었습니다.");
    } else if (googleCalendarResult === "calendar-missing") {
      setCalendarNotice("Google Calendar는 연결됐지만 출강용 캘린더를 찾지 못했습니다.");
    } else if (googleCalendarResult === "cancelled") {
      setCalendarNotice("Google Calendar 연결이 취소되었습니다.");
    } else if (googleCalendarResult === "error") {
      setCalendarError("Google Calendar 연결 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }

    if (params.has("googleCalendar")) {
      params.delete("googleCalendar");
      params.delete("tab");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
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
      if (!response.ok) throw new Error(data?.error || "요청 처리에 실패했습니다.");
      return data;
    },
    [user]
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setTaskError("");
    try {
      const data = await requestJson("/api/teacher/schedule");
      setItems(Array.isArray(data?.items) ? data.items : []);
      setSchoolNames(Array.isArray(data?.schoolNames) ? data.schoolNames : []);
    } catch (loadError) {
      setTaskError(loadError instanceof Error ? loadError.message : "교사일정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [requestJson, user]);

  const loadCalendarStatus = useCallback(async () => {
    if (!user) return null;
    setCalendarLoading(true);
    setCalendarError("");
    try {
      const data = (await requestJson("/api/teacher/google-calendar/status")) as GoogleCalendarStatus;
      setCalendarStatus(data);
      return data;
    } catch (loadError) {
      setCalendarError(
        loadError instanceof Error ? loadError.message : "Google Calendar 상태를 확인하지 못했습니다."
      );
      return null;
    } finally {
      setCalendarLoading(false);
    }
  }, [requestJson, user]);

  const loadSchoolColors = useCallback(async () => {
    if (!user) return;
    setColorSettingsLoading(true);
    try {
      const data = await requestJson("/api/teacher/google-calendar/preferences");
      setSchoolColors((data?.schoolColors || {}) as Record<string, ColorKey>);
    } catch (loadError) {
      setCalendarError(
        loadError instanceof Error ? loadError.message : "학교 색상 설정을 불러오지 못했습니다."
      );
    } finally {
      setColorSettingsLoading(false);
    }
  }, [requestJson, user]);

  const loadCalendarEvents = useCallback(
    async (cursor: Date) => {
      if (!user) return;
      const { timeMin, timeMax } = getMonthRange(cursor);
      setCalendarLoading(true);
      setCalendarError("");
      try {
        const data = await requestJson(
          `/api/teacher/google-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
        );
        const events = Array.isArray(data?.events) ? (data.events as GoogleCalendarEvent[]) : [];
        setCalendarEvents(events);
        setSelectedEvent((current) => {
          if (!current) return null;
          return events.find((event) => event.id === current.id) || null;
        });
        setCalendarStatus((current) =>
          current
            ? {
                ...current,
                calendarFound: Boolean(data?.calendarFound),
                calendars: data?.calendars || current.calendars,
              }
            : current
        );
      } catch (loadError) {
        setCalendarEvents([]);
        setCalendarError(
          loadError instanceof Error ? loadError.message : "출강일정을 불러오지 못했습니다."
        );
      } finally {
        setCalendarLoading(false);
      }
    },
    [requestJson, user]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === "teaching" && user) {
      void loadCalendarStatus();
      void loadSchoolColors();
    }
  }, [activeTab, loadCalendarStatus, loadSchoolColors, user]);

  useEffect(() => {
    if (activeTab === "teaching" && calendarStatus?.configured && calendarStatus.connected) {
      void loadCalendarEvents(calendarCursor);
    }
  }, [activeTab, calendarCursor, calendarStatus?.configured, calendarStatus?.connected, loadCalendarEvents]);

  const addItem = async () => {
    if (!schoolName.trim() || !title.trim()) {
      setTaskError("학교와 일정 내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setTaskError("");
    try {
      await requestJson("/api/teacher/schedule", {
        method: "POST",
        body: JSON.stringify({ schoolName, title, dueDate }),
      });
      setTitle("");
      setDueDate("");
      await loadData();
    } catch (saveError) {
      setTaskError(saveError instanceof Error ? saveError.message : "일정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCompleted = async (item: ScheduleItem) => {
    const nextValue = !item.completed;
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, completed: nextValue } : currentItem
      )
    );
    try {
      await requestJson("/api/teacher/schedule", {
        method: "PATCH",
        body: JSON.stringify({ id: item.id, completed: nextValue }),
      });
    } catch (toggleError) {
      setTaskError(
        toggleError instanceof Error ? toggleError.message : "완료 상태를 저장하지 못했습니다."
      );
      await loadData();
    }
  };

  const deleteItem = async (item: ScheduleItem) => {
    if (!confirm(`${item.schoolName} · ${item.title}\n일정을 삭제할까요?`)) return;
    try {
      await requestJson(`/api/teacher/schedule?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    } catch (deleteError) {
      setTaskError(deleteError instanceof Error ? deleteError.message : "일정을 삭제하지 못했습니다.");
    }
  };

  const connectGoogleCalendar = async () => {
    setCalendarConnecting(true);
    setCalendarError("");
    setCalendarNotice("");
    try {
      const data = await requestJson("/api/teacher/google-calendar/connect", { method: "POST" });
      const authorizationUrl = String(data?.authorizationUrl || "");
      const parsed = new URL(authorizationUrl);
      if (parsed.protocol !== "https:" || parsed.hostname !== "accounts.google.com") {
        throw new Error("Google Calendar 연결 주소가 올바르지 않습니다.");
      }
      window.location.assign(authorizationUrl);
    } catch (connectError) {
      setCalendarError(
        connectError instanceof Error ? connectError.message : "Google Calendar 연결을 시작하지 못했습니다."
      );
      setCalendarConnecting(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!confirm("Google Calendar 연결을 해제할까요?\n기존 Google 일정은 삭제되지 않습니다.")) return;
    setCalendarLoading(true);
    setCalendarError("");
    try {
      await requestJson("/api/teacher/google-calendar/disconnect", { method: "DELETE" });
      setCalendarStatus((current) =>
        current
          ? {
              ...current,
              connected: false,
              calendarFound: false,
              calendars: {
                afterSchool: { found: false, name: DEFAULT_TARGET_NAMES.afterSchool },
                contract: { found: false, name: DEFAULT_TARGET_NAMES.contract },
              },
            }
          : current
      );
      setCalendarEvents([]);
      setSelectedEvent(null);
      setCalendarNotice("Google Calendar 연결을 해제했습니다.");
    } catch (disconnectError) {
      setCalendarError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Google Calendar 연결을 해제하지 못했습니다."
      );
    } finally {
      setCalendarLoading(false);
    }
  };

  const refreshGoogleCalendar = async () => {
    setCalendarNotice("");
    const nextStatus = await loadCalendarStatus();
    if (nextStatus?.connected) await loadCalendarEvents(calendarCursor);
  };

  const saveSchoolColor = async (school: string, colorKey: ColorKey | "") => {
    const previous = schoolColors;
    const next = { ...schoolColors };
    if (colorKey) next[school] = colorKey;
    else delete next[school];
    setSchoolColors(next);
    setSavingSchool(school);
    setCalendarError("");
    try {
      const data = await requestJson("/api/teacher/google-calendar/preferences", {
        method: "PATCH",
        body: JSON.stringify({ schoolName: school, colorKey }),
      });
      setSchoolColors((data?.schoolColors || {}) as Record<string, ColorKey>);
    } catch (saveError) {
      setSchoolColors(previous);
      setCalendarError(saveError instanceof Error ? saveError.message : "학교 색상을 저장하지 못했습니다.");
    } finally {
      setSavingSchool("");
    }
  };

  const visibleItems = useMemo(
    () => items.filter((item) => showCompleted || !item.completed),
    [items, showCompleted]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    visibleItems.forEach((item) => {
      const school = item.schoolName || "미지정";
      const list = map.get(school) || [];
      list.push(item);
      map.set(school, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "ko-KR"));
  }, [visibleItems]);

  const pendingCount = items.filter((item) => !item.completed).length;
  const calendarDays = useMemo(() => getCalendarDays(calendarCursor), [calendarCursor]);
  const calendarCounts = useMemo(
    () => ({
      all: calendarEvents.length,
      afterSchool: calendarEvents.filter((event) => event.calendarType === "afterSchool").length,
      contract: calendarEvents.filter((event) => event.calendarType === "contract").length,
    }),
    [calendarEvents]
  );
  const filteredCalendarEvents = useMemo(
    () =>
      calendarView === "all"
        ? calendarEvents
        : calendarEvents.filter((event) => event.calendarType === calendarView),
    [calendarEvents, calendarView]
  );
  const eventsByDate = useMemo(() => {
    const map = new Map<string, GoogleCalendarEvent[]>();
    filteredCalendarEvents.forEach((event) => {
      const key = getEventDateKey(event);
      if (!key) return;
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    });
    map.forEach((list) =>
      list.sort((a, b) => {
        const aTime = a.start.dateTime || a.start.date || "";
        const bTime = b.start.dateTime || b.start.date || "";
        return aTime.localeCompare(bTime);
      })
    );
    return map;
  }, [filteredCalendarEvents]);
  const teachingSchoolNames = useMemo(
    () =>
      Array.from(new Set(calendarEvents.map((event) => getSchoolNameFromSummary(event.summary)))).sort(
        (a, b) => a.localeCompare(b, "ko-KR")
      ),
    [calendarEvents]
  );

  const targetNames = calendarStatus?.targetCalendarNames || DEFAULT_TARGET_NAMES;
  const calendarSources = calendarStatus?.calendars || {
    afterSchool: { found: false, name: targetNames.afterSchool },
    contract: { found: false, name: targetNames.contract },
  };
  const anyTeachingCalendarFound = calendarSources.afterSchool.found || calendarSources.contract.found;

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-6 text-center font-bold text-slate-500">
        교사 로그인 확인 중...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-6 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <div className="font-black text-slate-800">교사 로그인이 필요합니다.</div>
          <Link href="/teacher" className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white">
            교사홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black text-slate-900">📅 교사일정</div>
              <div className="mt-1 text-sm font-bold text-slate-500">
                학교별 할 일과 Google 출강일정을 한곳에서 확인합니다.
              </div>
            </div>
            <Link href="/teacher" className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
              ← 교사홈
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                activeTab === "tasks" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              할 일 등록
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("teaching")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                activeTab === "teaching" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              출강일정
            </button>
          </div>

          <div className="mt-4">
            {activeTab === "tasks" ? (
              <div className="inline-flex rounded-2xl bg-rose-50 px-3 py-2 text-sm font-black text-rose-700">
                미완료 {pendingCount}건
              </div>
            ) : (
              <div className="inline-flex rounded-2xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">
                Google Calendar · 방과후 + 건별계약
              </div>
            )}
          </div>
        </div>

        {activeTab === "tasks" ? (
          <>
            <section className="mt-3 rounded-[28px] bg-white p-5 shadow-sm">
              <div className="text-lg font-black text-slate-900">새 일정 추가</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_1fr]">
                <label className="text-xs font-black text-slate-600">
                  학교
                  <input
                    list="teacher-schedule-schools"
                    value={schoolName}
                    onChange={(event) => setSchoolName(event.target.value)}
                    placeholder="예: 하늘빛초"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none"
                  />
                  <datalist id="teacher-schedule-schools">
                    {schoolNames.map((school) => <option key={school} value={school} />)}
                  </datalist>
                </label>
                <label className="text-xs font-black text-slate-600">
                  할 일
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="예: 결과지 송부"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none"
                  />
                </label>
                <label className="text-xs font-black text-slate-600">
                  기한
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={addItem}
                disabled={saving}
                className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? "저장 중..." : "+ 일정 추가"}
              </button>
              {taskError && <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{taskError}</div>}
            </section>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-700">학교별 타임라인</div>
              <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(event) => setShowCompleted(event.target.checked)}
                  className="h-4 w-4 accent-slate-700"
                />
                완료된 일정 보기
              </label>
            </div>

            {loading && items.length === 0 ? (
              <div className="mt-3 rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-500">일정을 불러오는 중...</div>
            ) : grouped.length === 0 ? (
              <div className="mt-3 rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-500">표시할 일정이 없습니다.</div>
            ) : (
              <section className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {grouped.map(([school, schoolItems]) => (
                  <div key={school} className="rounded-[28px] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xl font-black text-slate-900">{school}</div>
                      <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                        {schoolItems.filter((item) => !item.completed).length}건
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {schoolItems.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-3 ${item.completed ? "border-slate-200 bg-slate-50 opacity-60" : "border-blue-100 bg-blue-50"}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(item.completed)}
                              onChange={() => toggleCompleted(item)}
                              className="mt-1 h-5 w-5 shrink-0 accent-emerald-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className={`text-sm font-black ${item.completed ? "text-slate-500 line-through" : "text-slate-900"}`}>
                                {item.title}
                              </div>
                              {item.dueDate && <div className="mt-1 text-xs font-bold text-slate-500">📌 {item.dueDate}</div>}
                            </div>
                            <button type="button" onClick={() => deleteItem(item)} className="text-xs font-black text-slate-400">삭제</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        ) : (
          <>
            <section className="mt-3 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-slate-900">Google Calendar 연동</div>
                  <div className="mt-1 text-sm font-bold leading-6 text-slate-500">
                    Google의 <span className="font-black text-blue-700">{targetNames.afterSchool}</span>과 <span className="font-black text-violet-700">{targetNames.contract}</span>을 읽기 전용으로 합쳐 보여줍니다.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {calendarStatus?.connected && (
                    <button type="button" onClick={() => void refreshGoogleCalendar()} disabled={calendarLoading} className="rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-50">새로고침</button>
                  )}
                  {calendarStatus?.connected && (
                    <button type="button" onClick={() => void disconnectGoogleCalendar()} disabled={calendarLoading} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-50">연결 해제</button>
                  )}
                </div>
              </div>

              {calendarLoading && !calendarStatus ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">Google Calendar 연결 상태를 확인하는 중...</div>
              ) : calendarStatus && !calendarStatus.configured ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">Google Calendar 연동 환경변수 설정이 필요합니다.</div>
              ) : calendarStatus && !calendarStatus.connected ? (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="text-sm font-black text-slate-900">Google Calendar를 연결해 주세요.</div>
                  <div className="mt-1 text-xs font-bold leading-5 text-slate-600">읽기 권한만 사용하며 두 출강 캘린더를 자동으로 찾습니다.</div>
                  <button type="button" onClick={() => void connectGoogleCalendar()} disabled={calendarConnecting} className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                    {calendarConnecting ? "Google 연결 준비 중..." : "Google Calendar 연결"}
                  </button>
                </div>
              ) : calendarStatus?.connected ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">연결됨</span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${calendarSources.afterSchool.found ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                    방과후 {calendarSources.afterSchool.found ? "✓" : "미확인"}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${calendarSources.contract.found ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"}`}>
                    건별계약 {calendarSources.contract.found ? "✓" : "미확인"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Google → 교사일정 단방향</span>
                </div>
              ) : null}

              {calendarStatus?.connected && !anyTeachingCalendarFound && !calendarLoading && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
                  두 출강 캘린더를 찾지 못했습니다. 이름이 <strong>{targetNames.afterSchool}</strong>, <strong>{targetNames.contract}</strong>인지 확인해 주세요.
                </div>
              )}
              {calendarStatus?.connected && anyTeachingCalendarFound && (!calendarSources.afterSchool.found || !calendarSources.contract.found) && !calendarLoading && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
                  한쪽 캘린더만 확인됐습니다. 없는 쪽을 만든 뒤 새로고침하면 자동으로 추가됩니다.
                </div>
              )}
              {calendarNotice && <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{calendarNotice}</div>}
              {calendarError && <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{calendarError}</div>}
            </section>

            {calendarStatus?.connected && anyTeachingCalendarFound && (
              <section className="mt-3 rounded-[28px] bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["all", "통합", calendarCounts.all],
                      ["afterSchool", "방과후", calendarCounts.afterSchool],
                      ["contract", "건별계약", calendarCounts.contract],
                    ] as const).map(([value, label, count]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setCalendarView(value);
                          setSelectedEvent(null);
                        }}
                        className={`rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                          calendarView === value
                            ? value === "contract"
                              ? "bg-violet-600 text-white"
                              : value === "afterSchool"
                                ? "bg-blue-600 text-white"
                                : "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {label} <span className="opacity-70">{count}</span>
                      </button>
                    ))}
                  </div>
                  {teachingSchoolNames.length > 0 && (
                    <button type="button" onClick={() => setColorSettingsOpen(true)} className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                      🎨 학교 색상 설정
                    </button>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                    className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"
                  >
                    ← 이전
                  </button>
                  <div className="text-center">
                    <div className="text-xl font-black text-slate-900">{calendarCursor.getFullYear()}년 {calendarCursor.getMonth() + 1}월</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {calendarLoading ? "Google 일정 동기화 중..." : `${filteredCalendarEvents.length}개 일정`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                    className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"
                  >
                    다음 →
                  </button>
                </div>

                <div className="mt-5 overflow-x-auto pb-2">
                  <div className="min-w-[760px] overflow-hidden rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-black text-slate-500">
                      {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => (
                        <div key={weekday} className="border-r border-slate-200 px-2 py-2.5 last:border-r-0">{weekday}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {calendarDays.map((day, index) => {
                        const dayEvents = eventsByDate.get(day.key) || [];
                        return (
                          <div
                            key={day.key}
                            className={`min-h-32 border-r border-t border-slate-200 p-2 ${index % 7 === 6 ? "border-r-0" : ""} ${day.inCurrentMonth ? "bg-white" : "bg-slate-50"}`}
                          >
                            <div className={`text-xs font-black ${day.inCurrentMonth ? "text-slate-700" : "text-slate-300"}`}>{day.day}</div>
                            <div className="mt-2 space-y-1.5">
                              {dayEvents.map((event) => {
                                const school = getSchoolNameFromSummary(event.summary);
                                const colorKey = schoolColors[school] || getAutoColorKey(school);
                                const palette = PALETTE_BY_KEY.get(colorKey) || PALETTE[0];
                                const selected = selectedEvent?.id === event.id;
                                return (
                                  <button
                                    key={event.id}
                                    type="button"
                                    onClick={() => setSelectedEvent(event)}
                                    className="block w-full rounded-xl px-2 py-1.5 text-left text-[11px] font-black leading-4 transition"
                                    style={{
                                      backgroundColor: selected ? palette.strong : palette.soft,
                                      color: selected ? "#FFFFFF" : palette.text,
                                      boxShadow: selected ? `0 0 0 2px ${palette.strong}55` : "none",
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="min-w-0 flex-1">
                                        <span className="mr-1 opacity-70">{getEventTimeLabel(event)}</span>
                                        {event.summary}
                                      </span>
                                      <span
                                        className="shrink-0 rounded-md px-1 py-0.5 text-[9px] text-white"
                                        style={{ backgroundColor: selected ? "rgba(255,255,255,0.22)" : palette.strong }}
                                      >
                                        {calendarKindLabel(event.calendarType)}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {selectedEvent && (
              <section className="mt-3 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${selectedEvent.calendarType === "afterSchool" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>
                        {calendarKindLabel(selectedEvent.calendarType)}
                      </span>
                      <span className="text-xs font-black text-slate-400">{getSchoolNameFromSummary(selectedEvent.summary)}</span>
                    </div>
                    <div className="mt-2 text-xl font-black text-slate-900">{selectedEvent.summary}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedEvent(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">닫기</button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-black text-slate-400">날짜 · 시간</div>
                    <div className="mt-1 text-sm font-black text-slate-800">{getEventDetailTime(selectedEvent)}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-black text-slate-400">장소</div>
                    <div className="mt-1 text-sm font-black text-slate-800">{selectedEvent.location || "등록된 장소 없음"}</div>
                  </div>
                </div>
                {selectedEvent.description && (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-black text-slate-400">설명</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-700">{selectedEvent.description}</div>
                  </div>
                )}
                {selectedEvent.htmlLink && (
                  <a href={selectedEvent.htmlLink} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">
                    Google Calendar에서 열기 ↗
                  </a>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {colorSettingsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="학교 색상 설정"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setColorSettingsOpen(false);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-900">🎨 학교별 색상</div>
                <div className="mt-1 text-xs font-bold leading-5 text-slate-500">두 출강 캘린더에서 발견한 학교를 기준으로 설정합니다. 지정하지 않은 학교는 자동색이 적용됩니다.</div>
              </div>
              <button type="button" onClick={() => setColorSettingsOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">닫기</button>
            </div>

            {colorSettingsLoading && <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">저장된 색상을 불러오는 중...</div>}

            <div className="mt-5 space-y-3">
              {teachingSchoolNames.map((school) => {
                const selectedKey = schoolColors[school] || "";
                const autoKey = getAutoColorKey(school);
                const activePalette = PALETTE_BY_KEY.get(selectedKey || autoKey) || PALETTE[0];
                const isSaving = savingSchool === school;
                return (
                  <div key={school} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: activePalette.strong }} />
                        <span className="text-sm font-black text-slate-900">{school}</span>
                        {!selectedKey && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">자동</span>}
                      </div>
                      {isSaving && <span className="text-[11px] font-bold text-slate-400">저장 중...</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void saveSchoolColor(school, "")}
                        className={`rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-50 ${!selectedKey ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                      >
                        자동
                      </button>
                      {PALETTE.map((palette) => (
                        <button
                          key={palette.key}
                          type="button"
                          title={palette.label}
                          aria-label={`${school} ${palette.label}`}
                          disabled={isSaving}
                          onClick={() => void saveSchoolColor(school, palette.key)}
                          className="h-9 w-9 rounded-xl border-2 transition disabled:opacity-50"
                          style={{
                            backgroundColor: palette.strong,
                            borderColor: selectedKey === palette.key ? "#0F172A" : "transparent",
                            boxShadow: selectedKey === palette.key ? "0 0 0 2px #FFFFFF inset" : "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold leading-5 text-blue-800">
              이 색상은 Sun Lab 표시용입니다. Google Calendar 원본 일정과 색상은 변경하지 않습니다.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

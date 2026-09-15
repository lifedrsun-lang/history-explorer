"use client";

import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { auth } from "@/lib/firebase";

type GoogleCalendarEvent = {
  id: string;
  calendarType: "afterSchool" | "contract";
  calendarName: string;
  summary: string;
  description: string;
  location: string;
  status: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
};

type Profile = {
  name: string;
  phone: string;
  signatureDataUrl: string | null;
};

type ScheduleSnapshotItem = {
  eventId: string;
  calendarType: string;
  date: string;
  summary: string;
  gradeClass: string;
  lessonLabel: string;
};

type Confirmation = {
  id: string;
  programName?: string;
  yearMonth: string;
  schoolName: string;
  schoolVerifierName?: string;
  schoolSignatureDataUrl?: string | null;
  schoolSignedAt?: string;
  educatorSignatureDataUrlSnapshot?: string | null;
  operationPeriodStart?: string;
  operationPeriodEnd?: string;
  operationPeriodSourceContractId?: string;
  scheduleSnapshot?: ScheduleSnapshotItem[];
  status?: string;
  submittedAt?: string;
  updatedAt?: string;
};

type OperationPeriod = {
  schoolName: string;
  schoolKey: string;
  startDate: string;
  endDate: string;
  sourceContractId: string;
};

type DailyRow = {
  date: string;
  sessions: number;
  remarks: string;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const getCurrentYearMonth = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
};

const getMonthRange = (yearMonth: string) => {
  const [yearText, monthText] = yearMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    timeMin: `${year}-${pad2(month)}-01T00:00:00+09:00`,
    timeMax: `${nextYear}-${pad2(nextMonth)}-01T00:00:00+09:00`,
  };
};

const getDeadlineLabel = (yearMonth: string) => {
  const [yearText, monthText] = yearMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}년 ${nextMonth}월 3일`;
};

const getSeoulDateKey = (dateTime: string) => {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
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

const normalizeSchoolKey = (value: string) =>
  String(value || "")
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초")
    .replace(/[()]/g, "")
    .trim();

const isSameSchool = (left: string, right: string) => {
  const a = normalizeSchoolKey(left);
  const b = normalizeSchoolKey(right);
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
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

const parseEventDetail = (event: GoogleCalendarEvent) => {
  const withoutOwnerPrefix = event.summary.replace(/^[^)]{1,30}\)\s*/, "").trim();
  const segments = withoutOwnerPrefix.split("/").map((item) => item.trim()).filter(Boolean);
  const detail = segments.slice(1).join(" / ") || withoutOwnerPrefix;
  const hyphenMatch = detail.match(/(\d+)\s*[-]\s*(\d+)\s*(?:반)?/);
  const gradeMatch = detail.match(/(\d+)\s*학년\s*(\d+)\s*반/);
  const matched = hyphenMatch || gradeMatch;
  const gradeClass = matched ? `${matched[1]}-${matched[2]}` : "";
  const lessonMatch = detail.match(/(\d+)\s*차시/);
  const lessonLabel = lessonMatch ? `${lessonMatch[1]}차시` : "";
  return { detail, gradeClass, lessonLabel };
};

const toScheduleSnapshot = (events: GoogleCalendarEvent[]): ScheduleSnapshotItem[] =>
  events
    .flatMap((event) => {
      const date = getEventDateKey(event);
      if (!date) return [];
      const detail = parseEventDetail(event);
      return [
        {
          eventId: event.id,
          calendarType: event.calendarType,
          date,
          summary: event.summary,
          gradeClass: detail.gradeClass,
          lessonLabel: detail.lessonLabel,
        },
      ];
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.summary.localeCompare(b.summary, "ko-KR");
    });

const getScheduleFingerprint = (items: ScheduleSnapshotItem[] | undefined) =>
  JSON.stringify(
    (items || []).map((item) => ({
      eventId: item.eventId,
      calendarType: item.calendarType,
      date: item.date,
      summary: item.summary,
      gradeClass: item.gradeClass,
      lessonLabel: item.lessonLabel,
    }))
  );

const aggregateRows = (items: ScheduleSnapshotItem[]): DailyRow[] => {
  const map = new Map<string, ScheduleSnapshotItem[]>();
  items.forEach((item) => {
    const list = map.get(item.date) || [];
    list.push(item);
    map.set(item.date, list);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entries]) => {
      const labels = Array.from(
        new Set(
          entries.map((entry) => {
            const parts = [entry.gradeClass, entry.lessonLabel].filter(Boolean);
            if (parts.length > 0) return parts.join(" ");
            return entry.summary.split("/").slice(1).join(" / ").trim() || entry.summary;
          })
        )
      );
      return { date, sessions: entries.length, remarks: labels.join(" · ") };
    });
};

const formatMonthDay = (date: string) => {
  const [, month, day] = date.split("-").map(Number);
  return month && day ? `${month}월 ${day}일` : date;
};

const formatPeriod = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return "";
  return `${startDate.replaceAll("-", ".")} ~ ${endDate.replaceAll("-", ".")}`;
};

const getTodayKorean = () =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

const getStatusLabel = (
  confirmation: Confirmation | undefined,
  scheduleCount: number,
  scheduleChanged: boolean
) => {
  if (!confirmation) return scheduleCount > 0 ? "작성완료" : "미생성";
  if (scheduleChanged && confirmation.schoolSignatureDataUrl) return "일정변경 확인필요";
  if (confirmation.submittedAt || confirmation.status === "submitted") return "제출완료";
  if (confirmation.schoolSignatureDataUrl) return "서명완료";
  if (scheduleCount > 0) return "교사서명대기";
  return "미생성";
};

export default function AtcConfirmationsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [periods, setPeriods] = useState<OperationPeriod[]>([]);
  const [profile, setProfile] = useState<Profile>({ name: "", phone: "", signatureDataUrl: null });
  const [selectedSchool, setSelectedSchool] = useState("");
  const [schoolVerifierName, setSchoolVerifierName] = useState("");
  const [schoolSignatureDataUrl, setSchoolSignatureDataUrl] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() =>
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    }), []);

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

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await requestJson("/api/teacher/application-documents/profile");
      setProfile({
        name: String(data?.profile?.name || ""),
        phone: String(data?.profile?.phone || ""),
        signatureDataUrl:
          typeof data?.profile?.signatureDataUrl === "string"
            ? data.profile.signatureDataUrl
            : null,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "강사 정보를 불러오지 못했습니다.");
    }
  }, [requestJson, user]);

  const loadMonth = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage("");
    setNoticeMessage("");
    try {
      const { timeMin, timeMax } = getMonthRange(yearMonth);
      const [atcData, calendarData] = await Promise.all([
        requestJson(`/api/teacher/atc-confirmations?yearMonth=${encodeURIComponent(yearMonth)}`),
        requestJson(
          `/api/teacher/google-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
        ),
      ]);
      setConfirmations(Array.isArray(atcData?.confirmations) ? atcData.confirmations : []);
      setPeriods(Array.isArray(atcData?.periods) ? atcData.periods : []);
      setCalendarEvents(Array.isArray(calendarData?.events) ? calendarData.events : []);
    } catch (error) {
      setCalendarEvents([]);
      setErrorMessage(
        error instanceof Error ? error.message : "ATC 참여확인서 자료를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [requestJson, user, yearMonth]);

  useEffect(() => {
    if (!user) return;
    void loadProfile();
  }, [loadProfile, user]);

  useEffect(() => {
    if (!user) return;
    void loadMonth();
  }, [loadMonth, user]);

  const schoolNames = useMemo(
    () =>
      Array.from(
        new Set(
          calendarEvents
            .map((event) => getSchoolNameFromSummary(event.summary))
            .filter((school) => school && school !== "기타")
        )
      ).sort((a, b) => a.localeCompare(b, "ko-KR")),
    [calendarEvents]
  );

  useEffect(() => {
    if (schoolNames.length === 0) {
      setSelectedSchool("");
      return;
    }
    if (!schoolNames.includes(selectedSchool)) setSelectedSchool(schoolNames[0]);
  }, [schoolNames, selectedSchool]);

  const selectedEvents = useMemo(
    () =>
      calendarEvents
        .filter((event) => isSameSchool(getSchoolNameFromSummary(event.summary), selectedSchool))
        .sort((a, b) => {
          const aDate = getEventDateKey(a);
          const bDate = getEventDateKey(b);
          if (aDate !== bDate) return aDate.localeCompare(bDate);
          return (a.start.dateTime || a.start.date || "").localeCompare(
            b.start.dateTime || b.start.date || ""
          );
        }),
    [calendarEvents, selectedSchool]
  );

  const currentScheduleSnapshot = useMemo(
    () => toScheduleSnapshot(selectedEvents),
    [selectedEvents]
  );
  const currentRows = useMemo(
    () => aggregateRows(currentScheduleSnapshot),
    [currentScheduleSnapshot]
  );

  const selectedConfirmation = useMemo(
    () => confirmations.find((item) => isSameSchool(item.schoolName, selectedSchool)),
    [confirmations, selectedSchool]
  );

  const selectedPeriod = useMemo(
    () => periods.find((period) => isSameSchool(period.schoolName, selectedSchool)),
    [periods, selectedSchool]
  );

  const operationPeriodStart =
    selectedConfirmation?.operationPeriodStart || selectedPeriod?.startDate || "";
  const operationPeriodEnd =
    selectedConfirmation?.operationPeriodEnd || selectedPeriod?.endDate || "";
  const operationPeriodSourceContractId =
    selectedConfirmation?.operationPeriodSourceContractId || selectedPeriod?.sourceContractId || "";

  const savedFingerprint = getScheduleFingerprint(selectedConfirmation?.scheduleSnapshot);
  const currentFingerprint = getScheduleFingerprint(currentScheduleSnapshot);
  const scheduleChanged = Boolean(
    selectedConfirmation?.scheduleSnapshot?.length && savedFingerprint !== currentFingerprint
  );

  useEffect(() => {
    setSchoolVerifierName(selectedConfirmation?.schoolVerifierName || "");
    const signature = selectedConfirmation?.schoolSignatureDataUrl || null;
    setSchoolSignatureDataUrl(signature);
    setSignatureMode(!signature);
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, [selectedConfirmation?.id, selectedConfirmation?.schoolSignatureDataUrl]);

  const printSnapshot = useMemo(() => {
    if (
      selectedConfirmation?.schoolSignatureDataUrl &&
      !scheduleChanged &&
      Array.isArray(selectedConfirmation.scheduleSnapshot) &&
      selectedConfirmation.scheduleSnapshot.length > 0
    ) {
      return selectedConfirmation.scheduleSnapshot;
    }
    return currentScheduleSnapshot;
  }, [currentScheduleSnapshot, scheduleChanged, selectedConfirmation]);
  const printRows = useMemo(() => aggregateRows(printSnapshot), [printSnapshot]);
  const paddedPrintRows = useMemo(() => {
    const minimumRows = 22;
    const result: Array<DailyRow | null> = [...printRows];
    while (result.length < minimumRows) result.push(null);
    return result;
  }, [printRows]);
  const totalSessions = printRows.reduce((sum, row) => sum + row.sessions, 0);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.beginPath();
    context.moveTo(
      (event.clientX - rect.left) * (canvas.width / rect.width),
      (event.clientY - rect.top) * (canvas.height / rect.height)
    );
  };

  const drawSignature = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineTo(
      (event.clientX - rect.left) * (canvas.width / rect.width),
      (event.clientY - rect.top) * (canvas.height / rect.height)
    );
    context.stroke();
  };

  const finishDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;
    drawingRef.current = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // 이미 해제된 포인터는 무시한다.
    }
    setSchoolSignatureDataUrl(canvas.toDataURL("image/png"));
  };

  const handleResign = () => {
    setSchoolSignatureDataUrl(null);
    setSignatureMode(true);
    requestAnimationFrame(resetCanvas);
  };

  const handleSave = async (markSubmitted = false) => {
    if (!selectedSchool) return;
    if (schoolSignatureDataUrl && !schoolVerifierName.trim()) {
      setErrorMessage("담당교사 성명을 입력한 뒤 서명해 주세요.");
      return;
    }
    if (markSubmitted) {
      if (scheduleChanged) {
        setErrorMessage("저장 후 출강 일정이 변경되었습니다. 새 일정으로 저장하고 담당교사 서명을 다시 받아야 합니다.");
        return;
      }
      if (!schoolSignatureDataUrl || !schoolVerifierName.trim()) {
        setErrorMessage("담당교사 확인 서명이 있어야 제출완료로 처리할 수 있습니다.");
        return;
      }
      if (!profile.signatureDataUrl) {
        setErrorMessage("에듀케이터 서명을 먼저 등록해 주세요.");
        return;
      }
    }

    setSaving(true);
    setErrorMessage("");
    setNoticeMessage("");
    try {
      const data = await requestJson("/api/teacher/atc-confirmations", {
        method: "PUT",
        body: JSON.stringify({
          yearMonth,
          schoolName: selectedSchool,
          schoolVerifierName: schoolVerifierName.trim(),
          schoolSignatureDataUrl,
          educatorSignatureDataUrlSnapshot: profile.signatureDataUrl,
          operationPeriodStart,
          operationPeriodEnd,
          operationPeriodSourceContractId,
          scheduleSnapshot: currentScheduleSnapshot,
          markSubmitted,
        }),
      });
      const saved = data?.confirmation as Confirmation;
      setConfirmations((current) => {
        const rest = current.filter((item) => item.id !== saved.id);
        return [...rest, saved].sort((a, b) => a.schoolName.localeCompare(b.schoolName, "ko-KR"));
      });
      setSchoolSignatureDataUrl(saved.schoolSignatureDataUrl || null);
      setSignatureMode(!saved.schoolSignatureDataUrl);
      setNoticeMessage(
        markSubmitted
          ? `${selectedSchool} ${Number(yearMonth.slice(5))}월 참여확인서를 제출완료로 기록했습니다.`
          : scheduleChanged && !saved.schoolSignatureDataUrl
            ? "변경된 출강일정을 반영했습니다. 기존 담당교사 서명은 보호를 위해 해제되었습니다. 새로 서명받아 주세요."
            : "참여확인서 내용을 저장했습니다."
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "참여확인서를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const printDocument = () => {
    if (scheduleChanged && selectedConfirmation?.schoolSignatureDataUrl) {
      setErrorMessage("서명 후 출강 일정이 변경되어 현재 문서는 출력할 수 없습니다. 새 일정 저장 후 담당교사 서명을 다시 받아 주세요.");
      return;
    }
    window.print();
  };

  if (authChecking) {
    return <div className="min-h-screen bg-slate-50 p-8 text-center font-bold text-slate-500">교사 로그인 확인 중...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <div className="font-black text-slate-800">교사 로그인이 필요합니다.</div>
          <Link href="/teacher" className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">교사홈으로</Link>
        </div>
      </div>
    );
  }

  const selectedStatus = getStatusLabel(selectedConfirmation, currentScheduleSnapshot.length, scheduleChanged);
  const year = Number(yearMonth.slice(0, 4));
  const month = Number(yearMonth.slice(5));

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-3 py-5 text-slate-800">
      <style>{`
        .atc-print-sheet { font-family: Arial, "Noto Sans KR", sans-serif; }
        .atc-form-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .atc-form-table th, .atc-form-table td { border: 1px solid #111827; padding: 5px 6px; vertical-align: middle; }
        .atc-signature-img { object-fit: contain; mix-blend-mode: multiply; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body { background: white !important; }
          body * { visibility: hidden !important; }
          .atc-print-sheet, .atc-print-sheet * { visibility: visible !important; }
          .atc-print-sheet { position: absolute !important; left: 0; top: 0; width: 194mm !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; }
          .no-print { display: none !important; }
          .atc-form-table th, .atc-form-table td { padding: 3px 5px !important; font-size: 10.5px !important; }
        }
      `}</style>

      <div className="no-print mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm">
          <div>
            <div className="text-xs font-black tracking-[0.2em] text-blue-600">ATC SCHOOL</div>
            <h1 className="mt-1 text-2xl font-black">전담 에듀케이터 참여확인서</h1>
            <p className="mt-1 text-sm text-slate-500">교사 출강일정과 수금관리 운영기간을 연결해 월별 확인서를 작성합니다.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/teacher/schedule?tab=teaching" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">출강일정</Link>
            <Link href="/teacher/fees" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">수금관리</Link>
            <Link href="/teacher" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">교사홈</Link>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[220px_1fr]">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <label className="text-xs font-black text-slate-500">작성 월</label>
            <input type="month" value={yearMonth} onChange={(event) => setYearMonth(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-bold" />
            <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800">제출기한: {getDeadlineLabel(yearMonth)}</div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="font-black">학교별 월마감 상태</div>
              <button type="button" onClick={() => void loadMonth()} disabled={loading} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black disabled:opacity-50">{loading ? "불러오는 중" : "일정 새로고침"}</button>
            </div>
            {schoolNames.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">이 달에 출강일정으로 확인되는 학교가 없습니다.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {schoolNames.map((school) => {
                  const confirmation = confirmations.find((item) => isSameSchool(item.schoolName, school));
                  const eventItems = calendarEvents.filter((event) => isSameSchool(getSchoolNameFromSummary(event.summary), school));
                  const snapshot = toScheduleSnapshot(eventItems);
                  const changed = Boolean(confirmation?.scheduleSnapshot?.length && getScheduleFingerprint(confirmation.scheduleSnapshot) !== getScheduleFingerprint(snapshot));
                  const label = getStatusLabel(confirmation, snapshot.length, changed);
                  const selected = school === selectedSchool;
                  return (
                    <button key={school} type="button" onClick={() => setSelectedSchool(school)} className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${selected ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white"}`}>
                      <div className="font-black">{school}</div>
                      <div className={`mt-0.5 text-xs font-bold ${changed ? "text-rose-600" : "text-slate-500"}`}>{label} · {snapshot.length}차시</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {errorMessage && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{errorMessage}</div>}
        {noticeMessage && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{noticeMessage}</div>}

        {selectedSchool && (
          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-black">자동 반영 내용</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{selectedStatus}</span>
              </div>
              <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-3 text-sm">
                <dt className="font-bold text-slate-500">학교</dt><dd className="font-black">{selectedSchool}</dd>
                <dt className="font-bold text-slate-500">운영기간</dt><dd className="font-black">{formatPeriod(operationPeriodStart, operationPeriodEnd) || "수금관리 운영기간 미등록"}</dd>
                <dt className="font-bold text-slate-500">수업일수</dt><dd className="font-black">{currentRows.length}일</dd>
                <dt className="font-bold text-slate-500">총 차시</dt><dd className="font-black">{currentScheduleSnapshot.length}차시</dd>
                <dt className="font-bold text-slate-500">본인 서명</dt><dd className="font-black">{profile.signatureDataUrl ? "등록됨 · 자동반영" : "미등록"}</dd>
              </dl>
              {!operationPeriodStart && <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800">운영기간을 확인할 수 없습니다. 수금관리의 해당 학교 건별계약에 계약 시작일·종료일을 먼저 저장해 주세요.</div>}
              {!profile.signatureDataUrl && <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800">에듀케이터 서명이 없습니다. <Link href="/teacher/application-documents" className="underline">지원서류 관리에서 서명 등록</Link> 후 다시 열면 자동 반영됩니다.</div>}
              {scheduleChanged && <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">저장/서명 이후 Google 출강일정이 변경되었습니다. 변경된 일정을 저장하면 기존 담당교사 서명은 재사용하지 않고 다시 받도록 처리됩니다.</div>}
              {currentRows.length > 22 && <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800">이 달 수업일이 원본 양식의 기본 22행을 초과했습니다. 누락 없이 모든 날짜를 출력하되 문서가 2페이지로 나뉠 수 있습니다.</div>}
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="font-black">학교 담당교사 확인</h2>
              <label className="mt-4 block text-xs font-black text-slate-500">담당교사 성명</label>
              <input value={schoolVerifierName} onChange={(event) => setSchoolVerifierName(event.target.value)} placeholder="성명 입력" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" />

              {schoolSignatureDataUrl && !signatureMode ? (
                <div className="mt-4 rounded-2xl border border-slate-200 p-3">
                  <div className="text-xs font-bold text-slate-500">반영된 담당교사 서명</div>
                  <img src={schoolSignatureDataUrl} alt="학교 담당교사 서명" className="mt-2 h-24 w-full object-contain" />
                  <button type="button" onClick={handleResign} className="mt-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black">다시 서명받기</button>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-bold text-slate-500">아래 칸에 마우스나 터치로 직접 서명하면 미리보기에 즉시 반영됩니다.</div>
                  <canvas
                    ref={canvasRef}
                    width={720}
                    height={220}
                    onPointerDown={startDrawing}
                    onPointerMove={drawSignature}
                    onPointerUp={finishDrawing}
                    onPointerCancel={finishDrawing}
                    className="h-36 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-white"
                  />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => { resetCanvas(); setSchoolSignatureDataUrl(null); }} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black">서명 지우기</button>
                    {schoolSignatureDataUrl && <button type="button" onClick={() => setSignatureMode(false)} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-black text-white">이 서명 사용</button>}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {selectedSchool && (
          <div className="mb-5 flex flex-wrap justify-end gap-2 rounded-3xl bg-white p-4 shadow-sm">
            <button type="button" onClick={() => void handleSave(false)} disabled={saving || loading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중" : "현재 내용 저장"}</button>
            <button type="button" onClick={printDocument} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black">인쇄 / PDF 저장</button>
            <button type="button" onClick={() => void handleSave(true)} disabled={saving || Boolean(selectedConfirmation?.submittedAt)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{selectedConfirmation?.submittedAt ? "제출완료" : "제출완료 표시"}</button>
          </div>
        )}
      </div>

      {selectedSchool && (
        <section className="atc-print-sheet mx-auto max-w-[850px] bg-white p-8 shadow-lg">
          <div className="text-center text-[11px] font-bold leading-relaxed">월별 참여 확인서 작성 후 운영사무국으로 메일 제출 (익월 3일까지)</div>
          <h2 className="mt-2 text-center text-xl font-black">2026 ATC스쿨 전담 에듀케이터 참여 확인서</h2>

          <table className="atc-form-table mt-5 text-[12px]">
            <tbody>
              <tr><th className="w-[16%] bg-slate-50">프로그램명</th><td className="w-[34%] font-bold">ATC스쿨</td><th className="w-[16%] bg-slate-50">학교명</th><td className="w-[34%] font-bold">{selectedSchool}</td></tr>
              <tr><th className="bg-slate-50">운영기간</th><td className="font-bold">{formatPeriod(operationPeriodStart, operationPeriodEnd) || ""}</td><th className="bg-slate-50">해당월</th><td className="font-bold">{year}년 {month}월</td></tr>
              <tr><th className="bg-slate-50">강사명</th><td className="font-bold">{profile.name}</td><th className="bg-slate-50">연락처</th><td className="font-bold">{profile.phone}</td></tr>
              <tr>
                <th className="bg-slate-50">확 인 자</th>
                <td colSpan={3}>
                  <div className="flex min-h-14 items-center gap-3">
                    <span>(소속) <b>{selectedSchool}</b></span>
                    <span>(성명) <b>{schoolVerifierName}</b></span>
                    <span className="ml-auto">학교 담당 교사 서명</span>
                    {schoolSignatureDataUrl && <img src={schoolSignatureDataUrl} alt="학교 담당교사 서명" className="atc-signature-img h-12 w-24" />}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="atc-form-table mt-4 text-center text-[11px]">
            <thead><tr className="bg-slate-50"><th className="w-[12%]">수업횟수</th><th className="w-[23%]">수업일자</th><th className="w-[16%]">수업차시</th><th>비고</th></tr></thead>
            <tbody>
              {paddedPrintRows.map((row, index) => (
                <tr key={`${row?.date || "blank"}-${index}`} className="h-7">
                  <td>{index + 1}</td>
                  <td className="font-bold">{row ? formatMonthDay(row.date) : ""}</td>
                  <td className="font-bold">{row ? row.sessions : ""}</td>
                  <td className="text-left">{row?.remarks || ""}</td>
                </tr>
              ))}
              <tr className="font-black"><td>합계</td><td>{printRows.length}일</td><td>{totalSessions}차시</td><td /></tr>
            </tbody>
          </table>

          <div className="mt-3 text-[10.5px]">※ 출석부 월별 해당차수에 해당하는 날짜를 기입.</div>
          <div className="mt-7 text-center text-[12px] font-bold">본인은 위 사항을 확인하며 참여하였음을 서명으로 증명합니다.</div>
          <div className="mt-5 text-center text-[12px] font-bold">{getTodayKorean()}</div>
          <div className="mt-6 flex items-center justify-center gap-3 text-[12px] font-bold">
            <span>에듀케이터 성명</span><span className="min-w-20 border-b border-slate-500 pb-1 text-center">{profile.name}</span><span>친필서명(인)</span>
            {profile.signatureDataUrl && <img src={profile.signatureDataUrl} alt="에듀케이터 서명" className="atc-signature-img h-14 w-28" />}
          </div>

          <div className="no-print mt-5 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">미리보기입니다. 인쇄 / PDF 저장 시 이 안내는 출력되지 않습니다.</div>
        </section>
      )}
    </main>
  );
}

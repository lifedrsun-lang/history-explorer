"use client";

import AtcPrintSheet from "./AtcPrintSheet";
import { atcPrintCss } from "@/lib/atcPrintCss";
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
import { trimSignatureCanvas, trimSignatureDataUrl } from "@/lib/signatureCanvas";

type GoogleCalendarEvent = {
  id: string;
  calendarType: "afterSchool" | "contract" | "care";
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
  birthDate: string;
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
  revision?: string;
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
  mailSentAt?: string;
  mailStatus?: string;
};

type MailSettings = { to: string; bcc: string; subjectTemplate: string; bodyTemplate: string };
type GmailStatus = { configured: boolean; connected: boolean; email: string };
type MailPreview = {
  info: { from: string; to: string; bcc: string; subject: string; body: string; filename: string; sentAt: string };
  fingerprint: string;
  pdfUrl: string;
  confirmationId: string;
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

const isContractCalendarEvent = (event: GoogleCalendarEvent) =>
  event.calendarType === "contract";

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

const formatPeriod = (startDate?: string, endDate?: string) =>
  startDate && endDate ? `${startDate.replaceAll("-", ".")} ~ ${endDate.replaceAll("-", ".")}` : "";

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
  const [profile, setProfile] = useState<Profile>({ name: "", phone: "", birthDate: "", signatureDataUrl: null });
  const [selectedSchool, setSelectedSchool] = useState("");
  const [schoolVerifierName, setSchoolVerifierName] = useState("");
  const [schoolSignatureDataUrl, setSchoolSignatureDataUrl] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState(true);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [educatorSignatureDialogOpen, setEducatorSignatureDialogOpen] = useState(false);
  const [educatorSignatureDraft, setEducatorSignatureDraft] = useState<string | null>(null);
  const [educatorSignatureSaving, setEducatorSignatureSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [mailSettings, setMailSettings] = useState<MailSettings | null>(null);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [mailBusy, setMailBusy] = useState(false);
  const [mailPreview, setMailPreview] = useState<MailPreview | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const requestedSchoolRef = useRef("");
  const signatureBeforeEditRef = useRef<string | null>(null);
  const educatorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const educatorDrawingRef = useRef(false);

  useEffect(() =>
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    }), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedYearMonth = params.get("yearMonth") || "";
    requestedSchoolRef.current = params.get("school") || "";
    if (!/^\d{4}-\d{2}$/.test(requestedYearMonth)) return;
    const timeout = window.setTimeout(() => setYearMonth(requestedYearMonth), 0);
    return () => window.clearTimeout(timeout);
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

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await requestJson("/api/teacher/application-documents/profile");
      const rawSignature =
        typeof data?.profile?.signatureDataUrl === "string"
          ? data.profile.signatureDataUrl
          : null;
      const normalizedSignature = await trimSignatureDataUrl(rawSignature);
      setProfile({
        name: String(data?.profile?.name || ""),
        phone: String(data?.profile?.phone || ""),
        birthDate: String(data?.profile?.birthDate || ""),
        signatureDataUrl: normalizedSignature,
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
      const events = Array.isArray(calendarData?.events)
        ? (calendarData.events as GoogleCalendarEvent[])
        : [];
      setCalendarEvents(events.filter(isContractCalendarEvent));
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

  useEffect(() => {
    if (!user) return;
    void requestJson("/api/teacher/atc-confirmations/mail-settings")
      .then((data) => setMailSettings(data.settings))
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : "메일 설정을 불러오지 못했습니다."));
  }, [requestJson, user]);

  useEffect(() => {
    if (!user) return;
    void requestJson("/api/teacher/atc-confirmations/gmail-status")
      .then((data) => setGmailStatus(data as GmailStatus))
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : "Gmail 연결 상태를 확인하지 못했습니다."));
  }, [requestJson, user]);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("atcGmail");
    if (!status) return;
    const messages: Record<string, string> = {
      connected: "lifedr.sun@gmail.com 계정을 연결했습니다. 발송 전 PDF와 메일 내용을 확인해 주세요.",
      cancelled: "Gmail 연결이 취소되었습니다.",
      "wrong-account": "lifedr.sun@gmail.com 계정을 선택해야 합니다. 다시 연결해 주세요.",
      error: "Gmail 연결에 실패했습니다. Google OAuth 설정과 계정을 확인해 주세요.",
    };
    window.history.replaceState(null, "", window.location.pathname + window.location.search.replace(/([?&])atcGmail=[^&]*&?/, "$1").replace(/[?&]$/, ""));
    const timeout = window.setTimeout(() => {
      if (status === "connected") setNoticeMessage(messages.connected);
      else setErrorMessage(messages[status] || messages.error);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const schoolNames = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...calendarEvents.map((event) =>
              getSchoolNameFromSummary(event.summary)
            ),
            ...confirmations.map((confirmation) => confirmation.schoolName),
          ].filter((school) => school && school !== "기타")
        )
      ).sort((a, b) => a.localeCompare(b, "ko-KR")),
    [calendarEvents, confirmations]
  );

  useEffect(() => {
    if (schoolNames.length === 0) {
      setSelectedSchool("");
      return;
    }
    const requestedSchool = requestedSchoolRef.current;
    if (requestedSchool) {
      requestedSchoolRef.current = "";
      const match = schoolNames.find((school) =>
        isSameSchool(school, requestedSchool)
      );
      if (match) {
        setSelectedSchool(match);
        return;
      }
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
    setSignatureDialogOpen(false);
    signatureBeforeEditRef.current = null;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, [selectedConfirmation?.id, selectedConfirmation?.schoolSignatureDataUrl]);

  const printSnapshot = useMemo(() => {
    if (
      selectedConfirmation &&
      Array.isArray(selectedConfirmation.scheduleSnapshot) &&
      selectedConfirmation.scheduleSnapshot.length > 0 &&
      ((selectedConfirmation.schoolSignatureDataUrl && !scheduleChanged) ||
        currentScheduleSnapshot.length === 0)
    ) {
      return selectedConfirmation.scheduleSnapshot;
    }
    return currentScheduleSnapshot;
  }, [currentScheduleSnapshot, scheduleChanged, selectedConfirmation]);
  const printRows = useMemo(() => aggregateRows(printSnapshot), [printSnapshot]);
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
    context.lineWidth = 9;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#020617";
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
    setSchoolSignatureDataUrl(trimSignatureCanvas(canvas));
  };

  const openSignatureDialog = () => {
    signatureBeforeEditRef.current = schoolSignatureDataUrl;
    setSchoolSignatureDataUrl(null);
    setSignatureMode(true);
    setSignatureDialogOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(resetCanvas));
  };

  const cancelSignatureDialog = () => {
    const previousSignature = signatureBeforeEditRef.current;
    setSchoolSignatureDataUrl(previousSignature);
    setSignatureMode(!previousSignature);
    setSignatureDialogOpen(false);
    signatureBeforeEditRef.current = null;
  };

  const useSignature = () => {
    if (!schoolSignatureDataUrl) return;
    setSignatureMode(false);
    setSignatureDialogOpen(false);
    signatureBeforeEditRef.current = null;
  };

  const resetEducatorCanvas = () => {
    const canvas = educatorCanvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const openEducatorSignatureDialog = () => {
    setEducatorSignatureDraft(null);
    setEducatorSignatureDialogOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(resetEducatorCanvas));
  };

  const startEducatorDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = educatorCanvasRef.current;
    if (!canvas) return;
    educatorDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineWidth = 9;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#020617";
    context.beginPath();
    context.moveTo(
      (event.clientX - rect.left) * (canvas.width / rect.width),
      (event.clientY - rect.top) * (canvas.height / rect.height)
    );
  };

  const drawEducatorSignature = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!educatorDrawingRef.current) return;
    const canvas = educatorCanvasRef.current;
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

  const finishEducatorDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = educatorCanvasRef.current;
    if (!canvas || !educatorDrawingRef.current) return;
    educatorDrawingRef.current = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // 이미 해제된 포인터는 무시한다.
    }
    setEducatorSignatureDraft(trimSignatureCanvas(canvas));
  };

  const saveEducatorSignature = async () => {
    if (!educatorSignatureDraft) return;
    setEducatorSignatureSaving(true);
    setErrorMessage("");
    try {
      const data = await requestJson("/api/teacher/application-documents/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          birthDate: profile.birthDate,
          signatureDataUrl: educatorSignatureDraft,
        }),
      });
      setProfile((current) => ({
        ...current,
        signatureDataUrl:
          typeof data?.profile?.signatureDataUrl === "string"
            ? data.profile.signatureDataUrl
            : educatorSignatureDraft,
      }));
      setEducatorSignatureDialogOpen(false);
      setEducatorSignatureDraft(null);
      setNoticeMessage("기본 서명을 저장했습니다. 참여확인서와 학교 필수서류에 같은 서명이 적용됩니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "기본 서명을 저장하지 못했습니다.");
    } finally {
      setEducatorSignatureSaving(false);
    }
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

    const originalTitle = document.title;
    const educatorName = profile.name.trim() || "에듀케이터";
    const printFileName = `${yearMonth.slice(0, 4)} ATC SCHOOL 전담 에듀케이터 참여확인서_${selectedSchool}_${yearMonth.slice(5)}월_${educatorName}`
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    document.title = printFileName;
    try {
      window.print();
    } finally {
      document.title = originalTitle;
    }
  };

  const closeMailPreview = () => {
    if (mailPreview) URL.revokeObjectURL(mailPreview.pdfUrl);
    setMailPreview(null);
  };

  const saveMailSettings = async () => {
    if (!mailSettings) return;
    setSettingsSaving(true);
    setErrorMessage("");
    try {
      const data = await requestJson("/api/teacher/atc-confirmations/mail-settings", {
        method: "PUT", body: JSON.stringify(mailSettings),
      });
      setMailSettings(data.settings);
      setSettingsOpen(false);
      setNoticeMessage("ATC 메일 발송 설정을 저장했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "메일 설정 저장에 실패했습니다.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const connectGmail = async () => {
    setMailBusy(true);
    setErrorMessage("");
    try {
      const data = await requestJson("/api/teacher/atc-confirmations/gmail-connect", { method: "POST" });
      window.location.assign(data.authorizationUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gmail 연결을 시작하지 못했습니다.");
      setMailBusy(false);
    }
  };

  const prepareMail = async () => {
    if (!selectedConfirmation) {
      setErrorMessage("참여확인서를 먼저 저장해 주세요.");
      return;
    }
    if (scheduleChanged || schoolVerifierName.trim() !== (selectedConfirmation.schoolVerifierName || "") ||
        schoolSignatureDataUrl !== (selectedConfirmation.schoolSignatureDataUrl || null) ||
        profile.signatureDataUrl !== (selectedConfirmation.educatorSignatureDataUrlSnapshot || null) ||
        selectedConfirmation.operationPeriodStart !== operationPeriodStart ||
        selectedConfirmation.operationPeriodEnd !== operationPeriodEnd ||
        getScheduleFingerprint(selectedConfirmation.scheduleSnapshot) !== getScheduleFingerprint(currentScheduleSnapshot)) {
      setErrorMessage("현재 화면과 저장된 확인서 내용이 다릅니다. 변경 사항을 저장하고 서명 상태를 확인해 주세요.");
      return;
    }
    if (!selectedConfirmation.schoolSignedAt) {
      setErrorMessage("저장된 실제 서명일을 확인할 수 없습니다. 담당교사 서명을 확인해 주세요.");
      return;
    }
    setMailBusy(true);
    setErrorMessage("");
    try {
      const data = await requestJson("/api/teacher/atc-confirmations/mail-preview", {
        method: "POST", body: JSON.stringify({ confirmationId: selectedConfirmation.id, revision: selectedConfirmation.revision }),
      });
      const bytes = Uint8Array.from(atob(data.pdfBase64), (character) => character.charCodeAt(0));
      const pdfUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      setMailPreview({ info: data.info, fingerprint: data.fingerprint, pdfUrl, confirmationId: selectedConfirmation.id });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "PDF를 준비하지 못했습니다.");
    } finally {
      setMailBusy(false);
    }
  };

  const sendMail = async () => {
    if (!mailPreview) return;
    const confirmRepeat = Boolean(mailPreview.info.sentAt);
    if (confirmRepeat) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(mailPreview.info.sentAt)).map((part) => [part.type, part.value]));
      const when = `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
      if (!window.confirm(`이미 ${when}에 제출한 확인서입니다.\n다시 발송하시겠습니까?`)) return;
    }
    setMailBusy(true);
    setErrorMessage("");
    try {
      await requestJson("/api/teacher/atc-confirmations/mail-send", {
        method: "POST", body: JSON.stringify({ confirmationId: mailPreview.confirmationId, fingerprint: mailPreview.fingerprint, confirmRepeat }),
      });
      closeMailPreview();
      await loadMonth();
      setNoticeMessage("Gmail API가 발송을 확인했습니다. 참여확인서를 제출완료로 기록했습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "메일 발송에 실패했습니다. 참여확인서는 제출완료 처리되지 않았습니다.";
      closeMailPreview();
      await loadMonth();
      setErrorMessage(message);
    } finally {
      setMailBusy(false);
    }
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

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-3 py-5 text-slate-800">
      <style>{atcPrintCss}</style>

      <div className="no-print mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm">
          <div>
            <div className="text-xs font-black tracking-[0.2em] text-blue-600">ATC SCHOOL</div>
            <h1 className="mt-1 text-2xl font-black">전담 에듀케이터 참여확인서</h1>
            <p className="mt-1 text-sm text-slate-500">건별계약 출강일정과 수금관리 운영기간을 연결해 월별 확인서를 작성합니다.</p>
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
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">이 달에 건별계약 출강일정으로 확인되는 학교가 없습니다.</div>
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

        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-black">Gmail 발신 계정: lifedr.sun@gmail.com</span>
            <span className="text-slate-600">{gmailStatus?.connected ? "연결됨" : gmailStatus?.configured === false ? "서버 설정 필요" : "연결 필요"}</span>
            <button type="button" onClick={() => void connectGmail()} disabled={mailBusy || !gmailStatus?.configured} className="rounded-xl border border-blue-300 px-3 py-1.5 font-bold text-blue-700 disabled:opacity-50">Gmail 계정 {gmailStatus?.connected ? "다시 연결" : "연결"}</button>
          </div>
          <button type="button" onClick={() => setSettingsOpen((current) => !current)} className="text-sm font-black text-blue-700">ATC 메일 발송 설정 {settingsOpen ? "접기" : "수정"}</button>
          {settingsOpen && mailSettings && (
            <div className="mt-4 grid gap-3 text-sm">
              {(["to", "bcc", "subjectTemplate"] as const).map((key) => (
                <label key={key} className="grid gap-1 font-bold">
                  {key === "to" ? "받는 사람(To)" : key === "bcc" ? "숨은참조(BCC)" : "제목 템플릿"}
                  <input value={mailSettings[key]} onChange={(event) => setMailSettings((current) => current && ({ ...current, [key]: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2" />
                </label>
              ))}
              <label className="grid gap-1 font-bold">본문 템플릿
                <textarea rows={7} value={mailSettings.bodyTemplate} onChange={(event) => setMailSettings((current) => current && ({ ...current, bodyTemplate: event.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <p className="text-xs text-slate-500">변수: {"{연도}"}, {"{학교명}"}, {"{해당월}"}, {"{강사명}"}</p>
              <button type="button" onClick={() => void saveMailSettings()} disabled={settingsSaving} className="w-fit rounded-xl bg-blue-600 px-4 py-2 font-black text-white disabled:opacity-50">{settingsSaving ? "저장 중" : "설정 저장"}</button>
            </div>
          )}
        </div>

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
                  <img src={schoolSignatureDataUrl} alt="학교 담당교사 서명" className="atc-signature-preview mt-2 h-24 w-full object-contain" />
                  <button type="button" onClick={openSignatureDialog} className="mt-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black">다시 서명받기</button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">버튼을 누르면 큰 서명판이 열립니다. 마우스나 터치로 서명해 주세요.</div>
                  <button type="button" onClick={openSignatureDialog} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">큰 화면에서 서명하기</button>
                </div>
              )}
            </section>
          </div>
        )}

        {signatureDialogOpen && (
          <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="학교 담당교사 서명">
            <div className="w-full max-w-5xl rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">학교 담당교사 서명</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">아래의 넓은 영역에 서명해 주세요. 저장될 때 불필요한 여백은 자동으로 정리됩니다.</p>
                </div>
                <button type="button" onClick={cancelSignatureDialog} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">취소</button>
              </div>
              <canvas
                ref={canvasRef}
                width={1200}
                height={440}
                onPointerDown={startDrawing}
                onPointerMove={drawSignature}
                onPointerUp={finishDrawing}
                onPointerCancel={finishDrawing}
                className="mt-4 h-[48vh] min-h-64 max-h-[420px] w-full touch-none rounded-2xl border-2 border-dashed border-blue-300 bg-white shadow-inner"
              />
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => { resetCanvas(); setSchoolSignatureDataUrl(null); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">서명 지우기</button>
                <button type="button" onClick={useSignature} disabled={!schoolSignatureDataUrl} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">이 서명 사용</button>
              </div>
            </div>
          </div>
        )}

        {educatorSignatureDialogOpen && (
          <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="에듀케이터 기본 서명">
            <div className="w-full max-w-5xl rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">에듀케이터 기본 서명</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">여기서 저장한 서명은 참여확인서와 학교 필수서류에 공통으로 적용됩니다.</p>
                </div>
                <button type="button" onClick={() => { setEducatorSignatureDialogOpen(false); setEducatorSignatureDraft(null); }} disabled={educatorSignatureSaving} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40">취소</button>
              </div>
              <canvas
                ref={educatorCanvasRef}
                width={1200}
                height={440}
                onPointerDown={startEducatorDrawing}
                onPointerMove={drawEducatorSignature}
                onPointerUp={finishEducatorDrawing}
                onPointerCancel={finishEducatorDrawing}
                className="mt-4 h-[48vh] min-h-64 max-h-[420px] w-full touch-none rounded-2xl border-2 border-dashed border-blue-300 bg-white shadow-inner"
              />
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => { resetEducatorCanvas(); setEducatorSignatureDraft(null); }} disabled={educatorSignatureSaving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black disabled:opacity-40">서명 지우기</button>
                <button type="button" onClick={() => void saveEducatorSignature()} disabled={!educatorSignatureDraft || educatorSignatureSaving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{educatorSignatureSaving ? "저장 중" : "기본 서명으로 저장"}</button>
              </div>
            </div>
          </div>
        )}

        {selectedSchool && (
          <div className="mb-5 flex flex-wrap justify-end gap-2 rounded-3xl bg-white p-4 shadow-sm">
            <button type="button" onClick={() => void handleSave(false)} disabled={saving || loading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중" : "현재 내용 저장"}</button>
            <button type="button" onClick={printDocument} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black">인쇄 / PDF 저장</button>
            <button type="button" onClick={() => void prepareMail()} disabled={mailBusy || saving || loading || !mailSettings} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{mailBusy ? "준비 중" : "메일로 제출"}</button>
            <button type="button" onClick={() => void handleSave(true)} disabled={saving || Boolean(selectedConfirmation?.submittedAt)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{selectedConfirmation?.submittedAt ? "제출완료" : "제출완료 표시"}</button>
          </div>
        )}

        {mailPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3" role="dialog" aria-modal="true" aria-label="ATC 참여확인서 메일 발송 확인">
            <div className="max-h-[95vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl">
              <h2 className="text-lg font-black">메일 발송 전 최종 확인</h2>
              <dl className="mt-4 grid grid-cols-[85px_1fr] gap-2 break-all text-sm">
                <dt className="font-black">보내는 사람</dt><dd>{mailPreview.info.from}</dd>
                <dt className="font-black">받는 사람</dt><dd>{mailPreview.info.to}</dd>
                <dt className="font-black">숨은참조</dt><dd>{mailPreview.info.bcc}</dd>
                <dt className="font-black">제목</dt><dd>{mailPreview.info.subject}</dd>
                <dt className="font-black">본문</dt><dd className="whitespace-pre-wrap">{mailPreview.info.body}</dd>
                <dt className="font-black">첨부파일</dt><dd>{mailPreview.info.filename}</dd>
              </dl>
              <a href={mailPreview.pdfUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-bold text-blue-700 underline">첨부 PDF 열어 확인</a>
              {mailPreview.info.sentAt && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">이미 발송된 확인서입니다. 재발송 시 한 번 더 확인합니다.</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={closeMailPreview} disabled={mailBusy} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black disabled:opacity-50">취소</button>
                <button type="button" onClick={() => void sendMail()} disabled={mailBusy || !gmailStatus?.connected} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{mailBusy ? "발송 중" : "메일 발송"}</button>
              </div>
              {!gmailStatus?.connected && <p className="mt-2 text-sm font-bold text-rose-700">Gmail 계정을 연결한 뒤 발송할 수 있습니다.</p>}
            </div>
          </div>
        )}
      </div>

      {selectedSchool && (
        <AtcPrintSheet
          schoolName={selectedSchool}
          yearMonth={yearMonth}
          educatorName={profile.name}
          educatorPhone={profile.phone}
          educatorSignatureDataUrl={profile.signatureDataUrl}
          schoolVerifierName={schoolVerifierName}
          schoolSignatureDataUrl={schoolSignatureDataUrl}
          schoolSignedAt={selectedConfirmation?.schoolSignedAt || ""}
          operationPeriodStart={operationPeriodStart}
          operationPeriodEnd={operationPeriodEnd}
          rows={printRows}
          onEditEducatorSignature={openEducatorSignatureDialog}
        />
      )}
    </main>
  );
}

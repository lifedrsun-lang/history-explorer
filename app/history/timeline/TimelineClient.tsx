"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";
import type { HistoryTimelineEvent } from "@/lib/historyTimeline";
import { buildTimelinePersonCards } from "@/lib/historyTimelinePeople";
import TimelinePersonCards from "./TimelinePersonCards";
import { shouldShowTimelineMaterial } from "@/lib/historyTimelinePresentation";
import {
  HISTORY_TIMELINE_PERIODS as PERIODS,
  HISTORY_TIMELINE_EPOCH_MARKERS,
  getTimelineNationColumn,
  getTimelinePeriodForEvent,
  getHistoricNameBadge,
} from "@/lib/historyTimelineLayout";
import TimelineExamReferences, { type ExamReference } from "./TimelineExamReferences";
import TimelineWarSummary from "./TimelineWarSummary";
import TimelineStudyDetails from "./TimelineStudyDetails";
import TimelineHeritageDetails from "./TimelineHeritageDetails";
import type { HeritagePilotNote } from "@/lib/historyTimelineGanghwaHeritagePilot";
import TimelineByeolbyeolDetails from "./TimelineByeolbyeolDetails";
import TimelineYongDetails from "./TimelineYongDetails";
import type { YongNote } from "@/lib/historyTimelineYongNotes";
import type { YongSource } from "@/lib/historyTimelineYongEvents";
import yongStyles from "./timelineYong.module.css";
import type { ByeolbyeolLevel, ByeolbyeolNote } from "@/lib/historyTimelineByeolbyeolTypes";
import supplementStyles from "./timelineByeolbyeol.module.css";
import TimelineGoryeoTopics from "./TimelineGoryeoTopics";
import type { HistoryTimelineStudyTopic } from "@/lib/historyTimelineGoryeoTopics";

import styles from "./timeline.module.css";

type StudentEvent = Omit<HistoryTimelineEvent, "sourceIssueNumbers" | "textbookPages"> & {
  byeolbyeolLevel?: ByeolbyeolLevel;
  yongseonsaeng?: boolean;
  yongSource?: YongSource;
  sourceIssueNumbers?: number[];
  textbookPages?: string[];
  textbookIssues?: number[];
};

type Viewer = {
  role: "teacher" | "student";
  name: string;
  completedIssueCount?: number;
  completedIssues?: number[];
};

type TimelinePayload = {
  viewer: Viewer;
  events: StudentEvent[];
  examLinks?: Record<string, ExamReference[]>;
  heritageNotes?: Record<string, HeritagePilotNote[]>;
  studyTopics?: HistoryTimelineStudyTopic[];
  maxIssue: number;
};

const FILTERS = [
  ["전체", "전체"],
  ["선사", "선사 시대"],
  ["고조선", "고조선"],
  ["여러나라", "여러 나라"],
  ["고구려", "고구려"],
  ["백제", "백제"],
  ["신라", "신라"],
  ["가야", "가야"],
  ["발해", "발해"],
  ["후삼국", "후삼국"],
  ["고려", "고려"],
  ["조선", "조선"],
  ["대한제국", "대한제국"],
  ["일제강점기", "일제강점기"],
  ["대한민국", "대한민국"],
] as const;

const ERA_NAV_LABELS: Record<string, string> = {
  prehistoric: "선사 시대",
  gojoseon: "고조선",
  "early-states": "여러 나라",
  three: "삼국 시대",
  northsouth: "남북국 시대",
  "later-three": "후삼국 시대",
  goryeo: "고려",
  joseon: "조선",
  empire: "대한제국",
  colonial: "일제강점기",
  liberation: "광복·분단",
  republic: "대한민국",
};

// 새 국가가 등장하면 열을 추가하고, 국호를 바꾸면 같은 위치의 명칭을 갱신한다.
const renameEvents = new Set(["silla-jijeung-reform", "balhae-name-713",
  "later-goguryeo-majin-904", "later-goguryeo-taebong-911"]);
const capitalEvents = new Set(["goguryeo-domestic-capital", "goguryeo-pyeongyang-move",
  "baekje-ungjin-capital", "baekje-sabi-capital", "balhae-sanggyeong",
  "later-goguryeo-capital-905"]);
const fallenYears: Record<string, number> = {
  "백제": 660, "고구려": 668, "가야": 562, "발해": 926,
  "신라": 935, "통일 신라": 935, "후백제": 936,
};
const textbookSourceLabel = (event: StudentEvent) => {
  const issues = event.textbookIssues ?? event.sourceIssueNumbers ?? [];
  const unique = [...new Set(issues)].sort((a, b) => a - b);
  return unique.length ? unique.map((issue) => `교재 ${issue}호`).join(" · ") : "교재 확인";
};

function groupSameDates(events: StudentEvent[]) {
  const groups = new Map<string, { key: string; dateLabel: string; events: StudentEvent[] }>();
  for (const event of events) {
    // '정확한 연도 미상' 등의 시대 설명은 같은 연도 사건으로 오인하지 않도록 별도 행으로 묶는다.
    const key = `${event.sortYear}:${event.dateLabel}`;
    const current = groups.get(key) ?? { key, dateLabel: event.dateLabel, events: [] };
    current.events.push(event);
    groups.set(key, current);
  }
  return [...groups.values()];
}

export default function TimelineClient() {
  const [teacher, setTeacher] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [payload, setPayload] = useState<TimelinePayload | null>(null);
  const [byeolbyeolNotes, setByeolbyeolNotes] = useState<Record<string, ByeolbyeolNote[]>>({});
  const [byeolbyeolFlowEvents, setByeolbyeolFlowEvents] = useState<StudentEvent[]>([]);
  const [yongNotes, setYongNotes] = useState<Record<string, YongNote[]>>({});
  const [yongFlowEvents, setYongFlowEvents] = useState<StudentEvent[]>([]);
  const [showYongseonsaeng, setShowYongseonsaeng] = useState(false);
  const [showByeolbyeolBasic, setShowByeolbyeolBasic] = useState(false);
  const [showByeolbyeolAdvanced, setShowByeolbyeolAdvanced] = useState(false);
  const [showExamReferences, setShowExamReferences] = useState(true);
  const [showHeritageDetails, setShowHeritageDetails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [unpublished, setUnpublished] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("전체");
  const [activePeriod, setActivePeriod] = useState<string>("");
  const [targetPeriod, setTargetPeriod] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        setTeacher(currentUser);
        setAuthReady(true);
      }),
    []
  );

  const loadTimeline = async (currentTeacher: User | null) => {
    setLoading(true);
    setError("");
    setByeolbyeolNotes({});
    setByeolbyeolFlowEvents([]);
    setYongNotes({});
    setYongFlowEvents([]);
    try {
      const token = currentTeacher ? await currentTeacher.getIdToken() : "";
      const response = await fetch("/api/history/timeline/events", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = (await response.json().catch(() => ({}))) as TimelinePayload & {
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        if (response.status === 403 && data.code === "timeline_not_published") {
          setPayload(null);
          setNeedsLogin(false);
          setUnpublished(true);
          return;
        }
        if (response.status === 401 && data.code === "student_auth_required") {
          setNeedsLogin(true);
          setPayload(null);
          return;
        }
        throw new Error(data.error || "연표를 불러오지 못했습니다.");
      }

      setPayload(data);
      try {
        const extraResponse = await fetch("/api/history/timeline/byeolbyeol", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (extraResponse.ok) {
          const extra = (await extraResponse.json().catch(() => ({}))) as {
            notes?: Record<string, ByeolbyeolNote[]>;
            flowEvents?: StudentEvent[];
            yongNotes?: Record<string,YongNote[]>;
            yongFlowEvents?: StudentEvent[];
          };
          setByeolbyeolNotes(extra.notes ?? {});
          setByeolbyeolFlowEvents(Array.isArray(extra.flowEvents) ? extra.flowEvents : []);
          setYongNotes(extra.yongNotes ?? {});
          setYongFlowEvents(Array.isArray(extra.yongFlowEvents) ? extra.yongFlowEvents : []);
        }
      } catch {
        // 별별한국사 자료 조회 실패와 관계없이 기존 연표는 정상 이용할 수 있어야 한다.
      }
      setNeedsLogin(false);
      setUnpublished(false);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "연표를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    const timer = window.setTimeout(() => void loadTimeline(teacher), 0);
    return () => window.clearTimeout(timer);
  }, [authReady, teacher]);

  // 교사는 기존과 동일하게 보충 자료 기본 숨김, 학생은 허용된 자료 기본 표시.
  // 이 체크들은 표시 설정만 바꾸며 서버의 학생별 자료 접근 권한은 그대로 유지한다.
  const viewerRole = payload?.viewer.role;
  useEffect(() => {
    if (!viewerRole) return;
    const defaultVisible = viewerRole === "student";
    setShowByeolbyeolBasic(defaultVisible);
    setShowByeolbyeolAdvanced(defaultVisible);
    setShowYongseonsaeng(defaultVisible);
  }, [viewerRole]);

  // 이미 열어 둔 학생 페이지도 탭 복귀 또는 주기적인 재조회 시 공개 중단을 반영한다.
  useEffect(() => {
    if (!authReady || teacher || !payload || payload.viewer.role !== "student") return;
    const refresh = () => {
      if (document.visibilityState === "visible") void loadTimeline(null);
    };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [authReady, teacher, payload]);

  const enabledByeolbyeolLevels: ByeolbyeolLevel[] = [
    ...(showByeolbyeolBasic ? ["basic" as const] : []),
    ...(showByeolbyeolAdvanced ? ["advanced" as const] : []),
  ];

  const yongEnabled = showYongseonsaeng;

  const allDisplayEvents = useMemo(() => {
    if (!payload) return [];
    const levels: ByeolbyeolLevel[] = [
      ...(showByeolbyeolBasic ? ["basic" as const] : []),
      ...(showByeolbyeolAdvanced ? ["advanced" as const] : []),
    ];
    const allowed = new Set(levels);
    // 기존 연표에 이미 표시되는 동일 연도·제목 사건은 별도 보충 카드로 중복 출력하지 않는다.
    const existingEventKeys = new Set(
      payload.events.map(event => `${event.sortYear}:${event.title.trim()}`)
    );
    const notDuplicated = (event: StudentEvent) =>
      !existingEventKeys.has(`${event.sortYear}:${event.title.trim()}`);
    return [
      ...payload.events,
      ...byeolbyeolFlowEvents.filter(event =>
        event.byeolbyeolLevel !== undefined &&
        allowed.has(event.byeolbyeolLevel) &&
        notDuplicated(event)),
      ...(showYongseonsaeng ? yongFlowEvents.filter(notDuplicated) : []),
    ].sort((a, b) =>
      a.sortYear - b.sortYear ||
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.id.localeCompare(b.id));
  }, [payload, byeolbyeolFlowEvents, showByeolbyeolBasic, showByeolbyeolAdvanced, yongFlowEvents, showYongseonsaeng]);

  const visibleEvents = useMemo(() => allDisplayEvents.filter((event) =>
      filter === "전체" ||
      event.eraFilter === filter ||
      (filter === "고려" &&
        (event.id === "goryeo-founded-918" || event.id === "later-baekje-falls-936"))
    ), [filter, allDisplayEvents]);

  // 다른 시대 필터에서 보이지 않는 사건으로 연결되지 않도록 현재 표시 사건만 사용한다.
  const personCardsByEvent = useMemo(() => buildTimelinePersonCards(visibleEvents), [visibleEvents]);

  // 공개된 사건이 있는 시대만 빠른 이동 목록에 노출한다.
  const navigationPeriods = PERIODS.filter((period) =>
    !period.milestone && allDisplayEvents.some((event) => getTimelinePeriodForEvent(event) === period.key)
  );

  // PC와 모바일 공통 보기 옵션. '교재 핵심 설명'은 항상 표시한다.
  const materialToggles = [
    { key: "basic", label: "별별한국사 · 기본", checked: showByeolbyeolBasic, update: setShowByeolbyeolBasic },
    { key: "advanced", label: "별별한국사 · 심화", checked: showByeolbyeolAdvanced, update: setShowByeolbyeolAdvanced },
    { key: "yong", label: "용선생 교과서 한국사", checked: showYongseonsaeng, update: setShowYongseonsaeng },
    { key: "exam", label: "♣ 한능검 기출문제", checked: showExamReferences, update: setShowExamReferences },
    { key: "heritage", label: "문화유산 현장 해설", checked: showHeritageDetails, update: setShowHeritageDetails },
  ];

  const jumpToPeriod = (periodKey: string) => {
    setActivePeriod(periodKey);
    setTargetPeriod(periodKey);
    // 다른 시대 필터가 선택되어 있어도 해당 시대로 정상 이동하도록 전체 보기로 전환한다.
    if (filter !== "전체") setFilter("전체");
  };

  useEffect(() => {
    if (!targetPeriod || filter !== "전체") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`timeline-${targetPeriod}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setTargetPeriod(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [targetPeriod, filter, visibleEvents]);

  // 본문을 직접 스크롤할 때도 현재 읽는 시대를 강조한다.
  useEffect(() => {
    if (filter !== "전체") return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-period]"));
    if (sections.length === 0) return;

    const updateCurrentPeriod = () => {
      const current = sections.filter((section) =>
        section.getBoundingClientRect().top <= window.innerHeight * 0.35
      ).at(-1) ?? sections[0];
      setActivePeriod(current.dataset.period ?? "");
    };

    updateCurrentPeriod();
    window.addEventListener("scroll", updateCurrentPeriod, { passive: true });
    return () => window.removeEventListener("scroll", updateCurrentPeriod);
  }, [filter, visibleEvents]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/history/timeline/session", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, school, studentPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "학생 정보를 확인하지 못했습니다.");
      setPassword("");
      await loadTimeline(null);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "학생 정보를 확인하지 못했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const logoutStudent = async () => {
    await fetch("/api/history/timeline/session", { method: "DELETE" });
    setPayload(null);
    setNeedsLogin(true);
  };

  if (loading || !authReady) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingCard}>한국사 시간여행을 준비하고 있어요…</div>
      </main>
    );
  }

  if (unpublished && !teacher) {
    return (
      <main className={styles.loginPage}>
        <section className={styles.loginCard}>
          <div className={styles.loginSymbol}>🔒</div>
          <h1>한국사 연표 공개 준비 중</h1>
          <p>선생님이 전체 학생 공개를 켜면 이용할 수 있어요.</p>
          <div className={styles.loginLinks}>
            <Link href="/student/history">학생 수업방으로</Link>
          </div>
        </section>
      </main>
    );
  }

  if (needsLogin && !teacher) {
    return (
      <main className={styles.loginPage}>
        <section className={styles.loginCard}>
          <div className={styles.brand}>별꼼역사 · 한국사 시간여행</div>
          <div className={styles.loginSymbol}>🧭</div>
          <h1>나의 한국사 연표</h1>
          <p>수강생 정보로 로그인하면 선생님이 공개한 사건만 볼 수 있어요.</p>
          <form onSubmit={login} className={styles.loginForm}>
            <label>
              학교
              <input
                value={school}
                onChange={(event) => setSchool(event.target.value)}
                placeholder="예: 하늘빛초"
                autoComplete="organization"
                required
              />
            </label>
            <label>
              이름
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="학생 이름"
                autoComplete="name"
                required
              />
            </label>
            <label>
              학생 비밀번호
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="수업방 비밀번호"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" disabled={submitting}>
              {submitting ? "확인 중…" : "시간여행 시작"}
            </button>
          </form>
          <div className={styles.loginLinks}>
            <Link href="/student/history">학생 수업방으로</Link>
            <Link href="/teacher">교사 로그인</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.brand}>별꼼역사 · 한국사 시간여행</div>
          <div className={styles.viewerActions}>
            {payload?.viewer.role === "teacher" ? (
              <>
                <span className={styles.teacherBadge}>교사용 전체 열람</span>
                <Link href="/teacher/history-timeline">학생 공개 관리</Link>
              </>
            ) : (
              <>
                <span>{payload?.viewer.name} 탐험가</span>
                <button type="button" onClick={() => void logoutStudent()}>
                  나가기
                </button>
              </>
            )}
          </div>
        </div>
        <h1>한국사 시간여행</h1>
        <p>같은 시대에 여러 나라에서 일어난 일을 함께 살펴봐요.</p>
      </header>

      {navigationPeriods.length > 0 && (
        <>
          <nav className={styles.eraJumpNav} aria-label="시대별 빠른 이동">
            <strong>시대 바로가기</strong>
            {navigationPeriods.map((period) => (
              <button
                key={period.key}
                type="button"
                className={`${styles.eraJumpButton} ${activePeriod === period.key ? styles.currentEra : ""}`}
                aria-current={activePeriod === period.key ? "location" : undefined}
                onClick={() => jumpToPeriod(period.key)}
              >
                {ERA_NAV_LABELS[period.key] ?? period.title}
              </button>
            ))}
            <fieldset className={styles.materialChecks} aria-label="자료별 표시 설정">
              <legend>자료 표시 / 숨김</legend>
              {materialToggles.map((option) => (
                <label key={option.key} className={styles.materialCheck}>
                  <input type="checkbox" checked={option.checked}
                    onChange={(event) => option.update(event.target.checked)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
          </nav>
          <div className={styles.mobileEraJump}>
            <label htmlFor="timeline-era-jump">시대 바로가기</label>
            <select
              id="timeline-era-jump"
              value=""
              onChange={(event) => jumpToPeriod(event.target.value)}
            >
              <option value="" disabled>시대 선택</option>
              {navigationPeriods.map((period) => (
                <option key={period.key} value={period.key}>
                  {ERA_NAV_LABELS[period.key] ?? period.title}
                </option>
              ))}
            </select>
            <details className={styles.mobileMaterials}>
              <summary>☑ 자료</summary>
              <fieldset className={styles.mobileMaterialPanel} aria-label="자료별 표시 설정">
                <legend>자료 표시 / 숨김</legend>
                {materialToggles.map((option) => (
                  <label key={option.key} className={styles.materialCheck}>
                    <input type="checkbox" checked={option.checked}
                      onChange={(event) => option.update(event.target.checked)} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
            </details>
          </div>
        </>
      )}

      <div className={styles.wrap}>
        <section className={styles.introSection}>
          <h2>역사는 언제부터 시작되었을까?</h2>
          <div className={styles.introGrid}>
            <article>
              <div aria-hidden="true">🪨</div>
              <h3>선사 시대</h3>
              <p>문자 기록이 남기 이전의 시대. 유물과 유적을 통해 생활을 알아봐요.</p>
            </article>
            <article>
              <div aria-hidden="true">📜</div>
              <h3>역사 시대</h3>
              <p>문자로 기록을 남긴 시대. 문헌과 유물·유적을 함께 살펴봐요.</p>
            </article>
          </div>
          <div className={styles.tip}>
            💡 선사 시대에도 사람들의 역사는 있었어요. 시대를 나누는 기준은 문자 기록이에요.
          </div>
        </section>

        <section className={styles.timelineSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>시간을 따라가는 한국사 연표</h2>
              <p>연도는 고정하고, 국가별 열을 좌우로 밀어 비교해요. 배운 사건만 표시돼요.</p>
            </div>
            <span>{allDisplayEvents.length}개 사건</span>
          </div>

          <nav className={styles.filters} aria-label="시대별 사건 필터">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? styles.activeFilter : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </nav>

          {payload?.viewer.role === "teacher" && (
            <div className={supplementStyles.teacherControls}>
              <span>보충 자료의 표시 여부는 오른쪽 ‘자료 표시 / 숨김’ 메뉴에서 설정합니다.</span>
              <Link href="/teacher/history-timeline/byeolbyeol-access">민서·민채 열람 권한 확인 →</Link>
            </div>
          )}
          {error && <div className={styles.error}>{error}</div>}
          {visibleEvents.length === 0 ? (
            <div className={styles.empty}>
              <div>🔒</div>
              <h3>아직 공개된 사건이 없어요.</h3>
              <p>수강을 마치면 선생님이 배운 연표를 열어 줄 거예요.</p>
            </div>
          ) : (
            <div className={styles.periods}>
              {PERIODS.map((period) => {
                const periodEvents = visibleEvents.filter((event) => getTimelinePeriodForEvent(event) === period.key);
                if (periodEvents.length === 0) return null;

                // 고조선 멸망은 독립된 전환점으로 유지한다.
                // 여러 나라의 등장은 별도 시대 표가 아니라 성장 비교표 안의 도입 카드로 표시한다.
                if (period.milestone) {
                  return (
                    <section id={`timeline-${period.key}`} className={styles.transitionBlock} data-period={period.key} key={period.key} aria-label={period.title}>
                      {periodEvents.map((event) => (
                        <article id={`timeline-event-${event.id}`} className={styles.transitionCard} key={event.id}>
                          <div className={styles.transitionDate}>{event.dateLabel}</div>
                          <div className={styles.transitionBody}>
                            <h3>{event.title}</h3>
                            <p>{event.summary}</p>
                            <TimelinePersonCards cards={personCardsByEvent[event.id] || []} />
                            <TimelineStudyDetails
                              notes={event.studyNotes ?? []}
                              fallback={{ heading: event.title, text: event.life }}
                            />
                            <TimelineByeolbyeolDetails notes={byeolbyeolNotes[event.id]}
                              enabledLevels={enabledByeolbyeolLevels} />
                            <TimelineYongDetails notes={yongNotes[event.id]} enabled={yongEnabled} />
                            {shouldShowTimelineMaterial(event.artifact) && (
                              <div className={styles.transitionDetail}>
                                <b>대표 유물·유적</b><span>{event.artifact}</span>
                              </div>
                            )}
                            {showHeritageDetails && (<TimelineHeritageDetails notes={payload?.heritageNotes?.[event.id] || []} />)}
                             {showExamReferences && (<TimelineExamReferences eventId={event.id} refs={payload?.examLinks?.[event.id] || []} />)}
                            <small className={styles.gridSource}>
                              {textbookSourceLabel(event)}
                            </small>
                          </div>
                        </article>
                      ))}
                    </section>
                  );
                }

                // 선사 문화는 특정 국가의 사건이 아니므로 고조선 멸망 이전의
                // '주요 사건' 열에만 놓는다. 이후에는 그 열 자체가 사라진다.
                const eventColumn = (event: StudentEvent) => getTimelineNationColumn(event, period.key);

                // '여러 나라의 등장'은 별도 시기 구분이 아닌 이 표의 도입 카드다.
                // 나라별 열을 새로 만들지 않고, 학생에게 허용된 1~2호 학습 내용만 보여 준다.
                const overviewEvent = period.key === "early-states"
                  ? periodEvents.find((event) => event.id === "early-states-emerge")
                  : undefined;
                const comparisonEvents = overviewEvent
                  ? periodEvents.filter((event) => event.id !== overviewEvent.id)
                  : periodEvents;

                // 앞으로 새 국가가 등장해도 기존 사건이 누락되지 않도록 열을 자동 확장한다.
                const eventCountries = new Set(comparisonEvents.map(eventColumn));
                // 시대별 지정 국가 열은 빈 사건이 있어도 유지해 국가 간 위치를 비교한다.
                const columns = [
                  ...period.columns,
                  ...[...eventCountries].filter(
                    (column) => !(period.columns as readonly string[]).includes(column)
                  ),
                ];
                const gridStyle = {
                  gridTemplateColumns: `116px repeat(${columns.length}, minmax(245px, 1fr))`,
                };
                const dates = groupSameDates(comparisonEvents);

                return (
                  <section id={`timeline-${period.key}`} className={styles.periodBlock} data-period={period.key} key={period.key}>
                    <div className={styles.periodTop}>
                      <h3>{period.title}</h3>
                      {comparisonEvents.length > 0 && <span>↔ 좌우로 밀어 다른 나라 보기</span>}
                      {period.key === "early-states" && <p className={styles.nationEndNote}>여러 나라는 같은 해에 함께 세워진 것이 아니에요. 연도가 확실하지 않은 풍습은 ‘여러 나라의 성장기 · 정확한 연도 미상’으로 표시합니다.</p>}
                    </div>
                    {period.key === "goryeo" && (
                      <TimelineGoryeoTopics
                        era="고려"
                        topics={(payload?.studyTopics ?? []).filter((topic) => topic.issue >= 10 && topic.issue <= 13)}
                      />
                    )}
                    {period.key === "joseon" && (
                      <TimelineGoryeoTopics
                        era="조선"
                        topics={(payload?.studyTopics ?? []).filter((topic) =>
                          (topic.issue >= 14 && topic.issue <= 15) || topic.period === "joseon")}
                      />
                    )}
                    {period.key === "empire" && (
                      <TimelineGoryeoTopics
                        era="대한제국"
                        topics={(payload?.studyTopics ?? []).filter((topic) => topic.period === "empire")}
                      />
                    )}
                    {period.key === "colonial" && (
                      <TimelineGoryeoTopics
                        era="일제강점기"
                        topics={(payload?.studyTopics ?? []).filter((topic) => topic.period === "colonial")}
                      />
                    )}
                    {period.key === "liberation" && (
                      <TimelineGoryeoTopics
                        era="광복과 분단"
                        topics={(payload?.studyTopics ?? []).filter((topic) => topic.period === "liberation")}
                      />
                    )}
                    {period.key === "republic" && (
                      <TimelineGoryeoTopics
                        era="대한민국"
                        topics={(payload?.studyTopics ?? []).filter((topic) => topic.period === "republic")}
                      />
                    )}
                    {overviewEvent && (
                      <article id={`timeline-event-${overviewEvent.id}`} className={styles.earlyStatesOverview} aria-label="여러 나라의 등장">
                        <div className={styles.earlyStatesOverviewDate}>{overviewEvent.dateLabel}</div>
                        <div className={styles.earlyStatesOverviewBody}>
                          <h4>{overviewEvent.title}</h4>
                          <p>{overviewEvent.summary}</p>
                          <TimelinePersonCards cards={personCardsByEvent[overviewEvent.id] || []} />
                          <TimelineStudyDetails
                            notes={overviewEvent.studyNotes ?? []}
                            fallback={{ heading: overviewEvent.title, text: overviewEvent.life }}
                          />
                          <TimelineByeolbyeolDetails notes={byeolbyeolNotes[overviewEvent.id]}
                            enabledLevels={enabledByeolbyeolLevels} />
                          <TimelineYongDetails notes={yongNotes[overviewEvent.id]} enabled={yongEnabled} />
                          <small className={styles.gridSource}>{textbookSourceLabel(overviewEvent)}</small>
                          {showHeritageDetails && (<TimelineHeritageDetails notes={payload?.heritageNotes?.[overviewEvent.id] || []} />)}
                           {showExamReferences && (<TimelineExamReferences eventId={overviewEvent.id} refs={payload?.examLinks?.[overviewEvent.id] || []} />)}
                        </div>
                      </article>
                    )}
                    {comparisonEvents.length > 0 && (
                    <div
                      className={styles.periodViewport}
                      tabIndex={0}
                      role="region"
                      aria-label={`${period.title} 국가별 가로 연표`}
                    >
                      <div className={styles.periodGrid} style={{ minWidth: 116 + 245 * columns.length }}>
                        <div className={styles.tableHeader} style={gridStyle}>
                          <div className={styles.yearHeader}>연도</div>
                          {columns.map((column) => (
                            <div
                              className={styles.countryHeader}
                              key={column || "empty-country-header"}
                              data-country={column}
                              aria-label={column || "나라가 등장하기 전 빈 칸"}
                            >
                              {column}
                              {column === "후고구려 → 고려" && (
                                <small className={styles.nationEndLabel}>918년부터 고려</small>
                              )}
                            </div>
                          ))}
                        </div>
                        {dates.map((date) => (
                          <Fragment key={date.key}>
                          <div className={styles.tableRow} style={gridStyle}>
                            <div className={styles.yearCell}>{date.dateLabel}</div>
                            {columns.map((column) => (
                              <div className={`${styles.countryCell} ${fallenYears[column] !== undefined && date.events[0]?.sortYear > fallenYears[column] ? styles.fallenCell : ""}`} key={column}>
                                {date.events
                                  .filter((event) => eventColumn(event) === column)
                                  .map((event) => (
                                    <article className={`${styles.gridCard} ${renameEvents.has(event.id) ? styles.renameCard : ""} ${capitalEvents.has(event.id) ? styles.capitalCard : ""} ${event.id === "goryeo-founded-918" ? styles.dynastyCard : ""} ${/멸망|귀부/.test(event.title) ? styles.fallCard : ""}`} id={`timeline-event-${event.id}`} key={event.id}>
                                      {getHistoricNameBadge(event) && (
                                        <span className={styles.historicNameBadge} data-nation={event.stateOrEra}>
                                          {getHistoricNameBadge(event)}
                                        </span>
                                      )}
                                      {renameEvents.has(event.id) && (
                                        <span className={styles.changeBadge}>
                                          {event.id === "silla-jijeung-reform" ? "국호 ‘신라’ 확정" :
                                            event.id === "balhae-name-713" ? "발해로 불리게 됨" : "국호 변경"}
                                        </span>
                                      )}
                                      {capitalEvents.has(event.id) && <span className={styles.capitalBadge}>수도 이전</span>}
                                      {event.id === "goryeo-founded-918" && <span className={styles.changeBadge}>918년 · 고려 건국(왕조 교체)</span>}
                                      {/멸망|귀부/.test(event.title) && <span className={styles.fallBadge}>멸망·통합</span>}
                                      <span className={styles.gridEmoji} role="img" aria-label={event.image.alt}>{event.image.value}</span>
                                      {event.byeolbyeolLevel && <span className={supplementStyles.flowBadge}>🧭 새 역사 흐름 카드</span>}
                                      {event.yongseonsaeng && <span className={yongStyles.flowBadge}>📗 용선생 시대 흐름 카드</span>}
                                      <h4>{event.title}</h4>
                                      <p className={styles.gridSummary}>{event.summary}</p>
                                      <TimelinePersonCards cards={personCardsByEvent[event.id] || []} />
                                      {event.yongseonsaeng ? (
                                        <details className={yongStyles.details}>
                                          <summary>📖 용선생 시대 흐름 더 보기</summary>
                                          <p className={yongStyles.flowExplanation}>{event.life}</p>
                                          {event.yongSource && <small className={yongStyles.source}>출처: 용선생 교과서 한국사 {event.yongSource.volume}권 {event.yongSource.printedPage}쪽</small>}
                                        </details>
                                      ) : event.byeolbyeolLevel ? (
                                        <details className={supplementStyles.disclosure}>
                                          <summary>📖 시대 흐름 더 보기</summary>
                                          <div className={supplementStyles.flowText}>{event.life}</div>
                                        </details>
                                      ) : (
                                        <>
                                          <TimelineWarSummary id={event.id} />
                                          <div className={styles.gridDetails}>
                                            <b>{event.eraFilter === "선사" || event.eraFilter === "여러나라" ? "생활 모습" : "핵심 설명"}</b><p>{event.life}</p>
                                            {shouldShowTimelineMaterial(event.artifact) && (
                                              <>
                                                <b>{event.eraFilter === "여러나라" ? "유물·특산물" : event.eraFilter === "선사" ? "대표 유물" : "관련 유물·유적·문헌"}</b>
                                                <p>{event.artifact}</p>
                                              </>
                                            )}
                                          </div>
                                        </>
                                      )}
                                      <TimelineStudyDetails notes={event.studyNotes ?? []} />
                                      <TimelineByeolbyeolDetails notes={byeolbyeolNotes[event.id]}
                                        enabledLevels={enabledByeolbyeolLevels} />
                                      <TimelineYongDetails notes={yongNotes[event.id]} enabled={yongEnabled} />
                                      {!event.byeolbyeolLevel && !event.yongseonsaeng && (
                                        <small className={styles.gridSource}>
                                          {textbookSourceLabel(event)}
                                        </small>
                                      )}
                                      {showHeritageDetails && (<TimelineHeritageDetails notes={payload?.heritageNotes?.[event.id] || []} />)}
                             {showExamReferences && (<TimelineExamReferences eventId={event.id} refs={payload?.examLinks?.[event.id] || []} />)}
                                    </article>
                                  ))}
                              </div>
                            ))}
                          </div>
                          {HISTORY_TIMELINE_EPOCH_MARKERS.filter(
                            (marker) => date.events.some((event) => event.id === marker.eventId)
                          ).map((marker) => (
                            <div className={styles.epochRow} style={gridStyle} key={marker.key} aria-label={marker.title}>
                              <div className={styles.epochDate}>시대 변화 ↓</div>
                              <div className={`${styles.epochCard} ${styles[marker.className]}`}
                                style={{ gridColumn: `2 / span ${columns.length}` }}>
                                <strong>{marker.title}</strong>
                                <p>{marker.subtitle}</p>
                              </div>
                            </div>
                          ))}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";
import type { HistoryTimelineEvent } from "@/lib/historyTimeline";

import styles from "./timeline.module.css";

type StudentEvent = Omit<HistoryTimelineEvent, "sourceIssueNumbers"> & {
  sourceIssueNumbers?: number[];
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
  maxIssue: number;
};

const FILTERS = [
  ["전체", "전체"],
  ["선사", "선사 문화"],
  ["고조선", "고조선"],
  ["여러나라", "여러 나라"],
  ["고구려", "고구려"],
  ["발해", "발해"],
] as const;

/** 시대에 따라 국가 열을 바꾸되, 연도는 공통 축으로 고정한다. */
const PERIODS = [
  {
    key: "beginnings",
    title: "선사 시대 · 고조선과 여러 나라",
    columns: ["선사 시대", "고조선", "부여", "고구려", "옥저", "동예", "삼한", "여러 나라"],
    includes: (year: number) => year < -37,
  },
  {
    key: "kingdoms",
    title: "삼국 시대 · 여러 나라를 나란히 비교해요",
    columns: ["고구려", "백제", "신라", "가야", "부여", "옥저", "동예", "삼한"],
    includes: (year: number) => year >= -37 && year <= 676,
  },
  {
    key: "north-south",
    title: "남북국 시대 · 통일신라와 발해",
    columns: ["통일신라", "발해", "고구려", "백제", "신라"],
    includes: (year: number) => year > 676 && year < 1000,
  },
] as const;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("전체");
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
        if (response.status === 401 && data.code === "student_auth_required") {
          setNeedsLogin(true);
          setPayload(null);
          return;
        }
        throw new Error(data.error || "연표를 불러오지 못했습니다.");
      }

      setPayload(data);
      setNeedsLogin(false);
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

  const visibleEvents = useMemo(() => {
    if (!payload) return [];
    return payload.events.filter(
      (event) => filter === "전체" || event.eraFilter === filter
    );
  }, [filter, payload]);

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
            <span>{payload?.events.length || 0}개 사건</span>
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
                const periodEvents = visibleEvents.filter((event) => period.includes(event.sortYear));
                if (periodEvents.length === 0) return null;
                const columns = period.columns.filter(
                  (column) => periodEvents.some((event) => event.stateOrEra === column)
                );
                const gridStyle = {
                  gridTemplateColumns: `116px repeat(${columns.length}, minmax(245px, 1fr))`,
                };
                const dates = groupSameDates(periodEvents);

                return (
                  <section className={styles.periodBlock} key={period.key}>
                    <div className={styles.periodTop}>
                      <h3>{period.title}</h3>
                      <span>↔ 좌우로 밀어 다른 나라 보기</span>
                    </div>
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
                            <div className={styles.countryHeader} key={column}>{column}</div>
                          ))}
                        </div>
                        {dates.map((date) => (
                          <div className={styles.tableRow} style={gridStyle} key={date.key}>
                            <div className={styles.yearCell}>{date.dateLabel}</div>
                            {columns.map((column) => (
                              <div className={styles.countryCell} key={column}>
                                {date.events
                                  .filter((event) => event.stateOrEra === column)
                                  .map((event) => (
                                    <article className={styles.gridCard} key={event.id}>
                                      <span className={styles.gridEmoji} role="img" aria-label={event.image.alt}>{event.image.value}</span>
                                      <h4>{event.title}</h4>
                                      <p className={styles.gridSummary}>{event.summary}</p>
                                      <div className={styles.gridDetails}>
                                        <b>생활 모습</b><p>{event.life}</p>
                                        <b>대표 유물 · 관련 자료</b><p>{event.artifact}</p>
                                      </div>
                                      <small className={styles.gridSource}>
                                        교재 {event.textbookPages.join(", ")}
                                        {payload?.viewer.role === "teacher" && event.sourceIssueNumbers
                                          ? ` · 관리용 ${event.sourceIssueNumbers.join(", ")}호`
                                          : ""}
                                      </small>
                                    </article>
                                  ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
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

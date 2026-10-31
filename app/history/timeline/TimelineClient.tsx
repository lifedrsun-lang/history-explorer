"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";
import type { HistoryTimelineEvent } from "@/lib/historyTimeline";

import styles from "./timeline.module.css";

type StudentEvent = Omit<HistoryTimelineEvent, "sourceIssueNumbers"> & {
  sourceIssueNumbers?: number[];
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
  maxIssue: number;
};

const FILTERS = [
  ["전체", "전체"],
  ["선사", "도구와 생활"],
  ["고조선", "고조선"],
  ["여러나라", "여러 나라"],
  ["고구려", "고구려"],
  ["백제", "백제"],
  ["신라", "신라"],
  ["가야", "가야"],
  ["발해", "발해"],
  ["후삼국", "후삼국"],
] as const;

/** 나라가 존재하지 않던 시기에 미래의 국가 열이 나타나지 않도록 역사적 전환점을 분리한다.
 * 건국 연대가 확정되지 않은 나라의 비교표는 '등장과 성장'이라는 시대 설명으로만 사용한다.
 */
const PERIODS = [
  {
    key: "prehistoric",
    title: "도구와 생활 모습이 바뀌던 시기",
    // 국가가 생기기 전의 국가 칸은 제목도, 내용도 비워 둔다.
    columns: ["주요 사건", ""],
    milestone: false,
    includes: (year: number) => year < -2333,
  },
  {
    key: "gojoseon",
    title: "고조선의 등장과 문화의 변화",
    columns: ["주요 사건", "고조선"],
    milestone: false,
    includes: (year: number) => year >= -2333 && year < -108,
  },
  {
    key: "gojoseon-falls",
    title: "고조선 멸망",
    columns: [],
    milestone: true,
    includes: (year: number) => year === -108,
  },
  {
    key: "early-states-start",
    title: "여러 나라의 등장",
    columns: [],
    milestone: true,
    includes: (year: number) => year === -100,
  },
  {
    key: "connected",
    title: "여러 나라에서 삼국·남북국·후삼국으로 이어지는 역사",
    // 국가별 세로 열을 하나의 표 안에서 유지한다. 시대 전환은 표 안의 큰 배너로 표시한다.
    columns: ["부여", "고구려", "옥저", "동예", "삼한", "백제", "신라", "가야", "발해", "후백제", "후고구려", "고려", "조선", "대한제국", "일제강점기", "대한민국"],
    milestone: false,
    includes: (year: number) => year > -100,
  },
] as const;

// 큰 시대 카드는 실제 전환 사건을 배운 경우에만 나타난다.
const EPOCH_MARKERS = [
  {
    eventId: "gaya-suro-founded",
    key: "three",
    title: "삼국 시대(고구려·백제·신라)와 가야",
    description: "세 나라와 가야의 역사를 같은 시간축에서 비교해요.",
    className: "epochThree",
  },
  {
    eventId: "silla-unification",
    key: "unified",
    title: "통일 신라",
    description: "676년 이후에도 신라의 역사는 같은 세로줄로 이어집니다.",
    className: "epochUnified",
  },
  {
    eventId: "balhae-founded",
    key: "northsouth",
    title: "남북국 시대(통일 신라·발해)",
    description: "676년 통일 이후 22년이 지난 698년에 발해가 세워졌어요. 통일 신라와 발해가 함께 존재합니다.",
    className: "epochNorthSouth",
  },
  {
    eventId: "later-goguryeo-founded",
    key: "laterthree",
    title: "후삼국 시대(신라·후백제·후고구려)",
    description: "900년 후백제와 901년 후고구려가 등장했어요. 발해도 926년까지 따로 이어졌어요.",
    className: "epochLaterThree",
  },
] as const;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [unpublished, setUnpublished] = useState(false);
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

                // 중요한 역사적 전환점은 국가별 표가 아닌 독립된 구분 카드로 표시한다.
                // 위에서 아래로: 고조선 멸망 → 여러 나라의 등장 → 국가별 비교표.
                if (period.milestone) {
                  return (
                    <section className={styles.transitionBlock} key={period.key} aria-label={period.title}>
                      {periodEvents.map((event) => (
                        <article className={styles.transitionCard} key={event.id}>
                          <div className={styles.transitionDate}>{event.dateLabel}</div>
                          <div className={styles.transitionBody}>
                            <h3>{event.title}</h3>
                            <p>{event.summary}</p>
                            <div className={styles.transitionDetail}>
                              <b>생활 모습</b><span>{event.life}</span>
                            </div>
                            <div className={styles.transitionDetail}>
                              <b>대표 유물 · 관련 자료</b><span>{event.artifact}</span>
                            </div>
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
                const eventColumn = (event: StudentEvent) =>
                  (period.key === "prehistoric" || period.key === "gojoseon") &&
                  event.eraFilter === "선사"
                    ? "주요 사건"
                    : event.stateOrEra;

                // 앞으로 새 국가가 등장해도 기존 사건이 누락되지 않도록 열을 자동 확장한다.
                // 연결 연표는 배운 국가만 보이되, 등장한 국가의 세로줄은
                // 시대 전환 뒤에도 같은 위치로 계속 유지한다.
                const eventCountries = new Set(periodEvents.map(eventColumn));
                const columns = [
                  ...(period.key === "connected"
                    ? (period.columns as readonly string[]).filter((column) => eventCountries.has(column))
                    : [...period.columns]),
                  ...[...eventCountries].filter(
                    (column) => !(period.columns as readonly string[]).includes(column)
                  ),
                ];
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
                            <div
                              className={styles.countryHeader}
                              key={column || "empty-country-header"}
                              data-country={column}
                              aria-label={column || "나라가 등장하기 전 빈 칸"}
                            >
                              {column === "신라" && period.key === "connected" ? "신라 → 통일 신라" : column}
                            </div>
                          ))}
                        </div>
                        {dates.map((date) => (
                          <Fragment key={date.key}>
                          <div className={styles.tableRow} style={gridStyle}>
                            <div className={styles.yearCell}>{date.dateLabel}</div>
                            {columns.map((column) => (
                              <div className={styles.countryCell} key={column}>
                                {date.events
                                  .filter((event) => eventColumn(event) === column)
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
                                        {textbookSourceLabel(event)}
                                      </small>
                                    </article>
                                  ))}
                              </div>
                            ))}
                          </div>
                          {period.key === "connected" && EPOCH_MARKERS.filter(
                            (marker) => date.events.some((event) => event.id === marker.eventId) &&
                              (marker.key !== "northsouth" ||
                                periodEvents.some((event) => event.id === "silla-unification"))
                          ).map((marker) => (
                            <div
                              className={styles.epochRow}
                              style={gridStyle}
                              key={marker.key}
                              aria-label={marker.title}
                            >
                              <div className={styles.epochDate}>시대 변화 ↓</div>
                              <div
                                className={`${styles.epochCard} ${styles[marker.className]}`}
                                style={{ gridColumn: `2 / span ${columns.length}` }}
                              >
                                <strong>{marker.title}</strong>
                                <p>{marker.description}</p>
                              </div>
                            </div>
                          ))}
                          </Fragment>
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

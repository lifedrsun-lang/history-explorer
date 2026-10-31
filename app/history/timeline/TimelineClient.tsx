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
] as const;

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
        <h1>처음 우리 땅에 산 사람들</h1>
        <p>선사 시대에서 고조선, 여러 나라의 등장까지</p>
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
              <p>배운 사건은 새 호수가 공개될 때마다 실제 연도 위치에 이어져요.</p>
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
            <div className={styles.timeline}>
              {visibleEvents.map((event) => (
                <article className={styles.event} key={event.id}>
                  <div className={styles.date}>{event.dateLabel}</div>
                  <div className={styles.stem} aria-hidden="true" />
                  <div className={styles.card}>
                    <div
                      className={styles.visual}
                      role="img"
                      aria-label={event.image.alt}
                    >
                      {event.image.value}
                    </div>
                    <div className={styles.tag}>{event.stateOrEra}</div>
                    <h3>{event.title}</h3>
                    <p className={styles.summary}>{event.summary}</p>
                    <div className={styles.details}>
                      <div>
                        <b>🏠 생활 모습</b>
                        <p>{event.life}</p>
                      </div>
                      <div>
                        <b>🏺 대표 유물 · 관련 자료</b>
                        <p>{event.artifact}</p>
                      </div>
                    </div>
                    <div className={styles.sourceRow}>
                      교재 {event.textbookPages.join(", ")}
                      {payload?.viewer.role === "teacher" && event.sourceIssueNumbers
                        ? ` · 관리용 ${event.sourceIssueNumbers.join(", ")}호`
                        : ""}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

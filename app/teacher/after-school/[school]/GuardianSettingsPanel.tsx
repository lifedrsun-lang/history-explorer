"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { isInitialGuardianSchool } from "@/lib/schoolEntryScope";
import {
  guardianExpectedLessonCount,
  guardianLessonCountMatches,
  guardianTermPaused,
} from "@/lib/guardianTermPolicy";

type Lesson = { lesson: number; date: string; cancelled: boolean; eventId: string };
type Plan = { lessons: Lesson[]; supplies: string; extra: string };
type Roster = { id: string; name: string; teachingClass: string; terms: string[] };
type CalendarRow = { date: string; title: string; eventId: string };
type CalendarResult = {
  classes: Record<string, CalendarRow[]>;
  unmatched: CalendarRow[];
};
type ScheduleImpactRow = {
  noticeId: string;
  studentId: string;
  teachingClass: string;
  kind: string;
  fromLesson: number;
  fromDate: string;
  toLesson?: number;
  toDate?: string;
};
type ScheduleImpact = { changes: ScheduleImpactRow[]; blocked: ScheduleImpactRow[] };

const blank = (): Plan => ({
  lessons: Array.from({ length: 12 }, (_, index) => ({
    lesson: index + 1,
    date: "",
    cancelled: false,
    eventId: "",
  })),
  supplies: "",
  extra: "",
});
const panel = "rounded-2xl border bg-white p-4 shadow-sm";

export default function GuardianSettingsPanel({ slug }: { slug: string }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [term, setTerm] = useState("");
  const [plans, setPlans] = useState<Record<string, Plan>>({ "A반": blank(), "B반": blank() });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [calendarResult, setCalendarResult] = useState<CalendarResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [code, setCode] = useState("");
  const [codeFor, setCodeFor] = useState("");
  const [studentId, setStudentId] = useState("");

  const paused = !isInitialGuardianSchool(slug) || guardianTermPaused(slug, term);
  const expected = guardianExpectedLessonCount(slug, term);

  async function request(body?: unknown) {
    const user = auth.currentUser;
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    const response = await fetch(`/api/teacher/guardian${body ? "" : `?school=${encodeURIComponent(slug)}`}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages: Record<string, string> = {
        disabled: "보호자 기능이 비활성 상태입니다.",
        lesson_count_mismatch: "확정 수업 횟수와 캘린더 일정 수가 일치하지 않습니다.",
        lesson_unavailable: "기존 불참 기록과 연결된 수업이 있습니다. 일정을 복원하거나 해당 기록을 확인해 주세요.",
        schedule_change_confirmation_required: "일정 변경 영향을 다시 확인해 주세요.",
      };
      throw new Error(messages[payload.error] || "요청을 처리하지 못했습니다. 권한과 설정을 확인해 주세요.");
    }
    return payload;
  }

  useEffect(() => {
    let live = true;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        if (live) setReady(false);
        return;
      }
      void request().then((result) => {
        if (!live) return;
        const config = result.config;
        setEnabled(config?.enabled === true);
        setTerm(config?.term || "");
        setPlans({
          "A반": config?.classes?.["A반"] || blank(),
          "B반": config?.classes?.["B반"] || blank(),
        });
        setSelected(Object.keys(config?.classes || {}));
        setRoster(result.roster || []);
        setReady(true);
      }).catch((caught) => {
        if (live) setError(caught instanceof Error ? caught.message : "보호자 관리 정보를 불러오지 못했습니다.");
      });
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, [slug]);

  function update(className: string, callback: (plan: Plan) => Plan) {
    setPlans((old) => ({ ...old, [className]: callback(old[className]) }));
  }

  async function run(callback: () => Promise<void>) {
    setBusy(true);
    setError("");
    setCode("");
    try {
      await callback();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "요청을 완료하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const valid = /^\d{4}-Q[1-4]$/.test(term)
    && (!enabled || (!paused && selected.length > 0))
    && selected.every((className) =>
      (paused || guardianLessonCountMatches(slug, term, plans[className].lessons.length))
      && plans[className].lessons.every((lesson, index) =>
        lesson.date && (index === 0 || lesson.date > plans[className].lessons[index - 1].date)
      )
    );

  async function saveConfig() {
    const classes = Object.fromEntries(selected.map((className) => [className, plans[className]]));
    const common = { slug, enabled: enabled && !paused, term, classes };
    const impact = await request({ action: "scheduleImpact", ...common }) as ScheduleImpact;
    if (impact.blocked.length) {
      const details = impact.blocked
        .map((item) => `${item.fromDate} ${item.fromLesson}회차 ${item.kind}`)
        .join("\n");
      throw new Error(`이동할 수 없는 기존 불참 기록이 ${impact.blocked.length}건 있습니다.\n${details}`);
    }
    if (impact.changes.length) {
      const details = impact.changes
        .map((item) => `${item.fromDate} ${item.fromLesson}회차 → ${item.toDate} ${item.toLesson}회차`)
        .join("\n");
      if (!window.confirm(`캘린더 변경으로 기존 불참 기록 ${impact.changes.length}건의 날짜 또는 회차가 바뀝니다.\n\n${details}\n\n변경된 기록은 다시 미확인 상태로 전환됩니다. 저장할까요?`)) {
        return;
      }
    }
    await request({
      action: "configure",
      ...common,
      confirmScheduleImpact: impact.changes.length > 0,
    });
  }

  return <section className={panel}>
    <h2 className="text-lg font-black">보호자 수업방 설정</h2>
    {error && <p role="alert" className="mt-2 whitespace-pre-wrap text-sm text-rose-700">{error}</p>}
    {!ready ? <p className="mt-2 text-sm text-slate-600">보호자 관리 권한을 확인 중이거나 기능이 비활성 상태입니다.</p> : <>
      <label className="mt-3 flex gap-2">
        <input type="checkbox" checked={enabled && !paused} disabled={paused} onChange={(event) => setEnabled(event.target.checked)} />
        보호자 수업방 활성화
      </label>
      <label className="mt-3 block text-sm font-bold">
        분기 (예: 2026-Q4)
        <input
          className="mt-1 w-full rounded border p-2"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setCalendarResult(null);
            setSelected([]);
            setEnabled(false);
            setPlans({ "A반": blank(), "B반": blank() });
          }}
        />
      </label>
      {expected !== null && expected > 0 && <p className="mt-2 text-sm font-bold text-slate-700">이 분기 확정 기준: 반별 {expected}회</p>}
      {paused && <p className="mt-3 rounded bg-slate-100 p-3 text-sm font-bold">이번 분기 휴강 또는 1차 운영 대상 제외 · 보호자 수업방 활성화 불가</p>}

      <div className="mt-4 rounded-xl border bg-sky-50 p-3">
        <h3 className="font-bold">캘린더에서 수업일 가져오기</h3>
        <p className="text-xs text-slate-600">출강일정/방과후 캘린더에서 해당 학교의 분기별 수업일을 조회합니다. 원본 일정은 수정하지 않습니다.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs">시작일<input type="date" className="block w-full rounded border p-1" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="text-xs">종료일 (미포함)<input type="date" className="block w-full rounded border p-1" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </div>
        <button
          type="button"
          disabled={paused || busy || !from || !to || from >= to || !/^\d{4}-Q[1-4]$/.test(term)}
          onClick={() => void run(async () => {
            setCalendarResult(null);
            setCalendarResult(await request({ action: "calendar", slug, term, from, to }));
          })}
          className="mt-2 w-full rounded bg-sky-700 p-2 font-bold text-white disabled:opacity-40"
        >
          캘린더 일정 조회
        </button>
        {calendarResult && <div className="mt-2 space-y-2">
          {["A반", "B반"].map((className) => {
            const rows = calendarResult.classes[className] || [];
            const distinctDates = new Set(rows.map((row) => row.date)).size === rows.length;
            const distinctEvents = new Set(rows.map((row) => row.eventId)).size === rows.length;
            const matchesCount = guardianLessonCountMatches(slug, term, rows.length);
            return <div key={className} className="rounded border bg-white p-2 text-sm">
              <p className="font-bold">{className} · {rows.length}회 확인</p>
              <p className="text-xs">{rows.map((row) => row.date).join(" · ") || "확인된 일정 없음"}</p>
              {(!matchesCount || !distinctDates || !distinctEvents) && <p className="text-xs text-amber-800">
                {expected !== null
                  ? `확정 ${expected}회와 불일치하거나 일정이 중복됩니다. 캘린더를 확인해 주세요.`
                  : "1~12회 범위를 벗어나거나 일정이 중복됩니다. 적용하지 않습니다."}
              </p>}
              <button
                type="button"
                disabled={paused || busy || !matchesCount || !distinctDates || !distinctEvents}
                className="mt-2 rounded border px-2 py-1 disabled:opacity-40"
                onClick={() => {
                  if (!window.confirm(`${className} 수업일 ${rows.length}개를 불러올까요? 해당 분기의 전체 일정인지 확인해 주세요.`)) return;
                  update(className, (plan) => ({
                    ...plan,
                    lessons: rows.map((row, index) => ({
                      lesson: index + 1,
                      date: row.date,
                      cancelled: false,
                      eventId: row.eventId,
                    })),
                  }));
                  setSelected((old) => old.includes(className) ? old : [...old, className]);
                }}
              >
                확인된 일정 불러오기
              </button>
            </div>;
          })}
          {calendarResult.unmatched.length > 0 && <p className="text-xs text-amber-800">
            반 구분 미확인 {calendarResult.unmatched.length}건: {calendarResult.unmatched.map((row) => `${row.title} (${row.date})`).join(" / ")}
          </p>}
        </div>}
      </div>

      {["A반", "B반"].map((className) => <div key={className} className="mt-4 rounded-xl border p-3">
        <label className="flex gap-2 font-bold">
          <input
            type="checkbox"
            checked={selected.includes(className)}
            onChange={(event) => {
              if (event.target.checked && expected !== null && expected > 0 && plans[className].lessons.every((lesson) => !lesson.date)) {
                update(className, (plan) => ({
                  ...plan,
                  lessons: Array.from({ length: expected }, (_, index) => ({
                    lesson: index + 1,
                    date: "",
                    cancelled: false,
                    eventId: "",
                  })),
                }));
              }
              setSelected((old) => event.target.checked ? [...old, className] : old.filter((value) => value !== className));
            }}
          />
          {className} 운영
        </label>
        {selected.includes(className) && <>
          <label className="mt-2 block text-sm">공통 준비물<textarea className="w-full rounded border p-2" maxLength={500} value={plans[className].supplies} onChange={(event) => update(className, (plan) => ({ ...plan, supplies: event.target.value }))} /></label>
          <label className="mt-2 block text-sm">추가 준비물 / 특이 전달사항<textarea className="w-full rounded border p-2" maxLength={500} value={plans[className].extra} onChange={(event) => update(className, (plan) => ({ ...plan, extra: event.target.value }))} /></label>
          <label className="mt-2 block text-sm font-bold">
            실제 수업 횟수
            <select
              className="ml-2 rounded border p-1"
              value={plans[className].lessons.length}
              onChange={(event) => {
                const count = Number(event.target.value);
                update(className, (plan) => ({
                  ...plan,
                  lessons: Array.from({ length: count }, (_, index) => plan.lessons[index] || {
                    lesson: index + 1,
                    date: "",
                    cancelled: false,
                    eventId: "",
                  }),
                }));
              }}
            >
              {(expected !== null && expected > 0 ? [expected] : Array.from({ length: 12 }, (_, index) => index + 1))
                .map((count) => <option key={count} value={count}>{count}ȸ</option>)}
            </select>
          </label>
          <p className="mt-1 text-xs text-slate-500">4회씩 텀을 구성하며, 부족한 날짜를 자동 추정하지 않습니다.</p>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {plans[className].lessons.map((lesson, index) => <div key={lesson.lesson} className="rounded bg-slate-50 p-2">
              <label className="text-xs">
                {Math.ceil(lesson.lesson / 4)}텀 · {lesson.lesson}회차
                <input
                  type="date"
                  value={lesson.date}
                  onChange={(event) => update(className, (plan) => ({
                    ...plan,
                    lessons: plan.lessons.map((value, lessonIndex) => lessonIndex === index
                      ? { ...value, date: event.target.value, eventId: event.target.value === value.date ? value.eventId : "" }
                      : value),
                  }))}
                  className="block w-full rounded border p-1"
                />
              </label>
              <label className="mt-1 flex gap-1 text-xs">
                <input type="checkbox" checked={lesson.cancelled} onChange={(event) => update(className, (plan) => ({
                  ...plan,
                  lessons: plan.lessons.map((value, lessonIndex) => lessonIndex === index ? { ...value, cancelled: event.target.checked } : value),
                }))} />
                휴강
              </label>
            </div>)}
          </div>
        </>}
      </div>)}

      <p className="mt-3 text-xs text-slate-600">학교 선택 카드의 입장코드 관리에서 보호자 공통 코드를 설정하세요.</p>
      <button type="button" className="mt-3 w-full rounded-xl bg-violet-700 p-3 font-bold text-white disabled:opacity-40" disabled={busy || !valid} onClick={() => void run(saveConfig)}>학교 설정 저장</button>

      <div className="mt-4 border-t pt-3">
        <h3 className="font-bold">자녀별 보호자 인증 코드</h3>
        <select className="mt-2 w-full rounded border p-2" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          <option value="">학생 선택</option>
          {roster.filter((student) => student.terms.includes(term)).map((student) => <option key={student.id} value={student.id}>{student.name} · {student.teachingClass}</option>)}
        </select>
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={paused || busy || !studentId} className="flex-1 rounded bg-violet-100 p-2 font-bold disabled:opacity-40" onClick={() => void run(async () => {
            if (!window.confirm("기존 자녀 인증 코드가 있다면 무효화됩니다. 발급할까요?")) return;
            const result = await request({ action: "issue", slug, studentId });
            setCode(result.code || "");
            setCodeFor("선택 학생 보호자 인증 코드");
          })}>발급 / 재발급</button>
          <button type="button" disabled={paused || busy || !studentId} className="rounded border p-2 text-rose-700" onClick={() => void run(async () => {
            if (!window.confirm("이 보호자의 접근을 해제할까요?")) return;
            await request({ action: "issue", slug, studentId, revoke: true });
          })}>접근 해제</button>
        </div>
      </div>
      {code && <div className="mt-3 rounded-xl bg-amber-50 p-3">
        <p className="text-sm font-bold">{codeFor} (한 번만 표시)</p>
        <p className="break-all font-mono">{code}</p>
        <button type="button" className="mt-2 rounded border p-2 text-sm" onClick={() => setCode("")}>코드 숨기기</button>
      </div>}
    </>}
  </section>;
}


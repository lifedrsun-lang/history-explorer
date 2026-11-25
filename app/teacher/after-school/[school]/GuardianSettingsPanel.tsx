"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
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
  const [plans, setPlans] = useState<Record<string, Plan>>({ "A��": blank(), "B��": blank() });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [calendarResult, setCalendarResult] = useState<CalendarResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [code, setCode] = useState("");
  const [codeFor, setCodeFor] = useState("");
  const [rotate, setRotate] = useState(false);
  const [hasCode, setHasCode] = useState(false);
  const [studentId, setStudentId] = useState("");

  const paused = guardianTermPaused(slug, term);
  const expected = guardianExpectedLessonCount(slug, term);

  async function request(body?: unknown) {
    const user = auth.currentUser;
    if (!user) throw new Error("���� �α����� �ʿ��մϴ�.");
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
        disabled: "��ȣ�� ����� ���� ��Ȱ�� �����Դϴ�.",
        lesson_count_mismatch: "Ȯ�� ���� Ƚ���� Ķ���� ���� ���� ��ġ���� �ʽ��ϴ�.",
        lesson_unavailable: "���� ���� ��ϰ� ������ �� ���� ������ �ֽ��ϴ�. ������ �ǵ����ų� �ش� ����� ���� Ȯ���� �ּ���.",
        schedule_change_confirmation_required: "���� ���� ������ �ٽ� Ȯ���� �ּ���.",
      };
      throw new Error(messages[payload.error] || "���� �� ������ Ȯ���� �ּ���.");
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
          "A��": config?.classes?.["A��"] || blank(),
          "B��": config?.classes?.["B��"] || blank(),
        });
        setSelected(Object.keys(config?.classes || {}));
        setRoster(result.roster || []);
        setHasCode(config?.hasCode === true);
        setReady(true);
      }).catch((caught) => {
        if (live) setError(caught instanceof Error ? caught.message : "��ȣ�� ���� ������ �ҷ����� ���߽��ϴ�.");
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
      setError(caught instanceof Error ? caught.message : "��û�� �Ϸ����� ���߽��ϴ�.");
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
    const common = { slug, enabled: enabled && !paused, term, classes, rotateCode: rotate };
    const impact = await request({ action: "scheduleImpact", ...common }) as ScheduleImpact;
    if (impact.blocked.length) {
      const details = impact.blocked
        .map((item) => `${item.fromDate} ${item.fromLesson}ȸ�� ${item.kind}`)
        .join("\n");
      throw new Error(`������ �� ���� ���� ���� ����� ${impact.blocked.length}�� �ֽ��ϴ�.\n${details}`);
    }
    if (impact.changes.length) {
      const details = impact.changes
        .map((item) => `${item.fromDate} ${item.fromLesson}ȸ�� �� ${item.toDate} ${item.toLesson}ȸ��`)
        .join("\n");
      if (!window.confirm(`Ķ���� �������� ���� ���� ��� ${impact.changes.length}���� ��¥ �Ǵ� ȸ���� �ٲ�ϴ�.\n\n${details}\n\n���� �� ���� Ȯ�� ���´� �ٽ� ��Ȯ������ ��ȯ�˴ϴ�. ����ұ��?`)) {
        return;
      }
    }
    const result = await request({
      action: "configure",
      ...common,
      confirmScheduleImpact: impact.changes.length > 0,
    });
    setCode(result.code || "");
    setCodeFor("�б� ��ȣ�� �ڵ�");
    setHasCode(true);
    setRotate(false);
  }

  return <section className={panel}>
    <h2 className="text-lg font-black">��ȣ�� ������ ����</h2>
    {error && <p role="alert" className="mt-2 whitespace-pre-wrap text-sm text-rose-700">{error}</p>}
    {!ready ? <p className="mt-2 text-sm text-slate-600">��ȣ�� ���� ������ Ȯ�� ���̰ų� ����� ��Ȱ�� �����Դϴ�.</p> : <>
      <label className="mt-3 flex gap-2">
        <input type="checkbox" checked={enabled && !paused} disabled={paused} onChange={(event) => setEnabled(event.target.checked)} />
        ��ȣ�� ������ Ȱ��ȭ
      </label>
      <label className="mt-3 block text-sm font-bold">
        �б� (��: 2026-Q4)
        <input
          className="mt-1 w-full rounded border p-2"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setCalendarResult(null);
            setSelected([]);
            setEnabled(false);
            setPlans({ "A��": blank(), "B��": blank() });
          }}
        />
      </label>
      {expected !== null && expected > 0 && <p className="mt-2 text-sm font-bold text-slate-700">�� �б� Ȯ�� ����: �ݺ� {expected}ȸ</p>}
      {paused && <p className="mt-3 rounded bg-slate-100 p-3 text-sm font-bold">2026�г⵵ 4�б� �ް� �� ��ȣ�� ������ Ȱ��ȭ ����</p>}

      <div className="mt-4 rounded-xl border bg-sky-50 p-3">
        <h3 className="font-bold">Ķ�������� ������ ��������</h3>
        <p className="text-xs text-slate-600">�Ⱝ����/����Ŀ��� �ش� �б��� �б��� ���� ������ ��ȸ�մϴ�. �������� �������� �ʽ��ϴ�.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs">������<input type="date" className="block w-full rounded border p-1" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="text-xs">������ (������)<input type="date" className="block w-full rounded border p-1" value={to} onChange={(event) => setTo(event.target.value)} /></label>
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
          Ķ���� ���� ��ȸ
        </button>
        {calendarResult && <div className="mt-2 space-y-2">
          {["A��", "B��"].map((className) => {
            const rows = calendarResult.classes[className] || [];
            const distinctDates = new Set(rows.map((row) => row.date)).size === rows.length;
            const distinctEvents = new Set(rows.map((row) => row.eventId)).size === rows.length;
            const matchesCount = guardianLessonCountMatches(slug, term, rows.length);
            return <div key={className} className="rounded border bg-white p-2 text-sm">
              <p className="font-bold">{className} �� {rows.length}ȸ Ȯ��</p>
              <p className="text-xs">{rows.map((row) => row.date).join(" �� ") || "Ȯ�ε� ���� ����"}</p>
              {(!matchesCount || !distinctDates || !distinctEvents) && <p className="text-xs text-amber-800">
                {expected !== null
                  ? `Ȯ�� ${expected}ȸ�� ����ġ�ϰų� ������ �ߺ��˴ϴ�. Ķ������ Ȯ���� �ּ���.`
                  : "1~12ȸ ������ ����ų� ������ �ߺ��˴ϴ�. �������� �ʽ��ϴ�."}
              </p>}
              <button
                type="button"
                disabled={paused || busy || !matchesCount || !distinctDates || !distinctEvents}
                className="mt-2 rounded border px-2 py-1 disabled:opacity-40"
                onClick={() => {
                  if (!window.confirm(`${className} ������ ${rows.length}���� �ҷ��ñ��? �ش� �б��� ��ü �������� Ȯ���� �ּ���.`)) return;
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
                Ȯ�ε� ���� �ҷ�����
              </button>
            </div>;
          })}
          {calendarResult.unmatched.length > 0 && <p className="text-xs text-amber-800">
            �� ���� ��Ȯ�� {calendarResult.unmatched.length}��: {calendarResult.unmatched.map((row) => `${row.title} (${row.date})`).join(" / ")}
          </p>}
        </div>}
      </div>

      {["A��", "B��"].map((className) => <div key={className} className="mt-4 rounded-xl border p-3">
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
          {className} ���
        </label>
        {selected.includes(className) && <>
          <label className="mt-2 block text-sm">���� �غ�<textarea className="w-full rounded border p-2" maxLength={500} value={plans[className].supplies} onChange={(event) => update(className, (plan) => ({ ...plan, supplies: event.target.value }))} /></label>
          <label className="mt-2 block text-sm">�߰� �غ� / Ư�� ���޻���<textarea className="w-full rounded border p-2" maxLength={500} value={plans[className].extra} onChange={(event) => update(className, (plan) => ({ ...plan, extra: event.target.value }))} /></label>
          <label className="mt-2 block text-sm font-bold">
            ���� ���� Ƚ��
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
          <p className="mt-1 text-xs text-slate-500">4ȸ�� ���� �����ϸ�, ������ ��¥�� �ڵ� �������� �ʽ��ϴ�.</p>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {plans[className].lessons.map((lesson, index) => <div key={lesson.lesson} className="rounded bg-slate-50 p-2">
              <label className="text-xs">
                {Math.ceil(lesson.lesson / 4)}�� �� {lesson.lesson}ȸ��
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
                �ް�
              </label>
            </div>)}
          </div>
        </>}
      </div>)}

      {hasCode && <label className="mt-3 flex gap-2 text-sm"><input type="checkbox" checked={rotate} onChange={(event) => setRotate(event.target.checked)} />�б� �ڵ� ��߱� (���� ��ȣ�� ���� ����)</label>}
      <button type="button" className="mt-3 w-full rounded-xl bg-violet-700 p-3 font-bold text-white disabled:opacity-40" disabled={busy || !valid} onClick={() => void run(saveConfig)}>�б� ���� ����</button>

      <div className="mt-4 border-t pt-3">
        <h3 className="font-bold">�ڳະ ��ȣ�� ���� �ڵ�</h3>
        <select className="mt-2 w-full rounded border p-2" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          <option value="">�л� ����</option>
          {roster.filter((student) => student.terms.includes(term)).map((student) => <option key={student.id} value={student.id}>{student.name} �� {student.teachingClass}</option>)}
        </select>
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={paused || busy || !studentId} className="flex-1 rounded bg-violet-100 p-2 font-bold disabled:opacity-40" onClick={() => void run(async () => {
            if (!window.confirm("���� �ڳ� ���� �ڵ尡 �ִٸ� ��ȿȭ�˴ϴ�. �߱��ұ��?")) return;
            const result = await request({ action: "issue", slug, studentId });
            setCode(result.code || "");
            setCodeFor("���� �л� ��ȣ�� ���� �ڵ�");
          })}>�߱� / ��߱�</button>
          <button type="button" disabled={paused || busy || !studentId} className="rounded border p-2 text-rose-700" onClick={() => void run(async () => {
            if (!window.confirm("�� ��ȣ�� ������ ����ұ��?")) return;
            await request({ action: "issue", slug, studentId, revoke: true });
          })}>���� ����</button>
        </div>
      </div>
      {code && <div className="mt-3 rounded-xl bg-amber-50 p-3">
        <p className="text-sm font-bold">{codeFor} (�� ���� ǥ��)</p>
        <p className="break-all font-mono">{code}</p>
        <button type="button" className="mt-2 rounded border p-2 text-sm" onClick={() => setCode("")}>�ڵ� �����</button>
      </div>}
    </>}
  </section>;
}


"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { auth } from "@/lib/firebase";
import { isStudentEnrolledInQuarter } from "@/lib/studentRoster";

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
type Student = {
  id: string;
  name: string;
  school: string;
  grade: string;
  schoolClass: string;
  enrollmentStatus: string;
  enrollmentTerms: string[];
  phone: string;
};
type School = {
  contractId: string;
  schoolName: string;
  title: string;
  rule: string;
  quarterParticipation: Partial<Record<Quarter, Record<string, boolean[]>>>;
  students: Student[];
};
type SavedRecord = {
  contractId?: string;
  quarter?: string;
  receipts?: Record<string, boolean[]>;
  studentIds?: string[];
};

const quarters: { key: Quarter; label: string }[] = [
  { key: "Q1", label: "1분기" },
  { key: "Q2", label: "2분기" },
  { key: "Q3", label: "3분기" },
  { key: "Q4", label: "4분기" },
];
const terms = ["1텀", "2텀", "3텀"];

const normalizeSchool = (value: string) =>
  value.replace(/\s/g, "").replace(/초등학교/g, "초").replace(/초등/g, "초");

const normalizeChecks = (value: boolean[] | undefined) => [
  Boolean(value?.[0]),
  Boolean(value?.[1]),
  Boolean(value?.[2]),
];

const ruleLabel = (rule: string) => {
  if (rule === "all_after_enrollment") return "중도 취소해도 1~3텀 교재 모두 지급";
  if (rule === "started_terms_only") return "미개시 텀은 교재 미수령·환불";
  return "수강료 체크 기준으로 산정";
};

export default function TextbookReceiptsPage() {
  const searchParams = useSearchParams();
  const requestedSchool = searchParams.get("school") || "";
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [quarter, setQuarter] = useState<Quarter>("Q1");
  const [rosterStudents, setRosterStudents] = useState<Student[]>([]);
  const [receipts, setReceipts] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportScope, setExportScope] = useState("selected");
  const [academicYear, setAcademicYear] = useState(2026);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () => onAuthStateChanged(auth, (current) => {
      setUser(current);
      setAuthChecking(false);
    }),
    []
  );

  const requestJson = useCallback(async (url: string, init?: RequestInit) => {
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
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const query = requestedSchool ? `?school=${encodeURIComponent(requestedSchool)}` : "";
      const data = await requestJson(`/api/teacher/textbook-receipts${query}`);
      const next = Array.isArray(data.schools) ? data.schools : [];
      const requested = requestedSchool
        ? next.find((item: School) => normalizeSchool(item.schoolName) === normalizeSchool(requestedSchool))
        : undefined;
      setSchools(next);
      setAcademicYear(Number(data.academicYear) || 2026);
      setRecords(Array.isArray(data.records) ? data.records : []);
      setSchoolId((current) => {
        if (requestedSchool) return requested?.contractId || "";
        return current && next.some((item: School) => item.contractId === current)
          ? current
          : next[0]?.contractId || "";
      });
      if (requestedSchool && !requested) {
        setError("요청한 학교의 교재 수령 정보를 찾지 못했습니다.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [requestJson, requestedSchool, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedSchool = schools.find((item) => item.contractId === schoolId);
  const scopedSchool = requestedSchool
    ? schools.find((item) => normalizeSchool(item.schoolName) === normalizeSchool(requestedSchool))
    : selectedSchool;
  const selectedRecord = records.find(
    (item) => item.contractId === scopedSchool?.contractId && item.quarter === quarter
  );

  const sourceStudents = useMemo(() => {
    if (!scopedSchool) return [];
    return scopedSchool.students.filter((student) =>
      isStudentEnrolledInQuarter(student, quarter)
    );
  }, [quarter, scopedSchool]);

  useEffect(() => {
    if (!scopedSchool) {
      setRosterStudents([]);
      setReceipts({});
      return;
    }

    const savedReceipts = selectedRecord?.receipts || {};
    const nextReceipts: Record<string, boolean[]> = {};
    const nextStudents = sourceStudents.map((student) => ({ ...student, phone: student.phone || "" }));

    nextStudents.forEach((student) => {
      if (Object.prototype.hasOwnProperty.call(savedReceipts, student.id)) {
        nextReceipts[student.id] = normalizeChecks(savedReceipts[student.id]);
        return;
      }

      nextReceipts[student.id] = [true, true, true];
    });

    setRosterStudents(nextStudents);
    setReceipts(nextReceipts);
  }, [quarter, scopedSchool, selectedRecord, sourceStudents]);

  const totals = [0, 1, 2].map(
    (term) => rosterStudents.filter((student) => Boolean(receipts[student.id]?.[term])).length
  );
  const uniqueCount = rosterStudents.filter((student) => (receipts[student.id] || []).some(Boolean)).length;

  const toggle = (studentId: string, term: number) => setReceipts((current) => {
    const checks = [...(current[studentId] || [false, false, false])];
    checks[term] = !checks[term];
    return { ...current, [studentId]: checks };
  });

  const updatePhone = (studentId: string, phone: string) => setRosterStudents((current) =>
    current.map((student) => student.id === studentId ? { ...student, phone } : student)
  );

  const save = async () => {
    if (!scopedSchool) return false;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/teacher/textbook-receipts", {
        method: "POST",
        body: JSON.stringify({
          contractId: scopedSchool.contractId,
          schoolName: scopedSchool.schoolName,
          quarter,
          receipts,
          studentPhones: Object.fromEntries(
            rosterStudents.map((student) => [student.id, student.phone])
          ),
        }),
      });
      setNotice(
        `${scopedSchool.schoolName} ${quarters.find((item) => item.key === quarter)?.label} 학생 ${rosterStudents.length}명의 교재 수령기록을 저장했습니다.`
      );
      await load();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장하지 못했습니다.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const summaryRows = schools.map((school) => {
    const students = school.students.filter((student) => isStudentEnrolledInQuarter(student, quarter, academicYear));
    const record = records.find((item) => item.contractId === school.contractId && item.quarter === quarter);
    const isSelected = school.contractId === scopedSchool?.contractId;
    const checks = isSelected ? receipts : record?.receipts || {};
    const counts = [0, 1, 2].map((term) => students.filter((student) => Boolean(checks[student.id]?.[term])).length);
    const ready = isSelected || students.every((student) => Object.prototype.hasOwnProperty.call(checks, student.id));
    return { contractId: school.contractId, schoolName: school.schoolName, title: school.title, counts, total: counts.reduce((sum, count) => sum + count, 0), ready, studentCount: students.length };
  });
  const exportRows = summaryRows.filter((row) => exportScope === "all" || row.contractId === scopedSchool?.contractId);
  const reportFilename = `교재수령보고서_${academicYear}년_${quarters.find((item) => item.key === quarter)?.label}_${exportScope === "all" ? "전체학교" : scopedSchool?.schoolName || "학교"}`.replace(/[\\/:*?"<>|]/g, "-");
  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportReport = async (format: "pdf" | "csv") => {
    if (!user || exporting || loading || !exportRows.length) return;
    setExporting(true);
    setError("");
    try {
      if (exportRows.some((row) => !row.ready)) throw new Error("미저장 학교의 해당 분기 교재 수령기록을 먼저 확인하고 저장해 주세요.");
      // Keep the download and persisted checkboxes aligned, including edits just made.
      if (!await save()) return;
      const rows = exportRows.map(({ schoolName, title, counts }) => ({ schoolName, title, counts }));
      if (format === "csv") {
        const cell = (value: string | number) => `"${String(value).replace(/^[=+@-]/, "'$&").replace(/"/g, '\"\"')}"`;
        const counts = rows.reduce((sums, row) => sums.map((sum, i) => sum + row.counts[i]), [0, 0, 0]);
        const lines = [
          ["SUN LAB 교재 수령 보고서", `${academicYear}년 ${quarters.find((item) => item.key === quarter)?.label}`],
          ["학교", "수업", "1텀 수령 인원(명)", "2텀 수령 인원(명)", "3텀 수령 인원(명)", "총 교재 권수(권)"],
          ...rows.map((row) => [row.schoolName, row.title, ...row.counts, row.counts.reduce((sum, count) => sum + count, 0)]),
          ["합계", "", ...counts, counts.reduce((sum, count) => sum + count, 0)],
          ["산정 기준", "텀별 1인 1권. 총 권수 = 1텀 인원 + 2텀 인원 + 3텀 인원."],
        ];
        download(new Blob(["\uFEFF", lines.map((line) => line.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `${reportFilename}.csv`);
      } else {
        const response = await fetch("/api/teacher/textbook-receipts/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
          body: JSON.stringify({ academicYear, quarter, rows }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "PDF를 만들지 못했습니다.");
        }
        download(await response.blob(), `${reportFilename}.pdf`);
      }
      setNotice("교재 수령 보고서 파일을 내려받았습니다. 메일에 첨부해 보내세요.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "파일을 내려받지 못했습니다.");
    } finally {
      setExporting(false);
    }
  };

  if (authChecking) {
    return <main className="min-h-screen bg-slate-50 p-6 font-bold">로그인 확인 중...</main>;
  }
  if (!user) {
    return <main className="min-h-screen bg-slate-50 p-6 font-bold">교사 로그인이 필요합니다.</main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
          <div className="text-xs font-black text-indigo-600">교재 수령인원 확인</div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">학교별 · 분기별 교재 수령 명단</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            수강생 관리의 분기 체크로 명단을 불러오고, 여기서는 텀별 교재 수령 여부만 따로 관리합니다.
          </p>
          <div className={`mt-5 grid gap-3 ${requestedSchool ? "" : "sm:grid-cols-2"}`}>
            {!requestedSchool && (
              <label className="text-xs font-black text-slate-600">
                학교
                <select
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
                >
                  {schools.map((item) => (
                    <option key={item.contractId} value={item.contractId}>
                      {item.schoolName}{item.title ? ` · ${item.title}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs font-black text-slate-600">
              분기
              <select
                value={quarter}
                onChange={(event) => setQuarter(event.target.value as Quarter)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
              >
                {quarters.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
          </div>
          {scopedSchool && (
            <div className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-800">
              {scopedSchool.schoolName} 기준 · {ruleLabel(scopedSchool.rule)}
            </div>
          )}
          {error && <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
          {notice && <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}
        </section>

        <section className="mt-4 overflow-hidden rounded-[28px] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[120px_100px_1fr_170px_80px_80px_80px] bg-slate-900 px-4 py-3 text-center text-xs font-black text-white">
                <div className="text-left">학년·반</div>
                <div>상태</div>
                <div className="text-left">이름</div>
                <div className="text-left">전화번호</div>
                {terms.map((term) => <div key={term}>{term}</div>)}
              </div>
              {loading ? (
                <div className="p-8 text-center text-sm font-bold text-slate-400">불러오는 중...</div>
              ) : rosterStudents.length === 0 ? (
                <div className="p-8 text-center text-sm font-bold text-slate-400">수강생 관리에서 이 분기로 체크된 학생이 없습니다.</div>
              ) : rosterStudents.map((student) => (
                <div
                  key={student.id}
                  className="grid grid-cols-[120px_100px_1fr_170px_80px_80px_80px] items-center border-t border-slate-100 px-4 py-3 text-center"
                >
                  <div className="text-left text-sm font-black text-slate-700">
                    {[student.grade, student.schoolClass].filter(Boolean).join(" ") || "-"}
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    {student.enrollmentStatus === "ended" ? "종료" : student.enrollmentStatus === "paused" ? "쉬는중" : "수강중"}
                  </div>
                  <div className="text-left text-sm font-black text-slate-900">{student.name}</div>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={student.phone}
                    onChange={(event) => updatePhone(student.id, event.target.value)}
                    placeholder="전화번호"
                    aria-label={`${student.name} 전화번호`}
                    className="mr-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                  />
                  {[0, 1, 2].map((term) => (
                    <label key={term} className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={Boolean(receipts[student.id]?.[term])}
                        onChange={() => toggle(student.id, term)}
                        className="h-5 w-5 accent-indigo-600"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              <div className="rounded-2xl bg-white p-3 text-center">
                <div className="text-[11px] font-black text-slate-400">분기 수강생</div>
                <div className="mt-1 text-xl font-black">{rosterStudents.length}명</div>
              </div>
              <div className="rounded-2xl bg-white p-3 text-center">
                <div className="text-[11px] font-black text-slate-400">수령 학생</div>
                <div className="mt-1 text-xl font-black">{uniqueCount}명</div>
              </div>
              {totals.map((count, index) => (
                <div key={terms[index]} className="rounded-2xl bg-white p-3 text-center">
                  <div className="text-[11px] font-black text-slate-400">{terms[index]}</div>
                  <div className="mt-1 text-xl font-black">{count}명</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl bg-indigo-50 p-3 text-center font-black text-indigo-800">총 교재 권수 {totals.reduce((sum, count) => sum + count, 0)}권 <span className="block text-xs">1텀 + 2텀 + 3텀 · 텀별 1인 1권</span></div>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!scopedSchool || saving || loading || exporting}
              className="mt-4 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? "저장 중..." : "이 분기 교재 수령기록 저장"}
            </button>
          </div>
        </section>
        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">메일 첨부용 교재 수령 보고서</h2>
          <p className="mt-2 text-sm text-slate-500">3텀 수령 확인을 마친 뒤 내려받으세요. 현재 학교의 체크를 저장하고 파일을 만듭니다.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-center text-sm">
              <thead><tr className="bg-slate-100"><th className="p-3">학교</th><th>1텀</th><th>2텀</th><th>3텀</th><th>총 권수</th></tr></thead>
              <tbody>{summaryRows.map((row) => <tr key={row.contractId} className="border-b border-slate-100"><td className="p-3 font-bold">{row.schoolName}</td>{row.counts.map((count, index) => <td key={index}>{row.ready ? `${count}명` : "미저장"}</td>)}<td className="font-black">{row.ready ? `${row.total}권` : "확인 필요"}</td></tr>)}</tbody>
            </table>
          </div>
          <label className="mt-4 block text-sm font-bold">다운로드 범위<select aria-label="다운로드 범위" value={exportScope} onChange={(event) => setExportScope(event.target.value)} className="ml-3 rounded-xl border p-2"><option value="selected">현재 학교</option><option value="all">전체 학교</option></select></label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!scopedSchool || loading || saving || exporting} onClick={() => void exportReport("pdf")} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{exporting ? "파일 만드는 중..." : "PDF 다운로드"}</button>
            <button type="button" disabled={!scopedSchool || loading || saving || exporting} onClick={() => void exportReport("csv")} className="rounded-xl border border-indigo-200 px-4 py-3 text-sm font-black text-indigo-700 disabled:opacity-50">엑셀용 CSV 다운로드</button>
          </div>
        </section>
      </div>
    </main>
  );
}

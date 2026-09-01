"use client";

import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type FeeType = "afterschool" | "contract";
type FeeTab = "summary" | "afterschool" | "contract";
type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4";

type FeeContract = {
  id: string;
  type: FeeType;
  schoolName: string;
  title?: string;
  rateA?: number;
  rateB?: number;
  ratePerSession?: number;
  sessionCount?: number;
  monthLabels?: string[];
  participation?: Record<string, boolean[]>;
  quarterParticipation?: Partial<Record<QuarterKey, Record<string, boolean[]>>>;
  workSessions?: Record<string, Record<string, number>>;
  contractStartDate?: string;
  contractEndDate?: string;
  insuranceFee?: number;
  taxAmount?: number;
  allowanceAmount?: number;
  receivedDate?: string;
};

type FeeStudent = {
  id: string;
  name: string;
  school: string;
  grade: string;
  teachingClass: "A반" | "B반" | "";
  enrollmentStatus: "active" | "paused" | "ended";
};

type CalendarDay = {
  dateKey: string;
  day: number;
  weekday: number;
};

const formatWon = (value: number) =>
  `${Math.round(value).toLocaleString("ko-KR")}원`;
const defaultMonths = ["1차월", "2차월", "3차월"];
const quarters: { key: QuarterKey; label: string }[] = [
  { key: "Q1", label: "1분기" },
  { key: "Q2", label: "2분기" },
  { key: "Q3", label: "3분기" },
  { key: "Q4", label: "4분기" },
];
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

const normalizeSchoolName = (value: unknown) =>
  String(value || "")
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초")
    .trim();

const isSameSchool = (left: unknown, right: unknown) => {
  const a = normalizeSchoolName(left);
  const b = normalizeSchoolName(right);
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
};

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const shiftMonth = (monthKey: string, offset: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getCalendarWeeks = (monthKey: string): CalendarDay[][] => {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const weeks: CalendarDay[][] = [];
  let week: CalendarDay[] = [];
  let lastWeekIndex = -1;

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;

    const mondayOffset =
      (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const weekIndex = Math.floor((day - 1 + mondayOffset) / 7);
    if (weekIndex !== lastWeekIndex && week.length > 0) {
      weeks.push(week);
      week = [];
    }
    lastWeekIndex = weekIndex;
    week.push({
      dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      weekday,
    });
  }

  if (week.length > 0) weeks.push(week);
  return weeks;
};

const isDateWithinContract = (contract: FeeContract, dateKey: string) => {
  if (contract.contractStartDate && dateKey < contract.contractStartDate) {
    return false;
  }
  if (contract.contractEndDate && dateKey > contract.contractEndDate) {
    return false;
  }
  return true;
};

export default function TeacherFeesPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<FeeContract[]>([]);
  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [tab, setTab] = useState<FeeTab>("summary");
  const [quarter, setQuarter] = useState<QuarterKey>("Q3");
  const [expandedContractId, setExpandedContractId] = useState("");
  const [contractMonth, setContractMonth] = useState(currentMonthKey());

  const [type, setType] = useState<FeeType>("afterschool");
  const [schoolName, setSchoolName] = useState("");
  const [title, setTitle] = useState("");
  const [rateA, setRateA] = useState("");
  const [rateB, setRateB] = useState("");
  const [ratePerSession, setRatePerSession] = useState("");
  const [sessionCount, setSessionCount] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthChecking(false);
      }),
    []
  );

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
      if (!response.ok) {
        throw new Error(data?.error || "요청 처리에 실패했습니다.");
      }
      return data;
    },
    [user]
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await requestJson("/api/teacher/fees");
      setContracts(Array.isArray(data?.contracts) ? data.contracts : []);
      setStudents(Array.isArray(data?.students) ? data.students : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "수강료 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [requestJson, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const schoolOptions = useMemo(
    () =>
      Array.from(
        new Set(students.map((student) => student.school).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "ko-KR")),
    [students]
  );

  const patchContract = async (
    id: string,
    updates: Partial<FeeContract>
  ) => {
    setContracts((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
    try {
      await requestJson("/api/teacher/fees", {
        method: "PATCH",
        body: JSON.stringify({ id, ...updates }),
      });
    } catch (patchError) {
      setError(
        patchError instanceof Error ? patchError.message : "저장하지 못했습니다."
      );
      await loadData();
    }
  };

  const hasHistoricalParticipation = (
    contract: FeeContract,
    studentId: string
  ) => {
    const legacy = contract.participation?.[studentId];
    if (Array.isArray(legacy) && legacy.some(Boolean)) return true;
    return quarters.some(({ key }) => {
      const checks = contract.quarterParticipation?.[key]?.[studentId];
      return Array.isArray(checks) && checks.some(Boolean);
    });
  };

  const getMatchingStudents = (contract: FeeContract) =>
    students.filter(
      (student) =>
        isSameSchool(student.school, contract.schoolName) &&
        Boolean(student.teachingClass) &&
        (student.enrollmentStatus !== "ended" ||
          hasHistoricalParticipation(contract, student.id))
    );

  const getBulkStudents = (contract: FeeContract) =>
    getMatchingStudents(contract).filter(
      (student) => student.enrollmentStatus !== "ended"
    );

  const getQuarterMap = (
    contract: FeeContract,
    quarterKey: QuarterKey
  ) => {
    const stored = contract.quarterParticipation?.[quarterKey];
    if (stored) return stored;
    if (quarterKey === "Q3" && contract.participation) {
      return contract.participation;
    }
    return {};
  };

  const getChecks = (
    contract: FeeContract,
    student: FeeStudent,
    quarterKey: QuarterKey
  ) => {
    const stored = getQuarterMap(contract, quarterKey)?.[student.id];
    if (Array.isArray(stored)) {
      return [Boolean(stored[0]), Boolean(stored[1]), Boolean(stored[2])];
    }
    if (quarterKey === "Q3" && !contract.quarterParticipation?.Q3) {
      const defaultValue = student.enrollmentStatus === "active";
      return [defaultValue, defaultValue, defaultValue];
    }
    return [false, false, false];
  };

  const toggleParticipation = async (
    contract: FeeContract,
    student: FeeStudent,
    monthIndex: number
  ) => {
    const checks = getChecks(contract, student, quarter);
    checks[monthIndex] = !checks[monthIndex];
    const quarterMap = {
      ...getQuarterMap(contract, quarter),
      [student.id]: checks,
    };
    const quarterParticipation = {
      ...(contract.quarterParticipation || {}),
      [quarter]: quarterMap,
    };
    await patchContract(contract.id, { quarterParticipation });
  };

  const setAllParticipation = async (
    contract: FeeContract,
    monthIndex: number,
    checked: boolean
  ) => {
    const quarterMap = { ...getQuarterMap(contract, quarter) };
    getBulkStudents(contract).forEach((student) => {
      const checks = getChecks(contract, student, quarter);
      checks[monthIndex] = checked;
      quarterMap[student.id] = checks;
    });
    const quarterParticipation = {
      ...(contract.quarterParticipation || {}),
      [quarter]: quarterMap,
    };
    await patchContract(contract.id, { quarterParticipation });
  };

  const isAllParticipationChecked = (
    contract: FeeContract,
    monthIndex: number
  ) => {
    const targets = getBulkStudents(contract);
    return (
      targets.length > 0 &&
      targets.every(
        (student) => getChecks(contract, student, quarter)[monthIndex]
      )
    );
  };

  const getMonthTotal = (
    contract: FeeContract,
    quarterKey: QuarterKey,
    monthIndex: number
  ) =>
    getMatchingStudents(contract).reduce((sum, student) => {
      if (!getChecks(contract, student, quarterKey)[monthIndex]) return sum;
      const rate =
        student.teachingClass === "A반"
          ? Number(contract.rateA || 0)
          : Number(contract.rateB || 0);
      return sum + rate;
    }, 0);

  const getQuarterTotal = (
    contract: FeeContract,
    quarterKey: QuarterKey
  ) =>
    [0, 1, 2].reduce(
      (sum, index) => sum + getMonthTotal(contract, quarterKey, index),
      0
    );

  const getContractMonthMap = (
    contract: FeeContract,
    monthKey: string
  ) => {
    const source = contract.workSessions?.[monthKey] || {};
    return Object.fromEntries(
      Object.entries(source).filter(([dateKey]) =>
        isDateWithinContract(contract, dateKey)
      )
    );
  };

  const getContractWorkedSessions = (contract: FeeContract) =>
    Object.entries(contract.workSessions || {}).reduce(
      (monthSum, [, monthMap]) =>
        monthSum +
        Object.entries(monthMap || {}).reduce(
          (sum, [dateKey, count]) =>
            isDateWithinContract(contract, dateKey)
              ? sum + Number(count || 0)
              : sum,
          0
        ),
      0
    );

  const getContractGross = (contract: FeeContract) => {
    const workedSessions = getContractWorkedSessions(contract);
    if (workedSessions > 0) {
      return workedSessions * Number(contract.ratePerSession || 0);
    }
    return (
      Number(contract.sessionCount || 0) *
      Number(contract.ratePerSession || 0)
    );
  };

  const getGross = (contract: FeeContract) =>
    contract.type === "afterschool"
      ? quarters.reduce(
          (sum, item) => sum + getQuarterTotal(contract, item.key),
          0
        )
      : getContractGross(contract);

  const afterschoolContracts = contracts.filter(
    (contract) => contract.type === "afterschool"
  );
  const contractLectures = contracts.filter(
    (contract) => contract.type === "contract"
  );
  const totalGross = contracts.reduce(
    (sum, contract) => sum + getGross(contract),
    0
  );
  const totalInsurance = contracts.reduce(
    (sum, contract) => sum + Number(contract.insuranceFee || 0),
    0
  );
  const totalTax = contracts.reduce(
    (sum, contract) => sum + Number(contract.taxAmount || 0),
    0
  );
  const totalAllowance = contracts.reduce(
    (sum, contract) => sum + Number(contract.allowanceAmount || 0),
    0
  );
  const receivedTotal = contracts
    .filter((contract) => Boolean(contract.receivedDate))
    .reduce(
      (sum, contract) => sum + Number(contract.allowanceAmount || 0),
      0
    );
  const unpaidTotal = contracts
    .filter((contract) => !contract.receivedDate)
    .reduce((sum, contract) => sum + getGross(contract), 0);

  const calendarWeeks = useMemo(
    () => getCalendarWeeks(contractMonth),
    [contractMonth]
  );

  const updateWorkSession = async (
    contract: FeeContract,
    dateKey: string,
    sessions: number
  ) => {
    if (!isDateWithinContract(contract, dateKey)) return;
    const monthMap = {
      ...(contract.workSessions?.[contractMonth] || {}),
    };
    if (sessions > 0) monthMap[dateKey] = Math.floor(sessions);
    else delete monthMap[dateKey];
    const workSessions = {
      ...(contract.workSessions || {}),
      [contractMonth]: monthMap,
    };
    await patchContract(contract.id, { workSessions });
  };

  const saveContractPeriod = async (
    contract: FeeContract,
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const start = String(formData.get("contractStartDate") || "");
    const end = String(formData.get("contractEndDate") || "");
    if (!start || !end) {
      setError("계약 시작일과 종료일을 모두 입력해 주세요.");
      return;
    }
    if (start > end) {
      setError("계약 시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }
    setError("");
    await patchContract(contract.id, {
      contractStartDate: start,
      contractEndDate: end,
    });
  };

  const resetForm = () => {
    setType("afterschool");
    setSchoolName("");
    setTitle("");
    setRateA("");
    setRateB("");
    setRatePerSession("");
    setSessionCount("");
    setContractStartDate("");
    setContractEndDate("");
  };

  const createContract = async () => {
    if (!schoolName.trim()) {
      setError("학교 이름을 입력해 주세요.");
      return;
    }
    if (
      type === "contract" &&
      (!contractStartDate ||
        !contractEndDate ||
        contractStartDate > contractEndDate)
    ) {
      setError("건별계약의 계약 시작일과 종료일을 확인해 주세요.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await requestJson("/api/teacher/fees", {
        method: "POST",
        body: JSON.stringify({
          type,
          schoolName,
          title,
          rateA: Number(rateA || 0),
          rateB: Number(rateB || 0),
          ratePerSession: Number(ratePerSession || 0),
          sessionCount: Number(sessionCount || 0),
          contractStartDate,
          contractEndDate,
          monthLabels: defaultMonths,
        }),
      });
      resetForm();
      setIsRegisterOpen(false);
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "수강료 항목을 저장하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteContract = async (contract: FeeContract) => {
    if (!confirm(`${contract.schoolName} 수강료 항목을 삭제할까요?`)) return;
    try {
      await requestJson(
        `/api/teacher/fees?id=${encodeURIComponent(contract.id)}`,
        { method: "DELETE" }
      );
      setContracts((current) =>
        current.filter((item) => item.id !== contract.id)
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "삭제하지 못했습니다."
      );
    }
  };

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
          <div className="font-black text-slate-800">
            교사 로그인이 필요합니다.
          </div>
          <Link
            href="/teacher"
            className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
          >
            교사홈으로
          </Link>
        </div>
      </div>
    );
  }

  const renderSummary = () => (
    <>
      <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black text-slate-500">총 발생 수강료</div>
          <div className="mt-1 text-xl font-black text-slate-900">
            {formatWon(totalGross)}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black text-slate-500">보험료 누적</div>
          <div className="mt-1 text-xl font-black text-slate-900">
            {formatWon(totalInsurance)}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black text-slate-500">세금 누적</div>
          <div className="mt-1 text-xl font-black text-slate-900">
            {formatWon(totalTax)}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black text-slate-500">수령완료 수당</div>
          <div className="mt-1 text-xl font-black text-emerald-700">
            {formatWon(receivedTotal)}
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-[28px] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-black text-slate-500">
          <span>수당금액 합계 {formatWon(totalAllowance)}</span>
          <span>미수령 발생액 {formatWon(unpaidTotal)}</span>
        </div>
      </section>

      <section className="mt-3 space-y-3">
        {contracts.map((contract) => {
          const gross = getGross(contract);
          return (
            <div
              key={contract.id}
              className="rounded-[28px] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className={`text-xs font-black ${
                      contract.type === "afterschool"
                        ? "text-emerald-600"
                        : "text-blue-600"
                    }`}
                  >
                    {contract.type === "afterschool" ? "방과후" : "건별계약"}
                  </div>
                  <div className="mt-1 text-lg font-black text-slate-900">
                    {contract.schoolName}
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    {contract.title || "-"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400">발생액</div>
                  <div className="text-lg font-black text-slate-900">
                    {formatWon(gross)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-[11px] font-black text-slate-500">
                  보험료
                  <input
                    inputMode="numeric"
                    defaultValue={Number(contract.insuranceFee || 0) || ""}
                    onBlur={(event) =>
                      void patchContract(contract.id, {
                        insuranceFee: Number(event.target.value || 0),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                  />
                </label>
                <label className="text-[11px] font-black text-slate-500">
                  세금
                  <input
                    inputMode="numeric"
                    defaultValue={Number(contract.taxAmount || 0) || ""}
                    onBlur={(event) =>
                      void patchContract(contract.id, {
                        taxAmount: Number(event.target.value || 0),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                  />
                </label>
                <label className="text-[11px] font-black text-slate-500">
                  수당금액
                  <input
                    inputMode="numeric"
                    defaultValue={Number(contract.allowanceAmount || 0) || ""}
                    onBlur={(event) =>
                      void patchContract(contract.id, {
                        allowanceAmount: Number(event.target.value || 0),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                  />
                </label>
                <label className="text-[11px] font-black text-slate-500">
                  수령일
                  <input
                    type="date"
                    defaultValue={contract.receivedDate || ""}
                    onChange={(event) =>
                      void patchContract(contract.id, {
                        receivedDate: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                  />
                </label>
              </div>

              <div
                className={`mt-3 rounded-xl px-3 py-2 text-xs font-black ${
                  contract.receivedDate
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {contract.receivedDate
                  ? `수령완료 · ${contract.receivedDate}`
                  : "미수령"}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );

  const renderAfterschool = () => (
    <>
      <section className="mt-3 rounded-[28px] bg-white p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {quarters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setQuarter(item.key)}
              className={`rounded-2xl px-2 py-3 text-sm font-black ${
                quarter === item.key
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3 space-y-3">
        {afterschoolContracts.map((contract) => {
          const matchingStudents = getMatchingStudents(contract);
          const currentStudents = getBulkStudents(contract);
          const pausedCount = currentStudents.filter(
            (student) => student.enrollmentStatus === "paused"
          ).length;
          const monthTotals = [0, 1, 2].map((index) =>
            getMonthTotal(contract, quarter, index)
          );
          const quarterTotal = monthTotals.reduce(
            (sum, value) => sum + value,
            0
          );
          const isExpanded = expandedContractId === contract.id;

          return (
            <div
              key={contract.id}
              className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-emerald-600">
                    방과후 · {quarters.find((item) => item.key === quarter)?.label}
                  </div>
                  <div className="mt-1 text-xl font-black text-slate-900">
                    {contract.schoolName}
                  </div>
                  <div className="text-sm font-bold text-slate-500">
                    {contract.title || ""}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-400">
                    수강중+쉬는중 {currentStudents.length}명
                    {pausedCount > 0 ? ` · 쉬는중 ${pausedCount}명 포함` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteContract(contract)}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500"
                >
                  삭제
                </button>
              </div>

              <div className="mt-4 rounded-3xl bg-emerald-50 p-4">
                <div className="text-xs font-black text-emerald-700">
                  분기 수강료
                </div>
                <div className="mt-1 text-3xl font-black text-emerald-900">
                  {formatWon(quarterTotal)}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {defaultMonths.map((label, index) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-white px-2 py-3 text-center"
                    >
                      <div className="text-[11px] font-black text-slate-500">
                        {label}
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-900">
                        {formatWon(monthTotals[index])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-black text-slate-500">
                {quarters.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl bg-slate-50 px-1 py-2"
                  >
                    <div>{item.label}</div>
                    <div className="mt-1 text-slate-800">
                      {formatWon(getQuarterTotal(contract, item.key))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setExpandedContractId(isExpanded ? "" : contract.id)
                }
                className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700"
              >
                학생목록 {matchingStudents.length}명 {isExpanded ? "접기 ↑" : "보기 ↓"}
              </button>

              {isExpanded && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-[1fr_56px_56px_56px] bg-slate-50 px-3 py-2 text-center text-[11px] font-black text-slate-500">
                    <div className="text-left">학생</div>
                    {[0, 1, 2].map((monthIndex) => {
                      const allChecked = isAllParticipationChecked(
                        contract,
                        monthIndex
                      );
                      return (
                        <label
                          key={monthIndex}
                          className="flex cursor-pointer flex-col items-center gap-1"
                          title={`${monthIndex + 1}차월 전체 체크/해제`}
                        >
                          <span>{monthIndex + 1}</span>
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={(event) =>
                              void setAllParticipation(
                                contract,
                                monthIndex,
                                event.target.checked
                              )
                            }
                            className="h-4 w-4 accent-emerald-600"
                          />
                          <span className="text-[9px]">전체</span>
                        </label>
                      );
                    })}
                  </div>

                  {matchingStudents.map((student) => {
                    const checks = getChecks(contract, student, quarter);
                    return (
                      <div
                        key={student.id}
                        className="grid grid-cols-[1fr_56px_56px_56px] items-center border-t border-slate-100 px-3 py-3 text-center"
                      >
                        <div className="text-left">
                          <div className="text-sm font-black text-slate-800">
                            {student.name}
                          </div>
                          <div className="text-[11px] font-bold text-slate-400">
                            {student.teachingClass}
                            {student.enrollmentStatus !== "active"
                              ? ` · ${
                                  student.enrollmentStatus === "paused"
                                    ? "쉬는중"
                                    : "종료"
                                }`
                              : ""}
                          </div>
                        </div>
                        {[0, 1, 2].map((monthIndex) => (
                          <label
                            key={monthIndex}
                            className="flex justify-center"
                          >
                            <input
                              type="checkbox"
                              checked={checks[monthIndex]}
                              onChange={() =>
                                void toggleParticipation(
                                  contract,
                                  student,
                                  monthIndex
                                )
                              }
                              className="h-5 w-5 accent-emerald-600"
                            />
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </>
  );

  const renderContracts = () => (
    <>
      <section className="mt-3 rounded-[28px] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setContractMonth((value) => shiftMonth(value, -1))
            }
            className="rounded-xl bg-slate-100 px-3 py-2 font-black"
          >
            ‹
          </button>
          <div className="text-lg font-black text-slate-900">
            {contractMonth.replace("-", "년 ")}월
          </div>
          <button
            type="button"
            onClick={() =>
              setContractMonth((value) => shiftMonth(value, 1))
            }
            className="rounded-xl bg-slate-100 px-3 py-2 font-black"
          >
            ›
          </button>
        </div>
      </section>

      <section className="mt-3 space-y-3">
        {contractLectures.map((contract) => {
          const monthMap = getContractMonthMap(contract, contractMonth);
          const monthDays = Object.keys(monthMap).length;
          const monthSessions = Object.values(monthMap).reduce(
            (sum, count) => sum + Number(count || 0),
            0
          );
          const monthAmount =
            monthSessions * Number(contract.ratePerSession || 0);
          const contractWeeks = calendarWeeks.filter((week) =>
            week.some((day) => isDateWithinContract(contract, day.dateKey))
          );
          const hasPeriod = Boolean(
            contract.contractStartDate && contract.contractEndDate
          );

          return (
            <div
              key={contract.id}
              className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-blue-600">건별계약</div>
                  <div className="mt-1 text-xl font-black text-slate-900">
                    {contract.schoolName}
                  </div>
                  <div className="text-sm font-bold text-slate-500">
                    {contract.title || ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteContract(contract)}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500"
                >
                  삭제
                </button>
              </div>

              <form
                onSubmit={(event) => void saveContractPeriod(contract, event)}
                className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-3"
              >
                <div className="mb-2 text-xs font-black text-blue-700">
                  계약기간
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input
                    key={`${contract.id}-start-${contract.contractStartDate || "empty"}`}
                    name="contractStartDate"
                    type="date"
                    defaultValue={contract.contractStartDate || ""}
                    className="min-w-0 rounded-xl border border-blue-100 bg-white px-2 py-2 text-xs font-bold"
                  />
                  <span className="text-xs font-black text-slate-400">~</span>
                  <input
                    key={`${contract.id}-end-${contract.contractEndDate || "empty"}`}
                    name="contractEndDate"
                    type="date"
                    defaultValue={contract.contractEndDate || ""}
                    className="min-w-0 rounded-xl border border-blue-100 bg-white px-2 py-2 text-xs font-bold"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                >
                  계약기간 저장
                </button>
                <div className="mt-2 text-[10px] font-bold text-slate-500">
                  {hasPeriod
                    ? `${contract.contractStartDate} ~ ${contract.contractEndDate} 범위의 날짜만 입력됩니다.`
                    : "기존 계약입니다. 계약기간을 저장하면 기간 밖 날짜는 숨겨집니다."}
                </div>
              </form>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-blue-50 p-3 text-center">
                  <div className="text-[11px] font-black text-blue-600">근무일</div>
                  <div className="mt-1 text-lg font-black text-blue-900">
                    {monthDays}일
                  </div>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-center">
                  <div className="text-[11px] font-black text-blue-600">총 차시</div>
                  <div className="mt-1 text-lg font-black text-blue-900">
                    {monthSessions}차시
                  </div>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-center">
                  <div className="text-[11px] font-black text-blue-600">이번 달</div>
                  <div className="mt-1 text-sm font-black text-blue-900">
                    {formatWon(monthAmount)}
                  </div>
                </div>
              </div>

              {contractWeeks.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-black text-slate-400">
                  이 달은 계약기간 밖입니다.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {contractWeeks.map((week, weekIndex) => (
                    <div
                      key={weekIndex}
                      className="rounded-2xl border border-slate-200 p-3"
                    >
                      <div className="mb-2 text-xs font-black text-slate-500">
                        {weekIndex + 1}주
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((weekday) => {
                          const day = week.find(
                            (item) => item.weekday === weekday
                          );
                          if (
                            !day ||
                            !isDateWithinContract(contract, day.dateKey)
                          ) {
                            return (
                              <div
                                key={weekday}
                                className="min-h-[74px] rounded-xl bg-slate-50/60"
                              />
                            );
                          }

                          const sessions = Number(monthMap[day.dateKey] || 0);
                          return (
                            <div
                              key={day.dateKey}
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                void updateWorkSession(
                                  contract,
                                  day.dateKey,
                                  sessions > 0 ? 0 : 1
                                )
                              }
                              className={`min-h-[74px] rounded-xl border p-2 text-center ${
                                sessions > 0
                                  ? "border-blue-400 bg-blue-50"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="text-[11px] font-black text-slate-500">
                                {weekdayLabels[weekday]} {day.day}
                              </div>
                              {sessions > 0 ? (
                                <div
                                  onClick={(event) => event.stopPropagation()}
                                  className="mt-2"
                                >
                                  <input
                                    inputMode="numeric"
                                    value={sessions}
                                    onChange={(event) =>
                                      void updateWorkSession(
                                        contract,
                                        day.dateKey,
                                        Math.max(
                                          0,
                                          Number(event.target.value || 0)
                                        )
                                      )
                                    }
                                    className="w-full rounded-lg border border-blue-200 bg-white px-1 py-1 text-center text-sm font-black"
                                  />
                                  <div className="mt-1 text-[10px] font-bold text-blue-600">
                                    차시
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 text-xs font-bold text-slate-300">
                                  선택
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
                차시당 {formatWon(Number(contract.ratePerSession || 0))} · 전체
                입력 누적 {getContractWorkedSessions(contract)}차시 · 누적 발생{" "}
                {formatWon(getContractGross(contract))}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black text-slate-900">💰 수강료</div>
              <div className="mt-1 text-sm font-bold text-slate-500">
                방과후 · 건별계약 · 수금/세금 자료를 한곳에서 관리합니다.
              </div>
            </div>
            <Link
              href="/teacher"
              className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"
            >
              ← 교사홈
            </Link>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-[28px] bg-white p-2 shadow-sm">
          {(
            [
              { key: "summary", label: "누적" },
              { key: "afterschool", label: "방과후" },
              { key: "contract", label: "건별계약" },
            ] as { key: FeeTab; label: string }[]
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-2xl px-3 py-3 text-sm font-black ${
                tab === item.key ? "bg-slate-900 text-white" : "text-slate-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="mt-3 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-emerald-700">
                전체 누적 발생액
              </div>
              <div className="mt-1 text-3xl font-black text-slate-900">
                {formatWon(totalGross)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setIsRegisterOpen(true);
              }}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
            >
              + 수강료 등록
            </button>
          </div>
          {error && !isRegisterOpen && (
            <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
        </section>

        {loading && contracts.length === 0 ? (
          <div className="mt-3 rounded-[28px] bg-white p-6 text-center text-sm font-bold text-slate-500">
            수강료 정보를 불러오는 중...
          </div>
        ) : tab === "summary" ? (
          renderSummary()
        ) : tab === "afterschool" ? (
          renderAfterschool()
        ) : (
          renderContracts()
        )}
      </div>

      {isRegisterOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/45 p-3 sm:items-center">
          <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-xl font-black text-slate-900">
                새 수강료 등록
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterOpen(false);
                  setError("");
                  resetForm();
                }}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("afterschool")}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${
                  type === "afterschool"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                방과후
              </button>
              <button
                type="button"
                onClick={() => setType("contract")}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${
                  type === "contract"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                건별계약
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600">
                학교 이름
                <input
                  list="teacher-fee-schools"
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold"
                />
                <datalist id="teacher-fee-schools">
                  {schoolOptions.map((school) => (
                    <option key={school} value={school} />
                  ))}
                </datalist>
              </label>
              <label className="text-xs font-black text-slate-600">
                메모/강의명
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold"
                />
              </label>
            </div>

            {type === "afterschool" ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-xs font-black text-slate-600">
                  A반 1인 단가
                  <input
                    inputMode="numeric"
                    value={rateA}
                    onChange={(event) =>
                      setRateA(event.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold"
                  />
                </label>
                <label className="text-xs font-black text-slate-600">
                  B반 1인 단가
                  <input
                    inputMode="numeric"
                    value={rateB}
                    onChange={(event) =>
                      setRateB(event.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold"
                  />
                </label>
              </div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs font-black text-slate-600">
                    계약 시작일
                    <input
                      type="date"
                      value={contractStartDate}
                      onChange={(event) =>
                        setContractStartDate(event.target.value)
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold"
                    />
                  </label>
                  <label className="text-xs font-black text-slate-600">
                    계약 종료일
                    <input
                      type="date"
                      value={contractEndDate}
                      min={contractStartDate || undefined}
                      onChange={(event) =>
                        setContractEndDate(event.target.value)
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold"
                    />
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs font-black text-slate-600">
                    차시당 단가
                    <input
                      inputMode="numeric"
                      value={ratePerSession}
                      onChange={(event) =>
                        setRatePerSession(
                          event.target.value.replace(/[^0-9]/g, "")
                        )
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold"
                    />
                  </label>
                  <label className="text-xs font-black text-slate-600">
                    계약 총 차시(참고)
                    <input
                      inputMode="numeric"
                      value={sessionCount}
                      onChange={(event) =>
                        setSessionCount(
                          event.target.value.replace(/[^0-9]/g, "")
                        )
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold"
                    />
                  </label>
                </div>
              </>
            )}

            {error && (
              <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void createContract()}
              disabled={saving}
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? "저장 중..." : "+ 수강료 등록"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

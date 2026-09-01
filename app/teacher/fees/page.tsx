"use client";

import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type FeeType = "afterschool" | "contract";
type FeeTab = "summary" | "afterschool" | "contract";
type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4";

type FeeSettlement = {
  receivedAmount?: number;
  grossAmount?: number;
  insuranceFee?: number;
  taxAmount?: number;
  receivedDate?: string;
};

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
  settlements?: Record<string, FeeSettlement>;
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

type SettlementUnit = {
  key: string;
  label: string;
  expectedAmount: number;
};

const formatWon = (value: number) =>
  `${Math.round(value).toLocaleString("ko-KR")}원`;
const defaultTerms = ["1텀", "2텀", "3텀"];
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

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  return `${year}년 ${Number(month)}월`;
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

    const mondayOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
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
  if (contract.contractStartDate && dateKey < contract.contractStartDate) return false;
  if (contract.contractEndDate && dateKey > contract.contractEndDate) return false;
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
      if (!response.ok) throw new Error(data?.error || "요청 처리에 실패했습니다.");
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
      Array.from(new Set(students.map((student) => student.school).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "ko-KR")
      ),
    [students]
  );

  const patchContract = async (id: string, updates: Partial<FeeContract>) => {
    setContracts((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    try {
      await requestJson("/api/teacher/fees", {
        method: "PATCH",
        body: JSON.stringify({ id, ...updates }),
      });
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "저장하지 못했습니다.");
      await loadData();
    }
  };

  const hasHistoricalParticipation = (contract: FeeContract, studentId: string) => {
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
        (student.enrollmentStatus !== "ended" || hasHistoricalParticipation(contract, student.id))
    );

  const getBulkStudents = (contract: FeeContract) =>
    getMatchingStudents(contract).filter((student) => student.enrollmentStatus !== "ended");

  const getQuarterMap = (contract: FeeContract, quarterKey: QuarterKey) => {
    const stored = contract.quarterParticipation?.[quarterKey];
    if (stored) return stored;
    if (quarterKey === "Q3" && contract.participation) return contract.participation;
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
    termIndex: number
  ) => {
    const checks = getChecks(contract, student, quarter);
    checks[termIndex] = !checks[termIndex];
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
    termIndex: number,
    checked: boolean
  ) => {
    const quarterMap = { ...getQuarterMap(contract, quarter) };
    getBulkStudents(contract).forEach((student) => {
      const checks = getChecks(contract, student, quarter);
      checks[termIndex] = checked;
      quarterMap[student.id] = checks;
    });
    const quarterParticipation = {
      ...(contract.quarterParticipation || {}),
      [quarter]: quarterMap,
    };
    await patchContract(contract.id, { quarterParticipation });
  };

  const isAllParticipationChecked = (contract: FeeContract, termIndex: number) => {
    const targets = getBulkStudents(contract);
    return (
      targets.length > 0 &&
      targets.every((student) => getChecks(contract, student, quarter)[termIndex])
    );
  };

  const getTermTotal = (
    contract: FeeContract,
    quarterKey: QuarterKey,
    termIndex: number
  ) =>
    getMatchingStudents(contract).reduce((sum, student) => {
      if (!getChecks(contract, student, quarterKey)[termIndex]) return sum;
      const rate =
        student.teachingClass === "A반"
          ? Number(contract.rateA || 0)
          : Number(contract.rateB || 0);
      return sum + rate;
    }, 0);

  const getQuarterTotal = (contract: FeeContract, quarterKey: QuarterKey) =>
    [0, 1, 2].reduce(
      (sum, termIndex) => sum + getTermTotal(contract, quarterKey, termIndex),
      0
    );

  const getContractMonthMap = (contract: FeeContract, monthKey: string) => {
    const source = contract.workSessions?.[monthKey] || {};
    return Object.fromEntries(
      Object.entries(source).filter(([dateKey]) => isDateWithinContract(contract, dateKey))
    );
  };

  const getContractMonthSessions = (contract: FeeContract, monthKey: string) =>
    Object.values(getContractMonthMap(contract, monthKey)).reduce(
      (sum, count) => sum + Number(count || 0),
      0
    );

  const getContractMonthGross = (contract: FeeContract, monthKey: string) =>
    getContractMonthSessions(contract, monthKey) * Number(contract.ratePerSession || 0);

  const getContractWorkedSessions = (contract: FeeContract) =>
    Object.entries(contract.workSessions || {}).reduce(
      (monthSum, [, monthMap]) =>
        monthSum +
        Object.entries(monthMap || {}).reduce(
          (sum, [dateKey, count]) =>
            isDateWithinContract(contract, dateKey) ? sum + Number(count || 0) : sum,
          0
        ),
      0
    );

  const getContractGross = (contract: FeeContract) => {
    const workedSessions = getContractWorkedSessions(contract);
    if (workedSessions > 0) return workedSessions * Number(contract.ratePerSession || 0);
    return Number(contract.sessionCount || 0) * Number(contract.ratePerSession || 0);
  };

  const getGross = (contract: FeeContract) =>
    contract.type === "afterschool"
      ? quarters.reduce((sum, item) => sum + getQuarterTotal(contract, item.key), 0)
      : getContractGross(contract);

  const getContractMonthKeys = (contract: FeeContract) => {
    const keys = new Set<string>();
    if (contract.contractStartDate && contract.contractEndDate) {
      let cursor = contract.contractStartDate.slice(0, 7);
      const end = contract.contractEndDate.slice(0, 7);
      for (let index = 0; index < 60 && cursor <= end; index += 1) {
        keys.add(cursor);
        cursor = shiftMonth(cursor, 1);
      }
    }
    Object.keys(contract.workSessions || {}).forEach((monthKey) => {
      if (/^\d{4}-\d{2}$/.test(monthKey)) keys.add(monthKey);
    });
    Object.keys(contract.settlements || {}).forEach((key) => {
      if (/^\d{4}-\d{2}$/.test(key)) keys.add(key);
    });
    return Array.from(keys).sort();
  };

  const getSettlementUnits = (contract: FeeContract): SettlementUnit[] => {
    if (contract.type === "afterschool") {
      return quarters.flatMap((quarterItem) =>
        [0, 1, 2]
          .map((termIndex) => {
            const key = `${quarterItem.key}-T${termIndex + 1}`;
            return {
              key,
              label: `${quarterItem.label} ${defaultTerms[termIndex]}`,
              expectedAmount: getTermTotal(contract, quarterItem.key, termIndex),
            };
          })
          .filter(
            (unit) => unit.expectedAmount > 0 || Boolean(contract.settlements?.[unit.key])
          )
      );
    }

    return getContractMonthKeys(contract).map((monthKey) => ({
      key: monthKey,
      label: formatMonthLabel(monthKey),
      expectedAmount: getContractMonthGross(contract, monthKey),
    }));
  };

  const updateSettlement = async (
    contract: FeeContract,
    unitKey: string,
    field: keyof FeeSettlement,
    value: number | string
  ) => {
    const latest = contracts.find((item) => item.id === contract.id) || contract;
    const settlements = { ...(latest.settlements || {}) };
    const entry: FeeSettlement = { ...(settlements[unitKey] || {}) };
    if (field === "receivedDate") entry.receivedDate = String(value || "");
    else entry[field] = Math.max(0, Number(value || 0));

    const empty =
      !entry.receivedDate &&
      !Number(entry.receivedAmount || 0) &&
      !Number(entry.grossAmount || 0) &&
      !Number(entry.insuranceFee || 0) &&
      !Number(entry.taxAmount || 0);

    if (empty) delete settlements[unitKey];
    else settlements[unitKey] = entry;
    await patchContract(contract.id, { settlements });
  };

  const getSettlementState = (entry: FeeSettlement, expectedAmount: number) => {
    const received = Number(entry.receivedAmount || 0);
    const statementGross = Number(entry.grossAmount || 0);
    const insurance = Number(entry.insuranceFee || 0);
    const tax = Number(entry.taxAmount || 0);
    const hasReceived = received > 0 || Boolean(entry.receivedDate);
    const hasStatement = statementGross > 0 || insurance > 0 || tax > 0;
    const basis = statementGross > 0 ? statementGross : expectedAmount;
    const difference = basis - received - insurance - tax;

    if (!hasReceived && !hasStatement) {
      return { label: "미수령", difference: expectedAmount, tone: "amber" as const };
    }
    if (hasReceived && !hasStatement) {
      return { label: "명세서 대기", difference, tone: "blue" as const };
    }
    if (Math.abs(difference) < 1) {
      return { label: "명세확정", difference: 0, tone: "emerald" as const };
    }
    return { label: "명세확인 필요", difference, tone: "rose" as const };
  };

  const afterschoolContracts = contracts.filter((contract) => contract.type === "afterschool");
  const contractLectures = contracts.filter((contract) => contract.type === "contract");
  const totalGross = contracts.reduce((sum, contract) => sum + getGross(contract), 0);

  const getContractSettlementTotals = (contract: FeeContract) => {
    const units = getSettlementUnits(contract);
    const entries = Object.values(contract.settlements || {});
    const hasNewSettlements = entries.length > 0;

    const received = hasNewSettlements
      ? entries.reduce((sum, entry) => sum + Number(entry.receivedAmount || 0), 0)
      : contract.receivedDate
        ? Number(contract.allowanceAmount || 0)
        : 0;
    const insurance = hasNewSettlements
      ? entries.reduce((sum, entry) => sum + Number(entry.insuranceFee || 0), 0)
      : Number(contract.insuranceFee || 0);
    const tax = hasNewSettlements
      ? entries.reduce((sum, entry) => sum + Number(entry.taxAmount || 0), 0)
      : Number(contract.taxAmount || 0);
    const statementGross = hasNewSettlements
      ? entries.reduce((sum, entry) => sum + Number(entry.grossAmount || 0), 0)
      : Number(contract.allowanceAmount || 0);
    const unpaid = units.reduce((sum, unit) => {
      const entry = contract.settlements?.[unit.key] || {};
      const hasReceived = Number(entry.receivedAmount || 0) > 0 || Boolean(entry.receivedDate);
      return hasReceived ? sum : sum + unit.expectedAmount;
    }, 0);

    return { received, insurance, tax, statementGross, unpaid };
  };

  const settlementTotals = contracts.reduce(
    (totals, contract) => {
      const current = getContractSettlementTotals(contract);
      totals.received += current.received;
      totals.insurance += current.insurance;
      totals.tax += current.tax;
      totals.statementGross += current.statementGross;
      totals.unpaid += current.unpaid;
      return totals;
    },
    { received: 0, insurance: 0, tax: 0, statementGross: 0, unpaid: 0 }
  );

  const calendarWeeks = useMemo(() => getCalendarWeeks(contractMonth), [contractMonth]);

  const updateWorkSession = async (
    contract: FeeContract,
    dateKey: string,
    sessions: number
  ) => {
    if (!isDateWithinContract(contract, dateKey)) return;
    const monthMap = { ...(contract.workSessions?.[contractMonth] || {}) };
    if (sessions > 0) monthMap[dateKey] = Math.floor(sessions);
    else delete monthMap[dateKey];
    const workSessions = { ...(contract.workSessions || {}), [contractMonth]: monthMap };
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
    await patchContract(contract.id, { contractStartDate: start, contractEndDate: end });
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
      (!contractStartDate || !contractEndDate || contractStartDate > contractEndDate)
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
          monthLabels: defaultTerms,
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
      await requestJson(`/api/teacher/fees?id=${encodeURIComponent(contract.id)}`, {
        method: "DELETE",
      });
      setContracts((current) => current.filter((item) => item.id !== contract.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "삭제하지 못했습니다.");
    }
  };

  const renderSettlementRows = (contract: FeeContract) => {
    const units = getSettlementUnits(contract);
    if (units.length === 0) {
      return (
        <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-center text-xs font-bold text-slate-400">
          아직 수금 단위별 발생액이 없습니다.
        </div>
      );
    }

    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
        <div className="hidden grid-cols-[120px_110px_1fr_142px_1fr_1fr_1fr] gap-2 bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-500 lg:grid">
          <div>구분</div>
          <div>예상 발생액</div>
          <div>받은 금액</div>
          <div>수령일</div>
          <div>수당금액</div>
          <div>보험료</div>
          <div>세금</div>
        </div>

        {units.map((unit) => {
          const entry = contract.settlements?.[unit.key] || {};
          const state = getSettlementState(entry, unit.expectedAmount);
          const toneClass =
            state.tone === "emerald"
              ? "bg-emerald-50 text-emerald-700"
              : state.tone === "blue"
                ? "bg-blue-50 text-blue-700"
                : state.tone === "rose"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-700";

          return (
            <div key={unit.key} className="border-t border-slate-100 first:border-t-0">
              <div className="grid gap-2 px-3 py-3 lg:grid-cols-[120px_110px_1fr_142px_1fr_1fr_1fr] lg:items-end">
                <div>
                  <div className="text-xs font-black text-slate-800">{unit.label}</div>
                  <div className="mt-1 text-[10px] font-bold text-slate-400 lg:hidden">
                    예상 {formatWon(unit.expectedAmount)}
                  </div>
                </div>
                <div className="hidden text-xs font-black text-slate-700 lg:block">
                  {formatWon(unit.expectedAmount)}
                </div>
                <label className="text-[10px] font-black text-slate-500">
                  <span className="lg:hidden">받은 금액</span>
                  <input
                    inputMode="numeric"
                    defaultValue={Number(entry.receivedAmount || 0) || ""}
                    onBlur={(event) =>
                      void updateSettlement(
                        contract,
                        unit.key,
                        "receivedAmount",
                        event.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    placeholder="입금액"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm font-bold outline-none"
                  />
                </label>
                <label className="text-[10px] font-black text-slate-500">
                  <span className="lg:hidden">수령일</span>
                  <input
                    type="date"
                    defaultValue={entry.receivedDate || ""}
                    onChange={(event) =>
                      void updateSettlement(contract, unit.key, "receivedDate", event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-xs font-bold outline-none"
                  />
                </label>
                <label className="text-[10px] font-black text-slate-500">
                  <span className="lg:hidden">수당금액</span>
                  <input
                    inputMode="numeric"
                    defaultValue={Number(entry.grossAmount || 0) || ""}
                    onBlur={(event) =>
                      void updateSettlement(
                        contract,
                        unit.key,
                        "grossAmount",
                        event.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    placeholder="명세서 금액"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm font-bold outline-none"
                  />
                </label>
                <label className="text-[10px] font-black text-slate-500">
                  <span className="lg:hidden">보험료</span>
                  <input
                    inputMode="numeric"
                    defaultValue={Number(entry.insuranceFee || 0) || ""}
                    onBlur={(event) =>
                      void updateSettlement(
                        contract,
                        unit.key,
                        "insuranceFee",
                        event.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm font-bold outline-none"
                  />
                </label>
                <label className="text-[10px] font-black text-slate-500">
                  <span className="lg:hidden">세금</span>
                  <input
                    inputMode="numeric"
                    defaultValue={Number(entry.taxAmount || 0) || ""}
                    onBlur={(event) =>
                      void updateSettlement(
                        contract,
                        unit.key,
                        "taxAmount",
                        event.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm font-bold outline-none"
                  />
                </label>
              </div>
              <div className={`mx-3 mb-3 rounded-lg px-3 py-1.5 text-[11px] font-black ${toneClass}`}>
                {state.label}
                {state.label === "명세서 대기" && (
                  <span> · 임시 차액 {formatWon(state.difference)}</span>
                )}
                {state.label === "명세확인 필요" && (
                  <span> · 확인 차액 {formatWon(state.difference)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
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
          <div className="font-black text-slate-800">교사 로그인이 필요합니다.</div>
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
          <div className="mt-1 text-xl font-black text-slate-900">{formatWon(totalGross)}</div>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black text-slate-500">실제 수령 누적</div>
          <div className="mt-1 text-xl font-black text-emerald-700">
            {formatWon(settlementTotals.received)}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black text-slate-500">보험료 누적</div>
          <div className="mt-1 text-xl font-black text-slate-900">
            {formatWon(settlementTotals.insurance)}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black text-slate-500">세금 누적</div>
          <div className="mt-1 text-xl font-black text-slate-900">
            {formatWon(settlementTotals.tax)}
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-[28px] bg-white px-5 py-3 shadow-sm">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-black text-slate-500">
          <span>명세 수당 합계 {formatWon(settlementTotals.statementGross)}</span>
          <span>미수령 예상액 {formatWon(settlementTotals.unpaid)}</span>
        </div>
      </section>

      <section className="mt-3 space-y-3">
        {contracts.map((contract) => (
          <div key={contract.id} className="rounded-[28px] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`text-xs font-black ${
                    contract.type === "afterschool" ? "text-emerald-600" : "text-blue-600"
                  }`}
                >
                  {contract.type === "afterschool" ? "방과후" : "건별계약"}
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {contract.schoolName}
                </div>
                <div className="text-xs font-bold text-slate-500">{contract.title || "-"}</div>
                {contract.type === "contract" && contract.contractStartDate && contract.contractEndDate && (
                  <div className="mt-1 text-[10px] font-bold text-slate-400">
                    {contract.contractStartDate} ~ {contract.contractEndDate}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400">합계 발생액</div>
                <div className="text-xl font-black text-slate-900">
                  {formatWon(getGross(contract))}
                </div>
              </div>
            </div>
            {renderSettlementRows(contract)}
          </div>
        ))}
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
          const termTotals = [0, 1, 2].map((index) =>
            getTermTotal(contract, quarter, index)
          );
          const quarterTotal = termTotals.reduce((sum, value) => sum + value, 0);
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
                  <div className="text-sm font-bold text-slate-500">{contract.title || ""}</div>
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
                <div className="text-xs font-black text-emerald-700">분기 수강료</div>
                <div className="mt-1 text-3xl font-black text-emerald-900">
                  {formatWon(quarterTotal)}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {defaultTerms.map((label, index) => (
                    <div key={label} className="rounded-2xl bg-white px-2 py-3 text-center">
                      <div className="text-[11px] font-black text-slate-500">{label}</div>
                      <div className="mt-1 text-sm font-black text-slate-900">
                        {formatWon(termTotals[index])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-black text-slate-500">
                {quarters.map((item) => (
                  <div key={item.key} className="rounded-xl bg-slate-50 px-1 py-2">
                    <div>{item.label}</div>
                    <div className="mt-1 text-slate-800">
                      {formatWon(getQuarterTotal(contract, item.key))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
                수금 입력은 누적 탭에서 분기별 1텀·2텀·3텀 단위로 관리합니다.
              </div>

              <button
                type="button"
                onClick={() => setExpandedContractId(isExpanded ? "" : contract.id)}
                className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700"
              >
                학생목록 {matchingStudents.length}명 {isExpanded ? "접기 ↑" : "보기 ↓"}
              </button>

              {isExpanded && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-[1fr_62px_62px_62px] bg-slate-50 px-3 py-2 text-center text-[11px] font-black text-slate-500">
                    <div className="text-left">학생</div>
                    {[0, 1, 2].map((termIndex) => {
                      const allChecked = isAllParticipationChecked(contract, termIndex);
                      return (
                        <label
                          key={termIndex}
                          className="flex cursor-pointer flex-col items-center gap-1"
                          title={`${termIndex + 1}텀 전체 체크/해제`}
                        >
                          <span>{termIndex + 1}텀</span>
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={(event) =>
                              void setAllParticipation(
                                contract,
                                termIndex,
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
                        className="grid grid-cols-[1fr_62px_62px_62px] items-center border-t border-slate-100 px-3 py-3 text-center"
                      >
                        <div className="text-left">
                          <div className="text-sm font-black text-slate-800">{student.name}</div>
                          <div className="text-[11px] font-bold text-slate-400">
                            {student.teachingClass}
                            {student.enrollmentStatus !== "active"
                              ? ` · ${
                                  student.enrollmentStatus === "paused" ? "쉬는중" : "종료"
                                }`
                              : ""}
                          </div>
                        </div>
                        {[0, 1, 2].map((termIndex) => (
                          <label key={termIndex} className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={checks[termIndex]}
                              onChange={() =>
                                void toggleParticipation(contract, student, termIndex)
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
            onClick={() => setContractMonth((value) => shiftMonth(value, -1))}
            className="rounded-xl bg-slate-100 px-3 py-2 font-black"
          >
            ‹
          </button>
          <div className="text-lg font-black text-slate-900">
            {formatMonthLabel(contractMonth)}
          </div>
          <button
            type="button"
            onClick={() => setContractMonth((value) => shiftMonth(value, 1))}
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
          const monthSessions = getContractMonthSessions(contract, contractMonth);
          const monthAmount = getContractMonthGross(contract, contractMonth);
          const contractWeeks = calendarWeeks.filter((week) =>
            week.some((day) => isDateWithinContract(contract, day.dateKey))
          );
          const hasPeriod = Boolean(contract.contractStartDate && contract.contractEndDate);

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
                  <div className="text-sm font-bold text-slate-500">{contract.title || ""}</div>
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
                <div className="mb-2 text-xs font-black text-blue-700">계약기간</div>
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
                    : "계약기간을 저장하면 기간 밖 날짜는 숨겨집니다."}
                </div>
              </form>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-blue-50 p-3 text-center">
                  <div className="text-[11px] font-black text-blue-600">근무일</div>
                  <div className="mt-1 text-lg font-black text-blue-900">{monthDays}일</div>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-center">
                  <div className="text-[11px] font-black text-blue-600">총 차시</div>
                  <div className="mt-1 text-lg font-black text-blue-900">{monthSessions}차시</div>
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
                    <div key={weekIndex} className="rounded-2xl border border-slate-200 p-3">
                      <div className="mb-2 text-xs font-black text-slate-500">
                        {weekIndex + 1}주
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((weekday) => {
                          const day = week.find((item) => item.weekday === weekday);
                          if (!day || !isDateWithinContract(contract, day.dateKey)) {
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
                                <div onClick={(event) => event.stopPropagation()} className="mt-2">
                                  <input
                                    inputMode="numeric"
                                    value={sessions}
                                    onChange={(event) =>
                                      void updateWorkSession(
                                        contract,
                                        day.dateKey,
                                        Math.max(0, Number(event.target.value || 0))
                                      )
                                    }
                                    className="w-full rounded-lg border border-blue-200 bg-white px-1 py-1 text-center text-sm font-black"
                                  />
                                  <div className="mt-1 text-[10px] font-bold text-blue-600">차시</div>
                                </div>
                              ) : (
                                <div className="mt-3 text-xs font-bold text-slate-300">선택</div>
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
                차시당 {formatWon(Number(contract.ratePerSession || 0))} · 전체 입력 누적{" "}
                {getContractWorkedSessions(contract)}차시 · 누적 발생{" "}
                {formatWon(getContractGross(contract))}
              </div>
              <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500">
                수금 입력은 누적 탭에서 계약기간의 월별 줄로 관리합니다.
              </div>
            </div>
          );
        })}
      </section>
    </>
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
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
              <div className="text-xs font-black text-emerald-700">전체 누적 발생액</div>
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
              <div className="text-xl font-black text-slate-900">새 수강료 등록</div>
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
                      onChange={(event) => setContractStartDate(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold"
                    />
                  </label>
                  <label className="text-xs font-black text-slate-600">
                    계약 종료일
                    <input
                      type="date"
                      value={contractEndDate}
                      min={contractStartDate || undefined}
                      onChange={(event) => setContractEndDate(event.target.value)}
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
                        setRatePerSession(event.target.value.replace(/[^0-9]/g, ""))
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
                        setSessionCount(event.target.value.replace(/[^0-9]/g, ""))
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

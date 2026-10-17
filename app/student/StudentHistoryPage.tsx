"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_STUDENT_PROGRAM,
  StudentProgram,
} from "@/lib/programs";

import SchoolSelect from "./components/SchoolSelect";
import StudentProfile from "./components/StudentProfile";
import ClassProgressBoard from "./components/ClassProgressBoard";
import SearchDropdown from "./components/SearchDropdown";

import { getStageInfo } from "./data/stageData";
import {
  getDefaultSchoolDisplayNames,
  getSchoolDisplayName,
  getSchoolNotice,
  getSchoolPassword,
  normalizeSchoolText,
  isCultureCenterSchool,
  isHaneulbitSchool,
} from "./data/schoolInfo";
import {
  getStudentGroupLabel,
} from "./data/studentGroups";
import type { ContractSchoolSummary } from "@/lib/contractSchools";
import type { AfterSchoolStatusMap } from "@/lib/afterSchool";

import type { StudentSummary } from "@/lib/studentTypes";

const DEFAULT_SCHOOLS = getDefaultSchoolDisplayNames();
const usesCombinedStudentEntry = (school: string) => {
  const normalized = normalizeSchoolText(school);
  return normalized.includes("하늘빛초") || normalized.includes("새솔초");
};


type Props = {
  program?: StudentProgram;
};

export default function StudentHistoryPage({
  program = DEFAULT_STUDENT_PROGRAM,
}: Props) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [allSchools, setAllSchools] = useState<string[]>([]);
  const [contractSchools, setContractSchools] = useState<ContractSchoolSummary[]>([]);
  const [afterSchoolStatuses, setAfterSchoolStatuses] =
    useState<AfterSchoolStatusMap>({});

  const [searchName, setSearchName] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");

  const [loading, setLoading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [pendingStudent, setPendingStudent] = useState<StudentSummary | null>(null);
  const [studentPassword, setStudentPassword] = useState("");

  const [pendingSchool, setPendingSchool] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [combinedSchoolVerified, setCombinedSchoolVerified] = useState(false);

  const normalize = (value: unknown) => String(value || "").trim();
  const [entering, setEntering] = useState(false);

  const enterStudent = async () => {
    if (!pendingStudent || entering) return;
    setEntering(true);
    try {
      const response = await fetch("/api/student/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", studentId: pendingStudent.id, studentCollection: pendingStudent.collectionName,
          password: studentPassword, schoolPassword: passwordInput, school: selectedSchool, program }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "입력 정보를 확인해 주세요.");
      setSelectedStudent(payload.student);
      setCombinedSchoolVerified(true);
      setPendingStudent(null);
      setStudentPassword(""); setPasswordInput("");
      localStorage.setItem("selectedSchool", selectedSchool);
    } catch (error) { alert(error instanceof Error ? error.message : "입장하지 못했습니다."); }
    finally { setEntering(false); }
  };
  const leaveStudent = async () => {
    const response = await fetch("/api/student/auth", { method: "DELETE" });
    if (!response.ok) { alert("로그아웃하지 못했습니다. 다시 시도해 주세요."); return false; }
    setSelectedStudent(null); setCombinedSchoolVerified(false); setPendingStudent(null); setStudents([]); setSearchName("");
    return true;
  };

  const fetchSchools = useCallback(async () => {
    try {
      const [schoolResponse, contractResponse] = await Promise.all([
        fetch("/api/student/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "schools", program }) }),
        fetch("/api/classroom/schools", { cache: "no-store" }).catch(() => null),
      ]);
      const contractPayload = contractResponse?.ok
        ? ((await contractResponse.json().catch(() => ({}))) as {
            schools?: ContractSchoolSummary[];
            afterSchoolStatuses?: AfterSchoolStatusMap;
          })
        : {};
      const publishedContractSchools = Array.isArray(contractPayload.schools)
        ? contractPayload.schools
        : [];

      setContractSchools(publishedContractSchools);
      setAfterSchoolStatuses(contractPayload.afterSchoolStatuses || {});

      const schoolPayload = schoolResponse.ok ? await schoolResponse.json() : {};
      const schoolSet = new Set<string>(Array.isArray(schoolPayload.schools) ? schoolPayload.schools : []);

      const mergedSchools = Array.from(
        new Set([
          ...DEFAULT_SCHOOLS,
          ...publishedContractSchools.map((school) => school.displayName),
          ...Array.from(schoolSet),
        ])
      );

      setAllSchools(mergedSchools);
    } catch (error) {
      console.error("학교 목록 불러오기 실패:", error);
      setAllSchools(DEFAULT_SCHOOLS);
      setContractSchools([]);
      setAfterSchoolStatuses({});
    }
  }, [program]);

  const handleSchoolSelect = useCallback((school: string) => {
    const cleanSchool = normalize(
      getSchoolDisplayName(school)
    );
    const password = getSchoolPassword(cleanSchool);

    if (usesCombinedStudentEntry(cleanSchool)) {
      setSelectedSchool(cleanSchool);
      setCombinedSchoolVerified(false);
      setPendingStudent(null);
      setSearchName("");
      setPasswordInput("");
      setStudentPassword("");
      return;
    }

    if (!password) {
      setSelectedSchool(cleanSchool);

      localStorage.setItem(
        "selectedSchool",
        cleanSchool
      );

      return;
    }

    setPendingSchool(cleanSchool);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
    localStorage.removeItem("selectedStudent"); // Remove legacy records containing credentials; never restore authentication from storage.
    void fetchSchools();
    const storedPendingSchool = localStorage.getItem("pendingSchool");
    if (storedPendingSchool) {
      handleSchoolSelect(storedPendingSchool); localStorage.removeItem("pendingSchool"); return;
    }
    void fetch("/api/student/auth", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.student?.program !== program) return;
      setSelectedSchool(getSchoolDisplayName(payload.student.school));
      setSelectedStudent(payload.student); setCombinedSchoolVerified(true);
    }).catch(() => undefined);

    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [fetchSchools, handleSchoolSelect, program]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStudents([]); setLoading(false);
      if (!selectedSchool || searchName.trim().length < 2 || selectedStudent) return;
      setLoading(true);
      try {
        const response = await fetch("/api/student/auth", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "search", school: selectedSchool, name: searchName.trim(), program }), signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "학생 검색에 실패했습니다.");
        if (!controller.signal.aborted) setStudents(payload.students || []);
      } catch (error) { if (!controller.signal.aborted) console.error("학생 검색 실패", error instanceof Error ? error.message : ""); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [selectedSchool, searchName, program, selectedStudent]);

  const changeCharacter = async (_studentId: string, type: string) => {
    const response = await fetch("/api/student/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ character: type }) });
    if (response.ok) setSelectedStudent(previous => previous ? ({ ...previous, character: type }) : null);
  };

  const activeStudents = students.filter((s) => {
    return s?.isActive !== false;
  });

  const filteredStudents =
    searchName.trim() === ""
      ? []
      : activeStudents.filter((s) => {
          return normalize(s?.name).includes(
            searchName.trim()
          );
        });

  const selectedStageInfo = selectedStudent
    ? getStageInfo(selectedStudent?.stage)
    : null;

  const showHaneulbitProgress = isHaneulbitSchool(selectedSchool);
  const selectedSchoolNotice = selectedStudent
    ? getSchoolNotice(selectedStudent?.school)
    : null;
  const selectedStudentClassLabel = selectedStudent
    ? getStudentGroupLabel(selectedStudent)
    : "";

  if (!selectedSchool) {
    if (pendingSchool) {
      return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 text-slate-800 flex items-center justify-center px-4">
          <div className="w-full max-w-md border border-sky-100 rounded-[32px] p-8 bg-white/95 shadow-xl">
            <div className="text-3xl font-bold text-center mb-6 text-slate-800">
              🔐 {pendingSchool} 입장
            </div>

            <input
              type="password"
              placeholder="비밀번호 입력"
              value={passwordInput}
              onChange={(e) =>
                setPasswordInput(e.target.value)
              }
              className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 text-lg mb-5 text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            />

            <button
              onClick={() => {
                const correctPassword =
                  getSchoolPassword(pendingSchool);

                if (
                  normalize(passwordInput) ===
                  normalize(correctPassword)
                ) {
                  setSelectedSchool(pendingSchool);

                  localStorage.setItem(
                    "selectedSchool",
                    pendingSchool
                  );

                  setPendingSchool("");
                  setPasswordInput("");
                } else {
                  alert("비밀번호가 틀렸습니다.");
                }
              }}
              className="w-full bg-sky-400 hover:bg-sky-500 transition rounded-2xl py-4 text-xl font-bold text-white shadow-sm"
            >
              입장하기
            </button>

            <button
              onClick={() => {
                setPendingSchool("");
                setPasswordInput("");
              }}
              className="w-full mt-3 bg-white border border-slate-200 rounded-2xl py-3 text-sm font-bold text-slate-600"
            >
              학교 목록으로
            </button>
          </div>
        </div>
      );
    }

    return (
      <SchoolSelect
        schools={allSchools}
        contractSchools={contractSchools}
        afterSchoolStatuses={afterSchoolStatuses}
        onSelect={handleSchoolSelect}
      />
    );
  }



  if (
    selectedSchool &&
    usesCombinedStudentEntry(selectedSchool) &&
    !combinedSchoolVerified &&
    !selectedStudent
  ) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 text-slate-800 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md rounded-[32px] border border-sky-100 bg-white/95 p-7 shadow-xl">
          <div className="text-center text-3xl font-bold text-slate-800">
            🔐 {selectedSchool} 입장
          </div>
          <p className="mt-2 text-center text-sm font-bold text-slate-500">
            학교 비밀번호, 이름, 출석번호를 입력해 주세요.
          </p>

          <label className="mt-6 block text-sm font-bold text-slate-700">학교 비밀번호</label>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="학교 비밀번호"
            className="mt-2 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-lg text-slate-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />

          <label className="mt-4 block text-sm font-bold text-slate-700">학생 이름</label>
          <input
            type="text"
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setPendingStudent(null);
              setStudentPassword("");
            }}
            placeholder="이름 검색"
            className="mt-2 w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4 text-lg text-slate-800 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />

          {loading && <p role="status" className="text-sm text-slate-500">검색 중…</p>}
          {searchName.trim() !== "" && !pendingStudent && (
            <div className="mt-2">
              <SearchDropdown
                students={filteredStudents}
                searchName={searchName}
                setSearchName={setSearchName}
                setSelectedStudent={(student: StudentSummary) => setPendingStudent(student)}
              />
            </div>
          )}

          {pendingStudent && (
            <div className="mt-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-slate-700">
              선택: <span className="text-slate-900">{pendingStudent.name}</span>
              <span className="ml-2 text-emerald-700">
                {pendingStudent.grade}학년 {pendingStudent.class}반
              </span>
            </div>
          )}

          <label className="mt-4 block text-sm font-bold text-slate-700">출석번호</label>
          <input
            type="number"
            inputMode="numeric"
            value={studentPassword}
            onChange={(e) => setStudentPassword(e.target.value)}
            placeholder="출석번호"
            className="mt-2 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-lg text-slate-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />

          <button
            type="button"
            onClick={() => void enterStudent()}
            disabled={entering || !passwordInput.trim() || !pendingStudent || !studentPassword.trim()}
            className="mt-5 w-full rounded-2xl bg-sky-400 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
          >
            수업방 입장
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSchool("");
              setCombinedSchoolVerified(false);
              setPendingStudent(null);
              setSearchName("");
              setPasswordInput("");
              setStudentPassword("");
            }}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600"
          >
            학교 목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-yellow-100 text-slate-800 px-3 py-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* 헤더 */}
        <div className="rounded-[28px] border border-white/80 bg-white/90 px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-3xl">
                  🧭
                </div>

                <div className="text-2xl font-bold truncate text-slate-800">
                  역사 탐험가
                </div>
              </div>

              <div className="text-sm text-slate-500 mt-1 truncate">
                {selectedSchool}
              </div>
            </div>

            <button
              onClick={async () => {
                if (await leaveStudent()) { localStorage.removeItem("selectedSchool"); setSelectedSchool(""); }
              }}
              className="bg-sky-50 border border-sky-200 px-3 py-2 rounded-2xl text-xs font-bold text-sky-700 shrink-0"
            >
              학교 변경
            </button>
          </div>
        </div>

        {!selectedStudent && (
          <>
            {/* 검색 */}
            <div className="bg-white/90 border border-white/80 p-4 rounded-[28px] shadow-sm">
              <div className="text-xl font-bold mb-3 text-slate-800">
                🔍 학생 검색
              </div>

              <input
                type="text"
                value={searchName}
                onChange={(e) =>
                  setSearchName(e.target.value)
                }
                placeholder="이름 검색"
                className="w-full rounded-[24px] border border-sky-200 bg-sky-50/70 px-5 py-4 text-lg text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />

              {searchName.trim() !== "" && (
                <div className="mt-3">
                  <SearchDropdown
                    students={filteredStudents}
                    searchName={searchName}
                    setSearchName={setSearchName}
                    showSchool={isCultureCenterSchool(
                      selectedSchool
                    )}
                    setSelectedStudent={(
                      student: StudentSummary
                    ) => {
                      setPendingStudent(student);
                    }}
                  />
                </div>
              )}

              {searchName.trim() !== "" &&
                filteredStudents.length === 0 && (
                  <div className="mt-3 rounded-2xl border border-sky-100 bg-white px-5 py-4 text-sm text-slate-500">
                    검색 결과 없음
                  </div>
                )}
            </div>

            {showHaneulbitProgress && <ClassProgressBoard />}
          </>
        )}

        {/* 학생 비밀번호 */}
        {pendingStudent && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white border border-sky-100 rounded-[32px] p-6 shadow-xl">
              <div className="text-2xl font-bold text-center mb-5 text-slate-800">
                🔐 {pendingStudent.name}
              </div>

              <input
                type="password"
                placeholder="비밀번호 입력"
                value={studentPassword}
                onChange={(e) =>
                  setStudentPassword(
                    e.target.value
                  )
                }
                className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 text-lg mb-4 text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />

              <button
                onClick={() => void enterStudent()}
                disabled={entering || !studentPassword.trim()}
                className="w-full bg-sky-400 rounded-2xl py-4 text-xl font-bold text-white shadow-sm"
              >
                입장하기
              </button>

              <button
                onClick={() => {
                  setPendingStudent(null);
                  setStudentPassword("");
                }}
                className="w-full mt-3 bg-white border border-slate-200 rounded-2xl py-3 text-sm font-bold text-slate-600"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 학생 프로필 */}
        {selectedStudent && (
          <>
            <StudentProfile
              student={selectedStudent}
              currentStage={
                selectedStageInfo?.current
                  ?.bookNumber || 1
              }
              stageInfo={selectedStageInfo}
              schoolNotice={selectedSchoolNotice}
              noticeClassLabel={selectedStudentClassLabel}
              achievements={[]}
              changeCharacter={
                changeCharacter
              }
            />

            <button
              onClick={() => void leaveStudent()}
              className="w-full bg-white/90 border border-sky-100 rounded-[24px] p-4 text-sm font-bold text-sky-700 shadow-sm"
            >
              🔍 다른 탐험가 찾기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

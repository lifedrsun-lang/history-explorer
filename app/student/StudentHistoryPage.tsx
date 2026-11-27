"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_STUDENT_PROGRAM,
  StudentProgram,
} from "@/lib/programs";

import SchoolSelect from "./components/SchoolSelect";
import StudentProfile from "./components/StudentProfile";
import ClassProgressBoard from "./components/ClassProgressBoard";
import SearchDropdown from "./components/SearchDropdown";
import LoadingSpinner from "./components/LoadingSpinner";
import HistoryTimelineLaunchButton from "./components/HistoryTimelineLaunchButton";

import { getStageInfo } from "./data/stageData";
import {
  getDefaultSchoolDisplayNames,
  getSchoolDisplayName,
  getSchoolNotice,
  isCultureCenterSchool,
  normalizeSchoolText,
  isHaneulbitSchool,
} from "./data/schoolInfo";
import {
  getStudentGroupLabel,
} from "./data/studentGroups";
import type { ContractSchoolSummary } from "@/lib/contractSchools";
import type { AfterSchoolStatusMap } from "@/lib/afterSchool";

type Props = {
  program?: StudentProgram;
};

export default function StudentHistoryPage({
  program = DEFAULT_STUDENT_PROGRAM,
}: Props) {
  const [students, setStudents] = useState<any[]>([]);
  const [allSchools, setAllSchools] = useState<string[]>([]);
  const [contractSchools, setContractSchools] = useState<ContractSchoolSummary[]>([]);
  const [afterSchoolStatuses, setAfterSchoolStatuses] =
    useState<AfterSchoolStatusMap>({});

  const [searchName, setSearchName] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");

  const [loading, setLoading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [pendingStudent, setPendingStudent] = useState<any>(null);
  const [studentPassword, setStudentPassword] = useState("");

  const [pendingSchool, setPendingSchool] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [combinedSchoolVerified, setCombinedSchoolVerified] = useState(false);
  const [checkingSchoolCode, setCheckingSchoolCode] = useState(false);

  const DEFAULT_SCHOOLS = getDefaultSchoolDisplayNames();

  const normalize = (value: any) => String(value || "").trim();

  const normalizeNoSpace = (value: any) => normalizeSchoolText(value);

  const fetchSchools = async () => {
    try {
      const [studentResponse, contractResponse] = await Promise.all([
        fetch(`/api/student/classroom-access?program=${encodeURIComponent(program)}`, {
          cache: "no-store",
        }).catch(() => null),
        fetch("/api/classroom/schools", { cache: "no-store" }).catch(() => null),
      ]);
      const studentPayload = studentResponse?.ok
        ? ((await studentResponse.json().catch(() => ({}))) as { schools?: string[] })
        : {};
      const contractPayload = contractResponse?.ok
        ? ((await contractResponse.json().catch(() => ({}))) as {
            schools?: ContractSchoolSummary[];
            afterSchoolStatuses?: AfterSchoolStatusMap;
          })
        : {};
      const publishedContractSchools = Array.isArray(contractPayload.schools)
        ? contractPayload.schools
        : [];
      const serverSchools = Array.isArray(studentPayload.schools)
        ? studentPayload.schools.map((school) => getSchoolDisplayName(school))
        : [];

      setContractSchools(publishedContractSchools);
      setAfterSchoolStatuses(contractPayload.afterSchoolStatuses || {});
      setAllSchools(
        Array.from(
          new Set([
            ...DEFAULT_SCHOOLS,
            ...publishedContractSchools.map((school) => school.displayName),
            ...serverSchools,
          ])
        )
      );
    } catch (error) {
      console.error("학교 목록 불러오기 실패:", error);
      setAllSchools(DEFAULT_SCHOOLS);
      setContractSchools([]);
      setAfterSchoolStatuses({});
    }
  };

  const fetchStudentsBySchool = async (school: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/student/classroom-access?program=${encodeURIComponent(program)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        authenticated?: boolean;
        school?: string;
        students?: any[];
      };
      if (!response.ok || payload.authenticated !== true || !Array.isArray(payload.students)) {
        setSelectedSchool("");
        setStudents([]);
        setPendingSchool(school);
        return;
      }
      setStudents(payload.students);

      const studentResponse = await fetch("/api/student/classroom", { cache: "no-store" });
      if (studentResponse.ok) {
        const studentPayload = (await studentResponse.json().catch(() => ({}))) as {
          student?: any;
        };
        if (studentPayload.student) setSelectedStudent(studentPayload.student);
      }
    } catch (error) {
      console.error("학생 목록 불러오기 실패:", error);
      setSelectedSchool("");
      setStudents([]);
      setPendingSchool(school);
    } finally {
      setLoading(false);
    }
  };

  const enterSchool = async (school: string, entryCode: string) => {
    setCheckingSchoolCode(true);
    try {
      const response = await fetch("/api/student/classroom-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school, program, entryCode }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        students?: any[];
      };
      if (!response.ok) {
        alert(payload.error || "입장 코드를 확인해 주세요.");
        return false;
      }
      setStudents(Array.isArray(payload.students) ? payload.students : []);
      setSelectedSchool(school);
      localStorage.setItem("selectedSchool", school);
      setPendingSchool("");
      setPasswordInput("");
      return true;
    } catch {
      alert("학교 입장을 확인하지 못했습니다. 다시 시도해 주세요.");
      return false;
    } finally {
      setCheckingSchoolCode(false);
    }
  };

  const usesCombinedStudentEntry = (_school: string) => false;

  const handleSchoolSelect = (school: string) => {
    const cleanSchool = normalize(getSchoolDisplayName(school));
    setSelectedStudent(null);
    setPendingStudent(null);
    setCombinedSchoolVerified(false);
    setSearchName("");
    setStudentPassword("");
    setPasswordInput("");
    setSelectedSchool("");
    setPendingSchool(cleanSchool);
  };

  useEffect(() => {
    fetchSchools();
    const storedSchool =
      localStorage.getItem("pendingSchool") || localStorage.getItem("selectedSchool");
    if (storedSchool) {
      setSelectedSchool(storedSchool);
      localStorage.removeItem("pendingSchool");
    }
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchStudentsBySchool(selectedSchool);
    } else {
      setStudents([]);
      setSearchName("");
      setSelectedStudent(null);
    }
  }, [selectedSchool]);

  const loginStudent = async (student: any, credential: string) => {
    if (!student || !credential.trim()) {
      alert("학생 인증 정보를 입력해 주세요.");
      return false;
    }
    setCheckingSchoolCode(true);
    try {
      const response = await fetch("/api/student/classroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          collectionName: student.collectionName,
          credential,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        student?: any;
      };
      if (!response.ok || !payload.student) {
        alert(payload.error || "학생 인증 정보를 확인해 주세요.");
        return false;
      }
      setSelectedStudent(payload.student);
      setPendingStudent(null);
      setStudentPassword("");
      return true;
    } catch {
      alert("학생 로그인을 처리하지 못했습니다. 다시 시도해 주세요.");
      return false;
    } finally {
      setCheckingSchoolCode(false);
    }
  };

  const changeCharacter = async (_studentId: string, type: string) => {
    try {
      const response = await fetch("/api/student/classroom", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: type }),
      });
      const payload = (await response.json().catch(() => ({}))) as { student?: any };
      if (!response.ok || !payload.student) throw new Error("character_update_failed");
      setSelectedStudent(payload.student);
    } catch (error) {
      console.error("캐릭터 변경 실패:", error);
    }
  };

  const logoutStudent = async () => {
    await fetch("/api/student/classroom", { method: "DELETE" }).catch(() => undefined);
    setSelectedStudent(null);
    setPendingStudent(null);
    setStudentPassword("");
  };

  const logoutSchool = async () => {
    await fetch("/api/student/classroom-access", { method: "DELETE" }).catch(() => undefined);
    localStorage.removeItem("selectedSchool");
    localStorage.removeItem("selectedStudent");
    setSelectedSchool("");
    setSelectedStudent(null);
    setPendingStudent(null);
    setCombinedSchoolVerified(false);
    setStudents([]);
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

  if (loading) {
    return <LoadingSpinner />;
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
            disabled={checkingSchoolCode}
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
            disabled={checkingSchoolCode}
            placeholder="이름 검색"
            className="mt-2 w-full rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4 text-lg text-slate-800 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />

          {searchName.trim() !== "" && !pendingStudent && (
            <div className="mt-2">
              <SearchDropdown
                students={filteredStudents}
                searchName={searchName}
                setSearchName={setSearchName}
                setSelectedStudent={(student: any) => setPendingStudent(student)}
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
            disabled={checkingSchoolCode}
            placeholder="출석번호"
            className="mt-2 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-lg text-slate-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />

          <button
            type="button"
            onClick={async () => {
              const attendanceNumberMatches =
                pendingStudent &&
                normalize(studentPassword) === normalize(pendingStudent.studentNumber);
              if (!attendanceNumberMatches || checkingSchoolCode) {
                alert("입력 정보를 확인해 주세요.");
                return;
              }
              if (normalizeNoSpace(selectedSchool).includes("등현초")) {
                setCheckingSchoolCode(true);
                try {
                  const response = await fetch("/api/student/deunghyeon-entry", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code: passwordInput }),
                  });
                  if (response.status === 429) {
                    alert("입장 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.");
                    return;
                  }
                  if (!response.ok) {
                    alert("입장코드를 확인할 수 없습니다. 다시 시도해 주세요.");
                    return;
                  }
                  const result = await response.json();
                  if (result.valid !== true) {
                    alert("입력 정보를 확인해 주세요.");
                    return;
                  }
                } catch {
                  alert("입장코드를 확인할 수 없습니다. 다시 시도해 주세요.");
                  return;
                } finally {
                  setCheckingSchoolCode(false);
                }
              } else if (normalize(passwordInput) !== normalize(getSchoolPassword(selectedSchool))) {
                alert("입력 정보를 확인해 주세요.");
                return;
              }

              setSelectedStudent(pendingStudent);
              localStorage.setItem("selectedSchool", selectedSchool);
              localStorage.setItem("selectedStudent", JSON.stringify(pendingStudent));
              setCombinedSchoolVerified(true);
              setPendingStudent(null);
              setPasswordInput("");
              setStudentPassword("");
            }}
            disabled={checkingSchoolCode || !passwordInput.trim() || !pendingStudent || !studentPassword.trim()}
            className="mt-5 w-full rounded-2xl bg-sky-400 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
          >
            {checkingSchoolCode ? "확인 중..." : "수업방 입장"}
          </button>

          <button
            type="button"
            disabled={checkingSchoolCode}
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
              onClick={() => {
                localStorage.removeItem(
                  "selectedSchool"
                );

                localStorage.removeItem(
                  "selectedStudent"
                );

                setSelectedSchool("");
                setSelectedStudent(null);
                setCombinedSchoolVerified(false);
                setStudents([]);
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
                      student: any
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
                onClick={() => {
                  if (
                    normalize(studentPassword) ===
                    normalize(
                      pendingStudent?.password
                    )
                  ) {
                    setSelectedStudent(
                      pendingStudent
                    );

                    localStorage.setItem(
                      "selectedStudent",
                      JSON.stringify(
                        pendingStudent
                      )
                    );

                    setPendingStudent(null);
                    setStudentPassword("");
                  } else {
                    alert("비밀번호가 틀렸습니다.");
                  }
                }}
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

            <HistoryTimelineLaunchButton student={selectedStudent} />

            <button
              onClick={() => {
                setSearchName("");

                localStorage.removeItem(
                  "selectedStudent"
                );

                setSelectedStudent(null);
              }}
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

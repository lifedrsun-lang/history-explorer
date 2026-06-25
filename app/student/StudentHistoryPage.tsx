"use client";

import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

import { useEffect, useState } from "react";

import SchoolSelect from "./components/SchoolSelect";
import StudentProfile from "./components/StudentProfile";
import RankingCard from "./components/RankingCard";
import SearchDropdown from "./components/SearchDropdown";
import LoadingSpinner from "./components/LoadingSpinner";

import { getStageInfo } from "./data/stageData";

export default function StudentHistoryPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [allSchools, setAllSchools] = useState<string[]>([]);

  const [searchName, setSearchName] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");

  const [loading, setLoading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [pendingStudent, setPendingStudent] = useState<any>(null);
  const [studentPassword, setStudentPassword] = useState("");

  const [pendingSchool, setPendingSchool] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const SCHOOL_PASSWORDS: Record<string, string> = {
    "김포 하늘빛초": "0527",
    "화성 새솔초": "0602",
    "김포 사우초": "0605",
    "홈플러스 문화센터": "0607",
    "이마트 문화센터": "0607",
  };

  const DEFAULT_SCHOOLS = Object.keys(SCHOOL_PASSWORDS);

  const COLLECTION_NAMES = [
    "students",
    "student",
    "Students",
    "Student",
  ];

  const normalize = (value: any) => {
    return String(value || "").trim();
  };

  const normalizeNoSpace = (value: any) => {
    return String(value || "")
      .replace(/\s/g, "")
      .replace(/초등학교/g, "초")
      .replace(/초등/g, "초")
      .replace(/[()]/g, "")
      .trim();
  };

  const getStudentName = (data: any) => {
    return normalize(
      data?.name ||
        data?.studentName ||
        data?.student_name ||
        data?.이름 ||
        ""
    );
  };

  const getStudentSchool = (data: any) => {
    return normalize(
      data?.school ||
        data?.schoolName ||
        data?.school_name ||
        data?.학교 ||
        ""
    );
  };

  const getStudentGrade = (data: any) => {
    return (
      data?.grade ||
      data?.studentGrade ||
      data?.student_grade ||
      data?.학년 ||
      ""
    );
  };

  const getStudentClass = (data: any) => {
    return (
      data?.class ||
      data?.studentClass ||
      data?.student_class ||
      data?.className ||
      data?.반 ||
      data?.group ||
      data?.team ||
      ""
    );
  };

  const getStudentNumber = (data: any) => {
    return (
      data?.studentNumber ||
      data?.number ||
      data?.studentNo ||
      data?.no ||
      data?.번호 ||
      0
    );
  };

  const getStudentPassword = (data: any) => {
    return normalize(
      data?.password ||
        data?.studentPassword ||
        data?.pw ||
        data?.비밀번호 ||
        ""
    );
  };

  const getStudentProgram = (data: any) => {
    const program = normalize(
      data?.program || "history"
    ).toLowerCase();

    return program || "history";
  };

  const isHistoryStudent = (data: any) => {
    return getStudentProgram(data) === "history";
  };

  const getBronze = (data: any) => {
    return Number(
      data?.bronze ||
        data?.bronzeCoin ||
        data?.동엽전 ||
        0
    );
  };

  const getSilver = (data: any) => {
    return Number(
      data?.silver ||
        data?.silverCoin ||
        data?.은엽전 ||
        0
    );
  };

  // 교사용에서 숨김 처리된 학생은 학생 페이지 검색/랭킹에서 제외
  const isHiddenStudent = (data: any) => {
    return data?.isActive === false;
  };

  const getGradeNumber = (value: any) => {
    const text = String(value || "").trim();
    const match = text.match(/\d+/);

    if (!match) {
      return 0;
    }

    return Number(match[0]);
  };

  const makeStudentObject = (
    docId: string,
    data: any,
    collectionName: string
  ) => {
    return {
      id: docId,
      collectionName,

      ...data,

      name: getStudentName(data),
      school: getStudentSchool(data),
      grade: getStudentGrade(data),
      class: getStudentClass(data),
      studentNumber: getStudentNumber(data),
      password: getStudentPassword(data),

      bronze: getBronze(data),
      silver: getSilver(data),
      program: getStudentProgram(data),
    };
  };

  const fetchAllStudents = async () => {
    const allList: any[] = [];

    for (const collectionName of COLLECTION_NAMES) {
      try {
        const snapshot = await getDocs(
          collection(db, collectionName)
        );

        snapshot.forEach((docItem) => {
          const data = docItem.data();

          if (isHiddenStudent(data)) {
            return;
          }

          if (!isHistoryStudent(data)) {
            return;
          }

          allList.push(
            makeStudentObject(
              docItem.id,
              data,
              collectionName
            )
          );
        });
      } catch (error) {
        console.error(
          `${collectionName} 컬렉션 조회 실패:`,
          error
        );
      }
    }

    return allList;
  };

  const isSameSchool = (
    studentSchool: string,
    targetSchool: string
  ) => {
    const a = normalizeNoSpace(studentSchool);
    const b = normalizeNoSpace(targetSchool);

    if (!a || !b) {
      return false;
    }

    if (a === b) {
      return true;
    }

    if (a.includes(b)) {
      return true;
    }

    if (b.includes(a)) {
      return true;
    }

    return false;
  };

  const fetchSchools = async () => {
    try {
      const allList = await fetchAllStudents();

      const schoolSet = new Set<string>();

      allList.forEach((student) => {
        const school = normalize(student?.school);

        if (school) {
          schoolSet.add(school);
        }
      });

      const mergedSchools = Array.from(
        new Set([
          ...DEFAULT_SCHOOLS,
          ...Array.from(schoolSet),
        ])
      );

      setAllSchools(mergedSchools);
    } catch (error) {
      console.error("학교 목록 불러오기 실패:", error);
      setAllSchools(DEFAULT_SCHOOLS);
    }
  };

  const fetchStudentsBySchool = async (
    school: string
  ) => {
    setLoading(true);

    try {
      const allList = await fetchAllStudents();

      const targetSchool = normalize(school);

      const matchedList = allList.filter((student) => {
        return isSameSchool(
          student?.school,
          targetSchool
        );
      });

      matchedList.sort((a, b) => {
        const gradeA = getGradeNumber(a?.grade);
        const gradeB = getGradeNumber(b?.grade);

        const classA = normalize(a?.class);
        const classB = normalize(b?.class);

        const numA = Number(a?.studentNumber || 0);
        const numB = Number(b?.studentNumber || 0);

        if (gradeA !== gradeB) {
          return gradeA - gradeB;
        }

        if (classA !== classB) {
          return classA.localeCompare(classB);
        }

        return numA - numB;
      });

      setStudents(matchedList);

      const savedStudent =
        localStorage.getItem("selectedStudent");

      if (savedStudent) {
        const parsed = JSON.parse(savedStudent);

        const matched = matchedList.find(
          (s) => s.id === parsed.id
        );

        if (matched) {
          setSelectedStudent(matched);
        } else {
          localStorage.removeItem("selectedStudent");
          setSelectedStudent(null);
        }
      }
    } catch (error) {
      console.error("학생 목록 불러오기 실패:", error);
    }

    setLoading(false);
  };

  const handleSchoolSelect = (school: string) => {
    const cleanSchool = normalize(school);
    const password = SCHOOL_PASSWORDS[cleanSchool];

    if (!password) {
      setSelectedSchool(cleanSchool);

      localStorage.setItem(
        "selectedSchool",
        cleanSchool
      );

      return;
    }

    setPendingSchool(cleanSchool);
  };

  useEffect(() => {
    fetchSchools();

    const storedPendingSchool =
      localStorage.getItem("pendingSchool");

    if (storedPendingSchool) {
      handleSchoolSelect(storedPendingSchool);

      localStorage.removeItem("pendingSchool");

      return;
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

  const changeCharacter = async (
    studentId: string,
    type: string
  ) => {
    try {
      const collectionName =
        selectedStudent?.collectionName || "students";

      const ref = doc(
        db,
        collectionName,
        studentId
      );

      await updateDoc(ref, {
        character: type,
      });

      setSelectedStudent((prev: any) => {
        const updated = {
          ...prev,
          character: type,
        };

        localStorage.setItem(
          "selectedStudent",
          JSON.stringify(updated)
        );

        return updated;
      });

      fetchStudentsBySchool(selectedSchool);
    } catch (error) {
      console.error("캐릭터 변경 실패:", error);
    }
  };

  const getScore = (s: any) => {
    return (
      Number(s?.silver || 0) * 10 +
      Number(s?.bronze || 0)
    );
  };

  const getStudentGroup = (s: any) => {
    const classText = normalizeNoSpace(
      s?.class ||
        s?.studentClass ||
        s?.group ||
        s?.team ||
        ""
    ).toUpperCase();

    if (
      classText.includes("A") ||
      classText.includes("달")
    ) {
      return "moon";
    }

    if (
      classText.includes("B") ||
      classText.includes("별")
    ) {
      return "star";
    }

    const grade = getGradeNumber(s?.grade);

    if (grade >= 1 && grade <= 2) {
      return "moon";
    }

    if (grade >= 3) {
      return "star";
    }

    return "";
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

  const moonRanking = activeStudents
    .filter(
      (s) => getStudentGroup(s) === "moon"
    )
    .sort(
      (a, b) => getScore(b) - getScore(a)
    )
    .slice(0, 3);

  const starRanking = activeStudents
    .filter(
      (s) => getStudentGroup(s) === "star"
    )
    .sort(
      (a, b) => getScore(b) - getScore(a)
    )
    .slice(0, 3);

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
                  SCHOOL_PASSWORDS[pendingSchool];

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
        onSelect={handleSchoolSelect}
      />
    );
  }

  if (loading) {
    return <LoadingSpinner />;
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

            {/* 랭킹 */}
            <RankingCard
              title="A반 랭킹"
              icon="🌙"
              students={moonRanking}
              getScore={getScore}
              bgColor="bg-white/90"
              borderColor="border-sky-100"
            />

            <RankingCard
              title="B반 랭킹"
              icon="⭐"
              students={starRanking}
              getScore={getScore}
              bgColor="bg-white/90"
              borderColor="border-amber-100"
            />
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
              currentStage={Number(
                selectedStudent?.stage || 1
              )}
              stageInfo={getStageInfo(
                Number(
                  selectedStudent?.stage || 1
                )
              )}
              achievements={[]}
              changeCharacter={
                changeCharacter
              }
            />

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

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

export default function StudentExplorerPage() {
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

  const normalize = (value: any) => {
    return String(value || "").trim();
  };

  const normalizeNoSpace = (value: any) => {
    return String(value || "")
      .replace(/\s/g, "")
      .trim();
  };

  // 학생용에서는 숨김 학생도 조회 가능하게 유지
  const isHiddenStudent = (data: any) => {
    return false;
  };

  // 학교 선택
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

  // 학교 목록 불러오기
  const fetchSchools = async () => {
    try {
      const snapshot = await getDocs(
        collection(db, "students")
      );

      const schoolSet = new Set<string>();

      snapshot.forEach((docItem) => {
        const data = docItem.data();

        if (isHiddenStudent(data)) {
          return;
        }

        const school = normalize(data?.school);

        if (school) {
          schoolSet.add(school);
        }
      });

      setAllSchools(Array.from(schoolSet));
    } catch (error) {
      console.error(
        "학교 목록 불러오기 실패:",
        error
      );
    }
  };

  // 학교별 학생 불러오기
  const fetchStudentsBySchool = async (
    school: string
  ) => {
    setLoading(true);

    try {
      const snapshot = await getDocs(
        collection(db, "students")
      );

      const targetSchool = normalizeNoSpace(school);

      const list: any[] = [];

      snapshot.forEach((docItem) => {
        const data = docItem.data();

        if (isHiddenStudent(data)) {
          return;
        }

        const studentSchool = normalizeNoSpace(
          data?.school
        );

        if (studentSchool === targetSchool) {
          list.push({
            id: docItem.id,
            ...data,
            school: normalize(data?.school),
          });
        }
      });

      list.sort((a, b) => {
        const gradeA = getGradeNumber(a?.grade);
        const gradeB = getGradeNumber(b?.grade);

        const classA = normalize(a?.class);
        const classB = normalize(b?.class);

        const numA = Number(
          a?.studentNumber || 0
        );
        const numB = Number(
          b?.studentNumber || 0
        );

        if (gradeA !== gradeB) {
          return gradeA - gradeB;
        }

        if (classA !== classB) {
          return classA.localeCompare(classB);
        }

        return numA - numB;
      });

      setStudents(list);

      const savedStudent =
        localStorage.getItem("selectedStudent");

      if (savedStudent) {
        const parsed = JSON.parse(savedStudent);

        const matched = list.find(
          (s) => s.id === parsed.id
        );

        if (matched) {
          setSelectedStudent(matched);
        } else {
          localStorage.removeItem(
            "selectedStudent"
          );
          setSelectedStudent(null);
        }
      }
    } catch (error) {
      console.error(
        "학생 목록 불러오기 실패:",
        error
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSchools();

    const savedSchool =
      localStorage.getItem("selectedSchool");

    const storedPendingSchool =
      localStorage.getItem("pendingSchool");

    if (storedPendingSchool) {
      handleSchoolSelect(storedPendingSchool);

      localStorage.removeItem("pendingSchool");

      return;
    }

    if (savedSchool) {
      setSelectedSchool(normalize(savedSchool));
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

  // 캐릭터 변경
  const changeCharacter = async (
    studentId: string,
    type: string
  ) => {
    try {
      const ref = doc(
        db,
        "students",
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
      console.error(
        "캐릭터 변경 실패:",
        error
      );
    }
  };

  // 학년 숫자 추출
  const getGradeNumber = (value: any) => {
    const text = String(value || "").trim();
    const match = text.match(/\d+/);

    if (!match) {
      return 0;
    }

    return Number(match[0]);
  };

  // 점수 계산
  const getScore = (s: any) => {
    return (
      Number(s?.silver || 0) * 10 +
      Number(s?.bronze || 0)
    );
  };

  // A반 / B반 판별
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

  // 검색 결과
  const filteredStudents =
    searchName.trim() === ""
      ? []
      : students.filter((s) => {
          if (isHiddenStudent(s)) {
            return false;
          }

          return normalize(s?.name).includes(
            searchName.trim()
          );
        });

  // 랭킹
  const moonRanking = students
    .filter(
      (s) => getStudentGroup(s) === "moon"
    )
    .sort(
      (a, b) => getScore(b) - getScore(a)
    )
    .slice(0, 3);

  const starRanking = students
    .filter(
      (s) => getStudentGroup(s) === "star"
    )
    .sort(
      (a, b) => getScore(b) - getScore(a)
    )
    .slice(0, 3);

  // 학교 선택 화면
  if (!selectedSchool) {
    if (pendingSchool) {
      return (
        <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center px-4">
          <div className="w-full max-w-md border border-orange-500 rounded-[32px] p-8 bg-[#050505]">
            <div className="text-3xl font-bold text-center mb-6">
              🔐 {pendingSchool} 입장
            </div>

            <input
              type="password"
              placeholder="비밀번호 입력"
              value={passwordInput}
              onChange={(e) =>
                setPasswordInput(e.target.value)
              }
              className="w-full bg-[#111] border border-[#333] rounded-2xl px-4 py-4 text-lg mb-5 outline-none"
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
                  alert(
                    "비밀번호가 틀렸습니다."
                  );
                }
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 transition rounded-2xl py-4 text-xl font-bold"
            >
              입장하기
            </button>

            <button
              onClick={() => {
                setPendingSchool("");
                setPasswordInput("");
              }}
              className="w-full mt-3 bg-[#111] border border-[#333] rounded-2xl py-3 text-sm"
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

  // 로딩
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white px-3 py-4">
      <div className="max-w-xl mx-auto space-y-4">
        {/* 헤더 */}
        <div className="rounded-[28px] border border-[#333] bg-[#050505] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-3xl">
                  🧭
                </div>

                <div className="text-2xl font-bold truncate">
                  역사 탐험가
                </div>
              </div>

              <div className="text-sm text-gray-400 mt-1 truncate">
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
              className="bg-[#111] border border-[#333] px-3 py-2 rounded-2xl text-xs shrink-0"
            >
              학교 변경
            </button>
          </div>
        </div>

        {/* 검색 전 */}
        {!selectedStudent && (
          <>
            {/* 검색 */}
            <div className="bg-[#050505] border border-[#333] p-4 rounded-[28px]">
              <div className="text-xl font-bold mb-3">
                🔍 학생 검색
              </div>

              <input
                type="text"
                value={searchName}
                onChange={(e) =>
                  setSearchName(e.target.value)
                }
                placeholder="이름 검색"
                className="w-full rounded-[24px] border border-orange-500/40 bg-[#0b0b0f] px-5 py-4 text-lg text-white outline-none transition focus:border-orange-400"
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
                filteredStudents.length ===
                  0 && (
                  <div className="mt-3 rounded-2xl border border-[#333] bg-[#0b0b0f] px-5 py-4 text-sm text-gray-500">
                    검색 결과 없음
                  </div>
                )}
            </div>

            <RankingCard
              title="A반 랭킹"
              icon="🌙"
              students={moonRanking}
              getScore={getScore}
              bgColor="bg-[#15154b]"
              borderColor="border-[#444]"
            />

            <RankingCard
              title="B반 랭킹"
              icon="⭐"
              students={starRanking}
              getScore={getScore}
              bgColor="bg-[#3a2800]"
              borderColor="border-[#5a3d00]"
            />
          </>
        )}

        {/* 학생 비밀번호 */}
        {pendingStudent && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-[#050505] border border-orange-500 rounded-[32px] p-6">
              <div className="text-2xl font-bold text-center mb-5">
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
                className="w-full bg-[#111] border border-[#333] rounded-2xl px-4 py-4 text-lg mb-4 outline-none"
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
                    alert(
                      "비밀번호가 틀렸습니다."
                    );
                  }
                }}
                className="w-full bg-orange-500 rounded-2xl py-4 text-xl font-bold"
              >
                입장하기
              </button>

              <button
                onClick={() => {
                  setPendingStudent(null);
                  setStudentPassword("");
                }}
                className="w-full mt-3 bg-[#111] border border-[#333] rounded-2xl py-3 text-sm"
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
              className="w-full bg-[#111] border border-[#333] rounded-[24px] p-4 text-sm"
            >
              🔍 다른 탐험가 찾기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
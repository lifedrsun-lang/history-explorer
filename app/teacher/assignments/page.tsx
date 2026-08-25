"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import {
  AssignmentStudent,
  AssignmentSubmissionSummary,
  AssignmentSummary,
} from "@/lib/assignments";
import {
  DEFAULT_STUDENT_PROGRAM,
  STUDENT_PROGRAM_OPTIONS,
  StudentProgram,
  getStudentProgramLabel,
  getStudentProgramValue,
} from "@/lib/programs";
import { requestTeacherDashboardSummaryRefresh } from "@/lib/teacherDashboard";

type AssignmentDetail = {
  assignment: AssignmentSummary;
  targetStudents: AssignmentStudent[];
  submissions: AssignmentSubmissionSummary[];
};

type AssignmentFilter = "active" | "archived";

const teachingClassOptions = ["A반", "B반"];
const DEFAULT_REVISION_MESSAGE =
  "선생님이 과제를 다시 확인해 달라고 요청했어요.";

const getTeachingClass = (student: AssignmentStudent) => {
  const grade = String(student.grade || "");
  const match = grade.match(/\d+/);
  const gradeNumber = match ? Number(match[0]) : 0;

  if (gradeNumber >= 1 && gradeNumber <= 2) {
    return "A반";
  }

  if (gradeNumber >= 3 && gradeNumber <= 6) {
    return "B반";
  }

  return "";
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSubmissionStatusLabel = (
  submission?: AssignmentSubmissionSummary
) => {
  if (!submission) {
    return "미제출";
  }

  if (submission.status === "approved") {
    return "승인 완료";
  }

  if (submission.status === "revision") {
    return "다시 해오기 요청";
  }

  return "제출완료";
};

const getSubmissionStatusClassName = (
  submission?: AssignmentSubmissionSummary
) => {
  if (!submission) {
    return "bg-white text-slate-500";
  }

  if (submission.status === "approved") {
    return "bg-yellow-100 text-yellow-800";
  }

  if (submission.status === "revision") {
    return "bg-orange-100 text-orange-700";
  }

  return "bg-emerald-100 text-emerald-700";
};

export default function TeacherAssignmentsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<AssignmentStudent[]>([]);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("active");
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingAssignmentId, setProcessingAssignmentId] = useState("");
  const [processingSubmissionAction, setProcessingSubmissionAction] =
    useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [program, setProgram] = useState<StudentProgram>(
    DEFAULT_STUDENT_PROGRAM
  );
  const [school, setSchool] = useState("");
  const [targetTeachingClass, setTargetTeachingClass] = useState("A반");
  const [dueAt, setDueAt] = useState("");
  const [selectedStudentKeys, setSelectedStudentKeys] = useState<string[]>([]);

  const getToken = useCallback(async () => {
    if (!user) {
      throw new Error("not_signed_in");
    }

    return user.getIdToken();
  }, [user]);

  const requestJson = useCallback(async (url: string, init?: RequestInit) => {
    const token = await getToken();
    const response = await fetch(url, {
      ...init,
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
  }, [getToken]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [studentData, assignmentData] = await Promise.all([
        requestJson("/api/teacher/assignment-students"),
        requestJson("/api/teacher/assignments"),
      ]);

      setStudents(studentData.students || []);
      setAssignments(assignmentData.assignments || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "과제 정보를 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, [requestJson]);

  const loadDetail = useCallback(async (assignmentId: string) => {
    if (!assignmentId) {
      setDetail(null);
      return;
    }

    setErrorMessage("");

    try {
      const data = await requestJson(`/api/teacher/assignments/${assignmentId}`);
      setDetail(data);
    } catch (error) {
      setDetail(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
        : "제출 현황을 불러오지 못했습니다."
      );
    }
  }, [requestJson]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/teacher");
        return;
      }

      setUser(currentUser);
      setAuthChecking(false);
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        void loadData();
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [loadData, user]);

  useEffect(() => {
    if (selectedAssignmentId) {
      const timer = setTimeout(() => {
        void loadDetail(selectedAssignmentId);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [loadDetail, selectedAssignmentId]);

  const programStudents = useMemo(() => {
    return students.filter((student) => {
      return getStudentProgramValue(student.program) === program;
    });
  }, [program, students]);

  const schoolOptions = useMemo(() => {
    return Array.from(
      new Set(programStudents.map((student) => student.school).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [programStudents]);

  const targetStudents = useMemo(() => {
    return programStudents.filter((student) => {
      return (
        student.school === school &&
        getTeachingClass(student) === targetTeachingClass
      );
    });
  }, [programStudents, school, targetTeachingClass]);

  const selectedAssignment = assignments.find(
    (assignment) => assignment.id === selectedAssignmentId
  );
  const visibleAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      return assignmentFilter === "active"
        ? assignment.isActive
        : !assignment.isActive;
    });
  }, [assignmentFilter, assignments]);

  const submissionByStudentKey = useMemo(() => {
    const map = new Map<string, AssignmentSubmissionSummary>();

    detail?.submissions.forEach((submission) => {
      map.set(submission.studentKey, submission);
    });

    return map;
  }, [detail]);

  const toggleStudent = (studentKey: string) => {
    setSelectedStudentKeys((current) => {
      return current.includes(studentKey)
        ? current.filter((key) => key !== studentKey)
        : [...current, studentKey];
    });
  };

  const toggleAllTargetStudents = () => {
    const targetKeys = targetStudents.map((student) => student.studentKey);
    const allSelected = targetKeys.every((key) =>
      selectedStudentKeys.includes(key)
    );

    setSelectedStudentKeys((current) => {
      if (allSelected) {
        return current.filter((key) => !targetKeys.includes(key));
      }

      return Array.from(new Set([...current, ...targetKeys]));
    });
  };

  const saveAssignment = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice("");
    setErrorMessage("");

    try {
      await requestJson("/api/teacher/assignments", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          program,
          school,
          targetTeachingClass,
          dueAt,
          targetStudentKeys: selectedStudentKeys,
        }),
      });

      setTitle("");
      setDescription("");
      setDueAt("");
      setSelectedStudentKeys([]);
      setNotice("과제를 등록했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "과제 등록에 실패했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const reloadAssignmentsAndDetail = async () => {
    await loadData();

    if (selectedAssignmentId) {
      await loadDetail(selectedAssignmentId);
    }
  };

  const reviewSubmission = async (
    submission: AssignmentSubmissionSummary,
    action: "approve" | "revision" | "revoke"
  ) => {
    if (!selectedAssignmentId || processingSubmissionAction) {
      return;
    }

    let revisionMessage = DEFAULT_REVISION_MESSAGE;

    if (action === "revision") {
      revisionMessage =
        window.prompt("다시 해오기 안내 문구", DEFAULT_REVISION_MESSAGE) ||
        DEFAULT_REVISION_MESSAGE;
    }

    const actionKey = `${submission.id}:${action}`;

    setProcessingSubmissionAction(actionKey);
    setNotice("");
    setErrorMessage("");

    try {
      const data = await requestJson(
        `/api/teacher/assignments/${selectedAssignmentId}/submissions/${submission.id}/review`,
        {
          method: "POST",
          body: JSON.stringify({
            action,
            revisionMessage,
          }),
        }
      );

      requestTeacherDashboardSummaryRefresh();

      if (data.outcome === "already_rewarded") {
        setNotice("이미 승인 및 보상 지급이 완료된 과제입니다.");
      } else if (action === "approve") {
        setNotice(
          data.exchangeCount > 0
            ? `승인 완료 · 동엽전 1개 지급 · 은엽전 ${data.exchangeCount}개 자동 교환`
            : "승인 완료 · 동엽전 1개 지급 완료"
        );
      } else if (action === "revision") {
        setNotice("다시 해오기 요청을 보냈습니다.");
      } else {
        setNotice("승인을 취소하고 동엽전 1개를 회수했습니다.");
      }

      await reloadAssignmentsAndDetail();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "제출 상태 변경에 실패했습니다."
      );
    } finally {
      setProcessingSubmissionAction("");
    }
  };

  const changeAssignmentVisibility = async (
    assignment: AssignmentSummary,
    action: "archive" | "restore"
  ) => {
    if (processingAssignmentId) {
      return;
    }

    setProcessingAssignmentId(assignment.id);
    setNotice("");
    setErrorMessage("");

    try {
      await requestJson(`/api/teacher/assignments/${assignment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });

      setNotice(
        action === "archive"
          ? "과제를 숨김/보관 처리했습니다."
          : "과제를 다시 공개했습니다."
      );

      if (selectedAssignmentId === assignment.id && action === "archive") {
        setSelectedAssignmentId("");
        setDetail(null);
      }

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "과제 상태 변경에 실패했습니다."
      );
    } finally {
      setProcessingAssignmentId("");
    }
  };

  if (authChecking) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
        <div className="mx-auto flex min-h-[calc(100dvh-24px)] max-w-6xl items-center justify-center">
          <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
            Checking teacher sign-in...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">과제 관리</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              과제를 등록하고 학생 사진 제출 현황을 확인합니다.
            </p>
          </div>

          <Link
            href="/teacher"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            교사 관리화면으로
          </Link>
        </div>

        {notice && (
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
            {notice}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-3xl bg-white p-5 shadow-md">
            <h2 className="text-xl font-black">새 과제 등록</h2>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-black text-slate-700">
                과제 제목
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>

              <label className="block text-sm font-black text-slate-700">
                과제 설명
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm font-black text-slate-700">
                  프로그램
                  <select
                    value={program}
                    onChange={(event) => {
                      setProgram(event.target.value as StudentProgram);
                      setSchool("");
                      setSelectedStudentKeys([]);
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold"
                  >
                    {STUDENT_PROGRAM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-black text-slate-700">
                  수업반
                  <select
                    value={targetTeachingClass}
                    onChange={(event) => {
                      setTargetTeachingClass(event.target.value);
                      setSelectedStudentKeys([]);
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold"
                  >
                    {teachingClassOptions.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm font-black text-slate-700">
                학교
                <select
                  value={school}
                  onChange={(event) => {
                    setSchool(event.target.value);
                    setSelectedStudentKeys([]);
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold"
                >
                  <option value="">학교 선택</option>
                  {schoolOptions.map((schoolName) => (
                    <option key={schoolName} value={schoolName}>
                      {schoolName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-black text-slate-700">
                마감일
                <input
                  type="date"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold"
                />
              </label>

              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-700">
                      대상 학생
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      선택 {selectedStudentKeys.length}명 / 대상{" "}
                      {targetStudents.length}명
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleAllTargetStudents}
                    disabled={targetStudents.length === 0}
                    className="rounded-2xl bg-slate-800 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                  >
                    전체 선택
                  </button>
                </div>

                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {targetStudents.length === 0 ? (
                    <div className="rounded-2xl bg-white px-4 py-4 text-sm font-bold text-slate-500">
                      조건에 맞는 학생이 없습니다.
                    </div>
                  ) : (
                    targetStudents.map((student) => (
                      <label
                        key={student.studentKey}
                        className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm font-bold text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentKeys.includes(
                            student.studentKey
                          )}
                          onChange={() => toggleStudent(student.studentKey)}
                          className="h-5 w-5"
                        />
                        <span className="min-w-0 truncate">
                          {student.grade}학년 {student.class}반{" "}
                          {student.studentNumber}번 {student.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={saveAssignment}
                disabled={isSaving}
                className="w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-yellow-500 disabled:opacity-60"
              >
                {isSaving ? "등록 중..." : "과제 등록"}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-md">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black">과제 목록</h2>
                  <div className="mt-2 inline-flex rounded-2xl bg-slate-100 p-1">
                    {[
                      { value: "active", label: "활성 과제" },
                      { value: "archived", label: "보관된 과제" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setAssignmentFilter(option.value as AssignmentFilter);
                          setSelectedAssignmentId("");
                          setDetail(null);
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                          assignmentFilter === option.value
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {isLoading && (
                  <span className="text-xs font-black text-slate-400">
                    불러오는 중...
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {visibleAssignments.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-black text-slate-500 md:col-span-2">
                    {assignmentFilter === "active"
                      ? "활성 과제가 없습니다."
                      : "보관된 과제가 없습니다."}
                  </div>
                ) : (
                  visibleAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`rounded-3xl border p-4 text-left transition ${
                        selectedAssignmentId === assignment.id
                          ? "border-yellow-300 bg-yellow-50"
                          : "border-slate-100 bg-slate-50 hover:bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAssignmentId(assignment.id)}
                        className="block w-full text-left"
                      >
                        <div className="text-lg font-black text-slate-800">
                          {assignment.title}
                        </div>
                        <div className="mt-2 text-sm font-bold text-slate-500">
                          {getStudentProgramLabel(assignment.program)} /{" "}
                          {assignment.school} / {assignment.targetTeachingClass}
                        </div>
                        <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                          제출 {assignment.submittedCount || 0}명 / 대상{" "}
                          {assignment.targetCount || 0}명
                        </div>
                      </button>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          disabled={processingAssignmentId === assignment.id}
                          onClick={() =>
                            changeAssignmentVisibility(
                              assignment,
                              assignment.isActive ? "archive" : "restore"
                            )
                          }
                          className={`rounded-2xl px-3 py-2 text-xs font-black transition disabled:opacity-50 ${
                            assignment.isActive
                              ? "bg-slate-800 text-white hover:bg-slate-700"
                              : "bg-emerald-500 text-white hover:bg-emerald-600"
                          }`}
                        >
                          {processingAssignmentId === assignment.id
                            ? "처리 중..."
                            : assignment.isActive
                              ? "과제 숨기기"
                              : "다시 공개"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedAssignment && detail && (
              <div className="rounded-3xl bg-white p-5 shadow-md">
                <h2 className="text-xl font-black">제출 현황</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {selectedAssignment.title}
                </p>

                <div className="mt-5 space-y-3">
                  {detail.targetStudents.map((student) => {
                    const submission = submissionByStudentKey.get(
                      student.studentKey
                    );

                    return (
                      <article
                        key={student.studentKey}
                        className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-base font-black text-slate-800">
                              {student.name}
                            </div>
                            <div className="mt-1 text-xs font-bold text-slate-500">
                              {student.grade}학년 {student.class}반{" "}
                              {student.studentNumber}번
                            </div>
                          </div>

                          <div
                            className={`rounded-full px-3 py-1 text-xs font-black ${getSubmissionStatusClassName(
                              submission
                            )}`}
                          >
                            {getSubmissionStatusLabel(submission)}
                          </div>
                        </div>

                        {submission && (
                          <div className="mt-4">
                            <div className="text-xs font-bold text-slate-500">
                              {formatDateTime(submission.submittedAt)}
                            </div>

                            {submission.status === "approved" && (
                              <div className="mt-3 rounded-2xl border border-yellow-100 bg-yellow-50 px-3 py-2 text-sm font-black text-yellow-800">
                                승인 완료 · 동엽전 1개 지급 완료
                              </div>
                            )}

                            {submission.status === "revision" && (
                              <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">
                                <div className="font-black">
                                  다시 해오기 요청
                                </div>
                                <div className="mt-1">
                                  {submission.revisionMessage ||
                                    DEFAULT_REVISION_MESSAGE}
                                </div>
                              </div>
                            )}

                            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                              {submission.files.map((file, index) => (
                                <a
                                  key={file.fileId}
                                  href={file.readUrl || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                >
                                  {file.readUrl ? (
                                    <Image
                                      src={file.readUrl}
                                      alt={`${student.name} 제출 사진 ${
                                        index + 1
                                      }`}
                                      width={240}
                                      height={180}
                                      unoptimized
                                      className="h-36 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-36 items-center justify-center text-xs font-black text-slate-400">
                                      사진 URL 없음
                                    </div>
                                  )}
                                  <div className="truncate px-3 py-2 text-xs font-bold text-slate-600">
                                    사진 {index + 1}
                                  </div>
                                </a>
                              ))}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {submission.status === "approved" &&
                              submission.rewardGranted ? (
                                <button
                                  type="button"
                                  disabled={
                                    processingSubmissionAction ===
                                    `${submission.id}:revoke`
                                  }
                                  onClick={() =>
                                    reviewSubmission(submission, "revoke")
                                  }
                                  className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-600 disabled:opacity-50"
                                >
                                  {processingSubmissionAction ===
                                  `${submission.id}:revoke`
                                    ? "처리 중..."
                                    : "승인 취소"}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={
                                      Boolean(processingSubmissionAction) ||
                                      submission.rewardGranted
                                    }
                                    onClick={() =>
                                      reviewSubmission(submission, "approve")
                                    }
                                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                                  >
                                    {processingSubmissionAction ===
                                    `${submission.id}:approve`
                                      ? "처리 중..."
                                      : "승인"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={Boolean(processingSubmissionAction)}
                                    onClick={() =>
                                      reviewSubmission(submission, "revision")
                                    }
                                    className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-black text-white transition hover:bg-orange-600 disabled:opacity-50"
                                  >
                                    {processingSubmissionAction ===
                                    `${submission.id}:revision`
                                      ? "처리 중..."
                                      : "다시 해오기"}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}


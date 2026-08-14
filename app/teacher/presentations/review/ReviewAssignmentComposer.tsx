"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "firebase/auth";

import type { AssignmentStudent } from "@/lib/assignments";
import { getStudentProgramValue } from "@/lib/programs";
import ReviewResultsPanel from "./ReviewResultsPanel";

type ReviewQuestion = {
  id: string;
  questionType?: "textbook" | "exam";
  bookNumber: string;
  lesson: string;
  prompt: string;
};

type Props = {
  user: User | null;
  questions: ReviewQuestion[];
};

const getTeachingClass = (student: AssignmentStudent) => {
  const match = String(student.grade || "").match(/\d+/);
  const grade = match ? Number(match[0]) : 0;

  if (grade >= 1 && grade <= 2) return "A반";
  if (grade >= 3 && grade <= 6) return "B반";
  return "";
};

async function teacherFetch(user: User, url: string, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(String(data?.error || "요청을 처리하지 못했습니다."));
  }

  return data;
}

export default function ReviewAssignmentComposer({ user, questions }: Props) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<AssignmentStudent[]>([]);
  const [title, setTitle] = useState("");
  const [school, setSchool] = useState("");
  const [teachingClass, setTeachingClass] = useState("A반");
  const [selectedStudentKeys, setSelectedStudentKeys] = useState<string[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isExamAssignment =
    questions.length > 0 &&
    questions.every((question) => question.questionType === "exam");

  useEffect(() => {
    if (!questions.length) {
      setTitle("");
      return;
    }

    setTitle(isExamAssignment ? "기출문제" : "교재문제");
  }, [isExamAssignment, questions]);

  useEffect(() => {
    if (!open || !user || students.length > 0 || isLoadingStudents) return;

    const loadStudents = async () => {
      setIsLoadingStudents(true);
      setErrorMessage("");

      try {
        const data = await teacherFetch(user, "/api/teacher/assignment-students");
        const historyStudents = Array.isArray(data?.students)
          ? data.students.filter(
              (student: AssignmentStudent) =>
                getStudentProgramValue(student.program) !== "boardgame"
            )
          : [];
        setStudents(historyStudents);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "학생 목록을 불러오지 못했습니다."
        );
      } finally {
        setIsLoadingStudents(false);
      }
    };

    void loadStudents();
  }, [isLoadingStudents, open, students.length, user]);

  const schoolOptions = useMemo(
    () =>
      Array.from(new Set(students.map((student) => student.school).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "ko")
      ),
    [students]
  );

  const targetStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.school === school && getTeachingClass(student) === teachingClass
      ),
    [school, students, teachingClass]
  );

  const allSelected =
    targetStudents.length > 0 &&
    targetStudents.every((student) =>
      selectedStudentKeys.includes(student.studentKey)
    );

  const selectSchool = (value: string) => {
    setSchool(value);
    setSelectedStudentKeys([]);
    setNotice("");
    setErrorMessage("");
  };

  const selectClass = (value: string) => {
    setTeachingClass(value);
    setSelectedStudentKeys([]);
    setNotice("");
    setErrorMessage("");
  };

  const toggleStudent = (studentKey: string) => {
    setSelectedStudentKeys((current) =>
      current.includes(studentKey)
        ? current.filter((key) => key !== studentKey)
        : [...current, studentKey]
    );
  };

  const toggleAll = () => {
    const targetKeys = targetStudents.map((student) => student.studentKey);
    setSelectedStudentKeys(allSelected ? [] : targetKeys);
  };

  const sendAssignment = async () => {
    if (!user || isSending) return;

    if (!title.trim() || !school || selectedStudentKeys.length === 0) {
      setErrorMessage("과제 제목과 대상 학생을 확인해 주세요.");
      return;
    }

    setIsSending(true);
    setNotice("");
    setErrorMessage("");

    try {
      const data = await teacherFetch(user, "/api/teacher/review-assignments", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          school,
          targetTeachingClass: teachingClass,
          targetStudentKeys: selectedStudentKeys,
          questionIds: questions.map((question) => question.id),
        }),
      });

      setNotice(
        `${isExamAssignment ? "기출문제" : "교재문제"}를 ${Number(
          data?.targetCount || selectedStudentKeys.length
        )}명에게 보냈습니다. 학생 화면에는 7일 동안 열립니다.`
      );
      setSelectedStudentKeys([]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "복습과제 발송에 실패했습니다."
      );
    } finally {
      setIsSending(false);
    }
  };

  let composerContent: React.ReactNode;

  if (questions.length === 0) {
    composerContent = (
      <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
        문제를 먼저 과제에 담아 주세요. 담은 순서가 학생에게 보이는 문제 번호가 됩니다.
      </div>
    );
  } else if (!open) {
    composerContent = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700"
      >
        다음: 과제 설정 →
      </button>
    );
  } else {
    composerContent = (
      <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-black text-slate-800">📨 과제 설정</div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              문제 {questions.length}개 · {isExamAssignment ? "기출문제" : "교재문제"} · 학생 화면에서 7일간 공개
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500"
          >
            접기
          </button>
        </div>

        <label className="mt-4 block text-sm font-black text-slate-700">
          과제 제목
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isExamAssignment ? "기출문제" : "교재문제"}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-black text-slate-700">
            학교
            <select
              value={school}
              disabled={isLoadingStudents}
              onChange={(event) => selectSchool(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
            >
              <option value="">
                {isLoadingStudents ? "학생 목록 불러오는 중..." : "학교 선택"}
              </option>
              {schoolOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="text-sm font-black text-slate-700">수업반</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {["A반", "B반"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectClass(item)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                    teachingClass === item
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {school && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-black text-slate-700">
                대상 학생 · {selectedStudentKeys.length}명 선택
              </div>
              {targetStudents.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
                >
                  {allSelected ? "전체 해제" : "전체 선택"}
                </button>
              )}
            </div>

            {targetStudents.length === 0 ? (
              <div className="py-5 text-center text-xs font-bold text-slate-400">
                이 학교의 {teachingClass} 학생이 없습니다.
              </div>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {targetStudents.map((student) => (
                  <label
                    key={student.studentKey}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentKeys.includes(student.studentKey)}
                      onChange={() => toggleStudent(student.studentKey)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-black text-slate-700">
                      {student.name}
                    </span>
                    <span className="ml-auto text-xs font-bold text-slate-400">
                      {student.grade}학년
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {notice && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
            {notice}
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          disabled={
            isSending ||
            !title.trim() ||
            !school ||
            selectedStudentKeys.length === 0
          }
          onClick={sendAssignment}
          className="mt-4 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-yellow-500 disabled:opacity-40"
        >
          {isSending
            ? "보내는 중..."
            : `학생에게 보내기 (${selectedStudentKeys.length}명)`}
        </button>
      </div>
    );
  }

  return (
    <>
      {composerContent}
      <ReviewResultsPanel user={user} />
    </>
  );
}

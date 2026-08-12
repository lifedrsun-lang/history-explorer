"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import ReviewAssignmentComposer from "./ReviewAssignmentComposer";

type QuestionType = "textbook" | "exam";
type ExamLevel = "" | "basic" | "advanced";

type ReviewQuestion = {
  id: string;
  questionType: QuestionType;
  examLevel: ExamLevel;
  examRound: string;
  examQuestionNumber: string;
  bookNumber: string;
  lesson: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  imageStoragePath: string;
  imageOriginalName: string;
  imageUrl: string;
};

type QuestionDraft = Omit<ReviewQuestion, "id">;

const makeEmptyDraft = (): QuestionDraft => ({
  questionType: "textbook",
  examLevel: "",
  examRound: "",
  examQuestionNumber: "",
  bookNumber: "",
  lesson: "",
  topic: "",
  prompt: "",
  options: ["", "", ""],
  correctIndex: 0,
  explanation: "",
  imageStoragePath: "",
  imageOriginalName: "",
  imageUrl: "",
});

const OPTION_LABELS = ["①", "②", "③", "④"];
const LESSON_OPTIONS = ["1차시", "2차시", "3차시", "4차시"];

function bookNumberValue(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function lessonValue(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function normalizeLessonFromTopic(topic: string) {
  const match = topic.trim().match(/^(\d+)\s*차시$/);
  return match ? `${match[1]}차시` : "";
}

function visibleTopic(question: ReviewQuestion) {
  const topic = question.topic.trim();
  if (!topic) return "";
  const normalized = normalizeLessonFromTopic(topic);
  return normalized && normalized === question.lesson ? "" : topic;
}

function questionTypeLabel(type: QuestionType) {
  return type === "exam" ? "기출" : "교재";
}

function examLevelLabel(level: ExamLevel) {
  if (level === "basic") return "기본";
  if (level === "advanced") return "심화";
  return "미지정";
}

function makeOptions(options: string[], count: number) {
  return Array.from({ length: count }, (_, index) => options[index] || "");
}

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

export default function ReviewQuestionBankPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(makeEmptyDraft());
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<"all" | QuestionType>("all");
  const [examLevelFilter, setExamLevelFilter] = useState<"all" | Exclude<ExamLevel, "">>("all");
  const [bookFilter, setBookFilter] = useState("all");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const optionCount = draft.questionType === "exam" ? 4 : 3;

  const isValid = useMemo(() => {
    if (!draft.bookNumber.trim()) return false;

    if (draft.questionType === "exam") {
      return (
        Boolean(draft.examLevel) &&
        Boolean(draft.imageStoragePath || draft.prompt.trim()) &&
        makeOptions(draft.options, 4).every((option) => option.trim())
      );
    }

    return (
      Boolean(draft.prompt.trim()) &&
      makeOptions(draft.options, 3).every((option) => option.trim())
    );
  }, [draft]);

  const bookOptions = useMemo(
    () =>
      Array.from(new Set(questions.map((q) => q.bookNumber).filter(Boolean))).sort(
        (a, b) => bookNumberValue(a) - bookNumberValue(b)
      ),
    [questions]
  );

  const filteredQuestions = useMemo(() => {
    return questions
      .filter((question) => {
        const typeMatch =
          questionTypeFilter === "all" || question.questionType === questionTypeFilter;
        const levelMatch =
          questionTypeFilter !== "exam" ||
          examLevelFilter === "all" ||
          question.examLevel === examLevelFilter;
        const bookMatch = bookFilter === "all" || question.bookNumber === bookFilter;
        const lessonMatch = lessonFilter === "all" || question.lesson === lessonFilter;
        return typeMatch && levelMatch && bookMatch && lessonMatch;
      })
      .sort((a, b) => {
        const bookDiff = bookNumberValue(a.bookNumber) - bookNumberValue(b.bookNumber);
        if (bookDiff !== 0) return bookDiff;
        const lessonDiff = lessonValue(a.lesson) - lessonValue(b.lesson);
        if (lessonDiff !== 0) return lessonDiff;
        return a.prompt.localeCompare(b.prompt, "ko");
      });
  }, [bookFilter, examLevelFilter, lessonFilter, questionTypeFilter, questions]);

  const selectedQuestions = useMemo(
    () =>
      selectedIds
        .map((id) => questions.find((question) => question.id === id))
        .filter((question): question is ReviewQuestion => Boolean(question)),
    [questions, selectedIds]
  );

  const fetchQuestions = async (user: User) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await teacherFetch(user, "/api/teacher/review-questions");
      setQuestions(Array.isArray(data?.questions) ? data.questions : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "문제은행을 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }
      setCurrentUser(user);
      setAuthChecking(false);
      void fetchQuestions(user);
    });
    return unsubscribe;
  }, [router]);

  const changeQuestionType = (questionType: QuestionType) => {
    setDraft((current) => ({
      ...current,
      questionType,
      examLevel: questionType === "exam" ? current.examLevel : "",
      examRound: questionType === "exam" ? current.examRound : "",
      examQuestionNumber: questionType === "exam" ? current.examQuestionNumber : "",
      options: makeOptions(current.options, questionType === "exam" ? 4 : 3),
      correctIndex:
        questionType === "exam"
          ? Math.min(current.correctIndex, 3)
          : Math.min(current.correctIndex, 2),
    }));
    setNotice("");
    setErrorMessage("");
  };

  const updateOption = (index: number, value: string) => {
    setDraft((current) => {
      const options = makeOptions(current.options, current.questionType === "exam" ? 4 : 3);
      options[index] = value;
      return { ...current, options };
    });
    setNotice("");
    setErrorMessage("");
  };

  const uploadImage = async (file: File | null) => {
    if (!file || !currentUser || isUploadingImage) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMessage("JPG, PNG, WEBP 사진만 올릴 수 있습니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("문제 사진은 10MB 이하로 올려 주세요.");
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage("");
    setNotice("");

    try {
      const token = await currentUser.getIdToken();
      const formData = new FormData();
      formData.append("image", file, file.name);
      const response = await fetch("/api/teacher/review-question-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data?.error || "문제 사진 업로드에 실패했습니다."));
      }
      setDraft((current) => ({
        ...current,
        imageStoragePath: String(data?.storagePath || ""),
        imageOriginalName: String(data?.originalName || file.name),
        imageUrl: String(data?.previewUrl || ""),
      }));
      setNotice("문제 사진을 올렸습니다. 보기와 정답을 입력한 뒤 문제 저장을 눌러 주세요.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "문제 사진 업로드에 실패했습니다."
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const startEditing = (question: ReviewQuestion) => {
    const lesson = question.lesson || normalizeLessonFromTopic(question.topic);
    const topic =
      lesson && normalizeLessonFromTopic(question.topic) === lesson
        ? ""
        : question.topic;

    setEditingId(question.id);
    setDraft({
      ...question,
      examLevel: question.examLevel || "",
      examRound: question.examRound || "",
      examQuestionNumber: question.examQuestionNumber || "",
      lesson,
      topic,
      options: makeOptions(question.options, question.questionType === "exam" ? 4 : 3),
      correctIndex: Math.min(
        question.correctIndex,
        question.questionType === "exam" ? 3 : 2
      ),
    });
    setNotice("");
    setErrorMessage("");
    window.setTimeout(() => {
      document
        .getElementById("review-question-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const resetEditor = () => {
    setEditingId(null);
    setDraft(makeEmptyDraft());
    setNotice("");
    setErrorMessage("");
  };

  const saveQuestion = async () => {
    if (!isValid || !currentUser || isSaving || isUploadingImage) return;
    setIsSaving(true);
    setNotice("");
    setErrorMessage("");
    const isEditing = Boolean(editingId);

    try {
      await teacherFetch(
        currentUser,
        editingId
          ? `/api/teacher/review-questions?id=${encodeURIComponent(editingId)}`
          : "/api/teacher/review-questions",
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify({
            questionType: draft.questionType,
            examLevel: draft.questionType === "exam" ? draft.examLevel : "",
            examRound: draft.questionType === "exam" ? draft.examRound.trim() : "",
            examQuestionNumber:
              draft.questionType === "exam" ? draft.examQuestionNumber.trim() : "",
            bookNumber: draft.bookNumber.trim(),
            lesson: draft.lesson.trim(),
            topic: draft.topic.trim(),
            prompt: draft.prompt.trim(),
            options: makeOptions(draft.options, optionCount).map((option) => option.trim()),
            correctIndex: draft.correctIndex,
            explanation: draft.explanation.trim(),
            imageStoragePath: draft.imageStoragePath,
            imageOriginalName: draft.imageOriginalName,
          }),
        }
      );
      setDraft(makeEmptyDraft());
      setEditingId(null);
      setNotice(isEditing ? "문제를 수정했습니다." : "문제를 문제은행에 저장했습니다.");
      await fetchQuestions(currentUser);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문제 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeQuestion = async (question: ReviewQuestion) => {
    if (!currentUser || !window.confirm("이 문제를 문제은행에서 삭제할까요?")) return;
    setErrorMessage("");
    try {
      await teacherFetch(
        currentUser,
        `/api/teacher/review-questions?id=${encodeURIComponent(question.id)}`,
        { method: "DELETE" }
      );
      setSelectedIds((current) => current.filter((id) => id !== question.id));
      if (editingId === question.id) resetEditor();
      setNotice("문제를 삭제했습니다.");
      await fetchQuestions(currentUser);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문제 삭제에 실패했습니다.");
    }
  };

  const addToAssignment = (questionId: string) => {
    setSelectedIds((current) =>
      current.includes(questionId) ? current : [...current, questionId]
    );
  };

  const removeFromAssignment = (questionId: string) => {
    setSelectedIds((current) => current.filter((id) => id !== questionId));
  };

  const moveSelected = (index: number, direction: -1 | 1) => {
    setSelectedIds((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  if (authChecking) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-3">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
          Checking teacher sign-in...
        </div>
      </main>
    );
  }

  if (!currentUser) return null;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800 md:p-5">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-black text-blue-600">복습문제 관리</div>
            <h1 className="mt-1 text-2xl font-black md:text-3xl">📝 문제은행</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              교재 문제는 3지선다, 한능검 기출은 기본·심화와 회차·문항을 함께 관리합니다.
            </p>
          </div>
          <Link
            href="/teacher/presentations"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-700"
          >
            ← 수업 PPT로 돌아가기
          </Link>
        </header>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
          <section
            id="review-question-editor"
            className="scroll-mt-4 rounded-3xl bg-white p-5 shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">
                  {editingId ? "문제 수정" : "문제 만들기"}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {draft.questionType === "exam"
                    ? "한능검 기본/심화 · 회차 · 문항 · 문제 사진 · 보기 ①~④를 등록합니다."
                    : "문제·보기 3개·정답을 입력합니다."}
                </p>
              </div>
              {editingId && (
                <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800">
                  수정 중
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <div className="text-sm font-black text-slate-700">문제 유형</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["textbook", "exam"] as QuestionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => changeQuestionType(type)}
                      className={`rounded-2xl border px-4 py-3 text-left font-black ${
                        draft.questionType === type
                          ? type === "exam"
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      [{questionTypeLabel(type)}]
                      <div className="mt-1 text-xs opacity-80">
                        {type === "exam" ? "한능검 기출 · 기본/심화 · 4지선다" : "교재 중심 퀴즈"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {draft.questionType === "exam" && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                  <div className="text-sm font-black text-violet-800">한능검 구분</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["basic", "advanced"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({ ...current, examLevel: level }))
                        }
                        className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                          draft.examLevel === level
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-violet-200 bg-white text-violet-700"
                        }`}
                      >
                        [{examLevelLabel(level)}]
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-xs font-black text-violet-800">
                      회차
                      <div className="mt-1 flex items-center rounded-2xl border border-violet-200 bg-white px-3">
                        <input
                          value={draft.examRound}
                          inputMode="numeric"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              examRound: event.target.value.replace(/[^0-9]/g, ""),
                            }))
                          }
                          placeholder="75"
                          className="min-w-0 flex-1 py-3 text-sm font-bold outline-none"
                        />
                        <span className="text-sm font-black text-violet-500">회</span>
                      </div>
                    </label>
                    <label className="text-xs font-black text-violet-800">
                      문항번호
                      <div className="mt-1 flex items-center rounded-2xl border border-violet-200 bg-white px-3">
                        <input
                          value={draft.examQuestionNumber}
                          inputMode="numeric"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              examQuestionNumber: event.target.value.replace(/[^0-9]/g, ""),
                            }))
                          }
                          placeholder="34"
                          className="min-w-0 flex-1 py-3 text-sm font-bold outline-none"
                        />
                        <span className="text-sm font-black text-violet-500">번</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-black text-slate-700">
                  호수
                  <input
                    value={draft.bookNumber}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, bookNumber: event.target.value }))
                    }
                    placeholder="예: 6호"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                  />
                </label>

                <div>
                  <div className="text-sm font-black text-slate-700">차시</div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {LESSON_OPTIONS.map((lesson, index) => (
                      <button
                        key={lesson}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, lesson }))}
                        className={`rounded-2xl border px-3 py-3 text-sm font-black ${
                          draft.lesson === lesson
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="text-sm font-black text-slate-700">
                진도 / 주제 (선택)
                <input
                  value={draft.topic}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, topic: event.target.value }))
                  }
                  placeholder="예: 도림~무왕"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>

              {draft.questionType === "exam" && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                  <div className="text-sm font-black text-violet-800">📷 한능검 문제 사진</div>
                  <p className="mt-1 text-xs font-bold text-violet-600">
                    JPG, PNG, WEBP · 10MB 이하 · 문제와 자료가 잘 보이게 올려 주세요.
                  </p>
                  <label className="mt-3 inline-flex cursor-pointer rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white">
                    {isUploadingImage
                      ? "사진 올리는 중..."
                      : draft.imageStoragePath
                        ? "사진 바꾸기"
                        : "문제 사진 선택"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={isUploadingImage}
                      onChange={(event) => void uploadImage(event.target.files?.[0] || null)}
                      className="sr-only"
                    />
                  </label>
                  {draft.imageUrl && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-violet-100 bg-white p-2">
                      <img
                        src={draft.imageUrl}
                        alt="기출문제 미리보기"
                        className="max-h-[420px] w-full object-contain"
                      />
                      <div className="mt-2 truncate px-2 text-xs font-bold text-slate-500">
                        {draft.imageOriginalName}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <label className="text-sm font-black text-slate-700">
                {draft.questionType === "exam"
                  ? "문제 / 지문 (선택 - 사진에 있으면 생략 가능)"
                  : "문제 / 지문"}
                <textarea
                  value={draft.prompt}
                  rows={draft.questionType === "exam" ? 2 : 4}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, prompt: event.target.value }))
                  }
                  placeholder={
                    draft.questionType === "exam"
                      ? "사진에 없는 보충 설명이 있을 때만 입력"
                      : "문제를 입력하세요."
                  }
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold leading-6 outline-none focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>

              <div>
                <div className="text-sm font-black text-slate-700">
                  보기와 정답 {draft.questionType === "exam" ? "(①~④)" : "(①~③)"}
                </div>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {draft.questionType === "exam"
                    ? "사진에 보기가 있어도 학생이 누를 수 있도록 보기 내용을 입력하고 정답을 체크하세요."
                    : "보기 내용을 입력하고 정답인 보기 왼쪽 동그라미를 체크하세요."}
                </p>

                <div className="mt-3 grid gap-3">
                  {makeOptions(draft.options, optionCount).map((option, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={draft.correctIndex === index}
                        onChange={() =>
                          setDraft((current) => ({ ...current, correctIndex: index }))
                        }
                        className="mt-3 h-5 w-5 shrink-0"
                        aria-label={`${index + 1}번 보기를 정답으로 선택`}
                      />
                      <span
                        className={`mt-2.5 w-7 shrink-0 text-base font-black ${
                          draft.questionType === "exam" ? "text-violet-600" : "text-blue-600"
                        }`}
                      >
                        {OPTION_LABELS[index]}
                      </span>
                      {draft.questionType === "exam" ? (
                        <textarea
                          value={option}
                          rows={2}
                          onChange={(event) => updateOption(index, event.target.value)}
                          placeholder={`${index + 1}번 보기 내용`}
                          className="min-w-0 flex-1 resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold leading-5 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                        />
                      ) : (
                        <input
                          value={option}
                          onChange={(event) => updateOption(index, event.target.value)}
                          placeholder={`${index + 1}번 보기`}
                          className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <label className="text-sm font-black text-slate-700">
                정답 해설 (선택)
                <textarea
                  value={draft.explanation}
                  rows={3}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, explanation: event.target.value }))
                  }
                  placeholder="정답 이유나 간단한 해설"
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold leading-6 outline-none"
                />
              </label>
            </div>

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

            <div className={`mt-5 grid gap-2 ${editingId ? "sm:grid-cols-[1fr_auto]" : ""}`}>
              <button
                type="button"
                disabled={!isValid || isSaving || isUploadingImage}
                onClick={() => void saveQuestion()}
                className="w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white disabled:opacity-40"
              >
                {isSaving ? "저장 중..." : editingId ? "수정 저장" : "문제은행에 저장"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetEditor}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-600"
                >
                  수정 취소
                </button>
              )}
            </div>
          </section>

          <div className="grid gap-4">
            <section className="rounded-3xl bg-white p-5 shadow-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">저장된 문제</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    유형·급수·호수·차시로 찾고 원하는 순서대로 과제에 담으세요.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="text-xs font-black text-slate-600">
                    유형
                    <select
                      value={questionTypeFilter}
                      onChange={(event) => {
                        const value = event.target.value as "all" | QuestionType;
                        setQuestionTypeFilter(value);
                        if (value !== "exam") setExamLevelFilter("all");
                      }}
                      className="ml-1 rounded-xl border border-slate-200 px-2 py-2 text-sm"
                    >
                      <option value="all">전체</option>
                      <option value="textbook">교재</option>
                      <option value="exam">기출</option>
                    </select>
                  </label>
                  {questionTypeFilter === "exam" && (
                    <label className="text-xs font-black text-slate-600">
                      급수
                      <select
                        value={examLevelFilter}
                        onChange={(event) =>
                          setExamLevelFilter(
                            event.target.value as "all" | Exclude<ExamLevel, "">
                          )
                        }
                        className="ml-1 rounded-xl border border-slate-200 px-2 py-2 text-sm"
                      >
                        <option value="all">전체</option>
                        <option value="basic">기본</option>
                        <option value="advanced">심화</option>
                      </select>
                    </label>
                  )}
                  <label className="text-xs font-black text-slate-600">
                    호수
                    <select
                      value={bookFilter}
                      onChange={(event) => setBookFilter(event.target.value)}
                      className="ml-1 rounded-xl border border-slate-200 px-2 py-2 text-sm"
                    >
                      <option value="all">전체</option>
                      {bookOptions.map((book) => (
                        <option key={book} value={book}>
                          {book}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-black text-slate-600">
                    차시
                    <select
                      value={lessonFilter}
                      onChange={(event) => setLessonFilter(event.target.value)}
                      className="ml-1 rounded-xl border border-slate-200 px-2 py-2 text-sm"
                    >
                      <option value="all">전체</option>
                      {LESSON_OPTIONS.map((lesson) => (
                        <option key={lesson} value={lesson}>
                          {lesson}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {isLoading ? (
                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-black text-slate-500">
                  문제은행을 불러오는 중입니다...
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-black text-slate-500">
                  선택한 조건에 저장된 문제가 없습니다.
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {filteredQuestions.map((question) => {
                    const selectedOrder = selectedIds.indexOf(question.id);
                    const isSelected = selectedOrder >= 0;
                    const topic = visibleTopic(question);
                    const cardOptionCount = question.questionType === "exam" ? 4 : 3;
                    const cardOptions = makeOptions(question.options, cardOptionCount);

                    return (
                      <article
                        key={question.id}
                        className={`rounded-2xl border p-4 ${
                          isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-black text-blue-600">
                            <span
                              className={`rounded-full px-2 py-1 ${
                                question.questionType === "exam"
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              [{questionTypeLabel(question.questionType)}]
                            </span>
                            {question.questionType === "exam" && (
                              <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-700">
                                [{examLevelLabel(question.examLevel || "")}]
                              </span>
                            )}
                            <span>
                              {question.bookNumber}
                              {question.lesson ? ` · ${question.lesson}` : ""}
                              {topic ? ` · ${topic}` : ""}
                            </span>
                            {question.questionType === "exam" &&
                              (question.examRound || question.examQuestionNumber) && (
                                <span className="text-violet-600">
                                  {question.examRound ? `${question.examRound}회` : ""}
                                  {question.examRound && question.examQuestionNumber ? " · " : ""}
                                  {question.examQuestionNumber
                                    ? `${question.examQuestionNumber}번`
                                    : ""}
                                </span>
                              )}
                          </div>
                          {isSelected && (
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-black text-white">
                              과제 {selectedOrder + 1}번
                            </span>
                          )}
                        </div>

                        {question.imageUrl && (
                          <img
                            src={question.imageUrl}
                            alt="기출문제"
                            className="mt-3 max-h-56 w-full rounded-xl bg-white object-contain"
                          />
                        )}

                        <p className="mt-2 text-sm font-black leading-6 text-slate-800">
                          {question.prompt ||
                            (question.questionType === "exam" ? "한능검 기출문제" : "")}
                        </p>

                        <div className="mt-3 grid gap-1.5 text-xs font-bold text-slate-600">
                          {cardOptions.map((option, index) => (
                            <div
                              key={index}
                              className={
                                index === question.correctIndex ? "text-emerald-700" : ""
                              }
                            >
                              {OPTION_LABELS[index]} {option}
                              {index === question.correctIndex ? " ✓ 정답" : ""}
                            </div>
                          ))}
                        </div>

                        {question.explanation && (
                          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-500">
                            해설: {question.explanation}
                          </p>
                        )}

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            disabled={isSelected}
                            onClick={() => addToAssignment(question.id)}
                            className="rounded-xl bg-blue-600 px-2 py-2.5 text-xs font-black text-white disabled:opacity-40"
                          >
                            {isSelected ? `${selectedOrder + 1}번 선택됨` : "과제에 담기"}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditing(question)}
                            className="rounded-xl border border-amber-200 bg-white px-2 py-2.5 text-xs font-black text-amber-700"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeQuestion(question)}
                            className="rounded-xl border border-red-100 bg-white px-2 py-2.5 text-xs font-black text-red-500"
                          >
                            삭제
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">과제 구성 미리보기</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    담은 순서가 학생에게 보이는 문제 번호입니다.
                  </p>
                </div>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600"
                  >
                    전체 비우기
                  </button>
                )}
              </div>

              {selectedQuestions.length === 0 ? (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-black text-slate-500">
                  위 문제은행에서 문제를 과제에 담아 주세요.
                </div>
              ) : (
                <div className="mt-5 grid gap-2">
                  {selectedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-blue-600">
                          [{questionTypeLabel(question.questionType)}]
                          {question.questionType === "exam" && question.examLevel
                            ? ` [${examLevelLabel(question.examLevel)}]`
                            : ""} {question.bookNumber}
                          {question.lesson ? ` · ${question.lesson}` : ""}
                          {question.questionType === "exam" && question.examRound
                            ? ` · ${question.examRound}회`
                            : ""}
                          {question.questionType === "exam" && question.examQuestionNumber
                            ? ` · ${question.examQuestionNumber}번`
                            : ""}
                        </div>
                        <p className="truncate text-sm font-black text-slate-800">
                          {question.prompt || "한능검 기출문제"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveSelected(index, -1)}
                          className="rounded-lg border bg-white px-2 py-1.5 text-xs font-black disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === selectedQuestions.length - 1}
                          onClick={() => moveSelected(index, 1)}
                          className="rounded-lg border bg-white px-2 py-1.5 text-xs font-black disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromAssignment(question.id)}
                          className="rounded-lg border border-red-100 bg-white px-2 py-1.5 text-xs font-black text-red-500"
                        >
                          빼기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ReviewAssignmentComposer user={currentUser} questions={selectedQuestions} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

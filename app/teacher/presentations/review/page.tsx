"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

type ReviewQuestion = {
  id: string;
  bookNumber: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type QuestionDraft = {
  bookNumber: string;
  topic: string;
  prompt: string;
  options: [string, string, string];
  correctIndex: number;
  explanation: string;
};

const EMPTY_DRAFT: QuestionDraft = {
  bookNumber: "",
  topic: "",
  prompt: "",
  options: ["", "", ""],
  correctIndex: 0,
  explanation: "",
};

const OPTION_LABELS = ["①", "②", "③"];

function bookNumberValue(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export default function ReviewQuestionBankPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(EMPTY_DRAFT);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bookFilter, setBookFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isValid = useMemo(
    () =>
      draft.bookNumber.trim().length > 0 &&
      draft.prompt.trim().length > 0 &&
      draft.options.every((option) => option.trim().length > 0),
    [draft]
  );

  const bookOptions = useMemo(() => {
    return Array.from(
      new Set(questions.map((question) => question.bookNumber).filter(Boolean))
    ).sort((a, b) => bookNumberValue(a) - bookNumberValue(b));
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const filtered =
      bookFilter === "all"
        ? questions
        : questions.filter((question) => question.bookNumber === bookFilter);

    return [...filtered].sort((a, b) => {
      const bookDiff = bookNumberValue(a.bookNumber) - bookNumberValue(b.bookNumber);
      if (bookDiff !== 0) return bookDiff;
      return a.prompt.localeCompare(b.prompt, "ko");
    });
  }, [bookFilter, questions]);

  const selectedQuestions = useMemo(
    () =>
      selectedIds
        .map((id) => questions.find((question) => question.id === id))
        .filter((question): question is ReviewQuestion => Boolean(question)),
    [questions, selectedIds]
  );

  const fetchQuestions = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const snapshot = await getDocs(
        query(collection(db, "reviewQuestions"), orderBy("createdAt", "desc"))
      );

      setQuestions(
        snapshot.docs.map((item) => {
          const data = item.data();
          const rawOptions = Array.isArray(data?.options) ? data.options : [];

          return {
            id: item.id,
            bookNumber: String(data?.bookNumber || ""),
            topic: String(data?.topic || ""),
            prompt: String(data?.prompt || ""),
            options: rawOptions.slice(0, 3).map((option) => String(option || "")),
            correctIndex: Number(data?.correctIndex || 0),
            explanation: String(data?.explanation || ""),
          };
        })
      );
    } catch (error) {
      console.error("Review question load failed:", error);
      setErrorMessage(
        "문제은행을 불러오지 못했습니다. Firestore 권한 상태를 함께 확인해 주세요."
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

      setAuthorized(true);
      setCurrentUser(user);
      setAuthChecking(false);
      fetchQuestions();
    });

    return unsubscribe;
  }, [router]);

  const updateOption = (index: number, value: string) => {
    setDraft((current) => {
      const options: [string, string, string] = [...current.options];
      options[index] = value;
      return { ...current, options };
    });
    setNotice("");
    setErrorMessage("");
  };

  const saveQuestion = async () => {
    if (!isValid || !currentUser || isSaving) return;

    setIsSaving(true);
    setNotice("");
    setErrorMessage("");

    try {
      await addDoc(collection(db, "reviewQuestions"), {
        schemaVersion: 1,
        bookNumber: draft.bookNumber.trim(),
        topic: draft.topic.trim(),
        prompt: draft.prompt.trim(),
        options: draft.options.map((option) => option.trim()),
        correctIndex: draft.correctIndex,
        explanation: draft.explanation.trim(),
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setDraft(EMPTY_DRAFT);
      setNotice("문제를 문제은행에 저장했습니다.");
      await fetchQuestions();
    } catch (error) {
      console.error("Review question save failed:", error);
      setErrorMessage(
        "문제 저장에 실패했습니다. Firestore 권한 상태를 함께 확인해 주세요."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeQuestion = async (question: ReviewQuestion) => {
    const confirmed = window.confirm("이 문제를 문제은행에서 삭제할까요?");
    if (!confirmed) return;

    setErrorMessage("");
    setNotice("");

    try {
      await deleteDoc(doc(db, "reviewQuestions", question.id));
      setSelectedIds((current) => current.filter((id) => id !== question.id));
      setNotice("문제를 삭제했습니다.");
      await fetchQuestions();
    } catch (error) {
      console.error("Review question delete failed:", error);
      setErrorMessage("문제 삭제에 실패했습니다.");
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
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-3 text-slate-800">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
          Checking teacher sign-in...
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800 md:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-black text-blue-600">복습문제 기본 틀</div>
            <h1 className="mt-1 text-2xl font-black md:text-3xl">📝 문제은행</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              문제와 보기를 입력하고 정답 번호만 체크해 저장합니다.
            </p>
          </div>
          <Link
            href="/teacher/presentations"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            ← 수업 PPT로 돌아가기
          </Link>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
          <section className="rounded-3xl bg-white p-5 shadow-md">
            <h2 className="text-xl font-black">문제 만들기</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              객관식 3지선다 기본형입니다. 이미지 문제는 다음 단계에서 추가할 수 있습니다.
            </p>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-black text-slate-700">
                  호수
                  <input
                    type="text"
                    value={draft.bookNumber}
                    placeholder="예: 6호"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        bookNumber: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                  />
                </label>

                <label className="text-sm font-black text-slate-700">
                  진도 / 주제 (선택)
                  <input
                    type="text"
                    value={draft.topic}
                    placeholder="예: 도림~무왕"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        topic: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                  />
                </label>
              </div>

              <label className="text-sm font-black text-slate-700">
                문제 / 지문
                <textarea
                  value={draft.prompt}
                  rows={4}
                  placeholder="예: 고구려의 장수왕이 백제를 속이기 위해 보낸 사람은 누구일까요?"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      prompt: event.target.value,
                    }))
                  }
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold leading-6 outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>

              <div>
                <div className="text-sm font-black text-slate-700">보기와 정답</div>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  정답인 보기 왼쪽의 동그라미를 체크하세요.
                </p>

                <div className="mt-3 grid gap-3">
                  {draft.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={draft.correctIndex === index}
                        onChange={() =>
                          setDraft((current) => ({
                            ...current,
                            correctIndex: index,
                          }))
                        }
                        className="h-5 w-5 shrink-0"
                        aria-label={`${index + 1}번 보기를 정답으로 선택`}
                      />
                      <span className="w-7 shrink-0 text-base font-black text-blue-600">
                        {OPTION_LABELS[index]}
                      </span>
                      <input
                        type="text"
                        value={option}
                        placeholder={`${index + 1}번 보기`}
                        onChange={(event) => updateOption(index, event.target.value)}
                        className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <label className="text-sm font-black text-slate-700">
                정답 해설 (선택)
                <textarea
                  value={draft.explanation}
                  rows={3}
                  placeholder="예: 도림은 장수왕이 백제를 흔들기 위해 보낸 승려입니다."
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      explanation: event.target.value,
                    }))
                  }
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold leading-6 outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
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

            <button
              type="button"
              disabled={!isValid || isSaving}
              onClick={saveQuestion}
              className="mt-5 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-yellow-500 disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "문제은행에 저장"}
            </button>
          </section>

          <div className="grid gap-4">
            <section className="rounded-3xl bg-white p-5 shadow-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">저장된 문제</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    과제로 낼 문제를 원하는 순서대로 눌러 주세요.
                  </p>
                </div>

                <label className="text-sm font-black text-slate-700">
                  호수 보기
                  <select
                    value={bookFilter}
                    onChange={(event) => setBookFilter(event.target.value)}
                    className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                  >
                    <option value="all">전체</option>
                    {bookOptions.map((book) => (
                      <option key={book} value={book}>
                        {book}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {isLoading && (
                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-black text-slate-500">
                  문제은행을 불러오는 중입니다...
                </div>
              )}

              {!isLoading && filteredQuestions.length === 0 && (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-black text-slate-500">
                  저장된 문제가 없습니다. 왼쪽에서 첫 문제를 만들어 보세요.
                </div>
              )}

              {!isLoading && filteredQuestions.length > 0 && (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {filteredQuestions.map((question) => {
                    const selectedOrder = selectedIds.indexOf(question.id);
                    const isSelected = selectedOrder >= 0;

                    return (
                      <article
                        key={question.id}
                        className={`rounded-2xl border p-4 ${
                          isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-black text-blue-600">
                            {question.bookNumber}
                            {question.topic ? ` · ${question.topic}` : ""}
                          </div>
                          {isSelected && (
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-black text-white">
                              과제 {selectedOrder + 1}번
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm font-black leading-6 text-slate-800">
                          {question.prompt}
                        </p>

                        <div className="mt-3 grid gap-1.5 text-xs font-bold text-slate-600">
                          {question.options.map((option, index) => (
                            <div
                              key={index}
                              className={
                                index === question.correctIndex
                                  ? "text-emerald-700"
                                  : ""
                              }
                            >
                              {OPTION_LABELS[index]} {option}
                              {index === question.correctIndex ? "  ✓ 정답" : ""}
                            </div>
                          ))}
                        </div>

                        {question.explanation && (
                          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-500">
                            해설: {question.explanation}
                          </p>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={isSelected}
                            onClick={() => addToAssignment(question.id)}
                            className="rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white enabled:hover:bg-blue-700 disabled:opacity-40"
                          >
                            {isSelected ? `${selectedOrder + 1}번 선택됨` : "과제에 담기"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(question)}
                            className="rounded-xl border border-red-100 bg-white px-3 py-2.5 text-xs font-black text-red-500 hover:bg-red-50"
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">과제 구성 미리보기</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    클릭한 순서가 학생에게 보일 문제 번호가 됩니다.
                  </p>
                </div>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100"
                  >
                    전체 비우기
                  </button>
                )}
              </div>

              {selectedQuestions.length === 0 ? (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-black text-slate-500">
                  위 문제은행에서 문제를 클릭하면 여기에 1번부터 순서대로 쌓입니다.
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
                          {question.bookNumber}
                          {question.topic ? ` · ${question.topic}` : ""}
                        </div>
                        <p className="truncate text-sm font-black text-slate-800">
                          {question.prompt}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveSelected(index, -1)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-black disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === selectedQuestions.length - 1}
                          onClick={() => moveSelected(index, 1)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-black disabled:opacity-30"
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

              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                현재는 기본 틀 확인 단계입니다. 다음 단계에서 과제 제목·대상 학교/반/학생 지정,
                백제 배경 팝업, 학생에게 보내기, 복습 완료 기록을 연결합니다.
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

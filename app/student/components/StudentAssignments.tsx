"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AssignmentSummary,
  HOMEWORK_ALLOWED_CONTENT_TYPES,
  HOMEWORK_MAX_FILE_SIZE,
  HOMEWORK_MAX_FILES,
  StudentCollection,
  isAllowedStudentCollection,
  validateHomeworkPhotoFile,
} from "@/lib/assignments";

type Props = {
  student: StudentLike;
};

type StudentLike = {
  id?: unknown;
  collectionName?: unknown;
  password?: unknown;
};

type UploadState = {
  isUploading: boolean;
  message: string;
  error: string;
};

const COMPRESSED_MAX_SIDE = 1200;
const COMPRESSED_TARGET_SIZE = 300 * 1024;
const COMPRESSED_INITIAL_QUALITY = 0.82;
const COMPRESSED_MIN_QUALITY = 0.62;

const formatDueDate = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}월 ${date.getDate()}일까지`;
};

const formatFileSize = (size: number) => {
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
};

const DEFAULT_REVISION_MESSAGE =
  "선생님이 과제를 다시 확인해 달라고 요청했어요.";

const getAssignmentStatusLabel = (assignment: AssignmentSummary) => {
  const status = assignment.currentSubmission?.status;

  if (status === "approved") {
    return "승인 완료";
  }

  if (status === "revision") {
    return "다시 해오기";
  }

  if (status === "submitted") {
    return "선생님 확인 중";
  }

  return "";
};

const getAssignmentStatusClassName = (assignment: AssignmentSummary) => {
  const status = assignment.currentSubmission?.status;

  if (status === "approved") {
    return "bg-yellow-100 text-yellow-800";
  }

  if (status === "revision") {
    return "bg-orange-100 text-orange-700";
  }

  return "bg-emerald-100 text-emerald-700";
};

const canvasToJpegBlob = (canvas: HTMLCanvasElement, quality: number) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("사진 압축에 실패했습니다."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
};

const loadBitmapFromFile = async (file: File) => {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, {
      imageOrientation: "from-image",
    } as ImageBitmapOptions);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("사진을 불러오지 못했습니다."));
      img.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const compressPhoto = async (file: File) => {
  const source = await loadBitmapFromFile(file);
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  const scale = Math.min(
    1,
    COMPRESSED_MAX_SIDE / Math.max(sourceWidth, sourceHeight)
  );
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("사진 압축을 준비하지 못했습니다.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  if ("close" in source && typeof source.close === "function") {
    source.close();
  }

  let quality = COMPRESSED_INITIAL_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);

  while (blob.size > COMPRESSED_TARGET_SIZE && quality > COMPRESSED_MIN_QUALITY) {
    quality = Math.max(COMPRESSED_MIN_QUALITY, quality - 0.08);
    blob = await canvasToJpegBlob(canvas, quality);
  }

  return new File([blob], file.name, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};

const getStudentCollection = (student: StudentLike): StudentCollection => {
  const collectionName = String(student?.collectionName || "students");

  return isAllowedStudentCollection(collectionName) ? collectionName : "students";
};

export default function StudentAssignments({ student }: Props) {
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [uploadState, setUploadState] = useState<Record<string, UploadState>>({});

  const studentId = String(student?.id || "");
  const studentCollection = getStudentCollection(student);
  const studentPassword = String(student?.password || "");

  const getStudentAuthBody = useCallback(() => {
    return {
      studentId,
      studentCollection,
      studentPassword,
    };
  }, [studentCollection, studentId, studentPassword]);

  const loadAssignments = useCallback(async () => {
    if (!studentId || !studentPassword) {
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/student/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getStudentAuthBody()),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "과제를 불러오지 못했습니다.");
      }

      setAssignments(data.assignments || []);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "과제를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [getStudentAuthBody, studentId, studentPassword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAssignments();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadAssignments]);

  const setAssignmentState = (
    assignmentId: string,
    nextState: Partial<UploadState>
  ) => {
    setUploadState((current) => ({
      ...current,
      [assignmentId]: (() => {
        const previous = current[assignmentId];

        return {
          isUploading:
            nextState.isUploading ?? previous?.isUploading ?? false,
          message: nextState.message ?? previous?.message ?? "",
          error: nextState.error ?? previous?.error ?? "",
        };
      })(),
    }));
  };

  const handleFileChange = (assignmentId: string, files: FileList | null) => {
    const nextFiles = Array.from(files || []);

    if (nextFiles.length > HOMEWORK_MAX_FILES) {
      setAssignmentState(assignmentId, {
        error: `사진은 최대 ${HOMEWORK_MAX_FILES}장까지 제출할 수 있습니다.`,
        message: "",
      });
      return;
    }

    const invalidMessage = nextFiles
      .map((file) =>
        validateHomeworkPhotoFile({
          name: file.name,
          type: file.type,
          size: file.size,
        })
      )
      .find(Boolean);

    if (invalidMessage) {
      setAssignmentState(assignmentId, {
        error: invalidMessage,
        message: "",
      });
      return;
    }

    setSelectedFiles((current) => ({
      ...current,
      [assignmentId]: nextFiles,
    }));
    setAssignmentState(assignmentId, {
      error: "",
      message: "",
    });
  };

  const submitAssignment = async (assignment: AssignmentSummary) => {
    const files = selectedFiles[assignment.id] || [];

    if (files.length === 0) {
      setAssignmentState(assignment.id, {
        error: "제출할 사진을 선택해 주세요.",
      });
      return;
    }

    setAssignmentState(assignment.id, {
      isUploading: true,
      message: "사진을 압축하는 중...",
      error: "",
    });

    try {
      const compressedFiles = await Promise.all(files.map(compressPhoto));
      const authBody = getStudentAuthBody();
      const formData = new FormData();

      formData.append("studentId", authBody.studentId);
      formData.append("studentCollection", authBody.studentCollection);
      formData.append("studentPassword", authBody.studentPassword);

      compressedFiles.forEach((file) => {
        formData.append("photos", file, file.name);
      });

      setAssignmentState(assignment.id, {
        message: "사진을 제출하는 중...",
      });

      const submitResponse = await fetch(
        `/api/student/assignments/${assignment.id}/submit`,
        {
          method: "POST",
          body: formData,
        }
      );
      const submitData = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(
          submitData?.error || "사진 제출에 실패했습니다. 다시 시도해 주세요."
        );
      }

      setSelectedFiles((current) => ({
        ...current,
        [assignment.id]: [],
      }));
      setAssignmentState(assignment.id, {
        isUploading: false,
        message: "과제를 제출했습니다. 선생님 확인을 기다려 주세요.",
        error: "",
      });
      await loadAssignments();
    } catch (error) {
      setAssignmentState(assignment.id, {
        isUploading: false,
        message: "",
        error:
          error instanceof Error
            ? error.message
            : "사진 제출에 실패했습니다. 다시 시도해 주세요.",
      });
    }
  };

  if (!loading && !loadError && assignments.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-2xl font-black text-slate-800">나의 과제</div>
        {loading && (
          <div className="text-xs font-black text-emerald-700">
            불러오는 중...
          </div>
        )}
      </div>

      {loadError && (
        <div className="mt-3 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-600">
          {loadError}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {assignments.map((assignment) => {
          const files = selectedFiles[assignment.id] || [];
          const state = uploadState[assignment.id] || {
            isUploading: false,
            message: "",
            error: "",
          };
          const currentSubmission = assignment.currentSubmission;
          const statusLabel = getAssignmentStatusLabel(assignment);
          const canSubmit = currentSubmission?.status !== "approved";

          return (
            <article
              key={assignment.id}
              className="rounded-[24px] border border-white/80 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-black leading-snug text-slate-800">
                    {assignment.title}
                  </div>
                  {assignment.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-relaxed text-slate-600">
                      {assignment.description}
                    </p>
                  )}
                  {assignment.dueAt && (
                    <div className="mt-2 text-xs font-black text-emerald-700">
                      {formatDueDate(assignment.dueAt)}
                    </div>
                  )}
                </div>

                {statusLabel && (
                  <div
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${getAssignmentStatusClassName(
                      assignment
                    )}`}
                  >
                    {statusLabel}
                  </div>
                )}
              </div>

              {currentSubmission?.status === "revision" && (
                <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-3 py-3 text-sm font-bold text-orange-700">
                  <div className="font-black">다시 해오기</div>
                  <div className="mt-1">
                    {currentSubmission.revisionMessage ||
                      DEFAULT_REVISION_MESSAGE}
                  </div>
                </div>
              )}

              {currentSubmission?.status === "approved" && (
                <div className="mt-4 rounded-2xl border border-yellow-100 bg-yellow-50 px-3 py-3 text-sm font-black text-yellow-800">
                  과제가 승인되었습니다. 동엽전 1개가 지급되었어요.
                </div>
              )}

              {canSubmit && (
                <div className="mt-4">
                  <label className="inline-flex cursor-pointer rounded-2xl bg-slate-800 px-4 py-3 text-sm font-black text-white">
                    사진 선택
                    <input
                      type="file"
                      accept={HOMEWORK_ALLOWED_CONTENT_TYPES.join(",")}
                      multiple
                      disabled={state.isUploading}
                      onChange={(event) =>
                        handleFileChange(assignment.id, event.target.files)
                      }
                      className="sr-only"
                    />
                  </label>

                  <div className="mt-2 text-xs font-bold text-slate-500">
                    JPG, PNG, WEBP / 최대 {HOMEWORK_MAX_FILES}장 / 파일당{" "}
                    {formatFileSize(HOMEWORK_MAX_FILE_SIZE)}
                  </div>
                </div>
              )}

              {files.length > 0 && (
                <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-xs font-black text-slate-500">
                    선택한 사진
                  </div>
                  <div className="mt-2 space-y-1">
                    {files.map((file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="truncate text-sm font-bold text-slate-700"
                      >
                        {file.name} ({formatFileSize(file.size)})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state.error && (
                <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
                  {state.error}
                </div>
              )}

              {state.message && (
                <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                  {state.message}
                </div>
              )}

              {canSubmit && (
                <button
                  type="button"
                  disabled={state.isUploading}
                  onClick={() => submitAssignment(assignment)}
                  className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-sm transition enabled:hover:bg-emerald-600 disabled:opacity-60"
                >
                  {state.isUploading
                    ? "제출 중..."
                    : currentSubmission?.status === "revision"
                      ? "사진 다시 제출하기"
                      : "제출하기"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

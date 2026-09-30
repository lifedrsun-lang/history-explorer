import type { HomeworkUploadTarget } from "./homeworkPhoto";

type StudentAuth = { studentId: string; studentCollection: string; studentPassword: string };
const SUBMIT_ERROR = "사진 제출에 실패했습니다. 다시 시도해 주세요.";

export const homeworkUploadError = (error: unknown) =>
  error instanceof Error && /[가-힣]/.test(error.message) ? error.message : SUBMIT_ERROR;

const readResponse = async (response: Response) => {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(homeworkUploadError(new Error(data?.error || "")));
  return data;
};

export const submitHomeworkPhotos = async (assignmentId: string, files: File[], auth: StudentAuth) => {
  const uploadUrl = `/api/student/assignments/${assignmentId}/photo-upload`;
  let attemptId = "";
  let targets: HomeworkUploadTarget[] = [];
  let submitted = false;
  try {
    const prepared = await readResponse(await fetch(uploadUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...auth, files: files.map(({ name, type, size }) => ({ name, type, size })) }),
    }));
    attemptId = prepared.attemptId;
    targets = prepared.targets;
    if (!Array.isArray(targets) || targets.length !== files.length) throw new Error(SUBMIT_ERROR);
    for (let i = 0; i < files.length; i++) {
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", files[i], files[i].name);
      const response = await fetch(targets[i].signedUrl, { method: "PUT", body: form });
      // Storage errors are diagnostic data, not user-facing messages.
      if (!response.ok) throw new Error(SUBMIT_ERROR);
    }
    await readResponse(await fetch(`/api/student/assignments/${assignmentId}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...auth, attemptId, photos: files.map((file, i) => ({
        storagePath: targets[i].storagePath, name: file.name, type: file.type, size: file.size,
      })) }),
    }));
    submitted = true;
  } catch (error) {
    throw new Error(homeworkUploadError(error));
  } finally {
    // Never delete final submission files, even if the final response was lost.
    if (!submitted && attemptId && Array.isArray(targets) && targets.length) {
      await fetch(uploadUrl, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...auth, attemptId, paths: targets.map((target) => target.storagePath) }),
      }).catch(() => undefined);
    }
  }
};

export const HELLO_MAPLE_MISSIONS_COLLECTION = "helloMapleMissions";

export type HelloMapleMissionTargetType = "all" | "selected";

export type HelloMapleMissionSummary = {
  id: string;
  title: string;
  url: string;
  targetType: HelloMapleMissionTargetType;
  targetStudentIds: string[];
  sortOrder: number;
  isPublished: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type HelloMapleMissionStudent = {
  id: string;
  name: string;
  school: string;
  grade: string;
  studentClass: string;
};

export const normalizeHelloMapleMissionText = (value: unknown) =>
  String(value || "").trim();

export const normalizeHelloMapleMissionTargetType = (
  value: unknown
): HelloMapleMissionTargetType =>
  value === "selected" ? "selected" : "all";

export const normalizeHelloMapleMissionStudentIds = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeHelloMapleMissionText(item))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 500);
};

export const normalizeHelloMapleMissionSortOrder = (value: unknown) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(9999, Math.trunc(parsed)));
};

export const isAllowedHelloMapleUrl = (value: unknown) => {
  const text = normalizeHelloMapleMissionText(value);

  try {
    const url = new URL(text);
    const hostname = url.hostname.toLowerCase();

    return (
      url.protocol === "https:" &&
      (hostname === "hellomaple.org" || hostname.endsWith(".hellomaple.org"))
    );
  } catch {
    return false;
  }
};

export const serializeHelloMapleMissionDate = (value: unknown) => {
  if (!value) {
    return null;
  }

  const timestamp = value as {
    toDate?: () => Date;
    seconds?: number;
  };

  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof timestamp.seconds === "number") {
    return new Date(timestamp.seconds * 1000).toISOString();
  }

  return null;
};

export const serializeHelloMapleMission = (
  id: string,
  data: Record<string, unknown>
): HelloMapleMissionSummary => ({
  id,
  title: normalizeHelloMapleMissionText(data.title),
  url: normalizeHelloMapleMissionText(data.url),
  targetType: normalizeHelloMapleMissionTargetType(data.targetType),
  targetStudentIds: normalizeHelloMapleMissionStudentIds(data.targetStudentIds),
  sortOrder: normalizeHelloMapleMissionSortOrder(data.sortOrder),
  isPublished: data.isPublished === true,
  createdAt: serializeHelloMapleMissionDate(data.createdAt),
  updatedAt: serializeHelloMapleMissionDate(data.updatedAt),
});

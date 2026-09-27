import { isDeepStrictEqual } from "node:util";

export const Q2_ORPHAN_LINKS = [
  {
    legacyId: "history_saesol_q2_최재용",
    legacyName: "최재용",
    studentId: "3ITcYH23ZiFk6MIGZiMK",
    currentName: "최재웅",
    grade: 3,
    schoolClass: 1,
  },
  {
    legacyId: "history_saesol_q2_경세아",
    legacyName: "경세아",
    studentId: "L9mpzK0EAO5g4ZGWpDiL",
    currentName: "정세아",
    grade: 6,
    schoolClass: 1,
  },
  {
    legacyId: "history_saesol_q2_허다은",
    legacyName: "허다은",
    studentId: "oQeGjnCDSQAYXaqjP7Zs",
    currentName: "허다온",
    grade: 3,
    schoolClass: 1,
  },
] as const;

export type Q2OrphanLink = (typeof Q2_ORPHAN_LINKS)[number];

export type StoredDocument = {
  id: string;
  data: Record<string, unknown>;
};

export type RelinkDocumentUpdate = {
  collection: "teacher_fee_contracts" | "teacher_textbook_receipts";
  id: string;
  fields: Record<string, unknown>;
};

export type RelinkMappingPlan = {
  legacyId: string;
  legacyName: string;
  studentId: string;
  currentName: string;
  legacyOccurrences: number;
  targetOccurrences: number;
  locations: string[];
  status: "will_relink" | "already_linked" | "invalid";
};

export type Q2OrphanRelinkPlan = {
  ready: boolean;
  changedMappingCount: number;
  changedDocumentCount: number;
  mappings: RelinkMappingPlan[];
  violations: string[];
  updates: RelinkDocumentUpdate[];
};

const normalize = (value: unknown) => String(value || "").trim();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getNumber = (value: unknown) => {
  const match = normalize(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const isSaesolSchool = (value: unknown) =>
  normalize(value).replace(/\s/g, "").includes("새솔초");

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const findIdOccurrences = (
  value: unknown,
  studentId: string,
  path = ""
): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findIdOccurrences(item, studentId, `${path}[${index}]`)
    );
  }
  if (!isRecord(value)) {
    return value === studentId ? [path] : [];
  }

  const occurrences: string[] = [];
  Object.entries(value).forEach(([key, nested]) => {
    const nestedPath = path ? `${path}.${key}` : key;
    if (key === studentId) occurrences.push(nestedPath);
    occurrences.push(...findIdOccurrences(nested, studentId, nestedPath));
  });
  return occurrences;
};

const rekeyStudentMap = (
  value: unknown,
  link: Q2OrphanLink,
  path: string,
  handled: Set<string>,
  violations: string[]
) => {
  if (!isRecord(value) || !hasOwn(value, link.legacyId)) {
    return { value, changed: false };
  }

  const next = { ...value };
  const legacyValue = next[link.legacyId];
  if (
    hasOwn(next, link.studentId) &&
    !isDeepStrictEqual(next[link.studentId], legacyValue)
  ) {
    violations.push(
      `${path}: ${link.legacyId}와 ${link.studentId}의 저장값이 달라 자동 연결할 수 없습니다.`
    );
    return { value, changed: false };
  }

  next[link.studentId] = legacyValue;
  delete next[link.legacyId];
  handled.add(`${path}.${link.legacyId}`);
  return { value: next, changed: true };
};

const withoutSnapshotIdentity = (value: Record<string, unknown>) => {
  const rest = { ...value };
  delete rest.id;
  delete rest.name;
  return rest;
};

const relinkSnapshots = (
  value: unknown,
  link: Q2OrphanLink,
  path: string,
  handled: Set<string>,
  violations: string[]
) => {
  if (!Array.isArray(value)) return { value, changed: false };

  const legacyIndexes = value
    .map((entry, index) =>
      isRecord(entry) && normalize(entry.id) === link.legacyId ? index : -1
    )
    .filter((index) => index >= 0);
  if (legacyIndexes.length === 0) return { value, changed: false };
  if (legacyIndexes.length > 1) {
    violations.push(`${path}: ${link.legacyId} 스냅샷이 중복되어 있습니다.`);
    return { value, changed: false };
  }

  const legacyIndex = legacyIndexes[0];
  const legacySnapshot = value[legacyIndex] as Record<string, unknown>;
  const storedName = normalize(legacySnapshot.name);
  if (
    storedName &&
    storedName !== link.legacyName &&
    storedName !== link.currentName
  ) {
    violations.push(
      `${path}[${legacyIndex}]: 예상하지 않은 이름 ${storedName}이 저장되어 있습니다.`
    );
    return { value, changed: false };
  }

  const targetIndex = value.findIndex(
    (entry) => isRecord(entry) && normalize(entry.id) === link.studentId
  );
  const canonicalSnapshot = {
    ...legacySnapshot,
    id: link.studentId,
    name: link.currentName,
  };
  const next = [...value];

  if (targetIndex >= 0) {
    const targetSnapshot = value[targetIndex] as Record<string, unknown>;
    if (
      !isDeepStrictEqual(
        withoutSnapshotIdentity(targetSnapshot),
        withoutSnapshotIdentity(legacySnapshot)
      )
    ) {
      violations.push(
        `${path}: ${link.legacyId}와 ${link.studentId} 스냅샷 내용이 달라 자동 연결할 수 없습니다.`
      );
      return { value, changed: false };
    }
    next[targetIndex] = { ...targetSnapshot, name: link.currentName };
    next.splice(legacyIndex, 1);
  } else {
    next[legacyIndex] = canonicalSnapshot;
  }

  handled.add(`${path}[${legacyIndex}].id`);
  return { value: next, changed: true };
};

const relinkStudentIds = (
  value: unknown,
  link: Q2OrphanLink,
  path: string,
  handled: Set<string>
) => {
  if (!Array.isArray(value)) return { value, changed: false };
  const legacyIndexes = value
    .map((entry, index) => (normalize(entry) === link.legacyId ? index : -1))
    .filter((index) => index >= 0);
  if (legacyIndexes.length === 0) return { value, changed: false };

  const targetAlreadyExists = value.some(
    (entry) => normalize(entry) === link.studentId
  );
  let insertedTarget = targetAlreadyExists;
  const next: unknown[] = [];
  value.forEach((entry, index) => {
    if (normalize(entry) !== link.legacyId) {
      next.push(entry);
      return;
    }
    handled.add(`${path}[${index}]`);
    if (!insertedTarget) {
      next.push(link.studentId);
      insertedTarget = true;
    }
  });
  return { value: next, changed: true };
};

const countAllowedTargetOccurrences = (
  data: Record<string, unknown>,
  link: Q2OrphanLink,
  collection: RelinkDocumentUpdate["collection"]
) => {
  const paths = findIdOccurrences(data, link.studentId);
  return paths.filter((path) => {
    if (collection === "teacher_fee_contracts") {
      return (
        path.startsWith("quarterParticipation.Q2.") ||
        path.startsWith("quarterWeekParticipation.Q2.") ||
        /^quarterStudentSnapshots\.Q2\[\d+\]\.id$/.test(path)
      );
    }
    return (
      path.startsWith("receipts.") ||
      /^studentIds\[\d+\]$/.test(path) ||
      /^studentSnapshots\[\d+\]\.id$/.test(path)
    );
  }).length;
};

const validateStudentTargets = (
  students: StoredDocument[],
  violations: string[]
) => {
  const studentById = new Map(students.map((student) => [student.id, student]));
  Q2_ORPHAN_LINKS.forEach((link) => {
    if (studentById.has(link.legacyId)) {
      violations.push(`${link.legacyId}: 원본 students에 같은 ID가 존재합니다.`);
    }
    const target = studentById.get(link.studentId);
    if (!target) {
      violations.push(`${link.studentId}: 현재 학생 원본을 찾을 수 없습니다.`);
      return;
    }
    if (normalize(target.data.name) !== link.currentName) {
      violations.push(
        `${link.studentId}: 학생명이 ${link.currentName}과 일치하지 않습니다.`
      );
    }
    if (!isSaesolSchool(target.data.school)) {
      violations.push(`${link.studentId}: 새솔초 학생이 아닙니다.`);
    }
    if (getNumber(target.data.grade) !== link.grade) {
      violations.push(`${link.studentId}: 학년이 ${link.grade}학년과 일치하지 않습니다.`);
    }
    if (
      getNumber(
        target.data.class ?? target.data.schoolClass ?? target.data.className
      ) !== link.schoolClass
    ) {
      violations.push(`${link.studentId}: 반이 ${link.schoolClass}반과 일치하지 않습니다.`);
    }
    const terms = Array.isArray(target.data.enrollmentTerms)
      ? target.data.enrollmentTerms.map(normalize)
      : [];
    if (!terms.includes("2026-Q2")) {
      violations.push(`${link.studentId}: 2026-Q2 수강 이력이 없습니다.`);
    }
  });
};

export const buildQ2OrphanRelinkPlan = ({
  students,
  feeContracts,
  textbookRecords,
}: {
  students: StoredDocument[];
  feeContracts: StoredDocument[];
  textbookRecords: StoredDocument[];
}): Q2OrphanRelinkPlan => {
  const violations: string[] = [];
  validateStudentTargets(students, violations);

  const mappingState = new Map(
    Q2_ORPHAN_LINKS.map((link) => [
      link.legacyId,
      {
        legacyOccurrences: 0,
        targetOccurrences: 0,
        locations: [] as string[],
      },
    ])
  );
  const updates = new Map<string, RelinkDocumentUpdate>();

  const addUpdate = (
    collection: RelinkDocumentUpdate["collection"],
    id: string,
    fields: Record<string, unknown>
  ) => {
    const key = `${collection}/${id}`;
    const existing = updates.get(key);
    updates.set(key, {
      collection,
      id,
      fields: { ...(existing?.fields || {}), ...fields },
    });
  };

  feeContracts.forEach((document) => {
    const workingData = { ...document.data };
    const documentFields: Record<string, unknown> = {};
    Q2_ORPHAN_LINKS.forEach((link) => {
      const handled = new Set<string>();
      const allLegacyPaths = findIdOccurrences(document.data, link.legacyId);
      mappingState.get(link.legacyId)!.targetOccurrences +=
        countAllowedTargetOccurrences(
          document.data,
          link,
          "teacher_fee_contracts"
        );
      if (allLegacyPaths.length === 0) return;
      if (!isSaesolSchool(document.data.schoolName)) {
        violations.push(
          `teacher_fee_contracts/${document.id}: ${link.legacyId}가 새솔초 외 문서에 있습니다.`
        );
      }

      (["quarterParticipation", "quarterWeekParticipation"] as const).forEach(
        (field) => {
          const root = workingData[field];
          if (!isRecord(root)) return;
          Object.entries(root).forEach(([quarter, quarterValue]) => {
            if (
              quarter !== "Q2" &&
              isRecord(quarterValue) &&
              hasOwn(quarterValue, link.legacyId)
            ) {
              violations.push(
                `teacher_fee_contracts/${document.id}/${field}/${quarter}: Q2 외 위치에 ${link.legacyId}가 있습니다.`
              );
            }
          });
          const result = rekeyStudentMap(
            root.Q2,
            link,
            `${field}.Q2`,
            handled,
            violations
          );
          if (result.changed) {
            const nextRoot = { ...root, Q2: result.value };
            workingData[field] = nextRoot;
            documentFields[field] = nextRoot;
          }
        }
      );

      const participation = workingData.participation;
      if (isRecord(participation) && hasOwn(participation, link.legacyId)) {
        violations.push(
          `teacher_fee_contracts/${document.id}/participation: 분기 정보가 없는 위치에 ${link.legacyId}가 있습니다.`
        );
      }

      const snapshots = workingData.quarterStudentSnapshots;
      if (isRecord(snapshots)) {
        Object.entries(snapshots).forEach(([quarter, entries]) => {
          if (
            quarter !== "Q2" &&
            findIdOccurrences(entries, link.legacyId).length > 0
          ) {
            violations.push(
              `teacher_fee_contracts/${document.id}/quarterStudentSnapshots/${quarter}: Q2 외 위치에 ${link.legacyId}가 있습니다.`
            );
          }
        });
        const result = relinkSnapshots(
          snapshots.Q2,
          link,
          "quarterStudentSnapshots.Q2",
          handled,
          violations
        );
        if (result.changed) {
          const nextSnapshots = {
            ...snapshots,
            Q2: result.value,
          };
          workingData.quarterStudentSnapshots = nextSnapshots;
          documentFields.quarterStudentSnapshots = nextSnapshots;
        }
      }

      const unhandled = allLegacyPaths.filter((path) => !handled.has(path));
      unhandled.forEach((path) =>
        violations.push(
          `teacher_fee_contracts/${document.id}/${path}: 허용되지 않은 참조 위치입니다.`
        )
      );
      const state = mappingState.get(link.legacyId)!;
      state.legacyOccurrences += handled.size;
      state.locations.push(
        ...Array.from(handled).map(
          (path) => `teacher_fee_contracts/${document.id}/${path}`
        )
      );
    });
    if (Object.keys(documentFields).length > 0) {
      addUpdate("teacher_fee_contracts", document.id, documentFields);
    }
  });

  textbookRecords.forEach((document) => {
    const workingData = { ...document.data };
    const documentFields: Record<string, unknown> = {};
    Q2_ORPHAN_LINKS.forEach((link) => {
      const handled = new Set<string>();
      const allLegacyPaths = findIdOccurrences(document.data, link.legacyId);
      mappingState.get(link.legacyId)!.targetOccurrences +=
        countAllowedTargetOccurrences(
          document.data,
          link,
          "teacher_textbook_receipts"
        );
      if (allLegacyPaths.length === 0) return;
      if (normalize(document.data.quarter) !== "Q2") {
        violations.push(
          `teacher_textbook_receipts/${document.id}: Q2 외 문서에 ${link.legacyId}가 있습니다.`
        );
      }
      if (!isSaesolSchool(document.data.schoolName)) {
        violations.push(
          `teacher_textbook_receipts/${document.id}: ${link.legacyId}가 새솔초 외 문서에 있습니다.`
        );
      }

      const receiptsResult = rekeyStudentMap(
        workingData.receipts,
        link,
        "receipts",
        handled,
        violations
      );
      if (receiptsResult.changed) {
        workingData.receipts = receiptsResult.value;
        documentFields.receipts = receiptsResult.value;
      }

      const idsResult = relinkStudentIds(
        workingData.studentIds,
        link,
        "studentIds",
        handled
      );
      if (idsResult.changed) {
        workingData.studentIds = idsResult.value;
        documentFields.studentIds = idsResult.value;
      }

      const snapshotsResult = relinkSnapshots(
        workingData.studentSnapshots,
        link,
        "studentSnapshots",
        handled,
        violations
      );
      if (snapshotsResult.changed) {
        workingData.studentSnapshots = snapshotsResult.value;
        documentFields.studentSnapshots = snapshotsResult.value;
      }

      const unhandled = allLegacyPaths.filter((path) => !handled.has(path));
      unhandled.forEach((path) =>
        violations.push(
          `teacher_textbook_receipts/${document.id}/${path}: 허용되지 않은 참조 위치입니다.`
        )
      );
      const state = mappingState.get(link.legacyId)!;
      state.legacyOccurrences += handled.size;
      state.locations.push(
        ...Array.from(handled).map(
          (path) => `teacher_textbook_receipts/${document.id}/${path}`
        )
      );
    });
    if (Object.keys(documentFields).length > 0) {
      addUpdate("teacher_textbook_receipts", document.id, documentFields);
    }
  });

  const mappings: RelinkMappingPlan[] = Q2_ORPHAN_LINKS.map((link) => {
    const state = mappingState.get(link.legacyId)!;
    let status: RelinkMappingPlan["status"] = "will_relink";
    if (state.legacyOccurrences === 0) {
      if (state.targetOccurrences > 0) {
        status = "already_linked";
      } else {
        status = "invalid";
        violations.push(
          `${link.legacyId}: 과거 참조와 연결 완료 근거를 모두 찾을 수 없습니다.`
        );
      }
    }
    return { ...link, ...state, status };
  });

  if (violations.length > 0) {
    mappings.forEach((mapping) => {
      if (mapping.status === "will_relink") mapping.status = "invalid";
    });
  }

  return {
    ready: violations.length === 0,
    changedMappingCount: mappings.filter(
      (mapping) => mapping.status === "will_relink"
    ).length,
    changedDocumentCount: updates.size,
    mappings,
    violations,
    updates: Array.from(updates.values()),
  };
};

export const canonicalizeQ2OrphanReferences = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeQ2OrphanReferences);
  }
  if (!isRecord(value)) {
    const matching = Q2_ORPHAN_LINKS.find(
      (link) => value === link.legacyId
    );
    return matching ? matching.studentId : value;
  }

  if (
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return normalize(
      (value as { toDate: () => Date }).toDate().toISOString()
    );
  }

  const entries = Object.entries(value)
    .map(([key, nested]) => {
      const matchingKey = Q2_ORPHAN_LINKS.find(
        (link) => key === link.legacyId
      );
      return [
        matchingKey ? matchingKey.studentId : key,
        canonicalizeQ2OrphanReferences(nested),
      ] as const;
    })
    .sort(([left], [right]) => left.localeCompare(right));
  const result = Object.fromEntries(entries) as Record<string, unknown>;
  const identity = Q2_ORPHAN_LINKS.find(
    (link) => normalize(result.id) === link.studentId
  );
  if (identity && hasOwn(result, "name")) result.name = identity.currentName;
  return result;
};

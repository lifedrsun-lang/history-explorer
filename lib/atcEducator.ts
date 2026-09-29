// Document-local educator identity. No school assignment or shared profile writes.
export type AtcEducatorRecord = {
  defaultEducatorName?: string;
  educatorName?: string;
  confirmedEducatorName?: string;
  educatorSignatureName?: string;
  educatorSignatureDataUrlSnapshot?: string | null;
  educatorSignedAt?: string;
  educatorSignatureCompleted?: boolean;
};

const name = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 120) : "";

export function resolveAtcEducatorName(record: AtcEducatorRecord | undefined, defaultName: string) {
  return name(record?.confirmedEducatorName) || name(record?.educatorName) || name(defaultName);
}

export function resolveAtcEducatorSignature(record: AtcEducatorRecord | undefined, defaultName: string, defaultSignature: string | null) {
  if (record?.educatorSignatureCompleted === false) return null;
  const educatorName = resolveAtcEducatorName(record, defaultName);
  if (record?.educatorSignatureDataUrlSnapshot) {
    const signatureName = name(record.educatorSignatureName) || name(record.confirmedEducatorName) || educatorName;
    return signatureName === educatorName ? record.educatorSignatureDataUrlSnapshot : null;
  }
  return educatorName && educatorName === name(defaultName) ? defaultSignature : null;
}

export function buildAtcEducatorState(existing: AtcEducatorRecord, draft: {
  educatorName: string;
  educatorSignatureName: string;
  educatorSignatureDataUrlSnapshot: string | null;
}, defaultName: string, now: string) {
  const educatorName = name(draft.educatorName);
  if (!educatorName) throw new Error("educator_name_required");
  const previousName = resolveAtcEducatorName(existing, defaultName);
  const changed = previousName !== educatorName;
  const signature = draft.educatorSignatureDataUrlSnapshot;
  if (signature && name(draft.educatorSignatureName) !== educatorName) throw new Error("educator_signature_name_mismatch");
  if ((changed || educatorName !== name(defaultName) || existing.confirmedEducatorName) && !signature) {
    throw new Error("educator_resign_required");
  }
  if (changed && signature && signature === existing.educatorSignatureDataUrlSnapshot) {
    throw new Error("educator_resign_required");
  }
  return {
    defaultEducatorName: name(defaultName),
    educatorName,
    confirmedEducatorName: signature ? educatorName : "",
    educatorSignatureName: signature ? educatorName : "",
    educatorSignatureDataUrlSnapshot: signature,
    educatorSignatureCompleted: Boolean(signature),
    educatorSignedAt: signature
      ? !changed && signature === existing.educatorSignatureDataUrlSnapshot && existing.educatorSignedAt
        ? existing.educatorSignedAt : now
      : "",
  };
}

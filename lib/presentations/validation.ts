import { PresentationDraft } from "./types";

export type PresentationDraftField = keyof PresentationDraft;

export type PresentationValidationResult = {
  values: PresentationDraft;
  errors: Partial<Record<PresentationDraftField, string>>;
  isValid: boolean;
};

const requiredFields: PresentationDraftField[] = [
  "title",
  "era",
  "textbookName",
  "bookNumber",
  "lessonNumber",
];

const fieldLabels: Record<PresentationDraftField, string> = {
  title: "자료 제목",
  era: "시대",
  textbookName: "교재명",
  bookNumber: "호수",
  lessonNumber: "차시",
  description: "설명",
};

export const createEmptyPresentationDraft = (): PresentationDraft => ({
  title: "",
  era: "",
  textbookName: "",
  bookNumber: "",
  lessonNumber: "",
  description: "",
});

export const trimPresentationDraft = (
  draft: PresentationDraft
): PresentationDraft => ({
  title: draft.title.trim(),
  era: draft.era.trim(),
  textbookName: draft.textbookName.trim(),
  bookNumber: draft.bookNumber.trim(),
  lessonNumber: draft.lessonNumber.trim(),
  description: draft.description.trim(),
});

export const validatePresentationDraft = (
  draft: PresentationDraft
): PresentationValidationResult => {
  const values = trimPresentationDraft(draft);
  const errors: PresentationValidationResult["errors"] = {};

  requiredFields.forEach((field) => {
    if (!values[field]) {
      errors[field] = `${fieldLabels[field]}을 입력해 주세요.`;
    }
  });

  return {
    values,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

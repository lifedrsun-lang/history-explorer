import "server-only";

import { getSupabaseServer } from "@/lib/supabaseServer";

export type ClassroomAccount = {
  classNumber: number;
  nickname: string;
  accountId: string;
  temporaryPassword: string;
};

export type ClassroomAccountRosterKey = {
  school: string;
  grade: number;
  classNumber: number;
};

type ClassroomAccountRow = {
  student_number: number;
  nickname: string;
  account_id: string;
  temp_password: string;
};

const TABLE_NAME = "classroom_account_rosters";
const MAX_ACCOUNT_COUNT = 60;

const parseCsvRows = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (insideQuotes && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      row.push(value.trim());
      value = "";

      if (row.some(Boolean)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += character;
  }

  if (insideQuotes) {
    throw new Error("invalid_csv_quotes");
  }

  row.push(value.trim());

  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
};

export const parseClassroomAccountCsv = (text: string): ClassroomAccount[] => {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));

  if (rows.length < 2) {
    throw new Error("empty_account_csv");
  }

  const headers = rows[0];
  const numberIndex = headers.indexOf("학급 번호");
  const nicknameIndex = headers.indexOf("닉네임");
  const accountIdIndex = headers.indexOf("학급 아이디");
  const passwordIndex = headers.indexOf("임시 비밀번호");

  if (
    [numberIndex, nicknameIndex, accountIdIndex, passwordIndex].some(
      (index) => index < 0
    )
  ) {
    throw new Error("invalid_account_csv_headers");
  }

  const accounts = rows.slice(1).map((values) => {
    const classNumber = Number(values[numberIndex]);
    const nickname = String(values[nicknameIndex] || "").trim();
    const accountId = String(values[accountIdIndex] || "").trim();
    const temporaryPassword = String(values[passwordIndex] || "").trim();

    if (
      !Number.isInteger(classNumber) ||
      classNumber < 1 ||
      classNumber > 99 ||
      !nickname ||
      nickname.length > 100 ||
      !accountId ||
      accountId.length > 256 ||
      !temporaryPassword ||
      temporaryPassword.length > 256
    ) {
      throw new Error("invalid_account_csv_row");
    }

    return {
      classNumber,
      nickname,
      accountId,
      temporaryPassword,
    };
  });

  if (accounts.length > MAX_ACCOUNT_COUNT) {
    throw new Error("too_many_accounts");
  }

  const uniqueNumbers = new Set(accounts.map((account) => account.classNumber));
  const uniqueAccountIds = new Set(accounts.map((account) => account.accountId));

  if (uniqueNumbers.size !== accounts.length) {
    throw new Error("duplicate_student_number");
  }

  if (uniqueAccountIds.size !== accounts.length) {
    throw new Error("duplicate_account_id");
  }

  return accounts.sort((a, b) => a.classNumber - b.classNumber);
};

export const getClassroomAccountRoster = async (
  key: ClassroomAccountRosterKey
): Promise<ClassroomAccount[]> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("student_number,nickname,account_id,temp_password")
    .eq("school", key.school)
    .eq("grade", key.grade)
    .eq("class_number", key.classNumber)
    .order("student_number", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data || []) as ClassroomAccountRow[]).map((row) => ({
    classNumber: row.student_number,
    nickname: row.nickname,
    accountId: row.account_id,
    temporaryPassword: row.temp_password,
  }));
};

export const replaceClassroomAccountRoster = async (
  key: ClassroomAccountRosterKey,
  accounts: ClassroomAccount[],
  updatedBy: string
) => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.rpc(
    "replace_classroom_account_roster",
    {
      p_school: key.school,
      p_grade: key.grade,
      p_class_number: key.classNumber,
      p_accounts: accounts.map((account) => ({
        student_number: account.classNumber,
        nickname: account.nickname,
        account_id: account.accountId,
        temp_password: account.temporaryPassword,
      })),
      p_updated_by: updatedBy,
    }
  );

  if (error) {
    throw error;
  }

  if (data !== accounts.length) {
    throw new Error("account_roster_replace_incomplete");
  }
};

import "server-only";

import { type ClassroomAccount } from "@/lib/classroomAccountRoster";
import { WONJONG_SCHOOL_NAME } from "@/lib/gaebongClassroom";
import { getSupabaseServer } from "@/lib/supabaseServer";

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

type ClassroomPasswordChangeRow = {
  student_number: number;
  account_id: string;
  changed_password: string;
  changed_at: string;
};

const TABLE_NAME = "classroom_account_rosters";
const PASSWORD_CHANGE_TABLE_NAME = "classroom_account_password_changes";

const toClassroomAccount = (
  row: ClassroomAccountRow,
  passwordChange?: ClassroomPasswordChangeRow
): ClassroomAccount => ({
  classNumber: row.student_number,
  nickname: row.nickname,
  accountId: row.account_id,
  temporaryPassword: row.temp_password,
  ...(passwordChange && passwordChange.account_id === row.account_id
    ? {
        changedPassword: passwordChange.changed_password,
        passwordChangedAt: passwordChange.changed_at,
      }
    : {}),
});

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

  const rows = (data || []) as ClassroomAccountRow[];

  if (key.school === WONJONG_SCHOOL_NAME || rows.length === 0) {
    return rows.map((row) => toClassroomAccount(row));
  }

  const { data: changedRows, error: changedError } = await supabase
    .from(PASSWORD_CHANGE_TABLE_NAME)
    .select("student_number,account_id,changed_password,changed_at")
    .eq("school", key.school)
    .eq("grade", key.grade)
    .eq("class_number", key.classNumber);

  if (changedError) {
    throw changedError;
  }

  const passwordChanges = new Map(
    ((changedRows || []) as ClassroomPasswordChangeRow[]).map((row) => [
      row.student_number,
      row,
    ])
  );

  return rows.map((row) =>
    toClassroomAccount(row, passwordChanges.get(row.student_number))
  );
};

export const getClassroomAccount = async (
  key: ClassroomAccountRosterKey,
  studentNumber: number
): Promise<ClassroomAccount | null> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("student_number,nickname,account_id,temp_password")
    .eq("school", key.school)
    .eq("grade", key.grade)
    .eq("class_number", key.classNumber)
    .eq("student_number", studentNumber)
    .maybeSingle<ClassroomAccountRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  if (key.school === WONJONG_SCHOOL_NAME) {
    return toClassroomAccount(data);
  }

  const { data: changedPassword, error: changedError } = await supabase
    .from(PASSWORD_CHANGE_TABLE_NAME)
    .select("student_number,account_id,changed_password,changed_at")
    .eq("school", key.school)
    .eq("grade", key.grade)
    .eq("class_number", key.classNumber)
    .eq("student_number", studentNumber)
    .eq("account_id", data.account_id)
    .maybeSingle<ClassroomPasswordChangeRow>();

  if (changedError) {
    throw changedError;
  }

  return toClassroomAccount(data, changedPassword || undefined);
};

export const setClassroomAccountChangedPasswordOnce = async (
  key: ClassroomAccountRosterKey,
  studentNumber: number,
  accountId: string,
  changedPassword: string
): Promise<ClassroomAccount> => {
  if (key.school === WONJONG_SCHOOL_NAME) {
    throw new Error("password_change_not_supported");
  }

  const normalizedAccountId = accountId.trim();
  const normalizedPassword = changedPassword.trim();

  if (!normalizedAccountId || normalizedAccountId.length > 256) {
    throw new Error("account_identity_mismatch");
  }

  if (!normalizedPassword || normalizedPassword.length > 256) {
    throw new Error("invalid_changed_password");
  }

  const currentAccount = await getClassroomAccount(key, studentNumber);

  if (!currentAccount) {
    throw new Error("classroom_account_not_found");
  }

  if (currentAccount.accountId !== normalizedAccountId) {
    throw new Error("account_identity_mismatch");
  }

  if (currentAccount.changedPassword) {
    throw new Error("password_already_saved");
  }

  const supabase = getSupabaseServer();
  const changedAt = new Date().toISOString();
  const { error } = await supabase.from(PASSWORD_CHANGE_TABLE_NAME).insert({
    school: key.school,
    grade: key.grade,
    class_number: key.classNumber,
    student_number: studentNumber,
    account_id: currentAccount.accountId,
    changed_password: normalizedPassword,
    changed_by: "student:self",
    changed_at: changedAt,
  });

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error("password_already_saved");
    }
    throw error;
  }

  return {
    ...currentAccount,
    changedPassword: normalizedPassword,
    passwordChangedAt: changedAt,
  };
};

export const setClassroomAccountChangedPassword = async (
  key: ClassroomAccountRosterKey,
  studentNumber: number,
  changedPassword: string,
  updatedBy: string
): Promise<ClassroomAccount> => {
  if (key.school === WONJONG_SCHOOL_NAME) {
    throw new Error("password_change_not_supported");
  }

  const normalizedPassword = changedPassword.trim();

  if (!normalizedPassword || normalizedPassword.length > 256) {
    throw new Error("invalid_changed_password");
  }

  const currentAccount = await getClassroomAccount(key, studentNumber);

  if (!currentAccount) {
    throw new Error("classroom_account_not_found");
  }

  const supabase = getSupabaseServer();
  const changedAt = new Date().toISOString();
  const { error } = await supabase.from(PASSWORD_CHANGE_TABLE_NAME).upsert(
    {
      school: key.school,
      grade: key.grade,
      class_number: key.classNumber,
      student_number: studentNumber,
      account_id: currentAccount.accountId,
      changed_password: normalizedPassword,
      changed_by: updatedBy,
      changed_at: changedAt,
    },
    { onConflict: "school,grade,class_number,student_number" }
  );

  if (error) {
    throw error;
  }

  return {
    ...currentAccount,
    changedPassword: normalizedPassword,
    passwordChangedAt: changedAt,
  };
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

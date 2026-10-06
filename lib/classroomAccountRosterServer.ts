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
  original_password: string | null;
};

type ClassroomPasswordChangeRow = {
  student_number: number;
  account_id: string;
  changed_password: string;
  changed_at: string;
  changed_by: string | null;
};

const TABLE_NAME = "classroom_account_rosters";
const PASSWORD_CHANGE_TABLE_NAME = "classroom_account_password_changes";
type PasswordState = {
  student_number: number;
  account_id: string;
  reset_allowed: boolean;
  reset_grant_id: string | null;
  reset_granted_at: string | null;
  password_changed_at: string | null;
  password_change_actor: "teacher" | "student" | null;
};
const PASSWORD_STATE_TABLE = "classroom_account_password_state";
const withPasswordState = (account: ClassroomAccount, state?: PasswordState): ClassroomAccount => ({
  ...account,
  passwordResetAllowed: Boolean(state?.reset_allowed),
  passwordResetGrantId: state?.reset_grant_id || undefined,
  passwordResetGrantedAt: state?.reset_granted_at || undefined,
  passwordChangedAt: state?.password_changed_at || account.passwordChangedAt,
  passwordChangeActor: state?.password_change_actor || account.passwordChangeActor,
});

const readPasswordStates = async (key: ClassroomAccountRosterKey) => {
  const { data, error } = await getSupabaseServer().from(PASSWORD_STATE_TABLE)
    .select("student_number,account_id,reset_allowed,reset_grant_id,reset_granted_at,password_changed_at,password_change_actor")
    .eq("school", key.school).eq("grade", key.grade).eq("class_number", key.classNumber);
  if (error) throw error;
  return (data || []) as PasswordState[];
};

const WONJONG_GRADE1_CURRENT_PASSWORD = "12345";

const toClassroomAccount = (
  row: ClassroomAccountRow,
  passwordChange?: ClassroomPasswordChangeRow,
  wonjongGrade?: number
): ClassroomAccount => {
  if (passwordChange && passwordChange.account_id === row.account_id) {
    return {
      classNumber: row.student_number, nickname: row.nickname, accountId: row.account_id,
      temporaryPassword: wonjongGrade === 2 ? row.original_password || "" : row.temp_password,
      changedPassword: passwordChange.changed_password,
      passwordChangedAt: passwordChange.changed_at,
      passwordChangeActor: passwordChange.changed_by === "student:self" ? "student" : passwordChange.changed_by ? "teacher" : undefined,
    };
  }
  if (wonjongGrade === 1) {
    return {
      classNumber: row.student_number,
      nickname: row.nickname,
      accountId: row.account_id,
      temporaryPassword: row.temp_password,
      changedPassword: WONJONG_GRADE1_CURRENT_PASSWORD,
    };
  }

  if (wonjongGrade === 2) {
    return {
      classNumber: row.student_number,
      nickname: row.nickname,
      accountId: row.account_id,
      temporaryPassword: row.original_password || "",
      changedPassword: row.temp_password,
    };
  }

  return {
    classNumber: row.student_number,
    nickname: row.nickname,
    accountId: row.account_id,
    temporaryPassword: row.temp_password,

  };
};

export const getClassroomAccountRoster = async (
  key: ClassroomAccountRosterKey
): Promise<ClassroomAccount[]> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("student_number,nickname,account_id,temp_password,original_password")
    .eq("school", key.school)
    .eq("grade", key.grade)
    .eq("class_number", key.classNumber)
    .order("student_number", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data || []) as ClassroomAccountRow[];
  const wonjongGrade =
    key.school === WONJONG_SCHOOL_NAME && (key.grade === 1 || key.grade === 2)
      ? key.grade
      : undefined;

  if (rows.length === 0) return [];

  const { data: changedRows, error: changedError } = await supabase
    .from(PASSWORD_CHANGE_TABLE_NAME)
    .select("student_number,account_id,changed_password,changed_at,changed_by")
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

  const states = await readPasswordStates(key);
  return rows.map((row) => withPasswordState(
    toClassroomAccount(row, passwordChanges.get(row.student_number), wonjongGrade),
    states.find((state) => state.student_number === row.student_number && state.account_id === row.account_id)
  ));
};

export const getClassroomAccount = async (
  key: ClassroomAccountRosterKey,
  studentNumber: number
): Promise<ClassroomAccount | null> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("student_number,nickname,account_id,temp_password,original_password")
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

  const { data: changedPassword, error: changedError } = await supabase
    .from(PASSWORD_CHANGE_TABLE_NAME)
    .select("student_number,account_id,changed_password,changed_at,changed_by")
    .eq("school", key.school)
    .eq("grade", key.grade)
    .eq("class_number", key.classNumber)
    .eq("student_number", studentNumber)
    .eq("account_id", data.account_id)
    .maybeSingle<ClassroomPasswordChangeRow>();

  if (changedError) {
    throw changedError;
  }

  const states = await readPasswordStates(key);
  const wonjongGrade = key.school === WONJONG_SCHOOL_NAME ? key.grade : undefined;
  return withPasswordState(toClassroomAccount(data, changedPassword || undefined, wonjongGrade),
    states.find((state) => state.student_number === studentNumber && state.account_id === data.account_id));
};

const managePassword = async (
  key: ClassroomAccountRosterKey, studentNumber: number, accountId: string,
  action: "student_change" | "teacher_change" | "grant_reset", password?: string,
  actorId?: string, resetGrantId?: string
): Promise<ClassroomAccount> => {
  const current = await getClassroomAccount(key, studentNumber);
  if (!current) throw new Error("classroom_account_not_found");
  if (current.accountId !== accountId.trim()) throw new Error("account_identity_mismatch");
  const { data, error } = await getSupabaseServer().rpc("manage_classroom_account_password", {
    p_school: key.school, p_grade: key.grade, p_class_number: key.classNumber,
    p_student_number: studentNumber, p_account_id: accountId.trim(), p_action: action,
    p_password: password?.trim() || null, p_actor_id: actorId || null,
    p_reset_grant_id: resetGrantId || null,
  });
  if (error) throw new Error(error.message);
  const updated = action === "grant_reset" ? current : {
    ...current, changedPassword: password!.trim(),
  };
  return withPasswordState(updated, data as PasswordState);
};

export const setClassroomAccountChangedPasswordOnce = (
  key: ClassroomAccountRosterKey, studentNumber: number, accountId: string,
  changedPassword: string, resetGrantId?: string
) => managePassword(key, studentNumber, accountId, "student_change", changedPassword, undefined, resetGrantId);

export const setClassroomAccountChangedPassword = (
  key: ClassroomAccountRosterKey, studentNumber: number, accountId: string,
  changedPassword: string, updatedBy: string
) => managePassword(key, studentNumber, accountId, "teacher_change", changedPassword, updatedBy);

export const grantClassroomAccountPasswordReset = (
  key: ClassroomAccountRosterKey, studentNumber: number, accountId: string, updatedBy: string
) => managePassword(key, studentNumber, accountId, "grant_reset", undefined, updatedBy);

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

const normalizeAccount = (account: ClassroomAccount) => {
  const classNumber = Number(account.classNumber);
  const nickname = String(account.nickname || "").trim();
  const accountId = String(account.accountId || "").trim();
  const temporaryPassword = String(account.temporaryPassword || "").trim();

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
    throw new Error("invalid_classroom_account");
  }

  return { classNumber, nickname, accountId, temporaryPassword };
};

export const upsertClassroomAccount = async (
  key: ClassroomAccountRosterKey,
  account: ClassroomAccount,
  updatedBy: string
) => {
  const normalized = normalizeAccount(account);
  const supabase = getSupabaseServer();
  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      school: key.school,
      grade: key.grade,
      class_number: key.classNumber,
      student_number: normalized.classNumber,
      nickname: normalized.nickname,
      account_id: normalized.accountId,
      temp_password: normalized.temporaryPassword,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "school,grade,class_number,student_number" }
  );

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error("duplicate_account_id");
    }
    throw error;
  }
  return getClassroomAccount(key, normalized.classNumber);
};

export const deleteClassroomAccount = async (
  key: ClassroomAccountRosterKey,
  studentNumber: number
) => {
  if (!Number.isInteger(studentNumber) || studentNumber < 1 || studentNumber > 99) {
    throw new Error("invalid_student_number");
  }

  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("school", key.school)
    .eq("grade", key.grade)
    .eq("class_number", key.classNumber)
    .eq("student_number", studentNumber);
  if (error) throw error;

  const { error: passwordError } = await supabase
    .from(PASSWORD_CHANGE_TABLE_NAME)
    .delete()
    .eq("school", key.school)
    .eq("grade", key.grade)
    .eq("class_number", key.classNumber)
    .eq("student_number", studentNumber);
  if (passwordError) throw passwordError;
  const { error: stateError } = await supabase.from(PASSWORD_STATE_TABLE).delete()
    .eq("school", key.school).eq("grade", key.grade).eq("class_number", key.classNumber)
    .eq("student_number", studentNumber);
  if (stateError) throw stateError;
};

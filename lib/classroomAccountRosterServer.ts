import "server-only";

import { type ClassroomAccount } from "@/lib/classroomAccountRoster";
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

const TABLE_NAME = "classroom_account_rosters";

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

  return {
    classNumber: data.student_number,
    nickname: data.nickname,
    accountId: data.account_id,
    temporaryPassword: data.temp_password,
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

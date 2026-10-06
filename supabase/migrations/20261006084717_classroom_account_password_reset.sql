-- Password-free metadata. The existing current credential storage is retained.
create table public.classroom_account_password_state (
  school text not null,
  grade smallint not null,
  class_number smallint not null,
  student_number smallint not null,
  account_id text not null,
  reset_allowed boolean not null default false,
  reset_grant_id uuid,
  reset_granted_at timestamptz,
  reset_granted_by text,
  password_changed_at timestamptz,
  password_changed_by text,
  password_change_actor text check (password_change_actor in ('teacher', 'student')),
  primary key (school, grade, class_number, student_number, account_id)
);
alter table public.classroom_account_password_state enable row level security;
alter table public.classroom_account_password_state force row level security;
revoke all on public.classroom_account_password_state from public, anon, authenticated;
grant select, insert, update, delete on public.classroom_account_password_state to service_role;

create function public.manage_classroom_account_password(
  p_school text, p_grade integer, p_class_number integer, p_student_number integer,
  p_account_id text, p_action text, p_password text default null,
  p_actor_id text default null, p_reset_grant_id uuid default null
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_account public.classroom_account_rosters%rowtype;
  v_state public.classroom_account_password_state%rowtype;
  v_has_password boolean;
  v_now timestamptz := clock_timestamp();
begin
  if p_action not in ('grant_reset', 'teacher_change', 'student_change') or p_action is null then
    raise exception 'invalid_password_action';
  end if;
  if p_action <> 'student_change' and coalesce(btrim(p_actor_id), '') = '' then
    raise exception 'teacher_auth_required';
  end if;
  if p_action <> 'grant_reset' and char_length(btrim(coalesce(p_password, ''))) not between 1 and 256 then
    raise exception 'invalid_changed_password';
  end if;

  -- Serialize grants, teacher edits and student saves for this exact account.
  select * into v_account from public.classroom_account_rosters
    where school = p_school and grade = p_grade and class_number = p_class_number
      and student_number = p_student_number for update;
  if not found then raise exception 'classroom_account_not_found'; end if;
  if v_account.account_id <> btrim(coalesce(p_account_id, '')) then
    raise exception 'account_identity_mismatch';
  end if;

  insert into public.classroom_account_password_state (school, grade, class_number, student_number, account_id)
    values (p_school, p_grade, p_class_number, p_student_number, v_account.account_id)
    on conflict do nothing;
  select * into v_state from public.classroom_account_password_state
    where school = p_school and grade = p_grade and class_number = p_class_number
      and student_number = p_student_number and account_id = v_account.account_id for update;

  if p_action = 'grant_reset' then
    update public.classroom_account_password_state set reset_allowed = true,
      reset_grant_id = gen_random_uuid(), reset_granted_at = v_now, reset_granted_by = p_actor_id
      where school = p_school and grade = p_grade and class_number = p_class_number
        and student_number = p_student_number and account_id = v_account.account_id
      returning * into v_state;
    return to_jsonb(v_state);
  end if;

  if p_action = 'student_change' then
    select exists(select 1 from public.classroom_account_password_changes
      where school = p_school and grade = p_grade and class_number = p_class_number
        and student_number = p_student_number and account_id = v_account.account_id)
      or p_school = '부천원종초등학교' into v_has_password;
    if v_state.reset_allowed then
      if p_reset_grant_id is distinct from v_state.reset_grant_id then
        raise exception 'password_reset_permission_changed';
      end if;
    elsif v_has_password then
      raise exception 'password_reset_not_allowed';
    end if;
  end if;

  insert into public.classroom_account_password_changes
    (school, grade, class_number, student_number, account_id, changed_password, changed_by, changed_at)
    values (p_school, p_grade, p_class_number, p_student_number, v_account.account_id,
      btrim(p_password), case when p_action = 'student_change' then 'student:self' else p_actor_id end, v_now)
    on conflict (school, grade, class_number, student_number) do update set
      account_id = excluded.account_id, changed_password = excluded.changed_password,
      changed_by = excluded.changed_by, changed_at = excluded.changed_at;

  update public.classroom_account_password_state set
    password_changed_at = v_now,
    password_changed_by = case when p_action = 'student_change' then 'student:self' else p_actor_id end,
    password_change_actor = case when p_action = 'student_change' then 'student' else 'teacher' end,
    reset_allowed = case when p_action = 'student_change' then false else reset_allowed end,
    reset_grant_id = case when p_action = 'student_change' then null else reset_grant_id end
    where school = p_school and grade = p_grade and class_number = p_class_number
      and student_number = p_student_number and account_id = v_account.account_id
    returning * into v_state;
  return to_jsonb(v_state);
end;
$$;
revoke execute on function public.manage_classroom_account_password(text, integer, integer, integer, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.manage_classroom_account_password(text, integer, integer, integer, text, text, text, text, uuid) to service_role;

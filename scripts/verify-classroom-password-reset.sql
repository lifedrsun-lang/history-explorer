-- Run with a privileged server/database connection. All fixtures are rolled back.
begin;
do $$
declare
  v_school text := '__sunlab_password_verification__';
  v_state jsonb;
  v_grant uuid;
  v_old_grant uuid;
  v_password text;
begin
  if exists(select 1 from public.classroom_account_rosters where school = v_school) then
    raise exception 'Verification fixture already exists; refusing to overwrite';
  end if;
  insert into public.classroom_account_rosters
    (school, grade, class_number, student_number, nickname, account_id, temp_password)
    values (v_school, 6, 1, 1, 'test-a', 'test-account-a', 'initial-a'),
      (v_school, 6, 1, 2, 'test-b', 'test-account-b', 'initial-b'),
      (v_school, 6, 2, 1, 'test-c', 'test-account-c', 'initial-c');

  -- A: direct teacher edit replaces the authoritative current value and records actor/time.
  v_state := public.manage_classroom_account_password(v_school,6,1,1,'test-account-a','teacher_change','teacher-new','test-teacher');
  select changed_password into v_password from public.classroom_account_password_changes
    where school=v_school and grade=6 and class_number=1 and student_number=1;
  assert v_password='teacher-new', 'teacher current credential was not updated';
  assert v_state->>'password_change_actor'='teacher', 'teacher actor missing';
  assert v_state->>'password_changed_at' is not null, 'change timestamp missing';

  -- B: grant is scoped to an exact classroom/student/account identity.
  v_state := public.manage_classroom_account_password(v_school,6,1,1,'test-account-a','grant_reset',null,'test-teacher');
  v_grant := (v_state->>'reset_grant_id')::uuid;
  assert (v_state->>'reset_allowed')::boolean, 'grant not enabled';
  assert v_state->>'reset_granted_at' is not null, 'grant timestamp missing';
  assert not exists(select 1 from public.classroom_account_password_state
    where school=v_school and (student_number=2 or class_number=2) and reset_allowed), 'grant leaked to another student/class';

  -- Invalid input and wrong identity do not consume a grant.
  begin
    perform public.manage_classroom_account_password(v_school,6,1,1,'test-account-a','student_change','',null,v_grant);
    raise exception 'blank password was accepted';
  exception when raise_exception then
    if sqlerrm <> 'invalid_changed_password' then raise; end if;
  end;
  begin
    perform public.manage_classroom_account_password(v_school,6,1,1,'test-account-b','student_change','bad',null,v_grant);
    raise exception 'wrong account was accepted';
  exception when raise_exception then
    if sqlerrm <> 'account_identity_mismatch' then raise; end if;
  end;
  assert (select reset_allowed from public.classroom_account_password_state
    where school=v_school and class_number=1 and student_number=1), 'failed save consumed grant';
  assert (select changed_password='teacher-new' from public.classroom_account_password_changes
    where school=v_school and class_number=1 and student_number=1), 'failed save changed credential';

  -- A teacher edit does not consume a student's pending permission.
  v_state := public.manage_classroom_account_password(v_school,6,1,1,'test-account-a','teacher_change','teacher-newer','test-teacher');
  assert (v_state->>'reset_allowed')::boolean, 'teacher edit consumed student grant';
  v_state := public.manage_classroom_account_password(v_school,6,1,1,'test-account-a','student_change','student-new',null,v_grant);
  assert not (v_state->>'reset_allowed')::boolean, 'successful save did not consume grant';
  assert v_state->>'reset_grant_id' is null, 'successful save retained grant token';
  assert v_state->>'password_change_actor'='student', 'student actor missing';
  assert (select changed_password='student-new' from public.classroom_account_password_changes
    where school=v_school and class_number=1 and student_number=1), 'student current credential not updated';

  -- C: repeated direct requests cannot overwrite the password.
  begin
    perform public.manage_classroom_account_password(v_school,6,1,1,'test-account-a','student_change','replay',null,v_grant);
    raise exception 'second reset was accepted';
  exception when raise_exception then
    if sqlerrm <> 'password_reset_not_allowed' then raise; end if;
  end;

  -- A reissued permission has a new identifier; stale requests cannot consume it.
  v_old_grant := v_grant;
  v_state := public.manage_classroom_account_password(v_school,6,1,1,'test-account-a','grant_reset',null,'test-teacher');
  v_grant := (v_state->>'reset_grant_id')::uuid;
  assert v_grant <> v_old_grant, 'regrant reused identifier';
  begin
    perform public.manage_classroom_account_password(v_school,6,1,1,'test-account-a','student_change','stale',null,v_old_grant);
    raise exception 'stale grant was accepted';
  exception when raise_exception then
    if sqlerrm <> 'password_reset_permission_changed' then raise; end if;
  end;
  assert (select reset_allowed from public.classroom_account_password_state
    where school=v_school and class_number=1 and student_number=1), 'stale request consumed new grant';

  -- E: initial registration remains available once and keeps roster identification intact.
  perform public.manage_classroom_account_password(v_school,6,1,2,'test-account-b','student_change','first-save');
  begin
    perform public.manage_classroom_account_password(v_school,6,1,2,'test-account-b','student_change','second-save');
    raise exception 'initial registration was reusable';
  exception when raise_exception then
    if sqlerrm <> 'password_reset_not_allowed' then raise; end if;
  end;
  assert (select count(*)=3 from public.classroom_account_rosters where school=v_school), 'roster identity changed';
  assert (select temp_password='initial-a' and account_id='test-account-a'
    from public.classroom_account_rosters where school=v_school and class_number=1 and student_number=1), 'original roster was mutated';
  assert not has_table_privilege('anon','public.classroom_account_password_state','SELECT'), 'anonymous metadata access';
  assert not has_function_privilege('authenticated',
    'public.manage_classroom_account_password(text,integer,integer,integer,text,text,text,text,uuid)','EXECUTE'), 'client RPC access';
end;
$$;
select 'PASS: teacher edit, one-time reset, failed-save retention, repeat rejection, identity isolation, regrant, initial registration, server-only privileges' as verification;
rollback;

alter table public.classroom_account_rosters
  add column original_password text;

alter table public.classroom_account_rosters
  add constraint classroom_account_rosters_original_password_check
  check (
    original_password is null
    or char_length(btrim(original_password)) between 1 and 256
  );

comment on column public.classroom_account_rosters.original_password is
  'Sensitive pre-change classroom password retained for teacher-only history display.';

create or replace function public.replace_classroom_account_roster(
  p_school text,
  p_grade integer,
  p_class_number integer,
  p_accounts jsonb,
  p_updated_by text
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account_count integer;
  v_original_passwords jsonb;
begin
  if btrim(coalesce(p_school, '')) = '' or char_length(btrim(p_school)) > 200 then
    raise exception 'invalid_school';
  end if;

  if p_grade not between 1 and 12 or p_class_number not between 1 and 99 then
    raise exception 'invalid_classroom';
  end if;

  if jsonb_typeof(p_accounts) is distinct from 'array' then
    raise exception 'invalid_accounts';
  end if;

  v_account_count := jsonb_array_length(p_accounts);

  if v_account_count not between 1 and 60 then
    raise exception 'invalid_account_count';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_accounts) as account
    where coalesce(account->>'student_number', '') !~ '^[0-9]{1,2}$'
      or (account->>'student_number')::integer not between 1 and 99
      or char_length(btrim(coalesce(account->>'nickname', ''))) not between 1 and 100
      or char_length(btrim(coalesce(account->>'account_id', ''))) not between 1 and 256
      or char_length(btrim(coalesce(account->>'temp_password', ''))) not between 1 and 256
  ) then
    raise exception 'invalid_account';
  end if;

  if (
    select count(distinct (account->>'student_number')::integer)
    from jsonb_array_elements(p_accounts) as account
  ) <> v_account_count then
    raise exception 'duplicate_student_number';
  end if;

  if (
    select count(distinct btrim(account->>'account_id'))
    from jsonb_array_elements(p_accounts) as account
  ) <> v_account_count then
    raise exception 'duplicate_account_id';
  end if;

  select coalesce(
    jsonb_object_agg(account_id, original_password)
      filter (where original_password is not null),
    '{}'::jsonb
  )
  into v_original_passwords
  from public.classroom_account_rosters
  where school = btrim(p_school)
    and grade = p_grade
    and class_number = p_class_number;

  delete from public.classroom_account_rosters
  where school = btrim(p_school)
    and grade = p_grade
    and class_number = p_class_number;

  insert into public.classroom_account_rosters (
    school,
    grade,
    class_number,
    student_number,
    nickname,
    account_id,
    temp_password,
    original_password,
    updated_by,
    updated_at
  )
  select
    btrim(p_school),
    p_grade,
    p_class_number,
    (account->>'student_number')::smallint,
    btrim(account->>'nickname'),
    btrim(account->>'account_id'),
    btrim(account->>'temp_password'),
    nullif(btrim(v_original_passwords ->> btrim(account->>'account_id')), ''),
    nullif(btrim(coalesce(p_updated_by, '')), ''),
    now()
  from jsonb_array_elements(p_accounts) as account;

  return v_account_count;
end;
$$;

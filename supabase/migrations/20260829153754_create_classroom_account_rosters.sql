create table public.classroom_account_rosters (
  school text not null,
  grade smallint not null check (grade between 1 and 12),
  class_number smallint not null check (class_number between 1 and 99),
  student_number smallint not null check (student_number between 1 and 99),
  nickname text not null check (char_length(nickname) between 1 and 100),
  account_id text not null check (char_length(account_id) between 1 and 256),
  temp_password text not null check (char_length(temp_password) between 1 and 256),
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (school, grade, class_number, student_number),
  unique (school, grade, class_number, account_id)
);

comment on table public.classroom_account_rosters is
  'Teacher-only classroom account credentials. Never grant browser roles access.';
comment on column public.classroom_account_rosters.temp_password is
  'Sensitive temporary student password. Server-side access only.';

alter table public.classroom_account_rosters enable row level security;
alter table public.classroom_account_rosters force row level security;

revoke all on table public.classroom_account_rosters from public;
revoke all on table public.classroom_account_rosters from anon;
revoke all on table public.classroom_account_rosters from authenticated;
grant select, insert, update, delete on table public.classroom_account_rosters to service_role;

create function public.replace_classroom_account_roster(
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
    nullif(btrim(coalesce(p_updated_by, '')), ''),
    now()
  from jsonb_array_elements(p_accounts) as account;

  return v_account_count;
end;
$$;

revoke all on function public.replace_classroom_account_roster(
  text,
  integer,
  integer,
  jsonb,
  text
) from public;
revoke all on function public.replace_classroom_account_roster(
  text,
  integer,
  integer,
  jsonb,
  text
) from anon;
revoke all on function public.replace_classroom_account_roster(
  text,
  integer,
  integer,
  jsonb,
  text
) from authenticated;
grant execute on function public.replace_classroom_account_roster(
  text,
  integer,
  integer,
  jsonb,
  text
) to service_role;

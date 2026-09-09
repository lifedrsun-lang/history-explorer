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
  v_existing_credentials jsonb;
  v_school text;
begin
  v_school := btrim(coalesce(p_school, ''));

  if v_school = '' or char_length(v_school) > 200 then
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
    jsonb_object_agg(
      account_id,
      jsonb_build_object(
        'current_password', temp_password,
        'original_password', original_password
      )
    ),
    '{}'::jsonb
  )
  into v_existing_credentials
  from public.classroom_account_rosters
  where school = v_school
    and grade = p_grade
    and class_number = p_class_number;

  delete from public.classroom_account_rosters
  where school = v_school
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
    v_school,
    p_grade,
    p_class_number,
    (account->>'student_number')::smallint,
    btrim(account->>'nickname'),
    btrim(account->>'account_id'),
    case
      when v_school = '부천원종초등학교'
        and p_grade = 2
        and (v_existing_credentials ? btrim(account->>'account_id'))
      then coalesce(
        nullif(v_existing_credentials -> btrim(account->>'account_id') ->> 'current_password', ''),
        btrim(account->>'temp_password')
      )
      else btrim(account->>'temp_password')
    end,
    case
      when v_school = '부천원종초등학교' and p_grade = 2
      then coalesce(
        nullif(v_existing_credentials -> btrim(account->>'account_id') ->> 'original_password', ''),
        btrim(account->>'temp_password')
      )
      else nullif(v_existing_credentials -> btrim(account->>'account_id') ->> 'original_password', '')
    end,
    nullif(btrim(coalesce(p_updated_by, '')), ''),
    now()
  from jsonb_array_elements(p_accounts) as account;

  return v_account_count;
end;
$$;

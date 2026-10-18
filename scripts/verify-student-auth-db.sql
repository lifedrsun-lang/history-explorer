-- Run by a database administrator after the additive migration. All fixtures roll back.
begin;
do $verify$
declare role_name text; table_name text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    execute format('set local role %I',role_name);
    foreach table_name in array array['student_auth_sessions','student_photo_credentials','student_auth_attempts'] loop
      begin
        execute format('select count(*) from public.%I',table_name);
        raise exception 'Unexpected read access for % to %',role_name,table_name;
      exception when insufficient_privilege then null; end;
      begin
        execute format('insert into public.%I default values',table_name);
        raise exception 'Unexpected write access for % to %',role_name,table_name;
      exception when insufficient_privilege then null; end;
    end loop;
    begin
      perform public.consume_student_auth_attempt(repeat('e',64),2);
      raise exception 'Unexpected function access for %',role_name;
    exception when insufficient_privilege then null; end;
    reset role;
  end loop;
  set local role service_role;
  if public.consume_student_auth_attempt(repeat('e',64),2) is not true then raise exception 'First attempt failed'; end if;
  if public.consume_student_auth_attempt(repeat('e',64),2) is not true then raise exception 'Second attempt failed'; end if;
  if public.consume_student_auth_attempt(repeat('e',64),2) is not false then raise exception 'Rate limit failed'; end if;
  reset role;
end $verify$;
rollback;
select 'PASS: 12 denied table operations, 2 denied RPC calls, 3 rate-limit checks; fixtures rolled back' as verification,
(select count(*) from public.student_auth_attempts where key_hash=repeat('e',64)) as persisted_fixture_rows;


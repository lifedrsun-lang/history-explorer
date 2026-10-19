-- Test-only album and declarations; all fixture rows roll back.
begin;
do $verify$
declare role_name text; album uuid := gen_random_uuid(); latest_count integer; latest_publication boolean;
begin
  foreach role_name in array array['anon','authenticated'] loop
    execute format('set local role %I',role_name);
    begin perform count(*) from public.student_photo_consent_events; raise exception 'Unexpected read access'; exception when insufficient_privilege then null; end;
    begin insert into public.student_photo_consent_events default values; raise exception 'Unexpected insert access'; exception when insufficient_privilege then null; end;
    begin update public.student_photo_consent_events set publication=false where false; raise exception 'Unexpected update access'; exception when insufficient_privilege then null; end;
    begin delete from public.student_photo_consent_events where false; raise exception 'Unexpected delete access'; exception when insufficient_privilege then null; end;
    begin perform public.photo_archive_latest_consents(array[]::uuid[],null); raise exception 'Unexpected RPC access'; exception when insufficient_privilege then null; end;
    reset role;
  end loop;
  set local role service_role;
  insert into public.student_photo_albums(id,owner_uid,school,classroom,year,quarter,title,term_end_date,end_date_source)
    values(album,'__photo_consent_fixture__','검증 학교','검증 반',2026,3,'롤백 전용',current_date,'격리된 SQL 검사');
  insert into public.student_photo_consent_events(id,album_id,student_key,publication,viewing,guardian_declared,policy_version,scope_hash,expires_on,notice)
    values(gen_random_uuid(),album,'students:__photo_consent_fixture__',false,false,false,'fixture-v1',repeat('f',64),current_date+14,'{"fixture":true}');
  insert into public.student_photo_consent_events(id,album_id,student_key,publication,viewing,guardian_declared,policy_version,scope_hash,expires_on,notice)
    values(gen_random_uuid(),album,'students:__photo_consent_fixture__',true,true,true,'fixture-v1',repeat('f',64),current_date+14,'{"fixture":true}');
  select count(*),bool_and(publication) into latest_count,latest_publication from public.photo_archive_latest_consents(array[album],null);
  if latest_count<>1 or latest_publication is not true then raise exception 'Latest accepted decision lookup failed'; end if;
  if (select count(*) from public.photo_archive_latest_consents(array[album],'students:__photo_consent_fixture__'))<>1 then raise exception 'Own lookup failed'; end if;
  if (select count(*) from public.photo_archive_latest_consents(array[album],'students:someone_else'))<>0 then raise exception 'Other student filter failed'; end if;
  if (select count(*) from public.student_photo_consent_events where album_id=album)<>2 then raise exception 'Decision history was lost'; end if;
  begin update public.student_photo_consent_events set publication=false where false; raise exception 'Unexpected server update access'; exception when insufficient_privilege then null; end;
  begin delete from public.student_photo_consent_events where false; raise exception 'Unexpected server delete access'; exception when insufficient_privilege then null; end;
  reset role;
end $verify$;
rollback;
select 'PASS: browser CRUD/RPC denied, server append/read allowed, latest and student filters correct, refusal history retained, server update/delete denied; fixtures rolled back' as verification,
 (select count(*) from public.student_photo_consent_events where student_key='students:__photo_consent_fixture__') as persisted_fixture_events,
 (select count(*) from public.student_photo_albums where owner_uid='__photo_consent_fixture__') as persisted_fixture_albums;

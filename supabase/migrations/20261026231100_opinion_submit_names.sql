-- Append student-entered names without altering or resetting any existing activity rows.
-- Keep legacy teacher action RPCs unchanged, including current round state.
create function public.opinion_submit_named(
  p_slot smallint, p_round uuid, p_participant text, p_text text, p_name text
) returns jsonb language plpgsql security invoker set search_path = '' as $function$
declare
  main_row public.opinion_activity%rowtype;
  slot_row public.opinion_activity_slots%rowtype;
  responses_before jsonb;
  responses_after jsonb;
  active_round uuid;
  is_active boolean;
begin
  if p_slot is null or p_slot not between 1 and 8 then raise exception 'invalid_slot'; end if;
  if p_participant is null or p_participant !~ '^[0-9a-f]{64}$'
    or p_text is null or char_length(p_text) not between 1 and 60 or p_text !~ '[^[:space:]]'
    then raise exception 'invalid_text'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 20
    or p_name !~ '[^[:space:]]' or p_name ~ '[[:cntrl:]]'
    then raise exception 'invalid_name'; end if;
  if p_slot = 1 then
    select * into strict main_row from public.opinion_activity where id = true for update;
    responses_before := main_row.responses; active_round := main_row.round_id; is_active := main_row.active;
  else
    select * into strict slot_row from public.opinion_activity_slots where slot = p_slot for update;
    responses_before := slot_row.responses; active_round := slot_row.round_id; is_active := slot_row.active;
  end if;
  if not is_active or p_round is null or p_round is distinct from active_round
    then raise exception 'round_closed'; end if;
  -- Same-browser retries are idempotent, and deleted opinions cannot be reposted this round.
  if responses_before ? p_participant then
    if p_slot = 1 then return to_jsonb(main_row); else return to_jsonb(slot_row); end if;
  end if;
  if (select count(*) from jsonb_object_keys(responses_before)) >= 100
    then raise exception 'activity_full'; end if;
  responses_after := responses_before || jsonb_build_object(p_participant,
    jsonb_build_object('id',gen_random_uuid(),'text',p_text,'name',btrim(p_name),'createdAt',clock_timestamp()));
  if p_slot = 1 then
    update public.opinion_activity
      set responses=responses_after,revision=revision+1 where id=true returning * into main_row;
    return to_jsonb(main_row);
  else
    update public.opinion_activity_slots
      set responses=responses_after,revision=revision+1 where slot=p_slot returning * into slot_row;
    return to_jsonb(slot_row);
  end if;
end;
$function$;
revoke all on function public.opinion_submit_named(smallint,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.opinion_submit_named(smallint,uuid,text,text,text) to service_role;
comment on function public.opinion_submit_named(smallint,uuid,text,text,text) is
  'Server-only live opinion submission with required student-entered name; existing rows preserved.';

-- Expand reusable boards without updating or resetting the existing activity rows.
alter table public.opinion_activity_slots
  drop constraint opinion_activity_slots_slot_check;
alter table public.opinion_activity_slots
  add constraint opinion_activity_slots_slot_check check (slot between 2 and 8);

insert into public.opinion_activity_slots (slot)
  select generate_series(4,8)
on conflict (slot) do nothing;

create or replace function public.opinion_slot_mutate(
  p_slot smallint, p_action text,
  p_round uuid default null, p_participant text default null,
  p_text text default null, p_instruction text default null,
  p_id uuid default null
) returns jsonb language plpgsql set search_path to '' as $function$
declare
  s public.opinion_activity_slots%rowtype;
  participant_key text;
begin
  if p_slot is null or p_slot not between 2 and 8 then raise exception 'invalid_slot'; end if;
  select * into strict s from public.opinion_activity_slots where slot=p_slot for update;
  if p_action='save' then
    if p_text is null or char_length(btrim(p_text)) not between 1 and 80
      or p_instruction is null or char_length(p_instruction)>300 then
      raise exception 'invalid_topic';
    end if;
    if s.active then raise exception 'round_closed'; end if;
    s.topic := btrim(p_text);
    s.instruction := p_instruction;
  elsif p_action='start' then
    if not s.active then
      if p_round is distinct from s.round_id then raise exception 'round_closed'; end if;
      s.active := true; s.round_id := gen_random_uuid(); s.responses := '{}'::jsonb;
    end if;
  elsif p_action='reset' then
    if p_round is distinct from s.round_id then raise exception 'round_closed'; end if;
    s.active := false; s.round_id := null; s.responses := '{}'::jsonb;
  elsif p_action='submit' then
    if not s.active or p_round is null or p_round is distinct from s.round_id then raise exception 'round_closed'; end if;
    if p_participant is null or p_participant !~ '^[0-9a-f]{64}$'
      or p_text is null or char_length(p_text) not between 1 and 60
      or p_text !~ '[^[:space:]]' then raise exception 'invalid_text'; end if;
    if s.responses ? p_participant then return to_jsonb(s); end if;
    if (select count(*) from jsonb_object_keys(s.responses))>=100 then raise exception 'activity_full'; end if;
    s.responses := s.responses || jsonb_build_object(p_participant,
      jsonb_build_object('id',gen_random_uuid(),'text',p_text,'createdAt',clock_timestamp()));
  elsif p_action='delete' then
    if p_round is distinct from s.round_id then raise exception 'round_closed'; end if;
    select key into participant_key from jsonb_each(s.responses) where value->>'id'=p_id::text;
    if participant_key is null then return to_jsonb(s); end if;
    s.responses := jsonb_set(s.responses,array[participant_key,'text'],'null'::jsonb);
  else
    raise exception 'invalid_action';
  end if;
  update public.opinion_activity_slots
  set topic=s.topic,instruction=s.instruction,active=s.active,
      round_id=s.round_id,responses=s.responses,revision=s.revision+1
  where slot=p_slot returning * into s;
  return to_jsonb(s);
end;
$function$;
revoke all on function public.opinion_slot_mutate(smallint,text,uuid,text,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.opinion_slot_mutate(smallint,text,uuid,text,text,text,uuid)
  to service_role;

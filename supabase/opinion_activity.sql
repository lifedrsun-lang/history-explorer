-- Independent, server-only activity. No access to existing student/classroom data.
create table public.opinion_activity (
  id boolean primary key default true check (id),
  topic text not null default '나의 개인정보 보호 수칙',
  instruction text not null default 'AI를 사용할 때 개인정보를 보호하기 위해 지켜야 할 수칙을 한 문장으로 작성해 보세요.',
  active boolean not null default false,
  round_id uuid,
  revision bigint not null default 0,
  responses jsonb not null default '{}'::jsonb,
  check (char_length(topic) between 1 and 80),
  check (char_length(instruction) <= 300),
  check (jsonb_typeof(responses) = 'object'),
  check (active = (round_id is not null))
);
alter table public.opinion_activity enable row level security;
revoke all on public.opinion_activity from public, anon, authenticated;
grant select, insert, update, delete on public.opinion_activity to service_role;
insert into public.opinion_activity (id) values (true);

create function public.opinion_mutate(p_action text, p_round uuid default null, p_participant text default null,
  p_text text default null, p_instruction text default null, p_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  s public.opinion_activity%rowtype;
  participant_key text;
begin
  -- Every mutation takes this lock: reset/submit/delete/start cannot race.
  select * into strict s from public.opinion_activity where id = true for update;
  if p_action = 'save' then
    if p_text is null or char_length(btrim(p_text)) not between 1 and 80 or p_instruction is null or char_length(p_instruction) > 300 then
      raise exception 'invalid_topic';
    end if;
    s.topic := btrim(p_text); s.instruction := p_instruction;
  elsif p_action = 'start' then
    if not s.active then
      if p_round is distinct from s.round_id then raise exception 'round_closed'; end if;
      s.active := true; s.round_id := gen_random_uuid(); s.responses := '{}'::jsonb;
    end if;
  elsif p_action = 'reset' then
    if p_round is distinct from s.round_id then raise exception 'round_closed'; end if;
    s.active := false; s.round_id := null; s.responses := '{}'::jsonb;
  elsif p_action = 'submit' then
    if not s.active or p_round is null or p_round is distinct from s.round_id then raise exception 'round_closed'; end if;
    if p_participant is null or p_participant !~ '^[0-9a-f]{64}$' or p_text is null or
      char_length(p_text) not between 1 and 60 or p_text !~ '[^[:space:]]' then raise exception 'invalid_text'; end if;
    -- Retry is idempotent; deletion keeps a text-free tombstone until reset.
    if s.responses ? p_participant then return to_jsonb(s); end if;
    if (select count(*) from jsonb_object_keys(s.responses)) >= 100 then raise exception 'activity_full'; end if;
    s.responses := s.responses || jsonb_build_object(p_participant,
      jsonb_build_object('id',gen_random_uuid(),'text',p_text,'createdAt',clock_timestamp()));
  elsif p_action = 'delete' then
    if p_round is distinct from s.round_id then raise exception 'round_closed'; end if;
    select key into participant_key from jsonb_each(s.responses) where value->>'id' = p_id::text;
    if participant_key is null then return to_jsonb(s); end if;
    s.responses := jsonb_set(s.responses, array[participant_key,'text'], 'null'::jsonb);
  else raise exception 'invalid_action';
  end if;
  update public.opinion_activity set topic=s.topic,instruction=s.instruction,active=s.active,
    round_id=s.round_id,responses=s.responses,revision=s.revision+1 where id=true returning * into s;
  return to_jsonb(s);
end;
$$;
revoke all on function public.opinion_mutate(text,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.opinion_mutate(text,uuid,text,text,text,uuid) to service_role;
comment on table public.opinion_activity is 'Server-only singleton for live opinions; all temporary responses removed by reset.';

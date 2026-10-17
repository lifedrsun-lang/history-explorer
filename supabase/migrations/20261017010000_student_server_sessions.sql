-- Auth state is isolated from legacy Firebase client rules. No client role has access.
create table public.student_auth_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  student_collection text not null check (student_collection in ('students','student','Students','Student')),
  student_id text not null,
  credential_version text not null,
  teacher_uid text,
  photo_version uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index student_auth_sessions_expiry on public.student_auth_sessions(expires_at);
create table public.student_photo_credentials (
  student_key text primary key,
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  version uuid not null,
  issued_by text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table public.student_auth_attempts (
  key_hash text primary key,
  attempts integer not null,
  window_started_at timestamptz not null
);
alter table public.student_auth_sessions enable row level security;
alter table public.student_photo_credentials enable row level security;
alter table public.student_auth_attempts enable row level security;
revoke all on public.student_auth_sessions, public.student_photo_credentials, public.student_auth_attempts from public, anon, authenticated;
grant all on public.student_auth_sessions, public.student_photo_credentials, public.student_auth_attempts to service_role;

create function public.consume_student_auth_attempt(p_key_hash text, p_limit integer)
returns boolean language plpgsql security invoker set search_path = public as $$
declare used integer;
begin
  if p_key_hash !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_limit > 1000 then raise exception 'invalid auth budget'; end if;
  insert into public.student_auth_attempts as a(key_hash, attempts, window_started_at)
  values(p_key_hash, 1, now())
  on conflict(key_hash) do update set
    attempts = case when a.window_started_at <= now() - interval '15 minutes' then 1 else a.attempts + 1 end,
    window_started_at = case when a.window_started_at <= now() - interval '15 minutes' then now() else a.window_started_at end
  returning attempts into used;
  return used <= p_limit;
end $$;
revoke all on function public.consume_student_auth_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.consume_student_auth_attempt(text, integer) to service_role;

-- Operational cleanup; never depend on cleanup for authorization or expiry.
create function public.cleanup_student_auth_state()
returns void language sql security invoker set search_path = public as $$
  delete from public.student_auth_sessions where expires_at <= now();
  delete from public.student_auth_attempts where window_started_at < now() - interval '1 day';
$$;
revoke all on function public.cleanup_student_auth_state() from public, anon, authenticated;
grant execute on function public.cleanup_student_auth_state() to service_role;

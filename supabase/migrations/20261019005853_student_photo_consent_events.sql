-- Additive, server-only audit log. Existing students, albums and photos are unchanged.
create table public.student_photo_consent_events (
  event_order bigint generated always as identity primary key,
  id uuid not null unique,
  album_id uuid not null references public.student_photo_albums(id) on delete restrict,
  student_key text not null check (student_key ~ '^(students|student|Students|Student):[^/[:space:]:]{1,128}$'),
  publication boolean not null,
  viewing boolean not null,
  guardian_declared boolean not null,
  policy_version text not null check (length(policy_version) between 1 and 64),
  scope_hash text not null check (scope_hash ~ '^[a-f0-9]{64}$'),
  expires_on date not null,
  notice jsonb not null check (jsonb_typeof(notice)='object' and octet_length(notice::text) <= 8192),
  created_at timestamptz not null default clock_timestamp(),
  check (not publication or guardian_declared)
);
create index student_photo_consents_latest_idx on public.student_photo_consent_events(album_id,student_key,event_order desc);
alter table public.student_photo_consent_events enable row level security;
revoke all on public.student_photo_consent_events from public,anon,authenticated,service_role;
grant select,insert on public.student_photo_consent_events to service_role;
revoke all on sequence public.student_photo_consent_events_event_order_seq from public,anon,authenticated,service_role;
grant usage on sequence public.student_photo_consent_events_event_order_seq to service_role;
create function public.photo_archive_latest_consents(p_album_ids uuid[],p_student_key text default null)
returns setof public.student_photo_consent_events language sql stable security invoker set search_path=public as $$
  select distinct on (c.album_id,c.student_key) c.* from public.student_photo_consent_events c
  where c.album_id=any(p_album_ids) and (p_student_key is null or c.student_key=p_student_key)
  order by c.album_id,c.student_key,c.event_order desc;
$$;
revoke all on function public.photo_archive_latest_consents(uuid[],text) from public,anon,authenticated;
grant execute on function public.photo_archive_latest_consents(uuid[],text) to service_role;
comment on table public.student_photo_consent_events is 'Append-only account-linked guardian declarations, not proof of verified guardian identity. Per-album scope/version/expiry decisions; server-only.';

-- Additive, server-only counters. No operational photos/accounts are updated.
create table public.student_photo_download_counts (
  photo_id uuid not null references public.student_archive_photos(id) on delete restrict,
  student_key text not null check (student_key ~ '^(students|student|Students|Student):[^:]{1,200}$'),
  used_count smallint not null check (used_count between 1 and 3),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (photo_id, student_key)
);
alter table public.student_photo_download_counts enable row level security;
revoke all on table public.student_photo_download_counts from public, anon, authenticated;
grant select, insert, update on table public.student_photo_download_counts to service_role;
revoke delete on table public.student_photo_download_counts from service_role;

create function public.claim_student_photo_download(p_student_key text, p_photo_id uuid)
returns integer language plpgsql security invoker set search_path = '' as $$
declare claimed integer;
begin
  insert into public.student_photo_download_counts as downloads (photo_id, student_key, used_count)
  values (p_photo_id, p_student_key, 1)
  on conflict (photo_id, student_key) do update
    set used_count = downloads.used_count + 1, updated_at = clock_timestamp()
    where downloads.used_count < 3
  returning used_count into claimed;
  return coalesce(claimed, 0);
end;
$$;
revoke all on function public.claim_student_photo_download(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_student_photo_download(text, uuid) to service_role;

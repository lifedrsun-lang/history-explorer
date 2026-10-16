-- A newly registered photo has not yet been covered by the album's previous consent review.
-- Invalidate publication in the same transaction as the new photo; keep every original.
create function public.photo_archive_require_new_consent()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  update public.student_photo_albums
    set published = false, consent_verified = false,
        revision = revision + 1, updated_at = now()
    where id = new.album_id;
  return new;
end;
$$;
revoke all on function public.photo_archive_require_new_consent() from public, anon, authenticated;
grant execute on function public.photo_archive_require_new_consent() to service_role;
create trigger student_archive_photos_new_consent
after insert on public.student_archive_photos
for each row execute function public.photo_archive_require_new_consent();

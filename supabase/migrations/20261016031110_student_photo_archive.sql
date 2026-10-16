-- Additive only: no existing student, lesson, reward or photo records are changed.
-- Firebase authenticates users; browser Supabase roles must never access these tables.
create table public.student_photo_albums (
  id uuid primary key,
  owner_uid text not null,
  school text not null check (length(school) between 1 and 150),
  classroom text not null check (length(classroom) between 1 and 100),
  year integer not null check (year between 2000 and 2100),
  quarter integer not null check (quarter between 1 and 4),
  title text not null check (length(title) between 1 and 200),
  description text not null default '',
  term_end_date date not null,
  end_date_source text not null check (length(end_date_source) between 1 and 500),
  expires_on date,
  published boolean not null default false,
  consent_verified boolean not null default false,
  consent_note text not null default '',
  roster_verified boolean not null default false,
  roster_source text not null default '',
  member_keys text[] not null default '{}',
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not published or (consent_verified and roster_verified and length(consent_note) > 0 and length(roster_source) > 0 and cardinality(member_keys) > 0))
);
create table public.student_archive_photos (
  id uuid primary key,
  album_id uuid not null references public.student_photo_albums(id) on delete restrict,
  caption text not null default '' check (length(caption) <= 1000),
  original_path text not null unique,
  thumb_path text not null unique,
  display_path text not null unique,
  original_type text not null check (original_type in ('image/jpeg','image/png','image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index student_photo_albums_owner_idx on public.student_photo_albums(owner_uid, created_at desc);
create index student_photo_albums_members_idx on public.student_photo_albums using gin(member_keys);
create index student_archive_photos_album_idx on public.student_archive_photos(album_id, created_at, id) where deleted_at is null;
alter table public.student_photo_albums enable row level security;
alter table public.student_archive_photos enable row level security;
revoke all on public.student_photo_albums, public.student_archive_photos from public, anon, authenticated;
grant select, insert, update, delete on public.student_photo_albums, public.student_archive_photos to service_role;
comment on table public.student_photo_albums is 'Server-only verified historical class roster and private album metadata. No automatic inference from current school/grade.';
comment on table public.student_archive_photos is 'Server-only private storage paths. Student API never returns storage paths or signed download URLs.';

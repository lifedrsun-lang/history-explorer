-- Teacher-created PNG snapshots survive activity reset and belong to one class/lesson.
create table public.opinion_lesson_images (
 id uuid primary key,
 school_slug text not null,
 classroom_id text not null,
 lesson_id text not null,
 lesson_number integer not null check (lesson_number between 1 and 100),
 topic text not null check (char_length(topic) between 1 and 80),
 opinion_count integer not null check (opinion_count between 1 and 100),
 created_by text not null,
 bucket text not null,
 storage_path text not null unique,
 created_at timestamptz not null default now()
);
create index opinion_lesson_images_class_idx on public.opinion_lesson_images (school_slug,classroom_id,created_at);
alter table public.opinion_lesson_images enable row level security;
revoke all on public.opinion_lesson_images from public,anon,authenticated;
grant select,insert,update,delete on public.opinion_lesson_images to service_role;

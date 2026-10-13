-- Keep existing opinion PNGs intact and allow independently uploaded class photos.
alter table public.opinion_lesson_images alter column opinion_count drop not null;
alter table public.opinion_lesson_images
  add column content_type text not null default 'image/png'
    check (content_type in ('image/png', 'image/webp'));

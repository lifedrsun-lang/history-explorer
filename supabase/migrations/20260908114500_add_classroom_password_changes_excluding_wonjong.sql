create table public.classroom_account_password_changes (
  school text not null check (
    school in (
      '서울개봉초등학교',
      '광명광일초등학교',
      '화성월문초등학교'
    )
  ),
  grade smallint not null check (grade between 1 and 12),
  class_number smallint not null check (class_number between 1 and 99),
  student_number smallint not null check (student_number between 1 and 99),
  account_id text not null check (char_length(btrim(account_id)) between 1 and 256),
  changed_password text not null check (char_length(btrim(changed_password)) between 1 and 256),
  changed_by text,
  changed_at timestamptz not null default now(),
  primary key (school, grade, class_number, student_number)
);

comment on table public.classroom_account_password_changes is
  'Server-only current password override for classroom accounts. Wonjong is intentionally excluded.';
comment on column public.classroom_account_password_changes.changed_password is
  'Sensitive current classroom password after a Hello Maple password change. Server-side access only.';

alter table public.classroom_account_password_changes enable row level security;
alter table public.classroom_account_password_changes force row level security;

revoke all on table public.classroom_account_password_changes from public;
revoke all on table public.classroom_account_password_changes from anon;
revoke all on table public.classroom_account_password_changes from authenticated;
grant select, insert, update, delete on table public.classroom_account_password_changes to service_role;

alter table public.classroom_account_password_changes
  drop constraint if exists classroom_account_password_changes_school_check;

alter table public.classroom_account_password_changes
  add constraint classroom_account_password_changes_school_check
  check (char_length(btrim(school)) between 1 and 200);

comment on table public.classroom_account_password_changes is
  'Server-only current password override for contract-school classroom accounts. Wonjong remains excluded by application rules.';

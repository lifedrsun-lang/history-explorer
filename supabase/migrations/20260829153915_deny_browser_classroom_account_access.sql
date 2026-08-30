create policy "deny browser access to classroom account rosters"
on public.classroom_account_rosters
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

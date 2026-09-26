-- Evaluate the cross-table profile visibility checks as the function owner.
-- This avoids recursive RLS evaluation through bookings' admin read policy.
create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null and (
    p_profile_id = auth.uid()
    or exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.role = 'admin'
    )
    or exists (
      select 1
      from public.bookings b
      join public.schedules s on s.id = b.schedule_id
      where b.passenger_id = p_profile_id and s.driver_id = auth.uid()
    )
  );
$$;
revoke all on function public.can_view_profile(uuid) from public, anon;
grant execute on function public.can_view_profile(uuid) to authenticated;

drop policy if exists "Profiles visible to owner admins and assigned drivers" on public.profiles;
create policy "Profiles visible to owner admins and assigned drivers" on public.profiles
  for select to authenticated using (public.can_view_profile(id));

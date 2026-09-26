-- Expose only an aggregate count of active vehicles, including those awaiting
-- verification. Passenger-facing vehicle rows remain protected by RLS.
create or replace function public.count_active_vehicles()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.vehicles where status = 'active';
$$;

revoke all on function public.count_active_vehicles() from public;
grant execute on function public.count_active_vehicles() to anon, authenticated;

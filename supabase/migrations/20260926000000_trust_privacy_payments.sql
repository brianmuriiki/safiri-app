-- Apply this migration once to an existing Safiri database.
-- ============================================================
-- PRIVACY, CANCELLATION AND VERIFICATION WORKFLOWS
-- Safe to re-run after the schema above has been applied.
-- ============================================================

alter table public.profiles add column if not exists driver_verification_status text not null default 'unverified'
  check (driver_verification_status in ('unverified', 'pending', 'verified', 'rejected'));
alter table public.vehicles add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

create or replace function public.current_user_driver_verification_status()
returns text language sql stable security definer set search_path = public as $$
  select driver_verification_status from public.profiles where id = auth.uid();
$$;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id
    and role::text = public.current_user_role()
    and banned_at is not distinct from public.current_user_banned_at()
    and driver_verification_status is not distinct from public.current_user_driver_verification_status());

-- Older versions required this legacy column; the current Edge Function writes `phone`.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='phone_number') then
    alter table public.payments alter column phone_number drop not null;
  end if;
end
$$;

-- Refunds are recorded after the admin completes them in the Paystack Dashboard.
do $$
declare v_type text;
begin
  select udt_name into v_type from information_schema.columns
    where table_schema='public' and table_name='payments' and column_name='status';
  if v_type = 'payment_status' then
    execute 'alter type public.payment_status add value if not exists ''refunded''';
  else
    alter table public.payments drop constraint if exists payments_status_check;
    alter table public.payments add constraint payments_status_check
      check (status in ('pending', 'confirmed', 'failed', 'refunded'));
  end if;
end
$$;

-- Existing drivers and vehicles need explicit review before they are listed for new trips.
drop policy if exists "Anyone can view active vehicles" on public.vehicles;
create policy "Anyone can view verified active vehicles" on public.vehicles for select
  using (status = 'active' and verification_status = 'verified');
drop policy if exists "Passengers view scheduled trips" on public.schedules;
create policy "Passengers view scheduled trips" on public.schedules for select using (
  status = 'scheduled'
  and exists (select 1 from public.profiles p where p.id = driver_id and p.role = 'driver'
    and p.banned_at is null and p.driver_verification_status = 'verified')
  and exists (select 1 from public.vehicles v where v.id = vehicle_id
    and v.status = 'active' and v.verification_status = 'verified')
);
drop policy if exists "Passengers view schedules for own bookings" on public.schedules;
create or replace function public.has_own_booking_for_schedule(p_schedule_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings b where b.schedule_id = p_schedule_id and b.passenger_id = auth.uid());
$$;
revoke all on function public.has_own_booking_for_schedule(uuid) from public, anon;
grant execute on function public.has_own_booking_for_schedule(uuid) to authenticated;
create policy "Passengers view schedules for own bookings" on public.schedules for select
  using (public.has_own_booking_for_schedule(id));

create or replace function public.require_verified_schedule_operators()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.driver_id and p.role = 'driver'
    and p.banned_at is null and p.driver_verification_status = 'verified') then
    raise exception 'Schedule driver must be verified and active';
  end if;
  if not exists (select 1 from public.vehicles v where v.id = new.vehicle_id
    and v.status = 'active' and v.verification_status = 'verified') then
    raise exception 'Schedule vehicle must be verified and active';
  end if;
  return new;
end;
$$;
drop trigger if exists schedules_require_verified_operators on public.schedules;
create trigger schedules_require_verified_operators before insert or update of driver_id, vehicle_id
  on public.schedules for each row execute function public.require_verified_schedule_operators();

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('access', 'correction', 'deletion')),
  details text not null,
  status text not null default 'received' check (status in ('received', 'in_review', 'completed', 'declined')),
  admin_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.privacy_requests enable row level security;
drop policy if exists "Users view own privacy requests" on public.privacy_requests;
drop policy if exists "Users submit privacy requests" on public.privacy_requests;
drop policy if exists "Admins manage privacy requests" on public.privacy_requests;
create policy "Users view own privacy requests" on public.privacy_requests for select using (user_id = auth.uid());
create policy "Users submit privacy requests" on public.privacy_requests for insert
  with check (user_id = auth.uid() and status = 'received');
create policy "Admins manage privacy requests" on public.privacy_requests for all
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.booking_change_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('cancellation', 'refund')),
  reason text not null,
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'processing', 'completed')),
  admin_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists booking_change_requests_one_open_per_kind
  on public.booking_change_requests (booking_id, kind)
  where status in ('requested', 'approved', 'processing');
alter table public.booking_change_requests enable row level security;
drop policy if exists "Passengers view own booking change requests" on public.booking_change_requests;
drop policy if exists "Passengers request booking changes" on public.booking_change_requests;
drop policy if exists "Admins manage booking change requests" on public.booking_change_requests;
create policy "Passengers view own booking change requests" on public.booking_change_requests for select
  using (passenger_id = auth.uid());
create policy "Passengers request booking changes" on public.booking_change_requests for insert with check (
  passenger_id = auth.uid()
  and status = 'requested'
  and exists (select 1 from public.bookings b where b.id = booking_id
    and b.passenger_id = auth.uid() and b.status in ('pending', 'confirmed'))
  and ((kind = 'refund' and exists (select 1 from public.payments p where p.booking_id = public.booking_change_requests.booking_id and p.status = 'confirmed'))
    or (kind = 'cancellation' and not exists (select 1 from public.payments p where p.booking_id = public.booking_change_requests.booking_id and p.status = 'confirmed')))
);
create policy "Admins manage booking change requests" on public.booking_change_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- Booking/payment state is server-managed; passengers create requests, but cannot
-- mark bookings confirmed or insert fake payment rows from the browser.
drop policy if exists "Passengers update own bookings" on public.bookings;
drop policy if exists "Users create payments" on public.payments;
drop policy if exists "Passengers create bookings" on public.bookings;
create policy "Passengers create bookings" on public.bookings for insert with check (
  passenger_id = auth.uid() and status = 'pending'
  and exists (select 1 from public.schedules s where s.id = schedule_id
    and s.status = 'scheduled' and s.seats_available > 0 and amount = s.price)
);

create or replace function public.admin_cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status in ('pending', 'confirmed') then
    update public.bookings set status = 'cancelled' where id = p_booking_id;
    if v_booking.status = 'confirmed' then
      update public.schedules s set seats_available = least(s.seats_available + 1, v.seat_count)
        from public.vehicles v where s.id = v_booking.schedule_id and v.id = s.vehicle_id;
    end if;
    delete from public.tickets where booking_id = p_booking_id;
  end if;
end;
$$;
revoke all on function public.admin_cancel_booking(uuid) from public, anon;
grant execute on function public.admin_cancel_booking(uuid) to authenticated;

-- A verified payment reference is processed once, under a booking row lock.
create or replace function public.confirm_paystack_payment(
  p_booking_id uuid,
  p_passenger_id uuid,
  p_schedule_id uuid,
  p_reference text,
  p_amount_kobo bigint,
  p_currency text,
  p_channel text,
  p_paid_at timestamptz,
  p_phone text default ''
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_price numeric;
  v_payment_booking uuid;
begin
  if p_currency <> 'KES' or p_amount_kobo <= 0 or p_reference is null or length(p_reference) > 200 then
    raise exception 'Invalid verified Paystack transaction';
  end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.passenger_id <> p_passenger_id or v_booking.schedule_id <> p_schedule_id then
    raise exception 'Payment reference does not match booking';
  end if;
  select price into v_price from public.schedules where id = v_booking.schedule_id;
  if v_price is null or round(v_price * 100)::bigint <> p_amount_kobo then
    raise exception 'Payment amount does not match booking';
  end if;
  select booking_id into v_payment_booking from public.payments where paystack_reference = p_reference for update;
  if v_payment_booking is not null and v_payment_booking <> p_booking_id then
    raise exception 'Paystack reference already belongs to another booking';
  end if;
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'Booking is no longer payable';
  end if;
  if v_booking.status = 'pending' then
    update public.schedules set seats_available = greatest(seats_available - 1, 0)
      where id = v_booking.schedule_id and seats_available > 0;
    if not found then raise exception 'No seats remain on this schedule'; end if;
    update public.bookings set status = 'confirmed' where id = p_booking_id;
  end if;
  insert into public.payments (booking_id, amount, phone, status, paystack_reference,
    paystack_channel, paystack_paid_at)
  values (p_booking_id, p_amount_kobo / 100.0, coalesce(p_phone, ''), 'confirmed', p_reference,
    p_channel, p_paid_at)
  on conflict (paystack_reference) do update set status = 'confirmed',
    paystack_channel = excluded.paystack_channel, paystack_paid_at = excluded.paystack_paid_at;
  insert into public.tickets (booking_id) values (p_booking_id) on conflict (booking_id) do nothing;
end;
$$;
revoke all on function public.confirm_paystack_payment(uuid, uuid, uuid, text, bigint, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.confirm_paystack_payment(uuid, uuid, uuid, text, bigint, text, text, timestamptz, text) to service_role;

-- Restrict personal profile information to its owner, administrators, and the
-- driver assigned to a passenger's booking.
drop policy if exists "Users can view all profiles" on public.profiles;
drop policy if exists "Profiles visible to owner admins and assigned drivers" on public.profiles;
create policy "Profiles visible to owner admins and assigned drivers" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
      join public.schedules s on s.id = b.schedule_id
      where b.passenger_id = profiles.id and s.driver_id = auth.uid()
    )
  );

create unique index if not exists profiles_phone_unique
  on public.profiles (phone) where phone is not null;

create or replace function public.count_active_drivers()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.profiles where role = 'driver' and banned_at is null;
$$;
revoke all on function public.count_active_drivers() from public;
grant execute on function public.count_active_drivers() to anon, authenticated;

-- Seat reservations are serialized on the schedule row; old pending rows are
-- expired without releasing capacity because they did not reserve a seat.
alter table public.bookings add column if not exists seat_reserved boolean not null default false;
alter table public.bookings add column if not exists payment_expires_at timestamptz;
update public.bookings set seat_reserved = true where status = 'confirmed';
update public.bookings set payment_expires_at = now()
  where status = 'pending' and payment_expires_at is null;
do $$
declare v_type text;
begin
  select udt_name into v_type from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'status';
  if v_type <> 'payment_status' then
    alter table public.payments drop constraint if exists payments_status_check;
    alter table public.payments add constraint payments_status_check
      check (status in ('pending', 'initiated', 'confirmed', 'failed', 'refunded'));
  end if;
end
$$;
create unique index if not exists payments_one_initiated_attempt_per_booking
  on public.payments (booking_id) where status = 'initiated';

-- Keep historical bookings and payments, but remove conflicting seat claims.
with ranked_seats as (
  select id, row_number() over (
    partition by schedule_id, seat_number order by created_at, id
  ) as seat_rank
  from public.bookings
  where status in ('pending', 'confirmed') and seat_number is not null
)
update public.bookings b set seat_number = null
from ranked_seats r where r.id = b.id and r.seat_rank > 1;
create unique index if not exists bookings_one_active_booking_per_seat
  on public.bookings (schedule_id, seat_number)
  where seat_number is not null and status in ('pending', 'confirmed');

create or replace function public.get_unavailable_seats(p_schedule_id uuid)
returns integer[] language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  return coalesce((
    select array_agg(b.seat_number order by b.seat_number)
    from public.bookings b
    where b.schedule_id = p_schedule_id and b.seat_number is not null
      and (b.status = 'confirmed' or (b.status = 'pending' and b.payment_expires_at > now()))
  ), '{}'::integer[]);
end;
$$;
revoke all on function public.get_unavailable_seats(uuid) from public, anon;
grant execute on function public.get_unavailable_seats(uuid) to authenticated;

create or replace function public.release_expired_booking_seats()
returns integer language plpgsql security definer set search_path = public as $$
declare v_released integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  with expired as (
    update public.bookings b set status = 'cancelled', seat_reserved = false
    where b.status = 'pending' and b.seat_reserved and b.payment_expires_at <= now()
      and not exists (select 1 from public.payments p where p.booking_id = b.id and p.status = 'initiated')
    returning b.schedule_id
  ), per_schedule as (
    select schedule_id, count(*)::integer as reservation_count from expired group by schedule_id
  ), released as (
    update public.schedules s set seats_available = least(s.seats_available + p.reservation_count, v.seat_count)
    from per_schedule p, public.vehicles v
    where s.id = p.schedule_id and v.id = s.vehicle_id
    returning p.reservation_count
  ) select coalesce(sum(reservation_count), 0)::integer into v_released from released;
  return v_released;
end;
$$;
revoke all on function public.release_expired_booking_seats() from public, anon;
grant execute on function public.release_expired_booking_seats() to authenticated;

create or replace function public.create_booking(
  p_schedule_id uuid,
  p_seat_number integer,
  p_pickup_stop text default null,
  p_dropoff_stop text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_schedule public.schedules%rowtype;
  v_capacity integer;
  v_expired integer;
  v_booking_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and p.role = 'passenger' and p.banned_at is null
  ) then raise exception 'Passenger account required'; end if;

  select * into v_schedule from public.schedules where id = p_schedule_id for update;
  if not found or v_schedule.status <> 'scheduled' or v_schedule.departure_at <= now() then
    raise exception 'Schedule is unavailable';
  end if;
  select seat_count into v_capacity from public.vehicles where id = v_schedule.vehicle_id;
  if not exists (select 1 from public.profiles p where p.id = v_schedule.driver_id
    and p.role = 'driver' and p.banned_at is null and p.driver_verification_status = 'verified')
    or not exists (select 1 from public.vehicles v where v.id = v_schedule.vehicle_id
      and v.status = 'active' and v.verification_status = 'verified') then
    raise exception 'Schedule operators are not verified and active';
  end if;
  if p_seat_number is null or p_seat_number < 1 or p_seat_number > coalesce(v_capacity, 0) then
    raise exception 'Selected seat is outside this vehicle capacity';
  end if;

  update public.bookings set status = 'cancelled', seat_reserved = false
    where schedule_id = p_schedule_id and status = 'pending'
      and payment_expires_at <= now() and not seat_reserved;
  update public.bookings set status = 'cancelled', seat_reserved = false
    where schedule_id = p_schedule_id and status = 'pending'
      and payment_expires_at <= now() and seat_reserved
      and not exists (select 1 from public.payments p where p.booking_id = bookings.id and p.status = 'initiated');
  get diagnostics v_expired = row_count;
  if v_expired > 0 then
    update public.schedules set seats_available = least(seats_available + v_expired, coalesce(v_capacity, seats_available))
      where id = p_schedule_id;
  end if;

  select * into v_schedule from public.schedules where id = p_schedule_id for update;
  if v_schedule.seats_available <= 0 then raise exception 'No seats remain on this schedule'; end if;
  if exists (select 1 from public.bookings b where b.schedule_id = p_schedule_id
    and b.seat_number = p_seat_number and b.status in ('pending', 'confirmed')) then
    raise exception 'That seat has just been booked. Choose another seat.';
  end if;

  insert into public.bookings (passenger_id, trip_id, schedule_id, amount, seat_id,
    seat_number, status, seat_reserved, payment_expires_at)
  values (auth.uid(), p_schedule_id, p_schedule_id, v_schedule.price, p_seat_number,
    p_seat_number, 'pending', true, now() + interval '45 minutes')
  returning id into v_booking_id;
  update public.schedules set seats_available = seats_available - 1 where id = p_schedule_id;
  return v_booking_id;
end;
$$;
revoke all on function public.create_booking(uuid, integer, text, text) from public, anon;
grant execute on function public.create_booking(uuid, integer, text, text) to authenticated;

drop policy if exists "Passengers create bookings" on public.bookings;
drop policy if exists "Passengers update own bookings" on public.bookings;
create policy "Passengers create bookings" on public.bookings for insert with check (false);

create or replace function public.admin_cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status in ('pending', 'confirmed') then
    update public.bookings set status = 'cancelled', seat_reserved = false where id = p_booking_id;
    if v_booking.seat_reserved then
      update public.schedules s set seats_available = least(s.seats_available + 1, v.seat_count)
        from public.vehicles v where s.id = v_booking.schedule_id and v.id = s.vehicle_id;
    end if;
    delete from public.tickets where booking_id = p_booking_id;
  end if;
end;
$$;
revoke all on function public.admin_cancel_booking(uuid) from public, anon;
grant execute on function public.admin_cancel_booking(uuid) to authenticated;

create or replace function public.confirm_paystack_payment(
  p_booking_id uuid, p_passenger_id uuid, p_schedule_id uuid, p_reference text,
  p_amount_kobo bigint, p_currency text, p_channel text, p_paid_at timestamptz,
  p_phone text default ''
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
  v_price numeric;
  v_payment_booking uuid;
  v_payment_status text;
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
  select booking_id, status into v_payment_booking, v_payment_status
    from public.payments where paystack_reference = p_reference for update;
  if v_payment_booking is not null and v_payment_booking <> p_booking_id then
    raise exception 'Paystack reference already belongs to another booking';
  end if;
  if v_booking.status = 'confirmed' then
    if v_payment_booking = p_booking_id and v_payment_status = 'confirmed' then
      insert into public.tickets (booking_id) values (p_booking_id) on conflict (booking_id) do nothing;
      return;
    end if;
    raise exception 'This booking already has a confirmed payment';
  end if;
  if v_booking.status <> 'pending' then raise exception 'Booking is no longer payable'; end if;
  if not v_booking.seat_reserved then
    raise exception 'This seat reservation expired. Please create a new booking.';
  end if;
  if exists (select 1 from public.payments where booking_id = p_booking_id and status = 'confirmed') then
    raise exception 'This booking already has a confirmed payment';
  end if;
  if v_payment_booking is distinct from p_booking_id or v_payment_status <> 'initiated' then
    raise exception 'Payment attempt was not initialized for this booking';
  end if;
  update public.bookings set status = 'confirmed' where id = p_booking_id;
  update public.payments set amount = p_amount_kobo / 100.0, phone = coalesce(p_phone, ''),
    status = 'confirmed', paystack_channel = p_channel, paystack_paid_at = p_paid_at
    where paystack_reference = p_reference and booking_id = p_booking_id and status = 'initiated';
  insert into public.tickets (booking_id) values (p_booking_id) on conflict (booking_id) do nothing;
end;
$$;
revoke all on function public.confirm_paystack_payment(uuid, uuid, uuid, text, bigint, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.confirm_paystack_payment(uuid, uuid, uuid, text, bigint, text, text, timestamptz, text) to service_role;

create or replace function public.admin_analytics_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_summary jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'active_vehicles', (select count(*) from public.vehicles where status = 'active'),
    'routes', (select count(*) from public.routes),
    'bookings', (select count(*) from public.bookings),
    'revenue', (select coalesce(sum(amount), 0) from public.payments where status = 'confirmed'),
    'week_revenue', (select coalesce(sum(amount), 0) from public.payments
      where status = 'confirmed' and created_at >= date_trunc('day', now()) - interval '6 days'),
    'complaints', (select count(*) from public.complaints where status = 'open'),
    'booking_statuses', coalesce((select jsonb_object_agg(status, status_count)
      from (select status, count(*) as status_count from public.bookings group by status) counts), '{}'::jsonb),
    'booking_days', coalesce((select jsonb_object_agg(day_key, day_count)
      from (select to_char(created_at at time zone 'Africa/Nairobi', 'YYYY-MM-DD') as day_key, count(*) as day_count
        from public.bookings where created_at >= timezone('Africa/Nairobi', date_trunc('day', now() at time zone 'Africa/Nairobi') - interval '6 days')
        group by day_key) days), '{}'::jsonb)
  ) into v_summary;
  return v_summary;
end;
$$;
revoke all on function public.admin_analytics_summary() from public, anon;
grant execute on function public.admin_analytics_summary() to authenticated;

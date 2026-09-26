-- ============================================================
-- SAFIRI DATABASE SCHEMA
-- Run this in your Supabase SQL editor
-- ============================================================

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  phone text,
  full_name text,
  avatar_url text,
  role text not null default 'passenger' check (role in ('passenger', 'driver', 'admin')),
  banned_at timestamptz,
  created_at timestamptz default now()
);

-- Add columns when this script is applied to an older profiles table.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text default 'passenger';
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz default now();

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

alter table public.profiles alter column email set not null;

alter table public.profiles enable row level security;
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_banned_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select banned_at from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role()::text = 'admin';
$$;

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role::text = public.current_user_role()
    and banned_at is not distinct from public.current_user_banned_at()
  );
create policy "Admins can update any profile" on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, phone, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Routes
create table if not exists public.routes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  origin text not null,
  destination text not null,
  location text,
  distance_km numeric default 0,
  base_fare numeric default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.routes add column if not exists location text;
alter table public.routes add column if not exists active boolean not null default true;
alter table public.routes enable row level security;
drop policy if exists "Anyone can view routes" on public.routes;
create policy "Anyone can view routes" on public.routes for select using (true);
drop policy if exists "Admins manage routes" on public.routes;
create policy "Admins manage routes" on public.routes for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Vehicles
create table if not exists public.vehicles (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('matatu', 'bus', 'taxi', 'bodaboda')),
  number_plate text not null unique,
  seat_count int default 14,
  owner_id uuid references public.profiles(id),
  route_id uuid references public.routes(id),
  status text default 'active' check (status in ('active', 'inactive', 'banned')),
  model text,
  color text,
  location text,
  created_at timestamptz default now()
);
alter table public.vehicles add column if not exists location text;
alter table public.vehicles enable row level security;
drop policy if exists "Anyone can view active vehicles" on public.vehicles;
create policy "Anyone can view active vehicles" on public.vehicles for select using (status = 'active');
drop policy if exists "Admins manage vehicles" on public.vehicles;
create policy "Admins manage vehicles" on public.vehicles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Schedules
create table if not exists public.schedules (
  id uuid default gen_random_uuid() primary key,
  route_id uuid references public.routes(id) not null,
  vehicle_id uuid references public.vehicles(id) not null,
  driver_id uuid references public.profiles(id) not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  seats_available int not null default 14,
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  price numeric not null default 50,
  created_at timestamptz default now()
);

-- Add schedule columns when upgrading an older schedules table.
alter table public.schedules add column if not exists route_id uuid;
alter table public.schedules add column if not exists vehicle_id uuid;
alter table public.schedules enable row level security;
drop policy if exists "Passengers view scheduled trips" on public.schedules;
create policy "Passengers view scheduled trips" on public.schedules for select
  using (status = 'scheduled');
drop policy if exists "Admins manage schedules" on public.schedules;
create policy "Admins manage schedules" on public.schedules for all
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Drivers view own schedules" on public.schedules;
create policy "Drivers view own schedules" on public.schedules for select using (driver_id = auth.uid());

-- Bookings
create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  passenger_id uuid references public.profiles(id) not null,
  trip_id uuid references public.schedules(id) not null,
  schedule_id uuid references public.schedules(id) not null,
  amount numeric not null default 0,
  seat_id int not null,
  seat_number int,
  pickup_stop text,
  dropoff_stop text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  seat_reserved boolean not null default false,
  payment_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Add booking columns when upgrading an older bookings table.
alter table public.bookings add column if not exists passenger_id uuid;
alter table public.bookings add column if not exists trip_id uuid;
alter table public.bookings add column if not exists schedule_id uuid;
alter table public.bookings add column if not exists amount numeric default 0;
alter table public.bookings drop constraint if exists bookings_seat_id_fkey;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'seat_id'
      and data_type = 'uuid'
  ) then
    alter table public.bookings drop column seat_id;
  end if;
end
$$;

alter table public.bookings add column if not exists seat_id int;
alter table public.bookings add column if not exists seat_number int;
alter table public.bookings add column if not exists pickup_stop text;
alter table public.bookings add column if not exists dropoff_stop text;
alter table public.bookings add column if not exists status text default 'pending';
alter table public.bookings add column if not exists seat_reserved boolean not null default false;
alter table public.bookings add column if not exists payment_expires_at timestamptz;
alter table public.bookings add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_trip_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_trip_id_fkey
      foreign key (trip_id) references public.schedules(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_schedule_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_schedule_id_fkey
      foreign key (schedule_id) references public.schedules(id);
  end if;
end
$$;

alter table public.bookings enable row level security;
drop policy if exists "Passengers see own bookings" on public.bookings;
create policy "Passengers see own bookings" on public.bookings for select using (passenger_id = auth.uid());
drop policy if exists "Passengers create bookings" on public.bookings;
create policy "Passengers create bookings" on public.bookings for insert with check (passenger_id = auth.uid());
drop policy if exists "Passengers update own bookings" on public.bookings;
create policy "Passengers update own bookings" on public.bookings for update using (passenger_id = auth.uid());
drop policy if exists "Drivers see bookings for their schedules" on public.bookings;
create policy "Drivers see bookings for their schedules" on public.bookings for select using (
  exists (
    select 1
    from public.schedules s
    where s.id = public.bookings.schedule_id and s.driver_id = auth.uid()
  )
);
drop policy if exists "Admins see all bookings" on public.bookings;
create policy "Admins see all bookings" on public.bookings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Payments
-- Older Safiri databases may use the `payment_status` enum. The app records a
-- successful simulated M-Pesa payment as `confirmed`, so preserve that value
-- when this schema is applied to one of those databases.
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payment_status' and n.nspname = 'public'
  ) then
    execute 'alter type public.payment_status add value if not exists ''confirmed''';
  end if;
end
$$;

create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings(id) not null,
  amount numeric not null,
  mpesa_receipt text,
  phone text not null,
  status text default 'pending' check (status in ('pending', 'initiated', 'confirmed', 'failed', 'refunded')),
  paystack_reference text,
  paystack_channel text,
  paystack_paid_at timestamptz,
  created_at timestamptz default now()
);

-- Add payment columns when upgrading an older payments table.
alter table public.payments add column if not exists booking_id uuid;
alter table public.payments add column if not exists amount numeric default 0;
alter table public.payments add column if not exists mpesa_receipt text;
alter table public.payments add column if not exists phone text;
alter table public.payments add column if not exists status text default 'pending';
alter table public.payments add column if not exists created_at timestamptz default now();
alter table public.payments add column if not exists paystack_reference text;
alter table public.payments add column if not exists paystack_channel text;
alter table public.payments add column if not exists paystack_paid_at timestamptz;
create unique index if not exists payments_paystack_reference_unique
  on public.payments (paystack_reference);
create unique index if not exists payments_one_initiated_attempt_per_booking
  on public.payments (booking_id) where status = 'initiated';

alter table public.payments enable row level security;
drop policy if exists "Users see own payments" on public.payments;
create policy "Users see own payments" on public.payments for select using (
  exists (
    select 1
    from public.bookings b
    where b.id = public.payments.booking_id and b.passenger_id = auth.uid()
  )
);
drop policy if exists "Users create payments" on public.payments;
create policy "Users create payments" on public.payments for insert with check (
  exists (
    select 1
    from public.bookings b
    where b.id = public.payments.booking_id and b.passenger_id = auth.uid()
  )
);
drop policy if exists "Admins see all payments" on public.payments;
create policy "Admins see all payments" on public.payments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Tickets
create table if not exists public.tickets (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings(id) not null unique,
  ticket_code text not null unique default upper(substring(gen_random_uuid()::text, 1, 8)),
  issued_at timestamptz default now()
);
alter table public.tickets enable row level security;
drop policy if exists "Passengers see own tickets" on public.tickets;
create policy "Passengers see own tickets" on public.tickets for select using (
  exists (
    select 1
    from public.bookings b
    where b.id = public.tickets.booking_id and b.passenger_id = auth.uid()
  )
);
drop policy if exists "Passengers create own tickets" on public.tickets;
create policy "Passengers create own tickets" on public.tickets for insert with check (
  exists (
    select 1
    from public.bookings b
    where b.id = public.tickets.booking_id
      and b.passenger_id = auth.uid()
      and b.status = 'confirmed'
  )
);
drop policy if exists "Drivers see tickets for their schedules" on public.tickets;
create policy "Drivers see tickets for their schedules" on public.tickets for select using (
  exists (
    select 1
    from public.bookings b
    join public.schedules s on s.id = b.schedule_id
    where b.id = public.tickets.booking_id and s.driver_id = auth.uid()
  )
);
drop policy if exists "Admins see all tickets" on public.tickets;
create policy "Admins see all tickets" on public.tickets for all using (
  public.is_admin()
);

-- Complaints
create table if not exists public.complaints (
  id uuid default gen_random_uuid() primary key,
  passenger_id uuid references public.profiles(id) not null,
  driver_id uuid references public.profiles(id),
  booking_id uuid references public.bookings(id),
  subject text,
  message text not null,
  status text default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz default now()
);

-- Add complaint relationship columns when upgrading an older complaints table.
alter table public.complaints add column if not exists passenger_id uuid;
alter table public.complaints add column if not exists driver_id uuid;
alter table public.complaints add column if not exists booking_id uuid;
alter table public.complaints add column if not exists subject text;
alter table public.complaints add column if not exists message text;
alter table public.complaints add column if not exists status text default 'open';
alter table public.complaints add column if not exists created_at timestamptz default now();

alter table public.complaints enable row level security;
drop policy if exists "Passengers see own complaints" on public.complaints;
create policy "Passengers see own complaints" on public.complaints for select using (passenger_id = auth.uid());
drop policy if exists "Passengers create complaints" on public.complaints;
create policy "Passengers create complaints" on public.complaints for insert with check (passenger_id = auth.uid());
drop policy if exists "Drivers see complaints against them" on public.complaints;
create policy "Drivers see complaints against them" on public.complaints for select using (driver_id = auth.uid());
drop policy if exists "Admins manage all complaints" on public.complaints;
create policy "Admins manage all complaints" on public.complaints for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Activities
create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  type text default 'general',
  image_url text,
  active boolean default true,
  created_at timestamptz default now()
);
alter table public.activities enable row level security;
drop policy if exists "Anyone can view active activities" on public.activities;
create policy "Anyone can view active activities" on public.activities for select using (active = true);
drop policy if exists "Admins manage activities" on public.activities;
create policy "Admins manage activities" on public.activities for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Activity booking requests
create table if not exists public.activity_bookings (
  id uuid default gen_random_uuid() primary key,
  activity_id uuid references public.activities(id) on delete restrict not null,
  passenger_id uuid references public.profiles(id) on delete cascade not null,
  activity_date date not null,
  guests int not null default 1 check (guests > 0),
  notes text,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz default now()
);
alter table public.activity_bookings enable row level security;
drop policy if exists "Passengers see own activity bookings" on public.activity_bookings;
drop policy if exists "Passengers create activity bookings" on public.activity_bookings;
drop policy if exists "Admins manage activity bookings" on public.activity_bookings;
create policy "Passengers see own activity bookings" on public.activity_bookings for select
  using (passenger_id = auth.uid());
create policy "Passengers create activity bookings" on public.activity_bookings for insert
  with check (passenger_id = auth.uid());
create policy "Admins manage activity bookings" on public.activity_bookings for all
  using (public.is_admin()) with check (public.is_admin());

-- In-app notifications (sent by admins to passengers and drivers)
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "Recipients view own notifications" on public.notifications;
drop policy if exists "Recipients update own notifications" on public.notifications;
drop policy if exists "Recipients delete own notifications" on public.notifications;
drop policy if exists "Admins send notifications" on public.notifications;
create policy "Recipients view own notifications" on public.notifications for select
  using (recipient_id = auth.uid());
create policy "Recipients update own notifications" on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
create policy "Recipients delete own notifications" on public.notifications for delete
  using (recipient_id = auth.uid());
create policy "Admins send notifications" on public.notifications for insert
  with check (public.is_admin() and sender_id = auth.uid());

-- ============================================================
-- PRIVACY, CANCELLATION AND VERIFICATION WORKFLOWS
-- Safe to re-run after the schema above has been applied.
-- ============================================================

alter table public.profiles add column if not exists driver_verification_status text not null default 'unverified'
  check (driver_verification_status in ('unverified', 'pending', 'verified', 'rejected'));
alter table public.vehicles add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

-- Return an aggregate count without exposing unverified vehicle records through RLS.
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

create or replace function public.count_active_drivers()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.profiles where role = 'driver' and banned_at is null;
$$;
revoke all on function public.count_active_drivers() from public;
grant execute on function public.count_active_drivers() to anon, authenticated;

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

-- Profile rows (including email and phone) are visible only to their owner,
-- administrators, and drivers assigned to a booking for that passenger.
drop policy if exists "Users can view all profiles" on public.profiles;
drop policy if exists "Profiles visible to owner admins and assigned drivers" on public.profiles;
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
create policy "Profiles visible to owner admins and assigned drivers" on public.profiles
  for select to authenticated using (public.can_view_profile(id));

-- Keep phone uniqueness in the database; the client no longer needs a public lookup.
create unique index if not exists profiles_phone_unique
  on public.profiles (phone) where phone is not null;

alter table public.bookings add column if not exists seat_reserved boolean not null default false;
alter table public.bookings add column if not exists payment_expires_at timestamptz;
update public.bookings set seat_reserved = true where status = 'confirmed';
update public.bookings set payment_expires_at = now()
  where status = 'pending' and payment_expires_at is null;

-- Repair historical duplicate active seat assignments while preserving each booking.
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
    seat_number, pickup_stop, dropoff_stop, status, seat_reserved, payment_expires_at)
  values (auth.uid(), p_schedule_id, p_schedule_id, v_schedule.price, p_seat_number,
    p_seat_number, p_pickup_stop, p_dropoff_stop, 'pending', true, now() + interval '45 minutes')
  returning id into v_booking_id;
  update public.schedules set seats_available = seats_available - 1 where id = p_schedule_id;
  return v_booking_id;
end;
$$;
revoke all on function public.create_booking(uuid, integer, text, text) from public, anon;
grant execute on function public.create_booking(uuid, integer, text, text) to authenticated;

-- Booking state is created and confirmed only by the database payment workflow.
drop policy if exists "Passengers create bookings" on public.bookings;
drop policy if exists "Passengers update own bookings" on public.bookings;
create policy "Passengers create bookings" on public.bookings for insert with check (false);

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
    if v_booking.seat_reserved then
      update public.schedules s set seats_available = least(s.seats_available + 1, v.seat_count)
        from public.vehicles v where s.id = v_booking.schedule_id and v.id = s.vehicle_id;
      update public.bookings set seat_reserved = false where id = p_booking_id;
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
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'Booking is no longer payable';
  end if;
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

-- ============================================================
-- SEED DATA
-- ============================================================

insert into public.routes (name, origin, destination, distance_km, base_fare) values
  ('CBD → Westlands', 'Nairobi CBD', 'Westlands', 8, 50),
  ('CBD → Kibera', 'Nairobi CBD', 'Kibera', 5, 30),
  ('CBD → Kasarani', 'Nairobi CBD', 'Kasarani', 14, 70),
  ('CBD → Rongai', 'Nairobi CBD', 'Rongai', 22, 100),
  ('CBD → Thika Road', 'Nairobi CBD', 'Thika', 45, 150),
  ('CBD → Mombasa Road', 'Nairobi CBD', 'Jomo Kenyatta Airport', 18, 80),
  ('CBD → Ngong Road', 'Nairobi CBD', 'Ngong', 30, 120),
  ('CBD → Eastleigh', 'Nairobi CBD', 'Eastleigh', 4, 30)
on conflict do nothing;

insert into public.activities (title, description, type, image_url) values
  ('Nairobi City Tour', 'Explore Nairobi''s top landmarks by matatu with a guided tour experience.', 'tour', 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=600&h=400&fit=crop&auto=format'),
  ('Safari Connect Express', 'Fast bus connections to major safari departure points around Kenya.', 'safari', 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&h=400&fit=crop&auto=format'),
  ('Night Rider Service', 'Safe, vetted bodaboda night riders for late-night travel within Nairobi.', 'bodaboda', 'https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=600&h=400&fit=crop&auto=format'),
  ('Airport Shuttle', 'Comfortable taxi service to and from JKIA — book in advance.', 'taxi', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop&auto=format')
on conflict do nothing;

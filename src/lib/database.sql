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
  created_at timestamptz default now()
);
alter table public.routes add column if not exists location text;
alter table public.routes enable row level security;
    trip_id uuid,
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
create policy "Anyone can view active vehicles" on public.vehicles for select using (status = 'active');
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
    alter table public.bookings
      drop constraint if exists bookings_trip_id_fkey;
    if not exists (
      select 1
      from pg_constraint
      where conname = 'bookings_trip_id_fkey'
        and conrelid = 'public.bookings'::regclass
    ) then
      alter table public.bookings
        add constraint bookings_trip_id_fkey
        foreign key (trip_id) references public.schedules(id);
    end if;
drop policy if exists "Admins manage schedules" on public.schedules;
create policy "Admins manage schedules" on public.schedules for all
  using (public.is_admin())
  with check (public.is_admin());
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
alter table public.bookings add column if not exists created_at timestamptz default now();

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
create policy "Passengers see own bookings" on public.bookings for select using (passenger_id = auth.uid());
create policy "Passengers create bookings" on public.bookings for insert with check (passenger_id = auth.uid());
create policy "Passengers update own bookings" on public.bookings for update using (passenger_id = auth.uid());
create policy "Drivers see bookings for their schedules" on public.bookings for select using (
  exists (
    select 1
    from public.schedules s
    where s.id = public.bookings.schedule_id and s.driver_id = auth.uid()
  )
);
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
  status text default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at timestamptz default now()
);

-- Add payment columns when upgrading an older payments table.
alter table public.payments add column if not exists booking_id uuid;
alter table public.payments add column if not exists amount numeric default 0;
alter table public.payments add column if not exists mpesa_receipt text;
alter table public.payments add column if not exists phone text;
alter table public.payments add column if not exists status text default 'pending';
alter table public.payments add column if not exists created_at timestamptz default now();

alter table public.payments enable row level security;
create policy "Users see own payments" on public.payments for select using (
  exists (
    select 1
    from public.bookings b
    where b.id = public.payments.booking_id and b.passenger_id = auth.uid()
  )
);
create policy "Users create payments" on public.payments for insert with check (
  exists (
    select 1
    from public.bookings b
    where b.id = public.payments.booking_id and b.passenger_id = auth.uid()
  )
);
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
create policy "Passengers see own tickets" on public.tickets for select using (
  exists (
    select 1
    from public.bookings b
    where b.id = public.tickets.booking_id and b.passenger_id = auth.uid()
  )
);
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
create policy "Passengers see own complaints" on public.complaints for select using (passenger_id = auth.uid());
create policy "Passengers create complaints" on public.complaints for insert with check (passenger_id = auth.uid());
create policy "Drivers see complaints against them" on public.complaints for select using (driver_id = auth.uid());
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
create policy "Anyone can view active activities" on public.activities for select using (active = true);
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
drop policy if exists "Admins send notifications" on public.notifications;
create policy "Recipients view own notifications" on public.notifications for select
  using (recipient_id = auth.uid());
create policy "Recipients update own notifications" on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
create policy "Admins send notifications" on public.notifications for insert
  with check (public.is_admin() and sender_id = auth.uid());

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

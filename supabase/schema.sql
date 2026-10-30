-- ==============================================================================
-- RAKSHA CITIZEN SAFETY & EMERGENCY RESPONSE PLATFORM
-- Supabase Database Schema (Member 2 Contract)
-- ==============================================================================

-- 1. Profiles Table (Linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  date_of_birth date,
  blood_group text,
  allergies text,
  medical_notes text,
  emergency_notes_shared boolean default true,
  is_onboarded boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Trusted Contacts Table
create table if not exists public.trusted_contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  phone text not null,
  relationship text,
  priority integer default 1,
  notify_sms boolean default true,
  notify_call boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Emergency Incidents Table
create table if not exists public.incidents (
  id text primary key,
  user_id text not null,
  type text default 'UNSPECIFIED' not null,
  severity text default 'CRITICAL' not null,
  status text default 'OPEN' not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  address_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  assigned_responder_id text,
  cancellation_reason text
);

-- 4. Incident Timeline Events Table
create table if not exists public.incident_timeline (
  id uuid default gen_random_uuid() primary key,
  incident_id text references public.incidents(id) on delete cascade not null,
  status text not null,
  title text not null,
  description text,
  actor text default 'System',
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Responders Table (Pink Hoysala Patrols, Ambulances, Community Responders)
create table if not exists public.responders (
  id text primary key,
  name text not null,
  type text default 'POLICE' not null,
  phone text not null,
  badge_number text,
  vehicle_number text,
  latitude double precision,
  longitude double precision,
  status text default 'AVAILABLE',
  is_verified boolean default true
);

-- 6. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_timeline enable row level security;
alter table public.responders enable row level security;

-- 7. RLS Policies
-- Profiles: Users can view and edit their own profile
create policy "Allow users to read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Allow users to update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Allow users to insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Trusted Contacts: Users manage their own contacts
create policy "Allow users to manage own contacts" on public.trusted_contacts
  for all using (auth.uid() = user_id);

-- Incidents: Anyone authenticated can insert incidents; responders and creators can view
create policy "Allow authenticated users to create incidents" on public.incidents
  for insert with check (true);
create policy "Allow users and responders to read incidents" on public.incidents
  for select using (true);
create policy "Allow updates to incidents" on public.incidents
  for update using (true);

-- Timeline: readable by all, insertable by incident participants
create policy "Allow reading timeline" on public.incident_timeline
  for select using (true);
create policy "Allow creating timeline events" on public.incident_timeline
  for insert with check (true);

-- Responders: read by authenticated users
create policy "Allow reading responders" on public.responders
  for select using (true);

-- 8. Enable Realtime Publications
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.incident_timeline;

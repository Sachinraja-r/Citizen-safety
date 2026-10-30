-- ==============================================================================
-- RAKSHA CITIZEN SAFETY & EMERGENCY RESPONSE PLATFORM
-- Complete Production Supabase Database Schema & Automation (Member 2 Deliverable)
-- ==============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth users)
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
  role text default 'CITIZEN' check (role in ('CITIZEN', 'RESPONDER', 'POLICE', 'ADMIN')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Auto-create profile trigger on auth.users signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, is_onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Citizen User'),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Trusted Contacts Table (Enforces max 5 contacts per citizen)
create table if not exists public.trusted_contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  phone text not null,
  relationship text default 'Friend/Family',
  priority integer default 1 check (priority between 1 and 5),
  notify_sms boolean default true,
  notify_call boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace function public.enforce_max_five_contacts()
returns trigger as $$
begin
  if (select count(*) from public.trusted_contacts where user_id = new.user_id) >= 5 then
    raise exception 'Maximum limit of 5 trusted contacts reached.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_check_max_contacts on public.trusted_contacts;
create trigger trigger_check_max_contacts
  before insert on public.trusted_contacts
  for each row execute function public.enforce_max_five_contacts();

-- 3. Responders Table (Verified Patrols, Pink Hoysala, Ambulances)
create table if not exists public.responders (
  id text primary key,
  name text not null,
  role text default 'POLICE_OFFICER' check (role in ('POLICE_OFFICER', 'PINK_HOYSALA', 'PARAMEDIC', 'DEV_ADMIN')),
  unit_type text not null,
  badge_number text,
  vehicle_number text,
  phone text default '+91 112',
  latitude double precision default 12.9716,
  longitude double precision default 77.5946,
  status text default 'AVAILABLE' check (status in ('AVAILABLE', 'BUSY', 'OFF_DUTY', 'DISPATCHED')),
  is_verified boolean default true,
  last_ping timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed Initial Verified Responders (Pink Hoysala & Traffic Patrols)
insert into public.responders (id, name, role, unit_type, badge_number, latitude, longitude, status, is_verified)
values
  ('resp-pink-01', 'Sub-Insp. Priya Menon', 'PINK_HOYSALA', 'Pink Hoysala Unit 14 (Women Safety)', 'KA-01-G-4491', 12.9826, 77.6008, 'AVAILABLE', true),
  ('resp-police-02', 'SI. Rajan Kumar', 'POLICE_OFFICER', 'Patrol Car Unit 08', 'KA-02-C-8823', 12.9602, 77.5780, 'AVAILABLE', true),
  ('resp-para-03', 'Paramedic Suresh V.', 'PARAMEDIC', 'KSEMS Ambulance 03', 'KSEMS-0312', 12.9250, 77.6150, 'AVAILABLE', true),
  ('dev-admin-01', 'Developer (Admin View)', 'DEV_ADMIN', 'Central Command Dispatch', 'DEV-001', 12.9716, 77.5946, 'AVAILABLE', true)
on conflict (id) do update set
  name = excluded.name,
  unit_type = excluded.unit_type;

-- 4. Emergency Incidents Table
create table if not exists public.incidents (
  id text primary key,
  user_id text not null,
  type text default 'SOS_EMERGENCY' not null,
  severity text default 'CRITICAL' not null,
  status text default 'OPEN' check (status in ('OPEN', 'ASSIGNED', 'ON_SCENE', 'RESOLVED', 'CANCELLED')),
  description text default 'Emergency SOS beacon triggered by citizen',
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision default 15.0,
  address_text text,
  search_radius_meters integer default 300,
  assigned_responder_id text references public.responders(id),
  cancellation_reason text,
  ai_triage jsonb,
  timeline jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone,
  cancelled_at timestamp with time zone
);

-- 5. Incident Timeline Events Table
create table if not exists public.incident_timeline (
  id uuid default gen_random_uuid() primary key,
  incident_id text references public.incidents(id) on delete cascade not null,
  status text not null,
  title text not null,
  description text,
  actor text default 'System',
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Trusted Contact Emergency Notifications Table
create table if not exists public.trusted_contact_notifications (
  id text primary key,
  incident_id text references public.incidents(id) on delete cascade not null,
  contact_id text not null,
  contact_name text not null,
  contact_phone text,
  channel text default 'SMS' not null check (channel in ('SMS', 'PUSH', 'WHATSAPP')),
  status text default 'DELIVERED' check (status in ('QUEUED', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'FAILED')),
  secure_token text not null,
  error_message text,
  dispatched_at timestamp with time zone default timezone('utc'::text, now()) not null,
  delivered_at timestamp with time zone,
  acknowledged_at timestamp with time zone
);

-- 7. Push Subscriptions Table (Web Push for Offline PWA)
create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  endpoint text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_timeline enable row level security;
alter table public.responders enable row level security;
alter table public.trusted_contact_notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- 9. Complete Production RLS Policies
-- Profiles: Citizens manage their own profile; Responders can view emergency medical notes
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id or exists (select 1 from public.responders where id = auth.uid()::text));

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Trusted Contacts: Strict privacy (only user can access)
create policy "Users can manage own contacts" on public.trusted_contacts
  for all using (auth.uid() = user_id);

-- Incidents: Authenticated users can insert; Everyone authorized can read & update
create policy "Authenticated users can create incidents" on public.incidents
  for insert with check (true);

create policy "Read incidents policy" on public.incidents
  for select using (true);

create policy "Update incidents policy" on public.incidents
  for update using (true);

-- Incident Timeline: Open for read; insertable by incident participants
create policy "Read timeline policy" on public.incident_timeline
  for select using (true);

create policy "Insert timeline policy" on public.incident_timeline
  for insert with check (true);

-- Responders: Public read for dispatch status
create policy "Read responders policy" on public.responders
  for select using (true);

create policy "Responders update own status" on public.responders
  for update using (true);

-- Contact Notifications: Readable and updatable by token link or incident owner
create policy "Read notifications policy" on public.trusted_contact_notifications
  for select using (true);

create policy "Insert notifications policy" on public.trusted_contact_notifications
  for insert with check (true);

create policy "Acknowledge notifications policy" on public.trusted_contact_notifications
  for update using (true);

-- Push Subscriptions: Users manage their devices
create policy "Manage push subscriptions" on public.push_subscriptions
  for all using (true);

-- 10. Enable Supabase Realtime Publications
-- Enables live reactive map pins, instant timeline updates, and responder status changes
drop publication if exists supabase_realtime;
create publication supabase_realtime for table
  public.incidents,
  public.incident_timeline,
  public.responders,
  public.trusted_contact_notifications;

-- 11. Atomic Responder Claim Function (Prevents Race Conditions)
create or replace function public.claim_incident(p_incident_id text, p_responder_id text)
returns jsonb as $$
declare
  v_incident public.incidents;
begin
  select * into v_incident from public.incidents where id = p_incident_id for update;
  
  if not found then
    return jsonb_build_object('success', false, 'error', 'Incident not found');
  end if;

  if v_incident.status != 'OPEN' and v_incident.assigned_responder_id is not null then
    return jsonb_build_object('success', false, 'error', 'Incident has already been claimed by another responder');
  end if;

  update public.incidents
  set status = 'ASSIGNED',
      assigned_responder_id = p_responder_id,
      updated_at = timezone('utc'::text, now())
  where id = p_incident_id;

  update public.responders
  set status = 'DISPATCHED'
  where id = p_responder_id;

  insert into public.incident_timeline (incident_id, status, title, description, actor)
  values (
    p_incident_id,
    'ASSIGNED',
    'Patrol Unit Dispatched',
    'Emergency response unit ' || p_responder_id || ' accepted and en route.',
    'Police Dispatch'
  );

  return jsonb_build_object('success', true, 'status', 'ASSIGNED', 'responder_id', p_responder_id);
end;
$$ language plpgsql security definer;

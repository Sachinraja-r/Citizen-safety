# 🛡️ RAKSHA — Citizen Safety & Emergency Response Platform

A production-grade, mobile-first Progressive Web App (PWA) designed for rapid emergency response, community safety, and real-time coordination with Bengaluru's Pink Hoysala police patrol units.

Built for a 20-hour hackathon by **Member 1 (Frontend & UI/UX Engineering)**, integrating directly with Member 2 (Supabase Backend), Member 3 (AI Triage Engine), and Member 4 (Patrol Coordination & Maps).

---

## 🚀 Key Features

### 1. 🚨 SOS-First Emergency Workflow
- **Zero-Block Dispatch**: When the citizen taps the SOS button, an emergency incident with precise GPS telemetry (latitude, longitude, accuracy) is created **immediately**. It never waits for AI classification, forms, or confirmations.
- **Post-SOS Information Enrichment**: Only after the alert is dispatched is the user optionally asked *"What happened?"* with 7 quick category chips (Medical, Harassment, Violence, Accident, Fire, Other, Unable to specify) and optional voice/text input.
- **Emergency Safeguards**: One-tap fallback to official emergency helpline `112`, and cancel protection with required rationale confirmation.

### 2. 🌸 High-Legibility Visual System
- **Crisp White Canvas**: Optimized for daylight accessibility and rapid comprehension under stress (`bg-white`, `bg-slate-50`, `#0f172a` text).
- **Pink Hoysala Accents**: Subtle rose/pink indicators honoring women's safety patrol meshes and safe-state verification.
- **Vibrant Emergency Red**: SOS buttons and emergency beacons are unmistakably styled in high-visibility red gradients with pulsing ambient rings.

### 3. 👥 Trusted Contacts Management
- Manage up to 5 priority-ranked emergency contacts.
- Real-time notification status tracking.
- WhatsApp fallback broadcast with pre-filled emergency coordinates and live tracking links.

### 4. 🚓 Responder & Police Control Room
- **Tactical Responder Portal** (`/responder/dashboard`): Real-time incoming incident feed, GPS proximity sorting, one-tap accept/arrive/resolve workflow, and interactive Leaflet incident maps.
- **Developer Admin HUD** (`/responder/dev`): Full telemetry simulation, mock dispatching, and rapid incident state testing.

---

## 🛠️ Technology Stack

- **Framework**: React 18, Vite 6, TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v6
- **Maps**: Leaflet & React-Leaflet
- **Backend & Auth**: Supabase JavaScript Client (`@supabase/supabase-js`)
- **Icons**: Lucide React
- **Testing**: Node.js native test runner & `tsx`

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Praveenkumar14200606/citizen-safety.git
cd citizen-safety
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your Supabase credentials (see [Supabase Backend Setup](#-supabase-backend-setup) below):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_AI_ENGINE_URL=http://localhost:8000
VITE_ENABLE_DEV_DEMO=true
```
*(Note: If Supabase credentials are blank, the frontend gracefully activates its self-contained Demo Mode with persistent local mock storage).*

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser or mobile viewport.

### 4. Run Tests & Production Build
```bash
# Execute automated unit and end-to-end user journey tests
npm test

# Build production bundle with TypeScript type-checking
npm run build
```

---

## 🗄️ Supabase Backend Setup

To connect your Supabase project to this frontend:

### 1. Create Tables
Execute the following SQL in your Supabase SQL Editor:

```sql
-- Profiles table
create table public.profiles (
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

-- Trusted Contacts table
create table public.trusted_contacts (
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

-- Emergency Incidents table
create table public.incidents (
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

-- Incident Timeline Events table
create table public.incident_timeline (
  id uuid default gen_random_uuid() primary key,
  incident_id text references public.incidents(id) on delete cascade not null,
  status text not null,
  title text not null,
  description text,
  actor text default 'System',
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Responders table
create table public.responders (
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

-- Enable Realtime replication on incidents
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.incident_timeline;
```

### 2. Enable Google OAuth (Optional)
In your Supabase Dashboard:
1. Navigate to **Authentication** > **Providers** > **Google**.
2. Supply your Google Client ID and Secret.
3. Add `http://localhost:3000/app` and your production domain to the **Redirect URLs**.

---

## 🗺️ Application Routes

| Path | Screen Description |
|---|---|
| `/` | Public Landing Page & Feature Overview |
| `/login` | Authentication (Google OAuth, Email/Password, or Quick Reviewer Demo) |
| `/app/onboarding` | 3-Step Profile & Location Setup |
| `/app/dashboard` | Main Citizen Safety Dashboard with Emergency SOS Button |
| `/app/sos` | Immediate SOS Dispatch & Post-Activation Details |
| `/app/incidents/:id` | Live Emergency Incident Tracker & Responder Telemetry |
| `/app/contacts` | Trusted Emergency Contacts Management |
| `/app/profile` | Medical ID, Emergency Health Notes & PWA Settings |
| `/responder` | Responder Portal Login |
| `/responder/dashboard` | Police & Responder Tactical Dispatch Interface |
| `/responder/dev` | Developer Admin Control Panel & Simulation Engine |

---

## 📄 License
MIT License. Built for Citizen Safety.

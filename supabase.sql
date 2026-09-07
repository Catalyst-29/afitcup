-- Run this entire file once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Safe migration for projects where the departments table already exists.
alter table public.departments add column if not exists is_active boolean not null default true;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null unique references public.departments(id) on delete cascade,
  logo_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  final_submitted boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  photo_path text not null,
  first_name text not null,
  last_name text not null,
  nationality text not null default 'Nigeria' check (nationality = 'Nigeria'),
  date_of_birth date not null,
  jersey_number integer not null check (jersey_number between 1 and 99),
  position text not null check (position in ('Goalkeeper','Defender','Midfielder','Forward')),
  height_cm integer not null check (height_cm between 140 and 240),
  preferred_foot text not null check (preferred_foot in ('Right','Left')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_jersey_per_team unique(team_id, jersey_number)
);

-- Hard database guard: never allow more than 25 players on a team.
create or replace function public.enforce_player_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.players where team_id = new.team_id) >= 25 then
    raise exception 'Maximum of 25 players per team reached';
  end if;
  return new;
end; $$;
drop trigger if exists trg_player_limit on public.players;
create trigger trg_player_limit before insert on public.players for each row execute function public.enforce_player_limit();

-- App uses server-only service role. RLS blocks direct browser access.
alter table public.departments enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;

insert into public.departments(token,name) values
('AE-2824','Aerospace Engineering'),
('AUE-1409','Automotive Engineering'),
('BAE-5506','Business Administration & Economics'),
('CHM-5012','Chemistry'),
('CVE-4657','Civil Engineering'),
('CSC-3286','Computer Science'),
('CBS-2679','Cyber Security'),
('EEE-9935','Electrical Engineering'),
('ICE-2424','Information & Communication Engineering'),
('INT-7912','International Relations'),
('MEC-1520','Mechanical Engineering'),
('MCT-1488','Mechatronics Engineering'),
('MME-2535','Metallurgical and Materials Engineering'),
('PWE-4582','Physics with Electronics'),
('STA-4811','Mathematics & Statistics'),
('TCE-9279','Telecommunication Engineering'),
('TKN-4827', 'Template FC'),
('RID-7314', 'Ridds FC'),
('JOE-2659', 'Joseph FC'),
('FIZ-9146', 'Fizo FC'),
('JAY-3582', 'Jayblack FC'),
('AYO-6073', 'Ayorinde FC')
on conflict (token) do update set name=excluded.name;

-- Deactivated registration tokens retain their existing teams and player data,
-- but can no longer be used to sign in.
update public.departments
set is_active = false
where token in ('TKN-4827','RID-7314','JOE-2659','FIZ-9146','JAY-3582','AYO-6073');

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('competition-files','competition-files',false,5242880,array['image/png','image/jpeg'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg'];

-- Swagrams: lobbies, players, rounds, submissions + RLS + realtime

create extension if not exists pgcrypto;

create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting',
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  display_name text not null,
  session_id text not null,
  score integer not null default 0,
  is_ready boolean not null default false,
  connected boolean not null default true,
  created_at timestamptz not null default now(),
  unique (lobby_id, session_id)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  rack text not null,
  difficulty text not null check (difficulty in ('easy', 'hard')),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  word text not null,
  score integer not null,
  created_at timestamptz not null default now(),
  unique (round_id, player_id, word)
);

alter table public.lobbies enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.submissions enable row level security;

create policy "read_lobbies" on public.lobbies for select using (true);
create policy "read_players" on public.players for select using (true);
create policy "read_rounds" on public.rounds for select using (true);
create policy "read_submissions" on public.submissions for select using (true);

alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.submissions;

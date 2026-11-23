-- Blitz schema. Idempotent: the app runs this automatically on first connection,
-- and it is also safe to run with `supabase db push` or the Supabase SQL editor.
--
-- Security model: every table has row level security enabled and no policies, so the
-- public anon key cannot read or write anything through the Supabase REST API.
-- All reads and writes go through the Next.js server, which connects with the database
-- owner role, checks the caller's host or player session, and returns a per-viewer view
-- (no official answers before publishing, no other players' picks before the round starts).

create table if not exists lobbies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  home_team text not null,
  away_team text not null,
  game_date text check (game_date is null or game_date ~ '^\d{4}-\d{2}-\d{2}$'),
  host_name text not null,
  quarter int not null default 1 check (quarter between 1 and 4),
  phase text not null default 'setup'
    check (phase in ('setup', 'picks', 'live', 'grading', 'results', 'final')),
  published_through int not null default 0 check (published_through between 0 and 4),
  version int not null default 1,
  created_at timestamptz not null default now()
);

-- Host credentials live apart from lobby data.
create table if not exists lobby_hosts (
  lobby_id uuid primary key references lobbies(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  nickname text not null,
  token_hash text not null,
  is_host boolean not null default false,
  joined_quarter int not null default 1,
  created_at timestamptz not null default now()
);
create unique index if not exists players_lobby_nickname on players (lobby_id, lower(nickname));
create index if not exists players_lobby on players (lobby_id);

create table if not exists question_bank (
  id text primary key,
  category text not null,
  prompt text not null,
  options jsonb not null,
  rule text not null default '',
  is_seed boolean not null default false,
  created_by_lobby uuid references lobbies(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Player-facing questions, copied from the bank when assigned to a quarter.
create table if not exists lobby_questions (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  quarter int not null check (quarter between 1 and 4),
  position int not null check (position between 0 and 4),
  category text not null,
  prompt text not null,
  options jsonb not null,
  rule text not null default '',
  bank_id text,
  unique (lobby_id, quarter, position)
);

-- Official answers, stored separately from the player-facing question.
create table if not exists question_keys (
  question_id uuid primary key references lobby_questions(id) on delete cascade,
  lobby_id uuid not null references lobbies(id) on delete cascade,
  correct_option text,
  voided boolean not null default false,
  graded_at timestamptz not null default now()
);

-- One immutable row per player per quarter.
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  quarter int not null check (quarter between 1 and 4),
  answers jsonb not null,
  lock_question uuid,
  submitted_at timestamptz not null default now(),
  unique (player_id, quarter)
);
create index if not exists submissions_lobby on submissions (lobby_id);

-- Live score, entered by the host (no sports data feed).
alter table lobbies add column if not exists home_score int not null default 0;
alter table lobbies add column if not exists away_score int not null default 0;
-- Optional team images the host adds (https URL or small data:image).
alter table lobbies add column if not exists home_logo text;
alter table lobbies add column if not exists away_logo text;
-- Pick window: when set, picks lock at this time.
alter table lobbies add column if not exists picks_close_at timestamptz;
alter table players add column if not exists avatar text;

-- Lobby chat and quick reactions.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_lobby on messages (lobby_id, created_at desc);
alter table messages enable row level security;

alter table lobbies enable row level security;
alter table lobby_hosts enable row level security;
alter table players enable row level security;
alter table question_bank enable row level security;
alter table lobby_questions enable row level security;
alter table question_keys enable row level security;
alter table submissions enable row level security;

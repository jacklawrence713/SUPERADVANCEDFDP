-- Migration: 004_fdp_value_snapshots
-- Creates FDP Value snapshot infrastructure for historical value tracking.
-- Each row = one player's canonical FDP Value at a specific time and format context.
-- Batch table ensures incomplete snapshot runs are never exposed as valid history.
--
-- This migration is designed to run ONCE. It will fail if tables already exist,
-- which prevents silently running against an incompatible pre-existing schema.

-- ── Batch tracking table ──
-- Each batch = one complete context ingestion for a values_version.
-- Only batches with status='complete' are exposed to frontend reads.
create table public.fdp_snapshot_batches (
  id             bigint generated always as identity primary key,
  values_version text         not null,  -- e.g. "2026-09-19.1"
  effective_at   date         not null,  -- canonical value date, parsed from values_version
  league_type    text         not null check (league_type in ('dynasty','redraft')),
  scoring        text         not null check (scoring in ('PPR','Half','Standard')),
  superflex      boolean      not null default false,
  te_premium     numeric      not null default 0 check (te_premium in (0, 0.25, 0.5, 1.0)),
  idp            boolean      not null default false,
  expected_count int          not null check (expected_count > 0),
  recorded_count int          not null default 0,
  status         text         not null default 'pending' check (status in ('pending','complete','failed')),
  created_at     timestamptz  not null default now(),
  completed_at   timestamptz
);

-- One batch per version+context (allows retry after failed; see edge function logic)
create unique index uq_fdp_batch_version_context
  on public.fdp_snapshot_batches (values_version, league_type, scoring, superflex, te_premium, idp)
  where (status != 'failed');

-- ── Snapshot data table ──
-- Context columns denormalized from batch for direct query efficiency.
create table public.fdp_value_snapshots (
  id            bigint generated always as identity primary key,
  batch_id      bigint       not null references public.fdp_snapshot_batches(id) on delete cascade,
  player_slug   text         not null,
  player_name   text         not null,
  pos           text         not null check (pos in ('QB','RB','WR','TE','K','DST','DL','LB','DB')),
  value         int          not null check (value >= 0 and value <= 9999),
  league_type   text         not null check (league_type in ('dynasty','redraft')),
  scoring       text         not null check (scoring in ('PPR','Half','Standard')),
  superflex     boolean      not null default false,
  te_premium    numeric      not null default 0 check (te_premium in (0, 0.25, 0.5, 1.0)),
  idp           boolean      not null default false,
  values_version text        not null,
  effective_at  date         not null,  -- canonical value date (for chart X-axis)
  recorded_at   timestamptz  not null default now(),  -- database ingestion time (audit)
  created_at    timestamptz  not null default now()
);

-- Prevent duplicate snapshots: one value per player per batch
create unique index uq_fdp_snapshot_player_batch
  on public.fdp_value_snapshots (batch_id, player_slug);

-- Primary frontend query: player + context + deterministic order (effective_at DESC, id DESC)
-- id DESC breaks ties when multiple revisions share the same effective_at (e.g. 2026-09-19.1 and 2026-09-19.2).
create index idx_fdp_snapshot_player_context_time
  on public.fdp_value_snapshots (player_slug, league_type, scoring, superflex, te_premium, idp, effective_at desc, id desc);

-- ── Row Level Security ──
alter table public.fdp_snapshot_batches enable row level security;
alter table public.fdp_value_snapshots enable row level security;

-- Batches: only complete batches visible to public
create policy "fdp_batches_select_complete"
  on public.fdp_snapshot_batches
  for select
  using (status = 'complete');

-- Snapshots: only those belonging to complete batches
create policy "fdp_snapshots_select_complete"
  on public.fdp_value_snapshots
  for select
  using (
    exists (
      select 1 from public.fdp_snapshot_batches b
      where b.id = batch_id and b.status = 'complete'
    )
  );

-- ── Write security ──
revoke insert, update, delete on public.fdp_snapshot_batches from public;
revoke insert, update, delete on public.fdp_snapshot_batches from anon;
revoke insert, update, delete on public.fdp_snapshot_batches from authenticated;

revoke insert, update, delete on public.fdp_value_snapshots from public;
revoke insert, update, delete on public.fdp_value_snapshots from anon;
revoke insert, update, delete on public.fdp_value_snapshots from authenticated;

-- ── Read grants ──
grant select on public.fdp_snapshot_batches to anon;
grant select on public.fdp_snapshot_batches to authenticated;
grant select on public.fdp_value_snapshots to anon;
grant select on public.fdp_value_snapshots to authenticated;

-- ── Service role full access ──
grant all on public.fdp_snapshot_batches to service_role;
grant all on public.fdp_value_snapshots to service_role;

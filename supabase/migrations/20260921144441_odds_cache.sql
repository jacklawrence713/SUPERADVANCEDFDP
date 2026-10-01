-- Shared server-side cache for odds data from The Odds API.
-- Used by the fetch-odds Edge Function to avoid redundant provider calls.
-- Single row per cache key; upserted on each fresh fetch.

create table if not exists public.odds_cache (
  id text primary key,
  response jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  refreshing_until timestamptz  -- non-null = a worker holds the refresh lease
);

alter table public.odds_cache enable row level security;

-- Explicitly revoke all table access from non-admin roles.
revoke all on public.odds_cache from public, anon, authenticated;

-- Seed the initial cache row so the claim UPDATE always has a target.
-- fetched_at is epoch so it's immediately "expired" on first use.
insert into public.odds_cache (id, response, fetched_at)
values ('nfl_current', '{}'::jsonb, '2000-01-01T00:00:00Z'::timestamptz)
on conflict (id) do nothing;

-- Atomic refresh claim: exactly one caller wins the lease per cache key.
-- Returns true if this caller should fetch from the provider.
-- Lease auto-expires after p_lease_seconds (crash recovery).
-- Default 60s: safely above Deno Deploy fetch timeout (~30s) + processing.
-- The Odds API typically responds in 1-5s; 60s covers worst-case network.
--
-- Security:
--   SECURITY DEFINER with search_path='' (no object shadowing possible)
--   All table references fully qualified (public.odds_cache)
--   p_lease_seconds clamped to [10, 300] (no permanent lock, no zero/negative)
--   EXECUTE revoked from PUBLIC/anon/authenticated; only service_role granted
create or replace function public.claim_odds_refresh(p_lease_seconds int default 60)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lease int := least(greatest(p_lease_seconds, 10), 300);
begin
  update public.odds_cache
  set refreshing_until = now() + make_interval(secs => v_lease)
  where id = 'nfl_current'
    and (refreshing_until is null or refreshing_until < now());
  return found;
end;
$$;

-- Lock down EXECUTE privileges completely, then grant only to service_role.
revoke all on function public.claim_odds_refresh(integer) from public;
revoke all on function public.claim_odds_refresh(integer) from anon;
revoke all on function public.claim_odds_refresh(integer) from authenticated;
grant execute on function public.claim_odds_refresh(integer) to service_role;

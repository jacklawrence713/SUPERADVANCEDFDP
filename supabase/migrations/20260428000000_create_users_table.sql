-- Create users table linked to Supabase auth
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  plan text not null default 'free',
  is_pro boolean not null default false,
  is_admin boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.users enable row level security;

-- Users can read their own row
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

-- Users can update their own row
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Service role can do everything (for webhook updates)
create policy "Service role full access"
  on public.users for all
  using (auth.role() = 'service_role');

-- Auto-insert a users row when someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, plan, is_pro, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'free',
    false,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger fires on every new auth signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

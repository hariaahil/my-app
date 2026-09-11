create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'setu',
  provider_consent_id text,
  provider_account_id text,
  fip_id text,
  account_type text,
  masked_account_number text,
  display_name text,
  status text not null default 'pending' check (status in ('pending','active','paused','revoked','rejected','expired','error')),
  last_synced_at timestamptz,
  consent_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id),
  unique (provider, provider_consent_id)
);

create table if not exists public.bank_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.bank_connections(id) on delete cascade,
  provider text not null,
  status text not null check (status in ('started','completed','partial','failed')),
  data_from timestamptz,
  data_to timestamptz,
  transaction_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.bank_connections enable row level security;
alter table public.bank_sync_runs enable row level security;

create policy "Users can view own bank connections" on public.bank_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own bank connections" on public.bank_connections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own bank connections" on public.bank_connections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own bank connections" on public.bank_connections for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Users can view own sync runs" on public.bank_sync_runs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own sync runs" on public.bank_sync_runs for insert to authenticated with check ((select auth.uid()) = user_id);

create index if not exists bank_connections_user_id_idx on public.bank_connections(user_id);
create index if not exists bank_connections_consent_idx on public.bank_connections(provider, provider_consent_id);
create index if not exists bank_sync_runs_user_id_idx on public.bank_sync_runs(user_id, created_at desc);

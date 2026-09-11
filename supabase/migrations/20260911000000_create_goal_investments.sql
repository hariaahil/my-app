create table if not exists public.goal_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  investment_type text not null default 'Other',
  principal_amount bigint not null default 0 check (principal_amount >= 0),
  expected_rate numeric(8,4) not null default 0 check (expected_rate >= 0),
  rate_type text not null default 'Fixed' check (rate_type in ('Fixed','Expected','None')),
  invested_on date not null default current_date,
  maturity_on date,
  compounding text not null default 'Yearly' check (compounding in ('Monthly','Quarterly','Yearly','At maturity','None')),
  monthly_addition bigint not null default 0 check (monthly_addition >= 0),
  current_value bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goal_investments_user_id_idx on public.goal_investments(user_id);
alter table public.goal_investments enable row level security;
create policy "Users can view own goal investments" on public.goal_investments for select using (auth.uid() = user_id);
create policy "Users can insert own goal investments" on public.goal_investments for insert with check (auth.uid() = user_id);
create policy "Users can update own goal investments" on public.goal_investments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own goal investments" on public.goal_investments for delete using (auth.uid() = user_id);

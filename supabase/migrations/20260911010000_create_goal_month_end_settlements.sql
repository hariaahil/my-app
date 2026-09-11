create table if not exists public.goal_month_end_settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  account_balance numeric(14,2) not null default 0 check (account_balance >= 0),
  expense_reserve numeric(14,2) not null default 0 check (expense_reserve >= 0),
  invest_amount numeric(14,2) not null default 0 check (invest_amount >= 0),
  return_rate numeric(8,4) not null default 8.1,
  deposited boolean not null default false,
  deposited_at timestamptz null,
  created_at timestamptz not null default now(),
  unique(user_id, month_start)
);

alter table public.goal_month_end_settlements enable row level security;

drop policy if exists "Users can view own month end settlements" on public.goal_month_end_settlements;
drop policy if exists "Users can insert own month end settlements" on public.goal_month_end_settlements;
drop policy if exists "Users can update own month end settlements" on public.goal_month_end_settlements;

create policy "Users can view own month end settlements" on public.goal_month_end_settlements
  for select using (auth.uid() = user_id);
create policy "Users can insert own month end settlements" on public.goal_month_end_settlements
  for insert with check (auth.uid() = user_id);
create policy "Users can update own month end settlements" on public.goal_month_end_settlements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

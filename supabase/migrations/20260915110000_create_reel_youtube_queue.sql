create table if not exists public.reel_youtube_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instagram_url text not null,
  instagram_reel_id text,
  status text not null default 'queued' check (status in ('queued','processing','scheduled','published','failed','skipped')),
  queue_position integer,
  scheduled_at timestamptz,
  youtube_video_id text,
  youtube_url text,
  hashtags text[] not null default array['#TeluguTrolls','#TeluguTroll','#TeluguMemes','#TeluguComedy','#TeluguFunny']::text[],
  error_message text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index if not exists reel_youtube_queue_user_url_uidx on public.reel_youtube_queue(user_id, instagram_url);
create unique index if not exists reel_youtube_queue_user_reel_uidx on public.reel_youtube_queue(user_id, instagram_reel_id) where instagram_reel_id is not null;
create index if not exists reel_youtube_queue_user_status_idx on public.reel_youtube_queue(user_id, status, scheduled_at, created_at);

alter table public.reel_youtube_queue enable row level security;

create policy "reel queue owner select" on public.reel_youtube_queue for select to authenticated using ((select auth.uid()) = user_id);
create policy "reel queue owner insert" on public.reel_youtube_queue for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reel queue owner update" on public.reel_youtube_queue for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reel queue owner delete" on public.reel_youtube_queue for delete to authenticated using ((select auth.uid()) = user_id);

-- TargetBud social foundation. Real-user activity only; no synthetic accounts or engagement.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_user_id uuid references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_user_id, topic_id),
  check ((following_user_id is not null) <> (topic_id is not null)),
  check (following_user_id is null or following_user_id <> follower_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 10000),
  object_type text,
  object_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.post_comments(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  object_type text not null,
  object_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, object_type, object_id)
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','owner')),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null,
  object_type text,
  object_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_topic_created_idx on public.posts(topic_id, created_at desc);
create index if not exists posts_author_created_idx on public.posts(author_id, created_at desc);
create index if not exists comments_post_created_idx on public.post_comments(post_id, created_at);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists messages_recipient_created_idx on public.messages(recipient_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.saved_items enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles own write" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "topics public read" on public.topics for select using (true);
create policy "follows own read" on public.follows for select using (auth.uid() = follower_id);
create policy "follows own write" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows own delete" on public.follows for delete using (auth.uid() = follower_id);
create policy "posts public read" on public.posts for select using (true);
create policy "posts own write" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts own update" on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "posts own delete" on public.posts for delete using (auth.uid() = author_id);
create policy "comments public read" on public.post_comments for select using (true);
create policy "comments own write" on public.post_comments for insert with check (auth.uid() = author_id);
create policy "comments own delete" on public.post_comments for delete using (auth.uid() = author_id);
create policy "likes public read" on public.post_likes for select using (true);
create policy "likes own write" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "likes own delete" on public.post_likes for delete using (auth.uid() = user_id);
create policy "saved own access" on public.saved_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "communities public read" on public.communities for select using (visibility = 'public' or owner_id = auth.uid());
create policy "communities owner write" on public.communities for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "members own access" on public.community_members for select using (auth.uid() = user_id or exists (select 1 from public.communities c where c.id = community_id and c.owner_id = auth.uid()));
create policy "members self join" on public.community_members for insert with check (auth.uid() = user_id);
create policy "members self leave" on public.community_members for delete using (auth.uid() = user_id);
create policy "messages participants" on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages sender write" on public.messages for insert with check (auth.uid() = sender_id);
create policy "messages recipient update" on public.messages for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
create policy "notifications own access" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

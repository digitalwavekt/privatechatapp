-- PVChat Supabase Step 1 Schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null unique,
  password_hash text not null,
  avatar text default '',
  live_photo text default '',
  status text not null default 'pending' check (status in ('pending','approved','blocked','deleted')),
  role text not null default 'user' check (role in ('user','admin')),
  is_online boolean not null default false,
  last_seen timestamptz default now(),
  socket_id text default '',
  fcm_token text default '',
  push_subscription jsonb,
  device_info jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  contact_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, contact_id)
);

create table if not exists blocked_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  blocked_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, blocked_user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  group_id uuid,
  type text not null default 'text' check (type in ('text','image','audio','video','location','file')),
  content text not null default '',
  media_url text default '',
  thumbnail_url text default '',
  location jsonb,
  is_deleted boolean not null default false,
  deleted_for uuid[] default array[]::uuid[],
  read_by jsonb default '[]'::jsonb,
  reply_to uuid references messages(id),
  reactions jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  avatar text default '',
  creator_id uuid not null references profiles(id) on delete cascade,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table messages
  drop constraint if exists messages_group_id_fkey;
alter table messages
  add constraint messages_group_id_fkey foreign key (group_id) references groups(id) on delete cascade;

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('audio','video')),
  status text not null default 'ongoing' check (status in ('missed','ongoing','completed','rejected')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration integer default 0,
  agora_channel text not null,
  agora_token text not null
);

create table if not exists admin_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  target_id uuid references profiles(id) on delete set null,
  details jsonb default '{}'::jsonb,
  ip_address text default '',
  user_agent text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_profiles_phone on profiles(phone);
create index if not exists idx_profiles_status on profiles(status);
create index if not exists idx_messages_direct on messages(sender_id, receiver_id, created_at desc);
create index if not exists idx_messages_receiver on messages(receiver_id, created_at desc);
create index if not exists idx_messages_group on messages(group_id, created_at desc);
create index if not exists idx_contacts_user on contacts(user_id);
create index if not exists idx_group_members_user on group_members(user_id);

-- Storage buckets. Public true keeps existing React media rendering simple for MVP.
-- Later we can switch to private signed URL route.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('verification-photos', 'verification-photos', true)
on conflict (id) do update set public = excluded.public;

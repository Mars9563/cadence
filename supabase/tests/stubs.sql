-- Minimal stand-ins for what Supabase Auth (GoTrue) creates in a real
-- project, only when the image doesn't already have them.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
-- LINZOO v7 — SQL PATCH (no wipe, adds on top of v4)
-- ═══════════════════════════════════════════════════════

-- 1. Avatar color + badge (custom Discord-style role tag) on profiles
alter table profiles
  add column if not exists avatar_color text not null default '#1D9BF0',
  add column if not exists badge_name   text,
  add column if not exists badge_color  text not null default '#1D9BF0',
  add column if not exists badge_hidden boolean not null default false;

-- 2. Reports table (user → super admin)
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  from_id     uuid not null references profiles(id) on delete cascade,
  subject     text not null,
  body        text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table reports enable row level security;
create policy "reports_insert" on reports for insert with check (auth.uid() = from_id);
create policy "reports_select" on reports for select using (
  from_id = auth.uid()
  or exists (select 1 from profiles where id = auth.uid() and role = 'superadmin')
);
create policy "reports_update" on reports for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'superadmin')
);

-- 3. Fix declined connections: allow re-request by treating declined as non-existent
-- We handle this in app code by deleting declined records

-- 4. Auto-join General group for new users via trigger
create or replace function auto_join_general()
returns trigger language plpgsql security definer as $$
declare
  general_id uuid;
begin
  select id into general_id from chats where is_universal = true limit 1;
  if general_id is not null then
    insert into chat_members (chat_id, user_id) values (general_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_created on profiles;
create trigger on_profile_created
  after insert on profiles
  for each row execute procedure auto_join_general();

-- 5. Auto-join existing users to General (run once)
do $$
declare
  general_id uuid;
begin
  select id into general_id from chats where is_universal = true limit 1;
  if general_id is not null then
    insert into chat_members (chat_id, user_id)
    select general_id, id from profiles
    on conflict do nothing;
  end if;
end;
$$;

-- 6. Add cascade delete so declined connections can be cleaned
-- (existing rows with status='declined' — delete them)
delete from connections where status = 'declined';

-- 7. Ensure General group name has emoji
update chats set name = '🌎 General' where is_universal = true and name = 'General';

-- 8. Add missing RLS for profiles update by superadmin (more permissive)
drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
);

-- 9. Group admin role in chat_members — already stored as 'admin' in role column, no change needed

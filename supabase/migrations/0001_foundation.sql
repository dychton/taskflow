-- TaskFlow Milestone 1: private owner registry + MFA-enforced site storage.
-- Run in a NEW dedicated Supabase project using SQL Editor.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.owner_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.owner_accounts from public, anon, authenticated;

-- Fixed-search-path SECURITY DEFINER function; reveals only whether caller is the owner.
create or replace function public.am_i_owner()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists(select 1 from private.owner_accounts where user_id = (select auth.uid()));
$$;
revoke all on function public.am_i_owner() from public, anon;
grant execute on function public.am_i_owner() to authenticated;

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  color text not null default '#3886C4' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists sites_name_unique on public.sites (lower(name));
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists sites_touch_updated_at on public.sites;
create trigger sites_touch_updated_at before update on public.sites
for each row execute function private.touch_updated_at();

alter table public.sites enable row level security;
revoke all on public.sites from public, anon, authenticated;
grant select, insert, update on public.sites to authenticated;

-- Restrict every operation to ONE registered owner at MFA assurance level 2.
create policy "owner_mfa_select_sites" on public.sites for select to authenticated
using ((select public.am_i_owner()) and (select auth.jwt()->>'aal') = 'aal2');
create policy "owner_mfa_insert_sites" on public.sites for insert to authenticated
with check ((select public.am_i_owner()) and (select auth.jwt()->>'aal') = 'aal2');
create policy "owner_mfa_update_sites" on public.sites for update to authenticated
using ((select public.am_i_owner()) and (select auth.jwt()->>'aal') = 'aal2')
with check ((select public.am_i_owner()) and (select auth.jwt()->>'aal') = 'aal2');
-- No DELETE privilege/policy. Archive support for sites is outside Milestone 1.

-- IMPORTANT: After creating a single owner through Supabase Auth > Users,
-- register that exact user ID using the following command in the SQL editor:
-- insert into private.owner_accounts (user_id) values ('OWNER_UUID_FROM_AUTH_USERS');
-- Disable public sign-ups in Supabase Auth settings.

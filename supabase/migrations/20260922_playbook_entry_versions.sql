-- Safe Playbook overwrite history.
-- Keeps a recoverable snapshot before an existing Playbook entry is replaced.
begin;

alter table public.playbook_entries
  add column if not exists updated_at timestamptz;

create table if not exists public.playbook_entry_versions (
  id uuid primary key default gen_random_uuid(),
  playbook_entry_id uuid not null references public.playbook_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_key text not null,
  title text not null,
  category text not null,
  content text not null,
  source text,
  original_created_at timestamptz,
  original_updated_at timestamptz,
  version_created_at timestamptz not null default now()
);

create index if not exists playbook_entry_versions_entry_created
  on public.playbook_entry_versions(playbook_entry_id, version_created_at desc);

create index if not exists playbook_entry_versions_owner
  on public.playbook_entry_versions(user_id, profile_key, version_created_at desc);

alter table public.playbook_entry_versions enable row level security;

revoke all on public.playbook_entry_versions from public, anon, authenticated;
grant select, insert, delete on public.playbook_entry_versions to authenticated;

drop policy if exists playbook_entry_versions_read on public.playbook_entry_versions;
create policy playbook_entry_versions_read
on public.playbook_entry_versions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists playbook_entry_versions_create on public.playbook_entry_versions;
create policy playbook_entry_versions_create
on public.playbook_entry_versions
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists playbook_entry_versions_delete on public.playbook_entry_versions;
create policy playbook_entry_versions_delete
on public.playbook_entry_versions
for delete to authenticated
using (user_id = auth.uid());

comment on table public.playbook_entry_versions is
  'Recoverable snapshots captured immediately before a user-confirmed Playbook overwrite.';

commit;

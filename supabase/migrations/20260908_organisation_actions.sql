-- Organisation action records only; no execution or automatic model writes.
begin;
create table public.organisation_actions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  type text not null check (type in ('decision', 'action_plan', 'intervention')),
  rationale text check (length(rationale) <= 4000),
  evidence_summary text check (length(evidence_summary) <= 4000),
  owner text check (length(owner) <= 200),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'in_review', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  start_date date,
  review_date date,
  completed_date date,
  expected_outcome text check (length(expected_outcome) <= 4000),
  success_measure text check (length(success_measure) <= 4000),
  source text not null check (source in ('manual', 'ask_root', 'realtime', 'executive_review', 'organisation_learning')),
  -- Opaque contextual reference, never dereferenced as an access capability.
  source_reference text check (length(source_reference) <= 500),
  outcome_summary text check (length(outcome_summary) <= 4000),
  outcome_status text not null default 'not_reviewed' check (outcome_status in ('not_reviewed', 'pending', 'achieved', 'partially_achieved', 'not_achieved', 'inconclusive')),
  created_by uuid not null default auth.uid() references auth.users(id),
  human_confirmed boolean not null check (human_confirmed = true),
  check (status <> 'completed' or completed_date is not null),
  check (start_date is null or completed_date is null or completed_date >= start_date)
);
create index organisation_actions_scope_created on public.organisation_actions(organisation_id, created_at desc, id desc);
alter table public.organisation_actions enable row level security;
revoke all on public.organisation_actions from public, anon, authenticated;
grant select, insert, delete on public.organisation_actions to authenticated;
grant update (title, type, rationale, evidence_summary, owner, status, start_date, review_date, completed_date, expected_outcome, success_measure, outcome_summary, outcome_status) on public.organisation_actions to authenticated;
create policy organisation_actions_read on public.organisation_actions for select to authenticated
using (exists (select 1 from public.organisation_members m where m.organisation_id = organisation_actions.organisation_id and m.user_id = auth.uid() and m.role in ('organisation_admin', 'hr_admin')));
create policy organisation_actions_create on public.organisation_actions for insert to authenticated
with check (created_by = auth.uid() and human_confirmed and exists (select 1 from public.organisation_members m where m.organisation_id = organisation_actions.organisation_id and m.user_id = auth.uid() and m.role in ('organisation_admin', 'hr_admin')));
create policy organisation_actions_manage on public.organisation_actions for update to authenticated
using (exists (select 1 from public.organisation_members m where m.organisation_id = organisation_actions.organisation_id and m.user_id = auth.uid() and m.role in ('organisation_admin', 'hr_admin')))
with check (exists (select 1 from public.organisation_members m where m.organisation_id = organisation_actions.organisation_id and m.user_id = auth.uid() and m.role in ('organisation_admin', 'hr_admin')));
create policy organisation_actions_delete on public.organisation_actions for delete to authenticated
using (exists (select 1 from public.organisation_members m where m.organisation_id = organisation_actions.organisation_id and m.user_id = auth.uid() and m.role in ('organisation_admin', 'hr_admin')));
comment on table public.organisation_actions is 'Human-confirmed organisation plans and reported outcomes. Not measured wellbeing evidence. No automatic execution.';
commit;

begin;

-- Personal tables are owner-scoped and require a Root-activated grant, then
-- stop authorizing direct Supabase API calls when it expires or is revoked.
-- This SECURITY INVOKER helper only sees the caller's own active grant through
-- the existing RLS policy on professional_introducer_demo_access.
create or replace function public.professional_introducer_access_active()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.professional_introducer_demo_access g
    where g.user_id = (select auth.uid())
      and g.revoked_at is null
      and g.expires_at > statement_timestamp()
      and g.demo_organisation_id is not null
  );
$$;
revoke all on function public.professional_introducer_access_active() from public, anon, authenticated;
grant execute on function public.professional_introducer_access_active() to authenticated;

drop policy profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));
drop policy profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()))
  with check (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));

drop policy assessment_select_self on public.wellbeing_assessments;
create policy assessment_select_self on public.wellbeing_assessments for select to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));
drop policy assessment_insert_self on public.wellbeing_assessments;
create policy assessment_insert_self on public.wellbeing_assessments for insert to authenticated
  with check (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));

drop policy journal_select_self on public.journal_entries;
create policy journal_select_self on public.journal_entries for select to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));
drop policy journal_insert_self on public.journal_entries;
create policy journal_insert_self on public.journal_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));
drop policy journal_update_self on public.journal_entries;
create policy journal_update_self on public.journal_entries for update to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()))
  with check (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));
drop policy journal_delete_self on public.journal_entries;
create policy journal_delete_self on public.journal_entries for delete to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));

drop policy mind_select_self on public.mind_entries;
create policy mind_select_self on public.mind_entries for select to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));
drop policy mind_insert_self on public.mind_entries;
create policy mind_insert_self on public.mind_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));
drop policy body_select_self on public.body_signals;
create policy body_select_self on public.body_signals for select to authenticated
  using (user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));
drop policy body_insert_self on public.body_signals;
create policy body_insert_self on public.body_signals for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));
drop policy coach_select_self on public.coach_signals;
create policy coach_select_self on public.coach_signals for select to authenticated
  using (user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));
drop policy voice_select_self on public.voice_sessions;
create policy voice_select_self on public.voice_sessions for select to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));
drop policy voice_insert_self on public.voice_sessions;
create policy voice_insert_self on public.voice_sessions for insert to authenticated
  with check (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));

drop policy playbook_select_self on public.playbook_entries;
create policy playbook_select_self on public.playbook_entries for select to authenticated
  using (organisation_id is null and user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));
drop policy playbook_insert_self on public.playbook_entries;
create policy playbook_insert_self on public.playbook_entries for insert to authenticated
  with check (organisation_id is null and user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));
drop policy playbook_update_self on public.playbook_entries;
create policy playbook_update_self on public.playbook_entries for update to authenticated
  using (organisation_id is null and user_id = (select auth.uid()) and (select public.professional_introducer_access_active()))
  with check (organisation_id is null and user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));
drop policy playbook_delete_self on public.playbook_entries;
create policy playbook_delete_self on public.playbook_entries for delete to authenticated
  using (organisation_id is null and user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));

drop policy playbook_versions_self on public.playbook_entry_versions;
create policy playbook_versions_self on public.playbook_entry_versions for all to authenticated
  using (user_id = (select auth.uid()) and (select public.professional_introducer_access_active()))
  with check (user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));
drop policy playbook_tracker_self on public.playbook_tracker_entries;
create policy playbook_tracker_self on public.playbook_tracker_entries for all to authenticated
  using (user_id = (select auth.uid()) and (select public.professional_introducer_access_active()))
  with check (user_id = (select auth.uid()) and (select public.professional_introducer_access_active()));
drop policy root_measurements_self on public.root_measurements;
create policy root_measurements_self on public.root_measurements for all to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()))
  with check (user_id = (select auth.uid()) and organisation_id is null and (select public.professional_introducer_access_active()));

commit;

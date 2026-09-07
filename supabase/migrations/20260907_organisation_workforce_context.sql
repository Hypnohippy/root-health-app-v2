-- Phase 3C: aggregate access only. Apply separately after review.
begin;
create function public.organisation_workforce_context(p_organisation_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.organisation_members
    where organisation_id = p_organisation_id and user_id = auth.uid()
      and role in ('organisation_admin', 'hr_admin')
  ) then
    raise exception 'Organisation access denied' using errcode = '42501';
  end if;
  with roster as (
    select p.organisation_unit_id, p.workforce_status,
      m.id is not null as linked, m.user_id is not null as joined,
      i.id is not null as invited, i.delivery_status
    from public.organisation_people p
    left join public.organisation_members m
      on m.id = p.organisation_member_id and m.organisation_id = p.organisation_id
    left join public.organisation_employee_invites i
      on i.person_id = p.id and i.organisation_id = p.organisation_id
    where p.organisation_id = p_organisation_id
  ), active_roster as (select * from roster where workforce_status = 'active'),
  unit_totals as (select organisation_unit_id, count(*) n from active_roster group by organisation_unit_id)
  select jsonb_build_object(
    'organisationId', p_organisation_id,
    'hasRecordedRoster', exists(select 1 from roster),
    'source', 'organisation_people',
    'completeness', 'not established',
    'activeWorkforceCount', (select count(*) from active_roster),
    'linkedMembershipCount', (select count(*) from active_roster where linked),
    'joinedCount', (select count(*) from active_roster where joined),
    'invitationSentCount', (select count(*) from active_roster where delivery_status = 'sent'),
    'awaitingJoinCount', (select count(*) from active_roster where delivery_status = 'sent' and not joined),
    'notInvitedCount', (select count(*) from active_roster where not invited and not joined),
    'deliveryCounts', (select coalesce(jsonb_object_agg(delivery_status, n), '{}'::jsonb)
      from (select delivery_status, count(*) n from active_roster
        where delivery_status is not null group by delivery_status) d),
    'rootMembershipCount', (select count(*) from public.organisation_members where organisation_id = p_organisation_id),
    'authenticatedMembershipCount', (select count(*) from public.organisation_members where organisation_id = p_organisation_id and user_id is not null),
    'unitCount', (select count(*) from public.organisation_units where organisation_id = p_organisation_id and active),
    'unplacedCount', (select count(*) from active_roster where organisation_unit_id is null),
    'units', (select coalesce(jsonb_agg(jsonb_build_object('unitId', u.id,
      'activeWorkforceCount', coalesce(t.n, 0))), '[]'::jsonb)
      from public.organisation_units u left join unit_totals t on t.organisation_unit_id = u.id
      where u.organisation_id = p_organisation_id and u.active)
  ) into result;
  return result;
end;
$$;
revoke all on function public.organisation_workforce_context(uuid) from public, anon, authenticated;
grant execute on function public.organisation_workforce_context(uuid) to authenticated;
commit;

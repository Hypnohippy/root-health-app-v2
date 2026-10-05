begin;

-- Keep the historic document/status evidence intact. Returned is a separate, immutable handoff.
create table public.introducer_google_agreement_returns (
  agreement_id uuid primary key references public.organisation_introducer_agreements(id),
  returned_at timestamptz not null default now(),
  notification_state text not null default 'started' check (notification_state in ('started','confirmed','unconfirmed')),
  notification_message_id text,
  check ((notification_state='confirmed') = (notification_message_id is not null))
);
alter table public.introducer_google_agreement_returns enable row level security;
revoke all on public.introducer_google_agreement_returns from public,anon,authenticated,service_role;
grant select on public.introducer_google_agreement_returns to service_role;

create function public.guard_introducer_agreement_return() returns trigger language plpgsql as $$
begin
  if TG_OP='DELETE' then raise exception 'Returned evidence cannot be deleted'; end if;
  if (new.agreement_id,new.returned_at) is distinct from (old.agreement_id,old.returned_at)
    or old.notification_state<>'started' or new.notification_state='started' then
    raise exception 'Returned evidence is immutable';
  end if;
  return new;
end $$;
create trigger introducer_return_history_guard before update or delete on public.introducer_google_agreement_returns
  for each row execute function public.guard_introducer_agreement_return();

create function public.return_introducer_google_agreement(p_agreement uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.organisation_introducer_agreements;
begin
  select * into strict a from public.organisation_introducer_agreements where id=p_agreement;
  perform 1 from public.organisation_introducers where id=a.introducer_id for update;
  select * into strict a from public.organisation_introducer_agreements where id=p_agreement;
  if exists(select 1 from public.introducer_google_agreement_returns where agreement_id=a.id) then return false; end if;
  if a.status<>'sent' or exists(select 1 from public.organisation_introducer_agreements where introducer_id=a.introducer_id and version>a.version)
    or exists(select 1 from public.introducer_google_agreement_operations where introducer_id=a.introducer_id and state not in ('completed','cancelled')
      and (action<>'send' or not (progress ? 'smtp_started') or lease_until>now())) then
    raise exception 'Only the current sent agreement can be returned; resolve pending operations first';
  end if;
  insert into public.introducer_google_agreement_returns(agreement_id) values(a.id);
  return true;
end $$;

create function public.record_introducer_return_notification(p_agreement uuid,p_message_id text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.introducer_google_agreement_returns set
    notification_state=case when nullif(trim(p_message_id),'') is null then 'unconfirmed' else 'confirmed' end,
    notification_message_id=nullif(trim(p_message_id),'')
    where agreement_id=p_agreement and notification_state='started';
end $$;

-- Guard both the start of archiving and final acceptance, including pre-migration retries.
create function public.require_introducer_agreement_return() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if TG_TABLE_NAME='introducer_google_agreement_operations' then
    if new.action<>'accept' or new.state in ('completed','cancelled') then return new; end if;
    if not exists(select 1 from public.introducer_google_agreement_returns where agreement_id=new.agreement_id) then
      raise exception 'Agreement must be returned before acceptance';
    end if;
  elsif new.status='accepted' and old.status<>'accepted' then
    if not exists(select 1 from public.introducer_google_agreement_returns where agreement_id=new.id) then
      raise exception 'Agreement must be returned before acceptance';
    end if;
  end if;
  return new;
end $$;
create trigger introducer_return_before_archive before insert or update on public.introducer_google_agreement_operations
  for each row execute function public.require_introducer_agreement_return();
create trigger introducer_return_before_acceptance before update on public.organisation_introducer_agreements
  for each row execute function public.require_introducer_agreement_return();

revoke all on function public.return_introducer_google_agreement(uuid),public.record_introducer_return_notification(uuid,text),
  public.require_introducer_agreement_return() from public,anon,authenticated;
grant execute on function public.return_introducer_google_agreement(uuid),public.record_introducer_return_notification(uuid,text) to service_role;
commit;

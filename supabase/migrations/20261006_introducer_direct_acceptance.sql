begin;

-- Forward retirement: preserve previous return evidence, never pretend it was acceptance.
drop trigger if exists introducer_return_before_archive on public.introducer_google_agreement_operations;
drop trigger if exists introducer_return_before_acceptance on public.organisation_introducer_agreements;
drop function if exists public.require_introducer_agreement_return();
drop function if exists public.return_introducer_google_agreement(uuid);
drop function if exists public.record_introducer_return_notification(uuid,text);
comment on table public.introducer_google_agreement_returns is 'Retired return-for-review history; not electronic acceptance evidence.';
-- Retire unfinished admin-accept operations without deleting their external-work audit trail.
update public.introducer_google_agreement_operations set state='cancelled',lease_until=null
  where action='accept' and state not in ('completed','cancelled');

create table public.introducer_agreement_review_copies (
  agreement_id uuid primary key references public.organisation_introducer_agreements(id),
  pdf_base64 text not null check (length(pdf_base64)<=4194304),
  pdf_sha256 text not null check (pdf_sha256 ~ '^[a-f0-9]{64}$'),
  source_revision text not null,
  created_at timestamptz not null default now()
);
create table public.introducer_agreement_invitations (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  agreement_id uuid not null references public.introducer_agreement_review_copies(agreement_id),
  expires_at timestamptz not null default now()+interval '90 days',
  created_at timestamptz not null default now()
);
create table public.introducer_agreement_acceptances (
  id uuid not null unique default gen_random_uuid(),
  agreement_id uuid primary key references public.introducer_agreement_review_copies(agreement_id),
  accepted_at timestamptz not null default now(),
  evidence jsonb not null,
  terms_snapshot jsonb not null,
  terms_hash text not null,
  review_pdf_sha256 text not null,
  archive_state text not null default 'pending' check (archive_state in ('pending','archived')),
  progress jsonb not null default '{}',
  deliveries jsonb not null default '{}',
  lease_id uuid,
  lease_until timestamptz
);

create function public.guard_direct_agreement_evidence() returns trigger language plpgsql as $$
begin
  if TG_OP='DELETE' then raise exception 'Agreement evidence cannot be deleted'; end if;
  if TG_TABLE_NAME<>'introducer_agreement_acceptances' or
    (to_jsonb(new)-array['archive_state','progress','deliveries','lease_id','lease_until']) is distinct from
    (to_jsonb(old)-array['archive_state','progress','deliveries','lease_id','lease_until']) then
    raise exception 'Agreement evidence is immutable';
  end if;
  if not (new.progress @> old.progress) or (old.archive_state='archived' and new.archive_state<>'archived') then
    raise exception 'Archive evidence is immutable';
  end if;
  return new;
end $$;
create trigger direct_review_immutable before update or delete on public.introducer_agreement_review_copies for each row execute function public.guard_direct_agreement_evidence();
create trigger direct_invitation_immutable before update or delete on public.introducer_agreement_invitations for each row execute function public.guard_direct_agreement_evidence();
create trigger direct_acceptance_immutable before update or delete on public.introducer_agreement_acceptances for each row execute function public.guard_direct_agreement_evidence();

create function public.prepare_introducer_acceptance(p_agreement uuid,p_token_hash text,p_pdf jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.organisation_introducer_agreements;
begin
  select * into strict a from public.organisation_introducer_agreements where id=p_agreement;
  perform 1 from public.organisation_introducers where id=a.introducer_id for update;
  select * into strict a from public.organisation_introducer_agreements where id=p_agreement;
  if a.status not in ('draft','sent') or exists(select 1 from public.introducer_agreement_acceptances where agreement_id=a.id)
    or exists(select 1 from public.organisation_introducer_agreements where introducer_id=a.introducer_id and version>a.version) then raise exception 'Agreement unavailable'; end if;
  insert into public.introducer_agreement_review_copies(agreement_id,pdf_base64,pdf_sha256,source_revision)
    values(a.id,p_pdf->>'pdf_base64',p_pdf->>'pdf_sha256',p_pdf->>'source_revision') on conflict do nothing;
  insert into public.introducer_agreement_invitations(token_hash,agreement_id) values(p_token_hash,a.id);
end $$;

create function public.accept_introducer_agreement(p_token_hash text,p_evidence jsonb,p_review_hash text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.organisation_introducer_agreements; invitation public.introducer_agreement_invitations;
  review public.introducer_agreement_review_copies; acceptance public.introducer_agreement_acceptances;
begin
  select * into strict invitation from public.introducer_agreement_invitations where token_hash=p_token_hash and expires_at>now();
  select * into strict a from public.organisation_introducer_agreements where id=invitation.agreement_id;
  perform 1 from public.organisation_introducers where id=a.introducer_id for update;
  select * into strict a from public.organisation_introducer_agreements where id=a.id;
  select * into acceptance from public.introducer_agreement_acceptances where agreement_id=a.id;
  if found then return to_jsonb(acceptance); end if;
  if a.status<>'sent' or exists(select 1 from public.organisation_introducer_agreements where introducer_id=a.introducer_id and version>a.version)
    or exists(select 1 from public.introducer_google_agreement_operations where introducer_id=a.introducer_id and state not in ('completed','cancelled')
      and (action<>'send' or not (progress ? 'smtp_started') or lease_until>now())) then raise exception 'Agreement unavailable'; end if;
  select * into strict review from public.introducer_agreement_review_copies where agreement_id=a.id;
  if p_review_hash is distinct from review.pdf_sha256 or p_evidence->>'confirmed' is distinct from 'true'
    or nullif(trim(p_evidence->>'full_name'),'') is null or length(p_evidence->>'full_name')>200
    or nullif(trim(p_evidence->>'role'),'') is null or length(p_evidence->>'role')>200
    or length(coalesce(p_evidence->>'organisation',''))>300
    or lower(trim(p_evidence->>'email')) is distinct from lower(a.terms_snapshot->>'contact_email')
    or coalesce(p_evidence->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
    or (nullif(trim(p_evidence->>'organisation'),'') is not null and p_evidence->>'authority' is distinct from 'true') then raise exception 'Acceptance confirmation required'; end if;
  insert into public.introducer_agreement_acceptances(agreement_id,evidence,terms_snapshot,terms_hash,review_pdf_sha256)
    values(a.id,p_evidence,a.terms_snapshot,a.terms_hash,review.pdf_sha256) returning * into acceptance;
  return to_jsonb(acceptance);
end $$;

-- Only fulfilment follows the immutable customer acceptance. No admin can manufacture consent.
create function public.guard_direct_agreement_operations() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.action='accept' and new.state not in ('completed','cancelled') then raise exception 'Customer acceptance required'; end if;
  if new.state='running' and exists(select 1 from public.introducer_agreement_acceptances e join public.organisation_introducer_agreements a on a.id=e.agreement_id
    where a.introducer_id=new.introducer_id and (e.archive_state='pending' or (new.action='send' and a.id=new.agreement_id))) then
    raise exception 'Acceptance already recorded; finish fulfilment first';
  end if;
  return new;
end $$;
create trigger direct_agreement_operation_guard before insert or update on public.introducer_google_agreement_operations for each row execute function public.guard_direct_agreement_operations();

create function public.require_direct_agreement_evidence() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status='accepted' and old.status<>'accepted' and not exists(select 1 from public.introducer_agreement_acceptances
    where agreement_id=new.id and id=new.accepted_by and accepted_at=new.accepted_at and terms_snapshot=new.accepted_terms_snapshot) then
    raise exception 'Customer acceptance evidence required';
  end if;
  return new;
end $$;
create trigger direct_agreement_acceptance_guard before update on public.organisation_introducer_agreements for each row execute function public.require_direct_agreement_evidence();

create function public.fulfil_introducer_acceptance(p_agreement uuid,p_lease uuid,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.introducer_agreement_acceptances; a public.organisation_introducer_agreements; channel text;
begin
  select * into strict a from public.organisation_introducer_agreements where id=p_agreement;
  perform 1 from public.organisation_introducers where id=a.introducer_id for update;
  select * into strict e from public.introducer_agreement_acceptances where agreement_id=a.id for update;
  if p_action='claim' then
    if e.lease_until>now() then return null; end if;
    update public.introducer_agreement_acceptances set lease_id=p_lease,lease_until=now()+interval '3 minutes' where agreement_id=a.id returning * into e;
    return to_jsonb(e);
  end if;
  if e.lease_id is distinct from p_lease or e.lease_until<=now() then raise exception 'Fulfilment lease lost'; end if;
  if p_action='checkpoint' then
    update public.introducer_agreement_acceptances set progress=progress||p_data,lease_until=now()+interval '3 minutes' where agreement_id=a.id returning * into e;
  elsif p_action='archive' then
    if e.archive_state='pending' then
      if p_data->>'pdf_sha256' is distinct from e.progress->>'pdf_hash' or p_data->>'pdf_document_id' is distinct from e.progress->>'pdf_id'
        or p_data->>'pdf_document_url' is null then raise exception 'Archive evidence mismatch'; end if;
      update public.organisation_introducer_agreements set status='accepted',accepted_at=e.accepted_at,accepted_by=e.id,
        accepted_terms_snapshot=e.terms_snapshot,pdf_document_id=p_data->>'pdf_document_id',pdf_document_url=p_data->>'pdf_document_url',
        pdf_sha256=p_data->>'pdf_sha256',source_revision=p_data->>'source_revision' where id=a.id and status='sent';
      if not found then raise exception 'Agreement unavailable'; end if;
      update public.introducer_agreement_acceptances set archive_state='archived' where agreement_id=a.id returning * into e;
    end if;
  elsif p_action='claim_email' then
    channel=p_data->>'channel';
    if channel not in ('customer','root') or e.archive_state<>'archived' then raise exception 'Archive required'; end if;
    if e.deliveries ? channel then return null; end if;
    update public.introducer_agreement_acceptances set deliveries=deliveries||jsonb_build_object(channel,jsonb_build_object('state','started')) where agreement_id=a.id returning * into e;
  elsif p_action='receipt' then
    channel=p_data->>'channel';
    if e.deliveries->channel->>'state' is distinct from 'started' then raise exception 'Delivery already recorded'; end if;
    update public.introducer_agreement_acceptances set deliveries=jsonb_set(deliveries,array[channel],jsonb_build_object('state',case when nullif(p_data->>'message_id','') is null then 'unconfirmed' else 'confirmed' end,'message_id',p_data->>'message_id')) where agreement_id=a.id returning * into e;
  elsif p_action='release' then
    update public.introducer_agreement_acceptances set lease_until=null where agreement_id=a.id returning * into e;
  else raise exception 'Unknown fulfilment action'; end if;
  return to_jsonb(e);
end $$;

alter table public.introducer_agreement_review_copies enable row level security;
alter table public.introducer_agreement_invitations enable row level security;
alter table public.introducer_agreement_acceptances enable row level security;
revoke all on public.introducer_agreement_review_copies,public.introducer_agreement_invitations,public.introducer_agreement_acceptances from public,anon,authenticated,service_role;
grant select on public.introducer_agreement_review_copies,public.introducer_agreement_invitations,public.introducer_agreement_acceptances to service_role;
revoke all on function public.prepare_introducer_acceptance(uuid,text,jsonb),public.accept_introducer_agreement(text,jsonb,text),public.fulfil_introducer_acceptance(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_introducer_acceptance(uuid,text,jsonb),public.accept_introducer_agreement(text,jsonb,text),public.fulfil_introducer_acceptance(uuid,uuid,text,jsonb) to service_role;
revoke all on function public.guard_direct_agreement_evidence(),public.guard_direct_agreement_operations(),public.require_direct_agreement_evidence() from public,anon,authenticated;
commit;

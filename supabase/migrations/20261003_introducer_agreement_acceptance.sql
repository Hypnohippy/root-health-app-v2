begin;

alter table public.organisation_introducers add column agreement_legacy boolean not null default false;
alter table public.organisation_introducers add column agreement_activated_at timestamptz;
update public.organisation_introducers set agreement_legacy = true where status='active';
alter table public.organisation_introducers alter column status set default 'inactive';

create table public.introducer_agreement_versions (
  version text primary key,
  agreement_text text not null,
  acceptance_version text not null,
  acceptance_text text not null,
  agreement_confirmation_text text not null default 'I have read and agree to the Root Health Introducer Agreement and Commercial Terms.',
  authority_confirmation_text text not null default 'I confirm that the information provided is accurate and, where applicable, that I am authorised to accept this Agreement on behalf of the organisation named above.',
  created_at timestamptz not null default now()
);
create table public.introducer_agreement_offers (
  id uuid primary key default gen_random_uuid(),
  introducer_id uuid not null references public.organisation_introducers(id),
  version text not null references public.introducer_agreement_versions(version),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  invited_email text not null,
  terms jsonb not null,
  expires_at timestamptz not null,
  terms_revision uuid not null default gen_random_uuid(),
  revoked_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create table public.introducer_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.introducer_agreement_offers(id),
  introducer_id uuid not null references public.organisation_introducers(id),
  account_id uuid not null,
  accepting_name text not null,
  accepting_capacity text not null,
  verified_email text not null,
  accepted_at timestamptz not null default now(),
  version text not null,
  agreement_text text not null,
  acceptance_version text not null,
  acceptance_text text not null,
  agreement_confirmation_text text not null,
  authority_confirmation_text text not null,
  terms jsonb not null,
  agreed boolean not null check (agreed),
  authority_confirmed boolean not null check (authority_confirmed)
);
create table public.introducer_agreement_archives (
  acceptance_id uuid primary key references public.introducer_agreement_acceptances(id),
  storage_path text not null unique,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  pdf_hash text not null check (pdf_hash ~ '^[a-f0-9]{64}$'),
  archived_at timestamptz not null default now()
);
create index introducer_agreement_offers_introducer_idx on public.introducer_agreement_offers(introducer_id);
create index introducer_agreement_acceptances_owner_idx on public.introducer_agreement_acceptances(account_id);

create function public.reject_agreement_mutation() returns trigger language plpgsql as $$
begin raise exception 'Agreement evidence is append-only'; end $$;
create trigger agreement_versions_immutable before update or delete on public.introducer_agreement_versions
for each row execute function public.reject_agreement_mutation();
create trigger agreement_acceptances_immutable before update or delete on public.introducer_agreement_acceptances
for each row execute function public.reject_agreement_mutation();
create trigger agreement_archives_immutable before update or delete on public.introducer_agreement_archives
for each row execute function public.reject_agreement_mutation();
create function public.guard_agreement_offer() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Agreement offers cannot be deleted'; end if;
  if (to_jsonb(new) - 'revoked_at') <> (to_jsonb(old) - 'revoked_at') or old.revoked_at is not null then
    raise exception 'Only first revocation of an offer is allowed';
  end if;
  return new;
end $$;
create trigger agreement_offers_immutable before update or delete on public.introducer_agreement_offers
for each row execute function public.guard_agreement_offer();

-- Existing eligibility checks remain unchanged: new records are inactive until archived.
create function public.guard_introducer_agreement() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.agreement_legacy or new.agreement_activated_at is not null or new.status <> 'inactive' then raise exception 'New introducers require acceptance'; end if;
  else
    if new.agreement_legacy is distinct from old.agreement_legacy then raise exception 'Legacy marker cannot be changed'; end if;
    if new.status = 'active' and old.status <> 'active' and not old.agreement_legacy and not exists (
      select 1 from public.introducer_agreement_acceptances a join public.introducer_agreement_archives r on r.acceptance_id=a.id
      where a.introducer_id=new.id
    ) then raise exception 'Archived acceptance required'; end if;
    if exists(select 1 from public.introducer_agreement_offers where introducer_id=old.id) and
       not public.agreement_finalization_allowed(old.id) and
       (to_jsonb(new) - array['status','updated_at','notes']) <> (to_jsonb(old) - array['status','updated_at','notes']) then
      raise exception 'Issued agreement identity and terms are frozen; issue a replacement agreement through the approved change workflow';
    end if;
  end if;
  return new;
end $$;
create trigger introducer_agreement_gate before insert or update on public.organisation_introducers
for each row execute function public.guard_introducer_agreement();

create function public.guard_agreement_policy() returns trigger language plpgsql as $$
declare target uuid;
begin
  if tg_op = 'DELETE' then target := old.introducer_id; else target := new.introducer_id; end if;
  if tg_op='UPDATE' and new.introducer_id is distinct from old.introducer_id then
    raise exception 'A commercial policy cannot be transferred';
  end if;
  perform 1 from public.organisation_introducers where id=target for update;
  if exists(select 1 from public.introducer_agreement_offers where introducer_id=target) and not public.agreement_finalization_allowed(target) then
    raise exception 'Agreement terms cannot change without a replacement acceptance workflow';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger introducer_agreement_policy_gate before insert or update or delete on public.organisation_introducer_policies
for each row execute function public.guard_agreement_policy();

create function public.issue_introducer_agreement(p_introducer uuid, p_email text, p_token_hash text, p_version text,
  p_agreement text, p_acceptance_version text, p_acceptance text, p_admin uuid, p_changes jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare i public.organisation_introducers; v public.introducer_agreement_versions; result uuid; policy public.organisation_introducer_policies;
begin
  select * into strict i from public.organisation_introducers where id=p_introducer for update;
  if jsonb_typeof(p_changes) <> 'object' or p_changes - array['commission_percent','commission_structure'] <> '{}'::jsonb then
    raise exception 'Unsupported material change';
  end if;
  if p_email is null or lower(trim(p_email)) <> lower(trim(coalesce(i.contact_email,''))) or position('@' in p_email)=0 then
    raise exception 'A matching introducer contact email is required';
  end if;
  select * into policy from public.organisation_introducer_policies where introducer_id=i.id
    and effective_from <= now() and (effective_until is null or effective_until > now()) order by effective_from desc limit 1;
  if policy.id is null then raise exception 'Effective policy required'; end if;
  if p_changes ? 'commission_percent' then
    if p_changes->>'commission_percent' is null or (p_changes->>'commission_percent')::numeric not between 0 and 100 then raise exception 'Invalid percentage'; end if;
    policy.commission_percent := (p_changes->>'commission_percent')::numeric;
  end if;
  if p_changes ? 'commission_structure' then
    if p_changes->>'commission_structure' is null or p_changes->>'commission_structure' not in ('one_off','recurring') then raise exception 'Invalid structure'; end if;
    policy.commission_structure := p_changes->>'commission_structure';
  end if;
  if exists(select 1 from public.organisation_introducer_policies where introducer_id=i.id and effective_from > now()) then
    raise exception 'Resolve scheduled policy changes before issuing an agreement';
  end if;
  insert into public.introducer_agreement_versions(version,agreement_text,acceptance_version,acceptance_text)
    values(p_version,p_agreement,p_acceptance_version,p_acceptance) on conflict do nothing;
  select * into strict v from public.introducer_agreement_versions where version=p_version;
  if v.agreement_text <> p_agreement or v.acceptance_text <> p_acceptance or v.acceptance_version <> p_acceptance_version then
    raise exception 'Version already exists with different wording';
  end if;
  update public.introducer_agreement_offers set revoked_at=now() where introducer_id=i.id and revoked_at is null;
  insert into public.introducer_agreement_offers(introducer_id,version,token_hash,invited_email,terms,expires_at,created_by)
  values(i.id,p_version,p_token_hash,lower(trim(p_email)),jsonb_build_object(
    'introducer_id',i.id,'name',i.name,'referral_code',i.referral_code,'contact_name',i.contact_name,'contact_email',i.contact_email,
    'market',i.introducer_market,'introducer_type',i.introducer_type,'policy_id',policy.id,
    'commission_percent',policy.commission_percent,'commission_structure',policy.commission_structure,'commission_basis',policy.commission_basis,
    'vat_registered',i.vat_registered,'vat_number',i.vat_number,'agreement_start_date',i.agreement_start_date,'agreement_end_date',i.agreement_end_date,
    'payment_document_method',i.payment_document_method,'repayment_days',30,'termination_notice_days',30
  ),now()+interval '7 days',p_admin) returning id into result;
  return result;
end $$;

create function public.accept_introducer_agreement(p_token_hash text,p_account uuid,p_email text,p_name text,p_capacity text,p_agreed boolean,p_authority boolean)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.introducer_agreement_offers; v public.introducer_agreement_versions; existing public.introducer_agreement_acceptances; result uuid; target uuid;
begin
  select introducer_id into target from public.introducer_agreement_offers where token_hash=p_token_hash;
  perform 1 from public.organisation_introducers where id=target for update;
  select * into strict o from public.introducer_agreement_offers where token_hash=p_token_hash for update;
  if p_account is null or p_email is null or o.invited_email <> lower(trim(p_email)) then raise exception 'Invitation unavailable'; end if;
  select * into existing from public.introducer_agreement_acceptances where offer_id=o.id;
  if existing.id is not null then
    if existing.account_id <> p_account then raise exception 'Invitation unavailable'; end if;
    return existing.id;
  end if;
  if o.revoked_at is not null or o.expires_at <= now() then raise exception 'Invitation unavailable'; end if;
  if p_agreed is distinct from true or p_authority is distinct from true or p_name is null or p_capacity is null or length(trim(p_name)) not between 1 and 200 or length(trim(p_capacity)) not between 1 and 200 then
    raise exception 'Identity and confirmations required';
  end if;
  select * into strict v from public.introducer_agreement_versions where version=o.version;
  insert into public.introducer_agreement_acceptances(offer_id,introducer_id,account_id,accepting_name,accepting_capacity,verified_email,
    version,agreement_text,acceptance_version,acceptance_text,agreement_confirmation_text,authority_confirmation_text,terms,agreed,authority_confirmed)
  values(o.id,o.introducer_id,p_account,trim(p_name),trim(p_capacity),o.invited_email,v.version,v.agreement_text,v.acceptance_version,v.acceptance_text,
    v.agreement_confirmation_text,v.authority_confirmation_text,o.terms,true,true)
  returning id into result;
  return result;
end $$;

create function public.complete_introducer_agreement(p_acceptance uuid,p_path text,p_content_hash text,p_pdf_hash text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.introducer_agreement_acceptances; o public.introducer_agreement_offers;
begin
  select * into strict a from public.introducer_agreement_acceptances where id=p_acceptance;
  perform 1 from public.organisation_introducers where id=a.introducer_id for update;
  select * into strict o from public.introducer_agreement_offers where id=a.offer_id;
  if p_path <> 'introducer-agreements/'||a.introducer_id||'/'||a.id||'.pdf' then raise exception 'Invalid archive path'; end if;
  if exists(select 1 from public.introducer_agreement_archives where acceptance_id=a.id) then return; end if;
  insert into public.introducer_agreement_archives values(a.id,p_path,p_content_hash,p_pdf_hash,now());
  if o.revoked_at is null then
    perform set_config('root.agreement_finalizing',a.id::text,true);
    if exists(select 1 from public.organisation_introducers i where i.id=a.introducer_id and
      (i.commission_percent is distinct from (a.terms->>'commission_percent')::numeric or i.commission_structure is distinct from a.terms->>'commission_structure')) then
      perform public.change_introducer_commercial_terms(a.introducer_id,(a.terms->>'commission_percent')::numeric,
        a.terms->>'commission_structure',now(),'Accepted agreement '||a.id,null);
    end if;
  end if;
  -- An old retry must not reactivate a revoked/replaced agreement or a terminated introducer.
  if o.revoked_at is null then
    update public.organisation_introducers set status='active',agreement_activated_at=now(),updated_at=now()
      where id=a.introducer_id and not agreement_legacy and agreement_activated_at is null;
  end if;
  perform set_config('root.agreement_finalizing','',true);
end $$;

-- Only the owner-executed finalisation transaction can open the material-change gate.
create function public.agreement_finalization_allowed(p_introducer uuid) returns boolean
language sql stable security invoker set search_path=public,pg_temp as $$
  select current_user = pg_get_userbyid((select proowner from pg_proc where oid='public.complete_introducer_agreement(uuid,text,text,text)'::regprocedure))
    and exists(select 1 from public.introducer_agreement_acceptances a join public.introducer_agreement_archives r on r.acceptance_id=a.id
      where a.introducer_id=p_introducer and a.id::text=current_setting('root.agreement_finalizing',true));
$$;

create function public.revoke_introducer_agreement(p_introducer uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from public.organisation_introducers where id=p_introducer for update;
  update public.introducer_agreement_offers set revoked_at=now() where introducer_id=p_introducer and revoked_at is null;
end $$;
revoke all on function public.revoke_introducer_agreement(uuid) from public,anon,authenticated;
grant execute on function public.revoke_introducer_agreement(uuid) to service_role;

alter table public.introducer_agreement_versions enable row level security;
alter table public.introducer_agreement_offers enable row level security;
alter table public.introducer_agreement_acceptances enable row level security;
alter table public.introducer_agreement_archives enable row level security;
revoke all on public.introducer_agreement_versions,public.introducer_agreement_offers,public.introducer_agreement_acceptances,public.introducer_agreement_archives from public,anon,authenticated,service_role;
grant select on public.introducer_agreement_versions,public.introducer_agreement_offers,public.introducer_agreement_acceptances,public.introducer_agreement_archives to service_role;
revoke all on function public.issue_introducer_agreement(uuid,text,text,text,text,text,text,uuid,jsonb), public.accept_introducer_agreement(text,uuid,text,text,text,boolean,boolean), public.complete_introducer_agreement(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.issue_introducer_agreement(uuid,text,text,text,text,text,text,uuid,jsonb), public.accept_introducer_agreement(text,uuid,text,text,text,boolean,boolean), public.complete_introducer_agreement(uuid,text,text,text) to service_role;

insert into storage.buckets(id,name,public) values('introducer-agreements','introducer-agreements',false);
-- Restrictive policies also override any pre-existing broad client Storage policies.
create policy introducer_agreement_objects_private on storage.objects as restrictive for all to anon,authenticated
  using (bucket_id <> 'introducer-agreements') with check (bucket_id <> 'introducer-agreements');
create policy introducer_agreement_bucket_private on storage.buckets as restrictive for all to anon,authenticated
  using (id <> 'introducer-agreements') with check (id <> 'introducer-agreements');
commit;

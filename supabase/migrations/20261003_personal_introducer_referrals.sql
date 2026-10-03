begin;

alter table public.organisation_introducers
  add column introducer_market text not null default 'corporate'
    check (introducer_market in ('corporate', 'personal', 'both')),
  add column introducer_type text not null default 'corporate_introducer'
    check (introducer_type in ('corporate_introducer', 'practitioner', 'therapist',
      'coach', 'professional_body', 'influencer', 'creator', 'publisher',
      'community', 'affiliate', 'other'));

-- Private attribution, not another ledger. Subscription rows are user-readable,
-- so commercial snapshots must not be stored on personal_subscriptions.
create table public.personal_referral_attributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  introducer_id uuid not null references public.organisation_introducers(id),
  policy_id uuid references public.organisation_introducer_policies(id),
  referral_code text not null,
  commission_percent numeric not null check (commission_percent between 0 and 100),
  commission_basis text not null check (commission_basis = 'collected_subscription_revenue'),
  commission_structure text not null check (commission_structure in ('one_off', 'recurring')),
  vat_registered boolean not null,
  vat_number text,
  vat_rate numeric not null check (vat_rate between 0 and 100),
  created_at timestamptz not null default now(),
  first_paid_at timestamptz,
  unique(user_id)
);
alter table public.personal_referral_attributions enable row level security;
revoke all on public.personal_referral_attributions from public, anon, authenticated;
grant select, insert, update on public.personal_referral_attributions to service_role;

alter table public.organisation_revenue_events
  add column personal_attribution_id uuid references public.personal_referral_attributions(id);
alter table public.organisation_commissions
  add column personal_attribution_id uuid references public.personal_referral_attributions(id),
  add column personal_vat_number_at_conversion text;
alter table public.organisation_revenue_events add constraint personal_revenue_identity
  check (personal_attribution_id is null or (application_id is null and organisation_id is null));
alter table public.organisation_commissions add constraint personal_commission_identity
  check (personal_attribution_id is null or (application_id is null and organisation_id is null));
create index personal_revenue_attribution_idx on public.organisation_revenue_events(personal_attribution_id)
  where personal_attribution_id is not null;
create unique index personal_initial_commission_unique on public.organisation_commissions(personal_attribution_id)
  where personal_attribution_id is not null and commission_event = 'initial_payment';

-- Called only after authenticated checkout. The browser supplies a code, never terms.
-- First eligible checkout fixes the referrer; terms are finalised at first payment.
create function public.prepare_personal_referral(p_user_id uuid, p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  i public.organisation_introducers%rowtype;
  p public.organisation_introducer_policies%rowtype;
  existing_id uuid;
begin
  if p_user_id is null then raise exception 'Missing user'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select id into existing_id from public.personal_referral_attributions where user_id=p_user_id;
  if found then return existing_id; end if;
  if nullif(trim(p_code), '') is null then return null; end if;
  select * into i from public.organisation_introducers
    where lower(referral_code)=lower(trim(p_code)) for share;
  if not found or i.status <> 'active' or i.introducer_market not in ('personal','both')
    or i.agreement_start_date > (now() at time zone 'UTC')::date
    or i.agreement_end_date < (now() at time zone 'UTC')::date then
    return null;
  end if;
  select * into p from public.organisation_introducer_policies
    where introducer_id=i.id and effective_from<=now()
      and (effective_until is null or effective_until>now())
    order by effective_from desc limit 1;
  if not found then raise exception 'No effective introducer policy'; end if;
  insert into public.personal_referral_attributions(
    user_id,introducer_id,policy_id,referral_code,commission_percent,commission_basis,
    commission_structure,vat_registered,vat_number,vat_rate
  ) values (p_user_id,i.id,p.id,i.referral_code,p.commission_percent,p.commission_basis,
    p.commission_structure,i.vat_registered,case when i.vat_registered then i.vat_number end,
    case when i.vat_registered then 20 else 0 end)
  returning id into existing_id;
  return existing_id;
end $$;
revoke all on function public.prepare_personal_referral(uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_personal_referral(uuid,text) to service_role;

-- Verified Stripe invoice and commission are committed atomically. A failure
-- rolls back both, allowing webhook retries to repair rather than skip a liability.
create function public.record_personal_referral_payment(
  p_attribution_id uuid, p_user_id uuid, p_invoice_id text, p_subscription_id text,
  p_customer_id text, p_amount_minor bigint, p_currency text, p_paid_at timestamptz
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  a public.personal_referral_attributions%rowtype;
  i public.organisation_introducers%rowtype;
  p public.organisation_introducer_policies%rowtype;
  r public.organisation_revenue_events%rowtype;
  amount numeric;
  commission numeric;
  vat numeric;
  initial boolean;
begin
  if p_amount_minor is null or p_amount_minor<=0 or p_currency is distinct from 'gbp'
    or nullif(p_invoice_id,'') is null or nullif(p_subscription_id,'') is null
    or nullif(p_customer_id,'') is null or p_paid_at is null then
    raise exception 'Invalid verified payment';
  end if;
  select * into a from public.personal_referral_attributions where id=p_attribution_id for update;
  if not found or a.user_id is distinct from p_user_id then raise exception 'Attribution identity mismatch'; end if;
  select * into r from public.organisation_revenue_events where stripe_invoice_id=p_invoice_id;
  if found then
    if r.personal_attribution_id is distinct from a.id
      or r.stripe_subscription_id is distinct from p_subscription_id then
      raise exception 'Invoice identity mismatch';
    end if;
    return r.id;
  end if;
  amount := p_amount_minor::numeric/100;
  initial := a.first_paid_at is null;
  if initial then
    select * into i from public.organisation_introducers where id=a.introducer_id for share;
    if i.status <> 'active' or i.introducer_market not in ('personal','both')
      or i.agreement_start_date > (p_paid_at at time zone 'UTC')::date
      or i.agreement_end_date < (p_paid_at at time zone 'UTC')::date then
      return null;
    end if;
    if p_paid_at < date_trunc('second',a.created_at) then
      raise exception 'Payment predates referral';
    end if;
    select * into p from public.organisation_introducer_policies
      where introducer_id=i.id and effective_from<=p_paid_at
        and (effective_until is null or effective_until>p_paid_at)
      order by effective_from desc limit 1;
    if not found then raise exception 'No policy covers conversion'; end if;
    update public.personal_referral_attributions set
      policy_id=p.id,commission_percent=p.commission_percent,commission_basis=p.commission_basis,
      commission_structure=p.commission_structure,vat_registered=i.vat_registered,
      vat_number=case when i.vat_registered then i.vat_number end,
      vat_rate=case when i.vat_registered then 20 else 0 end
      where id=a.id returning * into a;
  end if;
  insert into public.organisation_revenue_events(
    personal_attribution_id,event_type,payment_source,currency,gross_amount,
    refunded_amount,net_collected_amount,received_at,stripe_customer_id,
    stripe_subscription_id,stripe_invoice_id,verified_at,notes
  ) values(a.id,'payment_received','stripe_invoice',p_currency,amount,0,amount,p_paid_at,
    p_customer_id,p_subscription_id,p_invoice_id,p_paid_at,
    'Stripe-confirmed Personal subscription payment; refund reconciliation is separate.')
  returning * into r;
  if initial or a.commission_structure='recurring' then
    commission := round(amount*a.commission_percent/100,2);
    vat := round(commission*a.vat_rate/100,2);
    insert into public.organisation_commissions(
      revenue_event_id,personal_attribution_id,introducer_id,organisation_name,
      referral_code,commission_percent,commission_basis,commission_structure,
      commission_event,currency,collected_amount,qualifying_amount,commission_amount,
      vat_registered,vat_rate,vat_amount,total_payable,personal_vat_number_at_conversion,
      status,earned_at,clearance_until,payable_at
    ) values(r.id,a.id,a.introducer_id,'Root Personal subscriber',a.referral_code,
      a.commission_percent,a.commission_basis,a.commission_structure,
      case when initial then 'initial_payment' else 'recurring_payment' end,
      p_currency,amount,amount,commission,a.vat_registered,a.vat_rate,vat,commission+vat,a.vat_number,
      'clearance',p_paid_at,p_paid_at+interval '14 days',p_paid_at+interval '14 days');
  end if;
  if initial then update public.personal_referral_attributions set first_paid_at=p_paid_at where id=a.id; end if;
  return r.id;
end $$;
revoke all on function public.record_personal_referral_payment(uuid,uuid,text,text,text,bigint,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.record_personal_referral_payment(uuid,uuid,text,text,text,bigint,text,timestamptz)
  to service_role;
commit;

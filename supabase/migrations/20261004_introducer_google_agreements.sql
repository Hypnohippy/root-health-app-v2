begin;

create table public.organisation_introducer_agreements (
  id uuid primary key,
  introducer_id uuid not null references public.organisation_introducers(id),
  previous_agreement_id uuid references public.organisation_introducer_agreements(id),
  version integer not null check (version > 0),
  status text not null check (status in ('draft','sent','accepted','superseded')),
  document_id text not null unique,
  document_url text not null,
  template_document_id text not null,
  template_revision text,
  terms_snapshot jsonb not null,
  terms_hash text not null check (terms_hash ~ '^[a-f0-9]{64}$'),
  sent_terms_snapshot jsonb,
  accepted_terms_snapshot jsonb,
  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_to text,
  email_message_id text,
  accepted_at timestamptz,
  accepted_by uuid,
  pdf_document_id text unique,
  pdf_document_url text,
  pdf_sha256 text check (pdf_sha256 ~ '^[a-f0-9]{64}$'),
  source_revision text,
  superseded_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique(introducer_id,version),
  check (status <> 'accepted' or (accepted_at is not null and accepted_by is not null and pdf_document_id is not null
    and pdf_document_url is not null and pdf_sha256 is not null and accepted_terms_snapshot is not null)),
  check (status <> 'sent' or (sent_at is not null and sent_to is not null and sent_terms_snapshot is not null))
);

-- Operations are also the retry and email-delivery audit log; never store Google credentials here.
create table public.introducer_google_agreement_operations (
  id uuid primary key,
  introducer_id uuid not null references public.organisation_introducers(id),
  agreement_id uuid not null,
  action text not null check (action in ('generate','send','accept')),
  actor_id uuid not null,
  payload jsonb not null,
  progress jsonb not null default '{}',
  state text not null default 'running' check (state in ('running','failed','uncertain','completed','cancelled')),
  lease_id uuid,
  lease_until timestamptz,
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index introducer_google_operations_lookup on public.introducer_google_agreement_operations(introducer_id,created_at desc);

create function public.guard_introducer_google_history() returns trigger language plpgsql as $$
begin
  if TG_OP='DELETE' then raise exception 'Agreement history cannot be deleted'; end if;
  if old.status in ('accepted','superseded') or
    (to_jsonb(new)-array['status','sent_at','sent_to','email_message_id','sent_terms_snapshot','accepted_at','accepted_by',
      'accepted_terms_snapshot','pdf_document_id','pdf_document_url','pdf_sha256','source_revision','superseded_at']) is distinct from
    (to_jsonb(old)-array['status','sent_at','sent_to','email_message_id','sent_terms_snapshot','accepted_at','accepted_by',
      'accepted_terms_snapshot','pdf_document_id','pdf_document_url','pdf_sha256','source_revision','superseded_at']) then
    raise exception 'Frozen agreement history cannot be changed';
  end if;
  if old.sent_at is not null and (new.sent_at,new.sent_to,new.email_message_id,new.sent_terms_snapshot) is distinct from
    (old.sent_at,old.sent_to,old.email_message_id,old.sent_terms_snapshot) then raise exception 'Sent evidence is immutable'; end if;
  return new;
end $$;
create trigger introducer_google_history_guard before update or delete on public.organisation_introducer_agreements
  for each row execute function public.guard_introducer_google_history();

create function public.begin_introducer_google_operation(p_id uuid,p_introducer uuid,p_action text,p_actor uuid,p_lease uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare op public.introducer_google_agreement_operations; a public.organisation_introducer_agreements; latest uuid; next_version integer;
begin
  if p_actor is null or p_id is null or p_lease is null then raise exception 'Identity required'; end if;
  perform 1 from public.organisation_introducers where id=p_introducer for update;
  if not found then raise exception 'Introducer unavailable'; end if;
  select * into op from public.introducer_google_agreement_operations where id=p_id for update;
  if found then
    if op.introducer_id<>p_introducer or op.actor_id<>p_actor or op.action<>p_action then raise exception 'Operation identity mismatch'; end if;
    if op.state='completed' then return to_jsonb(op); end if;
    if op.state='cancelled' then raise exception 'Operation was cancelled'; end if;
    if op.lease_until>now() then raise exception 'Operation is still running'; end if;
    if op.action='send' and op.progress ? 'smtp_started' and not (op.progress ? 'smtp_receipt') then raise exception 'Email outcome uncertain; check sent mail before an explicit resend'; end if;
    update public.introducer_google_agreement_operations set state='running',lease_id=p_lease,lease_until=now()+interval '3 minutes'
      where id=p_id returning * into op;
    return to_jsonb(op);
  end if;
  if exists(select 1 from public.introducer_google_agreement_operations where introducer_id=p_introducer and state not in ('completed','cancelled')
    and (action<>'send' or not (progress ? 'smtp_started'))) then raise exception 'Retry the existing unfinished operation first'; end if;
  if exists(select 1 from public.introducer_google_agreement_operations where introducer_id=p_introducer and lease_until>now()) then
    raise exception 'Another operation is still running'; end if;
  select id into latest from public.organisation_introducer_agreements where introducer_id=p_introducer order by version desc limit 1;
  if p_action='generate' then
    if (p_payload->>'previous_id')::uuid is distinct from latest then raise exception 'Agreement history changed; refresh first'; end if;
    select coalesce(max(version),0)+1 into next_version from public.organisation_introducer_agreements where introducer_id=p_introducer;
    p_payload=p_payload || jsonb_build_object('version',next_version);
  elsif p_action in ('send','accept') then
    select * into strict a from public.organisation_introducer_agreements where id=(p_payload->>'agreement_id')::uuid and introducer_id=p_introducer;
    if a.id is distinct from latest or a.status in ('accepted','superseded') then raise exception 'Only the current unaccepted agreement can be sent or accepted'; end if;
    if p_action='send' and a.terms_hash<>p_payload->>'current_terms_hash' then raise exception 'Agreement needs updating'; end if;
    if p_action='send' and (a.status='sent' or exists(select 1 from public.introducer_google_agreement_operations where agreement_id=a.id and action='send'))
      and p_payload->>'confirmed' is distinct from 'true' then raise exception 'Explicit resend confirmation required'; end if;
    if p_action='accept' and (a.status<>'sent' or p_payload->>'confirmed' is distinct from 'true') then raise exception 'Confirm the returned agreement before accepting'; end if;
  else raise exception 'Unknown action'; end if;
  insert into public.introducer_google_agreement_operations(id,introducer_id,agreement_id,action,actor_id,payload,lease_id,lease_until)
    values(p_id,p_introducer,case when p_action='generate' then gen_random_uuid() else a.id end,p_action,p_actor,p_payload,p_lease,now()+interval '3 minutes')
    returning * into op;
  return to_jsonb(op);
end $$;

create function public.checkpoint_introducer_google_operation(p_id uuid,p_lease uuid,p_progress jsonb,p_state text default 'running')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_state not in ('running','failed','uncertain') then raise exception 'Invalid operation state'; end if;
  update public.introducer_google_agreement_operations set progress=progress||p_progress,state=p_state,
    lease_until=case when p_state='running' then now()+interval '3 minutes' else null end
    where id=p_id and lease_id=p_lease and state not in ('completed','cancelled');
  if not found then raise exception 'Operation lease lost'; end if;
end $$;

create function public.finish_introducer_google_operation(p_id uuid,p_lease uuid,p_result jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare op public.introducer_google_agreement_operations; a public.organisation_introducer_agreements;
begin
  select * into strict op from public.introducer_google_agreement_operations where id=p_id;
  perform 1 from public.organisation_introducers where id=op.introducer_id for update;
  select * into strict op from public.introducer_google_agreement_operations where id=p_id for update;
  if op.state='completed' then return op.agreement_id; end if;
  if op.state='cancelled' then raise exception 'Operation was cancelled'; end if;
  if op.lease_id is distinct from p_lease then raise exception 'Operation lease lost'; end if;
  if op.action='generate' then
    if p_result->>'document_id' is null or (op.progress->>'merged')::boolean is distinct from true then raise exception 'Document not complete'; end if;
    insert into public.organisation_introducer_agreements(id,introducer_id,previous_agreement_id,version,status,document_id,document_url,
      template_document_id,template_revision,terms_snapshot,terms_hash,created_by)
    values(op.agreement_id,op.introducer_id,(op.payload->>'previous_id')::uuid,(op.payload->>'version')::integer,'draft',
      p_result->>'document_id',p_result->>'document_url',op.payload->>'template_id',p_result->>'template_revision',op.payload->'terms',op.payload->>'terms_hash',op.actor_id);
    update public.organisation_introducer_agreements set status='superseded',superseded_at=now()
      where id=(op.payload->>'previous_id')::uuid and status in ('draft','sent');
  elsif op.action='send' then
    if p_result->>'message_id' is null then raise exception 'Delivery receipt required'; end if;
    update public.organisation_introducer_agreements set status='sent',sent_at=coalesce(sent_at,now()),
      sent_to=coalesce(sent_to,p_result->>'recipient'),email_message_id=coalesce(email_message_id,p_result->>'message_id'),
      sent_terms_snapshot=coalesce(sent_terms_snapshot,terms_snapshot) where id=op.agreement_id and status in ('draft','sent');
    if not found then raise exception 'Agreement cannot be sent'; end if;
  else
    update public.organisation_introducer_agreements set status='accepted',accepted_at=now(),accepted_by=op.actor_id,
      accepted_terms_snapshot=terms_snapshot,pdf_document_id=p_result->>'pdf_document_id',pdf_document_url=p_result->>'pdf_document_url',
      pdf_sha256=p_result->>'pdf_sha256',source_revision=p_result->>'source_revision' where id=op.agreement_id and status='sent';
    if not found then raise exception 'Agreement cannot be accepted'; end if;
  end if;
  update public.introducer_google_agreement_operations set state='completed',result=p_result,completed_at=now(),lease_until=null where id=p_id;
  return op.agreement_id;
end $$;

create function public.cancel_introducer_google_operation(p_id uuid,p_actor uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare op public.introducer_google_agreement_operations;
begin
  select * into strict op from public.introducer_google_agreement_operations where id=p_id;
  perform 1 from public.organisation_introducers where id=op.introducer_id for update;
  select * into strict op from public.introducer_google_agreement_operations where id=p_id for update;
  if op.actor_id<>p_actor or op.state in ('completed','cancelled') or op.lease_until>now()
    or op.progress ? 'smtp_started' or op.progress ? 'pdf_started' then raise exception 'Operation cannot safely be cancelled'; end if;
  update public.introducer_google_agreement_operations set state='cancelled',lease_until=null where id=p_id;
end $$;

alter table public.organisation_introducer_agreements enable row level security;
alter table public.introducer_google_agreement_operations enable row level security;
revoke all on public.organisation_introducer_agreements,public.introducer_google_agreement_operations from public,anon,authenticated,service_role;
grant select on public.organisation_introducer_agreements,public.introducer_google_agreement_operations to service_role;
revoke all on function public.begin_introducer_google_operation(uuid,uuid,text,uuid,uuid,jsonb),
  public.checkpoint_introducer_google_operation(uuid,uuid,jsonb,text),public.finish_introducer_google_operation(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.begin_introducer_google_operation(uuid,uuid,text,uuid,uuid,jsonb),
  public.checkpoint_introducer_google_operation(uuid,uuid,jsonb,text),public.finish_introducer_google_operation(uuid,uuid,jsonb) to service_role;
revoke all on function public.cancel_introducer_google_operation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cancel_introducer_google_operation(uuid,uuid) to service_role;
commit;

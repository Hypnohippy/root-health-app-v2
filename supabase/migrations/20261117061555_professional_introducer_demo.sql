begin;

-- Access grants are linked to one verified Auth user and are checked by the
-- server on every demo API request. No demo grant is a customer membership.
create table public.professional_introducer_demo_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  consultant_label text not null check (char_length(trim(consultant_label)) between 1 and 80),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  check (expires_at > created_at and expires_at <= created_at + interval '30 days'),
  check (revoked_at is null or revoked_at >= created_at)
);

create index professional_introducer_demo_access_user_created_idx
  on public.professional_introducer_demo_access (user_id, created_at desc);

alter table public.professional_introducer_demo_access enable row level security;
revoke all on public.professional_introducer_demo_access from public, anon, authenticated;
grant select, insert, update on public.professional_introducer_demo_access to service_role;

-- Introduction requests stay in their own restricted table until a later,
-- explicitly reviewed Ops integration. The contact-permission flag is
-- required whenever personal contact details are included.
create table public.professional_introducer_demo_requests (
  id uuid primary key default gen_random_uuid(),
  access_grant_id uuid not null references public.professional_introducer_demo_access(id) on delete restrict,
  consultant_user_id uuid not null references auth.users(id) on delete restrict,
  consultant_label text not null check (char_length(trim(consultant_label)) between 1 and 80),
  organisation_name text not null check (char_length(trim(organisation_name)) between 2 and 160),
  contact_name text check (contact_name is null or char_length(trim(contact_name)) <= 120),
  contact_email text check (contact_email is null or (char_length(contact_email) <= 254 and position('@' in contact_email) > 1)),
  reason_for_interest text not null check (char_length(trim(reason_for_interest)) between 10 and 800),
  desired_next_step text not null check (desired_next_step in ('introductory_call', 'product_demonstration', 'send_information', 'follow_up_with_consultant')),
  contact_permission_confirmed boolean not null default false,
  status text not null default 'received' check (status = 'received'),
  created_at timestamptz not null default now(),
  check ((contact_name is null and contact_email is null) or contact_permission_confirmed)
);

create index professional_introducer_demo_requests_created_idx
  on public.professional_introducer_demo_requests (created_at desc);
create index professional_introducer_demo_requests_consultant_idx
  on public.professional_introducer_demo_requests (consultant_user_id, created_at desc);

alter table public.professional_introducer_demo_requests enable row level security;
revoke all on public.professional_introducer_demo_requests from public, anon, authenticated;
grant select, insert on public.professional_introducer_demo_requests to service_role;

commit;

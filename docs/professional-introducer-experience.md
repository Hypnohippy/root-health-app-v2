# Professional Introducer Demonstration

This feature is an isolated, fictional-data demonstration for invited professional introducers. It is not an organisation account, trial tenant, customer-data viewer, or reseller portal.

## Current product inventory

The customer platform already includes:

- **Employee:** orientation/onboarding, baseline assessment and check-in across stress, sleep, recovery, energy, mood, focus and burnout; personal home, coach, playbook, journal, body and mind experiences; personal insights, evidence history and trends.
- **Employer:** organisation insights and workforce trends, organisation structure and people administration, HR Coach, executive review, workplace interventions/presentation support, workforce invitations/import, and trial/pricing/billing flows.
- **Existing introductions:** agreement acceptance, introducer attribution/referral accounting, and introduction-related admin views.
- **Access model:** Supabase-authenticated identities, organisation membership roles, and separate personal entitlement. A demo grant is not an organisation membership or product entitlement.

This route deliberately does not expose customer pages, admin surfaces, exports, invitations, billing, the relationship database, or the internal scoring implementation. It runs selected existing employee and employer insight engines against fixed fictional evidence and presents a narrow, safe projection. The employee sample check-in is processed in memory and is not stored. The employer example is aggregated over 24 fictional people and does not expose names or small-group cuts.

## Preview activation and data boundary

The API returns 404 unless all of the following are true: `VERCEL_ENV=preview`, `VERCEL_GIT_COMMIT_REF=codex/professional-introducer-demo`, `PROFESSIONAL_INTRODUCER_DEMO_ENABLED=true`, `NEXT_PUBLIC_SUPABASE_URL` resolves to the explicitly configured `PROFESSIONAL_INTRODUCER_DEMO_SUPABASE_PROJECT_REF`, and that ref differs from `PROFESSIONAL_INTRODUCER_PRODUCTION_SUPABASE_PROJECT_REF`. The feature is therefore disabled until an isolated Preview database and branch-scoped values are available. It also requires a valid bearer session, confirmed email, unexpired non-revoked grant, and no organisation membership or active Personal subscription on that Auth user. It checks these conditions on every request; membership/subscription query errors deny access. The page itself is a shell; it does not grant data access.

Before activating the feature, provision an isolated Preview Supabase project, apply `supabase/migrations/20261117061555_professional_introducer_demo.sql` through the approved migration workflow, and set branch-scoped values for `PROFESSIONAL_INTRODUCER_DEMO_ENABLED`, `PROFESSIONAL_INTRODUCER_DEMO_SUPABASE_PROJECT_REF`, and `PROFESSIONAL_INTRODUCER_PRODUCTION_SUPABASE_PROJECT_REF`. No migration or environment change was applied as part of this code change. Do not use Production for consultant access. A Preview pointed at the Production project remains disabled, including the introduction write.

## Named invitation, grant, expiry, and revocation

1. Use a dedicated named Auth identity with verified email. Do not give it an organisation membership or paid Personal entitlement. Use Supabase Auth's trusted invitation/admin process; never place an admin key in a browser or share a reusable demo password.
2. Record the invited Auth user UUID and insert a short-lived grant (recommended initial term: 14 days) through the trusted Supabase SQL/admin workflow after confirming the Preview database ref. Example, with placeholders filled by the operator in the SQL editor:

```sql
insert into public.professional_introducer_demo_access (user_id, consultant_label, granted_by, expires_at)
values ('<invited-auth-user-uuid>', '<approved display name>', '<admin-auth-user-uuid>', now() + interval '14 days');
```

3. Revoke immediately by setting `revoked_at=now()` and `revoked_by` on that grant row. A subsequent API request is denied; the browser revalidates every 30 seconds and clears the demo view after denial. Sign-out revokes the local session; use Auth session revocation for server-side session invalidation where urgent.
4. Renewal is a new, time-limited grant row, preserving the grant history. Do not provision credentials through Codex or include them in a PR.

The migration grants no table access to `anon` or `authenticated`. Server APIs use a service-role client only after the signed-in user is verified, and bind every access check to that user ID. Introduction writes are scoped to the active grant, attributed consultant, rate-limited to five per rolling day, and require affirmative permission when contact details are supplied. The feature sends no email.

## Operator flow

After a protected exact-SHA Preview is deployed, sign in at `/login?next=%2Fintroducer` using the invited account. Choose Consultant Learning or Client Presentation, then Employee or Employer. Reset restores the fixed fictional scenario. Submit an introduction only when the contact has agreed to share their details; the request is stored for later Root Health follow-up, without sending a message.

Copyright starts at 2024 and updates its end year automatically. The partner-demonstration watermark is persistent in the UI, but is not represented as screenshot/copy protection.

## Deferred

- Applying the migration to an isolated Preview project and setting the branch-only feature flag.
- Creating the invited, verified consultant account and grant after approval.
- Authenticated browser acceptance and protected Preview URL.
- Full re-use of every live customer page. Those pages read a real identity's tenant data and must not be wired to fabricated browser identities. The demo instead uses existing server-side insight engines on synthetic data.
- Root Ops integration, commission logic, automated emails, client self-service login, and exports.

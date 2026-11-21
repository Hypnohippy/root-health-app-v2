# PR #70 Demo Access connection

This adds a Demo Access panel directly inside the existing Agreement section on `/admin/introducers`. It reuses the registered introducer, frozen commercial terms, current Google agreement, signed acceptance evidence and archive state. It creates no second registration, agreement, commission or contract workflow.

## Local implementation

- Agreement status is derived server-side from the uniquely latest agreement and `verifiedAcceptedAgreement`. The panel distinguishes Draft, Sent, signed-but-not-archived, signed-needs-review and **Signed and verified**. It does not infer verification from a client flag or agreement label.
- The Send Demo Invitation control is shown only when the current agreement has passed the existing signer, recipient, terms, active-period and archived-acceptance checks. The POST endpoint repeats that verification before acting.
- Invitation status and account status come from the separate onboarding lifecycle. The panel shows not issued/sent/expired/reconciliation-needed/redeemed, awaiting activation/active/expired/revoked, and invitation or demo-access expiry dates.
- Existing Preview invitation controls still create a single-use, 15-minute Supabase invite in project `waluyphoafylzcjuskcl`. The recipient chooses their password through the existing reset-password route and signs into `/introducer`. No password or action link is returned to the admin browser.
- Root signs a short-lived assertion containing only the required agreement references, verified recipient identity, request/nonce, and expiry. Preview validates it and uses only its isolated Auth/database. Preview rechecks the signed agreement through the exact Root callback before activating access. Preview does not read the Root database or import commercial/customer records.
- Northstar Studio remains the pre-existing fictional employer fixture. Provisioning is idempotent and does not replace a mismatched fixture. Voice remains disabled.

## Existing Root commercial deployment integration

The existing `app/admin/introducers/page.js` remains the management page. The new Root API path is explicitly opt-in and fail-closed: it responds only when the request runs on the known Root Health Vercel Production project, `main`, the matching Root commercial Supabase ref, the exact Root HTTPS callback-origin allowlist, and `ROOT_INTRODUCER_ONBOARDING_ENABLED=true`. It refuses the introducer project, Preview deployments, other branches, other databases and missing configuration. Existing registration and Google agreement APIs are not replaced.

The existing Root agreement data remains authoritative. The signed assertion crosses to Preview only after that data is re-read and verified. The isolated Preview has no access to Root credentials. At activation, Root consumes the signed Preview completion receipt only after rechecking the current agreement; Preview keeps the grant pending until Root confirms. This gives the two systems an auditable link without copying commercial records to Preview.

## Migrations and controlled rollout

No migration was applied by this work. Two additive migrations already exist in the PR:

1. `20261120130000_introducer_onboarding_admin.sql` is the Root commercial-side lifecycle/audit/one-time-receipt schema. It depends on the existing Root introducer, agreement, immutable acceptance and Auth schema. It must be independently reviewed and separately approved before any application to the existing Root commercial database. This is a production database change; it is not needed for the current admin page to keep working, but the Root bridge cannot durably record invitations or consume completion receipts without it.
2. `20261120131000_pr70_preview_introducer_onboarding.sql` belongs only to isolated Supabase `waluyphoafylzcjuskcl`, after the sanitized baseline and personal-access migration. It preserves the current access/assessment/Northstar fixture and adds Preview-side activation records/functions. Its actual migration history and records must be re-read immediately before any separately approved application.

Do not push the shared migration folder wholesale. For a future controlled rollout, first verify both exact project identities and histories independently; review/apply the single Root additive migration only with explicit approval, then verify schema/history. Separately review/apply only the named Preview migration to `waluyphoafylzcjuskcl`, then verify that existing account, grant and Northstar data survived. No production or Preview migration has been run for this change.

## Required configuration names (never values)

**Existing Root commercial project, production scope only:** `ROOT_INTRODUCER_ONBOARDING_ENABLED`, `ROOT_PRODUCTION_SUPABASE_PROJECT_REF`, `ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS`, `ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET`, `ROOT_AUTH_PREVIEW_URL`, `ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS`, `ROOT_INTRODUCER_VERCEL_PROJECT_ID`, `ROOT_INTRODUCER_SUPABASE_PROJECT_REF`, plus the existing Root Supabase and administrator authorization configuration. Server-to-server Vercel OIDC/Trusted Source must be configured and verified; there is no deployment-protection bypass-token fallback.

**Dedicated introducer deployment, Preview scope only:** `ROOT_DEPLOYMENT_MODE`, `ROOT_INTRODUCER_VERCEL_PROJECT_ID`, `ROOT_INTRODUCER_SUPABASE_PROJECT_REF`, `ROOT_PRODUCTION_SUPABASE_PROJECT_REF`, `ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS`, `ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET`, `ROOT_INTRODUCER_COMMERCIAL_VERIFY_URL`, `ROOT_AUTH_PREVIEW_URL`, `ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS`, `PROFESSIONAL_INTRODUCER_DEMO_ENABLED`, and the isolated Preview Supabase URL, publishable key and server-only secret key. No credentials were changed.

## Remaining acceptance blockers

- A protected Preview deployment containing this exact code is required before any runtime test.
- The Root commercial migration has not been applied or independently preflighted for the live commercial database. No production records or agreement evidence were accessed for this local test.
- The Preview onboarding migration/history and the existing internal acceptance identity must be rechecked before use. The Preview invite endpoint rejects an email already present in Preview Auth; it will not reuse or silently replace the existing acceptance account. If that account is David's Fuel Geist address, Root must resolve the identity collision through a separately approved process or use a different authorized test address. Preserve the current account and Northstar fixture.
- No email was sent. David's recipient address and the invitation mail configuration require human confirmation before the first send.
- Voice Coach remains disabled.

## Local verification boundary

Focused Node/PGlite tests use fictional identities and mocked boundaries. They cover agreement integrity and latest-version checks, activation URL identity, Root/Preview deployment binding, signed assertions/receipts, replay rejection, expiry/revocation, fixture preservation and owner isolation. They do not contact Supabase, Google, Vercel, Resend or OpenAI and do not prove live end-to-end acceptance.

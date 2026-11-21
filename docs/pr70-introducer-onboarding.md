# PR #70 Professional Introducer onboarding

This connects the existing contracted-introducer record and signed Google agreement to an isolated Preview Auth identity. It does not create a second contract, commercial record, commission process, personal subscription or customer organisation.

## Verified flow implemented locally

1. Root registers the introducer through the existing commercial admin. Registration creates only the onboarding lifecycle row and audit event; it does not create an Auth user or send an email.
2. Root can prepare an invitation only when the uniquely latest agreement is accepted and archived, its frozen and accepted terms hashes match current commercial terms, signer and recipient identity match, the introducer is active, its start date is valid and has arrived, its end date is absent or valid and has not passed, and the agreement is not superseded, cancelled or revoked. Root repeats this check when Preview requests activation and when Root consumes the completion receipt.
3. The Root staging server signs a 15-minute assertion with a one-time request ID and random nonce. Preview validates it in the isolated deployment. Preview Auth generates an invite link; the URL is encrypted at rest and returned only server-to-server. Root validates the exact Supabase Auth origin/ref, `/auth/v1/verify` route, `type=invite`, one token, and the exact approved Preview `/reset-password?next=/introducer` destination before the existing email service sends it.
4. At redemption, Preview validates the bearer with its own Supabase Auth project and confirms that the email is verified. It asks Root to re-check the latest signed agreement; it sends no Preview user ID to Root Auth. Root does not attempt to resolve Preview IDs in Root Auth.
5. Preview creates a pending grant with `revoked_at` set. Existing RLS policies and server access checks therefore deny all account and workforce access. The grant is bound to the authenticated Preview user and the current invite. Fictional workforce provisioning then recognizes the deterministic Northstar fixture: complete valid fixtures are read-only; partial or inconsistent reserved data fails closed. Assessment and membership dates are checked but never rewritten on a retry. An existing grant already mapped to Northstar remains unchanged.
6. Preview signs a five-minute, one-time completion receipt. It binds the request, nonce, verified Preview email/user, commercial introducer, exact agreement/acceptance, grant and expiry, the dedicated Vercel project, isolated Supabase ref, Preview classification, feature branch, approved Preview deployment origin and exact Root staging callback. Root re-reads its own agreement and onboarding row, validates the receipt, then atomically consumes its unique receipt ID and records completion. A retry requires a newly signed receipt ID and must match the same completed user and grant; exact replay, mismatch, forgery or expiry is rejected.
7. Only after Root confirms does Preview atomically clear the pending grant marker and mark its onboarding row active. Grant activation and revocation lock the same Preview onboarding row, preventing a delayed confirmation from undoing a revoke. The grant expires after at most 30 days. An interrupted finalization can be safely retried; the account remains blocked until the Preview finalization succeeds.

No password, Auth bearer, provider key, customer record or wellbeing entry crosses between Root staging and Preview. The signed handoff carries commercial agreement references, the verified recipient identity, request/nonce, Preview account and grant identifiers, expiry, and deployment identity. Health information is not part of the activation protocol.

## Replacement and recovery

Replacement is accepted only after an unactivated invitation expires. Preview first persists a `replacement_pending` row containing the new signed request while retaining the old user ID. It then checks that the old identity is unconfirmed and has the exact introducer marker before deleting it. If deletion or invite generation is interrupted, the same pending request resumes; after its expiry, Root may issue a fresh replacement request and Preview safely resumes from the saved state. Ambiguous Auth state fails closed for Root review. Delivery uncertainty does not trigger an automatic resend. A confirmed or active account cannot be replaced.

## Fictional-data preservation and personal isolation

The approved Northstar fixture uses synthetic identities without Auth-user links. Provisioning compares the full reserved organisation, units, fictional profiles, members and 55 assessments. Complete matching data causes no seed upserts; changed timestamps must remain within the expected fictional history window. Partial/mismatched fixture state is held, not repaired. A grant mapped elsewhere is rejected. New personal profiles are keyed to each distinct Auth user and contain no organisation link; two-user tests check distinct private profile identities. Existing database RLS tests separately cover cross-user reads/writes and grant expiry/revocation.

## Migration boundaries and order

These files are not interchangeable and must never be pushed together:

1. `20261120130000_introducer_onboarding_admin.sql` belongs only to a newly verified, isolated **Root staging** database. It requires the commercial-introducer, latest agreement, immutable acceptance and operation schema. It is not approved for the Root customer Production database.
2. `20261120131000_pr70_preview_introducer_onboarding.sql` belongs only to Supabase `waluyphoafylzcjuskcl` and dedicated Vercel project `prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut`. Its preflight requires sanitized Preview baseline `20261118150000` and personal-access migration `20261118153000`. It preserves the existing Preview grant, acceptance account and Northstar records. Voice Coach remains disabled; this workflow does not enable it.

Before any later approved SQL application, an operator must independently read the project name/ref in Supabase, obtain that project's migration history, verify the listed schema objects and current record counts, and pass that evidence through `validatePr70MigrationTarget`. The helper is offline and never connects to Supabase; its input is evidence, not a claim of remote verification. Apply one reviewed file only to its named project, then read back schema/history/record counts. Never run a blanket `supabase db push` over this repository's shared migration folder. No migration was applied during this work.

The Root staging target has not yet been created or identified, so its required exact project ref and Vercel project ID are intentionally unset. The migration gate refuses Root staging until these are supplied and independently checked. Preview history and pre-migration fixture preservation must also be freshly confirmed before application; the source tree alone is not remote-state evidence.

## Isolated staging required for end-to-end acceptance

Before testing the complete commercial journey, establish a separate Vercel Preview project and Supabase project for Root staging. The database must contain only the minimal approved schema for existing commercial introducers, policies, agreement operations, signed agreement records, immutable acceptance/archive evidence and Auth; seed one fictional contracted introducer and fictional accepted agreement. It must contain no customer rows, production Auth users, production secrets or production integrations. Use an email sink that cannot deliver externally. Configure an exact HTTPS callback-origin allowlist for that staging deployment only. The Root onboarding API fails closed unless staging mode, Preview environment, feature branch, Vercel project ID, Supabase project ref and callback origin agree, and explicitly rejects the known Production Supabase ref and Production callback origins.

The introducer Preview must separately validate its dedicated project/ref, Preview environment and branch, exact Auth redirect destination, isolated keys and Root callback allowlist. Vercel SSO/Trusted Source must be verified independently before runtime tests. No customer or wellbeing data is copied.

## Environment variable names (values are secrets or deployment-specific)

**Root staging:** `ROOT_INTRODUCER_STAGING_MODE`, `ROOT_INTRODUCER_STAGING_VERCEL_PROJECT_ID`, `ROOT_INTRODUCER_STAGING_SUPABASE_PROJECT_REF`, `ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS`, `ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET`, `ROOT_AUTH_PREVIEW_URL`, `ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS`, `ROOT_INTRODUCER_VERCEL_PROJECT_ID`, `ROOT_INTRODUCER_SUPABASE_PROJECT_REF`, and the staging-only `NEXT_PUBLIC_SUPABASE_URL` plus server key. Existing Root admin authorization must be staging-only; email must point to a non-delivering sink.

**Introducer Preview:** `ROOT_DEPLOYMENT_MODE`, `ROOT_INTRODUCER_VERCEL_PROJECT_ID`, `ROOT_INTRODUCER_SUPABASE_PROJECT_REF`, `ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS`, `ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET`, `ROOT_INTRODUCER_COMMERCIAL_VERIFY_URL`, `ROOT_AUTH_PREVIEW_URL`, `ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS`, `PROFESSIONAL_INTRODUCER_DEMO_ENABLED`, and the isolated Preview Supabase URL, publishable key and server-only secret key. Automatic public sign-up remains disabled. Voice remains off.

Do not place the shared signing secret or Supabase server key in public variables, client bundles, logs, test fixtures or browser responses. No environment variables were changed here.

## Local verification and current release boundary

Focused onboarding and provisioning tests use local PGlite and mocks only. They test Root and Preview Auth as separate trust domains, signed receipt verification/replay rejection, current agreement dates/status/evidence, callback and invite URL validation, grant pending/activation/revocation, exact project gates, replacement recovery rules, additive migrations, fixture preservation, and distinct personal profiles. These are not live Supabase REST tests or an end-to-end staging acceptance.

Root customer Production, production Auth, real email, Preview remote SQL, Vercel configuration, user provisioning, Voice Coach and customer data are untouched. No account was created or invited by this implementation.

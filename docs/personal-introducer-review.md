# Personal introducers: draft review and migration notes

Not merged or deployed. No live schema, Stripe configuration, payouts or customer data were changed.

## Architecture and preservation

The supplied live schema permits null corporate application/organisation links on both ledgers.
This extension reuses organisation_revenue_events, organisation_commissions, the existing
settlement API and remittance PDF generator. It does not create a second revenue or commission ledger.

Existing Corporate constraints, indexes, triggers and functions are not replaced or modified.
The migration tests compare pre/post definitions of every original constraint, index and function
from the supplied schema. Corporate checkout and workplace webhook files are unchanged.
The corporate application path gains only market eligibility; public validation defaults to Corporate.
Corporate introducers predating the migration default to corporate/corporate_introducer.

The private attribution table is necessary because personal_subscriptions is customer-readable.
It has RLS enabled, no customer policies, and no PUBLIC/anon/authenticated privileges.
The two new RPCs are executable only by service_role (and the database owner).
Commercial terms never appear in customer referral-validation or checkout responses, browser storage,
signup metadata or Stripe metadata. Existing authorised Root administrator responses still display
commercial terms, as required by the existing admin UI.

## Exact database changes

Migration: supabase/migrations/20261003_personal_introducer_referrals.sql, one transaction.

- organisation_introducers: add introducer_market and introducer_type, both NOT NULL with
  backwards-compatible defaults and validated CHECK lists. PostgreSQL names the checks
  organisation_introducers_introducer_market_check and organisation_introducers_introducer_type_check.
- New personal_referral_attributions: id, user_id, introducer_id, policy_id, referral_code,
  commission_percent, commission_basis, commission_structure, vat_registered, vat_number, vat_rate,
  created_at, first_paid_at. UUID primary key; unique user_id; foreign keys to auth.users,
  organisation_introducers and organisation_introducer_policies; percentage/basis/structure/VAT checks.
  The table retains liabilities rather than cascading deletion of a user.
- organisation_revenue_events: add nullable personal_attribution_id FK and
  personal_revenue_identity CHECK requiring corporate links to be null for Personal rows.
- organisation_commissions: add nullable personal_attribution_id FK,
  personal_vat_number_at_conversion and matching personal_commission_identity CHECK.
- New personal_revenue_attribution_idx on non-null Personal revenue attribution.
- New personal_initial_commission_unique: at most one initial_payment commission per Personal attribution.
- New service-only prepare_personal_referral(uuid,text) RPC.
- New service-only record_personal_referral_payment(uuid,uuid,text,text,text,bigint,text,timestamptz) RPC.
- No changes to personal_subscriptions, commercial-document schema, original policies, functions,
  indexes, constraints or triggers. No new triggers.

Generated attribution constraint names: personal_referral_attributions_pkey,
personal_referral_attributions_user_id_key, personal_referral_attributions_user_id_fkey,
personal_referral_attributions_introducer_id_fkey, personal_referral_attributions_policy_id_fkey,
personal_referral_attributions_commission_percent_check, personal_referral_attributions_commission_basis_check,
personal_referral_attributions_commission_structure_check, personal_referral_attributions_vat_rate_check.
The two ledger FK names are organisation_revenue_events_personal_attribution_id_fkey and
organisation_commissions_personal_attribution_id_fkey. Primary/unique constraints create their
corresponding indexes. No schema changes are applied by the app automatically.

## Journey and terms

1. /start?ref=code validates Personal/both eligibility on the server, with active status/agreement.
2. Only the code is retained in local storage and carried in Capacity Check and signup-return URLs.
3. Authenticated personal checkout supplies its verified Supabase user ID to prepare_personal_referral.
   The browser cannot choose that ID or commercial terms.
4. First eligible checkout fixes the referrer per user. Retry checkouts reuse that attribution.
   Preliminary terms are private; no liability is earned at checkout.
5. Only the private attribution UUID is added to existing user/product metadata on the Stripe
   checkout and subscription. No attribution is added to pre-existing subscriptions.
6. The verified Personal invoice webhook resolves matching subscription/customer/user identity.
   It verifies succeeded PaymentIntents and their invoice allocation before the accounting RPC.
7. At first qualifying payment, the RPC resolves the policy effective at Stripe paid_at and freezes
   its rate/basis/structure. VAT status/number is snapshotted from the introducer at processing time,
   using the existing 20% VAT convention; the schema has no historic VAT-policy table.
8. The same transaction writes the shared revenue event, commission, VAT snapshot and first_paid_at.
   Subsequent payments use only those frozen terms, not changed current terms.

Expired/inactive/wrong-market introductions do not qualify. Public landing validation is not the
authority for commercial attribution; checkout and first payment independently check eligibility.
Existing earned recurring obligations continue using frozen terms, even if current introducer terms change.

## Dedupe and failures

- Checkout session: existing session creation has no new idempotency mechanism. Repeated checkout
  requests can create separate Stripe sessions; this extension does NOT claim to prevent that.
  They reuse the same private attribution. Checkout webhooks never create Personal commissions.
- Invoice: existing unique Stripe invoice indexes on organisation_revenue_events remain unchanged.
  The RPC locks the attribution row, checks existing invoice ownership, and returns the existing row on retry.
- Commission: existing unique revenue_event_id index remains unchanged; the new partial unique
  initial-payment index additionally protects one-off conversions.
- One-off: only the first qualifying collected invoice per attributed user earns commission,
  including across retry/new subscriptions carrying that same attribution.
- Recurring: each distinct qualifying collected invoice earns commission at frozen terms.
- Paid invoices for a subscription are processed oldest-paid first, preventing an out-of-order
  renewal webhook from using the renewal amount as the one-off first payment.
- Transaction boundary: one record_personal_referral_payment RPC per invoice. Revenue INSERT,
  commission INSERT and snapshot finalisation either all commit or all roll back.
  Entitlement synchronisation is separate and can succeed even if accounting subsequently fails.
- Failure after Stripe payment: the Stripe payment is not undone. The accounting RPC rolls back,
  the webhook returns HTTP 500, and Stripe can retry. A lost HTTP response after commit is safe to retry.
  Operational monitoring/replay is still needed if Stripe exhausts retries.

## Explicit limits and refund warning

Refund/reversal automation is NOT implemented or claimed. The schema can represent refund/reversal
records; neither that capability nor this change provides Stripe refund/dispute reconciliation.
Cancellation does not automatically reverse already-earned commissions.
Before paying any Personal commission, reconcile refunds/disputes separately.

The verified payment path currently supports GBP and PaymentIntent-backed invoice payments.
Zero-value, credit-only and out-of-band amounts earn no commission. Unsupported currencies fail closed.
Invoice history and invoice-payment retrieval are bounded to 1,000 entries; exceeding the SDK bound
requires operator investigation rather than silently truncating accounting.
Personal campaign-level attribution is not added; existing Corporate campaigns remain unchanged.
First attribution wins for a user; later codes do not transfer that user's existing referral.
Browser storage must be available for the storage-backed fallback; URLs preserve the normal signup flow.

## Tests and verification

Run npm run test:referrals after installing dependencies. The suite reconstructs the eight supplied
live table definitions, original constraints/indexes/triggers/functions in PGlite, then applies the migration.
tests/fixtures/introducer-schema.json is the supplied schema-only report, not customer data.

New tests:
- Personal referral and Capacity Check entry routes remain public without opening protected routes.
- Corporate defaults, both markets, invalid/inactive/expired agreements and admin filter semantics.
- Code survives navigation and signup verification URL without carrying commercial terms.
- Only verified collected money qualifies, not free, out-of-band or failed payments.
- Invoice accounting uses private identity metadata and orders paid invoices before RPC.
- Live-schema migration defaults Corporate, validates Personal and restricts private accounting.
- Confirmed payment is atomic, duplicate-safe, VAT-correct and one-off terms remain frozen.
- Recurring uses frozen effective policy on subsequent collected invoices.
- Terms are finalised at collected conversion, not abandoned checkout; Corporate ledger shape still inserts.

Final focused result: 9 tests passed, 0 failed.

Existing Personal integration suites 2, 3a, 4a, 4b, 5a, 5b and HR security: 84 tests passed.
Local dependency fetching encountered a certificate problem; tests used installed PGlite 0.5.8
through a temporary loader and the app's existing dependencies, without disabling TLS verification.
Next compiled successfully and reached page-data collection after the filesystem retry.
The full production build then stopped because the local Stripe API key is absent.
No real signup email, Stripe checkout, webhook delivery, live migration or payout was exercised.
Full browser/admin/mobile and Stripe sandbox end-to-end verification are still required before release.
The unsigned desktop /start page and its configuration-error state were visually checked locally;
the Root public-route allowlist was extended for /start and /capacity-check so visitors are not redirected.

## Install, verify and rollback

1. Review this draft and take the normal database backup. Apply the migration to a non-production
   clone of the supplied schema first. Apply the migration before deploying the matching app code.
2. Use existing Supabase service-role, Stripe Personal price IDs, API key and Personal webhook secret.
   No new secret is required. Verify the existing Personal endpoint receives invoice.paid.
3. Confirm Supabase email-confirmation redirect allowlisting accepts the existing /personal/join
   path with referral/plan/checkout query parameters; test email verification on a second browser.
4. Create Corporate, Personal and Both test introducers. Verify market filters and cross-product
   rejection, signup, paid initial invoice, replay, renewal, VAT and frozen-policy behaviour.
5. Verify existing Corporate test payment/accounting, settlement and remittance PDF paths unchanged.
6. Reconcile test invoices with Stripe and confirm no commission on failed/free/out-of-band invoices.

Rollback before any Personal attribution/data: revert application code, then remove the new RPCs,
indexes, checks, FK columns/table and market/type columns in reverse dependency order after review.
Do not use DROP CASCADE.
After Personal payments/attributions exist: do NOT drop the new objects or accounting history.
Stop new Personal referral enrollment while retaining/reconciling accounting for existing attributed
subscriptions. Reverting the webhook to old code would acknowledge invoices without accounting;
retain the handler or explicitly arrange monitored event replay before any rollback.

## Changed files

- app/admin/introducers/page.js
- app/api/admin/introducers/route.js
- app/api/admin/introducers/settlement/route.js
- app/api/organisation/apply/route.js
- app/api/referral/validate/route.js
- app/api/stripe/personal-checkout/route.js
- app/api/stripe/personal-webhook/route.js
- app/capacity-check/continue/page.js
- app/capacity-check/page.js
- app/personal/join/page.js
- app/start/page.js
- lib/introducerMarkets.js
- lib/personalReferralAccounting.js
- lib/personalReferralJourney.js
- lib/rootNavigator.js
- supabase/migrations/20261003_personal_introducer_referrals.sql
- tests/fixtures/introducer-schema.json
- tests/personal-referrals.test.mjs
- package.json
- docs/personal-introducer-review.md

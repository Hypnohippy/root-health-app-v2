# Personal acquisition attribution (draft rollout)

No migration has been applied and no Production writes, external sends or publishes are part of this change.

## Draft schema

`supabase/migrations/20261010114550_personal_acquisition_events.sql` adds one event table and service-only aggregate functions. RLS is enabled; PUBLIC, anon and authenticated have no table or RPC access. Service role has SELECT/INSERT. The table has no email, name, score, answer, wellbeing text, arbitrary metadata or fingerprint fields. Auth user IDs are internal correlation only and never returned to Ops.

## Journey and evidence

- Capacity Check URL: `acquisition_id` UUID, optional `asset_id` UUID, neutral UUID/`pa-UUID` `utm_campaign`, allowlisted source/medium. Other query text is discarded.
- Server signs a random first-party attribution session in an HttpOnly, Secure-on-HTTPS, SameSite=Lax cookie, expiring after 30 days. First touch stays fixed. No marketing identity is kept in client localStorage. Existing introducer `ref` storage/URLs remain independent.
- View is recorded on entry, start only on slider interaction, completion only on revealing the snapshot. Completion does not require the email-save action. Unattributed occurrences retain null campaign/acquisition fields.
- Signup start is an explicit validated account-creation submission. Signup completion requires a verified authenticated user, confirmed email and an auth creation timestamp after that session's signup start. Existing-account sign-in is not counted as signup. No email matching is used.
- The first-party cookie survives continuation, signup and the email-confirmation return in the same browser. A different browser/device without that cookie does not acquire invented attribution.
- Checkout reads the signed cookie server-side and carries a compact signed marketing journey in both Checkout and subscription metadata. It keeps `personal_attribution_id` (commercial introducer attribution) separate and unchanged.
- The existing signature-verified Stripe webhook records subscription_started only for a paid, positive-value invoice on an active Personal subscription with a valid signed journey and verified Root auth user. Browser cookies expire after 30 days; authenticated Stripe provenance remains verifiable after that expiry. Trial access/free invoices are not paid subscribers. Entitlements and introducer accounting remain on their existing paths.

## Idempotence and count meaning

Unique dedupe keys: session + event for Capacity Check/explicit signup start; auth user for signup completed; Stripe subscription ID for subscription started. Retried requests/renewal invoices do not duplicate the same occurrence. Counts are unique attributable journey occurrences, not raw repeated page loads. Aggregate signup/subscriber counts use distinct first-party user IDs. Unknown campaign/source is never inferred from email, lead records or another funnel stage.

## Server-only aggregate contract

`POST /api/personal/acquisition/aggregate`, Bearer `PERSONAL_ACQUISITION_OPS_TOKEN`, body `{ "acquisitionIds": ["UUID"] }` (maximum 25). Alternatively supply campaignIds with neutral UUID/pa-UUID identifiers; the response keys counts by campaign_id. Do not mix both selectors.

Returns `{ available: true, counts: [{ acquisition_id, capacity_check_viewed, capacity_check_started, capacity_check_completed, signup_started, signup_completed, subscription_started }] }`. Missing configuration/schema returns 503/available:false, not zero counts. Connected queries can truthfully return zero. Campaign IDs are stable `pa-<acquisition_id>` in the Ops handoff; the source acquisition is the shared aggregate key.

## Required configuration and rollout boundary

Root server: `PERSONAL_ACQUISITION_ENABLED=true`, `PERSONAL_ACQUISITION_COOKIE_SECRET` (at least 32 random characters), `PERSONAL_ACQUISITION_OPS_TOKEN` (at least 32 random characters), plus existing Supabase server credentials. Default is disabled.

Ops server: `ROOT_PERSONAL_ACQUISITION_URL=https://<Root deployment>/api/personal/acquisition/aggregate`, `ROOT_PERSONAL_ACQUISITION_TOKEN` matching the Root aggregate token. Neither secret is NEXT_PUBLIC. Do not reuse introducer secrets or expose a Supabase service key to Ops/browser.

Apply only to an explicitly isolated test database for live Preview testing. A Preview URL alone is not isolation when it shares Production Supabase. Production migration/activation requires separate approval. No historical events are backfilled or inferred by this migration. Rotate signing keys with awareness that existing attribution cookies/Stripe marketing tokens will stop verifying.

Local verification: `node --experimental-default-type=module --test tests/personal-acquisition.test.mjs tests/personal-referrals.test.mjs` executes the draft SQL in ephemeral PGlite and tests actual event/aggregate handlers, grants, idempotence, auth correlation and paid Stripe evidence without external actions.

## Changed files

- `app/capacity-check/page.js`
- `app/personal/join/page.js`
- `app/api/stripe/personal-checkout/route.js`
- `app/api/stripe/personal-webhook/route.js`
- `app/api/personal/acquisition/event/route.js`
- `app/api/personal/acquisition/aggregate/route.js`
- `lib/personalAcquisition.js`
- `lib/personalAcquisition.client.js`
- `lib/personalAcquisition.server.js`
- `supabase/migrations/20261010114550_personal_acquisition_events.sql`
- `tests/personal-acquisition.test.mjs`
- `docs/personal-acquisition-attribution.md`

# Introducer agreement acceptance: draft review

PR #65 has merged and this draft now targets `main`. The temporary branch-specific Vercel Git deployment suppression has been removed so normal Preview checks can run. No Production deployment or live migration is authorised by this change.

## Contract and scope

Contracting party: David Prince trading as Root Health App, 33 Victoria Street, Maidstone, Kent, ME16 8HY. This is a trading name, not a separate company. Agreement version: **2026-10-v1 – Draft for Legal Review**. Exact text and electronic acceptance statement live in `lib/introducerAgreement.js` and are persisted immutably when an offer is issued.

The agreement contains the approved annual-anniversary refund wording, 30-day overpayment repayment period, 30-day ordinary termination, immediate termination grounds and frozen pre-termination recurring-entitlement clause. Those provisions are contractual wording only. No Stripe, refund, reversal, clawback, revenue, commission, settlement or remittance automation is added or changed.

## Database objects

Migration: `supabase/migrations/20261003_introducer_agreement_acceptance.sql`, after PR #65's migration.

- `organisation_introducers`: adds `agreement_legacy` and `agreement_activated_at`; changes new-row status default to `inactive`. Existing rows' statuses remain unchanged. Only existing active rows are grandfathered.
- `introducer_agreement_versions`: immutable agreement text and acceptance wording/version.
- `introducer_agreement_offers`: immutable commercial snapshot, recipient email, hashed token, version, terms revision UUID, seven-day expiry and one-way revocation timestamp.
- `introducer_agreement_acceptances`: immutable signer name/capacity, verified email/account UUID, UTC timestamp, text/version, complete terms and both affirmative confirmations. Unique `offer_id` prevents duplicate consent records.
- `introducer_agreement_archives`: append-only archive receipt, unique acceptance/path, canonical content SHA-256, PDF SHA-256 and archive timestamp.
- Indexes: offer introducer and acceptance account indexes, plus primary/unique indexes.
- Service-only RPCs: `issue_introducer_agreement`, `accept_introducer_agreement`, `complete_introducer_agreement`, `revoke_introducer_agreement`.
- Trigger helpers: `reject_agreement_mutation`, `guard_agreement_offer`, `guard_introducer_agreement`, `guard_agreement_policy`; finalisation permission helper: `agreement_finalization_allowed`.
- Triggers: `agreement_versions_immutable`, `agreement_acceptances_immutable`, `agreement_archives_immutable`, `agreement_offers_immutable`, `introducer_agreement_gate`, `introducer_agreement_policy_gate`.
- No existing accounting function/index/constraint is replaced. Accepted replacement percentage/structure uses the existing `change_introducer_commercial_terms` function to maintain policy history; it does not recalculate customer accounting or historical liabilities.

## Privacy and archive

All four new tables have RLS enabled, no client policies, and no `PUBLIC`, `anon` or `authenticated` grants. `service_role` has SELECT, but no direct INSERT/UPDATE/DELETE/TRUNCATE rights; mutations use the narrow RPCs. Immutable-table triggers also reject ordinary owner UPDATE/DELETE. Account UUIDs intentionally survive account deletion rather than cascading evidence removal.

Private Supabase bucket: `introducer-agreements`. The restrictive `introducer_agreement_objects_private` and `introducer_agreement_bucket_private` policies deny client access even if older permissive Storage policies exist. Storage access is server-side only; no public URLs or broad browser storage grants are created.

Object path: `introducer-agreements/<introducer-id>/<acceptance-id>.pdf` within that bucket. The immutable acceptance identifies its version. Uploads set `upsert:false`; application code has no overwrite or delete path. PDF downloads verify both the snapshot hash and file hash, then stream via an authenticated no-store route, rather than distributing long-lived signed URLs. Admins may retrieve any agreement; an introducer may retrieve only acceptances belonging to their verified account UUID.

This is application/database-enforced immutability, **not WORM/Object Lock**. A sufficiently privileged database/storage owner or stolen service credential remains a risk. Protect service credentials, restrict dashboard access, maintain backups and approve a documented administrative/legal retention procedure. No destructive retention endpoint is provided. Do not enable the bucket's public flag or add alternate public access paths.

## Flow and failure boundaries

1. Root admin creates an inactive introducer with contact email and initial policy. The UI displays Awaiting acceptance. Existing active introducers are labelled legacy without inventing acceptance.
2. Admin issues an invitation. A transaction locks the introducer, freezes current effective terms, records the wording version and revokes older invitations. Scheduled policy changes must be resolved before issuing. Admin issuance sends **no email**; the operator shares the returned link privately.
3. The 256-bit token is sent in the URL fragment, not a server URL/query string; only its hash is stored server-side. The portal moves it into session storage and removes the fragment. Commercial terms are never put into browser storage. The page uses no-referrer/noindex metadata.
4. The recipient explicitly requests a Supabase sign-in email and returns in the same browser, or signs in with their existing account and reopens the invitation. Server-side `auth.getUser` requires a confirmed email matching the invitation. The browser cannot choose verified email, account UUID, terms, version or timestamp.
5. GET lists owned copies only. Review POST is read-only. Acceptance requires explicit POST, full name/capacity and both true confirmations. PDF representability is checked before recording consent; unsupported characters fail safely rather than being replaced or silently lost.
6. A database transaction locks the introducer/offer and inserts one immutable acceptance. Retries return that same acceptance ID. This snapshot is authoritative even if storage fails afterwards.
7. The renderer uses bundled licensed Noto Sans subsets, fixed acceptance dates, canonical content hashing and deterministic PDF output. The server uploads without overwrite. If an upload already succeeded but the acknowledgement was lost, it downloads and hashes the existing object before continuing.
8. Only after storage succeeds does another database transaction write the immutable archive receipt and activate a never-activated new introducer. Replacement percentage/structure takes effect through existing policy history in this same finalisation transaction. A failure rolls that transaction back, preserving the acceptance for retry. No accounting transaction is invoked.
9. Revoked/replaced offers may retain their accepted evidence but cannot activate or apply superseded terms. Repeating a completed archive never reactivates a subsequently inactive introducer. Legacy active/inactive status is not changed by archive completion.
10. Both admin and owner have Retry Pending Archive and Download Accepted PDF controls. The introducer sees qualifying referral links only after archiving while currently active. Retrying via My Accepted Copies works after invitation expiry/revocation without exposing any other account's records.

New agreement text requires a new version identifier. Issuing changed text under an existing version is rejected. Commercial amendments create a new offer/acceptance, not an update to existing evidence. The v1 admin amendment workflow supports percentage and one-off/recurring structure; other identity/market/VAT/date changes on enrolled records are deliberately blocked pending a reviewed extension rather than silently rewriting accepted terms. Legacy records not enrolled in this flow retain the existing commercial editor behaviour.

## Configuration and rollout (not executed)

Reuse `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ROOT_ADMIN_EMAIL` and `NEXT_PUBLIC_SITE_URL`. No new secret is needed. Add the exact environment's `/introducer-agreement` return URL to Supabase Auth's redirect allowlist and verify email delivery in an isolated environment. Keep production credentials out of test tooling. Supabase Auth's abuse/rate protections remain necessary for user-requested sign-in emails.

Before release: legal approval; isolated migration and real Storage verification; email/account onboarding and same-browser return; admin/introducer download testing; concurrent acceptance and fail/retry verification; monitoring for accepted snapshots with no archive receipt; backup/recovery rehearsal. Do not change renderer/font assets without checking recovery for pending uploaded objects whose archive receipt has not yet committed: differing bytes fail closed instead of overwriting an object.

Rollback: stop new invitations/acceptance first. Before any real acceptance, revert application code and review an explicit reverse migration. After evidence exists, retain tables, PDFs and download/retry capability; do not drop/cascade/delete accepted records or restore the old unconditional active-creation path. No rollback was executed.

## Legal and operational review

This is a draft for a solicitor to review, not a certification of enforceability. Electronic execution still depends on intent and applicable formalities: [Law Commission](https://lawcom.gov.uk/project/electronic-execution-of-documents/). Email verification evidences account control, not independently verified legal identity or organisational authority.

Agree a defensible retention period and legal-hold/deletion procedure; immutable must not mean indefinite retention without justification: [ICO storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/). IP/user-agent are not captured by this feature, although hosting/auth infrastructure may maintain its own operational logs.

Confirm the draft's qualifying revenue definition, payment clearance/timing, statutory customer cancellation rights, advertising obligations and post-termination rights against actual commercial policies. Do not claim that the wording implements refunds or that the software handles those adjustments automatically.

## Verification

Font provenance: the four unmodified Noto Sans regular WOFF subsets are from `@fontsource/noto-sans@5.2.10`. The bundled `lib/assets/introducer-agreement-fonts/LICENSE` retains the copyright notice and SIL Open Font License 1.1. Its permission section explicitly permits embedding and redistribution with software, subject to retaining that notice/licence. The renderer reads the notice so Next traces it into the server package and includes it in PDF metadata. The fonts are not sold separately or relicensed. Latin, extended Latin, Greek and Cyrillic are supported; other unsupported characters fail before consent rather than being replaced.

Final local verification: 39 tests passed (12 agreement, 9 Personal referral/accounting, 4 Personal start, 3 Corporate email-link, 11 HR security). Synthetic three-page PDF visually checked for long accented names, commercial terms, acceptance details, version and page footers. Unsigned review screen checked at desktop and mobile sizes; no browser console errors. No authenticated end-to-end test against real Auth/Storage was performed.

Production build compiled and passed lint/type checking; page-data collection stopped in the unchanged `/api/generate-audio` route because `OPENAI_API_KEY` was unavailable. No live credentials were added to bypass this. Font assets were confirmed in Next's server tracing output. Full deployment/runtime verification remains outstanding.

After retargeting to `main`: the original 39-test suite passed again. The complete 40-file repository suite ran 371 tests: 365 passed and 6 failed. Three Playbook comparison tests reference the absent `app/api/voice-playbook-build/route.js`; two Voice persistence tests expect a response without the existing `mode`/`updatedAt` fields; one workforce SQL grant assertion includes a Windows CRLF mismatch. The relevant tests/source match `main`, where the missing route is also absent. These unrelated failures were not changed. The former PR #65 head and merged `main` have identical file trees; retargeting introduced no implementation diff, and the merge-tree conflict check passed. Only temporary deployment suppression and its documentation changed during this follow-up.

`npm run test:introducer-agreements` reconstructs the supplied schema in local PGlite, applies PR #65 and this migration, and tests binding, immutable evidence, duplicates, RLS, Storage policy restrictions, archive failures, activation, legacy preservation and replacement terms. Storage HTTP behaviour is mocked; a live isolated Storage test is still required. Existing Personal referral, start, Corporate email and HR security suites are also run. No live acceptance, account sign-in email, payment or accounting operation is performed by these tests.

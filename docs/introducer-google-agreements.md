# Introducer Google Docs agreements

Draft implementation from main after PR #65. PR #66 is not a dependency: none of its signing screens, activation gates, acceptance tables or Supabase archive are used. No deployment, migration, Google authorisation or real email send has been performed. `vercel.json` temporarily suppresses automatic deployments for this new branch only; remove that setting when a Preview deployment is explicitly approved.

The branch-specific deployment suppression is temporary and must be removed before merge, in coordination with an explicitly approved Preview deployment. It does not disable Production or other branches.

## Admin workflow

The existing Introducers page gains one Agreement section per card. Root-admin verification happens server-side on every read/write, using confirmed Supabase email and `ROOT_ADMIN_EMAIL`. Ordinary authenticated users cannot access agreement metadata or trigger Google/SMTP calls. Google credentials never reach the browser.

Generate uses the current effective policy, not future policies, alongside the introducer's market, identity, contact, VAT and agreement dates. There is no fallback to stale commission values if a policy is missing. The separate Special Terms field defaults to `None`; internal notes never leave Ops. The master already supplies the percent symbol, so the replacement contains only the number.

Each generation creates a fresh native Google Docs copy, preserving layout. All 14 placeholders must exist and unknown placeholders cause failure. The entire copied document, including tabs, headers/footers and tables, is checked for unresolved placeholders. Changes to the master require review; its source revision is recorded with each generation. The master itself is never modified.

The OAuth user must own the private destination folder named `Root Health Introducer Agreements`. The application rejects public, domain, group or additional-user sharing. The master may be owned by another account if the Root account can copy it. Generated copies are owned by Root, with resharing disabled for editors, and shared as editor with only the frozen stored contact email. Google permission notification emails are disabled; the explicit Send action uses Root SMTP. Because sharing happens during generation, a recipient may see a draft in Shared with me before the email is sent. Non-Google recipients may require Workspace visitor-sharing support; failure to grant access stops generation rather than making a file public.

Open/Copy Link do not mutate documents. Send/Resend always use the stored contact, never a browser-supplied email. Sending is blocked if effective commercial data has changed. SMTP acceptance, recipient and message ID are audited; SMTP acceptance is not proof of inbox delivery. Explicit resend is confirmed and logged separately, preserving the original sent timestamp/snapshot.

Draft updates and sent revisions create new copies. The old draft/sent row becomes superseded only after successful replacement generation. Accepted rows remain accepted even after amendments. The UI warns that manual edits are not copied into a regenerated document.

Mark Accepted requires a sent agreement and explicit Root-admin confirmation that the returned document was reviewed and matches the displayed frozen commercial terms. The system cannot infer changes made manually inside Google Docs. If those terms were changed externally, create a correctly recorded revision first; do not attest to a mismatching snapshot. Acceptance records the existing frozen terms, not a silently refreshed current policy. This is a manual evidence record, not an introducer electronic-signature service or proof of signer identity/authority.

A separate PDF is exported, saved privately in the Root folder, downloaded for SHA-256 readback verification, and then recorded with acceptance time/admin identity. The editable Doc remains separate. Accepted PDF uploads are create-only, never update/delete. Root can open the retained PDF directly in Drive. There is no Supabase Storage requirement. Drive owners/Workspace administrators can still edit/delete files outside this application: this is not WORM storage or a legal guarantee of perpetual retention. Establish backup, access, retention and legal-hold procedures before operational use.

## Data and failure boundaries

Migration: `20261004_introducer_google_agreements.sql`, after the existing schema and PR #65 migration.

- `organisation_introducer_agreements`: versioned Doc identity, source template/revision, frozen generated/sent/accepted terms, actor/time stamps and accepted PDF identity/hash. Unique introducer/version and document IDs. No row represents `not_generated`; `Needs updating` is a derived hash comparison.
- `introducer_google_agreement_operations`: durable generation/send/accept operation IDs, progress checkpoints, three-minute leases and delivery receipts. Cancellation preserves its audit row and any partial Drive copy; it never deletes agreement evidence.
- RPCs: `begin_introducer_google_operation`, `checkpoint_introducer_google_operation`, `finish_introducer_google_operation`, `cancel_introducer_google_operation`.
- `guard_introducer_google_history` and its trigger prevent deletion, alteration of frozen identities/terms, alteration of first-sent evidence and any mutation of accepted/superseded rows.
- RLS on both tables, no public/anon/authenticated grants, service-role SELECT only. Mutation is through the service-only RPCs. All operations lock the introducer before changing agreement state; unique request IDs and agreement version constraints prevent duplicate final records.

External Google/SMTP calls cannot join a PostgreSQL transaction. A durable lease/checkpoint is written before each non-repeatable action. A retry uses the same operation ID. Tagged native Doc copies can be recovered after a lost copy response. If a copy was attempted but its identity cannot be recovered, the app fails closed: Root must reconcile the partial Drive state or explicitly cancel the unfinished operation before generating anew. No background retries or cleanup jobs run.

PDF IDs are reserved and stored before upload. A failed database finalisation reuses the uploaded PDF after hash verification. A missing upload can retry under the same ID only while the source revision and PDF bytes still match the recorded expected hash. If not, manual reconciliation is required; the app never replaces an existing PDF. These interrupted-upload edge cases require live Google verification before release.

An SMTP-start checkpoint without a stored receipt means delivery is uncertain. Same-operation retry cannot send again. Root checks sent mail and explicitly chooses Resend if needed. If the receipt exists but finalisation failed, Retry only commits that receipt. Safe failed operations can be cancelled after their lease expires; uncertain delivery or started PDF archives cannot be cancelled through this UI.

Agreement workflows do not alter introducer active/inactive status, policies, Stripe, commissions, revenue, settlement or remittance. The existing Change Commercial Terms workflow remains authoritative. Changes during an external operation may make a completed draft immediately stale; the server rechecks before send. No live accounting RPC is called by this feature.

## OAuth setup: stop here until authorised

No credentials are required to run the mock and local database tests. The following are instructions only, not executed actions.

### 1. Choose the Root Google account and folder

Use a Root-controlled account, preferably dedicated to agreements. Sign into Google Drive with that account, ensure it can edit/copy the supplied master, and create a private folder named `Root Health Introducer Agreements`. Do not share the folder with introducers. Copy only the folder ID from the `/folders/ID` URL. Existing folders are supported only when private and owned by this account.

Master: https://docs.google.com/document/d/1ifYSbwF8LCraPb57D4Z0wJhne5HGX8pYFSf2q4q6ZCA/edit

### 2. Enable APIs and create the OAuth client

In Google Cloud Console select a Root-owned project. Under APIs & Services > Library enable Google Drive API and Google Docs API. In Google Auth Platform configure Branding/Audience with Root's details. Prefer Internal audience when a Workspace organisation supports it; otherwise add only the Root account as an External test user during verification. Do not assume test-mode refresh tokens are permanent: Google commonly expires them after seven days for these scopes.

For this private, single-account server integration, create an OAuth client of type Desktop app for a one-time local authorisation using Google's supported CLI. Download its client JSON into a private folder OUTSIDE this repository. It is not an application asset and must never be committed, pasted into chat, or loaded by frontend code. No service account or domain-wide delegation is used.

### 3. Obtain the refresh token safely on Windows

Use the official Google Cloud CLI. Use a separate local Cloud SDK configuration directory so existing credentials are not overwritten. Run these commands only after approval, replacing the client-file path with your private downloaded file:

```powershell
$env:CLOUDSDK_CONFIG = Join-Path $env:LOCALAPPDATA 'RootAgreementOAuth'
gcloud auth application-default login --client-id-file="C:\PRIVATE\root-agreement-client.json" --scopes="https://www.googleapis.com/auth/drive" --disable-quota-project
```

The browser performs Google's consent step; the CLI stores client ID, client secret and refresh token in its local `application_default_credentials.json`. Do not run a command that prints this file or an access token. When ready, provide its local path so the approved deployment setup can transfer the three fields directly to encrypted server-side environment variables without logging them. Restrict the private files to your Windows account; retain the refresh token only in the approved secret store after configuration is verified. Do not revoke it merely to remove a local file, as revocation would break the deployed connection.

Scope decision requiring explicit approval: the simple one-account setup above uses the restricted `drive` scope so the server can access the existing master and folder without a browser Google Picker/access token. This authorises access across that Google account's Drive, not just the agreement folder. Application code restricts operations to the fixed master and configured private folder, but this is NOT a Google-enforced OAuth boundary. A dedicated account with only agreement material reduces risk. The narrower `drive.file` alternative requires a separate explicit per-file authorisation/Picker setup; it is not silently assumed to authorise an arbitrary existing template/folder. Do not authorise the broad scope until Root approves that trade-off and checks Workspace/Google verification requirements.

### 4. Configure only required server variables

Add these through the deployment provider's secret environment settings, first in an approved isolated Preview:

| Variable | Source |
| --- | --- |
| `GOOGLE_AGREEMENTS_CLIENT_ID` | Local credential JSON `client_id` |
| `GOOGLE_AGREEMENTS_CLIENT_SECRET` | Local credential JSON `client_secret` |
| `GOOGLE_AGREEMENTS_REFRESH_TOKEN` | Local credential JSON `refresh_token` |
| `GOOGLE_AGREEMENTS_FOLDER_ID` | Private Root folder ID |

Reuse existing `ROOT_SMTP_USER`, `ROOT_SMTP_PASSWORD`, `ROOT_SMTP_FROM`, `ROOT_ADMIN_EMAIL` and Supabase URL/keys. Do not replace or broaden their existing Production configuration. No Google value uses a `NEXT_PUBLIC_` prefix. The master ID is a non-secret constant in code. No application OAuth callback, browser Google token, Google sign-in for introducers or new Supabase Auth redirect is needed.

### 5. Verify before enabling real operation

Use synthetic recipients and an isolated database. Verify private permissions, literal replacement, editor access, email receipt, uncertain-delivery handling, manual acceptance and PDF readback/retry. Confirm no unsolicited Google sharing notifications and no production/customer messages. OAuth access, actual Drive permissions, SMTP and deployment have NOT been live verified by the mock suite. Keep the PR draft until these checks and the scope/retention decisions are resolved.

## Rollback

Before records exist, revert the UI/routes and review a reverse migration. Once history exists, retain agreement/operation tables and Drive documents/PDFs; do not drop or cascade-delete evidence. Disable new operations by removing the Google connection from the affected environment, not by changing accounting or legacy introducer status. No rollback has been run.

## Local verification

48 tests passed: 21 agreement/desktop/mobile UI tests plus 27 existing Personal referral/accounting, start-page, Corporate email-link and HR security regressions. These use mocked Google/SMTP and local PGlite, not live infrastructure. Both 390px and 1280px screenshots were inspected. `git diff --check` passed.

Compilation and lint/type validation passed. The production build stopped during page-data collection for the existing `/api/stripe/personal-checkout` route because no Stripe API key was supplied locally. No Stripe credentials were added and that route was not changed. A full credentialed build and live Google/SMTP verification remain outstanding.

Run `npm run test:google-agreements` after installing the existing dependencies; the UI tests use Chrome (`CHROME_PATH` can override its location). The complete focused run also includes `tests/personal-referrals.test.mjs`, `tests/personal-start.test.mjs`, `tests/corporate-email-links.test.mjs` and `tests/hr-coach-security.test.mjs` with Node's `--experimental-default-type=module --test` flags. This Windows checkout used the existing temporary module loader to resolve PGlite from the local verification dependency directory; no dependency versions were changed.

## References

- Native template copy/replacement: https://developers.google.com/workspace/docs/api/how-tos/merge
- Scope boundaries: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Private copy default visibility: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/copy
- Local OAuth client login: https://docs.cloud.google.com/sdk/gcloud/reference/auth/application-default/login
- Refresh token expiry: https://developers.google.com/identity/protocols/oauth2

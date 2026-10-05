# Introducer Google Docs agreements

## One-stage customer acceptance

Root generates a native private Google Docs copy from the existing master using the current effective commercial policy and the dedicated Special Terms field (default `None`). Internal notes are excluded. The existing 14-placeholder checks, recipient hash/permission binding and `sendNotificationEmail=false` are unchanged. Root still reviews drafts before sending.

Send freezes a private PDF review snapshot of that version before sending its invitation. Review PDFs are capped at 3 MB to keep the base64 public response below the serverless response-size limit; oversized documents fail before sending. A resend uses the same frozen snapshot, not subsequent Google edits. To change the agreement, generate and send a new version. The invitation email opens `/introducer-agreement/accept`; it does not ask the recipient to edit/return a Google Doc or create a Root account.

The public form displays the frozen Agreement and Commercial Terms as a PDF, and collects full name, optional organisation, role/capacity, bound contact email, date, explicit acceptance and organisation authority when relevant. One Accept Agreement POST commits the acceptance evidence immediately. The customer sees the acceptance confirmation. There is no Root review/acceptance step afterward.

The authoritative acceptance timestamp is server UTC; the customer-entered date is separate evidence. The frozen terms, reviewed PDF hash, consent wording and identity/authority assertions are immutable. The server does not independently verify the person's identity or organisational authority: the private invitation is a bearer capability, not qualified electronic-signature or identity verification. Legal review remains required.

## State and failure boundaries

Draft -> sent -> accepted (PDF pending if necessary) -> archived accepted PDF and notifications. The separate acceptance row is authoritative immediately. The original agreement row becomes `accepted` when the PDF archive completes, retaining its existing archive-required constraint. Admin shows `Accepted - PDF pending` in the meantime. The legacy `accepted_by` UUID is the new acceptance evidence ID for this flow, NOT a fabricated Root user ID. Historical admin acceptances retain their original meaning.

Final PDF creation preserves the reviewed PDF pages, including embedded logos/fonts, and appends acceptance details and hashes. Full original Unicode evidence is also embedded as JSON; unsupported evidence-page glyphs use explicit Unicode code points rather than silently dropping characters. The exact final bytes are checkpointed before upload. The existing private Root-owned Drive archive reserves a fixed ID, uses create-only upload and verifies SHA-256 readback. Retries reuse the same evidence/bytes/file ID. Neither the mutable Google Doc nor current commercial policy is re-exported/re-read as accepted content.

The customer receives the accepted PDF attachment at the frozen contact email. Root receives its own confirmation/PDF at enquiries@roothealth.app. Both use Resend: `Root Health <enquiries@roothealth.app>`, reply-to `enquiries@roothealth.app`. Each channel has a durable pre-send claim and confirmed message-ID receipt. Started/unconfirmed deliveries are NEVER automatically resent. Check Resend manually before operational reconciliation. Existing invitation SMTP-era checkpoint fields remain compatible; other mailers are unchanged.

If archiving fails, acceptance remains recorded. Root's Retry PDF / Notifications action resumes fulfilment; it cannot create consent, overwrite evidence or blindly resend a claimed email. A process crash can leave a three-minute lease; retry after expiry. Until fulfilment runs successfully, the customer-copy promise is pending. No background scheduler is installed. Monitor pending/uncertain states operationally.

## Public security

Invitations use 32 random bytes, stored only as SHA-256 hashes in a private table, expiring after 90 days. A new explicit send can issue another invitation; existing valid invitations still target the same frozen version. Superseded versions cannot accept. Already accepted versions remain idempotent. Replacing commercial terms requires a new version, not an overwrite.

Tokens travel only in URL fragments then memory and same-origin JSON POST bodies. They are removed from the address bar using the existing browser history state, not placed in query strings, logs, local storage or referrers. Review requests do not accept or send emails. No admin endpoint or Supabase service key is exposed to the customer. Email is validated against the stored recipient. The configured HTTPS `NEXT_PUBLIC_SITE_URL` supplies links; Preview explicitly rejects roothealth.app instead of silently sending invitations to Production. No Vercel hostname is hard-coded.

All new tables use RLS and deny public/anon/authenticated access. Service role has SELECT only; writes go through service-only RPCs. Acceptance and version changes lock the introducer, and agreement-ID uniqueness prevents duplicate acceptance. Legacy admin-accept operations are disabled server-side and in SQL.

## Migrations and retirement

Apply in order on the approved environment only:
1. Existing PR #65 prerequisites.
2. `20261004_introducer_google_agreements.sql`.
3. `20261005_introducer_agreement_returns.sql` (retain the applied migration history).
4. `20261006_introducer_direct_acceptance.sql`.

The forward migration removes the return RPCs/acceptance gates, cancels unfinished legacy admin-accept operations while preserving their progress audit, and retains `introducer_google_agreement_returns` as immutable retired history. It never converts returned rows into acceptance. Apply during a maintenance window with no active agreement operations; reconcile any partial legacy PDF operation separately.

New private tables: `introducer_agreement_review_copies`, `introducer_agreement_invitations`, `introducer_agreement_acceptances`. Review/final PDF bytes are private database snapshots; the final file also uses the existing Drive folder, not a new Supabase Storage bucket. New RPCs: `prepare_introducer_acceptance`, `accept_introducer_agreement`, `fulfil_introducer_acceptance`, plus evidence/operation guards. No accounting table/function changes or introducer activation changes.

The old completion page/API/HMAC code is removed. `GOOGLE_AGREEMENTS_RETURN_SECRET` is unused and can be removed from environment configuration separately. No replacement signing secret is required. Previously sent completion links are obsolete: deliberately resend a new acceptance invitation after migration/configuration verification. Existing accepted agreements remain untouched.

Do not roll the application back across these migrations while customers can accept. Disable new agreement sends/acceptance endpoints for rollback; retain all evidence, review snapshots, tokens, operations and Drive PDFs. Never cascade-delete accepted history.

## Branding and legal wording

Native `files.copy` plus text-only `replaceAllText` preserves template image/header objects. The review PDF is exported from that copy; final PDF assembly retains those pages and appends evidence. Automated tests exercise native-copy/image handling and PDF page preservation. A fresh live Google Doc and PDF still need visual verification; mocked coverage is not proof of live Google rendering.

`Draft for legal review` remains in the Google master and frozen review pages. After solicitor approval, update the master and generate new versions. Never rewrite historical accepted copies.

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

Reuse `RESEND_API_KEY`, `ROOT_ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL` and the existing Supabase URL/keys. Do not replace or broaden their existing Production configuration. No Google value uses a `NEXT_PUBLIC_` prefix. The master ID is a non-secret constant in code. No application OAuth callback, browser Google token, Google sign-in for introducers or new Supabase Auth redirect is needed.


## Verification

Run `npm run test:google-agreements` and the Personal referral/accounting, start, Corporate email-link and HR security suites. Local tests use synthetic data, mocked Google/Resend and PGlite. The direct-acceptance suite covers retirement, RLS, expiry, stale versions, explicit consent/authority, immutable evidence, duplicate submits, PDF integrity and interrupted fulfilment without blind email retries. Browser fixtures cover admin controls and the public form.

This change does not configure OAuth/environment variables, apply live migrations, send real messages or deploy Production. Before rollout verify the configured Preview origin, real private PDF export/upload, fresh logo appearance, deliverability, archive retry and legal/privacy/retention requirements. Drive owners can still change/delete files outside this application; it is not WORM storage.

# PR #70 — Protected Preview readiness packet

**Status:** local review notes only. Nothing in this packet authorises a push, migration, provisioning call, deployment, Voice enablement, or provider request.

## Branch and change inventory

- Branch: `codex/professional-introducer-demo`
- HEAD: `e3dab2a502da5b0db9108ca8f7d4628b03b475aa`
- The worktree is substantially uncommitted. Preserve the current work and review the complete diff before preparing a release commit.
- `supabase/.temp/` is untracked local CLI metadata; exclude it from any review commit after checking the intended release file list. Do not publish it by accident.

Main change groups:

1. **Authentic Personal Root / Workplace routing:** verified introducer identity, grant expiry, fictional organisation mapping, real route navigation, owner-scoped personal evidence, and privacy-filtered employer aggregation.
2. **Fictional workforce:** Root-only idempotent provisioning of synthetic members and historical assessments; mapping occurs only after the data is prepared. Introducers cannot create accounts, organisations, invitations, subscriptions, or commercial entitlements.
3. **Voice security and budget:** default-off Voice entitlement, authenticated Realtime route, project and per-introducer reservations, provider call tracking, scheduled termination/retry worker, Root usage report, and explicit live-availability messaging.
4. **Introducer-only restrictions:** unmetered AI and distribution actions fail closed in the verified introducer deployment; customer Production is not classified as introducer mode.
5. **Authentication/build support:** local password and redirect work, request-time payment client initialization, and private PDF route changes. These require final customer-flow regression and fresh build validation.

## Functional coverage and tests

The introducer identity routes authenticated sessions from `/introducer` into the genuine application at `/`; the genuine Personal Root routes and the permitted Workplace dashboard, executive review, and launch-kit routes remain in the codebase. The separate `/introducer` scenario page still exists and is a fictional overview; it is not the genuine product experience. Do not present it as a substitute for the actual application.

Non-AI personal assessment/check-in, saved personal history, and permitted fictional Workplace aggregates remain available in code. Their actual protected-Preview behaviour still requires browser acceptance after the personal-access migration. The five-person privacy thresholds remain in the existing aggregate path.

AI restrictions are surfaced on Voice and by an explicit middleware response. In introducer mode, these remain paused until budget-metered: `/api/root-coach`, `/api/organisation-coach`, `/api/hr-voice-session`, `/api/transcribe`, `/api/playbook-review`, and `/api/generate-audio`. Live `/api/realtime-session` is default-off and requires a separate grant entitlement, active grant, project policy, termination readiness, and a successful reservation. Breath with Root is available without an AI call.

Latest relevant local checks: introducer experience **19/19**, RLS/migration simulation **19/19**, restriction/Realtime/usage/Playbook suite **32/32**, termination unit suite **7 passed**. The two-connection PostgreSQL integration test is **skipped**, not passed. These are local tests, not authenticated Preview or browser acceptance.

## Disposable PostgreSQL test route

This Windows shell has no `docker`, `postgres`, `pg_ctl`, `psql`, or `supabase` command, no local listener on port 5432, and no installed `pg` driver. The service-manager query was denied by Windows permissions; WSL's previously reported `Wsl/E_ACCESSDENIED` also remains unresolved. PGlite can validate SQL and RLS locally but cannot satisfy the required independent PostgreSQL connection test.

Safest route: after separate approval, use an isolated **local disposable PostgreSQL 17** instance (prefer a local-only Docker container or a local-only PostgreSQL service), bind it to loopback, name the database `pr70_test`, and set `PR70_LOCAL_POSTGRES_TEST_URL` only in that shell. Verify the connection URL hostname is loopback and database name contains `pr70_test` before running `npm run test:introducer-voice-termination`. The test itself checks those restrictions, uses two independent connections, inserts only synthetic Auth/grant/usage rows, and cleans them up. Do not point it at Supabase Preview or Production. No software was installed and no database was contacted in this review.

Approval needed to proceed with that test: authorize installation/start of one local disposable PostgreSQL test environment. If installation is not approved, the multi-connection result remains blocked.

## Preview migration order

The latest independent read-only ledger report supplied for Preview `waluyphoafylzcjuskcl` said the sanitized baseline is already applied and is the only ledger entry. Recheck the ledger immediately before any authorized operation; do not reapply the baseline.

1. **Already reported installed:** `20261118150000_pr70_introducer_sanitized_baseline.sql` — local SHA-256 `AF262E2DF1C61A6BF7886C0A300EBC07245AF12BC161C17A0B59A6A8C0CC47E9`.
2. **Next:** `20261118153000_pr70_expiring_personal_access.sql` — SHA-256 `6256B26D82617A47BFAFE30F0AF5A8C2B92DD7948AD8AAC1B1B2365B52E59C56`.
3. **Then:** `20261119120000_pr70_introducer_voice_entitlement_and_usage.sql` — SHA-256 `57379067E4EF575B55D3D0BE8B48C05D7CBF9B5F54A726A9D5C8E96F67BE3A1F`.

Apply steps 2 and 3 only to the isolated Preview, in order, after independent SQL review and explicit approval. Verify hashes, ledger, 20-table RLS/policy state, original records, access expiry/revocation, direct REST denials, and Voice default-off state after each step. Do not import customer data or alter Production.

## Root Voice authorization procedure and current gap

The provisional project policy is £10 per Europe/London calendar month, currently estimated at $0.20/minute, with a configurable 10% margin, three starts per 24 hours by default, and a 30-minute planned duration plus completion grace. There is no platform-wide introducer-count limit. The rate must be Root-set for the current month using the published USD-per-GBP basis; reservations are estimates, not a hard invoice cap.

Once the Preview controls have passed acceptance, the intended Root-only sequence is:

1. Configure the current month’s FX rate/source, £10 ceiling, and approved session settings through the Root-authenticated `PATCH /api/introducer/root-voice-usage` policy endpoint. This endpoint is protected but the current page at `/introducer/voice-budget` is report-only; it has no settings form.
2. Use the same-origin, Root-admin-only `POST /api/introducer/root-provision` for the already verified grant/user, explicitly setting `voiceCoachEnabled: true` and a small individual `voiceSessionsPer24hOverride` / `voiceMaxSessionSecondsOverride`. Do not create an account or grant Voice automatically on registration.
3. The database must also have `server_termination_ready = true` after worker and termination acceptance.

**Security-critical control gap:** there is currently no supported Root UI/API action to set `server_termination_ready`; the migration defaults it to false and the policy PATCH does not accept it. This intentionally prevents reservations and Voice sessions, but means Root cannot complete the above authorization through the supported application controls today. Keep Voice disabled until a reviewed Root-only readiness-control path is added and tested. Do not work around this with ad hoc SQL.

## Bounded fictional recording scenario

No recording exists. After separate approval for one bounded, budget-reserved test session, use a Root-provisioned fictional account only:

1. Fictional participant reports: “I feel tense before project reviews and have trouble settling to sleep afterwards.” No real personal context or customer data.
2. Coach asks one short follow-up about what is most difficult, reflects the participant’s answer, and collaboratively proposes a brief grounding pause before a review plus a short end-of-day reflection for a few days.
3. Coach asks whether the participant would like the agreed intervention saved. The participant explicitly says, “Yes, save that to my Playbook.”
4. Verify the Playbook write in the isolated account before capturing the Coach’s saved confirmation. If the write fails or consent is absent, do not record a success message.
5. Capture one short screen/audio recording, review it for fictional-only content and accidental credentials, and store it as `public/introducer/voice-coach-demo.mp4` with the visible “Prerecorded demonstration · fictional data · not a live consultation” label. Verify repeated playback generates no API inference request or budget reservation.

This is a recording plan, not a completed asset. No session or capture is authorized by this document.

For that single capture only, a proposed Root-set allocation is one start in 24 hours, 900 seconds planned, 300 seconds completion grace, and a 120-second warning. The provider hard limit is then 1,500 seconds (25 minutes) under the current formula. At the current estimate of $0.20/minute, the reservation estimate is $5.00 USD before the 10% margin, or $5.50 divided by the current configured USD-per-GBP rate. This is an estimate, not an invoice ceiling; Root must confirm the live month’s FX basis and remaining shared reservation budget before authorizing the session.

## Blockers and recommendation

**Security-critical before enabling live Voice:** real two-connection Postgres tests; Preview direct-REST and expiry/revocation tests; tested scheduled termination; a Root-only way to set termination readiness; and confirmation that the provider key/project is isolated and spend is monitored. Actual usage reconciliation is not implemented; therefore the £10 value is a reservation policy, not a guaranteed provider invoice ceiling.

**Deployment blockers, not security findings:** the latest recorded production-style build failed during page-data collection on `/admin` and `/admin/introducers` with `createClientModuleProxy`; a fresh build must pass before deployment. No authenticated desktop/mobile Preview acceptance has been run. No prerecorded asset exists.

**Go/no-go:** **No-go for the first protected Preview deployment today.** The worktree is uncommitted, the known admin build issue is unresolved, and the environment has not been freshly verified as protected and correctly branch-scoped. A code-only protected Preview may proceed after independent diff review, clean release-file selection, fresh build success, and explicit approval to push/deploy. Keep migrations/provisioning separately gated and keep Voice disabled. Human acceptance of the actual product still requires applying the two reviewed Preview migrations, Root-controlled fictional provisioning, and authenticated browser/REST acceptance.

## Final readiness gate update — 19 November 2026

This section supersedes the earlier build-status sentence above. The complete production-style Next build now passes, including static generation of `/admin` and `/admin/introducers` and all 87 pages. The ordinary sandboxed build attempts could not write Next's generated output and failed with Windows `EPERM`; rerunning with workspace-write escalation, a temporary ignored output directory, one build worker, and `NEXT_IGNORE_INCORRECT_LOCKFILE=1` completed compilation, lint/type checks, page-data collection, static generation, and traces. The temporary Next config and generated output were removed. No application source or production configuration was changed for the build.

Focused regression results from this gate: Personal Root/Workplace and employer privacy **111 passed**; introducer experience **19 passed**; provisioning and request-time Stripe initialization **8 passed**; PGlite RLS/usage/security **19 passed**; Root auth, Realtime and Playbook **25 passed**; Voice termination **7 passed, 1 skipped**. The only skip is the explicit two-independent-PostgreSQL-connection integration test. Total: **189 passed, 1 skipped, 0 failed**. `git diff --check` passes; only line-ending warnings were reported.

The local migration hashes remain: sanitized baseline `AF262E2DF1C61A6BF7886C0A300EBC07245AF12BC161C17A0B59A6A8C0CC47E9` (previously reported installed in Preview), personal-access migration `6256B26D82617A47BFAFE30F0AF5A8C2B92DD7948AD8AAC1B1B2365B52E59C56`, and Voice/usage migration `57379067E4EF575B55D3D0BE8B48C05D7CBF9B5F54A726A9D5C8E96F67BE3A1F`. No migration was applied in this turn.

**Root controls remain incomplete and live Voice stays disabled.** The Root-only `PATCH /api/introducer/root-voice-usage` can change shared policy, and Root-only `POST /api/introducer/root-provision` can enable a specific existing grant and set per-introducer limits. The current budget page is report-only. There is no supported readiness-confirmation control, and the installed/pending schema has no durable audit table recording who changed an allocation or readiness state. Because this gate authorizes no migration, do not add a control that changes termination readiness without the corresponding schema-level audit and tested acceptance proof. Voice policy and individual entitlement remain default-off; readiness cannot be asserted through the supported application route.

The Windows environment still has no Docker, PostgreSQL server/client or Supabase CLI, and no local listener on port 5432. PGlite passed the local SQL/RLS checks but does not substitute for the skipped cross-connection test. The minimum additional test facility is a disposable local PostgreSQL instance bound to loopback, database `pr70_test`, with `PR70_LOCAL_POSTGRES_TEST_URL` set only for the integration-test process. No installation or remote database access was attempted.

**Separated release gates:**

- **Code-only protected Preview:** build and focused local tests now pass. Remaining gates are independent release-file/secret review, fresh verification of branch-scoped Preview variables and SSO protection, and explicit approval to push/deploy. This does not prove application access because the pending personal-access migration is not installed.
- **Preview migrations:** apply only the two pending migrations after independent review and separate approval; baseline is not to be replayed. Follow with direct REST, expiry/revocation, RLS and worker acceptance.
- **Fictional introducer provisioning:** blocked on the personal-access migration, confirmed mapped grant/account, separate provisioning approval, and authenticated Preview acceptance.
- **Paid/live Voice Coach:** blocked on the disposable two-connection PostgreSQL test, tested Preview worker schedule/termination and revocation, a reviewed durable Root audit/readiness control, isolated provider configuration and explicit approval for a reserved fictional provider session. The £10 policy remains an estimate, not a guaranteed invoice cap.

**Recommendation:** build blocker cleared, but do not publish yet until the release-file and secret review plus Preview protection check are completed. Keep migrations, provisioning, and live Voice as separate approval stages. Production remains untouched.

## 19 November 2026 — employer administration and dedicated-project gate

This dated addendum supersedes earlier build and release-gate statements above where they differ.

### Genuine fictional employer administration

The real `/organisation-structure` page now recognizes an introducer through a separate server-verified `employerAdminAvailable` capability. This resolves the existing `hr_admin` (Workplace access) versus `organisation_admin` (customer structure-page access) distinction without changing the customer `organisation_admin` check or adding a real organisation membership for the introducer. Every demo API request independently revalidates the named account's active grant and uses only its Root-mapped organisation with `status = demo`.

The page can display the isolated fictional roster, add persistent organisational units, and change roles only on fictional `organisation_members` rows with `user_id IS NULL`. The `employee`, `hr_admin`, and `organisation_admin` values are demonstration roles; they create no login or authority. Invitation handling is a preview only: it creates no invitation row, account, token, email or customer access. Spreadsheet import, join links and real organisation creation remain disabled. The fictional organisation and roster must be provisioned by Root before the introducer grant is mapped; these screens do not provision them.

### Dedicated deployment identity

The deployment guard recognizes the dedicated project `prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut` in Preview or Production only with the exact `codex/professional-introducer-demo` branch, explicit introducer mode, isolated Supabase ref `waluyphoafylzcjuskcl`, expected customer reference `witkwlgldxjwwxmpcyva`, and a valid HTTPS `.vercel.app` auth origin. That project stays in introducer mode even if Vercel labels the deployment `production`. The existing customer project `prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO` stays in customer mode only with the expected customer database and no introducer marker/branch. Unknown project identities and mismatches return the fail-closed status. Tests exercise both IDs and both Vercel environments; this guard has not been exercised against a live deployment.

### Current verification

- Employer admin, role-boundary, no-real-invitation, route authorization, navigation/pagination and deployment-identity tests: **67 passed, 0 failed**.
- Full local suite: **527 tests; 522 passed, 4 failed, 1 skipped**. The four failures are the existing Voice Playbook comparison assertions (tests 429–431) and workforce invitation delivery-RPC grant assertion (test 516); their test files and the Voice Playbook builder route are unchanged from `origin/main`. The skip is the disposable two-connection PostgreSQL integration test, which remains blocked because no local PostgreSQL instance is installed/running. `git diff --check` has no whitespace errors; Git reports only line-ending notices.
- Production-style build: compilation and lint/type checks complete, but Next fails during page-data collection with `Cannot read properties of undefined (reading 'createClientModuleProxy')` from the shared generated React Server Components proxy. It affects `/admin`, `/admin/introducers`, `/audio-test`, and the not-found route. The installed Next runtime does expose the function when required directly, so the local generated-bundle mismatch remains unresolved. No application behavior was changed to mask it. An isolated temporary output directory and config were removed after the attempt.
- Migration files and hashes are unchanged: baseline `AF262E2DF1C61A6BF7886C0A300EBC07245AF12BC161C17A0B59A6A8C0CC47E9`; personal access `6256B26D82617A47BFAFE30F0AF5A8C2B92DD7948AD8AAC1B1B2365B52E59C56`; Voice/usage `57379067E4EF575B55D3D0BE8B48C05D7CBF9B5F54A726A9D5C8E96F67BE3A1F`. No remote SQL, provisioning, provider request, commit, push or deployment occurred.

### Dedicated Vercel project Preview-only manifest

Configure these only in the new Vercel project, in the **Preview** environment, with the feature-branch scope where Vercel supports it:

- `ROOT_DEPLOYMENT_MODE=introducer`
- `ROOT_INTRODUCER_VERCEL_PROJECT_ID=prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut`
- `ROOT_INTRODUCER_SUPABASE_PROJECT_REF=waluyphoafylzcjuskcl`
- `ROOT_PRODUCTION_SUPABASE_PROJECT_REF=witkwlgldxjwwxmpcyva`
- `PROFESSIONAL_INTRODUCER_DEMO_ENABLED=true`
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` sourced only from the isolated Preview project
- `SUPABASE_SERVICE_ROLE_KEY` sourced only from the isolated Preview project and kept server-only
- `ROOT_AUTH_PREVIEW_URL` set only after the first generated protected `.vercel.app` URL is independently confirmed

Do not configure `OPENAI_API_KEY`, `ROOT_INTRODUCER_OPENAI_API_KEY`, `ROOT_INTRODUCER_VOICE_TERMINATION_ENABLED`, Stripe, SMTP, Resend, Google agreement, or other provider credentials for this first Voice-disabled Preview. Do not set `CRON_SECRET` while the termination worker is disabled. Vercel SSO must stay enabled for all deployments, with no custom-domain exception and no custom domain attached. The exact project settings and effective variable values are not currently verified in the Vercel dashboard.

### Bootstrap order and release decision

Do not connect Git yet. After separate approval, first configure the dedicated project with the Preview-only manifest and keep SSO on; connect the repository/feature branch only after the configuration is reviewed. The first generated deployment must be accessed anonymously to verify SSO blocks it. Since the app does not yet know its exact generated auth origin, it should fail closed. Confirm the exact deployment URL and project/branch metadata, set that origin as `ROOT_AUTH_PREVIEW_URL`, then redeploy the same reviewed commit. Confirm all Preview environment variables resolve to the isolated Supabase project and no provider keys are present before any authenticated test. Do not apply either pending migration or provision an introducer until their existing approval gates are cleared.

**Recommendation: NO-GO for code-only Preview publication today.** The environment has no verified Vercel manifest yet, the production-style build fails page-data collection, and the four pre-existing full-suite failures and skipped independent PostgreSQL integration need to stay visible. The 67 focused employer-admin/deployment checks pass; this does not substitute for the protected Preview acceptance.

## 20 November 2026 — local build blocker resolved

The earlier `createClientModuleProxy` failure was reproduced in generated module `68570` of `server/chunks/9188.js`: it attempted to read `createClientModuleProxy` from generated module `51749`, which should resolve through Next's vendored `ReactServerDOMWebpackServerEdge`. The related module `23191` imports `next/dist/compiled/next-server/app-page.runtime.prod.js`. That installed runtime directly exposes `createClientModuleProxy` as a function.

The failed diagnostic build had set `distDir` to a sibling directory outside the application root (`../pr70-build-output-inspect-20261119`). Two comparison builds with the same code, dependencies, `NEXT_IGNORE_INCORRECT_LOCKFILE=1`, and in-project temporary output completed all 87 static pages: one with `experimental.cpus: 1`, and one with Next's default worker count. This isolates the cause to the external `distDir` layout; the worker limit was not required. The earlier default `.next` attempt separately hit Windows `EPERM` under the restricted shell before page collection. The successful isolated output was `.next-pr70-build-debug-20261120` / `.next-pr70-build-nocpus-20261120`; both were removed, the normal `.next` tree was preserved, and no permanent Next config or application source change was needed.

Dependency check: this branch has **no committed npm, Yarn or pnpm lockfile**, so an installed tree cannot be compared with a committed lock. The manifest pins Next `14.2.30`, React and React DOM `18.2.0`; `npm ls` reports those exact versions installed, `@next/swc-win32-x64-msvc` is `14.2.30`, and Next's bundled server runtime exposes the expected proxy function. There is no standalone `react-server-dom-webpack` dependency: Next supplies its vendored RSC implementation.

The failing application bundle showed on multiple routes but disappeared without any app-code or server/client boundary change when `distDir` was kept inside the app root. This is therefore a local build-output-layout issue, not a PR #70 route defect. The production-style build passes all 87 pages. Focused employer-admin, permissions, route-guard, navigation and Realtime regression tests pass **67/67**. The previous full-suite result remains **522 passed, 4 known failures, 1 skipped**; the skip is the external two-connection PostgreSQL integration test and the four failures are unchanged from `origin/main`.

The Next build blocker is cleared for protected code-only Preview readiness. Deployment is still gated on the dedicated project's unverified Preview variables/SSO configuration, release-file review, and explicit publication approval. No source change, migration, remote operation, provider call, commit, push or deployment occurred for this build correction.

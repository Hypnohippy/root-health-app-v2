# PR #70: platform-first Preview plan

> **Status note (18 November 2026):** This is an earlier planning snapshot. Since it was written, the sanitized 20-table baseline was reported successfully applied to isolated Preview `waluyphoafylzcjuskcl`, and the grant-scoped HR aggregate bridge was added locally. The migration's reported live state and remaining acceptance blockers are recorded in `docs/pr70-isolated-introducer-db-review.md`. This plan's statements below about the baseline being absent are historical; the HR bridge has not yet been deployed or live-verified.

## Current evidence and gate

Authoritative customer schema source: Supabase project `root-health-v2`, ref `witkwlgldxjwwxmpcyva`. Isolated fictional Workplace Preview: `root-health-introducer-demo-preview`, ref `waluyphoafylzcjuskcl`. The current Codex session does not expose Supabase project tools, so I cannot retrieve or validate the source DDL in this turn.

This checkout has the customer-facing application routes, but it does not contain the database baseline needed to provision those routes in an empty Supabase project. The current branch contains 13 SQL migration files and `origin/main` contains 11; they are feature migrations, not a complete ordered schema build. The schema fixture at `tests/fixtures/introducer-schema.json` describes 10 introducer/commercial objects and is not the Root customer schema. The two PR #70 migrations create four introducer-only tables: access grants, introduction requests, fictional members and fictional assessments.

The existing customer pages must not be pointed at Production to fill this gap. The introducer demo's authorization also intentionally rejects accounts with a Personal subscription or an organisation membership, so it cannot serve as the access grant for the real customer application.

The existing `personal_subscriptions` path is Stripe-backed: the webhook persists active/trialing status and period end. `getRootIdentity()` currently decides Personal capability from active/status fields, without checking `current_period_end` in that client-side capability calculation. The introducer demo has no Personal evaluation entitlement. A Preview-only time-limited personal entitlement therefore needs an expiry check in the shared entitlement decision and a reviewed provisioning/deletion path; simply inserting an `active` row would not prove expiry enforcement.

Sol's live inspection has identified broad policies on `organisation_members` and `wellbeing_assessments`, with RLS disabled on `journal_entries` and `mind_entries`. The exact policy definitions were not available in this Codex checkout, so they must be reviewed from the schema export before any reuse. None of these permissive access settings may be copied into either evaluation environment.

## Real routes and known data dependencies

| Experience | Reusable routes | Dependencies visible in this checkout |
| --- | --- | --- |
| Personal Root | `/`, `/orientation`, `/assessment` (`/check-in`), `/onboarding-complete`, `/insights`, `/coach`, `/journal`, `/body`, `/mind`, `/playbook`, `/profile` | Supabase Auth identity; `profiles`; `personal_subscriptions`; `wellbeing_assessments`; personal evidence includes `journal_entries`, `body_signals`, `mind_entries`, `intervention_outcomes`, `playbook_entries`, `playbook_tracker_entries` and `voice_sessions`. `resolvePersonalRootContext` binds private profile lookup to `auth.uid()` through `profiles.user_id`. The normal assessment route writes personal rows with `organisation_id = null` and uses the existing seven-measure assessment and feedback path. |
| Root Workplace | `/org-insights`, `/organisation-learning`, `/organisation-structure`, `/hr-coach`, `/executive-review`, `/presentation-support` | Auth identity and HR membership; `organisations`, `organisation_units`, `organisation_members`, `organisation_people`, `organisation_employee_invites`, `organisation_hr_activity`, `organisation_hr_invites`, `organisation_learning_reviews`, `wellbeing_assessments`, `journal_entries`, `mind_entries` and `voice_sessions`. Existing RPC dependencies include `organisation_workforce_context`, `list_workforce_invitations` and `transfer_organisation_admin`. |

The complete baseline extraction must also identify indirect API/server dependencies, foreign keys, enums, triggers, views, indexes, extensions, storage buckets, grants and every RLS policy. The visible feature migrations demonstrate dependencies on pre-existing `organisations`, `organisation_units`, `organisation_members` and `auth.users`; they cannot safely create the baseline by themselves. In particular, `organisation_workforce_context` requires an authenticated HR role, and the real employer aggregation must retain its existing minimum-group privacy gates.

## Authoritative schema-only export request

Sol can run this read-only Supabase CLI command from a clean temporary directory, after verifying the selected remote ref is exactly `witkwlgldxjwwxmpcyva`:

```powershell
supabase db dump --remote=witkwlgldxjwwxmpcyva --schema public --file root-health-v2-public-schema.sql
supabase migration list --remote=witkwlgldxjwwxmpcyva
```

The Supabase CLI documents `db dump` as a schema dump by default (no rows or custom roles); do not add `--data-only` or `--role-only`. It includes the public DDL needed to inspect tables, constraints, indexes, sequences, functions, triggers, grants and policies. The standard dump excludes managed `auth`, `storage` and extension schemas. If the app has custom objects or triggers in those managed schemas, provide their DDL separately from catalog-only queries. Never export `auth.users`, token-bearing invitation rows, application data, key material or secrets. Include only migration version/name/status from migration history, not arbitrary application rows. [Supabase CLI dump reference](https://supabase.com/docs/reference/cli/v0/supabase-db-dump), [migration history reference](https://supabase.com/docs/reference/cli/supabase-migration-list).

Known direct route object set from this checkout (the authoritative export may reveal required dependencies and server/API objects beyond these):

- **Personal Root tables:** `profiles`, `personal_subscriptions`, `wellbeing_assessments`, `journal_entries`, `body_signals`, `mind_entries`, `playbook_entries`, `playbook_tracker_entries`, `intervention_outcomes`, `voice_sessions`.
- **Workplace tables:** `organisations`, `organisation_units`, `organisation_members`, `organisation_people`, `organisation_employee_invites`, `organisation_hr_activity`, `organisation_hr_invites`, `organisation_learning_reviews`, plus `wellbeing_assessments`, `journal_entries`, `mind_entries`, `voice_sessions`.
- **RPCs called by these routes:** `organisation_workforce_context`, `list_workforce_invitations`, `transfer_organisation_admin`, `redeem_organisation_setup_invite`, `get_hr_invitation_preview`, `accept_workforce_invitation`, `claim_workforce_invitation`, `finish_workforce_invitation`.
- **Storage:** the app source references an upload in `app/api/generate-audio/route.js`; confirm its bucket/object policy only if that genuine feature is included in Preview. Do not copy Production bucket objects.

The required complete set is the transitive DDL dependency closure of these tables/RPCs (FK targets, invoked functions, trigger functions, types, views and policies). It cannot be named exactly until the authoritative dump is inspected; adding guessed tables/functions would violate the source-of-truth requirement.

## Corrected access model required before migration

- Enable RLS on every table exposed through PostgREST; default to no `anon`/`authenticated` privilege and add only route-required grants/policies. Remove the overly broad `organisation_members` and `wellbeing_assessments` policies identified in the live source. Enable RLS on `journal_entries` and `mind_entries` before importing their schema into either evaluation database.
- **Personal:** bind profile access to `auth.uid() = profiles.user_id`; permit evidence access only when its `profile_key` belongs to that authenticated user's profile. Personal rows must have `organisation_id IS NULL`. Subscription rows are readable only by their owner and are writable only by trusted billing/provisioning functions. No HR role grants access to Personal evidence.
- **Workplace:** permit membership and organisation structure reads only under explicit tenant/role checks. Employees may read/write only their own workplace identity and allowed own assessment rows. HR users must not receive direct browser SELECT access to individual `wellbeing_assessments`, `journal_entries` or `mind_entries` rows.
- **Employer insights:** `org-insights` currently selects those evidence rows from the browser and runs the real `buildOrganisationSnapshot` client-side. That is incompatible with denying HR raw-record access. Move the read-and-project step behind an authenticated server endpoint: verify the caller's HR membership for the exact organisation, read only that tenant's rows with a server-only service role, run the existing `buildOrganisationSnapshot`, and return only its privacy-protected aggregate. Keep small-group suppression and add negative tests for raw API/table access. Do not replace its formulas with new scoring logic.
- **Fictional reset:** server-side service-role reset/seed operations must authorize the exact demo grant and fixed fictional organisation; no client-provided arbitrary organisation or profile key. Do not put service-role credentials in Vercel browser variables.
- **Database functions:** revoke default/public execution, set a fixed safe `search_path` on `SECURITY DEFINER` functions, verify function owner and argument validation, and grant execute only to the intended role. Validate all function bodies and trigger side effects from the authoritative export before reuse.

Because of the identified RLS gaps, copying the live permissive policies would be unsafe even into a new project. The access-policy correction and server-side aggregate boundary are prerequisites, not optional post-deployment hardening.

## Required environment split

Use two separately protected Preview application environments, built from the same customer application code and the same Draft PR commit:

1. **Private Personal Root evaluation:** a dedicated Supabase project, Auth audience, and Vercel project/environment. It contains David's real, individually authorised personal account and only his personal records. Provision the time-limited Personal entitlement using the existing Root trial/subscription mechanism. Do not include an organisation membership for this account. Preserve the existing personal application routes and writes; personal assessment rows remain `organisation_id = null`.
2. **Fictional Root Workplace presentation:** retain Supabase project `waluyphoafylzcjuskcl`, but install the verified customer schema baseline there before the PR #70 fictional seed. Create a separate synthetic HR Auth identity and fictional organisation/workforce. Seed only synthetic employee identities and assessments into the real workplace tables; reuse the real dashboard, role checks, aggregation and privacy rules. Keep the current grant, expiry, revocation, consultant attribution and reset boundaries. Reset may only reseed fictional organisation data; it must never reset or read Personal Root records.

Expose the two protected Preview destinations as distinct experiences. A person switches between them by opening the other Preview and authenticating to its own Auth project; do not share browser tokens, Auth users, service-role keys, or tenant identity across the two projects. Keep both Vercel projects SSO-protected, branch-pinned to the Draft PR, and configured only with their own Supabase URL/anon key. Keep service-role keys server-only. Neither Preview receives a Production database URL or Production records.

This is the minimum separation consistent with the instruction not to store real wellbeing information in the fictional Preview. The existing `waluyphoafylzcjuskcl` project remains the fictional employer environment. A distinct private Personal Root evaluation project and corresponding Vercel environment are not identified in the verified local project files and require separate operator approval before creation or configuration.

## Migration and provisioning order

1. Obtain and verify the canonical public schema-only dump and migration version/name/status from `witkwlgldxjwwxmpcyva`; separately capture only applicable custom `auth`/`storage` objects. Do not export rows, Auth users, tokens or secrets.
2. Compare all direct route objects and transitive DDL dependencies against the actual `remote_schema` baseline and current migration history. Review every policy/function security mode. Replace the broad membership/assessment policies and enable RLS for journal/mind before copying any customer schema into either evaluation project.
3. Build an ordered, reproducible baseline migration set for the private Personal evaluation project and fictional Workplace project. Validate it against disposable empty databases. Record all objects created, grants, RLS policies, RPCs, triggers, indexes, extensions and rollback/restore approach.
4. Apply the reviewed baseline only to the two confirmed non-Production projects. Apply compatible additive feature migrations only after their preconditions pass. Do not rerun historical migrations blindly or use `db push` against Production.
5. For Personal Root, create one named Auth identity and provision an expiring Personal trial through the existing entitlement process. Require the approved privacy information and separate affirmative health-data consent before the first health-data write. Add a tested expiry and deletion workflow. Do not copy the current introducer grant or fictional data into this project.
6. For Workplace, seed a synthetic organisation, synthetic HR membership, synthetic workforce and synthetic assessments using the real tenant tables. Validate that the existing five-person aggregate/privacy thresholds hold. Use deterministic seed identifiers and a reset transaction that is scoped only to the synthetic tenant.
7. Run negative authorization tests before browser acceptance: personal user cannot query another user's profile/evidence; HR user cannot retrieve individual assessment records or another tenant; employer aggregates exclude all Personal Root rows; anonymous and uninvited users are denied; expired/revoked grants are denied; no Preview server points at Production.
8. Verify actual routes and persistence in both protected Preview projects on desktop and mobile. Confirm Personal Root history survives sign-out/re-entry and is never reset by Workplace reset. Confirm synthetic assessments drive the existing employer aggregate. Keep PR #70 Draft.

## Health-data processing gate

Wellbeing responses are health data and may be special-category data. Before Personal Root collection begins, Root must document both an Article 6 lawful basis and an applicable Article 9 condition, provide transparent purpose-specific information, record any explicit consent separately where that is the selected condition, and support withdrawal. A DPIA should be completed before this new evaluation processing begins because special-category data increases risk and can require a DPIA. Set and implement a justified retention schedule, deletion path, data-subject request handling, access logging, incident response and processor/subprocessor controls. Do not invent a retention duration or treat a Preview account expiry as automatic erasure.

This is an engineering gate, not legal advice. The controller must approve the applicable lawful basis, Article 9 condition, privacy text, retention period and DPIA before the Personal Root environment accepts genuine wellbeing data.

## Not yet verified / not changed

- No current Supabase or Vercel project connector is exposed in this Codex session. The local code confirms the routes and known dependencies above; it cannot confirm the live Preview's exact database catalog, RLS state, Auth user/grant state, Vercel branch settings, or deployment protection.
- No schema migration, seed, entitlement, account, project, Vercel setting, Production setting, deployment or email was changed for this plan.
- The personal health-data environment and processing approvals are absent. Therefore the authentic Personal Root journey must not yet accept David's real wellbeing information.
- The bespoke `/introducer` interface is not a substitute for either real application. It remains unchanged by this plan; remove it as the primary experience only after both real environments pass the isolation and acceptance checks above.

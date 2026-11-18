# PR #70 — Root Health customer schema reference (read-only)

Extracted **18 November 2026** from connected Supabase project `root-health-v2` (`witkwlgldxjwwxmpcyva`).

**Purpose:** enable Charlie to review the authoritative source structure for the real Personal Root and Root Workplace routes. No customer data, `auth.users`, passwords, API keys, private tokens, or data-bearing rows were exported.

**These files are catalog-derived reference materials, NOT an executable `pg_dump`, reviewed schema migration, or authorization to apply changes.** No source database was mutated. GitHub reference branch is separate from the PR #70 development branch.

## Contents

- `pr70-customer-public-tables.reference.sql`: 45 `public` table column definitions (688 columns), reconstructed from `pg_catalog`; NOT dependency-ordered.
- `pr70-customer-public-security-and-dependencies.reference.json`: 249 constraints, 176 indexes, 55 policies, 11 non-internal triggers, privileges, table RLS states, sequences, enum and view catalogue.
- `pr70-customer-public-functions.reference.sql`: source definitions of 34 `public` functions.

## Recorded migration history

Source connected project migration list reports:

| Version | Name | Presence |
| --- | --- | --- |
| `20261004072950` | `remote_schema` | Reported as applied by the source migration list |
| `20261010114550` | `personal_acquisition_events` | Reported as applied by the source migration list |

The connected migration tool returns only version and name; it **does not verify local migration-file sync** or offer the original `remote_schema` SQL content. Therefore deployment status is known only as recorded in the remote list.

## Security issues to correct, NOT copy

- `public.organisation_members` has broad `{public}` SELECT, INSERT and UPDATE policies without an ownership/HR authorization test.
- `public.wellbeing_assessments` has broad `{public}` SELECT and INSERT policies.
- `public.journal_entries` and `public.mind_entries` currently have RLS disabled.
- Client-side individual evidence access used by the current `/org-insights` route cannot be given to HR; build a role-verified server-side aggregation boundary returning threshold-protected aggregate output.
- Do not apply the source permissions wholesale to either Personal Root evaluation or the fictional Workplace demo.

## Remaining verification before ANY migrations

1. Obtain a genuine **schema-only** `supabase db dump` / `pg_dump --schema-only` from the authoritative source if full fidelity is required, keeping all data/roles/secrets excluded and reviewing resulting DDL. The connected Supabase tools used here do not expose `pg_dump`.
2. Resolve managed-schema (`auth`, `storage`) dependencies without copying identities or secrets; check extensions and function dependencies.
3. Make a separate clean baseline migration, properly ordered and with corrected owner-specific RLS, grants, server-side aggregate protections and negative tests.
4. Personal Root's real introducer wellbeing data requires its **own isolated environment**, independent of the fictional Workplace Preview `waluyphoafylzcjuskcl`. Confirm Article 6 and Article 9 conditions, privacy notice, retention/deletion, and DPIA applicability before ingesting any real health data.
5. The four existing `professional_introducer_demo_*` tables already exist in Workplace Preview. **Do not blindly replay** their create-table migrations.
6. Keep PR #70 Draft, Production untouched, platform functionality before password refactoring.

## Work performed

Read-only catalog and migration-history queries to `witkwlgldxjwwxmpcyva`, then publication of static reference files in **`reference/pr70-customer-schema-20261118`**. No Supabase or Vercel project write; no Production deploy; no PR #70 branch update.

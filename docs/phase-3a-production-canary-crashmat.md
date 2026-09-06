# Phase 3A production canary crashmat

This runbook is a deployment gate for the first confirmed workforce import. It does not authorise running the migration or importing data. Use **Final Test Ltd** and fictional workforce data only.

## 1. Read-only compatibility and snapshot

Run the following in the production Supabase SQL editor before applying the migration. Save both result sets as CSV in a secure operator-controlled location. Do not commit the exports because membership rows contain personal and authentication-linked data.

```sql
-- Resolve the canary organisation without assuming its UUID.
select id, name
from public.organisations
where lower(btrim(name)) = lower('Final Test Ltd');

-- Replace the UUID below with the single result above.
select id, organisation_id, parent_unit_id, name, unit_type, active, created_by, created_at
from public.organisation_units
where organisation_id = '<FINAL_TEST_ORGANISATION_ID>'::uuid
order by created_at, id;

select id, organisation_id, user_id, profile_key, organisation_unit_id,
       name, email, role, department
from public.organisation_members
where organisation_id = '<FINAL_TEST_ORGANISATION_ID>'::uuid
order by id;
```

Verify the touched production objects and collision prerequisites without changing them:

```sql
select to_regclass('public.organisations') as organisations,
       to_regclass('public.organisation_units') as organisation_units,
       to_regclass('public.organisation_members') as organisation_members,
       to_regclass('public.organisation_people') as organisation_people;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('organisations', 'organisation_units', 'organisation_members', 'organisation_people')
order by table_name, ordinal_position;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.organisation_units'::regclass, 'public.organisation_members'::regclass)
order by table_name::text, conname;

select id, organisation_id, count(*)
from public.organisation_units
group by id, organisation_id
having count(*) > 1;

select id, organisation_id, count(*)
from public.organisation_members
group by id, organisation_id
having count(*) > 1;
```

Expected: the three existing tables and required referenced columns exist; `organisation_people` does not yet exist; IDs are unique with their organisation IDs; and the new composite-unique constraint names do not already exist. If any expectation differs, stop and review the migration rather than applying it.

## 2. Migration properties

`20260905_create_organisation_people.sql` is additive. It creates `organisation_people`, indexes, ownership constraints, its audit/RLS functions and policies, and the atomic `apply_confirmed_workforce_import` RPC. It adds composite unique constraints to existing unit/member identifiers. It does not update or delete existing organisation units, memberships, roles, departments, evidence, invitations, or subscriptions.

The RPC changes data only after explicit confirmation by an authenticated, exact-organisation `organisation_admin`. Each call is one transaction and takes an organisation-scoped advisory transaction lock. Any raised error rolls back units, people, manager links, and membership-unit alignment from that call.

## 3. Canary verification

Record the timestamp immediately before the first confirmed import. Complete the browser flow with the supplied fictional CSV, then verify the resulting hierarchy and people in the live page. Run the same file again and confirm the second result reports no newly created units or people.

After each run, compare `organisation_members.role` and `organisation_members.department` with the saved pre-import export. They must be unchanged. Confirm no invitations or memberships were created.

## 4. Recovery

### Migration installed, no import performed

No existing workforce rows have been modified. The safest recovery is to leave the additive objects dormant while the application remains unmerged. If removal is required, first prove `organisation_people` is empty, then remove the RPC, policies, trigger, table, helper functions, and the two newly named composite unique constraints in dependency order.

### Failed import

The RPC raises and PostgreSQL rolls back the entire call. Verify that no `organisation_people` or `organisation_units` rows have `created_at` at or after the recorded attempt time and compare membership placement to the pre-import export. Do not perform compensating writes unless those checks disprove rollback.

### Successful Final Test import that must be undone

Use the saved pre-import exports as authority. In one reviewed transaction: restore only changed Final Test membership `organisation_unit_id` values by membership UUID; remove only canary `organisation_people` rows created by the confirmed fictional import; then remove only units absent from the unit snapshot and created by that import, children before parents. Never infer rollback targets from names alone. Verify roles and textual departments still match the snapshot. Keep this recovery operator-reviewed; do not expose it as an application action.

## 5. Outstanding production gate

The production compatibility queries and snapshot/export must be completed by an authenticated Supabase operator before migration execution. The fictional CSV must also be supplied and reviewed before the first import. No migration, deployment, merge, or production import should proceed while either item is outstanding.

## 6. Final Test Ltd canary outcome — 6 September 2026

The Phase 3A production canary completed successfully using only the reviewed fictional 10-person workforce CSV and the explicitly authorised Final Test Ltd organisation.

- Production compatibility checks passed and the secured pre-import unit and membership snapshots were retained outside the repository.
- The additive migration was installed successfully. Post-migration verification confirmed the approved columns, generated fields, constraints, indexes, RLS policies, audit trigger and composite organisation-scoped keys.
- The default PostgreSQL function privilege was corrected so `anon` cannot execute the helper or apply functions. The repository migration contains the same verified revocation/grant boundary as production.
- The first preview exposed that the source-column order would place Location below Department and Team. The reviewed hierarchy control was added so mapped structural dimensions can be reordered or excluded without altering the uploaded data.
- The accepted canary hierarchy was `Location → Department → Team`. Head Office, Maidstone and London were each represented once as shared top-level site branches.
- The initial transactional apply succeeded: 10 units created, 10 workforce people added, 0 people updated and 0 records excluded.
- Post-import checks confirmed 10 active workforce people, 10 unique employee references, 10 unique business emails, correct placements and manager relationships, spreadsheet-import provenance, no duplicate units, no cross-organisation links, and no membership or invitation creation. The three original units and all five original memberships remained unchanged.
- Reconfirming the exact same reviewed import proved idempotency: 0 units created, 0 people added, 10 existing people updated/reconfirmed, 0 memberships aligned and 0 records excluded. All 10 workforce-person UUIDs and all 10 canary-unit UUIDs were preserved and duplicate counts remained one.
- A deliberately invalid two-person import used a unique `Rollback Test Site → Rollback Test Department → Rollback Test Team` hierarchy and a self-manager reference. The final server preview contained only those disposable records. The RPC failed during manager resolution as intended, and rollback verification confirmed no test units or people survived and the accepted canary structure, relationships and memberships remained unchanged.

The migration, compatibility, atomicity, rollback and application preview gates are therefore complete. PR #41 remains draft and unmerged pending an explicit merge/deployment decision. No further canary imports are authorised by this record.

export const PR70_MIGRATION_TARGETS = Object.freeze({
  preview: Object.freeze({
    supabaseRef: "waluyphoafylzcjuskcl",
    vercelProjectId: "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut",
    migration: "20261121130000_pr70_preview_introducer_onboarding.sql",
    // Actual installed ledger versions from the isolated Preview catalog. They
    // differ from the checked-in source filenames and are not rewritten here.
    requiredHistory: Object.freeze(["20261118150000", "20261120193009", "20261121102218"]),
    requiredLedger: Object.freeze([
      Object.freeze({ version: "20261118150000", name: "pr70_introducer_sanitized_baseline" }),
      Object.freeze({ version: "20261120193009", name: "pr70_expiring_personal_access" }),
      Object.freeze({ version: "20261121102218", name: "pr70_preview_introducer_onboarding" }),
    ]),
  }),
  rootCommercial: Object.freeze({
    supabaseRef: "witkwlgldxjwwxmpcyva",
    vercelProjectId: "prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO",
    migration: "20261120130000_introducer_onboarding_admin.sql",
    requiredHistory: Object.freeze(["20261004072950", "20261010114550", "20261121102851"]),
    requiredLedger: Object.freeze([
      Object.freeze({ version: "20261004072950", name: "remote_schema" }),
      Object.freeze({ version: "20261010114550", name: "personal_acquisition_events" }),
      Object.freeze({ version: "20261121102851", name: "introducer_onboarding_admin" }),
    ]),
  }),
});

/**
 * Fresh, read-only catalog facts required in addition to the migration ledger.
 * These manifests deliberately describe schema, grants and preserved Preview
 * fixtures: a history ID by itself is not proof that a usable baseline exists.
 */
export const PR70_CATALOG_REQUIREMENTS = Object.freeze({
  rootCommercial: Object.freeze({
    tables: Object.freeze({
      "public.organisation_introducers": Object.freeze({
        columns: Object.freeze(["id", "name", "notes", "status", "agreement_start_date", "agreement_end_date"]),
        serviceRolePrivileges: Object.freeze(["SELECT", "UPDATE"]),
      }),
      "public.organisation_introducer_policies": Object.freeze({ columns: Object.freeze(["id", "introducer_id"]) }),
      "public.organisation_applications": Object.freeze({ columns: Object.freeze(["id", "introducer_id"]) }),
      "public.organisation_commissions": Object.freeze({ columns: Object.freeze(["id", "introducer_id"]) }),
      "public.organisation_commercial_documents": Object.freeze({ columns: Object.freeze(["id", "introducer_id"]) }),
      "public.personal_referral_attributions": Object.freeze({ columns: Object.freeze(["id", "introducer_id"]) }),
      "public.organisation_introducer_campaigns": Object.freeze({ columns: Object.freeze(["id", "introducer_id"]) }),
      "public.introducer_google_agreement_operations": Object.freeze({ columns: Object.freeze(["id", "introducer_id"]) }),
      "public.organisation_introducer_agreements": Object.freeze({
        columns: Object.freeze([
          "id", "introducer_id", "version", "status", "superseded_at", "accepted_at", "accepted_by",
          "terms_hash", "terms_snapshot", "accepted_terms_snapshot",
        ]),
        rlsEnabled: true,
        serviceRolePrivileges: Object.freeze(["SELECT"]),
      }),
      "public.introducer_agreement_acceptances": Object.freeze({
        columns: Object.freeze(["id", "agreement_id", "archive_state", "accepted_at", "terms_hash", "evidence"]),
        rlsEnabled: true,
        serviceRolePrivileges: Object.freeze(["SELECT"]),
      }),
      "public.organisation_introducer_onboarding": Object.freeze({
        columns: Object.freeze(["id", "introducer_id", "state", "agreement_id", "acceptance_id", "activation_request_id", "activation_nonce_hash", "activation_expires_at", "preview_user_id", "preview_grant_id", "revoked_at"]),
        rlsEnabled: true,
        serviceRolePrivileges: Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE"]),
        clientPrivileges: Object.freeze({ anon: Object.freeze([]), authenticated: Object.freeze([]) }),
      }),
      "public.organisation_introducer_onboarding_events": Object.freeze({
        columns: Object.freeze(["id", "onboarding_id", "introducer_id", "actor_id", "event_type", "agreement_id", "request_id", "occurred_at", "details"]),
        rlsEnabled: true,
        serviceRolePrivileges: Object.freeze(["SELECT", "INSERT"]),
        clientPrivileges: Object.freeze({ anon: Object.freeze([]), authenticated: Object.freeze([]) }),
      }),
      "public.organisation_introducer_onboarding_receipts": Object.freeze({
        columns: Object.freeze(["receipt_jti", "onboarding_id", "introducer_id", "request_id", "preview_user_id", "preview_grant_id", "receipt_sha256", "created_at"]),
        rlsEnabled: true,
        serviceRolePrivileges: Object.freeze(["SELECT", "INSERT"]),
        clientPrivileges: Object.freeze({ anon: Object.freeze([]), authenticated: Object.freeze([]) }),
      }),
      "public.organisation_introducer_lifecycle_events": Object.freeze({
        columns: Object.freeze(["id", "introducer_id", "introducer_ref", "actor_id", "event_type", "occurred_at", "details"]),
        rlsEnabled: true,
        serviceRolePrivileges: Object.freeze(["SELECT", "INSERT"]),
        clientPrivileges: Object.freeze({ anon: Object.freeze([]), authenticated: Object.freeze([]) }),
      }),
      "auth.users": Object.freeze({ columns: Object.freeze(["id"]) }),
    }),
    clientSelectDenied: Object.freeze([
      "public.organisation_introducer_agreements",
      "public.introducer_agreement_acceptances",
    ]),
    constraints: Object.freeze([
      "organisation_introducers.id.primary_key",
      "organisation_introducer_agreements.introducer_id.foreign_key",
      "organisation_introducer_agreements.introducer_id_version.unique",
      "organisation_introducer_agreements.status.check",
      "organisation_introducer_agreements.terms_hash.check",
      "organisation_introducer_agreements.accepted_terms_snapshot.check",
      "introducer_agreement_acceptances.agreement_id.foreign_key",
      "introducer_agreement_acceptances.archive_state.check",
      "introducer_agreement_acceptances.terms_hash.check",
    ]),
    presentColumns: Object.freeze([
      "public.organisation_introducers.archive_requested_at",
      "public.organisation_introducers.archived_at",
      "public.organisation_introducers.archived_by",
      "public.organisation_introducers.archive_previous_status",
    ]),
    presentFunctions: Object.freeze([
      "public.complete_professional_introducer_onboarding(uuid,uuid,uuid,uuid,text,uuid,integer,uuid,timestamptz,text,text,uuid,uuid,timestamptz,text)",
      "public.remove_test_organisation_introducer(uuid,uuid)",
    ]),
    functions: Object.freeze({
      "public.complete_professional_introducer_onboarding(uuid,uuid,uuid,uuid,text,uuid,integer,uuid,timestamptz,text,text,uuid,uuid,timestamptz,text)": Object.freeze({ securityDefiner: false, searchPath: "pg_catalog, public", executableBy: Object.freeze(["service_role"]), deniedTo: Object.freeze(["public", "anon", "authenticated"]) }),
      "public.remove_test_organisation_introducer(uuid,uuid)": Object.freeze({ securityDefiner: false, searchPath: "pg_catalog, public", executableBy: Object.freeze(["service_role"]), deniedTo: Object.freeze(["public", "anon", "authenticated"]) }),
    }),
  }),
  preview: Object.freeze({
    tables: Object.freeze({
      "public.professional_introducer_demo_access": Object.freeze({
        columns: Object.freeze([
          "id", "user_id", "consultant_label", "granted_by", "expires_at", "revoked_at", "revoked_by", "demo_organisation_id",
        ]),
        rlsEnabled: true,
        serviceRolePrivileges: Object.freeze(["SELECT", "INSERT", "UPDATE"]),
      }),
      "public.professional_introducer_onboarding": Object.freeze({
        columns: Object.freeze(["id", "commercial_introducer_id", "activation_request_id", "assertion_jti", "signed_assertion", "activation_link_ciphertext", "contact_email", "contact_name", "agreement_id", "agreement_version", "accepted_terms_hash", "acceptance_id", "accepted_at", "user_id", "access_grant_id", "state", "activation_expires_at"]),
        rlsEnabled: true,
        serviceRolePrivileges: Object.freeze(["SELECT", "INSERT", "UPDATE"]),
        clientPrivileges: Object.freeze({ anon: Object.freeze([]), authenticated: Object.freeze([]) }),
      }),
      "public.professional_introducer_onboarding_events": Object.freeze({
        columns: Object.freeze(["id", "onboarding_id", "event_type", "actor_user_id", "occurred_at", "details"]),
        rlsEnabled: true,
        serviceRolePrivileges: Object.freeze(["SELECT", "INSERT"]),
        clientPrivileges: Object.freeze({ anon: Object.freeze([]), authenticated: Object.freeze([]) }),
      }),
      "public.organisations": Object.freeze({ columns: Object.freeze(["id", "name"]) }),
      "auth.users": Object.freeze({ columns: Object.freeze(["id", "email", "email_confirmed_at"]) }),
    }),
    constraints: Object.freeze([
      "professional_introducer_demo_access.demo_organisation_id.foreign_key",
      "professional_introducer_demo_access.expiry.check",
    ]),
    policies: Object.freeze({
      profiles_select_self: Object.freeze({ ownerScoped: true, activeGrantRequired: true }),
      profiles_update_self: Object.freeze({ ownerScoped: true, activeGrantRequired: true }),
      assessment_select_self: Object.freeze({ ownerScoped: true, activeGrantRequired: true }),
      assessment_insert_self: Object.freeze({ ownerScoped: true, activeGrantRequired: true }),
    }),
    accessFunction: Object.freeze({
      name: "public.professional_introducer_access_active()",
      securityDefiner: false,
      searchPath: "pg_catalog",
      executableBy: Object.freeze(["authenticated"]),
      deniedTo: Object.freeze(["public", "anon", "service_role"]),
    }),
    preservedFixtures: Object.freeze({
      northstarOrganisations: 1,
      fictionalMembers: 24,
      fictionalAssessments: 55,
      mappedInternalGrants: 1,
      internalAcceptanceIdentityPresent: true,
    }),
    mappedGrantOrganisationIsNorthstar: true,
    existingCommercialIdentityValuesUnique: true,
    presentFunctions: Object.freeze([
      "public.activate_professional_introducer_onboarding(uuid,uuid,text)",
      "public.confirm_professional_introducer_onboarding(uuid,uuid,uuid)",
      "public.revoke_professional_introducer_onboarding(uuid,uuid)",
    ]),
    functions: Object.freeze({
      "public.professional_introducer_access_active()": Object.freeze({ securityDefiner: false, searchPath: "pg_catalog", executableBy: Object.freeze(["authenticated"]), deniedTo: Object.freeze(["public", "anon", "service_role"]) }),
      "public.activate_professional_introducer_onboarding(uuid,uuid,text)": Object.freeze({ securityDefiner: false, searchPath: "pg_catalog, public", executableBy: Object.freeze(["service_role"]), deniedTo: Object.freeze(["public", "anon", "authenticated"]) }),
      "public.confirm_professional_introducer_onboarding(uuid,uuid,uuid)": Object.freeze({ securityDefiner: false, searchPath: "pg_catalog, public", executableBy: Object.freeze(["service_role"]), deniedTo: Object.freeze(["public", "anon", "authenticated"]) }),
      "public.revoke_professional_introducer_onboarding(uuid,uuid)": Object.freeze({ securityDefiner: false, searchPath: "pg_catalog, public", executableBy: Object.freeze(["service_role"]), deniedTo: Object.freeze(["public", "anon", "authenticated"]) }),
    }),
  }),
});

const hasAll = (actual, expected) => {
  const values = new Set(Array.isArray(actual) ? actual.map(String) : []);
  return expected.every(value => values.has(value));
};

const hasExactly = (actual, expected) => {
  if (!Array.isArray(actual) || new Set(actual.map(String)).size !== actual.length) return false;
  return actual.map(String).sort().join("\u0000") === expected.map(String).sort().join("\u0000");
};

function requireCatalogArray(actual, expected, label) {
  if (!hasAll(actual, expected)) throw new Error(`Fresh catalog evidence is missing required ${label}.`);
}

function validateCatalogEvidence(target, projectRef, evidence) {
  if (!evidence || evidence.projectRef !== projectRef) {
    throw new Error("Fresh, project-bound Supabase catalog evidence is required.");
  }
  const requirements = PR70_CATALOG_REQUIREMENTS[target];
  const tables = evidence.tables || {};
  for (const [name, requirement] of Object.entries(requirements.tables)) {
    const actual = tables[name];
    if (!actual || !hasAll(actual.columns, requirement.columns)) {
      throw new Error(`Fresh catalog evidence is missing required columns for ${name}.`);
    }
    if (requirement.rlsEnabled === true && actual.rlsEnabled !== true) {
      throw new Error(`Row-level security is not verified for ${name}.`);
    }
    if (!hasExactly(actual.serviceRolePrivileges, requirement.serviceRolePrivileges || [])) {
      throw new Error(`Effective service_role privileges differ from the exact reviewed ACL for ${name}.`);
    }
    for (const [role, expected] of Object.entries(requirement.clientPrivileges || {})) {
      if (!hasExactly(actual.clientPrivileges?.[role], expected)) {
        throw new Error(`Effective ${role} privileges differ from the reviewed deny-by-default ACL for ${name}.`);
      }
    }
  }
  for (const [name, required] of Object.entries(requirements.functions || {})) {
    const fn = evidence.functions?.[name];
    if (!fn || fn.securityDefiner !== required.securityDefiner || fn.searchPath !== required.searchPath ||
        !hasExactly(fn.executableBy, required.executableBy) || !hasExactly(fn.deniedTo, required.deniedTo)) {
      throw new Error(`Function security and effective EXECUTE ACL are not verified for ${name}.`);
    }
  }

  if (target === "rootCommercial") {
    requireCatalogArray(evidence.clientSelectDenied, requirements.clientSelectDenied, "client-role denials");
    requireCatalogArray(evidence.constraints, requirements.constraints, "constraint checks");
  } else {
    requireCatalogArray(evidence.constraints, requirements.constraints, "Preview mapping and expiry constraints");
    for (const [name, required] of Object.entries(requirements.policies)) {
      const actual = evidence.policies?.[name];
      if (!actual || required.ownerScoped !== true || required.activeGrantRequired !== true ||
          actual.ownerScoped !== true || actual.activeGrantRequired !== true) {
        throw new Error(`Owner and active-grant policy evidence is missing for ${name}.`);
      }
    }
    for (const [key, value] of Object.entries(requirements.preservedFixtures)) {
      if (evidence.preservedFixtures?.[key] !== value) {
        throw new Error(`Preview fixture preservation evidence is missing or changed: ${key}.`);
      }
    }
    if (evidence.existingCommercialIdentityValuesUnique !== true) {
      throw new Error("Preview commercial-identity uniqueness is not verified.");
    }
    if (evidence.mappedGrantOrganisationIsNorthstar !== true) {
      throw new Error("The existing mapped grant is not verified against the fictional Northstar organisation.");
    }
  }

  requireCatalogArray(evidence.presentTables, Object.keys(requirements.tables).filter(name => name.includes("introducer_onboarding")), "installed onboarding tables");
  if (requirements.presentColumns) requireCatalogArray(evidence.presentColumns, requirements.presentColumns, "installed lifecycle columns");
  requireCatalogArray(evidence.presentFunctions, requirements.presentFunctions, "installed onboarding functions");
}

/** Offline fail-closed gate. No connection or SQL execution is performed here.
 * Callers must pass freshly transcribed catalog evidence from the exact project. */
export function validatePr70MigrationTarget({
  target,
  migration,
  projectRef,
  vercelProjectId,
  migrationHistory,
  migrationLedger,
  schemaEvidence,
} = {}) {
  const history = Array.isArray(migrationHistory) ? migrationHistory.map(String) : [];
  if (new Set(history).size !== history.length || history.some(id => !/^\d{8,14}$/.test(id))) {
    throw new Error("Migration history evidence is malformed or duplicated.");
  }
  const normalizedTarget = target === "root-commercial" ? "rootCommercial" : target;
  if (!Object.hasOwn(PR70_MIGRATION_TARGETS, normalizedTarget)) {
    throw new Error("Unknown PR #70 migration target; no migration is approved.");
  }
  const expected = PR70_MIGRATION_TARGETS[normalizedTarget];
  if (projectRef !== expected.supabaseRef || vercelProjectId !== expected.vercelProjectId || migration !== expected.migration) {
    throw new Error("Migration target identity or file does not match the approved isolated project.");
  }
  if (history.slice().sort().join(",") !== expected.requiredHistory.slice().sort().join(",")) {
    throw new Error("Migration history differs from the independently verified baseline; stop and reconcile first.");
  }
  const ledger = Array.isArray(migrationLedger) ? migrationLedger : [];
  const ledgerKey = item => item && typeof item.version === "string" && typeof item.name === "string"
    ? `${item.version}:${item.name}` : "";
  const actualLedger = ledger.map(ledgerKey);
  const expectedLedger = expected.requiredLedger.map(ledgerKey);
  if (actualLedger.some(item => !item) || new Set(actualLedger).size !== actualLedger.length ||
      actualLedger.slice().sort().join(",") !== expectedLedger.slice().sort().join(",")) {
    throw new Error("Migration ledger names and versions differ from the independently verified installed history.");
  }
  validateCatalogEvidence(normalizedTarget, projectRef, schemaEvidence);
  return { target, projectRef, vercelProjectId, migration, ready: true };
}

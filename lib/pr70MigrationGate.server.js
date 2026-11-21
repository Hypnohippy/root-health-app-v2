export const PR70_MIGRATION_TARGETS = Object.freeze({
  preview: Object.freeze({
    supabaseRef: "waluyphoafylzcjuskcl",
    vercelProjectId: "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut",
    migration: "20261120131000_pr70_preview_introducer_onboarding.sql",
    requiredHistory: Object.freeze(["20261118150000", "20261118153000"]),
  }),
  rootStaging: Object.freeze({
    productionSupabaseRef: "witkwlgldxjwwxmpcyva",
    productionVercelProjectId: "prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO",
    migration: "20261120130000_introducer_onboarding_admin.sql",
    requiredHistory: Object.freeze(["20261004", "20261005", "20261006"]),
  }),
});

/** Offline fail-closed gate. Inputs must be transcribed from fresh, read-only
 * project and migration-history evidence immediately before a later approved
 * operation; this helper never connects to or writes to Supabase. */
export function validatePr70MigrationTarget({
  target,
  migration,
  projectRef,
  vercelProjectId,
  migrationHistory,
  verifiedSchemaObjects = false,
  env = process.env,
} = {}) {
  const history = Array.isArray(migrationHistory) ? migrationHistory.map(String) : [];
  if (new Set(history).size !== history.length || history.some((id) => !/^\d{8,14}$/.test(id))) {
    throw new Error("Migration history evidence is malformed or duplicated.");
  }
  if (target === "preview") {
    const expected = PR70_MIGRATION_TARGETS.preview;
    if (projectRef !== expected.supabaseRef || vercelProjectId !== expected.vercelProjectId || migration !== expected.migration) {
      throw new Error("Preview migration target identity or file does not match the approved isolated project.");
    }
    if (history.slice().sort().join(",") !== expected.requiredHistory.slice().sort().join(",")) {
      throw new Error("Preview migration history differs from the reviewed baseline; stop and reconcile first.");
    }
    if (verifiedSchemaObjects !== true) throw new Error("Fresh Preview schema and existing-fixture preflight is required.");
    return { target, projectRef, vercelProjectId, migration, ready: true };
  }
  if (target === "root-staging") {
    const expectedRef = String(env.PR70_ROOT_STAGING_SUPABASE_PROJECT_REF || "");
    const expectedProject = String(env.PR70_ROOT_STAGING_VERCEL_PROJECT_ID || "");
    if (!expectedRef || !expectedProject || expectedRef === PR70_MIGRATION_TARGETS.rootStaging.productionSupabaseRef ||
        expectedProject === PR70_MIGRATION_TARGETS.rootStaging.productionVercelProjectId ||
        projectRef !== expectedRef || vercelProjectId !== expectedProject || migration !== PR70_MIGRATION_TARGETS.rootStaging.migration) {
      throw new Error("Root commercial migration is blocked until a distinct isolated staging project is pinned and independently verified.");
    }
    if (!PR70_MIGRATION_TARGETS.rootStaging.requiredHistory.every((id) => history.includes(id))) {
      throw new Error("Root staging agreement and acceptance migration dependencies are incomplete.");
    }
    if (history.includes("20261120130000") || verifiedSchemaObjects !== true) {
      throw new Error("Root staging migration state or required commercial schema preflight is invalid.");
    }
    return { target, projectRef, vercelProjectId, migration, ready: true };
  }
  throw new Error("Unknown PR #70 migration target; no migration is approved.");
}

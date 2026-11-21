export const INTRODUCER_REMOVAL_DEPENDENCIES = Object.freeze([
  Object.freeze({ table: "organisation_applications", column: "introducer_id", label: "applications" }),
  Object.freeze({ table: "organisation_commissions", column: "introducer_id", label: "commission or payment history" }),
  Object.freeze({ table: "organisation_commercial_documents", column: "introducer_id", label: "commercial documents" }),
  Object.freeze({ table: "personal_referral_attributions", column: "introducer_id", label: "personal referral attribution" }),
  Object.freeze({ table: "organisation_introducer_agreements", column: "introducer_id", label: "agreement history" }),
  Object.freeze({ table: "introducer_agreement_acceptances", column: "agreement_id", via: "organisation_introducer_agreements", label: "signed acceptance evidence" }),
  Object.freeze({ table: "introducer_google_agreement_operations", column: "introducer_id", label: "agreement operation audit" }),
  Object.freeze({ table: "organisation_introducer_campaigns", column: "introducer_id", label: "campaign history" }),
  Object.freeze({ table: "organisation_introducer_onboarding", column: "introducer_id", label: "demo-access lifecycle" }),
  Object.freeze({ table: "organisation_introducer_onboarding_events", column: "introducer_id", label: "onboarding audit" }),
  Object.freeze({ table: "organisation_introducer_onboarding_receipts", column: "introducer_id", label: "activation receipts" }),
]);

export function checkIntroducerRemovalDependencies(dependencyCounts = {}) {
  const blockers = [];
  for (const dependency of INTRODUCER_REMOVAL_DEPENDENCIES) {
    const count = dependencyCounts[dependency.table];
    if (!Number.isSafeInteger(count) || count < 0) {
      blockers.push({ ...dependency, reason: "not_verified" });
    } else if (count > 0) {
      blockers.push({ ...dependency, reason: "records_exist", count });
    }
  }
  return { allowed: blockers.length === 0, blockers };
}

const ACTIVE_DEMO_STATES = new Set(["activation_sent", "activation_uncertain", "activated"]);
const NO_ACCESS_STATES = new Set(["registered", "revoked", "failed"]);

export async function archiveIntroducer({ repository, revokeDemoAccess, introducerId, actorId }) {
  const row = await repository.getIntroducer(introducerId);
  if (!row) throw Object.assign(new Error("Introducer not found."), { status: 404 });
  if (row.archived_at && !row.archive_requested_at) return { state: "archived", alreadyArchived: true };

  if (!row.archive_requested_at) {
    await repository.markArchivePending({ introducerId, actorId, previousStatus: row.status });
    await repository.recordEvent({ introducerId, actorId, eventType: "archive_requested", details: {} });
  }

  try {
    const onboarding = await repository.getOnboarding(introducerId);
    if (onboarding && ACTIVE_DEMO_STATES.has(onboarding.state)) {
      await revokeDemoAccess({ introducerId, actorId });
    } else if (onboarding && !NO_ACCESS_STATES.has(onboarding.state)) {
      throw new Error("Demo invitation is being prepared. Archive is pending; retry after that operation resolves.");
    }
    await repository.finalizeArchive({ introducerId, actorId });
    await repository.recordEvent({ introducerId, actorId, eventType: "archived", details: {} });
    return { state: "archived", alreadyArchived: false };
  } catch (error) {
    throw Object.assign(new Error("Archive is pending: demo access could not yet be confirmed revoked. Retry the archive action. " + (error?.message || "")), { status: 409 });
  }
}

export async function restoreIntroducer({ repository, introducerId, actorId }) {
  const row = await repository.getIntroducer(introducerId);
  if (!row) throw Object.assign(new Error("Introducer not found."), { status: 404 });
  if (!row.archived_at || row.archive_requested_at) {
    throw Object.assign(new Error("Introducer is not archived."), { status: 409 });
  }
  await repository.restore({ introducerId, actorId, previousStatus: row.archive_previous_status || "inactive" });
  await repository.recordEvent({ introducerId, actorId, eventType: "restored", details: {} });
  return { state: "active_record_restored", demoAccessRestored: false };
}

export async function removeIntroducer({ repository, introducerId, actorId }) {
  const row = await repository.getIntroducer(introducerId);
  if (!row) throw Object.assign(new Error("Introducer not found."), { status: 404 });
  if (row.status !== "inactive" || !/^\[TEST RECORD\](?:\s|$)/i.test(String(row.notes || "").trim())) {
    throw Object.assign(new Error("Permanent removal is limited to explicitly marked, inactive [TEST RECORD] entries. Archive genuine introducers instead."), { status: 409 });
  }
  const dependencyCounts = {};
  for (const dependency of INTRODUCER_REMOVAL_DEPENDENCIES) {
    dependencyCounts[dependency.table] = await repository.countDependency(dependency, introducerId);
  }
  const check = checkIntroducerRemovalDependencies(dependencyCounts);
  if (!check.allowed) {
    const labels = check.blockers.map(item => item.reason === "not_verified" ? `${item.label} could not be checked` : item.label);
    throw Object.assign(new Error(`Permanent removal is blocked. Archive this introducer instead. Related records: ${labels.join(", ")}.`), { status: 409, blockers: check.blockers });
  }
  await repository.deleteIntroducer(introducerId, actorId);
  await repository.recordRemovedEvent({ introducerId, actorId });
  return { state: "removed" };
}

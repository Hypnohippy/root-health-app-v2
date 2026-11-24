import { NextResponse } from "next/server";
import { queryResult, rootAgreementAccess } from "../../../../../lib/introducerGoogleAgreementServer.js";
import { isIntroducerDeployment } from "../../../../../lib/introducerRestrictedActions.server.js";
import { revokeIntroducerPreviewAccess } from "../../../../../lib/introducerPreviewBridge.server.js";
import { ROOT_COMMERCIAL_SUPABASE_REF, ROOT_COMMERCIAL_VERCEL_PROJECT_ID } from "../../../../../lib/professionalIntroducerOnboarding.server.js";
import { archiveIntroducer, removeIntroducer, restoreIntroducer } from "../../../../../lib/introducerHousekeeping.server.js";

export const runtime = "nodejs";
const reply = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");

function repository(db) {
  return {
    async getIntroducer(id) {
      return queryResult(db.from("organisation_introducers")
        .select("id,name,status,notes,archived_at,archive_requested_at,archive_previous_status")
        .eq("id", id).maybeSingle());
    },
    async getOnboarding(id) {
      return queryResult(db.from("organisation_introducer_onboarding").select("state").eq("introducer_id", id).maybeSingle());
    },
    async markArchivePending({ introducerId, previousStatus }) {
      if (!["active", "inactive"].includes(previousStatus)) throw new Error("Unexpected introducer status; archive stopped.");
      const result = await queryResult(db.from("organisation_introducers").update({
        status: "inactive",
        archive_requested_at: new Date().toISOString(),
        archive_previous_status: previousStatus,
      }).eq("id", introducerId).eq("status", previousStatus).is("archived_at", null)
        .select("id").maybeSingle());
      if (!result) throw new Error("Introducer status changed concurrently. Refresh and retry.");
    },
    async finalizeArchive({ introducerId, actorId }) {
      const result = await queryResult(db.from("organisation_introducers").update({
        archived_at: new Date().toISOString(),
        archived_by: actorId,
        archive_requested_at: null,
      }).eq("id", introducerId).not("archive_requested_at", "is", null)
        .is("archived_at", null).select("id").maybeSingle());
      if (!result) throw new Error("Archive state changed concurrently. Refresh before retrying.");
    },
    async restore({ introducerId, previousStatus }) {
      const result = await queryResult(db.from("organisation_introducers").update({
        status: previousStatus,
        archive_requested_at: null,
        archived_at: null,
        archived_by: null,
        archive_previous_status: null,
      }).eq("id", introducerId).eq("status", "inactive")
        .or("archived_at.not.is.null,archive_requested_at.not.is.null")
        .select("id").maybeSingle());
      if (!result) throw new Error("Introducer could not be restored.");
    },
    async countDependency(dependency, introducerId) {
      if (dependency.via === "organisation_introducer_agreements") {
        const { data: agreements, error: agreementError } = await db.from("organisation_introducer_agreements")
          .select("id").eq("introducer_id", introducerId);
        if (agreementError || !Array.isArray(agreements)) throw new Error("Could not verify agreement dependencies; permanent removal denied.");
        if (!agreements.length) return 0;
        const { count, error } = await db.from(dependency.table).select("id", { count: "exact", head: true })
          .in(dependency.column, agreements.map(row => row.id));
        if (error || !Number.isSafeInteger(count) || count < 0) {
          throw new Error(`Could not verify ${dependency.label}; permanent removal denied.`);
        }
        return count;
      }
      const { count, error } = await db.from(dependency.table).select("id", { count: "exact", head: true })
        .eq(dependency.column, introducerId);
      if (error || !Number.isSafeInteger(count) || count < 0) {
        throw new Error(`Could not verify ${dependency.label}; permanent removal denied.`);
      }
      return count;
    },
    async deleteIntroducer(id, actorId) {
      const removed = await queryResult(db.rpc("remove_test_organisation_introducer", {
        p_introducer_id: id,
        p_actor_id: actorId,
      }));
      if (removed !== true) throw new Error("Introducer could not be removed; refresh and check dependencies.");
    },
    async recordEvent({ introducerId, actorId, eventType, details }) {
      await queryResult(db.from("organisation_introducer_lifecycle_events").insert({
        introducer_id: introducerId,
        introducer_ref: introducerId,
        actor_id: actorId,
        event_type: eventType,
        details,
      }));
    },
    async recordRemovedEvent({ introducerId, actorId }) {
      await queryResult(db.from("organisation_introducer_lifecycle_events").insert({
        introducer_id: null,
        introducer_ref: introducerId,
        actor_id: actorId,
        event_type: "removed",
        details: {},
      }));
    },
  };
}

async function authorize(request) {
  let databaseMatches = false;
  try {
    const url = new URL(String(process.env.NEXT_PUBLIC_SUPABASE_URL || ""));
    databaseMatches = url.protocol === "https:" && url.hostname === `${ROOT_COMMERCIAL_SUPABASE_REF}.supabase.co` &&
      !url.username && !url.password && !url.port && url.pathname === "/" && !url.search && !url.hash &&
      String(process.env.NEXT_PUBLIC_SUPABASE_URL) === url.origin;
  } catch {}
  const rootDeployment = process.env.VERCEL_PROJECT_ID === ROOT_COMMERCIAL_VERCEL_PROJECT_ID &&
    process.env.VERCEL_ENV === "production" && process.env.VERCEL_GIT_COMMIT_REF === "main" &&
    process.env.ROOT_PRODUCTION_SUPABASE_PROJECT_REF === ROOT_COMMERCIAL_SUPABASE_REF && databaseMatches;
  if (!rootDeployment || isIntroducerDeployment()) {
    throw Object.assign(new Error("Root introducer administration is unavailable in this deployment."), { status: 404 });
  }
  try { return await rootAgreementAccess(request); }
  catch { throw Object.assign(new Error("Verified Root administrator required."), { status: 403 }); }
}

export async function POST(request) {
  let access;
  try { access = await authorize(request); }
  catch (error) { return reply({ error: error.message }, error.status || 403); }
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 3000) return reply({ error: "Request too large." }, 413);
    body = JSON.parse(raw);
  } catch { return reply({ error: "Invalid request." }, 400); }
  const { action, introducerId } = body || {};
  if (!uuid(introducerId) || !["archive", "restore"].includes(action)) return reply({ error: "Invalid housekeeping action." }, 400);

  const repo = repository(access.db);
  try {
    const result = action === "archive"
      ? await archiveIntroducer({
          repository: repo,
          introducerId,
          actorId: access.user.id,
          revokeDemoAccess: async ({ introducerId: targetId, actorId }) => {
            const revoked = await revokeIntroducerPreviewAccess({ db: access.db, introducerId: targetId, actorId, request });
            if (revoked.state !== "revoked") throw new Error("Demo invitation or access is not in a revocable state.");
          },
        })
      : await restoreIntroducer({ repository: repo, introducerId, actorId: access.user.id });
    return reply({ success: true, ...result });
  } catch (error) {
    return reply({ error: error?.message || "Introducer housekeeping action failed." }, error.status || 409);
  }
}

export async function DELETE(request) {
  let access;
  try { access = await authorize(request); }
  catch (error) { return reply({ error: error.message }, error.status || 403); }
  const introducerId = new URL(request.url).searchParams.get("introducerId");
  if (!uuid(introducerId)) return reply({ error: "Invalid introducer." }, 400);
  try {
    const result = await removeIntroducer({ repository: repository(access.db), introducerId, actorId: access.user.id });
    return reply({ success: true, ...result });
  } catch (error) {
    return reply({ error: error?.message || "Permanent removal was denied." }, error.status || 409);
  }
}

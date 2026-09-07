import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { organisationAdminErrorResponse, requireOrganisationAdmin } from "../../../../lib/organisationAdminServerAuth";

export const runtime = "nodejs";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

function createDeliveryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Root workforce invitation delivery is not configured.");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function mailer() {
  const user = String(process.env.ROOT_SMTP_USER || "").trim();
  const pass = String(process.env.ROOT_SMTP_PASSWORD || "").trim();
  const from = String(process.env.ROOT_SMTP_FROM || user).trim();
  if (!user || !pass || !from) throw new Error("Root Workplace email is not configured.");
  return { from, transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const organisationId = url.searchParams.get("organisation_id") || "";
    const access = await requireOrganisationAdmin({ request, organisationId });
    const data = await access.supabase.rpc("list_workforce_invitations", {
      p_org: organisationId, p_search: url.searchParams.get("search") || "", p_status: url.searchParams.get("status") || "all",
      p_after: url.searchParams.get("after") || null, p_limit: Math.min(Number(url.searchParams.get("limit") || 50), 100),
      p_cutoff: url.searchParams.get("cutoff") || new Date().toISOString(), p_eligible_only: url.searchParams.get("eligible_only") === "true",
    });
    if (data.error) throw data.error;
    return Response.json(data.data || {});
  } catch (error) { return organisationAdminErrorResponse(error); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const organisationId = String(body?.organisation_id || "").trim();
    const access = await requireOrganisationAdmin({ request, organisationId });
    const ids = Array.isArray(body?.person_ids) ? [...new Set(body.person_ids.map(String))].slice(0, 500) : [];
    if (!ids.length) return Response.json({ error: "Select at least one eligible person." }, { status: 400 });
    const deliveryClient = createDeliveryClient();
    const { from, transporter } = mailer();
    const requestId = crypto.randomUUID();
    const results = [];
    for (const personId of ids) {
      const rawToken = crypto.randomBytes(32).toString("base64url");
      const claim = await deliveryClient.rpc("claim_workforce_invitation", { p_org: organisationId, p_person: personId, p_actor: access.user.id, p_request: requestId, p_hash: hash(rawToken) });
      if (claim.error) { results.push({ person_id: personId, status: "failed", error: claim.error.message }); continue; }
      const invite = claim.data;
      if (invite?.skipped) { results.push({ person_id: personId, status: "skipped", reason: invite.reason }); continue; }
      const link = `${new URL(request.url).origin}/organisation/join?organisation_id=${encodeURIComponent(organisationId)}&code=${encodeURIComponent(invite.organisation_code)}&token=${encodeURIComponent(rawToken)}`;
      try {
        const sent = await transporter.sendMail({ from, to: invite.email, subject: `Join ${invite.organisation_name} on Root`, text: `Hello ${invite.name || "there"},\n\nYou have been invited to join ${invite.organisation_name} on Root Workplace.\n\nAccept securely: ${link}\n\nThis invitation expires in 7 days.\n\nRoot Health` });
        await deliveryClient.rpc("finish_workforce_invitation", { p_id: invite.id, p_request: requestId, p_hash: hash(rawToken), p_outcome: "sent", p_message: sent.messageId || null });
        results.push({ person_id: personId, status: "sent" });
      } catch (sendError) {
        await deliveryClient.rpc("finish_workforce_invitation", { p_id: invite.id, p_request: requestId, p_hash: hash(rawToken), p_outcome: "unknown", p_message: sendError.message });
        results.push({ person_id: personId, status: "unknown" });
      }
    }
    return Response.json({ ok: true, request_id: requestId, results });
  } catch (error) { return organisationAdminErrorResponse(error); }
}

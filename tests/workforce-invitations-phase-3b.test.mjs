import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import crypto from "node:crypto";

const migration = new URL("../supabase/migrations/20260906_workforce_invitations.sql", import.meta.url);
const route = new URL("../app/api/organisation/workforce-invitations/route.js", import.meta.url);
const page = new URL("../app/organisation-structure/page.js", import.meta.url);
const join = new URL("../app/organisation/join/page.js", import.meta.url);

test("Phase 3B migration provides expiring, replay-safe employee invitations", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /organisation_employee_invites/);
  assert.match(sql, /token_hash text not null unique/);
  assert.match(sql, /expires_at <= now\(\)/);
  assert.match(sql, /accepted_at is not null/);
  assert.match(sql, /delivery_status = 'failed'/);
});

test("acceptance fails closed for wrong email, changed workforce email and cross organisation", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /i\.recipient_email <> verified_email/);
  assert.match(sql, /business_email_normalized is distinct from verified_email/);
  assert.match(sql, /organisation_code = upper\(btrim\(p_code\)\)/);
  assert.match(sql, /organisation_id = org\.id/);
});

test("acceptance preserves roles and prevents duplicate membership links", async () => {
  const sql = await readFile(migration, "utf8");
  assert.match(sql, /role, organisation_unit_id/);
  assert.match(sql, /'employee'/);
  assert.match(sql, /on conflict \(organisation_id, user_id\) do nothing/);
  assert.match(sql, /Membership is linked to another workforce person/);
});

test("admin endpoint uses bounded batches, claim/finalize retry protocol and SMTP only after claim", async () => {
  const source = await readFile(route, "utf8");
  assert.match(source, /slice\(0, 500\)/);
  assert.match(source, /claim_workforce_invitation/);
  assert.match(source, /finish_workforce_invitation/);
  assert.match(source, /ROOT_SMTP_/);
  assert.match(source, /requireOrganisationAdmin/);
});

test("workforce UI supports search, individual selection, select all and send", async () => {
  const source = await readFile(page, "utf8");
  assert.match(source, /Search workforce/);
  assert.match(source, /Select all not invited/);
  assert.match(source, /Send invitations/);
  assert.match(source, /checked=\{selectedPeople\.has/);
  assert.match(source, /root_status/);
});

test("employee join route uses the atomic invitation RPC", async () => {
  const source = await readFile(join, "utf8");
  assert.match(source, /accept_workforce_invitation/);
  assert.match(source, /p_token_hash/);
});

test("Phase 3A migration remains separate and unchanged by invitation migration", async () => {
  const sql = await readFile(migration, "utf8");
  assert.doesNotMatch(sql, /organisation_hr_invites/);
  assert.doesNotMatch(sql, /organisation_setup_invites/);
  assert.doesNotMatch(sql, /hr_admin|organisation_admin.*insert/i);
});

test("delivery RPC execution is restricted to service_role while client RPC grants remain authenticated", async () => {
  const sql = await readFile(migration, "utf8");
  for (const signature of ["claim_workforce_invitation(uuid,uuid,uuid,uuid,text)", "finish_workforce_invitation(uuid,uuid,text,text,text)"]) {
    assert.ok(sql.includes(`revoke all on function public.${signature} from public, anon, authenticated;`));
    const grants = sql.split("\n").filter((line) => line.startsWith(`grant execute on function public.${signature} `));
    assert.deepEqual(grants, [`grant execute on function public.${signature} to service_role;`]);
  }
  assert.ok(sql.includes("grant execute on function public.list_workforce_invitations(uuid,text,text,uuid,integer,timestamptz,boolean) to authenticated;"));
  assert.ok(sql.includes("grant execute on function public.accept_workforce_invitation(text,uuid,text) to authenticated;"));
});

// Evaluate the actual handler with injected clients and SMTP; no network or email.
async function deliveryHarness({ denied = false, missingKey = false, smtpFailure = false } = {}) {
  const calls = [];
  const source = (await readFile(route, "utf8")).replace(/^import .*;\r?$/gm, "").replace(/export /g, "");
  const delivery = { rpc: async (name, args) => {
    calls.push({ name, args });
    return { data: name === "claim_workforce_invitation" ? { id: "invite", name: "Test", email: "test@example.invalid", organisation_name: "Test", organisation_code: "TEST" } : true };
  } };
  const authenticated = { rpc: async (name) => {
    assert.equal(name, "list_workforce_invitations");
    calls.push({ name }); return { data: { rows: [] } };
  } };
  const build = new Function("crypto", "nodemailer", "createClient", "requireOrganisationAdmin", "organisationAdminErrorResponse", "process", `${source}\nreturn { GET, POST };`);
  const handlers = build(crypto, { createTransport: () => ({ sendMail: async () => {
    calls.push({ name: "mock-mail" }); if (smtpFailure) throw new Error("Mock SMTP uncertainty"); return { messageId: "mock-message" };
  } }) }, (url, key, options) => {
    calls.push({ name: "service-client" });
    assert.equal(url, "https://example.invalid"); assert.equal(key, "mock-service-key");
    assert.deepEqual(options, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return delivery;
  }, async () => {
    calls.push({ name: "authorize" }); if (denied) throw new Error("Denied");
    return { user: { id: "verified-admin" }, supabase: authenticated };
  }, () => Response.json({ error: "Unavailable" }, { status: 403 }), { env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_ROLE_KEY: missingKey ? "" : "mock-service-key",
    ROOT_SMTP_USER: "mock@example.invalid", ROOT_SMTP_PASSWORD: "mock-only",
  } });
  const request = { url: "https://example.invalid/api/organisation/workforce-invitations?organisation_id=org", json: async () => ({ organisation_id: "org", person_ids: ["person"], p_actor: "forged-actor" }) };
  return { handlers, request, calls };
}

test("POST authorizes the human before privileged delivery and uses the verified actor", async () => {
  const { handlers, request, calls } = await deliveryHarness();
  assert.equal((await handlers.POST(request)).status, 200);
  assert.deepEqual(calls.map((call) => call.name), ["authorize", "service-client", "claim_workforce_invitation", "mock-mail", "finish_workforce_invitation"]);
  assert.equal(calls[2].args.p_actor, "verified-admin");
  assert.equal(calls[4].args.p_outcome, "sent");
});

test("SMTP failure finalizes through the privileged client too", async () => {
  const { handlers, request, calls } = await deliveryHarness({ smtpFailure: true });
  await handlers.POST(request);
  assert.equal(calls.at(-1).name, "finish_workforce_invitation");
  assert.equal(calls.at(-1).args.p_outcome, "unknown");
});

test("denied callers never create a privileged client or reach delivery", async () => {
  const { handlers, request, calls } = await deliveryHarness({ denied: true });
  assert.equal((await handlers.POST(request)).status, 403);
  assert.deepEqual(calls.map((call) => call.name), ["authorize"]);
});

test("missing service credentials fail closed before delivery", async () => {
  const { handlers, request, calls } = await deliveryHarness({ missingKey: true });
  assert.equal((await handlers.POST(request)).status, 403);
  assert.deepEqual(calls.map((call) => call.name), ["authorize"]);
});

test("GET listing retains the authenticated client and needs no service credentials", async () => {
  const { handlers, request, calls } = await deliveryHarness({ missingKey: true });
  assert.equal((await handlers.GET(request)).status, 200);
  assert.deepEqual(calls.map((call) => call.name), ["authorize", "list_workforce_invitations"]);
});

export class OrganisationAdminAccessError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "OrganisationAdminAccessError";
    this.status = status;
  }
}

function readBearerToken(request) {
  const value = request?.headers?.get?.("authorization") || "";
  return value.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

async function createAuthenticatedClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new OrganisationAdminAccessError("Organisation authentication is not configured.", 500);
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireOrganisationAdmin({ request, organisationId, createClientForToken = createAuthenticatedClient }) {
  const accessToken = readBearerToken(request);
  if (!accessToken) throw new OrganisationAdminAccessError("Authentication is required.", 401);
  if (!String(organisationId || "").trim()) throw new OrganisationAdminAccessError("Organisation access is required.", 403);

  const supabase = await createClientForToken(accessToken);
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  const user = authData?.user;
  if (authError || !user?.id) throw new OrganisationAdminAccessError("Authentication is invalid.", 401);

  const { data, error } = await supabase
    .from("organisation_members")
    .select("id, organisation_id, user_id, role")
    .eq("user_id", user.id)
    .eq("organisation_id", organisationId)
    .eq("role", "organisation_admin")
    .limit(1);
  if (error || !data?.[0]) throw new OrganisationAdminAccessError("Organisation Administrator access is required.", 403);

  return { accessToken, supabase, user, membership: data[0], organisationId: data[0].organisation_id };
}

export function organisationAdminErrorResponse(error) {
  const status = error instanceof OrganisationAdminAccessError ? error.status : 500;
  return Response.json({ error: status === 401 ? "Authentication is required." : status === 403 ? "Organisation Administrator access is required." : "Root could not apply this organisation structure." }, { status });
}

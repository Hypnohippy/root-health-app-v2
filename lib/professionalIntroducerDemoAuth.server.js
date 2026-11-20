const ACCESS_TABLE = "professional_introducer_demo_access";
import { introducerDeploymentStatus } from "./introducerRestrictedActions.server.js";

export class ProfessionalDemoAccessError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = "ProfessionalDemoAccessError";
    this.status = status;
  }
}

function bearerToken(request) {
  return request?.headers?.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

export function professionalDemoEnabled(env = process.env) {
  return env.PROFESSIONAL_INTRODUCER_DEMO_ENABLED === "true" &&
    introducerDeploymentStatus(env) === "introducer_verified";
}

async function defaultAuthClient(token) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ProfessionalDemoAccessError("Demo sign-in is unavailable.", 503);
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function defaultAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ProfessionalDemoAccessError("Demo access is not configured.", 503);
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isMissingRelation(error) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function authorizeProfessionalIntroducer({
  request,
  enabled = professionalDemoEnabled(),
  authClientFactory = defaultAuthClient,
  adminClientFactory = defaultAdminClient,
  now = new Date(),
} = {}) {
  if (!enabled) throw new ProfessionalDemoAccessError("This demonstration is unavailable.", 404);
  const token = bearerToken(request);
  if (!token) throw new ProfessionalDemoAccessError("Sign in with your invited Root Health account.", 401);

  let authClient;
  let admin;
  try {
    authClient = await authClientFactory(token);
    admin = await adminClientFactory();
  } catch (error) {
    if (error instanceof ProfessionalDemoAccessError) throw error;
    throw new ProfessionalDemoAccessError("Demo sign-in is unavailable.", 503);
  }

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user?.id) throw new ProfessionalDemoAccessError("Sign in with your invited Root Health account.", 401);
  if (!user.email || !(user.email_confirmed_at || user.confirmed_at)) {
    throw new ProfessionalDemoAccessError("Verify your invited email address before opening the demonstration.", 403);
  }

  const { data: grant, error: grantError } = await admin
    .from(ACCESS_TABLE)
    .select("id, user_id, consultant_label, expires_at, revoked_at, demo_organisation_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (grantError) throw new ProfessionalDemoAccessError("Demo access could not be verified.", 503);
  const expiry = new Date(grant?.expires_at).getTime();
  if (!grant || grant.user_id !== user.id || grant.revoked_at || !Number.isFinite(expiry) || expiry <= now.getTime()) {
    throw new ProfessionalDemoAccessError("Your professional demonstration access has expired or been revoked.", 403);
  }

  // Commercial onboarding is handled by Root's existing /admin/introducers
  // system. This grant is usable only after Root has separately mapped a
  // fictional employer and populated its synthetic workforce and history.
  const demoOrganisationId = grant.demo_organisation_id;
  if (!demoOrganisationId) {
    throw new ProfessionalDemoAccessError("Root Health is still preparing your fictional employer demonstration.", 403);
  }
  const [organisationResult, memberResult, baselineResult] = await Promise.all([
    admin.from("organisations").select("id, status").eq("id", demoOrganisationId).maybeSingle(),
    admin.from("organisation_members").select("id, profile_key, role, user_id").eq("organisation_id", demoOrganisationId),
    admin.from("wellbeing_assessments").select("profile_key").eq("organisation_id", demoOrganisationId).eq("assessment_type", "baseline"),
  ]);
  if (organisationResult.error || memberResult.error || baselineResult.error) {
    throw new ProfessionalDemoAccessError("The fictional employer setup could not be verified.", 503);
  }
  const demoMembers = Array.isArray(memberResult.data) ? memberResult.data : [];
  const memberKeys = new Set(demoMembers
    .filter((member) => member.role === "employee" && !member.user_id)
    .map((member) => member.profile_key)
    .filter(Boolean));
  const baselineKeys = new Set((Array.isArray(baselineResult.data) ? baselineResult.data : [])
    .map((row) => row.profile_key)
    .filter((key) => memberKeys.has(key)));
  if (organisationResult.data?.id !== demoOrganisationId || organisationResult.data?.status !== "demo" || memberKeys.size < 5 || baselineKeys.size < 5) {
    throw new ProfessionalDemoAccessError("Root Health is still preparing your fictional employer demonstration.", 403);
  }

  // When the isolated Preview has the core customer tables, refuse any account
  // with existing customer access. A fresh, dedicated Supabase project does not
  // contain those production tables; only that specific missing-table condition
  // is acceptable because this grant and its data live solely in the isolated DB.
  const { data: memberships, error: membershipError } = await admin
    .from("organisation_members").select("id").eq("user_id", user.id).limit(1);
  const { data: subscriptions, error: subscriptionError } = await admin
    .from("personal_subscriptions").select("user_id")
    .eq("user_id", user.id).eq("subscription_status", "active").eq("subscription_active", true).limit(1);
  if (
    (membershipError && !isMissingRelation(membershipError)) ||
    (subscriptionError && !isMissingRelation(subscriptionError))
  ) {
    throw new ProfessionalDemoAccessError("Demo account isolation could not be verified.", 503);
  }
  if (memberships?.length || subscriptions?.length) {
    throw new ProfessionalDemoAccessError("This account has customer access and cannot be used for the isolated demonstration.", 403);
  }

  return {
    userId: user.id,
    email: user.email,
    user,
    userClient: authClient,
    grant: {
      id: grant.id,
      consultantLabel: grant.consultant_label,
      expiresAt: grant.expires_at,
      demoOrganisationId,
    },
    admin,
  };
}

export function professionalDemoErrorResponse(error) {
  const status = error instanceof ProfessionalDemoAccessError ? error.status : 500;
  const message = status === 500 ? "The demonstration is temporarily unavailable." : error.message;
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

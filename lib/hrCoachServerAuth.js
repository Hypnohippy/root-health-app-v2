export const HR_COACH_ROLES = ["organisation_admin", "hr_admin"];

export class HRCoachAccessError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "HRCoachAccessError";
    this.status = status;
  }
}

function bearerToken(request) {
  const header = request?.headers?.get?.("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function createAuthenticatedClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new HRCoachAccessError(
      "HR Coach authentication is not configured.",
      500
    );
  }

  const { createClient } = await import("@supabase/supabase-js");

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireHRCoachOrganisationAccess({
  request,
  organisationId,
  createClientForToken = createAuthenticatedClient,
}) {
  const accessToken = bearerToken(request);

  if (!accessToken) {
    throw new HRCoachAccessError("Authentication is required.", 401);
  }

  if (!String(organisationId || "").trim()) {
    throw new HRCoachAccessError(
      "An authorised organisation membership is required.",
      403
    );
  }

  const supabase = await createClientForToken(accessToken);
  const { data: userData, error: userError } =
    await supabase.auth.getUser(accessToken);
  const user = userData?.user || null;

  if (userError || !user?.id) {
    throw new HRCoachAccessError("Authentication is invalid.", 401);
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("organisation_members")
    .select("id, organisation_id, user_id, profile_key, role")
    .eq("user_id", user.id)
    .eq("organisation_id", organisationId)
    .in("role", HR_COACH_ROLES)
    .limit(1);

  if (membershipError) {
    throw new HRCoachAccessError(
      "Root could not verify the organisation membership.",
      403
    );
  }

  const membership = Array.isArray(memberships)
    ? memberships[0] || null
    : null;

  if (!membership) {
    throw new HRCoachAccessError(
      "An authorised organisation membership is required.",
      403
    );
  }

  return {
    accessToken,
    supabase,
    user,
    membership,
    organisationId: membership.organisation_id,
  };
}

function assertQuery(result, source) {
  if (result?.error) {
    throw new Error(`Root could not load authorised ${source} evidence.`);
  }
  return result?.data;
}

export async function loadAuthorisedHRCoachEvidence({
  supabase,
  organisationId,
  buildSharedContext,
}) {
  const [
    organisationResult,
    membersResult,
    assessmentsResult,
    mindResult,
    journalResult,
    voiceResult,
    reviewsResult,
    organisationContext,
  ] = await Promise.all([
    supabase.from("organisations").select("*").eq("id", organisationId).maybeSingle(),
    supabase.from("organisation_members").select("*").eq("organisation_id", organisationId),
    supabase.from("wellbeing_assessments").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: true }),
    supabase.from("mind_entries").select("*").eq("organisation_id", organisationId).limit(200),
    supabase.from("journal_entries").select("*").eq("organisation_id", organisationId).limit(200),
    supabase.from("voice_sessions").select("*").eq("organisation_id", organisationId).limit(200),
    supabase.from("organisation_learning_reviews").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: true }).limit(24),
    buildSharedContext({ supabase, organisationId }),
  ]);

  const organisation = assertQuery(organisationResult, "organisation");
  if (!organisation) {
    throw new Error("Root could not load the authorised organisation.");
  }

  return {
    organisation,
    organisationContext,
    members: assertQuery(membersResult, "membership") || [],
    assessments: assertQuery(assessmentsResult, "assessment") || [],
    mindEntries: assertQuery(mindResult, "Mind") || [],
    journalEntries: assertQuery(journalResult, "journal") || [],
    voiceSessions: assertQuery(voiceResult, "voice") || [],
    organisationReviews: assertQuery(reviewsResult, "organisation review") || [],
  };
}

export function hrCoachAccessResponse(error) {
  const status = error instanceof HRCoachAccessError ? error.status : 500;
  return Response.json(
    {
      error:
        status === 401
          ? "Authentication is required."
          : status === 403
            ? "This account cannot access HR Coach for that organisation."
            : "Root could not verify HR Coach access.",
    },
    { status }
  );
}

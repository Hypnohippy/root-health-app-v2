/**
 * Resolve the authenticated person's private Root identity.
 *
 * Supabase auth user_id -> profiles.user_id is the only authority here.
 * Browser profile keys are deliberately neither read nor accepted. Older
 * pages may continue to mirror a profile key in localStorage during the
 * Pass 1 migration, but that value must never select Personal evidence.
 */
export async function resolvePersonalRootContext({
  client = null,
} = {}) {
  const activeClient =
    client || (await import("./supabase.js")).supabase;

  const {
    data: { user },
    error: authError,
  } = await activeClient.auth.getUser();

  if (authError) {
    return {
      ok: false,
      reason: "authentication_error",
      error: authError,
      context: null,
    };
  }

  if (!user?.id) {
    return {
      ok: false,
      reason: "not_authenticated",
      error: null,
      context: null,
    };
  }

  const { data: profile, error: profileError } = await activeClient
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      reason: "profile_lookup_error",
      error: profileError,
      context: null,
    };
  }

  if (!profile?.profile_key) {
    return {
      ok: false,
      reason: "personal_profile_missing",
      error: null,
      context: null,
    };
  }

  return {
    ok: true,
    reason: "resolved",
    error: null,
    context: {
      scope: "personal",
      userId: user.id,
      profileKey: profile.profile_key,
      email: user.email || profile.email || "",
      displayName:
        profile.name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "",
      orientationCompleted:
        profile.orientation_completed === true,
      profile,
      authority: {
        authentication: "supabase_auth_user",
        ownershipRelation: "profiles.user_id",
        browserProfileKeyTrusted: false,
      },
    },
  };
}

export default resolvePersonalRootContext;

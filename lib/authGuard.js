import { supabase } from "./supabase";

const HR_ROLES = ["hr_admin", "organisation_admin"];

export async function getAuthenticatedMembership() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      membership: null,
      error: authError || new Error("No authenticated user."),
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organisation_members")
    .select(
      `
        id,
        organisation_id,
        user_id,
        profile_key,
        email,
        name,
        department,
        role,
        activated_at,
        baseline_completed_at
      `
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return {
      user,
      membership: null,
      error:
        membershipError ||
        new Error("No organisation membership was found for this account."),
    };
  }

  return {
    user,
    membership,
    error: null,
  };
}

export async function requireHRMembership() {
  const result = await getAuthenticatedMembership();

  if (result.error || !result.user || !result.membership) {
    return {
      ...result,
      allowed: false,
      redirectTo: "/login",
    };
  }

  if (!HR_ROLES.includes(result.membership.role)) {
    return {
      ...result,
      allowed: false,
      redirectTo: "/",
    };
  }

  return {
    ...result,
    allowed: true,
    redirectTo: null,
  };
}

export async function requireAuthenticatedMembership() {
  const result = await getAuthenticatedMembership();

  if (result.error || !result.user || !result.membership) {
    return {
      ...result,
      allowed: false,
      redirectTo: "/login",
    };
  }

  return {
    ...result,
    allowed: true,
    redirectTo: null,
  };
}

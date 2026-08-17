import { supabase } from "./supabase";
import { getRootIdentity } from "./rootIdentity";

const HR_ROLES = [
  "hr_admin",
  "organisation_admin",
];

/*
 * ROOT AUTH GUARD
 *
 * Root users may belong to more than one organisation.
 *
 * We therefore must NOT use .maybeSingle() against user_id
 * to decide which organisation the person is currently using.
 *
 * Root Identity is the source of truth for the active
 * Workplace organisation.
 */

export async function getAuthenticatedMembership() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      membership: null,
      error:
        authError ||
        new Error(
          "No authenticated user."
        ),
    };
  }

  const identity =
    await getRootIdentity();

  if (!identity) {
    return {
      user,
      membership: null,
      error: new Error(
        "Root could not establish the current identity."
      ),
    };
  }

  /*
   * Prefer the explicitly active Workplace organisation.
   */
  let membership =
    identity.workplace?.activeOrganisation ||
    null;

  /*
   * For users whose current experience does not expose an
   * active Workplace organisation, fall back to their
   * organisation memberships.
   *
   * This keeps the generic authenticated membership guard
   * useful for employee/member routes as well.
   */
  if (!membership) {
    const memberships =
      Array.isArray(identity.organisations)
        ? identity.organisations
        : [];

    if (memberships.length === 1) {
      membership = memberships[0];
    }
  }

  if (!membership) {
    return {
      user,
      membership: null,
      error: new Error(
        "No active organisation membership was found for this account."
      ),
    };
  }

  return {
    user,
    membership,
    error: null,
  };
}

export async function requireHRMembership() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      membership: null,
      error:
        authError ||
        new Error(
          "No authenticated user."
        ),
      allowed: false,
      redirectTo: "/login",
    };
  }

  const identity =
    await getRootIdentity();

  if (!identity) {
    return {
      user,
      membership: null,
      error: new Error(
        "Root could not establish the current identity."
      ),
      allowed: false,
      redirectTo: "/login",
    };
  }

  /*
   * HR routes must use the organisation Root Identity says
   * is currently active.
   */
  const membership =
    identity.workplace
      ?.activeOrganisation ||
    null;

  if (!membership) {
    return {
      user,
      membership: null,
      error: new Error(
        "No active Workplace organisation was found."
      ),
      allowed: false,
      redirectTo:
        identity.capabilities
          ?.canUseWorkplace
          ? "/choose-experience"
          : "/",
    };
  }

  if (
    !HR_ROLES.includes(
      membership.role
    )
  ) {
    return {
      user,
      membership,
      error: null,
      allowed: false,
      redirectTo: "/",
    };
  }

  return {
    user,
    membership,
    error: null,
    allowed: true,
    redirectTo: null,
  };
}

export async function requireAuthenticatedMembership() {
  const result =
    await getAuthenticatedMembership();

  if (
    result.error ||
    !result.user ||
    !result.membership
  ) {
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
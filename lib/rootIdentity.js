import { supabase } from "./supabase";

const IDENTITY_STORAGE_KEY =
  "root_identity_v1";

const EXPERIENCE_STORAGE_KEY =
  "root_active_experience_v1";

const ACTIVE_ORGANISATION_KEY =
  "root_active_organisation_v1";

export async function getRootIdentity() {
  const {
    data: {
      session,
    },
    error: sessionError,
  } =
    await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      "Root identity session error:",
      sessionError
    );

    return null;
  }

  const user =
    session?.user || null;

  if (!user) {
    clearRootIdentity();
    return null;
  }

  /*
   * PERSONAL PROFILE
   *
   * The authenticated Supabase user ID
   * is the source of truth for the
   * person's private Root identity.
   *
   * Organisation memberships must never
   * replace or redefine the personal
   * Root profile.
   */
  const {
    data: personalProfile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        `
          user_id,
          profile_key,
          name,
          email,
          orientation_completed
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (profileError) {
    console.error(
      "Root identity profile error:",
      profileError
    );
  }

  /*
   * ORGANISATION MEMBERSHIPS
   *
   * One authenticated Root user may
   * legitimately belong to:
   *
   * - no organisation
   * - one organisation
   * - several organisations
   *
   * They may also have a different role
   * or workplace identity in each.
   */
  const {
    data: memberships,
    error: membershipError,
  } =
    await supabase
      .from(
        "organisation_members"
      )
      .select(
        `
          id,
          organisation_id,
          organisation_unit_id,
          profile_key,
          email,
          name,
          department,
          role
        `
      )
      .eq(
        "user_id",
        user.id
      );

  if (membershipError) {
    console.error(
      "Root identity membership error:",
      membershipError
    );
  }

  const organisationMemberships =
    Array.isArray(memberships)
      ? memberships
      : [];

  /*
   * DIRECT PERSONAL SUBSCRIPTION
   *
   * Paid Personal entitlement belongs to the authenticated
   * Supabase user. Organisation membership remains a separate
   * access path and is never replaced by this record.
   */
  const {
    data: personalSubscriptions,
    error: personalSubscriptionError,
  } =
    await supabase
      .from("personal_subscriptions")
      .select(
        `
          user_id,
          plan,
          subscription_status,
          subscription_active,
          current_period_start,
          current_period_end
        `
      )
      .eq("user_id", user.id)
      .eq("subscription_status", "active")
      .eq("subscription_active", true)
      .order("current_period_end", { ascending: false })
      .limit(1);

  if (personalSubscriptionError) {
    console.error(
      "Root Personal subscription error:",
      personalSubscriptionError
    );
  }

  const activePersonalSubscription =
    Array.isArray(personalSubscriptions)
      ? personalSubscriptions[0] || null
      : null;

  const hasOrganisationAccess =
    organisationMemberships.length > 0;

  const canUsePersonal =
    Boolean(activePersonalSubscription) ||
    hasOrganisationAccess;

  /*
   * WORKPLACE-CAPABLE MEMBERSHIPS
   *
   * These are memberships that allow
   * access to the HR / organisation
   * side of Root.
   */
  const workplaceMemberships =
    organisationMemberships.filter(
      (membership) =>
        membership.role ===
          "hr_admin" ||
        membership.role ===
          "organisation_admin"
    );

  const canUseWorkplace =
    workplaceMemberships.length > 0;

  /*
   * ACTIVE ORGANISATION
   *
   * IMPORTANT:
   *
   * Organisation selection is resolved
   * across ALL memberships first.
   *
   * Role is determined AFTER the
   * organisation has been established.
   *
   * Root must never choose an HR
   * organisation merely because it is
   * the person's only HR membership.
   */
  const rememberedOrganisationId =
    localStorage.getItem(
      ACTIVE_ORGANISATION_KEY
    );

  const rememberedOrganisationMembership =
    organisationMemberships.find(
      (membership) =>
        membership.organisation_id ===
        rememberedOrganisationId
    ) || null;

  /*
   * Root may automatically establish an
   * organisation only when there is no
   * ambiguity.
   *
   * More than one membership and no
   * explicit valid choice = null.
   */
  const activeOrganisationMembership =
    rememberedOrganisationMembership ||
    (
      organisationMemberships.length ===
      1
        ? organisationMemberships[0]
        : null
    );

  /*
   * WORKPLACE CONTEXT
   *
   * The selected organisation only
   * becomes a Workplace organisation if
   * THIS membership has an HR role.
   *
   * An HR role in another organisation
   * must never leak across this boundary.
   */
  const activeWorkplaceOrganisation =
    activeOrganisationMembership &&
    (
      activeOrganisationMembership.role ===
        "hr_admin" ||
      activeOrganisationMembership.role ===
        "organisation_admin"
    )
      ? activeOrganisationMembership
      : null;

  /*
   * ACTIVE EXPERIENCE
   */
  const rememberedExperience =
    localStorage.getItem(
      EXPERIENCE_STORAGE_KEY
    );

  let activeExperience =
    rememberedExperience ===
    "workplace"
      ? "workplace"
      : "personal";

  /*
   * A remembered Workplace experience
   * is valid only when the CURRENTLY
   * selected organisation gives this
   * person Workplace capability.
   *
   * Example:
   *
   * Care Concern → employee
   * Final Test    → HR Admin
   *
   * Selecting Care Concern must not
   * silently resurrect Final Test merely
   * because that is where the HR role is.
   */
  if (
    activeExperience ===
      "workplace" &&
    !activeWorkplaceOrganisation
  ) {
    activeExperience =
      "personal";
  }

  /*
   * DISPLAY NAME
   *
   * Personal Root uses the private
   * personal profile name.
   *
   * Workplace Root uses the identity
   * recorded on the active Workplace
   * membership.
   */
  const personalDisplayName =
    personalProfile?.name || "";

  const workplaceDisplayName =
    activeWorkplaceOrganisation?.name ||
    "";

  const displayName =
    activeExperience === "workplace" &&
    workplaceDisplayName
      ? workplaceDisplayName
      : personalDisplayName ||
        activeOrganisationMembership
          ?.name ||
        organisationMemberships.find(
          (membership) =>
            membership.name
        )?.name ||
        "";

  /*
   * ROOT IDENTITY
   */
  const identity = {
    user: {
      id:
        user.id,

      email:
        user.email ||
        personalProfile?.email ||
        "",

      name:
        displayName,
    },

    personal: {
      enabled:
        canUsePersonal,

      subscription:
        activePersonalSubscription,

      accessSource:
        activePersonalSubscription
          ? "subscription"
          : hasOrganisationAccess
          ? "organisation"
          : null,

      profileKey:
        personalProfile?.profile_key ||
        null,

      hasProfile:
        Boolean(
          personalProfile
        ),

      orientationCompleted:
        Boolean(
          personalProfile
            ?.orientation_completed
        ),
    },

    /*
     * Every legitimate organisation
     * membership belonging to this
     * authenticated Root account.
     */
    organisations:
      organisationMemberships,

    /*
     * The organisation context selected
     * by the user, regardless of role.
     *
     * This is deliberately separate from
     * Workplace capability.
     */
    organisationContext: {
      activeMembership:
        activeOrganisationMembership,
    },

    workplace: {
      enabled:
        canUseWorkplace,

      memberships:
        workplaceMemberships,

      /*
       * Only populated when the CURRENT
       * selected organisation membership
       * actually carries an HR role.
       */
      activeOrganisation:
        activeWorkplaceOrganisation,
    },

    capabilities: {
      canUsePersonal:
        canUsePersonal,

      /*
       * Global capability:
       *
       * The person has at least one
       * Workplace-capable membership
       * somewhere.
       */
      canUseWorkplace:
        canUseWorkplace,

      isEmployee:
        organisationMemberships.some(
          (membership) =>
            membership.role ===
            "employee"
        ),

      isHR:
        canUseWorkplace,
    },

    activeExperience,
  };

  localStorage.setItem(
    IDENTITY_STORAGE_KEY,
    JSON.stringify(
      identity
    )
  );

  localStorage.setItem(
    EXPERIENCE_STORAGE_KEY,
    activeExperience
  );

  /*
   * Persist only a valid organisation
   * membership belonging to this
   * authenticated user.
   *
   * If Root cannot establish one,
   * remove the stored organisation
   * rather than guessing.
   */
  if (
    activeOrganisationMembership
      ?.organisation_id
  ) {
    localStorage.setItem(
      ACTIVE_ORGANISATION_KEY,
      activeOrganisationMembership
        .organisation_id
    );
  } else {
    localStorage.removeItem(
      ACTIVE_ORGANISATION_KEY
    );
  }

  return identity;
}

export function getStoredRootIdentity() {
  try {
    const storedIdentity =
      localStorage.getItem(
        IDENTITY_STORAGE_KEY
      );

    return storedIdentity
      ? JSON.parse(
          storedIdentity
        )
      : null;
  } catch (error) {
    console.error(
      "Stored Root identity error:",
      error
    );

    return null;
  }
}

export function setActiveExperience(
  experience
) {
  if (
    experience !==
      "personal" &&
    experience !==
      "workplace"
  ) {
    console.error(
      "Unknown Root experience:",
      experience
    );

    return;
  }

  const identity =
    getStoredRootIdentity();

  /*
   * Do not allow Workplace mode against
   * an organisation where this person
   * does not have Workplace capability.
   */
  if (
    experience ===
      "personal" &&
    identity &&
    !identity.capabilities
      ?.canUsePersonal
  ) {
    console.error(
      "Root cannot open Personal without an active subscription or organisation access."
    );

    return;
  }

  if (
    experience ===
      "workplace" &&
    identity &&
    !identity.workplace
      ?.activeOrganisation
  ) {
    console.error(
      "Root cannot open Workplace because the active organisation membership does not have Workplace permission."
    );

    return;
  }

  localStorage.setItem(
    EXPERIENCE_STORAGE_KEY,
    experience
  );

  if (!identity) {
    return;
  }

  const updatedIdentity = {
    ...identity,

    activeExperience:
      experience,

    user: {
      ...identity.user,

      name:
        experience ===
          "workplace" &&
        identity.workplace
          ?.activeOrganisation
          ?.name
          ? identity.workplace
              .activeOrganisation
              .name
          : identity.personal
              ?.hasProfile
          ? identity.user?.name
          : identity.user?.name ||
            "",
    },
  };

  localStorage.setItem(
    IDENTITY_STORAGE_KEY,
    JSON.stringify(
      updatedIdentity
    )
  );
}

export function setActiveOrganisation(
  organisationId
) {
  if (!organisationId) {
    return;
  }

  /*
   * Store the requested organisation.
   *
   * getRootIdentity() will verify this
   * against the authenticated user's
   * actual database memberships.
   */
  localStorage.setItem(
    ACTIVE_ORGANISATION_KEY,
    organisationId
  );

  const identity =
    getStoredRootIdentity();

  if (!identity) {
    return;
  }

  /*
   * Validate against ALL organisation
   * memberships — not merely HR ones.
   */
  const activeMembership =
    identity.organisations?.find(
      (membership) =>
        membership.organisation_id ===
        organisationId
    ) || null;

  if (!activeMembership) {
    /*
     * The stored identity does not show
     * permission for this organisation.
     *
     * Remove the request immediately.
     * A later getRootIdentity() will also
     * verify against the database.
     */
    localStorage.removeItem(
      ACTIVE_ORGANISATION_KEY
    );

    console.error(
      "Root cannot activate an organisation that does not belong to this account."
    );

    return;
  }

  const hasWorkplaceRole =
    activeMembership.role ===
      "hr_admin" ||
    activeMembership.role ===
      "organisation_admin";

  const activeWorkplaceOrganisation =
    hasWorkplaceRole
      ? activeMembership
      : null;

  /*
   * If someone switches from an HR
   * organisation to an employee-only
   * organisation while Workplace mode
   * was active, safely return them to
   * Personal Root.
   */
  const nextExperience =
    identity.activeExperience ===
      "workplace" &&
    !hasWorkplaceRole
      ? "personal"
      : identity.activeExperience ||
        "personal";

  localStorage.setItem(
    EXPERIENCE_STORAGE_KEY,
    nextExperience
  );

  const updatedIdentity = {
    ...identity,

    organisationContext: {
      ...identity
        .organisationContext,

      activeMembership,
    },

    workplace: {
      ...identity.workplace,

      activeOrganisation:
        activeWorkplaceOrganisation,
    },

    activeExperience:
      nextExperience,
  };

  localStorage.setItem(
    IDENTITY_STORAGE_KEY,
    JSON.stringify(
      updatedIdentity
    )
  );
}

export function clearRootIdentity() {
  localStorage.removeItem(
    IDENTITY_STORAGE_KEY
  );

  localStorage.removeItem(
    EXPERIENCE_STORAGE_KEY
  );

  localStorage.removeItem(
    ACTIVE_ORGANISATION_KEY
  );

  localStorage.removeItem(
    "root_hr_org_v1"
  );

  localStorage.removeItem(
    "root_profile_key_v1"
  );

  localStorage.removeItem(
    "root_pending_organisation_choices_v1"
  );
}

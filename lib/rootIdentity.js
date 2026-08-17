import { supabase } from "./supabase";

const IDENTITY_STORAGE_KEY = "root_identity_v1";
const EXPERIENCE_STORAGE_KEY = "root_active_experience_v1";
const ACTIVE_ORGANISATION_KEY = "root_active_organisation_v1";

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
   * The signed-in Supabase user ID is the source of truth.
   * We do not use organisation_members.profile_key to locate
   * the user's personal Root profile.
   */
  const { data: personalProfile, error: profileError } =
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
      .eq("user_id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error("Root identity profile error:", profileError);
  }

  /*
   * ORGANISATION MEMBERSHIPS
   *
   * A user may belong to zero, one, or several organisations.
   */
  const { data: memberships, error: membershipError } =
    await supabase
      .from("organisation_members")
      .select(
        `
          id,
          organisation_id,
          profile_key,
          email,
          name,
          department,
          role
        `
      )
      .eq("user_id", user.id);

  if (membershipError) {
    console.error(
      "Root identity membership error:",
      membershipError
    );
  }

  const organisationMemberships = memberships || [];

  const workplaceMemberships = organisationMemberships.filter(
    (membership) =>
      membership.role === "hr_admin" ||
      membership.role === "organisation_admin"
  );

  const canUseWorkplace = workplaceMemberships.length > 0;

  /*
   * ACTIVE EXPERIENCE
   */
  const rememberedExperience =
    localStorage.getItem(EXPERIENCE_STORAGE_KEY);

  let activeExperience =
    rememberedExperience === "workplace"
      ? "workplace"
      : "personal";

  if (
    activeExperience === "workplace" &&
    !canUseWorkplace
  ) {
    activeExperience = "personal";
  }

  /*
   * ACTIVE ORGANISATION
   */
  const rememberedOrganisationId =
    localStorage.getItem(ACTIVE_ORGANISATION_KEY);

  const rememberedWorkplaceMembership =
  workplaceMemberships.find(
    (membership) =>
      membership.organisation_id ===
      rememberedOrganisationId
  ) || null;

const activeOrganisation =
  rememberedWorkplaceMembership ||
  (workplaceMemberships.length === 1
    ? workplaceMemberships[0]
    : null);

    const personalDisplayName =
  personalProfile?.name || "";

const workplaceDisplayName =
  activeOrganisation?.name || "";

const displayName =
  activeExperience === "workplace" &&
  workplaceDisplayName
    ? workplaceDisplayName
    : personalDisplayName ||
      organisationMemberships.find(
        (membership) => membership.name
      )?.name ||
      "";

  /*
   * ROOT IDENTITY
   */
  const identity = {
    user: {
      id: user.id,
      email: user.email || personalProfile?.email || "",
      name: displayName,
    },

    personal: {
      enabled: true,
      profileKey: personalProfile?.profile_key || null,
      hasProfile: Boolean(personalProfile),
      orientationCompleted: Boolean(
        personalProfile?.orientation_completed
      ),
    },

    organisations: organisationMemberships,

    workplace: {
      enabled: canUseWorkplace,
      memberships: workplaceMemberships,
      activeOrganisation,
    },

    capabilities: {
      canUsePersonal: true,
      canUseWorkplace,
      isEmployee: organisationMemberships.some(
        (membership) => membership.role === "employee"
      ),
      isHR: canUseWorkplace,
    },

    activeExperience,
  };

  localStorage.setItem(
    IDENTITY_STORAGE_KEY,
    JSON.stringify(identity)
  );

  localStorage.setItem(
    EXPERIENCE_STORAGE_KEY,
    activeExperience
  );

  if (activeOrganisation?.organisation_id) {
  localStorage.setItem(
    ACTIVE_ORGANISATION_KEY,
    activeOrganisation.organisation_id
  );
} else if (workplaceMemberships.length > 1) {
  localStorage.removeItem(
    ACTIVE_ORGANISATION_KEY
  );
}

  return identity;
}

export function getStoredRootIdentity() {
  try {
    const storedIdentity = localStorage.getItem(
      IDENTITY_STORAGE_KEY
    );

    return storedIdentity
      ? JSON.parse(storedIdentity)
      : null;
  } catch (error) {
    console.error("Stored Root identity error:", error);
    return null;
  }
}

export function setActiveExperience(experience) {
  if (
    experience !== "personal" &&
    experience !== "workplace"
  ) {
    console.error(
      "Unknown Root experience:",
      experience
    );
    return;
  }

  localStorage.setItem(
    EXPERIENCE_STORAGE_KEY,
    experience
  );

  const identity = getStoredRootIdentity();

  if (!identity) {
    return;
  }

  const updatedIdentity = {
    ...identity,
    activeExperience: experience,
  };

  localStorage.setItem(
    IDENTITY_STORAGE_KEY,
    JSON.stringify(updatedIdentity)
  );
}

export function setActiveOrganisation(organisationId) {
  if (!organisationId) {
    return;
  }

  localStorage.setItem(
    ACTIVE_ORGANISATION_KEY,
    organisationId
  );

  const identity = getStoredRootIdentity();

  if (!identity) {
    return;
  }

  const activeOrganisation =
    identity.workplace?.memberships?.find(
      (membership) =>
        membership.organisation_id === organisationId
    ) || null;

  const updatedIdentity = {
    ...identity,
    workplace: {
      ...identity.workplace,
      activeOrganisation,
    },
  };

  localStorage.setItem(
    IDENTITY_STORAGE_KEY,
    JSON.stringify(updatedIdentity)
  );
}

export function clearRootIdentity() {
  localStorage.removeItem(IDENTITY_STORAGE_KEY);
  localStorage.removeItem(EXPERIENCE_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_ORGANISATION_KEY);
  localStorage.removeItem("root_hr_org_v1");
  localStorage.removeItem("root_profile_key_v1");
}
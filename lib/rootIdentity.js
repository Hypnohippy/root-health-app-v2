import { supabase } from "./supabase";

const IDENTITY_STORAGE_KEY = "root_identity_v1";
const EXPERIENCE_STORAGE_KEY = "root_active_experience_v1";
const ACTIVE_ORGANISATION_KEY = "root_active_organisation_v1";

export async function getRootIdentity() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Root identity user error:", userError);
    return null;
  }

  if (!user) {
    clearRootIdentity();
    return null;
  }

  const { data: memberships, error: membershipError } = await supabase
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
    console.error("Root identity membership error:", membershipError);
  }

  const organisationMemberships = memberships || [];

  const storedProfileKey = localStorage.getItem("root_profile_key_v1");

  const membershipProfileKey = organisationMemberships.find(
    (membership) => membership.profile_key
  )?.profile_key;

  const profileKey = storedProfileKey || membershipProfileKey || null;

  let personalProfile = null;

  if (profileKey) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_key, orientation_completed")
      .eq("profile_key", profileKey)
      .maybeSingle();

    if (profileError) {
      console.error("Root identity profile error:", profileError);
    }

    personalProfile = profile || null;
  }

  const workplaceMemberships = organisationMemberships.filter(
    (membership) =>
      membership.role === "hr_admin" ||
      membership.role === "organisation_admin"
  );

  const rememberedExperience =
    localStorage.getItem(EXPERIENCE_STORAGE_KEY);

  const canUseWorkplace = workplaceMemberships.length > 0;

  let activeExperience = rememberedExperience || "personal";

  if (activeExperience === "workplace" && !canUseWorkplace) {
    activeExperience = "personal";
  }

  const rememberedOrganisationId = localStorage.getItem(
    ACTIVE_ORGANISATION_KEY
  );

  const activeOrganisation =
    workplaceMemberships.find(
      (membership) =>
        membership.organisation_id === rememberedOrganisationId
    ) ||
    workplaceMemberships[0] ||
    null;

  const identity = {
    user: {
      id: user.id,
      email: user.email || "",
      name:
        organisationMemberships.find((membership) => membership.name)?.name ||
        "",
    },

    personal: {
      enabled: true,
      profileKey,
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

  if (profileKey) {
    localStorage.setItem("root_profile_key_v1", profileKey);
  }

  if (activeOrganisation?.organisation_id) {
    localStorage.setItem(
      ACTIVE_ORGANISATION_KEY,
      activeOrganisation.organisation_id
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
    console.error("Unknown Root experience:", experience);
    return;
  }

  localStorage.setItem(
    EXPERIENCE_STORAGE_KEY,
    experience
  );

  const identity = getStoredRootIdentity();

  if (identity) {
    const updatedIdentity = {
      ...identity,
      activeExperience: experience,
    };

    localStorage.setItem(
      IDENTITY_STORAGE_KEY,
      JSON.stringify(updatedIdentity)
    );
  }
}

export function setActiveOrganisation(organisationId) {
  if (!organisationId) return;

  localStorage.setItem(
    ACTIVE_ORGANISATION_KEY,
    organisationId
  );

  const identity = getStoredRootIdentity();

  if (!identity) return;

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
}

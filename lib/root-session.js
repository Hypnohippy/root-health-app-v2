export function getRootSession() {
  if (typeof window === "undefined") {
    return {
      profileKey: null,
      profile: null,
      organisation: null,
      hrOrganisation: null,
      hasProfile: false,
      hasOrganisation: false,
    };
  }

  const profileKey = localStorage.getItem("root_profile_key_v1");

  const profile = JSON.parse(
    localStorage.getItem("root_profile_v1") || "null"
  );

  const organisation = JSON.parse(
    localStorage.getItem("root_organisation_v1") || "null"
  );

  const hrOrganisation = JSON.parse(
    localStorage.getItem("root_hr_org_v1") || "null"
  );

  return {
    profileKey,
    profile,
    organisation,
    hrOrganisation,
    hasProfile: Boolean(profileKey),
    hasOrganisation: Boolean(
      organisation?.organisation_id || hrOrganisation?.organisation_id
    ),
  };
}

export function requireRootProfile() {
  const session = getRootSession();

  if (!session.hasProfile) {
    window.location.href = "/reconnect";
    return null;
  }

  return session;
}

export function requireRootOrganisation() {
  const session = getRootSession();

  if (!session.hasOrganisation) {
    window.location.href = "/organisation/join";
    return null;
  }

  return session;
}

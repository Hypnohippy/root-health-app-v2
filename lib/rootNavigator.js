export function getRootDestination(identity) {
  // Nobody signed in
  if (!identity) {
    return "/login";
  }

  // Personal profile not yet created
  if (!identity.personal?.hasProfile) {
    return "/welcome";
  }

  // Orientation not completed
  if (!identity.personal?.orientationCompleted) {
    return "/orientation";
  }

  // No Workplace capability
  if (!identity.capabilities?.canUseWorkplace) {
    return "/";
  }

  // Workplace users

  switch (identity.activeExperience) {
    case "workplace":
      return "/org-insights";

    case "personal":
      return "/";

    default:
      return "/choose-experience";
  }
}

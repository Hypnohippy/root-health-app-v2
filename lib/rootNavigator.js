const PUBLIC_ROUTES = [
  "/welcome",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/organisation/join",
  "/organisation/register",
];

const ONBOARDING_ROUTES = [
  "/orientation",
  "/assessment",
];

const PERSONAL_ROUTES = [
  "/",
  "/coach",
  "/assessment",
  "/playbook",
  "/journal",
  "/body",
  "/mind",
  "/insights",
  "/profile",
];

const WORKPLACE_ROUTES = [
  "/org-insights",
];

function matchesRoute(pathname, routes) {
  return routes.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export function getRootDestination(identity, pathname = "/") {
  // Public pages are available without authentication.
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return null;
  }

  // Nobody signed in.
  if (!identity) {
    return "/welcome";
  }

  // Personal profile not yet created.
  if (!identity.personal?.hasProfile) {
    return "/welcome";
  }

  // Orientation is incomplete.
  // Assessment remains available because it forms part of onboarding.
  if (!identity.personal?.orientationCompleted) {
    if (matchesRoute(pathname, ONBOARDING_ROUTES)) {
      return null;
    }

    return "/orientation";
  }

  const canUseWorkplace =
    identity.capabilities?.canUseWorkplace === true;

  const activeExperience =
    identity.activeExperience || "personal";

  // The selector is only available to genuine Workplace users.
  if (pathname === "/choose-experience") {
    return canUseWorkplace ? null : "/";
  }

  // Workplace pages require Workplace permission and experience.
  if (matchesRoute(pathname, WORKPLACE_ROUTES)) {
    if (!canUseWorkplace) {
      return "/";
    }

    if (activeExperience !== "workplace") {
      return "/";
    }

    return null;
  }

  // Personal pages remain hidden while Workplace is active.
  if (matchesRoute(pathname, PERSONAL_ROUTES)) {
    if (canUseWorkplace && activeExperience === "workplace") {
      return "/org-insights";
    }

    return null;
  }

  // Do not interfere with unknown routes or Next.js 404 handling.
  return null;
}
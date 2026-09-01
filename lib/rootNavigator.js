const PUBLIC_ROUTES = [

  "/welcome",

  "/login",

  "/forgot-password",

  "/reset-password",

  "/personal",

  "/personal/join",

  "/referral",

  "/organisation/join",
  "/organisation/hr-join",
  "/organisation/register",

  "/organisation-learning",

  "/organisations",

"/workplace-applications",

"/workplace-setup",

];



const ONBOARDING_ROUTES = [

  "/orientation",

  "/assessment",

];



const PERSONAL_ROUTES = [

  "/",

  "/orientation",

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



    return (

      pathname === route ||

      pathname.startsWith(`${route}/`)

    );

  });

}



export function getRootDestination(

  identity,

  pathname = "/"

) {

  // Public pages remain available without authentication.

  if (matchesRoute(pathname, PUBLIC_ROUTES)) {

    return null;

  }



  // Nobody is signed in.

  if (!identity) {

    return "/welcome";

  }



  const canUseWorkplace =

    identity.capabilities?.canUseWorkplace === true;



  const canUsePersonal =

    identity.capabilities?.canUsePersonal === true;



  const activeExperience =

    identity.activeExperience || "personal";



  /*

   * WORKPLACE ACCESS MUST BE CHECKED BEFORE

   * PERSONAL PROFILE AND ORIENTATION.

   *

   * An HR user may use Workplace without first

   * creating a personal Root profile.

   */

  if (matchesRoute(pathname, WORKPLACE_ROUTES)) {

    if (!canUseWorkplace) {

      return "/";

    }



    return null;

  }



  // Only genuine Workplace users may use the selector.

  if (pathname === "/choose-experience") {

    return canUseWorkplace ? null : "/";

  }



  /*

   * Everything below this point relates to

   * the Personal Root experience.

   */



  if (matchesRoute(pathname, PERSONAL_ROUTES)) {

    if (!canUsePersonal) {

      return "/personal/join";

    }

    // A newly paid Personal subscriber may not have a profile yet.
    // Let onboarding create it; organisation-only users keep their
    // existing profile/setup routing.

    if (!identity.personal?.hasProfile) {

      if (identity.personal?.subscription) {

        return matchesRoute(pathname, ONBOARDING_ROUTES)
          ? null
          : "/orientation";

      }

      return "/welcome";

    }



    // Orientation must be completed before using Root Personal.

    // Orientation and assessment remain available during onboarding.

    if (!identity.personal?.orientationCompleted) {

      if (matchesRoute(pathname, ONBOARDING_ROUTES)) {

        return null;

      }



      return "/orientation";

    }



    // HR users currently operating in Workplace

    // are returned to their Workplace dashboard.

    if (

      canUseWorkplace &&

      activeExperience === "workplace"

    ) {

      return "/org-insights";

    }



    return null;

  }



  // Leave unknown routes to Next.js and its 404 handling.

  return null;

}

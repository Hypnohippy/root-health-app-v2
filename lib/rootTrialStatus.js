const DAY_IN_MS = 24 * 60 * 60 * 1000;

function safeDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function differenceInDays(laterDate, earlierDate) {
  return Math.ceil(
    (laterDate.getTime() - earlierDate.getTime()) /
      DAY_IN_MS
  );
}

export function buildRootTrialStatus({
  organisation = null,
  today = new Date(),
} = {}) {
  const currentDate = safeDate(today) || new Date();

  const trialStart =
    safeDate(organisation?.trial_start);

  const storedTrialEnd =
  safeDate(organisation?.trial_end);

const calculatedTrialEnd =
  trialStart
    ? new Date(
        trialStart.getTime() +
          60 * DAY_IN_MS
      )
    : null;

/*
 * Root Workplace pilots are always 60 days.
 * The calculated end date protects older organisations
 * whose stored trial_end may have been entered incorrectly.
 */
const trialEnd =
  calculatedTrialEnd || storedTrialEnd;

  const subscriptionStatus = String(
    organisation?.subscription_status ||
      organisation?.status ||
      "trial"
  ).toLowerCase();

  const subscriptionActive =
    organisation?.subscription_active === true;

  const hasPaidSubscription =
    subscriptionActive &&
    ![
      "trial",
      "expired",
      "inactive",
      "cancelled",
      "canceled",
    ].includes(subscriptionStatus);

  if (hasPaidSubscription) {
    return {
      stage: "active",
      label: "Root Workplace active",

      trialStart,
      trialEnd,

      totalTrialDays: 60,
      daysElapsed: 60,
      daysRemaining: 0,
      progress: 100,

      isTrial: false,
      isExpired: false,
      isPaid: true,

      canInviteEmployees: true,
      canCreateOrganisationReviews: true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence: true,

      title:
        "Your Root Workplace subscription is active.",

      message:
        "Root will continue collecting evidence, supporting employees and developing the organisation’s longitudinal wellbeing picture.",

      actionLabel: "View subscription",
      actionHref: "/organisations/pricing",

      employeeContinuationRequired: false,
    };
  }

  if (!trialStart || !trialEnd) {
    return {
      stage: "unknown",
      label: "Trial dates unavailable",

      trialStart,
      trialEnd,

      totalTrialDays: 60,
      daysElapsed: 0,
      daysRemaining: 60,
      progress: 0,

      isTrial: true,
      isExpired: false,
      isPaid: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews: true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence: true,

      title:
        "Root is preparing your workplace trial.",

      message:
        "The organisation trial dates are not yet available. Root will continue operating while this is reviewed.",

      actionLabel: "View pricing",
      actionHref: "/organisations/pricing",

      employeeContinuationRequired: false,
    };
  }

  const totalTrialDays = Math.max(
    1,
    differenceInDays(
      trialEnd,
      trialStart
    )
  );

  const rawDaysElapsed = Math.max(
    1,
    differenceInDays(
      currentDate,
      trialStart
    )
  );

  const daysElapsed = Math.min(
    totalTrialDays,
    rawDaysElapsed
  );

  const daysRemaining = Math.max(
    0,
    differenceInDays(
      trialEnd,
      currentDate
    )
  );

  const progress = Math.min(
    100,
    Math.max(
      0,
      (daysElapsed / totalTrialDays) * 100
    )
  );

  const isExpired =
    currentDate.getTime() >=
      trialEnd.getTime() ||
    ["expired", "inactive"].includes(
      subscriptionStatus
    );

  if (isExpired) {
    return {
      stage: "expired",
      label: "Pilot complete",

      trialStart,
      trialEnd,

      totalTrialDays,
      daysElapsed: totalTrialDays,
      daysRemaining: 0,
      progress: 100,

      isTrial: false,
      isExpired: true,
      isPaid: false,

      canInviteEmployees: false,
      canCreateOrganisationReviews: false,
      canUseWorkplaceAI: false,
      canViewOrganisationEvidence: true,

      title:
        "Your 60-day Root Workplace pilot has concluded.",

      message:
        "Your organisation’s evidence has been preserved. Choose a Root Workplace plan to continue employee invitations, organisation reviews and workplace intelligence.",

      actionLabel: "Continue with Root",
      actionHref: "/organisations/pricing",

      employeeContinuationRequired: true,
    };
  }

  if (daysRemaining <= 5) {
    return {
      stage: "ending",
      label: "Pilot ending soon",

      trialStart,
      trialEnd,

      totalTrialDays,
      daysElapsed,
      daysRemaining,
      progress,

      isTrial: true,
      isExpired: false,
      isPaid: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews: true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence: true,

      title:
        `Your Root pilot ends in ${daysRemaining} day${
          daysRemaining === 1 ? "" : "s"
        }.`,

      message:
        "Choose a plan to keep workplace intelligence, employee participation and longitudinal evidence active after the pilot.",

      actionLabel: "Continue with Root",
      actionHref: "/organisations/pricing",

      employeeContinuationRequired: false,
    };
  }

  if (daysRemaining <= 15) {
    return {
      stage: "conversion",
      label: "Pilot review approaching",

      trialStart,
      trialEnd,

      totalTrialDays,
      daysElapsed,
      daysRemaining,
      progress,

      isTrial: true,
      isExpired: false,
      isPaid: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews: true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence: true,

      title:
        "Your end-of-pilot review is approaching.",

      message:
        "Root is preparing the evidence collected during your pilot. Review the available plans before the trial concludes.",

      actionLabel: "Review subscription options",
      actionHref: "/organisations/pricing",

      employeeContinuationRequired: false,
    };
  }

  if (daysElapsed >= 25) {
    return {
      stage: "midpoint",
      label: "Pilot developing",

      trialStart,
      trialEnd,

      totalTrialDays,
      daysElapsed,
      daysRemaining,
      progress,

      isTrial: true,
      isExpired: false,
      isPaid: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews: true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence: true,

      title:
        "Root is beginning to build your organisation picture.",

      message:
        `${daysRemaining} days remain in the pilot. Continued employee participation and organisation reviews will strengthen the evidence available at the end of the trial.`,

      actionLabel: "View future plans",
      actionHref: "/organisations/pricing",

      employeeContinuationRequired: false,
    };
  }

  return {
    stage: "early",
    label: "Pilot underway",

    trialStart,
    trialEnd,

    totalTrialDays,
    daysElapsed,
    daysRemaining,
    progress,

    isTrial: true,
    isExpired: false,
    isPaid: false,

    canInviteEmployees: true,
    canCreateOrganisationReviews: true,
    canUseWorkplaceAI: true,
    canViewOrganisationEvidence: true,

    title:
      "Your Root Workplace pilot is underway.",

    message:
      "Root is establishing your organisation’s starting position. Invite employees and continue gathering evidence throughout the 60-day pilot.",

    actionLabel: "View pricing",
    actionHref: "/organisations/pricing",

    employeeContinuationRequired: false,
  };
}

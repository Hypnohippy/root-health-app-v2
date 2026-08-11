const DAY_IN_MS = 24 * 60 * 60 * 1000;

function safeDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function differenceInDays(
  laterDate,
  earlierDate
) {
  return Math.ceil(
    (laterDate.getTime() -
      earlierDate.getTime()) /
      DAY_IN_MS
  );
}

function buildReminderStage(
  daysRemaining
) {
  if (daysRemaining <= 1) {
    return "one_day";
  }

  if (daysRemaining <= 5) {
    return "five_days";
  }

  if (daysRemaining <= 10) {
    return "ten_days";
  }

  if (daysRemaining <= 45) {
    return "forty_five_days";
  }

  return null;
}

export function buildRootTrialStatus({
  organisation = null,
  today = new Date(),
} = {}) {
  const currentDate =
    safeDate(today) ||
    new Date();

  const trialStart =
    safeDate(
      organisation?.trial_start
    );

  const storedTrialEnd =
    safeDate(
      organisation?.trial_end
    );

  const calculatedTrialEnd =
    trialStart
      ? new Date(
          trialStart.getTime() +
            60 * DAY_IN_MS
        )
      : null;

  /*
   * Root Workplace trials are always 60 days.
   * The calculated end date protects older
   * organisations whose stored trial_end may
   * have been entered incorrectly.
   */

  const trialEnd =
    calculatedTrialEnd ||
    storedTrialEnd;

  const subscriptionStatus =
    String(
      organisation
        ?.subscription_status ||
        organisation?.status ||
        "trial"
    ).toLowerCase();

  const subscriptionActive =
    organisation
      ?.subscription_active ===
    true;

  const hasPaidSubscription =
    subscriptionActive &&
    ![
      "trial",
      "expired",
      "inactive",
      "paused",
      "cancelled",
      "canceled",
    ].includes(
      subscriptionStatus
    );

  /*
   * ACTIVE SUBSCRIPTION
   */

  if (hasPaidSubscription) {
    return {
      stage: "active",
      billingStage: "active",
      reminderStage: null,

      label:
        "Root Workplace active",

      trialStart,
      trialEnd,

      totalTrialDays: 60,
      daysElapsed: 60,
      daysRemaining: 0,
      progress: 100,

      isTrial: false,
      isExpired: false,
      isPaid: true,
      isPaused: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews:
        true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence:
        true,

      canSubscribe: false,
      shouldOfferCall: false,
      shouldShowBillingPrompt: false,
      shouldPauseOrganisation: false,

      title:
        "Your Root Workplace subscription is active.",

      message:
        "Root will continue collecting evidence, supporting employees and developing the organisation’s longitudinal wellbeing picture.",

      primaryActionLabel:
        "View subscription",

      primaryActionHref:
        "/organisations/billing",

      secondaryActionLabel: null,
      secondaryActionHref: null,

      employeeContinuationRequired:
        false,
    };
  }

  /*
   * TRIAL DATES UNKNOWN
   */

  if (!trialStart || !trialEnd) {
    return {
      stage: "unknown",
      billingStage: "trial",
      reminderStage: null,

      label:
        "Trial dates unavailable",

      trialStart,
      trialEnd,

      totalTrialDays: 60,
      daysElapsed: 0,
      daysRemaining: 60,
      progress: 0,

      isTrial: true,
      isExpired: false,
      isPaid: false,
      isPaused: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews:
        true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence:
        true,

      canSubscribe: true,
      shouldOfferCall: true,
      shouldShowBillingPrompt: false,
      shouldPauseOrganisation: false,

      title:
        "Root is preparing your workplace trial.",

      message:
        "The organisation trial dates are not yet available. Root will continue operating while this is reviewed.",

      primaryActionLabel:
        "Continue with Root",

      primaryActionHref:
        "/organisations/billing",

      secondaryActionLabel:
        "Review our findings together",

      secondaryActionHref:
        "/contact",

      employeeContinuationRequired:
        false,
    };
  }

  const totalTrialDays =
    Math.max(
      1,
      differenceInDays(
        trialEnd,
        trialStart
      )
    );

  const rawDaysElapsed =
    Math.max(
      1,
      differenceInDays(
        currentDate,
        trialStart
      )
    );

  const daysElapsed =
    Math.min(
      totalTrialDays,
      rawDaysElapsed
    );

  const daysRemaining =
    Math.max(
      0,
      differenceInDays(
        trialEnd,
        currentDate
      )
    );

  const progress =
    Math.min(
      100,
      Math.max(
        0,
        (daysElapsed /
          totalTrialDays) *
          100
      )
    );

  const reminderStage =
    buildReminderStage(
      daysRemaining
    );

  const isExpired =
    currentDate.getTime() >=
      trialEnd.getTime() ||
    [
      "expired",
      "inactive",
      "paused",
    ].includes(
      subscriptionStatus
    );

  /*
   * EXPIRED / PAUSED
   */

  if (isExpired) {
    return {
      stage: "expired",
      billingStage: "expired",
      reminderStage:
        "expired",

      label:
        "Trial complete",

      trialStart,
      trialEnd,

      totalTrialDays,
      daysElapsed:
        totalTrialDays,
      daysRemaining: 0,
      progress: 100,

      isTrial: false,
      isExpired: true,
      isPaid: false,
      isPaused: true,

      canInviteEmployees: false,
      canCreateOrganisationReviews:
        false,
      canUseWorkplaceAI: false,
      canViewOrganisationEvidence:
        true,

      canSubscribe: true,
      shouldOfferCall: true,
      shouldShowBillingPrompt: true,
      shouldPauseOrganisation: true,

      title:
        "Your 60-day Root Workplace trial has ended.",

      message:
        "Your organisation’s evidence has been safely preserved. You can continue with Root now, or review what Root has learned with David before deciding.",

      primaryActionLabel:
        "Continue with Root",

      primaryActionHref:
        "/organisations/billing",

      secondaryActionLabel:
        "Review our findings together",

      secondaryActionHref:
        "/contact",

      employeeContinuationRequired:
        true,
    };
  }

  /*
   * FINAL DAY
   */

  if (daysRemaining <= 1) {
    return {
      stage: "ending",
      billingStage:
        "conversion",
      reminderStage,

      label:
        "Trial ends tomorrow",

      trialStart,
      trialEnd,

      totalTrialDays,
      daysElapsed,
      daysRemaining,
      progress,

      isTrial: true,
      isExpired: false,
      isPaid: false,
      isPaused: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews:
        true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence:
        true,

      canSubscribe: true,
      shouldOfferCall: true,
      shouldShowBillingPrompt: true,
      shouldPauseOrganisation: false,

      title:
        "Your Root Workplace trial ends tomorrow.",

      message:
        "Your organisation picture will be preserved when the trial ends. Continue with Root now, or book a conversation with David to review what Root has learned.",

      primaryActionLabel:
        "Continue with Root",

      primaryActionHref:
        "/organisations/billing",

      secondaryActionLabel:
        "Review our findings together",

      secondaryActionHref:
        "/contact",

      employeeContinuationRequired:
        false,
    };
  }

  /*
   * 5 DAYS
   */

  if (daysRemaining <= 5) {
    return {
      stage: "ending",
      billingStage:
        "conversion",
      reminderStage,

      label:
        "Trial ending soon",

      trialStart,
      trialEnd,

      totalTrialDays,
      daysElapsed,
      daysRemaining,
      progress,

      isTrial: true,
      isExpired: false,
      isPaid: false,
      isPaused: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews:
        true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence:
        true,

      canSubscribe: true,
      shouldOfferCall: true,
      shouldShowBillingPrompt: true,
      shouldPauseOrganisation: false,

      title:
        `Your Root pilot ends in ${daysRemaining} days.`,

      message:
        "You can continue seamlessly with Root, or review the findings with David before deciding what happens next.",

      primaryActionLabel:
        "Continue with Root",

      primaryActionHref:
        "/organisations/billing",

      secondaryActionLabel:
        "Review our findings together",

      secondaryActionHref:
        "/contact",

      employeeContinuationRequired:
        false,
    };
  }

  /*
   * 10 DAYS
   */

  if (daysRemaining <= 10) {
    return {
      stage: "conversion",
      billingStage:
        "conversion",
      reminderStage,

      label:
        "Trial review approaching",

      trialStart,
      trialEnd,

      totalTrialDays,
      daysElapsed,
      daysRemaining,
      progress,

      isTrial: true,
      isExpired: false,
      isPaid: false,
      isPaused: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews:
        true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence:
        true,

      canSubscribe: true,
      shouldOfferCall: true,
      shouldShowBillingPrompt: true,
      shouldPauseOrganisation: false,

      title:
        `${daysRemaining} days remain in your Root Workplace trial.`,

      message:
        "Root has now built a substantial organisation picture. This is a good time to review the evidence and decide whether you would like Root to continue beyond the trial.",

      primaryActionLabel:
        "Continue with Root",

      primaryActionHref:
        "/organisations/billing",

      secondaryActionLabel:
        "Review our findings together",

      secondaryActionHref:
        "/contact",

      employeeContinuationRequired:
        false,
    };
  }

  /*
   * 45 DAYS OR FEWER
   */

  if (daysRemaining <= 45) {
    return {
      stage: "midpoint",
      billingStage: "trial",
      reminderStage,

      label:
        "Pilot developing",

      trialStart,
      trialEnd,

      totalTrialDays,
      daysElapsed,
      daysRemaining,
      progress,

      isTrial: true,
      isExpired: false,
      isPaid: false,
      isPaused: false,

      canInviteEmployees: true,
      canCreateOrganisationReviews:
        true,
      canUseWorkplaceAI: true,
      canViewOrganisationEvidence:
        true,

      canSubscribe: true,
      shouldOfferCall: false,
      shouldShowBillingPrompt: false,
      shouldPauseOrganisation: false,

      title:
        "Root is building your organisation picture.",

      message:
        `${daysRemaining} days remain in your trial. Continued participation and Organisation Learning Reviews will strengthen the evidence available at the end of the 60 days.`,

      primaryActionLabel:
        null,

      primaryActionHref:
        null,

      secondaryActionLabel:
        null,

      secondaryActionHref:
        null,

      employeeContinuationRequired:
        false,
    };
  }

  /*
   * EARLY TRIAL
   */

  return {
    stage: "early",
    billingStage: "trial",
    reminderStage: null,

    label:
      "Pilot underway",

    trialStart,
    trialEnd,

    totalTrialDays,
    daysElapsed,
    daysRemaining,
    progress,

    isTrial: true,
    isExpired: false,
    isPaid: false,
    isPaused: false,

    canInviteEmployees: true,
    canCreateOrganisationReviews:
      true,
    canUseWorkplaceAI: true,
    canViewOrganisationEvidence:
      true,

    canSubscribe: true,
    shouldOfferCall: false,
    shouldShowBillingPrompt: false,
    shouldPauseOrganisation: false,

    title:
      "Your Root Workplace pilot is underway.",

    message:
      "Root is establishing your organisation’s starting position. Invite employees and continue gathering evidence throughout the 60-day trial.",

    primaryActionLabel:
      null,

    primaryActionHref:
      null, 

    secondaryActionLabel:
      null,

    secondaryActionHref:
      null,

    employeeContinuationRequired:
      false,
  };
}
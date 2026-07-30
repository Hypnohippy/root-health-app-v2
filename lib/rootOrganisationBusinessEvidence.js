function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function reviewTime(review) {
  const value =
    review?.review_date ||
    review?.created_at ||
    null;

  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
}

function formatValue(value, currency = false) {
  if (value === null) {
    return "not recorded";
  }

  if (currency) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return value.toLocaleString("en-GB");
}

function buildMeasure({
  latestReview,
  previousReview,
  key,
  label,
  currency = false,
  unit = "recorded value",
}) {
  const current =
    safeNumber(latestReview?.[key]);

  const previous =
    safeNumber(previousReview?.[key]);

  const comparable =
    current !== null &&
    previous !== null;

  const change =
    comparable
      ? current - previous
      : null;

  let direction = "not comparable";

  if (comparable) {
    if (change > 0) {
      direction = "increased";
    } else if (change < 0) {
      direction = "reduced";
    } else {
      direction = "unchanged";
    }
  }

  return {
    key,
    label,
    unit,

    current,
    currentDisplay:
      formatValue(current, currency),

    previous,
    previousDisplay:
      formatValue(previous, currency),

    comparable,
    change,
    direction,

    classification:
      "not classified",

    classificationReason:
      "No validated benchmark, denominator or threshold has been supplied for this measure.",
  };
}

export function buildOrganisationBusinessEvidenceReview({
  organisationReviews = [],
} = {}) {
  const reviews = safeArray(
    organisationReviews
  )
    .filter(Boolean)
    .sort(
      (first, second) =>
        reviewTime(first) -
        reviewTime(second)
    );

  const latestReview =
    reviews.length > 0
      ? reviews[reviews.length - 1]
      : null;

  const previousReview =
    reviews.length > 1
      ? reviews[reviews.length - 2]
      : null;

  if (!latestReview) {
    return {
      reviewCount: 0,

      evidenceStatus:
        "No organisation business review recorded",

      comparability:
        "No business comparison is available.",

      measures: [],

      businessEvents: [],
      initiatives: [],
      watchItems: [],

      demonstratedRelationships: [],

      permittedInterpretation: [
        "No business evidence is currently available for interpretation.",
      ],

      notSupported: [
        "Business performance conclusions",
        "Business trend conclusions",
        "Relationships between business and wellbeing evidence",
        "Causal explanations",
      ],

      executivePosition:
        "Root does not currently have organisation business evidence to add to the wellbeing picture.",
    };
  }

  const measures = [
    buildMeasure({
      latestReview,
      previousReview,
      key: "sickness_days",
      label: "Sickness days",
    }),

    buildMeasure({
      latestReview,
      previousReview,
      key: "turnover",
      label: "Employee turnover / leavers",
      unit: "unit not independently established",
    }),

    buildMeasure({
      latestReview,
      previousReview,
      key: "agency_spend",
      label: "Agency spend",
      currency: true,
    }),

    buildMeasure({
      latestReview,
      previousReview,
      key: "overtime_hours",
      label: "Overtime hours",
    }),

    buildMeasure({
      latestReview,
      previousReview,
      key: "vacancies",
      label: "Current vacancies",
    }),
  ];

  const recordedMeasures =
    measures.filter(
      (measure) =>
        measure.current !== null
    );

  const comparableMeasures =
    measures.filter(
      (measure) =>
        measure.comparable
    );

  const businessEvents =
    safeArray(
      latestReview.business_events
    );

  const initiatives =
    safeArray(
      latestReview.initiatives
    );

  const watchItems =
    safeArray(
      latestReview.watch_items
    );

  const observations =
    recordedMeasures.map(
      (measure) => ({
        type: "observed_business_measure",
        measure: measure.label,
        value: measure.currentDisplay,

        statement:
          `${measure.label}: ${measure.currentDisplay}.`,
      })
    );

  const movement =
    comparableMeasures.map(
      (measure) => ({
        measure: measure.label,

        previous:
          measure.previousDisplay,

        current:
          measure.currentDisplay,

        direction:
          measure.direction,

        statement:
          `${measure.label} ${measure.direction} from ${measure.previousDisplay} to ${measure.currentDisplay} between saved Organisation Learning Reviews.`,
      })
    );

  const hasPreviousReview =
    previousReview !== null;

  const comparability =
    hasPreviousReview
      ? `${comparableMeasures.length} business measure${
          comparableMeasures.length === 1
            ? ""
            : "s"
        } can be compared with the previous saved Organisation Learning Review.`
      : "This is the first saved Organisation Learning Review. The recorded business measures form the current Root business baseline and must not be described as increasing or decreasing across Root reviews.";

  return {
    reviewCount:
      reviews.length,

    evidenceStatus:
      hasPreviousReview
        ? "Business evidence available with saved-review comparison"
        : "Business baseline established",

    latestReviewDate:
      latestReview.review_date ||
      latestReview.created_at ||
      null,

    previousReviewDate:
      previousReview?.review_date ||
      previousReview?.created_at ||
      null,

    measures,
    observations,
    movement,

    comparability,

    businessEvents,
    initiatives,
    watchItems,

    recordingDiscipline: {
      noBusinessEventsRecorded:
        businessEvents.length === 0,

      noInitiativesRecorded:
        initiatives.length === 0,

      businessEventsMeaning:
        businessEvents.length === 0
          ? "No business events were recorded in Root for this review. This does not establish that no business events occurred."
          : "The listed business events were recorded by the organisation as context.",

      initiativesMeaning:
        initiatives.length === 0
          ? "No initiatives were recorded in Root for this review. This does not establish that the organisation introduced no initiatives."
          : "The listed initiatives were recorded by the organisation as context.",
    },

    demonstratedRelationships: [],

    relationshipStatus:
      "No relationship, association, correlation or causal connection between the business measures and employee wellbeing evidence has been deterministically established.",

    permittedInterpretation: [
      "Report the recorded business measures.",
      hasPreviousReview
        ? "Report movement between saved Organisation Learning Reviews where a valid comparison exists."
        : "Describe the measures as the current business baseline.",
      "Use recorded business events and initiatives as contextual evidence.",
      "Say that relevant business and wellbeing measures may be worth examining alongside one another.",
      "Identify what future evidence would help determine whether a relationship exists.",
    ],

    notSupported: [
      "Calling a raw business measure high or low without a supplied benchmark, denominator or validated threshold.",
      "Describing the turnover value as a rate or percentage unless its unit is explicitly supplied as a rate or percentage.",
      "Inferring that overtime proves excessive workload, depleted capacity or burnout.",
      "Inferring that sickness absence reflects poor wellbeing or engagement.",
      "Inferring productivity, engagement, morale, capacity or organisational health from the supplied business measures.",
      "Claiming or implying correlation between business and wellbeing evidence.",
      "Claiming or implying that one dataset caused movement in the other.",
      "Treating an unrecorded business event or initiative as evidence that nothing happened.",
      "Inferring different employee subgroups merely because wellbeing dimensions moved in different directions.",
    ],

    executivePosition:
      hasPreviousReview
        ? "Root has business evidence that can be compared across saved reviews. It may describe that business movement and examine it alongside wellbeing evidence, but no cross-dataset relationship or cause has yet been established."
        : "Root has established the first business baseline. These measures add organisational context to the wellbeing picture, but there is not yet a saved-review business trend or demonstrated relationship with employee wellbeing evidence.",
  };
}

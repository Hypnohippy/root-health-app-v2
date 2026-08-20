"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";
import { buildOrganisationIntelligence } from "../../lib/rootOrganisationIntelligenceEngine";
import {
  getRootIdentity,
  setActiveExperience,
} from "../../lib/rootIdentity";

const BUSINESS_EVENT_OPTIONS = [
  "Annual appraisals",
  "Restructure",
  "Seasonal demand",
  "Peak trading",
  "Leadership change",
  "Acquisition or merger",
  "New contract",
  "Redundancies",
  "Shift pattern change",
  "Policy change",
];

const INITIATIVE_OPTIONS = [
  "Manager training",
  "Mental Health First Aiders",
  "Flexible working",
  "Wellbeing campaign",
  "New employee benefits",
  "Leadership development",
  "Workload review",
  "Employee assistance programme",
  "Recognition programme",
  "Health and safety initiative",
];

const WATCH_OPTIONS = [
  "Stress",
  "Burnout",
  "Recovery",
  "Sleep",
  "Retention",
  "Sickness absence",
  "Productivity",
  "Customer satisfaction",
  "Agency spend",
  "Manager confidence",
];

const EMPTY_MEASURES = {
  sickness_days: "",
  turnover: "",
  agency_spend: "",
  overtime_hours: "",
  vacancies: "",
};

const MEASURE_LABELS = {
  sickness_days: "Sickness days",
  turnover: "Employee turnover",
  agency_spend: "Agency spend",
  overtime_hours: "Overtime hours",
  vacancies: "Current vacancies",
};

const COLUMN_MATCHERS = {
  sickness_days: [
    "sickness days",
    "sick days",
    "absence days",
    "absence",
    "sickness",
    "days lost",
    "lost days",
  ],
  turnover: [
    "employee turnover",
    "staff turnover",
    "turnover rate",
    "turnover",
    "leavers",
  ],
  agency_spend: [
    "agency spend",
    "agency cost",
    "agency costs",
    "temporary staff cost",
    "temporary staffing cost",
  ],
  overtime_hours: [
    "overtime hours",
    "overtime",
    "extra hours",
    "additional hours",
  ],
  vacancies: [
    "current vacancies",
    "open vacancies",
    "vacancies",
    "vacancy count",
    "open roles",
  ],
};

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";

  const number = Number(value);

  if (Number.isNaN(number)) return "—";

  return number.toLocaleString("en-GB");
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";

  const number = Number(value);

  if (Number.isNaN(number)) return "—";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDetectedMeasureValue(
  measureKey,
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    measureKey === "agency_spend"
  ) {
    return formatCurrency(value);
  }

  if (
    measureKey === "turnover"
  ) {
    const number =
      Number(value);

    if (Number.isNaN(number)) {
      return "—";
    }

    const percentage =
      number <= 1
        ? number * 100
        : number;

    return `${Number(
      percentage.toFixed(2)
    ).toLocaleString(
      "en-GB"
    )}%`;
  }

  return formatNumber(value);
}

function getDataMatchLabel(confidenceLabel) {
  if (confidenceLabel === "Strong") {
    return "Clear match";
  }

  if (confidenceLabel === "Possible") {
    return "Review match";
  }

  return "Needs confirmation";
}

function getDataMatchExplanation(confidenceLabel) {
  if (confidenceLabel === "Strong") {
    return "Root found a clear match between this spreadsheet evidence and the organisation measure.";
  }

  if (confidenceLabel === "Possible") {
    return "Root found a possible match. Review the source and value before adding it to the organisation review.";
  }

  return "Root found some evidence for this mapping, but it should be confirmed before the figure is used.";
}

function formatDate(value) {
  if (!value) return "No previous review";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysSince(value) {
  if (!value) return null;

  const previous = new Date(value);
  const today = new Date();

  return Math.max(
    0,
    Math.floor(
      (today.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
}

function toDatabaseNumber(value) {
  if (value === "" || value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isNaN(number) ? null : number;
}

function createOrganisationCode(name) {
  const cleanName = String(name || "ROOT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase();

  return `${cleanName || "ROOT"}-${randomPart}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function workforceSizeFromBand(
  band
) {
  switch (band) {
    case "1-50":
      return 50;

    case "51-150":
      return 150;

    case "151-500":
      return 500;

    case "501-1000":
      return 1000;

    case "1000+":
      return 1001;

    default:
      return null;
  }
}

function toggleArrayItem(items, value) {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

function normaliseText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[£,%()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanNumericValue(value) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  const cleaned = String(value)
    .replace(/£/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/\s+/g, "")
    .trim();

  const number = Number(cleaned);

  return Number.isNaN(number) ? "" : String(number);
}

function findMatchedMeasure(label) {
  const normalisedLabel = normaliseText(label);

  for (const [measureKey, matchers] of Object.entries(COLUMN_MATCHERS)) {
    const matched = matchers.some((matcher) => {
      const normalisedMatcher = normaliseText(matcher);

      return (
        normalisedLabel === normalisedMatcher ||
        normalisedLabel.includes(normalisedMatcher) ||
        normalisedMatcher.includes(normalisedLabel)
      );
    });

    if (matched) return measureKey;
  }

  return null;
}

function extractMeasuresFromRows(rows) {
  const detected = {
    ...EMPTY_MEASURES,
  };

  const sourceDetails = {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      detected,
      sourceDetails,
    };
  }

  const headers = Object.keys(rows[0] || {});

  headers.forEach((header) => {
    const measureKey = findMatchedMeasure(header);

    if (!measureKey || detected[measureKey] !== "") return;

    for (const row of rows) {
      const cleanedValue = cleanNumericValue(row?.[header]);

      if (cleanedValue !== "") {
        detected[measureKey] = cleanedValue;
        sourceDetails[measureKey] = `Column: ${header}`;
        break;
      }
    }
  });

  rows.forEach((row) => {
    const entries = Object.entries(row || {});

    if (entries.length < 2) return;

    const firstValue = entries[0]?.[1];
    const measureKey = findMatchedMeasure(firstValue);

    if (!measureKey || detected[measureKey] !== "") return;

    for (let index = 1; index < entries.length; index += 1) {
      const candidateValue = entries[index]?.[1];
      const cleanedValue = cleanNumericValue(candidateValue);

      if (cleanedValue !== "") {
        detected[measureKey] = cleanedValue;
        sourceDetails[measureKey] = `Row: ${String(firstValue)}`;
        break;
      }
    }
  });

  return {
    detected,
    sourceDetails,
  };
}

function compareMeasure(current, previous, label, lowerIsBetter = true) {
  const currentValue = Number(current);
  const previousValue = Number(previous);

  if (
    current === "" ||
    previous === null ||
    previous === undefined ||
    Number.isNaN(currentValue) ||
    Number.isNaN(previousValue)
  ) {
    return null;
  }

  const difference = currentValue - previousValue;

  if (difference === 0) {
    return `${label} remained unchanged`;
  }

  const improved = lowerIsBetter ? difference < 0 : difference > 0;
  const direction = difference > 0 ? "increased" : "reduced";

  return `${label} ${direction} by ${Math.abs(difference).toLocaleString(
    "en-GB"
  )}${improved ? ", representing positive movement" : ""}`;
}

function buildRootReflection({
  measures,
  previousReview,
  selectedEvents,
  selectedInitiatives,
  selectedWatchItems,
}) {
  if (!previousReview) {
    return `This review begins the organisation's wider evidence picture. Root has recorded ${
      selectedEvents.length
    } business event${selectedEvents.length === 1 ? "" : "s"} and ${
      selectedInitiatives.length
    } initiative${selectedInitiatives.length === 1 ? "" : "s"}. ${
      selectedWatchItems.length > 0
        ? `Root will pay particular attention to ${selectedWatchItems
            .slice(0, 3)
            .join(", ")} as evidence develops.`
        : "Root will combine this context with anonymous workforce wellbeing evidence as future reviews are completed."
    }`;
  }

  const comparisons = [
    compareMeasure(
      measures.sickness_days,
      previousReview.sickness_days,
      "Sickness absence"
    ),
    compareMeasure(
      measures.turnover,
      previousReview.turnover,
      "Employee turnover"
    ),
    compareMeasure(
      measures.agency_spend,
      previousReview.agency_spend,
      "Agency spend"
    ),
    compareMeasure(
      measures.overtime_hours,
      previousReview.overtime_hours,
      "Overtime"
    ),
    compareMeasure(
      measures.vacancies,
      previousReview.vacancies,
      "Vacancies"
    ),
  ].filter(Boolean);

  const movementText =
    comparisons.length > 0
      ? `${comparisons.slice(0, 2).join(". ")}.`
      : "Root is awaiting complete business measures before comparing this review with the previous period.";

  const contextText =
    selectedEvents.length > 0 || selectedInitiatives.length > 0
      ? `${selectedEvents.length} business event${
          selectedEvents.length === 1 ? "" : "s"
        } and ${selectedInitiatives.length} initiative${
          selectedInitiatives.length === 1 ? "" : "s"
        } have been recorded for this period.`
      : "No significant business events or new initiatives have been selected for this period.";

  const watchText =
    selectedWatchItems.length > 0
      ? `Root will observe ${selectedWatchItems
          .slice(0, 4)
          .join(", ")} alongside anonymous workforce movement.`
      : "Root will continue monitoring the wider organisation picture as more evidence becomes available.";

  return `${movementText} ${contextText} ${watchText} These observations describe relationships in the available evidence and do not imply causation.`;
}

function MeasureInput({
  label,
  name,
  value,
  previousValue,
  onChange,
  currency = false,
}) {
  return (
    <div className="measureRow">
      <div className="measureIdentity">
        <strong>{label}</strong>

        <span>
          Previous:{" "}
          {currency
            ? formatCurrency(previousValue)
            : formatNumber(previousValue)}
        </span>
      </div>

      <div className="inputWrap">
        {currency && <span className="inputPrefix">£</span>}

        <input
          className={currency ? "measureInput currencyInput" : "measureInput"}
          type="number"
          min="0"
          step={currency ? "0.01" : "1"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder="Enter current figure"
        />
      </div>
    </div>
  );
}

export default function OrganisationLearningPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organisation, setOrganisation] = useState(null);
  const [membership, setMembership] = useState(null);
  const [previousReview, setPreviousReview] = useState(null);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [
  secureSetupToken,
  setSecureSetupToken,
] = useState("");
  const [
  onboardingAccessPath,
  setOnboardingAccessPath,
] = useState("trial");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requiresPassword, setRequiresPassword] =
  useState(true);

  const [organisationName, setOrganisationName] = useState("");
  const [employeeCount, setEmployeeCount] = useState("51-150");
  const [industry, setIndustry] = useState("Healthcare");

  const [dataMethod, setDataMethod] = useState("manual");
  const [measures, setMeasures] = useState(EMPTY_MEASURES);

  const [selectedEvents, setSelectedEvents] = useState([]);
  const [businessEventNotes, setBusinessEventNotes] = useState("");

  const [selectedInitiatives, setSelectedInitiatives] = useState([]);
  const [initiativeNotes, setInitiativeNotes] = useState("");

  const [selectedWatchItems, setSelectedWatchItems] = useState([
    "Stress",
    "Burnout",
    "Recovery",
    "Sleep",
    "Sickness absence",
  ]);

  const [isDragging, setIsDragging] = useState(false);
  const [spreadsheetLoading, setSpreadsheetLoading] = useState(false);
  const [spreadsheetFileName, setSpreadsheetFileName] = useState("");
  const [spreadsheetSheetName, setSpreadsheetSheetName] = useState("");
  const [spreadsheetRowCount, setSpreadsheetRowCount] = useState(0);
  const [spreadsheetPreviewRows, setSpreadsheetPreviewRows] = useState([]);
  const [detectedMeasures, setDetectedMeasures] = useState(EMPTY_MEASURES);
  const [detectedSources, setDetectedSources] = useState({});
  const [spreadsheetMessage, setSpreadsheetMessage] = useState("");
  const [spreadsheetError, setSpreadsheetError] = useState("");

  const [organisationIntelligence, setOrganisationIntelligence] =
  useState(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewComplete, setReviewComplete] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

    async function loadPage() {
  setLoading(true);
  setErrorMessage("");

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  /*
 * ==========================================================
 * SECURE WORKPLACE SETUP
 *
 * A new organisation approved through
 * Root Workplace must arrive through the
 * one-time secure setup invitation.
 *
 * The invitation has already established
 * which organisation is being created.
 *
 * The authenticated Root account must
 * also match that invitation before this
 * page will allow onboarding to continue.
 * ==========================================================
 */

const pageParams =
  new URLSearchParams(
    window.location.search
  );

const secureSetupMode =
  pageParams.get("setup") ===
  "secure";

if (secureSetupMode) {
  const pendingSetupToken =
  localStorage.getItem(
    "root_workplace_setup_token_v1"
  ) || "";

  if (
    authError ||
    !user
  ) {
    window.location.href =
      "/workplace-setup";

    return;
  }

  if (!pendingSetupToken) {
    setErrorMessage(
      "Root could not find the secure Workplace setup invitation. Please return to your invitation email."
    );

    setLoading(false);
    return;
  }

  const previewResponse =
    await fetch(
      `/api/organisation/setup-invite?token=${encodeURIComponent(
        pendingSetupToken
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

  const previewResult =
    await previewResponse.json();

  if (
    !previewResponse.ok ||
    !previewResult?.success
  ) {
    setErrorMessage(
      previewResult?.error ||
        "Root could not verify the secure Workplace setup invitation."
    );

    setLoading(false);
    return;
  }

  const intendedEmail =
    String(
      previewResult
        ?.invitation
        ?.intendedEmail ||
        ""
    )
      .trim()
      .toLowerCase();

  const signedInEmail =
    String(
      user.email ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    !intendedEmail ||
    signedInEmail !==
      intendedEmail
  ) {
    window.location.href =
      "/workplace-setup";

    return;
  }

  const secureApplication =
    previewResult.application ||
    {};

  setOnboardingAccessPath(
  String(
    secureApplication.accessPath ||
      "trial"
  )
    .trim()
    .toLowerCase()
  );

  setSecureSetupToken(
    pendingSetupToken
  );

  setIsOnboarding(true);

  setRequiresPassword(false);

  setOrganisation(null);
  setMembership(null);
  setPreviousReview(null);
  setReviewHistory([]);

  setContactName(
    user.user_metadata?.name ||
      user.user_metadata
        ?.full_name ||
      secureApplication
        .contactName ||
      ""
  );

  setContactEmail(
    user.email ||
      intendedEmail
  );

  setOrganisationName(
    secureApplication
      .organisationName ||
      ""
  );

  const secureEmployeeCount =
    String(
      secureApplication
        .employeeCount ||
        ""
    ).trim();

  const secureEmployeeBands = [
    "1-50",
    "51-150",
    "151-500",
    "501-1000",
    "1000+",
  ];

  if (
    secureEmployeeBands.includes(
      secureEmployeeCount
    )
  ) {
    setEmployeeCount(
      secureEmployeeCount
    );
  }

  if (
    secureApplication.industry
  ) {
    setIndustry(
      secureApplication.industry
    );
  }

  setLoading(false);
  return;
}

  /*
   * No authenticated Root account yet.
   *
   * This remains available for the original
   * new-organisation onboarding journey.
   */
  if (authError || !user) {
    setIsOnboarding(true);
    setRequiresPassword(true);
    setOrganisation(null);
    setMembership(null);
    setPreviousReview(null);
    setReviewHistory([]);
    setLoading(false);
    return;
  }

  const inviteData =
    user.user_metadata || {};

  const approvedApplicationId =
    String(
      inviteData.root_workplace_application_id ||
      ""
    ).trim();

  const approvedOrganisationName =
    String(
      inviteData.organisation_name ||
      ""
    ).trim();

  const hasApprovedOrganisationSetup =
    inviteData.root_workplace_approved ===
      true &&
    Boolean(approvedApplicationId) &&
    Boolean(approvedOrganisationName);

  /*
   * IMPORTANT:
   *
   * An approved organisation setup takes
   * priority over memberships the person
   * already has.
   *
   * This is what allows one director to
   * administer Company A, Company B and
   * Company C using ONE Root account.
   */
  if (hasApprovedOrganisationSetup) {
    const {
      data: existingProfile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, profile_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "ROOT WORKPLACE SETUP PROFILE CHECK ERROR:",
        profileError
      );
    }

    /*
     * A completely new Root user must choose
     * their password.
     *
     * An existing Root user bringing another
     * company already has an account/password
     * and must NOT create another one.
     */
    setRequiresPassword(
      !existingProfile
    );

    setIsOnboarding(true);
    setOrganisation(null);
    setMembership(null);
    setPreviousReview(null);
    setReviewHistory([]);

    setContactName(
      inviteData.name ||
      existingProfile?.name ||
      ""
    );

    setContactEmail(
      user.email || ""
    );

    setOrganisationName(
      approvedOrganisationName
    );

    const invitedEmployeeCount =
      String(
        inviteData.employee_count ||
        ""
      ).trim();

    const validEmployeeBands = [
      "1-50",
      "51-150",
      "151-500",
      "501-1000",
      "1000+",
    ];

    if (
      validEmployeeBands.includes(
        invitedEmployeeCount
      )
    ) {
      setEmployeeCount(
        invitedEmployeeCount
      );
    }

    if (inviteData.industry) {
      setIndustry(
        inviteData.industry
      );
    }

    setLoading(false);
    return;
  }

  /*
   * Normal Workplace use.
   *
   * A user may legitimately belong to
   * several organisations, so this must
   * return an ARRAY rather than maybeSingle().
   */
  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("organisation_members")
    .select(
      "id, organisation_id, profile_key, email, name, department, role"
    )
    .eq("user_id", user.id);

  if (membershipError) {
    console.error(
      "Organisation membership load error:",
      membershipError
    );

    setErrorMessage(
      "Root could not load your organisation memberships."
    );

    setLoading(false);
    return;
  }

  const allowedRoles = [
    "hr_admin",
    "organisation_admin",
  ];

  const workplaceMemberships =
    (memberships || []).filter(
      (item) =>
        allowedRoles.includes(
          item.role
        )
    );

  /*
   * Signed-in Root user with no Workplace
   * organisation yet.
   */
  if (
    workplaceMemberships.length === 0
  ) {
    setIsOnboarding(true);
    setRequiresPassword(false);
    setOrganisation(null);
    setMembership(null);
    setPreviousReview(null);
    setReviewHistory([]);

    setContactName(
      inviteData.name || ""
    );

    setContactEmail(
      user.email || ""
    );

    setLoading(false);
    return;
  }

  /*
   * Work out which organisation the person
   * is currently operating.
   *
   * Prefer Root's active-organisation memory.
   * Fall back to the older HR storage key,
   * then finally the first valid membership.
   */
  const rememberedOrganisationId =
    localStorage.getItem(
      "root_active_organisation_v1"
    );

  let legacyOrganisationId = null;

  try {
    const legacyMembership =
      JSON.parse(
        localStorage.getItem(
          "root_hr_org_v1"
        ) || "null"
      );

    legacyOrganisationId =
      legacyMembership
        ?.organisation_id ||
      null;
  } catch {
    legacyOrganisationId = null;
  }

  const member =
    workplaceMemberships.find(
      (item) =>
        item.organisation_id ===
        rememberedOrganisationId
    ) ||
    workplaceMemberships.find(
      (item) =>
        item.organisation_id ===
        legacyOrganisationId
    ) ||
    workplaceMemberships[0] ||
    null;

  if (!member) {
    setErrorMessage(
      "Root could not identify your active organisation."
    );

    setLoading(false);
    return;
  }

  setRequiresPassword(false);
  setIsOnboarding(false);

  setMembership({
    ...member,
    user_id: user.id,
  });

  localStorage.setItem(
  "root_profile_key_v1",
  member.profile_key
);

localStorage.setItem(
  "root_active_organisation_v1",
  member.organisation_id
);

localStorage.setItem(
  "root_hr_org_v1",
  JSON.stringify({
    organisation_id: member.organisation_id,
    role: member.role,
  })
);

  const {
    data: org,
    error: organisationError,
  } = await supabase
    .from("organisations")
    .select("*")
    .eq(
      "id",
      member.organisation_id
    )
    .maybeSingle();

  if (organisationError) {
    setErrorMessage(
      "Root could not load this organisation. Please refresh the page."
    );

    setLoading(false);
    return;
  }

  setOrganisation(
    org || null
  );

  const {
    data: reviews,
    error: reviewError,
  } = await supabase
    .from(
      "organisation_learning_reviews"
    )
    .select("*")
    .eq(
      "organisation_id",
      member.organisation_id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(12);

  if (reviewError) {
    console.error(
      "Organisation review load error:",
      reviewError
    );

    setErrorMessage(
      "The page is ready, but Root could not load previous organisation reviews."
    );
  }

  const safeReviews =
    Array.isArray(reviews)
      ? reviews
      : [];

  const latestReview =
    safeReviews[0] || null;

  setPreviousReview(
    latestReview
  );

  setReviewHistory(
    safeReviews
  );

  if (
    latestReview
      ?.watch_items
      ?.length
  ) {
    setSelectedWatchItems(
      latestReview.watch_items
    );
  }

 setLoading(false);
}

const reflection = useMemo(
  () =>
    buildRootReflection({
        measures,
        previousReview,
        selectedEvents,
        selectedInitiatives,
        selectedWatchItems,
      }),
    [
      measures,
      previousReview,
      selectedEvents,
      selectedInitiatives,
      selectedWatchItems,
    ]
  );

  const confidence = useMemo(() => {
    const reviewCount = reviewHistory.length;

    if (reviewCount >= 6) {
      return {
        label: "Strengthening",
        detail:
          "Root now has several organisation reviews available for longitudinal comparison.",
        symbol: "●",
      };
    }

    if (reviewCount >= 2) {
      return {
        label: "Developing",
        detail:
          "Root is beginning to compare organisational context across review periods.",
        symbol: "◐",
      };
    }

    return {
      label: "Emerging",
      detail:
        "This is an early review. Confidence will strengthen as repeated evidence is recorded.",
      symbol: "○",
    };
  }, [reviewHistory.length]);

    const detectedCount = useMemo(
    () =>
      Object.values(detectedMeasures).filter(
        (value) =>
          value !== "" &&
          value !== null &&
          value !== undefined
      ).length,
    [detectedMeasures]
  );

  const spreadsheetMovementSummary =
    useMemo(() => {
      const findings =
        Array.isArray(
          organisationIntelligence
            ?.findings
        )
          ? organisationIntelligence
              .findings
              .filter(
                (finding) =>
                  finding?.type ===
                  "trend"
              )
          : [];

      if (findings.length === 0) {
        return null;
      }

      /*
       * One measure may eventually produce
       * several findings.
       *
       * For this immediate upload reward,
       * count each organisation measure once.
       */
      const findingsByMeasure =
        new Map();

      findings.forEach(
        (finding) => {
          if (
            finding?.measureKey &&
            !findingsByMeasure.has(
              finding.measureKey
            )
          ) {
            findingsByMeasure.set(
              finding.measureKey,
              finding
            );
          }
        }
      );

      const uniqueFindings =
        [
          ...findingsByMeasure.values(),
        ];

      let improving = 0;
      let worsening = 0;

      uniqueFindings.forEach(
        (finding) => {
          const isWorsening =
            finding.lowerIsBetter
              ? finding.direction ===
                "increasing"
              : finding.direction ===
                "decreasing";

          if (isWorsening) {
            worsening += 1;
          } else {
            improving += 1;
          }
        }
      );

      const total =
        uniqueFindings.length;

      let headline = "";

      if (
        improving === total &&
        total > 0
      ) {
        headline =
          `All ${total} recognised measures show positive movement`;
      } else if (
        worsening === total &&
        total > 0
      ) {
        headline =
          `All ${total} recognised measures need closer attention`;
      } else {
        headline =
          `${improving} of ${total} recognised measures show positive movement`;
      }

      return {
        total,
        improving,
        worsening,
        headline,
      };
    }, [
      organisationIntelligence,
    ]);

 function goBackToOrganisationInsights() {
  window.location.href = "/org-insights";
}

  function handleMeasureChange(event) {
    const { name, value } = event.target;

    setMeasures((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
  }

  function copyPreviousMeasures() {
    if (!previousReview) return;

    setMeasures({
      sickness_days:
        previousReview.sickness_days === null
          ? ""
          : String(previousReview.sickness_days),
      turnover:
        previousReview.turnover === null
          ? ""
          : String(previousReview.turnover),
      agency_spend:
        previousReview.agency_spend === null
          ? ""
          : String(previousReview.agency_spend),
      overtime_hours:
        previousReview.overtime_hours === null
          ? ""
          : String(previousReview.overtime_hours),
      vacancies:
        previousReview.vacancies === null
          ? ""
          : String(previousReview.vacancies),
    });

    setDataMethod("manual");
  }

  function resetSpreadsheet() {
  setSpreadsheetFileName("");
  setSpreadsheetSheetName("");
  setSpreadsheetRowCount(0);
  setSpreadsheetPreviewRows([]);
  setDetectedMeasures(EMPTY_MEASURES);
  setDetectedSources({});
  setOrganisationIntelligence(null);
  setSpreadsheetMessage("");
  setSpreadsheetError("");

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
}

  async function processSpreadsheetFile(file) {
  setSpreadsheetError("");
  setSpreadsheetMessage("");
  setOrganisationIntelligence(null);

  if (!file) return;

  const lowerName = file.name.toLowerCase();

  const supported =
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls");

  if (!supported) {
    setSpreadsheetError(
      "Please upload an Excel spreadsheet or CSV file ending in .xlsx, .xls or .csv."
    );
    return;
  }

  setSpreadsheetLoading(true);

  try {
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true,
    });

    if (!Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
      throw new Error("No worksheets were found in this spreadsheet.");
    }

    /*
     * This is the important change.
     *
     * The workbook is now passed to Root's organisation intelligence engine.
     * The engine inspects every worksheet rather than only the first one.
     */
    const intelligence = buildOrganisationIntelligence({
      workbook,
      XLSX,
      previousReviews: reviewHistory,
    });

    const importedMeasures = {
      ...EMPTY_MEASURES,
    };

    const importedSources = {};

    Object.entries(intelligence.mappings || {}).forEach(
      ([measureKey, mapping]) => {
        if (
          !mapping ||
          mapping.value === null ||
          mapping.value === undefined ||
          Number.isNaN(Number(mapping.value))
        ) {
          return;
        }

                let importedValue =
          Number(mapping.value);

        /*
         * Excel stores percentage-formatted cells
         * as decimal fractions.
         *
         * Example:
         * 6.7% is normally supplied by XLSX as 0.067.
         *
         * Root's organisation review uses percentage
         * points, so normalise a turnover fraction
         * before it reaches the review.
         */
        if (
          measureKey === "turnover" &&
          importedValue >= 0 &&
          importedValue <= 1
        ) {
          importedValue =
            importedValue * 100;
        }

        importedMeasures[measureKey] =
          String(
            Number(
              importedValue.toFixed(2)
            )
          );

        importedSources[measureKey] = [
          `Sheet: ${mapping.sheetName}`,
          `Column: ${mapping.header}`,
          `Confidence: ${mapping.confidenceLabel}`,
        ].join(" · ");
      }
    );

    /*
     * Keep a small preview of the first worksheet for the existing preview
     * table. The intelligence itself has already inspected every worksheet.
     */
    const firstSheetName = workbook.SheetNames[0];
    const firstWorksheet = workbook.Sheets[firstSheetName];

    const previewRows = XLSX.utils.sheet_to_json(firstWorksheet, {
      defval: "",
      raw: false,
    });

    const workbookSummary = intelligence.workbookSummary || {};

    const recognisedCount =
      workbookSummary.recognisedMeasureCount ||
      Object.values(importedMeasures).filter(
        (value) => value !== "" && value !== null && value !== undefined
      ).length;

    const confirmationCount =
      workbookSummary.confirmationRequiredCount || 0;

    const worksheetCount =
      workbookSummary.worksheetCount || workbook.SheetNames.length;

    const rowCount = workbookSummary.rowCount || 0;

    setOrganisationIntelligence(intelligence);
    setSpreadsheetFileName(file.name);

    setSpreadsheetSheetName(
      worksheetCount === 1
        ? firstSheetName
        : `${worksheetCount} worksheets analysed`
    );

    setSpreadsheetRowCount(rowCount);

    setSpreadsheetPreviewRows(
      Array.isArray(previewRows) ? previewRows.slice(0, 5) : []
    );

    setDetectedMeasures(importedMeasures);
    setDetectedSources(importedSources);

    if (recognisedCount === 0) {
      setSpreadsheetMessage(
        `Root analysed ${worksheetCount} worksheet${
          worksheetCount === 1 ? "" : "s"
        } and ${
          workbookSummary.columnCount || 0
        } columns, but no sufficiently reliable matches were found. Review the spreadsheet preview or enter the figures manually.`
      );
    } else if (confirmationCount > 0) {
      setSpreadsheetMessage(
        `Root analysed ${worksheetCount} worksheet${
          worksheetCount === 1 ? "" : "s"
        }, inspected ${
          workbookSummary.columnCount || 0
        } columns and recognised ${recognisedCount} of the 5 organisation measures. ${confirmationCount} mapping${
          confirmationCount === 1 ? "" : "s"
        } should be confirmed before the figures are added to the review.`
      );
    } else {
      setSpreadsheetMessage(
        `Root analysed ${worksheetCount} worksheet${
          worksheetCount === 1 ? "" : "s"
        }, inspected ${
          workbookSummary.columnCount || 0
        } columns and recognised ${recognisedCount} of the 5 organisation measures. Review each mapping before adding the figures to this review.`
      );
    }
  } catch (error) {
    console.error("Spreadsheet intelligence error:", error);

    setSpreadsheetFileName("");
    setSpreadsheetSheetName("");
    setSpreadsheetRowCount(0);
    setSpreadsheetPreviewRows([]);
    setDetectedMeasures(EMPTY_MEASURES);
    setDetectedSources({});
    setOrganisationIntelligence(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setSpreadsheetError(
      error?.message ||
        "Root could not analyse this spreadsheet. Please check the file and try again."
    );
  } finally {
    setSpreadsheetLoading(false);
  }
}

  function handleFileInput(event) {
    const file = event.target.files?.[0];

    if (file) {
      processSpreadsheetFile(file);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      processSpreadsheetFile(file);
    }
  }

  function updateDetectedMeasure(key, value) {
    setDetectedMeasures((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyDetectedMeasures() {
    const valuesToApply = Object.fromEntries(
      Object.entries(detectedMeasures).filter(
        ([, value]) => value !== "" && value !== null && value !== undefined
      )
    );

    if (Object.keys(valuesToApply).length === 0) {
      setSpreadsheetError(
        "There are no detected figures to add. Enter or correct a value in the imported-data preview first."
      );
      return;
    }

    setMeasures((current) => ({
      ...current,
      ...valuesToApply,
    }));

    setSpreadsheetError("");
    setSpreadsheetMessage(
      "The imported figures have been added to this organisation review. You can edit any figure before saving."
    );
  }
  
    async function createOrganisationAndFirstReview() {
  setSaving(true);
  setErrorMessage("");
  setMessage("");

  const cleanName =
    contactName.trim();

  const cleanEmail =
    contactEmail
      .trim()
      .toLowerCase();

  const cleanOrganisationName =
    organisationName.trim();

  if (
    !cleanName ||
    !cleanEmail ||
    !cleanOrganisationName
  ) {
    setErrorMessage(
      "Please complete your name, work email and organisation name."
    );

    setSaving(false);
    return;
  }

  const {
    data: {
      user: existingUser,
    },
  } =
    await supabase.auth.getUser();

  const isApprovedInvite =
  existingUser
    ?.user_metadata
    ?.root_workplace_approved ===
  true;

if (
  !existingUser ||
  requiresPassword
) {
  if (password.length < 8) {
    setErrorMessage(
      "Please create a password containing at least 8 characters."
    );

    setSaving(false);
    return;
  }

  if (
    password !==
    confirmPassword
  ) {
    setErrorMessage(
      "The passwords do not match."
    );

    setSaving(false);
    return;
  }
}

    const hasAnyMeasure = Object.values(
      measures
    ).some((value) => value !== "");

    const hasContext =
      selectedEvents.length > 0 ||
      selectedInitiatives.length > 0 ||
      businessEventNotes.trim() ||
      initiativeNotes.trim();

    if (!hasAnyMeasure && !hasContext) {
      setErrorMessage(
        "Please enter at least one business measure, event or initiative so Root can establish the organisation baseline."
      );
      setSaving(false);
      return;
    }

    /*
 * ==========================================================
 * SECURE WORKPLACE INVITATION REDEMPTION
 *
 * Approved Workplace setup must not create
 * the organisation or administrator permission
 * directly in browser code.
 *
 * The secure server/database path verifies:
 *
 * - the authenticated Root user
 * - the exact invitation
 * - invitation state and expiry
 * - the approved application
 * - organisation creation
 * - organisation_admin permission
 * - the first learning review
 * - final one-time redemption
 * ==========================================================
 */

if (secureSetupToken) {
  const {
    data: {
      session,
    },
    error: sessionError,
  } =
    await supabase.auth.getSession();

  if (
    sessionError ||
    !session?.access_token
  ) {
    setErrorMessage(
      "Your Root session could not be verified. Please return to the secure Workplace invitation and sign in again."
    );

    setSaving(false);
    return;
  }

  const secureResponse =
    await fetch(
      "/api/organisation/setup-invite",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${session.access_token}`,
        },

        body:
          JSON.stringify({
            token:
              secureSetupToken,

            adminName:
              cleanName,

            measures: {
              sickness_days:
                toDatabaseNumber(
                  measures.sickness_days
                ),

              turnover:
                toDatabaseNumber(
                  measures.turnover
                ),

              agency_spend:
                toDatabaseNumber(
                  measures.agency_spend
                ),

              overtime_hours:
                toDatabaseNumber(
                  measures.overtime_hours
                ),

              vacancies:
                toDatabaseNumber(
                  measures.vacancies
                ),
            },

            businessEvents:
              selectedEvents,

            businessEventNotes:
              businessEventNotes.trim() ||
              null,

            initiatives:
              selectedInitiatives,

            initiativeNotes:
              initiativeNotes.trim() ||
              null,

            watchItems:
              selectedWatchItems,

            rootReflection:
              reflection,

            confidenceLabel:
              "Emerging",
          }),
      }
    );

  const secureResult =
    await secureResponse.json();

  if (
    !secureResponse.ok ||
    !secureResult?.success
  ) {
    setErrorMessage(
      secureResult?.error ||
        "Root could not complete the secure Workplace setup."
    );

    setSaving(false);
    return;
  }

  /*
   * At this point the database transaction
   * has successfully created everything.
   */

  localStorage.setItem(
    "root_profile_key_v1",
    secureResult.profileKey
  );

  localStorage.setItem(
    "root_hr_org_v1",
    JSON.stringify({
      organisation_id:
        secureResult.organisationId,

      role:
        secureResult.role ||
        "organisation_admin",
    })
  );

  localStorage.setItem(
    "root_organisation_v1",
    JSON.stringify({
      organisation_id:
        secureResult.organisationId,

      organisation_name:
        cleanOrganisationName,

      role:
        secureResult.role ||
        "organisation_admin",

      joined_at:
        Date.now(),
    })
  );

  localStorage.setItem(
    "root_active_organisation_v1",
    secureResult.organisationId
  );

  /*
   * The invitation is one-use.
   * Remove the raw token from browser
   * session storage after redemption.
   */

  localStorage.removeItem(
  "root_workplace_setup_token_v1"
  );

  setActiveExperience(
    "workplace"
  );

  await getRootIdentity();

  window.location.href =
    "/org-insights";

  return;
}

    let user = existingUser;

    /*
     * Create the one Root account when the visitor is not already signed in.
     */
    if (!user) {
      const {
        data: signUpData,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
  data: {
    name: cleanName,
  },

  emailRedirectTo:
    `${window.location.origin}/organisation-learning`,
},
      });

      if (signUpError || !signUpData?.user) {
        setErrorMessage(
          signUpError?.message ||
            "Root could not create your account."
        );
        setSaving(false);
        return;
      }

      user = signUpData.user;

      /*
       * If Supabase email confirmation is enabled, signUp creates the user
       * but does not create an active browser session.
       */
      if (!signUpData.session) {
        setErrorMessage(
          "Your Root account has been created. Please confirm your email address, then return to this page and sign in to complete the organisation setup."
        );
        setSaving(false);
        return;
      }
    }

    if (
  user &&
  isApprovedInvite &&
  requiresPassword
) {
  const {
    error:
      passwordUpdateError,
  } =
    await supabase.auth
      .updateUser({
        password,
      });

  if (
    passwordUpdateError
  ) {
    setErrorMessage(
      passwordUpdateError.message ||
      "Root could not save your new password."
    );

    setSaving(false);
    return;
  }
}
    const profileKey = crypto.randomUUID();
    const organisationCode =
      createOrganisationCode(
        cleanOrganisationName
      );

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    const trialEnd = addDays(
      new Date(),
      60
    );

    /*
     * Create or update the user's personal Root profile.
     */
    const {
      data: existingProfile,
      error: profileLookupError,
    } = await supabase
      .from("profiles")
      .select("id, profile_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileLookupError) {
      setErrorMessage(
        "Root could not check your personal profile."
      );
      setSaving(false);
      return;
    }

    let personalProfileKey =
      existingProfile?.profile_key ||
      profileKey;

    if (existingProfile) {
      const { error: profileUpdateError } =
        await supabase
          .from("profiles")
          .update({
            name: cleanName,
            email: cleanEmail,
            profile_key: personalProfileKey,
          })
          .eq("id", existingProfile.id);

      if (profileUpdateError) {
        setErrorMessage(
          "Root created your account but could not update your personal profile."
        );
        setSaving(false);
        return;
      }
    } else {
      const { error: profileInsertError } =
        await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            profile_key: personalProfileKey,
            name: cleanName,
            email: cleanEmail,
            subscription_status:
              "organisation",
            orientation_completed: false,
          });

      if (profileInsertError) {
        setErrorMessage(
          profileInsertError.message ||
            "Root created your account but could not create your personal profile."
        );
        setSaving(false);
        return;
      }
    }

    /*
     * Create the organisation and begin the 60-day pilot.
     */
    const {
      data: newOrganisation,
      error: organisationError,
    } = await supabase
      .from("organisations")
      .insert({
        name: cleanOrganisationName,
        contact_name: cleanName,
        contact_email: cleanEmail,
        employee_count:
     employeeCount,

      workforce_size:
      workforceSizeFromBand(
      employeeCount
     ),

     industry,

     organisation_code:
    organisationCode,
        trial_start: today,
        trial_end: trialEnd,
        status: "trial",
        subscription_status: "trial",
        subscription_plan: "trial",
        subscription_active: true,
      })
      .select("*")
      .single();

    if (
      organisationError ||
      !newOrganisation
    ) {
      setErrorMessage(
        organisationError?.message ||
          "Root could not create the organisation."
      );
      setSaving(false);
      return;
    }

    /*
     * Create workplace capability for the same Root identity.
     */
    const {
      data: newMembership,
      error: membershipError,
    } = await supabase
      .from("organisation_members")
      .insert({
        organisation_id:
          newOrganisation.id,
        user_id: user.id,
        profile_key: personalProfileKey,
        email: cleanEmail,
        name: cleanName,
        department: "People / HR",
        role: "organisation_admin",
        invited_at:
          new Date().toISOString(),
        activated_at:
          new Date().toISOString(),
        created_at:
          new Date().toISOString(),
      })
      .select(
        "id, organisation_id, user_id, profile_key, email, name, department, role"
      )
      .single();

    if (
      membershipError ||
      !newMembership
    ) {
      setErrorMessage(
        membershipError?.message ||
          "Root created the organisation but could not create workplace access."
      );
      setSaving(false);
      return;
    }

    const reviewPayload = {
      organisation_id:
        newOrganisation.id,
      created_by: user.id,
      review_date: today,

      sickness_days: toDatabaseNumber(
        measures.sickness_days
      ),
      turnover: toDatabaseNumber(
        measures.turnover
      ),
      agency_spend: toDatabaseNumber(
        measures.agency_spend
      ),
      overtime_hours: toDatabaseNumber(
        measures.overtime_hours
      ),
      vacancies: toDatabaseNumber(
        measures.vacancies
      ),

      business_events: selectedEvents,
      business_event_notes:
        businessEventNotes.trim() || null,

      initiatives: selectedInitiatives,
      initiative_notes:
        initiativeNotes.trim() || null,

      watch_items: selectedWatchItems,
      root_reflection: reflection,
      confidence_label: "Emerging",
    };

    const {
      data: firstReview,
      error: reviewError,
    } = await supabase
      .from(
        "organisation_learning_reviews"
      )
      .insert(reviewPayload)
      .select("*")
      .single();

    if (reviewError || !firstReview) {
      setErrorMessage(
        reviewError?.message ||
          "Root created the organisation but could not save the first review."
      );
      setSaving(false);
      return;
    }

    localStorage.setItem(
      "root_profile_key_v1",
      personalProfileKey
    );

    localStorage.setItem(
      "root_hr_org_v1",
      JSON.stringify({
        organisation_id:
          newOrganisation.id,
        role: "organisation_admin",
      })
    );

    localStorage.setItem(
      "root_organisation_v1",
      JSON.stringify({
        organisation_id:
          newOrganisation.id,
        organisation_name:
          newOrganisation.name,
        organisation_code:
          newOrganisation.organisation_code,
        role: "organisation_admin",
        joined_at: Date.now(),
      })
    );
        /*
     * The organisation just created must become
     * the active Workplace organisation immediately.
     *
     * A Root user may administer more than one
     * organisation, so an older active-organisation
     * memory must not win after new setup.
     */
    localStorage.setItem(
      "root_active_organisation_v1",
      newOrganisation.id
    );
    if (isApprovedInvite) {
  const currentMetadata =
    user.user_metadata || {};

  const {
    error:
      metadataClearError,
  } =
    await supabase.auth
      .updateUser({
        data: {
          ...currentMetadata,

          root_workplace_approved:
            false,

          root_workplace_application_id:
            null,

          organisation_name:
            null,

          employee_count:
            null,

          industry:
            null,

          organisation_contact_email:
            null,

          root_admin_email:
            null,
        },
      });

  if (metadataClearError) {
    console.error(
      "ROOT WORKPLACE SETUP METADATA CLEAR ERROR:",
      metadataClearError
    );
  }
}

    setActiveExperience("workplace");
    await getRootIdentity();

    window.location.href =
      "/org-insights";
  }
    async function saveReview() {
    if (isOnboarding) {
      await createOrganisationAndFirstReview();
      return;
    }

    if (!membership?.organisation_id) {
      setErrorMessage(
        "Root could not identify the organisation."
      );
      return;
    }

    const hasAnyMeasure = Object.values(measures).some(
      (value) => value !== ""
    );

    const hasContext =
      selectedEvents.length > 0 ||
      selectedInitiatives.length > 0 ||
      businessEventNotes.trim() ||
      initiativeNotes.trim();

    if (!hasAnyMeasure && !hasContext) {
      setErrorMessage(
        "Please enter at least one business measure, event or initiative before updating the organisation picture."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const payload = {
      organisation_id: membership.organisation_id,
      created_by: membership.user_id,
      review_date: new Date().toISOString().slice(0, 10),

      sickness_days: toDatabaseNumber(measures.sickness_days),
      turnover: toDatabaseNumber(measures.turnover),
      agency_spend: toDatabaseNumber(measures.agency_spend),
      overtime_hours: toDatabaseNumber(measures.overtime_hours),
      vacancies: toDatabaseNumber(measures.vacancies),

      business_events: selectedEvents,
      business_event_notes: businessEventNotes.trim() || null,

      initiatives: selectedInitiatives,
      initiative_notes: initiativeNotes.trim() || null,

      watch_items: selectedWatchItems,
      root_reflection: reflection,
      confidence_label: confidence.label,
    };

    const { data, error } = await supabase
      .from("organisation_learning_reviews")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Organisation review save error:", error);

      setErrorMessage(
        "Root could not save this review. Please check that the organisation_learning_reviews table has been created."
      );

      setSaving(false);
      return;
    }

    setPreviousReview(data);
    setReviewHistory((current) => [data, ...current]);

    setMeasures(EMPTY_MEASURES);
    setSelectedEvents([]);
    setBusinessEventNotes("");
    setSelectedInitiatives([]);
    setInitiativeNotes("");

    resetSpreadsheet();
    setDataMethod("manual");

    setMessage("");
setReviewComplete(true);

setSaving(false);

window.scrollTo({
  top: 0,
  behavior: "smooth",
});
  }

  const lastReviewDays = daysSince(previousReview?.created_at);

  if (loading) {
    return (
      <RootAtmosphere type="coach">
        <Nav />

        <main className="page loadingPage">
          <p>Loading organisation learning review...</p>
        </main>

        <style jsx>{pageStyles}</style>
      </RootAtmosphere>
    );
  }

  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main className="page">
        <section className="shell">
          <header className="hero">
            <RootEnso size={92} />

            <p className="kicker">Root Health</p>

            <h1>
  {isOnboarding
    ? "Organisation Learning & Setup"
    : "Organisation Learning Review"}
</h1>

            <p className="subtitle">
  {isOnboarding
    ? "Tell Root about your organisation, establish its first evidence baseline and begin your supported 60-day workplace pilot."
    : "Help Root understand what has changed across your organisation. Root combines this context with anonymous workforce evidence to build a clearer and more useful picture over time."}
</p>

            <div className="heroActions">
              {!isOnboarding && (
  <button
    className="quietButton"
    type="button"
    onClick={goBackToOrganisationInsights}
  >
    Continue to Organisation Insights
  </button>
)}

              <span className="timePill">Estimated time: 2–3 minutes</span>
            </div>
          </header>

          {reviewComplete && (
  <section className="reviewCompleteCard">
    <div className="reviewCompleteIcon">✓</div>

    <p className="sectionLabel">
      Organisation Picture Updated
    </p>

    <h2>
      Today's review has been added to Root's organisational memory.
    </h2>

    <p className="reviewCompleteText">
      Root will now compare today's evidence with future reviews,
      look for relationships with anonymous workforce wellbeing,
      strengthen confidence as more evidence is collected and
      automatically update Organisation Insights as new evidence develops.
    </p>

    <div className="reviewChecklist">

      <div>✓ Organisation review stored</div>

      <div>✓ Organisational memory updated</div>

      <div>✓ Future comparisons enabled</div>

      <div>✓ Organisation Insights refreshed</div>

    </div>

    <div className="reviewCompleteButtons">

      <button
        className="saveButton"
        onClick={() => router.push("/org-insights")}
      >
        View Organisation Insights →
      </button>

      <button
        className="quietButton"
        onClick={() => {
          setReviewComplete(false);
          setMessage("");
        }}
      >
        Finish
      </button>

    </div>
  </section>
)}
             {isOnboarding && (
            <section className="onboardingCard">
              <p className="sectionLabel">
                Root Workplace Setup
              </p>

              <h2>
                Let Root understand you and your organisation
              </h2>

              <p className="cardIntro">
                One Root account will give you a private personal
                wellbeing experience and authorised access to your
                organisation&apos;s workplace intelligence.
              </p>

              <div className="onboardingGrid">
                <label className="onboardingField">
                  <span>Your name</span>

                  <input
                    type="text"
                    value={contactName}
                    onChange={(event) =>
                      setContactName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Emma Jones"
                  />
                </label>

                <label className="onboardingField">
                  <span>Work email</span>

                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) =>
                      setContactEmail(
                        event.target.value
                      )
                    }
                    placeholder="emma@company.co.uk"
                  />
                </label>

                {requiresPassword && (
  <>
    <label className="onboardingField">
      <span>Create password</span>

      <input
        type="password"
        value={password}
        onChange={(event) =>
          setPassword(
            event.target.value
          )
        }
        placeholder="At least 8 characters"
      />
    </label>

    <label className="onboardingField">
      <span>Confirm password</span>

      <input
        type="password"
        value={confirmPassword}
        onChange={(event) =>
          setConfirmPassword(
            event.target.value
          )
        }
        placeholder="Repeat your password"
      />
    </label>
  </>
)}

                <label className="onboardingField">
                  <span>Organisation name</span>

                  <input
                    type="text"
                    value={organisationName}
                    onChange={(event) =>
                      setOrganisationName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Sony UK"
                  />
                </label>

                <label className="onboardingField">
                  <span>Employees covered by Root</span>

                  <select
                    value={employeeCount}
                    onChange={(event) =>
                      setEmployeeCount(
                        event.target.value
                      )
                    }
                  >
                    <option value="1-50">
                      Up to 50 employees
                    </option>

                    <option value="51-150">
                      51–150 employees
                    </option>

                    <option value="151-500">
                      151–500 employees
                    </option>

                    <option value="501-1000">
                      501–1,000 employees
                    </option>

                    <option value="1000+">
                      More than 1,000 employees
                    </option>
                  </select>
                </label>

                <label className="onboardingField onboardingWide">
                  <span>Industry</span>

                  <select
                    value={industry}
                    onChange={(event) =>
                      setIndustry(
                        event.target.value
                      )
                    }
                  >
                    <option>Healthcare</option>
                    <option>Social Care</option>
                    <option>Professional Services</option>
                    <option>Manufacturing</option>
                    <option>Retail</option>
                    <option>Education</option>
                    <option>Charity</option>
                    <option>Technology</option>
                    <option>Financial Services</option>
                    <option>Hospitality</option>
                    <option>Public Sector</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>

              <div className="onboardingPromise">
                <strong>
                  What happens when you finish
                </strong>

                <span>
                  Root creates one account, enables personal and
                  workplace access, creates the organisation, saves
                  this first review and begins the 60-day pilot.
                </span>
              </div>
            </section>
          )}

          {errorMessage && (
            <div className="errorMessage">{errorMessage}</div>
          )}

          <section className="pictureCard">
            <div>
              <p className="sectionLabel">Organisation picture</p>

              <h2>{organisation?.name || "Your organisation"}</h2>

              <p>
                {previousReview
                  ? `The previous review was completed ${formatDate(
                      previousReview.created_at
                    )}.`
                  : "No organisation learning review has been completed yet."}
              </p>
            </div>

            <div className="pictureStats">
              <div>
                <span>Previous review</span>

                <strong>
                  {lastReviewDays === null
                    ? "Not yet completed"
                    : lastReviewDays === 0
                    ? "Today"
                    : `${lastReviewDays} days ago`}
                </strong>
              </div>

              <div>
                <span>Reviews recorded</span>
                <strong>{reviewHistory.length}</strong>
              </div>

              <div>
                <span>Evidence status</span>
                <strong>{confidence.label}</strong>
              </div>
            </div>
          </section>

          <section className="contentGrid">
            <div className="mainColumn">
              <section className="glassCard">
                <p className="sectionLabel">Organisation data</p>
                <h2>How would you like to update this review?</h2>

                <p className="cardIntro">
                  Enter the figures manually or upload an existing spreadsheet.
                  Root will attempt to recognise and map the relevant measures.
                </p>

                <div className="methodGrid">
                  <button
                    type="button"
                    className={
                      dataMethod === "manual"
                        ? "methodButton active"
                        : "methodButton"
                    }
                    onClick={() => setDataMethod("manual")}
                  >
                    <span className="methodIcon">✎</span>

                    <span>
                      <strong>Manual entry</strong>
                      <small>Enter the current figures directly</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      dataMethod === "spreadsheet"
                        ? "methodButton active"
                        : "methodButton"
                    }
                    onClick={() => setDataMethod("spreadsheet")}
                  >
                    <span className="methodIcon">▦</span>

                    <span>
                      <strong>Spreadsheet upload</strong>
                      <small>Import Excel or CSV data</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      dataMethod === "connected"
                        ? "methodButton active"
                        : "methodButton"
                    }
                    onClick={() => setDataMethod("connected")}
                  >
                    <span className="methodIcon">↗</span>

                    <span>
                      <strong>Connected system</strong>
                      <small>Planned for future integrations</small>
                    </span>
                  </button>
                </div>
              </section>

              {dataMethod === "spreadsheet" && (
                <section className="glassCard">
                  <p className="sectionLabel">Spreadsheet import</p>
                  <h2>Drop your organisation data into Root</h2>

                  <p className="cardIntro">
  Root will inspect every worksheet, identify likely organisation
  measures and show where each figure came from before anything is
  added to the review.
</p>

                  <input
                    ref={fileInputRef}
                    className="hiddenFileInput"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                  />

                  <div
                    className={
                      isDragging ? "dropZone dragging" : "dropZone"
                    }
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <div className="dropIcon">▦</div>

                    <h3>
                      {spreadsheetLoading
                        ? "Root is reading your spreadsheet..."
                        : "Drop your spreadsheet here"}
                    </h3>

                    <p>
                      {spreadsheetLoading
                        ? "Please wait while the columns and figures are examined."
                        : "Or select a file from your computer"}
                    </p>

                    {!spreadsheetLoading && (
                      <span className="browseButton">Browse files</span>
                    )}

                    <small>Supports Excel .xlsx, .xls and CSV files</small>
                  </div>

                  {spreadsheetError && (
                    <div className="importError">{spreadsheetError}</div>
                  )}

                  {spreadsheetMessage && (
                    <div className="importMessage">{spreadsheetMessage}</div>
                  )}
                  {organisationIntelligence ? (
  <section
    style={{
      marginTop: "24px",
      padding: "24px",
      borderRadius: "24px",
      border: "1px solid rgba(255, 255, 255, 0.14)",
      background:
        "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.045))",
      boxShadow: "0 18px 55px rgba(0, 0, 0, 0.16)",
      backdropFilter: "blur(18px)",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "20px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ maxWidth: "720px" }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            opacity: 0.68,
          }}
        >
          Root workbook analysis
        </p>

        <h3
          style={{
            margin: "0 0 10px",
            fontSize: "clamp(1.35rem, 2vw, 1.8rem)",
            lineHeight: 1.2,
          }}
        >
          Root analysed your organisation data
        </h3>

        <p
          style={{
            margin: 0,
            lineHeight: 1.65,
            opacity: 0.78,
          }}
        >
          Root has inspected the workbook and suggested how its
          spreadsheet columns relate to the organisation measures below.
          A data match describes Root&apos;s confidence in the spreadsheet
          mapping. It is not a rating of the organisation&apos;s performance.
        </p>
      </div>

      <div
        style={{
          minWidth: "180px",
          padding: "14px 16px",
          borderRadius: "18px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "rgba(255, 255, 255, 0.06)",
        }}
      >
        <div
          style={{
            marginBottom: "5px",
            fontSize: "0.76rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.62,
          }}
        >
          Overall data match
        </div>

        <div
          style={{
            fontSize: "1.08rem",
            fontWeight: 700,
          }}
        >
          {organisationIntelligence.confidence?.label === "Strong"
            ? "Clear overall match"
            : organisationIntelligence.confidence?.label === "Developing"
              ? "Review suggested"
              : "More review needed"}
        </div>
      </div>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "12px",
        marginTop: "22px",
      }}
    >
      <div
        style={{
          padding: "16px",
          borderRadius: "18px",
          background: "rgba(255, 255, 255, 0.055)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
        }}
      >
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          {organisationIntelligence.workbookSummary?.worksheetCount || 0}
        </div>

        <div style={{ marginTop: "4px", opacity: 0.68 }}>
          Worksheets discovered
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          borderRadius: "18px",
          background: "rgba(255, 255, 255, 0.055)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
        }}
      >
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          {organisationIntelligence.workbookSummary?.columnCount || 0}
        </div>

        <div style={{ marginTop: "4px", opacity: 0.68 }}>
          Columns inspected
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          borderRadius: "18px",
          background: "rgba(255, 255, 255, 0.055)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
        }}
      >
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          {organisationIntelligence.workbookSummary
            ?.recognisedMeasureCount || 0}
        </div>

        <div style={{ marginTop: "4px", opacity: 0.68 }}>
          Measures recognised
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          borderRadius: "18px",
          background: "rgba(255, 255,255, 0.055)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
        }}
      >
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          {organisationIntelligence.workbookSummary
            ?.confirmationRequiredCount || 0}
        </div>

        <div style={{ marginTop: "4px", opacity: 0.68 }}>
          Need confirmation
        </div>
      </div>
    </div>

    <div style={{ marginTop: "26px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(150px, 1.25fr) minmax(150px, 1.4fr) minmax(100px, 0.75fr) minmax(130px, 0.9fr)",
          gap: "14px",
          padding: "0 12px 10px",
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          opacity: 0.58,
        }}
      >
        <span>Root measure</span>
        <span>Spreadsheet source</span>
        <span>Value</span>
        <span>Data match</span>
      </div>

      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >
        {Object.entries(
          organisationIntelligence.measureDefinitions || {}
        ).map(([measureKey, definition]) => {
          const mapping =
            organisationIntelligence.mappings?.[measureKey] || null;

          return (
            <div
              key={measureKey}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(150px, 1.25fr) minmax(150px, 1.4fr) minmax(100px, 0.75fr) minmax(130px, 0.9fr)",
                gap: "14px",
                alignItems: "center",
                padding: "15px 12px",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                background: "rgba(255, 255, 255, 0.045)",
              }}
            >
              <div>
                <strong>{definition.label}</strong>
              </div>

              <div
                style={{
                  minWidth: 0,
                  lineHeight: 1.45,
                  opacity: mapping ? 0.82 : 0.58,
                }}
              >
                {mapping ? (
                  <>
                    <div>{mapping.header}</div>

                    <div
                      style={{
                        marginTop: "3px",
                        fontSize: "0.8rem",
                        opacity: 0.66,
                      }}
                    >
                      {mapping.sheetName}
                    </div>
                  </>
                ) : (
                  "No reliable source found"
                )}
              </div>

              <div style={{ fontWeight: 700 }}>
                {mapping
                  ? formatDetectedMeasureValue(
                      measureKey,
                      mapping.value
                    )
                  : "—"}
              </div>

              <div>
                <div
                  title={
                    mapping
                      ? getDataMatchExplanation(mapping.confidenceLabel)
                      : "Root did not find a sufficiently reliable spreadsheet match."
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "7px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(255, 255, 255, 0.06)",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span aria-hidden="true">
                    {!mapping
                      ? "○"
                      : mapping.confidenceLabel === "Strong"
                        ? "✓"
                        : mapping.confidenceLabel === "Possible"
                          ? "!"
                          : "?"}
                  </span>

                  {mapping
                    ? getDataMatchLabel(mapping.confidenceLabel)
                    : "Not matched"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div
      style={{
        marginTop: "20px",
        padding: "15px 17px",
        borderRadius: "17px",
        background: "rgba(255, 255, 255, 0.045)",
        border: "1px solid rgba(255, 255, 255, 0.09)",
        lineHeight: 1.55,
        fontSize: "0.9rem",
        opacity: 0.76,
      }}
    >
      <strong style={{ opacity: 1 }}>What “data match” means:</strong>{" "}
      Root is describing how clearly the spreadsheet evidence matches a
      measure. It is not judging whether the organisation itself is
      performing strongly or poorly.
    </div>
  </section>
) : null}
{organisationIntelligence ? (
  <section
    style={{
      marginTop: "22px",
      padding: "24px",
      borderRadius: "24px",
      border: "1px solid rgba(82, 103, 88, 0.14)",
      background:
        "linear-gradient(145deg, rgba(247,250,247,0.92), rgba(235,241,236,0.72))",
      boxShadow: "0 18px 48px rgba(39, 55, 44, 0.1)",
    }}
  >
    <p
      style={{
        margin: "0 0 8px",
        color: "#617064",
        fontSize: "0.76rem",
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      Root noticed
    </p>

        <h3
      style={{
        margin: "0 0 10px",
        color: "#232a25",
        fontSize: "1.45rem",
        lineHeight: 1.2,
      }}
    >
      {spreadsheetMovementSummary
        ? "Root found something useful"
        : "What the available evidence may be showing"}
    </h3>

    <p
      style={{
        margin: "0 0 20px",
        color: "#626c64",
        lineHeight: 1.65,
      }}
    >
      These observations come from the workbook and any previous organisation
      review available to Root. They describe measured movement and do not
      prove why the movement occurred.
    </p>


        {spreadsheetMovementSummary ? (
      <div
        style={{
          margin:
            "0 0 20px",
          padding:
            "20px",
          borderRadius:
            "20px",
          background:
            "rgba(72, 119, 84, 0.09)",
          border:
            "1px solid rgba(72, 119, 84, 0.18)",
        }}
      >
        <strong
          style={{
            display:
              "block",
            color:
              "#2f5b3c",
            fontSize:
              "1.15rem",
            lineHeight:
              1.4,
          }}
        >
          {
            spreadsheetMovementSummary.headline
          }
        </strong>

        <p
          style={{
            margin:
              "8px 0 0",
            color:
              "#55635a",
            lineHeight:
              1.6,
          }}
        >
          Root identified measurable
          movement across{" "}
          {
            spreadsheetMovementSummary.total
          }{" "}
          organisation measure
          {
            spreadsheetMovementSummary.total ===
            1
              ? ""
              : "s"
          }
          .{" "}
          {
            spreadsheetMovementSummary.improving
          }{" "}
          show positive movement
          {
            spreadsheetMovementSummary.worsening >
            0
              ? ` and ${spreadsheetMovementSummary.worsening} may need closer attention`
              : ""
          }
          .
        </p>

        <p
          style={{
            margin:
              "10px 0 0",
            color:
              "#69736c",
            fontSize:
              "0.86rem",
            lineHeight:
              1.55,
          }}
        >
          Root can see what changed.
          The next step is to understand
          what was happening in your
          organisation while that
          movement occurred.
        </p>
      </div>
    ) : null}

    {Array.isArray(organisationIntelligence.findings) &&
    organisationIntelligence.findings.length > 0 ? (
      <div
        style={{
          display: "grid",
          gap: "12px",
        }}
      >
        {organisationIntelligence.findings.map((finding) => {
          const worsening = finding.lowerIsBetter
            ? finding.direction === "increasing"
            : finding.direction === "decreasing";

          const matchLabel =
            finding.confidence === "Strong"
              ? "Clear evidence match"
              : finding.confidence === "Possible"
                ? "Review evidence"
                : "Early evidence";

          return (
            <article
              key={finding.id}
              style={{
                padding: "17px",
                borderRadius: "18px",
                border: worsening
                  ? "1px solid rgba(160, 91, 62, 0.16)"
                  : "1px solid rgba(72, 119, 84, 0.16)",
                background: worsening
                  ? "rgba(176, 101, 69, 0.07)"
                  : "rgba(72, 119, 84, 0.07)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "14px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 360px" }}>
                  <strong
                    style={{
                      display: "block",
                      color: "#292f2a",
                      fontSize: "1rem",
                      lineHeight: 1.45,
                    }}
                  >
                    {finding.title}
                  </strong>

                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "#666e67",
                      fontSize: "0.9rem",
                      lineHeight: 1.55,
                    }}
                  >
                    {finding.detail}
                  </p>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "7px 10px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.66)",
                    border: "1px solid rgba(68, 78, 70, 0.1)",
                    color: "#4f5c52",
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span aria-hidden="true">
                    {finding.confidence === "Strong"
                      ? "✓"
                      : finding.confidence === "Possible"
                        ? "!"
                        : "○"}
                  </span>

                  {matchLabel}
                </div>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "11px",
                  borderTop: "1px solid rgba(70, 78, 72, 0.08)",
                  color: worsening ? "#7a4938" : "#386148",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                }}
              >
                {worsening
                  ? "This movement may require closer review."
                  : "This movement appears positive or improving."}
              </div>
            </article>
          );
        })}
      </div>
    ) : (
      <div
        style={{
          padding: "17px",
          borderRadius: "18px",
          border: "1px solid rgba(71, 83, 73, 0.1)",
          background: "rgba(255, 255, 255, 0.54)",
        }}
      >
        <strong
          style={{
            display: "block",
            color: "#343c36",
          }}
        >
          No measured movement can be described yet
        </strong>

        <p
          style={{
            margin: "6px 0 0",
            color: "#69716b",
            fontSize: "0.9rem",
            lineHeight: 1.55,
          }}
        >
          Root recognised the available figures, but there is not yet enough
          comparable evidence to describe a trend or movement. This is normal
          for a first review or a workbook containing only one reporting
          period.
        </p>
      </div>
    )}

    <div
      style={{
        marginTop: "17px",
        padding: "14px 16px",
        borderRadius: "16px",
        background: "rgba(42, 48, 43, 0.055)",
        color: "#646b65",
        fontSize: "0.84rem",
        lineHeight: 1.55,
      }}
    >
      <strong style={{ color: "#3d453f" }}>Important:</strong>{" "}
      Root is reporting what changed in the evidence. Business events,
      leadership changes, workload or other circumstances may provide context,
      but Root is not claiming that any one factor caused the result.
    </div>
  </section>
) : null}

                  {spreadsheetFileName && (
                    <div className="importResult">
                      <div className="importHeader">
                        <div>
                          <p className="sectionLabel">
                            Root's analysis
                          </p>

                          <h3>{spreadsheetFileName}</h3>

                          <p>
                            Sheet: {spreadsheetSheetName} ·{" "}
                            {spreadsheetRowCount.toLocaleString("en-GB")} data
                            row
                            {spreadsheetRowCount === 1 ? "" : "s"}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="removeFileButton"
                          onClick={resetSpreadsheet}
                        >
                          Remove file
                        </button>
                      </div>

                      <div className="detectedSummary">
                        <strong>
                          {detectedCount} of 5 measures detected
                        </strong>

                        <span>
                          Check each figure before adding it to the review.
                        </span>
                      </div>

                      <div className="detectedMeasureList">
                        {Object.entries(MEASURE_LABELS).map(
                          ([measureKey, label]) => {
                            const value = detectedMeasures[measureKey];
                            const detected =
                              value !== "" &&
                              value !== null &&
                              value !== undefined;

                            return (
                              <div
                                className="detectedMeasureRow"
                                key={measureKey}
                              >
                                <div>
                                  <strong>{label}</strong>

                                  <span>
                                    {detectedSources[measureKey] ||
                                      "Not automatically detected"}
                                  </span>
                                </div>

                                <div className="detectedInputWrap">
                                  {measureKey === "agency_spend" && (
                                    <span className="inputPrefix">£</span>
                                  )}

                                  <input
                                    type="number"
                                    min="0"
                                    step={
                                      measureKey === "agency_spend"
                                        ? "0.01"
                                        : "1"
                                    }
                                    className={
                                      measureKey === "agency_spend"
                                        ? "measureInput currencyInput"
                                        : "measureInput"
                                    }
                                    value={value}
                                    placeholder="Enter figure"
                                    onChange={(event) =>
                                      updateDetectedMeasure(
                                        measureKey,
                                        event.target.value
                                      )
                                    }
                                  />

                                  <span
                                    className={
                                      detected
                                        ? "detectionStatus found"
                                        : "detectionStatus"
                                    }
                                  >
                                    {detected ? "✓" : "—"}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>

                      <button
                        type="button"
                        className="applyImportButton"
                        onClick={applyDetectedMeasures}
                      >
                        Add imported figures to this review
                      </button>

                      {spreadsheetPreviewRows.length > 0 && (
                        <details className="spreadsheetPreview">
                          <summary>View spreadsheet preview</summary>

                          <div className="tableScroller">
                            <table>
                              <thead>
                                <tr>
                                  {Object.keys(
                                    spreadsheetPreviewRows[0] || {}
                                  ).map((header) => (
                                    <th key={header}>{header}</th>
                                  ))}
                                </tr>
                              </thead>

                              <tbody>
                                {spreadsheetPreviewRows.map((row, rowIndex) => (
                                  <tr key={rowIndex}>
                                    {Object.keys(
                                      spreadsheetPreviewRows[0] || {}
                                    ).map((header) => (
                                      <td key={`${rowIndex}-${header}`}>
                                        {String(row?.[header] ?? "")}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </section>
              )}

              {dataMethod === "connected" && (
                <section className="glassCard connectedCard">
                  <div className="connectedIcon">↗</div>

                  <p className="sectionLabel">Connected systems</p>
                  <h2>Direct integrations are coming later</h2>

                  <p>
                    This area will eventually allow Root to receive approved
                    organisation measures from systems such as HR, payroll and
                    workforce-planning platforms.
                  </p>

                  <p>
                    Manual entry and spreadsheet import remain available now,
                    ensuring organisations are not dependent on an integration
                    before they can begin building evidence.
                  </p>

                  <button
                    type="button"
                    className="copyButton"
                    onClick={() => setDataMethod("spreadsheet")}
                  >
                    Upload a spreadsheet instead
                  </button>
                </section>
              )}

              {(dataMethod === "manual" ||
                dataMethod === "spreadsheet") && (
                <section className="glassCard">
                  <div className="cardHeader">
                    <div>
                      <p className="sectionLabel">Business measures</p>
                      <h2>Current organisation figures</h2>

                      <p>
                        Enter or review the figures available to your
                        organisation. You do not need to complete every field.
                      </p>
                    </div>

                    {previousReview && (
                      <button
                        className="copyButton"
                        type="button"
                        onClick={copyPreviousMeasures}
                      >
                        Use previous figures
                      </button>
                    )}
                  </div>

                  <div className="measureList">
                    <MeasureInput
                      label="Sickness days"
                      name="sickness_days"
                      value={measures.sickness_days}
                      previousValue={previousReview?.sickness_days}
                      onChange={handleMeasureChange}
                    />

                    <MeasureInput
                      label="Employee turnover"
                      name="turnover"
                      value={measures.turnover}
                      previousValue={previousReview?.turnover}
                      onChange={handleMeasureChange}
                    />

                    <MeasureInput
                      label="Agency spend"
                      name="agency_spend"
                      value={measures.agency_spend}
                      previousValue={previousReview?.agency_spend}
                      onChange={handleMeasureChange}
                      currency
                    />

                    <MeasureInput
                      label="Overtime hours"
                      name="overtime_hours"
                      value={measures.overtime_hours}
                      previousValue={previousReview?.overtime_hours}
                      onChange={handleMeasureChange}
                    />

                    <MeasureInput
                      label="Current vacancies"
                      name="vacancies"
                      value={measures.vacancies}
                      previousValue={previousReview?.vacancies}
                      onChange={handleMeasureChange}
                    />
                  </div>
                </section>
              )}

              <section className="glassCard">
                               <p className="sectionLabel">
                  Organisation context
                </p>

                <h2>
                  {spreadsheetMovementSummary
                    ? "What was happening in your organisation during this period?"
                    : "What has happened since the last review?"}
                </h2>

                <p className="cardIntro">
                  {spreadsheetMovementSummary
                    ? "Root can see movement in the evidence, but it does not know why it happened. Tell Root about any significant business events or changes that occurred during the same period so it can begin learning the wider context."
                    : "Select any business events that may help Root interpret the organisation's anonymous wellbeing evidence."}
                </p>

                <div className="choiceGrid">
                  {BUSINESS_EVENT_OPTIONS.map((option) => {
                    const active = selectedEvents.includes(option);

                    return (
                      <button
                        key={option}
                        type="button"
                        className={
                          active ? "choiceButton active" : "choiceButton"
                        }
                        onClick={() =>
                          setSelectedEvents((current) =>
                            toggleArrayItem(current, option)
                          )
                        }
                      >
                        <span>{active ? "✓" : "+"}</span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                <label className="fieldLabel">
                  Additional business context
                </label>

                <textarea
                  className="notesArea"
                  value={businessEventNotes}
                  onChange={(event) =>
                    setBusinessEventNotes(event.target.value)
                  }
                  placeholder="For example: Operations entered peak trading, a new senior leadership team was appointed, or several departments changed shift patterns."
                />
              </section>

              <section className="glassCard">
                <p className="sectionLabel">New initiatives</p>
                <h2>What support or changes have been introduced?</h2>

                <p className="cardIntro">
                  Root will remember when initiatives began and observe what
                  happened during the same period.
                </p>

                <div className="choiceGrid">
                  {INITIATIVE_OPTIONS.map((option) => {
                    const active = selectedInitiatives.includes(option);

                    return (
                      <button
                        key={option}
                        type="button"
                        className={
                          active ? "choiceButton active" : "choiceButton"
                        }
                        onClick={() =>
                          setSelectedInitiatives((current) =>
                            toggleArrayItem(current, option)
                          )
                        }
                      >
                        <span>{active ? "✓" : "+"}</span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                <label className="fieldLabel">
                  Additional initiative information
                </label>

                <textarea
                  className="notesArea"
                  value={initiativeNotes}
                  onChange={(event) =>
                    setInitiativeNotes(event.target.value)
                  }
                  placeholder="For example: Manager training began in Operations and Customer Services on 12 July."
                />
              </section>

              <section className="glassCard">
                <p className="sectionLabel">Observation priorities</p>
                <h2>What would you like Root to watch?</h2>

                <p className="cardIntro">
                  Root will look for meaningful relationships over time and
                  report them using an appropriate level of confidence.
                </p>

                <div className="watchGrid">
                  {WATCH_OPTIONS.map((option) => {
                    const active = selectedWatchItems.includes(option);

                    return (
                      <button
                        key={option}
                        type="button"
                        className={
                          active ? "watchButton active" : "watchButton"
                        }
                        onClick={() =>
                          setSelectedWatchItems((current) =>
                            toggleArrayItem(current, option)
                          )
                        }
                      >
                        <span className="checkBox">
                          {active ? "✓" : ""}
                        </span>

                        {option}
                      </button>
                    );
                  })}
                </div>

                <p className="evidenceNote">
                  Root reports observed relationships and direction. It does
                  not claim that one event or initiative caused an outcome
                  unless sufficient evidence supports that conclusion.
                </p>
              </section>

              <section className="reflectionCard">
                <p className="reflectionLabel">
                  Root&apos;s initial reflection
                </p>

                <h2>What Root will remember from this review</h2>

                <p className="reflectionText">{reflection}</p>

                <div className="confidenceBox">
                  <div className="confidenceSymbol">
                    {confidence.symbol}
                  </div>

                  <div>
                    <span>Organisation learning confidence</span>
                    <strong>{confidence.label}</strong>
                    <p>{confidence.detail}</p>
                  </div>
                </div>
              </section>

              <button
  className="saveButton"
  type="button"
  onClick={saveReview}
  disabled={saving}
>
  {saving
    ? isOnboarding
      ? "Creating your Root organisation..."
      : "Updating organisation picture..."
    : isOnboarding
      ? "Create Organisation & Begin 60-Day Pilot"
      : "Update Organisation Picture"}
</button>
            </div>

            <aside className="timelineColumn">
              <section className="timelineCard">
                <p className="sectionLabel">Organisation memory</p>
                <h2>Learning timeline</h2>

                <p>
                  Each completed review adds context to Root&apos;s
                  understanding of the organisation.
                </p>

                <div className="timeline">
                  <div className="timelineItem current">
                    <span className="timelineDot" />

                    <div>
                      <strong>Today</strong>
                      <p>Current organisation review</p>
                    </div>
                  </div>

                  {reviewHistory.length === 0 ? (
                    <div className="timelineItem">
                      <span className="timelineDot" />

                      <div>
                        <strong>Beginning</strong>
                        <p>No earlier reviews recorded</p>
                      </div>
                    </div>
                  ) : (
                    reviewHistory.slice(0, 6).map((review, index) => (
                      <div className="timelineItem" key={review.id}>
                        <span className="timelineDot" />

                        <div>
                          <strong>{formatDate(review.created_at)}</strong>

                          <p>
                            {index === 0
                              ? "Previous organisation review"
                              : "Organisation review"}
                          </p>

                          <small>
                            {(review.business_events?.length || 0) +
                              (review.initiatives?.length || 0)}{" "}
                            context item
                            {(review.business_events?.length || 0) +
                              (review.initiatives?.length || 0) ===
                            1
                              ? ""
                              : "s"}{" "}
                            recorded
                          </small>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="connectionCard">
                <p className="sectionLabel">One Root intelligence</p>

                <h2>How this connects</h2>

                <div className="connectionFlow">
                  <div>
                    <strong>Employee evidence</strong>

                    <span>
                      Assessments, check-ins, Mind, Journal and Voice
                    </span>
                  </div>

                  <span className="flowArrow">↓</span>

                  <div>
                    <strong>Organisation context</strong>

                    <span>
                      Measures, events, initiatives and priorities
                    </span>
                  </div>

                  <span className="flowArrow">↓</span>

                  <div>
                    <strong>Root intelligence</strong>

                    <span>
                      Evidence, memory, hypotheses and recommendations
                    </span>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </section>

        <style jsx>{pageStyles}</style>
      </main>
    </RootAtmosphere>
  );
}

const pageStyles = `
  .page {
    min-height: 100vh;
    padding: 28px;
    display: flex;
    justify-content: center;
  }

  .loadingPage {
    align-items: center;
    color: #5a554d;
    font-size: 17px;
  }

  .shell {
    width: 100%;
    max-width: 1220px;
    padding: 38px;
    border-radius: 42px;
    background: rgba(255, 255, 255, 0.34);
    border: 1px solid rgba(255, 255, 255, 0.56);
    backdrop-filter: blur(22px);
    box-shadow: 0 34px 100px rgba(20, 18, 15, 0.18);
  }

  .hero {
    max-width: 850px;
    margin: 0 auto 30px;
    text-align: center;
  }

  .kicker,
  .sectionLabel,
  .reflectionLabel {
    margin: 10px 0;
    color: #6f675b;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0 0 14px;
    color: #181818;
    font-size: clamp(38px, 6vw, 56px);
    line-height: 1.02;
    letter-spacing: -0.045em;
  }

  h2 {
    margin: 0 0 10px;
    color: #1c1b19;
    font-size: 26px;
    line-height: 1.2;
    letter-spacing: -0.025em;
  }

  h3 {
    margin: 0;
    color: #26221e;
  }

  p {
    line-height: 1.7;
  }

  .subtitle {
    max-width: 790px;
    margin: 0 auto;
    color: #5a554d;
    font-size: 17px;
  }

  .heroActions {
    margin-top: 22px;
    display: flex;
    gap: 12px;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }

  button {
    font: inherit;
  }

  .quietButton,
  .copyButton,
  .removeFileButton {
    padding: 11px 16px;
    border: 1px solid rgba(70, 63, 53, 0.15);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.58);
    color: #403b34;
    font-weight: 800;
    cursor: pointer;
  }

  .timePill {
    padding: 11px 16px;
    border-radius: 999px;
    background: rgba(35, 34, 31, 0.08);
    color: #585147;
    font-size: 13px;
    font-weight: 800;
  }

  .successMessage,
  .errorMessage,
  .importMessage,
  .importError {
    margin-bottom: 20px;
    padding: 16px 18px;
    border-radius: 18px;
    font-weight: 700;
    line-height: 1.55;
  }

  .successMessage,
  .importMessage {
    background: rgba(29, 139, 87, 0.12);
    border: 1px solid rgba(29, 139, 87, 0.18);
    color: #235c44;
  }

  .errorMessage,
  .importError {
    background: rgba(176, 64, 49, 0.1);
    border: 1px solid rgba(176, 64, 49, 0.18);
    color: #7b3027;
  }

  .importMessage,
  .importError {
    margin-top: 18px;
    margin-bottom: 0;
  }

  .pictureCard,
  .glassCard,
  .timelineCard,
  .connectionCard {
    border: 1px solid rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.46);
    box-shadow: 0 20px 55px rgba(39, 34, 28, 0.1);
    backdrop-filter: blur(20px);
  }

  .pictureCard {
    margin-bottom: 22px;
    padding: 28px;
    border-radius: 30px;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    align-items: center;
  }

  .pictureCard p {
    margin: 4px 0 0;
    color: #625b51;
  }

  .pictureStats {
    display: grid;
    grid-template-columns: repeat(3, minmax(120px, 1fr));
    gap: 10px;
  }

  .pictureStats div {
    min-width: 130px;
    padding: 15px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.52);
  }

  .pictureStats span,
  .pictureStats strong {
    display: block;
  }

  .pictureStats span {
    margin-bottom: 7px;
    color: #776f64;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .pictureStats strong {
    color: #24211d;
    font-size: 16px;
  }

  .contentGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 330px;
    gap: 22px;
    align-items: start;
  }

  .mainColumn {
    display: grid;
    gap: 22px;
  }

  .timelineColumn {
    position: sticky;
    top: 22px;
    display: grid;
    gap: 18px;
  }

  .glassCard,
  .timelineCard,
  .connectionCard {
    padding: 28px;
    border-radius: 30px;
  }

  .cardHeader,
  .importHeader {
    display: flex;
    gap: 20px;
    justify-content: space-between;
    align-items: flex-start;
  }

  .cardHeader p,
  .cardIntro,
  .timelineCard > p {
    margin: 4px 0 20px;
    color: #625b51;
  }

  .methodGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .methodButton {
    min-height: 108px;
    padding: 17px;
    border: 1px solid rgba(70, 63, 53, 0.13);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.52);
    color: #443f37;
    text-align: left;
    cursor: pointer;
    display: flex;
    gap: 13px;
    align-items: flex-start;
    transition:
      transform 0.18s ease,
      background 0.18s ease,
      border 0.18s ease;
  }

  .methodButton:hover {
    transform: translateY(-2px);
  }

  .methodButton.active {
    border-color: rgba(66, 105, 82, 0.32);
    background: rgba(83, 122, 96, 0.14);
    color: #294735;
  }

  .methodButton strong,
  .methodButton small {
    display: block;
  }

  .methodButton strong {
    margin-bottom: 7px;
    font-size: 15px;
  }

  .methodButton small {
    color: #756d61;
    line-height: 1.45;
  }

  .methodIcon {
    width: 33px;
    height: 33px;
    flex: 0 0 33px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.65);
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
    font-weight: 900;
  }

  .hiddenFileInput {
    display: none;
  }

  .dropZone {
    min-height: 280px;
    padding: 34px;
    border: 2px dashed rgba(72, 89, 76, 0.25);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top,
        rgba(255, 255, 255, 0.7),
        transparent 58%
      ),
      rgba(239, 243, 238, 0.5);
    text-align: center;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transition:
      transform 0.2s ease,
      border 0.2s ease,
      background 0.2s ease;
  }

  .dropZone:hover,
  .dropZone.dragging {
    transform: translateY(-2px);
    border-color: rgba(54, 104, 72, 0.56);
    background: rgba(224, 237, 226, 0.72);
  }

  .dropIcon {
    width: 68px;
    height: 68px;
    margin-bottom: 17px;
    border-radius: 22px;
    background: rgba(61, 112, 76, 0.13);
    color: #376548;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 34px;
  }

  .dropZone h3 {
    margin-bottom: 8px;
    font-size: 23px;
  }

  .dropZone p {
    margin: 0 0 16px;
    color: #696156;
  }

  .dropZone small {
    margin-top: 15px;
    color: #7c7468;
  }

  .browseButton {
    padding: 12px 20px;
    border-radius: 999px;
    background: #292b27;
    color: white;
    font-weight: 850;
  }

  .importResult {
    margin-top: 22px;
    padding: 22px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.56);
    border: 1px solid rgba(74, 67, 58, 0.1);
  }

  .importHeader p {
    margin: 5px 0 0;
    color: #6f675b;
  }

  .detectedSummary {
    margin: 20px 0 12px;
    padding: 14px 16px;
    border-radius: 17px;
    background: rgba(71, 107, 84, 0.1);
  }

  .detectedSummary strong,
  .detectedSummary span {
    display: block;
  }

  .detectedSummary strong {
    color: #315640;
  }

  .detectedSummary span {
    margin-top: 4px;
    color: #6a6359;
    font-size: 13px;
  }

  .detectedMeasureList {
    display: grid;
    gap: 9px;
  }

  .detectedMeasureRow {
    padding: 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.65);
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(210px, 0.9fr);
    gap: 16px;
    align-items: center;
  }

  .detectedMeasureRow strong,
  .detectedMeasureRow span {
    display: block;
  }

  .detectedMeasureRow span {
    margin-top: 4px;
    color: #756d62;
    font-size: 12px;
  }

  .detectedInputWrap {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 34px;
    gap: 8px;
    align-items: center;
  }

  .detectionStatus {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(87, 81, 72, 0.08);
    color: #847c71;
    display: flex !important;
    justify-content: center;
    align-items: center;
    font-weight: 900;
  }

  .detectionStatus.found {
    background: rgba(46, 126, 76, 0.13);
    color: #2e7448;
  }

  .applyImportButton {
    width: 100%;
    margin-top: 17px;
    padding: 15px 18px;
    border: 0;
    border-radius: 17px;
    background: #315b40;
    color: white;
    font-weight: 900;
    cursor: pointer;
  }

  .spreadsheetPreview {
    margin-top: 18px;
    border-top: 1px solid rgba(70, 63, 53, 0.1);
    padding-top: 17px;
  }

  .spreadsheetPreview summary {
    color: #4c463e;
    font-weight: 850;
    cursor: pointer;
  }

  .tableScroller {
    margin-top: 14px;
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 650px;
    border-collapse: collapse;
    background: rgba(255, 255, 255, 0.58);
  }

  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(70, 63, 53, 0.09);
    text-align: left;
    font-size: 12px;
    white-space: nowrap;
  }

  th {
    color: #454039;
    background: rgba(52, 56, 51, 0.06);
  }

  td {
    color: #696156;
  }

  .connectedCard {
    text-align: center;
  }

  .connectedCard > p {
    max-width: 650px;
    margin-left: auto;
    margin-right: auto;
    color: #625b51;
  }

  .connectedIcon {
    width: 68px;
    height: 68px;
    margin: 0 auto 18px;
    border-radius: 22px;
    background: rgba(61, 112, 76, 0.13);
    color: #376548;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 30px;
    font-weight: 900;
  }

  .measureList {
    margin-top: 20px;
    display: grid;
    gap: 10px;
  }

  .measureRow {
    padding: 16px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.5);
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(190px, 0.8fr);
    gap: 18px;
    align-items: center;
  }

  .measureIdentity strong,
  .measureIdentity span {
    display: block;
  }

  .measureIdentity strong {
    margin-bottom: 5px;
    color: #26231f;
    font-size: 16px;
  }

  .measureIdentity span {
    color: #786f63;
    font-size: 13px;
  }

  .inputWrap,
  .detectedInputWrap {
    position: relative;
  }

  .inputPrefix {
    position: absolute;
    top: 50%;
    left: 15px;
    z-index: 2;
    color: #72695e;
    font-weight: 800;
    transform: translateY(-50%);
  }

  .measureInput,
  .notesArea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(70, 63, 53, 0.13);
    outline: none;
    background: rgba(255, 255, 255, 0.74);
    color: #25221e;
    transition:
      border 0.2s ease,
      box-shadow 0.2s ease;
  }

  .measureInput {
    padding: 13px 14px;
    border-radius: 14px;
    font-size: 15px;
  }

  .currencyInput {
    padding-left: 31px;
  }

  .measureInput:focus,
  .notesArea:focus {
    border-color: rgba(80, 104, 90, 0.42);
    box-shadow: 0 0 0 4px rgba(80, 104, 90, 0.08);
  }

  .choiceGrid,
  .watchGrid {
    margin: 18px 0 22px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .choiceButton,
  .watchButton {
    min-height: 52px;
    padding: 12px 14px;
    border: 1px solid rgba(70, 63, 53, 0.12);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.5);
    color: #514a40;
    font-weight: 750;
    text-align: left;
    cursor: pointer;
    display: flex;
    gap: 10px;
    align-items: center;
    transition:
      transform 0.18s ease,
      background 0.18s ease;
  }

  .choiceButton:hover,
  .watchButton:hover {
    transform: translateY(-1px);
  }

  .choiceButton.active,
  .watchButton.active {
    border-color: rgba(72, 105, 84, 0.28);
    background: rgba(83, 122, 96, 0.13);
    color: #294735;
  }

  .choiceButton span {
    width: 24px;
    color: #4c775c;
    font-size: 17px;
    font-weight: 900;
  }

  .checkBox {
    width: 24px;
    height: 24px;
    border: 1px solid rgba(70, 63, 53, 0.2);
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.62);
    display: inline-flex;
    justify-content: center;
    align-items: center;
    color: #315b40;
    font-weight: 900;
  }

  .fieldLabel {
    margin: 6px 0 9px;
    display: block;
    color: #4c463e;
    font-size: 14px;
    font-weight: 850;
  }

  .notesArea {
    min-height: 130px;
    padding: 15px;
    border-radius: 18px;
    resize: vertical;
    font-family: inherit;
    font-size: 15px;
    line-height: 1.6;
  }

  .evidenceNote {
    margin: 18px 0 0;
    padding: 14px 16px;
    border-radius: 16px;
    background: rgba(40, 37, 32, 0.055);
    color: #696156;
    font-size: 13px;
  }

  .reflectionCard {
    padding: 30px;
    border-radius: 30px;
    color: white;
    background:
      radial-gradient(
        circle at top right,
        rgba(255, 255, 255, 0.15),
        transparent 38%
      ),
      linear-gradient(
        135deg,
        rgba(27, 30, 28, 0.97),
        rgba(57, 62, 55, 0.94)
      );
    box-shadow: 0 24px 65px rgba(25, 27, 24, 0.24);
  }

  .reflectionCard h2 {
    color: white;
  }

  .reflectionLabel {
    color: rgba(255, 255, 255, 0.68);
  }

  .reflectionText {
    margin: 14px 0 22px;
    color: rgba(255, 255, 255, 0.84);
    font-size: 16px;
  }

  .confidenceBox {
    padding: 16px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.09);
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .confidenceSymbol {
    font-size: 27px;
  }

  .confidenceBox span,
  .confidenceBox strong {
    display: block;
  }

  .confidenceBox span {
    color: rgba(255, 255, 255, 0.62);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .confidenceBox strong {
    margin-top: 3px;
    font-size: 18px;
  }

  .confidenceBox p {
    margin: 5px 0 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
  }

  .saveButton {
    width: 100%;
    min-height: 62px;
    padding: 17px 24px;
    border: 0;
    border-radius: 22px;
    background: #22231f;
    color: white;
    box-shadow: 0 18px 38px rgba(34, 35, 31, 0.22);
    font-size: 17px;
    font-weight: 900;
    cursor: pointer;
  }

  .saveButton:disabled {
    opacity: 0.62;
    cursor: wait;
  }

  .timeline {
    margin-top: 22px;
  }

  .timelineItem {
    position: relative;
    min-height: 76px;
    padding: 0 0 22px 31px;
    border-left: 1px solid rgba(84, 76, 65, 0.19);
  }

  .timelineItem:last-child {
    border-left-color: transparent;
  }

  .timelineDot {
    position: absolute;
    top: 2px;
    left: -7px;
    width: 13px;
    height: 13px;
    border: 3px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    background: #7d7467;
    box-shadow: 0 0 0 1px rgba(84, 76, 65, 0.18);
  }

  .timelineItem.current .timelineDot {
    background: #3d7653;
  }

  .timelineItem strong {
    display: block;
    color: #2d2924;
    font-size: 14px;
  }

  .timelineItem p {
    margin: 4px 0;
    color: #635c52;
    font-size: 13px;
  }

  .timelineItem small {
    color: #82796d;
    line-height: 1.45;
  }

  .connectionFlow {
    margin-top: 20px;
    display: grid;
    gap: 10px;
  }

  .connectionFlow div {
    padding: 15px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.52);
  }

  .connectionFlow strong,
  .connectionFlow span {
    display: block;
  }

  .connectionFlow strong {
    margin-bottom: 5px;
    color: #2b2823;
  }

  .connectionFlow div span {
    color: #6e665b;
    font-size: 12px;
    line-height: 1.5;
  }

  .flowArrow {
    text-align: center;
    color: #857c70;
    font-weight: 900;
  }

  @media (max-width: 980px) {
    .contentGrid {
      grid-template-columns: 1fr;
    }

    .timelineColumn {
      position: static;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pictureCard {
      align-items: stretch;
      flex-direction: column;
    }

    .methodGrid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .page {
      padding: 12px;
    }

    .shell {
      padding: 20px;
      border-radius: 28px;
    }

    .pictureStats,
    .timelineColumn,
    .choiceGrid,
    .watchGrid {
      grid-template-columns: 1fr;
    }

    .measureRow,
    .detectedMeasureRow {
      grid-template-columns: 1fr;
    }

    .cardHeader,
    .importHeader {
      flex-direction: column;
    }

    .copyButton,
    .removeFileButton {
      width: 100%;
    }

    .glassCard,
    .timelineCard,
    .connectionCard,
    .pictureCard,
    .reflectionCard {
      padding: 22px;
      border-radius: 24px;
    }

    .dropZone {
      min-height: 230px;
      padding: 25px 18px;
    }
      .reviewCompleteCard {
  margin-bottom: 24px;
  padding: 34px;
  border-radius: 30px;
  text-align: center;
  background: rgba(40,110,70,0.08);
  border: 1px solid rgba(40,110,70,0.18);
}

.reviewCompleteIcon {
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(40,110,70,0.12);
  color: #2d6a4f;
  font-size: 34px;
  font-weight: 800;
}

.reviewCompleteText {
  max-width: 760px;
  margin: 18px auto;
  color: #5d5a54;
}

.reviewChecklist {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(220px,1fr));
  gap: 12px;
  margin: 28px 0;
}

.reviewChecklist div {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.6);
  font-weight: 700;
}

.reviewCompleteButtons {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 24px;
}

/* Close the earlier mobile-only media query here. */
}

.onboardingCard {
    margin-bottom: 22px;
    padding: 30px;
    border-radius: 30px;
    background:
      linear-gradient(
        145deg,
        rgba(232, 240, 229, 0.82),
        rgba(255, 255, 255, 0.58)
      );
    border: 1px solid rgba(82, 105, 82, 0.18);
    box-shadow: 0 22px 62px rgba(39, 55, 44, 0.1);
  }

  .onboardingGrid {
    margin-top: 24px;
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 17px;
  }

  .onboardingField {
    display: grid;
    gap: 8px;
  }

  .onboardingField span {
    color: #343b35;
    font-size: 13px;
    font-weight: 800;
  }

  .onboardingField input,
  .onboardingField select {
    width: 100%;
    min-height: 50px;
    padding: 13px 15px;
    border-radius: 16px;
    border: 1px solid rgba(46, 61, 49, 0.16);
    background: rgba(255, 255, 255, 0.76);
    color: #181818;
    font: inherit;
    outline: none;
    box-sizing: border-box;
  }

  .onboardingField input:focus,
  .onboardingField select:focus {
    border-color: rgba(66, 105, 82, 0.5);
    box-shadow: 0 0 0 4px rgba(66, 105, 82, 0.08);
  }

  .onboardingWide {
    grid-column: 1 / -1;
  }

  .onboardingPromise {
    margin-top: 22px;
    padding: 18px 20px;
    border-radius: 20px;
    display: grid;
    gap: 6px;
    background: rgba(38, 59, 43, 0.9);
    color: #ffffff;
  }

  .onboardingPromise span {
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.6;
  }

  @media (max-width: 720px) {
    .onboardingGrid {
      grid-template-columns: 1fr;
    }

    .onboardingWide {
      grid-column: auto;
    }
  }
`;
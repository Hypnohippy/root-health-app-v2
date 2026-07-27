"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

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

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

    if (authError || !user) {
      window.location.href = "/login";
      return;
    }

    const { data: member, error: membershipError } = await supabase
      .from("organisation_members")
      .select(
        "id, organisation_id, profile_key, email, name, department, role"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !member) {
      await supabase.auth.signOut();
      window.location.href = "/login";
      return;
    }

    const allowedRoles = ["hr_admin", "organisation_admin"];

    if (!allowedRoles.includes(member.role)) {
      window.location.href = "/";
      return;
    }

    setMembership({
      ...member,
      user_id: user.id,
    });

    localStorage.setItem("root_profile_key_v1", member.profile_key);

    localStorage.setItem(
      "root_hr_org_v1",
      JSON.stringify({
        organisation_id: member.organisation_id,
        role: member.role,
      })
    );

    const { data: org, error: organisationError } = await supabase
      .from("organisations")
      .select("*")
      .eq("id", member.organisation_id)
      .maybeSingle();

    if (organisationError) {
      setErrorMessage(
        "Root could not load this organisation. Please refresh the page."
      );
      setLoading(false);
      return;
    }

    setOrganisation(org || null);

    const { data: reviews, error: reviewError } = await supabase
      .from("organisation_learning_reviews")
      .select("*")
      .eq("organisation_id", member.organisation_id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (reviewError) {
      console.error("Organisation review load error:", reviewError);

      setErrorMessage(
        "The page is ready, but Root could not load previous organisation reviews."
      );
    }

    const safeReviews = Array.isArray(reviews) ? reviews : [];
    const latestReview = safeReviews[0] || null;

    setPreviousReview(latestReview);
    setReviewHistory(safeReviews);

    if (latestReview?.watch_items?.length) {
      setSelectedWatchItems(latestReview.watch_items);
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
        (value) => value !== "" && value !== null && value !== undefined
      ).length,
    [detectedMeasures]
  );

  function goBackToOrganisationInsights() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/insights-org");
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
    setSpreadsheetMessage("");
    setSpreadsheetError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function processSpreadsheetFile(file) {
    setSpreadsheetError("");
    setSpreadsheetMessage("");

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

      const firstSheetName = workbook.SheetNames?.[0];

      if (!firstSheetName) {
        throw new Error("No spreadsheet sheet was found.");
      }

      const worksheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(
          "The spreadsheet appears to be empty or does not contain a recognised table."
        );
      }

      const extraction = extractMeasuresFromRows(rows);

      setSpreadsheetFileName(file.name);
      setSpreadsheetSheetName(firstSheetName);
      setSpreadsheetRowCount(rows.length);
      setSpreadsheetPreviewRows(rows.slice(0, 5));
      setDetectedMeasures(extraction.detected);
      setDetectedSources(extraction.sourceDetails);

      const foundCount = Object.values(extraction.detected).filter(
        (value) => value !== ""
      ).length;

      if (foundCount > 0) {
        setSpreadsheetMessage(
          `Root detected ${foundCount} of the 5 organisation measures. Review them below before adding them to this review.`
        );
      } else {
        setSpreadsheetMessage(
          "The spreadsheet opened successfully, but Root could not automatically identify the five organisation measures. You can still use the preview to enter the figures manually."
        );
      }
    } catch (error) {
      console.error("Spreadsheet import error:", error);

      setSpreadsheetError(
        error?.message ||
          "Root could not read this spreadsheet. Please check the file and try again."
      );

      resetSpreadsheet();
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

  async function saveReview() {
    if (!membership?.organisation_id) {
      setErrorMessage("Root could not identify the organisation.");
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

    setMessage(
      "Organisation picture updated. Root can now use this context alongside anonymous workforce evidence."
    );

    setSaving(false);

    window.scrollTo({
      top: 0,
      behaviour: "smooth",
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

            <h1>Organisation Learning Review</h1>

            <p className="subtitle">
              Help Root understand what has changed across your organisation.
              Root combines this context with anonymous workforce evidence to
              build a clearer and more useful picture over time.
            </p>

            <div className="heroActions">
              <button
                className="quietButton"
                type="button"
                onClick={goBackToOrganisationInsights}
              >
                ← Back to Organisation Insights
              </button>

              <span className="timePill">Estimated time: 2–3 minutes</span>
            </div>
          </header>

          {message && <div className="successMessage">{message}</div>}

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
                    Root will inspect the first worksheet and look for sickness,
                    turnover, agency spend, overtime and vacancy data.
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

                  {spreadsheetFileName && (
                    <div className="importResult">
                      <div className="importHeader">
                        <div>
                          <p className="sectionLabel">
                            Spreadsheet imported
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
                <p className="sectionLabel">Organisation context</p>
                <h2>What has happened since the last review?</h2>

                <p className="cardIntro">
                  Select any business events that may help Root interpret the
                  organisation&apos;s anonymous wellbeing evidence.
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
                    <span>Evidence confidence</span>
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
                  ? "Updating organisation picture..."
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
  }
`;
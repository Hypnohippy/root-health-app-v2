"use client";

import { useEffect, useMemo, useState } from "react";
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
    Math.floor((today.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24))
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organisation, setOrganisation] = useState(null);
  const [membership, setMembership] = useState(null);
  const [previousReview, setPreviousReview] = useState(null);
  const [reviewHistory, setReviewHistory] = useState([]);

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

    setMessage(
      "Organisation picture updated. Root can now use this context alongside anonymous workforce evidence."
    );

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

            <h1>Organisation Learning Review</h1>

            <p className="subtitle">
              Help Root understand what has changed across your organisation.
              Root combines this context with anonymous workforce evidence to
              build a clearer and more useful picture over time.
            </p>

            <div className="heroActions">
              <button
                className="quietButton"
                onClick={() => {
                  window.location.href = "/insights-org";
                }}
              >
                ← Organisation Insights
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

              <h2>
                {organisation?.name || "Your organisation"}
              </h2>

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
                <div className="cardHeader">
                  <div>
                    <p className="sectionLabel">Business measures</p>
                    <h2>What has changed since the last review?</h2>
                    <p>
                      Enter the current figures available to your
                      organisation. You do not need to complete every field.
                    </p>
                  </div>

                  {previousReview && (
                    <button
                      className="copyButton"
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
                <p className="reflectionLabel">Root&apos;s initial reflection</p>

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
  .copyButton {
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
  .errorMessage {
    margin-bottom: 20px;
    padding: 16px 18px;
    border-radius: 18px;
    font-weight: 700;
    line-height: 1.55;
  }

  .successMessage {
    background: rgba(29, 139, 87, 0.12);
    border: 1px solid rgba(29, 139, 87, 0.18);
    color: #235c44;
  }

  .errorMessage {
    background: rgba(176, 64, 49, 0.1);
    border: 1px solid rgba(176, 64, 49, 0.18);
    color: #7b3027;
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

  .cardHeader {
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

  .inputWrap {
    position: relative;
  }

  .inputPrefix {
    position: absolute;
    top: 50%;
    left: 15px;
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
    transition: border 0.2s ease, box-shadow 0.2s ease;
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
    transition: transform 0.18s ease, background 0.18s ease;
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
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.15), transparent 38%),
      linear-gradient(135deg, rgba(27, 30, 28, 0.97), rgba(57, 62, 55, 0.94));
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

    .measureRow {
      grid-template-columns: 1fr;
    }

    .cardHeader {
      flex-direction: column;
    }

    .copyButton {
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
  }
`;

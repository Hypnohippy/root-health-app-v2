"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase";

const EMPTY_FORM = {
  name: "",
  contactName: "",
  contactEmail: "",
  referralCode: "",
  commissionPercent: "20",
  commissionStructure: "one_off",
  agreementStartDate: "",
  agreementEndDate: "",
  status: "active",
  notes: "",
};
const EMPTY_CAMPAIGN_FORM = {
  campaignName: "",
  campaignCode: "",
  status: "active",
  startsAt: "",
  endsAt: "",
  notes: "",
};

const EMPTY_COMMERCIAL_FORM = {
  commissionPercent: "",
  commissionStructure: "one_off",
  effectiveTiming: "immediate",
  effectiveDate: "",
  changeReason: "",
  notes: "",
};

function money(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-GB",
    {
      style: "currency",
      currency: "GBP",
    }
  );
}

function formatStructure(value) {
  if (value === "recurring") {
    return "Recurring";
  }

  return "One-off";
}

export default function IntroducerAdminPage() {
  const [
    introducers,
    setIntroducers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");
    const [
    commercialEditorId,
    setCommercialEditorId,
  ] = useState(null);

  const [
    commercialForm,
    setCommercialForm,
  ] = useState(
    EMPTY_COMMERCIAL_FORM
  );

  const [
    commercialSaving,
    setCommercialSaving,
  ] = useState(false);
    const [
    campaignManagerId,
    setCampaignManagerId,
  ] = useState(null);

  const [
    campaigns,
    setCampaigns,
  ] = useState([]);

  const [
    campaignLoading,
    setCampaignLoading,
  ] = useState(false);

  const [
    campaignSaving,
    setCampaignSaving,
  ] = useState(false);

  const [
    campaignForm,
    setCampaignForm,
  ] = useState(
    EMPTY_CAMPAIGN_FORM
  );

  async function getAccessToken() {
    const {
      data,
    } =
      await supabase.auth
        .getSession();

    return (
      data?.session
        ?.access_token ||
      null
    );
  }

  async function loadIntroducers() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please sign in with your Root administrator account."
        );

        setLoading(false);
        return;
      }

      const response =
        await fetch(
          "/api/admin/introducers",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            cache:
              "no-store",
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        setError(
          result?.error ||
          "Root could not load introducers."
        );

        setLoading(false);
        return;
      }

      setIntroducers(
        result.introducers ||
        []
      );

      setLoading(false);
    } catch (loadError) {
      console.error(
        "ROOT INTRODUCER PAGE LOAD ERROR:",
        loadError
      );

      setError(
        "Root could not load introducers."
      );

      setLoading(false);
    }
  }

  useEffect(() => {
    loadIntroducers();
  }, []);

  function updateForm(
    field,
    value
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      })
    );
  }

  function updateName(value) {
    setForm(
      (current) => {
        const shouldGenerateCode =
          !current.referralCode ||
          current.referralCode ===
            current.name
              .toLowerCase()
              .replace(
                /[^a-z0-9]+/g,
                "-"
              )
              .replace(
                /^-+|-+$/g,
                ""
              );

        const generatedCode =
          value
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-"
            )
            .replace(
              /^-+|-+$/g,
              ""
            );

        return {
          ...current,
          name: value,
          referralCode:
            shouldGenerateCode
              ? generatedCode
              : current.referralCode,
        };
      }
    );
  }

  async function createIntroducer(
    event
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please sign in again before creating an introducer."
        );

        setSaving(false);
        return;
      }

      const response =
        await fetch(
          "/api/admin/introducers",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                form
              ),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        setError(
          result?.error ||
          "Root could not create the introducer."
        );

        setSaving(false);
        return;
      }

      setMessage(
        `${result.introducer.name} has been created with referral code ${result.introducer.referral_code}.`
      );

      setForm(
        EMPTY_FORM
      );

      setFormOpen(false);
      setSaving(false);

      await loadIntroducers();
    } catch (saveError) {
      console.error(
        "ROOT INTRODUCER CREATE ERROR:",
        saveError
      );

      setError(
        "Root could not create the introducer."
      );

      setSaving(false);
    }
  }
    function todayDateValue() {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;
  }

  function openCommercialEditor(
    introducer
  ) {
    setCommercialEditorId(
      introducer.id
    );

    setCommercialForm({
      commissionPercent:
        String(
          introducer.commission_percent ??
            ""
        ),

            commissionStructure:
        introducer.commission_structure ||
        "one_off",

      effectiveTiming:
        "immediate",

      effectiveDate:
        "",

      changeReason:
        "",
      notes:
        "",
    });

    setError("");
    setMessage("");
  }

  function closeCommercialEditor() {
    if (commercialSaving) {
      return;
    }

    setCommercialEditorId(
      null
    );

    setCommercialForm(
      EMPTY_COMMERCIAL_FORM
    );
  }

  function updateCommercialForm(
    field,
    value
  ) {
    setCommercialForm(
      (current) => ({
        ...current,
        [field]:
          value,
      })
    );
  }

  async function saveCommercialTerms(
    event,
    introducer
  ) {
    event.preventDefault();

    setCommercialSaving(true);
    setError("");
    setMessage("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please sign in again before changing commercial terms."
        );

        setCommercialSaving(false);
        return;
      }

      const response =
        await fetch(
          "/api/admin/introducers",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                action:
                  "change_commercial_terms",

                introducerId:
                  introducer.id,

                commissionPercent:
                  commercialForm.commissionPercent,

                                commissionStructure:
                  commercialForm.commissionStructure,

                effectiveMode:
                  commercialForm.effectiveTiming ===
                  "immediate"
                    ? "immediate"
                    : "date",

                effectiveDate:
                  commercialForm.effectiveDate,

                changeReason:
                  commercialForm.changeReason,

                notes:
                  commercialForm.notes,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        setError(
          result?.error ||
          "Root could not change the commercial terms."
        );

        setCommercialSaving(false);
        return;
      }

      setMessage(
        `${introducer.name} commercial terms changed to ${Number(
          commercialForm.commissionPercent
        ).toLocaleString(
          "en-GB",
          {
            maximumFractionDigits: 2,
          }
        )}% ${formatStructure(
          commercialForm.commissionStructure
        ).toLowerCase()}.`
      );

      setCommercialEditorId(
        null
      );

      setCommercialForm(
        EMPTY_COMMERCIAL_FORM
      );

      setCommercialSaving(false);

      await loadIntroducers();
    } catch (saveError) {
      console.error(
        "ROOT INTRODUCER COMMERCIAL SAVE ERROR:",
        saveError
      );

      setError(
        "Root could not change the commercial terms."
      );

      setCommercialSaving(false);
    }
  }
    function campaignCodeFromName(
    value
  ) {
    return String(value || "")
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );
  }

  function updateCampaignForm(
    field,
    value
  ) {
    setCampaignForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function updateCampaignName(
    value
  ) {
    setCampaignForm(
      (current) => {
        const oldGeneratedCode =
          campaignCodeFromName(
            current.campaignName
          );

        const shouldGenerateCode =
          !current.campaignCode ||
          current.campaignCode ===
            oldGeneratedCode;

        return {
          ...current,

          campaignName:
            value,

          campaignCode:
            shouldGenerateCode
              ? campaignCodeFromName(
                  value
                )
              : current.campaignCode,
        };
      }
    );
  }

  async function loadCampaigns(
    introducer
  ) {
    setCampaignLoading(true);
    setError("");
    setMessage("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please sign in again before managing campaigns."
        );

        setCampaignLoading(false);
        return;
      }

      const response =
        await fetch(
          "/api/admin/introducers",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                action:
                  "get_campaigns",

                introducerId:
                  introducer.id,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        setError(
          result?.error ||
            "Root could not load campaigns."
        );

        setCampaignLoading(false);
        return;
      }

      setCampaigns(
        result.campaigns || []
      );

      setCampaignLoading(false);
    } catch (loadError) {
      console.error(
        "ROOT CAMPAIGN LOAD ERROR:",
        loadError
      );

      setError(
        "Root could not load campaigns."
      );

      setCampaignLoading(false);
    }
  }

  async function openCampaignManager(
    introducer
  ) {
    if (
      campaignManagerId ===
      introducer.id
    ) {
      setCampaignManagerId(null);
      setCampaigns([]);
      setCampaignForm(
        EMPTY_CAMPAIGN_FORM
      );

      return;
    }

    setCampaignManagerId(
      introducer.id
    );

    setCampaignForm(
      EMPTY_CAMPAIGN_FORM
    );

    await loadCampaigns(
      introducer
    );
  }

  async function createCampaign(
    event,
    introducer
  ) {
    event.preventDefault();

    setCampaignSaving(true);
    setError("");
    setMessage("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please sign in again before creating a campaign."
        );

        setCampaignSaving(false);
        return;
      }

      const response =
        await fetch(
          "/api/admin/introducers",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                action:
                  "create_campaign",

                introducerId:
                  introducer.id,

                ...campaignForm,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        setError(
          result?.error ||
            "Root could not create the campaign."
        );

        setCampaignSaving(false);
        return;
      }

      setCampaignForm(
        EMPTY_CAMPAIGN_FORM
      );

      setMessage(
        `${result.campaign.campaign_name} campaign created.`
      );

      setCampaignSaving(false);

      await loadCampaigns(
        introducer
      );
    } catch (saveError) {
      console.error(
        "ROOT CAMPAIGN CREATE ERROR:",
        saveError
      );

      setError(
        "Root could not create the campaign."
      );

      setCampaignSaving(false);
    }
  }

  async function changeCampaignStatus(
    campaign,
    introducer
  ) {
    setCampaignSaving(true);
    setError("");
    setMessage("");

    const newStatus =
      campaign.status === "active"
        ? "inactive"
        : "active";

    try {
      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please sign in again before changing campaign status."
        );

        setCampaignSaving(false);
        return;
      }

      const response =
        await fetch(
          "/api/admin/introducers",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                action:
                  "change_campaign_status",

                campaignId:
                  campaign.id,

                status:
                  newStatus,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        setError(
          result?.error ||
            "Root could not change campaign status."
        );

        setCampaignSaving(false);
        return;
      }

      setMessage(
        `${campaign.campaign_name} is now ${newStatus}.`
      );

      setCampaignSaving(false);

      await loadCampaigns(
        introducer
      );
    } catch (saveError) {
      console.error(
        "ROOT CAMPAIGN STATUS ERROR:",
        saveError
      );

      setError(
        "Root could not change campaign status."
      );

      setCampaignSaving(false);
    }
  }

  async function copyText(
    value,
    successMessage
  ) {
    try {
      await navigator.clipboard.writeText(
        value
      );

      setMessage(
        successMessage
      );

      setError("");
    } catch (copyError) {
      console.error(
        "ROOT COPY LINK ERROR:",
        copyError
      );

      setError(
        "Root could not copy the link."
      );
    }
  }

  function referralLink(
    introducer
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return "";
    }

    return (
      `${window.location.origin}` +
      `/workplace?ref=` +
      encodeURIComponent(
        introducer.referral_code
      )
    );
  }

  function campaignLink(
    introducer,
    campaign
  ) {
    return (
      referralLink(
        introducer
      ) +
      `&campaign=` +
      encodeURIComponent(
        campaign.campaign_code
      )
    );
  }
  const totals =
    useMemo(
      () => {
        return introducers.reduce(
          (
            summary,
            introducer
          ) => ({
            introducers:
              summary.introducers +
              1,

            conversions:
              summary.conversions +
              Number(
                introducer.paid_conversion_count ||
                  0
              ),

            earned:
              summary.earned +
              Number(
                introducer.commission_earned ||
                  0
              ),

            outstanding:
              summary.outstanding +
              Number(
                introducer.commission_outstanding ||
                  0
              ),
          }),
          {
            introducers: 0,
            conversions: 0,
            earned: 0,
            outstanding: 0,
          }
        );
      },
      [
        introducers,
      ]
    );

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.topRow}>
          <div>
            <p style={styles.kicker}>
              ROOT COMMERCIAL
            </p>

            <h1 style={styles.title}>
              Introducers
            </h1>

            <p style={styles.intro}>
              Manage Root referral
              partners, their current
              commercial terms and the
              revenue they generate.
            </p>
          </div>

          <div style={styles.topActions}>
            <button
              type="button"
              style={
                styles.secondaryButton
              }
              onClick={
                loadIntroducers
              }
            >
              Refresh
            </button>

            <button
              type="button"
              style={
                styles.primaryButton
              }
              onClick={() => {
                setFormOpen(
                  (open) =>
                    !open
                );

                setError("");
                setMessage("");
              }}
            >
              {formOpen
                ? "Close"
                : "+ New Introducer"}
            </button>
          </div>
        </div>

        {error ? (
          <div style={styles.error}>
            {error}

            {error.includes(
              "sign in"
            ) ? (
              <button
                type="button"
                style={
                  styles.signInButton
                }
                onClick={() => {
                  window.location.href =
                    "/login";
                }}
              >
                Sign in
              </button>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <div style={styles.success}>
            {message}
          </div>
        ) : null}

        <div style={styles.summaryGrid}>
          <SummaryCard
            label="Introducers"
            value={
              totals.introducers
            }
          />

          <SummaryCard
            label="Paid conversions"
            value={
              totals.conversions
            }
          />

          <SummaryCard
            label="Commission earned"
            value={
              money(
                totals.earned
              )
            }
          />

          <SummaryCard
            label="Outstanding"
            value={
              money(
                totals.outstanding
              )
            }
          />
        </div>

        {formOpen ? (
          <form
            style={
              styles.formCard
            }
            onSubmit={
              createIntroducer
            }
          >
            <div style={styles.formHeading}>
              <div>
                <p
                  style={
                    styles.sectionKicker
                  }
                >
                  NEW PARTNER
                </p>

                <h2
                  style={
                    styles.sectionTitle
                  }
                >
                  Create introducer
                </h2>
              </div>

              <span
                style={
                  styles.privateBadge
                }
              >
                Internal only
              </span>
            </div>

            <div style={styles.formGrid}>
              <Field
                label="Introducer name"
                required
              >
                <input
                  style={styles.input}
                  value={
                    form.name
                  }
                  onChange={
                    (event) =>
                      updateName(
                        event.target
                          .value
                      )
                  }
                  placeholder="Example Partner Ltd"
                  required
                />
              </Field>

              <Field
                label="Referral code"
                required
                hint="Used in referral links."
              >
                <input
                  style={styles.input}
                  value={
                    form.referralCode
                  }
                  onChange={
                    (event) =>
                      updateForm(
                        "referralCode",
                        event.target
                          .value
                      )
                  }
                  placeholder="example-partner"
                  required
                />
              </Field>

              <Field
                label="Contact name"
              >
                <input
                  style={styles.input}
                  value={
                    form.contactName
                  }
                  onChange={
                    (event) =>
                      updateForm(
                        "contactName",
                        event.target
                          .value
                      )
                  }
                  placeholder="Jane Smith"
                />
              </Field>

              <Field
                label="Contact email"
              >
                <input
                  type="email"
                  style={styles.input}
                  value={
                    form.contactEmail
                  }
                  onChange={
                    (event) =>
                      updateForm(
                        "contactEmail",
                        event.target
                          .value
                      )
                  }
                  placeholder="jane@example.com"
                />
              </Field>

              <Field
                label="Commission %"
                required
              >
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  style={styles.input}
                  value={
                    form.commissionPercent
                  }
                  onChange={
                    (event) =>
                      updateForm(
                        "commissionPercent",
                        event.target
                          .value
                      )
                  }
                  required
                />
              </Field>

              <Field
                label="Commission structure"
                required
              >
                <select
                  style={styles.input}
                  value={
                    form.commissionStructure
                  }
                  onChange={
                    (event) =>
                      updateForm(
                        "commissionStructure",
                        event.target
                          .value
                      )
                  }
                >
                  <option value="one_off">
                    One-off
                  </option>

                  <option value="recurring">
                    Recurring
                  </option>
                </select>
              </Field>

              <Field
                label="Agreement start"
              >
                <input
                  type="date"
                  style={styles.input}
                  value={
                    form.agreementStartDate
                  }
                  onChange={
                    (event) =>
                      updateForm(
                        "agreementStartDate",
                        event.target
                          .value
                      )
                  }
                />
              </Field>

              <Field
                label="Agreement end"
              >
                <input
                  type="date"
                  style={styles.input}
                  value={
                    form.agreementEndDate
                  }
                  onChange={
                    (event) =>
                      updateForm(
                        "agreementEndDate",
                        event.target
                          .value
                      )
                  }
                />
              </Field>

              <Field
                label="Status"
              >
                <select
                  style={styles.input}
                  value={
                    form.status
                  }
                  onChange={
                    (event) =>
                      updateForm(
                        "status",
                        event.target
                          .value
                      )
                  }
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>
              </Field>

              <Field
                label="Commission basis"
                hint="Root only commissions qualifying money actually collected."
              >
                <div
                  style={
                    styles.lockedField
                  }
                >
                  Collected subscription
                  revenue
                </div>
              </Field>
            </div>

            <Field
              label="Internal notes"
            >
              <textarea
                style={
                  styles.textarea
                }
                rows={4}
                value={
                  form.notes
                }
                onChange={
                  (event) =>
                    updateForm(
                      "notes",
                      event.target
                        .value
                    )
                }
                placeholder="Agreement notes, commercial context or internal reminders..."
              />
            </Field>

            <div style={styles.formFooter}>
              <p style={styles.formFootnote}>
                These are the starting
                commercial terms. Root
                will preserve them in
                policy history.
              </p>

              <button
                type="submit"
                disabled={
                  saving
                }
                style={{
                  ...styles.primaryButton,

                  ...(saving
                    ? styles.disabledButton
                    : {}),
                }}
              >
                {saving
                  ? "Creating..."
                  : "Create Introducer"}
              </button>
            </div>
          </form>
        ) : null}

        <div style={styles.sectionHeading}>
          <div>
            <p
              style={
                styles.sectionKicker
              }
            >
              PARTNERS
            </p>

            <h2
              style={
                styles.sectionTitle
              }
            >
              Current introducers
            </h2>
          </div>

          <span style={styles.countBadge}>
            {introducers.length}
          </span>
        </div>

        {loading ? (
          <div style={styles.loadingCard}>
            Loading introducers...
          </div>
        ) : null}

        {!loading &&
        introducers.length === 0 ? (
          <div style={styles.emptyCard}>
            No introducers have been
            created yet.
          </div>
        ) : null}

        {!loading &&
        introducers.length > 0 ? (
          <div style={styles.grid}>
            {introducers.map(
              (introducer) => (
                <article
                  key={
                    introducer.id
                  }
                  style={styles.card}
                >
                  <div style={styles.cardTop}>
                    <span
                      style={
                        introducer.status ===
                        "active"
                          ? styles.activeBadge
                          : styles.inactiveBadge
                      }
                    >
                      {
                        introducer.status
                      }
                    </span>

                    <span
                      style={
                        styles.structureBadge
                      }
                    >
                      {formatStructure(
                        introducer.commission_structure
                      )}
                    </span>
                  </div>

                  <h3
                    style={
                      styles.partnerName
                    }
                  >
                    {introducer.name}
                  </h3>

                  <p
                    style={
                      styles.referralCode
                    }
                  >
                    ?ref=
                    {
                      introducer.referral_code
                    }
                  </p>

                  <div
                    style={
                      styles.commercialPanel
                    }
                  >
                    <div>
                      <span
                        style={
                          styles.metricLabel
                        }
                      >
                        CURRENT COMMISSION
                      </span>

                      <strong
                        style={
                          styles.bigMetric
                        }
                      >
                        {Number(
                          introducer.commission_percent ||
                            0
                        ).toLocaleString(
                          "en-GB",
                          {
                            maximumFractionDigits: 2,
                          }
                        )}
                        %
                      </strong>
                    </div>

                    <div>
                      <span
                        style={
                          styles.metricLabel
                        }
                      >
                        BASIS
                      </span>

                      <strong
                        style={
                          styles.metricValue
                        }
                      >
                        Collected revenue
                      </strong>
                    </div>
                  </div>

                  <div
                    style={
                      styles.statsGrid
                    }
                  >
                    <MiniStat
                      label="Applications"
                      value={
                        introducer.application_count ||
                        0
                      }
                    />

                    <MiniStat
                      label="Paid conversions"
                      value={
                        introducer.paid_conversion_count ||
                        0
                      }
                    />

                    <MiniStat
                      label="Commission earned"
                      value={
                        money(
                          introducer.commission_earned
                        )
                      }
                    />

                    <MiniStat
                      label="Outstanding"
                      value={
                        money(
                          introducer.commission_outstanding
                        )
                      }
                    />
                  </div>

                  <div style={styles.details}>
                    <p>
                      <strong>
                        Contact
                      </strong>
                      <br />
                      {
                        introducer.contact_name ||
                        "Not supplied"
                      }
                    </p>

                    <p>
                      <strong>
                        Email
                      </strong>
                      <br />
                      {
                        introducer.contact_email ||
                        "Not supplied"
                      }
                    </p>

                    <p>
                      <strong>
                        Agreement
                      </strong>
                      <br />
                      {
                        introducer.agreement_start_date ||
                        "No start date"
                      }
                      {" → "}
                      {
                        introducer.agreement_end_date ||
                        "Open-ended"
                      }
                    </p>

                    {introducer.notes ? (
                      <p>
                        <strong>
                          Notes
                        </strong>
                        <br />
                        {
                          introducer.notes
                        }
                      </p>
                    ) : null}
                  </div>

                                    <div
                    style={
                      styles.partnerActions
                    }
                  >
                                        <button
                      type="button"
                      style={
                        styles.secondaryButton
                      }
                      onClick={() =>
                        openCampaignManager(
                          introducer
                        )
                      }
                    >
                      {campaignManagerId ===
                      introducer.id
                        ? "Close Campaigns"
                        : "Manage Campaigns"}
                    </button>
                    <button
                      type="button"
                      style={
                        styles.primaryButton
                      }
                      onClick={() =>
                        commercialEditorId ===
                        introducer.id
                          ? closeCommercialEditor()
                          : openCommercialEditor(
                              introducer
                            )
                      }
                    >
                      {commercialEditorId ===
                      introducer.id
                        ? "Close Terms"
                        : "Change Commercial Terms"}
                    </button>
                  </div>
                                      {campaignManagerId ===
                  introducer.id ? (
                    <div
                      style={
                        styles.commercialEditor
                      }
                    >
                      <div>
                        <span
                          style={
                            styles.metricLabel
                          }
                        >
                          PERMANENT REFERRAL LINK
                        </span>

                        <p
                          style={
                            styles.referralCode
                          }
                        >
                          {referralLink(
                            introducer
                          )}
                        </p>

                        <button
                          type="button"
                          style={
                            styles.secondaryButton
                          }
                          onClick={() =>
                            copyText(
                              referralLink(
                                introducer
                              ),
                              `${introducer.name} referral link copied.`
                            )
                          }
                        >
                          Copy Referral Link
                        </button>
                      </div>

                      <div
                        style={{
                          marginTop: 22,
                        }}
                      >
                        <span
                          style={
                            styles.metricLabel
                          }
                        >
                          CAMPAIGNS
                        </span>

                        {campaignLoading ? (
                          <p>
                            Loading campaigns...
                          </p>
                        ) : null}

                        {!campaignLoading &&
                        campaigns.length ===
                          0 ? (
                          <p>
                            No campaigns created
                            yet.
                          </p>
                        ) : null}

                        {!campaignLoading &&
                        campaigns.length >
                          0 ? (
                          <div
                            style={{
                              display:
                                "grid",
                              gap: 12,
                              marginTop: 12,
                            }}
                          >
                            {campaigns.map(
                              (
                                campaign
                              ) => (
                                <div
                                  key={
                                    campaign.id
                                  }
                                  style={
                                    styles.lockedField
                                  }
                                >
                                  <strong>
                                    {campaign.campaign_name}
                                  </strong>

                                  <div
                                    style={{
                                      marginTop:
                                        6,
                                    }}
                                  >
                                    {
                                      campaign.status
                                    }
                                    {" · "}
                                    {
                                      campaign.campaign_code
                                    }
                                  </div>

                                  <div
                                    style={{
                                      marginTop:
                                        8,
                                      wordBreak:
                                        "break-all",
                                    }}
                                  >
                                    {campaignLink(
                                      introducer,
                                      campaign
                                    )}
                                  </div>

                                  <div
                                    style={{
                                      display:
                                        "flex",
                                      gap: 8,
                                      flexWrap:
                                        "wrap",
                                      marginTop:
                                        10,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      style={
                                        styles.secondaryButton
                                      }
                                      onClick={() =>
                                        copyText(
                                          campaignLink(
                                            introducer,
                                            campaign
                                          ),
                                          `${campaign.campaign_name} campaign link copied.`
                                        )
                                      }
                                    >
                                      Copy Link
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        campaignSaving
                                      }
                                      style={
                                        styles.secondaryButton
                                      }
                                      onClick={() =>
                                        changeCampaignStatus(
                                          campaign,
                                          introducer
                                        )
                                      }
                                    >
                                      {campaign.status ===
                                      "active"
                                        ? "Deactivate"
                                        : "Activate"}
                                    </button>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : null}
                      </div>

                      <form
                        onSubmit={(event) =>
                          createCampaign(
                            event,
                            introducer
                          )
                        }
                        style={{
                          marginTop: 24,
                        }}
                      >
                        <span
                          style={
                            styles.metricLabel
                          }
                        >
                          NEW CAMPAIGN
                        </span>

                        <div
                          style={
                            styles.commercialEditorGrid
                          }
                        >
                          <Field
                            label="Campaign name"
                            required
                          >
                            <input
                              style={
                                styles.input
                              }
                              value={
                                campaignForm.campaignName
                              }
                              onChange={(
                                event
                              ) =>
                                updateCampaignName(
                                  event
                                    .target
                                    .value
                                )
                              }
                              placeholder="Care Homes 2026"
                              required
                            />
                          </Field>

                          <Field
                            label="Campaign code"
                            required
                            hint="Generated automatically. This becomes part of the permanent campaign identity."
                          >
                            <input
                              style={
                                styles.input
                              }
                              value={
                                campaignForm.campaignCode
                              }
                              onChange={(
                                event
                              ) =>
                                updateCampaignForm(
                                  "campaignCode",
                                  campaignCodeFromName(
                                    event
                                      .target
                                      .value
                                  )
                                )
                              }
                              placeholder="care-homes-2026"
                              required
                            />
                          </Field>

                          <Field
                            label="Start date"
                          >
                            <input
                              type="date"
                              style={
                                styles.input
                              }
                              value={
                                campaignForm.startsAt
                              }
                              onChange={(
                                event
                              ) =>
                                updateCampaignForm(
                                  "startsAt",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </Field>

                          <Field
                            label="End date"
                          >
                            <input
                              type="date"
                              style={
                                styles.input
                              }
                              value={
                                campaignForm.endsAt
                              }
                              onChange={(
                                event
                              ) =>
                                updateCampaignForm(
                                  "endsAt",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </Field>

                          <Field
                            label="Status"
                          >
                            <select
                              style={
                                styles.input
                              }
                              value={
                                campaignForm.status
                              }
                              onChange={(
                                event
                              ) =>
                                updateCampaignForm(
                                  "status",
                                  event
                                    .target
                                    .value
                                )
                              }
                            >
                              <option value="active">
                                Active
                              </option>

                              <option value="inactive">
                                Inactive
                              </option>
                            </select>
                          </Field>
                        </div>

                        <Field
                          label="Internal notes"
                        >
                          <textarea
                            style={
                              styles.textarea
                            }
                            rows={3}
                            value={
                              campaignForm.notes
                            }
                            onChange={(
                              event
                            ) =>
                              updateCampaignForm(
                                "notes",
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Purpose, audience or campaign context..."
                          />
                        </Field>

                        <div
                          style={
                            styles.commercialFooter
                          }
                        >
                          <button
                            type="submit"
                            disabled={
                              campaignSaving
                            }
                            style={{
                              ...styles.primaryButton,

                              ...(campaignSaving
                                ? styles.disabledButton
                                : {}),
                            }}
                          >
                            {campaignSaving
                              ? "Creating..."
                              : "Create Campaign"}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : null}

                  {commercialEditorId ===
                  introducer.id ? (
                    <form
                      style={
                        styles.commercialEditor
                      }
                      onSubmit={(event) =>
                        saveCommercialTerms(
                          event,
                          introducer
                        )
                      }
                    >
                      <div>
                        <span
                          style={
                            styles.metricLabel
                          }
                        >
                          CURRENT TERMS
                        </span>

                        <strong
                          style={
                            styles.currentTerms
                          }
                        >
                          {Number(
                            introducer.commission_percent ||
                              0
                          ).toLocaleString(
                            "en-GB",
                            {
                              maximumFractionDigits: 2,
                            }
                          )}
                          % ·{" "}
                          {formatStructure(
                            introducer.commission_structure
                          )}
                        </strong>
                      </div>

                      <div
                        style={
                          styles.commercialEditorGrid
                        }
                      >
                        <Field
                          label="New commission %"
                          required
                        >
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            style={
                              styles.input
                            }
                            value={
                              commercialForm.commissionPercent
                            }
                            onChange={
                              (event) =>
                                updateCommercialForm(
                                  "commissionPercent",
                                  event.target
                                    .value
                                )
                            }
                            required
                          />
                        </Field>

                        <Field
                          label="New structure"
                          required
                        >
                          <select
                            style={
                              styles.input
                            }
                            value={
                              commercialForm.commissionStructure
                            }
                            onChange={
                              (event) =>
                                updateCommercialForm(
                                  "commissionStructure",
                                  event.target
                                    .value
                                )
                            }
                          >
                            <option value="one_off">
                              One-off
                            </option>

                            <option value="recurring">
                              Recurring
                            </option>
                          </select>
                        </Field>

                        <Field
  label="Effective from"
  required
  hint={
    commercialForm.effectiveTiming === "immediate"
      ? "Apply the new terms at the exact time they are saved."
      : "Choose the calendar date on which the new terms should begin."
  }
>
  <select
    style={styles.input}
    value={
      commercialForm.effectiveTiming
    }
    onChange={(event) => {
      const value =
        event.target.value;

      updateCommercialForm(
        "effectiveTiming",
        value
      );

      if (value === "immediate") {
        updateCommercialForm(
          "effectiveDate",
          ""
        );
      } else if (
        !commercialForm.effectiveDate
      ) {
        updateCommercialForm(
          "effectiveDate",
          todayDateValue()
        );
      }
    }}
    required
  >
    <option value="immediate">
      Immediately
    </option>

    <option value="specific_date">
      Specific date
    </option>
  </select>

  {commercialForm.effectiveTiming ===
  "specific_date" ? (
    <input
      type="date"
      style={styles.input}
      value={
        commercialForm.effectiveDate
      }
      onChange={(event) =>
        updateCommercialForm(
          "effectiveDate",
          event.target.value
        )
      }
      required
    />
  ) : null}
</Field>
                        <Field
                          label="Reason for change"
                          required
                        >
                          <input
                            style={
                              styles.input
                            }
                            value={
                              commercialForm.changeReason
                            }
                            onChange={
                              (event) =>
                                updateCommercialForm(
                                  "changeReason",
                                  event.target
                                    .value
                                )
                            }
                            placeholder="Why are these terms changing?"
                            required
                          />
                        </Field>
                      </div>

                      <Field
                        label="Internal notes"
                      >
                        <textarea
                          style={
                            styles.textarea
                          }
                          rows={3}
                          value={
                            commercialForm.notes
                          }
                          onChange={
                            (event) =>
                              updateCommercialForm(
                                "notes",
                                event.target
                                  .value
                              )
                          }
                          placeholder="Commercial context, negotiation notes or internal record..."
                        />
                      </Field>

                      <div
                        style={
                          styles.commercialWarning
                        }
                      >
                        Existing conversions and
                        earned commissions will not
                        be changed. Root will close
                        the current policy and
                        preserve it in commercial
                        history.
                      </div>

                      <div
                        style={
                          styles.commercialFooter
                        }
                      >
                        <button
                          type="button"
                          style={
                            styles.secondaryButton
                          }
                          disabled={
                            commercialSaving
                          }
                          onClick={
                            closeCommercialEditor
                          }
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={
                            commercialSaving
                          }
                          style={{
                            ...styles.primaryButton,

                            ...(commercialSaving
                              ? styles.disabledButton
                              : {}),
                          }}
                        >
                          {commercialSaving
                            ? "Applying..."
                            : "Apply New Terms"}
                        </button>
                      </div>
                    </form>
                  ) : null}                </article>
              )
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}) {
  return (
    <div style={styles.summaryCard}>
      <span style={styles.summaryLabel}>
        {label}
      </span>

      <strong style={styles.summaryValue}>
        {value}
      </strong>
    </div>
  );
}

function MiniStat({
  label,
  value,
}) {
  return (
    <div style={styles.miniStat}>
      <span style={styles.metricLabel}>
        {label}
      </span>

      <strong
        style={
          styles.metricValue
        }
      >
        {value}
      </strong>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>
        {label}

        {required ? (
          <span
            style={
              styles.required
            }
          >
            {" "}
            *
          </span>
        ) : null}
      </span>

      {hint ? (
        <span style={styles.fieldHint}>
          {hint}
        </span>
      ) : null}

      {children}
    </label>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "48px 24px 80px",
    boxSizing: "border-box",
    background:
      "linear-gradient(145deg, #EEF2E8 0%, #F8F5EE 54%, #E7EDE2 100%)",
    color: "#172018",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
  },

  shell: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    flexWrap: "wrap",
  },

  topActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  kicker: {
    margin: "0 0 12px",
    color: "#657264",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.16em",
  },

  title: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(48px, 7vw, 78px)",
    fontWeight: "500",
    letterSpacing: "-0.05em",
  },

  intro: {
    maxWidth: "680px",
    margin: "18px 0 0",
    color: "#5D665E",
    fontSize: "18px",
    lineHeight: 1.7,
  },

  primaryButton: {
    border: "none",
    borderRadius: "999px",
    padding: "13px 19px",
    background: "#263B2B",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "900",
    fontSize: "14px",
  },

  secondaryButton: {
    border:
      "1px solid rgba(38,59,43,0.14)",
    borderRadius: "999px",
    padding: "12px 18px",
    background:
      "rgba(255,255,255,0.62)",
    color: "#263B2B",
    cursor: "pointer",
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.55,
    cursor: "wait",
  },

  error: {
    marginTop: "28px",
    padding: "18px 20px",
    borderRadius: "18px",
    background: "#F7E4E1",
    color: "#8B2A22",
    fontWeight: "800",
  },

  success: {
    marginTop: "28px",
    padding: "18px 20px",
    borderRadius: "18px",
    background: "#DDEBDC",
    color: "#31503A",
    fontWeight: "800",
  },

  signInButton: {
    marginLeft: "16px",
    border: "none",
    borderRadius: "999px",
    padding: "9px 14px",
    background: "#263B2B",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
  },

  summaryGrid: {
    marginTop: "36px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },

  summaryCard: {
    padding: "22px",
    borderRadius: "24px",
    background:
      "rgba(255,255,255,0.62)",
    border:
      "1px solid rgba(255,255,255,0.9)",
  },

  summaryLabel: {
    display: "block",
    color: "#6D786F",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  summaryValue: {
    display: "block",
    marginTop: "9px",
    fontFamily: "Georgia, serif",
    fontSize: "29px",
    fontWeight: "500",
  },

  formCard: {
    marginTop: "30px",
    padding: "30px",
    borderRadius: "30px",
    background:
      "rgba(255,255,255,0.78)",
    border:
      "1px solid rgba(255,255,255,0.95)",
    boxShadow:
      "0 22px 58px rgba(41,55,40,0.08)",
  },

  formHeading: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
    marginBottom: "24px",
  },

  sectionKicker: {
    margin: "0 0 8px",
    color: "#657264",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  sectionTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "32px",
    fontWeight: "500",
  },

  privateBadge: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#EEE6D6",
    color: "#6F5D35",
    fontSize: "11px",
    fontWeight: "900",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },

  field: {
    display: "grid",
    gap: "7px",
    marginBottom: "18px",
  },

  fieldLabel: {
    color: "#29362C",
    fontSize: "13px",
    fontWeight: "900",
  },

  fieldHint: {
    color: "#7A827A",
    fontSize: "12px",
    lineHeight: 1.45,
  },

  required: {
    color: "#9A4D46",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border:
      "1px solid rgba(39,54,41,0.14)",
    borderRadius: "15px",
    padding: "13px 14px",
    background:
      "rgba(255,255,255,0.82)",
    color: "#182019",
    fontSize: "14px",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    border:
      "1px solid rgba(39,54,41,0.14)",
    borderRadius: "15px",
    padding: "13px 14px",
    background:
      "rgba(255,255,255,0.82)",
    color: "#182019",
    fontSize: "14px",
    lineHeight: 1.55,
    outline: "none",
  },

  lockedField: {
    border:
      "1px solid rgba(39,54,41,0.08)",
    borderRadius: "15px",
    padding: "13px 14px",
    background:
      "rgba(235,239,232,0.72)",
    color: "#657064",
    fontSize: "14px",
    fontWeight: "700",
  },

  formFooter: {
    marginTop: "8px",
    paddingTop: "20px",
    borderTop:
      "1px solid rgba(39,54,41,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },

  formFootnote: {
    margin: 0,
    maxWidth: "620px",
    color: "#707970",
    fontSize: "12px",
    lineHeight: 1.6,
  },

  sectionHeading: {
    marginTop: "54px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: "20px",
  },

  countBadge: {
    minWidth: "42px",
    height: "42px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    background: "#263B2B",
    color: "#FFFFFF",
    fontWeight: "900",
  },

  loadingCard: {
    marginTop: "20px",
    padding: "28px",
    borderRadius: "24px",
    background:
      "rgba(255,255,255,0.6)",
  },

  emptyCard: {
    marginTop: "20px",
    padding: "28px",
    borderRadius: "24px",
    background:
      "rgba(255,255,255,0.55)",
    color: "#687168",
  },

  grid: {
    marginTop: "20px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(330px, 1fr))",
    gap: "18px",
  },

  card: {
    padding: "27px",
    borderRadius: "28px",
    background:
      "rgba(255,255,255,0.76)",
    border:
      "1px solid rgba(255,255,255,0.9)",
    boxShadow:
      "0 22px 58px rgba(41,55,40,0.08)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },

  activeBadge: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#DDEBDC",
    color: "#31503A",
    fontSize: "11px",
    fontWeight: "900",
    textTransform: "capitalize",
  },

  inactiveBadge: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#ECEAE5",
    color: "#77736B",
    fontSize: "11px",
    fontWeight: "900",
    textTransform: "capitalize",
  },

  structureBadge: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#EAE7D7",
    color: "#655C34",
    fontSize: "11px",
    fontWeight: "900",
  },

  partnerName: {
    margin: "25px 0 5px",
    fontFamily: "Georgia, serif",
    fontSize: "31px",
    fontWeight: "500",
  },

  referralCode: {
    margin: 0,
    color: "#7A8179",
    fontFamily: "monospace",
    fontSize: "12px",
  },

  commercialPanel: {
    marginTop: "22px",
    padding: "18px",
    borderRadius: "20px",
    background:
      "rgba(236,240,233,0.72)",
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "18px",
  },

  metricLabel: {
    display: "block",
    marginBottom: "5px",
    color: "#747D74",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  bigMetric: {
    fontFamily: "Georgia, serif",
    fontSize: "28px",
    fontWeight: "500",
  },

  metricValue: {
    display: "block",
    color: "#29372D",
    fontSize: "14px",
    fontWeight: "900",
  },

  statsGrid: {
    marginTop: "16px",
    display: "grid",
    gridTemplateColumns:
      "repeat(2, 1fr)",
    gap: "10px",
  },

  miniStat: {
    padding: "14px",
    borderRadius: "16px",
    background:
      "rgba(255,255,255,0.66)",
    border:
      "1px solid rgba(39,54,41,0.06)",
  },

  details: {
    marginTop: "20px",
    color: "#566157",
    fontSize: "14px",
    lineHeight: 1.6,
  },

    partnerActions: {
    marginTop: "20px",
    paddingTop: "18px",
    borderTop:
      "1px solid rgba(39,54,41,0.08)",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  commercialEditor: {
    marginTop: "18px",
    padding: "20px",
    borderRadius: "22px",
    background:
      "rgba(244,246,240,0.9)",
    border:
      "1px solid rgba(39,54,41,0.09)",
  },

  currentTerms: {
    display: "block",
    marginTop: "5px",
    marginBottom: "20px",
    fontFamily:
      "Georgia, serif",
    fontSize: "23px",
    fontWeight: "500",
    color: "#263B2B",
  },

  commercialEditorGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "14px",
  },

  commercialWarning: {
    marginTop: "4px",
    padding: "14px 16px",
    borderRadius: "15px",
    background: "#EEE6D6",
    color: "#6F5D35",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: 1.55,
  },

  commercialFooter: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },
};

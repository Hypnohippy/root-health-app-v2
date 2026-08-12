"use client";

import { useState } from "react";

export default function OrganisationRegisterPage() {
  const [name, setName] =
    useState("");

  const [contactName, setContactName] =
    useState("");

  const [contactEmail, setContactEmail] =
    useState("");

  const [adminEmail, setAdminEmail] =
    useState("");

  const [employeeCount, setEmployeeCount] =
    useState("51-150");

  const [industry, setIndustry] =
    useState("Healthcare");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [createdOrg, setCreatedOrg] =
    useState(null);

  async function startPilot() {
    setLoading(true);
    setError("");

    if (
      !name.trim() ||
      !contactName.trim() ||
      !contactEmail.trim() ||
      !adminEmail.trim()
    ) {
      setError(
        "Please complete organisation name, contact name, organisation contact email and Root administrator email."
      );

      setLoading(false);
      return;
    }

    try {
      const response =
        await fetch(
          "/api/organisation/apply",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              organisationName:
                name.trim(),

              contactName:
                contactName.trim(),

              contactEmail:
                contactEmail
                  .trim()
                  .toLowerCase(),

              adminEmail:
                adminEmail
                  .trim()
                  .toLowerCase(),

              employeeCount,

              industry,
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
          "Root could not submit your Workplace Programme application."
        );

        setLoading(false);
        return;
      }

      localStorage.removeItem(
        "root_hr_org_v1"
      );

      setCreatedOrg(
        result.application
      );

      setLoading(false);
    } catch (submitError) {
      console.error(
        "ROOT APPLICATION SUBMIT ERROR:",
        submitError
      );

      setError(
        "Root could not submit your application. Please try again."
      );

      setLoading(false);
    }
  }

  if (createdOrg) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            Root Workplace
          </p>

          <h1 style={styles.title}>
            Application received ✅
          </h1>

          <p style={styles.text}>
            Thank you for applying to
            join the Root Workplace
            Programme.
          </p>

          <p style={styles.text}>
            Root will review the
            organisation details before
            creating workplace access.
            Submitting this application
            does not create an
            organisation dashboard or
            grant HR permissions.
          </p>

          <div style={styles.successBox}>
            <p>
              <strong>
                Organisation
              </strong>

              <br />

              {
                createdOrg.organisation_name
              }
            </p>

            <p>
              <strong>
                Contact
              </strong>

              <br />

              {
                createdOrg.contact_name
              }
            </p>

            <p>
              <strong>
                Organisation contact email
              </strong>

              <br />

              {
                createdOrg.contact_email
              }
            </p>

            <p>
              <strong>
                Root administrator
              </strong>

              <br />

              {
                createdOrg.admin_email
              }
            </p>

            <p>
              <strong>
                Application status
              </strong>

              <br />

              Pending review
            </p>
          </div>

          <p style={styles.smallText}>
            Once approved, the authorised
            Root administrator will
            receive secure instructions
            for setting up Workplace
            access and inviting
            employees.
          </p>

          <button
            style={styles.button}
            onClick={() => {
              window.location.href =
                "/organisations";
            }}
          >
            Return to Root Workplace
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>
          Root Workplace
        </p>

        <h1 style={styles.title}>
          Apply for the Root Workplace
          Programme
        </h1>

        <p style={styles.text}>
          Help your organisation
          recognise what matters early,
          understand emerging wellbeing
          patterns and turn evidence into
          meaningful action.
        </p>

        <label style={styles.label}>
          Organisation name
        </label>

        <input
          style={styles.input}
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          placeholder="e.g. Sony UK"
        />

        <label style={styles.label}>
          Your name
        </label>

        <input
          style={styles.input}
          value={contactName}
          onChange={(e) =>
            setContactName(
              e.target.value
            )
          }
          placeholder="e.g. Emma Jones"
        />

        <label style={styles.label}>
          Organisation contact email
        </label>

        <input
          type="email"
          style={styles.input}
          value={contactEmail}
          onChange={(e) =>
            setContactEmail(
              e.target.value
            )
          }
          placeholder="e.g. enquiries@company.co.uk"
        />

        <p style={styles.fieldHelp}>
          This is where Root can contact
          your organisation about the
          application. It may be a shared
          company mailbox.
        </p>

        <label style={styles.label}>
          Authorised Root administrator email
        </label>

        <input
          type="email"
          style={styles.input}
          value={adminEmail}
          onChange={(e) =>
            setAdminEmail(
              e.target.value
            )
          }
          placeholder="e.g. emma.jones@company.co.uk"
        />

        <p style={styles.fieldHelp}>
          This should belong to the person
          who will sign in to Root and
          administer Workplace. It can be
          the same as the contact email if
          appropriate.
        </p>

        <label style={styles.label}>
          Number of employees
        </label>

        <select
          style={styles.input}
          value={employeeCount}
          onChange={(e) =>
            setEmployeeCount(
              e.target.value
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

        <label style={styles.label}>
          Industry
        </label>

        <select
          style={styles.input}
          value={industry}
          onChange={(e) =>
            setIndustry(
              e.target.value
            )
          }
        >
          <option>
            Healthcare
          </option>

          <option>
            Professional Services
          </option>

          <option>
            Manufacturing
          </option>

          <option>
            Retail
          </option>

          <option>
            Education
          </option>

          <option>
            Charity
          </option>

          <option>
            Other
          </option>
        </select>

        {error ? (
          <p style={styles.error}>
            {error}
          </p>
        ) : null}

        <button
          style={{
            ...styles.button,
            ...(loading
              ? styles.buttonDisabled
              : {}),
          }}
          onClick={startPilot}
          disabled={loading}
        >
          {loading
            ? "Submitting application..."
            : "Apply for Root Workplace"}
        </button>

        <p style={styles.formNote}>
          No account or payment is
          required to apply.
        </p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px",
    background: "#EFE9DE",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "100%",
    maxWidth: "760px",
    padding: "38px",
    borderRadius: "36px",
    background:
      "rgba(255,255,255,0.76)",
    border:
      "1px solid rgba(255,255,255,0.85)",
    boxShadow:
      "0 28px 90px rgba(20,18,15,0.14)",
  },

  kicker: {
    margin: "0 0 10px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    fontWeight: "800",
    color: "#776C5B",
  },

  title: {
    margin: "0 0 16px",
    fontSize: "42px",
    lineHeight: "1.1",
    color: "#181818",
    letterSpacing: "-0.04em",
  },

  text: {
    color: "#4D463B",
    lineHeight: "1.8",
    fontSize: "17px",
  },

  label: {
    display: "block",
    marginTop: "18px",
    marginBottom: "8px",
    fontWeight: "800",
    color: "#181818",
  },

  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "16px",
    border:
      "1px solid rgba(24,24,24,0.16)",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  fieldHelp: {
    margin: "7px 2px 0",
    color: "#777064",
    fontSize: "13px",
    lineHeight: "1.55",
  },

  button: {
    marginTop: "24px",
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "15px 22px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "15px",
  },

  buttonDisabled: {
    opacity: 0.58,
    cursor: "wait",
  },

  error: {
    marginTop: "16px",
    color: "#9F1D1D",
    fontWeight: "800",
  },

  successBox: {
    marginTop: "22px",
    padding: "22px",
    borderRadius: "24px",
    background:
      "rgba(255,255,255,0.65)",
    border:
      "1px solid rgba(24,24,24,0.08)",
  },

  smallText: {
    marginTop: "18px",
    color: "#5A554D",
    lineHeight: "1.7",
  },

  formNote: {
    margin: "15px 0 0",
    color: "#776F64",
    fontSize: "13px",
    textAlign: "center",
    lineHeight: "1.6",
  },
};
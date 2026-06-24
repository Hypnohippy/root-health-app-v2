"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

function makeCode(name) {
  const clean = String(name || "ROOT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 12);

  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${clean}-${random}`;
}

export default function OrganisationRegisterPage() {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [employeeCount, setEmployeeCount] = useState("51-250");
  const [industry, setIndustry] = useState("Healthcare");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdOrg, setCreatedOrg] = useState(null);

  async function startPilot() {
    setLoading(true);
    setError("");

    if (!name.trim() || !contactName.trim() || !contactEmail.trim()) {
      setError("Please complete organisation name, contact name and work email.");
      setLoading(false);
      return;
    }

    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 56);

    const organisationCode = makeCode(name);

    const { data, error } = await supabase
      .from("organisations")
      .insert({
        name: name.trim(),
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        employee_count: employeeCount,
        industry,
        organisation_code: organisationCode,
        trial_start: trialStart.toISOString().slice(0, 10),
        trial_end: trialEnd.toISOString().slice(0, 10),
        status: "trial",
        subscription_status: "trial",
      })
      .select()
      .single();

    if (error) {
      setError(error.message || "Could not start pilot.");
      setLoading(false);
      return;
    }

    setCreatedOrg(data);
    setLoading(false);
  }

  if (createdOrg) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>Root Workplace</p>

          <h1 style={styles.title}>Your pilot is ready ✅</h1>

          <p style={styles.text}>
            Your free 8-week Root Health workplace pilot has been created.
          </p>

          <div style={styles.successBox}>
            <p>
              <strong>Organisation:</strong>
              <br />
              {createdOrg.name}
            </p>

            <p>
              <strong>Pilot ends:</strong>
              <br />
              {createdOrg.trial_end}
            </p>

          <p>
  <strong>Organisation code:</strong>
  <br />
  <span style={styles.code}>
    {createdOrg.organisation_code}
  </span>
</p>

<p>
  <strong>Employee join link:</strong>
  <br />
  https://roothealth.app/organisation/join
</p>
          </div>

          <button
  style={styles.button}
  onClick={() =>
    navigator.clipboard.writeText(createdOrg.organisation_code)
  }
>
  Copy Organisation Code
</button>

<button
  style={{
    ...styles.button,
    marginTop: "12px",
    background: "#5A554D",
  }}
  onClick={() =>
    navigator.clipboard.writeText(
      "https://roothealth.app/organisation/join"
    )
  }
>
  Copy Join Link
</button>

<button
  style={{
    ...styles.button,
    marginTop: "12px",
    background: "#776C5B",
  }}
  onClick={() =>
    navigator.clipboard.writeText(
`Welcome to Root Health.

Our organisation is taking part in an 8-week wellbeing pilot.

To join:

https://roothealth.app/organisation/join

Organisation Code:
${createdOrg.organisation_code}

Your personal information remains private. The organisation only receives anonymous wellbeing trends.`
    )
  }
>
  Copy Employee Invitation
</button>

          <p style={styles.smallText}>
            Next step: invite employees to join Root using this organisation code.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Root Workplace</p>

        <h1 style={styles.title}>Start your free 8-week workplace pilot</h1>

        <p style={styles.text}>
          Understand what your workforce may be experiencing, identify emerging
          patterns and receive practical recommendations for action.
        </p>

        <label style={styles.label}>Organisation name</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sony UK"
        />

        <label style={styles.label}>Your name</label>
        <input
          style={styles.input}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="e.g. Emma Jones"
        />

        <label style={styles.label}>Work email</label>
        <input
          style={styles.input}
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="e.g. emma@company.co.uk"
        />

        <label style={styles.label}>Number of employees</label>
        <select
          style={styles.input}
          value={employeeCount}
          onChange={(e) => setEmployeeCount(e.target.value)}
        >
          <option>1-50</option>
          <option>51-250</option>
          <option>251-1000</option>
          <option>1000+</option>
        </select>

        <label style={styles.label}>Industry</label>
        <select
          style={styles.input}
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          <option>Healthcare</option>
          <option>Professional Services</option>
          <option>Manufacturing</option>
          <option>Retail</option>
          <option>Education</option>
          <option>Charity</option>
          <option>Other</option>
        </select>

        {error ? <p style={styles.error}>{error}</p> : null}

        <button style={styles.button} onClick={startPilot} disabled={loading}>
          {loading ? "Starting pilot..." : "Start Free 8 Week Pilot"}
        </button>
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
    background: "rgba(255,255,255,0.76)",
    border: "1px solid rgba(255,255,255,0.85)",
    boxShadow: "0 28px 90px rgba(20,18,15,0.14)",
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
    border: "1px solid rgba(24,24,24,0.16)",
    fontSize: "15px",
    boxSizing: "border-box",
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

  error: {
    marginTop: "16px",
    color: "#9F1D1D",
    fontWeight: "800",
  },

  successBox: {
    marginTop: "22px",
    padding: "22px",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(24,24,24,0.08)",
  },

  code: {
    display: "inline-block",
    marginTop: "8px",
    fontSize: "24px",
    fontWeight: "900",
    letterSpacing: "0.04em",
  },

  smallText: {
    marginTop: "18px",
    color: "#5A554D",
    lineHeight: "1.7",
  },
};

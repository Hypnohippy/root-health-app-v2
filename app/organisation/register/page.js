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
    setError(
      "Please complete organisation name, contact name and work email."
    );
    setLoading(false);
    return;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    window.location.href = "/login";
    return;
  }

  const normalisedEmail = contactEmail.trim().toLowerCase();

  const { data: existingApplication, error: existingError } = await supabase
    .from("organisation_applications")
    .select(
      "id, organisation_name, contact_name, contact_email, employee_count, industry, status, created_at"
    )
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) {
    setError("Root could not check your existing application.");
    setLoading(false);
    return;
  }

  if (existingApplication) {
    setCreatedOrg(existingApplication);
    setLoading(false);
    return;
  }

  const { data: application, error: applicationError } = await supabase
    .from("organisation_applications")
    .insert({
      user_id: user.id,
      organisation_name: name.trim(),
      contact_name: contactName.trim(),
      contact_email: normalisedEmail,
      employee_count: employeeCount,
      industry,
      status: "pending",
    })
    .select(
      "id, organisation_name, contact_name, contact_email, employee_count, industry, status, created_at"
    )
    .single();

  if (applicationError || !application) {
    setError(
      applicationError?.message ||
        "Root could not submit your Workplace Programme application."
    );
    setLoading(false);
    return;
  }

  localStorage.removeItem("root_hr_org_v1");

  setCreatedOrg(application);
  setLoading(false);
}
  if (createdOrg) {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Root Workplace</p>

        <h1 style={styles.title}>Application received ✅</h1>

        <p style={styles.text}>
          Thank you for applying to join the Root Workplace Programme.
        </p>

        <p style={styles.text}>
          Root will review the organisation details before creating workplace
          access. Submitting this application does not create an organisation
          dashboard or grant HR permissions.
        </p>

        <div style={styles.successBox}>
          <p>
            <strong>Organisation</strong>
            <br />
            {createdOrg.organisation_name}
          </p>

          <p>
            <strong>Contact</strong>
            <br />
            {createdOrg.contact_name}
          </p>

          <p>
            <strong>Work email</strong>
            <br />
            {createdOrg.contact_email}
          </p>

          <p>
            <strong>Application status</strong>
            <br />
            Pending review
          </p>
        </div>

        <p style={styles.smallText}>
          Once approved, the authorised organisation contact will receive
          secure instructions for setting up Root Workplace and inviting
          employees.
        </p>

        <button
          style={styles.button}
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Return to Root
        </button>
      </section>
    </main>
  );
}

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Root Workplace</p>

        <h1 style={styles.title}>Apply for the Root Workplace Programme</h1>

        <p style={styles.text}>
  Help your organisation recognise what matters early, understand emerging
  wellbeing patterns and turn evidence into meaningful action.
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
          {loading ? "Submitting application..." : "Apply for Root Workplace"}
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

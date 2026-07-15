"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function OrganisationJoinPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [organisation, setOrganisation] = useState(null);

 async function joinOrganisation() {
  setLoading(true);
  setError("");

  const cleanCode = code.trim().toUpperCase();

  if (!cleanCode) {
    setError("Please enter your organisation code.");
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

  const { data: organisationData, error: organisationError } = await supabase
    .from("organisations")
    .select("id, name, organisation_code")
    .eq("organisation_code", cleanCode)
    .maybeSingle();

  if (organisationError || !organisationData) {
    setError("We couldn't find an organisation with that code.");
    setLoading(false);
    return;
  }

  const { data: existingMembership, error: existingMembershipError } =
    await supabase
      .from("organisation_members")
      .select(
        "id, organisation_id, user_id, profile_key, email, name, department, role"
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (existingMembershipError) {
    setError("Root could not verify your existing account.");
    setLoading(false);
    return;
  }

  if (
    existingMembership &&
    existingMembership.organisation_id !== organisationData.id
  ) {
    setError(
      "This account is already connected to another organisation. Please contact Root support before joining a different organisation."
    );
    setLoading(false);
    return;
  }

  let membership = existingMembership;

  if (!membership) {
    const profileKey = crypto.randomUUID();

    const { data: newMembership, error: membershipError } = await supabase
      .from("organisation_members")
      .insert({
        organisation_id: organisationData.id,
        user_id: user.id,
        profile_key: profileKey,
        email: user.email || null,
        name: user.user_metadata?.name || null,
        department: null,
        role: "employee",
        invited_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select(
        "id, organisation_id, user_id, profile_key, email, name, department, role"
      )
      .single();

    if (membershipError || !newMembership) {
      setError(
        "Root could not connect your account to this organisation. Please try again."
      );
      setLoading(false);
      return;
    }

    membership = newMembership;
  }

  localStorage.setItem("root_profile_key_v1", membership.profile_key);

  localStorage.setItem(
    "root_profile_v1",
    JSON.stringify({
      profile_key: membership.profile_key,
      email: membership.email || user.email || "",
      name: membership.name || "",
      department: membership.department || "",
    })
  );

  localStorage.setItem(
    "root_organisation_v1",
    JSON.stringify({
      organisation_id: organisationData.id,
      organisation_name: organisationData.name,
      organisation_code: organisationData.organisation_code,
      role: "employee",
      joined_at: Date.now(),
    })
  );

  localStorage.removeItem("root_hr_org_v1");

  setOrganisation(organisationData);
  setLoading(false);
}
  if (organisation) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>Root Workplace</p>
          <h1 style={styles.title}>Welcome to {organisation.name} ✅</h1>

          <p style={styles.text}>
            You are now connected to your organisation’s Root Health pilot.
          </p>

          <p style={styles.text}>
            Your personal Root experience remains private. Your organisation
            only sees anonymous wellbeing trends.
          </p>

          <button
            style={styles.button}
            onClick={() => (window.location.href = "/organisation/profile")}
          >
            Continue to Orientation
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Root Workplace</p>

        <h1 style={styles.title}>Join your organisation</h1>

        <p style={styles.text}>
          Enter the organisation code provided by your employer to join their
          free Root Health workplace pilot.
        </p>

        <label style={styles.label}>Organisation code</label>

        <input
          style={styles.input}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. BRONTE-UK-T3Y0"
        />

        {error ? <p style={styles.error}>{error}</p> : null}

        <button
          style={styles.button}
          onClick={joinOrganisation}
          disabled={loading}
        >
          {loading ? "Checking code..." : "Join Organisation"}
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
    maxWidth: "720px",
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
    textTransform: "uppercase",
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
};
